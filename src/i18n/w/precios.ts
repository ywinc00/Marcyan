// ─────────────────────────────────────────────────────────────
// Copy nuevo del hub de precios v3 (design/rediseno-workos.md §4.4, ola 3, tarea 3-precios).
// /es/precios y /en/pricing.
//
// REGLA: aquí NO hay ni un precio escrito a mano. Toda cifra sale de PRICE_ANCHORS
// (pricing.ts, fuente única, guardada por `npm run check:kb`) o del `catalog` de
// pricing.ts / pricing.en.ts. Los textos congelados (H1, answer, faq, transparency,
// grid.title, cta.title, meta, breadcrumb) se leen del dato de la página
// (preciosPage), no se copian aquí.
// ─────────────────────────────────────────────────────────────
import { PRICE_ANCHORS, catalog as catalogEs, type CatalogProduct } from '../pricing';
import { catalog as catalogEn } from '../pricing.en';
import type { IconoId } from '../../components/w/objects/registry';

export type PreciosLang = 'es' | 'en';
type Anchor = keyof typeof PRICE_ANCHORS;

const usd = (n: number): string => '$' + n.toLocaleString('en-US');

/** "Desde $400" · "Desde $600 al mes" | "From $400" · "From $600 a month". */
export const desde = (lang: PreciosLang, key: Anchor, monthly = false): string => {
  const v = usd(PRICE_ANCHORS[key]);
  if (lang === 'en') return monthly ? `From ${v} a month` : `From ${v}`;
  return monthly ? `Desde ${v} al mes` : `Desde ${v}`;
};

/** Filas de nivel para TarjetaPrecio, derivadas del catálogo (cero cifras a mano). */
export const tiersOf = (p: CatalogProduct, lang: PreciosLang) =>
  p.tiers.map((t) => ({
    label: t.name,
    price: t.value === null ? (lang === 'en' ? 'Free' : 'Gratis') : usd(t.value),
    unit: t.monthly ? (lang === 'en' ? 'a month' : 'al mes') : undefined,
  }));

/** Cifra grande de cada TarjetaPrecio (W-CONV-03): el nivel ancla del catálogo.
 *  k = rótulo pequeño encima, v = la cifra. Gratis → rótulo = nombre del nivel (verbatim). */
export const fromOf = (p: CatalogProduct, lang: PreciosLang): { k: string; v: string } => {
  const t = p.tiers.find((x) => x.anchor) ?? p.tiers[0];
  if (t.value === null) return { k: t.name, v: lang === 'en' ? 'Free' : 'Gratis' };
  const k = lang === 'en' ? (t.monthly ? 'Monthly, from' : 'From') : (t.monthly ? 'Al mes, desde' : 'Desde');
  return { k, v: usd(t.value) };
};

/** Lo incluido de cada tarjeta: el `blurb` verbatim de cada nivel (o los cardBullets). */
export const includesOf = (p: CatalogProduct) =>
  p.cardBullets ?? p.tiers.map((t) => `${t.name}: ${t.blurb}`);

export const catalogFor = (lang: PreciosLang) => (lang === 'en' ? catalogEn : catalogEs);

/** Producto del catálogo por id (lanza si no existe: nada de enlaces adivinados, R5). */
export const productOf = (lang: PreciosLang, id: string): CatalogProduct => {
  const p = catalogFor(lang).find((x) => x.id === id);
  if (!p) throw new Error(`precios: producto "${id}" no está en el catálogo ${lang}`);
  return p;
};

/** Nombre de un nivel del catálogo por su clave (verbatim). */
export const tierName = (lang: PreciosLang, id: string, key: string): string => {
  const t = productOf(lang, id).tiers.find((x) => x.key === key);
  if (!t) throw new Error(`precios: nivel "${key}" no está en "${id}"`);
  return t.name;
};

interface Copy {
  eyebrow: string;
  lead: string;
  modelo: {
    proyecto: { title: string; text: string; lead: string; cta: string; items: string[] };
    mensual: { title: string; text: string; lead: string; cta: string; items: string[] };
  };
  prosa: { tone1: string; tone2: string };
  cuesta: { label: string; tiersLabel: string; includesLabel: string; note: { title: string; text: string } };
  incluido: {
    label: string;
    title: string;
    lead: string;
    items: { icon: string; title: string; text: string }[];
  };
  despues: {
    label: string;
    title: string;
    lead: string;
    cols: { id: string; key: string; lines: string[]; price: string }[];
  };
  combina: { tag: string; title: string; text: string; lead: string; items: string[]; cta: string };
  garantias: { title: string; items: [{ icon: string; title: string; text: string }, { icon: string; title: string; text: string }, { icon: string; title: string; text: string }] };
  dudas: { title: string; text: string; cta: string; link: string; linkHref: string };
  cierre: { proof: string; warmTitle: string; warmText: string; warmCta: string; ask: string };
}

export const preciosCopy: Record<PreciosLang, Copy> = {
  es: {
    eyebrow: 'Precios',
    lead: 'Todos los precios a la vista · Propuesta en 24 horas · La web es tuya',
    modelo: {
      proyecto: {
        title: 'Pago por proyecto',
        text: 'Para estrenar web, tienda o marca. Pagas una vez y el resultado es tuyo.',
        lead: 'Pagas una vez:',
        cta: 'Ver precios',
        items: [
          `Diseño web, ${desde('es', 'webLanding').toLowerCase()}`,
          `Tienda en línea, ${desde('es', 'ecommerceEssential').toLowerCase()}`,
          `Logo, ${desde('es', 'brandingLogo').toLowerCase()}`,
        ],
      },
      mensual: {
        title: 'Mensual',
        text: 'Para crecer después de publicar: Google, la IA y tu web, al día.',
        lead: 'Mes a mes, sin permanencia:',
        cta: 'Pide tu propuesta',
        items: [
          `SEO local, ${desde('es', 'seoLocal', true).toLowerCase()}`,
          `Mantenimiento, ${desde('es', 'maintenance', true).toLowerCase()}`,
          `Monitoreo en IA, ${desde('es', 'aeoMonitoring', true).toLowerCase()}`,
        ],
      },
    },
    prosa: { tone1: 'La mayoría te', tone2: '<em>esconde</em> el precio recurrente' },
    cuesta: {
      label: 'Lo que cuesta',
      tiersLabel: 'Precios',
      includesLabel: 'Qué incluye cada nivel',
      note: {
        title: '¿Necesitas algo distinto?',
        text: 'Cuéntanos tu caso y te mandamos una propuesta a tu medida en 24 horas.',
      },
    },
    incluido: {
      label: 'Incluido en toda web',
      title: 'Lo que trae cada web, <em>de serie</em>',
      lead: 'Da igual el nivel: estas seis cosas vienen siempre.',
      items: [
        { icon: 'lucide:layout-template', title: 'Diseño a medida', text: 'Hecha para tu negocio y tus clientes.' },
        { icon: 'lucide:gauge', title: 'Rápida', text: 'Ligera para que cargue rápido, también en el celular.' },
        { icon: 'lucide:languages', title: 'Bilingüe', text: 'En español e inglés, para todos tus clientes.' },
        { icon: 'lucide:search', title: 'SEO base', text: 'Preparada para que Google la encuentre.' },
        { icon: 'lucide:sparkles', title: 'Legible para la IA', text: 'Los asistentes de IA pueden leerla y entender qué haces.' },
        { icon: 'lucide:key-round', title: 'La web es tuya', text: 'Al terminar, el sitio es tuyo. Nunca te dejamos amarrado.' },
      ],
    },
    despues: {
      label: 'Después de publicar',
      title: 'Tu web no se queda <em>sola</em>',
      lead: 'Tres servicios mes a mes para que siga trabajando por ti. Sin permanencia.',
      cols: [
        {
          id: 'mantenimiento', key: 'maintenance',
          lines: ['Chequeos de disponibilidad', 'Actualizaciones de seguridad', 'Respaldos periódicos', 'Soporte bilingüe'],
          price: desde('es', 'maintenance', true),
        },
        {
          id: 'seo-local', key: 'seoLocal',
          lines: ['Tu ficha de Google al día', 'Datos de contacto consistentes', 'Contenido local', 'Gestión de reseñas'],
          price: desde('es', 'seoLocal', true),
        },
        {
          id: 'seo-ia', key: 'aeoMonitoring',
          lines: ['Cómo te ven los asistentes de IA', 'Cuándo te mencionan', 'Seguimiento mensual', 'Ajustes continuos'],
          price: desde('es', 'aeoMonitoring', true),
        },
      ],
    },
    combina: {
      tag: 'Combina servicios',
      title: '¿Necesitas web, IA y Google a la vez?',
      text: 'Lo juntamos todo en una sola propuesta, con un solo equipo.',
      lead: 'En una propuesta combinada:',
      items: ['Todo el alcance en un solo documento', 'Un solo equipo, en tu idioma', 'El total por escrito antes de empezar'],
      cta: 'Pide una propuesta combinada',
    },
    garantias: {
      title: 'Tres compromisos, siempre',
      items: [
        { icon: 'lucide:clock', title: 'Te contactamos en 1 hora hábil', text: 'Escríbenos en horario laboral y te contestamos dentro de la hora.' },
        { icon: 'lucide:file-pen-line', title: 'Propuesta en 24 horas', text: 'Con alcance y precio claros, sin costo ni compromiso.' },
        { icon: 'lucide:key-round', title: 'La web es tuya', text: 'Al terminar, el sitio es tuyo. Nunca te dejamos amarrado.' },
      ],
    },
    dudas: {
      title: '¿Te quedó alguna duda?',
      text: 'Te ayudamos a elegir por dónde empezar, sin compromiso.',
      cta: 'Pide tu propuesta',
      link: 'Haz el diagnóstico gratis',
      linkHref: '/es/diagnostico',
    },
    cierre: {
      proof: 'Propuesta con alcance y precio claros en menos de 24 horas, sin compromiso.',
      warmTitle: '¿Prefieres preguntar?',
      warmText: 'Marcy, nuestra asistente, te explica los precios a cualquier hora.',
      warmCta: 'Pregúntale a Marcy',
      ask: '¿Qué servicio me conviene y cuánto cuesta?',
    },
  },

  en: {
    eyebrow: 'Pricing',
    lead: 'Every price in plain sight · Proposal in 24 hours · The site is yours',
    modelo: {
      proyecto: {
        title: 'Pay per project',
        text: 'For a new site, store or brand. You pay once and it is yours to keep.',
        lead: 'One payment:',
        cta: 'See pricing',
        items: [
          `Web design, ${desde('en', 'webLanding').toLowerCase()}`,
          `Online store, ${desde('en', 'ecommerceEssential').toLowerCase()}`,
          `Logo, ${desde('en', 'brandingLogo').toLowerCase()}`,
        ],
      },
      mensual: {
        title: 'Monthly',
        text: 'To keep growing after launch: Google, AI and your site, kept current.',
        lead: 'Month to month, no lock-in:',
        cta: 'Get your proposal',
        items: [
          `Local SEO, ${desde('en', 'seoLocal', true).toLowerCase()}`,
          `Maintenance, ${desde('en', 'maintenance', true).toLowerCase()}`,
          `AI monitoring, ${desde('en', 'aeoMonitoring', true).toLowerCase()}`,
        ],
      },
    },
    prosa: { tone1: 'Most agencies hide the', tone2: '<em>recurring</em> price' },
    cuesta: {
      label: 'What it costs',
      tiersLabel: 'Pricing',
      includesLabel: 'What each tier includes',
      note: {
        title: 'Need something different?',
        text: 'Tell us about your business and we will send a proposal built around it within 24 hours.',
      },
    },
    incluido: {
      label: 'In every website',
      title: 'What every site comes with, <em>as standard</em>',
      lead: 'Whatever the tier, these six things always come with it.',
      items: [
        { icon: 'lucide:layout-template', title: 'Custom design', text: 'Made for your business and your customers.' },
        { icon: 'lucide:gauge', title: 'Fast', text: 'Lightweight so it loads quickly, on phones too.' },
        { icon: 'lucide:languages', title: 'Bilingual', text: 'In English and Spanish, for every customer you serve.' },
        { icon: 'lucide:search', title: 'Baseline SEO', text: 'Set up so Google can find it.' },
        { icon: 'lucide:sparkles', title: 'Readable by AI', text: 'AI assistants can read it and understand what you do.' },
        { icon: 'lucide:key-round', title: 'The site is yours', text: 'Once it is done, you own it. We never lock you in.' },
      ],
    },
    despues: {
      label: 'After launch',
      title: 'Your site is never left <em>on its own</em>',
      lead: 'Three monthly services that keep it working for you. No lock-in.',
      cols: [
        {
          id: 'mantenimiento', key: 'maintenance',
          lines: ['Uptime checks', 'Security updates', 'Regular backups', 'Bilingual support'],
          price: desde('en', 'maintenance', true),
        },
        {
          id: 'seo-local', key: 'seoLocal',
          lines: ['Your Google profile kept current', 'Consistent contact details', 'Local content', 'Review management'],
          price: desde('en', 'seoLocal', true),
        },
        {
          id: 'seo-ia', key: 'aeoMonitoring',
          lines: ['How AI assistants see you', 'When they mention you', 'Monthly tracking', 'Ongoing adjustments'],
          price: desde('en', 'aeoMonitoring', true),
        },
      ],
    },
    combina: {
      tag: 'Bundle services',
      title: 'Need a site, AI and Google all at once?',
      text: 'We put it all in one proposal, handled by one team.',
      lead: 'In a bundled proposal:',
      items: ['The full scope in a single document', 'One team, in your language', 'The total in writing before we start'],
      cta: 'Get a bundled proposal',
    },
    garantias: {
      title: 'Three promises, every time',
      items: [
        { icon: 'lucide:clock', title: 'We reply within 1 business hour', text: 'Message us during business hours and hear back within the hour.' },
        { icon: 'lucide:file-pen-line', title: 'Proposal in 24 hours', text: 'Clear scope and price, no cost and no commitment.' },
        { icon: 'lucide:key-round', title: 'The site is yours', text: 'Once it is done, you own it. We never lock you in.' },
      ],
    },
    dudas: {
      title: 'Still have questions?',
      text: 'We will help you figure out where to start, with no strings attached.',
      cta: 'Get your proposal',
      link: 'Take the free checkup',
      linkHref: '/en/checkup',
    },
    cierre: {
      proof: 'A proposal with clear scope and price in under 24 hours, no commitment.',
      warmTitle: 'Rather just ask?',
      warmText: 'Marcy, our assistant, walks you through pricing at any hour.',
      warmCta: 'Ask Marcy',
      ask: 'Which service fits my business, and what does it cost?',
    },
  },
};

/** Icono-objeto de cada tarjeta de modelo. */
export const MODELO_ICONS: [IconoId, IconoId] = ['diseno-web', 'mantenimiento'];
