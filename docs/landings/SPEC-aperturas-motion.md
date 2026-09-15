# SPEC — Fase 0.6 · Aperturas de página + Sistema de motion Marcyan

**Estado: LISTA, activación DIFERIDA.** Revisada por 3 revisores adversariales el 2026-09-04
(36 hallazgos, 5 bloqueantes, todos corregidos aquí). Complementa `PLAN-maestro-rediseno.md`
como fase transversal previa al piloto.

**Disparador de activación:** cuando el hero Houston (PR #33) quede **RESUELTO** (mergeado
o descartado explícitamente por el dueño; si se descarta, el dueño reconfirma el arranque)
**y** el PR #34 (candado de diseño en CLAUDE.md) esté mergeado.

## Decidido por el dueño vs propuesto por el planificador

| Punto | Estado |
|---|---|
| Dirección de aperturas + sistema de motion | **Decidido** (2026-09-03) |
| AnswerBlock compacto y MÁS ABAJO | **Decidido** |
| Orden: hero Houston → esta fase → piloto | **Decidido** |
| Riel "Dominamos" estático (sin cinta infinita) | Propuesto como default; el dueño no objetó |
| Sin cursor personalizado global | Propuesto como default; el dueño no objetó |
| Condensar la nav (64→56 al scroll) | **Pendiente: es cambio GLOBAL (toca la home)**; se decide en el Paso 0 |
| Rampa de transparencia de /precios (bloque 2 hoy) | **Pendiente**: default = se conserva bajo el grid |
| Retirar el lift de hover de PriceGrid al activar Foco | **Pendiente**: cambio consciente de motion aprobado (E-02) |
| Miami | **Fuera de esta spec** (backlog: rediseño de cero cuando el dueño diga) |
| Houston | **Fuera del Paso 2**: paso propio (2b) tras resolver el hero, con su OK |

## 0) Qué arregla (medido en producción, 2026-09-03)

La queja: "cada sección abre con un texto enorme de mensaje directo". El culpable es la
pila bajo el título: bajada de 30-42 palabras + el AnswerBlock etiquetado "RESPUESTA
DIRECTA" como 2.º bloque, y en móvil ningún visual porque el aside de `LandingHero` es
`display:none` bajo 1024px. Palabras de prosa antes del primer elemento visual o escaneable:
servicios 117, diseño web 124, restaurantes 145, **precios 252 (el grid es el 6.º bloque)**.
En servicios la sub repite verbatim la respuesta. Y no existe ninguna animación de entrada
o de scroll en secciones de contenido: solo hovers.

## 1) SEO/AEO: intocable y negociable (Google Search Central 2025-26)

**Intocable:** un solo `<h1>` con la keyword en HTML real; todo texto citable renderizado en
servidor y **visible sin JS ni interacción**; AnswerBlock (q/a/source) y FAQ con palabras
congeladas; datos estructurados = texto visible; CWV en verde (gate 95/97). **El elemento
LCP (H1 o imagen hero) jamás arranca en `opacity:0` ni con `visibility:hidden`.**
**Negociable:** tamaño del H1, cantidad de texto arriba, hero visual-first, forma y posición
del AnswerBlock (dentro del primer tercio del texto), bajada ≤15 palabras si conserva las
entidades, chips y breadcrumb fuera del primer viewport móvil. El JSON-LD de los hubs vive
en el `<head>` y NO depende del orden de bloques: nadie lo "arregla" al reordenar.

## 2) Reglas de apertura

- **A1 · Primer viewport móvil** = kicker (1 línea, opcional) + H1 (≤10 palabras) + UNA
  línea de apoyo (≤15 palabras) + 1 CTA dominante + un elemento visual real.
  **Excepción hubs (DESIGN.md §8.1 manda):** el header de hub NO renderiza CTA, chips ni
  motivo orbital; su "visual" y su CTA son el CONTENIDO ÚTIL del bloque 2 (A3).
- **A2 · Bajadas sin redundancia y sin perder entidades.** Antes de recortar, ledger de
  entidades por página: ciudades, servicios y precios presentes en la bajada actual y
  ausentes del H1. La bajada nueva (≤15 palabras) o el H1 deben conservarlas; si no caben,
  cambia el H1 (p. ej. /servicios: "Diseño web, IA y SEO en Houston y Miami", con el claim
  actual como kicker). /blog no tiene AnswerBlock: conserva su bajada con entidades.
  Las respuestas del AnswerBlock NO se tocan (congeladas).
- **A3 · Contenido útil primero:** en los hubs, el bloque 2 es lo que el visitante vino a
  ver (/precios: PriceGrid; /servicios: catálogo; /ciudades: fichas). Los `intro` de esos
  grids (35 palabras hoy en `pricing.ts` y `servicios.ts`) se recortan a ≤12 o se omiten.
- **A4 · AnswerBlock compacto y más abajo:** conserva `<h2>` (pregunta literal) + `<p>` +
  fuente y las mismas palabras. Va DESPUÉS del bloque útil de A3 y ANTES de cualquier `<h2>`
  de prosa (Prose, FeatureGrid, RelatedLinks, FAQ). Entre el H1 y el AnswerBlock solo puede
  haber el bloque de A3. Su primera palabra cae dentro del primer 35% del texto de `<main>`
  (conteo sobre `dist/`). No aplica a /blog.
- **A5 · Visual antes de las 60 palabras** también bajo 1024px. En hubs lo cumple el bloque
  útil de A3. En landings de cluster lo cumplirá el piloto (aside compacto, ver §4.4).
- **A6 · Copy:** sin guiones decorativos (E-07/E-12), sin tematización vacía (E-13), voz
  "dominamos la IA" (nunca "construimos con"), plazos según política (contacto "1 hora
  hábil", propuesta "24 horas"), anclas "desde $X" si se menciona precio. Las bajadas
  nuevas ES/EN se entregan al dueño en tabla antes/después junto a las capturas.

## 3) Vocabulario de motion (CSS-first, cero librerías)

Regla madre: **una idea de movimiento por sección**. Solo `transform`/`opacity`
(compositable), UI <300ms, entradas ≤600ms una sola vez, `--ease-out-expo`, todo dentro de
`@media (--motion-ok)`. **Nunca opacity-reveal sobre bloques citables** (AnswerBlock, FAQ,
cifras del PriceGrid, bloque 2 de A3): esos, o `transform` solo, o nada. Nada de JS de
animación above-the-fold.

| # | Patrón | Qué hace | Dónde (en ESTA fase) | Fuente / licencia |
|---|---|---|---|---|
| 1 | **Llegada** | Entrada única al cargar: kicker, apoyo y CTA con translateY 14px + opacity (600ms, delays 60ms). **El H1 y cualquier candidato LCP: solo `transform` o sin animar, nunca opacity.** | Headers de hubs (Paso 2); heros de landings (piloto) | Keyframes propios en `motion.css` con el timing de la casa (600ms, ease-out-expo, 14px) |
| 2 | **Umbral** | Al cruzar cada sección, UN elemento se revela (el bloque de título kicker+H2 o el visual), no las 3 tarjetas con stagger | Secciones de hubs: PriceGrid, RelatedLinks, Faq, Prose, FeatureGrid (Paso 2) | Codrops scroll-driven (MIT): `animation-timeline: view()` + fallback IO |
| 3 | **Foco** | Hover con puntero fino: hermanas a opacity .75, la señalada gana borde `--tint-line` de SU tono (oro u teal, jamás oro sobre teal: §8.3/E-14); nada salta ni se eleva | PriceGrid, RelatedLinks, fichas de ciudades (Paso 2) | Principio Raycast; código propio |
| 4 | **Cifra tabular** | Número real que cuenta una vez al entrar en pantalla | **Solo calculadoras (ya existe).** Excluido de precios y de "stats" (no hay stats reales: E-10) | Magic UI NumberTicker (MIT) |
| 5 | **Cinta** | Fila infinita de marcas | **No se usa** (default aprobado); riel "Dominamos" estático | Magic UI Marquee (MIT) si algún día se activa |
| 6 | **Trazo de luz** | Luz oro que viaja por una línea (motivo propio del Process) | Conectores de FeatureGrid (Paso 2). Process = home, FUTURO | Casa: `rielflow` de Process.astro |
| 7 | **Pantalla que explica** | Sección sticky de 3 pasos con un visual que cambia de estado | **FUTURO** (sección IA, diagnóstico): fuera de esta fase | Principio Stripe/Apple; Codrops sticky (MIT) |
| 8 | **Horizonte** | El CTA final se enciende desde el borde inferior (glow anclado abajo, nunca tras el titular: §8.2). **Solo en tono oro**; en `ctaband--teal` se deja estático (§8.3) | CtaBand de hubs (Paso 2). Contact = home, FUTURO | Principio Vercel/Linear; código propio |
| 9 | **Condensar** | Nav 64→56 + tinte al pasar 24px de scroll | **DECISIÓN GLOBAL pendiente** (toca la home y la nav glass post-#33): se decide en el Paso 0 | Principio Linear/Vercel |
| 10 | **Nib** | Cursor personalizado | **No global** (default aprobado). Solo, si acaso, sobre el portafolio, FUTURO | CSS Cursors (MIT) |

Los "Dónde" marcados FUTURO tocan componentes de la home (Services, Process, AiSection,
Contact): **fuera de esta fase**, la home no se toca.

## 4) Primitivos técnicos (Paso 1)

1. **Tokens** (aditivos en `src/styles/tokens.css`, familia existente): `--duration-enter:
   600ms`, `--duration-reveal: 500ms`, `--stagger: 60ms`, `--rise: 14px`.
2. **`src/styles/motion.css`**, importado desde `global.css` (que es un barrel) después de
   `base.css`. Contiene, TODO bajo `@media (--motion-ok)` (los `@custom-media` los inyecta
   postcss-global-data) y TODO bajo `html.js` (clase que pone un `<script is:inline>` de
   una línea en el `<head>` de Layout; sin JS nada se oculta jamás):
   - `.arrive > *` con `animation-delay: calc(var(--i) * var(--stagger))` y `--i` fijado
     por `:nth-child(1..6)` (el breadcrumb es el hijo 0 cuando existe). Keyframe
     `arrive-fade` (translateY + opacity) para kicker/apoyo/CTA; keyframe `arrive-rise`
     (SOLO translateY) para `h1` y cualquier imagen hero. `animation-fill-mode: both`.
   - `.reveal`: `@supports (animation-timeline: view())` → scroll-driven, declarando
     `animation-timeline: view()` como longhand DESPUÉS del shorthand `animation`, y
     `animation-range: entry 0% entry 60%` explícito. Fallback: clase `.is-in` puesta por
     el IO (abajo). El backstop de reduced-motion de `base.css` NO cubre scroll-driven: por
     eso el `@media (--motion-ok)` es obligatorio aquí.
   - **Regla de `overflow`:** ningún ancestro entre un `.reveal` y el viewport puede tener
     `overflow: hidden` (crea scroll container y `view()` queda en no-op silencioso).
     Donde haga falta se cambia a `overflow: clip` (CtaBand `.ctaband__inner`, RelatedLinks
     `.related__panel`) o se usa `view-timeline` con nombre en la `<section>`.
   - `.reveal` va en el `<h2>`/`.kicker` interior o en el visual, NUNCA en cabeceras
     sticky (`.faq__head`, `.fgrid__head`, `.prose__rail`) ni en el primer viewport.
   - `.focus-group:hover > :not(:hover) { opacity: .75 }` + borde por `--tint-line`.
   - `.trace`: máscara + hijo con gradiente oro que se traslada (`transform`, no
     `background-position`).
   - Horizonte: `::before` con `radial-gradient` oro, `transform-origin: bottom`, solo opacity/transform.
3. **IO fallback** (≈500B raw / ≈310B gz, en el script ya bundleado de Layout):
   `rootMargin: '0px 0px -12% 0px', threshold: 0`, `unobserve` tras el primer hit, y
   fast-path: si `matchMedia('(prefers-reduced-motion: reduce)').matches ||
   CSS.supports('animation-timeline: view()')` → añade `.is-in` a todo y termina.
   **Montarlo en Layout es excepción sancionada** (como LangNotice): afecta a las 84 páginas.
4. **Props aditivas** (default = comportamiento actual, cero cambio visual):
   - `AnswerBlock`: `variant?: 'compact'` → sin kicker "Respuesta directa", sin comilla,
     sin riel ni dot animado, `<h2>` con estilo `.h4` (20→28px), párrafo `.lead`, fuente en
     línea, `padding-block: var(--space-6)` propio (hoy `.answer` tiene padding 0 y flotaría
     entre secciones). Conserva `id="answer-q"`, `aria-labelledby` y la prop `lang`.
   - `LandingHero`: `arrive?: boolean`. **`asideMobile` NO va en esta fase**: se especifica
     en el piloto (SVG compacto propio con `<defs>` de id único, ≤120px, sin `lh-spin`).
   - `PriceGrid`, `RelatedLinks`, `Faq`, `FeatureGrid`, `Prose`, `CtaBand`: `motion?:
     'reveal' | 'focus' | 'horizon' | 'trace'` según aplique (ninguno acepta `class` hoy:
     verificado). PriceGrid: al activar `focus` se retira el `translateY(-3px)` del hover
     (cambio consciente, pendiente de OK).
5. **Condensar**: NO en Paso 1. Si el dueño lo aprueba en el Paso 0: no tocar `--nav-h`,
   override solo bajo `.is-scrolled`, `transition: height 200ms` añadida a la lista de
   `transition: none` de reduced-motion, y declarado como única excepción a
   "solo transform/opacity". El drawer y el velo siguen fuera del header.

## 5) Pasos (cada paso = 1 PR, base fresca de `origin/main`, rama propia, OK del dueño)

**Paso 0 · Re-baseline** (obligatorio al activar): leer el `main` posterior al hero (la
piel `nav--glass` puede neutralizar `is-scrolled`), reescribir aquí §4.5 y los keyframes
contra ese main, y decidir con el dueño: Condensar sí/no, rampa de /precios, lift de PriceGrid.

**Paso 1 · Primitivos = CERO activaciones.** Archivos permitidos: `src/styles/tokens.css`,
`src/styles/motion.css` (nuevo), `src/styles/global.css` (solo el import), `src/layouts/
Layout.astro` (inline `html.js` + IO), `AnswerBlock.astro`, `LandingHero.astro`,
`PriceGrid.astro`, `RelatedLinks.astro`, `Faq.astro`, `FeatureGrid.astro`, `Prose.astro`,
`CtaBand.astro` (solo props aditivas con default off). QA: capturas de home ES, 1 hub, 1
landing de cluster y 1 artículo, a 390 y 1440, idénticas a main (prueba de "cero cambio").

**Paso 2 · Hubs** (visible). Archivos permitidos, exactos: páginas `src/pages/es/{servicios,
precios,ciudades,portafolio,sobre-nosotros}.astro`, `src/pages/es/blog/index.astro`,
`src/pages/en/{services,pricing,cities,portfolio,about}.astro`, `src/pages/en/blog/index.astro`;
datos `src/i18n/{servicios,pricing,portfolio,sobre-nosotros,blog}.ts` y sus espejos
`*.en.ts` (+ el hero inline de `ciudades.astro`/`cities.astro`). **`content.ts` NO se toca**
(es la home). Las clases y variantes se activan SOLO desde las páginas vía props.
- Reordenar bloques según A3. En /precios, al subir PriceGrid, la CTA secundaria `#precios`
  del header se elimina (redundante; `id="precios"` se conserva por las landings).
- Bajadas y `grid.intro` reescritos según A2/A3/A6 con su ledger de entidades y tabla
  antes/después ES/EN para el dueño.
- `AnswerBlock variant="compact"` colocado según A4.
- Motion: Llegada en el header (H1 solo `arrive-rise`), Umbral en el título de cada
  sección, Foco en PriceGrid/fichas, Horizonte en CtaBand oro, Trazo en FeatureGrid.
  Una idea por sección.
- Houston y Miami: fuera (ver tabla de decisiones).

**Paso 2b · Houston**: paso propio después de resolver el hero, con OK del dueño.
**Paso 3 · Landings**: vía el piloto (`ClusterLanding` congelado). Fuera de esta spec.

## 6) Gate de QA bloqueante (además de `design/frontend-design.md` y el ledger E-01..E-18)

0. Base fresca `origin/main`, rama propia, `git diff main --stat` solo con los archivos
   permitidos del paso. Extra = STOP.
1. `design-director` invocada al empezar y **re-invocada tras cada `/compact`**; gramática
   del sitio intocable (botones, nav, superficies, tokens); sin captura real no hay ✓.
2. **Textos citables intactos:** diff de `answer.q/a/source` y FAQ = vacío; grep en `dist/`
   de cada respuesta verbatim y de cada ancla de `PRICE_ANCHORS` con su formato visible; un
   solo `<h1>` por página.
3. **Captura con JS desactivado** de cada hub tocado: todo el texto visible (nada en opacity 0).
4. Lighthouse móvil local: Perf ≥95, A11y ≥97, CLS <0.02, TBT 0; **elemento LCP identificado
   por página (Performance → LCP entry) = el H1 o la imagen prevista, sin `opacity` en su
   animación, y con "render delay" que no crece respecto a main.**
5. Reduced-motion: cero animaciones vivas, incluidas las scroll-driven. Sin listeners de
   scroll NUEVOS (el de SiteNav ya existe).
6. Presupuesto CSS: extraer los `<style>` de `dist/<ruta>/index.html`, concatenar, `gzip -6`,
   comparar con main: ≤ +3KB gz por página.
7. **Chrome real:** capturas móvil (390) y PC (1440) de cada página tocada, y verificación
   de que las animaciones PROGRESAN (no solo que el nodo es visible). Protocolo Ojos, 2 ciclos.
8. OK explícito del dueño sobre capturas + tabla de bajadas ANTES de merge. Al mergear:
   roadmap (skill `roadmap`, Op. 2) y re-indexación de las URLs tocadas en el sweep.

## 7) Verificación y vigilancia (los hubs suman ~46 impr/mes: no hay señal estadística)

Determinista en t0, por URL tocada: URL Inspection = indexada y con snippet permitido; el
render de Google contiene la respuesta verbatim; validador de schema sin errores; un `<h1>`.
Cualitativa mensual: preguntar a ChatGPT, Gemini y Perplexity las 6 preguntas de los
AnswerBlock (ES/EN) y registrar 0/1 por asistente antes y después. GSC de los hubs solo como
vigilancia secundaria (2 reportes mensuales). Si un hub pierde indexación o su respuesta
deja de aparecer en el render, se sube el AnswerBlock un bloque (reversible en una línea) y
se registra en el ledger.
