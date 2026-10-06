// סרגל הפרקים: מסמן את הפרק שנמצא כרגע במסך (aria-current), ובטלפון גולל את הסרגל אליו.
(() => {
  const nav = document.querySelector('.sections');
  if (!nav || !('IntersectionObserver' in window)) return;
  const links = new Map([...nav.querySelectorAll('a[href^="#"]')].map(a => [a.hash.slice(1), a]));
  const visible = new Map();

  const mark = () => {
    let best = null, bestTop = Infinity;
    for (const [id, top] of visible) if (top < bestTop) { bestTop = top; best = id; }
    for (const [id, a] of links) {
      if (id === best) {
        if (a.getAttribute('aria-current') !== 'true') {
          a.setAttribute('aria-current', 'true');
          const list = a.closest('ol');
          if (list.scrollWidth > list.clientWidth) a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
      } else a.removeAttribute('aria-current');
    }
  };

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
      else visible.delete(e.target.id);
    }
    mark();
  }, { rootMargin: '-30% 0px -55% 0px' });

  for (const id of links.keys()) {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  }
})();

// קטעי משחק: מתנגנים פעם אחת (4 שניות) כשהכרטיס נכנס למסך, ושוב במעבר עכבר או במיקוד.
// לא מתנגנים כשמבקשים פחות תנועה או חיסכון בנתונים — אז נשארת התמונה.
(() => {
  const clips = document.querySelectorAll('.shot--clip');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
  if (!clips.length || calm || !('IntersectionObserver' in window)) return;
  const play = shot => {
    const v = shot.querySelector('video');
    if (!v || shot.classList.contains('is-playing')) return;
    if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
    v.currentTime = 0;
    v.play().then(() => shot.classList.add('is-playing')).catch(() => {});
  };
  for (const shot of clips) {
    const v = shot.querySelector('video');
    v.addEventListener('ended', () => { shot.classList.remove('is-playing'); shot.classList.add('has-played'); });
    const card = shot.closest('.project');
    card?.addEventListener('pointerenter', () => play(shot));
    card?.addEventListener('focusin', () => play(shot));
  }
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { play(e.target); io.unobserve(e.target); }
  }, { threshold: 0.6 });
  clips.forEach(c => io.observe(c));
})();
