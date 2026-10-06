// הפתיח: READY → מקלידים RUN "TSEMACH" → המסך נפתח → קרן הסריקה מחליקה את הפיקסלים.
// ה-<head> מוסיף class="intro" בביקור הראשון בכל שפה, ו-"calm" כשבמערכת מוגדר "הפחתת תנועה":
// אז אין תנועה בכלל, רק הקלדה ומעבר שקיפות מפיקסלים לאותיות חלקות.
// כל מקש, לחיצה או גלילה מדלגים. הכפתור READY מפעיל את הפתיח שוב.
(() => {
  const d = document.documentElement;
  const key = 'seen-intro-' + d.lang;

  document.querySelector('.ready')?.addEventListener('click', () => {
    try { sessionStorage.setItem('force-play', '1'); } catch {}
    scrollTo(0, 0);
    location.reload();
  });

  if (!d.classList.contains('intro')) return;

  const calm = d.classList.contains('calm');
  const typed = document.querySelector('.boot__typed');
  const text = typed?.dataset.text || '';
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let finished = false;

  let game = null;
  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    game?.stop();
    d.classList.add('run', 'reveal', 'sweep', 'done');
    try { sessionStorage.setItem(key, '1'); } catch {}
    setTimeout(() => {
      d.classList.remove('intro', 'calm', 'run', 'reveal', 'sweep', 'done');
      if (!calm) mergeName();
    }, 800);
    removeEventListener('keydown', skip, true);
    removeEventListener('pointerdown', skip, true);
    removeEventListener('wheel', skip, true);
    removeEventListener('touchmove', skip, true);
  }
  // מדלגים: Escape, גלילה בעכבר, או כל מקש שאינו שליטה במשחק. נגיעה במסך מנווטת את הספינה ולא מדלגת.
  const keep = new Set(['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'Shift', 'Alt', 'Control', 'Meta']);
  function skip(e) {
    if (e.type === 'keydown' && keep.has(e.key)) return;
    if (e.type === 'pointerdown' || e.type === 'touchmove') return;
    finish();
  }

  addEventListener('keydown', skip, true);
  addEventListener('pointerdown', skip, true);
  addEventListener('wheel', skip, { capture: true, passive: true });
  addEventListener('touchmove', skip, { capture: true, passive: true });
  document.querySelector('.skip-intro')?.addEventListener('click', finish);

  // צמח + חדד חולקים ח' — לרגע השם מתמזג ל"צמחדד" ואז חוזר. רק כשהשם בשורה אחת, ולא במצב הפחתת תנועה.
  function mergeName() {
    const name = document.querySelector('.name');
    const smooth = name?.querySelector('.name__smooth');
    const gap = smooth?.querySelector('.name__gap');
    if (!gap) return;
    const lh = parseFloat(getComputedStyle(name).fontSize);
    if (smooth.getBoundingClientRect().height > lh * 1.6) return; // השם נשבר לשתי שורות
    gap.style.maxWidth = gap.getBoundingClientRect().width + 'px';
    requestAnimationFrame(() => {
      name.classList.add('merged');
      setTimeout(() => name.classList.remove('merged'), 1500);
    });
  }

  const start = () => {
    let t = 450;
    for (let i = 1; i <= text.length; i++) {
      at(t, () => { typed.textContent = text.slice(0, i); });
      t += 60 + (text[i - 1] === ' ' ? 90 : 0);
    }
    if (calm) {
      at(t + 350, () => d.classList.add('run', 'reveal'));
      at(t + 1350, () => d.classList.add('sweep'));
      at(t + 2400, finish);
      return;
    }
    at(t + 350, () => {
      d.classList.add('run');
      gameModule.then(m => {
        if (finished) return;
        game = m.run({ hero: document.querySelector('.hero'), nameEl: document.querySelector('.name__pixel') });
        game.done.then(() => {
          if (finished) return;
          d.classList.add('reveal');
          game.stop();
          at(150, () => d.classList.add('sweep'));
          at(1000, finish);
        });
      }).catch(() => { // בלי המשחק: הרצף המקורי
        d.classList.add('reveal');
        at(800, () => d.classList.add('sweep'));
        at(1900, finish);
      });
    });
  };
  const gameModule = calm ? null : import('./game.js?v=' + (document.currentScript?.src.split('v=')[1] || ''));

  // מחכים לגופן הפיקסלים כדי שהשלב הראשון לא יופיע בגופן אחר; לכל היותר 600ms
  const ready = document.fonts?.load ? document.fonts.load('1em "Rubik Pixels"') : Promise.resolve();
  Promise.race([ready, new Promise(r => setTimeout(r, 600))]).then(start);
})();
