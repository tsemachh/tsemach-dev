// בדיקות: axe (WCAG 2.2 AA), צילומי מסך במחשב ובטלפון, Chromium + WebKit, פתיח ותנועה מופחתת.
// הרצה: npm run build && npm run check   → צילומים ב-check-out/
import { chromium, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(join('dist', p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end('not found'); }
}).listen(4321);
const base = 'http://localhost:4321';
await mkdir('check-out', { recursive: true });
const axeSrc = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
let failures = 0;

async function axe(page, label) {
  await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }));
  for (const v of r.violations) {
    failures++;
    console.log(`AXE ${label}: [${v.impact}] ${v.id} — ${v.help}`);
    v.nodes.slice(0, 3).forEach(n => console.log('   ', n.target.join(' '), n.failureSummary?.split('\n')[1] || ''));
  }
  if (!r.violations.length) console.log(`AXE ${label}: 0 violations (${r.passes.length} passed)`);
}

for (const [engine, name] of [[chromium, 'chromium'], [webkit, 'webkit']]) {
  const browser = await engine.launch();
  for (const [vp, tag] of [[{ width: 1440, height: 900 }, 'desktop'], [{ width: 390, height: 844 }, 'mobile']]) {
    for (const scheme of ['dark', 'light']) {
      if (name === 'webkit' && (tag === 'desktop' || scheme === 'light')) continue;
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: 'reduce' });
      for (const path of ['/', '/en/']) {
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        page.on('console', m => m.type() === 'error' && !/Prefetch request denied/.test(m.text()) && errs.push(m.text())); // http מקומי בלבד
        await page.goto(base + path, { waitUntil: 'networkidle' });
        const slug = `${name}-${tag}-${scheme}-${path === '/' ? 'he' : 'en'}`;
        await page.screenshot({ path: `check-out/${slug}-top.png` });
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: `check-out/${slug}-full.png`, fullPage: true });
        if (name === 'chromium' && tag === 'desktop') await axe(page, slug);
        if (errs.length) { failures++; console.log('ERRORS', slug, errs); }
        await page.close();
      }
      await ctx.close();
    }
  }
  // הפתיח עצמו — פריימים לאורך הזמן
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(base + '/');
  for (const ms of [250, 900, 1600, 2300, 2800, 3400, 4600]) {
    await page.waitForTimeout(ms - (page._t || 0)); page._t = ms;
    await page.screenshot({ path: `check-out/${name}-intro-${String(ms).padStart(4, '0')}.png` });
  }
  const left = await page.evaluate(() => document.documentElement.className);
  if (left) { failures++; console.log('intro classes left behind:', left); }
  await ctx.close();
  await browser.close();
}
server.close();
console.log(failures ? `\n${failures} problem(s)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
