function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  const lang = document.documentElement.lang || 'en';
  const t = window.translations[lang];

  btn.textContent = t['form.success'];
  btn.style.background = 'var(--accent2)';

  setTimeout(() => {
    btn.textContent = t['form.submit'];
    btn.style.background = 'var(--accent)';
    e.target.reset();
  }, 3000);
}
