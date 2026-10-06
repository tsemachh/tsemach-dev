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

function encode(input, out, { start = 0, crop = '' } = {}) {
  const common = ['-y', '-hide_banner', '-loglevel', 'error', ...(start ? ['-ss', String(start)] : []), '-i', input, '-t', String(SECONDS), '-an',
    '-vf', `${crop ? `crop=${crop},` : ''}fps=24,scale=480:360:force_original_aspect_ratio=increase,crop=480:360`];
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
    // מצב XONIX (בלי היצור שרודף אחרי השובל), רמה קלה, ושלושה חיתוכים קצרים ליד הקצה העליון
    await page.getByRole('button', { name: /^XONIX/ }).click();
    await page.getByRole('button', { name: /^EASY$/ }).click();
    await page.getByRole('button', { name: /PLAY$/ }).first().click();
    await page.waitForTimeout(2500); // GET READY
    for (const [key, ms] of [['ArrowDown', 260], ['ArrowRight', 700], ['ArrowUp', 300], ['ArrowRight', 150], ['ArrowDown', 260], ['ArrowRight', 700], ['ArrowUp', 300], ['ArrowLeft', 100], ['ArrowDown', 420], ['ArrowLeft', 900], ['ArrowUp', 460]]) {
      await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(40);
    }
    await page.waitForTimeout(600);
  },
  async atari(page) {
    // Pole Position באמולטור האמיתי; טעינת ה-WASM והקושחה לוקחת כ-12 שניות
    await page.goto('https://tsemachh.github.io/atari-arcade/emu/?lib=PolePosition.xex&fs=1&pal=1&crt=0&experience=convenient&addons=off&joystick=analog&tilt=1&back_url=../&back_label=x', { waitUntil: 'load' });
    await page.waitForTimeout(12000);
    await page.mouse.click(400, 350);
    await page.keyboard.press('F2'); // START
    await page.waitForTimeout(1500);
    await page.keyboard.down('ArrowUp');
    for (const [k, ms] of [['', 2500], ['ArrowLeft', 300], ['', 1200], ['ArrowRight', 350], ['', 1500], ['ArrowLeft', 250], ['', 1500], ['ArrowRight', 300], ['', 1500]]) {
      if (k) await page.keyboard.down(k); await page.waitForTimeout(ms); if (k) await page.keyboard.up(k);
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
    encode(file, out, { start: p.clip.start ?? Math.max(1.5, 1.2 + startedAfter - SECONDS - 0.3), crop: p.clip.crop });
    await browser.close();
  }
  const sizes = await Promise.all(['mp4', 'webm'].map(async e => `${e} ${Math.round((await stat(`${out}.${e}`)).size / 1024)}KB`));
  console.log('ok', p.id, sizes.join(', '));
}
