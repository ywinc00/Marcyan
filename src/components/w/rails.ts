// ─────────────────────────────────────────────────────────────
// Raíles con corte por sección (v3 · E-57 regla 2). Lo arranca WStyles.astro.
//
// Los raíles son dos líneas de 1 px que pinta main.w-rails (::before/::after, w.css). WorkOS
// las quita justo donde se cruzarían con otra pieza; aquí se cortan en cualquier bloque que
// lleve el atributo genérico `data-w-sin-rail` (un hero con objetos a sangre, una banda con
// su propio fondo, una pieza que cruza el margen). Se ponen en el componente, no aquí.
//
// · Mide cada bloque marcado respecto al <main> y escribe --w-rail-mask: un degradado
//   vertical con tramos transparentes en esas bandas (corte seco, a la altura exacta del
//   bloque). La máscara la aplica w.css a las dos líneas.
// · Se recalcula con ResizeObserver del <main> y de cada bloque (fuentes, imágenes y
//   content-visibility cambian alturas), en un rAF. Sin listener de scroll.
// · Hasta que esto corre (o sin JS), una página con cortes NO pinta los raíles
//   (w.css: :has([data-w-sin-rail]) sin data-w-rail-listo): nunca se ven cruzando la pieza.
// ─────────────────────────────────────────────────────────────

function montar(main: HTMLElement) {
  const cortes = [...main.querySelectorAll<HTMLElement>('[data-w-sin-rail]')];
  if (!cortes.length) return;
  let raf = 0;
  const calc = () => {
    raf = 0;
    const top0 = main.getBoundingClientRect().top;
    const alto = main.offsetHeight;
    const tramos = cortes
      .map((e) => { const r = e.getBoundingClientRect(); return [Math.max(0, r.top - top0), Math.min(alto, r.bottom - top0)]; })
      .filter(([a, b]) => b - a > 0)
      .sort((x, y) => x[0] - y[0]);
    const paradas: string[] = [];
    let y = 0;
    for (const [a, b] of tramos) {
      const ini = Math.max(a, y);
      if (b <= ini) continue;
      paradas.push(`#000 ${Math.round(y)}px ${Math.round(ini)}px`, `transparent ${Math.round(ini)}px ${Math.round(b)}px`);
      y = b;
    }
    paradas.push(`#000 ${Math.round(y)}px`);
    main.style.setProperty('--w-rail-mask', `linear-gradient(180deg, ${paradas.join(', ')})`);
    main.dataset.wRailListo = '';
  };
  const pide = () => { if (!raf) raf = requestAnimationFrame(calc); };
  const ro = new ResizeObserver(pide);
  ro.observe(main);
  cortes.forEach((c) => ro.observe(c));
  calc();
}

function boot() {
  const main = document.querySelector<HTMLElement>('main.w-rails');
  if (main) montar(main);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
