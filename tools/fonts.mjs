// מקטין את Rubik Pixels לאותיות שמופיעות בפועל בכותרות. הרצה: npm run fonts (אחרי שינוי שם/כותרות)
// דורש: python3 -m pip install --user fonttools brotli
import { execFileSync } from 'node:child_process';
import { t } from '../src/content.mjs';

const pixelText = [
  'READY', 'RUN "TSEMACH"', 'tsemach.dev', 'SCORE 0123456789',
  ...Object.values(t).flatMap(L => [L.name, L.aboutHeading, L.ossHeading, L.nowHeading, L.gamesHeading, L.contactHeading]),
].join('') + ' ';
const src = 'node_modules/.cache/rubik-pixels';
const sets = [
  ['he', 'rubik-pixels-hebrew-400-normal.woff2'],
  ['latin', 'rubik-pixels-latin-400-normal.woff2'],
];
for (const [name, file] of sets) {
  execFileSync('python3', ['-m', 'fontTools.subset', `${src}/${file}`,
    `--text=${pixelText}`, '--flavor=woff2', '--layout-features=*', `--output-file=public/fonts/pixels-${name}.woff2`], { stdio: 'inherit' });
}
console.log('pixel subsets written');
