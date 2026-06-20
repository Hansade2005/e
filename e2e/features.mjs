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
  if (/ERR_CERT|Failed to load resource|net::ERR|ERR_NAME_NOT_RESOLVED|a0 LLM/.test(t)) return;
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

// ---- AI assistant (A0 LLM, with offline fallback) ----
await step('ai-assistant', async () => {
  await tid('open-assistant').click();
  await tid('chat-input').waitFor({ timeout: 10000 });
  await tid('chat-input').fill('Any promo codes I can use?');
  await tid('chat-send').click();
  // greeting is peer #0; a reply makes peer #1 appear (real API or fallback).
  await page.locator('[data-testid="msg-peer"]').nth(1).waitFor({ timeout: 20000 });
  await tid('chat-back').click();
  await tid('search-bar').waitFor({ timeout: 10000 });
});
await page.screenshot({ path: `${SHOTS}/f1-assistant.png` });

// ---- Editable profile ----
await step('edit-profile', async () => {
  await tid('open-profile').click();
  await tid('edit-profile').click({ timeout: 10000 });
  await tid('edit-name').waitFor({ timeout: 10000 });
  await tid('edit-name').fill('Alex Demo');
  await tid('edit-phone').fill('(555) 222-3344');
  await tid('edit-save').click();
  // back on profile — name updated
  await page.waitForFunction(
    () => /Alex Demo/.test(document.body.innerText),
    { timeout: 8000 },
  );
  await tid('profile-back').click();
  await tid('search-bar').waitFor({ timeout: 10000 });
});

// ---- Settings: switch units + toggles ----
await step('settings', async () => {
  await tid('open-profile').click();
  await tid('menu-settings').click({ timeout: 10000 });
  await tid('units-km').click({ timeout: 10000 }); // switch to kilometers
  await tid('toggle-promos').click(); // toggle a notification pref
  await tid('settings-back').click();
  await tid('profile-back').click();
  await tid('search-bar').waitFor({ timeout: 10000 });
});

// ---- Wallet + promo code ----
await step('apply-promo', async () => {
  await tid('open-profile').click();
  await tid('menu-payments').click({ timeout: 10000 });
  await tid('promo-input').waitFor({ timeout: 10000 });
  await tid('promo-input').fill('EZ10');
  await tid('apply-promo').click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="wallet-balance"]')?.textContent?.includes('10.00'),
    { timeout: 8000 },
  );
  await tid('pay-back').click();
  await tid('profile-back').click();
  await tid('search-bar').waitFor({ timeout: 10000 });
});

// ---- Referral: code + redeem a friend's code ----
await step('referral', async () => {
  await tid('open-profile').click();
  await tid('menu-referral').click({ timeout: 10000 });
  await tid('referral-code').waitFor({ timeout: 10000 });
  await tid('referral-input').fill('EZFRIEND');
  await tid('referral-redeem').click();
  await tid('referral-redeemed').waitFor({ timeout: 8000 }); // $10 credited
  await page.screenshot({ path: `${SHOTS}/f0-referral.png` });
  await tid('referral-back').click();
  await tid('profile-back').click();
  await tid('search-bar').waitFor({ timeout: 10000 });
});
await page.screenshot({ path: `${SHOTS}/f2-wallet.png` });

// ---- Rider community ownership (invest) ----
await step('rider-invest', async () => {
  await tid('open-profile').click();
  await tid('menu-invest').click({ timeout: 10000 });
  await tid('invest-amount-100').click({ timeout: 10000 });
  await tid('invest-confirm').click();
  await tid('invest-done').waitFor({ timeout: 12000 }); // success: now an owner
  await tid('invest-done').click();
  await tid('profile-back').click();
  await tid('search-bar').waitFor({ timeout: 10000 });
});
await page.screenshot({ path: `${SHOTS}/f4-invest.png` });

// ---- Schedule a ride for later ----
await step('schedule-time', async () => {
  await tid('schedule-pill').click();
  await tid('time-30').click({ timeout: 10000 });
  await tid('confirm-time').click();
  await tid('schedule-pill').waitFor({ timeout: 10000 });
  // pill should no longer read "Now"
  const label = await tid('schedule-pill').innerText();
  if (/now/i.test(label)) throw new Error('schedule pill still shows Now: ' + label);
});

await step('book-scheduled', async () => {
  await tid('search-bar').click();
  await tid('result-l2').click({ timeout: 10000 }); // Union Station
  await tid('book-ride').waitFor({ timeout: 20000 });
  const label = await tid('book-ride').innerText();
  if (!/schedule/i.test(label)) throw new Error('expected a Schedule button, got: ' + label);
  await tid('book-ride').click();
  await tid('search-bar').waitFor({ timeout: 15000 }); // returns home
});

// ---- Activity feed shows the scheduled ride + notifications ----
await step('activity-feed', async () => {
  await tid('open-activity').click();
  await tid('activity-back').waitFor({ timeout: 10000 });
  await page.locator('[data-testid^="scheduled-"]').first().waitFor({ timeout: 10000 });
  await page.locator('[data-testid^="notif-"]').first().waitFor({ timeout: 10000 });
});
await page.screenshot({ path: `${SHOTS}/f3-activity.png` });

console.log(`\nConsole/page errors: ${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log('  •', e));
await browser.close();
console.log(errors.length === 0 ? '\n✅ FEATURES FLOW PASSED' : '\n⚠️ passed with console errors');
process.exit(0);
