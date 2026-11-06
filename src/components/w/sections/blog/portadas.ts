// Guías con portada propia (vuelta 3): public/assets/blog/portadas/<slug>-{640,960,1280}.webp.
// Al publicar una guía nueva se genera su portada con el mismo generador y se añade aquí.
export const PORTADAS = new Set([
  'precio-pagina-web-houston-guia',
  'cuanto-cuesta-chatbot-whatsapp-guia',
  'como-aparecer-en-chatgpt-perplexity',
  'como-elegir-agencia-diseno-web-hispana',
  'diseno-web-restaurantes-menu-pedidos-whatsapp',
  'ia-que-contesta-llamadas-mensajes-perdidos',
]);
export const portadaBase = (slug: string) => (PORTADAS.has(slug) ? `/assets/blog/portadas/${slug}` : undefined);
