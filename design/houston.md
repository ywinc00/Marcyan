# Art Direction — Landing de Houston (`/es/houston` + `/en/houston`)

Proyecto: Marcyan Web  ·  Página/Vista: hub de ciudad de Houston, rediseño completo
Modo: **REDISEÑO / LANDING-CON-IDENTIDAD**
Estado: **PROPUESTO** — tres direcciones a elegir. Fecha: 2026-10-01.
Lienzo de decisión (artifact): "Tres caminos para Houston".

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

## Referencias miradas (en imagen, no leídas)

Regla dura de `refero-design`: una referencia que no se ha mirado no cuenta. El MCP de Refero
no conectó en esta sesión (error de red del servidor), así que se miraron a mano en Chrome real.

| Referencia | Fuera del nicho | Qué se toma | Qué NO se toma |
|---|---|---|---|
| Linear (portada) | Sí | Que el producto entre en la primera pantalla cortado por el borde inferior; el cambio de superficie que separa capítulos; la declaración a dos tonos de texto | Su paleta, su tipografía, su nav |
| Ramp (portada) | Sí | La franja de contadores en mono con etiqueta y procedencia; la rejilla donde conviven marcas y un caso real con su cifra | Su fondo claro, su acento amarillo |
| Basecamp (precios) | Sí | La lista maestro-detalle con lo que incluye **y lo que no**; la honestidad como argumento visual | Su trazo de rotulador, su azul |
| Land-book, resultados "agency dark" | No | Que las landings de agencia que funcionan tienen el primer viewport lleno de materia | Nada formal: es un muestrario |
| `/es/houston` en producción | No | El catálogo con precio (lo mejor que tiene la página) y el riel de dato bajo el hero | El vacío entre bloques |

---

## Las tres direcciones

Se presentan en el lienzo con maqueta de escritorio y de móvil. El dueño elige una, o una
mezcla. Las piezas van nombradas por su código del `design-catalog`.

### A · Consola Houston
La página se comporta como el panel de control de un negocio de Houston: donde hay hueco, hay
dato. Primera pantalla partida, con el diagnóstico funcionando sobre un caso real a la derecha,
y debajo una franja de cifras defendibles.
**Piezas:** A-01 hero partido · C-06 cifras con procedencia · G-10 profundidad por capas ·
B-01 lista tabla (se conserva del actual) · D-07 objeciones bajo el precio.
**Gana:** mata el vacío y demuestra producto en los primeros 800 px.
**Arriesga:** enfría si se carga de datos; el panel exige un caso real detrás, siempre.

### B · Expediente Houston
No se abre vendiendo, se abre sabiendo. La página es un informe corto sobre cómo se compra en
Houston, con capítulos numerados en un raíl, y cada servicio aparece como respuesta al hallazgo
que acaba de leerse, con su precio al lado.
**Piezas:** A-06 apertura editorial · E-05 índice lateral pegajoso · C-06 cifras ·
B-12 prueba incrustada en el servicio · D-01 ancla "desde $X".
**Gana:** posición de autoridad; el precio llega después del motivo, lo que sostiene cifras altas.
**Arriesga:** pide leer; en móvil se alarga y el que viene a por precio baja más.

### C · La prueba primero
Lo primero que se ve es el trabajo: cuatro sitios reales, tres de ellos de negocios de Houston,
en pantalla. Servicios y precios cuelgan de lo que acaba de verse.
**Piezas:** A-08 mosaico de trabajo real · G-07 maqueta de dispositivo mínima ·
C-01 casos con resultado ancla · C-10 andamio de confianza.
**Gana:** credibilidad inmediata, nada que inventar, y rescata el portafolio.
**Arriesga:** vive de las capturas; con cuatro aguanta, crecer exige fotografiar cada entrega.

---

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
