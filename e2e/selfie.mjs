import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const SHOTS = 'e2e';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/ERR_CERT|Failed to load resource|net::ERR|ERR_NAME_NOT_RESOLVED|Failed to fetch/.test(t)) return;
  errors.push(t.slice(0, 160));
});

const tid = (id) => page.locator(`[data-testid="${id}"]`);
async function step(name, fn) {
  process.stdout.write(`→ ${name} ... `);
  try {
    await fn();
    console.log('ok');
  } catch (e) {
    console.log('FAILED at url=' + page.url());
    if (errors.length) errors.slice(0, 8).forEach((er) => console.log('   err:', er));
    await page.screenshot({ path: `${SHOTS}/fail-selfie-${name}.png` }).catch(() => {});
    throw e;
  }
}

await page.goto(BASE, { waitUntil: 'networkidle' });

await step('become-driver', async () => {
  await tid('cta-guest').click({ timeout: 15000 });
  await tid('open-profile').click({ timeout: 10000 });
  await tid('become-driver').click({ timeout: 10000 });
  await tid('toggle-online').waitFor({ timeout: 12000 });
});

await step('reach-4-rides', async () => {
  // Simulate having completed 4 rides since the last safety selfie.
  await page.evaluate(() => {
    localStorage.setItem(
      'ez2go.driver.stats',
      JSON.stringify({ earningsToday: 0, tripsToday: 4, history: [], tripsSinceSelfie: 4 }),
    );
  });
  await page.reload({ waitUntil: 'networkidle' });
  await tid('toggle-online').waitFor({ timeout: 12000 });
  await tid('selfie-banner').waitFor({ timeout: 8000 }); // safety check surfaced
});
await page.screenshot({ path: `${SHOTS}/s1-selfie-due.png` });

await step('selfie-gates-online', async () => {
  await tid('toggle-online').click(); // should route to the selfie screen, not go online
  await tid('selfie-capture').waitFor({ timeout: 8000 });
});

await step('capture-and-continue', async () => {
  await tid('selfie-capture').click();
  await tid('selfie-continue').waitFor({ timeout: 8000 }); // verified
  await page.screenshot({ path: `${SHOTS}/s2-verified.png` });
  await tid('selfie-continue').click();
  await tid('toggle-online').waitFor({ timeout: 10000 }); // back on dashboard, online
});

await step('banner-cleared', async () => {
  // After the selfie, the safety banner is gone.
  const visible = await tid('selfie-banner').isVisible().catch(() => false);
  if (visible) throw new Error('selfie banner still showing after verification');
});

console.log(`\nConsole/page errors: ${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log('  •', e));
await browser.close();
console.log(errors.length === 0 ? '\n✅ SELFIE FLOW PASSED' : '\n⚠️ passed with console errors');
process.exit(0);
