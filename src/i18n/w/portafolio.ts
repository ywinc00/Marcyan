// ─────────────────────────────────────────────────────────────
// Copy NUEVO del portafolio v3 (design/rediseno-workos.md §4.5, ola 3).
// Solo textos libres: cola del H1, rótulos de la ficha lateral, títulos de los
// actos, tarjeta lateral, cierre. Lo congelado (H1, meta, path, breadcrumb,
// answer, faq) y los datos de cada proyecto (did, result, tags, cat, servicio)
// se pintan tal cual desde src/i18n/portfolio(.en).ts, que no se toca.
// Reglas: sin guiones como conector, nada inventado (cero cifras o reseñas
// nuevas), nombres de clientes con translate="no", precios solo de pricing.ts.
// ─────────────────────────────────────────────────────────────

export type PortLang = 'es' | 'en';

export interface PortCopy {
  /** Cola del H1 (.w-h1__tail), mismo tono que el H1 (§2.14). */
  tail: string;
  /** Texto accesible del enlace de la captura del hero (va a #trr). */
  heroShot: (name: string) => string;
  side: { label: string; sector: string; city: string; project: string; service: string };
  acts: { did: string; result: string };
  /** Pie de la captura móvil del primer caso (el de escritorio ya está en el hero). */
  phoneAlt: string;
  tarjeta: { title1: string; title2: (price: string) => string; text: string; cta: string };
  historia: { title: string; sub: string };
  cierre: { proof: string; warmTitle: string; warmText: string; warmCta: string };
}

export const portCopy: Record<PortLang, PortCopy> = {
  es: {
    tail: 'Cuatro webs que trabajan.',
    heroShot: (name) => `Ver el caso de ${name}`,
    side: { label: 'Ficha del proyecto', sector: 'Sector', city: 'Ciudad', project: 'Proyecto', service: 'Servicio Marcyan' },
    acts: { did: 'Lo que hicimos', result: 'Cómo quedó' },
    phoneAlt: 'vista móvil',
    tarjeta: {
      title1: 'Una web como esta,',
      title2: (price) => `desde ${price}.`,
      text: 'Diseñada a medida para tu negocio, en español e inglés, y tuya desde el primer día.',
      cta: 'Pedir propuesta',
    },
    historia: {
      title: '¿Cuál es la historia de tu negocio?',
      sub: 'Cuéntanos qué necesitas y te enviamos una propuesta en 24 horas.',
    },
    cierre: {
      proof: 'Cuatro negocios de Houston y Orlando ya tienen la suya en uso.',
      warmTitle: '¿Ya tienes web?',
      warmText: 'Revisa gratis dónde está perdiendo clientes tu negocio.',
      warmCta: 'Hacer el diagnóstico',
    },
  },
  en: {
    tail: 'Four websites earning their keep.',
    heroShot: (name) => `See the ${name} case`,
    side: { label: 'Project facts', sector: 'Industry', city: 'City', project: 'Project', service: 'Marcyan service' },
    acts: { did: 'What we did', result: 'How it turned out' },
    phoneAlt: 'mobile view',
    tarjeta: {
      title1: 'A site like this,',
      title2: (price) => `from ${price}.`,
      text: 'Custom designed for your business, in English and Spanish, and yours from day one.',
      cta: 'Get a proposal',
    },
    historia: {
      title: 'What’s your business story?',
      sub: 'Tell us what you need and get a proposal within 24 hours.',
    },
    cierre: {
      proof: 'Four businesses in Houston and Orlando already have theirs live.',
      warmTitle: 'Already have a site?',
      warmText: 'Check for free where your business is losing customers.',
      warmCta: 'Take the checkup',
    },
  },
};
