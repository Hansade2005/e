// Records a full guided tour of Ez2go to a .webm via Playwright's built-in
// video recorder. transcode-demo.sh then turns it into a compact .mp4.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const OUT = 'e2e/video';
fs.mkdirSync(OUT, { recursive: true });

const W = 412;
const H = 880;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true, // lets OSM map tiles load over TLS in the sandbox
  recordVideo: { dir: OUT, size: { width: W, height: H } },
});
const page = await ctx.newPage();
const tid = (id) => page.locator(`[data-testid="${id}"]`);
// Deep in a long session the expo-router stack can keep a prior /search screen
// mounted; the top (active) screen renders last in the DOM, so tap the last match.
const tapTop = (id) => tid(id).last().click({ timeout: 10000 });
const wait = (ms) => page.waitForTimeout(ms);

// ---- on-screen caption overlay (pointer-events:none so it never blocks taps)
async function caption(title, sub = '') {
  await page
    .evaluate(
      ([t, s]) => {
        let el = document.getElementById('__demo_cap');
        if (!el) {
          el = document.createElement('div');
          el.id = '__demo_cap';
          el.style.cssText =
            'position:fixed;left:14px;right:14px;bottom:18px;z-index:99999;pointer-events:none;' +
            'font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;gap:3px;' +
            'background:rgba(14,23,38,.92);color:#fff;padding:13px 16px;border-radius:16px;' +
            'box-shadow:0 10px 30px rgba(14,23,38,.45);transition:opacity .25s;border:1px solid rgba(0,194,168,.45)';
          document.body.appendChild(el);
        }
        el.style.opacity = '1';
        el.innerHTML =
          `<div style="font-size:16px;font-weight:700;letter-spacing:-.2px">${t}</div>` +
          (s ? `<div style="font-size:12.5px;opacity:.8">${s}</div>` : '');
      },
      [title, sub],
    )
    .catch(() => {});
}
async function hideCaption() {
  await page
    .evaluate(() => {
      const el = document.getElementById('__demo_cap');
      if (el) el.style.opacity = '0';
    })
    .catch(() => {});
}

const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

async function scene(name, fn) {
  process.stdout.write(`🎬 ${name} ... `);
  try {
    await fn();
    console.log('ok');
  } catch (e) {
    console.log('FAILED @ ' + page.url() + ' :: ' + e.message);
    throw e;
  }
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // 1. Welcome
  await scene('welcome', async () => {
    await tid('cta-guest').waitFor({ timeout: 20000 });
    await caption('Ez2go', 'A rider-owned ride-share — built on free OpenStreetMap');
    await wait(2600);
  });

  // 2. Enter + home
  await scene('home', async () => {
    await tid('cta-guest').click();
    await tid('search-bar').waitFor({ timeout: 15000 });
    await caption('Your map home', 'Live nearby cars, saved places, scheduling');
    await wait(2600);
  });

  // 3. AI assistant
  await scene('assistant', async () => {
    await caption('Ask Ez — AI assistant', 'Powered by an LLM, with an offline fallback');
    await tid('open-assistant').click();
    await tid('chat-input').waitFor({ timeout: 10000 });
    await tid('chat-input').fill('Any promo codes I can use?');
    await wait(500);
    await tid('chat-send').click();
    await page.locator('[data-testid="msg-peer"]').nth(1).waitFor({ timeout: 20000 });
    await wait(2200);
    await tid('chat-back').click();
    await tid('search-bar').waitFor({ timeout: 10000 });
  });

  // 4. Search destination
  await scene('search', async () => {
    await caption('Set a destination', 'OpenStreetMap geocoding, with offline fallback');
    await tid('search-bar').click();
    await tid('search-input').waitFor({ timeout: 10000 });
    await wait(900);
    await tapTop('result-l2'); // Union Station
    await tid('book-ride').waitFor({ timeout: 20000 });
    await wait(1400);
  });

  // 5. Multi-stop
  await scene('multi-stop', async () => {
    await caption('Multi-stop rides', 'Add a waypoint — route & fare recompute');
    await tid('add-stop').click();
    await tid('search-input').waitFor({ timeout: 10000 });
    await wait(700);
    await tapTop('result-l3');
    await tid('stop-0').waitFor({ timeout: 15000 });
    await wait(2000);
  });

  // 6. Vehicle + preferences
  await scene('preferences', async () => {
    await caption('Choose your ride', 'Driver gender, favorites & ride preferences');
    await tid('vehicle-ezpremium').click();
    await wait(700);
    await tid('gender-pref-female').click();
    await wait(500);
    await tid('ride-pref-quiet').click();
    await tid('ride-pref-bags').click();
    await wait(1600);
  });

  // 7. Book + live tracking
  await scene('tracking', async () => {
    await caption('Live tracking', 'Matching → en-route → arrived → in-progress');
    await tid('book-ride').click();
    await tid('cancel-ride').waitFor({ timeout: 15000 });
    await wait(2400);
  });

  // 8. Chat with driver
  await scene('chat', async () => {
    await caption('Chat with your driver', 'Poll-based messaging — no costly realtime');
    await tid('message-driver').waitFor({ timeout: 15000 });
    await tid('message-driver').click();
    await tid('chat-input').waitFor({ timeout: 10000 });
    await tid('chat-input').fill('On my way out');
    await wait(400);
    await tid('chat-send').click();
    await wait(700);
    await page.locator('[data-testid="quick-Thanks!"]').click();
    await wait(1400);
    await tid('chat-back').click();
    await tid('share-trip').waitFor({ timeout: 10000 });
  });

  // 9. Safety
  await scene('safety', async () => {
    await caption('Safety toolkit', 'Share trip, emergency dialer, trusted contacts');
    await tid('share-trip').click();
    await tid('safety-share').click({ timeout: 10000 });
    await wait(1500);
    await tid('safety-back').click();
    await tid('share-trip').waitFor({ timeout: 10000 });
  });

  // 10. Complete + tip + favorite
  await scene('complete', async () => {
    await caption('Trip complete', 'Tip, rate, and save a favorite driver');
    await tid('complete-done').waitFor({ timeout: 60000 });
    await wait(1200);
    await tid('tip-5').click().catch(() => {});
    await wait(600);
    await tid('favorite-driver').click().catch(() => {});
    await wait(1400);
    await tid('complete-done').click();
    await tid('search-bar').waitFor({ timeout: 15000 });
  });

  // 11. Editable profile
  await scene('edit-profile', async () => {
    await caption('Editable profile', 'Update your name and phone');
    await tid('open-profile').click();
    await tid('edit-profile').click({ timeout: 10000 });
    await tid('edit-name').waitFor({ timeout: 10000 });
    await tid('edit-name').fill('Alex Rivera');
    await wait(500);
    await tid('edit-phone').fill('(555) 222-3344');
    await wait(600);
    await tid('edit-save').click();
    await wait(1200);
  });

  // 12. Settings
  await scene('settings', async () => {
    await caption('Settings', 'Distance units, notifications, ride defaults');
    await tid('menu-settings').click({ timeout: 10000 });
    await tid('units-km').click({ timeout: 10000 });
    await wait(500);
    await tid('toggle-promos').click();
    await wait(1300);
    await tid('settings-back').click();
  });

  // 13. Wallet + promo
  await scene('wallet', async () => {
    await caption('Ez Wallet', 'Apply a promo code — credit auto-applies at checkout');
    await tid('menu-payments').click({ timeout: 10000 });
    await tid('promo-input').waitFor({ timeout: 10000 });
    await tid('promo-input').fill('EZ10');
    await wait(500);
    await tid('apply-promo').click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="wallet-balance"]')?.textContent?.includes('10.00'),
      { timeout: 8000 },
    );
    await wait(1300);
    await tid('pay-back').click();
  });

  // 14. Referral
  await scene('referral', async () => {
    await caption('Refer & earn', 'Redeem a friend’s code for $10 credit');
    await tid('menu-referral').click({ timeout: 10000 });
    await tid('referral-input').waitFor({ timeout: 10000 });
    await tid('referral-input').fill('EZFRIEND');
    await wait(500);
    await tid('referral-redeem').click();
    await tid('referral-redeemed').waitFor({ timeout: 8000 });
    await wait(1400);
    await tid('referral-back').click();
  });

  // 15. Rider investment
  await scene('invest', async () => {
    await caption('Own a piece of Ez2go', 'Riders can invest in the platform too');
    await tid('menu-invest').click({ timeout: 10000 });
    await tid('invest-amount-100').click({ timeout: 10000 });
    await wait(500);
    await tid('invest-confirm').click();
    await tid('invest-done').waitFor({ timeout: 12000 });
    await wait(1400);
    await tid('invest-done').click();
    await tid('profile-back').click();
    await tid('search-bar').waitFor({ timeout: 10000 });
  });

  // 16. Schedule a ride
  await scene('schedule', async () => {
    await caption('Schedule for later', 'Book a ride ahead of time');
    await tid('schedule-pill').click();
    await tid('time-30').click({ timeout: 10000 });
    await wait(500);
    await tid('confirm-time').click();
    await tid('schedule-pill').waitFor({ timeout: 10000 });
    await wait(800);
    await tid('search-bar').click();
    await tapTop('result-l2');
    await tid('book-ride').waitFor({ timeout: 20000 });
    await wait(1000);
    await tid('book-ride').click();
    await tid('search-bar').waitFor({ timeout: 15000 });
  });

  // 17. Activity feed
  await scene('activity', async () => {
    await caption('Activity feed', 'Scheduled rides, promos & notifications');
    await tid('open-activity').click();
    await tid('activity-back').waitFor({ timeout: 10000 });
    await wait(2000);
    await tid('activity-back').click();
    await tid('search-bar').waitFor({ timeout: 10000 });
    // clean slate for the driver leg
    await page.reload({ waitUntil: 'networkidle' });
    await tid('search-bar').waitFor({ timeout: 15000 });
  });

  // 18. Become a driver
  await scene('driver-dashboard', async () => {
    await caption('Driver side', 'Switch to driving in one tap');
    await tid('open-profile').click();
    await tid('become-driver').click({ timeout: 10000 });
    await tid('toggle-online').waitFor({ timeout: 12000 });
    await wait(1800);
  });

  // 19. Go online + accept + drive
  await scene('driver-trip', async () => {
    await caption('Go online & accept', 'Receive a request, pick up, complete the trip');
    await tid('toggle-online').click();
    await tid('accept-ride').waitFor({ timeout: 20000 });
    await wait(1400);
    await tid('accept-ride').click();
    await tid('driver-advance').waitFor({ timeout: 10000 });
    await wait(900);
    await tid('driver-advance').click(); // to_pickup -> arrived
    await wait(700);
    await tid('driver-advance').click(); // arrived -> in_progress
    await wait(700);
    await tid('driver-advance').click(); // in_progress -> completed
    await tid('driver-done').waitFor({ timeout: 10000 });
    await page.locator('[data-testid="star-4"]').click();
    await wait(1300);
    await tid('driver-done').click();
    await tid('toggle-online').waitFor({ timeout: 10000 });
  });

  // 20. Earnings + cash out & invest
  await scene('earnings', async () => {
    await caption('Earnings & cash out', 'Drivers keep 100% — and can buy equity');
    await tid('open-earnings').click();
    await tid('open-cashout').waitFor({ timeout: 10000 });
    await wait(2000);
    await tid('open-cashout').click();
    await tid('cashout-confirm').waitFor({ timeout: 10000 });
    await tid('invest-50').click();
    await wait(1400);
    await tid('cashout-confirm').click();
    await tid('cashout-done').waitFor({ timeout: 10000 });
    await wait(1600);
  });

  // outro
  await scene('outro', async () => {
    await caption('Ez2go', 'Rider-owned · OpenStreetMap · built with Expo');
    await wait(2800);
    await hideCaption();
    await wait(400);
  });
} finally {
  await page.close();
  await ctx.close(); // flush the video file
  await browser.close();
}

const file = fs.readdirSync(OUT).find((f) => f.endsWith('.webm'));
console.log(`\nErrors: ${errors.length}`);
errors.slice(0, 8).forEach((e) => console.log('  •', e));
console.log('VIDEO:', file ? `${OUT}/${file}` : '(none)');
