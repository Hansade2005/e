import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const SHOTS = 'e2e';
const COORD = { latitude: 37.7793, longitude: -122.4193 }; // SF City Hall area

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 414, height: 896 },
  permissions: ['geolocation'],
  geolocation: COORD,
});
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
    await page.screenshot({ path: `${SHOTS}/fail-geo-${name}.png` }).catch(() => {});
    throw e;
  }
}

await page.goto(BASE, { waitUntil: 'networkidle' });

await step('enter-as-guest', async () => {
  await tid('cta-guest').click({ timeout: 15000 });
  await tid('pickup-label').waitFor({ timeout: 15000 });
});

await step('pickup-uses-device-location', async () => {
  // Auto-locate on mount (or tap the locate control) should move the pickup to
  // the granted coordinates. Nominatim may be blocked → "Near 37.779, -122.419".
  await tid('use-location').click();
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="pickup-label"]');
      const t = el?.textContent ?? '';
      return /37\.7/.test(t) || /city hall|san francisco|market st/i.test(t);
    },
    { timeout: 15000 },
  );
  const label = await tid('pickup-label').innerText();
  console.log('  pickup =', label.replace(/\n/g, ' '));
});
await page.screenshot({ path: `${SHOTS}/g1-geolocation.png` });

console.log(`\nConsole/page errors: ${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log('  •', e));
await browser.close();
console.log(errors.length === 0 ? '\n✅ GEOLOCATION FLOW PASSED' : '\n⚠️ passed with console errors');
process.exit(0);
