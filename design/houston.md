# Art Direction — Landing de Houston (`/es/houston` + `/en/houston`)

Proyecto: Marcyan Web  ·  Página/Vista: hub de ciudad de Houston, rediseño completo
Modo: **REDISEÑO / LANDING-CON-IDENTIDAD**
Estado: **PROPUESTO**, quinta vuelta: tres portadas a elegir. Fecha: 2026-10-24.
Lienzo de decisión (artifact): "Portadas de Houston" https://claude.ai/artifact/NJ4MWBRy8AHnEFQjMY8u47
(cada boceto junto a su referencia de Refero; reposo, historia completa y móvil). Bocetos
fuente en `design/houston-v5/`. La cuarta vuelta ("arte propio") queda como historial.

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

## Quinta vuelta (2026-10-24): la portada cuenta el mecanismo

**Por qué otra vuelta.** El dueño señaló que las ideas del chat "Refero Skill Test" eran mejores.
Diagnóstico: allí ganó B·Henry porque NARRABA lo que hace el producto (pregunta, la IA buscando,
la respuesta que nombra tu negocio) sobre la atmósfera de la marca. Las cuatro vueltas de Houston
fallaron por decorar (haces, líneas, palabra gigante) o por usar capturas de clientes (E-32).
Regla de esta vuelta: la primera pantalla cuenta lo que Marcyan hace por un negocio de Houston
(te buscan, te encuentran, te contestan), con datos de ejemplo marcados "EJEMPLO".

**Estado de Refero.** Conecta. `refero_search_styles` devuelve vacío para todo (incluido "Linear");
`refero_get_style` por código y `refero_search_screens` funcionan. Referencias por pantallas y un
estilo abierto por código; todas miradas en imagen (hoja de contacto de 16 candidatas).

| Referencia | id | Qué se toma | Qué NO |
|---|---|---|---|
| **Cal.ai** (pantalla) | `10196b83-1d61-4497-a029-451cb5244789` | El aparato como escenario y la conversación real al lado como prueba | Morado, botones redondos, teléfono ilustrado |
| **Raycast Teams** (pantalla) | `e57f7a10-658c-4f1b-9267-3bf2bebac901` | Titular con elementos orbitando sobre el horizonte de un planeta | Azul, avatares, botón blanco |
| **ai.work, Henry** (estilo, el de la prueba aprobada) | `5e7f709b-2fd6-4243-b419-0816f248e590` | Escena de fondo + tarjetas que cuentan en orden lo que pasa | Foto de montaña, pila centrada, botones |

Miradas y descartadas: Cartesia `ee911f3a` `914f743f` `f95a8c84`, Gladia `9572e997`, Intercom
`5a60b640` (la portada `96abfa39` resultó ser un menú abierto, no sirve), Krisp `1e7ba7fd`,
Netflix `de945c5f`, Washington Post `36e69963`, Runway `1744d58a`, DJI `b7b4a0f9`, ElevenLabs
`267412fe`, Esquire `1ea614d5`, Hume `b37de1ab`, Mercury `a4f2cc10`.

**Las tres portadas** (H1 de posicionamiento intacto en las tres; kicker, CTA "Propuesta gratis",
teléfono como segunda acción y "Respuesta en 1 hora hábil" de siempre; sin precio en la portada):
1. **La llamada perdida** ← Cal.ai. Texto a la izquierda, teléfono mínimo a la derecha: 11:41 p. m.,
   el taller cerró, la IA contesta la llamada perdida por mensaje y aparta cita; al dueño le llega
   "Nuevo cliente". Piezas A-05, G-07, A-07.
2. **Las búsquedas en órbita** ← Raycast. Titular centrado; el planeta del isotipo con su aro y
   búsquedas de clientes de Houston (ES/EN) girando; una se enciende y el aro la lleva a la ficha
   del negocio que Google, Maps y la IA nombran. Piezas G-09, F-06, A-07. **Ojo E-31:** centrar el
   titular es gramática nueva (ninguna portada del sitio centra) + las tarjetas claras = dos
   concesiones; se le planteó al dueño.
3. **El recorrido del cliente** ← ai.work. Titular a la izquierda y acción a la derecha; el aro se
   vuelve un camino que sube con tres paradas: te busca, te encuentra, te escribe y tu asistente
   le aparta cita. Piezas A-05, I-04, A-07.

**Única pieza nueva común:** tarjetas claras de demo (`#e8e2d8`, las de la prueba aprobada). Todo
lo demás es la gramática viva (SiteNav, Button, `.display` 700 40→80, tokens).

**Protocolo Ojos:** 2 ciclos de captura y crítica en Chrome sin ventana con emulación por
protocolo de DevTools (móvil 390 con táctil). Corregido en los ciclos: reloj que chocaba con el
teléfono (D1), tarjeta de cliente que tapaba la cita (D1), tramo encendido del aro que no llegaba
a la ficha (D2), "Respuesta en 1 hora hábil" pisada por la parada 3 y paradas solapadas en móvil
(D3). Son bocetos: falta verificación en el Chrome real cuando se construya.

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

## Las tres direcciones (cuarta vuelta, arte propio, tras crítica interna)

Lienzo "Houston, arte propio": cada boceto junto a la pantalla de Refero que lo inspira,
escritorio 1440 y móvil 390. **El H1 es el de posicionamiento en las tres**; la frase creativa
va en la bajada.

**Crítica interna antes de enseñar (protocolo Ojos, 2026-10-03).** Tres jueces independientes
(dirección de arte, cumplimiento del sistema y del ledger, olfato de plantilla) sobre las
capturas reales. Ranking unánime: el haz primero, el monumento segundo. Se **retira la
órbita** (titular centrado = cambio de gramática global; en estático es el hero de
"integraciones orbitando" de cualquier producto de IA; en móvil no cabe y además giraría
produciendo choques nuevos) y la **señal se reduce a una sola línea** (la versión de ondas +
rejilla + grano apilaba cuatro técnicas, E-08, y era el kit de landing de IA de 2024, E-15).
Arreglos aplicados al haz: un solo cono centrado sobre el planeta, planeta de 300 px con
volumen, bordes disueltos, móvil con el texto desde el 47 % y el oro al 14 % de alfa. Al
monumento: letras base al 12 %, luz blanca en vez de oro (un solo acento), H sangrando por la
izquierda, texto sobre fondo limpio, sin bloque de coordenadas. Fuera de las tres: "Space
City" y las coordenadas en mono (E-13, contraste 2,1:1).

### 1 · El haz  ← Curater `aec3147c`
Un foco de luz dorada cae desde arriba sobre el planeta del isotipo, con la cara iluminada
hacia la luz y un charco de luz en el suelo. Texto en columna a la izquierda. Debajo arranca
el catálogo con precio.
**Piezas:** A-07 fondo atmosférico · G-09 motivo propio · H-08 gradiente como atmósfera · B-01 lista tabla.
**Gana:** la única cuya idea sobrevive entera al teléfono y la que menos se parece a una plantilla.
**Arriesga:** el esqueleto "texto a la izquierda, arte a la derecha" es el más común; lo salva
que el arte sea el isotipo bajo una luz y no un efecto.

### 2 · La señal  ← Lovable `fdb0e691`
Una sola línea de luz dorada nace en un punto a la derecha (origen con el teal de la IA y la
etiqueta "IA que contesta · 24/7") y recorre la pantalla sin cruzar la columna de texto.
**Piezas:** G-09 motivo propio · H-08 gradiente como atmósfera · F-06 bucle ambiental.
**Gana:** la más técnica, casa con "que te encuentren en Google y en la IA".
**Arriesga:** una línea de luz sigue siendo territorio de plantilla si se engorda; se mantiene fina.

### 3 · El monumento  ← Washington Post Advertising `624305fb`
HOUSTON a tamaño de edificio, sangrando por la izquierda y cortado por abajo, con una franja
de luz blanca que lo recorre; encima el mensaje y la acción sobre fondo limpio. Cero imágenes.
**Piezas:** H-04 texto como imagen · H-08 gradiente como atmósfera · A-06 apertura editorial · D-10.
**Gana:** la apuesta más valiente y la que un dueño recuerda a los tres días.
**Arriesga:** H-04 avisa que en páginas de precio y teléfono puede leerse como moda; por eso
el oro se queda solo en el botón y en la palabra Houston del titular, y la franja es blanca.

**Pendiente al construir:** los precios de las filas y las bajadas se toman de `pricing.ts`
(fuente única) con "desde" y sus anclas; los jueces señalaron que los bocetos mezclan tramos.

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
