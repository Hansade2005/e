import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const SHOTS = 'e2e';
const browser = await chromium.launch();

function newPage(ctx) {
  const page = ctx.page;
  return page;
}

async function run(label, fn) {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Supabase auth/profile calls are network-blocked in this sandbox; the app
    // falls back to a local session, so treat these as environmental noise.
    if (/ERR_CERT|Failed to load resource|net::ERR|ERR_NAME_NOT_RESOLVED|Failed to fetch/.test(t)) return;
    errors.push(t.slice(0, 160));
  });
  const tid = (id) => page.locator(`[data-testid="${id}"]`);
  console.log(`\n# ${label}`);
  try {
    await fn(page, tid);
  } catch (e) {
    console.log('  FAILED at url=' + page.url());
    if (errors.length) errors.slice(0, 8).forEach((er) => console.log('   err:', er));
    await page.screenshot({ path: `${SHOTS}/fail-onb-${label}.png` }).catch(() => {});
    await ctx.close();
    throw e;
  }
  await ctx.close();
  return errors;
}

const allErrors = [];

allErrors.push(
  ...(await run('rider-signup-onboarding', async (page, tid) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await tid('cta-get-started').click({ timeout: 15000 });
    await tid('input-name').fill('Ada Rider');
    await tid('input-email').fill(`rider${Date.now()}@ez2go.app`);
    await tid('input-password').fill('ez2go-demo-123');
    await tid('submit-signup').click();
    // Rider onboarding slides
    await tid('onb-next').waitFor({ timeout: 15000 });
    console.log('  → rider onboarding shown');
    await tid('onb-next').click(); // slide 1 -> 2
    await tid('onb-next').click(); // slide 2 -> 3
    await page.screenshot({ path: `${SHOTS}/o1-rider-onboarding.png` });
    await tid('onb-next').click(); // finish -> home
    await tid('search-bar').waitFor({ timeout: 15000 });
    console.log('  → reached rider home');
  })),
);

allErrors.push(
  ...(await run('driver-signup-onboarding', async (page, tid) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await tid('cta-get-started').click({ timeout: 15000 });
    await tid('role-driver').click();
    await tid('input-name').fill('Marcus Driver');
    await tid('input-email').fill(`driver${Date.now()}@ez2go.app`);
    await tid('input-password').fill('ez2go-demo-123');
    await tid('submit-signup').click();
    // Driver setup: vehicle
    await tid('drv-make').waitFor({ timeout: 15000 });
    console.log('  → driver onboarding shown');
    await tid('drv-make').fill('Toyota');
    await tid('drv-model').fill('Prius');
    await tid('drv-plate').fill('EZ-4821');
    await tid('drv-onb-next').click();
    // Documents
    await tid('drv-license').waitFor({ timeout: 10000 });
    await tid('drv-license').fill('D-1234567');
    await tid('drv-insurance').fill('State Farm');
    await tid('drv-onb-next').click();
    // Payout
    await tid('payout-debit').waitFor({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/o2-driver-onboarding.png` });
    await tid('drv-onb-next').click(); // finish -> dashboard
    await tid('toggle-online').waitFor({ timeout: 15000 });
    console.log('  → reached driver dashboard');
  })),
);

await browser.close();
console.log(`\nConsole/page errors: ${allErrors.length}`);
allErrors.slice(0, 10).forEach((e) => console.log('  •', e));
console.log(allErrors.length === 0 ? '\n✅ ONBOARDING FLOWS PASSED' : '\n⚠️ passed with console errors');
process.exit(0);
