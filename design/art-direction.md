# Art Direction — Marcyan Home (pase correctivo 2026-06-22)

Proyecto: Marcyan Web · Página/Vista: Home `/es/` (+ espejo `/en/`, landings `clusters.ts`)
Modo: **REDISEÑO / IDENTIDAD** (la marca + DS v2 "Space-Tech" ya existen; se deriva, no se inventa)
Fuente de validación: **brief explícito del humano + imagen-guía adjunta** (lista de 10 errores de diseño, 2026-06-22). En REDISEÑO con guía provista, el humano YA fijó la dirección.

## Inventario de marca conservada
```
CONSERVADO (no se toca):
- Tokens: tokens.css (oro #c8a96e, teal #4fc3a1, fondos #080808/#141414, radios 4/8/12/20/pill)
- Tipografía: Space Grotesk (display) + DM Sans (texto) + JetBrains Mono (datos/labels)
- Acentos con MODERACIÓN: oro ~7%, teal ~3%; teal = señal IA/"en vivo"
- Mascota "Marcy" (render 3D) — sigue en la pantalla de bienvenida del chat (variant hero)
ELEVADO (mejoro dentro del marco):
- Convención de iconografía: UNA familia (Lucide outline, stroke 1.5px) + el icono de
  marca `marcyan-ai` reservado a UN solo slot insignia. Cero reuso del mismo icono para
  conceptos distintos.
- Tarjetas de ciudad: de simples a "ficha de ciudad" rica (tagline, pills estado+coords,
  ilustración line-art, sub-enlaces con icono+subtítulo, pie "CONECTADOS CON…").
PROHIBIDO en este proyecto:
- Cambiar hex de marca, sustituir tipografías, mezclar 2ª familia de iconos (filled+outline
  al azar), em-dashes "—" como muletilla en cuerpo de texto (tic de IA).
```

## 1) Dirección visual
Concepto rector: **"sala de control espacial, legible"**. Adjetivos operativos: oscuro-cálido,
monocromo+2 acentos (oro/teal), datos en mono, line-art técnico, jerarquía por contraste (no
por color saturado). Referencias de principio (no se clonan): paneles de telemetría (densidad de
datos en mono), mapas catastrales/coordenadas (pills de dato), ilustración editorial line-art de
skylines (peso de trazo uniforme). Contraste: fg-primary/bg ≥ 13:1; texto secundario sobre card
cumple AA.

## 2) Jerarquía de la página (sin cambios de orden)
Hero (titular → CTA → órbita-nav) → Servicios → IA → Proceso → Proyectos → Garantías →
Ciudades → Contacto. Una sola acción primaria por vista (CTA oro sólido). Los **nodos en
órbita del hero quedan como capa de navegación real** (su trabajo UX), y el "Caso 0" se
elimina por restar foco sin aportar a la conversión.

## 3) Intención por sección (solo lo que cambia)
- **Hero:** vender la promesa + dar navegación viva (nodos = atajos a secciones). Quitar Caso 0
  (ruido). Anillo del planeta = adorno coherente, trazo uniforme (no parecer roto).
- **Servicios / IA / Garantías:** cada capacidad necesita su icono EXACTO; un icono = un
  concepto. El robot de marca `marcyan-ai` señala la capacidad insignia "ser encontrado por IA"
  (SEO para IA), no se reparte.
- **Proyectos:** prueba social SIN exponer el dominio del cliente (privacidad) → fuera la URL.
- **Ciudades:** convertir "área de servicio" en ficha memorable y escaneable (recrear la guía).

## 4) Estilo de componentes (tokens)
- Iconos: Lucide outline, `stroke-width:1.5`, tamaños existentes (15–34px por contexto). El
  único filled permitido = `marcyan-ai` (marca), 1 sola aparición.
- FAB chat: vuelve al círculo **teal sólido** (`--accent-teal` + `--fg-inverse`) con
  `lucide:message-circle` (más jerarquía que el avatar) + punto "en vivo" pulsante; nudge =
  "Respuesta en vivo".
- Tarjeta de ciudad: `--bg-card`, borde `--border` (hover `--border-accent`), radius-lg; pills
  con radius-pill, dato en mono; ilustración line-art en oro a baja opacidad (decorativa,
  aria-hidden); sub-enlace = icono(box teal-dim)+título(display)+subtítulo(secondary)+flecha.
- Estados: hover (borde acento / flecha desplaza), focus-visible (outline teal 2px) intactos.

## 5) Errores genéricos evitados (NO → SÍ)
- NO un icono reutilizado para 3 conceptos (marcyan-ai ×4) → SÍ un icono distinto y preciso por
  concepto; marca en 1 slot.
- NO `lucide:workflow` genérico para automatizaciones → SÍ `lucide:waypoints` (flujo conectado).
- NO robot pobre en "IA conversacional" → SÍ `lucide:messages-square` (conversación real).
- NO em-dashes "—" como muletilla en el cuerpo → SÍ comas/puntos (se conservan rangos
  "Lun–Vie" y guiones decorativos en titulares).
- NO exponer el dominio del cliente en portafolio → SÍ resultado + tags, sin URL.
- NO tarjeta de ciudad plana → SÍ ficha con identidad local (skyline/palmera, coords, sub-nav).
- NO avatar de baja jerarquía como FAB → SÍ botón de mensaje teal sólido + señal en vivo.

Sub-agentes invocados: (ilustración → inline, hecha a mano: skylines + siluetas TX/FL)
Estado: **VALIDADO** por: humano (brief 2026-06-22) · Fecha: 2026-06-22

---

# Pantalla: Bienvenida del chatbot "Marcy" → Selector de canal de contacto

```
Proyecto: Marcyan Studio · Página/Vista: ChatWidget.astro — estado "welcome"
Modo: REDISEÑO/IDENTIDAD
Estado: VALIDADO por: dueño (mockup aprobado, screenshot) · Fecha: 2026-06-22
```

**Por qué:** hoy el FAB abre directo la conversación. El dueño quiere una **pantalla
previa** donde el cliente elige cómo contactar (mockup aprobado pixel a pixel). No es
estética nueva: se reusa el estado `welcome` existente (welcome → chat) y cambia su
CONTENIDO de "grid de temas + input" a "selector de canal".

Inventario de marca conservada — CONSERVADO: tokens DS v2, tipos (Space Grotesk/DM Sans),
**avatar "Marcy" como FAB y héroe** (el FAB-teal de la sección de arriba quedó REVERTIDO; el
avatar es lo aprobado y vive), glow/estrellas, y TODO el blindaje del bot (contrato /api/chat,
captura → /api/contact|/api/handoff, PII fuera del modelo, stripMarkdown, focus-trap,
VisualViewport). ELEVADO: welcome de grid 2×2 → lista de 4 tarjetas de canal con 1 acción
dominante. PROHIBIDO: tocar hex/tipos, romper el blindaje, pintar texto del modelo como HTML.

1) **Dirección visual:** "recepción espacial" — oscuro-premium, monocromo + 2 acentos (teal =
   canales, oro = la oferta gancho), táctil (tarjetas ≥56px). Referencia fuera de nicho: el
   "channel switchboard" de los messengers de soporte (Intercom/Crisp) — se toma la idea de
   rutas icono+texto+flecha; NO su azul ni su tipografía. Iconos lucide; WhatsApp/iMessage =
   glifos SVG inline monocromos teñidos teal (no hay set de marcas; sin dep nueva).
2) **Jerarquía:** avatar + "Hola, soy Marcy" → "¿Cómo prefieres contactarnos?" → 4 rutas →
   gancho oro (dominante) → pie de privacidad. Título `--text-xl`/600, tarjetas título `--text-md`.
   Una sola acción dominante: "Diagnóstico gratis" en oro; el resto en teal (secundarias).
3) **Intención por tarjeta:** Chat con Marcy → entra a la conversación. Mensaje directo →
   WhatsApp/iMessage al número de Houston. Formulario de contacto → captura inline (nombre +
   email/tel). Diagnóstico gratis (oro) → siembra el mensaje de diagnóstico. Pie: escudo +
   nota de privacidad + "Dejar mis datos" (atajo a la captura).
4) **Componentes (tokens):** tarjeta `--radius-lg`, `bg-elevated`, `1px solid --border`; icono
   en círculo 44px (teal-dim/teal-line), flecha en círculo 32px (borde fino). Variante oro =
   gold-dim/gold-line, título+flecha en oro + `--shadow-gold` en hover. La tarjeta de canales
   NO es botón (contiene 2 pills-enlace) → sin pointer; los pills sí tienen los 5 estados.
5) **Errores evitados (NO → SÍ):** NO abrir el chat de golpe → SÍ pantalla previa de canal;
   NO 2 CTAs gemelos → SÍ 1 dominante en oro; NO logos multicolor de stock → SÍ glifos teñidos
   al DS; NO radios al azar → SÍ radius-lg tarjetas/radius-md pills/círculos; NO copy de relleno
   → SÍ una frase de trabajo real por tarjeta (sin em-dash, regla de la sección de arriba).

Sub-agentes invocados: ninguno (mockup aprobado + DS existente cubren la dirección).

---

# Rediseño integral: secciones + landings al lenguaje de la home (2026-06-29)

```
Proyecto: Marcyan Web · Páginas/Vista: TODAS menos la home (secciones, hubs, landings, blog)
Modo: REDISEÑO/IDENTIDAD (la home es la base canónica; se deriva, no se inventa)
Estado: VALIDADO por: dueño (brief explícito 2026-06-29, "hazlo todo de un tirón") · Fecha: 2026-06-29
Doctrina completa: ../DESIGN.md (manda) · Dirección de equipo: chat Estructura (este chat)
```

**Por qué:** la home está bien (lenguaje "sala de control espacial"); el resto se ve genérico:
hero clónico de portada en secciones, fondos sólidos que no coinciden con la home, `FeatureGrid`
= 3-card SaaS, FAQ con la 1ª pregunta abierta por defecto (bug). Houston/Miami deben ser landings
potentes (las principales de cada ciudad). Blog necesita navegación + ilustración con vida.

Inventario de marca conservada — CONSERVADO: tokens DS v2, tipos, acentos oro/teal con moderación,
toda la lógica (form → /api/contact|/api/brief, schema SEO, copy honesto, precios, AEO answer-first),
y el estándar de la home (Hero/Services/AiSection/Process/Projects/Guarantees/Locations/Contact NO
se tocan). ELEVADO: (1) **atmósfera de página** `SpaceBackdrop` (glows oro/teal + estrellas, capa
fija) para que todo herede el fondo de la home; (2) hero de landing vs **header compacto** de sección;
(3) componentes de landing fuera del cliché (FeatureGrid, RelatedLinks, Pricing, AnswerBlock, Prose,
CtaBand, LandingHero, ArticleHero); (4) Houston/Miami a nivel home; (5) blog con nav + ilustración SVG.
PROHIBIDO: tocar hex/tipos, romper el form/schema/contenido honesto, em-dash de muletilla, stock,
3-card genérico, fondos sólidos planos, segundo set de iconos.

1) **Dirección visual:** la de la home — "sala de control espacial, legible": oscuro-cálido,
   monocromo + 2 acentos (oro/teal), datos en mono, line-art técnico, jerarquía por contraste.
   Fondo unificado vía SpaceBackdrop (eco de la viñeta del hero). Ver DESIGN.md §1–§3.
2) **Jerarquía:** 1 acción primaria oro por vista; header compacto en hubs, hero potente en landings.
3) **Intención por página:** DESIGN.md §5. 4) **Componentes (tokens):** DESIGN.md §4.
5) **Errores evitados (NO → SÍ):** DESIGN.md §3.

Sub-agentes invocados: equipo de diseño (1 agente de diseño + 1 crítico por componente y por página,
orquestado vía Workflow — director = chat Estructura). Ilustración = inline SVG line-art a mano.
```
FAQ fix aplicado (Faq.astro: ningún <details open>). SpaceBackdrop creado + cableado en ClusterLanding.
```

---

## Componente: `ArticleHero` (header editorial de artículo) — 2026-06-29

```
Página/Vista: src/components/sections/ArticleHero.astro (consumido por /es/blog/[slug])
Modo: REDISEÑO/IDENTIDAD · deriva de la entrada raíz VALIDADA 2026-06-29 + DESIGN.md §4
Estado: VALIDADO (sub-dirección bajo entrada raíz firmada por el dueño) · Fecha: 2026-06-29
Contrato intacto: props kicker/badge/title/lead/dateISO/dateLabel/readingLabel/tags + slot "breadcrumb". Un solo h1. Solo cambios ADITIVOS.
```

1) **Dirección visual:** "cabecera de revista premium sobre la atmósfera". El título manda
   (display fluido `--fluid-display`, tracking-tight); un **filete-marcador editorial** oro
   a la izquierda del eyebrow ancla la columna (como rótulo de portada). Meta tratada como
   **telemetría** (mono, icono teal). Acento espacial = el ::before de glow ya existente +
   un **divisor de "constelación"** sutil (línea oro-line con un nodo) entre lead y meta.
2) **Jerarquía:** (1) H1, (2) lead, (3) meta fecha/lectura, (4) tags. Salto duro título→lead
   por escala+color (display fg-primary vs lead fg-secondary). El badge no compite con el H1
   (pill teal pequeño en el eyebrow). Sin CTA (vive al final del artículo).
3) **Intención:** orientar al lector (de qué trata, cuánto cuesta leerlo, sobre qué temas) y
   dar entrada digna a la lectura, no convertir. Meta = confianza editorial (fecha real +
   minutos honestos). Tags = navegación temática escaneable.
4) **Componentes (tokens):** eyebrow = filete oro 2px + Kicker (mono) + badge teal pill.
   Meta = mono `--text-xs`, icono teal 14px. Tags = pills mono `--bg-card`/`--border`,
   radius-pill; en `--hover-fine` el borde sube a `--border-accent` (afinidad, no enlace —
   siguen siendo `<li>` no-interactivos). Divisor = `--accent-gold-line` + nodo 3px.
5) **Errores evitados (NO → SÍ):** NO hero clónico de portada centrado → SÍ header editorial
   alineado a la izquierda, columna de lectura; NO muro gris → SÍ ritmo eyebrow/título/lead/
   divisor/meta/tags; NO em-dash de muletilla (no hay copy nuevo, solo estructura); NO 2ª
   familia de iconos (calendar/clock Lucide, ya presentes); NO fondo sólido (la sección es
   transparente, la atmósfera de la página se ve detrás; solo el glow local del ::before).

Sub-agentes: ninguno (ilustración = filete/nodo inline, sin assets).

---

## Componente: `Pricing.astro` (panel de precio único) — 2026-06-29

```
Página/Vista: src/components/sections/Pricing.astro (consumido por ClusterLanding.astro)
Modo: REDISEÑO/IDENTIDAD · deriva de la entrada raíz VALIDADA 2026-06-29 + DESIGN.md §4
Estado: VALIDADO (sub-dirección bajo entrada raíz firmada por el dueño) · Fecha: 2026-06-29
Contrato intacto: props tag/title(set:html)/price/unit/lead/features[]/cta/note/tone. Solo aditivo.
```

1) **Dirección visual:** "consola de cotización". El precio es el HÉROE: numeral display
   grande (`--fluid-display`) en oro, con `desde` en mono encima y la unidad como pill mono
   debajo (eco del badge `/mes` de PriceGrid). La tarjeta deja de ser caja sosa → panel a 2
   zonas con **regla vertical** divisoria (la "regla del panel") + **acento de gradiente de
   esquina** (eco de `svc-hero`). Marca de telemetría (esquina mono "01 / OFERTA").
2) **Jerarquía:** kicker → título → precio (foco nº1) → CTA oro (1 acción dominante) → nota
   fina. La checklist es soporte escaneable a la derecha (desktop) bajo un encabezado mono
   "INCLUYE". Salto duro: numeral `--fluid-display` 700 oro vs label mono `--text-xs`.
3) **Intención:** publicar el precio real (palanca AEO + confianza) con peso de "instrumento",
   y empujar a 1 acción. La nota sostiene la honestidad de alcance sin restar foco.
4) **Componentes (tokens):** card `--bg-card`/`--border` (hover `--border-accent`), radius-lg,
   shadow-card; checks en **chip teal-dim** (señal "incluido") con baseline alineado; regla
   `--border`; pill de unidad mono `--bg-elevated`. Tono gold|teal vía `--tint`. CTA = Button
   primary/teal lg (sin tocar). Acento de gradiente = `--tint`-dim a baja opacidad, aria-hidden.
5) **Errores evitados (NO → SÍ):** NO numeral tamaño-h3 perdido en una caja → SÍ display
   grande tipo velocímetro; NO check gris inline suelto → SÍ chip teal con baseline; NO 2
   columnas iguales → SÍ asimetría 0.82/1.18 con regla divisoria; NO fondo plano → SÍ esquina
   de gradiente sutil; NO 2 CTAs → SÍ 1 acción oro; sin copy nuevo (estructura, no contenido).

Sub-agentes: ninguno (acento = gradiente/SVG marca-de-esquina inline, sin assets).

---

## Componente: `FeatureGrid` (el peor ofensor) → "manifiesto técnico" — 2026-06-29

```
Página/Vista: src/components/sections/FeatureGrid.astro (consumido por clusters, servicios, sobre-nosotros, seo-para-ia)
Modo: REDISEÑO/IDENTIDAD · deriva de la entrada raíz VALIDADA 2026-06-29 + DESIGN.md §3/§4
Estado: VALIDADO (sub-dirección bajo entrada raíz firmada por el dueño) · Fecha: 2026-06-29
Contrato intacto: props tag, title (set:html), intro?, items[{icon,title,desc}], tone gold|teal. Solo cambios ADITIVOS. set:html del <em> con :global() acotado.
```

**Por qué:** hoy ES el 3-card icono+título+párrafo (cliché SaaS, DESIGN.md §3 lo nombra). Items
reales = 4–6, lista plana, incluye el icono de marca `marcyan-ai`. Se abandona la rejilla suelta.

1) **Direccion visual:** "manifiesto técnico / hoja de especificaciones". En vez de N tarjetas
   flotando, UN panel-documento: header (kicker + H2 + intro) a la izquierda, y a la derecha una
   **lista numerada** (`01 / 02 ...` en mono) de filas icono-chip + título + descripción, unidas por
   un **filete-riel continuo** a la izquierda (eco del Kicker y de la "constelación" de ArticleHero).
   Se lee como un solo documento escaneable de arriba abajo, no como 3 cajas gemelas. Referencia de
   principio (no se clona): índice/sumario de spec técnica (numeración + riel) y la fila `.ai__caps`
   de la home (icono-chip + título + desc). Acento del tono (oro/teal) solo en numeral, riel y chip.
2) **Jerarquia:** (1) H2 (display fluido), (2) intro/lead, (3) filas: dentro de cada fila el orden
   es numeral, título (display), desc (secondary); el icono-chip ancla pero no compite. Salto duro
   header->lista por columna (en `--lg` el header queda sticky a la izq, la lista scrollea a la der).
   Sin CTA (no es su trabajo). Una sola familia de iconos; `marcyan-ai` se respeta tal cual viene en
   los datos (1 slot insignia por dataset).
3) **Intencion:** enumerar con autoridad "qué incluye / qué hacemos / qué nos hace distintos" de forma
   citable y escaneable. El numeral da sensación de checklist completo (cierra la objeción "¿qué recibo
   exactamente?"). Métrica: que el ojo recorra TODA la lista (riel continuo guía el escaneo vertical).
4) **Componentes (tokens):** panel = sin tarjeta envolvente (sección transparente, atmósfera detrás);
   cada fila NO es una card (es una fila de un documento, regla anti-slop "secciones, no cards"). Riel
   = línea 1px `--tint-line` con nodo por fila. Numeral = mono `--text-xs` `--tint`. Icono-chip = 44px
   radius-md (`--tint-dim`/`--tint-line`/`--tint`), idéntico a `.ai__cap-ic`. Título = display
   `--text-md` 600. Desc = `--fg-secondary` `--text-sm`. Divisor entre filas = `--border-subtle`.
   `--tint` = oro|teal según `tone` (drift de rol prohibido). Hover (solo `--hover-fine`): el chip y el
   numeral suben a `--tint`, el nodo del riel se enciende; reduce-motion apaga toda transición.
5) **Errores evitados (NO -> SÍ):** NO grid de 3 cards icono+título+párrafo -> SÍ panel-documento con
   lista numerada + riel; NO fondo sólido / tarjetas gemelas flotando -> SÍ sección transparente, filas
   sobre la atmósfera; NO 2da familia de iconos -> SÍ Lucide outline 1.5px (+ marca en su slot); NO
   numerales decorativos sin función -> SÍ numeral = índice real de la fila; NO em-dash de muletilla (no
   hay copy nuevo, solo estructura); NO muro gris -> SÍ ritmo numeral/título/desc + riel que guía.

Sub-agentes: ninguno (ilustración = riel/numeral/nodo inline, sin assets).

---

## Renderer de artículo: `/es/blog/[slug]` + `Article` + `ArticleToc` + `PostNav` — 2026-06-29

```
Página/Vista: src/pages/es/blog/[slug].astro, src/components/sections/{Article,ArticleToc,PostNav}.astro
Modo: REDISEÑO/IDENTIDAD · deriva de la entrada raíz VALIDADA 2026-06-29 + DESIGN.md §1/§4/§5
Estado: VALIDADO (sub-dirección bajo entrada raíz firmada por el dueño) · Fecha: 2026-06-29
Contrato intacto: render(post)/Content/headings, ArticleLd+FAQPage+BreadcrumbList, prevPost/nextPost,
  AnswerBlock, Faq, RelatedLinks, CtaBand, Contact, canonical/path, hasEn=false, postChrome i18n. Solo aditivo.
```

**Por qué:** ArticleHero ya quedó editorial; el resto del renderer aún se ve plano: el cuerpo es
muro gris a 72ch sin filete de columna, la ToC es un `<details>` colapsado que no acompaña la
lectura (no es pegajosa), PostNav son 2 cajas gemelas sin jerarquía y la página no trae
SpaceBackdrop (losa plana, no la atmósfera de la home).

1) **Dirección visual:** "lectura de bitácora de a bordo". El cuerpo se trata como columna de
   lectura editorial con **riel-margen** sutil (filete oro a la izquierda del primer bloque +
   marcadores de heading) que ancla la columna sin ser muro gris. La **ToC se vuelve pegajosa en
   desktop** (panel `position:sticky` en una columna lateral, scroll-spy con el H2 activo
   resaltado en oro) y colapsable en móvil (se conserva el `<details>`). Acentos espaciales =
   nodo de constelación en los marcadores de heading (eco de ArticleHero/RelatedLinks). Sin assets
   binarios; todo line-art/filete inline.
2) **Jerarquía:** dentro del cuerpo: H2 (display fluido, pregunta/palanca AEO) manda → H3/H4 →
   cuerpo `--fg-secondary` `--text-md` leading-loose. En desktop la grilla es [ToC sticky | columna
   de lectura]; la ToC es navegación de apoyo (mono, índices), nunca compite con el cuerpo. PostNav:
   una sola jerarquía clara prev/next con dirección en mono + título display + flecha que se desplaza.
3) **Intención por pieza:** **Article** = lectura cómoda y citable (ritmo vertical, ancho de
   medida, marcadores que guían el escaneo). **ArticleToc** = orientación persistente + salto rápido
   (sticky desktop con activo resaltado; details en móvil). **PostNav** = continuar el recorrido
   (anterior/siguiente con peso real + volver al índice como acción terciaria mono).
4) **Componentes (tokens):** cuerpo a `min(72ch, 100%)`; riel = 1px `--accent-gold-line` con nodo
   3px en cada H2 (`scroll-margin-top` ya existe). ToC sticky: panel `--bg-card` translúcido,
   `1px solid --border`, radius-lg, `top: calc(--nav-h + --space-5)`; ítem activo = oro + barra
   indicadora; índices mono `--text-xs`. PostNav: cards `--bg-card`/`--border` (hover
   `--border-accent`), radius-lg, dirección mono `--accent-gold`, título display 600; índice =
   enlace mono `--fg-secondary`. Scroll-spy = IntersectionObserver, progresivo (sin JS la ToC
   sigue siendo lista de anclas). Motion off en `--motion-reduce`.
5) **Errores evitados (NO → SÍ):** NO muro de texto gris a 72ch sin ancla → SÍ columna con
   riel-margen + marcadores de heading; NO ToC colapsada que no acompaña → SÍ ToC pegajosa con
   scroll-spy (desktop) / details (móvil); NO 2 cajas gemelas de igual peso en PostNav → SÍ
   jerarquía prev/next + índice terciario; NO losa plana → SÍ SpaceBackdrop tone="gold" (atmósfera
   de la home); NO 2ª familia de iconos → SÍ Lucide outline ya presente (arrow-left/right);
   NO em-dash de muletilla (no hay copy nuevo, solo estructura).

Sub-agentes: ninguno (ilustración = riel/nodo/constelación inline, sin assets).

---

## Página: `/es/sobre-nosotros` (E-E-A-T, hub de sección) — 2026-06-29

```
Página/Vista: src/pages/es/sobre-nosotros.astro
Modo: REDISEÑO/IDENTIDAD · deriva de la entrada raíz VALIDADA 2026-06-29 + DESIGN.md §2/§3/§5
Estado: VALIDADO (sub-dirección bajo entrada raíz firmada por el dueño) · Fecha: 2026-06-29
Contrato intacto: AboutPageLd + bloque Person comentado, breadcrumb, schema FAQ, form Contact
(→/api/contact,/api/brief), copy honesto i18n (sobre-nosotros.ts), canonical path, hasEn=false.
Solo se edita el archivo de página; cero cambios en componentes compartidos.
```

**Por qué:** es un HUB de sección (E-E-A-T), NO una landing → header COMPACTO (§2), no hero de
portada. El riesgo genérico aquí es el "muro de texto de página corporativa". Los datos ya son
honestos (estudio joven, SAB, sin fundador inventado) → la dirección les da ritmo y carácter.

1) **Dirección visual:** "expediente del estudio" — se lee como una ficha de confianza, no como
   un About corporativo. Header compacto (LandingHero variant="header", oro) sobre la atmósfera.
   La pieza bespoke = **banda de pilares "telemetría de confianza"**: 3 datos verificables tratados
   como lectura de instrumentos (label mono + valor display), NO 3-card icono+párrafo.
   El resto reusa componentes ya finales (AnswerBlock, Prose, FeatureGrid, Process, Locations,
   RelatedLinks, Faq, CtaBand, Contact).
2) **Jerarquía:** header (kicker → H1 → 1 CTA oro "Pedir propuesta gratis") → definición citable
   (AnswerBlock) → quiénes somos (Prose) → banda de pilares de confianza (bespoke) → enfoque/valores
   (FeatureGrid) → cómo trabajamos (Process) → Clientes Fundadores (Prose) → ciudades (Locations) →
   trabajo real (RelatedLinks) → FAQ → CtaBand → Contact. Una sola acción primaria oro; un único <h1>.
3) **Intención de la banda bespoke (lo nuevo):** convierte "puedes verificarnos" en prueba escaneable
   = los hechos reales como instrumentos de telemetría (Houston y Miami · bilingüe ES/EN · precios
   públicos), reforzando E-E-A-T (Trust) sin inventar nada. Derriba "¿es real esta agencia?" con
   datos, no adjetivos. No es CTA; es señal de confianza.
4) **Componentes (tokens):** banda = panel translúcido sobre la atmósfera (eco de RelatedLinks):
   `color-mix(--bg-card 72%)`, `1px solid --border`, radius-xl, acento de esquina oro-dim.
   Cada pilar = label mono `--text-xs` (oro) + valor display `--text-lg`/600 + apoyo `--fg-secondary`,
   separados por regla `--border-subtle`; punto de señal oro 6px (eco de las chips del hero).
   Micro-ilustración line-art (órbita de 3 nodos) aria-hidden, oro baja opacidad. Sin radios al azar.
5) **Errores evitados (NO → SÍ):** NO hero clónico de portada en un hub → SÍ header compacto §2;
   NO muro de texto gris corrido → SÍ ritmo (answer / prose-rail / banda de datos / manifiesto);
   NO 3-card de "valores" → SÍ FeatureGrid manifiesto + banda de telemetría; NO 2 CTAs gemelos → SÍ
   1 acción oro; NO fondo sólido plano → SÍ SpaceBackdrop oro + panel translúcido; NO em-dash de
   muletilla / copy de relleno → SÍ copy honesto de i18n intacto; NO inventar fundador/reseñas → SÍ
   bloque Person sigue comentado, sin AggregateRating.

Sub-agentes: ninguno (ilustración = órbita/nodo/regla inline, sin assets).
