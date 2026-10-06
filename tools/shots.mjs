// צילומי מסך של האתרים החיים, לתמונות הממוזערות בדף. הרצה: npm run shots
import { chromium } from 'playwright';
import sharp from 'sharp';
import { projects } from '../src/content.mjs';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  locale: 'he-IL',
});
for (const p of projects) {
  if (p.shotSrc) { // תמונה קבועה מה-repo (ראה content.mjs)
    const buf = Buffer.from(await (await fetch(p.shotSrc)).arrayBuffer());
    for (const w of [480, 960]) {
      await sharp(buf).resize(w, w * 3 / 4, { fit: 'cover', position: p.shotPos || 'top' }).webp({ quality: 78 }).toFile(`public/shots/${p.shot}-${w}.webp`);
    }
    console.log('ok', p.id, '(from repo)');
    continue;
  }
  const page = await ctx.newPage();
  try {
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(3000);
    await page.keyboard.press('Escape'); // סוגר חלונות עזרה שנפתחים בכניסה
    await page.getByRole('button', { name: /^(הבנתי|Got it|OK)$/ }).first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(400);
    const png = await page.screenshot({ type: 'png' });
    for (const w of [480, 960]) {
      await sharp(png).resize(w).webp({ quality: 74 }).toFile(`public/shots/${p.shot}-${w}.webp`);
    }
    console.log('ok', p.id);
  } catch (e) {
    console.log('FAIL', p.id, e.message.split('\n')[0]);
  }
  await page.close();
}
await browser.close();
