// ─────────────────────────────────────────────────────────────
// Datos de los detalles permitidos de la portada (design/rediseno-workos.md §4.1, ola 4).
// ADITIVO: content.ts no se toca (textos, precios y enlaces de las secciones salen de
// allí tal cual). Aquí solo vive lo que el rediseño añade:
//   · el texto del botón de Proyectos en móvil una vez desplegado (M5 de la revisión 1).
//   · qué icono-objeto (§2.8) representa cada servicio de la sección Servicios, por su
//     número `n` (idéntico en ES y EN).
// Las señales del mini escáner del diagnóstico son las del propio objeto
// (w/objetos/Escaner.astro, cotejadas con lib/diagnostic-checks.mjs): no se duplican.
// ─────────────────────────────────────────────────────────────
import type { IconoId } from '../../components/w/objects/registry';
import type { MarcaId } from '../../components/w/marcas/datos';

export const servicioIcono: Record<string, IconoId> = {
  '01': 'diseno-web',
  '02': 'ia-conversacional',
  '03': 'seo-ia',
  '04': 'ecommerce',
  '05': 'seo-local',
  '06': 'branding',
  '07': 'mantenimiento',
};

/** Proyectos (móvil): el botón cambia de texto al desplegar. El de plegado sale de content.ts. */
export const proyectosMenos = { es: 'Ver menos', en: 'Show less' } as const;

// ─────────────────────────────────────────────────────────────
// Vuelta 2 (design/rediseno-workos-v2.md §3 G01). Copy NUEVO de la portada, a validar por el
// dueño (§5-11). Kicker, H2, bajada y capacidades de #ia y los pasos de #proceso siguen en
// content.ts, verbatim.
// ─────────────────────────────────────────────────────────────

type L = 'es' | 'en';

/** #ia · tramo (b): cómo está montada Marcy (ChipIA portada + PildorasMarcas). */
export const iaMontada: Record<L, {
  kicker: string; titulo: string; bajada: string;
  filas: { etiqueta: string; ids: MarcaId[] }[];
}> = {
  es: {
    kicker: 'Así está montada',
    titulo: 'Un cerebro, todos tus canales',
    bajada: 'Marcy piensa con Claude y responde donde te escriben tus clientes.',
    // §5-1 (por defecto): solo Claude como modelo; sin fila "Montada sobre".
    // §5-14: canales que el sitio ya nombra como canales donde Marcy contesta: WhatsApp, Instagram y
    // Messenger (copy congelado de IA para pymes: "Marcy contesta en tu web, WhatsApp, Instagram,
    // Messenger y Google"; revisión 1 de G01: con solo WhatsApp el titular "todos tus canales"
    // sonaba hueco). "Tu web" no es una marca y PildorasMarcas solo admite MarcaId: pendiente [SISTEMA].
    // "Te encuentran en" = las tres del paso 04 del proceso (copy congelado).
    filas: [
      { etiqueta: 'Piensa con', ids: ['claude'] },
      { etiqueta: 'Contesta en', ids: ['whatsapp', 'instagram', 'messenger'] },
      { etiqueta: 'Te encuentran en', ids: ['chatgpt-texto', 'googlegemini', 'meta'] },
    ],
  },
  en: {
    kicker: "How it's built",
    titulo: 'One brain, every channel',
    bajada: 'Marcy thinks with Claude and answers wherever your customers reach you.',
    filas: [
      { etiqueta: 'Thinks with', ids: ['claude'] },
      { etiqueta: 'Answers on', ids: ['whatsapp', 'instagram', 'messenger'] },
      { etiqueta: 'Found on', ids: ['chatgpt-texto', 'googlegemini', 'meta'] },
    ],
  },
};

/** Nombres visibles en las píldoras cuando la portada los dice de otra forma. */
export const iaRotulos: Partial<Record<MarcaId, string>> = { googlegemini: 'Gemini', meta: 'Meta AI' };
