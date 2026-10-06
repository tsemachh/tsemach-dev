// תמונות שיתוף (og:image) 1200×630: סצנה מתוך משחק הפתיח, עם הספרייטים של המשחק עצמו —
// מערך חייזרים, פיצוץ שהפיקסלים שלו עפים אל השם, והשם בגופן הפיקסלים. בלי טקסט נוסף.
// הרצה: npm run build && npm run og && npm run build
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = p === '/og-scene.html' ? 'tools/og-scene.html' : join('dist', p);
  try { const b = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(4325);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const lang of ['he', 'en']) {
  await page.goto(`http://localhost:4325/og-scene.html?lang=${lang}`);
  await page.waitForSelector('body[data-ready]', { timeout: 10000 });
  await page.screenshot({ path: `public/og-${lang}.png` });
  console.log('og', lang);
}
await browser.close();
server.close();
