// ─────────────────────────────────────────────────────────────
// Copy NUEVO de los detalles permitidos de los hubs de ciudad (design/rediseno-workos.md §4.2, ola 4).
// Houston y Miami, ES y EN. Solo textos libres: rótulos de la bandeja de servicios, textos de las
// tarjetas de barrio, garantías, tarjeta templada del cierre y su prueba.
// Lo congelado (h1, answer, faq, local.paragraphs, services.links, meta, breadcrumb) se pinta tal cual
// desde houston*.ts / miami*.ts, que no se tocan.
// Reglas: sin guiones como conector, nada inventado (las pruebas nombran trabajos reales de
// portfolio.ts), precios solo de pricing.ts, plazos oficiales (contacto en 1 hora hábil · propuesta
// en 24 horas · la web es tuya, sin fusionar). EN escrito nativo, no traducido.
// ─────────────────────────────────────────────────────────────
import { PRICE_ANCHORS } from '../pricing';
import type { IconoId } from '../../components/w/objects/registry';

type Lang = 'es' | 'en';
type City = 'houston' | 'miami';
const usd = (n: number) => '$' + n.toLocaleString('en-US');

/** Los 7 productos en el orden de pricing.ts, con el índice de su fila en `services.links`
 *  de cada hub (si la ciudad tiene esa fila) para conservar su enlace y su texto. */
export const HUB_PRODUCTOS: IconoId[] = ['diseno-web', 'ia-conversacional', 'seo-ia', 'ecommerce', 'seo-local', 'branding', 'mantenimiento'];
/** Fila de services.links que corresponde a cada producto (los índices no cambian entre ES y EN). */
export const FILA: Record<City, Partial<Record<IconoId, number>>> = {
  houston: { 'diseno-web': 0, 'ia-conversacional': 1, 'seo-local': 2, 'seo-ia': 3, ecommerce: 4, branding: 5 },
  miami: { 'diseno-web': 0, 'seo-local': 1, 'ia-conversacional': 2, ecommerce: 3 },
};
/** Hub de servicios: destino de los productos sin landing en la ciudad (ancla del capítulo de cada uno). */
export const HUB_SERVICIOS: Record<Lang, string> = { es: '/es/servicios', en: '/en/services' };
/** Dominios VERIFICADOS (los mismos que FiguraProyecto); los demás proyectos, barra sin texto. */
export const DOMINIOS: Record<string, string> = { trr: 'texasrushremove.com', mja: 'movejunkaway.com' };

const PRECIO: Record<Lang, Record<IconoId, string>> = {
  es: {
    'diseno-web': `desde ${usd(PRICE_ANCHORS.web)}`,
    'ia-conversacional': `desde ${usd(PRICE_ANCHORS.ia)}`,
    'seo-ia': 'Diagnóstico gratis',
    ecommerce: `desde ${usd(PRICE_ANCHORS.ecommerce)}`,
    'seo-local': `desde ${usd(PRICE_ANCHORS.seoLocal)}/mes`,
    branding: `desde ${usd(PRICE_ANCHORS.branding)}`,
    mantenimiento: `desde ${usd(PRICE_ANCHORS.maintenance)}/mes`,
  },
  en: {
    'diseno-web': `from ${usd(PRICE_ANCHORS.web)}`,
    'ia-conversacional': `from ${usd(PRICE_ANCHORS.ia)}`,
    'seo-ia': 'Free diagnostic',
    ecommerce: `from ${usd(PRICE_ANCHORS.ecommerce)}`,
    'seo-local': `from ${usd(PRICE_ANCHORS.seoLocal)}/mo`,
    branding: `from ${usd(PRICE_ANCHORS.branding)}`,
    mantenimiento: `from ${usd(PRICE_ANCHORS.maintenance)}/mo`,
  },
};
/** Nombre del producto cuando la tarjeta va al hub de servicios (no hay landing en la ciudad). */
const NOMBRE: Record<Lang, Record<IconoId, string>> = {
  es: {
    'diseno-web': 'Diseño web', 'ia-conversacional': 'IA conversacional', 'seo-ia': 'SEO para IA', ecommerce: 'Tienda en línea',
    'seo-local': 'SEO local', branding: 'Branding e identidad', mantenimiento: 'Mantenimiento continuo',
  },
  en: {
    'diseno-web': 'Web design', 'ia-conversacional': 'Conversational AI', 'seo-ia': 'AI SEO', ecommerce: 'Online store',
    'seo-local': 'Local SEO', branding: 'Branding and identity', mantenimiento: 'Ongoing maintenance',
  },
};

export interface HubCopy {
  /** Bandeja de servicios bajo las viñetas (W-ADV-40). */
  tray: { label: string; precio: Record<IconoId, string>; nombre: Record<IconoId, string> };
  /** Tarjetas de barrio con página (W-CONV-33). Solo los barrios que ya enlaza el mapa. */
  barrios: { name: string; text: string; href: string }[];
  garantias: { items: [{ icon: string; title: string; text: string }, { icon: string; title: string; text: string }, { icon: string; title: string; text: string }] };
  cierre: { proof: string; warm: { title: string; text: string; cta: string; ask: string } };
  /** "Sigue explorando" (W-CORE-23, plan v2 G02): tercera tarjeta de recurso cuando la página trae solo dos.
   *  Enlaza al blog, que la página ya enlaza desde el menú y el pie (no abre un enlace nuevo en el silo). */
  recurso: { label: string; href: string; desc: string; icon: string };
}

const RECURSO_ES: HubCopy['recurso'] = { label: 'Blog', href: '/es/blog', desc: 'Guías de diseño web, IA y SEO.', icon: 'lucide:book-open' };
const RECURSO_EN: HubCopy['recurso'] = { label: 'Blog', href: '/en/blog', desc: 'Web design, AI and SEO guides.', icon: 'lucide:book-open' };

const GARANTIAS_ES: HubCopy['garantias'] = {
  items: [
    { icon: 'lucide:clock', title: 'Te contactamos en 1 hora hábil', text: 'Escríbenos en horario laboral y te contestamos dentro de la hora.' },
    { icon: 'lucide:file-pen-line', title: 'Propuesta en 24 horas', text: 'Con alcance y precio claros, sin costo ni compromiso.' },
    { icon: 'lucide:key-round', title: 'La web es tuya', text: 'Al terminar, el sitio es tuyo. Nunca te dejamos amarrado.' },
  ],
};
const GARANTIAS_EN: HubCopy['garantias'] = {
  items: [
    { icon: 'lucide:clock', title: 'We reply within 1 business hour', text: 'Message us during business hours and hear back within the hour.' },
    { icon: 'lucide:file-pen-line', title: 'Proposal in 24 hours', text: 'Clear scope and price, no cost and no commitment.' },
    { icon: 'lucide:key-round', title: 'The site is yours', text: 'Once it is done, you own it. We never lock you in.' },
  ],
};

export const hubs: Record<Lang, Record<City, HubCopy>> = {
  es: {
    houston: {
      tray: { label: 'Servicios en Houston y su precio de arranque', precio: PRECIO.es, nombre: NOMBRE.es },
      barrios: [
        { name: 'Katy', text: 'Web y SEO local en Katy', href: '/es/houston/katy' },
        { name: 'Sugar Land', text: 'Web bilingüe y SEO en Sugar Land', href: '/es/houston/sugar-land' },
      ],
      garantias: GARANTIAS_ES,
      recurso: RECURSO_ES,
      cierre: {
        proof: "Hicimos las webs de Texas Rush Remove, Rosy Nails & Care y Julio's Landscape TX, aquí en Houston.",
        warm: {
          title: '¿Tienes una duda rápida?',
          text: 'Pregúntale a Marcy, nuestra asistente. Contesta al momento, en español o en inglés.',
          cta: 'Pregúntale a Marcy',
          ask: '¿Qué necesita mi negocio en Houston para que lo encuentren en Google?',
        },
      },
    },
    miami: {
      tray: { label: 'Servicios en Miami y su precio de arranque', precio: PRECIO.es, nombre: NOMBRE.es },
      barrios: [
        { name: 'Doral', text: 'Web, SEO e IA para negocios de Doral', href: '/es/miami/doral' },
        { name: 'Hialeah', text: 'Web, SEO local e IA en español para Hialeah', href: '/es/miami/hialeah' },
      ],
      garantias: GARANTIAS_ES,
      recurso: RECURSO_ES,
      cierre: {
        proof: 'Hacemos sitios para negocios reales, como Move Junk Away en Orlando, Florida.',
        warm: {
          title: '¿Tienes una duda rápida?',
          text: 'Pregúntale a Marcy, nuestra asistente. Contesta al momento, en español o en inglés.',
          cta: 'Pregúntale a Marcy',
          ask: '¿Qué necesita mi negocio en Miami para que lo encuentren en Google?',
        },
      },
    },
  },
  en: {
    houston: {
      tray: { label: 'Services in Houston and their starting price', precio: PRECIO.en, nombre: NOMBRE.en },
      barrios: [],
      garantias: GARANTIAS_EN,
      recurso: RECURSO_EN,
      cierre: {
        proof: "We built the sites for Texas Rush Remove, Rosy Nails & Care and Julio's Landscape TX, right here in Houston.",
        warm: {
          title: 'Got a quick question?',
          text: 'Ask Marcy, our assistant. She answers right away, in English or Spanish.',
          cta: 'Ask Marcy',
          ask: 'What does my Houston business need to show up on Google?',
        },
      },
    },
    miami: {
      tray: { label: 'Services in Miami and their starting price', precio: PRECIO.en, nombre: NOMBRE.en },
      barrios: [],
      garantias: GARANTIAS_EN,
      recurso: RECURSO_EN,
      cierre: {
        proof: 'We build sites for real businesses, like Move Junk Away in Orlando, Florida.',
        warm: {
          title: 'Got a quick question?',
          text: 'Ask Marcy, our assistant. She answers right away, in English or Spanish.',
          cta: 'Ask Marcy',
          ask: 'What does my Miami business need to show up on Google?',
        },
      },
    },
  },
};
