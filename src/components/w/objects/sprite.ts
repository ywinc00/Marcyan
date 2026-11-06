// Sprite de los 7 iconos-objeto como ARCHIVO compartido (control v2 r3, I-02).
// Antes iba en línea en el HTML de cada página (≈10 KB, 1,7 KB comprimidos en las 69 páginas);
// ahora se sirve una vez en /w/iconos.svg (lo emite src/pages/w/iconos.svg.ts) y queda en la
// caché del navegador. IconoObjeto pinta <use href="/w/iconos.svg#wi-<id>">. Vercel sirve los
// estáticos con max-age=0 + must-revalidate, así que un dibujo nuevo nunca se queda viejo en caché.
import { GLYPH_DEFS, GLYPH_IDS, glyphMarkup } from './glyphs';

const symbols = GLYPH_IDS.map((id) => `<symbol id="wi-${id}" viewBox="0 0 64 64">${glyphMarkup(id)}</symbol>`).join('');
export const SPRITE_SVG = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${GLYPH_DEFS}</defs>${symbols}</svg>`;
export const SPRITE_HREF = '/w/iconos.svg';
