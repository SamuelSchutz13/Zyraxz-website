// Tech filter for the projects: shows only the cards whose stack includes the chosen tech.
// "Projects" is paginated, 6 cards per page, over the cards the filter leaves visible.
const buttons = document.querySelectorAll('.filters button');
const all = document.getElementById('all-grid');
const pager = document.getElementById('pager');
const perPage = 6;
let tech = '', page = 0;

function paginate() {
  document.querySelectorAll('#recent-grid > .card, #all-grid > .card').forEach(card => {
    card.hidden = tech !== '' && !card.dataset.tech.split(',').includes(tech);
  });
  // no recent project uses this tech: hide the whole section instead of an empty heading
  const recent = document.getElementById('recentes');
  recent.hidden = !recent.querySelector('.card:not([hidden])');

  const shown = [...all.children].filter(c => !c.hidden);
  const pages = Math.ceil(shown.length / perPage);
  page = Math.min(page, Math.max(pages - 1, 0));
  shown.forEach((c, i) => { c.hidden = Math.floor(i / perPage) !== page; });
  pager.hidden = pages < 2;
  pager.replaceChildren(...[...Array(pages)].map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = i + 1;
    b.setAttribute('aria-label', `Página ${i + 1}`);
    b.setAttribute('aria-pressed', i === page);
    b.addEventListener('click', () => { page = i; paginate(); document.getElementById('projetos').scrollIntoView(); });
    return b;
  }));
}

buttons.forEach(button => button.addEventListener('click', () => {
  tech = button.dataset.tech;
  page = 0;
  buttons.forEach(b => b.setAttribute('aria-pressed', b === button));
  paginate();
}));

// github.js re-sorts the cards between "Recent" and "Projects" once its data arrives
new MutationObserver(paginate).observe(all, { childList: true });
paginate();
