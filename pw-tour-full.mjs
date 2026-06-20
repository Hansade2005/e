import { chromium } from 'playwright';
import { readdirSync } from 'fs';

const URL = process.env.APP_URL || 'http://localhost:57800';
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 880 },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
  permissions: ['geolocation'],
  geolocation: { latitude: 39.0997, longitude: -94.5786 },
  recordVideo: { dir: './videos-tour', size: { width: 412, height: 880 } },
});
const page = await ctx.newPage();
const pause = (ms) => page.waitForTimeout(ms);
const tid = (id) => page.locator(`[data-testid="${id}"]`);
async function tap(id, ms = 1000) {
  try { await tid(id).click({ timeout: 15000 }); }
  catch (e) { console.log('  (skip ' + id + ')'); }
  await pause(ms);
}
async function fill(id, text, ms = 500) {
  try { await tid(id).fill(text); } catch {}
  await pause(ms);
}
async function waitFor(id, t = 60000) { try { await tid(id).waitFor({ timeout: t }); } catch {} }

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pause(3000); // welcome hero

  // ===== Onboarding (sign up as a rider) =====
  console.log('onboarding: rider sign-up');
  await tap('cta-get-started', 1200);
  await fill('input-name', 'Alex Rivera', 500);
  await fill('input-email', `demo${Date.now()}@ez2go.app`, 500);
  await fill('input-password', 'ez2go-demo-123', 700);
  await tap('submit-signup', 1600); // -> rider onboarding
  await tap('onb-next', 1500); // slide 1 -> 2
  await tap('onb-next', 1500); // slide 2 -> 3
  await tap('onb-next', 1800); // finish -> home

  // ===== Home + AI assistant =====
  console.log('home + assistant');
  await pause(1200);
  await tap('open-assistant', 1100);
  await fill('chat-input', 'How do I save on a ride to the airport?', 500);
  await tap('chat-send', 2800);
  await tap('chat-back', 1200);

  // ===== Activity feed =====
  console.log('activity feed');
  await tap('open-activity', 2000);
  await tap('activity-back', 1000);

  // ===== Profile: payments + promo, saved places, invest =====
  console.log('profile: payments / places / invest');
  await tap('open-profile', 1200);
  await tap('menu-payments', 1300);
  await fill('promo-input', 'EZ10', 500);
  await tap('apply-promo', 1800); // wallet +$10
  await tap('pay-back', 1000);
  await tap('menu-places', 1800); // saved places
  await tap('places-back', 1000);
  await tap('menu-invest', 1300); // Own Ez2go
  await tap('invest-amount-50', 1000);
  await tap('invest-confirm', 2600); // success
  await tap('invest-done', 1200); // -> profile
  await tap('profile-back', 1200); // -> home

  // ===== Schedule peek =====
  console.log('schedule');
  await tap('schedule-pill', 900);
  await tap('time-30', 700);
  await tap('confirm-time', 1200);
  await tap('schedule-pill', 800);
  await tap('time-now', 700);
  await tap('confirm-time', 1200);

  // ===== Book a ride =====
  console.log('book a ride');
  await tap('search-bar', 1300);
  await tap('result-l2', 2400); // Union Station, KC -> select-ride
  await pause(1200);
  await tap('vehicle-ezpremium', 1800);
  await tap('book-ride', 3500); // tracking

  // ===== Live tracking + chat + safety =====
  console.log('tracking + chat + safety');
  await tap('message-driver', 1100);
  await fill('chat-input', 'On my way out', 500);
  await tap('chat-send', 1900);
  await tap('chat-back', 1100);
  await tap('share-trip', 1500); // safety
  await tap('safety-share', 1500);
  await tap('safety-back', 1000);
  await waitFor('complete-done', 60000);
  await pause(1800);

  // ===== Receipt + tip + rating =====
  console.log('complete');
  await tap('tip-5', 900);
  await page.locator('[data-testid="star-5"]').click({ timeout: 5000 }).catch(() => {});
  await pause(1300);
  await tap('complete-done', 1800); // -> home

  // ===== Trip history + details =====
  console.log('history + details');
  await tap('open-profile', 1100);
  await tap('menu-history', 1500);
  await page.locator('[data-testid^="trip-"]').first().click({ timeout: 10000 }).catch(() => {});
  await pause(2200); // trip details
  await tap('td-back', 1000);
  await tap('history-back', 1000); // -> profile

  // ===== Become a driver (driver onboarding) =====
  console.log('driver onboarding');
  await tap('become-driver', 1800); // signed-up rider -> driver setup
  await fill('drv-make', 'Toyota', 400);
  await fill('drv-model', 'Prius', 400);
  await fill('drv-plate', 'EZ-4821', 400);
  await tap('drv-gender-male', 600);
  await tap('drv-onb-next', 1200);
  await fill('drv-license', 'D-1234567', 400);
  await fill('drv-insurance', 'State Farm', 600);
  await tap('drv-onb-next', 1200);
  await pause(800); // payout step
  await tap('drv-onb-next', 1800); // -> dashboard

  // ===== Driver: online -> offer -> trip =====
  console.log('driver trip');
  await tap('toggle-online', 1200);
  await waitFor('accept-ride', 20000);
  await pause(1500);
  await tap('accept-ride', 1600);
  await tap('driver-advance', 1300);
  await tap('driver-advance', 1300);
  await tap('driver-advance', 1500);
  await page.locator('[data-testid="star-5"]').click({ timeout: 5000 }).catch(() => {});
  await pause(1200);
  await tap('driver-done', 1600);

  // ===== Earnings + cash out + invest =====
  console.log('earnings + cashout');
  await tap('open-earnings', 1600);
  await tap('open-cashout', 1300);
  await tap('invest-50', 1200);
  await tap('cashout-confirm', 3000);
  await pause(2500);
} catch (e) {
  console.log('tour error:', e.message.split('\n')[0]);
} finally {
  await ctx.close();
  await browser.close();
}

const file = readdirSync('./videos-tour').filter((f) => f.endsWith('.webm')).pop();
console.log('VIDEO:', file);
