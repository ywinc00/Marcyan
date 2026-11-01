// ─────────────────────────────────────────────────────────────
// Iconos-objeto propios (7), dibujados en SVG con los tokens del sitio
// (design/rediseno-workos.md §2.8 + §10.2: sin familia nueva; Lucide sigue
// para la interfaz funcional). viewBox 64×64.
//
// Construcción común: cuadrado redondeado radio 14 con degradado vertical
// #232321 → #141414, filo de luz superior (blanco al 12 % que se apaga en el
// primer tercio) y contorno de 1 px del acento al 45 % (80 % en hover, lo
// controla IconoObjeto con --wi-edge-a). Glifo en tinta crema al 92 % con
// trazo 2 y UN detalle de acento plano.
//
// Colores por variables (heredan a través de <use>):
//   --wi-rgb    acento "r, g, b" (oro o teal, lo pone IconoObjeto)
//   --wi-edge-a opacidad del contorno (.45 → .8)
// Los ids de los degradados (wi-bg, wi-hl) se definen UNA vez en el sprite;
// en modo inline IconoObjeto los renombra con un sufijo único.
// ─────────────────────────────────────────────────────────────

const INK = 'var(--wi-ink, rgba(240,237,232,.92))';
const ACC = 'rgb(var(--wi-rgb, 200,169,110))';
const acc = (a: number) => `rgba(var(--wi-rgb, 200,169,110), ${a})`;
/** Relleno que tapa lo de detrás (mismo valor que el fondo del icono a esa altura). */
const PLATE = '#1b1b1a';

export const GLYPH_DEFS = `<linearGradient id="wi-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232321"/><stop offset="1" stop-color="#141414"/></linearGradient><linearGradient id="wi-hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".32" stop-color="#fff" stop-opacity="0"/></linearGradient>`;

const BASE = `<rect x=".5" y=".5" width="63" height="63" rx="13.5" fill="url(#wi-bg)" stroke-width="1" style="stroke:rgba(var(--wi-rgb, 200,169,110), var(--wi-edge-a, .45))"/><rect x="1.5" y="1.5" width="61" height="61" rx="12.5" fill="none" stroke="url(#wi-hl)" stroke-width="1"/>`;

/** Grupo de trazo del glifo (tinta). */
const g = (body: string) =>
  `<g fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke:${INK}">${body}</g>`;

/** Chispa de 4 puntas (misma curva que src/icons/marcyan-ai.svg). */
const spark = (cx: number, cy: number, r: number, fill: string) => {
  const k = r * 0.17; // tensión de la curva
  return `<path d="M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r}Z" style="fill:${fill}"/>`;
};

/** Borde dentado del sello: 16 dientes (32 vértices alternos). */
const sealPath = (cx: number, cy: number, rOut: number, rIn: number, teeth = 16) => {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = (Math.PI * i) / teeth - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')}Z`;
};

const GLYPHS: Record<string, string> = {
  // Pantalla: navegador con titular, líneas y botón oro; teléfono solapado.
  'diseno-web':
    g(
      `<rect x="10" y="14" width="38" height="28" rx="4"/>` +
        `<path d="M10 20.5H48"/>`,
    ) +
    `<g style="fill:${INK}"><circle cx="14" cy="17.3" r="1.1"/><circle cx="17.6" cy="17.3" r="1.1"/><circle cx="21.2" cy="17.3" r="1.1"/>` +
    `<rect x="14.5" y="24.5" width="16" height="3" rx="1.5"/><rect x="14.5" y="30" width="22" height="2" rx="1" opacity=".55"/><rect x="14.5" y="33.6" width="12" height="2" rx="1" opacity=".55"/></g>` +
    `<rect x="14.5" y="37.2" width="10" height="3.4" rx="1.7" style="fill:${ACC}"/>` +
    `<rect x="40" y="30" width="13" height="21" rx="3.2" style="fill:${PLATE};stroke:${INK}" stroke-width="2"/>` +
    `<rect x="43.5" y="44.5" width="6" height="2.4" rx="1.2" style="fill:${ACC}"/>` +
    `<path d="M45 33.4h3" style="stroke:${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`,

  // Pin de mapa con núcleo hueco, sombra en elipse y dos arcos de radar oro.
  'seo-local':
    g(
      `<path d="M32 45.5C32 45.5 21 34.6 21 25.4a11 11 0 0 1 22 0C43 34.6 32 45.5 32 45.5Z"/>` +
        `<circle cx="32" cy="25.4" r="3.6"/>` +
        `<ellipse cx="32" cy="49.6" rx="10" ry="2.8" opacity=".45"/>`,
    ) +
    `<g fill="none" stroke-width="2" stroke-linecap="round" style="stroke:${acc(0.6)}">` +
    `<path d="M45.1 16.2a16 16 0 0 1 0 18.4"/><path d="M50 12.8a22 22 0 0 1 0 25.2"/></g>`,

  // Burbuja de Marcy escribiendo (3 puntos teal) + chispa.
  'ia-conversacional':
    g(
      `<path d="M21 19H36a9 9 0 0 1 9 9v7a9 9 0 0 1-9 9H24l-7.5 6v-7.2A9 9 0 0 1 12 35v-7a9 9 0 0 1 9-9Z"/>`,
    ) +
    `<g style="fill:${ACC}"><circle cx="21.6" cy="31.5" r="1.9"/><circle cx="28.5" cy="31.5" r="1.9"/><circle cx="35.4" cy="31.5" r="1.9"/></g>` +
    spark(50.5, 13.5, 5, INK),

  // Bolsa trapezoidal con asa, pliegue oro y etiqueta de precio colgando.
  ecommerce:
    g(
      `<path d="M20.4 25H43.6l2.9 21.2a2.6 2.6 0 0 1-2.6 2.9H20.1a2.6 2.6 0 0 1-2.6-2.9Z"/>` +
        `<path d="M26 25v-3.4a6 6 0 0 1 12 0V25"/>`,
    ) +
    `<path d="M20.2 31.2H43.8" stroke-width="2" stroke-linecap="round" style="stroke:${ACC}"/>` +
    `<g transform="rotate(16 47 28)"><path d="M43.6 25.6 47 28" style="stroke:${INK}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M47 27.2l5.4 3.6v7.6a1.6 1.6 0 0 1-1.6 1.6h-7.6a1.6 1.6 0 0 1-1.6-1.6v-7.6Z" style="fill:${PLATE};stroke:${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<circle cx="47" cy="31.4" r="1.5" style="fill:${INK}"/></g>`,

  // Sello de marca con 16 dientes, estrella oro y cota de plano.
  branding:
    g(`<path d="${sealPath(32, 27, 15, 13)}"/><circle cx="32" cy="27" r="9.5" opacity=".5" stroke-width="1.4"/>`) +
    `<path d="M32 21.2Q32.9 26.1 37.8 27 32.9 27.9 32 32.8 31.1 27.9 26.2 27 31.1 26.1 32 21.2Z" style="fill:${ACC}"/>` +
    `<g fill="none" stroke-width="1.6" stroke-linecap="round" style="stroke:${INK}" opacity=".7">` +
    `<path d="M17 49.5H47"/><path d="M17 46.5v6"/><path d="M47 46.5v6"/><path d="M17 49.5l3-1.8M17 49.5l3 1.8M47 49.5l-3-1.8M47 49.5l-3 1.8"/></g>`,

  // Chispa IA grande + 2 pequeñas sobre 3 líneas de respuesta (la 2.ª teal).
  'seo-ia':
    spark(29, 21, 8.5, INK) +
    spark(41.5, 12.5, 3.6, INK) +
    spark(42, 27.5, 2.4, INK) +
    `<rect x="16" y="37" width="30" height="2.6" rx="1.3" style="fill:${INK}"/>` +
    `<rect x="16" y="42.6" width="22" height="2.6" rx="1.3" style="fill:${ACC}"/>` +
    `<rect x="16" y="48.2" width="26" height="2.6" rx="1.3" style="fill:${INK}" opacity=".6"/>`,

  // Llave inglesa diagonal con punto de estado oro en la boca y arco de giro.
  mantenimiento:
    `<g transform="rotate(-45 33 33)">` +
    g(`<path d="M36.4 29.6H18.6a2.4 2.4 0 0 0 0 4.8H36.4A8 8 0 0 0 51.4 35H46.2a3 3 0 0 1 0-6H51.4A8 8 0 0 0 36.4 29.6Z"/>`) +
    `<circle cx="48.4" cy="32" r="2.1" style="fill:${ACC}"/>` +
    `<path d="M47.4 19.4a13 13 0 0 1 9.2 15.9" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2 3" style="stroke:${INK}" opacity=".4"/>` +
    `</g>`,
};

/** Símbolo completo (base + glifo) de un icono. */
export function glyphMarkup(id: string): string {
  const body = GLYPHS[id];
  if (!body) throw new Error(`IconoObjeto: no hay glifo para "${id}"`);
  return BASE + body;
}

export const GLYPH_IDS = Object.keys(GLYPHS);
