import { chromium } from 'playwright';
import { authenticate, PROXY, EXE } from './lib.mjs';
import { readdirSync } from 'fs';

const PROMPT =
  'Build a link-in-bio web app. Use an agent team to build these three independent features in parallel: (1) a QR code generator for each saved link, (2) a click-analytics dashboard with charts, and (3) a theme customizer with light/dark mode and color presets. ' +
  'IMPORTANT: Do NOT deploy the app anywhere and do NOT connect any hosting or deployment provider (no Puter, no Netlify, no Vercel, nothing). Build and run it only in the local preview. Skip any deploy or publish step entirely.';

const MAX_MS = Number(process.env.MAX_MS || process.env.RUN_MS || 2700000); // 45 min safety ceiling
const POLL_MS = 10000;
const SHOT_EVERY_MS = 20000;

const browser = await chromium.launch({
  headless: true,
  executablePath: EXE,
  proxy: { server: PROXY },
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--ssl-version-max=tls1.2'],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
  recordVideo: { dir: './videos', size: { width: 1440, height: 900 } },
});
let page; // assigned inside try so a setup failure still hits the finally cleanup

let shot = 0;
let lastShotAt = 0;
const snap = async (label, force = false) => {
  const now = Date.now();
  if (!force && now - lastShotAt < SHOT_EVERY_MS) return;
  lastShotAt = now;
  const n = String(shot++).padStart(2, '0');
  try {
    await page.screenshot({ path: `./shots/final-${n}-${label}.png` });
  } catch {}
};

// The preview shows a persistent "Connect Puter to deploy" CTA; keep it dismissed
// so the recording stays clean. Only acts when the modal is actually present.
const dismissDeployModal = async () => {
  const present = await page
    .evaluate(() => /Connect Puter|Sign in with Puter|OR PASTE A TOKEN/i.test(document.body.innerText))
    .catch(() => false);
  if (!present) return;
  const closers = [
    page.locator('button[aria-label="Close"]'),
    page.getByRole('button', { name: /close/i }),
    page.locator('button:has-text("×")'),
    page.locator('button:has-text("✕")'),
  ];
  for (const c of closers) {
    if (await c.count().catch(() => 0)) {
      await c.first().click({ timeout: 1000 }).catch(() => {});
      break;
    }
  }
};

const readState = () =>
  page
    .evaluate(() => {
      const txt = document.body.innerText;
      const m = txt.match(/Team tasks\s*(\d)\s*\/\s*3/i);
      return {
        teamDone: m ? Number(m[1]) : -1,
        working: /Working…|Working\.\.\.|is working/i.test(txt),
        errorBanner: /Preview has errors/i.test(txt),
        finished: /team finished|build complete|all tasks?\b.*complete|finished building/i.test(txt),
      };
    })
    .catch(() => null);

try {
  await authenticate(ctx);
  page = await ctx.newPage();
  await page.goto('https://pipilot.dev/app', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(7000);

  const ta = page.getByRole('textbox', { name: 'Describe the app you want to build' });
  await ta.waitFor({ state: 'visible', timeout: 45000 });
  await ta.click({ timeout: 20000 });
  await ta.fill(PROMPT);
  await snap('prompt', true);
  console.log('Submitting build prompt (Agent Teams, run-until-complete)…');
  await page.getByRole('button', { name: 'Start building' }).click({ timeout: 15000 });

  const start = Date.now();
  let stable = 0; // consecutive polls that look "done"
  let sawWorkersStart = false;
  while (Date.now() - start < MAX_MS) {
    await page.waitForTimeout(POLL_MS);
    await dismissDeployModal();
    const s = await readState();
    await snap(s ? `t${s.teamDone}${s.working ? '-work' : ''}${s.errorBanner ? '-err' : ''}` : 'poll');
    const el = Math.round((Date.now() - start) / 1000);
    console.log(
      `[${new Date().toISOString().slice(11, 19)}] +${el}s team=${s ? s.teamDone : '?'}/3 ` +
        `working=${s ? s.working : '?'} err=${s ? s.errorBanner : '?'} finished=${s ? s.finished : '?'} stable=${stable}`
    );
    if (!s) continue;
    if (s.teamDone >= 0 && (s.teamDone > 0 || s.working)) sawWorkersStart = true;

    // "reasonably complete": all 3 workers done, builder idle, no active error, sustained
    const looksDone = sawWorkersStart && s.teamDone === 3 && !s.working && !s.errorBanner;
    if (looksDone || s.finished) {
      stable += 1;
      if (stable >= 3) {
        console.log('*** Build reasonably complete ***');
        await snap('COMPLETE', true);
        break;
      }
    } else {
      stable = 0;
    }
  }
  await page.waitForTimeout(2000);
  await snap('final', true);
} catch (e) {
  console.log('driver error:', e.message.split('\n')[0]);
  await snap('error', true);
} finally {
  await ctx.close();
  await browser.close();
}

const vid = readdirSync('./videos').filter((f) => f.endsWith('.webm')).sort().pop();
console.log('VIDEO:', vid);
