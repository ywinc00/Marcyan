/* ═══════════════════════════════════════════════════════════════
   MARCYAN — LANGUAGE SWITCHER
   Loads English by default. Reads/writes to localStorage.
   Depends on: translations.js (must load first).
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_LANG = 'en';

function applyLanguage(lang) {
  const t = window.translations[lang];
  if (!t) return;

  /* Update <html lang=""> for accessibility & SEO */
  document.documentElement.lang = lang;

  /* Persist choice */
  localStorage.setItem('marcyan-lang', lang);

  /* Toggle active state on lang buttons */
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
    btn.setAttribute('aria-pressed', btn.dataset.lang === lang);
  });

  /* innerHTML elements (supports <br> and <em> in copy) */
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key] !== undefined) el.innerHTML = t[key];
  });

  /* Placeholder attributes */
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    if (t[key] !== undefined) el.placeholder = t[key];
  });

  /* <option> text content */
  document.querySelectorAll('[data-i18n-opt]').forEach(el => {
    const key = el.dataset.i18nOpt;
    if (t[key] !== undefined) el.textContent = t[key];
  });
}

function initLanguage() {
  const saved = localStorage.getItem('marcyan-lang') || DEFAULT_LANG;
  applyLanguage(saved);
}

/* Wire up toggle buttons */
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

initLanguage();
