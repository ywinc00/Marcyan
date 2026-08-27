# SPEC — Hero "El Domo" · hubs de Houston (/es/houston + /en/houston)

**Estado: LISTO PARA EJECUTAR** (2026-08-27). Concepto VISUAL creado y validado por el
DUEÑO en Claude Design (Art Director Gate: dirección del dueño = validada por definición).
Este documento es la traducción técnica turnkey. El ejecutor lo incluye en su PR.

**Fuente visual de verdad:** proyecto Claude Design `cbbd48c2-e167-4860-bc10-af751de29d4c`,
archivo `Landing Houston.dc.html`, artboards **12a** (hero móvil, 390×760) y **11a**
(hero PC, 1440×860). El ejecutor puede leer el archivo con la tool DesignSync
(`get_file`, cabe entero). Los artboards MANDAN sobre cualquier duda de esta spec.

## Qué es (y qué NO es)

Reemplazo del hero de los DOS hubs de Houston por el nuevo **DomoHero** (astronauta
sentado en el pasto bajo el domo, foto realista + ambiente animado + nav de cristal).
- **Solo el hero.** El resto de la página queda INTACTO: servicios con precio
  (`id="servicios"`), Projects, ficha local, directorio de industrias, AnswerBlock,
  FAQ, CtaBand, Contact, los **19 enlaces del silo**, ItemList + BreadcrumbList y meta.
- `CityHero.astro` **NO se toca** (rollback = revertir el import). Se crea componente
  nuevo `src/components/sections/city/DomoHero.astro` y se cambia el import en
  `src/pages/es/houston.astro` y `src/pages/en/houston.astro`.
- Miami NO se toca (sigue con LandingHero; su turno es aparte).

## Paso previo del DUEÑO (bloquea el arranque)

Exportar del proyecto Claude Design estas 2 imágenes y guardarlas en
`docs/galeria-src/` (carpeta local gitignorada, para fuentes pesadas):
- `houston-domo.png` (PC, base 1440×860)
- `houston-domo-movil-2.png` (móvil, base 390×760)
El isotipo ya existe en el repo: `public/logos/marcyan-isotipo-mono-claro.png`.

## Copy: TODO sale de i18n, nada hardcodeado

El canvas usa los copies REALES de `houston.ts` y ya coinciden verbatim: `hero.kicker`
("Agencia hispana · Houston, TX"), `hero.h1` ("Diseño de páginas web en <em>Houston</em>"),
`hero.sub`, `hero.primary` ("Propuesta gratis" → `#contacto`), `hero.microcopy`
("Respuesta en 1 hora hábil · Sin compromiso"), `hero.explore` ("Ver servicios y
precios ↓" → `#servicios`). **Consumirlos tal cual.** El espejo EN sale de `houston.en.ts`.

**Campos NUEVOS aditivos** en el slice `hero` de ambos idiomas (opcionales en el tipo;
`telemetry` y `skyline` NO se borran, CityHero sigue existiendo):

```ts
aiCard?: { title: string; body: string; linkLabel: string; href: string };
builtWith?: string[];
```

- ES: `aiCard = { title: 'Cero llamadas perdidas', body: 'Un agente de IA contesta tu
  teléfono y tu WhatsApp 24/7, en inglés y español, agenda citas mientras tú descansas.',
  linkLabel: 'Ver cómo funciona →', href: '/es/houston/ia-conversacional' }`.
  Nota: el canvas trae em-dash ("...español — agenda..."); por la regla de copy del
  dueño (E-07) se implementa con coma como arriba, SALVO que el dueño pida el guion.
- EN espejo: mismo card traducido, `href: '/en/houston/conversational-ai'`.
- `builtWith = ['OpenAI', 'Google', 'WhatsApp', 'Shopify', 'Stripe']` (texto plano,
  sin logos de terceros).
- Las coordenadas y el riel de telemetría del hero viejo NO aparecen en el nuevo
  (decisión del dueño, coherente con E-13).

## Anatomía por capas (valores exactos del canvas)

Orden de apilado (ambos viewports; el hero es un contenedor `position:relative` que
cubre su área, la foto es el fondo del propio hero, NO se toca SpaceBackdrop):

1. **Foto** `object-fit:cover; filter:saturate(0.92)` sobre color base `#060807`.
2. **Tinte del domo** (verde salvia): radial `rgba(118,152,138,0.95)` con
   `mix-blend-mode:color` — PC `52% 28% at 74% 47%`, móvil `56% 8% at 70% 74%` — más
   un radial suave `rgba(152,178,166,0.1)` encima.
3. **Oscurecedores para contraste**: PC gradiente 100deg desde `rgba(4,6,5,0.62)` a
   transparente en 62%; móvil velo plano `rgba(4,6,5,0.2)` + gradiente vertical
   `rgba(4,6,5,0.5)→0` al 60%.
4. **Glow que respira** arriba: radial `rgba(172,216,192,0.5)` blur 30-34px,
   opacity 0.16, `animation: breathe 9s ease-in-out infinite`.
5. **Capa de estrellas** (aria-hidden, recortada con `clip-path:ellipse(...)` al cielo):
   7 puntos `twinkle` + 2 (móvil) / 3 (PC) estrellas fugaces `shoot` (líneas 1.5px con
   gradiente, `translate3d` + rotate 25deg). Posiciones/duraciones: las del script del
   canvas (determinísticas por índice, copiarlas).
6. **Motas flotantes** (aria-hidden): 12 (móvil) / 16 (PC) puntos `rgba(216,232,222,0.85)`
   con glow suave, subiendo 130px en 9-21s (`mote`).
7. **Nav glass** (ver sección Nav).
8. **Columna de mensaje**: kicker mono espaciado → H1 Space Grotesk 700 (34px móvil /
   56px PC, `letter-spacing:-0.02em`, keyword en oro `#BDA36E`) → sub → CTA pill
   CLARO (`#f0ede8` fondo, texto `#0a0c0a`, radius 99px, halo
   `0 0 0 3px rgba(240,237,232,0.16)` + sombra) → micro-reaseguro mono → enlace
   "Ver servicios y precios ↓" en oro mono. Móvil lleva text-shadows para AA sobre foto.
9. **Card "Cero llamadas perdidas"** (glass: `rgba(8,10,9,0.55)` + blur 8px + borde
   `rgba(240,237,232,0.09)` + radius 14px): isotipo 17-18px + título SG 600 + body +
   link oro. PC: `right:96px; bottom:170px; width:300px`. Móvil: full-width sobre el
   riel inferior.
10. **Riel "CONSTRUIMOS CON"** al pie sobre gradiente de fundido: label mono 8.5-9.5px
    espaciado + wordmarks de `builtWith` en `rgba(240,237,232,0.58)`.

**Keyframes** (copiar del canvas, renombrando sin sufijo numérico):
`twinkle` (opacity .12→.9), `shoot` (translate3d 340px,158px rotate 25deg, visible solo
el 6% del ciclo), `mote` (sube 130px con fade), `breathe` (opacity .1→.3).
Todo es opacity/transform = compositable, cero canvas, cero rAF, cero JS de animación.
**TODO se apaga en `@media (--motion-reduce)`** (no replicar los props animaciones/
estrellas del canvas: en el sitio manda la media query).

## Nav: piel "glass", esqueleto INTACTO

El canvas usa los destinos REALES de SiteNav (Servicios · Portafolio · Precios ·
Ciudades · Nosotros · Blog + ES|EN + CTA «Propuesta gratis»). Decisión de nav del plan
maestro RESUELTA por el dueño: **esqueleto global, piel por página.**

- `SiteNav.astro` gana prop aditiva `skin?: 'glass'` (default = actual, cero cambios
  para el resto del sitio). La piel glass SOLO cambia presentación: barra flotante
  sobre el hero con `background:rgba(8,11,9,0.42); backdrop-filter:blur(12px);
  border:1px solid rgba(240,237,232,0.09); border-radius:16px (móvil) / 18px (PC)`,
  con margen respecto a los bordes (14px móvil / 22-48px PC).
- **Destinos, CTA, drawer, tracking (`proposal_requested` etc.), toggle de idioma y
  el wordmark `BrandType`: INTACTOS.** El wordmark no se restiliza (regla de logos).
- ⚠️ **Trampa conocida** (memoria del DS): `backdrop-filter` convierte al header en
  containing block de sus `position:fixed`. El velo y el drawer móviles ya viven FUERA
  del `<header>` (fix `8711117`+`c688eb2`): NO moverlos dentro al aplicar la piel.
- Móvil glass: la barra muestra marca + ES|EN + hamburguesa (como el artboard 12a);
  el conmutador ES|EN se hace visible en la barra en esta piel (hoy quizá viva solo
  en el drawer: cambio de visibilidad por CSS de la piel, no de estructura).
- La barra CTA fija inferior de móvil (global, política de CTAs) SIGUE: verificar en
  Chrome real que no se solapa con el riel "CONSTRUIMOS CON" (dar padding-bottom al
  hero móvil ≥ altura de la barra).

## Colores: tokens LOCALES del hero (tokens.css NO se toca)

Scoped en DomoHero (la expresión del hub, no la paleta global):
`--hst-gold: #BDA36E` (oro del hub, distinto a propósito del `--accent-gold` global),
`--hst-sage: 118,152,138` / `--hst-sage-glow: 172,216,192` (verde salvia del domo),
base `#060807`. El CTA pill CLARO es expresión aprobada por el dueño para este hub
(excepción consciente al CTA oro del DS; documentarla en `design/expresiones.md`
cuando ese archivo se cree). Texto y muted usan los tokens globales existentes.

## Imágenes: pipeline PSI (el LCP del hub)

1. Fuentes en `docs/galeria-src/` (las exporta el dueño, quedan fuera de git).
2. Script sharp (patrón de `scripts/resize-galeria.mjs`): generar en
   `public/assets/heros/` → `houston-domo-{1440,2200}.{avif,webp}` y
   `houston-domo-movil-{780}.{avif,webp}`. **Presupuesto duro: ≤150KB por variante
   servida above-the-fold** (bajar calidad AVIF hasta cumplir; la foto es oscura,
   debería caber con margen).
3. `<picture>`: `media="(min-width: 768px)"` → PC, si no → móvil; `width`/`height`
   explícitos (CLS 0), `fetchpriority="high"`, SIN lazy (es el LCP), `<link rel=
   "preload" as="image">` en el head de las 2 páginas Houston si Lighthouse lo pide.
4. **Enmienda a `DESIGN.md` §3 en este MISMO PR** (Decisión 1 del plan maestro,
   resuelta por el dueño al entregar concepto fotográfico): añadir a la regla de
   imágenes: "binarios permitidos SOLO para fotos/capturas reales del negocio o arte
   hero encargado y aprobado por el dueño, optimizados vía pipeline (AVIF/WebP,
   width/height explícitos, presupuesto PSI); stock genérico sigue prohibido."

## Detalles de contrato que NO se negocian

- Un solo `<h1>` por página (el del hero, desde `hero.h1` con `set:html`).
- El slot `breadcrumb` se conserva en DomoHero (el JSON-LD BreadcrumbList es contrato).
  El artboard no lo pinta: colocarlo discreto (mono pequeño muted) encima del kicker.
- `data-track` del CTA primario: conservar exactamente el que lleve hoy el CTA de
  CityHero (verificar en el código; si no lleva, no inventar).
- Tap targets ≥44px (`--tap-min`) en CTA, link de la card y controles de nav glass;
  `:focus-visible` con tokens; todos los overlays decorativos `aria-hidden="true"`.
- Contraste AA del texto sobre foto en AMBOS viewports (los oscurecedores y
  text-shadows del canvas existen para eso; si un texto queda dudoso, se oscurece el
  velo local, no se debilita el texto).
- Cero literales de contenido en el componente: todo por props desde el slice i18n.

## QA bloqueante antes de enseñar (gate de salida + Ojos)

1. Build completo verde + `git diff main --stat` SOLO con: DomoHero.astro (nuevo),
   es/houston.astro, en/houston.astro, houston.ts, houston.en.ts, SiteNav.astro
   (piel aditiva), DESIGN.md (enmienda §3), assets nuevos en public/assets/heros/,
   script de resize si se añade, y esta spec. Cualquier extra = STOP.
2. Los 19 enlaces del silo presentes en el HTML construido de ambas páginas; @graph +
   BreadcrumbList + ItemList intactos; un solo h1; meta sin cambios.
3. Lighthouse local móvil de `/es/houston`: **Perf ≥95** (el listón actual), CLS 0.
4. Reduced-motion: con `prefers-reduced-motion`, cero animaciones vivas.
5. **Chrome REAL** (no el pane): nav glass + drawer móvil (velo fuera del header),
   solape barra CTA fija vs riel inferior, y las animaciones con la pestaña VISIBLE.
6. Protocolo Ojos: mínimo 2 ciclos render→captura→crítica contra el ledger (E-01 luz,
   E-03 teal limpio, E-07/E-12 guiones, E-13 copy, E-14 paleta) y contra los
   artboards 12a/11a (fidelidad al concepto del dueño: el canvas manda).
7. Screenshots móvil + PC al dueño y **OK explícito ANTES de merge** (regla dura de
   heros). Deploy solo vía merge a main tras ese OK.
8. Al mergear: actualizar el roadmap (`_cerebro/marcyan-web/roadmap.md`) vía skill
   `roadmap` (Operación 2) y solicitar re-indexación de las 2 URLs en el sweep.
