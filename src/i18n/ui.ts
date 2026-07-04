// ─────────────────────────────────────────────────────────────
// UI CHROME i18n — textos hardcodeados de los componentes (aria-labels, hints,
// etiquetas cortas) que NO viven en el contenido por idioma. Fuente única {es,en}
// para que /en/** no muestre español. Se pasa `lang` a los componentes y estos
// leen ui[lang]. El contenido de negocio sigue en content.ts / *.ts (por idioma).
// ─────────────────────────────────────────────────────────────
export type Lang = 'es' | 'en';

export const ui = {
  es: {
    answer: { directAnswer: 'Respuesta directa', source: 'Fuente' },
    price: { from: 'desde', perMonth: '/mes', includes: 'Incluye', offer: 'OFERTA' },
    cta: { call: 'Llamar' },
    hero: { tapHint: 'Toca para explorar', hoverHint: 'Pasa el cursor sobre el planeta', planetLabel: 'Marcyan — planeta en órbita' },
    footer: { copyEmail: 'Copiar correo', copyHouston: 'Copiar teléfono de Houston', copyMiami: 'Copiar teléfono de Miami', copied: '¡Copiado!' },
    nav: { primary: 'Principal', menu: 'Menú', mobileMenu: 'Menú móvil' },
    postnav: { more: 'Más artículos' },
    projects: { prev: 'Trabajo anterior', next: 'Trabajo siguiente' },
    shot: { pc: 'vista de escritorio del sitio', movil: 'vista móvil del sitio' },
  },
  en: {
    answer: { directAnswer: 'Straight answer', source: 'Source' },
    price: { from: 'from', perMonth: '/mo', includes: 'Includes', offer: 'OFFER' },
    cta: { call: 'Call' },
    hero: { tapHint: 'Tap to explore', hoverHint: 'Hover over the planet', planetLabel: 'Marcyan — planet in orbit' },
    footer: { copyEmail: 'Copy email', copyHouston: 'Copy Houston phone', copyMiami: 'Copy Miami phone', copied: 'Copied!' },
    nav: { primary: 'Main', menu: 'Menu', mobileMenu: 'Mobile menu' },
    postnav: { more: 'More articles' },
    projects: { prev: 'Previous project', next: 'Next project' },
    shot: { pc: 'desktop view of the site', movil: 'mobile view of the site' },
  },
} as const;

export const t = (lang: Lang) => ui[lang] ?? ui.es;
