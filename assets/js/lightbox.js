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
