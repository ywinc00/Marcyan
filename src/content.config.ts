// ─────────────────────────────────────────────────────────────
// Colección de BLOG (Content Layer API · Astro 6).
// Piezas en Markdown bajo src/content/blog/*.md. El NOMBRE DEL ARCHIVO es el
// slug → /es/blog/<slug> (fuente única de la URL; no hay campo slug duplicado).
//
// Frontmatter tipado para el motor answer-first + FAQPage + interlink + schema.
// Autor/editor = Organization "Marcyan Studio" (NO inventamos Person del
// fundador hasta tener el dato real; se añade cuando llegue).
// ─────────────────────────────────────────────────────────────
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  // [^_] → permite ocultar borradores prefijando el archivo con "_".
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Fecha de publicación (ISO en el frontmatter, p.ej. 2026-06-10). */
    datePublished: z.coerce.date(),
    /** Última actualización, si difiere de la publicación. */
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    heroKicker: z.string().optional(),
    heroBadge: z.string().optional(),
    // Bloque answer-first (palanca AEO #1): pregunta literal + respuesta 40-60 palabras.
    answer: z.object({
      q: z.string(),
      a: z.string(),
      source: z.string().optional(),
    }),
    // FAQ visible == FAQPage schema (regla AEO/Google).
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    // Enlaces internos a clusters / otras piezas (interlink del silo).
    related: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
          desc: z.string().optional(),
          icon: z.string().optional(),
        }),
      )
      .default([]),
    ogImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
