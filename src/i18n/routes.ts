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
  ['/es/houston/diseno-web', '/en/houston/web-design'],
  ['/es/houston/seo-local', '/en/houston/local-seo'],
  ['/es/houston/ia-conversacional', '/en/houston/conversational-ai'],
  ['/es/houston/ecommerce', '/en/houston/ecommerce'],
  ['/es/houston/branding', '/en/houston/branding'],
  ['/es/houston/seo-para-ia', '/en/houston/ai-seo'],
  ['/es/houston/abogados-inmigracion', '/en/houston/immigration-lawyers'],
  ['/es/houston/bienes-raices', '/en/houston/real-estate'],
  ['/es/houston/restaurantes', '/en/houston/restaurants'],
  ['/es/houston/contratistas', '/en/houston/contractors'],
  ['/es/houston/talleres-mecanicos', '/en/houston/auto-repair'],
  ['/es/houston/salon-belleza', '/en/houston/beauty-salons'],
  ['/es/houston/clinicas-dentales', '/en/houston/dental-clinics'],
  ['/es/houston/diseno-web-bilingue', '/en/houston/bilingual-web-design'],
  ['/es/houston/katy', '/en/houston/katy'],
  ['/es/houston/sugar-land', '/en/houston/sugar-land'],
  ['/es/miami/diseno-web', '/en/miami/web-design'],
  ['/es/miami/ia-conversacional', '/en/miami/conversational-ai'],
  ['/es/miami/seo-local', '/en/miami/local-seo'],
  ['/es/miami/ecommerce', '/en/miami/ecommerce'],
  ['/es/miami/doral', '/en/miami/doral'],
  ['/es/miami/hialeah', '/en/miami/hialeah'],
  ['/es/precios/cuanto-cuesta-una-pagina-web-houston', '/en/pricing/website-cost-houston'],
  ['/es/precios/cuanto-cuesta-un-chatbot', '/en/pricing/chatbot-cost'],
  ['/es/precios/cuanto-cuesta-seo-local-houston', '/en/pricing/local-seo-cost-houston'],
  ['/es/blog', '/en/blog'],
  ['/es/diagnostico', '/en/checkup'],
  ['/es/herramientas', '/en/tools'],
  ['/privacidad', '/en/privacy'],
  ['/terminos', '/en/terms'],
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

/** Destino del toggle de idioma: el espejo exacto si existe; si no, la home del otro idioma. */
export function toggleHref(pathname: string, lang: 'es' | 'en'): string {
  return mirrorPath(pathname, lang) ?? (lang === 'es' ? '/en/' : '/es/');
}
