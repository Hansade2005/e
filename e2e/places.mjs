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
    if (errors.length) errors.slice(0, 8).forEach((er) => console.log('   err:', er));
    await page.screenshot({ path: `${SHOTS}/fail-${name}.png` }).catch(() => {});
    throw e;
  }
}

await page.goto(BASE, { waitUntil: 'networkidle' });

await step('enter-as-guest', async () => {
  await tid('cta-guest').click({ timeout: 15000 });
  await tid('search-bar').waitFor({ timeout: 15000 });
});

await step('open-saved-places', async () => {
  await tid('open-profile').click();
  await tid('menu-places').click({ timeout: 10000 });
  await tid('slot-home').waitFor({ timeout: 10000 });
});

await step('set-home', async () => {
  await tid('slot-home').click();
  await tid('places-search-input').fill('Union');
  await tid('place-result-l2').click({ timeout: 15000 }); // Union Station
  // back on the list, Home slot now shows the chosen place
  await tid('slot-home').waitFor({ timeout: 10000 });
});
await page.screenshot({ path: `${SHOTS}/p1-saved.png` });

await step('return-home', async () => {
  await tid('places-back').click();
  await tid('profile-back').click();
  await tid('chip-home').waitFor({ timeout: 10000 });
});

await step('home-chip-routes-to-ride', async () => {
  await tid('chip-home').click();
  await tid('book-ride').waitFor({ timeout: 20000 }); // saved Home → select-ride
});
await page.screenshot({ path: `${SHOTS}/p2-ride-from-home.png` });

console.log(`\nConsole/page errors: ${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log('  •', e));
await browser.close();
console.log(errors.length === 0 ? '\n✅ SAVED PLACES FLOW PASSED' : '\n⚠️ passed with console errors');
process.exit(0);
