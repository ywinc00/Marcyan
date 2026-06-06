// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';

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
    // Sitemap auto-generado a partir de src/pages (se mantiene solo en Olas futuras).
    // · NO usamos la opción i18n: las landings de cluster son solo-ES por ahora;
    //   el hreflang lo emite cada página en su <head> (Layout). Así evitamos
    //   alternates /en/… que aún devuelven 404.
    // · filter: fuera la galería interna /kit (noindex).
    // · customPages: páginas estáticas servidas desde public/ (no son rutas Astro).
    sitemap({
      filter: (page) => !page.includes('/kit'),
      customPages: [
        'https://marcyanstudio.com/formulario',
        'https://marcyanstudio.com/privacidad',
        'https://marcyanstudio.com/terminos',
      ],
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
