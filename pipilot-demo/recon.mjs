import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: { server: process.env.HTTPS_PROXY || 'http://127.0.0.1:35921' },
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--ssl-version-max=tls1.2'],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();

const reqs = new Set();
page.on('request', (r) => {
  const u = r.url();
  if (u.includes('supabase') || u.includes('/auth/') || u.includes('/api/')) reqs.add(u.split('?')[0]);
});

try {
  console.log('navigating to https://pipilot.dev/app ...');
  await page.goto('https://pipilot.dev/app', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);
  console.log('TITLE:', await page.title());
  console.log('URL  :', page.url());
  await page.screenshot({ path: './shots/00-loggedout.png', fullPage: false });

  const ls = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      out[k] = (localStorage.getItem(k) || '').slice(0, 120);
    }
    return out;
  });
  console.log('LOCALSTORAGE KEYS:', JSON.stringify(ls, null, 2));

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 600));
  console.log('BODY TEXT SNIPPET:\n', bodyText);

  console.log('NETWORK (supabase/auth/api):');
  for (const u of reqs) console.log('  ', u);
} catch (e) {
  console.log('recon error:', e.message.split('\n')[0]);
} finally {
  await ctx.close();
  await browser.close();
}
