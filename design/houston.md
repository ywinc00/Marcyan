# Art Direction — Landing de Houston (`/es/houston` + `/en/houston`)

Proyecto: Marcyan Web  ·  Página/Vista: hub de ciudad de Houston, rediseño completo
Modo: **REDISEÑO / LANDING-CON-IDENTIDAD**
Estado: **PROPUESTO** — tres direcciones a elegir. Fecha: 2026-10-01.
Lienzo de decisión (artifact): "Houston, arte propio" (cuarta vuelta: arte dibujado en código,
sin capturas de clientes). Las tres tandas anteriores fueron rechazadas por el dueño.

> Punto de partida: **lo que está vivo en producción**. El hero "El Domo" queda descartado
> por el dueño (2026-10-01): obligaba a cambiar la barra de navegación principal y la
> gramática del sitio solo para que esa estética encajara. Ver `memory/marcyan_hero_domo_descartado.md`
> y el ledger E-15 / E-31.

---

## Inventario de marca conservada

**CONSERVADO (no se toca):**
- Tokens de `src/styles/tokens.css`: fondo `#080808`, oro `#c8a96e` (acento dominante, ~7 %),
  teal `#4fc3a1` (señal de IA, ~3 %), texto `#f0ede8` / `#9a9590`, borde `#242420`,
  radios 4/8/12/20/100, escala de espaciado base 4.
- Tipografía: Space Grotesk (display) + DM Sans (texto) + JetBrains Mono (dato y rótulo).
  **La escala es del sistema** (`.display` 40→80, `.h1` 36→64, `.lead` 17→20, `--text-*`).
- Gramática de interacción: `Button.astro` (radio `--radius-md`, primario oro sólido,
  secundario contorno, ghost), `SiteNav` tal como está, `Kicker`, superficies `--bg-card`.
- Atmósfera: `SpaceBackdrop` tone `gold` como capa global.
- Toda la lógica y todos los contratos listados abajo.

**ELEVADO (se propone mejorar dentro del marco):**
- Ritmo vertical: hoy hay 8.586 px de alto con huecos de 300 a 500 px entre bloques. Se
  propone una escala de separación por capítulo, no un `--section-gap` uniforme.
- Jerarquía de superficie: hoy todo es el mismo negro. Se propone alternar `--bg-base` y
  `--bg-2` por capítulo, con filete de luz superior (pieza G-10), para que la página tenga
  tramos y no una sola tira.
- Densidad de la primera pantalla: hoy es texto centrado sin ancla visual.

**PROHIBIDO en este proyecto:**
- Cambiar los hex de marca, la tipografía, el radio de los botones o la barra de navegación.
  Cualquiera de esas cosas es decisión global y se consulta antes (E-15).
- Tocar copy congelado por posicionamiento (ver contratos).
- Rediseñar solo el español: el par de idiomas se mueve junto.

---

## Diagnóstico de la base viva (medido, no recordado)

Captura y medición en Chrome real sobre `marcyanstudio.com/es/houston`, más auditoría de
código de `src/pages/es/houston.astro` (586 líneas, 274 de marcado y 310 de CSS propio).

| Hallazgo | Dato |
|---|---|
| Alto total de la página | 8.586 px |
| Bloques en `<main>` | 13, de los cuales **solo 2 tienen material visual** (portafolio y diagnóstico) |
| Cola final sin una sola imagen | 6 bloques seguidos (respuesta directa → preguntas → explora → cierre → reaseguro → contacto) |
| Prosa antes del primer visual real | ~105 palabras de texto corrido, ~219 de texto visible |
| Precio repetido | 5 veces (riel del hero, catálogo, enlace a precios, pregunta 5, enlaces de explora) |
| Teléfono repetido | 4 veces dentro de `<main>` |
| Cobertura metropolitana repetida | 3 veces con la misma lista de zonas |
| Promesa de plazo | 4 veces y con dos relojes distintos (1 hora hábil / 24 horas) |
| Imanes de lead compitiendo | 2 con destinos distintos (`/es/herramientas` y `/es/diagnostico`) separados por tres bloques |
| Secciones sin trabajo propio | `explore` (duplica el enlace de precios y saca del silo) y `reassure` (resume promesas ya dichas) |
| Mismo gesto repetido | 3 listas con filete consecutivas; 5 variantes del mismo "icono + etiqueta + flecha" con 5 tamaños de icono; 8 kickers idénticos |
| Prueba social | ninguna: ni reseñas, ni testimonios, ni cifras propias |

Lectura de director de arte: **la página no está mal compuesta, está vacía y repetida**. El
problema no es el estilo, es que hay un tercio de negro sin trabajo y que lo poco que
demuestra algo (el portafolio) vive escondido a mitad de scroll, detrás de un carrusel que
enseña un caso de cuatro.

---

## Referencias miradas (en imagen, no leídas) — cuarta vuelta, con Refero

**Lección que manda esta vuelta (E-32).** El dueño tumbó la tercera tanda: las capturas de las
webs de clientes "funcionan como prueba pero no como arte visual; tenemos que ser más
creativos". Las capturas van a la sección de casos. El arte de la apertura se construye en
código con los tokens del sitio: luz, órbitas, ondas y tipografía. Material propio del que se
parte: el isotipo (planeta con anillo y luna), el hero planetario de la home y el cielo con
estrellas de `SpaceBackdrop`. Houston es Space City; las ideas salen de ahí sin casco de
astronauta.

**Estado de la herramienta (2026-10-03).** El MCP de Refero conecta: `refero_get_style`,
`refero_search_screens` y `refero_get_screen_image` responden. El buscador de estilos
(`refero_search_styles`) devuelve vacío para cualquier consulta, incluida la que funcionó el
2026-10-01; se consultó por pantallas, que es la misma biblioteca, y se avisó al dueño.

**Método:** cinco búsquedas de pantallas (ilustración propia sobre oscuro, objeto abstracto u
orbe, tipografía gigante, espacio y órbitas, partículas y redes de líneas), doce vistas previas
descargadas y miradas en una hoja de contacto, cuatro referencias elegidas por tema.

| Pantalla en Refero | id | Qué se toma | Qué NO se toma |
|---|---|---|---|
| **Curater TasteScope** | `aec3147c-41f5-473b-8c3f-62b204a880f1` | Un haz vertical como única composición, un objeto diminuto bajo la luz, texto en columna | Su azul frío y su esfera de alambre |
| **Cosmos** | `35ec8dcc-75ef-456e-9b56-e84dd5bca15a` | Todo orbita alrededor del nombre; centro nítido, periferia apagada | Sus fotos borrosas |
| **Wrike (carga)** | `8de89787-c6b1-4d1c-b9f2-6f454a60896c` | Planeta y órbitas en línea fina | Su azul y su contexto de app |
| **Lovable (publicar)** | `fdb0e691-99ed-41b5-b1dd-81a7625b6dbb` | Ondas de luz cruzando el fondo detrás del titular; palabra marcada en el titular | Su naranja y su densidad |
| **Washington Post Advertising** | `624305fb-6307-48bb-b3ac-9cdf57e4daa1` | La palabra como objeto, recortada por los bordes; texto pequeño conviviendo encima | Su serif de prensa y las fotos incrustadas en las letras |

Miradas y descartadas, con id: Luma Genie `b8fefcc6-3c59-4496-b37b-56e01c52e5fd` (3D),
Suno about `f07f2d1b-a8f5-4eb5-aa0e-7ae18e776b29`, Clay Nexus `c0a68710-aed2-48e2-a01a-278c47bcb676`,
Apollo Odyssey `01779620-d272-4aa3-9759-fc13793a7ccb`, Skyscanner astro `dfc78aee-06b9-4b30-b17d-18f64aae186b`,
fal.ai about `f9950530-a4a1-46ee-9507-a730cefde3de`, Kitchen `a6ec05d7-9cbb-4966-b152-e8f34f463f0d`.

Vueltas anteriores (rechazadas por el dueño, se conservan como historial): 1ª sin Refero
(biblioteca local, tres variantes de la misma composición); 2ª por la web de Refero (estilos
Atoms `4433dfe7`, Studio Oker `e045b276`, Mollie `73ec75d6`, Retool `c45b115b`); 3ª con el MCP
de estilos (Agence K72 `6b6d1ab7`, Empower `14edc470`, David Kirschberg `3ce811a6`), tumbada
por usar capturas de clientes como arte.

## Las cuatro direcciones (cuarta vuelta, arte propio)

Lienzo "Houston, arte propio": cada boceto junto a la pantalla de Refero que lo inspira,
escritorio 1440 y móvil 390. **El H1 es el de posicionamiento en las cuatro**; la frase
creativa va en la bajada.

### 1 · El haz  ← Curater `aec3147c`
Un foco de luz dorada cae desde arriba sobre el planeta del isotipo, pequeño, posado en el
suelo. Texto en columna a la izquierda. Debajo arranca el catálogo con precio.
**Piezas:** A-07 fondo atmosférico · G-09 motivo propio · H-08 gradiente como atmósfera · B-01 lista tabla.
**Gana:** la escena no explica nada y por eso se recuerda; coste de carga casi cero.
**Arriesga:** si la luz se exagera, se vuelve efecto; el haz es una capa, no tres.

### 2 · La órbita  ← Cosmos `35ec8dcc` + Wrike `8de89787`
El titular en el centro y, girando despacio, los siete servicios como satélites con su precio
sobre tres elipses de línea fina; las zonas (Katy, Sugar Land, The Woodlands, Pearland) como
lunas lejanas. Posiciones calculadas sobre las elipses, no a ojo. Misma mecánica que la home.
**Piezas:** G-09 ilustración propia · F-06 bucle ambiental · D-01 ancla desde $X · A-07.
**Gana:** los precios viven dentro del arte; continuidad con el planeta de la home.
**Arriesga:** en móvil caben cinco satélites, no siete; el giro se apaga con reduced-motion.

### 3 · La señal  ← Lovable `fdb0e691`
Ondas de luz dorada cruzan el fondo detrás del titular, una teal para la IA, rejilla técnica
que se desvanece abajo a la derecha y grano fino. Bajada: "Que te encuentren en Google y en la IA".
**Piezas:** G-01 aurora · G-03 rejilla técnica · G-02 grano · H-03 palabra de otra voz.
**Gana:** la más técnica y la que mejor casa con el discurso de SEO e IA.
**Arriesga:** las ondas "de tecnología" son el cliché más cercano; se salvan por ser cuatro
líneas finas en oro y una en teal, no una nube de neón.

### 4 · El monumento  ← Washington Post Advertising `624305fb`
HOUSTON a tamaño de edificio, cortado por los bordes, con una franja de luz dorada que lo
recorre; encima el mensaje y la acción. Cero imágenes.
**Piezas:** H-04 texto como imagen · H-08 gradiente como atmósfera · A-06 apertura editorial · D-10.
**Gana:** nadie más en la ciudad lo tiene y carga al instante.
**Arriesga:** H-04 avisa que en páginas donde la gente viene a por precio y teléfono puede
leerse como moda; por eso el precio y el teléfono van arriba desde el principio.

## 2 · Jerarquía (común a las tres)

Orden de lectura: (1) qué es y dónde, (2) prueba o producto a la vista, (3) acción,
(4) precio, (5) contexto local, (6) objeciones, (7) cierre.
Mecanismos con valores: `.display` 40→80 para el H1; `.h1` 36→64 para los títulos de capítulo;
`.lead` 17→20 para las bajadas; `--text-base` 16 para el cuerpo; mono `--text-xs` 11 con
`--tracking-widest` para rótulos y datos. Una sola acción dominante por pantalla: oro sólido;
la secundaria es contorno o el teléfono. Separación entre capítulos por escala de espaciado,
nunca por hueco libre.

## 4 · Estilo de componentes

Sin componentes nuevos salvo los que la dirección elegida pida. Los que existan heredan
`Button.astro`, `Kicker`, `--bg-card`, `--border` y los radios del sistema. Un solo tamaño de
icono por nivel (hoy hay cinco). Un solo tratamiento de precio (hoy hay dos en la misma sección).

## 5 · Errores genéricos que este diseño NO va a cometer

- **NO** importar la nav, los botones ni la escala de una referencia → **SÍ** principios de
  composición y atmósfera, con la gramática del sitio intacta (E-15).
- **NO** rejilla de tres tarjetas icono + título + párrafo → **SÍ** las piezas nombradas arriba.
- **NO** tres listas con filete seguidas → **SÍ** un formato por capítulo, alternando superficie.
- **NO** huecos de 400 px haciendo de "aire" → **SÍ** escala de espaciado y cambio de fondo.
- **NO** cifras sin procedencia ni reseñas inventadas → **SÍ** solo datos propios defendibles
  (4 sitios entregados, 3 en Houston, respuesta media, precios públicos) con su origen.
- **NO** dos regalos compitiendo → **SÍ** un solo imán de lead en la página.
- **NO** guiones como conector en el copy, ni "construimos con IA" → **SÍ** comas y "Dominamos".
- **NO** verificar a ojo con medidas del DOM → **SÍ** captura real en Chrome en cada viewport
  (E-17, E-30).

---

## Contratos que el rediseño NO puede romper

Auditados sobre `main` el 2026-10-01.

**Datos estructurados.** `@graph` del Layout (Organization + los dos `ProfessionalService`),
`ItemList` de la página (14 ítems; ojo, la página enlaza 16 hijos: el desfase ya existe y
conviene cerrarlo), `BreadcrumbList` dentro de `Breadcrumb.astro` y `FAQPage` dentro de
`Faq.astro`. **El texto visible del FAQ y su schema son el mismo objeto.**

**Copy congelado.** La respuesta directa (`houston.ts`): pregunta, 60 palabras con los datos
46 % / 76 % y la fuente "Google · BrightLocal, 2025", en texto plano. Las 6 preguntas
frecuentes, todas cerradas por defecto (E-23). Las cifras de la pregunta 5 están atadas a
`PRICE_ANCHORS` y las vigila `npm run check:kb`.

**Silo de enlaces: 19 en `<main>`, 16 hijos distintos.** 7 servicios, 7 industrias, 2 zonas
(Katy y Sugar Land, que hoy viven como pills dentro de la ficha) y 3 "related", uno de los
cuales sale a Miami. Ninguno se pierde ni se duplica.

**Idioma.** `<html lang>`, canónica sin barra final, hreflang es/en/x-default, `og:locale`.
`/en/houston` es un clon estructural de 586 líneas con el mismo CSS duplicado: **el rediseño
se hace en los dos a la vez**, y conviene extraer las secciones a componentes para no volver a
duplicar.

**Seguimiento de clics.** `proposal_requested`, `tool_cta_clicked`, `growth_teaser_clicked`,
`whatsapp_clicked`, `call_clicked`, `email_clicked`. Los nombres son contrato histórico y la
allowlist del servidor vive en `api/events.mjs`. Hoy el CTA del hero y los 16 enlaces del silo
no están instrumentados: se puede añadir, nunca renombrar.

**Anclas.** `#contacto`, `#servicios`, `#proyectos`, `#diagnostico`, `#faq`, `#main`, y los
`aria-labelledby` existentes.

**Política de conversión.** El formulario de brief nunca capta; la conversión es llamar,
WhatsApp o `#contacto`, dominante por dispositivo. Contacto = 1 hora hábil; entregable =
propuesta en 24 horas. No se fusionan.

---

Sub-agentes invocados: auditoría de la landing viva (solo lectura).
Puerta de salida pendiente: checklist de `design/frontend-design.md` + protocolo Ojos
(2 ciclos de render, captura y crítica) antes de enseñar la construcción.
