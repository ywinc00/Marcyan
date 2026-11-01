// ─────────────────────────────────────────────────────────────
// Coreografía de entrada única + revelado de sección (design/rediseno-workos.md
// §2.9, A-12 / F-04). Lo arranca WStyles.astro en las páginas v3.
//
// · Busca SOLO dentro de main[data-w] y SOLO [data-w-in] / [data-w-reveal]:
//   nunca `section`, [data-rev], .hero ni .hx (portada y hubs no llevan
//   main[data-w], así que aquí no hace nada).
// · Marca html.w-ready al arrancar: el script inline del <head> (Layout) solo
//   fuerza html.w-in-all a los 2,5 s si esto NO llegó a correr.
// · Hero: .is-in en el main en el primer requestAnimationFrame tras
//   DOMContentLoaded (el CSS de w.css hace el resto con transiciones).
// · Secciones: IntersectionObserver threshold .15, rootMargin -10 % abajo;
//   subida 16 px + opacidad 480 ms, escalonado 80 ms entre los que entran
//   juntos, una vez (unobserve).
// · Si reduced-motion se activa con la página abierta, se quita html.w-anim
//   y todo queda en su estado final.
// ─────────────────────────────────────────────────────────────

const STAGGER_MS = 80;

function boot() {
  const root = document.documentElement;
  root.classList.add('w-ready');
  const main = document.querySelector<HTMLElement>('main[data-w]');
  if (!main) return;

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const settle = () => {
    root.classList.remove('w-anim');
    main.classList.add('is-in');
    main.querySelectorAll('[data-w-reveal]').forEach((el) => el.classList.add('is-revealed'));
  };
  mq.addEventListener?.('change', (e) => { if (e.matches) settle(); });

  // Sin animación (reduced-motion o script inline ausente): estado final y fuera.
  if (!root.classList.contains('w-anim')) { settle(); return; }

  // Primer rAF. La lectura de offsetHeight fija el estado inicial en el cálculo de
  // estilos ANTES de añadir .is-in: si no, en una carga rápida el navegador
  // resolvería inicial y final a la vez y no habría transición.
  requestAnimationFrame(() => { void main.offsetHeight; main.classList.add('is-in'); });

  const targets = main.querySelectorAll<HTMLElement>('[data-w-reveal]');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-revealed')); return; }

  const io = new IntersectionObserver((entries) => {
    let i = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      el.style.transitionDelay = `${i * STAGGER_MS}ms`;
      el.classList.add('is-revealed');
      // El retraso solo sirve para la entrada: se limpia al terminar para que
      // hovers u otras transiciones del elemento no hereden el escalonado.
      el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
      io.unobserve(el);
      i++;
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
  targets.forEach((el) => io.observe(el));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
