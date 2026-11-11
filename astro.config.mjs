// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';

// ─────────────────────────────────────────────────────────────
// Marcyan Studio — sitio estático bilingüe (ES default / EN).
//
// IMPORTANTE (no romper producción):
// • Las funciones serverless viven en /api/*.mjs y las corre Vercel
//   directamente. Astro NO las toca (no hay rutas en src/pages/api).
// • lib/*.mjs son módulos compartidos por las funciones — quedan en raíz.
// • El panel /admin se sirve tal cual desde public/admin (sin tocar).
// • i18n: español por defecto con prefijo → /es/ y /en/ (Fase 1 deja la
//   config lista; las páginas con diseño final se construyen en Fase 2+).
// ─────────────────────────────────────────────────────────────
export default defineConfig({
  site: 'https://marcyanstudio.com',
  integrations: [
    icon(),
    // Isla interactiva del dashboard (/dashboard). No afecta el output
    // estático del sitio público: solo hidrata donde se usa client:*.
    svelte(),
    // Sitemap auto-generado a partir de src/pages (se mantiene solo en Olas futuras).
    // · NO usamos la opción i18n: las landings de cluster son solo-ES por ahora;
    //   el hreflang lo emite cada página en su <head> (Layout). Así evitamos
    //   alternates /en/… que aún devuelven 404.
    // · filter: fuera /es|en/kit (kit de arranque privado) y /es/kit-diseno (galería
    //   interna), el /formulario y /en/project-brief (todos noindex)
    //   y /dashboard (panel privado, noindex — no debe anunciarse en el sitemap),
    //   y los muestrarios internos /es/w-muestrario-* (noindex, se borran antes de main).
    // · /privacidad y /terminos ya son páginas Astro (src/pages/*.astro) → el
    //   sitemap las incluye solo; por eso ya NO van en customPages (evita duplicar).
    // · serialize: URLs SIN barra final — Vercel (cleanUrls+trailingSlash:false)
    //   sirve /es con 200 y /es/ con 308; el sitemap debe listar las que dan 200.
    sitemap({
      filter: (page) =>
        !page.includes('/kit') && !page.includes('/formulario') && !page.includes('/project-brief') && !page.includes('/dashboard') && !page.includes('/w-muestrario') && !page.includes('/404'),
      serialize: (item) => {
        item.url = item.url.replace(/\/$/, '');
        return item;
      },
    }),
  ],
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'always' },
  // Control v2 r3 (I-02): el script del menú (SiteNav) es idéntico en las 69 páginas y rozaba el
  // límite de 4 KB con el que Vite lo metía en línea en cada HTML. Va como archivo compartido en
  // caché (módulo diferido, no bloquea el pintado). El resto de recursos sigue la regla por defecto.
  vite: {
    build: {
      assetsInlineLimit: (file) => (/SiteNav\.astro_astro_type_script/.test(file) ? false : undefined),
    },
  },
  redirects: {
    '/': '/es',
  },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
});
