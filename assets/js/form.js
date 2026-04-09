function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  btn.textContent = '✓ Mensaje enviado';
  btn.style.background = 'var(--accent2)';
  setTimeout(() => {
    btn.textContent = 'Enviar Mensaje →';
    btn.style.background = 'var(--accent)';
    e.target.reset();
  }, 3000);
}
