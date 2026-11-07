// Pausa las animaciones CSS de lo que no se ve (barrido de rendimiento, 2026-11-07).
// Medido: en la portada había 76 animaciones corriendo en reposo, 32 fuera de pantalla
// (parpadeos, halos, bucles con `infinite` fijo en su CSS). Cada bloque de primer nivel del
// <main> y el pie reciben .w-off mientras están lejos del viewport (300 px de margen, para
// que al llegar ya estén en marcha); base.css congela sus animaciones con
// animation-play-state. No toca transiciones ni el estado visual: solo detiene el reloj.
function boot() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('w-off', !e.isIntersecting);
  }, { rootMargin: '300px 0px' });
  document.querySelectorAll('main > *, footer.footer').forEach((el) => io.observe(el));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
