// הטלוויזיה במסך הפתיחה: מחליפה משחקים ופרויקטים. קטע וידאו מתנגן עד הסוף, תמונה נשארת 3.5 שניות.
// כפתור עצירה תמיד זמין (ההחלפה ארוכה מ-5 שניות). בהפחתת תנועה אין החלפה אוטומטית — רק אחרי לחיצה על הפעלה.
// לא רץ כשהמסך מחוץ לתצוגה או כשהלשונית מוסתרת, ומתחיל רק אחרי שהפתיח הסתיים.
(() => {
  const tv = document.querySelector('.tv');
  if (!tv) return;
  const items = JSON.parse(tv.dataset.items || '[]');
  const img = tv.querySelector('.tv__img');
  const video = tv.querySelector('.tv__video');
  const link = tv.querySelector('.tv__link');
  const toggle = tv.querySelector('.tv__toggle');
  if (items.length < 2) return;

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData;
  let i = 0, timer = 0, paused = calm, visible = true, started = false;
  // H.264 בכל דפדפן שתומך (Safari, Chrome, Edge); אחרת VP9
  const h264 = video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '';

  // מטמינים מראש את התמונות, כדי שההחלפה תהיה מיידית
  const warm = () => items.forEach(it => { const im = new Image(); im.decoding = 'async'; im.src = it.shot; });

  function show(n) {
    clearTimeout(timer);
    i = (n + items.length) % items.length;
    const it = items[i];
    tv.classList.add('is-switching');
    setTimeout(() => {
      img.src = it.shot;
      link.href = it.url;
      link.textContent = it.title;
      video.pause();
      tv.classList.remove('is-video');
      if (it.clip && !saveData) {
        video.src = h264 ? it.clip.mp4 : it.clip.webm;
        video.onended = () => { if (video.currentTime > 1) schedule(300); };
        video.play().then(() => tv.classList.add('is-video')).catch(() => schedule(3500));
      } else {
        schedule(3500);
      }
      tv.classList.remove('is-switching');
    }, 280);
  }

  function schedule(ms) {
    clearTimeout(timer);
    if (!paused && visible) timer = setTimeout(() => show(i + 1), ms);
  }

  function ui() {
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? toggle.dataset.play : toggle.dataset.pause);
  }

  // לחיצה: עצירה, או הפעלה (גם במצב הפחתת תנועה — זו בחירה של המשתמש)
  toggle.hidden = false;
  ui();
  toggle.addEventListener('click', () => {
    paused = !paused;
    ui();
    if (paused) { clearTimeout(timer); video.pause(); return; }
    if (!started) { started = true; warm(); show(i); return; }
    if (tv.classList.contains('is-video')) video.play().catch(() => schedule(300));
    else show(i + 1);
  });

  // התחלה אוטומטית אחרי הפתיח: מתחילים מהפריט הראשון (River Raid בתנועה)
  function start() {
    if (started || paused) return;
    started = true;
    warm();
    timer = setTimeout(() => show(0), 900);
  }

  // מחכים לסוף הפתיח
  const d = document.documentElement;
  if (d.classList.contains('intro')) {
    const mo = new MutationObserver(() => { if (!d.classList.contains('intro')) { mo.disconnect(); start(); } });
    mo.observe(d, { attributes: true, attributeFilter: ['class'] });
  } else start();

  // עוצרים כשהמסך לא נראה
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (!visible) { clearTimeout(timer); video.pause(); }
      else if (!was && started && !paused) { if (tv.classList.contains('is-video')) video.play().catch(() => {}); else schedule(1500); }
    }, { threshold: 0.25 }).observe(tv);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(timer); video.pause(); }
    else if (started && !paused && visible) schedule(1500);
  });
})();
