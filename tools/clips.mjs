// קטעי משחק קצרים (כ-4 שניות) לכרטיסי המשחקים: MP4 (H.264) ו-WebM (VP9), 480×360, בלי סאונד.
// הרצה: npm run clips   (ONLY=river,xonix לחלק מהם)
import { chromium } from 'playwright';
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { mkdir, rm, readdir, stat } from 'node:fs/promises';
import { projects } from '../src/content.mjs';

const TMP = 'node_modules/.cache/clips';
const SECONDS = 4;
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });
await mkdir('public/clips', { recursive: true });

function encode(input, out, { start = 0, from = 'video' } = {}) {
  const common = ['-y', '-hide_banner', '-loglevel', 'error', ...(start ? ['-ss', String(start)] : []), '-i', input, '-t', String(SECONDS), '-an',
    '-vf', 'fps=24,scale=480:360:force_original_aspect_ratio=increase,crop=480:360'];
  execFileSync(ffmpeg, [...common, '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${out}.mp4`]);
  execFileSync(ffmpeg, [...common, '-c:v', 'libvpx-vp9', '-crf', '42', '-b:v', '0', '-row-mt', '1', `${out}.webm`]);
}

// כל משחק: איך מגיעים למשחק עצמו, ומה "השחקן" עושה בזמן ההקלטה
const scripts = {
  async river(page) {
    await page.getByRole('button', { name: /start game/i }).click();
    await page.getByText(/got it/i).first().click().catch(() => {});
    for (const [key, ms] of [['ArrowLeft', 500], ['ArrowRight', 900], ['ArrowLeft', 600], ['ArrowRight', 700], ['ArrowLeft', 500]]) {
      await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
    }
  },
  async xonix(page) {
    await page.getByText(/^XONIX$/).first().click().catch(() => {}); // מצב חופשי: אין יצור שרודף אחרי השובל
    await page.getByRole('button', { name: /^.?\s*play$/i }).first().click();
    await page.waitForTimeout(2200); // GET READY
    await page.locator('canvas').first().focus().catch(() => {});
    // חיתוכים קצרים לאורך הקצה העליון — סוגרים שטח בלי לפגוש כדורים
    for (const [key, ms] of [['ArrowDown', 320], ['ArrowLeft', 520], ['ArrowUp', 360], ['ArrowLeft', 200], ['ArrowDown', 320], ['ArrowLeft', 520], ['ArrowUp', 360]]) {
      await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
    }
  },
};

const only = process.env.ONLY?.split(',');
for (const p of projects.filter(p => p.clip && (!only || only.includes(p.id)))) {
  const out = `public/clips/${p.id}`;
  if (p.clip.gif) { // הקלטה שכבר קיימת ב-repo
    const src = `${TMP}/${p.id}.gif`;
    execFileSync('curl', ['-sfL', p.clip.gif, '-o', src]);
    encode(src, out, { start: p.clip.start || 0 });
  } else {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, recordVideo: { dir: TMP, size: { width: 800, height: 600 } } });
    const page = await ctx.newPage();
    await page.goto(p.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const t0 = Date.now();
    await scripts[p.id](page);
    const startedAfter = (Date.now() - t0) / 1000;
    const video = page.video();
    await ctx.close();
    const file = await video.path();
    // מתחילים כמה שניות לתוך ההקלטה, אחרי מסכי הפתיחה
    encode(file, out, { start: p.clip.start ?? Math.max(1.5, 1.2 + startedAfter - SECONDS - 0.3) });
    await browser.close();
  }
  const sizes = await Promise.all(['mp4', 'webm'].map(async e => `${e} ${Math.round((await stat(`${out}.${e}`)).size / 1024)}KB`));
  console.log('ok', p.id, sizes.join(', '));
}
