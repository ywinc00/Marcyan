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
  // v8 (2026-11-08): en las landings los capítulos van dentro de una envoltura que mide toda la
  // página (siempre «a la vista»), así que sus bucles nunca paraban. Si un bloque mide más de 2,5
  // pantallas y tiene varios hijos, se vigilan sus hijos (hasta 3 niveles).
  const alto = innerHeight * 2.5;
  const vigila = (el: Element, n: number) => {
    if (getComputedStyle(el).display === 'contents') { for (const c of Array.from(el.children)) vigila(c, n); return; }
    const h = (el as HTMLElement).offsetHeight || 0;
    if (n < 3 && h > alto && el.children.length > 1 && !(el as HTMLElement).hasAttribute('data-w2-pin')) {
      for (const c of Array.from(el.children)) vigila(c, n + 1);
    } else io.observe(el);
  };
  document.querySelectorAll('main > *, footer.footer').forEach((el) => vigila(el, 0));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
