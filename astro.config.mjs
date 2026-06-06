// @ts-check
import { defineConfig } from 'astro/config';

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
