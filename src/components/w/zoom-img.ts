// Pantallas grandes (base.css, --z): con el sitio ampliado, cada imagen se pinta z veces más grande
// de lo que dice su `sizes` (que el navegador evalúa sin el zoom) y elegiría una versión pequeña y
// borrosa. Aquí, solo si hay zoom, cada imagen con varias versiones pasa a pedir la de su tamaño real.
import { zoom } from './zoom';

function ajusta() {
  if (zoom() === 1) return;
  document.querySelectorAll<HTMLImageElement>('img[srcset][sizes]').forEach((img) => {
    const w = Math.ceil(img.getBoundingClientRect().width);   // píxeles de pantalla, con el zoom ya aplicado
    if (w > 1 && img.sizes !== `${w}px`) img.sizes = `${w}px`;
  });
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', ajusta, { once: true });
else ajusta();
let t = 0;
addEventListener('resize', () => { clearTimeout(t); t = window.setTimeout(ajusta, 300); });
