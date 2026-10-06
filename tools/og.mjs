// תמונות שיתוף (og:image) 1200×630, אחת לכל שפה. הרצה: npm run og
// התמונה "עוצרת" את הפתיח באמצע הסריקה: מעל הקו אותיות חלקות, מתחתיו פיקסלים.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFile, rm } from 'node:fs/promises';
import { t } from '../src/content.mjs';

const font = f => pathToFileURL(resolve('public/fonts', f)).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

for (const L of Object.values(t)) {
  const tmp = resolve('public/fonts/_og.html');
  await writeFile(tmp, `<!doctype html><html lang="${L.lang}" dir="${L.dir}"><head><style>
@font-face{font-family:R;src:url(${font('rubik-hebrew-wght-normal.woff2')});font-weight:300 900;unicode-range:U+0590-05FF}
@font-face{font-family:R;src:url(${font('rubik-latin-wght-normal.woff2')});font-weight:300 900;unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:P;src:url(${font('pixels-he.woff2')});unicode-range:U+0590-05FF}
@font-face{font-family:P;src:url(${font('pixels-latin.woff2')});unicode-range:U+0000-00FF,U+2000-206F}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:radial-gradient(120% 90% at 50% 40%,#1d4596 55%,#16377a);color:#b4cfff;font-family:R;position:relative;padding:64px 80px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end}
body::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(to bottom,rgb(0 0 0/.14) 0 1px,transparent 1px 3px)}
.top{position:absolute;top:56px;inset-inline:80px;display:flex;justify-content:space-between;font-family:P;font-size:30px}
.cur{display:inline-block;width:.7em;height:.9em;background:currentColor;vertical-align:-.1em;margin-inline-start:.1em}
.name{display:grid;color:#fff;font-weight:800;font-size:${L.lang === 'he' ? 210 : 128}px;white-space:nowrap;line-height:.95;letter-spacing:-.02em;position:relative}
.name span{grid-area:1/1}
.s{clip-path:inset(0 0 42% 0)}
.p{font-family:P;font-weight:400;clip-path:inset(58% 0 0 0)}
.name::after{content:'';position:absolute;inset-inline:-40px;top:58%;height:3px;background:#fff;box-shadow:0 0 16px 4px rgb(180 207 255/.9)}
.tag{font-size:38px;margin-top:28px;max-width:22ch;line-height:1.3}
</style></head><body>
<div class="top"><span dir="ltr">READY<span class="cur"></span></span><span>tsemach.dev</span></div>
<div class="name"><span class="s">${L.name}</span><span class="p">${L.name}</span></div>
<div class="tag">${L.tagline}</div>
</body></html>`);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/og-${L.lang}.png` });
  await rm(tmp);
  console.log('og', L.lang);
}
await browser.close();
