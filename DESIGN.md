# DESIGN.md — Marcyan Studio · Doctrina visual "Space-Tech"

> **Autoridad.** Este archivo MANDA sobre cualquier decisión de UI. Se deriva de la
> **home (`src/pages/es/index.astro` + sus secciones)**, que es la pieza de referencia
> aprobada. Todo lo demás (secciones y landings) debe sentirse parte de la MISMA nave:
> mismo fondo, misma paleta, misma tipografía, mismo nivel de craft. Si una página se ve
> "plana, genérica o aburrida", está mal por definición. Complementa a `design/art-direction.md`
> y a las skills `design-director` (gate) + `refero-design` (craft).

---

## 0) Identidad (CONSERVADA — nunca se inventa ni se cambia)

Fuente única de tokens: `src/styles/tokens.css`. Breakpoints: `src/styles/media.css`
(`@custom-media --sm/--md/--lg/--xl`, `--lt-md`, `--motion-reduce`, `--hover-fine`).

- **Fondo:** `--bg-base #080808` (nunca negro puro). Tarjetas `--bg-card #141414`, elevado `--bg-elevated #1c1c1c`.
- **Acentos (con MODERACIÓN):** oro `--accent-gold #c8a96e` (~7 %, primario) · teal `--accent-teal #4fc3a1` (~3 %, señal IA / "en vivo"). Familias `*-dim` (relleno 15 %), `*-line` (borde 30 %), `*-glow`.
- **Texto:** `--fg-primary #f0ede8` · `--fg-secondary #9a9590` (texto legible secundario) · `--fg-subtle` SOLO disabled/placeholder.
- **Tipografía:** display **Space Grotesk** (`--font-display`), cuerpo **DM Sans** (`--font-body`), datos/labels **JetBrains Mono** (`--font-mono`). Escala fluida `--fluid-display/h1..h4/lead`; escala fija `--text-xs..5xl`.
- **Radios:** sm 4 · md 8 (botones) · lg 12 (tarjetas) · xl 20 · pill 100. **Nunca** mezclar radios al azar en superficies del mismo nivel.
- **Espaciado:** base-4 (`--space-1..10`). Sección: `.section { padding-block: var(--section-gap) }`. Gutter: `.container` con `--container-pad`.
- **Iconos:** Lucide outline vía `ui/Icon.astro`, `stroke-width:1.5`, un concepto = un icono. El único filled permitido es la marca `marcyan-ai`, en UN solo slot insignia (SEO para IA). No mezclar familias.
- **Motion:** `--ease-out-expo` por defecto; SIEMPRE apagar animaciones en `@media (--motion-reduce)`.

**Solo tokens, nunca hardcode.** Excepción ya existente: maquetas realistas (laptop/teléfono en `Projects.astro`) usan grises de hardware crudos; no es plantilla a seguir en otros sitios.

---

## 1) El fondo (KEYSTONE) — `SpaceBackdrop`

El motivo nº1 de que las landings se vieran genéricas: sus secciones mostraban `--bg-base`
sólido (losas planas) mientras la home tiene estrellas + glows por sección. **Las `.section`
no pintan fondo propio** → basta poner una atmósfera detrás del contenido.

- **Componente:** `src/components/SpaceBackdrop.astro`. Capa **fija, a pantalla completa,
  `z-index:-1`, aria-hidden**: glows radiales oro/teal (eco de la viñeta del hero) + viñeta
  inferior + **un** canvas de estrellas a la deriva con fugaces ocasionales. Progresivo
  (sin JS quedan los gradientes), reduced-motion (estrellas quietas), pausa con pestaña oculta.
- **Regla:** TODA página de sección/landing incluye `<SpaceBackdrop tone="gold|teal" />`
  **una sola vez** (al final del `<main>` o tras él). `ClusterLanding.astro` ya lo trae →
  las ~30 landings finas quedan cubiertas. Las páginas bespoke deben añadirlo.
- **No duplicar atmósfera:** una página usa SpaceBackdrop **o** el patrón `data-fx`+`StarField`
  de la home, nunca ambos (evita 2 canvas). En landings: SpaceBackdrop. La **home NO se toca**
  (ya tiene su atmósfera; no se le añade SpaceBackdrop).
- Las tarjetas (`--bg-card`) siguen opacas y flotan sobre la atmósfera — eso da el contraste.
  Acentos locales (gradiente de esquina tipo `svc-hero`, barra teal del chat) son craft bienvenido.

---

## 2) "Hero de landing" vs "Header de sección" (queja del dueño)

> "Todas las secciones tienen un hero estilo página principal; no es necesario en secciones."

- **Landings de aterrizaje** (ciudad: `/es/houston`, `/es/miami`; servicio×ciudad; wedge IA):
  **SÍ llevan hero potente.** Son páginas de conversión; el hero vende. Houston y Miami deben
  ser **páginas potentes, nivel home**, no listas de enlaces apiladas.
- **Páginas de sección / hub** (`/es/servicios`, `/es/precios`, `/es/ciudades`, `/es/portafolio`,
  `/es/sobre-nosotros`, `/es/blog`): **NO** repiten el hero alto de portada. Usan un **header
  compacto y distintivo** (kicker + H1 + bajada + 1 acción), más corto, sobre la atmósfera —
  no un bloque de 90vh. La energía visual va al CONTENIDO de la página, no a un hero clónico.
- El `LandingHero` debe soportar ambas intenciones (p. ej. prop `variant: 'landing' | 'header'`,
  aditiva, default = comportamiento actual para no romper consumidores). Las páginas hub pasan
  `variant="header"` o montan su propio header compacto.

---

## 3) Anti-genérico (NO → SÍ) — se aplica a TODA pieza

- **NO** grid de 3 tarjetas icono+título+párrafo (el `FeatureGrid` actual ES esto) →
  **SÍ** una composición con jerarquía real: destacado + lista, zig-zag con visual, columnas
  asimétricas, o tarjetas con dato/numeral/línea de conexión. Que NO parezca plantilla SaaS.
- **NO** fondo sólido plano que no coincide con la home → **SÍ** la atmósfera SpaceBackdrop +
  acentos de gradiente locales.
- **NO** hero alto y centrado clónico en cada subpágina → **SÍ** header compacto (ver §2).
- **NO** muro de texto gris → **SÍ** ritmo: kicker mono, H2 display, lead, y elementos
  escaneables (pills de dato, líneas, iconos precisos, micro-ilustración).
- **NO** dos CTAs gemelos con el mismo peso → **SÍ** 1 acción primaria dominante (oro sólido)
  + secundaria contorno/ghost.
- **NO** iconos multicolor / mezcla de familias → **SÍ** Lucide outline 1.5px, 1 icono = 1 concepto.
- **NO** em-dash "—" como muletilla en cuerpo → **SÍ** comas/puntos (se permiten rangos "Lun–Vie"
  y guiones en titulares). Sin copy de relleno ("soluciones innovadoras"): claims reales con cifra/entregable.
- **NO** stock / imágenes nuevas binarias → **SÍ** **ilustración inline SVG** line-art (oro/teal,
  baja opacidad, `aria-hidden`), en la línea del skyline/siluetas de `Locations.astro`.

---

## 4) Briefs por componente de landing (superficie a rediseñar)

Mantener SIEMPRE el contrato de props (las páginas dependen de él); cambios solo ADITIVOS.
Conservar `set:html`, tonos `gold|teal`, ids, `data-*`, nombres de campo, schema y copy honesto.

- **`LandingHero`** → hero de aterrizaje con más fuerza (jerarquía, acento de gradiente, chips de
  prueba como datos mono) + **variante `header` compacta** para hubs (§2). Sin motor planetario
  (eso es solo la home), pero puede llevar una micro-ilustración line-art o un acento orbital sutil.
- **`FeatureGrid`** → **abandonar el 3-card cliché.** Reformatear a algo con jerarquía (destacado +
  lista tipo `Services`, o tarjetas numeradas/conectadas, o zig-zag). Iconos precisos por concepto.
- **`AnswerBlock`** → la tarjeta AEO answer-first, pero más memorable: tratar la pregunta como
  titular, la respuesta como cita de alta densidad; acento teal de "dato"/fuente. Sigue siendo
  citable verbatim (no romper el texto de la respuesta ni la fuente).
- **`Pricing`** (panel único) y **`PriceGrid`** (catálogo) → paneles de precio con más carácter
  (numeral display grande, "desde" mono, badge de recurrencia ya existe, check-list clara,
  stretched-link ya existe en PriceGrid). Que se sienta "panel de control", no caja sosa.
- **`CtaBand`** → banda final con gravedad: glow de acento, 1 acción dominante; puede llevar un
  motivo espacial sutil (estrella/órbita line-art) sin ruido.
- **`RelatedLinks`** → de lista de tarjetas planas a "constelación" navegable: enlaces con icono
  preciso + subtítulo + flecha que se desplaza; en hubs de ciudad es el conmutador de servicios,
  hazlo escaneable y vivo.
- **`Prose`** → editorial: ancho de lectura, ritmo, `<em>` de acento, `<strong>` legible; opcional
  filete/numeral o marca de párrafo. Nada de muro gris.
- **`ArticleHero`** (blog) → header editorial de artículo (ya sin CTA); reforzar meta (fecha/lectura/
  tags) y darle un acento espacial sutil. Coordinar con el rediseño del blog.

---

## 5) Intención por página bespoke (workstream de páginas)

- **`/es/houston` y `/es/miami`** (hubs de ciudad) → **páginas potentes, nivel home.** Hero fuerte
  con identidad local (reusar/echar mano del line-art skyline + siluetas de estado TX/FL y las pills
  de coords de `Locations.astro`), un showcase de servicios (no solo `RelatedLinks` plano), contexto
  local con peso, prueba (Projects), FAQ, CTA. Son las landing principales de cada ciudad.
- **`/es/servicios`** (catálogo) → hub de los 7 productos con anclas bajas; header compacto + PriceGrid
  rediseñado + por qué nosotros (sin 3-card) + FAQ + CTA. Navegable y con jerarquía.
- **`/es/precios`** → tabla/grid de precios clara y confiable (AEO), comparables sin caos.
- **`/es/ciudades`** → hub geográfico vivo (fichas de ciudad como `Locations`, mapa line-art opcional).
- **`/es/portafolio`** → prueba real con dignidad (sin exponer dominios; resultado + tags), reusar el
  device-mockup de `Projects` si aplica.
- **`/es/sobre-nosotros`** → E-E-A-T con carácter (proceso, valores, NAP), no muro de texto.
- **`/es/blog` (índice)** → **buena navegación + ilustración que dé vida**: header editorial, filtros/
  categorías o índice por tema, tarjetas de post con jerarquía (no 3-card soso), micro-ilustración SVG.
- **`/es/blog/[slug]`** (+ `Article`, `ArticleToc`, `PostNav`) → lectura cómoda: ToC pegajoso, ritmo
  tipográfico, navegación anterior/siguiente clara, acentos espaciales sutiles.

---

## 6) NO TOCAR (estándar de la home + lógica crítica)

- **La home** (`src/pages/es/index.astro`, `en/index.astro`) y sus secciones: `Hero`, `Services`,
  `AiSection`, `Process`, `Projects`, `Guarantees`, `Locations`, `Contact`. **Definen el estándar
  bueno.** `Process`, `Projects`, `Contact` se REUSAN en landings → cambiarlos cambia la home: NO se
  rediseñan. (Si una landing necesita otra cosa, se hace en la página, no en el componente compartido.)
- **El formulario** (`Contact.astro`, `formulario.astro`): contrato a `/api/contact` y `/api/brief`,
  `website_hp`, nombres de campo, validación, ids. **Intacto.**
- **`api/`, `lib/`, `public/admin/`**, schema SEO (`seo/*`), contenido honesto, precios, textos AEO
  answer-first: **no se alteran** (es rediseño visual/estructural, no de contenido ni backend).
- **Honestidad dura:** nada de portafolio/testimonios/stats falsos; sin promesas de #1.

---

## 7) Puerta de salida (build-safety + a11y) — bloqueante

Antes de dar por buena una pieza, verificar item por item:

1. **Build-safe:** solo tokens; breakpoints vía `@custom-media`; CSS de contenido `set:html`/slot
   estilizado con `:global()` acotado bajo una clase con scope; sin romper imports/props.
2. **Contrato intacto:** props, `data-*`, ids, names, schema, copy honesto, tonos — sin cambios
   no aditivos.
3. **A11y:** un solo `<h1>` por página; foco visible (`:focus-visible`); tap-targets ≥44px;
   contraste AA (cuerpo ≥4.5:1); `aria-hidden` en decoración.
4. **Responsive:** sin scroll-x de 320→1440 (`min-width:0` en hijos de flex/grid; medios fluidos).
5. **Motion:** toda animación se apaga en `@media (--motion-reduce)`.
6. **Coherencia:** ¿se ve parte de la MISMA nave que la home? Fondo atmosférico, no losa plana;
   nada genérico; jerarquía clara con 1 acción primaria.

---

## 8) Ronda 2 — Afinado del dueño (2026-07-02) · MANDA sobre lo anterior si choca

Fixes concretos tras revisar el preview. UI y UX van **de la mano**, ambos premium.

### 8.1 Hub header = SLIM (no "hero" por sección)
Aunque los hubs ya usan `LandingHero variant="header"`, éste todavía pinta H1 `display` + 2 CTAs +
chips + badge → sigue leyéndose como un **hero** y hace que cada sección se sienta "página nueva".
- **Regla:** `variant="header"` = **franja de título compacta y consistente** en TODOS los hubs:
  breadcrumb (slot) + kicker mono + **H1 en `.h1` (fluid-h1, NO `.display`)** + **una** línea de bajada.
  **Elimina en header:** los botones CTA, los chips, el badge y el motivo orbital. Padding vertical
  mínimo. Un filete/hairline inferior opcional para cerrar la franja. Sin 90vh, sin bloque de hero.
- `variant="landing"` (Houston/Miami/servicio×ciudad) **NO se toca** — ahí el hero potente es correcto.
- Contrato aditivo: seguir aceptando `primary/secondary/chips/badge` en los props (los hubs los pasan),
  pero en modo header simplemente NO se renderizan. Nada se rompe.

### 8.2 CtaBand ("Cuéntanos qué necesitas… te orientamos gratis")
Defectos: el `.ctaband__orbit` (arco grande) cruza por detrás del **título** (bajo contraste, se pisa)
y el satélite `offset-path` **se corta** (animación con saltos).
- **Quita** el arco de órbita que cruza el texto y el satélite animado que tartamudea.
- **Recréalo con buen contraste, sin colisionar con el texto:** el motivo (si se conserva) va a
  **espacio negativo** — p. ej. un horizonte/arco anclado al **borde inferior** por debajo del CTA, o
  una constelación pequeña en una esquina — nunca detrás del titular. Anima solo si es sutil y estable
  (nada de saltos); si dudas, **déjalo estático** o **elimínalo**. Conserva el filete superior + glow
  suave. Prioridad: limpio y premium por encima de decoración.

### 8.3 Nada de "reflejo verde" en las tarjetas de IA (tono teal)
En `servicios`/`precios`, las tarjetas de servicios IA (tono teal) tienen un **glow/halo verde feo**.
Origen: `PriceGrid` → `.pcard__amt { text-shadow: 0 0 32px var(--tint-glow) }` con `--tint-glow` teal,
+ el `.pcard__corner` (wash teal) + `box-shadow` teal en dots.
- **Regla:** en tono **teal**, el acento se expresa por **borde/icono/texto nítidos**, **no** por
  halos/glmore difusos. Elimina o baja drásticamente el `text-shadow` del numeral en teal (el verde
  saturado "sangra" feo), suaviza el wash de esquina teal, y quita los `box-shadow` de glow teal que
  se vean sucios. El oro puede conservar un glow muy sutil; el teal debe quedar **limpio**. Revisa
  también `FeatureGrid`/`RelatedLinks` en teal por el mismo tic. Objetivo: teal se ve premium, no radiactivo.

### 8.4 Convención de iconos (extender la de la home a secciones y landings)
La home ya resolvió: **un icono = un concepto**; nunca el mismo icono para dos cosas que "parecen lo
mismo pero no lo son"; `marcyan-ai` (marca, filled) reservado a **un solo** slot insignia (SEO para IA).
- **Auditar y corregir** los iconos que alimentan las secciones/landings — viven sobre todo en los datos
  `src/i18n/*.ts` (`clusters.ts`, `servicios.ts`, `houston.ts`, `miami.ts`, `seo-ia.ts`, `pricing.ts`,
  `blog.ts`, `content.ts`) como `icon: 'lucide:…'`. Donde un mismo icono se reusa para conceptos distintos,
  asignar el **icono Lucide preciso** de cada concepto (p. ej. automatizaciones `waypoints`; IA
  conversacional `messages-square`/`bot-message-square`; búsqueda/SEO `scan-search`/`search`; velocidad
  `gauge`; reseñas `star`; NAP/ficha `map-pinned`; multilingüe `languages`). Una sola familia Lucide 1.5px.

### 8.5 Blog — navegación + ilustraciones PROPIAS
Referencia de **principios** (no clonar marca/look): onceonceagency.com/blog → tarjetas **image-forward**
(miniatura arriba + categoría + título + fecha + extracto), categoría única por pieza, filtro/índice claro,
tarjeta entera clicable.
- **Ilustraciones propias por tema:** crear un sistema de **ilustración inline SVG line-art** (oro/teal,
  aria-hidden, estilo de la casa) mapeado por **tag/tema** de cada post (diseño web, IA/chatbot, precios,
  SEO/AEO, atención al cliente, guía de compra, restaurantes… + fallback). Cada tarjeta del índice lleva su
  ilustración **arriba** (image-forward), y el artículo la reusa como marca de tema. **Sin binarios/stock.**
- **Navegación:** conservar y pulir el filtro por categoría (mejor que paginación para pocas piezas);
  jerarquía real (pieza destacada + grid), tarjeta clicable, foco/estado accesibles.
- El artículo (`[slug]` + `Article`/`ArticleToc`/`PostNav`/`ArticleHero`) mantiene lectura cómoda + la
  ilustración de tema; contrato de blog (`render`, `ArticleLd`/FAQPage, `headings`, prev/next) intacto.
