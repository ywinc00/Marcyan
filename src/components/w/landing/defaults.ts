// ─────────────────────────────────────────────────────────────
// Prellenado del formulario de contacto (#contacto) de las landings de cluster.
// Movido TAL CUAL desde ClusterLanding.astro (ola 0C) para que la plantilla v3
// (WLanding) y el cuerpo de siempre usen la MISMA función: "mismos
// defaultCity/defaultService que hoy" (design/rediseno-workos.md §3.7).
// OJO: esta tabla solo decide la opción del <select>; el TIPO de landing lo
// decide KIND_BY_PATH (registry.ts), nunca esta tabla.
// ─────────────────────────────────────────────────────────────

export function deriveDefaultCity(city?: string): string | undefined {
  if (city === 'Houston') return 'Houston, TX';
  if (city === 'Miami') return 'Miami, FL';
  return undefined;
}

// defaultService: por substring del path (ES o EN); coincide con las options del select por idioma.
export function deriveDefaultService(path: string, lang: 'es' | 'en'): string | undefined {
  const es = lang === 'es';
  if (/abogados-inmigracion|bienes-raices|immigration-lawyers|real-estate/.test(path)) return es ? 'Diseño web' : 'Web Design';
  if (/diseno-web|pagina-web|web-design|website-cost/.test(path)) return es ? 'Diseño web' : 'Web Design';
  if (/ia-conversacional|chatbot|ia-para-pymes|conversational-ai|ai-for-small-business/.test(path)) return es ? 'IA conversacional / Chatbot' : 'Conversational AI / Chatbot';
  if (/ecommerce/.test(path)) return es ? 'E-Commerce / Tienda Online' : 'E-Commerce / Online Store';
  if (/seo-para-ia|ai-seo/.test(path)) return es ? 'SEO para IA (visibilidad en IA)' : 'AI Visibility (AEO)';
  if (/seo-local|local-seo/.test(path)) return es ? 'SEO local' : 'Local SEO';
  if (/branding/.test(path)) return es ? 'Branding e identidad' : 'Branding & Identity';
  return undefined;
}
