// ─────────────────────────────────────────────────────────────
// Copy NUEVO del hub de servicios v3 (design/rediseno-workos.md §4.3, ola 3).
// Solo textos libres: eyebrow, bajada, rótulos de los interruptores, títulos de
// sección, celdas del capítulo, perfiles y cierre. Lo congelado (H1, answer, faq,
// meta, breadcrumb, itemList) se pinta tal cual desde servicios.ts / servicios.en.ts,
// que no se tocan. Precios solo de pricing.ts / pricing.en.ts (no hay ninguno aquí).
// Reglas de copy: sin guiones como conector, "dominamos" la IA, nada inventado; lo de
// ejemplo va dentro de objetos rotulados "Ejemplo". El EN se escribe nativo (R4).
// ─────────────────────────────────────────────────────────────
import type { IconoId } from '../../components/w/objects/registry';

export type SrvLang = 'es' | 'en';

interface Link { label: string; href: string }

export interface ServiciosCopy {
  eyebrow: string;
  tail?: string;
  lead: string;
  /** Rótulo corto de cada producto en la pila de interruptores (§4.3), por id de pricing. */
  switches: Record<IconoId, string>;
  etapas: {
    label: string;
    title: string;
    lead: string;
    cols: [
      { title: string; items: { label: string; href?: string }[] },
      { title: string; items: { label: string; href?: string }[] },
      { title: string; items: { label: string; href?: string }[] },
    ];
  };
  catalogo: { label: string; title: string };
  capitulo: {
    tone1: string; tone2: string; sub: string;
    /** Una celda por servicio, en el orden del bento (§4.3-4). */
    cells: { id: IconoId; icon: string; label: string; titleHtml: string; text: string; tray?: boolean }[];
  };
  perfil: {
    label: string;
    title: string;
    cards: [
      { title: string; text: string; cta: string; href: string; track?: string },
      { title: string; text: string; cta: string; href: string; track?: string },
    ];
    wide: { icon: string; title: string; text: string; cta: string; href: string };
  };
  razones: { label: string; title: string };
  cierre: { proof: string; warmTitle: string; warmText: string; warmCta: string; warmHref: string };
}

export const serviciosCopy: Record<SrvLang, ServiciosCopy> = {
  es: {
    eyebrow: 'Servicios',
    lead: 'Siete servicios para que te encuentren, te elijan y te escriban, en Houston y Miami.',
    switches: {
      'diseno-web': 'Web rápida',
      'ia-conversacional': 'Marcy 24/7',
      'seo-ia': 'Que la IA te nombre',
      ecommerce: 'Tienda',
      'seo-local': 'SEO local',
      branding: 'Marca',
      mantenimiento: 'Mantenimiento',
    },
    etapas: {
      label: 'Por etapa',
      title: '<span class="w-tone">Tres etapas.</span> Un servicio para cada una.',
      lead: 'Empieza por la etapa donde hoy se te escapan los clientes y suma el resto cuando quieras.',
      cols: [
        { title: 'Que te encuentren', items: [
          { label: 'SEO local', href: '/es/houston/seo-local' },
          { label: 'SEO para IA', href: '/es/houston/seo-para-ia' },
        ] },
        { title: 'Que te elijan', items: [
          { label: 'Diseño web', href: '/es/houston/diseno-web' },
          { label: 'Branding', href: '/es/houston/branding' },
        ] },
        { title: 'Que te escriban y compren', items: [
          { label: 'IA conversacional', href: '/es/ia-para-pymes' },
          { label: 'Tienda en línea', href: '/es/houston/ecommerce' },
          { label: 'Mantenimiento', href: '#mantenimiento' },
        ] },
      ],
    },
    catalogo: {
      label: 'Catálogo',
      title: '<span class="w-tone">El catálogo.</span> Cada servicio con su punto de partida.'
    },
    capitulo: {
      tone1: 'Siete servicios.',
      tone2: 'Un mismo cliente: tú.',
      sub: 'Cada uno resuelve una parte del camino, desde que te buscan hasta que te pagan.',
      cells: [
        { id: 'diseno-web', icon: 'lucide:layout-template', label: 'Diseño web', titleHtml: 'Una web que se entiende en el celular', text: 'A medida, rápida y en español e inglés, con un botón claro para llamarte o escribirte.' },
        { id: 'seo-local', icon: 'lucide:map-pin', label: 'SEO local', titleHtml: 'Que te encuentren en el mapa de tu zona', text: 'Ponemos a punto tu ficha y tu presencia local para las búsquedas cerca de ti.' },
        { id: 'ia-conversacional', icon: 'lucide:messages-square', label: 'IA conversacional', titleHtml: 'Contesta aunque estés cerrado', text: 'Marcy responde, agenda y guarda el contacto a cualquier hora, en español.' },
        { id: 'seo-ia', icon: 'lucide:sparkles', label: 'SEO para IA', titleHtml: 'Que la IA te nombre cuando preguntan', text: 'Preparamos tu negocio para que ChatGPT, Gemini y Meta AI puedan leerte y recomendarte.', tray: false },
        { id: 'ecommerce', icon: 'lucide:shopping-bag', label: 'Tienda en línea', titleHtml: 'Pedidos que llegan ya pagados', text: 'Catálogo, carrito y pagos en línea para vender sin depender del teléfono.' },
        { id: 'branding', icon: 'lucide:palette', label: 'Branding', titleHtml: 'Una marca que se reconoce', text: 'Logo, colores y tipografía pensados para tu negocio, listos para la web y la imprenta.' },
        { id: 'mantenimiento', icon: 'lucide:wrench', label: 'Mantenimiento', titleHtml: 'Tu web sana, sin que tengas que pensar en ella', text: 'Revisamos que siga en línea, su seguridad y sus copias de seguridad, con soporte bilingüe mes a mes.' },
      ],
    },
    perfil: {
      label: 'Empieza por tu caso',
      title: '<span class="w-tone">¿Por dónde empiezo?</span> Según tu caso.',
      cards: [
        { title: 'Abro mi negocio', text: 'Empieza por una web clara que te presente y te traiga los primeros contactos.', cta: 'Ver diseño web', href: '/es/houston/diseno-web' },
        { title: 'Ya tengo web pero no me llaman', text: 'El diagnóstico gratis te dice qué falla y por dónde empezar, en 2 minutos.', cta: 'Hacer el diagnóstico', href: '/es/diagnostico', track: 'tool_cta_clicked' },
      ],
      wide: { icon: 'lucide:wrench', title: 'Ya soy cliente', text: 'Mantenimiento mes a mes para que tu web siga rápida, segura y al día.', cta: 'Ver mantenimiento', href: '#mantenimiento' },
    },
    razones: { label: 'Por qué Marcyan', title: '<span class="w-tone">Cuatro razones.</span> Lo que nos hace distintos.' },
    cierre: {
      proof: 'Texas Rush Remove ya posiciona en su zona de Houston con su sitio nuevo.',
      warmTitle: '¿Aún no sabes qué necesitas?',
      warmText: 'Revisa gratis si tu negocio está perdiendo clientes online.',
      warmCta: 'Hacer el diagnóstico',
      warmHref: '/es/diagnostico',
    },
  },
  en: {
    eyebrow: 'Services',
    lead: 'Seven services that get you found, chosen and contacted, in Houston and Miami.',
    switches: {
      'diseno-web': 'Fast website',
      'ia-conversacional': 'Marcy 24/7',
      'seo-ia': 'Get named by AI',
      ecommerce: 'Online store',
      'seo-local': 'Local SEO',
      branding: 'Brand',
      mantenimiento: 'Maintenance',
    },
    etapas: {
      label: 'By stage',
      title: '<span class="w-tone">Three stages.</span> A service for each one.',
      lead: 'Start where customers are slipping away today, and add the rest whenever you want.',
      cols: [
        { title: 'Get found', items: [
          { label: 'Local SEO', href: '/en/houston#servicios' },
          { label: 'AI SEO', href: '/en/checkup' },
        ] },
        { title: 'Get chosen', items: [
          { label: 'Web design', href: '/en/houston#servicios' },
          { label: 'Branding', href: '/en/houston#servicios' },
        ] },
        { title: 'Get messages and sales', items: [
          { label: 'Conversational AI', href: '/en/ai-for-small-business' },
          { label: 'Online store', href: '/en/houston#servicios' },
          { label: 'Maintenance', href: '#mantenimiento' },
        ] },
      ],
    },
    catalogo: {
      label: 'Catalog',
      title: '<span class="w-tone">The catalog.</span> Every service and where it starts.'
    },
    capitulo: {
      tone1: 'Seven services.',
      tone2: 'One client: you.',
      sub: 'Each one handles a stretch of the road, from the moment people search to the moment they pay.',
      cells: [
        { id: 'diseno-web', icon: 'lucide:layout-template', label: 'Web design', titleHtml: 'A site that makes sense on a phone', text: 'Custom, fast and in English and Spanish, with a clear button to call or message you.' },
        { id: 'seo-local', icon: 'lucide:map-pin', label: 'Local SEO', titleHtml: 'Show up on the map in your area', text: 'We tune up your listing and your local presence for searches near you.' },
        { id: 'ia-conversacional', icon: 'lucide:messages-square', label: 'Conversational AI', titleHtml: 'Answers even when you are closed', text: 'Marcy replies, books and saves the contact at any hour of the day.' },
        { id: 'seo-ia', icon: 'lucide:sparkles', label: 'AI SEO', titleHtml: 'Get named when people ask AI', text: 'We get your business ready so ChatGPT, Gemini and Meta AI can read you and recommend you.', tray: false },
        { id: 'ecommerce', icon: 'lucide:shopping-bag', label: 'Online store', titleHtml: 'Orders that arrive already paid', text: 'Catalog, cart and online payments, so sales do not depend on the phone.' },
        { id: 'branding', icon: 'lucide:palette', label: 'Branding', titleHtml: 'A brand people recognize', text: 'Logo, colors and typography made for your business, ready for the web and for print.' },
        { id: 'mantenimiento', icon: 'lucide:wrench', label: 'Maintenance', titleHtml: 'A healthy site you never have to think about', text: 'We keep an eye on uptime, security and backups, with bilingual support month to month.' },
      ],
    },
    perfil: {
      label: 'Start with your situation',
      title: '<span class="w-tone">Where do I start?</span> It depends on you.',
      cards: [
        { title: 'I am opening my business', text: 'Start with a clear website that introduces you and brings in your first leads.', cta: 'See web design', href: '/en/houston#servicios' },
        { title: 'I have a site, but nobody calls', text: 'The free checkup shows what is failing and where to start, in 2 minutes.', cta: 'Take the checkup', href: '/en/checkup', track: 'tool_cta_clicked' },
      ],
      wide: { icon: 'lucide:wrench', title: 'I am already a client', text: 'Monthly maintenance keeps your site fast, secure and up to date.', cta: 'See maintenance', href: '#mantenimiento' },
    },
    razones: { label: 'Why Marcyan', title: '<span class="w-tone">Four reasons.</span> What makes us different.' },
    cierre: {
      proof: 'Texas Rush Remove already ranks in its Houston area with its new site.',
      warmTitle: 'Not sure what you need yet?',
      warmText: 'Check for free whether your business is losing customers online.',
      warmCta: 'Take the checkup',
      warmHref: '/en/checkup',
    },
  },
};
