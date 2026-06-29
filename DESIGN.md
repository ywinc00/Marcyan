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
