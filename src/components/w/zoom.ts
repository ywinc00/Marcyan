// Pantallas grandes (base.css, --z): el sitio entero va ampliado con `zoom` en <html>.
// Con zoom, getBoundingClientRect, innerWidth/innerHeight, scrollY y los márgenes de
// IntersectionObserver vienen en píxeles de PANTALLA; offsetWidth/clientWidth y todo lo que se
// escribe en estilos va en píxeles CSS. Quien mide para colocar algo (left, top, width, viewBox)
// usa zrect(): el rectángulo ya en píxeles CSS. Sin zoom (z = 1) devuelve el mismo rectángulo.
// Se lee UNA vez y se guarda hasta el próximo cambio de tamaño (leer el estilo calculado en cada
// fotograma de scroll forzaba recálculos: ronda de velocidad, 2026-11-08).
let zCache = 0;
if (typeof window !== 'undefined') addEventListener('resize', () => { zCache = 0; }, { passive: true });
export const zoom = (): number => zCache || (zCache = parseFloat(getComputedStyle(document.documentElement).zoom) || 1);
export function zrect(el: Element): DOMRect {
  const r = el.getBoundingClientRect();
  const z = zoom();
  return z === 1 ? r : new DOMRect(r.x / z, r.y / z, r.width / z, r.height / z);
}
