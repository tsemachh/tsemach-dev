// הפתיח: READY → מקלידים RUN "TSEMACH" → המסך נפתח → קרן הסריקה מחליקה את הפיקסלים.
// רץ רק אם ה-<head> סימן class="intro" (תנועה מותרת, פעם ראשונה בביקור). כל מקש, לחיצה או גלילה מדלגים.
(() => {
  const d = document.documentElement;
  if (!d.classList.contains('intro')) return;

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
    try { sessionStorage.setItem('seen-intro', '1'); } catch {}
    setTimeout(() => d.classList.remove('intro', 'run', 'sweep', 'done'), 700);
    removeEventListener('keydown', skip, true);
    removeEventListener('pointerdown', skip, true);
    removeEventListener('wheel', skip, true);
    removeEventListener('touchmove', skip, true);
  }
  function skip(e) {
    if (e.type === 'keydown' && e.key === 'Tab') return; // מקלדת: אפשר להגיע לכפתור הדילוג
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
    at(t + 1150, () => d.classList.add('sweep'));
    at(t + 2350, finish);
  };

  // מחכים לגופן הפיקסלים כדי שהשלב הראשון לא יופיע בגופן אחר; לכל היותר 600ms
  const ready = document.fonts?.load ? document.fonts.load('1em "Rubik Pixels"') : Promise.resolve();
  Promise.race([ready, new Promise(r => setTimeout(r, 600))]).then(start);
})();
