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

async function tap(id, ms = 1100) {
  try {
    await tid(id).click({ timeout: 15000 });
  } catch (e) {
    console.log('  (skip tap ' + id + ': ' + e.message.split('\n')[0] + ')');
  }
  await pause(ms);
}
async function type(id, text, ms = 700) {
  try {
    await tid(id).fill(text);
  } catch {}
  await pause(ms);
}
async function waitFor(id, t = 60000) {
  try {
    await tid(id).waitFor({ timeout: t });
  } catch {}
}

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pause(2800); // welcome hero

  // ---- Rider: enter + AI assistant ----
  console.log('rider: guest + assistant');
  await tap('cta-guest', 2200);
  await tap('open-assistant', 1100);
  await type('chat-input', 'Cheapest ride to the airport?', 600);
  await tap('chat-send', 2800);
  await tap('chat-back', 1200);

  // ---- Schedule peek (then back to Now) ----
  console.log('rider: schedule');
  await tap('schedule-pill', 900);
  await tap('time-30', 700);
  await tap('confirm-time', 1300);
  await tap('schedule-pill', 800);
  await tap('time-now', 700);
  await tap('confirm-time', 1200);

  // ---- Book a ride ----
  console.log('rider: book');
  await tap('search-bar', 1300);
  // Pick a built-in Kansas City destination (keeps the route + fare realistic).
  await tap('result-l2', 2400); // Union Station, KC -> select-ride
  await tap('vehicle-ezpremium', 1600);
  await tap('book-ride', 3500); // tracking, searching -> match

  // ---- Live tracking + chat ----
  console.log('rider: tracking + chat');
  await tap('message-driver', 1100);
  await type('chat-input', 'On my way out', 500);
  await tap('chat-send', 1900);
  await tap('chat-back', 1200);
  await waitFor('complete-done', 60000);
  await pause(1800);

  // ---- Receipt + tip + rating ----
  console.log('rider: complete');
  await tap('tip-5', 900);
  await page.locator('[data-testid="star-5"]').click({ timeout: 5000 }).catch(() => {});
  await pause(1400);
  await tap('complete-done', 2000); // back to home

  // ---- Own Ez2go (rider invest) ----
  console.log('rider: invest');
  await tap('open-profile', 1100);
  await tap('menu-invest', 1500);
  await tap('invest-amount-100', 1100);
  await tap('invest-confirm', 2800); // success
  await tap('invest-done', 1300);

  // ---- Switch to driving ----
  console.log('driver: dashboard + offer');
  await tap('become-driver', 2200); // guest skips onboarding -> dashboard
  await tap('toggle-online', 1200);
  await waitFor('accept-ride', 20000);
  await pause(1500);
  await tap('accept-ride', 1600); // trip

  // ---- Drive the trip ----
  console.log('driver: trip');
  await tap('driver-advance', 1300);
  await tap('driver-advance', 1300);
  await tap('driver-advance', 1600); // completed
  await page.locator('[data-testid="star-5"]').click({ timeout: 5000 }).catch(() => {});
  await pause(1200);
  await tap('driver-done', 1600); // dashboard

  // ---- Earnings + cash out / invest ----
  console.log('driver: earnings + cashout');
  await tap('open-earnings', 1600);
  await tap('open-cashout', 1300);
  await tap('invest-50', 1200);
  await tap('cashout-confirm', 3000); // success
  await pause(2200);
} catch (e) {
  console.log('tour error:', e.message.split('\n')[0]);
} finally {
  await ctx.close(); // flush the .webm
  await browser.close();
}

const file = readdirSync('./videos-tour')
  .filter((f) => f.endsWith('.webm'))
  .pop();
console.log('VIDEO:', file);
