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
