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
  // Ignore sandbox network noise: OSM tiles / routing are TLS-blocked here,
  // which the app is designed to fall back from. Real app errors still count.
  if (/ERR_CERT|Failed to load resource|net::ERR|ERR_NAME_NOT_RESOLVED/.test(t)) return;
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
    if (errors.length) errors.slice(0, 10).forEach((er) => console.log('   err:', er));
    await page.screenshot({ path: `${SHOTS}/fail-${name}.png` }).catch(() => {});
    throw e;
  }
}

await page.goto(BASE, { waitUntil: 'networkidle' });

// ---------------- RIDER FLOW ----------------
await step('welcome-loads', async () => {
  await tid('cta-guest').waitFor({ timeout: 15000 });
});

await step('enter-as-guest', async () => {
  await tid('cta-guest').click();
  await tid('search-bar').waitFor({ timeout: 15000 });
});
await page.screenshot({ path: `${SHOTS}/r1-home.png` });

await step('open-search', async () => {
  await tid('search-bar').click();
  await tid('search-input').waitFor({ timeout: 10000 });
});

await step('pick-destination', async () => {
  // Union Station is a built-in suggestion (id l2), no network needed.
  await tid('result-l2').click({ timeout: 10000 });
  await tid('book-ride').waitFor({ timeout: 20000 });
});
await page.screenshot({ path: `${SHOTS}/r2-select.png` });

await step('choose-premium', async () => {
  await tid('vehicle-ezpremium').click();
});

await step('book-ride', async () => {
  await tid('book-ride').click();
  await tid('cancel-ride').waitFor({ timeout: 15000 }); // searching/arriving
});
await page.screenshot({ path: `${SHOTS}/r3-tracking.png` });

await step('ride-completes', async () => {
  await tid('complete-done').waitFor({ timeout: 60000 });
});
await page.screenshot({ path: `${SHOTS}/r4-complete.png` });

await step('finish-ride', async () => {
  await tid('tip-5').click().catch(() => {});
  await tid('complete-done').click();
  await tid('search-bar').waitFor({ timeout: 15000 });
});

// ---------------- DRIVER FLOW ----------------
await step('go-to-profile', async () => {
  await tid('open-profile').click();
  await tid('become-driver').waitFor({ timeout: 10000 });
});

await step('become-driver', async () => {
  await tid('become-driver').click();
  await tid('toggle-online').waitFor({ timeout: 12000 });
});
await page.screenshot({ path: `${SHOTS}/d1-dashboard.png` });

await step('go-online-receive-offer', async () => {
  await tid('toggle-online').click();
  await tid('accept-ride').waitFor({ timeout: 20000 });
});
await page.screenshot({ path: `${SHOTS}/d2-offer.png` });

await step('accept-and-drive', async () => {
  await tid('accept-ride').click();
  await tid('driver-advance').waitFor({ timeout: 10000 });
  await tid('driver-advance').click(); // to_pickup -> arrived
  await page.waitForTimeout(400);
  await tid('driver-advance').click(); // arrived -> in_progress
  await page.waitForTimeout(400);
  await tid('driver-advance').click(); // in_progress -> completed
  await tid('driver-done').waitFor({ timeout: 10000 });
});
await page.screenshot({ path: `${SHOTS}/d3-trip-complete.png` });

await step('back-to-driving', async () => {
  await tid('driver-done').click();
  await tid('toggle-online').waitFor({ timeout: 10000 });
});

await step('view-earnings', async () => {
  await tid('open-earnings').click();
  await tid('earnings-back').waitFor({ timeout: 10000 });
});
await page.screenshot({ path: `${SHOTS}/d4-earnings.png` });

console.log(`\nConsole/page errors: ${errors.length}`);
errors.slice(0, 15).forEach((e) => console.log('  •', e));

await browser.close();
console.log(errors.length === 0 ? '\n✅ ALL FLOWS PASSED' : '\n⚠️ flows passed with console errors');
process.exit(0);
