// Highlights the tab of the section currently on screen (home page only;
// project pages mark their tab in the markup).
const tabs = [...document.querySelectorAll('.tabs a[data-sec]')];
const sections = tabs.map(a => document.getElementById(a.dataset.sec)).filter(Boolean);

if (sections.length) {
  const visible = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => visible.set(e.target.id, e.isIntersecting));
    const current = sections.find(s => visible.get(s.id)); // first on screen, in page order
    tabs.forEach(a => a.toggleAttribute('aria-current', a.dataset.sec === current?.id));
  }, { rootMargin: '-35% 0px -55% 0px' }); // a thin band around the middle of the screen
  sections.forEach(s => observer.observe(s));
}
