// Cards and blocks rise in as they scroll into view. prefs.js adds the "reveal" class
// (only when motion is welcome), so without JavaScript everything is simply visible.
if (document.documentElement.classList.contains('reveal')) {
  const observer = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach((e, i) => {
      e.target.style.transitionDelay = `${i * 70}ms`; // stagger the ones entering together
      e.target.classList.add('in');
      // drop the stagger once in, or later background changes (theme switch) would lag behind
      e.target.addEventListener('transitionend', () => { e.target.style.transitionDelay = ''; }, { once: true });
      observer.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.card, .gallery, .chips, .contrib, .shot-lg:not(.gallery *)').forEach(el => observer.observe(el));
}
