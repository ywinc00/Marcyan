# PLAN — PageSpeed Insights: cierre de pendientes (SIN tocar animaciones ni estética)

> **Para el chat ejecutor.** Plan del chat de planificación (2026-08-04), basado en el
> informe PSI móvil del 2026-08-04: Rendimiento 93 · Accesibilidad 93 · Prácticas 100 ·
> SEO 100 · Navegación agéntica 1/3. Objetivo: cerrar las causas concretas SIN cambiar
> el diseño ni romper ninguna animación (mandato del dueño: mejorar, no romper).
>
> **Regla de arranque obligatoria** (memoria del proyecto): `git fetch origin && git
> switch main && git pull --ff-only`, confirmar que partes de origin/main (hoy
> `1ff795a` o posterior) y crear la rama desde ahí. Antes de mergear: `git diff main
> --stat` SOLO con los archivos de este encargo.

Se divide en **LOTE A (invisible al ojo — se mergea tras QA técnico)** y
**LOTE B (contraste, visible — REQUIERE capturas + OK del dueño antes de mergear)**.

---

## LOTE A — cambios invisibles (rama `feat/psi-a`)

### A1 · Hero: el orbit deja de estar `aria-hidden` (arregla A11y + Agéntica a la vez)

`src/components/sections/Hero.astro`, línea 64. El contenedor orbital lleva
`aria-hidden="true"` pero dentro se montan `<a>` reales (los 6 botones) → fallo
"ARIA hidden element must not contain focusable elements" en Accesibilidad Y en
Navegación agéntica. Cambio QUIRÚRGICO de 1 línea (el motor de animación NO se toca):

```astro
<!-- ANTES -->
<div class="hero__orbit" data-hero-orbit aria-hidden="true"></div>
<!-- DESPUÉS (nav real con etiqueta; JS usa [data-hero-orbit], tag-agnóstico; CSS usa la clase) -->
<nav class="hero__orbit" data-hero-orbit aria-label={uih.exploreSite}></nav>
```

Notas: `uih.exploreSite` ya existe en `ui.ts` (lo usa `.hero__moons`). No hay
duplicación para lectores: en modo orbital los chips `.hero__moons` están
`display:none` (fuera del árbol de accesibilidad). ⛔ NO tocar `hero__hit`,
`hero__hint`, el `<script>` ni ningún CSS del hero.

### A2 · `public/llms.txt`: formato estándar (falla "no contiene ningún enlace")

Causa verificada: usa URLs planas (`- Sitio: https://…`) en vez de enlaces Markdown
`[texto](url)`, y tiene DOS `# H1`. Reemplazar el archivo COMPLETO por:

```markdown
# Marcyan Studio

> Agencia de diseño web, inteligencia artificial aplicada y SEO para pequeñas y medianas empresas (PYMEs) hispanas en Estados Unidos. Atendemos a negocios en Houston, TX y Miami, FL, en español e inglés. / Bilingual web design, applied AI, and SEO studio for small businesses in Houston, TX and Miami, FL.

Marcyan Studio pone la inteligencia artificial a trabajar para tu negocio: sitios que convierten, posicionan en Google y en los asistentes de IA (ChatGPT, Gemini, Meta AI), y asistentes de IA que ahorran tiempo al dueño del negocio (contestar mensajes, agendar citas, calificar clientes). Trabajo real y verificable: clientes nuestros ya aparecen en las recomendaciones de la IA de Google para algunas búsquedas.

## Páginas principales (español)

- [Inicio](https://marcyanstudio.com/es): qué hacemos y para quién.
- [Servicios](https://marcyanstudio.com/es/servicios): catálogo completo con precios de arranque.
- [Precios](https://marcyanstudio.com/es/precios): tarifas públicas, sin letra pequeña.
- [Diseño web en Houston](https://marcyanstudio.com/es/houston/diseno-web): servicio insignia.
- [SEO para IA](https://marcyanstudio.com/es/houston/seo-para-ia): que ChatGPT y Gemini te recomienden; diagnóstico gratis.
- [IA para PYMEs](https://marcyanstudio.com/es/ia-para-pymes): asistentes que atienden 24/7.
- [Houston](https://marcyanstudio.com/es/houston) y [Miami](https://marcyanstudio.com/es/miami): cobertura por ciudad.
- [Diagnóstico digital gratis](https://marcyanstudio.com/es/diagnostico): escaneo de tu presencia digital en 60 segundos.
- [Herramientas gratis](https://marcyanstudio.com/es/herramientas): calculadoras de llamadas y citas perdidas.
- [Blog](https://marcyanstudio.com/es/blog): guías honestas con datos y fuentes.
- [Política de privacidad](https://marcyanstudio.com/privacidad) · [Términos](https://marcyanstudio.com/terminos)

## Main pages (English)

- [Home](https://marcyanstudio.com/en): what we do and who we serve.
- [Services](https://marcyanstudio.com/en/services) · [Pricing](https://marcyanstudio.com/en/pricing): public rates, no fine print.
- [Houston web design](https://marcyanstudio.com/en/houston/web-design) · [AI SEO](https://marcyanstudio.com/en/houston/ai-seo)
- [AI for small business](https://marcyanstudio.com/en/ai-for-small-business)
- [Houston](https://marcyanstudio.com/en/houston) · [Miami](https://marcyanstudio.com/en/miami) · [Cities](https://marcyanstudio.com/en/cities)
- [Free digital checkup](https://marcyanstudio.com/en/checkup) · [Free tools](https://marcyanstudio.com/en/tools)
- [Portfolio](https://marcyanstudio.com/en/portfolio) · [About](https://marcyanstudio.com/en/about)
- [Privacy policy](https://marcyanstudio.com/en/privacy) · [Terms](https://marcyanstudio.com/en/terms)

## Contacto / Contact

- Email: contact@marcyanstudio.com
- [Formulario de contacto](https://marcyanstudio.com/es/#contacto)
```

(UN solo H1; el resto H2. Todos los enlaces son Markdown y a URLs que dan 200 sin
barra final. No se lista `/formulario`.)

### A3 · CSS bloqueante (−860 ms): inline total de hojas

`astro.config.mjs`, dentro de `build`:

```js
build: { format: 'directory', inlineStylesheets: 'always' },
```

Las 7 hojas troceadas (3.5-9.6 KiB c/u) dejan de bloquear el primer render. QA
específico: tras `npm run build`, comprobar que `dist/es/index.html` no referencia
`<link rel="stylesheet"` de `/_astro/` y que su tamaño gzip no se dispara
(`(Get-Item).Length` orientativo; aceptable hasta ~3× el HTML actual). Si el peso
resultara absurdo (>150 KB gzip por página), reportar al chat de planificación ANTES
de mergear (no improvisar un término medio).

### A4 · Imágenes de la galería (−244 KiB): variantes redimensionadas + lazy

Las capturas reales (`public/Galeria/*-pc.webp` 1920×1080 y `*-movil.webp`
~1320×2431) se sirven completas para huecos de ~421×237 y ~139×256, con
`loading="eager"` bajo el pliegue. **Los archivos originales NO se tocan ni se
renombran** (los usa el OG image del portafolio); se AÑADEN variantes:

1. Script one-off `scripts/resize-galeria.mjs` (sharp ya está en node_modules):

```js
// Genera variantes responsive de las capturas de /public/Galeria.
// One-off: se corre a mano y las variantes se comitean. No toca los originales.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR = 'public/Galeria';
for (const f of readdirSync(DIR)) {
  if (f.endsWith('-pc.webp') && !f.includes('-pc-')) {
    await sharp(join(DIR, f)).resize({ width: 900 }).webp({ quality: 80 })
      .toFile(join(DIR, f.replace('-pc.webp', '-pc-900.webp')));
  }
  if (f.endsWith('-movil.webp') && !f.includes('-movil-')) {
    await sharp(join(DIR, f)).resize({ width: 520 }).webp({ quality: 80 })
      .toFile(join(DIR, f.replace('-movil.webp', '-movil-520.webp')));
  }
}
console.log('variantes listas');
```

2. `src/components/sections/Projects.astro` — a las dos `<img>` (líneas ~50 y ~69)
   añadir `srcset`/`sizes` y pasar a lazy (mismo hueco visual, cero cambio de look):

```astro
<!-- dv-shot (~línea 50): AÑADIR -->
srcset={`/Galeria/${shot.slug}-pc-900.webp 900w, /Galeria/${shot.slug}-pc.webp 1920w`}
sizes="(min-width: 1024px) 440px, 92vw"
loading="lazy"
<!-- dv-pshot (~línea 69): AÑADIR -->
srcset={`/Galeria/${shot.slug}-movil-520.webp 520w, /Galeria/${shot.slug}-movil.webp 1320w`}
sizes="(min-width: 1024px) 160px, 40vw"
loading="lazy"
```

   (Sustituir el `loading="eager"` existente. `width`/`height` actuales se conservan.)
3. `src/components/sections/PortfolioGrid.astro` (líneas ~39 y ~52): mismo patrón;
   medir el hueco renderizado real en `/es/portafolio` y ajustar `sizes` (por defecto
   usar los mismos valores).

### A5 · Ilustraciones de ciudad: `width`/`height` explícitos

`src/components/sections/Locations.astro` línea 32: la `<img>` de
`/assets/cities/*.svg` no declara dimensiones (diagnóstico CLS de PSI). Leer el
`viewBox` de `public/assets/cities/houston.svg` y `miami.svg` y añadir a la etiqueta
`width`/`height` con esa proporción (el tamaño visual lo sigue mandando el CSS
existente — NO cambiarlo). Verificar también en el HTML construido que el `src` sale
poblado (PSI lo capturó vacío una vez; si en `dist` sale bien, no hay nada que hacer).
Réplica del mismo patrón donde se reuse la ilustración (`es/ciudades`, `es/miami`,
espejos EN) si comparten markup.

### ⛔ Lo que NO se hace en el Lote A

- NO tocar las 4 "animaciones no compuestas" (scan-dot, scanbar, chat-live,
  hero__hint-dot): son diagnóstico sin puntuación y su look es intencional. Mandato
  del dueño: las animaciones no se tocan.
- NO tocar fuentes, tokens, Hero (más allá de A1), StarField, Process, ChatWidget.
- NO cambiar ningún copy.

### QA del Lote A (bloqueante)

1. `npm run build` verde · 84 URLs en sitemap · `check:kb` · `test:chat`.
2. A1: en el HTML construido de `/es`, el orbit sale como `<nav ... aria-label>` sin
   `aria-hidden`; en navegador real, la animación del hero se ve IDÉNTICA a prod
   (pestaña en primer plano; recordar que rAF se throttlea en fondo).
3. A3: cero `<link rel="stylesheet"` a `/_astro/` en `dist/es/index.html`.
4. A4: correr el script, comitear variantes; en la home, las tarjetas de proyectos se
   ven IGUAL (mismo tamaño/nitidez) y la Network pide los archivos `-900/-520`.
5. A5: sin cambio visual en las tarjetas de ciudad.
6. Sin scroll-x 320→1440. Deploy tras merge y re-correr PSI móvil: se espera
   Rendimiento ≥95 y el fallo ARIA fuera de Accesibilidad y Agéntica.

## LOTE B — contraste (rama `feat/psi-b-contraste` · VISIBLE · OK del dueño ANTES de merge)

PSI marca texto con contraste < 4.5:1. Causa: rótulos visibles usando `--fg-subtle`
(`#4a4845` sobre `#080808` ≈ 1.9:1) o equivalentes. La propia regla del DS dice
"subtle solo para disabled/placeholder". Cambios propuestos (subir a
`--fg-secondary` `#9a9590` ≈ 7:1, mismo estilo, solo más legible):

| Elemento | Dónde | Cambio |
|---|---|---|
| "DIGITAL STUDIO" | `brand/BrandType.astro` (`.brandtype__sub`) | color → `var(--fg-secondary)` |
| Toggle "EN"/"ES" inactivo | `layout/SiteNav.astro` (`.nav__lang-opt`) | color → `var(--fg-secondary)` (es FUNCIONAL, prioridad) |
| Números 02/03/04 | `Guarantees.astro` (`.ix`) | color → `var(--fg-secondary)` |
| Chip "Houston · Miami" | `Guarantees.astro` (`.chip.muted`) | color → `var(--fg-secondary)` |
| "HOUSTON"/"MIAMI" | `SiteFooter.astro` (`.footer__city`) | color → `var(--fg-secondary)` |

**Excepciones CONSCIENTES (no tocar, documentar en el PR):** los fantasmas
decorativos (`.wc-ghost` "24h", los rótulos ghost del `GrowthTeaser`) son arte
aprobado por el dueño; subirles el contraste mataría el efecto. Se aceptan como
hallazgo residual (la nota de Accesibilidad puede no llegar a 100 y está bien).

**Flujo obligatorio:** hacer los 5 cambios → capturas antes/después de nav, garantías
y footer (desktop+móvil) → MOSTRAR al dueño → solo con su OK explícito, merge.

## Rollout

- `feat/psi-a` → commit `perf(psi): orbit accesible + llms.txt estándar + CSS inline + imágenes responsive` → QA → merge → deploy → re-correr PSI y reportar números.
- `feat/psi-b-contraste` → commit `fix(a11y): contraste AA en rótulos funcionales` → capturas → OK del dueño → merge.
- Reportar al chat de planificación: puntuaciones PSI nuevas (las 5 categorías) y cualquier desviación.
