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
