import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:8080';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 414, height: 896 } });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);

const bodyText = await page.locator('body').innerText().catch(() => '');
console.log('--- VISIBLE TEXT (first 400 chars) ---');
console.log(bodyText.slice(0, 400).replace(/\n+/g, ' | '));

await page.screenshot({ path: 'e2e/shot-welcome.png', fullPage: false });

console.log('\n--- CONSOLE ERRORS (' + errors.length + ') ---');
errors.slice(0, 20).forEach((e) => console.log('•', e.slice(0, 200)));

await browser.close();
process.exit(0);
