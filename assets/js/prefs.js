// Runs in <head>, before paint: theme and language from the saved choice, else the system's.
const root = document.documentElement;
const pref = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };

const apply = {
  theme: v => { root.dataset.theme = v; },
  lang: v => { root.dataset.lang = v; root.lang = v === 'pt' ? 'pt-BR' : 'en'; },
};
apply.theme(pref('theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
apply.lang(pref('lang') || (navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'));
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('reveal'); // see reveal.js

// settings popup: one radio group per preference
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#settings input[type="radio"]').forEach(input => {
    input.checked = root.dataset[input.name] === input.value;
    input.addEventListener('change', () => {
      apply[input.name](input.value);
      save(input.name, input.value);
      if (input.name === 'lang') document.dispatchEvent(new Event('langchange'));
    });
  });

  // the popup is pinned to the header, so it closes once the page scrolls away from it
  const settings = document.getElementById('settings');
  addEventListener('scroll', () => {
    if (settings.matches(':popover-open')) settings.hidePopover();
  }, { passive: true });
});
