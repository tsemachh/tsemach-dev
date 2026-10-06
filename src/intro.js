// הפתיח: READY → מקלידים RUN "TSEMACH" → המסך נפתח → קרן הסריקה מחליקה את הפיקסלים.
// ה-<head> מוסיף class="intro" בביקור הראשון בכל שפה, ו-"calm" כשבמערכת מוגדר "הפחתת תנועה":
// אז אין תנועה בכלל, רק הקלדה ומעבר שקיפות מפיקסלים לאותיות חלקות.
// כל מקש, לחיצה או גלילה מדלגים. הכפתור READY מפעיל את הפתיח שוב.
(() => {
  const d = document.documentElement;
  const key = 'seen-intro-' + d.lang;

  document.querySelector('.ready')?.addEventListener('click', () => {
    try { sessionStorage.removeItem(key); } catch {}
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

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    d.classList.add('run', 'sweep', 'done');
    try { sessionStorage.setItem(key, '1'); } catch {}
    setTimeout(() => d.classList.remove('intro', 'calm', 'run', 'sweep', 'done'), 800);
    removeEventListener('keydown', skip, true);
    removeEventListener('pointerdown', skip, true);
    removeEventListener('wheel', skip, true);
    removeEventListener('touchmove', skip, true);
  }
  function skip(e) {
    if (e.type === 'keydown' && (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ')) return; // מקלדת: אפשר להגיע לכפתור הדילוג ולהפעיל אותו
    if (e.type === 'pointerdown' && e.target.closest?.('.skip-intro')) return;
    finish();
  }

  addEventListener('keydown', skip, true);
  addEventListener('pointerdown', skip, true);
  addEventListener('wheel', skip, { capture: true, passive: true });
  addEventListener('touchmove', skip, { capture: true, passive: true });
  document.querySelector('.skip-intro')?.addEventListener('click', finish);

  const start = () => {
    let t = 450;
    for (let i = 1; i <= text.length; i++) {
      at(t, () => { typed.textContent = text.slice(0, i); });
      t += 60 + (text[i - 1] === ' ' ? 90 : 0);
    }
    at(t + 350, () => d.classList.add('run'));
    at(t + (calm ? 1350 : 1150), () => d.classList.add('sweep'));
    at(t + (calm ? 2400 : 2350), finish);
  };

  // מחכים לגופן הפיקסלים כדי שהשלב הראשון לא יופיע בגופן אחר; לכל היותר 600ms
  const ready = document.fonts?.load ? document.fonts.load('1em "Rubik Pixels"') : Promise.resolve();
  Promise.race([ready, new Promise(r => setTimeout(r, 600))]).then(start);
})();
