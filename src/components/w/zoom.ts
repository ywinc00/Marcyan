// Pantallas grandes (base.css, --z): el sitio entero va ampliado con `zoom` en <html>.
// Con zoom, getBoundingClientRect, innerWidth/innerHeight, scrollY y los márgenes de
// IntersectionObserver vienen en píxeles de PANTALLA; offsetWidth/clientWidth y todo lo que se
// escribe en estilos va en píxeles CSS. Quien mide para colocar algo (left, top, width, viewBox)
// usa zrect(): el rectángulo ya en píxeles CSS. Sin zoom (z = 1) devuelve el mismo rectángulo.
export const zoom = (): number => parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
export function zrect(el: Element): DOMRect {
  const r = el.getBoundingClientRect();
  const z = zoom();
  return z === 1 ? r : new DOMRect(r.x / z, r.y / z, r.width / z, r.height / z);
}
