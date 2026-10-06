// בונה את dist/ : דף עברי (/) ודף אנגלי (/en/), sitemap, robots, _headers.
// אין תלויות — Node בלבד. הרצה: npm run build
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { site, projects, t, payloadPr, career, notes, notesUrl } from '../src/content.mjs';

const OUT = 'dist';
await rm(OUT, { recursive: true, force: true });
await mkdir(`${OUT}/en`, { recursive: true });
await cp('public', OUT, { recursive: true });
await cp('src/site.css', `${OUT}/assets/site.css`);
await cp('src/intro.js', `${OUT}/assets/intro.js`);
await cp('src/game.js', `${OUT}/assets/game.js`);
await cp('src/nav.js', `${OUT}/assets/nav.js`);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sha = s => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;
const ver = createHash('sha1').update(await readFile('src/site.css') + await readFile('src/intro.js') + await readFile('src/game.js') + await readFile('src/nav.js')).digest('hex').slice(0, 8);

// רץ ב-<head> לפני הציור הראשון: מחליט אם להציג את הפתיח (פעם אחת בכל ביקור, ולא כשמבקשים פחות תנועה)
// ?play או לחיצה על READY מציגים את המשחק המלא גם כשהמערכת מבקשת פחות תנועה — זו פעולה יזומה של המשתמש
const headScript = `try{var d=document.documentElement,f=/[?&]play\\b/.test(location.search)||sessionStorage.getItem('force-play');sessionStorage.removeItem('force-play');if(f||(!sessionStorage.getItem('seen-intro-'+d.lang)&&!location.hash)){d.classList.add('intro');if(!f&&matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('calm');setTimeout(function(){d.classList.remove('intro','calm','run','reveal','sweep','done')},120000)}}catch(e){}`;

const speculation = JSON.stringify({ prefetch: [{ where: { href_matches: '/*' }, eagerness: 'moderate' }] });

function shot(p, L, eager) {
  // clip: קטע משחק של 4 שניות (tools/clips.mjs) שמתנגן פעם אחת כשהכרטיס נכנס למסך — ראה src/nav.js
  const clip = p.clip ? `
          <video class="clip" muted playsinline preload="none" aria-hidden="true" tabindex="-1" disablepictureinpicture>
            <source src="/clips/${p.id}.webm" type='video/webm; codecs="vp9"'>
            <source src="/clips/${p.id}.mp4" type="video/mp4">
          </video>` : '';
  return `<div class="shot${p.clip ? ' shot--clip' : ''}">
          <img src="/shots/${p.shot}-480.webp" srcset="/shots/${p.shot}-480.webp 480w, /shots/${p.shot}-960.webp 960w" sizes="(min-width: 60rem) 26rem, 92vw" width="480" height="360" alt="" ${eager ? '' : 'loading="lazy"'} decoding="async">${clip}
        </div>`;
}

function project(p, L, i) {
  const c = p[L.lang];
  return `<li class="project project--${p.group}">
        ${shot(p, L, false)}
        <div class="project__text">
          <h3><a class="project__link" href="${p.url}" aria-label="${esc(L.open)} ${esc(c.title)}">${esc(c.title)}</a></h3>
          ${c.hook ? `<p class="project__hook">${esc(c.hook)}</p>` : ''}
          <p>${esc(c.body)}</p>
          <ul class="stack" aria-label="${L.lang === 'he' ? 'טכנולוגיות' : 'Built with'}">${p.stack.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
          ${p.repo ? `<a class="code" href="${p.repo}" aria-label="${esc(L.code)} ${esc(c.title)}"><svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M5.5 4 1.5 8l4 4 1-1-3-3 3-3-1-1Zm5 0-1 1 3 3-3 3 1 1 4-4-4-4Z"/></svg>${esc(L.codeLabel)}</a>` : ''}
        </div>
      </li>`;
}

function page(L) {
  const other = t[L.otherLangCode];
  const url = site.origin + L.path;
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: L.name,
    alternateName: other.name,
    url: site.origin,
    jobTitle: L.lang === 'he' ? 'ארכיטקט ראשי' : 'Chief Architect',
    knowsAbout: ['Payload CMS', 'Headless CMS', 'JAMstack', 'Front-end architecture', 'Developer Experience'],
    worksFor: { '@type': 'Organization', name: 'Shefing', url: site.shefing },
    homeLocation: { '@type': 'Place', name: L.lang === 'he' ? 'ירושלים' : 'Jerusalem' },
    sameAs: [site.github, site.linkedin].filter(Boolean),
  });
  const now = projects.filter(p => p.group === 'now');
  const oss = projects.filter(p => p.group === 'oss');
  const games = projects.filter(p => p.group === 'games');
  const linkedin = site.linkedin ? `<li><a href="${site.linkedin}" rel="me">LinkedIn</a></li>` : '';

  const html = `<!doctype html>
<html lang="${L.lang}" dir="${L.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(L.title)}</title>
<meta name="description" content="${esc(L.description)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="he" href="${site.origin}/">
<link rel="alternate" hreflang="en" href="${site.origin}/en/">
<link rel="alternate" hreflang="x-default" href="${site.origin}/">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#1d4596">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="tsemach.dev">
<meta property="og:title" content="${esc(L.ogTitle)}">
<meta property="og:description" content="${esc(L.ogDescription)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${L.lang === 'he' ? 'he_IL' : 'en_US'}">
<meta property="og:image" content="${site.origin}/og-${L.lang}.png?v=${ogVer[L.lang]}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(L.name)}: ${L.lang === 'he' ? 'השם נבנה מפיקסלים של חייזרים מתפוצצים במשחק ירי בסגנון 8 ביט' : 'the name assembled from the pixels of exploding aliens in an 8-bit shooter'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/rubik-${L.lang === 'he' ? 'hebrew' : 'latin'}-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v=${ver}">
<script>${headScript}</script>
<script type="speculationrules">${speculation}</script>
<script type="application/ld+json">${ld}</script>
<script src="/assets/intro.js?v=${ver}" defer></script>
<script src="/assets/nav.js?v=${ver}" defer></script>
</head>
<body>
<a class="skip" href="#main">${esc(L.skip)}</a>

<header class="hero" id="top">
  <nav class="bar" aria-label="${L.lang === 'he' ? 'ראשי' : 'Main'}">
    <a class="brand" href="${L.path}" aria-label="tsemach.dev – ${esc(L.name)}"><span aria-hidden="true">tsemach.dev</span></a>
    <a class="lang" href="${L.otherPath}" hreflang="${other.lang}" lang="${other.lang}">${esc(L.otherLang)}</a>
  </nav>

  <div class="boot" aria-hidden="true">
    <p class="boot__line">READY</p>
    <p class="boot__line boot__cmd"><span class="boot__typed" data-text='RUN "TSEMACH"'></span><span class="cursor"></span></p>
  </div>

  <div class="hero__body">
    <button class="ready" type="button" aria-label="READY – ${L.lang === 'he' ? 'להציג שוב את הפתיח' : 'replay the intro'}">READY<span class="cursor" aria-hidden="true"></span></button>
    <h1 class="name">
      <span class="name__smooth">${esc(L.nameParts[0])}<span class="name__sp"> </span><span class="name__gap">${esc(L.nameParts[1])}</span>${esc(L.nameParts[2])}</span>
      <span class="name__pixel" aria-hidden="true">${esc(L.name)}</span>
    </h1>
    <p class="tagline">${esc(L.tagline)}</p>
  </div>
  <button class="skip-intro" type="button">${esc(L.skipIntro)}</button>
</header>

<main id="main" tabindex="-1">
  <nav class="sections" aria-label="${esc(L.navLabel)}">
    <ol role="list">
      ${Object.entries(L.nav).map(([id, label], i) => `<li><a href="#${id}"><span class="sections__n" aria-hidden="true">${i + 1}</span>${esc(label)}</a></li>`).join('\n      ')}
    </ol>
  </nav>

  <section class="about" id="about" aria-labelledby="about-h">
    <h2 id="about-h">${esc(L.aboutHeading)}</h2>
    <div class="about__text">
      ${L.about.map(p => `<p>${p}</p>`).join('\n      ')}
      <ul class="skills" role="list" aria-label="${esc(L.skillsLabel)}">${L.skills.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
    </div>
  </section>

  <section class="career" id="career" aria-labelledby="career-h">
    <div class="games__head">
      <h2 id="career-h">${esc(L.careerHeading)}</h2>
      <p>${esc(L.careerIntro)}</p>
    </div>
    <ol class="levels" role="list">
      ${career.map(c => `<li class="level${c.level === career.length - 1 ? ' level--now' : ''}">
        <p class="level__tag"><span class="level__n" lang="en" dir="ltr">${L.level} ${c.level}</span><span class="level__years">${esc(c.years[L.lang])}</span></p>
        <h3>${esc(c[L.lang].title)}</h3>
        <p>${esc(c[L.lang].body)}</p>
      </li>`).join('\n      ')}
    </ol>
  </section>

  <section class="oss" id="oss" aria-labelledby="oss-h">
    <div class="games__head">
      <h2 id="oss-h">${esc(L.ossHeading)}</h2>
      <p>${esc(L.ossIntro)}</p>
    </div>
    <ul class="projects projects--games" role="list">
      ${oss.map((p, i) => project(p, L, i)).join('\n      ')}
    </ul>
    <p class="upstream">${L.ossUpstream.replace('{pr}', payloadPr)}</p>
  </section>

  <section class="work" id="projects" aria-labelledby="now-h">
    <h2 id="now-h">${esc(L.nowHeading)}</h2>
    <ul class="projects" role="list">
      ${now.map((p, i) => project(p, L, i)).join('\n      ')}
    </ul>
  </section>

  <section class="games" id="games" aria-labelledby="games-h">
    <div class="games__head">
      <h2 id="games-h">${esc(L.gamesHeading)}</h2>
      <p>${esc(L.gamesIntro)}</p>
    </div>
    <ul class="projects projects--games" role="list">
      ${games.map((p, i) => project(p, L, i)).join('\n      ')}
    </ul>
  </section>

  <section class="notes" id="notes" aria-labelledby="notes-h">
    <div class="games__head">
      <h2 id="notes-h">${esc(L.notesHeading)}</h2>
      <p>${esc(L.notesIntro)}</p>
    </div>
    <ul class="notes__list" role="list">
      ${notes.map(n => `<li class="note">
        <p class="note__meta"><time datetime="${n.date}">${new Intl.DateTimeFormat(L.lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(n.date))}</time><span>${esc(n.lang === 'he' ? L.notesLangHe : L.notesLangEn)}</span></p>
        <h3><a href="${notesUrl}">${esc(n[L.lang].title)}</a></h3>
        <p>${esc(n[L.lang].body)}</p>
      </li>`).join('\n      ')}
    </ul>
    <p class="notes__more"><a href="${notesUrl}">${esc(L.notesMore)}</a></p>
  </section>

  <section class="contact" id="contact" aria-labelledby="contact-h">
    <h2 id="contact-h">${esc(L.contactHeading)}</h2>
    <p>${esc(L.contactBody)}</p>
    <p class="contact__mail"><a href="mailto:${site.email}">${site.email}</a></p>
    <ul class="links" role="list">
      <li><a href="${site.github}" rel="me">GitHub</a></li>
      ${linkedin}
    </ul>
  </section>
</main>

<footer class="foot">
  <p>© ${new Date().getFullYear()} ${esc(L.name)}. ${esc(L.footer)} <a href="${site.source}">${esc(L.sourceLabel)}</a></p>
  <a href="${L.otherPath}" hreflang="${other.lang}" lang="${other.lang}">${esc(L.otherLang)}</a>
</footer>
</body>
</html>
`;
  return { html, inline: [headScript, speculation, ld] };
}

// גרסה בכתובת התמונה — LinkedIn ופייסבוק שומרים תמונות לפי כתובת
const ogVer = {};
for (const l of ['he', 'en']) ogVer[l] = createHash('sha1').update(await readFile(`public/og-${l}.png`)).digest('hex').slice(0, 8);

// LinkedIn מזהיר על תיאור קצר מ-100 תווים
for (const L of Object.values(t)) for (const k of ['ogDescription', 'description']) {
  if (L[k].length < 100) throw new Error(`${L.lang}.${k} is ${L[k].length} chars; LinkedIn wants at least 100`);
}
for (const L of Object.values(t)) if (L.nameParts[0] + ' ' + L.nameParts[1] + L.nameParts[2] !== L.name) throw new Error(`${L.lang}.nameParts must join to name`);
const pages = { he: page(t.he), en: page(t.en) };
await writeFile(`${OUT}/index.html`, pages.he.html);
await writeFile(`${OUT}/en/index.html`, pages.en.html);

// CSP עם hash לכל סקריפט inline — אין 'unsafe-inline'
const hashes = [...new Set([...pages.he.inline, ...pages.en.inline])].map(sha).join(' ');
const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes} https://static.cloudflareinsights.com`,
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

await writeFile(`${OUT}/_headers`, `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/shots/*
  Cache-Control: public, max-age=604800

/clips/*
  Cache-Control: public, max-age=604800
`);

await writeFile(`${OUT}/404.html`, `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 – tsemach.dev</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css?v=${ver}">
</head>
<body>
<header class="hero">
  <nav class="bar" aria-label="ראשי"><a class="brand" href="/">tsemach.dev</a><a class="lang" href="/en/" hreflang="en" lang="en">English</a></nav>
  <div class="hero__body">
    <p class="ready-static" lang="en" dir="ltr">ERROR- 404<br>READY<span class="cursor" aria-hidden="true"></span></p>
    <h1 class="name">הדף לא נמצא</h1>
    <p class="tagline">הכתובת לא קיימת באתר. <a href="/">לדף הבית</a> · <a href="/en/" lang="en">Home page</a></p>
  </div>
</header>
</body>
</html>
`);

const today = new Date().toISOString().slice(0, 10);
await writeFile(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${['/', '/en/'].map(p => `  <url><loc>${site.origin}${p}</loc><lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="he" href="${site.origin}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${site.origin}/en/"/>
  </url>`).join('\n')}
</urlset>
`);
await writeFile(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`);
console.log('built dist/ (css/js v' + ver + ')');
