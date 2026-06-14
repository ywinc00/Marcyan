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
    // · filter: fuera la galería interna /kit y el /formulario (ambos noindex).
    // · /privacidad y /terminos ya son páginas Astro (src/pages/*.astro) → el
    //   sitemap las incluye solo; por eso ya NO van en customPages (evita duplicar).
    sitemap({
      filter: (page) => !page.includes('/kit') && !page.includes('/formulario'),
    }),
  ],
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  redirects: {
    '/': '/es/',
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
