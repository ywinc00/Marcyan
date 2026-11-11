// ─────────────────────────────────────────────────────────────
// Registro de la plantilla de landings v3 (design/rediseno-workos.md §3.7).
// Lo escribe la tarea 0C y NADIE más lo edita.
//
// · KIND_BY_PATH: mapa EXPLÍCITO de las 19 rutas que usan ClusterLanding.
//   No se copia la tabla de regex de `deriveDefaultService` (mandaba bienes
//   raíces a diseño web, juntaba las dos IA y dejaba sin tipo a barrios y
//   sectores).
// · Tipo listo = existe `kinds/<kind>.ts` (lo crea su tarea de la ola 1/2;
//   ninguna tarea comparte archivo y ninguna toca este).
// · Cerrado por defecto: ruta fuera del mapa o tipo sin archivo = la landing
//   sigue con el cuerpo de siempre de ClusterLanding.
//
// ACTIVACIÓN POR PÁGINA (desviación medida del plan, ola 0C):
// Astro reúne el CSS de cada página recorriendo su grafo de módulos, incluidos
// los import() diferidos (node_modules/astro/dist/core/build/graph.js:
// importers + dynamicImporters), sin mirar qué se pinta. Si ClusterLanding
// importara WLanding (o los kinds), el CSS de w.css y de TODOS los componentes de
// TODOS los tipos se incrustaría (inlineStylesheets 'always') en las 19 landings,
// migradas o no: medido en 0C, +7,5 KB por landing solo con w.css. Por eso:
//   1. Aquí la existencia de los kinds se mira con `?raw` (texto, sin grafo).
//   2. La tarea de cada tipo cambia SUS páginas (archivos finos, exclusivos) a:
//        import WLanding from '<…>/components/w/landing/WLanding.astro';
//        import spec from '<…>/components/w/landing/kinds/<kind>';
//        <WLanding cluster={clusters['houston/diseno-web']} spec={spec} />
//      (EN: `lang="en"` y `clustersEn`). Así cada página carga solo su tipo.
//   3. ClusterLanding corta el build si una ruta con tipo listo sigue llegando a
//      él (página olvidada), y WLanding comprueba que el tipo de la página coincide
//      con KIND_BY_PATH.
// ─────────────────────────────────────────────────────────────
import type { LandingKind } from './types';

export const KIND_BY_PATH: Readonly<Record<string, LandingKind>> = {
  // Diseño web (piloto, ola 1). Bienes raíces NO es `web`: es `sector`.
  '/es/houston/diseno-web': 'web',
  '/es/miami/diseno-web': 'web',
  // Tienda en línea
  '/es/houston/ecommerce': 'ecommerce',
  '/es/miami/ecommerce': 'ecommerce',
  // SEO local
  '/es/houston/seo-local': 'seo-local',
  '/es/miami/seo-local': 'seo-local',
  // IA conversacional por ciudad
  '/es/houston/ia-conversacional': 'ia-chat',
  '/es/miami/ia-conversacional': 'ia-chat',
  // IA para pymes (ES ↔ EN)
  '/es/ia-para-pymes': 'ia-pymes',
  '/en/ai-for-small-business': 'ia-pymes',
  // Branding
  '/es/houston/branding': 'branding',
  // Sectores
  '/es/houston/contratistas': 'sector',
  '/es/houston/bienes-raices': 'sector',
  '/en/houston/contractors': 'sector',
  '/en/houston/restaurants': 'sector',
  // Barrios
  '/es/houston/katy': 'barrio',
  '/es/houston/sugar-land': 'barrio',
  '/es/miami/doral': 'barrio',
  '/es/miami/hialeah': 'barrio',
};

// Tipos listos = archivos presentes en ./kinds/ (vacío hasta la ola 1). Con `?raw`
// el glob devuelve el texto del archivo: saber que existe NO mete su código ni su
// CSS en el grafo de las páginas que importan este registro.
const present = import.meta.glob('./kinds/*.ts', { query: '?raw', import: 'default' });

const fileOf = (kind: LandingKind) => `./kinds/${kind}.ts`;

/** Tipo de la ruta (esté listo o no). */
export function kindOf(path: string): LandingKind | undefined {
  return KIND_BY_PATH[path];
}

/** ¿Existe kinds/<kind>.ts? */
export function isKindReady(kind: LandingKind): boolean {
  return fileOf(kind) in present;
}

/** Tipo de la ruta SOLO si su archivo existe; si no, undefined (cuerpo de siempre). */
export function readyKindFor(path: string): LandingKind | undefined {
  const kind = KIND_BY_PATH[path];
  return kind && isKindReady(kind) ? kind : undefined;
}
