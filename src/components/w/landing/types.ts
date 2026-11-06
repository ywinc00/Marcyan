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

/**
 * Fondos temáticos por landing (design/rediseno-workos-v2.md §1.3 y P12).
 * Un motivo por página que cuenta su tema; vive en el hero y se funde a la noche.
 * F11 (portafolio) no existe: el portafolio se queda en el espacio (§5-7).
 */
export type TemaFondo =
  | 'reticula'      // F01 diseño web
  | 'escaparate'    // F02 tienda en línea
  | 'radar'         // F03 SEO local
  | 'hilos'         // F04 IA conversacional
  | 'placa'         // F05 IA para pymes
  | 'construccion'  // F06 branding
  | 'plano'         // F07 sectores
  | 'calles'        // F08 barrios
  | 'tunel'         // F09 SEO para IA
  | 'escaneo'       // F12 diagnóstico y herramientas
  | 'rombos'        // F30 barrios (vuelta 3: malla de rombos sola)
  | 'sector';       // F20 sectores (v3): escena propia por página (atardecer, obra, mesa)
// F10 (franjas que parpadean, servicios y precios) y F13 (hoja pautada, blog) RETIRADOS en la
// vuelta 3 por decisión del dueño (E-57): esas páginas vuelven al fondo de la v1. No se reponen.

/** Código del plan (F01…F13, sin F11): el plan G escribe `fondo: 'F01'`; se aceptan los dos. */
export type CodigoFondo =
  | 'F01' | 'F02' | 'F03' | 'F04' | 'F05' | 'F06' | 'F07' | 'F08' | 'F09' | 'F12' | 'F20' | 'F30';

const POR_CODIGO: Record<CodigoFondo, TemaFondo> = {
  F01: 'reticula', F02: 'escaparate', F03: 'radar', F04: 'hilos', F05: 'placa', F06: 'construccion',
  F07: 'plano', F08: 'calles', F09: 'tunel', F12: 'escaneo', F20: 'sector', F30: 'rombos',
};
/** Normaliza un código del plan ('F03') o un nombre ('radar') al nombre del tema. */
export function temaDeFondo(t: TemaFondo | CodigoFondo): TemaFondo {
  return (POR_CODIGO as Record<string, TemaFondo>)[t] ?? (t as TemaFondo);
}

/** Barrios con vías reales en public/geo/*-mapa.json (F08). Sin barrio, F08 es abstracto y declarado. */
export type BarrioFondo = 'katy' | 'sugar-land' | 'doral' | 'hialeah';
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
  /**
   * Fondo temático (P12). Si existe, WLanding monta `<Fondo tema>` en el hero y NO monta
   * SpaceBackdrop (una atmósfera por página). Si falta, la página queda igual que hoy.
   */
  fondo?: TemaFondo | CodigoFondo;
  /**
   * Opciones del fondo: eco quieto al 40 % en el capítulo de contraste, lado del texto del
   * hero, barrio de F08 (solo el eco dibuja sus vías reales) y `vars`, ajustes de posición
   * por página en variables --wf-* (p. ej. "--wf-obj: 600px; --wf-sel-1: 5 / 9"), que
   * WLanding aplica al fondo del hero y al eco. Lista de variables en fondos/Fondo.astro.
   */
  fondoOpciones?: (ctx: LandingCtx) => {
    eco?: boolean;
    texto?: 'centro' | 'izquierda' | 'ambos';
    barrio?: BarrioFondo;
    vars?: string;
  };
}
