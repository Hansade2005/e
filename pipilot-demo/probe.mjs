import { launch, authenticate } from './lib.mjs';

const { browser, ctx } = await launch();
try {
  await authenticate(ctx);
  const page = await ctx.newPage();
  await page.goto('https://pipilot.dev/app', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(7000);

  const info = await page.evaluate(() => {
    const pick = (el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      testid: el.getAttribute('data-testid') || '',
      aria: el.getAttribute('aria-label') || '',
      ph: el.getAttribute('placeholder') || '',
      txt: (el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    });
    const areas = [...document.querySelectorAll('textarea, [contenteditable="true"]')].map(pick);
    const btns = [...document.querySelectorAll('button')].map(pick).filter((b) => b.aria || b.txt || b.testid);
    return { areas, btns };
  });
  console.log('TEXT INPUTS:', JSON.stringify(info.areas, null, 1));
  console.log('BUTTONS:', JSON.stringify(info.btns.slice(0, 40), null, 1));
} finally {
  await ctx.close();
  await browser.close();
}
