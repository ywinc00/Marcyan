// ─────────────────────────────────────────────────────────────
// Datos del megamenú y de los grupos del drawer (design/rediseno-workos.md §2.12, G10).
// ADITIVO: las 4 fuentes de nav (content.ts, clusterNav, clusterNavEn, pageNav)
// no se tocan. Productos = los 7 de pricing.ts / pricing.en.ts en su orden, con su
// `href` (nunca un enlace EN→ES). Sin URL nuevas.
// ─────────────────────────────────────────────────────────────
import { priceServices as servicesEs } from '../pricing';
import { priceServices as servicesEn } from '../pricing.en';
import { nap } from '../content';
import lucide from '@iconify-json/lucide/icons.json';
import type { IconoId } from '../../components/w/objects/registry';

export type NavLang = 'es' | 'en';

export interface MegaServicio {
  id: IconoId;
  name: string;
  /** Promesa de una línea (el `tagline` de pricing). */
  promise: string;
  href: string;
}

export interface NavRecurso {
  label: string;
  href: string;
  /** Icono Lucide de interfaz (los recursos son línea; los productos, objeto). */
  icon: string;
}

/** Nombre corto para el menú: el de pricing sin el paréntesis aclaratorio. */
const shortName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '');

/** Promesa de una línea (§2.12): el `tagline` de pricing recortado a lo esencial
 *  para que quepa en 1-2 líneas de una celda de 292 px (copy nuevo, va al informe). */
const PROMESA: Record<NavLang, Record<IconoId, string>> = {
  es: {
    'diseno-web': 'Sitios a medida, rápidos y bilingües.',
    'ia-conversacional': 'Contesta y capta prospectos 24/7.',
    'seo-ia': 'Que la IA te recomiende.',
    ecommerce: 'Tiendas en línea con catálogo y pagos.',
    'seo-local': 'Aparece en Google Maps de tu zona.',
    branding: 'Logo, colores y tipografía.',
    mantenimiento: 'Respaldos, seguridad y soporte bilingüe.',
  },
  en: {
    'diseno-web': 'Custom, fast, bilingual sites.',
    'ia-conversacional': 'Replies and captures leads 24/7.',
    'seo-ia': 'Get AI to recommend you.',
    ecommerce: 'Online stores with catalog and payments.',
    'seo-local': 'Show up on Google Maps in your area.',
    branding: 'Logo, colors and typography.',
    mantenimiento: 'Backups, security and bilingual support.',
  },
};

/** Mantenimiento no tiene página propia todavía: a #contacto hasta que la ola 3
 *  cree `#mantenimiento` en servicios (§2.12). pricing lo apunta a `#contacto`
 *  relativo, que en las páginas sin formulario (diagnóstico, herramientas) no
 *  tiene destino: se ancla al contacto de la página de servicios, que siempre existe. */
const HUB_SERVICIOS: Record<NavLang, string> = { es: '/es/servicios', en: '/en/services' };
const anclaFiable = (lang: NavLang, href: string) =>
  href.startsWith('#') ? HUB_SERVICIOS[lang] + href : href;

const toItems = (lang: NavLang, list: { id: string; name: string; tagline: string; href: string }[]): MegaServicio[] =>
  list.map((s) => ({
    id: s.id as IconoId,
    name: shortName(s.name),
    promise: PROMESA[lang][s.id as IconoId] ?? s.tagline,
    href: anclaFiable(lang, s.href),
  }));

export const megaServicios: Record<NavLang, MegaServicio[]> = {
  es: toItems('es', servicesEs),
  en: toItems('en', servicesEn),
};

/** Landings de Miami que existen hoy (src/pages/es/miami/*). */
const MIAMI_ES: Partial<Record<IconoId, string>> = {
  'diseno-web': '/es/miami/diseno-web',
  ecommerce: '/es/miami/ecommerce',
  'seo-local': '/es/miami/seo-local',
  'ia-conversacional': '/es/miami/ia-conversacional',
};

export const isMiamiPath = (path?: string) =>
  !!path && (path.startsWith('/es/miami') || path.startsWith('/en/miami'));

/** Productos para una página concreta: en páginas ES de Miami, la landing de
 *  Miami cuando existe; si no, la de pricing. */
export function serviciosPara(lang: NavLang, currentPath?: string): MegaServicio[] {
  const base = megaServicios[lang];
  if (lang !== 'es' || !currentPath?.startsWith('/es/miami')) return base;
  return base.map((s) => (MIAMI_ES[s.id] ? { ...s, href: MIAMI_ES[s.id]! } : s));
}

export const recursos: Record<NavLang, NavRecurso[]> = {
  es: [
    { label: 'Blog', href: '/es/blog', icon: 'lucide:pen-line' },
    { label: 'Diagnóstico gratis', href: '/es/diagnostico', icon: 'lucide:scan-search' },
    { label: 'Calculadoras', href: '/es/herramientas', icon: 'lucide:calculator' },
  ],
  en: [
    { label: 'Blog', href: '/en/blog', icon: 'lucide:pen-line' },
    { label: 'Free checkup', href: '/en/checkup', icon: 'lucide:scan-search' },
    { label: 'Calculators', href: '/en/tools', icon: 'lucide:calculator' },
  ],
};

export const ciudades: Record<NavLang, { label: string; href: string }[]> = {
  es: [
    { label: 'Houston', href: '/es/houston' },
    { label: 'Miami', href: '/es/miami' },
  ],
  en: [
    { label: 'Houston', href: '/en/houston' },
    { label: 'Miami', href: '/en/miami' },
  ],
};

export const navW = {
  es: {
    megaBtn: 'Abrir menú de servicios',
    allServices: { label: 'Ver todos los servicios', href: '/es/servicios' },
    allCities: { label: 'Todas las ciudades', href: '/es/ciudades' },
    groups: { services: 'Servicios', cities: 'Ciudades', resources: 'Recursos' },
    call: 'Llamar',
    whatsapp: 'WhatsApp',
  },
  en: {
    megaBtn: 'Open services menu',
    allServices: { label: 'See all services', href: '/en/services' },
    allCities: { label: 'All cities', href: '/en/cities' },
    groups: { services: 'Services', cities: 'Cities', resources: 'Resources' },
    call: 'Call',
    whatsapp: 'WhatsApp',
  },
} as const;

/** Número del pie del drawer: el de la portada (Houston) y, en páginas de Miami, el de Miami. */
export function contactoPara(currentPath?: string) {
  const tel = isMiamiPath(currentPath) ? nap.miami : nap.houston;
  return {
    tel: 'tel:' + tel.replace(/[^\d+]/g, ''),
    wa: 'https://wa.me/' + tel.replace(/\D/g, ''),
  };
}

/** SVG en línea de un icono Lucide para la nav, leído del mismo paquete que usa
 *  astro-icon pero SIN pasar por él: astro-icon cuenta los usos de cada icono por
 *  página y emite su <symbol> en el primero, así que un icono de la nav (que va
 *  antes que el hero) cambiaría el marcado del hero de portada (§2.13, huella DOM). */
export function navIcon(name: string, cls = ''): string {
  const key = name.replace(/^lucide:/, '');
  const set = lucide as { icons: Record<string, { body: string }>; aliases?: Record<string, { parent: string }> };
  const icon = set.icons[key] ?? set.icons[set.aliases?.[key]?.parent ?? ''];
  if (!icon) throw new Error(`navIcon: icono desconocido "${name}"`);
  return `<svg class="${cls}" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon.body}</svg>`;
}

/** Enlaces de la barra que en el drawer ya representan los grupos (servicios,
 *  ciudades, blog): se omiten de la lista grande para no repetirlos. */
export const cubiertoPorGrupos = (href: string) =>
  /\/(servicios|services|ciudades|cities|blog)\/?$/.test(href);
