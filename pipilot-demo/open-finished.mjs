import { launch, authenticate } from './lib.mjs';

const { browser, ctx } = await launch();
try {
  await authenticate(ctx);
  const page = await ctx.newPage();
  await page.goto('https://pipilot.dev/app', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: './shots/clean-00-dashboard.png' });

  // Open the most recent project (the link-in-bio build).
  const names = ['Link In Bio Builder', 'Linkloom', 'Link-In-Bio', 'Link In Bio'];
  let opened = false;
  for (const n of names) {
    const el = page.getByText(n, { exact: false }).first();
    if (await el.count().catch(() => 0)) {
      await el.click({ timeout: 8000 }).catch(() => {});
      opened = true;
      console.log('clicked project entry:', n);
      break;
    }
  }
  if (!opened) console.log('no named project entry found on dashboard');
  await page.waitForTimeout(9000); // let the workspace + preview load
  await page.screenshot({ path: './shots/clean-01-opened.png' });
  console.log('URL:', page.url());

  // Close any modal (Connect Puter to deploy, etc.)
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(600);
  for (const name of [/close/i, /dismiss/i, /^×$/, /^✕$/]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.count().catch(() => 0)) {
      await b.click({ timeout: 4000 }).catch(() => {});
      console.log('clicked close button:', name);
    }
  }
  // Fallback: click any X glyph inside a dialog
  await page
    .locator('[role="dialog"] button, .modal button, button:has-text("×")')
    .first()
    .click({ timeout: 3000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './shots/clean-02-modal-closed.png' });

  const stillModal = await page
    .evaluate(() => /Connect Puter|Sign in with Puter|OR PASTE A TOKEN/i.test(document.body.innerText))
    .catch(() => null);
  console.log('modal still present?', stillModal);

  await page.waitForTimeout(1500);
  await page.screenshot({ path: './shots/clean-03-final.png', fullPage: false });
  console.log('done');
} catch (e) {
  console.log('error:', e.message.split('\n')[0]);
} finally {
  await ctx.close();
  await browser.close();
}
