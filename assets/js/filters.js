// Tech filter for the projects: shows only the cards whose stack includes the chosen tech.
const buttons = document.querySelectorAll('.filters button');

buttons.forEach(button => button.addEventListener('click', () => {
  const tech = button.dataset.tech;
  buttons.forEach(b => b.setAttribute('aria-pressed', b === button));
  document.querySelectorAll('#recent-grid > .card, #all-grid > .card').forEach(card => {
    card.hidden = tech !== '' && !card.dataset.tech.split(',').includes(tech);
  });
}));
