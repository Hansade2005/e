import { launch, authenticate, STORAGE_KEY } from './lib.mjs';

const { browser, ctx } = await launch();
const apiHits = [];

try {
  await authenticate(ctx);
  const page = await ctx.newPage();
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('supabase.co') && (u.includes('/auth/') || u.includes('/rest/'))) {
      apiHits.push(r.status() + ' ' + u.split('supabase.co')[1].split('?')[0]);
    }
  });

  await page.goto('https://pipilot.dev/app', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(8000); // let it refresh token + render dashboard

  console.log('URL  :', page.url());
  console.log('TITLE:', await page.title());

  const stored = await page.evaluate((k) => {
    const v = localStorage.getItem(k);
    if (!v) return null;
    try {
      const o = JSON.parse(v);
      return { access_token: (o.access_token || '').slice(0, 20) + '...', expires_at: o.expires_at, user: o.user && o.user.email };
    } catch {
      return v.slice(0, 60);
    }
  }, STORAGE_KEY);
  console.log('STORED SESSION:', JSON.stringify(stored));

  const body = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 900));
  console.log('----- VISIBLE TEXT -----\n' + body);

  console.log('----- SUPABASE API CALLS -----');
  for (const h of apiHits.slice(0, 25)) console.log(' ', h);

  await page.screenshot({ path: './shots/01-after-auth.png', fullPage: false });
  console.log('screenshot saved: shots/01-after-auth.png');
} catch (e) {
  console.log('error:', e.message.split('\n')[0]);
} finally {
  await ctx.close();
  await browser.close();
}
