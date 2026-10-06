// משחק הירי של הפתיח (בסגנון Galaxian, ציורים מקוריים). כל חייזר שנפגע מתפרק לפיקסלים
// שעפים למקומם בשם — כשהאחרון נופל, השם שלם. טייס אוטומטי משחק לבד; נגיעה, גרירה או חיצים לוקחים שליטה.
// run() מחזיר { done, stop }: done מתממש כשהשם הורכב.

export const SPRITES = {
  boss: ['....x....', '...xxx...', 'x.xxoxx.x', 'xxxxxxxxx', 'x.xxxxx.x', 'x..x.x..x'],
  bug1: ['..x..x..', '...xx...', '.xxxxxx.', 'xxoxxoxx', 'xxxxxxxx', 'x.x..x.x', '.x....x.'],
  bug2: ['..x..x..', 'x..xx..x', 'x.xxxx.x', 'xxoxxoxx', 'xxxxxxxx', '..x..x..', '.x....x.'],
  ship: ['....x....', '....x....', '...xxx...', '..xxoxx..', '.xxxxxxx.', 'xxx.x.xxx', 'xx.....xx'],
};
export const ROWS = [
  { kind: 'boss', a: '#ffb547', b: '#ffffff', score: 150 },
  { kind: 'bug', a: '#ff7a8a', b: '#ffe08a', score: 80 },
  { kind: 'bug', a: '#b4cfff', b: '#1d4596', score: 50 },
  { kind: 'bug', a: '#b4cfff', b: '#1d4596', score: 50 },
];

const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const rand = (a, b) => a + Math.random() * (b - a);

export function bake(rows, a, b, cell) {
  const c = document.createElement('canvas');
  c.width = rows[0].length * cell; c.height = rows.length * cell;
  const g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = ch === 'o' ? b : a;
    g.fillRect(x * cell, y * cell, cell, cell);
  }));
  return c;
}

// נקודות היעד: מציירים את השם בגופן הפיקסלים בדיוק במקום שלו בעמוד, ודוגמים רשת
function nameTargets(nameEl, origin, W, H) {
  const node = nameEl.firstChild;
  const cs = getComputedStyle(nameEl);
  const size = parseFloat(cs.fontSize);
  const step = Math.max(3, Math.round(size / 30));
  const off = document.createElement('canvas');
  off.width = Math.ceil(W); off.height = Math.ceil(H);
  const g = off.getContext('2d', { willReadFrequently: true });
  g.font = `400 ${size}px "Rubik Pixels"`;
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  const range = document.createRange();
  const text = node.textContent;
  for (let i = 0; i < text.length; i++) {
    if (!text[i].trim()) continue;
    range.setStart(node, i); range.setEnd(node, i + 1);
    const r = range.getBoundingClientRect();
    const m = g.measureText(text[i]);
    const ascent = m.fontBoundingBoxAscent ?? size * 0.8;
    g.fillText(text[i], r.left - origin.left, r.top - origin.top + ascent);
  }
  const data = g.getImageData(0, 0, off.width, off.height).data;
  const pts = [];
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      const sx = Math.min(off.width - 1, x + (step >> 1)), sy = Math.min(off.height - 1, y + (step >> 1));
      if (data[(sy * off.width + sx) * 4 + 3] > 120) pts.push({ x, y });
    }
  }
  for (let i = pts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
  return { pts, step };
}

export function run({ hero, nameEl, scoreFont = '"Rubik Pixels", monospace' }) {
  const box = hero.getBoundingClientRect();
  const W = box.width, H = box.height;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.className = 'game';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  hero.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  const cell = Math.max(3, Math.min(6, Math.round(W / 230)));
  const cols = W < 600 ? 6 : 8;
  const gapX = cell * 13, gapY = cell * 11;
  const fx0 = (W - (cols - 1) * gapX) / 2, fy0 = Math.max(H * 0.14, 70);

  const art = {};
  ROWS.forEach((r, i) => {
    art[i] = r.kind === 'boss'
      ? [bake(SPRITES.boss, r.a, r.b, cell), bake(SPRITES.boss, r.a, r.b, cell)]
      : [bake(SPRITES.bug1, r.a, r.b, cell), bake(SPRITES.bug2, r.a, r.b, cell)];
  });
  const shipArt = bake(SPRITES.ship, '#ffffff', '#ffb547', cell);

  // מערך החייזרים
  const aliens = [];
  ROWS.forEach((r, row) => {
    const slots = row === 0 ? [2, cols - 3] : row === 1 ? [...Array(cols - 2)].map((_, i) => i + 1) : [...Array(cols)].map((_, i) => i);
    slots.forEach(col => aliens.push({
      row, col, alive: true, color: r.a, score: r.score,
      w: art[row][0].width, h: art[row][0].height,
      delay: row * 0.07 + Math.abs(col - (cols - 1) / 2) * 0.025,
      from: col < cols / 2 ? -1 : 1, dive: null, x: 0, y: -100,
    }));
  });

  const { pts, step } = nameTargets(nameEl, box, W, H);
  const perKill = Math.ceil(pts.length / aliens.length);
  let nextPt = 0;

  const stars = [...Array(Math.round(W * H / 9000))].map(() => ({
    x: rand(0, W), y: rand(0, H), v: rand(30, 140), c: ['#ffffff', '#b4cfff', '#ffb547', '#ff7a8a'][(Math.random() * 4) | 0], p: rand(0, 6),
  }));
  const ship = { x: W / 2, y: H - Math.max(56, H * 0.1), w: shipArt.width, h: shipArt.height };
  const bullets = [], sparks = [], bits = [], pops = [];
  let score = 0, cool = 0, t = 0, last = performance.now(), raf = 0, nextDive = 0.9, manualUntil = 0, keyDir = 0;
  let allDead = false, deadAt = 0, resolved = false, played = false, lastInput = -99;
  let resolveDone;
  const done = new Promise(r => { resolveDone = r; });

  const slotPos = a => ({ x: fx0 + a.col * gapX + Math.sin(t * 1.8) * cell * 6 - a.w / 2, y: fy0 + a.row * gapY });

  function explode(a) {
    a.alive = false;
    const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    const pts2 = aliens.every(o => !o.alive) ? pts.length - nextPt : perKill;
    for (let i = 0; i < 10; i++) sparks.push({ x: cx, y: cy, vx: rand(-260, 260), vy: rand(-260, 260), life: 0.35, c: i % 2 ? a.color : '#fff' });
    for (let i = 0; i < pts2 && nextPt < pts.length; i++) {
      const p = pts[nextPt++];
      bits.push({ x: cx, y: cy, vx: rand(-320, 320), vy: rand(-320, 220), tx: p.x, ty: p.y, born: t, home: t + rand(0.12, 0.3), c: a.color });
    }
    const pts1 = a.dive ? a.score * 2 : a.score;
    score += pts1;
    if (a.dive) pops.push({ x: cx, y: cy, s: String(pts1), life: 0.6 });
    if (aliens.every(o => !o.alive)) { allDead = true; deadAt = t; }
  }

  function startDive() {
    const pool = aliens.filter(a => a.alive && !a.dive && t > a.delay + 0.45);
    if (!pool.length) return;
    const bosses = pool.filter(a => a.row === 0);
    const src = bosses.length && Math.random() < 0.5 ? bosses : pool;
    const a = src[(Math.random() * src.length) | 0];
    const dir = a.col < cols / 2 ? -1 : 1;
    a.dive = { t0: t, dur: 1.25, p0: { x: a.x, y: a.y }, p1: { x: a.x + dir * cell * 30, y: a.y - cell * 18 }, p2: { x: ship.x + dir * W * 0.12, y: H * 0.55 }, p3: { x: ship.x - dir * W * 0.12, y: H + 40 } };
  }

  function bez(d, u) {
    const k = 1 - u;
    return {
      x: k * k * k * d.p0.x + 3 * k * k * u * d.p1.x + 3 * k * u * u * d.p2.x + u * u * u * d.p3.x,
      y: k * k * k * d.p0.y + 3 * k * k * u * d.p1.y + 3 * k * u * u * d.p2.y + u * u * u * d.p3.y,
    };
  }

  function update(dt) {
    t += dt;
    // כוכבים
    for (const s of stars) { s.y += s.v * dt; if (s.y > H) { s.y = -2; s.x = rand(0, W); } }

    // חייזרים: כניסה למערך, ריחוף, צלילות
    for (const a of aliens) {
      if (!a.alive) continue;
      const slot = slotPos(a);
      if (a.dive) {
        const u = (t - a.dive.t0) / a.dive.dur;
        if (u >= 1) { a.dive = null; a.y = -40; a.x = slot.x; a.returning = t; }
        else { const p = bez(a.dive, u); a.x = p.x - a.w / 2; a.y = p.y - a.h / 2; }
      } else if (a.returning) {
        const u = ease((t - a.returning) / 0.5);
        a.x = slot.x; a.y = -40 + (slot.y + 40) * u;
        if (u >= 1) a.returning = 0;
      } else {
        const u = ease((t - a.delay) / 0.5);
        a.x = slot.x + a.from * W * 0.35 * (1 - u);
        a.y = -60 + (slot.y + 60) * u;
      }
    }
    if (t > nextDive && !allDead) { startDive(); nextDive = t + (t > 1.6 ? 0.22 : 0.38); }

    // אחרי הזמן הקצוב — כל מי שנשאר מתפוצץ בשרשרת, כדי שהפתיח יישאר קצר
    const idle = !played || t - lastInput > 4;
    if (t > 2.8 && !allDead && idle) {
      const left = aliens.filter(a => a.alive);
      if (left.length && (!update.chain || t - update.chain > 0.045)) { update.chain = t; explode(left[(Math.random() * left.length) | 0]); }
    }

    // ספינה: טייס אוטומטי, אלא אם המשתמש מנווט
    const live = aliens.filter(a => a.alive && a.y > 0);
    if (t > manualUntil) {
      const divers = live.filter(a => a.dive);
      const pool = divers.length ? divers : live;
      let best = null, bd = Infinity;
      for (const a of pool) { const d = Math.abs(a.x + a.w / 2 - ship.x) - (a.dive ? W : 0); if (d < bd) { bd = d; best = a; } }
      if (best) {
        const tx = best.x + best.w / 2, sp = W * 1.6 * dt;
        ship.x += Math.max(-sp, Math.min(sp, tx - ship.x));
      }
    } else if (keyDir) {
      ship.x += keyDir * W * 1.1 * dt;
    }
    ship.x = Math.max(ship.w / 2, Math.min(W - ship.w / 2, ship.x));

    // ירי אוטומטי
    cool -= dt;
    const lined = live.some(a => Math.abs(a.x + a.w / 2 - ship.x) < a.w * 0.7);
    if (cool <= 0 && !allDead && t > 0.45 && (lined || t < manualUntil)) {
      bullets.push({ x: ship.x - cell / 2, y: ship.y - cell * 2 });
      cool = 0.07;
    }
    for (const b of bullets) {
      b.y -= H * 1.9 * dt;
      for (const a of aliens) {
        if (a.alive && b.y > -10 && b.x > a.x - cell && b.x < a.x + a.w + cell && b.y < a.y + a.h && b.y + cell * 3 > a.y) { explode(a); b.y = -99; break; }
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].y < -20) bullets.splice(i, 1);

    // ניצוצות ופיקסלים של השם
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    for (const p of pops) { p.y -= 30 * dt; p.life -= dt; }
    for (let i = pops.length - 1; i >= 0; i--) if (pops[i].life <= 0) pops.splice(i, 1);
    let home = 0;
    for (const b of bits) {
      if (t < b.home) { b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.9; b.vy *= 0.9; b.sx = b.x; b.sy = b.y; continue; }
      const u = ease((t - b.home) / 0.45);
      b.x = b.sx + (b.tx - b.sx) * u; b.y = b.sy + (b.ty - b.sy) * u;
      if (u >= 1) home++;
    }
    if (allDead && !resolved && (home === bits.length || t - deadAt > 0.8)) { resolved = true; resolveDone(); }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) { ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 6 + s.p); ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y, 2, 2); }
    ctx.globalAlpha = 1;
    const flap = (t * 4 | 0) % 2;
    for (const a of aliens) if (a.alive) ctx.drawImage(art[a.row][flap], Math.round(a.x), Math.round(a.y));
    ctx.fillStyle = '#ffe08a';
    for (const b of bullets) ctx.fillRect(b.x, b.y, cell, cell * 3);
    for (const s of sparks) { ctx.globalAlpha = Math.max(0, s.life / 0.35); ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y, cell, cell); }
    ctx.globalAlpha = 1;
    for (const b of bits) {
      ctx.fillStyle = t - b.home > 0.3 ? '#ffffff' : b.c;
      ctx.fillRect(Math.round(b.x), Math.round(b.y), step - 1, step - 1);
    }
    if (!allDead || t - deadAt < 0.3) ctx.drawImage(shipArt, Math.round(ship.x - ship.w / 2), Math.round(ship.y));
    ctx.font = `400 ${Math.max(14, cell * 4)}px ${scoreFont}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b4cfff';
    ctx.fillText('SCORE ' + String(score).padStart(6, '0'), W / 2, Math.max(18, H * 0.04));
    ctx.fillStyle = '#ffe08a';
    for (const p of pops) ctx.fillText(p.s, p.x, p.y);
    if (!played && !allDead && !/[?&]og\b/.test(location.search)) {
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 5);
      ctx.font = `500 ${Math.max(12, cell * 3)}px Rubik, system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(document.documentElement.lang === 'he' ? 'גררו או לחצו ← → כדי לשחק' : 'Drag or press ← → to play', W / 2, ship.y + ship.h + cell * 3);
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // שליטה: נגיעה/גרירה/עכבר מזיזים את הספינה, חיצים לצדדים
  const steer = e => { played = true; lastInput = t; manualUntil = t + 2.5; ship.x = e.clientX - box.left; };
  const onKey = e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { played = true; lastInput = t; manualUntil = t + 2.5; keyDir = e.type === 'keydown' ? (e.key === 'ArrowLeft' ? -1 : 1) : 0; e.preventDefault(); }
  };
  canvas.addEventListener('pointerdown', steer);
  canvas.addEventListener('pointermove', e => { if (e.buttons || e.pointerType !== 'mouse') steer(e); });
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);

  function stop() {
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
    removeEventListener('keyup', onKey);
    canvas.classList.add('game--out');
    setTimeout(() => canvas.remove(), 400);
    if (!resolved) { resolved = true; resolveDone(); }
  }
  return { done, stop };
}
