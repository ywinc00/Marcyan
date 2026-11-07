// ─────────────────────────────────────────────────────────────
// Raíles SOLO donde encajan (v4, E-58). Lo arranca WStyles.astro.
//
// Los raíles son dos líneas de 1 px que pinta main.w-rails (::before/::after, w.css). En
// WorkOS no recorren la página entera: enmarcan las secciones de rejilla de celdas, donde el
// marco de 1 px de la rejilla ES el raíl. Nunca en el hero ni sobre piezas que no casan.
//
// · Tramos visibles = la sección que contiene una rejilla de celdas (.w-cells, .wd-bento) o
//   cualquier bloque marcado a mano con `data-w-rail`. Todo lo demás queda sin raíles.
// · Nada dentro de un hero (.w-hero) ni de un bloque con data-w-sin-rail se enciende.
// · Si la página no tiene ningún tramo, no hay raíles (la mayoría de landings).
// · Mide respecto al <main>, escribe --w-rail-mask (tramos opacos solo en esas bandas) y se
//   recalcula con ResizeObserver en un rAF. Sin listener de scroll. Sin JS: sin raíles.
// ─────────────────────────────────────────────────────────────

function tramos(main: HTMLElement): HTMLElement[] {
  const set = new Set<HTMLElement>();
  main.querySelectorAll<HTMLElement>('[data-w-rail]').forEach((e) => set.add(e));
  main.querySelectorAll<HTMLElement>('.w-cells, .wd-bento').forEach((g) => {
    const sec = g.closest<HTMLElement>('section') ?? g;
    if (main.contains(sec) && sec !== main) set.add(sec);
  });
  return [...set].filter((e) => !e.closest('.w-hero, [data-w-sin-rail]'));
}

function montar(main: HTMLElement) {
  const bandas = tramos(main);
  if (!bandas.length) return;
  let raf = 0;
  const calc = () => {
    raf = 0;
    const top0 = main.getBoundingClientRect().top;
    const alto = main.offsetHeight;
    const rangos = bandas
      .map((e) => { const r = e.getBoundingClientRect(); return [Math.max(0, r.top - top0), Math.min(alto, r.bottom - top0)]; })
      .filter(([a, b]) => b - a > 0)
      .sort((x, y) => x[0] - y[0]);
    const paradas: string[] = [];
    let y = 0;
    for (const [a, b] of rangos) {
      const ini = Math.max(a, y);
      if (b <= ini) continue;
      paradas.push(`transparent ${Math.round(y)}px ${Math.round(ini)}px`, `#000 ${Math.round(ini)}px ${Math.round(b)}px`);
      y = b;
    }
    paradas.push(`transparent ${Math.round(y)}px`);
    main.style.setProperty('--w-rail-mask', `linear-gradient(180deg, ${paradas.join(', ')})`);
    main.dataset.wRailListo = '';
  };
  const pide = () => { if (!raf) raf = requestAnimationFrame(calc); };
  const ro = new ResizeObserver(pide);
  ro.observe(main);
  bandas.forEach((c) => ro.observe(c));
  calc();
}

function boot() {
  const main = document.querySelector<HTMLElement>('main.w-rails');
  if (main) montar(main);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
