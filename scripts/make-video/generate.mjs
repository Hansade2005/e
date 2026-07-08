// ────────────────────────────────────────────────────────────────────────
// generate.mjs — programmatic video generator (standalone, copy-pasteable).
//
// Renders a video from a storyboard: stock b-roll + Ken Burns stills + music,
// with Playwright-rendered title/credits cards, stitched by ffmpeg.
//
//   PIXABAY_KEY=<key> node generate.mjs
//
// Requirements: node 18+, ffmpeg, curl on PATH, and playwright:
//   npm i playwright && npx playwright install chromium
// Free Pixabay key: https://pixabay.com/api/docs/
//
// Everything creative lives in STORYBOARD / MUSIC / the card HTML below.
// The engine underneath never needs editing. See TEMPLATE.md for the method.
// ────────────────────────────────────────────────────────────────────────
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

// ── CONFIG ────────────────────────────────────────────────────────────────
const W = 1280, H = 720, FPS = 30, XF = 0.6; // canvas size + crossfade seconds
const KEY = process.env.PIXABAY_KEY;
if (!KEY) throw new Error('Set PIXABAY_KEY (free key: https://pixabay.com/api/docs/)');

// The storyboard — the only part most people edit.
//   title   : Playwright title card         { title, sub }
//   video   : Pixabay b-roll clip           { q, pick, start }
//   still   : Pixabay photo, Ken Burns pan   { q, pick, forward }
//   credits : auto-built attribution card
const STORYBOARD = [
  { kind: 'title',   dur: 3.6, title: 'YOUR TITLE', sub: 'a subtitle goes here' },
  { kind: 'video',   dur: 4.0, q: 'city aerial night', pick: 0, start: 1 },
  { kind: 'still',   dur: 3.4, q: 'city street traffic', pick: 1, forward: true },
  { kind: 'video',   dur: 4.0, q: 'driving car road', pick: 0, start: 0 },
  { kind: 'still',   dur: 3.4, q: 'taxi city', pick: 0, forward: false },
  { kind: 'credits', dur: 3.2 },
];

// Music bed. Direct URL keeps this dependency-light; swap in a JSONL lookup
// (see TEMPLATE.md) if you index tracks locally.
const MUSIC = { url: 'https://mp3d.jamendo.com/download/track/2165/mp31/', credit: 'Jamendo #2165' };

const CACHE = path.join(import.meta.dirname, '.cache');
const WORK = path.join(import.meta.dirname, '.work');
const OUT = path.join(import.meta.dirname, 'out');
for (const d of [CACHE, WORK, OUT]) fs.mkdirSync(d, { recursive: true });

const t0 = process.hrtime.bigint();
const secs = () => Number(process.hrtime.bigint() - t0) / 1e9;

// ── HELPERS ────────────────────────────────────────────────────────────────
const ff = (a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: ['ignore', 'ignore', 'inherit'] });

function curl(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest; // cache-first
  try {
    // -f: fail on HTTP >= 400 so an error body never gets cached as an asset.
    execFileSync('curl', ['-f', '-sS', '-L', '--max-time', '120', '-o', dest, url], { stdio: ['ignore', 'ignore', 'inherit'] });
  } catch (e) {
    try { fs.unlinkSync(dest); } catch {}
    throw e;
  }
  return dest;
}

function pixabay(type, q) {
  const cf = path.join(CACHE, `${type}_${q}`.replace(/\W+/g, '_') + '.json');
  if (!fs.existsSync(cf)) {
    const base = type === 'video' ? 'https://pixabay.com/api/videos/' : 'https://pixabay.com/api/';
    const p = new URLSearchParams({ key: KEY, q, safesearch: 'true', per_page: '30', order: 'popular' });
    if (type !== 'video') p.set('image_type', 'photo');
    curl(`${base}?${p.toString()}`, cf);
  }
  const hits = JSON.parse(fs.readFileSync(cf, 'utf8')).hits || [];
  if (!hits.length) throw new Error(`No Pixabay ${type} results for "${q}"`);
  return hits;
}

// ── SEGMENT BUILDERS — every segment exits in the SAME format (critical) ────
const NORM = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1,format=yuv420p`;
const SEG = ['-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast']; // throwaway quality; recompressed once at the end

function brollSeg(out, url, dur, start = 0) {
  const src = curl(url, path.join(CACHE, `vid_${hash(url)}.mp4`));
  ff(['-ss', `${start}`, '-t', `${dur}`, '-i', src, '-an', '-vf', NORM, ...SEG, out]);
}

function kenBurnsSeg(out, url, dur, forward = true) {
  // Pan a fixed window across an over-scaled still. Only crop x/y evaluate per
  // frame, so this is ~40-100x faster than zoompan. (See TEMPLATE.md, rule 3.)
  const src = curl(url, path.join(CACHE, `img_${hash(url)}.jpg`));
  const cw = Math.round((W * 1.2) / 2) * 2;
  const ch = Math.round((H * 1.2) / 2) * 2;
  const p = forward ? `(t/${dur})` : `(1-(t/${dur}))`;
  const vf =
    `scale=${cw}:${ch}:force_original_aspect_ratio=increase,crop=${cw}:${ch},` +
    `crop=${W}:${H}:x='(in_w-out_w)*${p}':y='(in_h-out_h)*${p}',fps=${FPS},setsar=1,format=yuv420p`;
  ff(['-loop', '1', '-t', `${dur}`, '-i', src, '-an', '-vf', vf, ...SEG, out]);
}

// One shared browser for ALL cards — launching Chromium per card costs ~4.5s.
let _browser = null;
async function getBrowser() {
  if (!_browser) _browser = await chromium.launch();
  return _browser;
}
async function cardSeg(out, dur, html) {
  const vdir = fs.mkdtempSync(path.join(WORK, 'card-'));
  try {
    const browser = await getBrowser();
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: vdir, size: { width: W, height: H } } });
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(Math.round(dur * 1000));
    await page.close();
    await ctx.close(); // flushes the .webm
    const webm = fs.readdirSync(vdir).find((f) => f.endsWith('.webm'));
    if (!webm) throw new Error(`No .webm recorded in ${vdir}`);
    ff(['-t', `${dur}`, '-i', path.join(vdir, webm), '-an', '-vf', NORM, ...SEG, out]);
  } finally {
    fs.rmSync(vdir, { recursive: true, force: true }); // no leaked temp dirs
  }
}

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

// ── HTML CARDS — any CSS animation works; this is your branding ─────────────
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;
const titleCard = (t, s) => `<style>html,body{margin:0;height:100%;overflow:hidden}
 .bg{position:fixed;inset:0;background:radial-gradient(120% 120% at 20% 10%,#12324a 0%,#0E1726 55%,#080d16 100%)}
 .w{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:${FONT}}
 .k{width:64px;height:5px;border-radius:3px;background:#00C2A8;transform:scaleX(0);animation:g .8s .1s forwards cubic-bezier(.2,.8,.2,1)}
 h1{margin:0;color:#fff;font-size:88px;font-weight:800;letter-spacing:-2px;opacity:0;transform:translateY(24px);animation:r .9s .25s forwards cubic-bezier(.2,.8,.2,1)}
 p{margin:0;color:#9fb2c4;font-size:26px;font-weight:500;opacity:0;animation:f 1s .7s forwards}
 @keyframes g{to{transform:scaleX(1)}}@keyframes r{to{opacity:1;transform:none}}@keyframes f{to{opacity:1}}</style>
 <div class="bg"></div><div class="w"><div class="k"></div><h1>${t}</h1><p>${s}</p></div>`;
const creditsCard = (lines) => `<style>html,body{margin:0;height:100%;background:#0E1726;overflow:hidden}
 .w{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-family:${FONT};opacity:0;animation:f .8s .1s forwards}
 .t{color:#00C2A8;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px}
 .l{color:#c7d3df;font-size:20px}@keyframes f{to{opacity:1}}</style>
 <div class="w"><div class="t">Credits</div>${lines.map((l) => `<div class="l">${l}</div>`).join('')}</div>`;

// ── ASSEMBLE: xfade concat, then mix the music bed ──────────────────────────
function xfadeConcat(out, segs, durs) {
  const trans = ['fade', 'slideleft', 'fade', 'slideup', 'fade'];
  let filter = '', prev = '[0:v]', acc = durs[0];
  for (let i = 1; i < segs.length; i++) {
    const label = i === segs.length - 1 ? '[v]' : `[x${i}]`;
    // Each transition begins XF before the running total, and shortens it by XF.
    filter += `${prev}[${i}:v]xfade=transition=${trans[(i - 1) % trans.length]}:duration=${XF}:offset=${(acc - XF).toFixed(3)}${label};`;
    acc += durs[i] - XF;
    prev = label;
  }
  ff([...segs.flatMap((s) => ['-i', s]), '-filter_complex', filter.replace(/;$/, ''),
      '-map', '[v]', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', out]);
  return acc; // final total duration
}

// Auto-pick the FINAL compression preset from output length so long videos
// don't blow the render budget. veryslow ~1x realtime at 720p; medium ~0.15x.
function finalPreset(total) {
  if (total <= 60) return 'veryslow'; // best size, fine for short promos
  if (total <= 180) return 'slow';
  return 'medium'; // keeps multi-minute renders well under ~10 min
}

// ── RUN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('▶  generating\n');
  const music = curl(MUSIC.url, path.join(CACHE, `music_${hash(MUSIC.url)}.mp3`));
  const credits = [];
  const segs = [], durs = [];
  try {
    for (let i = 0; i < STORYBOARD.length; i++) {
      const s = STORYBOARD[i];
      const out = path.join(WORK, `seg_${String(i).padStart(2, '0')}.mp4`);
      if (s.kind === 'video') {
        const h = pixabay('video', s.q)[s.pick % 30];
        credits.push(`${h.user} / Pixabay`);
        brollSeg(out, (h.videos.medium || h.videos.small || h.videos.tiny).url, s.dur, s.start || 0);
      } else if (s.kind === 'still') {
        const h = pixabay('photo', s.q)[s.pick % 30];
        credits.push(`${h.user} / Pixabay`);
        kenBurnsSeg(out, h.largeImageURL, s.dur, s.forward);
      } else if (s.kind === 'title') {
        await cardSeg(out, s.dur, titleCard(s.title, s.sub));
      } else {
        await cardSeg(out, s.dur, creditsCard([...new Set([...credits, MUSIC.credit])]));
      }
      segs.push(out);
      durs.push(s.dur);
      console.log(`  · seg ${i} (${s.kind}) — ${secs().toFixed(1)}s`);
    }
  } finally {
    if (_browser) await _browser.close();
  }

  const silent = path.join(WORK, 'silent.mp4');
  const total = xfadeConcat(silent, segs, durs);

  const preset = finalPreset(total);
  const fIn = Math.min(1.5, total);
  const fOutStart = Math.max(0, total - 2);
  const fOutDur = Math.min(2, total - fOutStart);
  const finalOut = path.join(OUT, 'video.mp4');
  ff(['-i', silent, '-i', music,
      '-filter_complex',
      `[1:a]atrim=0:${total.toFixed(2)},afade=t=in:st=0:d=${fIn.toFixed(2)},afade=t=out:st=${fOutStart.toFixed(2)}:d=${fOutDur.toFixed(2)},volume=0.85[a]`,
      '-map', '0:v', '-map', '[a]',
      '-c:v', 'libx264', '-crf', '30', '-preset', preset, '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      '-c:a', 'aac', '-b:a', '128k', '-shortest', finalOut]);

  const mb = (fs.statSync(finalOut).size / 1048576).toFixed(2);
  console.log(`\n✅ ${path.relative(process.cwd(), finalOut)}`);
  console.log(`   ${total.toFixed(1)}s video · ${mb} MB · final preset "${preset}"`);
  console.log(`   sources: ${[...new Set([...credits, MUSIC.credit])].join(' · ')}`);
  console.log(`\n⏱  total wall-clock: ${secs().toFixed(1)}s`);
})();
