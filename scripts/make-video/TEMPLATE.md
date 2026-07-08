# Programmatic video generator — copy-paste template

Generate real videos from a **storyboard** — stock b-roll, Ken Burns stills, a
music bed, and animated title/credits cards — with **zero hand-editing**. Two
engines do the work: **Playwright** renders motion-graphics (anything you can
build in HTML/CSS), **ffmpeg** edits and compresses. Everything is a script, so
it's reproducible and re-themeable by editing one array.

`generate.mjs` is fully standalone — copy it anywhere, it depends only on Node,
ffmpeg, curl, and Playwright.

---

## Quick start

```bash
# 1. deps (once)
npm i playwright && npx playwright install chromium
#    ffmpeg + curl must be on PATH (e.g. `apt install ffmpeg curl`)

# 2. get a free Pixabay key: https://pixabay.com/api/docs/

# 3. render
PIXABAY_KEY=<your-key> node generate.mjs
# → out/video.mp4
```

That's it. The default storyboard makes an ~18s montage (~1.4 MB) in well under
a minute.

---

## Customize — you only edit the top of `generate.mjs`

```js
const STORYBOARD = [
  { kind: 'title',   dur: 3.6, title: 'YOUR TITLE', sub: 'a subtitle' },
  { kind: 'video',   dur: 4.0, q: 'city aerial night', pick: 0, start: 1 },
  { kind: 'still',   dur: 3.4, q: 'city street traffic', pick: 1, forward: true },
  { kind: 'credits', dur: 3.2 },
];
const MUSIC = { url: 'https://mp3d.jamendo.com/download/track/2165/mp31/', credit: 'Jamendo #2165' };
```

| Scene `kind` | Source | Options |
|---|---|---|
| `title` | Playwright card | `title`, `sub` |
| `video` | Pixabay b-roll | `q` (search), `pick` (which hit), `start` (trim in) |
| `still` | Pixabay photo, panned | `q`, `pick`, `forward` (pan direction) |
| `credits` | auto-built from used assets | — |

Re-brand by editing the CSS in `titleCard` / `creditsCard`. Change the canvas
via `W`, `H`, `FPS` at the top (use vertical `1080×1920` for shorts/reels).

### Swapping asset sources
- **Music from a local JSONL** (zero API calls): read your `*.jsonl`, pick a row
  by mood, and set `MUSIC.url` to its `stream_url`. Jamendo stream URLs follow
  `https://mp3d.jamendo.com/download/track/<id>/mp31/`.
- **Photos from Unsplash**: replace `kenBurnsSeg`'s source with an Unsplash
  `image_url` (append `?w=1920&q=80`). Any image/video URL works — the engine
  only cares about the file.

---

## The method — 7 rules that make it work

1. **Two engines, one editor.** Playwright renders synthetic motion (titles,
   lower-thirds, UI, kinetic type). ffmpeg does everything else. Don't cross them.
2. **Normalize before you concat — always.** Every segment must exit at the same
   `{resolution, fps, SAR, pixel format}` (the `NORM` filter). Mismatches make
   `xfade`/`concat` corrupt or error. This is the #1 gotcha.
3. **Ken Burns = crop-pan, never `zoompan`.** `zoompan` re-supersamples the whole
   canvas every frame (~40–100× slower). Pre-scale the still ~1.2× and slide a
   fixed `crop` window with `t` in x/y instead. Stills: ~150s → ~1s each.
4. **Get the `xfade` offset right.** Each transition starts `XF` seconds *before*
   the running total, and every crossfade *shortens* the timeline by `XF`:
   `offset = accumulated - XF`, then `accumulated += dur - XF`.
5. **Cache-first, never cache a failure.** Downloads/searches are keyed by id on
   disk, so re-renders are instant. But `curl` writes HTTP-error bodies and exits
   `0` by default — use `-f` and unlink on failure, or you'll cache a rate-limit
   message as an "asset" forever.
6. **Size lives in two flags.** Intermediate segments stay `-crf 20 -preset
   veryfast` (throwaway, fast). Only the *final* pass compresses:
   `-crf 30 -preset <auto> -movflags +faststart`. That keeps output small.
7. **The storyboard is the API.** All creative choices are data at the top; the
   engine never changes.

---

## Speed & size — what to expect

Measured at 720p on a typical container. Render time = fetch + build + final encode.

| Output length | Render time | File size (720p, CRF 30) | Final preset (auto) |
|---|---|---|---|
| 20s | ~45s cold / ~35s warm | ~1.5 MB | `veryslow` |
| 2 min | ~1–2 min | ~11 MB | `slow` |
| 10 min | ~3–5 min | ~45–60 MB | `medium` |

Two safeguards are **built in** so long videos stay fast and small:

- **Auto final preset** (`finalPreset`): `veryslow` ≤60s, `slow` ≤180s, else
  `medium`. `veryslow` is ~1× realtime at 720p — great for a 20s promo, but it
  would push a 10-min film past 10 minutes of encoding, so longer outputs drop to
  `medium` (~0.15× realtime) for ~10% larger files.
- **One shared browser** across all cards (launching Chromium per card costs
  ~4.5s each).

**Levers if you need it smaller:** raise CRF to 32–34, drop to 540p
(`W/H = 960/540`), or lower audio to 96 kbps. For an exact target size, switch the
final pass to two-pass ABR (`-b:v 500k`).

---

## Licensing

- **Pixabay**: credit the source when you show results; cache/download to your
  own server (no permanent hotlinking); don't mass-download. The generator builds
  a credits card automatically and caches every asset.
- **Jamendo**: tracks carry per-license terms (many require attribution) — keep
  the track credit in the output.

Generated artifacts land in `.cache/`, `.work/`, `out/` — safe to gitignore.
