// Click a screenshot on a project page to see it full size; arrows move between screens.
const shots = [...document.querySelectorAll('.shot-lg img')];

if (shots.length) {
  const box = document.createElement('dialog');
  box.className = 'lightbox';
  box.innerHTML = `
    <img alt="">
    <p class="lb-caption"></p>
    <button type="button" class="lb-close" aria-label="Fechar / Close">×</button>
    <button type="button" class="lb-prev" aria-label="Anterior / Previous">‹</button>
    <button type="button" class="lb-next" aria-label="Próxima / Next">›</button>`;
  document.body.append(box);
  const img = box.querySelector('img'), caption = box.querySelector('.lb-caption');
  let index = 0;

  const show = i => {
    index = (i + shots.length) % shots.length;
    img.src = shots[index].currentSrc || shots[index].src;
    img.alt = shots[index].alt;
    const fig = shots[index].closest('figure')?.querySelector('figcaption');
    caption.innerHTML = fig ? fig.innerHTML : '';
  };

  shots.forEach((shot, i) => {
    shot.tabIndex = 0;
    shot.setAttribute('role', 'button');
    const open = () => { show(i); box.showModal(); };
    shot.addEventListener('click', open);
    shot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  box.querySelector('.lb-close').addEventListener('click', () => box.close());
  box.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
  box.addEventListener('click', e => { if (e.target === box) box.close(); }); // click on the backdrop
  box.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
}

// Galleries: every screen in one frame (the most common ratio of the set), with an "n / total"
// in each caption; several screens become a carousel you swipe/scroll natively or move with the arrows.
document.querySelectorAll('.gallery').forEach(gallery => {
  const figs = [...gallery.children];
  const ratios = figs.map(f => { const im = f.querySelector('img'); return (im.getAttribute('width') / im.getAttribute('height')).toFixed(2); });
  const n = r => ratios.filter(x => x === r).length;
  const ar = ratios.reduce((best, r) => n(r) > n(best) || (n(r) === n(best) && +r > +best) ? r : best); // ties: the wider one
  gallery.parentElement.style.setProperty('--ar', ar);
  if (figs.length < 2) return;
  figs.forEach((f, i) => f.querySelector('figcaption')?.insertAdjacentHTML('beforeend', `<span class="car-count">${i + 1} / ${figs.length}</span>`));
  const wrap = document.createElement('div');
  wrap.className = 'carousel';
  gallery.before(wrap);
  const chevron = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  wrap.innerHTML = `
    <button type="button" class="car-prev" aria-label="Anterior / Previous">${chevron('M15 5l-7 7 7 7')}</button>
    <button type="button" class="car-next" aria-label="Próxima / Next">${chevron('M9 5l7 7-7 7')}</button>`;
  wrap.prepend(gallery);
  const step = () => figs[1].offsetLeft - figs[0].offsetLeft; // slide width + gap
  const current = () => Math.round(gallery.scrollLeft / step());
  const smooth = document.documentElement.classList.contains('reveal'); // prefs.js: motion is welcome
  const go = i => gallery.scrollTo({ left: ((i + figs.length) % figs.length) * step(), behavior: smooth ? 'smooth' : 'auto' });
  wrap.querySelector('.car-prev').addEventListener('click', () => go(current() - 1));
  wrap.querySelector('.car-next').addEventListener('click', () => go(current() + 1));
});
