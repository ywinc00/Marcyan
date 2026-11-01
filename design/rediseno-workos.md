# Rediseño WorkOS × Marcyan · Plan del director (registro del Art Director Gate)

> Documento de trabajo para los ejecutores. Manda sobre cualquier decisión de UI de la rama
> `feat/rediseno-workos` mientras dure el rediseño. Si choca con `DESIGN.md`, manda este archivo
> SOLO en los 11 cambios globales aprobados (§1.B); en todo lo demás manda `DESIGN.md`.
> Fuentes: plan del juez (`scratchpad/workos/plan-final.json`), mapas `scratchpad/rw/mapa-{sistema,landings,hubs,portada,workos}.md`,
> inventario de 340 fichas con recortes (`scratchpad/workos/cat/<grupo>/inventario.json`), registro de errores
> (`~/.claude/skills/design-director/errores-ledger.md`, E-01 a E-54), catálogo (`~/.claude/skills/design-catalog/patrones/`).
> Ruta base de recortes: `C:/Users/Yan/AppData/Local/Temp/claude/C--Users-Yan-Area-de-Trabajo-Proyectos-Personal-MarcYan-Marcyan-Web/033700da-d51e-4e8b-9b19-8217e6add10b/scratchpad/workos/cat/` (abreviada `cat/`).

---

## 0 · Cabecera del gate

| Campo | Valor |
|---|---|
| Proyecto | Marcyan Studio, sitio propio (`marcyanstudio.com`), Astro + i18n ES/EN |
| Página | Rediseño de todo el sitio interior (18 tipos de página, 48 URL listadas en `scripts/w/urls.json`) + detalles permitidos en portada (/es, /en) y hubs de ciudad (/es\|en/houston, /es\|en/miami) |
| Modo | **REDISEÑO** sobre identidad existente (no IDENTIDAD): se conserva marca, paleta, tipografías, pie y los dos viajes; se importan los ELEMENTOS de workos.com (E-54) re-tematizados a la noche Marcyan |
| Rama | `feat/rediseno-workos` (worktree `.claude/worktrees/workos`, base `origin/main` @ `1ad9f9f`). Nada se mergea ni se publica en producción: se entrega en vista previa con antes/después |
| Estado | **VALIDADO por el dueño 2026-11-01** en chat: "apruebo todos los cambios globales y lo que propones", con la condición de que la portada (el viaje en el universo de la marca) y los viajes de Houston y Miami se queden IGUAL, y que en ellos solo cambien detalles menores (cómo se muestran los proyectos, el diagnóstico de IA, las tarjetas y similares). Pidió planificar todo antes de codificar, rama propia, preview y antes/después |
| Correcciones del director ya decididas | E-32 (abanico con 3 webs de EJEMPLO nuestras; branding con marca de EJEMPLO), E-49 (siluetas reales vectorizadas; calles de barrio de datos reales), E-03/E-14 (sin halos teal, un acento por zona, chat de Marcy legible en claro), E-12 (la raya de la cabecera numerada es un filete dibujado, no un carácter), E-23 (todo acordeón cerrado), §2.14 (H1 congelados) |
| Revisión 1 | 2026-11-01: aplicadas las críticas de gusto, seguridad y ejecución (bloqueantes, importantes y menores baratas). Registro en §9; lo no aplicado, con su porqué, en §8 |

### 0.1 Piezas del catálogo nombradas (obligatorio antes de proponer)

| Código | Pieza | Dónde y por qué |
|---|---|---|
| **A-05** | Apertura con producto vivo | Todos los heros de servicio enseñan el objeto del servicio funcionando (abanico de webs, lista de pedidos, ficha de Google, esclusa de Marcy, escáner). Es la traducción directa de la regla E-34: la primera pantalla cuenta el mecanismo, la atmósfera va detrás. En diagnóstico es literal (formulario en el hero) |
| **A-12** | Entrada escalonada del hero | La coreografía única (§2.9): textos 1.1 s escalonados .1/.3/.4 s, objeto a .5 s, satélites desde detrás. Una sola curva por canal (E-52) |
| **A-04** | Cabecera compacta de página interna | Hubs de venta (servicios, precios, ciudades, herramientas, blog) usan cabecera centrada solo texto con tarjetas asomando (W-CONV-01), no un hero alto clónico (E-05, DESIGN §2/§8.1) |
| **B-08** | Escalera de paquetes | "Hazla tuya" Landing / Rediseño / A medida (W-CORE-06) y "De la marca a todo lo demás" en branding. Precios solo de `pricing.ts` |
| **B-03** | Bento con celda dominante | "Más que una web" y "Un capítulo por servicio" (W-CORE-08) en celdas de 600 px separadas por líneas de 1 px, cada celda con su mini-UI; rompe el grid de 3 tarjetas (E-04) |
| **F-01** | Escala de tiempos y curvas | Tokens `--w-dur-*` / `--w-ease-*` (§2.1). La única excepción por encima de 480 ms es la entrada del hero (1.1 s) y los bucles firma, aprobadas por el dueño |
| **F-02** | Contrato de reduced-motion | Cada pieza declara su estado quieto final (§2.10); la red `!important` de `base.css` no basta porque congelaría elementos en opacidad 0 |
| **F-04** | Revelado al entrar en pantalla, una sola vez | Secciones bajo el pliegue: subida 16 px + opacidad, 480 ms, una vez (`[data-w-reveal]`) |
| **F-05** | Panel fijo que explica por pasos | "Cómo se construye tu web" (W-CORE-05): demo pegajosa de 544 px que pasa de esqueleto a web terminada |
| **F-06** | Bucle ambiental y capas lentas | UNA animación firma por página en el objeto principal, pausada fuera de pantalla y con pestaña oculta (`w/loop.ts`) |
| **G-10** | Profundidad por capas: elevación tintada y filo de luz | Bandejas y objetos sin sombra negra: filo superior `inset 0 1px 0 rgba(255,255,255,.08)` + borde 1 px oro al 9 % |
| **H-06** | Rampa de superficies de cinco niveles | Noche → bandeja → objeto → objeto activo + línea/línea fuerte (§2.4). Es el ritmo blanco / gris perla / oscuro de WorkOS traducido a la noche (E-01: la luz se distribuye) |
| **H-05** | Etiqueta monoespaciada como firma de sección | Cabecera numerada "01 · QUÉ INCLUYE" en JetBrains Mono oro (W-NEW-32), evolución del kicker |
| **H-07** | Presupuesto del color de acento | Oro ~7 % / teal ~3 %; UN solo elemento en degradado oro→teal por página; un acento por bloque (E-14) |
| **I-02** | Bloque de respuesta directa | Se conserva el texto verbatim (AEO) pero deja de ser el 2.º bloque: franja "En pocas palabras" ligera (W-CORE-23) que vive justo antes de la FAQ, como en WorkOS, y nunca en las dos primeras posiciones tras el hero (queja registrada del dueño, 2026-09-03) |
| **I-03** | Acordeón nativo de preguntas | FAQ en tarjetas sueltas 776 px (W-CONV-11) sobre `<details>` nativo, todas cerradas al cargar (E-23) |

---

## 1 · Inventario de marca

### 1.A CONSERVADO (no se toca, se verifica que no cambió)

| Elemento | Dónde vive | Regla |
|---|---|---|
| Wordmark de la nav | `BrandType` dentro de `.nav__logo` y del drawer (`src/components/layout/SiteNav.astro`) | Intacto. Los 3 logos no se unifican (nav texto / logo de empresa del schema / favicon) |
| Logo de empresa | `Organization.logo` en el `@graph` de `src/layouts/Layout.astro` | Intacto. Puede usarse como objeto en el hero de Sobre nosotros (W-PROOF-16) |
| Favicon | `<link rel="icon">` | Intacto |
| Paleta | `src/styles/tokens.css`: noche `--bg-base #080808`, `--bg-2 #0e0e0d`, `--bg-card #141414`, `--bg-elevated #1c1c1c`; oro `--accent-gold #c8a96e` (+ `-deep #8a6630`, `-dim .15`, `-line .30`, `-glow .25`); teal `--accent-teal #4fc3a1` (+ `-dim`, `-line`); texto `--fg-primary #f0ede8`, `--fg-secondary #9a9590` | **`tokens.css` NO se edita.** Lo nuevo se declara aparte (§2.1) y siempre deriva de estos valores |
| Tipografías | Space Grotesk Variable (display), DM Sans Variable (cuerpo), JetBrains Mono Variable (datos/etiquetas), Fontsource en `Layout.astro` | Sin familias nuevas (Suisse/Untitled Sans de WorkOS descartadas). Solo cambia escala, peso y tracking |
| Pie "El Arribo" | `src/components/layout/SiteFooter.astro` + StarField `data-fx="gold"` + slot `scape` (CityScape) | Intacto, en todas las páginas |
| Portada: el viaje | `src/components/sections/Hero.astro` (archivo entero, 1-369), `src/components/StarField.astro`, `hero.nodes`/`h1`/`tag`/`sub` de `src/i18n/content.ts` (ES 43-59, EN 275-288), montaje de `src/pages/{es,en}/index.astro` (orden de secciones), cohete del Proceso (`sections/Process.astro`) | Intacto. Solo detalles permitidos (§4.1) |
| Hubs de ciudad: el viaje | `src/components/city/` entero salvo el CONTENIDO de las secciones permitidas de `CityHub.astro` (§4.2): `hero.js`, `atmo.js`, `clouds.js`, `cities.js`, `CityScape.astro`, portada fija y globo (CityHub 39-77), mapa local (176-202 + `page.js` 157-284), todas las marcas `data-atmo` (48, 82, 87, 126, 177, 225, 228, 245, 274, 288) | Intacto. Los contenedores con `data-atmo` se conservan con altura parecida aunque cambie su interior |
| Botón principal | `ui/Button.astro` `variant="primary"`: oro, radio 8, DM Sans 600, min-h 44, md 10×22/13 px, lg 14×28/16 px, hover +10 % blanco + glow, `:active scale(.97)`, `[data-state=done]` teal | Intacto con sus 5 estados (§2.7) |
| Atmósfera | `SpaceBackdrop.astro` (landings/secciones), `StarField` (portada y pie) | Se mantiene la regla "uno u otro por página" (DESIGN §1). No se añade ningún canvas nuevo |
| Formularios y su lógica | `sections/Contact.astro` (`#contacto`, `home-contact-form`, `website_hp`, `/api/contact`), `/api/brief`, `growthos/DiagnosticWizard.astro` (máquina de estados, `data-*`), `sections/RailCta.astro` | Contrato intacto; solo piel nueva donde se diga. Formularios sin precios |
| Contratos SEO | canonical, hreflang (`src/i18n/routes.ts`), JSON-LD (Service, FAQPage, BreadcrumbList, OfferCatalog, ItemList, CollectionPage, AboutPage, Blog, BlogPosting), `meta.*`, `path`, `breadcrumb`, `answer.*`, `faq.*`, `local.paragraphs`, `service.*`, trío de `CtaBand` | Se protegen todos (§6) |
| Precios | `src/i18n/pricing.ts` (`PRICE_ANCHORS`, fuente única, paridad con `lib/chat-kb.mjs`) | No se añade ni cambia ningún precio |

### 1.B ELEVADO (los 11 cambios globales aprobados)

| # | Cambio | ANTES | DESPUÉS | Alcance |
|---|---|---|---|---|
| G1 | Escala de titulares | H1 Space Grotesk 700 80 px (landings) / 64 px (hubs), tracking -3 %; H2 48/600 | H1 landing 58/500/-4 %; H1 hub 52/500/-5 %; H1 noche 60-72/500; H2 capítulo 52/500 centrado en 2 frases; H2 sección 40/500; H3 24/500; bajada 19-20/1.5 al 80 % en 520 px. Solo pesos 400 y 500 | Páginas `data-ds="v3"`; portada y hubs NO (§2.13) |
| G2 | Eyebrow de servicio grande en color | Kicker mono 11 px con raya + chip de ciudad | Nombre del servicio en Space Grotesk 24-28/500 oro (teal en IA) sobre el H1; la ciudad pasa a chip mono pequeño; el mono queda para etiquetas de objetos y cabeceras numeradas | Heros nuevos |
| G3 | Superficies: noche + bandeja + un bloque de contraste | Una sola superficie `#080808` con SpaceBackdrop | Noche con estrellas · bandeja (radio 22, padding 16, borde 1 px oro 9 %) que contiene objetos · UN capítulo de contraste por página (superficie elevada o amanecer oro desde abajo) | v3 |
| G4 | Raíles y celdas de 1 px | Tarjetas sueltas con sombra | 2 líneas verticales de 1 px a los lados del contenedor de 1200; rejillas separadas por líneas de 1 px, sin sombra; tarjetas solo para objetos | v3 |
| G5 | Objeto del servicio en cada sección (enmienda DESIGN §3) | Ilustración de línea teórica, en la práctica iconos | Cada sección enseña una mini-UI redibujada (web en móvil, ficha de mapa, chat de Marcy, pedidos, plano de marca, respuesta de asistente…) con datos de EJEMPLO rotulados, y capturas REALES solo en prueba/casos | v3 |
| G6 | Iconos-objeto propios por servicio (enmienda DESIGN §0/§8.4) | Lucide outline 16-20 px | 7 iconos-objeto en relieve propio con glifo de una familia con licencia (§2.8, E-27), uno por producto de `pricing.ts`, 40-80 px; Lucide sigue para UI funcional (flechas, teléfono, check, menú, migas) | v3 + megamenú + tarjetas de servicio de portada y hubs |
| G7 | Botón secundario como enlace con chevron | Botón con caja (`secondary`) | Texto 16/500 + "›" que se desplaza 3 px en 200 ms. Variante NUEVA `variant="link"`; `secondary` y `ghost` no cambian (los usan portada y hub) | v3 |
| G8 | "Respuesta directa" bajada a franja | Caja grande de 2.º bloque | Franja "En pocas palabras" ligera, justo antes de la FAQ (nunca 1.ª ni 2.ª sección tras el hero), texto verbatim | v3; en hubs de ciudad se queda en su sitio actual del viaje, dentro de su `data-atmo` |
| G9 | Coreografía de entrada única | Planeta con órbita repetido en cada hero + entradas sueltas | §2.9: una sola coreografía, listo a ~2.2 s, quieta con reducir movimiento | Heros v3 (nunca `.hero` de portada ni `.hx`) |
| G10 | Megamenú de Servicios | Nav plana | "Servicios" sigue siendo enlace y gana a su lado un botón-chevron que abre un panel de ~900 px con los 7 iconos-objeto; "Recursos" (Blog, Diagnóstico, Calculadoras) es la 3.ª columna de ese panel y la barra conserva sus 6 enlaces; en móvil hoja con SERVICIOS / CIUDADES / RECURSOS y Llamar + WhatsApp al pie. Wordmark y alto de la barra intactos | Global (también portada y hubs, con verificación §2.13); se publica en la última tanda (§7.3-1) |
| G11 | Degradado oro→teal en UN elemento por página | Palabra de acento en oro sólido | `linear-gradient(45deg, #c8a96e, #4fc3a1)` recortado al texto en UNA frase (o en la cifra de precio W-CORE-14, que entonces cuenta como el único) por página | v3 |

Además, ya decididos sin pasar por el dueño (no tocan tokens): cabecera numerada (W-NEW-32), titular a dos tonos (W-ADV-32: SOLO en H2 de capítulo, 1.ª frase al 45 %, 2.ª al 100 %; nunca en el H1), bucle firma por página, cierre en dos tarjetas por temperatura (W-CORE-15), hermanos de la misma ciudad (W-ADV-40), objeto visible en móvil (W-CORE-41), regla de prueba honesta.

Revisión 1 (E-15, E-31): sumadas, estas piezas más los 4 radios, las texturas (trama, franjas, amanecer), los objetos de producto en claro (§2.4) y la etiqueta "Ejemplo" son gramática nueva. Se enseñan al dueño en el **Punto de control 1** como lámina "sistema nuevo", anexo de G3/G4, y su OK se apunta en §0 antes de abrir la ola 1.

### 1.C PROHIBIDO

- Tocar `Hero.astro`, `StarField.astro`, `src/components/city/{hero,atmo,clouds,cities}.js`, `CityScape.astro`, `SiteFooter.astro`, `tokens.css`, `base.css`, `media.css`, `ui/Kicker.astro`, las variantes `primary/secondary/ghost/teal` de `Button.astro`, `hero.nodes`/`h1`/`sub`/`tag` de portada.
- Cambiar textos congelados: `meta.title/description`, `path`, `breadcrumb`, `hero.h1` (§2.14), `answer.q/a/source`, `faq.items`, `local.paragraphs`, `service.*`, precios.
- Tema claro (W-HOME-21, W-NEW-11, W-CONT-53): la marca es noche. Los objetos de producto en claro cálido (§2.4) no son tema claro: son piezas dentro de la noche, como el chat de Marcy.
- Píldora índigo y botones mono rectos de WorkOS (W-HOME-18, W-CONV-54, botones de W-NEW-30): la gramática de botones es la del sitio.
- Arcoíris de WorkOS (W-CONV-12, W-CONV-44, W-CORE-31): como mucho oro→teal en un elemento.
- Capturas de webs de clientes como arte de hero o de objeto (E-32). Solo en portafolio (arriba) y en secciones de prueba/caso.
- Logo, nombre o paleta de un cliente como "marca de ejemplo" (E-32, E-47).
- Nombres de negocios inventados que puedan coincidir con uno real: los ejemplos se llaman "Tu Plomería", "Tu Salón", "Tu Restaurante", "Tu Negocio", "Tu Marca" y llevan la etiqueta "Ejemplo".
- Logotipos de Google, WhatsApp, ChatGPT u otras marcas de terceros dibujados como si fueran nuestra interfaz: los canales se nombran en texto y con iconos Lucide genéricos (`message-circle`, `globe`, `instagram` solo si Lucide lo trae, `map-pin`). La ficha de mapa es "ficha de mapa de ejemplo", sin el logotipo de Google.
- Cifras, reseñas, testimonios, sellos o certificaciones inventados (W-CORE-11, W-CONV-48, W-PROOF-04, W-PROOF-25 con medallones): solo hechos verificables.
- Halos o `text-shadow` en teal (E-03). Oro y teal compitiendo en el mismo bloque (E-14), salvo el único elemento degradado.
- Guion largo o raya como carácter conector o decorativo en texto visible (E-07, E-12). La "raya" de la cabecera numerada es un filete CSS de 24×1 px.
- Muros de logos o baldosas (W-PROOF-02, W-HOME-08…): con 4 clientes se ven vacíos.
- Horizonte de planeta en landings (W-CONV-24, W-HOME-12): es firma de portada y pie.
- Capas fijas a pantalla completa con `mix-blend-mode` o `filter` (E-43); animar `box-shadow`, `clip-path`, `width`, `top`, `background-position`.
- Animaciones atadas a un recorrido largo de scroll (E-50): el icono que cae (W-ADV-04) se dispara una vez.
- Acordeones abiertos al cargar (E-23), incluidos FAQ y sedes.
- Formularios nuevos sin puerta técnica completa (la suscripción del blog NO se construye en este rediseño, §4.7).
- Crear páginas o rutas nuevas indexables (las únicas rutas nuevas son los muestrarios `src/pages/es/w-muestrario.astro` y `w-muestrario-base.astro`, `noindex` y filtrados del sitemap en `astro.config.mjs`, §3.7, que se borran con su filtro antes de cualquier merge).
- Estrellas o valoraciones dibujadas en objetos de ejemplo, aunque no lleven número: se leen como reseña.
- Muestrear colores de las webs de clientes: el color de un proyecto es su `accent` de `portfolio.ts` (`gold`/`teal`), E-47.

### 1.D FUERA DE ALCANCE (sin tocar; solo heredan el megamenú)

`/es/kit`, `/es/kit-diseno`, `/en/kit`, `/es/formulario`, `/en/project-brief`, legales (`/es/privacidad`, `/es/terminos`, `/en/privacy`, `/en/terms`) y `/dashboard`. Nadie las "arregla". Entran en la tira de capturas de 0B-6 (megamenú y drawer sobre esas plantillas, con `showCtaBar={false}` donde ya lo usan) para que el dueño vea la mezcla con aviso.

---

## 2 · Sistema nuevo (valores exactos)

### 2.1 Tokens nuevos · `src/styles/w-tokens.css` (archivo nuevo, solo declara variables en `:root`, no pinta nada)

`src/styles/global.css` solo gana UNA línea al final: `@import './w-tokens.css';` (variables, pocas líneas). **`w.css` NO entra en `global.css`**: `astro.config.mjs` tiene `build.inlineStylesheets: 'always'` (línea 46), así que todo lo de `global.css` se incrusta en el HTML de cada página, portada y hubs incluidos. `w.css` se importa desde `src/components/w/WStyles.astro`, que solo montan `WLanding` y las páginas v3, y Astro lo incluye solo donde se usa. Presupuesto: el HTML de `/es` y `/es/houston` crece como mucho +6 KB comprimido (tokens + megamenú + sprite), medido en §6.6.

```css
:root {
  /* ── Tipografía (Space Grotesk, pesos 400/500) ── */
  --w-h1:          clamp(2.25rem, 1.35rem + 2.6vw, 3.625rem);  /* 36 → 58 */
  --w-h1-hub:      clamp(2rem,    1.30rem + 2.2vw, 3.25rem);   /* 32 → 52 */
  --w-h1-night:    clamp(2.5rem,  1.40rem + 3.4vw, 4.5rem);    /* 40 → 72 (IA, SEO para IA) */
  --w-h2-chapter:  clamp(1.875rem,1.10rem + 2.4vw, 3.25rem);   /* 30 → 52 */
  --w-h2:          clamp(1.75rem, 1.20rem + 1.6vw, 2.5rem);    /* 28 → 40 */
  --w-h2-small:    clamp(1.5rem,  1.20rem + 0.9vw, 2rem);      /* 24 → 32 (FAQ, demos) */
  --w-h3:          1.5rem;                                      /* 24 */
  --w-h4:          1.25rem;                                     /* 20 */
  --w-eyebrow:     clamp(1.125rem, 0.90rem + 0.7vw, 1.75rem);  /* 18 → 28 */
  --w-lead:        clamp(1.0625rem, 1rem + 0.3vw, 1.25rem);    /* 17 → 20 */
  --w-body:        1rem;                                        /* 16 */
  --w-small:       0.875rem;                                    /* 14 */
  --w-micro:       0.75rem;                                     /* 12, mono */
  --w-lh-h1: 1.02;  --w-lh-h1-hub: 1.07; --w-lh-h2c: 1.08; --w-lh-h2: 1.1;
  --w-lh-h3: 1.2;   --w-lh-lead: 1.5;    --w-lh-body: 1.6;
  --w-tr-h1: -0.04em; --w-tr-h1-hub: -0.05em; --w-tr-h2c: -0.055em; --w-tr-h2: -0.04em;
  --w-tr-h3: -0.02em; --w-tr-eyebrow: -0.02em; --w-tr-micro: 0.1em;
  --w-weight-head: 500; --w-weight-text: 400;

  /* ── Tinta (derivada de --fg-primary #f0ede8) ── */
  --w-ink:     var(--fg-primary);
  --w-ink-80:  rgba(var(--star-rgb), .80);  /* bajada */
  --w-ink-70:  rgba(var(--star-rgb), .70);  /* texto de objeto */
  --w-ink-60:  rgba(var(--star-rgb), .60);  /* mínimo para texto de 14-16 px (≈6.4:1 sobre noche) */
  --w-ink-45:  rgba(var(--star-rgb), .45);  /* SOLO 1.ª frase de H2 de capítulo ≥ 28 px (≈3.9:1, AA grande); nunca en el H1 ni en su cola */
  --w-ink-55:  rgba(var(--star-rgb), .55);  /* suelo de las filas apagadas del registro en bucle */
  --w-ink-30:  rgba(var(--star-rgb), .30);  /* solo decoración (rayas, cuadrícula); nunca texto ni estados */

  /* ── Líneas ── */
  --w-line:        rgba(var(--accent-gold-rgb), .09);  /* raíles, celdas, bordes de bandeja */
  --w-line-strong: rgba(var(--accent-gold-rgb), .18);  /* hover, activo */
  --w-line-ink:    rgba(var(--star-rgb), .08);         /* divisores dentro de objetos claros */

  /* ── Superficies (rampa H-06 sobre la noche) ── */
  --w-s0: var(--bg-base);                               /* noche + estrellas */
  --w-s1: #121211;                                      /* bandeja OPACA (texto sobre patrón, E-37) */
  --w-s2: #181817;                                      /* objeto de sistema / tarjeta en bandeja */
  --w-s3: #1f1f1d;                                      /* objeto activo / fila central */
  --w-s1-a: rgba(var(--star-rgb), .035);                /* bandeja translúcida, SOLO sobre noche lisa */
  --w-s2-a: rgba(var(--star-rgb), .06);                 /* tarjeta translúcida, SOLO sobre noche lisa (hub) */
  --w-p-bg: #f0ede8; --w-p-ink: #0e0e0d; --w-p-ink-2: #4a4743; --w-p-line: rgba(14,14,13,.08); /* objetos de producto en claro (§2.4) */
  --w-s-solid: var(--bg-elevated);                      /* paneles opacos (megamenú, tarjeta de formulario) */
  --w-edge: inset 0 1px 0 rgba(255,255,255,.08);        /* filo de luz G-10 */
  --w-contrast-bg: var(--bg-elevated);                  /* capítulo de contraste A */
  --w-dawn: radial-gradient(120% 60% at 50% 100%, rgba(var(--accent-gold-rgb), .22) 0%,
            rgba(var(--accent-gold-rgb), .08) 38%, transparent 70%);  /* capítulo de contraste B (amanecer) */
  --w-dawn-teal: radial-gradient(120% 60% at 50% 100%, rgba(79,195,161,.14) 0%,
            rgba(79,195,161,.05) 38%, transparent 70%);  /* amanecer de páginas de IA (E-14: nunca oro en página teal) */
  --w-dots: radial-gradient(rgba(var(--accent-gold-rgb), .16) 1px, transparent 1.2px) 0 0 / 24px 24px; /* trama de puntos */
  --w-stripes: repeating-linear-gradient(180deg, rgba(var(--accent-gold-rgb), .14) 0 1px, transparent 1px 5px); /* franjas de luz */

  /* ── Radios ── */
  /* 4 radios (revisión 1, I-15). Las medidas de radio de los recortes se llevan al token más cercano:
     ≤ 8 → 8 · 10-16 → 12 · 18-28 → 22 · ≥ 40 → 44; píldoras 999 */
  --w-r-cell: 8px;  --w-r-obj: 12px;  --w-r-tray: 22px;  --w-r-feature: 44px;

  /* ── Espacio y layout ── */
  --w-rail-max: 1200px;
  --w-rail-x: max(16px, calc(50% - var(--w-rail-max) / 2)); /* se resuelve donde se usa (left/right dentro de .w-rails):
                                                               50 % = ancho del main SIN la barra de Windows; nunca 100vw */
  --w-pad-tray: 16px;  --w-gap-tray: 14px;
  --w-section-y: clamp(80px, 4rem + 3vw, 120px);
  --w-chapter-gap: 80px;          /* cabecera de capítulo → rejilla */
  --w-hero-top: calc(var(--nav-h) + clamp(48px, 2rem + 3vw, 96px));
  --w-gap-eyebrow: 12px; --w-gap-h1: 16px; --w-gap-lead: 24px;

  /* ── Degradado único ── */
  --w-grad: linear-gradient(45deg, var(--accent-gold) 0%, var(--accent-teal) 100%);

  /* ── Movimiento (F-01 + coreografía aprobada) ── */
  --w-ease-text:  cubic-bezier(.33, 1, .68, 1);     /* entrada de textos y objeto */
  --w-ease-sat:   cubic-bezier(.45, 0, .2, 1);      /* satélites que salen de detrás */
  --w-ease-loop:  cubic-bezier(.645, .045, .355, 1);/* listas que suben */
  --w-ease-stack: cubic-bezier(.77, 0, .175, 1);    /* pila de interruptores */
  --w-ease-ui:    cubic-bezier(.4, 0, .2, 1);       /* hover, megamenú, pestañas */
  --w-ease-out:   cubic-bezier(.2, 0, 0, 1);        /* revelado de sección */
  --w-dur-micro: 150ms; --w-dur-hover: 200ms; --w-dur-ui: 320ms; --w-dur-reveal: 480ms;
  --w-dur-text: 1100ms; --w-dur-obj: 950ms; --w-dur-sat: 1800ms; --w-dur-layer: 500ms;
  --w-d1: 100ms; --w-d2: 300ms; --w-d3: 400ms; --w-d-obj: 500ms; --w-d-sat: 750ms;
  --w-rise: 12px; --w-rise-section: 16px;
}
```

Nota de calibración: `--w-tr-h2c` arranca en -0.055em (WorkOS mide -6 %, pero Space Grotesk ya es estrecha); el ejecutor de la ola 0 lo fija mirando la primera captura (mínimo -0.03em, nunca letras que se toquen).

### 2.2 Clases nuevas · `src/styles/w.css` (archivo nuevo, todo bajo `:root[data-ds="v3"]`, cargado solo en páginas v3 desde `w/WStyles.astro`; los componentes que viven fuera de v3 no usan estas clases, Cerrojo 5)

| Clase | Valores |
|---|---|
| `.w-h1` | `font: var(--w-weight-head) var(--w-h1)/var(--w-lh-h1) var(--font-display); letter-spacing: var(--w-tr-h1); text-wrap: balance; color: var(--w-ink)` |
| `.w-h1--hub` / `.w-h1--night` | mismas reglas con `--w-h1-hub`/`--w-lh-h1-hub`/`--w-tr-h1-hub` y `--w-h1-night` (lh 1.04, tracking -0.045em) |
| `.w-h1__tail` | `<p>` inmediatamente después del `<h1>`, mismo tamaño, peso y tono que el H1 (tinta 100 %), o en `.w-grad-text` si es la frase degradada de la página; margen superior 0. El 45 % NO se usa aquí (en WorkOS el H1 es de un tono). Regla de longitud de §2.14 |
| `.w-h2--chapter` | 52/1.08/500, tracking `--w-tr-h2c`, centrado, `max-width: 18ch`; `<span class="w-tone">` envuelve la 1.ª frase (al 45 %) |
| `.w-h2` | 40/1.1/500, tracking -0.04em |
| `.w-h3` / `.w-h4` | 24/1.2/500 -0.02em · 20/1.25/500 -0.01em |
| `.w-lead` | `--w-lead`/1.5, `--w-ink-80`, `max-width: 32.5rem` (520 px) |
| `.w-eyebrow` + `--gold` / `--teal` | Space Grotesk 500 `--w-eyebrow`, tracking -0.02em, color acento; nunca mayúsculas |
| `.w-chip-city` | JetBrains Mono 12/500, mayúsculas, +0.1em, padding 4×10, radio 100, borde 1 px `--w-line-strong`, color `--w-ink-70`, icono `lucide:map-pin` 12 px |
| `.w-label` | JetBrains Mono 12/500 mayúsculas +0.1em, `--w-ink-60` (etiquetas dentro de objetos; nunca contenido que se tenga que leer: E-40) |
| `.w-tray` | `background: var(--w-s1-a)` sobre noche lisa, o `var(--w-s1)` (opaco) si detrás corre un patrón (E-37); `border: 1px solid var(--w-line); border-radius: var(--w-r-tray); padding: var(--w-pad-tray); box-shadow: var(--w-edge)` |
| `.w-obj` | objeto de sistema: `background: var(--w-s2)` (opaco); `border: 1px solid var(--w-line); border-radius: var(--w-r-obj); box-shadow: var(--w-edge)` |
| `.w-obj--product` | objeto de producto (§2.4): `background: var(--w-p-bg); color: var(--w-p-ink); border: 1px solid var(--w-p-line); border-radius: var(--w-r-obj)`; texto secundario `--w-p-ink-2`; el acento solo como relleno de botón o estado |
| `.w-contrast` | capítulo de contraste A: sección a ancho completo `background: var(--w-contrast-bg)` con raíles en `--w-line-strong`; **una por página** |
| `.w-dawn` | capítulo de contraste B: `background: var(--w-dawn)` (o `--w-dawn-teal` en páginas de IA) anclado al 30 % inferior de la sección (CSS puro, sin canvas); una por página y excluyente con `.w-contrast` |
| `.w-rails` | contenedor de página: `position: relative`; `::before/::after` líneas verticales de 1 px `--w-line` en `left/right: var(--w-rail-x)`, `top:0; bottom:0`, `pointer-events:none`; en `--lt-md` a 16 px del borde |
| `.w-cell` | sección-celda: `border-top: 1px solid var(--w-line)`; `padding-block: var(--w-section-y)`; contenido a 1200 |
| `.w-cells` | rejilla con líneas: `display:grid; gap:1px; background: var(--w-line)`; hijos `background: var(--w-s0)` (la línea es el hueco); padding de celda 48 px (32 en móvil) |
| `.w-link` | ver §2.7 |
| `.w-grad-text` | `background: var(--w-grad); -webkit-background-clip: text; background-clip: text; color: transparent;` fallback `@supports not (background-clip:text) { color: var(--accent-gold) }` |
| `.w-example` | etiqueta "Ejemplo": JetBrains Mono 12/500 (también en móvil: sostiene la regla de honestidad) mayúsculas +0.1em, padding 3×8, radio 8, fondo `rgba(var(--star-rgb),.06)`, borde 1 px `--w-line-ink`, color `--w-ink-80` (en objetos claros: `--w-p-ink-2` sobre `rgba(14,14,13,.06)`); posición fija arriba a la derecha de cada objeto inventado, nunca tapada por un bucle (prueba E-18) |
| `.w-container` | `width: min(100% - 32px, var(--w-rail-max)); margin-inline: auto` |
| `.w-hero` | `padding-top: var(--w-hero-top)` (reserva la nav: estos heros no usan `.section`, riesgo 6 del mapa del sistema) |

### 2.3 Escala tipográfica (tabla de uso)

| Rol | Escritorio 1440 | Móvil 390 | Peso | Tracking | Interlineado | Color |
|---|---|---|---|---|---|---|
| H1 landing (hero de producto) | 58 | 36 | 500 | -4 % | 1.02; H1 + cola ≤ 2 líneas a 1440, ≤ 4 a 390 | ink 100 % (cola igual) |
| H1 hub / página de sección | 52 | 32 | 500 | -5 % | 1.07 | ink |
| H1 noche (IA, SEO para IA) | 60-72 | 40 | 500 | -4.5 % | 1.04 | ink |
| Eyebrow de servicio | 28 (24 en heros partidos) | 18 | 500 | -2 % | 1.1 | oro / teal |
| Bajada de hero | 20, máx 525 px | 16 | 400 | 0 | 1.5 | ink 80 % |
| H2 de capítulo (2 frases) | 52, centrado | 30 | 500 | -5.5 % | 1.08 | 1.ª frase 45 %, 2.ª 100 % |
| Sub de capítulo | 20, máx 520 | 16 | 400 | -1 % | 1.6 | ink 80 % |
| H2 de sección | 40 | 28 | 500 | -4 % | 1.1 | ink |
| H2 pequeño (FAQ, demos, celdas grandes) | 32 | 24 | 500 | -3 % | 1.2 | ink |
| H3 / título de celda | 24 | 20 | 500 | -2 % | 1.2 | ink |
| Título de tarjeta | 20 | 18 | 500 | -1 % | 1.25 | ink |
| Cuerpo | 16 | 16 | 400 (DM Sans) | 0 | 1.6 | `--fg-secondary` |
| Texto de objeto | 14-15 | 14 | 400/500 | 0 | 1.45 | ink 70-100 % |
| Etiqueta mono | 12 | 11 | 500 | +10 % | 1.2 | ink 60 % u oro |
| Lectura de artículo | 19 / 1.65 en 680 px | 17 / 1.65 | 400 | 0 | 1.65 | ink 90 % |

Espaciados verticales: eyebrow→H1 12 · H1→cola 0 · cola→bajada 16 · bajada→botones 24 · botones→objeto 64 (centrado) · sección `--w-section-y` (120 escritorio / 80 móvil) · cabecera de capítulo→rejilla 80 · rejillas 96 entre columnas y 48-75 entre filas.

### 2.4 Superficies

| Nivel | Token | Uso | Contiene |
|---|---|---|---|
| Noche | `--w-s0` + SpaceBackdrop | fondo de página | bandejas, celdas, heros |
| Bandeja | `--w-s1`, borde `--w-line`, radio 22, padding 16, filo | contenedor de objetos (hermanos, pasos, mini-UI) | objetos |
| Objeto de sistema | `--w-s2` OPACO, borde `--w-line`, radio 12, filo | esclusa, radar, matriz, registro, túnel, plano, escáner, chip de barrio, precio, caso | contenido del objeto |
| Objeto de producto | `.w-obj--product`: claro cálido `--w-p-bg` (#f0ede8), texto `--w-p-ink`/`--w-p-ink-2`, borde `--w-p-line`, radio 12 | lo que vería el cliente del cliente: web de ejemplo, ficha de mapa, pedidos, interruptores, respuesta de asistente, chat de Marcy, mini pasos, solicitud de oficio | contenido del objeto |
| Objeto activo | `--w-s3`, borde `--w-line-strong` | fila central de bucle, opción activa de escalera, hover | — |
| Contraste | `.w-contrast` (`--bg-elevated` a sangre) **o** `.w-dawn` (amanecer oro abajo; teal en páginas de IA) | UN capítulo por página (lista por página en §4) | celdas y objetos |
| Opaco | `--w-s-solid` | megamenú, tarjeta de formulario, ventana de chat | — |

Regla de anidamiento H-06: un nivel solo contiene el siguiente. Regla E-01: ninguna losa de noche cruda mayor que media pantalla sin estrellas, trama, franjas o un objeto; se comprueba en la captura de cada página (pregunta escrita "¿dónde está la luz en cada sección?").

**Dos familias de objeto (revisión 1, B-02; E-54, E-01).** En WorkOS el parentesco lo dan los objetos de producto en clave alta: el formulario blanco del abanico (W-CORE-01), la tarjeta clara con capa (W-CORE-16), los interruptores (W-HOME-06), la lista de Radar (W-ADV-44). Dibujados todos como caja oscura con filo oro serían "las mismas cajas" de E-54. Por eso: objetos de PRODUCTO en claro cálido (mismo criterio ya decidido para el chat de Marcy), con el acento de la página solo en el botón o el estado, como relleno (como texto, solo `--accent-gold-deep` en etiquetas ≥ 14/500 y con AA comprobado; si no llega, tinta); objetos de SISTEMA en noche opaca. Cada sección tiene así su luz. Va en la lámina "sistema nuevo" del Punto de control 1.

**Opacidad (E-37).** Toda superficie que lleva texto encima de un patrón (franjas, haz y anillos del radar, trama de puntos, estrellas de SpaceBackdrop) es OPACA (`--w-s1/s2/s3` o claro); las versiones translúcidas `--w-s1-a`/`--w-s2-a` solo para bandejas sobre noche lisa.

Chat de Marcy (corrección del director, E-14): la ventana de conversación de los objetos de IA va en CLARO cálido (fondo `#f0ede8` al 96 %, burbujas del cliente `#ffffff`, burbujas de Marcy `rgba(79,195,161,.14)` con texto `#0e0e0d`, hora 11 px `#6b6762`), con el marco en noche. En páginas oro (p. ej. el bento de diseño web) las burbujas de Marcy son neutras (`#ffffff` / `#e7e3dc`): un acento por bloque (E-14). Un chat oscuro no se lee bien; el claro, dentro de la noche, actúa además como luz de la sección.

### 2.5 Raíles y celdas de 1 px

- Raíles: `.w-rails` en el `<main>` de cada página v3 (no en portada ni hubs). Dos líneas a `--w-rail-x`; se interrumpen detrás de los heros con objeto a sangre (`.w-hero--bleed` pone `z-index` al objeto por encima) y del pie.
- Celdas: cada sección es `.w-cell` (línea superior 1 px). Las rejillas internas usan `.w-cells` (línea = hueco de 1 px sobre fondo `--w-line`), nunca bordes duplicados. Sin `box-shadow` en rejillas.
- Cruce de líneas visible en bento 2×2 (recorte `cat/productos-core/raw/authkit-pc/s05.jpg`).

### 2.6 Cabecera numerada (W-NEW-32) · `CabeceraNumerada.astro`

- Divisoria 1 px `--w-line` a ancho de 1200; 40 px debajo: número mono 12/500 oro ("01"), filete de **24×1 px** oro al 60 % (elemento `<span aria-hidden>` con `inline-size:24px; block-size:1px`, NO un carácter), etiqueta mono 12/500 mayúsculas +0.1em `--w-ink-60` ("QUÉ INCLUYE"); a 12 px el H2 40/500 a la izquierda en columna de 580 px; bajada 16/1.6 `--fg-secondary` en 430 px a la derecha (x≈592), alineada a la línea base del H2.
- Móvil: H2 y bajada apilados; bajada a 12 px del H2.
- La numeración es por página y continua (01, 02…); el hero y la franja "En pocas palabras" no cuentan.

### 2.7 Botones

**Principal (intacto)**: `Button variant="primary"` tal cual. Sus 5 estados: reposo (oro `--accent-gold`, texto `--fg-inverse`), hover (`--hover-fine`: mezcla +10 % blanco + `--shadow-gold`, 200 ms), foco (`:focus-visible` anillo oro 2 px desfasado 2 px, de `base.css`), activo (`scale(.97)`), hecho (`[data-state=done]` teal, `BtnStates`). Tamaño en heros v3: `size="lg"` (14×28, 16 px, alto 44-48).

**Secundario como enlace** · nueva variante aditiva `variant="link"` en `ui/Button.astro` (las variantes existentes no cambian):
- `display:inline-flex; align-items:center; gap:8px; padding:8px 0; min-height:44px; font: 500 16px/1 var(--font-body); color: var(--w-ink); background:none; border:0`.
- Chevron "›" en `<span class="btn__chev" aria-hidden="true">` (carácter U+203A, 18 px, color acento de la página).
- Hover (`--hover-fine`) y foco: chevron `transform: translateX(3px)` en 200 ms `--w-ease-ui`; color del texto a acento en 150 ms. Sin subrayado (E-22). Reduced-motion: solo cambio de color.
- Pareja en heros: principal + enlace separados 24 px, en la misma fila también en móvil (si no caben a 360 px, el enlace baja centrado).
- Especificidad: la variante se escribe con la misma estructura de clases que las existentes dentro de `Button.astro` (`.btn--link`), sin `!important`. `Button.astro` añade también `btn--md`/`btn--lg` (`class:list`, línea 16; relleno 10×22 / 14×28, líneas 34-35): `.btn--link` declara `padding: 8px 0` DESPUÉS de las reglas de tamaño en el mismo `<style>` y gana por orden con la misma especificidad.

### 2.8 Iconos-objeto (7) · `src/components/w/IconoObjeto.astro`

Construcción común (W-ADV-40, W-HOME-10, W-CONV-02/03; recorte `cat/productos-avanzados/W-ADV-40.jpg`):
- SVG inline `viewBox="0 0 64 64"`, `aria-hidden="true"`, tamaños 40 · 44 · 48 · 52 · 56 · 80 px.
- Base: cuadrado redondeado 64×64 radio 14 (22 %); relleno degradado vertical `#232321 → #141414` (derivado de `--bg-elevated`/`--bg-card`); filo superior: trazo 1 px `rgba(255,255,255,.12)` en el borde superior; contorno 1 px del acento al 45 %.
- Glifo central en ~36×36: **sale de una familia de iconos con licencia clara, no se traza a mano por coordenadas** (revisión 1, E-27, E-49). Candidatas: Lucide (la única instalada hoy, `@iconify-json/lucide` + `astro-icon`), Tabler y Phosphor duotone (MIT; si el dueño elige una, su `@iconify-json/*` entra como devDependency en la excepción de `package.json` de 0A). Color `--fg-primary` al 92 %; se compone con UN detalle de acento propio (oro, teal en IA) como relleno plano nítido. Sin glow en teal (E-03); en oro, solo a 80 px, `drop-shadow(0 0 10px rgba(200,169,110,.18))` estático.
- Sprite único (revisión 1): `SiteNav` emite UNA vez por página un `<svg hidden>` con 7 `<symbol id="wi-<id>">` (degradados definidos una vez) e `IconoObjeto` pinta `<use href="#wi-<id>">` en panel, drawer y tarjetas (14 SVG con degradado repetidos en ~60 documentos y ids duplicables, si no). En una página sin `SiteNav`, prop `inline`. Prueba: `document.querySelectorAll('[id]')` sin duplicados en las 6 URL de portada y hubs y en 3 landings.
- Hover (solo dentro de tarjetas enlazadas, `--hover-fine`): el contorno pasa del 45 % al 80 % en 200 ms. Sin otra animación.
- Mapa `src/components/w/objects/registry.ts`: `{ id, tone: 'gold'|'teal', glyph }` con clave = `id` de `pricing.ts`. `pricing.ts` no se toca.

| id (`pricing.ts`) | Glifo | Idea del glifo (se busca en la familia elegida; las medidas son orientativas, no un dibujo a trazar) | Acento |
|---|---|---|---|
| `diseno-web` | Pantalla | Ventana de navegador 38×28 en (13,16) radio 4; barra superior con 3 puntos de 2 px; dentro, barra de titular 16×3 y dos líneas 22×2 y 12×2; botón píldora 10×4 oro; teléfono 11×19 radio 3 solapado abajo a la derecha en (41,33) con una barra oro | oro |
| `seo-local` | Pin | Pin de mapa 22×30 centrado (núcleo hueco de 7 px); bajo él, elipse 20×6 de trazo; dos arcos de radar parciales (radio 16 y 22, 70°) en oro al 60 % a la derecha | oro |
| `ia-conversacional` | Burbuja de Marcy | Burbuja 34×26 radio 9 con cola abajo a la izquierda; dentro 3 puntos de 3.5 px en teal (escribiendo); chispa de 4 puntas de 7 px arriba a la derecha (forma de la chispa de `src/icons/marcyan-ai.svg`) | teal |
| `ecommerce` | Bolsa | Bolsa trapezoidal 28×24 con asa en arco; etiqueta de precio 10×7 colgando de la esquina con orificio de 1.5 px; línea de pliegue oro | oro |
| `branding` | Sello de marca | Sello circular de 30 px con borde de 16 dientes; estrella de 4 puntas central oro; debajo, cota horizontal con dos remates (eco del plano técnico) | oro |
| `seo-ia` | Chispa IA | Chispa de 4 puntas grande (16 px) + 2 pequeñas (marcyan-ai) sobre 3 líneas de texto (24×2, 18×2, 20×2) que representan la respuesta que te cita; la 2.ª línea en teal | teal |
| `mantenimiento` | Llave | Llave inglesa diagonal 30 px; en su boca, punto de estado de 5 px oro ("en marcha"); arco de giro de 90° tenue | oro |

Lucide sigue para la UI funcional (`arrow-right`, `phone`, `message-circle`, `check`, `chevron-right`, `menu`, `map-pin`…). Enmienda de `DESIGN.md` §0 y §8.4 en la ola 0: "Iconos-objeto propios (7) para representar productos; Lucide para UI funcional; `marcyan-ai` sigue siendo el único Lucide-like relleno".

Prueba visual obligatoria antes de usarlos: hoja de los 7 en 2-3 familias a 40/48/56/80 sobre noche y sobre bandeja, captura real (muestrario §3.7), enseñada al dueño en el Punto de control 1 antes de usarlos en megamenú y tarjetas, y comparación con `cat/productos-avanzados/W-ADV-40.jpg` y `cat/home-nav/W-HOME-10.jpg`.

### 2.9 Coreografía de entrada única (A-12 / F-03) · `src/components/w/reveal.ts` + `w.css`

| Paso | Atributo | Retraso | Duración | Curva | Movimiento |
|---|---|---|---|---|---|
| Chip de ciudad + eyebrow | `data-w-in="1"` | 100 ms | 1100 ms | `--w-ease-text` | `translateY(12px)→0`, opacidad 0.01→1 |
| H1 + cola | `data-w-in="1"` | 100 ms | 1100 ms | ídem | ídem |
| Bajada | `data-w-in="2"` | 300 ms | 1100 ms | ídem | ídem |
| Botones | `data-w-in="3"` | 400 ms | 1100 ms | ídem | solo `translateY(12px)→0` y opacidad 0.6→1 (un control nunca es tocable sin verse) |
| Objeto principal | `data-w-in="obj"` | 500 ms | 950 ms | ídem | `translateY(24px)→0`, opacidad 0.01→1 (no 0: si es el elemento mayor, no retrasa el LCP) |
| Satélites / capa de color | `data-w-in="sat"` | 750 ms | 1800 ms (abanico) · 500 ms (capa desplazada) | `--w-ease-sat` | salen de DETRÁS del objeto: `translate(-x, +y) scale(.96)→0`, nacen ya dentro del movimiento del objeto (E-52), nunca desde la nada |

- Listo a ~2.2 s. Una sola curva por canal; nada de rebotes.
- Implementación: estado final visible por defecto en CSS. Un `<script is:inline>` en el `<head>` SOLO de páginas v3 añade `html.w-anim` si `matchMedia('(prefers-reduced-motion: no-preference)')`; con esa clase los `[data-w-in]` arrancan en el estado inicial; `reveal.ts` añade `.is-in` al `<main>` en el primer `requestAnimationFrame` tras `DOMContentLoaded`; salvaguarda en el MISMO script inline del `<head>` (no dentro de `reveal.ts`, que puede no cargar por red, bloqueador o un error previo del bundle): `setTimeout(()=>document.documentElement.classList.add('w-in-all'),2500)` y en `w.css` `html.w-in-all [data-w-in], html.w-in-all [data-w-reveal]{opacity:1;transform:none}`. Prueba: landing v3 con la petición de `reveal` bloqueada (Playwright `route.abort`) → opacidad 1 a los 3 s.
- `data-w-in` y `data-w-reveal` NUNCA en formularios, campos, ni en el contenedor de `DiagnosticWizard` o de `Contact`: el formulario de captación nace visible y el foco por teclado nunca cae en un campo invisible.
- LCP: el H1 y la bajada arrancan en opacidad **0.01** (no 0) para que el navegador los cuente como pintados en el primer fotograma.
- Revelado de sección bajo el pliegue (F-04): `[data-w-reveal]` con IntersectionObserver (`threshold: .15`, `rootMargin: '0px 0px -10% 0px'`), subida 16 px + opacidad, 480 ms `--w-ease-out`, escalonado 80 ms entre hijos marcados, una vez, `unobserve` tras entrar. El observador busca SOLO `[data-w-reveal]` y `[data-w-in]` dentro de `main[data-w]`: nunca `section`, `[data-rev]`, `.hero` ni `.hx` (riesgo de doble animación en portada y hubs, E-50/E-52).
- Animación de hero = el dueño la ve en el render antes de cualquier merge (memoria "no desplegar animaciones del hero sin visto bueno").

### 2.10 Bucles firma y contrato de movimiento reducido (F-02 / F-06) · `src/components/w/loop.ts`

- UNA animación firma en bucle por página, solo en el objeto principal (lista en §4 por página; en SEO local vive en la sección 01, no en el hero). Más, como mucho, micro-estados que informan (spinner, punto que late durante un escaneo real).
- API: `registerLoop(el, { start(), stop(), still() })`. IntersectionObserver (`threshold: 0`, `rootMargin: '100px'`) arranca/para; `visibilitychange` para con la pestaña oculta; `matchMedia('(prefers-reduced-motion: reduce)')` con listener `change` llama a `still()` (pinta un fotograma representativo y quieto) y nunca arranca.
- Pausa (WCAG 2.2.2, revisión 1): todo bucle que dure más de 5 s lleva un botón "Pausar animación" / "Reanudar animación" de 44×44 (Lucide `pause`/`play`, esquina inferior derecha del objeto, `aria-pressed`, fuera de cualquier `aria-hidden`), y el bucle se para mientras haya `focusin` o `pointerenter` dentro del objeto. Lo da `registerLoop` (opción `pauseButton`, `true` por defecto).
- Bucles que son ilustración (pestañas de Marcy, registro, pedidos, interruptores, esclusa, radar): el objeto animado lleva `aria-hidden="true"` y un resumen en `sr-only` (p. ej. "Ejemplo: Marcy agenda una cita, da precio, contesta fuera de horario y pasa a una persona"); NO usan roles `tab` ni cambian `aria-selected` solos. Las pestañas que maneja el visitante (W-ADV-38 de tienda, W-HOME-11 de SEO para IA) no rotan solas y sí llevan `tablist/tab/tabpanel`.
- Solo `transform` y `opacity`. Bucles CSS con `animation-play-state` controlado por la clase `.is-playing`; bucles JS con temporizadores (no rAF continuo) que cambian clases.
- Parámetros (medidos en las tiras):

| Bucle | Pieza | Ritmo | Traslado | Curva |
|---|---|---|---|---|
| Lista de pedidos | W-ADV-36 | una fila cambia a "Pagado" cada 950 ms; tras 3, la lista sube 52 px | 600 ms | `--w-ease-loop` |
| Registro vivo (variante en bucle) | W-ADV-44 | sube una fila (49 px) cada 1.5 s; central al 100 %, el resto nunca por debajo del 55 % y chips siempre ≥ 4.5:1 (son estados, E-40/E-42); máscara 100 px arriba/abajo. La variante `static` no apaga nada (§3.5) | 600 ms | `--w-ease-loop` |
| Interruptores | W-HOME-06 | la pila sube 78 px cada 2.4 s; la central enciende interruptor y chapa "Activo" | 1400 ms | `--w-ease-stack` |
| Esclusa de Marcy | W-ADV-02 | caso de ~4.5 s: intención → puertas se separan (240 ms) → píldora entra → trazo a teal (320 ms) → veredicto → la píldora baja por el abanico → canal resaltado; 2 ciclos completos (8 casos) y se detiene en el veredicto "Respondido"; vuelve a correr al salir y volver a entrar en vista (E-42) | por paso 240-600 ms | `--w-ease-ui` |
| Pestañas de Marcy | W-ADV-19 | ~8 s por pestaña: mensaje del cliente → "Marcy está escribiendo" con destello del texto (1.5 s) → respuesta se escribe (35 ms/carácter, máx 2.2 s) → 2.ª pregunta y respuesta; la píldora activa se desliza a la siguiente (400 ms) | — | `--w-ease-ui` |
| Radar | W-CORE-09 | el haz gira 180° en 2.5 s; cada aviso aparece al pasar el haz (ciclo 10 s, primer aviso a 1.06 s) | — | lineal (bucle continuo, F-01 lo permite) |
| Escáner | W-ADV-45 | barra 132×10 barre la web dibujada de abajo arriba en 1.8 s (bucle SOLO en /diagnóstico; en portada y hubs recorre UNA vez al entrar en vista y se queda a media altura) | — | `--w-ease-ui` |
| Pulsos de pistas | W-CONV-23 | pulsos por las calles 4 s lineal, 7 retrasos escalonados (0, .6, 1.1, 1.7, 2.3, 2.9, 3.4 s); brillo que gira en el borde del chip 4 s | — | lineal |
| Matriz por filas | W-ADV-52 | la fila activa cambia cada 1 s (en barrios queda fija la del barrio) | 200 ms | `--w-ease-ui` |

- Reduced-motion, estado quieto por pieza: pedidos con 2 filas "Pagado" y 3 "Preparar"; registro con la fila central encendida; interruptores con "Web rápida" en el centro activa; esclusa en el veredicto "Respondido"; pestañas en "Agendar cita" con la conversación completa; radar con el haz a 45° y 2 avisos visibles; escáner con la barra a media altura; pistas sin pulsos; matriz con la 1.ª fila encendida.
- Hovers globales: 150-200 ms solo color, borde u opacidad de una capa ya pintada; la caja no se desplaza salvo el chevron (3 px). Sin hover en táctil (`--hover-fine`).

### 2.11 Degradado en un elemento por página

- `.w-grad-text` en UN elemento por página, elegido en §4 (cola del H1 de IA para pymes, cifra de precio W-CORE-14 en landings con precio, titular del cierre en el resto). Si una página tiene cifra W-CORE-14, la cifra es su único degradado.
- Nunca en el H1 de la portada ni en elementos de portada o hubs.
- Estados por VALOR, no por un 2.º acento (revisión 1, E-14/E-35): "Activo", "Te encontró", "Te lo pasa" y similares se marcan con crema sobre noche (o tinta sobre objeto claro) y gris para lo inactivo; el acento de la página queda para el estado positivo principal.
- Sin degradado de fondo oro→teal en objetos (las capas desplazadas, marcos y halos van en UN acento: oro en páginas oro, teal en páginas de IA). Corrección del director sobre el plan (E-14): el marco "oro a teal" de IA conversacional y la capa "oro a teal" de SEO local pasan a un solo acento.

### 2.12 Megamenú (G10) · `src/components/layout/SiteNav.astro` + `src/components/w/nav/MegaServicios.astro` + `src/i18n/w/nav.ts`

**Datos (aditivos)**: `src/i18n/w/nav.ts` exporta `megaServicios[lang]` = los 7 productos de `pricing.ts` en su orden (`id`, nombre, promesa de una línea, `href` = el `href` de `priceServices[lang]` en `pricing.ts`/`pricing.en.ts`, nunca un enlace EN→ES; en páginas de Miami (`currentPath` empieza por `/es/miami`) se usa la landing de Miami cuando existe (diseño web, tienda, SEO local, IA conversacional) y la de `pricing.ts` cuando no; Mantenimiento → `/es/servicios#mantenimiento` | `/en/services#mantenimiento`, y hasta que 3-servicios cree esos `id` (ola 3) apunta a `#contacto`), y `recursos[lang]` = Blog, Diagnóstico gratis, Calculadoras (hrefs actuales, sin URL nuevas). `SiteNav` detecta el enlace cuyo `href` termina en `/servicios` o `/services` y le acopla el panel cuando la prop nueva `mega` (por defecto `true`) no es `false`. Las 4 fuentes de nav (`content.ts`, `clusterNav`, `clusterNavEn`, `pageNav`) no se tocan.

**Escritorio (≥ `--md`)**:
- "Servicios" SIGUE siendo `<a href="/es/servicios">` con su `aria-current` (enlace rastreable de primer nivel). A su lado, un `<button class="nav__mega-btn" aria-expanded aria-controls="nav-mega" aria-label="Abrir menú de servicios">` (objetivo táctil 44; sin `aria-haspopup`: es un botón de desplegar, no un menú) con chevron `lucide:chevron-down` 14 px que gira 180° en 150 ms. El panel se renderiza en el HTML del servidor con `hidden` (nunca en `<template>`); su primer elemento es "Ver todos los servicios ›".
- Panel `#nav-mega` DENTRO del `<header>` (`position:absolute; top: calc(100% + 8px); left:50%; transform: translateX(-50%)` fijo, no animado), ancho 900 px, radio 8, padding 12, fondo opaco `--w-s-solid`, borde 1 px `--w-line`, filo superior `rgba(255,255,255,.06)`, sombra `0 18px 40px rgba(0,0,0,.45)` estática. **Sin `backdrop-filter`** (anidado bajo el blur del header se vería sucio) y sin `transform` animado en el header (trampa `position:fixed` del drawer).
- Rejilla: 2 columnas de productos (celdas 292×84, padding 12×16, radio 8; 4 + 3 con "Ver todos" al final de la 2.ª): icono-objeto 48 + nombre 14/500 `--w-ink` + promesa 14/1.43 `--w-ink-60` en 1-2 líneas; 3.ª columna "Recursos" tras línea de 1 px (filas 288×48, icono Lucide 20 en acento + texto 14). Hover/foco de celda: fondo `--w-s2` 150 ms.
- "Recursos" NO va a la barra (opción A, decidida en la revisión 1: la primera pantalla de portada y hubs no gana un botón y "Blog" no sale dos veces). Vive como 3.ª columna del panel (dos niveles: producto = objeto, recurso = línea) y como grupo del drawer. La barra conserva sus 6 enlaces en todos los anchos.
- Apertura: clic/Enter/Espacio siempre; hover con intención (entrada 120 ms, salida 200 ms) solo en `--hover-fine`; fundido de opacidad 120 ms `--w-ease-ui` + `translateY(4px)→0` en el contenido interior (no en el panel posicionado); Esc cierra y devuelve el foco; clic fuera y `focusout` cierran; `resize` a `< md` cierra. Con el panel abierto el header lleva `data-mega-open` y se fuerza `.is-scrolled`; el `onScroll` actual respeta ese atributo y no quita la clase mientras esté (único cambio a `onScroll`, dentro de "solo el megamenú"), sin parpadeo. Reduced-motion: sin desplazamiento, opacidad 1 frame.
- Alto de la barra `--nav-h 64px` intacto (la portada y el hub lo usan en su relleno).

**Móvil (< `--md`)**: no hay megamenú. El drawer (hermano del header, sin cambios de z-index) recibe grupos con encabezado mono 11/500 mayúsculas `--w-ink-60` y separadores 1 px: SERVICIOS (7 filas: icono-objeto 40 + nombre 16 + promesa 13), CIUDADES (Houston, Miami), RECURSOS (Blog, Diagnóstico, Calculadoras en 2 columnas con icono 16). Pie del drawer en caja `--w-s1`: Llamar (`Button primary`, `data-track="call_clicked"`) + WhatsApp (`variant="link"`, `data-track="whatsapp_clicked"`), ambos con `data-track-loc="drawer"` para separarlos en analítica; número por defecto el de la portada y, en páginas de Miami (por `currentPath`), el de Miami. Los `<a>` nuevos cierran el drawer (lógica actual); si se usan `<details>`, añadir `summary` a `focusables()` y comprobar que el clic en `summary` NO cierra el drawer (hoy cierra con `[data-nav-link]`). Fundido 150-180 ms.

**No se toca**: `.nav__logo` + `BrandType`, `.nav__lang`, `.nav__cta`, `onScroll` (salvo leer `data-mega-open`), lógica `#contacto` (SiteNav 301-330), velo y drawer fuera del header, z-index.

**Alcance**: aparece en todo el sitio, también portada y hubs (es la navegación, decisión global aprobada). Verificación §2.13: con el menú cerrado, la primera pantalla de portada y hubs debe ser idéntica salvo la caja de `.nav__links` (el botón-chevron la ensancha y desplaza los enlaces siguientes); logo, `.nav__lang` y `.nav__cta` con huella de estilos y posición idénticas. En el informe de la ola 5 se enseña la barra antes/después de portada y hub como cambio global explícito. Plan B si el dueño lo rechaza en portada/hubs al ver el render: `mega={false}` desde `pages/{es,en}/index.astro` y `CityHub.astro` (una prop, sin más cambios).

### 2.13 MECANISMO DE ALCANCE (garantía de que portada y hubs no cambian)

**Cerrojo 1 · atributo de sistema.** `Layout.astro` recibe la prop aditiva `ds?: 'v3'` y la escribe en `<html lang data-ds={ds}>` (no en `<body>`: SiteNav y el chat ya escriben clases ahí). Las páginas rediseñadas (y la plantilla de landings) pasan `ds="v3"`; `pages/{es,en}/index.astro` y `pages/{es,en}/{houston,miami}.astro` NO la pasan. Todo CSS nuevo vive bajo `:root[data-ds="v3"]`, incluidos los ajustes a componentes compartidos usados en v3 (p. ej. `Contact.astro` dentro de una landing: `:root[data-ds="v3"] .contact .h2 { font-weight: 500 }` en `w.css`. Ojo: Astro 6 pone el scope como atributo, así que `.contact .h2` con scope ya pesa 0,4,0 y el selector de `w.css` también: empatan y decide el orden de carga. Se comprueba en la captura; si pierde, un nivel más de especificidad, nunca `!important`).

**Cerrojo 2 · prefijo y carpetas propias.** Tokens `--w-*`, clases `.w-*`, atributos `data-w-*`, componentes en `src/components/w/`, datos nuevos en `src/i18n/w/`. Las piezas nuevas no reutilizan nombres que buscan los scripts del viaje (`data-projects`, `data-process`, `data-rev`, `data-vig`, `.pf__stage`, `.pf__step`, `.svc__col`, `data-hero*`, `data-atmo`, `data-fx`) y sus scripts buscan dentro de su propio nodo (`el.querySelector`), nunca `document.querySelector` global (E-51).

**Cerrojo 3 · lista de archivos protegidos.** `git diff origin/main --stat` sobre esta lista debe salir VACÍO al cerrar cada ola:
`src/components/sections/Hero.astro`, `src/components/StarField.astro`, `src/components/city/hero.js`, `atmo.js`, `clouds.js`, `cities.js`, `CityScape.astro`, `src/components/layout/SiteFooter.astro`, `src/styles/tokens.css`, `base.css`, `media.css`, `src/components/ui/Kicker.astro`, `src/components/sections/Process.astro`, `Locations.astro`, `Contact.astro`, `Faq.astro`, `AnswerBlock.astro`, `CtaBand.astro`, `LandingHero.astro` (las páginas no migradas los siguen usando), `RailCta.astro`, `RailTools.astro`, `src/components/growthos/DiagnosticWizard.astro` y `ScanSequence.astro` (salvo 3-diagnostico: solo piel, `id` y marcado), `src/components/city/page.js`, `src/i18n/clusters.ts`, `clusters.en.ts`, `seo-ia.ts`, `pricing.ts`, `pricing.en.ts`, `content.ts`, `portfolio.ts`, `lib/` (raíz: funciones de servidor), `src/lib/` (solo lectura: de ahí sale `faqPage()`), `api/`.
Excepciones acotadas (solo en la tarea dueña, §5): `content.ts` NO (ni siquiera fuera de hero); `CityHub.astro` solo las líneas de contenido de las secciones permitidas; `city.css` solo reglas de esas secciones; `page.js` NO se edita (el panel fijo de proyectos se conserva y se reestiliza, §4.2); `src/components/sections/{Projects,Services,GrowthTeaser,Guarantees}.astro` solo en la tarea de portada (ola 4); `package.json` + `package-lock.json` solo en 0A y solo `devDependencies` (`playwright-core`, `pixelmatch`, `pngjs` y, si el dueño elige familia de iconos, un `@iconify-json/*`); `astro.config.mjs` solo en 0C y solo la condición `&& !page.includes('/w-muestrario')` del `filter` del sitemap (se quita en la ola 5); `Button.astro` solo la variante nueva; `Layout.astro` solo la prop `ds` y el script inline de `w-anim`; `SiteNav.astro` solo el megamenú, el sprite de iconos y la lectura de `data-mega-open` en `onScroll`; `global.css` solo la línea `@import './w-tokens.css';`.

**Cerrojo 4 · componentes compartidos.** Las landings estrenan componentes nuevos; `Process`, `Projects`, `Locations`, `Contact`, `GrowthTeaser` no se editan desde las tareas de landings. Tras la migración, `Projects` y `Process` quedan usados solo por la portada (y Process por nadie más), y se editan únicamente en la tarea de portada.

**Cerrojo 5 · componentes que salen de v3 (revisión 1).** `w.css` solo carga en páginas v3, así que todo componente de `src/components/w/` que se use fuera de ellas lleva TODO su CSS en su propio `<style>` con scope y solo lee variables `--w-*` (globales por `w-tokens.css`); prohibido que dependa de una clase de `w.css`. Lista cerrada: `IconoObjeto`, `objetos/Escaner`, `FiguraProyecto`, `TarjetasHermanas`, `TarjetasCaso`, `TresGarantias`, `CierreDosTarjetas`, `FranjaEnPocasPalabras`, `PreguntasFrecuentes`, `DondeEstaTuNegocio`, `Ejemplo`, `nav/MegaServicios`, `nav/MegaRecursos`, `nav/DrawerGrupos` y la variante `link` de `Button` (vive en `Button.astro`). Prueba: `src/pages/es/w-muestrario-base.astro` (sin `ds`) los pinta y deben verse igual que en el muestrario v3.

**Comprobación (se ejecuta al cerrar ola 0, ola 4 y ola 5)** · `scripts/w/scope-check.mjs` (nuevo; `playwright-core` con el Chrome instalado, `channel: 'chrome'`, sin descargar navegadores, + `pixelmatch` + `pngjs`, devDependencies de 0A):
0. **Ruido cero primero**: antes de usarlo como puerta se corre `main` contra `main` y debe salir 0 diferencias. Si un lienzo sigue variando (p. ej. `#hx-atmo`, `#hx-globe`), se enmascara ese lienzo y la máscara se declara en el informe. Una prueba que siempre falla acaba ignorada.
1. Construye `origin/main` en una carpeta temporal (`git worktree add` en el scratchpad, `node_modules` por junction, `npm run build`) y la rama; sirve ambos `dist/` en puertos distintos.
2. **Huella de DOM**: para /es, /en, /es/houston, /es/miami, /en/houston, /en/miami extrae el HTML de `section[data-hero]` (portada) y de `#hx-hero-pin` + `#hx-map` (hubs) y compara texto y atributos normalizados: se ignoran `data-astro-cid-*` y se reescribe `/hero[a-z0-9]{5}/g → heroUID` en `id`, `fill`, `clip-path` y `href` (`Hero.astro:19` genera ese id con `Math.random()` en cada build; `Hero.astro` no se toca). Además, la lista de `section` de `main` con su `id` y `data-fx`, y el número de `canvas.mfx` (StarField crea un lienzo por cada `[data-fx]`). Todo idéntico.
3. **Huella de estilos**: `getComputedStyle` de una lista fija de selectores (portada: `.hero__h1`, `.hero__sub`, `.hero__stage`, `[data-hero-orbit]`, `.nav`, `.nav__logo`, `.nav__lang`, `.nav__cta`, primer `.h2` de cada sección no permitida; hubs: `.hx .h1`, `.copy`, `.found`, `#hx-map`, `.nav`, `.nav__logo`, `.nav__lang`, `.nav__cta`) en 1440×900 y 390×844; propiedades: `font-*`, `letter-spacing`, `line-height`, `color`, `padding`, `margin`, `width`, `height`, posición (`getBoundingClientRect`), `transform` inicial. Diferencia = fallo.
4. **Capturas de la primera pantalla** con `prefers-reduced-motion: reduce` emulado y `page.addInitScript` que sustituye `Math.random` por un generador con semilla fija (mulberry32, semilla 1) en las dos compilaciones (StarField siembra sus estrellas con `Math.random()`, `StarField.astro` 79-96, también con reducir movimiento), en 1440×900, 1920×1080 y 390×844 (`isMobile`+`hasTouch`, E-30): diff con `pixelmatch`, umbral 0.1 %, máscara SOLO sobre la caja de `header .nav__links` (en móvil no se ve: máscara vacía). Fuera de la máscara, 0 píxeles distintos.
5. **Viaje**: con movimiento normal, tira de fotogramas en el Chrome real (E-09) bajando cada página entera en pasos de 400 px, antes y después lado a lado: órbita, pista "Toca para explorar", cohete del Proceso en móvil, sol en Servicios del hub, noche en Proyectos, banco de nubes, mapa encendiéndose, horizonte del Cierre, silueta del pie. Se mide además la posición de cada `data-atmo` (`getBoundingClientRect().top` tras cargar) antes/después: desviación máx. ±40 px. Si una sección permitida se pasa, se ajusta su contenido dentro de su contenedor (no las marcas); acortar un tramo del viaje es pregunta al dueño, no decisión del ejecutor.
6. **Peso**: HTML comprimido de las 6 URL antes/después, máx. +6 KB.
7. Resultado en `scratchpad/w/scope-report.json` + carpeta de capturas, enlazados en el informe de la ola 5.

### 2.14 H1 congelados, cola y eyebrow

Contexto: la indexación de Marcyan cayó en octubre y el plan de triage dice que nada que toque el sitio se adelanta (Fase A desde el 17-nov). Por eso, en TODAS las páginas (también las que el verificador no vigila) el texto del `<h1>` se mantiene **verbatim**: `h1Html` es la cadena del dato tal cual, sin añadir ni mover etiquetas (el verificador compara con las etiquetas convertidas en espacios); cambia solo la presentación (tamaño, peso 500, color del `<em>` por CSS en el tono del eyebrow, sin degradado salvo que sea el elemento elegido).

- **Cola** (revisión 1, I-01): la frase de beneficio va en `.w-h1__tail`, un `<p>` justo debajo, con la misma escala y el MISMO tono que el H1 (o en degradado si es la frase de la página). En los heros de WorkOS el H1 es de un tono y de 2 líneas; los dos tonos (W-ADV-32) son de H2 de capítulo. **Regla de longitud**: H1 + cola ≤ 2 líneas a 1440 y ≤ 4 a 390, medido en la captura; si no cabe, la cola no se pinta y su idea pasa a la bajada. Sin cola desde ya: sobre nosotros, bienes raíces, contratistas (ES), SEO para IA y barrios. Para Google el H1 no cambia y `--compare` no avisa.
- **Eyebrow** (revisión 1, I-02): es el NOMBRE DE PRODUCTO, como en WorkOS ("AuthKit" sobre la promesa), y nunca repite el H1. Nombres, los mismos de Interruptores (§4.3): diseño web "Web rápida" · tienda "Tienda" · branding "Marca" · SEO para IA "Que la IA te nombre" · IA conversacional "Conoce a Marcy" e IA para pymes "Marcy contesta por ti" (ya distintos del H1) · hubs de venta, su sección ("Servicios"). Si el nombre coincide con el H1 (SEO local, diagnóstico), se omite el eyebrow y queda solo el chip de ciudad.

---

## 3 · Componentes nuevos

Todos en `src/components/w/` (Astro con `<style>` con scope; scripts como módulo que buscan dentro de su nodo). Los de la lista cerrada del Cerrojo 5 llevan TODO su CSS dentro y solo leen variables `--w-*`. Radios: el token más cercano de §2.1 (las medidas de radio de las tablas son las del recorte). Props en TypeScript. Cada componente: un solo archivo de propiedad (sin solapes entre tareas, §5). Medidas a 1440 sobre contenedor de 1200; móvil a 390 con 16 px de margen. Recorte de referencia indicado para la comparación lado a lado (E-54).

### 3.1 Sistema base (ola 0A)

| Componente | Archivo | Props | Pieza WorkOS y medidas | Móvil | Reduced-motion |
|---|---|---|---|---|---|
| Eyebrow | `w/Eyebrow.astro` | `tone?: 'gold'\|'teal'`, `as?: 'p'\|'span'` | W-CORE-02/W-HOME-15: 24-28/500, -2 % | 18 px | — |
| ChipCiudad | `w/ChipCiudad.astro` | `label: string` ("Houston, TX") | mono 12, píldora borde 1 px | igual | — |
| HeroTexto | `w/HeroTexto.astro` | `eyebrow`, `tone`, `chip?`, `h1Html` (la cadena `hero.h1` del dato tal cual, §2.14), `tail?`, `tailGrad?: boolean`, `lead`, `primary: {label, href, track?}`, `link?: {label, href, track?}`, `align: 'center'\|'left'`, `size: 'landing'\|'hub'\|'night'`, slot `crumbs` (monta `ui/Breadcrumb`, que emite el BreadcrumbList) | W-CORE-01 (centrado, columna 768) / W-CORE-16 (izquierda, columna 560): eyebrow→H1 12, cola, bajada 20 en 525, botones a 24. Pone los `data-w-in` | H1 36, botones en fila | estado final, sin subida |
| CabeceraNumerada | `w/CabeceraNumerada.astro` | `n: number`, `label`, `titleHtml`, `lead?`, `id?` | W-NEW-32 (§2.6); recorte `cat/authmd-init/W-NEW-32.jpg` | apilado | — |
| CapituloDosFrases | `w/CapituloDosFrases.astro` | `tone1`, `tone2`, `sub?` | W-CORE-07: 52/1.08 centrado, 1.ª frase al 45 %, sub 20/32 en 520, 80 px hasta la rejilla; recorte `cat/productos-core/W-CORE-07.jpg` | 30 px | — |
| Bandeja | `w/Bandeja.astro` | `cols?: 1\|2\|3\|4`, `gap?`, `as?` | §2.4; W-ADV-37/40 radio 22 padding 16 | 1 columna (hermanos 2) | — |
| Celdas | `w/Celdas.astro` | `cols: 2\|3\|4`, `pad?: 48\|32\|20` | W-CORE-37/W-CORE-08 líneas 1 px | 1 columna | — |
| IconoObjeto | `w/IconoObjeto.astro` | `id` (de pricing), `size: 40\|44\|48\|52\|56\|80`, `tone?` (si no, del registro) | §2.8; pinta `<use href="#wi-<id>">` del sprite de `SiteNav` (prop `inline?` si no hay nav) | igual | sin hover animado |
| Ejemplo | `w/Ejemplo.astro` | `label?` ("Ejemplo" / "Example") | etiqueta `.w-example` | igual | — |
| reveal / loop | `w/reveal.ts`, `w/loop.ts` | — | §2.9-2.10 | igual | `still()` |
| WStyles | `w/WStyles.astro` | — | importa `src/styles/w.css`; lo montan `WLanding` y las páginas v3, nunca portada ni hubs (§2.1) | — | — |
| Megamenú | `w/nav/MegaServicios.astro`, `w/nav/MegaRecursos.astro`, `w/nav/DrawerGrupos.astro` | `lang` | §2.12; recortes `cat/productos-avanzados/W-ADV-10.jpg`, `cat/home-nav/W-HOME-02.jpg`, `W-HOME-03.jpg`, `W-HOME-04.jpg` | hoja de drawer | sin desplazamiento |

### 3.2 Conversión y estructura reutilizable (ola 0B-1)

| Componente | Archivo | Props | Pieza y medidas | Móvil | Reduced-motion |
|---|---|---|---|---|---|
| FranjaEnPocasPalabras | `w/FranjaEnPocasPalabras.astro` | `q`, `a`, `source?`, `verified?: string` (fecha real de la fuente), `cols?: [{title, text, link?}]` (en hubs, sin columnas), `lang` | W-CORE-23 aligerada (revisión 1, B-01). **Posición: justo antes de `PreguntasFrecuentes` (o del cierre si no hay FAQ), nunca en las dos primeras posiciones tras el hero** (R1 de §4). Rótulo "En pocas palabras" como etiqueta mono 12 `--w-ink-60` (no un 24 oro que compita con el eyebrow); la pregunta `answer.q` como `<h2 id="answer-q">` 24/500 centrado; la respuesta `answer.a` **verbatim** en columna central de 760 px 18/1.6; debajo, si hay `cols`, 3 columnas de ~395 px: **qué es · desde cuánto · en cuánto tiempo**, cada una título 20/500 + 2 líneas 16/24 + enlace acento, construidas SOLO con datos existentes (nombre del servicio y `service.description`, ancla baja de `PRICE_ANCHORS`, plazo oficial "propuesta en 24 horas"); `source` en línea mono 12 con el sello W-CONV-52 si trae `verified`. `section aria-labelledby="answer-q"`. Sigue en el HTML para AEO. Recorte `cat/productos-core/W-CORE-23.jpg` | apiladas | — |
| PreguntasFrecuentes | `w/PreguntasFrecuentes.astro` | `tag?`, `titleHtml`, `items: {q, a, verified?}[]` (`verified` = sello W-CONV-52), `id` (obligatorio, sin valor por defecto; normalmente `faq`), `jsonld=true` | W-CONV-11: bloque 776 px centrado, titular 32/500; tarjetas 776×96 radio 16 padding 32 separadas 32; "+" en cuadro 32 radio 7 fondo acento 8 % que pasa a "−"; pregunta 20/500; respuesta 16 `--fg-secondary`. `<details>` nativos **todos cerrados**; sin transición de altura: solo la opacidad del contenido en 120 ms (§6.6). Emite FAQPage con `faqPage()` de `src/lib/schema.ts` con el mismo texto. Recortes `cat/conversion/pricing-int/W-CONV-06-faq-cerrada.jpg`, `-abierta.jpg`, móvil `cat/conversion/pricing-mov/s11.jpg` | ancho completo | sin transición de altura |
| PreguntasAbiertas | `w/PreguntasAbiertas.astro` | `items`, `cols: 2` | W-PROOF-26: 2×N, icono burbuja Lucide en cuadro 24, pregunta 19/500, respuesta 15; todas visibles (no es acordeón). FAQPage idéntico | 1 columna | — |
| CierreDosTarjetas | `w/CierreDosTarjetas.astro` | `titleHtml`, `proof` (1 frase real), `city?: 'houston'\|'miami'` (por defecto `'houston'`, como `CtaBand.astro:30`), `tel`, `wa` (siempre por props, nunca calculados: en el hub se pasan `telHref`/`waHref` de `CityHub` 31-32), `lang`, `warm: {kind: 'diagnostico'\|'marcy'\|'portafolio', title, text, href?, ask?}`, `grad?: boolean` | W-CORE-15: 2 tarjetas en fila, hueco 18, CTAs alineados abajo. **Grande 728×390** radio 12 borde 1 px, fondo `--w-s2` con `--w-stripes` en el tercio inferior, padding 32: H 32/40, prueba 16/24 en 340 px, y el **trío** con las clases y eventos contractuales exactamente una vez: `a.ctaband__act--form[data-track="proposal_requested"]` → `#contacto`, `a.ctaband__act--wa[data-track="whatsapp_clicked"]`, `a.ctaband__act--call[data-track="call_clicked"]` (`href={tel}`). Dominante por dispositivo SIN `order` (WCAG 1.3.2/2.4.3): el orden del DOM es fijo y solo cambia el estilo por punto de corte (en `--lt-md` Llamar es `primary` y el formulario `link`; en escritorio al revés). **Pequeña ~355×390** `--w-s1` padding 32: H 27/36, 3 líneas, CTA `variant="link"`: diagnóstico (`tool_cta_clicked`) o "Pregúntale a Marcy": `window.dispatchEvent(new CustomEvent('mrc:ask', { detail: { text } }))` con texto FIJO por página y sin datos del visitante (ChatWidget lo envía al momento y consume un turno con sus topes de gasto), más `data-track="marcy_ask_clicked"`. Recortes `cat/productos-core/W-CORE-15.jpg`, `-hover.jpg` | apiladas, grande primero | hover solo color |
| TarjetasHermanas | `w/TarjetasHermanas.astro` | `titleHtml` (2 frases), `lead`, `items: {id, label, desc, href, price?}[]`, `currentId?`, `recursos?: {icon, title, text, href, track?}[]` | W-ADV-40: cabecera a la izquierda H2 40/44 + texto 18/29 en 500; 55 px; bandeja 1200 radio 22 padding 16; tarjetas 282×182 radio 12 hueco 14 padding 22: icono-objeto 48, 45 px de aire, nombre 20/500, 1 línea 16, "desde $X" mono 12 oro (se omite en la tarjeta de la página actual); hrefs SOLO los que la página ya enlaza hoy (`related.links`, filas `svc`, `priceServices`), prohibido crear o adivinar URL, sobre todo en EN; la actual sin elevar (`--w-s1`, `aria-current="page"`); hover borde `--w-line-strong` 200 ms. Debajo 3 tarjetas de recurso W-ADV-50 (588×64: icono Lucide 24 acento, título 15/500 acento, texto 13). Recortes `cat/productos-avanzados/W-ADV-40.jpg`, `W-ADV-50.jpg` | 2 columnas; recursos apilados | — |
| TarjetasPerfil | `w/TarjetasPerfil.astro` | `titleHtml`, `cards: {title, text, href, art?}[2]`, `wide: {icon, title, text, href}` | W-NEW-09: 2 tarjetas 450×185 hueco 16 + 1 de 920×104, radio 6, padding 28; título 18/500; texto 14; enlace "… ›" SIN subrayado (E-22: el chevron se mueve 3 px en 180 ms). Si `art` es la silueta de una ciudad, va a todo el ancho de la tarjeta (≥ 450 px) anclada abajo, con revisión "¿se entiende?" a 1x antes de integrar (E-53). Recorte `cat/authmd-init/W-NEW-09.jpg` | apiladas | — |
| DondeEstaTuNegocio | `w/DondeEstaTuNegocio.astro` | `items: {name, text, href, kind: 'barrio'\|'sector'}[]` | W-CONV-33: 2 columnas de tarjetas 372×112 radio 12 `--w-s2` borde 1 px padding 24: nombre 16/500, texto 13, a la derecha pin Lucide en cuadro 48 (barrio) o icono-objeto 48 (sector); la última a todo el ancho si son impares. Sin logos de terceros. Recorte `cat/conversion/W-CONV-44-origenes-rejilla.jpg` | 1 columna | — |

### 3.3 Prueba (ola 0B-2)

| Componente | Archivo | Props | Pieza y medidas | Móvil | Reduced-motion |
|---|---|---|---|---|---|
| TiraLogos | `w/TiraLogos.astro` | fijo: los 4 clientes reales | W-CORE-03: fila centrada, alto 22 px, monocromo crema al 45 %, ~90 px bajo el objeto del hero, con antetítulo mono 12 "Webs nuestras en uso" al 60 %. En páginas de Miami se omite (los 4 son de Houston y de Orlando, y la tira insinuaría clientes en Miami). **No hay logos de clientes en el repo**: hasta que el dueño los dé, nombres en Space Grotesk 500 18 px con `translate="no"` (Texas Rush Remove · Rosy Nails & Care · Julio's Landscape TX · Move Junk Away). Recorte `cat/productos-core/W-CORE-03.jpg` | 2×2 | — |
| FichaProyecto | `w/FichaProyecto.astro` | `project` (de `portfolioProjects` o `proof.items`), `variant: 'grande'\|'compacta'`, `id?` | W-EVT-15 como bloque (sin capa modal): fondo `--w-s1` con halo del `accent` del proyecto arriba a la derecha al 10 %; izquierda 512: título 48/1.2 500 (compacta 32), meta "Web + SEO local · Houston" 16 al 70 %, `primary` "Ver el proyecto" (ancla del portafolio) + `link`; 2 párrafos 16/26 (`did`, `result`); derecha captura real `/Galeria/<slug>-pc-900.webp` en marco de navegador radio 8 con `width/height` fijos y `loading="lazy"` + teléfono `-movil-520.webp` solapado. MJA rotulado "Florida (Orlando)". Recorte `cat/eventos/W-EVT-15.jpg` | captura arriba, texto abajo | sin apertura animada |
| TarjetasCaso | `w/TarjetasCaso.astro` | `items` (proyectos), `label` | W-PROOF-13 sin citas: antetítulo mono 12; tarjetas 582×336 hueco 36 radio 8 con **franja superior de 4 px** en `var(--accent-gold)` o `var(--accent-teal)` según el `accent` de `portfolio.ts` (prohibido muestrear colores de las webs de clientes, E-47), padding 48/48/64: nombre en Space Grotesk 24/500 `translate="no"`, texto 20/32 = qué se hizo (`did`), resultado verificable (`result`), pie con `link` "Ver caso ›" a `/es/portafolio#<slug>`. Recorte `cat/prueba-empresa/W-PROOF-cs-mas-historias.jpg` | columna | — |
| ProsaLocal | `w/ProsaLocal.astro` | `titleTone1`, `titleTone2`, `paragraphs: string[]` (HTML verbatim), `items?: {icon, title, text}[4]` | W-CONV-30: izquierda 330 px con titular 30/500 a dos tonos; derecha 763 px: los `local.paragraphs` **verbatim** (19/1.6, `set:html`) y, si hay `items`, rejilla 2×2 (icono Lucide en cuadro 40 radio 8, título 21/500, texto 15/24). Recorte `cat/conversion/switch-int/W-CONV-41-titulo-izq-rejilla.jpg` | apilado | — |
| RelatoEnActos | `w/RelatoEnActos.astro` | `acts: {title, html}[]` | W-PROOF-08: columna 688, H2 26/33.8 con 48 px encima, párrafos 19/30.4 | igual | — |
| FichaLateral | `w/FichaLateral.astro` | `logoName`, `rows: {label, value, href?}[]`, `sticky?: boolean` | W-PROOF-06: columna 379, pegajosa `top: calc(var(--nav-h) + 40px)`; caja del nombre `--w-s2` padding 24 radio 8 ~145 px; tabla 3 filas borde 1 px radio 8, etiqueta 14 / valor 14 `--fg-secondary`, filas ~70 px. Recorte `cat/prueba-empresa/W-PROOF-cs-ficha.jpg` | no pegajosa, entre entradilla y cuerpo | — |
| CeldaTuNegocio | `w/CeldaTuNegocio.astro` | `href` (WhatsApp), `label` | W-NEW-08: celda punteada 205×64 con marcas de recorte en las esquinas, "+ Tu negocio aquí"; color 150 ms; `data-track="whatsapp_clicked"` | igual | — |
| FiguraProyecto | `w/FiguraProyecto.astro` | `project`, `side?: 'left'\|'right'` | W-PROOF-12: captura real en marco de navegador 736 radio 8 (3 puntos + dominio sin enlace) con teléfono solapado y pie mono 13 ("Texas Rush Remove · Junk Removal · Houston", `translate="no"`); `/Galeria/*` con `srcset`, `width/height`, `loading="lazy"`. La consumen `Projects.astro` (ola 4) y el portafolio | apilada | — |

### 3.4 Precio, especificaciones y estructura (ola 0B-3)

| Componente | Archivo | Props | Pieza y medidas | Móvil | Reduced-motion |
|---|---|---|---|---|---|
| PrecioPuntos | `w/PrecioPuntos.astro` | `eyebrow`, `titleHtml`, `lead`, `amount` (por defecto el ANCLA BAJA de `PRICE_ANCHORS`, p. ej. "$400"; R6 de §4 y §7.3-12), `from` ("Desde" / "From"), `bottomLeft: {big, text}`, `bottomRight?: {label, value}` (aquí va el slice, p. ej. "A medida desde $1,500"), `id?` (sin valor por defecto), `grad=true` | W-CORE-14: tarjeta 1100×440 radio 12 borde 1 px; arriba 330 px de lienzo de puntos (3 px cada 6 px, crema al 12 %); la cifra (~150 px de alto, Space Grotesk 500) es TEXTO real en `--w-grad` recortado por una máscara de puntos (legible y en el DOM); "Desde" se pinta dentro del lienzo, a la izquierda de la cifra y a 1/3 de su alto, con la misma máscara (texto real); abajo 110 px tras línea: título 28/500 + 1 línea 14 · a la derecha etiqueta 14 + valor 14/600. Al entrar, ola de encendido de izquierda a derecha en 1.7 s (capa de máscara que se traslada con `transform`), una vez. Recortes `cat/productos-core/W-CORE-14.jpg`, `-tira.jpg` | lienzo 358×220, cifra ~96 px | cifra encendida, sin ola |
| TarjetaPrecio | `w/TarjetaPrecio.astro` | `serviceId`, `name`, `desc`, `tiers: {label, price, unit?}[]` (de `priceServices`), `includes?: string[]`, `cta`, `note?`, `track='pricing_card_clicked'` | W-CONV-03 + W-CONV-06: tarjeta 1200 radio 24 borde 1 px; cabecera 116 px (icono-objeto 56, nombre 24/500, descripción 16, "Pedir propuesta ›" a `#contacto`); cuerpo 760/440: izquierda lo incluido (checks oro), sin deslizador (las calculadoras son de `ToolsHub`, un solo dueño de su contrato, §4.10); derecha panel `--w-s1` padding 32 con filas de 40 px (nivel | precio 16/500 + unidad) y caja "¿Necesitas algo distinto?" borde 1 px radio 8. Recortes `cat/conversion/pricing-int/W-CONV-03-calc0-30.jpg`, móvil `cat/conversion/pricing-mov/s02.jpg` | vertical | — |
| TarjetasModelo | `w/TarjetasModelo.astro` | `cards: [{title, text, icon, items[], cta}] × 2` | W-CONV-02: 2 tarjetas 376×521 hueco 24 radio 16 padding 40; la 2.ª en superficie de contraste; franjas oro al 8 % (~340×120) arriba a la derecha con máscara; icono-objeto 44; título 28/500; divisoria a todo el ancho; 5 ventajas con check 16. Recorte `cat/conversion/W-CONV-01-hero.jpg` | apiladas | — |
| Especificaciones | `w/Especificaciones.astro` | `label`, `cells: {k, v, note?}[]` (6 u 8) | W-NEW-31: rejilla 4×2 (o 3×2) borde 1 px radio 6, celdas 284×115 padding 20: etiqueta mono 11 oro, valor 20/500, nota 14. Recorte `cat/authmd-init/W-NEW-31.jpg` | 2 columnas | — |
| TriadaManifiesto | `w/TriadaManifiesto.astro` | `titleHtml?`, `lead?`, `items: {tone1, tone2, text}[3]` | W-ADV-08 variante a dos tonos: contenedor 896, 3 columnas de 272 hueco 40, título 20/500 en 2 líneas (1.ª al 45 %, 2.ª al 100 %), texto 15/24. Sin caja ni icono. Recortes `cat/productos-avanzados/W-ADV-08.jpg`, `W-ADV-20.jpg` | 1 columna con separadores 1 px | — |
| TresPasosNumerados | `w/TresPasosNumerados.astro` | `items[3]`, `id?` | W-ADV-57: 3 columnas con líneas verticales 1 px; número en casilla 16×16 oro al 15 % mono 11; título 20/500; texto 15. Recorte `cat/productos-avanzados/W-ADV-57.jpg` | apiladas | — |
| CuatroRazones | `w/CuatroRazones.astro` | `titleHtml`, `items: {icon, title, text}[4]` | W-CONV-27: 2×2 de ~470, icono Lucide 20 en cuadro 32 radio 6, título 16/500, 3 líneas 16 | 1 columna | — |
| GratisDeVerdad | `w/GratisDeVerdad.astro` | `items[4]`, `title`, `cta` | W-CORE-29: 4 iconos en cuadrado redondeado + 2 líneas; tras línea vertical "Gratis" 24 acento + checks. Nunca dentro de un formulario | apilado | — |
| Inventario3Etapas | `w/Inventario3Etapas.astro` | `cols: {title, items: {label, href}[]}[3]` | W-CORE-04: celda 1200 en 3 columnas con líneas 1 px, título 20/500, ítems 18/26 con check circular relleno 18 oro, filas a 34 px, padding 48 | apiladas | — |
| TresGarantias | `w/TresGarantias.astro` | `items` (plazos oficiales por props: contacto en 1 hora hábil · propuesta en 24 horas · la web es tuya; no se fusionan) | W-ADV-49: franja de 3 celdas con líneas de 1 px, icono Lucide 20 en acento, título 16/500, 1 línea 14. La usan precios (§4.4-7) y hubs (§4.2-9) | apiladas | — |
| TablaFases | `w/TablaFases.astro` | `rows: {phase, block, gets}[]` (de `content.process`) | W-NEW-25: filas con divisoria 1 px; fase mono 13, bloque 16 desde x=323, "qué recibes" desde x=748. Sin plazos no prometidos. Recorte `cat/authmd-init/W-NEW-25.jpg` | apilada | — |
| SedesAcordeon | `w/SedesAcordeon.astro` | `items` (de `content.locations.items`) | W-EVT-38: filas con divisor 1 px; sin silueta (a 82 px de alto no se entiende, E-53): pin Lucide + ciudad 24/500; área 13; teléfono con `call_clicked`; "Ver detalles ⌄" en `<details>` **cerrado al cargar**; flecha gira 200 ms. Recorte `cat/eventos/W-EVT-38-tira.jpg` | igual | sin giro |

### 3.5 Demos y bucles (ola 0B-4)

| Componente | Archivo | Props | Pieza y medidas | Móvil | Reduced-motion |
|---|---|---|---|---|---|
| DemoPorPasos | `w/DemoPorPasos.astro` | `titleHtml`, `text`, `steps: string[]`, `done` ("✓ Web publicada"), slot `screen` | W-CORE-05 + F-05: izquierda ~520 (H2 32/40, párrafo 16/26 y los 5 pasos como filas legibles 16/26 con número mono, ≥ 680 px de alto en total para que el pegajoso tenga recorrido; si en la captura no llega, se quita `sticky` y queda el disparo único); derecha bloque **544 px pegajoso** (`position: sticky; top: calc(var(--nav-h) + 24px)`): lista de pasos en mono 13 oro (no terminal de código) superpuesta a la izquierda de una pantalla radio 20 con marco `--w-s2`; al entrar en vista, los pasos se escriben uno a uno con brillo de 0.9 s en el activo y la pantalla pasa de esqueleto a la web de EJEMPLO terminada; leyenda: spinner → "✓ Web publicada" (~3 s, una vez). Recortes `cat/productos-core/W-CORE-05-tira.jpg`, `-tira-tiempo.jpg` | texto arriba, demo debajo sin sticky | web terminada, pasos marcados |
| Escalera | `w/Escalera.astro` | `titleHtml`, `lead`, `options: {id, title, text, price?}[3]`, slots `screen-<id>` | W-CORE-06 + B-08: izquierda 490 con 3 opciones (activa: caja 486×102 radio 12 padding 14×16 `--w-s3` borde 1 px; inactivas sin caja); derecha pantalla 345×450 radio 16 en marco-bandeja radio 28 padding 14, raíles laterales de cápsulas de 64 px (colores / esquinas / ES-EN); chip bajo la demo. `role="radiogroup"`, teclado; fundido 200 ms `--w-ease-ui`. Recortes `cat/productos-core/W-CORE-06.jpg`, `-widgets.jpg` | lista arriba, demo abajo | sin fundido |
| Bento2x2 | `w/Bento2x2.astro` | `cells: {id?, icon, label, titleHtml, text}[]` (2 columnas; 4 por defecto, Servicios usa 7), `wideLast?: boolean` (la última a dos columnas), slots `ui-<n>` | W-CORE-08 + B-03: celdas de 600 con líneas 1 px (cruz visible), padding 48: etiqueta (icono 16 + nombre 16), título 24/500, texto 16/26 en 503, ~90 px hasta la mini-UI en bandeja radio 20 padding 14.5. Estático. Recortes `cat/productos-core/W-CORE-08.jpg`, `cat/productos-core/raw/authkit-pc/s05.jpg` | 1 columna | — |
| BandejaPasos | `w/BandejaPasos.astro` | `titleHtml`, `lead`, `steps: {label, title, text}[3]`, slots `ui-1..3`, `id?` | W-ADV-37: cabecera centrada H2 40 + bajada 18/29, 50 px; bandeja 1200×451 radio 22 padding 16, 3 tarjetas 379×419 radio 12 hueco 16: franja superior 46 px ("Paso 01" mono 14 al 60 % + línea 1 px); zona de objeto ~180 px; título 18/500 y texto 15/24 con padding 32. Aparición por opacidad. Recorte `cat/productos-avanzados/W-ADV-37.jpg` | apiladas | — |
| RegistroVivo | `w/RegistroVivo.astro` | `titleHtml`, `text`, `rows: {icon, label, chip, tone}[]` (≥ 8 en bucle, 5 en `static`), `variant: 'loop'\|'static'` | W-ADV-44: tarjeta 1200×530 radio 48 `--w-s1`; texto a la izquierda (x=184, 420: H3 32/38, párrafo 19/30); lista que sangra al borde derecho tras línea vertical 1 px en x=720; filas 600×49 (icono 18, nombre 16, chip 14/500 en x≈1030: estado positivo en el acento de la página, "Te lo pasa" en crema al 70 %, §2.11); bucle §2.10; variante `static`: 5 filas todas al 100 %, la central con fondo `--w-s3` como único realce, chips siempre ≥ 4.5:1; "Ejemplo". Recortes `cat/productos-avanzados/W-ADV-44.jpg`, `-tira.jpg` | lista bajo el texto | fila central quieta |
| MatrizFilas | `w/MatrizFilas.astro` | `rows: {label, cells: {label, href?}[]}[]`, `fixedRow?` | W-ADV-52: panel `--w-s1` radio 16; casillas 24 px enlazadas solo si la landing existe (si no, casilla punteada sin enlace); llave Lucide gris a la izquierda; fila activa clara con 4 casillas rayadas en acento. Recortes `cat/productos-avanzados/W-ADV-52.jpg`, `W-ADV-52b.jpg` | scroll horizontal DENTRO de su caja | 1.ª fila fija |
| DilemaDosCaminos | `w/DilemaDosCaminos.astro` | `titleHtml`, `left`, `right`, `answerId` (icono-objeto) | W-ADV-03 + W-ADV-04 con disparo único (E-50): 2 tarjetas 425×232 radio 16; casilla central 72×72 radio 16 borde discontinuo al 25 % con "?" 24 px que, al entrar la sección, se sustituye por el icono-objeto (fundido 320 ms + `translateY(-8px)→0`), una vez. Recorte `cat/productos-avanzados/W-ADV-03.jpg` | apilado, icono sobre el H2 | icono ya puesto |
| SinCon | `w/SinCon.astro` | `sin: string[]`, slot `con` | W-CORE-25: interruptor 412×56 radio 42 (`role="switch"`), tarjeta "con" 680×440 radio 44 con trama de puntos; el caos se desvanece 300 ms y la tarjeta entra con fundido + `scale(.98→1)` 400 ms. Sin cifras. Recortes `cat/productos-core/W-CORE-25-sin.jpg`, `-con.jpg` | apilado | sin escala |
| CicloEnU | `w/CicloEnU.astro` | `nodes: {icon, label}[4]` | W-PROOF-11: 736×644 radio 8, 4 nodos píldora ~100×56 en U con iconos Lucide (sin fotos de personas), línea 1 px que los une | vertical | — |
| ChipsVeredicto | `w/ChipsVeredicto.astro` | `items: {label, kind: 'ok'\|'mid'\|'off'}[]`, `memory?: boolean` | W-ADV-05/06 (Respondido · Te lo pasa · Fuera de horario / Bien · Mejorable · Falta) y W-ADV-23 (chips de memoria): píldoras mono 13 radio 999 borde 1 px, estado por valor (§2.11). Una sola pieza para IA conversacional (§4.12) y diagnóstico (§4.9) | en fila con salto | — |

### 3.6 Objetos de servicio (mini-UI redibujadas, ola 0B-5) · `src/components/w/objetos/`

Todos en HTML/CSS/SVG inline (cero imágenes nuevas salvo el avatar existente de Marcy), escalables, con etiqueta `w/Ejemplo`, datos inventados rotulados, textos ≥ 13 px legibles (E-40), un acento por objeto (E-14), sin marcas de terceros. Dos familias (§2.4): de PRODUCTO en claro cálido (WebEjemplo, FichaMapaEjemplo, ListaPedidos, Interruptores, RespuestaAsistente, ChatMarcy, MiniPasos, SolicitudOficio) y de SISTEMA en noche opaca (EsclusaMarcy, Radar, TunelRejilla, PlanoMarca, Escaner, ChipBarrio, PlacaLogo, MarcoPestanas). Props comunes `lang`, `size?: 'hero'|'card'|'mini'`.

| Objeto | Archivo | Qué dibuja | Movimiento |
|---|---|---|---|
| WebEjemplo | `objetos/WebEjemplo.astro` | Web de EJEMPLO (`kind: 'plomeria'\|'salon'\|'restaurante'`, `frame: 'movil'\|'pantalla'\|'tarjeta'`, `state: 'esqueleto'\|'lista'`): cabecera "Tu Plomería · Houston", titular, botón "Llamar ahora", tarjeta de servicios, fila "Abierto ahora" (sin estrellas ni valoraciones), selector ES/EN. Cada `kind` con su paleta neutra de ejemplo, nunca la de un cliente | estático (la animan abanico, demo y escalera) |
| AbanicoWebs | `objetos/AbanicoWebs.astro` | W-CORE-01: central 400×478 radio 16 padding 48 `--w-s2` con `WebEjemplo kind="plomeria"`; laterales 264×381 radio 16 padding 40×28, 50 px más abajo, asomando 180 px a cada lado (salón a la izquierda, restaurante a la derecha); corte inferior por el borde del hero; detrás `--w-stripes` oro en el tercio inferior a 100vw (de borde a borde, como W-CORE-01) con fundido arriba, abajo y en los dos bordes laterales, comprobado a 1920 y ≥ 1985 (E-36); las tres webs son objetos claros opacos y las franjas nunca se ven a través de su texto (E-37). Recortes `cat/productos-core/W-CORE-01.jpg`, `-tira.jpg`, móvil `cat/productos-core/W-CORE-41-movil-authkit.jpg` | central `obj` (.5 s, 950 ms); laterales `sat` 1.8 s `--w-ease-sat` saliendo de detrás · móvil: central 280 px, laterales casi fuera del borde |
| FichaMapaEjemplo | `objetos/FichaMapaEjemplo.astro` | Ficha de mapa de ejemplo (sin logotipo de Google): "Tu Plomería", categoría, "Reseñas" como barras grises sin estrellas, "Abierto · cierra 6 p. m.", acciones (Llamar destacado, Cómo llegar, Sitio web) | estático |
| TarjetaObjeto | `objetos/TarjetaObjeto.astro` | W-CORE-16: tarjeta 476×359 radio 44 opaca (clara si su contenido es un objeto de producto) con trama de puntos SOLO en la franja superior sin texto (zona del icono); capa idéntica detrás desplazada 25 px arriba-izquierda en el acento de la página (18 % arriba → 6 % abajo); haces de líneas oro al 10 % convergiendo desde la izquierda, que nacen por debajo de la fila de botones del hero (como en W-CORE-16), nunca detrás de texto; slot de contenido; botón interno 346×44 con **halo oro** (nunca teal, E-03). Recortes `cat/productos-core/W-CORE-16.jpg`, `-tira.jpg`, móvil `cat/productos-core/W-CORE-41-movil-single-sign-on.jpg` | tarjeta `obj`; capa `sat` 500 ms desde detrás; luego quieta |
| Radar | `objetos/Radar.astro` | W-CORE-09: semicírculo de 5 anillos (mayor 623 px) anclado abajo y recortado, oro al 6 %; haz en abanico oro al 8 %; avisos píldora 13 px borde 1 px padding 6×12 con punto de 8 px fuera: "Búsqueda: plomero cerca de mí · Te encontró" (punto crema nítido, sin halo: estado por valor, no un 2.º acento), "Mapa · Te llamó", "Cómo llegar · Abierto". Recortes `cat/productos-core/W-CORE-09.jpg`, `-tira.jpg` | bucle §2.10 (firma de SEO local, como celda de bento en la sección 01, nunca detrás de texto) |
| ListaPedidos | `objetos/ListaPedidos.astro` | W-ADV-36: tarjeta 400×320 radio 12 padding 20: "Pedidos de hoy" 15/500, subtítulo 13, 5 filas de 52 px (icono 28 en caja radio 6, producto + cliente 14/500, botón contorno 64×24 "Preparar"), pie 12 sobre franja `--w-s1` ("Ejemplo · tu tienda"); campo de puntos oro (3 px cada 12 px) en óvalo. Recortes `cat/productos-avanzados/W-ADV-36.jpg`, `W-ADV-36b.jpg` | bucle §2.10 (firma de tienda) |
| ChatMarcy | `objetos/ChatMarcy.astro` | Ventana de conversación en CLARO (§2.4): cabecera con avatar real de Marcy (`public/assets/bot/`, encuadre de contrato, colorway blanco), nombre, "en línea"; burbujas cliente/Marcy; `mode: 'pestanas'\|'compacto'\|'estatico'`; `tabs: {label, script: {from, text}[]}[]`; `tone: 'teal'\|'neutral'` (en páginas oro, burbujas neutras) | W-ADV-19 modo pestañas §2.10; compacto: 2 pestañas, sin barra lateral |
| MarcoPestanas | `objetos/MarcoPestanas.astro` | W-ADV-18: marco radio 24 con borde 1 px teal al 45 %, barra de pestañas 1032×52 radio 26 fondo `rgba(255,255,255,.06)` SIN `backdrop-filter`, 4 pestañas 255×40; activa = píldora crema con spinner; inactivas 14/500 al 80 % con círculo vacío 12. Recortes `cat/productos-avanzados/W-ADV-18.jpg`, `W-ADV-19.jpg`, `W-ADV-19b.jpg` | píldora se desliza 400 ms · móvil: pestañas con scroll horizontal dentro del marco |
| EsclusaMarcy | `objetos/EsclusaMarcy.astro` | W-ADV-02: burbuja de intención 288×61 radio 12 → línea 1 px de 80 px → caja octogonal 338×215 (esquinas cortadas a 40 px, SVG) con trazo 2 px crema al 30 % que pasa a teal al resolver; "MARCY" mono 10 tracking 2.2 px en vertical a ambos lados; dos puertas (barras 130×3) que se separan → píldora mono 13 fondo `--w-s-solid` radio 8 padding 6×14 ("agendar · sábado 10:00") → veredicto 13/500 ("Respondido" en teal, el acento de la página / "Te lo pasa" en crema al 70 %) + explicación 13 al 60 % → abanico de 4 curvas 1 px → 4 etiquetas mono 11 en caja borde 1 px radio 6 (WhatsApp · Web · Instagram · Google, en texto). Recortes `cat/productos-avanzados/W-ADV-01.jpg`, `W-ADV-02.jpg` | 2 ciclos y se detiene (§2.10, firma de IA para pymes) · móvil 335 px |
| RespuestaAsistente | `objetos/RespuestaAsistente.astro` | W-CORE-10: bandeja radio 20 padding 14, tarjeta interior radio 12: pregunta ("¿Quién hace webs en español en Houston?"), fila "Buscando…" → check teal 14 en círculo, fila "Leyendo fuentes" → check, burbuja final radio 8 que cita "Tu Negocio" en negrita. `variant: 'tarjeta'\|'tres-columnas'` (la de IA para pymes: ChatGPT te recomienda · Google te resume · Marcy agenda, nombres solo en texto). Recortes `cat/productos-core/W-CORE-10.jpg`, `-tira.jpg` | se escribe una vez (~2.5 s) al entrar |
| TunelRejilla | `objetos/TunelRejilla.astro` | W-ADV-28: rejilla 1 px oro al 6 % en perspectiva hacia un rectángulo central de 840×600 (SVG inline, 4 paredes), arco teal al 10 % desde la esquina inferior derecha (radial CSS); cubre la ventana entera (E-36). Recorte `cat/productos-avanzados/W-ADV-28.jpg` | estático |
| Escaner | `objetos/Escaner.astro` | W-ADV-45: tarjeta radio 48 padding 64; mosaico de chips 49 px radio 12 padding 0×22 texto 16 al 50 % fundidos hacia los bordes; caja central 250×172 radio 12 borde 1 px oro, fondo oro al 15 %, con la web dibujada en línea; chips = señales reales del motor v2 (cotejar con `lib/diagnostic-checks.mjs`: velocidad, ficha de mapa, reseñas, datos para IA, móvil, idioma). Recorte `cat/productos-avanzados/W-ADV-45.jpg` | barra 132×10 barre en 1.8 s (bucle) |
| Interruptores | `objetos/Interruptores.astro` | W-HOME-06: bloque 560×550; tarjetas 360×62 radio 16 padding 20 borde 1 px al 4 %, paso 78 px, en arco (central sobresale 96 px a la izquierda, ±24 px por paso a la derecha); interruptor 40×22 (tirador 20); etiqueta 14/500; chapa 22 px radio 8 "Activo" en tinta `#0e0e0d` con texto crema (objeto claro: estado por valor) / "Listo" gris; opacidades 100/70/40/12 %; rayas verticales 1 px cada 5 px oro en óvalo difuminado detrás. Cada tarjeta es `<a>` a su servicio. Recortes `cat/home-nav/W-HOME-06.jpg`, `-tira.jpg` | bucle §2.10 (firma de servicios) · móvil: pila reducida bajo el H1, nunca oculta |
| PlanoMarca | `objetos/PlanoMarca.astro` | W-NEW-12: marco 1136×~1090 radio 6, regla perimetral (1-6, A-D, mono 10 al 40 %), cuadrícula 1 px al 6 %; izquierda ~660: marca de EJEMPLO "Tu Marca" (isotipo abstracto de sello + palabra, diseñada por nosotros) en vista frontal (círculo 360 con trazo doble 1.5) y vista de aplicación con cotas ("Ø52", "15.5", mono 11); llamadas en círculos de 22 px; derecha 340: 8 filas de ~60 px (número, nombre 14/500 + punto 6 px, detalle 13) = entregables reales; cajetín mono con datos del encargo: "Tu Marca · Manual de marca · Entrega: logo, colores, tipografía" (E-13; las cotas "Ø52" y "15.5" se quedan, van bajo "Ejemplo"). Recortes `cat/authmd-init/W-NEW-12-tira.jpg`, `W-NEW-12-cajetin.jpg`, móvil `cat/authmd-init/W-NEW-movil-badge.jpg` | hover de fila → fila y pieza en oro 200 ms (sin bucle) · móvil: plano arriba, lista debajo |
| ChipBarrio | `objetos/ChipBarrio.astro` | W-CONV-23 contando el mecanismo (revisión 1, E-34): chip 164×164 radio 8 opaco `--w-s3` borde 1 px, halo oro 24 px estático; dentro, pin + "Tu negocio" con un mini botón "Llamar" (ficha mínima de EJEMPLO, rótulo "Ejemplo"); los pulsos van POR las calles HACIA el chip (clientes que llegan). Calles: solo las 2-3 vías por las que la gente reconoce el barrio (p. ej. I-10 y Grand Parkway en Katy), de datos reales (E-49) y generalizadas como cartógrafo (E-53), con su nombre en letra de texto ≥ 13 px FUERA del chip. Prop `tracks: { d: string, name?: string }[]` (máx. 8 rutas en un viewBox de 164) + `name`. Las pistas nacen solo en la franja bajo los botones (máscara que las corta 24 px por debajo del último texto), nunca detrás del texto (E-37). Si en la primera captura no se reconocen, circuito abstracto declarado. Recortes `cat/conversion/startups-int/W-CONV-30-hero-f0.jpg`, `-f4.jpg`, `-chip-tira.jpg`, móvil `cat/conversion/startups-mov/s00.jpg` | pulsos §2.10 (firma de barrios), solo CSS · móvil: chip 140 |
| PlacaLogo | `objetos/PlacaLogo.astro` | W-PROOF-16: logo de empresa (planeta ilustrado del schema) como pieza física sobre placa de circuito oscura con pistas oro al 12 %; SVG inline en dos capas (apagado/encendido), sin imagen binaria. Recorte `cat/prueba-empresa/W-PROOF-about-hero-tira.jpg` | encendido único: fundido 2 s con 600 ms de retraso |
| SolicitudOficio | `objetos/SolicitudOficio.astro` | Contenido de `TarjetaObjeto` para sectores: `kind: 'contratista'` (teléfono con "Solicitud de presupuesto: remodelación de cocina · Katy · 21:40" + "Responder"), `'inmobiliaria'` (ficha de propiedad de ejemplo + "¿Sigue disponible?"), `'restaurante'` (menú + "Pedir por WhatsApp") | estático |
| CorreoPropuesta / PantallaEsqueleto / WebPublicada | `objetos/MiniPasos.astro` (`kind`) | Mini-UIs de los 3 pasos (correo "Tu propuesta" con hora, pantalla en esqueleto, web con "● Publicada" teal) para BandejaPasos, + `kind: 'mantenimiento'` ("Copia de seguridad · Hecha", para la celda de Servicios) | estático |

### 3.7 Plantilla de landings (ola 0C)

| Pieza | Archivo | Qué hace |
|---|---|---|
| Despachador | `src/components/ClusterLanding.astro` (editado una vez) | Al principio: `const kind = KIND_BY_PATH[cluster.path]` (mapa explícito de `w/landing/registry.ts`; la tabla de regex de `deriveDefaultService` NO se copia: manda bienes raíces a diseño web, junta las dos IA y deja sin tipo a barrios y sectores); si `kind` existe y su tipo está listo, renderiza `<WLanding cluster lang kind />` y nada más; si la ruta no está en el mapa o su tipo no está listo, el cuerpo actual intacto (cerrado por defecto). Cada ola activa su tipo sin volver a tocar este archivo |
| WLanding | `w/landing/WLanding.astro` | `Layout ds="v3"` + ServiceLd (slot head, igual que hoy) + SiteNav + `main.w-rails[data-w]` + hero del tipo + secciones del tipo en orden + `Contact` (mismos `defaultCity`/`defaultService` que hoy) + SpaceBackdrop + SiteFooter |
| Registro | `w/landing/registry.ts` (lo escribe 0C y NADIE más lo edita) | `KIND_BY_PATH` con las 19 rutas que usan `ClusterLanding` (comprobadas en el repo): `/es/houston/diseno-web`, `/es/miami/diseno-web` → `web`; `/es/houston/ecommerce`, `/es/miami/ecommerce` → `ecommerce`; `/es/houston/seo-local`, `/es/miami/seo-local` → `seo-local`; `/es/houston/ia-conversacional`, `/es/miami/ia-conversacional` → `ia-chat`; `/es/ia-para-pymes`, `/en/ai-for-small-business` → `ia-pymes`; `/es/houston/branding` → `branding`; `/es/houston/contratistas`, `/es/houston/bienes-raices`, `/en/houston/contractors`, `/en/houston/restaurants` → `sector`; `/es/houston/katy`, `/es/houston/sugar-land`, `/es/miami/doral`, `/es/miami/hialeah` → `barrio`. Tipos listos = `import.meta.glob('./kinds/*.ts', { eager: true })`: un tipo está listo cuando existe su archivo, y ninguna tarea comparte archivo |
| Tipos | `w/landing/kinds/{web,ecommerce,seo-local,ia-chat,ia-pymes,branding,sector,barrio}.ts` | `{ Hero, sections: SectionSpec[] }`; propiedad exclusiva de su tarea |
| Datos nuevos | `src/i18n/w/<kind>.ts` | Copy nuevo y libre (eyebrow, cola, tríada, textos de objetos, títulos de sección) por `path`, ES y EN. `clusters.ts` no se toca |
| Muestrario | `src/pages/es/w-muestrario.astro` (`<Layout noindex ds="v3">`) + `src/pages/es/w-muestrario-base.astro` (sin `ds`, prueba del Cerrojo 5) | Todos los componentes con datos de ejemplo para capturar y comparar con recortes. Astro no enruta los archivos de `src/pages` que empiezan por `_`: por eso no va en `_w/`. Fuera del sitemap con `&& !page.includes('/w-muestrario')` en el `filter` de `astro.config.mjs` (excepción de 0C; `@astrojs/sitemap` no filtra desde el frontmatter), comprobado en `dist/sitemap-0.xml`. **Se borran los dos archivos y la condición antes de cualquier merge** |

---

## 4 · Plan por página

Convenciones de esta sección:
- **H1** = texto actual, verbatim (§2.14). **Cola** = frase nueva en `.w-h1__tail`. Copy nuevo propuesto entre comillas, escrito con las reglas (sin guiones conectores, "dominamos" la IA, sin cifras ni reseñas inventadas); el dueño lo revisa en el render.
- **Contraste** = el único capítulo `.w-contrast` o `.w-dawn` de la página. **Firma** = el único bucle. **Degradado** = el único elemento `.w-grad-text`.
- Toda página v3: `Layout ds="v3"`, `main.w-rails[data-w]`, SpaceBackdrop (tono de la página), raíles, Contact `#contacto` al final antes del pie (salvo donde hoy no existe), cierre `CierreDosTarjetas` con el trío contractual en lugar de `CtaBand`.
- "Libre" = copy que el mapa de landings marca como reescribible (`hero.sub`, `chips`, `kicker`, `includes.*`, `local.title`, `pricing.lead/features/note`, `proof.title`, `faq.title/tag`, `cta.*`, `related.*`). "Congelado" = se pinta literal.
- **R1 · Franja "En pocas palabras"** (revisión 1, B-01): nunca en las dos primeras posiciones tras el hero; va justo antes de `PreguntasFrecuentes` (o del cierre si la página no tiene FAQ). Donde hay tríada, el orden es hero → tríada → 1.ª demo. Las listas de cada página conservan su numeración original (por eso algunas empiezan en 2) para que las referencias cruzadas sigan valiendo. En los hubs de ciudad no aplica: la franja se queda en su sitio del viaje.
- **R2 · Colas**: mismo tono que el H1 o degradado; regla de longitud de §2.14. Sin cola en sobre nosotros, bienes raíces, contratistas (ES), SEO para IA y barrios.
- **R3 · Eyebrow** = nombre de producto (§2.14), nunca repite el H1.
- **R4 · Copy EN**: escrito nativo, no traducido palabra por palabra (E-26), con las mismas prohibiciones (sin guiones conectores, "we master AI", nunca "built with AI"). Cada tarea lista sus textos EN nuevos en su informe; entran en §7.3-6 y el director repasa todo el EN en el Punto de control 2, antes de la ola 2.
- **R5 · Enlaces**: las páginas EN y las tarjetas hermanas usan EXACTAMENTE los `href` que la página tiene hoy (`related.links`, filas `svc`, `priceServices`); prohibido crear o adivinar URL. `verify-extra` falla si un `href` interno da 404 en `dist/`.
- **R6 · Precio grande**: la cifra de `PrecioPuntos` es por defecto el ancla baja de `PRICE_ANCHORS` con "Desde" a su altura; el slice va abajo a la derecha. La versión con el slice en grande se enseña al lado en el render y decide el dueño (§7.3-12). El JSON-LD no cambia.

### 4.1 Portada · `/es`, `/en` (SOLO detalles permitidos)

**NO se toca** (verificado por §2.13): hero completo (`Hero.astro`: titular, planeta, órbita, lunas, pista, dock, pre-pintado anti-CLS, motor), StarField y todos los `data-fx`, el orden de secciones (Hero · Servicios · IA · Diagnóstico · Proceso · Proyectos · Garantías · Ciudades · Contacto), los titulares de sección (siguen `.h2` 600: la escala nueva NO entra en la portada para que la página no quede con dos escalas), `AiSection.astro`, `Process.astro` con su cohete en móvil, `Locations.astro`, el formulario de `Contact.astro`, las anclas `#servicios`, `#ia`, `#diagnostico`, `#proyectos` (destinos de las lunas), `content.ts`.

**Sí cambia (detalles permitidos por el dueño: tarjetas, proyectos, diagnóstico de IA):**

| Sección | Archivo | Cambio | Pieza | Condiciones |
|---|---|---|---|---|
| Servicios (tarjetas) | `sections/Services.astro` | Las tarjetas "destacado + compactas" pasan a rejilla 2 columnas de 552 (hueco 96 × 75) con icono-objeto 80 + nombre 20/500 + 2 líneas 16/24; el 7.º producto (Mantenimiento) va como fila ancha final a dos columnas con icono 56 (resuelve "2×3 son 6"). Cada celda enlaza a su servicio. Recorte `cat/home-nav/W-HOME-10.jpg` | W-HOME-10 + G6 | conserva `id="servicios"`, `data-fx="gold"`, el titular y la bajada de la sección tal cual; fondo de celdas translúcido (no tapa StarField, riesgo 6) |
| Diagnóstico de IA | `sections/GrowthTeaser.astro` (compartido con los 4 hubs) | La tarjeta del teaser pasa a mini `Escaner` ESTÁTICO (chips de señales reales visibles, barra quieta a media altura que recorre UNA vez al entrar en vista; el bucle queda para /diagnóstico) a la derecha del texto actual; botón principal igual; textos de los chips en `src/i18n/w/portada.ts` | W-ADV-45 compacto | conserva `id="diagnostico"`, `data-track="growth_teaser_clicked"`, el texto, y su alto ±40 px (en el hub vive dentro de `.diag[data-atmo]`); sin precios |
| Proyectos | `sections/Projects.astro` (tras la migración, solo lo usa la portada) | Carrusel laptop + teléfono → figuras W-PROOF-12 con el componente compartido `w/FiguraProyecto.astro`: capturas reales en marco de navegador 736 radio 8 (3 puntos + dominio sin enlace) con teléfono solapado y pie mono 13 ("Texas Rush Remove · Junk Removal · Houston"); 2 por fila en escritorio, alternando; en móvil una columna y "Ver proyectos" si hay más de 2 | W-PROOF-12 | conserva `id="proyectos"`, `data-fx`, `/Galeria/*` con `srcset`, `width/height` y `loading="lazy"`; borra su propio script de carrusel (`[data-projects]`) |
| Garantías (tarjetas) | `sections/Guarantees.astro` | Tarjetas → 3 columnas separadas por líneas de 1 px (celdas W-CORE-23, sin caja), mismo texto | W-CORE-23 | titular `.h2` intacto |

Degradado: ninguno en portada. Firma: la portada ya tiene su motor orbital; el mini escáner es estático (un solo recorrido al entrar). Cierre: NO se añade sección nueva (revisión 1: alargaría el final del viaje y crearía un lienzo de estrellas más, E-16); si el dueño lo pide al ver el render, se mete dentro del contenedor de `Contact`, sin `data-fx` nuevo. Megamenú: aparece (G10) con la verificación de §2.12.

### 4.2 Hubs de ciudad · `/es/houston`, `/es/miami`, `/en/houston`, `/en/miami` (SOLO detalles permitidos)

**NO se toca**: portada fija y globo (CityHub 39-77, `hero.js`), viaje de cámara (`atmo.js`), nubes (`clouds.js`, nubes de márgenes 127 y banco 174), `cities.js`, mapa local con zonas (176-202, `page.js` 157-284), `page.js` entero, FAQ (no se tocan texto ni JSON-LD; la piel sí, fila 8), formulario, silueta del pie, todas las marcas `data-atmo` en su sitio y orden, el `<h1>` y su `.hx .h1` 700 de `city.css` 88, los `.h2` de sección (siguen 600, sin escala nueva), `Breadcrumb`.

**Sí cambia (contenido dentro de contenedores conservados):**

| Sección (líneas de CityHub) | Cambio | Pieza | Condiciones |
|---|---|---|---|
| 2 Servicios (79-123) | Bajo las 3 viñetas animadas (se conservan como cabecera: `[data-vig]` de `page.js` 17-77 sigue animándolas), las filas de enlaces pasan a bandeja de tarjetas hermanas con icono-objeto 48, nombre y "desde $X" (las 7 landings del silo de esa ciudad; en Miami, las que existen + hub de servicios para las que no) | W-ADV-40 | se conservan `id="servicios"`, `<header data-atmo>` (82) y `<ol data-atmo>` (87) con altura parecida; bandeja translúcida (`--w-s1-a`), no opaca a sangre. La bandeja añade ~400 px bajo las viñetas: se mide antes y, si mueve el sol más de 40 px, se compensa DENTRO del `margin-top: 36vh` de `.svc__grid` (`city.css` 146; 30svh en móvil, 411), nunca fuera |
| 3 Proyectos (125-171) | Revisión 1 (B-03): se CONSERVA la estructura de pasos pegajosos y su altura (`pf__grid`, `.pf__stage` pegajoso de 500 px, `.pf__step` de 76vh, `city.css` 225-246, y las marcas `data-atmo`); cambia SOLO la representación: el portátil y el teléfono pasan a la figura W-PROOF-12 (marco de navegador radio 8 con 3 puntos, teléfono solapado, pie mono "Texas Rush Remove · Junk Removal · Houston") y cada paso de texto a la tarjeta W-PROOF-13 con franja de 4 px en el `accent` del proyecto (Houston: TRR, RN, JLS; Miami: MJA rotulado "Florida (Orlando)"; `pf--solo` igual que hoy) | W-PROOF-12 + W-PROOF-13 | `page.js` 79-141 NO se borra: sigue moviendo las capturas; se reestiliza por CSS y marcado dentro de las mismas clases `.pf__*`. Sin citas. Si el ejecutor cree que hay que acortar el tramo, eso altera el viaje: pregunta al dueño con tira de fotogramas antes/después |
| 5 Sectores (204-222) | Tarjetas "¿Dónde está tu negocio?" con los sectores y los barrios con página (Houston: Katy, Sugar Land, contratistas, bienes raíces; Miami: Doral, Hialeah) | W-CONV-33 | los 7 enlaces de sector + 2 de zona intactos; el mapa y su lista `#hx-zones` no se tocan |
| 6 Diagnóstico (224-225) | Hereda el cambio de `GrowthTeaser` (§4.1, estático) | W-ADV-45 compacto | `.diag[data-atmo]` intacto |
| 7 Respuesta directa (227-242) | Caja → franja "En pocas palabras" en su sitio del viaje (texto literal; sin columnas: un hub no tiene servicio). Las `answer.figs` NO se borran de los datos: 4-hubs deja de pintar las que no tengan fuente y lo apunta en su informe como decisión del dueño | W-CORE-23 / G8 | `data-atmo` (228) intacto |
| 8 FAQ (244-259) | Piel de tarjetas sueltas W-CONV-11, todas cerradas, mismo texto y JSON-LD | W-CONV-11 | `data-atmo` (245) intacto |
| 9 Sigue explorando (261-271) | `TresGarantias` (contacto en 1 hora hábil · propuesta en 24 horas · la web es tuya) + 3 tarjetas de recurso con los 3 enlaces del silo | W-CORE-23 | enlaces intactos |
| 10 Cierre (273-285) | Tarjetas `CierreDosTarjetas` DENTRO de `<section class="cta" data-atmo>` (274), el horizonte encendido sigue detrás; recibe `tel`/`wa` de `CityHub` (31-32) y en el mismo cambio se borran las 3 líneas viejas del trío (279-281) | W-CORE-15 | cada clase del trío sale exactamente 1 vez, con el teléfono de su ciudad (lo comprueba `verify-extra` en los 4 hubs); sin opacar el horizonte (tarjeta grande `--w-s2-a` sobre noche lisa) |

CSS de estas secciones: reglas nuevas con prefijo `w-` dentro de `city.css` SOLO en bloques de esas secciones, o mejor en los propios componentes `w/` (preferido). Comprobación de alturas de `data-atmo` ±40 px (§2.13 paso 5). Degradado: ninguno. Firma: el viaje.
Revelado (revisión 1): en el hub los componentes `w/` se envuelven en el contenedor que hoy lleva `data-rev`/`data-rev-list` (`page.js` 12-15); esos atributos se conservan y los componentes NO ponen `data-w-reveal`. Copy nuevo (garantías, textos de tarjetas de sector y barrio) en `src/i18n/w/hubs.ts` (ES+EN, Houston y Miami).

### 4.3 Servicios (hub) · `/es/servicios`, `/en/services`

Contraste: capítulo 4 (un capítulo por servicio) en `.w-contrast`. Firma: interruptores. Degradado: titular del cierre.

- **Hero** (A-04 + W-CONV-01 + W-HOME-06): cabecera partida a 1200: izquierda (560) migas, eyebrow oro "Servicios", H1 hub 52/500 **"Todo lo que tu marca necesita"** (verbatim, `<em>` en oro), cola "En un solo equipo, en tu idioma." (si cumple la regla de longitud), bajada de una línea (`s.hero.sub`, libre, 19 px), SIN botones (revisión 1, E-05: hub con cabecera compacta; el primer CTA llega con el catálogo). Derecha (480×420): `Interruptores` con los 7 productos de `pricing.ts` en su orden (Web rápida → diseño web · Marcy 24/7 → IA conversacional · Que la IA te nombre → SEO para IA · Tienda → ecommerce · SEO local · Marca → branding · Mantenimiento), chapa "Activo"; cada tarjeta enlaza (hrefs de `priceServices`). Resuelve el desajuste del plan (sin "Ficha de Google" suelta, con Mantenimiento). Móvil: pila reducida bajo el H1.
- **Secciones**: 2) `CabeceraNumerada 01 "POR ETAPA"` + `Inventario3Etapas` (Que te encuentren: SEO local, SEO para IA · Que te elijan: diseño web, branding · Que te escriban y compren: IA conversacional, tienda, mantenimiento; cada ítem enlaza). 3) `02 "CATÁLOGO"` + `TarjetasHermanas` con los 7 (sin `currentId`) dentro de `<div id="precios">` conservando `data-track="pricing_card_clicked"` en cada tarjeta. 4) **Contraste** `CapituloDosFrases` ("Siete servicios." / "Un mismo cliente: tú.") + `Bento2x2` con 7 celdas y `wideLast` (una por servicio, cada una con su objeto: `WebEjemplo` móvil, `FichaMapaEjemplo`, `ChatMarcy` estático, `RespuestaAsistente` mini, `ListaPedidos` estática, mini `PlanoMarca`, panel de mantenimiento "Copia de seguridad · Hecha" en `MiniPasos`), con `id="<id>"` por servicio (ancla `#mantenimiento` para el megamenú). 5) `03 "EMPIEZA POR TU CASO"` + `TarjetasPerfil` ("Abro mi negocio" → diseño web · "Ya tengo web pero no me llaman" → `/es/diagnostico` con `tool_cta_clicked` (sustituye a GrowthCta) · ancha "Ya soy cliente" → mantenimiento). 6) `04 "POR QUÉ MARCYAN"` + `CuatroRazones` con `s.why.items` (libre). 7) `FranjaEnPocasPalabras` (`s.answer` verbatim) y, a continuación, `PreguntasFrecuentes` (7, verbatim). 8) `CierreDosTarjetas` (pequeña: diagnóstico). 9) Contact.
- **Reutiliza**: `s.answer`, `s.faq`, `s.why`, `priceServices`, `offerItems`, `s.related` se absorbe en el inventario.
- **Contratos**: `OfferCatalogLd` + `ItemListLd` + BreadcrumbList intactos (no dependen del componente); FAQPage verbatim; anclas `#precios`, `#contacto`; `pricing_card_clicked`, `tool_cta_clicked`. EN: `services.astro` espejo (sin GrowthCta hoy: la tarjeta "Ya tengo web" a `/en/checkup` es nueva en EN, aceptable).

### 4.4 Precios · `/es/precios`, `/en/pricing`

Contraste: solo la tarjeta "Mensual" del hero; el banner "Combina servicios" va en `--w-s1`. Firma: ninguna (página de decisión, F-06 "cuándo NO"). Degradado: ninguno (W-CONV-12 en oro plano, como dice el plan).

- **Hero** (A-04 + W-CONV-01 + W-CONV-02): centrado, H1 hub **"Precios claros, sin letra pequeña"** (verbatim, en 2 líneas: "Precios claros," / "sin letra pequeña"), sin cola; bajada de una línea con las 3 chips de `p.hero.chips` convertidas en texto ("Precio desde visible · Propuesta en 24 horas · La web es tuya"); a 80 px, `TarjetasModelo` asomando en la primera pantalla: "Pago por proyecto" (diseño web desde $400, tienda desde $900, branding: logo desde $150; "Ver precios ↓" a `#precios`) y "Mensual" (SEO local desde $600 al mes, mantenimiento desde $120 al mes, monitoreo de IA desde $200 al mes; corrección: Marcy NO es mensual en `pricing.ts`, se quita). Precios tomados de `PRICE_ANCHORS`.
- **Secciones**: 2) `Prose` de transparencia (`p.transparency`, "La mayoría te esconde el precio recurrente") como `ProsaLocal` a dos tonos (texto verbatim; el plan no lo ubicaba). 3) `01 "LO QUE CUESTA"` + 7 `TarjetaPrecio` (una por servicio de `priceServices`, niveles exactos, sin deslizador) dentro de `<section id="precios">`, `pricing_card_clicked`. 4) `02 "INCLUIDO EN TODA WEB"` lista 2×N W-CONV-10 (icono-objeto 52, solo lo que dicen las checklist de `pricing.ts`). 5) `03 "DESPUÉS DE PUBLICAR"` 3 columnas W-CONV-08 (mantenimiento, SEO local, monitoreo de IA). 6) Banner W-CONV-07 1060×306 "Combina servicios" en `--w-s1` (sin descuentos inventados; enlace a propuesta). 7) `TresGarantias` W-ADV-49 (contacto en 1 hora hábil · propuesta en 24 horas · la web es tuya; no se fusionan). 8) `FranjaEnPocasPalabras` (verbatim; vuelve al final, donde la ponía el plan del juez) y, a continuación, `PreguntasFrecuentes` (8, verbatim) con sello W-CONV-52 "Verificado el [fecha]" SOLO en respuestas con datos de mercado y con la fecha real de su fuente. 9) W-CONV-12 776×328 en oro plano "¿Te quedó alguna duda?" con botón a propuesta + enlace al diagnóstico (`tool_cta_clicked`), que sustituye a GrowthCta. 10) `CierreDosTarjetas`. 11) Contact.
- **Contratos**: `OfferCatalogLd` con todos los niveles; paridad `check:kb`; FAQPage verbatim; `#precios`; el bloque `.promise` de la página desaparece (su contenido pasa a la bajada y a W-ADV-49).

### 4.5 Portafolio · `/es/portafolio`, `/en/portfolio`

Contraste: el primer proyecto (TRR) en `.w-contrast`. Firma: ninguna. Degradado: titular del cierre W-PROOF-14.

- **Hero** (W-PROOF-05 + W-PROOF-01 + W-PROOF-06): izquierda columna 688: migas "Inicio › Portafolio" 14 oro, H1 hub **"Trabajo real, negocios reales"** (verbatim), cola "Cuatro webs que trabajan.", trama de puntos tenue tras el titular (franja de 120 px a sangre), entradilla actual (libre) 19/30; debajo la **captura real de Texas Rush Remove** (`/Galeria/trr-pc-900.webp`) en marco de navegador 736 radio 8 que sobresale 26 px a la izquierda (aquí SÍ: es prueba, excepción explícita a E-32). La captura enlaza a `#trr` y el bloque de TRR arranca por el relato y la ficha lateral, sin repetir la captura grande. Derecha la `FichaLateral` pegajosa (Sector · Ciudad · Servicios Marcyan enlazados a sus landings) del proyecto visible.
- **Secciones**: 1) `TiraLogos`. 3) Un bloque por proyecto (orden actual: TRR, MJA "Florida (Orlando)", JLS, RN), cada uno con ancla `id="trr|mja|jls|rn"`: `FichaProyecto grande` + `RelatoEnActos` con DOS actos con datos existentes ("Lo que hicimos" = `did`, "Cómo quedó" = `result`); "El negocio" y "El problema" solo si el dueño da el texto (no se inventa); figuras W-PROOF-12 (pc + móvil); `FichaLateral` pegajosa a la derecha con los servicios enlazados (`serviceHref`). "Ver la web" del cliente NO se enlaza (decisión de privacidad del schema), salvo OK del dueño. 4) Tarjeta pegajosa W-PROOF-07 (`w/sections/portafolio/TarjetaLateral.astro`) "Una web como esta, desde $1,500" en la columna lateral del último proyecto. 5) `CeldaTuNegocio` (WhatsApp). 6) `FranjaEnPocasPalabras` (`answer` verbatim) y `PreguntasFrecuentes` (7, verbatim). 7) Cierre W-PROOF-14 456 px con rejilla de rombos tenue, H2 52 en degradado "¿Cuál es la historia de tu negocio?" + `CierreDosTarjetas` debajo. 8) Contact.
- **Contratos**: `CollectionPageLd` (ItemList de CreativeWork con imagen `/Galeria/<slug>-pc.webp`, sin URL externa); capturas con `width/height`; `serviceHref`; FAQPage; EN espejo sin GrowthCta (como hoy).

### 4.6 Sobre nosotros · `/es/sobre-nosotros`, `/en/about`

Contraste: `.w-dawn` de la 1.ª sección (la placa encendida). Firma: encendido único de la placa (no bucle). Degradado: titular del cierre (sin cola, R2).

- **Hero** (A-04 + W-PROOF-16): cabecera compacta centrada (revisión 1, E-05), H1 hub **"La agencia hispana que pone la IA a trabajar para ti"** (verbatim), sin cola; la frase "Dominamos la IA para que tu negocio no tenga que hacerlo." pasa a la bajada de 19 px (libre, junto a `a.hero.sub`). La `PlacaLogo` (logo de empresa del schema, no el BrandType ni el favicon) baja a la 1.ª sección, sobre el `.w-dawn`, y se enciende una vez al entrar en vista (2 s, retraso .6 s).
- **Secciones**: 1) `PlacaLogo` + `CapituloDosFrases` + `a.story` verbatim (columna 680). 2) `01 "DATOS, NO ADJETIVOS"` + `Especificaciones` 3×2: Ciudades · Houston y Miami / Idiomas · Español e inglés / Precios · Públicos / Contacto · 1 hora hábil / Propuesta · 24 horas / Visibilidad en IA · "Clientes que la IA ya recomienda" (celda que el dueño mantiene, 1-nov). 3) `02 "CÓMO ES UN PROYECTO"` + `TablaFases` alimentada por `content.process` (Process.astro no se toca). 4) `03 "POR QUÉ MARCYAN"` + `CuatroRazones` con `a.values`. 5) `04 "DÓNDE ESTAMOS"` + `SedesAcordeon` con `content.locations` (NAP real, siluetas reales, cerrado al cargar). 6) Clientes fundadores W-CONV-17 (izquierda 384 con titular y 3 checks de `a.founders` verbatim; derecha tarjeta 576 con halo oro que contiene el enlace a `#contacto`, NO un formulario nuevo). 7) `FranjaEnPocasPalabras`. 8) `PreguntasAbiertas` 2 columnas (8, FAQPage verbatim). 9) Salida suave W-PROOF-21 (2 tarjetas 580×100: "Mira el portafolio" · "Habla con Marcy" que dispara `mrc:ask`). 10) `CierreDosTarjetas`. 11) Contact (se mantiene aunque el plan no lo citaba: destino de CTAs globales).
- **Contratos**: `AboutPageLd`; sin nodo Person ni AggregateRating; FAQPage; NAP; `call_clicked`.

### 4.7 Blog (índice) · `/es/blog`, `/en/blog`

Contraste: la destacada W-CONT-02 sobre `.w-contrast` de 420 px. Firma: ninguna. Degradado: ninguno (en el blog la luz la dan las ilustraciones).

- **Hero** (W-CONT-01): H1 hub 52/500 a x=120 **"Guías honestas para hacer crecer tu negocio en línea"** (verbatim), sin bajada, sin cola. La píldora "Recibe las guías por correo" **NO se construye**: exige endpoint, tabla y puerta técnica completa (formulario nuevo = decisión del dueño, no viene de regalo). En su lugar, a la derecha, píldora 232×41 que enlaza a `/es/diagnostico` ("Diagnóstico gratis de tu web") o se omite; se le pregunta al dueño en el render.
- **Secciones**: 1) Destacada W-CONT-02 1312×420 radio 48 que sobresale 56 px por lado: texto | `BlogIllustration` propia a sangre (nunca capturas). 2) Pareja W-CONT-09 (2×576, imagen 576×368 radio 8). 3) Filtro W-CONT-05 por tema (se mantiene el filtrado por `tag` actual, progresivo y con `aria-pressed`, píldoras radio 100 alto 43, activa con borde 2 px oro). 4) Lista W-CONT-06 imagen 50 / texto 50, `#articulos`. 5) Cierre W-CONT-50 (2 tarjetas 576×129: Propuesta gratis / Diagnóstico gratis) + `CierreDosTarjetas` NO (sería doble cierre): aquí el trío va en la tarjeta "Propuesta gratis" con las clases contractuales. 6) Contact.
- EN: hoy 0 artículos EN; se diseña el estado vacío (hero + "Our English guides are coming soon." en una celda punteada W-NEW-08 + enlace a las guías en español), nunca listar artículos ES.
- **Contratos**: `BlogListingLd`, BreadcrumbList, filtro progresivo (sin JS se ven todos los artículos; con JS filtra y actualiza `aria-pressed`, como hoy en `blog/index.astro`), `#articulos`, orden por fecha.

### 4.8 Artículos del blog (6) · `/es/blog/<slug>` (sin espejo EN)

Contraste: ninguno extra (página de lectura; la portada ensanchada aporta la luz). Firma: ninguna. Degradado: ninguno.

- **Hero** (W-CONT-20): columna 680 desde x=380, título = H1 48/1.1 500 (`title` del frontmatter verbatim), bajada ~22/31 al 80 %, fila fecha y tiempo de lectura (sin autor inventado: "Equipo Marcyan"), línea 1 px, fila "Pregúntale a tu IA" (W-CONT-22: rótulo mono 11 + 3 enlaces que abren ChatGPT, Claude y Perplexity con la pregunta del artículo en la URL; solo la pregunta, ningún dato del visitante), portada `BlogIllustration` ensanchada a 746 (sobresale 33 px), radio 8.
- **Secciones**: 2) Lectura W-CONT-23 19/1.65 en 680, H2 26/33.8, H3 22/28.6 (`Article` reestilizado, el Markdown no se reescribe). 3) Índice W-CONT-21 a x=120, 200 px, pegajoso `top: 32` (en `sections/ArticleRail.astro`, solo piel), DESPLEGADO por defecto a ≥ 1280; por debajo se pliega en rayas oro 18×1 cada 11 px y se despliega en 250 ms con clic o toque (sin hover en táctil, E-40); **se conservan** `RailCta` (mini-form con su guardado y honeypot) y `RailTools` como las 2 tarjetas fijas del raíl; la tarjeta W-PROOF-07 NO se añade (sería una 3.ª tarjeta de conversión: se elige RailCta). 4) Comparativas W-CONV-37 solo si el Markdown ya trae la tabla (sin nombrar rivales). 5) `PostNav` + "Sigue leyendo" W-CONT-26 (`w/sections/blog/SigueLeyendo.astro`) (filas 680×176 con miniatura 140×88) + enlace a su landing. 6) `FranjaEnPocasPalabras` con `answer` + `source` verbatim y sello W-CONV-52 con `updated`, y `PreguntasFrecuentes` del frontmatter. 7) `CierreDosTarjetas`. 8) Contact.
- **Contratos**: `ArticleLd` (BlogPosting), FAQPage, BreadcrumbList, `headings` para el índice, prev/next, precios del raíl desde `PRICE_ANCHORS`, sticky verificado en el Chrome real (E-09).

### 4.9 Diagnóstico gratis · `/es/diagnostico`, `/en/checkup`

Contraste: la mitad izquierda del hero (tarjeta del formulario en `--w-s-solid`). Firma: escáner del hero (se PAUSA mientras el visitante escribe: `focusin` dentro del formulario lo para, `focusout` lo reanuda, E-42). Degradado: ninguno.

- **Hero** (A-05 + A-09 + W-GAP-03 + W-ADV-45): partido 600/600. Izquierda: sin eyebrow (repetiría el H1, R3), H1 hub **"Revisa gratis si tu negocio está perdiendo clientes online"** (verbatim), sin cola, y debajo el **`DiagnosticWizard` entero** (misma máquina de estados: form 3 pasos, scan, result, claim, success) en tarjeta oscura con `id="diagnostico-form"` (arregla el ancla rota del botón actual); el wizard no lleva `data-w-in` (§2.9). Derecha: `Escaner` con la web dibujada y los chips de señales reales; debajo, en la columna del escáner y nunca dentro de la tarjeta del formulario, 2 checks de lo que pasa después ("Ves tu resultado al momento" · "Te lo mandamos por correo si quieres"; regla "formularios sin precios ni 'Gratis'": el "gratis" ya lo dice el H1 verbatim; verificar contra el flujo real).
- **Secciones**: 1) Pasos W-NEW-41 (`w/sections/diagnostico/PasosWizard.astro`) como piel del progreso del wizard (01 Tu negocio / 02 Tu web / 03 Resultado) + estado vivo W-NEW-33 ("● Revisando tu ficha…", punto que late 2 s SOLO durante el escaneo) sobre `ScanSequence` (solo marcado, sin lógica). 2) `01 "LO QUE VERÁS"` `ChipsVeredicto` (Bien · Mejorable · Falta) en `w/sections/diagnostico/ResultadoEjemplo.astro`, rotulada "Ejemplo". 3) `GratisDeVerdad` (sin precios). 4) FAQ: la del wizard se mantiene como ÚNICA FAQPage (se reestiliza con la piel W-CONV-11 por CSS bajo `[data-ds="v3"]`, sin duplicar). 5) Cierre: el `CtaBand` del estado success es parte del flujo y se mantiene (reestilizado como la tarjeta grande de W-CORE-15 con sus clases).
- **Contratos (puerta técnica, PR #46)**: honeypot, freno por conexión/día, errores 429/400/red, guardado antes del correo, claim atómico, PII nunca al modelo ni a `mrc:ask`, formulario SIN precios, TODOS los `data-*` del script (`data-analyze-form`, `data-next`, `data-back`, `data-analyze`, `data-view`, `data-claim-form`, `data-claim-btn`, `data-err`, `data-step-n`, `data-step-title`, `data-biz`, `data-risk`, `data-rec`), eventos `diagnostic_*`, `ServiceLd` priceValue 0, bandera `GROWTH_OS`. Prueba con un envío real de prueba en la vista previa (puerta técnica 2) antes de enseñarlo.

### 4.10 Herramientas · `/es/herramientas`, `/en/tools`

Contraste: la calculadora 1 en superficie elevada. Firma: ninguna (los números cambian al arrastrar, sin bucle). Degradado: total de la calculadora activa.

- **Hero** (A-04 + W-CONV-01): centrado, H1 hub **"Herramientas gratis para tu negocio"** (verbatim), cola "Calcula lo que te cuesta no contestar a tiempo.", bajada de una línea; la calculadora 1 asoma a 80 px dentro de la primera pantalla.
- **Secciones**: 1) Cada calculadora con piel W-CONV-03 / W-CORE-22 aplicada directamente a `ToolsHub.astro` (mismas medidas y tokens que `TarjetaPrecio`, sin usarlo: el contrato de las calculadoras tiene un solo dueño): cabecera con icono-objeto (Marcy para llamadas, calendario Lucide para citas), cuerpo 760/440 con deslizadores (carril 6 px, tirador 28 px con anillo crema 3 px) y total que se recalcula en vivo | desglose de las mismas fórmulas. Se conserva el marcado funcional (`data-calc`, `data-role`, `data-out`, `data-val`, ids `#llamadas` y el de citas) y el script de `ToolsHub`. 2) W-CONV-05 al tope: banda 700×70 radio 12 "¿Quieres que Marcy conteste por ti?" con botón a propuesta (`tool_cta_clicked`) y "Pregúntale a Marcy" (`calc_marcy_opened`, `mrc:ask` con el resultado). 3) FAQ y cierre: NO se añaden FAQ nuevas (copy nuevo a validar; se deja para otra vuelta); `CierreDosTarjetas` sí (con trío). Contact: no existe hoy; SE AÑADE (decidido en la revisión 1: es el destino del trío) y el CTA de la nav de la página (hoy `'/es#contacto'`) pasa a `#contacto`.
- **Contratos**: `#llamadas`, `#citas`, `#calls`, `#appointments` siguen existiendo (los usan `ChatWidget`, `blog.ts` y `clusters.en.ts`); fórmulas `computeMissedCalls`/`computeNoShows`, defaults, eventos `calculator_started/completed`, `calc_marcy_opened`, anclas enlazadas desde landings, bandera `GROWTH_OS`, BreadcrumbList.

### 4.11 IA para pymes · `/es/ia-para-pymes`, `/en/ai-for-small-business` (tipo `ia-pymes`)

Contraste: `.w-dawn` teal (`--w-dawn-teal`, 14 %) en el 30 % inferior del hero; nunca oro en una página teal (E-14). Firma: esclusa de Marcy (2 ciclos y se detiene). Degradado: cola del H1.

- **Hero** (A-05 + W-ADV-01 + W-ADV-02): noche estrellada (SpaceBackdrop teal) con amanecer teal abajo. Rejilla 2 columnas en 1200. Izquierda: eyebrow teal 24/500 "Marcy contesta por ti", H1 noche 60/500 **"IA para tu Negocio"** (verbatim), cola en degradado "Tu negocio contesta aunque estés cerrado.", bajada 20/30 en 512 (libre), botón "Quiero a Marcy" (`#contacto`) + enlace "Ver cómo decide ›" (ancla a la sección 3). Derecha: `EsclusaMarcy` en bucle (columna centrada en x≈1060). Móvil: una columna, esclusa debajo a 335 px.
- **Secciones**: 1) `TriadaManifiesto` ("Contesta. / A cualquier hora." · "Bilingüe. / De verdad." · "Te avisa. / Cuando hace falta."). 3) `01` `DilemaDosCaminos` ("Contestar tú cada mensaje" vs "Un bot de respuestas fijas"; la "?" pasa al icono-objeto de Marcy, disparo único). 4) `02 "LA IA YA DECIDE POR TUS CLIENTES"` intro = `local.paragraphs` **verbatim** (contrato de paridad) + `RespuestaAsistente variant="tres-columnas"` (ChatGPT te recomienda · Google te resume · Marcy agenda), rotulado Ejemplo; no afirma que la IA recomienda a un cliente concreto salvo los 3 confirmados por el dueño. 5) `03 "DÓNDE TRABAJA"` constelación W-ADV-21 reducida a canales reales (WhatsApp, web, Instagram, Messenger, Google) en anillos, sin bucle propio (estática: la firma es la esclusa). 6) `04 "TUS DATOS, A SALVO"` W-PROOF-25 sin sellos: 4 checks reales (los datos personales no pasan por el modelo · te pasa a una persona cuando hace falta · no inventa precios · tú decides qué responde). 7) Caso Rosy Nails & Care `TarjetasCaso` (sin "Caso #0" si no encaja; sin métricas). 8) Precio `PrecioPuntos` con "Desde $500" (ancla baja, asistente básico) y abajo a la derecha "Asistente completo desde $900" (el `service.priceValue` del JSON-LD, que no cambia; la FAQ que dice $900 sigue coherente). Versión con $900 en grande al lado en el render (R6). 9) `FranjaEnPocasPalabras` (`answer` + `source` verbatim) y `PreguntasFrecuentes` (6, verbatim). 10) `CierreDosTarjetas` (pequeña: "Pregúntale a Marcy ahora", `mrc:ask`). 11) `TarjetasHermanas` + recursos (incluye la calculadora `/es/herramientas#llamadas` con `tool_cta_clicked`). 12) Contact con `defaultService` "IA conversacional / Chatbot".
- **Contratos**: un H1; ServiceLd; FAQPage verbatim; paridad de `answer` y `local.paragraphs`; hreflang ES↔EN; trío; `Process` desaparece de esta página (el `hero.secondary` apuntaba a `#faq`, que sigue existiendo).

### 4.12 IA conversacional por ciudad · `/es/houston/ia-conversacional`, `/es/miami/ia-conversacional` (tipo `ia-chat`)

Contraste: sección 4 "Tú le explicas, Marcy lo cumple" en `.w-contrast`. Firma: pestañas de Marcy. Degradado: cifra de precio.

- **Hero** (A-05 + W-ADV-18 + W-ADV-19): centrado en la noche. Chip "Houston, TX" / "Miami, FL", eyebrow teal "Conoce a Marcy", H1 noche 60/500 **"Asistente de IA para tu negocio en Houston"** (verbatim; Miami igual con Miami), cola "Tu recepcionista que no duerme.", bajada de una frase (libre), botón "Quiero a Marcy" + "Ver preguntas ›" (`#faq`, como hoy). Debajo: avatar 3D real de Marcy (blanco, encuadre de contrato, ~260 px), QUIETO: entra con la coreografía como `obj` y se queda (la única vida del hero son las pestañas, E-52) y `MarcoPestanas` 1080 con `ChatMarcy mode="pestanas"` en claro: "Agendar cita · Pedir precio · Fuera de horario · Pasar a una persona", conversación de ejemplo rotulada (precio: Marcy responde "te paso la propuesta", nunca una cifra, como en producción).
- **Secciones**: 2) `01` `SinCon` (caos de mensajes sin contestar vs panel limpio; sin cifras). 3) `02 "CÓMO TRABAJA"` W-ADV-05 (3 pasos con tarjeta-evidencia de 144 px) + chips W-ADV-06 (Respondido / Te lo pasa / Fuera de horario) construido con `BandejaPasos` + `ChipsVeredicto`. 4) **Contraste** `03 "TÚ LE EXPLICAS, MARCY LO CUMPLE"` W-ADV-07 (panel 896×473: a la izquierda 4 párrafos en lenguaje natural del dueño de un negocio de ejemplo, a la derecha las reglas que aparecen fila a fila; ~4 s, una vez). 5) `04 "LO QUE PASÓ HOY"` `RegistroVivo variant="static"` (Mensaje de WhatsApp · Respondido; Cita sábado · Agendada; Pregunta de precio · Te lo pasa…) (5 filas al 100 %, la central realzada; la firma es el hero) + `ChipsVeredicto memory` (W-ADV-23) estáticos. 6) `05 "A DÓNDE TE AVISA"` W-HOME-14 (línea que se bifurca a 2 cajas-objeto: correo y WhatsApp del dueño). 7) `ProsaLocal` con `local.paragraphs` verbatim. 8) `06 "TUS DATOS, A SALVO"` W-PROOF-25 (4 checks reales). 9) Precio `PrecioPuntos` "Desde $500" + abajo a la derecha "Asistente completo desde $900" (R6), `id="precios"`. 10) Caso RN `TarjetasCaso`. 11) `FranjaEnPocasPalabras` y `PreguntasFrecuentes` (6). 12) `CierreDosTarjetas` (pequeña abre Marcy). 13) `TarjetasHermanas` de la misma ciudad + recurso calculadora (`/es/herramientas#llamadas`, `tool_cta_clicked`, sustituye a GrowthCta). 14) Contact.
- **Contratos**: los del tipo (H1, ServiceLd, FAQPage, paridad, trío, canonical, sin hreflang EN).

### 4.13 Ciudades (hub) · `/es/ciudades`, `/en/cities`

Contraste: matriz servicio × ciudad en `.w-contrast`. Firma: matriz por filas. Degradado: cola del H1.

- **Hero** (A-04 + W-CONV-01 + W-NEW-09): centrado, H1 hub **"Houston y Miami"** (verbatim), cola en degradado "Un mismo equipo, en tu idioma.", bajada de una línea; `TarjetasPerfil` asomando: Houston y Miami (450×185, con la silueta real existente `/assets/cities/{houston,miami}.svg` a todo el ancho de la tarjeta, anclada abajo y revisada a 1x, E-53; teléfono y enlace al hub) + ancha 920×104. El copy "Trabajamos en remoto" de la ancha es nuevo y puede chocar con el perfil de Google (solo Houston y Miami): se propone "¿Tu negocio está en otra ciudad? Escríbenos y te decimos si podemos ayudarte." y lo valida el dueño.
- **Secciones**: 2) **Contraste** `01 "QUÉ HACEMOS EN CADA CIUDAD"` `MatrizFilas` servicio × ciudad: solo celdas con landing EXISTENTE enlazadas (Miami sin SEO para IA ni branding: casilla punteada). 3) `02 "DÓNDE ESTAMOS"` `SedesAcordeon`. 4) `03 "BARRIOS Y SECTORES"` `DondeEstaTuNegocio`. 5) `04 "PROYECTOS POR CIUDAD"` `TarjetasCaso` (Houston: TRR, RN, JLS; Miami: MJA "Florida (Orlando)"). 6) FAQ: no existe hoy; NO se añade (copy nuevo a validar). En su lugar, `FranjaEnPocasPalabras` justo antes del cierre. 7) `CierreDosTarjetas`. 8) Contact.
- El copy hoy inline en la página se saca a `src/i18n/w/ciudades.ts` (+ EN) sin cambiar textos.
- **Contratos**: `ItemListLd` de los 2 hubs; enlaces a hubs y landings; NAP y teléfonos (`call_clicked`).

### 4.14 Diseño web por ciudad (PILOTO) · `/es/houston/diseno-web`, `/es/miami/diseno-web` (tipo `web`)

Contraste: `Bento2x2` "Más que una web" en `.w-contrast`. Firma: `DemoPorPasos` (una vez por entrada en vista; el abanico no tiene bucle). Degradado: cifra de precio.

- **Hero** (A-05 + A-12 + W-CORE-01 + W-CORE-02): columna centrada 768. Chip "Houston, TX" (Miami: "Miami, FL"), eyebrow oro 28/500 "Web rápida" (nombre de producto, R3: "Diseño web" repetiría el H1), H1 landing 58/500 **"Diseño web en Houston"** (verbatim, `<em>` en oro), cola "que te trae clientes.", bajada 20 en 525 (`hero.sub` libre, 2 líneas), botón "Quiero mi web" (`#contacto`) + "Ver proyectos ›" (`#proyectos`). Debajo `AbanicoWebs` con las 3 webs de EJEMPLO nuestras (Tu Plomería en el centro, Tu Salón y Tu Restaurante a los lados), franjas de luz oro detrás (sustituye al planeta con órbita). Coreografía §2.9. Móvil: central 280.
- **Secciones**: 1) `TiraLogos` (~90 px bajo el abanico; solo en Houston, en Miami se omite). 2) `TriadaManifiesto` ("Rápida. / Carga al instante." · "Bilingüe. / De verdad." · "Encontrable. / En Google y en la IA."). 4) `01 "CÓMO SE CONSTRUYE TU WEB"` `DemoPorPasos` (pasos: "Revisamos tu negocio y tu competencia", "Escribimos los textos en español e inglés", "Diseñamos y montamos tu web", "La conectamos a tu ficha de mapa y a Marcy", "Publicada"; pantalla de `WebEjemplo` de esqueleto a lista; "✓ Web publicada"). Contiene `id="proceso"` por si algún enlace lo usa. 5) `02 "HAZLA TUYA"` `Escalera` Landing desde $400 / Rediseño desde $500 / A medida desde $1,500 (anclas de `pricing.ts`; el precio solo se ve en la opción activa) con la maqueta que cambia. 6) **Contraste** `CapituloDosFrases` ("Una web bonita no basta." / "Tiene que traerte clientes.") + `Bento2x2`: formulario que no pierde contactos (mini formulario + "Guardado ✓") · versión en inglés (selector ES/EN) · ficha de mapa (`FichaMapaEjemplo`) · Marcy a las 23:40 (`ChatMarcy` estático, `tone="neutral"`: página oro). Los títulos y textos salen de `includes.items` (libre) reescritos a 4. 7) `ProsaLocal` "Por qué en Houston" con `local.paragraphs` verbatim (2) + 2×2 de `webFeatures`. 8) `03 "PROYECTOS"` `id="proyectos"`: `FichaProyecto grande` del proyecto de la ciudad (Houston: TRR; Miami: MJA "Florida (Orlando)") + `TarjetasCaso` con el resto de `proof.items`. 9) `PrecioPuntos` "Desde $400" (`id="precios"`, abajo "Landing" y a la derecha "A medida desde $1,500"; R6) + `Especificaciones` "QUÉ INCLUYE" 4×2 con `pricing.features` (libre) y `webPriceNote`. 10) `FranjaEnPocasPalabras` (verbatim) y `PreguntasFrecuentes` (6). 11) `TarjetasHermanas` (misma ciudad; actual = diseño web, sin "desde") + recursos (guía del blog de precios de web, diagnóstico, precios). 12) `CierreDosTarjetas` (pequeña: diagnóstico). 13) Contact.
- **Contratos**: un H1; ServiceLd ($1,500); FAQPage; BreadcrumbList; canonical; sin hreflang EN; paridad answer/faq/local; trío una vez; anclas `#proyectos`, `#precios`, `#faq`, `#contacto`; `defaultService` del formulario.

### 4.15 Tienda en línea por ciudad · `/es/houston/ecommerce`, `/es/miami/ecommerce` (tipo `ecommerce`)

Contraste: `RegistroVivo` "El día de tu tienda" (tarjeta en superficie elevada a sangre). Firma: lista de pedidos del hero. Degradado: cifra de precio.

- **Hero** (A-05 + W-ADV-36): partido. Izquierda: chip de ciudad, eyebrow oro 24 "Tienda" (R3), H1 landing **"Diseño de tienda en línea en Houston"** (verbatim), cola "que vende mientras duermes.", bajada (libre), botón "Quiero mi tienda" + "Ver precios ›" (hoy apunta a `/es/precios`: se mantiene). Derecha: `ListaPedidos` "Pedidos de hoy · Ejemplo" con su campo de puntos oro, en bucle.
- **Secciones**: 1) `TriadaManifiesto` ("Vende. / A cualquier hora." · "Cobra. / Sin complicarte." · "Avisa. / A ti y a tu cliente."). 3) `01 "DEL CARRITO AL PAGO"` `BandejaPasos` (Catálogo · Pago · Pedido listo con "Estado · Pagado" teal). 4) `02 "TODO CONECTADO"` W-ADV-38 pestañas Pagos / Envíos / Mensajería (pestañas I-06, fundido 150-200 ms) con plataformas que de verdad usamos, en texto (el ejecutor las coteja con `includes`/`pricing.features`; si no constan, se nombran por función). 5) **Contraste** `RegistroVivo variant="static"` "El día de tu tienda" (Pedido · Pagado; Mensaje · Respondido; Envío · Preparado). 6) `03 "QUÉ INCLUYE"` `Bento2x2` con `includes.items` (libre). 7) `ProsaLocal` con `local.paragraphs` verbatim. 8) `PrecioPuntos` "Desde $900" (tienda esencial, `PRICE_ANCHORS`) con abajo a la derecha el slice "$2,900" (`service.priceValue`, con el nombre de su nivel en `priceServices`; R6), `id="precios"`. 9) `TarjetasCaso` con `proof.items` (webs reales, sin llamarlas tienda). 10) `FranjaEnPocasPalabras` y `PreguntasFrecuentes` (6; Miami 5). 11) `TarjetasHermanas`. 12) `CierreDosTarjetas`. 13) Contact.
- **Contratos**: los del tipo.

### 4.16 SEO local por ciudad · `/es/houston/seo-local`, `/es/miami/seo-local` (tipo `seo-local`)

Contraste: `MatrizFilas` "Barrio por barrio" en `.w-contrast`. Firma: radar de la sección 01 (W-CORE-09 en su sitio de WorkOS: una celda de bento). Degradado: cifra de precio.

- **Hero** (A-05 + W-CORE-16 + W-CORE-09): partido. Izquierda: chip de ciudad (sin eyebrow: el nombre del producto coincide con el H1, R3), H1 landing **"SEO local en Houston"** (verbatim), cola "para que te llamen a ti.", bajada (libre), botón "Quiero que me encuentren" + "Ver cómo trabajamos ›" (`#proceso`, como hoy). Derecha: `TarjetaObjeto` con `FichaMapaEjemplo` (W-CORE-16 tal cual: tarjeta, capa oro desplazada 25 px, haces, "Llamar" con halo oro), SIN radar (revisión 1: cinco recursos en una pantalla y el radar barriendo detrás de la ficha, E-08/E-37).
- **Secciones**: 2) `01 "LO QUE REVISAMOS"` `Bento2x2` con el `Radar` como celda dominante (firma de la página, sin nada encima) y en las otras celdas las señales que revisamos (NAP, categorías, reseñas, fotos, horario, web). 3) `02 "DÓNDE TE PONEMOS"` W-CORE-27 pila de ventanas (Google · Apple Maps · Bing Places, en texto; pasos numerados). 4) **Contraste** `03 "BARRIO POR BARRIO"` `MatrizFilas` servicio × zona (zonas reales del perfil; enlaza solo a landings existentes). 5) `04 "CÓMO TRABAJAMOS"` `TresPasosNumerados` con `id="proceso"`. 6) `ProsaLocal` con `local.paragraphs` verbatim. 7) `PrecioPuntos` "Desde $300" (SEO inicial) y abajo a la derecha "Mensual desde $600 al mes" (slice, `service.monthly`; R6), `id="precios"`. 8) `FichaProyecto` TRR (Houston) / MJA (Miami, "Florida (Orlando)") + `TarjetasCaso` resto. Ninguna cifra de posiciones. 9) `FranjaEnPocasPalabras` y `PreguntasFrecuentes`. 10) `TarjetasHermanas`. 11) `CierreDosTarjetas`. 12) Contact.
- **Contratos**: los del tipo; precio mensual en ServiceLd igual.

### 4.17 SEO para IA · `/es/houston/seo-para-ia` (página a medida, fuera del verificador)

Contraste: `.w-dawn` no; el túnel del hero es la superficie distinta (cuenta como el capítulo). Firma: ninguna en bucle (la respuesta del asistente se escribe una vez). Degradado: titular del cierre (sin cola, R2).

- **Hero** (A-05 + W-ADV-28 + W-CORE-10): `TunelRejilla` a ventana completa (E-36). Centrado en el rectángulo limpio, como en W-ADV-28: eyebrow teal 18-24 "Que la IA te nombre" (R3), H1 noche 72/500 **"Que ChatGPT te recomiende a ti"** (verbatim de `seo-ia.ts`) SIN cola (la idea "Cuando le pregunten a la IA, que diga tu nombre." pasa a la bajada), un botón "Diagnóstico de IA gratis" (`/es/diagnostico`, `tool_cta_clicked`). Alto del rectángulo = alto del bloque de texto + 96 px, calculado en CSS. `RespuestaAsistente variant="tarjeta"` va DEBAJO del rectángulo, fuera del túnel, a 64 px de los botones, y se escribe una vez (~2.5 s). En `< md` el túnel se reduce a suelo y techo (sin paredes laterales encima del titular).
- **Secciones**: 2) `Prose` "distinction" (SEO para IA ≠ IA conversacional) verbatim como `ProsaLocal`. 3) `01 "CADA ASISTENTE, SU RESPUESTA"` W-HOME-11 tarjeta 659 radio 18 con pestañas ChatGPT · Perplexity · Gemini · Google (fundido 150-200 ms), respuestas de ejemplo rotuladas. 4) `02 "LO QUE DICES Y LO QUE ENTIENDE LA IA"` W-CORE-28 (4 filas caja mono → flecha oro → caja mono). 5) `03 "QUÉ CAMBIAMOS"` W-CORE-34 diagrama (`w/sections/seo-ia/QueCambiamos.astro`) (estático en esta página) con `seoIaPage.mechanics` verbatim. 6) `04 "LA FICHA QUE LEEN LOS ASISTENTES"` W-NEW-38 (ventana 648 con contenido mono 13 del tipo `llms.txt`/datos estructurados de ejemplo; cursor 1.06 s solo en pantalla). 7) `PriceGrid` → 3 `TarjetaPrecio` con `aeoTiers` (diagnóstico gratis, cimientos $500, monitoreo $200 al mes) en `id="precios"` + `GratisDeVerdad`. 8) Prose "caso0" verbatim. 9) `FranjaEnPocasPalabras` y `PreguntasFrecuentes`. 10) `TarjetasHermanas` (Houston). 11) `CierreDosTarjetas` (sin `lang`/`city` hoy: se fija `es`/`houston`). 12) Contact (defaultCity Houston, defaultService "SEO para IA (visibilidad en IA)").
- **Reescritura de contenido**: el plan la pedía; NO entra en este rediseño (todo el copy congelado se pinta tal cual; solo copy libre nuevo de objetos).
- **Contratos**: ServiceLd con `tiers` (Offer×3); FAQPage; un H1; trío; está en la lista de `scripts/w/verify-extra.mjs` (creado en 0.0; un H1, JSON-LD, paridad de answer/faq, trío) porque el verificador no la cubre.

### 4.18 Branding · `/es/houston/branding` (tipo `branding`)

Contraste: el plano técnico (marco propio a ~1136 sobre `--w-s1`). Firma: ninguna en bucle (el plano reacciona al hover). Degradado: cifra de precio.

- **Hero** (W-NEW-30 + W-NEW-12): cabecera partida con borde inferior 1 px: izquierda chip "Houston, TX", eyebrow oro "Marca" (R3), H1 landing 58-64/500 **"Diseño de logo y marca en Houston"** (verbatim), cola "que se reconoce a una cuadra."; derecha párrafo 16 al 70 % (libre, 4 líneas) y botón "Quiero mi marca" + "Ver precios ›" (`/es/precios`, como hoy). Debajo `PlanoMarca` con la marca de EJEMPLO "Tu Marca" (no Julio's, E-32), 8 entregables enlazados a sus llamadas.
- **Secciones**: 2) `01 "ENTREGABLES"` `Especificaciones` 4×2 (de `includes.items`). 3) `02 "DE LA MARCA A TODO LO DEMÁS"` `Escalera` (Tu logo / Tus colores / Tu tipografía / Tu web) con maquetas de la marca de ejemplo; la opción "Tu web" usa `WebEjemplo` vestida con "Tu Marca". 4) `ProsaLocal` `local.paragraphs` verbatim. 5) Caso JLS `FichaProyecto` (aquí sí su web real: es prueba). 6) `PrecioPuntos` "Desde $150" (logo) con abajo a la derecha el slice "$750" (marca completa; R6), `id="precios"`. 7) `FranjaEnPocasPalabras` y `PreguntasFrecuentes`. 8) `TarjetasHermanas`. 9) `CierreDosTarjetas`. 10) Contact.

### 4.19 Sectores · `/es/houston/contratistas`, `/es/houston/bienes-raices`, `/en/houston/contractors`, `/en/houston/restaurants` (tipo `sector`)

Contraste: `CicloEnU` en `.w-contrast`. Firma: ninguna en bucle (el objeto entra y se queda; si se quiere vida, la capa se desliza solo en la entrada). Degradado: cifra de precio.

- **Hero** (A-05 + W-CORE-16): partido; izquierda eyebrow del sector ("Contratistas" / "Bienes raíces" / "Contractors" / "Restaurants"), H1 landing **verbatim** ("Sitios web para contratistas en Houston", "Sitios para agentes de bienes raíces en Houston", "Websites for contractors in Houston", "Websites for restaurants in Houston"), colas: ninguna en contratistas y bienes raíces (H1 largos, R2); en EN "that bring in estimate requests." · "that turn searches into orders." solo si cumplen la regla de longitud; botón + "Ver precios ›" (`#precios`, como hoy). Derecha `TarjetaObjeto` con `SolicitudOficio` del oficio (rotulado Ejemplo / Example).
- **Secciones**: 2) `01` `DilemaDosCaminos` del oficio (p. ej. "Contestar llamadas en plena obra" vs "Perder el presupuesto"). 3) **Contraste** `02` `CicloEnU` (llamada perdida → Marcy contesta → contacto guardado y aviso → presupuesto agendado). 4) `03 "LO QUE NECESITA TU WEB"` W-CORE-21 filas alternas texto + objeto (con `includes.items`). 5) `ProsaLocal` `local.paragraphs` verbatim. 6) `PrecioPuntos` "Desde $400" (landing) + abajo a la derecha "A medida desde $1,500" (slice; R6), `id="precios"`. 7) Caso JLS `FichaProyecto` SOLO en contratistas/contractors; en los demás `TarjetasCaso` con `proof.items`. 8) `FranjaEnPocasPalabras` y `PreguntasFrecuentes`. 9) `TarjetasHermanas` + recurso calculadora (`/es/herramientas#llamadas` o `/en/tools#calls`, `tool_cta_clicked`, sustituye a GrowthCta). 10) `CierreDosTarjetas`. 11) Contact.
- **Contratos**: los del tipo; hreflang contratistas↔contractors; restaurants sin espejo ES (x-default = EN).

### 4.20 Barrios · `/es/houston/katy`, `/es/houston/sugar-land`, `/es/miami/doral`, `/es/miami/hialeah` (tipo `barrio`)

Contraste: `MatrizFilas` "Zonas que cubrimos" con la fila del barrio encendida, en `.w-contrast`. Firma: pulsos del chip. Degradado: titular del cierre (sin cola, R2; no hay W-CORE-14 en barrios: el precio va en `TarjetaPrecio`).

- **Hero** (W-CONV-23): centrado, noche con resplandor oro al 6 % arriba a la izquierda; eyebrow oro 28 con el barrio ("Katy, TX"), H1 hub 52/500 **verbatim** ("Diseño web en Katy, para tu negocio local", "Diseño web premium en Sugar Land", "Diseño web y SEO para negocios en Doral", "Diseño web y SEO para tu negocio en Hialeah"), sin cola (la idea "Tu negocio, en el mapa de tu barrio." puede ir en el texto); texto 19 px centrado (libre); `ChipBarrio` con "Tu negocio" dentro, las 2-3 vías reconocibles del barrio y pulsos que llegan al chip (§3.6), nunca detrás del texto; botón + "Ver precios ›" (`#precios`).
- **Secciones**: 2) `01 "SERVICIOS EN TU BARRIO"` `TarjetasHermanas` (servicios de la ciudad madre). 3) **Contraste** `02 "ZONAS QUE CUBRIMOS"` `MatrizFilas fixedRow`. 4) `ProsaLocal` "Por qué local" con `local.paragraphs` verbatim. 5) `TarjetaPrecio` "$1,500" (Doral/Hialeah: paquete web + SEO local + IA con sus niveles de `pricing.ts`), `id="precios"`. 6) `TarjetasCaso` con el proyecto más cercano de `proof.items`. 7) `FranjaEnPocasPalabras` y `PreguntasFrecuentes`. 8) `CierreDosTarjetas`. 9) Contact.
- **Calles reales (E-49)**: primero se comprueba si bastan los datos que ya están en el repo (`public/geo/houston-mapa.json`, `miami-mapa.json`, los del mapa del hub). Si no, TIGER/Line Primary/Secondary Roads (Censo de EE. UU., dominio público): descargarlo exige el OK del dueño en chat con fuente y tamaño (se le pide en el render del piloto), y la librería para leerlo o simplificarlo, si hace falta, entra solo como devDependency en la fila de 2-barrio. Simplificación tipo cartógrafo (Douglas-Peucker + exageración de los rasgos que identifican), estilo en código. Si en la primera captura no se reconocen, circuito abstracto declarado como tal (no se dibujan calles a mano).

---

## 5 · Olas de implementación (propiedad de archivos sin solapes)

Reglas para TODA tarea:
- Cada tarea trabaja en SU propio worktree y rama, creados desde la punta de `feat/rediseno-workos` tras integrar la ola anterior: `git worktree add .claude/worktrees/w-<tarea> -b w/<tarea> feat/rediseno-workos`, con `node_modules` enlazado por junction (PowerShell `New-Item -ItemType Junction`), nunca `npm install`. Las tareas secuenciales (0.0, 0A, 0C, 1, 5) pueden usar el worktree `workos`. Nunca dos agentes en el mismo worktree (cada `npm run build` pisa `dist/` y `.astro/` del de al lado). Capturas con su propio puerto de `astro preview` (`--port 43NN`, asignado por tarea). No toca el checkout principal ni worktrees ajenos. No hace push ni merge: el orquestador integra en orden de ola.
- Lee antes: este archivo entero, `DESIGN.md` §0-§3 y §7, el registro de errores completo, y los recortes de SUS piezas.
- Solo crea/edita los archivos de su fila. Si necesita otro, PARA y lo pide (E-16). Si una pieza le pide una concesión de gramática fuera de los 11 cambios, PARA y lo eleva (E-31).
- Criterio común de terminado: `npm run build` limpio; `git diff <punta-de-la-ola-anterior>...HEAD --stat` solo con sus archivos; lista protegida (§2.13 cerrojo 3) vacía contra `origin/main`; capturas propias a 1440 y 390 (táctil) de cada componente/página junto a su recorte, con las 3 preguntas de E-39 respondidas por escrito; reduced-motion comprobado; sin desborde horizontal 320→1920; búsqueda literal de "—" y "–" en el texto visible = 0 (salvo rangos).

### Ola 0 · sistema y compartidos

**0.0 Foto de partida (secuencial, orquestador)**
- Crea `scripts/w/urls.json` con las 48 URL (19 landings + seo-para-ia + 2 portadas + 4 hubs + 16 de hubs de venta y páginas sueltas ES/EN + 6 artículos); lo usan 0.0, `scope-check`, `verify-extra` y la ola 5.
- Crea `scripts/w/verify-extra.mjs` con modo `--snapshot`/`--compare` (cubre lo que no cubre el verificador, que solo mira las 19 landings): por URL, número de `<h1>` y su texto, todos los bloques JSON-LD normalizados, canonical, hreflang, lista de `id` y de `href="#…"`, `href` internos que dan 404 en `dist/`, `data-track`, texto de FAQ, `id` únicos, y en hubs el trío (cada clase 1 vez; `tel:` y `wa.me` iguales a la base).
- `npm run build` sobre la rama recién creada (= main) → `node scripts/verify-landing-contracts.mjs --snapshot rediseno-workos-base` (crea `data/contract-snapshots/rediseno-workos-base.json`) y `node scripts/w/verify-extra.mjs --snapshot rediseno-workos-base`.
- Capturas ANTES de las 48 URL a 1440×900 y 390×844 (táctil), página entera y primera pantalla, con y sin movimiento reducido → `scratchpad/w/antes/`. Para portada y hubs, además tira de fotogramas del viaje (§2.13 paso 5) y posiciones de `data-atmo`.
- Criterio: los dos snapshots creados; carpeta `antes/` completa con índice.

**0A Sistema base (secuencial, 1 agente)**
| Crea | Edita (solo lo dicho) | Terminado |
|---|---|---|
| `src/styles/w-tokens.css`, `src/styles/w.css`, `src/components/w/{Eyebrow,ChipCiudad,HeroTexto,CabeceraNumerada,CapituloDosFrases,Bandeja,Celdas,IconoObjeto,Ejemplo}.astro`, `w/WStyles.astro`, `w/objects/registry.ts` + sprite de 7 símbolos, `w/reveal.ts`, `w/loop.ts`, `scripts/w/scope-check.mjs` | `src/styles/global.css` (1 línea: `@import './w-tokens.css';`), `package.json` + `package-lock.json` (solo devDependencies `playwright-core`, `pixelmatch`, `pngjs`; Chrome instalado con `channel: 'chrome'`), `src/layouts/Layout.astro` (prop `ds` + script inline `w-anim` solo si `ds`), `src/components/ui/Button.astro` (variante `link`), `DESIGN.md` (enmienda §0, §3, §8.4 con referencia a este archivo) | paso 0 de `scope-check` (main contra main) con ruido 0 y después en verde sobre portada y hubs (nada cambió); peso del HTML de portada y hub dentro de presupuesto; hoja de los 7 iconos-objeto en 2-3 familias con licencia capturada; coreografía probada en una página de prueba local con CPU ×4 y fotogramas reales (ningún hueco > 150 ms, E-44/E-52) |

**0B Componentes compartidos (dos tandas; cada agente en su worktree, solo sus archivos; consumen 0A).** Tanda 1 en paralelo: 0B-1, 0B-2, 0B-3, 0B-5, 0B-6. Tanda 2, tras integrar la 1: 0B-4 (sus demos llevan por slot los objetos de 0B-5 y se comparan con su tira con contenido real).
| Tarea | Crea | Terminado |
|---|---|---|
| 0B-1 Conversión | `w/{FranjaEnPocasPalabras,PreguntasFrecuentes,PreguntasAbiertas,CierreDosTarjetas,TarjetasHermanas,TarjetasPerfil,DondeEstaTuNegocio}.astro` | FAQ emite FAQPage idéntico al texto y todas cerradas; el trío aparece una vez con clases y `data-track` exactos; dominante por dispositivo sin `order`, comprobado en 390 táctil y 1440; los componentes del Cerrojo 5 se ven igual en `w-muestrario-base` |
| 0B-2 Prueba | `w/{TiraLogos,FichaProyecto,FiguraProyecto,TarjetasCaso,ProsaLocal,RelatoEnActos,FichaLateral,CeldaTuNegocio}.astro` | Capturas reales con `width/height` y carga diferida (CLS 0); `translate="no"` en nombres de clientes; MJA rotulado; sticky de FichaLateral verificado en el Chrome real |
| 0B-3 Precio y estructura | `w/{PrecioPuntos,TarjetaPrecio,TarjetasModelo,Especificaciones,TriadaManifiesto,TresPasosNumerados,CuatroRazones,GratisDeVerdad,Inventario3Etapas,TresGarantias,TablaFases,SedesAcordeon}.astro` | La cifra de PrecioPuntos es texto real en el DOM; ola de puntos solo `transform`; ningún precio escrito a mano (todo por props desde los datos) |
| 0B-4 Demos y bucles (tanda 2) | `w/{DemoPorPasos,Escalera,Bento2x2,BandejaPasos,RegistroVivo,MatrizFilas,DilemaDosCaminos,SinCon,CicloEnU,ChipsVeredicto}.astro` | Bucles registrados en `loop.ts` (pausa fuera de pantalla, con pestaña oculta y con su botón de pausa, medida); Escalera accesible por teclado; sticky de DemoPorPasos en el Chrome real; cada uno junto a su tira de WorkOS con tiempos medidos |
| 0B-5 Objetos de servicio | `w/objetos/*.astro` (los 18 de §3.6) | Ningún objeto con marca o logotipo de terceros ni nombre de negocio real; todos con "Ejemplo"; objetos de producto en claro y de sistema en noche opaca; chat en claro con contraste AA; esclusa, pestañas, pedidos, radar, escáner, interruptores y chip con estado quieto definido; capturas lado a lado con sus recortes |
| 0B-6 Megamenú | `w/nav/{MegaServicios,MegaRecursos,DrawerGrupos}.astro`, `src/i18n/w/nav.ts`; edita `src/components/layout/SiteNav.astro` (solo megamenú, grupos del drawer, sprite de iconos y lectura de `data-mega-open` en `onScroll`) | Teclado (Tab, Enter, Esc, foco devuelto), hover con intención, clic fuera; a 768 caben los enlaces; "Servicios" sigue siendo `<a>`; `scope-check` de portada y hubs con menú cerrado: solo cambia la caja de `.nav__links` y logo, idioma y CTA con huella idéntica; ids sin duplicados; capturas del megamenú y el drawer también sobre las páginas de §1.D; Mantenimiento a `#contacto` hasta la ola 3; drawer móvil con Llamar/WhatsApp y `data-track` |

**0C Plantilla de landings y muestrario (secuencial, 1 agente)**
| Crea | Edita | Terminado |
|---|---|---|
| `w/landing/WLanding.astro`, `w/landing/registry.ts` (`KIND_BY_PATH` completo; sin archivos en `kinds/`), `w/landing/types.ts`, `src/pages/es/w-muestrario.astro`, `src/pages/es/w-muestrario-base.astro` | `src/components/ClusterLanding.astro` (despachador al principio, cuerpo actual intacto), `astro.config.mjs` (solo `&& !page.includes('/w-muestrario')` en el `filter` del sitemap) | Prueba: las 19 rutas de `clusters` + `clustersEn` tienen tipo en el mapa; sin tipos listos, `verify-landing-contracts --compare rediseno-workos-base` en verde y las 19 landings idénticas (diff de `dist/`); con un `kinds/web.ts` de prueba solo cambian 2 URL; muestrarios capturados (los componentes del Cerrojo 5 se ven igual en los dos); los muestrarios no salen en `dist/sitemap-0.xml` |

**Punto de control 1 (director + dueño)**: muestrario capturado a 1440/390 junto a los recortes; autocrítica E-39 por pieza. Se enseña al dueño la lámina "sistema nuevo" (radios, texturas, dos tonos, cabecera numerada, etiqueta "Ejemplo", objetos de producto en claro) y la hoja de iconos-objeto en 2-3 familias; su OK se apunta en §0. Lo que no pase se corrige antes de la ola 1.

### Ola 1 · PILOTO diseño web (1 agente, secuencial)

| Tarea | Crea | Edita | Consume | Terminado |
|---|---|---|---|---|
| 1-web | `w/landing/kinds/web.ts` (su existencia activa el tipo), `w/heroes/HeroWeb.astro`, `src/i18n/w/web.ts` | — | HeroTexto, AbanicoWebs, TiraLogos, TriadaManifiesto, FranjaEnPocasPalabras, DemoPorPasos, Escalera, Bento2x2, ProsaLocal, FichaProyecto, TarjetasCaso, PrecioPuntos, Especificaciones, PreguntasFrecuentes, TarjetasHermanas, CierreDosTarjetas | `--urls /es/houston/diseno-web,/es/miami/diseno-web` y `--compare` sobre las 19 landings en verde (solo esas 2 cambian de HTML respecto a la base: diff de `dist/`); capturas antes/después; coreografía y demo medidas con fotogramas reales; comparación con `W-CORE-01/05/06/08/14/15` |

`KIND_BY_PATH` asigna `web` SOLO a `/es/houston/diseno-web` y `/es/miami/diseno-web`; bienes raíces es `sector` (la tabla de `deriveDefaultService` NO se copia: la manda a diseño web).

**Punto de control 2 (director)**: el piloto se revisa con los recortes al lado (escala, composición, movimiento: E-54). Si un observador no ve el parentesco con WorkOS, se corrige el sistema ANTES de abrir la ola 2 (las demás páginas heredan los defectos).

### Ola 2 · resto de landings (paralelo, 8 agentes)

Cada tarea crea `w/landing/kinds/<kind>.ts`, `w/heroes/Hero<Kind>.astro`, `src/i18n/w/<kind>.ts` y, si necesita una sección solo suya, `w/sections/<kind>/*.astro`; NO edita `registry.ts` (el tipo se activa al existir su archivo). Criterio común añadido: `--compare` sobre las 19 landings, no solo `--urls` de las suyas. Nadie edita componentes de la ola 0: si uno necesita cambio, se pide al dueño de ese archivo (el orquestador abre una mini tarea 0B-x).

| Tarea | Páginas | Secciones propias (archivos exclusivos) | Terminado |
|---|---|---|---|
| 2-ecommerce | houston/ecommerce, miami/ecommerce | `w/sections/ecommerce/TodoConectado.astro` (W-ADV-38) | `--urls` + `--compare` verdes; bucle de pedidos medido |
| 2-seo-local | houston/seo-local, miami/seo-local | `w/sections/seo-local/PilaVentanas.astro` (W-CORE-27) | ídem; radar pausado fuera de pantalla; `#proceso` existe |
| 2-ia-chat | houston/ia-conversacional, miami/ia-conversacional | `w/sections/ia/ReglasNaturales.astro` (W-ADV-07), `w/sections/ia/AvisoBifurca.astro` (W-HOME-14), `w/sections/ia/DatosASalvo.astro` (W-PROOF-25) | ídem; pestañas de Marcy medidas; avatar con encuadre de contrato intacto |
| 2-ia-pymes | ia-para-pymes, en/ai-for-small-business | `w/sections/ia/ConstelacionCanales.astro` (W-ADV-21); consume `DatosASalvo` de 2-ia-chat (propiedad de 2-ia-chat: 2-ia-pymes arranca cuando ese archivo esté integrado o lo pide) | ídem + hreflang ES↔EN intacto |
| 2-branding | houston/branding | — | ídem; marca de ejemplo, no Julio's |
| 2-sector | contratistas, bienes-raices, en/contractors, en/restaurants | `w/sections/sector/FilasOficio.astro` (W-CORE-21) | ídem; JLS solo en contratistas/contractors |
| 2-barrio | katy, sugar-land, doral, hialeah | `scripts/w/build-barrio-tracks.mjs` + `src/components/w/objetos/barrios/<barrio>.svg.ts` (datos generados) | ídem; datos con la forma `tracks: {d, name?}[]`; descarga solo con OK del dueño; calles reconocibles o circuito declarado |
| 2-seo-ia | houston/seo-para-ia (página a medida) | edita `src/pages/es/houston/seo-para-ia.astro`; crea `w/sections/seo-ia/{CadaAsistente,DiceEntiende,QueCambiamos,FichaAgentes}.astro` | `verify-extra --compare rediseno-workos-base` verde en su URL (un H1, ServiceLd con tiers, FAQPage, paridad, trío) |

### Ola 3 · hubs de venta y páginas sueltas (paralelo, 9 agentes)

Criterio común añadido: `verify-extra --compare rediseno-workos-base --urls <las suyas>` en verde.

| Tarea | Edita (exclusivo) | Crea | Terminado |
|---|---|---|---|
| 3-servicios | `src/pages/es/servicios.astro`, `src/pages/en/services.astro` | `src/i18n/w/servicios.ts`, `w/sections/servicios/*` | OfferCatalog + ItemList intactos (diff del JSON-LD = 0); FAQPage; `pricing_card_clicked`; `id` de los 7 servicios en ES y EN (incluido `#mantenimiento`); en la integración el megamenú pasa de `#contacto` a `servicios#mantenimiento` |
| 3-precios | `src/pages/es/precios.astro`, `src/pages/en/pricing.astro` | `src/i18n/w/precios.ts`, `w/sections/precios/*` (W-CONV-07/08/10/12, W-ADV-49) | OfferCatalog idéntico; `check:kb` verde; cero precios escritos a mano |
| 3-portafolio | `src/pages/es/portafolio.astro`, `src/pages/en/portfolio.astro`, `src/components/sections/PortfolioGrid.astro` (solo lo usa esta página; puede quedar sin uso y borrarse) | `src/i18n/w/portafolio.ts`, `w/sections/portafolio/{CierreHistoria,TarjetaLateral}.astro` (W-PROOF-14, W-PROOF-07) | CollectionPage idéntico; anclas `#trr #mja #jls #rn`; sticky en el Chrome real |
| 3-sobre | `src/pages/es/sobre-nosotros.astro`, `src/pages/en/about.astro` | `src/i18n/w/sobre.ts`, `w/sections/sobre/{Fundadores,SalidaSuave}.astro` | AboutPage; celda "Clientes que la IA ya recomienda" presente; sin Person/AggregateRating |
| 3-ciudades | `src/pages/es/ciudades.astro`, `src/pages/en/cities.astro` | `src/i18n/w/ciudades.ts` (copy sacado de la página, sin cambiar textos) | ItemList de hubs; enlaces del silo; NAP |
| 3-herramientas | `src/pages/es/herramientas.astro`, `src/pages/en/tools.astro`, `src/components/growthos/ToolsHub.astro`, `src/components/growthos/range.css` | `src/i18n/w/herramientas.ts` | fórmulas y eventos intactos (test manual de 3 combinaciones de deslizadores con el resultado de antes); `#llamadas`, `#citas`, `#calls`, `#appointments` existen; Contact añadido y CTA de la nav a `#contacto` |
| 3-diagnostico | `src/pages/es/diagnostico.astro`, `src/pages/en/checkup.astro`, `src/components/growthos/DiagnosticWizard.astro` (solo marcado de piel y el `id="diagnostico-form"`; sin tocar lógica, `data-*` ni llamadas), `src/components/growthos/ScanSequence.astro` (solo marcado del estado vivo, sin lógica) | `src/i18n/w/diagnostico.ts`, `w/sections/diagnostico/{PasosWizard,ResultadoEjemplo}.astro` | `npm run test:puerta` y `npm run test:diag` verdes; envío real de prueba en la vista previa (guardado + correo); formulario sin precios |
| 3-blog-indice | `src/pages/es/blog/index.astro`, `src/pages/en/blog/index.astro` | `src/i18n/w/blog.ts`, `w/sections/blog/{Destacada,Pareja,Lista}.astro` | BlogListing; sin JS se ven todos los artículos y con JS filtra y actualiza `aria-pressed`; estado vacío EN |
| 3-articulo | `src/pages/es/blog/[slug].astro`, `src/components/sections/{ArticleHero,Article,ArticleToc,ArticleRail,PostNav}.astro` (`ArticleRail` solo piel; `RailCta` y `RailTools` no se tocan) | `w/sections/blog/{PreguntaATuIA,SigueLeyendo}.astro` (W-CONT-22, W-CONT-26) | BlogPosting/FAQPage; RailCta y RailTools intactos y funcionando (envío de prueba del mini-form); índice plegable en el Chrome real |

### Ola 4 · detalles permitidos de portada y hubs (paralelo, 2 agentes; al final, con piezas ya probadas)

| Tarea | Edita (exclusivo) | Consume | Terminado |
|---|---|---|---|
| 4-portada | `src/components/sections/{Services,Projects,Guarantees,GrowthTeaser}.astro`; crea `src/i18n/w/portada.ts` (ES+EN). Las páginas `index.astro` NO se tocan | IconoObjeto, Escaner (compacto y estático), FiguraProyecto | `scope-check` verde (hero idéntico en DOM, estilos y píxeles; lista de `section` con `id`/`data-fx` y número de `canvas.mfx` idénticos); anclas de las lunas funcionan; StarField sigue pintando en las secciones tocadas; cohete del Proceso vivo en móvil |
| 4-hubs | `src/components/city/CityHub.astro` (solo contenido de §4.2), `src/components/city/city.css` (solo reglas de esas secciones); crea `src/i18n/w/hubs.ts` (ES+EN, Houston y Miami). `page.js` NO se toca | TarjetasHermanas, DondeEstaTuNegocio, FranjaEnPocasPalabras, PreguntasFrecuentes (piel), TresGarantias, CierreDosTarjetas | `scope-check` verde en portada fija, globo y mapa; posiciones de `data-atmo` ±40 px; `verify-extra` en los 4 hubs (trío 1 vez, teléfono de cada ciudad); cada sección tocada entra con el mismo revelado que antes; recorrido completo en el Chrome real (sol, noche, nubes, mapa, horizonte, silueta) con fotogramas lentos contados por sección (E-43) |

`GrowthTeaser` lo edita SOLO 4-portada; 4-hubs lo consume (los 4 hubs lo heredan).

### Ola 5 · verificación, informe y vista previa (secuencial, director)

1. Integra todas las ramas de tarea; borra los muestrarios y su condición del `filter` de `astro.config.mjs` (o los deja solo en la preview y apunta borrarlos antes del merge; en ambos casos comprueba `dist/sitemap-0.xml`). Con los 8 tipos listos, borra el cuerpo viejo de `ClusterLanding` y sus imports (inalcanzable; si queda, se apunta como deuda en el roadmap: cuando 4-portada cambia `Projects`, ese cuerpo se rompería en silencio).
2. Ejecuta §6 completo.
3. Push de la rama → vista previa de Vercel (no producción). Enlace compartible de 23 h con `get_access_to_vercel_url` sobre el alias de la rama (la protección del proyecto NO se toca).
4. Informe de antes/después como Artifact privado: por URL, captura antes | después a 1440 y 390, recorte WorkOS de cada pieza al lado, qué cambió en lenguaje llano, lista de decisiones pendientes del dueño (§7.3). Animaciones de hero enseñadas en vídeo corto o tira de fotogramas.
5. Nada se mergea: el merge espera el OK del dueño sobre el render Y el calendario de indexación (§7.3).

---

## 6 · Verificación

**6.1 Build y contratos**
- `npm run build` limpio, sin avisos nuevos.
- `node scripts/verify-landing-contracts.mjs` (todas) y `--compare rediseno-workos-base`: FALLA si empeora canonical, hreflang, JSON-LD, trío o paridad, o si cambia el estado de indexación; el aviso de H1 debe salir en 0 (H1 verbatim). También `--compare fusion-2026-11` para no perder lo del 31-oct.
- `node scripts/w/verify-extra.mjs --compare rediseno-workos-base` (creado en 0.0) para `/es/houston/seo-para-ia`, portada, hubs y las páginas no-slice (servicios, precios, portafolio, sobre, ciudades, blog, artículo, diagnóstico, herramientas): un `<h1>`, JSON-LD esperado por página (§4), FAQPage = texto visible, BreadcrumbList, canonical, hreflang de `routes.ts`, anclas declaradas en §4 existen (`#contacto`, `#precios`, `#faq`, `#proyectos`, `#proceso`, `#answer-q`, `#llamadas`, `#diagnostico-form`, `#articulos`, `#trr`…).
- Lista literal (no existe `npm test` en `package.json`): `npm run check:kb` (precios ↔ chat), `test:chat`, `test:diag`, `test:brief`, `test:brief-form` (vigila "formularios sin precios"), `test:puerta`, `test:seo`, `test:inicio`, `test:projects`, `test:evals`.
- Diff de JSON-LD por URL (antes/después) = 0 salvo BreadcrumbList idéntico reubicado.

**6.2 Alcance** · `scripts/w/scope-check.mjs` (§2.13) al cerrar ola 0, ola 4 y ola 5; lista protegida vacía en `git diff origin/main --stat`.

**6.3 Capturas antes/después** · todas las URL de §4 (portada y hubs incluidos) a **1440×900** y **390×844 con `isMobile`+`hasTouch`** (E-30), página entera y primera pantalla; además 1280, 1920 y ≥1985 para heros con arte a sangre (abanico, túnel, plano, chip, esclusa) y para portada/hubs (E-36/E-44: el borde del texto coincide con el logo de la nav; ningún borde recto no intencional). Alturas reales de navegador móvil para heros (iPhone Safari ~390×664, SE 375×548, Android 360×640, E-45). Carpeta `scratchpad/w/despues/`, índice con pares.

**6.4 Comparación con WorkOS (E-54)** · por cada sección propia, captura junto a su recorte de `cat/` (lista en §3). Tabla por página: pieza · recorte · ¿escala igual? · ¿composición igual? · ¿movimiento igual (tiempos medidos)? · ¿se ve el parentesco? Si alguna columna es "no", no pasa.

**6.5 Registro de errores (checklist de salida, por página)**
- E-01 ¿dónde está la luz en cada sección? ¿alguna losa de noche cruda > media pantalla?
- E-02/E-51 ¿siguen vivas TODAS las animaciones aprobadas (órbita, cohete, viñetas del hub, sol, nubes, mapa, horizonte)? Prueba que mira el estado tras llegar a cada sección.
- E-03/E-14/E-35 ¿algún halo teal? ¿oro y teal compitiendo en un bloque? ¿acento sobre fondo del mismo acento en algún fotograma?
- E-04 ¿alguna sección resuelta con 3 tarjetas iguales icono+título+párrafo?
- E-05 ¿hubs con cabecera compacta, landings con hero?
- E-07/E-12 búsqueda literal de "—" y "–" en texto visible = 0 (salvo rangos); la cabecera numerada usa filete.
- E-10/E-13 ¿cada línea nueva habla del negocio? ¿alguna cifra, reseña o claim sin dato?
- E-15/E-31 ¿alguna concesión de gramática fuera de los 11 cambios?
- E-16 ¿diff solo de lo encargado?
- E-17/E-11/E-39 ¿cada veredicto tiene captura real? ¿las 3 preguntas de E-39 respondidas?
- E-18 ¿qué tapa a qué a 390?
- E-22 ¿algún subrayado fuera de párrafo? ¿un solo recurso de énfasis por elemento?
- E-23 ¿algún acordeón abierto al cargar (FAQ, sedes, índice)?
- E-24 ¿nombres de clientes con `translate="no"`?
- E-32 ¿alguna captura de cliente como arte de hero u objeto?
- E-34 test "si quito el fondo, ¿el hero sigue explicando qué hacemos?".
- E-36/E-44 bordes rectos en 1280/1440/1920/≥1985; texto alineado con el logo de la nav.
- E-37 ¿algún fondo con detalle (radar, túnel, pistas, puntos, franjas, estrellas) detrás de texto que se lee? Captura con cada patrón animado en su fotograma más denso detrás de cada objeto con texto; medir contraste.
- E-40 ¿algo que se tenga que leer en mono de adorno o < 13 px?
- E-42 ¿algún texto que se apaga mientras se lee (registro vivo: la fila central entera)?
- E-43/E-52 fotogramas lentos por sección en el Chrome real (objetivo: ninguno por bucle; < 5 por recorrido completo), CPU ×4 en móvil; una curva por animación; nada nace de la nada.
- E-49/E-53 siluetas y calles de datos reales; ¿se entienden a su escala?
- E-50 ningún efecto atado a recorrido largo; el icono que cae es disparo único.

**6.6 Rendimiento**
- Cero imágenes nuevas binarias salvo las existentes (capturas `/Galeria/*-900/-520.webp`, avatar de Marcy): todos los objetos son HTML/CSS/SVG. Toda imagen con `width/height`, `loading="lazy"` fuera de la primera pantalla y `decoding="async"` (puerta técnica 1).
- Animaciones solo `transform`/`opacity` (revisión de CSS: `grep` de `transition:` y `@keyframes` que toquen otras propiedades = 0, salvo `color`/`border-color` en hovers de ≤ 200 ms).
- Ningún canvas nuevo; ningún `backdrop-filter` nuevo; ningún `mix-blend-mode`/`filter` animado.
- Peso del HTML comprimido de `/es` y `/es/houston` antes/después: máx. +6 KB (tokens + megamenú + sprite).
- Qué elemento es el LCP en las 6 URL de Lighthouse: si pasa a ser el objeto del hero (p. ej. el abanico dibujado), su entrada no debe retrasarlo (arranca en 0.01, §2.9).
- Bucles pausados fuera de pantalla y con pestaña oculta: medido con `animation-play-state`/temporizadores en el Chrome real (Performance: 0 trabajo de animación con la sección fuera de vista).
- Lighthouse móvil en 6 URL representativas (diseño web Houston, IA para pymes, servicios, precios, portafolio, diagnóstico) contra el antes: LCP no empeora más de 200 ms, CLS ≤ 0.02, TBT no empeora más de 50 ms. JS nuevo por página ≤ 15 KB comprimido (reveal + loop + bucle firma).
- Fotogramas reales en la carga (E-44): ningún hueco > ~150 ms en los primeros 2.5 s.

**6.7 Movimiento reducido** · recorrido completo de cada página con `prefers-reduced-motion: reduce` emulado: nada se mueve más que un parpadeo de opacidad; ningún elemento queda en opacidad 0; cada bucle muestra su estado quieto de §2.10; acordeones y megamenú funcionan.

**6.8 Desbordes y accesibilidad**
- `document.documentElement.scrollWidth <= innerWidth` de 320 a 1920 en todas las URL (script en `scope-check`).
- Un `<h1>`; foco visible en todo control nuevo; objetivos táctiles ≥ 44 px; contraste AA (texto ≥ 4.5:1, titulares grandes ≥ 3:1; la 1.ª frase al 45 % solo en ≥ 28 px); decoración `aria-hidden`; bucles con texto que cambia en `aria-live="off"` (no anuncian cada fila); Escalera como `radiogroup`, SinCon como `switch`, pestañas manejables (W-ADV-38, W-HOME-11) con roles `tablist/tab/tabpanel`; pestañas automáticas de Marcy como ilustración `aria-hidden` con resumen `sr-only`; todo bucle > 5 s con botón de pausa (WCAG 2.2.2); orden visual = orden del DOM (sin `order`).

**6.9 FAQ cerradas** · en todas las páginas, `document.querySelectorAll('details[open]').length === 0` al cargar (salvo navegación con ancla a una pregunta).

---

## 7 · Errores genéricos evitados y riesgos

### 7.1 NO → SÍ

| NO | SÍ |
|---|---|
| Traer de WorkOS solo "principios" y dejar la plantilla de siempre con otros colores (E-54) | Traer sus elementos medidos (escala 58/52/40 a peso 500, abanico, tarjeta-objeto con capa, lista viva, esclusa, bandejas, raíles, coreografía 1.1 s) re-tematizados a la noche |
| El mismo hero (H1 80/700 + planeta con órbita) en todas las landings (E-06) | Un hero por servicio que enseña su objeto funcionando (A-05, E-34) |
| "Respuesta directa" como caja grande de 2.º bloque | Franja "En pocas palabras" ligera justo antes de la FAQ, con el texto verbatim (I-02) |
| Grid de 3 tarjetas icono+título+párrafo (E-04) | Tríada sin caja a dos tonos, bento con celdas de 1 px, bandejas con objetos, escalera |
| Capturas de clientes como arte del hero (E-32) | Webs de EJEMPLO nuestras ("Tu Plomería", "Tu Salón", "Tu Restaurante") y marca de ejemplo; capturas reales solo como prueba |
| Ficha de Google, WhatsApp o ChatGPT clonados con su marca | Objetos genéricos de ejemplo, canales nombrados en texto |
| Chat de Marcy en negro (E-14) | Ventana de chat en claro cálido dentro de la noche |
| Halo teal en el botón "Llamar" (E-03) | Halo oro; teal solo por borde, icono y texto nítidos |
| Marco o capa en degradado oro→teal en cada objeto | Un acento por objeto; un solo elemento degradado por página |
| "01 —— QUÉ INCLUYE" con raya tipográfica (E-12) | Número + filete dibujado de 24×1 px + etiqueta |
| Secundario subrayado o en caja | Enlace 16/500 con "›" que se desplaza 3 px |
| Todo se mueve a la vez, en bucle, por toda la página (E-08, E-42) | UNA animación firma por página, pausada fuera de pantalla; el resto quieto o con entrada única |
| Animación atada al scroll largo (E-50) | Disparo único al entrar en vista |
| Revelado global sobre `section` que también anima la portada y el hub (E-50/E-52) | Atributos propios `data-w-in`/`data-w-reveal` dentro de `main[data-w]` |
| Cambiar `base.css` para subir de golpe todo el sitio | Clases `.w-*` bajo `[data-ds="v3"]`; portada y hubs con huella de DOM, estilos y píxeles idéntica |
| H1 nuevo "más bonito" en plena caída de indexación | H1 verbatim + cola visual |
| FAQ con la primera abierta (E-23) | Todas cerradas |
| Logos inventados o muro de 12 logos | 4 nombres reales en fila; celda "Tu negocio aquí" |
| Cifras de resultados, estrellas con número o testimonios | Hechos verificables: plazos oficiales, precios de `pricing.ts`, lo que hace Marcy en producción |
| Calles del barrio dibujadas a ojo (E-49) | TIGER/Line simplificado, o circuito abstracto declarado |
| Suscripción del blog "de regalo" sin puerta técnica | No se construye; decisión del dueño |
| Todos los objetos como caja oscura con filo oro, "las mismas cajas" (E-54) | Objetos de producto en claro cálido y de sistema en noche opaca |
| Iconos trazados a mano por coordenadas (E-27) | Relieve propio + glifo de una familia con licencia |
| Cola del H1 apagada al 45 % (titular al revés y de 4-5 líneas) | Cola en el mismo tono, ≤ 2 líneas, o sin cola |

### 7.2 Correcciones del director sobre el plan del juez (ya aplicadas en este documento)

1. Abanico de diseño web con 3 webs de EJEMPLO, no TRR/RN/JLS/MJA (E-32).
2. Plano de branding con marca de EJEMPLO, no Julio's (E-32, E-47).
3. "Llamar" con halo oro, no teal (E-03); capa de SEO local y marco de IA en un solo acento (E-14).
4. Chat de Marcy en claro, no "WhatsApp oscuro" (E-14).
5. H1 verbatim + cola, en vez de reescribir H1 (indexación).
6. Portada: no se añade tira de logos ni se rehace el Proceso (el cohete es animación aprobada, E-02); los titulares de sección no cambian de escala. Solo tarjetas de servicios, proyectos, diagnóstico de IA y garantías (el cierre nuevo se quitó en la revisión 1).
7. Precios: la tarjeta "Mensual" no incluye a Marcy (no es mensual en `pricing.ts`); se añade el monitoreo de IA.
8. Servicios: los 7 productos de `pricing.ts` (con SEO para IA y Mantenimiento), no la lista del plan.
9. Diagnóstico: el wizard entero vive en la columna izquierda (no se parte la máquina de estados); el escáner se pausa mientras se escribe.
10. Blog: sin suscripción; sin W-PROOF-07 en artículos (ya hay RailCta).
11. IA y resto de landings con precio (cambiado en la revisión 1, R6): cifra grande = ancla baja de `PRICE_ANCHORS` con "Desde"; el slice abajo a la derecha; el JSON-LD sigue con el slice.
12. Hubs: el panel fijo de proyectos se conserva con su altura y solo cambia su representación (el viaje no encoge).
13. Megamenú: "Servicios" sigue siendo enlace; "Recursos" va dentro del panel, no en la barra.

### 7.3 Riesgos abiertos y decisiones que quedan para el dueño (se le presentan con el render)

1. **Calendario de indexación**: el triage dice que nada que toque el sitio se adelanta (Fase A desde el 17-nov). El rediseño cambia el HTML de 48 URL aunque conserve textos y JSON-LD. Recomendación: no mergear antes de esa fecha y, al publicar, hacerlo por tandas (diseño web primero) vigilando la cobertura; decide el dueño. El megamenú es el cambio con más alcance SEO (enlaces internos nuevos en todo el sitio): va en la ÚLTIMA tanda, no en la primera.
2. **Logos de clientes**: no hay archivos en el repo; la tira usa nombres en tipografía hasta tenerlos.
3. **Calles reales de barrios**: dependen de extraer TIGER/Line con calidad; si no, circuito abstracto declarado.
4. **Megamenú en portada y hubs**: aparece por ser la navegación y la barra cambia de verdad (botón-chevron junto a "Servicios"): se le enseña antes/después. Si al verlo no le gusta ahí, `mega={false}` en esas 2 plantillas.
5. **Escáner en el teaser compartido**: estático por defecto (un recorrido al entrar). Si el dueño quiere más vida, se activa el bucle.
6. **Copy nuevo a validar**: colas de los H1, tríadas, textos de objetos, ancha de Ciudades ("¿Tu negocio está en otra ciudad?…"), checks de "lo que pasa después" del diagnóstico.
7. **Portafolio en actos**: "El negocio" y "El problema" no existen en los datos; solo se pintan si el dueño da el texto. "Ver la web" del cliente no se enlaza sin su OK (privacidad del schema).
8. **Altura de las secciones del hub**: el panel fijo de proyectos (76vh por paso) se conserva; la bandeja de Servicios se compensa dentro de su margen. Si el ejecutor cree que hay que acortar un tramo, eso altera el viaje y es pregunta al dueño con tira de fotogramas antes/después, no decisión del plan.
9. **Specificidad de `variant="link"`** y overrides bajo `[data-ds="v3"]` sobre componentes con scope: comprobar sin `!important`.
10. **Red reduced-motion de `base.css` con `!important`**: la coreografía deja el estado final visible por defecto; probar que nada queda en opacidad 0.
11. **Tracking -5.5 % en Space Grotesk** a 52 px puede pegar letras: se calibra en la primera captura.
12. **Cifra grande del precio**: por defecto el ancla baja de `PRICE_ANCHORS` con "Desde" a su altura (política de anclas bajas del catálogo); el slice abajo a la derecha. En el render se enseñan las dos versiones y decide el dueño. Los precios de los slices siguen escritos a mano (no los vigila `check:kb`): si difieren de `PRICE_ANCHORS`, se avisa.
13. **seo-para-ia fuera del verificador**: cubierta por `verify-extra.mjs`; la reescritura de contenido que pedía el plan queda fuera.
14. **Muestrarios `/es/w-muestrario` y `/es/w-muestrario-base`**: `noindex` (prop de `Layout`) y fuera del sitemap por el `filter` de `astro.config.mjs`; existen en la preview; se borran los archivos y la condición antes de cualquier merge.
15. **Volumen**: 18 tipos de página en una rama larga. Punto de control tras el piloto (ola 1) para no propagar defectos del sistema a 30 páginas.
16. **Lámina "sistema nuevo"** (Punto de control 1): radios, texturas, dos tonos en H2, cabecera numerada, etiqueta "Ejemplo" y, sobre todo, los objetos de producto en claro cálido. Es gramática nueva: la aprueba el dueño.
17. **Familia de iconos**: Lucide (instalada), Tabler o Phosphor; se elige sobre la hoja de los 7.
18. **Calles de barrio**: si los datos del repo no bastan, descargar TIGER/Line necesita su OK (fuente y tamaño).
19. **Cierre de portada**: no se añade; si lo quiere al ver el render, se mete dentro de `Contact`.
20. **Cifras del hub** (`answer.figs`): las que no tengan fuente dejan de pintarse; decide si se borran de los datos.

---

## 8 · Críticas no aplicadas (o aplicadas por otro camino)

Fuentes: `scratchpad/rw/critica-gusto.md` (B-xx, I-xx, M-xx), `critica-seguridad.md` (B1-B4, I1-I12, M1-M11), `critica-ejecucion.md` (B-1..B-6, I-1..I-15, M-1..M-12). Todas las bloqueantes e importantes se aplicaron; estas son las excepciones:

| Crítica | Qué pedía | Qué se hizo y por qué |
|---|---|---|
| Ejecución B-4 | Partir `w.css` en primitivas SIN cerrojo (cargadas en todo el sitio) + `w-v3.css` con cerrojo, y prop `headingClass` en `CierreDosTarjetas` | **Otro camino** (seguridad B1 + I2): `w.css` solo carga en páginas v3 desde `WStyles.astro`, y los componentes que salen de v3 llevan todo su CSS dentro (Cerrojo 5). Motivo: con `inlineStylesheets: 'always'`, unas primitivas globales se incrustarían en el HTML de portada y hubs (peso) y abrirían la puerta a que una clase `.w-*` pinte en la portada. `headingClass` ya no hace falta: la portada no recibe `CierreDosTarjetas` (gusto I-09) |
| Seguridad I8 | Meter las 2 tarjetas del cierre dentro de `Contact` o declarar la sección nueva | Se quita la sección del todo (gusto I-09, E-16). La variante "dentro de `Contact`" queda como plan B si el dueño la pide al ver el render (§4.1, §7.3-19) |
| Ejecución B-5 opción B / seguridad B3 | "Recursos" sustituye a "Blog" en la barra, con máscara sobre toda la barra | Se elige la **opción A**: "Recursos" dentro del panel y del drawer, la barra conserva sus 6 enlaces. La máscara cubre igualmente toda la caja de `.nav__links`, porque el botón-chevron (seguridad I4) la ensancha |
| Gusto I-11 | Glifo de Phosphor duotone, Tabler o Lucide "vía Iconify, ya en el proyecto" | Aplicada con corrección: en el repo solo está instalada Lucide (`@iconify-json/lucide`). Tabler o Phosphor entrarían como devDependency en la excepción de 0A si el dueño las elige |
| Gusto M-01 (alternativa) | En Miami, omitir la tira o poner la ciudad bajo cada nombre | Se omite en Miami (más simple y sin riesgo de leerse como clientes de Miami) |
| Gusto M-06 (alternativa) | Dar a la izquierda los 5 pasos o quitar el `sticky` | Se dan los 5 pasos (≥ 680 px) y, si en la captura el pegajoso no tiene recorrido, se quita: las dos, en ese orden |
| Seguridad I7 (alternativa) | Pestañas automáticas como ilustración `aria-hidden`, o interactivas que paran al primer uso | Se elige ilustración `aria-hidden` + resumen `sr-only` + botón de pausa; las pestañas que el visitante maneja (tienda, SEO para IA) no rotan solas |
| Ejecución I-4 (W-PROOF-12 en el hub) | Componente compartido `FiguraProyecto` también en el hub | En el hub NO: `page.js` mueve las capturas dentro de las clases `.pf__*` y no se toca (gusto B-03). Allí la figura W-PROOF-12 se consigue reestilizando ese marcado; `FiguraProyecto` queda para portada y portafolio |
| Ejecución M-9 | Columnas de la franja en el hub (p. ej. ciudad · servicios · plazos) o sin columnas | Sin columnas: menos copy nuevo que validar y el hub no tiene un servicio del que sacar "desde cuánto" |
| Gusto M-11 (alternativa) | Barras grises de "Reseñas" o etiqueta "Abierto ahora" | Las dos, según el objeto: "Abierto ahora" en `WebEjemplo`, barras grises en `FichaMapaEjemplo` |

Ninguna crítica se rechazó por desacuerdo de fondo.

---

## 9 · Registro de cambios de la revisión 1 (2026-11-01)

Comprobado contra el repo del worktree `workos` (base `1ad9f9f`) antes de cambiar: `Hero.astro:19` (id con `Math.random()` en build), `StarField.astro` 79-96 (estrellas con `Math.random()`), `astro.config.mjs` (`filter` del sitemap 37, `inlineStylesheets: 'always'` 46), `package.json` (sin script `test`, sin Playwright ni `pixelmatch`; solo `@iconify-json/lucide`), rutas reales de `GrowthTeaser`, `Article*`, `ArticleRail`, `RailCta` (en `src/components/sections/`), `deriveDefaultService` (`ClusterLanding.astro` 44-54), las 19 páginas que usan `ClusterLanding`, `city.css` 146/225-246/411, `Button.astro` 16/34-35, `portfolio.ts` (`accent: 'gold'|'teal'`), `public/geo/*`, ids de `ToolsHub` (`llamadas/citas`, `calls/appointments`), `CtaBand.astro:30` (`city='houston'`), `CityHub` 31-32 y 279-281, `Layout` (`noindex`), `showCtaBar` en `SiteNav`, prueba `test:brief-form` (formularios sin precios).

| Origen | Cambio | Dónde |
|---|---|---|
| Gusto B-01 | La franja "En pocas palabras" sale de las dos primeras posiciones y va antes de la FAQ (regla R1); rótulo a mono 12 | §0.1 I-02, §1.B G8, §3.2, §4 (R1 y cada página), §7.1 |
| Gusto B-02 | Dos familias de objeto: producto en claro cálido, sistema en noche opaca; superficies opacas bajo texto con patrón; tokens `--w-s*` opacos + `--w-s*-a` y `--w-p-*` | §2.1, §2.2, §2.4, §3.6, §6.5 |
| Gusto B-03 | El panel fijo de proyectos del hub se conserva (76vh por paso) y solo cambia su representación; `page.js` ya no se edita; compensación de la bandeja de Servicios dentro de su margen | §1.A, §2.13, §4.2, §5 ola 4, §7.3-8 |
| Gusto I-01 | Cola del H1 en el mismo tono (no al 45 %) con regla de longitud; sin cola en 5 páginas; degradado reasignado al titular del cierre donde la cola desaparece | §2.2, §2.3, §2.14, §4.6, §4.17, §4.19, §4.20 |
| Gusto I-02 | Eyebrow = nombre de producto; se omite si coincide con el H1 | §2.14, §4.9, §4.14-4.18 |
| Gusto I-03 | Estados por valor, sin 2.º acento; amanecer teal en IA para pymes; burbujas neutras de Marcy en páginas oro | §2.1, §2.4, §2.11, §3.5, §3.6, §4.11, §4.14 |
| Gusto I-04 | Radar fuera del hero de SEO local, como celda dominante de bento en la sección 01 | §2.10, §3.6, §4.16 |
| Gusto I-05 / Ejecución M-12 | Avatar de Marcy quieto en el hero de IA conversacional | §4.12 |
| Gusto I-06 | Chip de barrio con "Tu negocio" dentro, pulsos hacia el chip, 2-3 vías reconocibles con nombre fuera, pistas nunca detrás del texto | §3.6, §4.20 |
| Gusto I-07 | `RegistroVivo` con variante `static` sin texto apagado; en bucle, suelo del 55 % | §2.1, §2.10, §3.5, §4.12, §4.15 |
| Gusto I-08 | Cifra grande = ancla baja con "Desde"; slice abajo; decisión del dueño con las dos versiones (R6) | §3.4, §4 (R6 y 7 páginas), §7.2-11, §7.3-12 |
| Gusto I-09 / Seguridad I8 | Sin sección de cierre nueva en portada; mini escáner estático en portada y hubs | §2.10, §4.1, §4.2, §5 ola 4, §7.3-5/19 |
| Gusto I-10 / Seguridad B3 / Ejecución B-5 | "Recursos" dentro del panel (opción A); máscara sobre toda `.nav__links` y huella aparte de logo, idioma y CTA | §1.B G10, §2.12, §2.13, §5 0B-6 |
| Gusto I-11 | Glifos de familia con licencia; hoja en 2-3 familias para el dueño | §1.B G6, §2.8, §5 0A, §7.3-17 |
| Gusto I-12 | Servicios sin botones e Interruptores a 480×420; placa de Sobre nosotros a la 1.ª sección | §4.3, §4.6 |
| Gusto I-13 | Sin silueta en `SedesAcordeon`; silueta a todo el ancho en `TarjetasPerfil` | §3.2, §3.4, §4.13 |
| Gusto I-14 | Túnel de SEO para IA sin cola, tarjeta debajo del rectángulo, sin paredes en móvil | §4.17 |
| Gusto I-15 | 4 radios con regla de mapeo; lámina "sistema nuevo" en el Punto de control 1 | §1.B, §2.1, §3, §5 PC1, §7.3-16 |
| Gusto M-01..M-12 | Tira omitida en Miami con antetítulo; un solo contraste en precios; TRR sin repetir; índice desplegado ≥ 1280; cajetín con datos del encargo; demo pegajosa con recorrido; haces y trama fuera del texto; esclusa 2 ciclos; checks del diagnóstico fuera del formulario y sin "sin pago"; precio sin triplicar; sin estrellas; franjas a 100vw | §3.2-3.6, §4.4, §4.5, §4.8, §4.9, §4.14, §1.C |
| Seguridad B1 / Ejecución B-4 | Cerrojo 5: componentes que salen de v3 autónomos; muestrario sin `ds` como prueba | §2.13, §3, §3.7, §5 0B-1 |
| Seguridad B2 / Ejecución B-1 | Muestrario en `src/pages/es/w-muestrario.astro` (no `_w/`), filtro en `astro.config.mjs` como excepción de 0C | §1.C, §3.7, §5 0C y ola 5, §7.3-14 |
| Seguridad B3-B4 / Ejecución B-3 | `scope-check`: paso 0 main contra main, `Math.random` con semilla, normalización del id del hero, lista de secciones y lienzos, dependencias declaradas | §2.13, §5 0A |
| Seguridad I1 / Ejecución B-6 | `KIND_BY_PATH` explícito con las 19 rutas; prueba de que solo cambian 2 URL en el piloto | §3.7, §5 0C y ola 1 |
| Seguridad I2 | `w.css` fuera de `global.css`; presupuesto +6 KB | §2.1, §2.13, §6.6 |
| Seguridad I3 | Sprite único de iconos-objeto; sin ids duplicados | §2.8, §3.1 |
| Seguridad I4 | "Servicios" sigue siendo `<a>` + botón-chevron; panel en el HTML con `hidden`; hrefs por idioma y ciudad; megamenú en la última tanda | §2.12, §7.3-1 |
| Seguridad I5-I6 | Salvaguarda de la coreografía en el script inline; nada de `data-w-in` en formularios; botones desde 0.6 | §2.9 |
| Seguridad I7 | Botón de pausa en bucles > 5 s; pestañas automáticas como ilustración | §2.10, §6.8 |
| Seguridad I9 / Ejecución I-1 | Rutas corregidas (`sections/GrowthTeaser`, `sections/Article*`, `ArticleRail`, `RailCta`); `lib/` vs `src/lib/`; más archivos protegidos | §1.A, §2.13, §4.1, §4.8, §5 |
| Seguridad I10 / Ejecución M-2 | Lista literal de pruebas (no existe `npm test`); devDependencies en 0A | §2.13, §5 0A, §6.1 |
| Seguridad I11-I12 / Ejecución I-10 | `CierreDosTarjetas` con `tel`/`wa`/`city?` por props, sin `order`; trío del hub sin duplicar | §3.2, §4.2 |
| Seguridad M1-M11 | Raíles sin `100vw`; FAQ sin animar altura; "Ejemplo" a 12 px; `data-mega-open`; `data-track-loc` y número por ciudad en el drawer; `h1Html` verbatim; `id` sin valor por defecto; contrato de `mrc:ask`; `summary` del drawer; referencias §2.13/§2.14; medida del LCP | §2.1, §2.2, §2.12, §2.14, §3.1-3.4, §6.6 |
| Ejecución B-2 | Un worktree y una rama por tarea paralela, junction de `node_modules`, puerto propio, diff contra la ola anterior | §5 reglas |
| Ejecución I-2 | Copy nuevo de portada y hubs en `src/i18n/w/{portada,hubs}.ts`; `answer.figs` no se borran de los datos | §4.1, §4.2, §5 ola 4 |
| Ejecución I-3, I-4 | Archivos para todas las piezas citadas (`PasosWizard`, `ResultadoEjemplo`, `QueCambiamos`, `TarjetaLateral`, `FiguraProyecto`, `TresGarantias`, `ChipsVeredicto`, `SigueLeyendo`, `MiniPasos` mantenimiento, sello `verified`) | §3, §4, §5 |
| Ejecución I-5 | `Bento2x2` genérico (`cells[]`, `wideLast`, `id`) | §3.5, §4.3 |
| Ejecución I-6 | `TarjetaPrecio` sin deslizador; `ToolsHub` reestilizado; anclas de calculadoras vigiladas | §3.4, §4.10, §5 ola 3 |
| Ejecución I-7 | 0B en dos tandas (0B-4 después) | §5 ola 0B |
| Ejecución I-8 | `verify-extra` y `urls.json` en 0.0 con snapshot de las 48 URL | §5 0.0, §6.1 |
| Ejecución I-9 | Hrefs del megamenú por idioma; Mantenimiento a `#contacto` hasta la ola 3; prohibido inventar URL EN (R5) | §2.12, §4, §5 |
| Ejecución I-11 | Componentes `w/` del hub dentro de los contenedores `data-rev` | §4.2, §5 ola 4 |
| Ejecución I-12 | Calles: primero datos del repo; descarga con OK del dueño; forma de datos `tracks` | §3.6, §4.20, §5 ola 2, §7.3-18 |
| Ejecución I-13 | Páginas fuera de alcance nombradas (1.D) | §1.D, §5 0B-6 |
| Ejecución I-14 | Color de proyecto = `accent` de `portfolio.ts` | §1.C, §3.3, §4.2 |
| Ejecución I-15 | Regla de copy EN nativo y revisión única en el Punto de control 2 (R4) | §4 |
| Ejecución M-1..M-11 | Sintaxis de `--urls`; especificidad 0,4,0; relleno de `btn--link`; filtro del blog con JS; Contact en herramientas decidido; registro por `import.meta.glob`; 48 URL listadas; hub sin columnas; FAQ del hub precisada; cuerpo viejo de `ClusterLanding` borrado en la ola 5 | §2.7, §2.13, §3.7, §4.2, §4.7, §4.10, §5 |

---

## 10 · Ajustes del director antes de ejecutar (2026-11-01, MANDAN sobre todo lo anterior)

1. **Sin dependencias nuevas.** `package.json` y `package-lock.json` NO se tocan (el `node_modules` es un enlace compartido con otros worktrees; nada de `npm install`). `scope-check` vive fuera del repo, en `scratchpad/w/tools/scope-check.mjs`: Chrome instalado por DevTools Protocol con `WebSocket` nativo de Node (como `scratchpad/rw/capture.mjs`) y la diferencia de píxeles con Python + Pillow (`python` sin `-I`). `scripts/w/urls.json` y `scripts/w/verify-extra.mjs` (Node puro, sin dependencias) sí van al repo.
2. **Punto de control 1 = del director, no del dueño.** El dueño pidió ver el resultado terminado en la vista previa, no láminas intermedias. Decisiones por defecto: los 7 iconos-objeto se DIBUJAN propios en SVG con tokens (sin familia nueva; Lucide sigue para la interfaz funcional); objetos de producto en claro cálido sobre la noche, tal como describe §2.4; cifra grande del precio con el ancla baja "Desde". Todo se enseña en el informe final como decisión revisable.
3. **Calles de barrio.** Primero se buscan datos reales ya presentes (repo, `public/`, scratchpad de las sesiones de Houston y Miami). Si no hay, NO se descarga nada: chip sobre placa con circuito abstracto declarado como tal, apuntado en el informe para que el dueño decida la descarga.
4. **Copy nuevo** (colas, tríadas, textos de objetos): se escribe con las reglas de copy del sitio y se lista entero en el informe final para su revisión; no bloquea la vista previa.
5. **Calendario**: nada se mergea; la vista previa sí se publica en la rama.
