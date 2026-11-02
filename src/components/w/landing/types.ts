// ─────────────────────────────────────────────────────────────
// Tipos de la plantilla de landings v3 (design/rediseno-workos.md §3.7, ola 0C).
// Cada tipo de landing vive en `kinds/<kind>.ts` (un archivo por tarea de la
// ola 1/2) y exporta por defecto un `KindSpec`. La página de cada ruta lo importa
// y se lo pasa a WLanding (activación por página, ver registry.ts), que lo pinta
// en orden.
// ─────────────────────────────────────────────────────────────
import type { ClusterPage } from '../../../i18n/clusters';

/** Los 8 tipos de landing de cluster (§3.7). */
export type LandingKind =
  | 'web'
  | 'ecommerce'
  | 'seo-local'
  | 'ia-chat'
  | 'ia-pymes'
  | 'branding'
  | 'sector'
  | 'barrio';

export type LandingLang = 'es' | 'en';
export type LandingTone = 'gold' | 'teal';

/** Lo que cada hero y cada sección recibe para construir sus props. */
export interface LandingCtx {
  cluster: ClusterPage;
  lang: LandingLang;
  kind: LandingKind;
  /** Ciudad de la landing (de `service.areaCity`); undefined si no es Houston ni Miami. */
  city?: 'houston' | 'miami';
  /** Tono de la página (acento único, E-14). */
  tone: LandingTone;
}

/** Componente Astro (factoría que devuelve Astro al importar un .astro). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AstroComponent = (props: any) => any;

export type PropsFn = (ctx: LandingCtx) => Record<string, unknown>;

export interface SectionSpec {
  /** Componente de la sección (de src/components/w/ o w/sections/<kind>/). */
  component: AstroComponent;
  /** Props del componente a partir del contexto. */
  props?: PropsFn;
  /** id de la celda envolvente (anclas como `proyectos`, `precios`). */
  id?: string;
  /**
   * Envoltura de la sección:
   * · 'cell'  (por defecto) `.w-cell` con línea superior, padding vertical y `.w-container` a 1200.
   * · 'bleed' `.w-cell` sin contenedor (el componente gestiona su ancho, p. ej. a sangre).
   * · 'none'  sin envoltura (el componente trae su propia sección completa).
   */
  wrap?: 'cell' | 'bleed' | 'none';
  /** Capítulo de contraste de la página (§2.4): uno por página y excluyentes. */
  contrast?: 'contrast' | 'dawn';
  /** Revelado de sección al entrar (F-04). Por defecto true; false si el componente ya lo pone. */
  reveal?: boolean;
  /** Etiqueta del elemento envolvente (por defecto `section`; `div` si el componente ya es una sección). */
  as?: 'section' | 'div';
  /** Si devuelve false, la sección no se pinta en esa ruta (p. ej. TiraLogos en Miami). */
  when?: (ctx: LandingCtx) => boolean;
}

export interface KindSpec {
  /** Nombre del tipo; debe coincidir con KIND_BY_PATH de la ruta (WLanding lo comprueba). */
  kind: LandingKind;
  /**
   * Hero del tipo. Recibe sus props de `hero(ctx)` y las migas por el slot
   * `crumbs` (Breadcrumb, que emite el BreadcrumbList): debe pintarlas.
   * Es responsable de su propia sección (`.w-hero`, que reserva la nav).
   */
  Hero: AstroComponent;
  /** Props del hero a partir del contexto. */
  hero?: PropsFn;
  /** Secciones en orden (sin el formulario de contacto: lo pone WLanding). */
  sections: SectionSpec[];
  /** Tono de la página; si falta, el de `cluster.hero.tone`. */
  tone?: LandingTone | ((ctx: Omit<LandingCtx, 'tone'>) => LandingTone);
}
