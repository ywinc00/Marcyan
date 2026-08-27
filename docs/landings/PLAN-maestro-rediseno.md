# PLAN MAESTRO — Rediseño de landings por expresiones + silos por ciudad + idiomas

**Estado: PROPUESTO** (2026-08-24, revisado por 3 revisores adversariales el mismo día;
21 hallazgos corregidos). **Nada de este plan se encarga a ejecutores hasta la Decisión 0
del dueño.** Fuente de las resoluciones: sesión de debate 2026-08-23 (memoria
`marcyan_landings_calidad_debate_2026-08-23`). Este plan NO reabre ese debate: lo ejecuta.

**Reparto acordado:** el dueño CREA los conceptos visuales (Claude Design, partiendo del
lienzo de expresiones). Claude los traduce a código. Todo diseño pasa por el protocolo
"Ojos" de la skill `design-director` (mínimo 2 ciclos render→captura→crítica, entrega con
screenshot, ledger de errores) y por el OK visual del dueño ANTES de merge.

---

## 0) Diagnóstico que este plan ataca (números de agosto 2026)

- 56 páginas landing; **50 comparten la plantilla `ClusterLanding.astro`** (131 líneas).
- Los 4 hubs de ciudad concentran **232 de 323 impresiones**; las 22 landings de servicio
  suman 42. La demanda existe pero aterriza en el hub, no en la landing que vende.
- **8 canibalizaciones documentadas** (consulta cuya página esperada era una landing y la
  gana un hub). Las 3 peores son del grupo diseño web.
- La prueba de que el problema es señal y no capacidad: `/es/houston/diseno-web` promedia
  **posición 6.8** las pocas veces que Google la muestra (ojo: sobre 5 impresiones, dato
  de confianza baja). El contenido puede rankear; le falta identidad y enlazado.
- Prueba social real disponible HOY: portafolio (4 proyectos con capturas reales), precios
  públicos exactos, diagnóstico y calculadoras funcionando, puente a Marcy. **Reseñas: NO
  hay ni una real todavía.** Prohibido fabricarlas; `aggregateRating` de `schema.ts` queda
  sin emitir hasta que existan (meta GBP: 15-30 por ciudad).

## Los 3 problemas → 3 frentes de este plan

| Problema | Frente | Fase |
|---|---|---|
| Landings genéricas sin valor real | Expresiones por grupo de SERVICIO | Fases 1 y 3 |
| Ecosistema por ciudad | Silos estáticos (URL decide, no el visitante) | Fases 0.5 y 2 |
| Idiomas ES/EN | Aviso "Prefer English?" sin redirección | Fase 0.3 |

---

## FASE 0 — Fundaciones (2 encargos ejecutores + decisiones del dueño)

### 0.1 · DECISIÓN DUEÑO: validar el lienzo de expresiones (incluye 1 enmienda a DESIGN.md)
El lienzo Claude Design "capa de expresiones" (artifact `aba4623f`, estado PROPUESTO)
define qué es intocable de la marca y qué puede variar por grupo. El dueño lo revisa, lo
edita si quiere, y lo da por VALIDADO. Al validarse, el ejecutor del piloto lo baja al
repo como `design/expresiones.md`.

**Choque detectado que el dueño debe resolver al validar:** `DESIGN.md` §3 hoy prescribe
"NO stock / imágenes nuevas binarias → SÍ ilustración inline SVG line-art" y ese archivo
MANDA sobre cualquier decisión de UI. El lienzo (y el mock de Houston del dueño) permiten
imaginería realista. Si se quiere permitir fotos, hay que **enmendar DESIGN.md §3 por
escrito** en el mismo PR del piloto, por ejemplo: "binarios permitidos SOLO para fotos y
capturas REALES o arte hero encargado por el dueño, optimizados vía `astro:assets`
(AVIF/WebP, width/height explícitos); stock genérico sigue prohibido". Sin la enmienda,
el Art Director Gate rechazaría un hero fotográfico y con razón.

### 0.2 · DECISIÓN DUEÑO: esqueleto de nav de los grupos de landings
Regla ya acordada: **piel libre por grupo, esqueleto coherente**. Falta fijar el esqueleto
por escrito. Tres opciones:

- **Opción A** — Nav global idéntica en todo el sitio (Servicios · Precios · Ciudades ·
  Blog + CTA). Solo cambia la piel. Cero riesgo, cero contexto local.
- **Opción B (recomendada)** — Nav de conversión para landings, calcada del mock del dueño:
  **Inicio · Servicios · Precios · Portafolio · Contacto + ES/EN + CTA**, con reglas de
  silo: el **logo sigue apuntando a la home del idioma** (`/es/` · `/en/`, así la home no
  pierde su enlace sitewide), "Inicio" apunta al HUB de su ciudad, "Contacto" al ancla
  `#contacto`, "Portafolio" a `/es/portafolio`. Ciudades y Blog no se pierden: **viven en
  el footer** (verificado: el footer sitewide ya enlaza `/es/blog`, `/es/ciudades` y ambos
  hubs). Costo de enlazado interno verificado como BAJO.
- **Opción C** — Global + chip de contexto de ciudad. Mínimo cambio, mínimo carácter.

**Nota técnica vinculante para la B:** `clusterNav`/`clusterNavEn` de `clusters.ts` son
constantes ÚNICAS compartidas por las 50 landings actuales y NO pueden expresar "Inicio →
hub de SU ciudad". Quedan **congeladas** como parte de ClusterLanding. La nav de las
páginas migradas se deriva por página en `src/lib/cluster-derive.ts` (p. ej.
`deriveLandingNav(cluster, lang)`, con el hub salido de `service.areaCity`). Prohibido
resolverlo editando las constantes: cambiaría la nav de las 46 páginas no migradas.

**Regla de marca en cualquier opción:** la piel de nav varía material y atmósfera; el
**wordmark `BrandType` del navbar es intocable** en todos los grupos (regla de logos del
dueño: los 3 artefactos de marca nunca se fusionan ni se sustituyen).

### 0.3 · ENCARGO EJECUTOR (tras Decisión 0): aviso de idioma `LangNotice`
Verificado en código: la raíz `/`→308→`/es` es incondicional (`vercel.json`), x-default=ES,
y NO existe ninguna lógica de `navigator.language`/Accept-Language en el sitio. La trampa
de MJA no existe aquí; el hueco real es el visitante EN que entra directo a una URL ES.

Spec (verificada contra el código actual):
- **Componente nuevo** `src/components/layout/LangNotice.astro`, montado desde
  `Layout.astro` entre `<slot />` y `<ChatWidget>`. Renderizado condicional en build:
  solo si existe espejo (`otherPath != null`, que Layout YA calcula con `mirrorPath()` de
  `routes.ts`, el mismo mapa del conmutador de la nav). La URL destino viaja en un
  data-attribute; el DOM visible se construye client-side tras DOMContentLoaded.
- **AVISO EXPLÍCITO: al montarse en Layout, el aviso aparecerá también en la HOME.** Esta
  es la excepción sancionada a "la home no se toca" (una sola línea en Layout, cero
  cambios en secciones). Por eso el QA de este encargo incluye capturas de la home ES en
  móvil y desktop con el aviso visible, verificadas en el **Chrome real** (elemento
  `position:fixed` con offsets móviles, lección E-09), y el **OK del dueño antes de merge**.
- **Direcciones**: ES→EN ("Prefer English?") es la acordada. La simétrica EN→ES
  ("¿Prefieres español?") se implementa en el mismo componente **pero es un punto a
  validar por el dueño en el preview**: se enseña funcionando y él decide si sale
  activada, apagada tras un flag, o fuera.
- **Display**: idioma del navegador empieza por el idioma contrario + hay espejo + no fue
  descartado + nunca eligió idioma. `position:fixed` (CLS 0). **Tope de apilado en móvil**:
  la landing ya lleva la barra CTA inferior fija y el FAB del chat; la cobertura combinada
  de elementos fijos no supera el 25% del viewport en el primer render; si el aviso no
  cabe, se muestra tras el primer scroll o colapsado a una línea. Decisión consciente
  documentada: para el render de Googlebot (locale en-US, sin storage) el aviso ES→EN
  formará parte del DOM indexado de todas las páginas ES; por eso es texto corto, un solo
  enlace (al alternate ya declarado en hreflang) y `role="status"`.
- **Storage** (convención `mrc_` existente, siempre en try/catch como `track.js`):
  `mrc_lang_pref` ('es'|'en', cualquier elección explícita silencia el aviso para siempre
  en AMBAS direcciones; el conmutador de la nav también la escribe) y
  `mrc_lang_notice_dismissed` ('1', cierre sin elegir).
- **A11y**: `<aside role="status">` (nunca `role="alert"`), acción principal = `<a>` real,
  botón de cierre con `aria-label`, ambos ≥44px (`--tap-min`), `:focus-visible` con tokens,
  sin autofocus, Esc cierra solo si el foco está dentro.
- **Tracking**: eventos `lang_notice_shown` / `lang_notice_accepted` /
  `lang_notice_dismissed` con prop de dirección, vía el `track()` first-party existente.
  **Requiere la excepción sancionada en api/**: añadir los 3 nombres al Set `EVENTS` de
  `api/events.mjs` (línea aditiva; sin ella el endpoint devuelve 400 silencioso). También
  se toca `SiteNav.astro` para que el conmutador escriba `mrc_lang_pref`.
- **Por qué es SEO-safe**: sin redirect, HTML idéntico para todos (estático), canonical y
  hreflang intactos (server-side en Layout), aviso pequeño fijo y descartable dentro de
  las excepciones documentadas de Google para banners.
- **Acotación de precedente**: LangNotice es la ÚNICA lógica de display por visitante
  sancionada en todo el sitio (excepción explícita de la resolución de idiomas). No sirve
  de precedente para ninguna otra personalización client-side.
- **Retirada por datos**: si en 4-6 semanas una dirección solo genera cierres, se apaga.

### 0.4 · ENCARGO EJECUTOR (mismo encargo que 0.3): verificador de contratos post-build
Script `scripts/verify-landing-contracts.mjs` (node sobre `dist/`): para cada URL migrada
asserta:
- Exactamente 1 `<h1>`; los 3 JSON-LD (Service, FAQPage, BreadcrumbList) más el @graph
  del Layout; canonical sin barra final; hreflang es/x-default (y en si hay espejo).
- El trío de conversión anclado al marcado del PROPIO CtaBand (pares clase+atributo
  `ctaband__act--form|--wa|--call` con su `data-track`), no la mera presencia de los
  nombres de evento en la página (SiteNav, footer, Contact y ChatWidget también los
  emiten y darían un falso PASA).
- **Paridad de texto server-renderizado**: los strings de `answer.q/a`, cada `faq.q/a` y
  los párrafos de `local` del slice de datos aparecen LITERALMENTE en el HTML de `dist/`
  (no solo en el JSON-LD). Es el seguro contra el mismatch schema↔visible que Google
  penaliza y que un rediseño creativo puede causar sin romper ninguna otra aserción.
- Snapshot del estado de indexación (`data/indexing-status.json`) de cada URL migrada el
  día del merge, con recomprobación a los 14 y 28 días de que ningún estado empeoró.
Compara contra snapshot pre-migración de la misma URL. Corre en cada PR de migración.

### 0.5 · ENCARGO EJECUTOR (tras Decisión 0, ANTES del piloto): anchors anti-canibalización
El hallazgo de agosto dice que el cuello es indexación y ENLAZADO, no contenido. Esta
tarea es barata, independiente del rediseño y ataca directo las 8 canibalizaciones, así
que va ANTES del piloto y con ventana de observación propia: así el efecto de los anchors
y el efecto del rediseño se miden por separado y no se contaminan.

- Revisar en los 4 hubs los textos de enlace hacia las landings de dinero para que usen
  el lenguaje de la consulta objetivo. Verificado: el de Houston→diseño web YA es casi
  exacto ("Diseño web en Houston"); el delta es marginal y el trabajo real está en el
  resto de anchors (Miami sobre todo). Los hubs NO se rediseñan: cambios de texto de
  enlace solamente, con OK del dueño (los hubs de Houston son el rediseño premium).
- **Criterio de neto y reversa** (aplica también al piloto): por consulta canibalizada,
  éxito = la página que sale (sea cual sea) mejora ≥3 posiciones tras dos reportes
  mensuales. Si a los 2 meses la visibilidad total de la consulta (impresiones
  hub+landing) cayó más del 40% sin recuperación, se revierten los anchors (1 línea por
  anchor, reversible).

---

## FASE 1 — Piloto: grupo **diseño web** (recomendado por datos; confirma el dueño)

**Por qué este grupo** (expectativa en DOS niveles, sin inflar):
- **Señal primaria, conquistable en el horizonte del piloto (Houston):** "diseño de
  sitios web en houston" está A TIRO en pos 16.7 (18 impr) y la gana el hub;
  `/es/houston/diseno-web` ya demostró pos 6.8 cuando aparece. Ganar esa consulta y las
  impresiones propias de la landing ES el objetivo del piloto.
- **Apuesta secundaria a 90-180 días (Miami), que NO se evalúa en la ventana del piloto
  ni condiciona el escalado:** "diseño web miami" (36 impr, pos 41.9) y "agencia diseño
  web miami" (22 impr, pos 37) son consultas P2 contra agencias establecidas y
  directorios, y `/es/miami/diseno-web` está hoy en "Variante canónica" con 0
  impresiones. El rediseño les da por fin una landing con identidad, pero moverlas es
  proyecto de meses y autoridad, no de plantilla. Que nadie lea su quietud como fracaso
  del piloto.
- Sin bloqueos de indexación en el grupo y es el servicio escaparate: la landing de
  diseño web DEBE demostrar diseño.

**Segundo en cola: e-commerce** (amplificar al único ganador: `/es/miami/ecommerce`
pos 13.7, mejor CTR del sitio, consulta a tiro propia sin canibalización).

**Alcance del piloto: 4 páginas** (`/es/houston/diseno-web`, `/en/houston/web-design`,
`/es/miami/diseno-web`, `/en/miami/web-design`). ES/EN comparten diseño; Houston y Miami
comparten personalidad de SERVICIO con adaptación de ciudad encima.

### La cadena de montaje por grupo (se repite en Fase 3)

1. **Concepto (DUEÑO)**: crea el concepto del grupo en Claude Design partiendo del lienzo
   de expresiones validado. Define: hero, atmósfera, piel de nav (esqueleto de 0.2), y
   qué prueba viva incrusta (menú de activos abajo).
2. **Spec (CHAT PLANIFICADOR)**: traduce el concepto a handoff turnkey: secciones, mapa
   de componentes `expressions/diseno-web/`, adaptación por ciudad, contratos a conservar.
3. **Implementación (CHAT EJECUTOR)**, mecanismo verificado contra el código:
   - Base fresca de `origin/main`, rama del encargo.
   - **`ClusterLanding.astro` queda CONGELADO, cero diffs.** Se crea
     `src/components/expressions/ClusterShell.astro` (cascarón que hace estructuralmente
     imposible omitir el contrato: Layout con title/description/lang, `ServiceLd` en slot
     head, SiteNav con la nav derivada del esqueleto 0.2, Contact con prellenado,
     SpaceBackdrop único, SiteFooter) y las derivaciones compartidas en
     `src/lib/cluster-derive.ts`. ClusterLanding NO se refactoriza para usar el shell.
     Invariante SEO real del shell: la ruta debe figurar en `ROUTE_PAIRS` de `routes.ts`
     (el canonical/hreflang se derivan de `Astro.url.pathname` + `mirrorPath()`; la prop
     `path` del Layout es legado y no gobierna nada).
   - La composición del grupo `expressions/diseno-web/DisenoWebLanding.astro` acepta la
     interfaz de ClusterLanding: el contenido sigue viviendo solo en
     `clusters.ts`/`clusters.en.ts`, cero duplicación de copy.
   - Migrar página a página cambiando UNA línea de import en el archivo de `src/pages`.
     Reversible con git revert por página. **URLs, slugs y objetos `service` congelados.**
   - Datos nuevos del concepto entran como campo opcional `expression?:` en `ClusterPage`
     (aditivo puro, las 46 páginas no migradas ni se enteran) **con esta salvaguarda,
     porque un campo opcional NO obliga a poblarlo**: la composición del grupo exige el
     campo en su propia interfaz (`cluster: ClusterPage & { expression: ... }`), de modo
     que TypeScript SÍ falla en los wrappers ES y EN si algún idioma no lo trae; y el
     verificador comprueba la paridad de presencia en los pares de `routes.ts`.
   - **CERO literales de contenido en los componentes de expressions/**: todo texto entra
     por el slice de datos o `content[lang]` (protege el espejo ES/EN).
4. **QA bloqueante antes de enseñar**:
   - Build completo + `verify-landing-contracts.mjs` contra las 4 URLs (con paridad de
     texto y snapshot de indexación).
   - Lighthouse local con presupuesto duro: **no bajar de 95/97 móvil**. Arte hero
     preferentemente SVG inline/CSS; fotos SOLO si la enmienda de DESIGN.md §3 (0.1) se
     aprobó: `astro:assets` AVIF/WebP, width/height explícitos, ≤150KB above-the-fold,
     `fetchpriority="high"` solo en el LCP real, lazy bajo el fold. Sin pesos de fuente
     nuevos. Tope +15KB gz de CSS por página.
   - Protocolo "Ojos": mínimo 2 ciclos render→captura→crítica contra el ledger de
     errores (E-01 luz, E-03 teal limpio, E-04 anti 3-card, E-08 sin apilar efectos).
   - Scroll/sticky/animaciones en el CHROME REAL, con la pestaña visible.
5. **Preview al dueño → OK explícito → merge a main → medición.**

### Menú de prueba viva por landing (inventario verificado, rutas exactas)
- `ToolsHub` / calculadoras (sliders de pérdida en $, fórmulas de
  `lib/tools-formulas.mjs`, NUNCA duplicarlas) y `GrowthCta` (línea CTA al diagnóstico).
- Puente `mrc:ask` (abre Marcy con pregunta precargada, sin PII; ojo coste por turno:
  acción deliberada del visitante, nunca automática).
- `Projects` (portafolio en dispositivo con capturas reales; mapeo por nombre EXACTO).
- `Guarantees` (garantía AEO animada + chips bilingües; plazos: contacto "1 hora hábil",
  propuesta "24 horas", no fusionar).
- `pricing.ts` (7 productos, anclas bajas; espejo con `chat-kb.mjs`, guard `check:kb`).
- `AnswerBlock` (AEO answer-first: q/a/source VERBATIM, jamás se reescribe al restilizar).

### Medición del piloto (corregida tras revisión: sin ruido estadístico)
Con ~8 impresiones/día en el grupo, una ventana corta solo mide ruido. Por eso:
- **t0 real** = re-rastreo confirmado de cada URL migrada (fecha de último rastreo en
  GSC), no la fecha del merge. Tras el merge, el sweep diario de indexación les da un
  turno a las 4 URLs migradas para acortar la latencia.
- **Checkpoint temprano (semanas 2-3), solo señales binarias**: re-rastreo confirmado,
  estado de indexación estable o mejor, y qué página sale por consulta (hub o landing).
  Sin juzgar posiciones todavía.
- **Evaluación real: DOS reportes mensuales completos post-t0 (6-10 semanas)**, con
  umbral mínimo de muestra (no se evalúa "página 1" con menos de 50 impresiones de la
  consulta en la ventana).
- **Criterios**: (a) la consulta Houston sale por la landing y la página que sale mejora
  ≥3 posiciones netas; (b) impresiones propias de `/es/houston/diseno-web` crecen de
  forma sostenida; (c) sin regresión de indexación ni de PSI. Gatillo de reversa del 0.5
  vigente. Si tras dos reportes no hay señal, se diagnostica ANTES de escalar.

---

## FASE 2 — Silos por ciudad (se monta SOBRE cada grupo migrado, no aparte)

Resolución firme: el contexto de ciudad viene de la URL, generado en build. Nada por
visitante (única excepción sancionada: LangNotice), ni subdominios, ni SSR.

- **Dentro de la landing**: breadcrumb del silo, RelatedLinks como conmutador de servicios
  DE ESA ciudad, CtaBand con teléfono/WhatsApp de la ciudad (derivado de
  `service.areaCity`, congelado), proyectos y copy locales, y la nav del esqueleto 0.2.
- **Del hub hacia abajo**: los anchors ya se afinaron en 0.5, antes del piloto.
- **Miami**: su hub entra en la cola cuando el dueño diga, con diseño NUEVO desde cero
  (regla dura: el material "Aproximación" descartado no se reutiliza). El grupo piloto ya
  le da a Miami su primera expresión de landing sin tocar el hub.

## FASE 3 — Escalado por la cola de datos

La cola la dictan los datos de cada reporte mensual (tabla "a tiro de página 1"), no una
jerarquía fija. Cola de arranque con los datos de agosto:

| # | Grupo | Señal que lo ordena |
|---|---|---|
| 1 | Diseño web (PILOTO) | Consulta a tiro en 16.7 + demanda Miami a largo plazo |
| 2 | E-commerce | Mejor landing del sitio (13.7), consulta a tiro propia, amplificar |
| 3 | Bilingüe | Wedge de marca, 12 impr capturadas por el hub EN |
| 4 | SEO local | Demanda incipiente toda en hubs; parte del bloqueo es indexación |
| 5 | IA conversacional | Primero indexación (`/es/houston/ia-conversacional` DESCONOCIDA para Google) |
| resto | Industrias, barrios, precios, branding, SEO para IA | Esperan al patrón ganador y a posicionarse (regla del dueño). Precios ES: bloqueo 100% de indexación, el sweep sigue. SEO para IA: Google la rastreó y DESCARTÓ; necesita reescritura de contenido además de diseño, caso aparte |

Regla permanente: **no se construyen páginas nuevas** (hallazgo de agosto: el cuello es
indexación y enlazado, no contenido). Este plan rediseña lo que existe.

---

## Reglas duras transversales (cualquier ejecutor: verificar antes de merge)

1. `ClusterLanding.astro` congelado hasta que la última página migre. Home, footer
   ("El Arribo"), formulario y `api/`/`lib/`: intactos, con DOS excepciones sancionadas y
   acotadas: (a) `lib/cluster-derive.ts` nuevo aditivo; (b) la línea aditiva de los 3
   eventos `lang_notice_*` en el Set `EVENTS` de `api/events.mjs` más la escritura de
   `mrc_lang_pref` en `SiteNav.astro` (Fase 0.3). Ningún otro cambio en esas zonas.
   El montaje de LangNotice en Layout hace el aviso visible también en la home: es la
   excepción sancionada, con QA de home en Chrome real y OK del dueño (0.3).
2. URLs, slugs, objetos `service`, breadcrumbs y textos AnswerBlock/FAQ: congelados.
   `clusterNav`/`clusterNavEn` congeladas (la nav nueva se DERIVA, no se edita ahí).
   La migración cambia PRESENTACIÓN, nunca datos, rutas ni promesas.
3. Política de CTAs: el brief NUNCA capta; trío llamar/WhatsApp/#contacto con dominancia
   por dispositivo; `data-track` intactos; plazos "1 hora hábil" / "propuesta en 24 horas".
4. Sin reseñas ni testimonios inventados; `aggregateRating` prohibido hasta reseñas reales.
5. Copy sin em-dash como conector; honestidad dura; precios "desde $X" con ancla baja.
6. Presupuesto PSI 95/97 como gate bloqueante; SpaceBackdrop exactamente uno por página.
7. Todo cambio visual: render + OK del dueño ANTES de merge (sin excepción; incluye heros
   y el propio LangNotice). El wordmark `BrandType` del navbar es intocable.
8. Ejecutores: base fresca `origin/main` + `git diff main --stat` solo del encargo.

## Decisiones pendientes del dueño

| # | Decisión | Bloquea |
|---|---|---|
| 0 | **Dar por bueno este plan y autorizar el arranque de la Fase 0** | TODO (ningún encargo sale sin esto) |
| 1 | Validar el lienzo de expresiones + resolver la enmienda de DESIGN.md §3 (fotos sí/no) | Fase 1 (concepto del piloto) |
| 2 | Esqueleto de nav: opción A / **B (recomendada)** / C | La nav de todos los conceptos |
| 3 | Confirmar piloto: **diseño web (recomendado)** o e-commerce | Fase 1 |
| 4 | Versionar y mergear la documentación (PR #32, actualizado con este plan) | Que los ejecutores, que parten de `origin/main` fresco, VEAN este documento |

Con la Decisión 0 dada, los encargos 0.3+0.4 (aviso de idioma + verificador) y 0.5
(anchors) no dependen de las decisiones 1-3 y pueden salir de inmediato y en paralelo.
