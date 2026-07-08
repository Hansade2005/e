// Manifest-driven stock-video generator — proof of concept.
//
// Pipeline: query assets (Pixabay API + local Jamendo JSONL) -> download-once
// into a cache -> build normalized segments (Playwright title/credits cards +
// ffmpeg Ken Burns stills + trimmed b-roll) -> xfade concat -> mix a ducked
// music bed -> compact H.264 mp4. Prints per-phase and total wall-clock.
//
// Usage: PIXABAY_KEY=<your-key> node scripts/make-video/make.mjs
//        (free key: https://pixabay.com/api/docs/)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = 'scripts/make-video';
const CACHE = path.join(ROOT, '.cache'); // downloaded assets + API responses (24h rule)
const WORK = path.join(ROOT, '.work'); // intermediate segments
const OUT = path.join(ROOT, 'out');
for (const d of [CACHE, WORK, OUT]) fs.mkdirSync(d, { recursive: true });

const KEY = process.env.PIXABAY_KEY;
if (!KEY) throw new Error('Set PIXABAY_KEY (get a free key at https://pixabay.com/api/docs/)');
const W = 1280, H = 720, FPS = 30, XF = 0.6; // canvas + crossfade seconds

// ---- timing -------------------------------------------------------------
const t0 = process.hrtime.bigint();
const secs = () => Number(process.hrtime.bigint() - t0) / 1e9;
function logPhase(label, dt) {
  console.log(`  ⏱  ${label.padEnd(30)} +${dt.toFixed(2)}s`);
}

// ---- shell helpers ------------------------------------------------------
function ff(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
}
function curl(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest; // cache hit
  try {
    // -f: fail (non-zero exit) on HTTP >= 400 so an error body never poisons the cache.
    execFileSync('curl', ['-f', '-sS', '-L', '--max-time', '120', '-o', dest, url], { stdio: ['ignore', 'ignore', 'inherit'] });
  } catch (err) {
    try { fs.unlinkSync(dest); } catch {} // drop the partial/error file
    throw err;
  }
  return dest;
}

// ---- providers ----------------------------------------------------------
function pixabay(type, q) {
  const slug = `px_${type}_${q}`.replace(/\W+/g, '_');
  const cf = path.join(CACHE, `${slug}.json`);
  if (!fs.existsSync(cf)) {
    const base = type === 'video' ? 'https://pixabay.com/api/videos/' : 'https://pixabay.com/api/';
    const p = new URLSearchParams({ key: KEY, q, safesearch: 'true', per_page: '30', order: 'popular' });
    if (type !== 'video') p.set('image_type', 'photo');
    curl(`${base}?${p.toString()}`, cf);
  }
  return JSON.parse(fs.readFileSync(cf, 'utf8'));
}

function getVideo(q, pick = 0) {
  const hits = pixabay('video', q).hits || [];
  if (!hits.length) throw new Error(`No Pixabay videos for query: "${q}"`);
  const hit = hits[pick % hits.length];
  const v = hit.videos.medium || hit.videos.small || hit.videos.tiny;
  const dest = path.join(CACHE, `vid_${hit.id}.mp4`);
  curl(v.url, dest);
  return { file: dest, credit: `${hit.user} / Pixabay`, dur: hit.duration };
}

function getPhoto(q, pick = 0) {
  const hits = pixabay('photo', q).hits || [];
  if (!hits.length) throw new Error(`No Pixabay photos for query: "${q}"`);
  const hit = hits[pick % hits.length];
  const dest = path.join(CACHE, `img_${hit.id}.jpg`);
  curl(hit.largeImageURL, dest);
  return { file: dest, credit: `${hit.user} / Pixabay` };
}

function getMusic(mood) {
  const rows = fs
    .readFileSync(path.join(ROOT, 'assets/jamendo.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
  const row = rows.find((r) => r.moods.includes(mood)) || rows[0];
  const dest = path.join(CACHE, `music_${row.numeric_id}.mp3`);
  curl(row.stream_url, dest);
  return { file: dest, credit: `Jamendo #${row.numeric_id}`, page: row.page_url };
}

// ---- segment builders (all normalize to W×H, FPS, yuv420p, sar=1) --------
const NORM = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1,format=yuv420p`;

function videoSeg(out, file, dur, start = 0) {
  ff(['-ss', String(start), '-t', String(dur), '-i', file, '-an',
      '-vf', NORM, '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', out]);
}

function kenBurnsSeg(out, file, dur, forward = true) {
  // Pan a W×H window across an over-scaled still. Only crop's x/y evaluate per
  // frame, so this is ~40-100× faster than zoompan in this ffmpeg build (which
  // lacks crop `eval` and rejects `t` in zoompan-style w/h expressions).
  const over = 1.2;
  const cw = Math.round((W * over) / 2) * 2;
  const ch = Math.round((H * over) / 2) * 2;
  const p = forward ? `(t/${dur})` : `(1-(t/${dur}))`;
  const vf =
    `scale=${cw}:${ch}:force_original_aspect_ratio=increase,crop=${cw}:${ch},` +
    `crop=${W}:${H}:x='(in_w-out_w)*${p}':y='(in_h-out_h)*${p}',fps=${FPS},setsar=1,format=yuv420p`;
  ff(['-loop', '1', '-t', String(dur), '-i', file, '-an', '-vf', vf,
      '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', out]);
}

async function cardSeg(out, dur, html) {
  const vdir = fs.mkdtempSync(path.join(WORK, 'card-'));
  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: vdir, size: { width: W, height: H } } });
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(Math.round(dur * 1000));
    await page.close();
    await ctx.close();
    await browser.close();
    browser = null;
    const webmFile = fs.readdirSync(vdir).find((f) => f.endsWith('.webm'));
    if (!webmFile) throw new Error(`No .webm recorded in ${vdir}`);
    ff(['-t', String(dur), '-i', path.join(vdir, webmFile), '-an', '-vf', NORM,
        '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', out]);
  } finally {
    if (browser) try { await browser.close(); } catch {}
    try { fs.rmSync(vdir, { recursive: true, force: true }); } catch {}
  }
}

// themed HTML cards -------------------------------------------------------
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;
const titleHTML = (title, sub) => `<style>
  html,body{margin:0;height:100%;overflow:hidden}
  .bg{position:fixed;inset:0;background:radial-gradient(120% 120% at 20% 10%,#12324a 0%,#0E1726 55%,#080d16 100%)}
  .wrap{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:${FONT}}
  .kicker{width:64px;height:5px;border-radius:3px;background:#00C2A8;transform:scaleX(0);animation:grow .8s .1s forwards cubic-bezier(.2,.8,.2,1)}
  h1{margin:0;color:#fff;font-size:88px;font-weight:800;letter-spacing:-2px;opacity:0;transform:translateY(24px);animation:rise .9s .25s forwards cubic-bezier(.2,.8,.2,1)}
  p{margin:0;color:#9fb2c4;font-size:26px;font-weight:500;opacity:0;animation:fade 1s .7s forwards}
  @keyframes grow{to{transform:scaleX(1)}} @keyframes rise{to{opacity:1;transform:none}} @keyframes fade{to{opacity:1}}
</style><div class="bg"></div><div class="wrap"><div class="kicker"></div><h1>${title}</h1><p>${sub}</p></div>`;

const creditsHTML = (lines) => `<style>
  html,body{margin:0;height:100%;overflow:hidden}
  .bg{position:fixed;inset:0;background:#0E1726}
  .wrap{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-family:${FONT};opacity:0;animation:fade .8s .1s forwards}
  .t{color:#00C2A8;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px}
  .l{color:#c7d3df;font-size:20px}
  @keyframes fade{to{opacity:1}}
</style><div class="bg"></div><div class="wrap"><div class="t">Credits</div>${lines.map((l) => `<div class="l">${l}</div>`).join('')}</div>`;

// ---- xfade concat -------------------------------------------------------
function xfadeConcat(out, segs, durs) {
  const inputs = segs.flatMap((s) => ['-i', s]);
  const trans = ['fade', 'slideleft', 'fade', 'slideup', 'fade'];
  let filter = '';
  let prev = '[0:v]';
  let acc = durs[0];
  for (let i = 1; i < segs.length; i++) {
    const off = (acc - XF).toFixed(3);
    const label = i === segs.length - 1 ? '[v]' : `[x${i}]`;
    filter += `${prev}[${i}:v]xfade=transition=${trans[(i - 1) % trans.length]}:duration=${XF}:offset=${off}${label};`;
    acc += durs[i] - XF;
    prev = label;
  }
  ff([...inputs, '-filter_complex', filter.replace(/;$/, ''), '-map', '[v]',
      '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', out]);
  return acc; // total duration
}

// ---- MANIFEST (the storyboard) -----------------------------------------
const SCENES = [
  { kind: 'title', dur: 3.6, title: 'Ez2go', sub: 'Move your city' },
  { kind: 'video', dur: 4.0, q: 'city aerial night', pick: 0, start: 1 },
  { kind: 'photo', dur: 3.4, q: 'city street traffic', pick: 1, zoom: true },
  { kind: 'video', dur: 4.0, q: 'driving car road', pick: 0, start: 0 },
  { kind: 'photo', dur: 3.4, q: 'taxi city', pick: 0, zoom: false },
  { kind: 'credits', dur: 3.2 },
];
const MUSIC_MOOD = 'film';

// ---- run ----------------------------------------------------------------
console.log('▶  generating montage\n');
let m = secs();
const music = getMusic(MUSIC_MOOD);
const resolved = SCENES.map((s) => {
  if (s.kind === 'video') return { ...s, asset: getVideo(s.q, s.pick) };
  if (s.kind === 'photo') return { ...s, asset: getPhoto(s.q, s.pick) };
  return s;
});
logPhase('fetch assets (cache-first)', secs() - m);

const credits = [
  ...resolved.filter((s) => s.asset).map((s) => s.asset.credit),
  music.credit,
].filter((v, i, a) => a.indexOf(v) === i);

m = secs();
const segs = [];
const durs = [];
let idx = 0;
for (const s of resolved) {
  const st = secs();
  const out = path.join(WORK, `seg_${String(idx).padStart(2, '0')}.mp4`);
  if (s.kind === 'title') await cardSeg(out, s.dur, titleHTML(s.title, s.sub));
  else if (s.kind === 'credits') await cardSeg(out, s.dur, creditsHTML(credits));
  else if (s.kind === 'video') videoSeg(out, s.asset.file, s.dur, s.start || 0);
  else kenBurnsSeg(out, s.asset.file, s.dur, s.zoom);
  console.log(`     · seg ${idx} (${s.kind}) ${(secs() - st).toFixed(2)}s`);
  segs.push(out);
  durs.push(s.dur);
  idx++;
}
logPhase('build segments', secs() - m);

m = secs();
const silent = path.join(WORK, 'silent.mp4');
const total = xfadeConcat(silent, segs, durs);
logPhase('xfade concat', secs() - m);

m = secs();
const finalOut = path.join(OUT, 'montage.mp4');
// music bed: trim to length, gentle fades, compress final to a small file.
// Guard the fades so a very short total can't push afade start/duration negative.
const fadeIn = Math.min(1.5, total);
const fadeOutStart = Math.max(0, total - 2);
const fadeOutDur = Math.min(2, total - fadeOutStart);
ff(['-i', silent, '-i', music.file,
    '-filter_complex',
    `[1:a]atrim=0:${total.toFixed(2)},afade=t=in:st=0:d=${fadeIn.toFixed(2)},afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${fadeOutDur.toFixed(2)},volume=0.85[a]`,
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-crf', '30', '-preset', 'veryslow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', finalOut]);
logPhase('final encode + music', secs() - m);

const sz = (fs.statSync(finalOut).size / 1024 / 1024).toFixed(2);
console.log(`\n✅ ${finalOut}  —  ${total.toFixed(1)}s video, ${sz} MB`);
console.log(`   sources: ${credits.join(' · ')}`);
console.log(`\n⏱  TOTAL WALL-CLOCK: ${secs().toFixed(2)}s`);
