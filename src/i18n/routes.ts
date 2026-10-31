// ─────────────────────────────────────────────────────────────
// Mapa ÚNICO es↔en de rutas con espejo publicado. Fuente de verdad para:
//   · el toggle de idioma de SiteNav (enlace exacto al espejo, no a la home),
//   · el `hasEn` del Layout (emitir hreflang="en" solo donde hay espejo real).
// Rutas normalizadas SIN barra final. La home es '/es' ↔ '/en'. Al publicar un
// nuevo espejo EN, se añade su par aquí y el hreflang/toggle se activa solo.
// ─────────────────────────────────────────────────────────────
export const ROUTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['/es', '/en'],
  ['/es/servicios', '/en/services'],
  ['/es/precios', '/en/pricing'],
  ['/es/ciudades', '/en/cities'],
  ['/es/portafolio', '/en/portfolio'],
  ['/es/sobre-nosotros', '/en/about'],
  ['/es/ia-para-pymes', '/en/ai-for-small-business'],
  ['/es/houston', '/en/houston'],
  ['/es/miami', '/en/miami'],
  ['/es/houston/contratistas', '/en/houston/contractors'],
  ['/es/blog', '/en/blog'],
  ['/es/diagnostico', '/en/checkup'],
  ['/es/herramientas', '/en/tools'],
  ['/privacidad', '/en/privacy'],
  ['/terminos', '/en/terms'],
  ['/formulario', '/en/project-brief'],
];

const norm = (p: string) => {
  const s = (p || '/').replace(/\/+$/, '');
  return s === '' ? '/' : s;
};
const ES2EN = new Map(ROUTE_PAIRS.map(([e, n]) => [norm(e), n]));
const EN2ES = new Map(ROUTE_PAIRS.map(([e, n]) => [norm(n), e]));

/** URL del espejo en el otro idioma, o null si no hay espejo publicado. */
export function mirrorPath(pathname: string, lang: 'es' | 'en'): string | null {
  const key = norm(pathname);
  return lang === 'es' ? (ES2EN.get(key) ?? null) : (EN2ES.get(key) ?? null);
}

/** true si la ruta actual tiene espejo publicado en el otro idioma. */
export function hasMirror(pathname: string): boolean {
  const key = norm(pathname);
  return ES2EN.has(key) || EN2ES.has(key);
}

// Hubs de ciudad: una página de ciudad sin espejo exacto lleva al hub de su ciudad
// en el otro idioma (p. ej. /es/houston/katy → /en/houston), no a la portada.
const CITY_HUBS = ['houston', 'miami'] as const;

/** Destino del toggle de idioma: el espejo exacto si existe; si no, el hub de su
 *  ciudad en el otro idioma; si no, la home del otro idioma. Solo el botón: el
 *  hreflang sigue usando únicamente el espejo exacto (hasMirror). */
export function toggleHref(pathname: string, lang: 'es' | 'en'): string {
  const exact = mirrorPath(pathname, lang);
  if (exact) return exact;
  const key = norm(pathname);
  for (const city of CITY_HUBS) {
    const hub = `/${lang}/${city}`;
    if (key.startsWith(`${hub}/`)) {
      const other = mirrorPath(hub, lang);
      if (other) return other;
    }
  }
  return lang === 'es' ? '/en' : '/es';
}
