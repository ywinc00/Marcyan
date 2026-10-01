# Art Direction — Landing de Houston (`/es/houston` + `/en/houston`)

Proyecto: Marcyan Web  ·  Página/Vista: hub de ciudad de Houston, rediseño completo
Modo: **REDISEÑO / LANDING-CON-IDENTIDAD**
Estado: **PROPUESTO** — tres direcciones a elegir. Fecha: 2026-10-01.
Lienzo de decisión (artifact): "Houston, tres bocetos" (segunda vuelta). La primera
tanda, "Tres caminos para Houston", fue rechazada entera por el dueño.

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

Regla dura de `refero-design`: una referencia que no se ha mirado no cuenta (E-28).

**Nota de herramienta (2026-10-01).** El MCP de Refero no conecta en esta sesión: el servidor
responde con una codificación HTTP inválida y el cliente la rechaza (`InvalidHTTPResponse`
sobre `api.refero.design`). Comprobado a mano: `refero.design` responde 200 y el endpoint del
MCP con la clave del dueño también devuelve 200, pero sin ella contesta con un cuerpo troceado
mal formado, que es lo que rompe la conexión. No es la clave ni la suscripción. La biblioteca
se consultó entonces **por la web de Refero**, que es la misma fuente: se buscaron estilos con
tres consultas (tema, estética y mecanismo), se descargaron las vistas previas, se montaron en
una hoja de contacto y se miraron una a una.

Consultas usadas en `styles.refero.design`: `local service`, `dark gold`, `pricing services`.

| Estilo en Refero | id | Qué se toma | Qué NO se toma |
|---|---|---|---|
| **Atoms** | `4433dfe7-315a-4459-bfd7-f59ccdc09bad` | Un objeto construido en el centro sobre negro, el texto respirando alrededor, el oro como única luz | Su silencio de marca de producto: aquí cada nodo lleva nombre y precio |
| **Studio Oker** | `e045b276-ae8d-442e-98de-fa8650e284de` | La rejilla desigual donde cada celda enseña algo distinto: foto, cifra, muestra, dato | Su rojo y su blanco de galería |
| **Mollie** | `73ec75d6-edec-4ed2-bc09-debb261b6ee0` | Píldoras de estado flotando sobre material real | Su fondo claro y su foto de banco |
| **Retool** | `c45b115b-dcb5-446d-8952-85aef740f8e4` | Que la materia entre justo debajo del titular, cortada por el borde inferior | Sus capturas de producto propio |

También miradas y descartadas para este encargo, con su id por si sirven más adelante:
Worth Agency `906ef782-4be7-45ee-9800-0514d46e7518` (tipografía gigante sobre rosa, choca con
la paleta), Caserne `c2702938-b670-414c-ba47-94618212085e` (foto de rótulo real, no tenemos ese
material), Warp `79714b4e-c89a-44b3-8da4-931daa9a466f` y Runway `874aaea0-c718-454e-8a58-f3beed1284ec`
(misma composición que Retool, sin aportar nada nuevo), Lama Lama `8e26bf8a-44b8-4fe1-9b4b-188dd5827c0f`.

**Qué falló en la primera tanda.** Salió de mirar cuatro sitios muy conocidos de la biblioteca
local y las tres direcciones acabaron siendo variantes de la misma composición: texto a la
izquierda y algo a la derecha. El dueño las rechazó en bloque. La diferencia ahora no es la
herramienta, es que cada dirección parte de una composición distinta y queda atada a la
referencia que la justifica.

## Las tres direcciones (segunda vuelta, con referencia al lado)

Se presentan en el lienzo "Houston, tres bocetos", cada una junto a la vista previa de Refero
que la inspira. El dueño elige una, o una mezcla.

### 1 · La constelación  ← Atoms `4433dfe7`
Un solo objeto en el centro, construido por nosotros: los siete servicios como nodos unidos al
núcleo de Houston, cada uno con su nombre y su precio. El texto respira alrededor. Al bajar, la
constelación se despliega en el catálogo con precio que ya existe.
**Piezas:** A-07 fondo atmosférico · G-09 motivo propio · B-01 lista tabla · D-01 ancla desde $X.
**Gana:** un gesto propio que nadie puede copiar, con los precios dentro del gesto.
**Arriesga:** si los nodos no se tocan, es decoración; cada uno tiene que llevar a su página.

### 2 · El mosaico  ← Studio Oker `e045b276`
La primera pantalla es el negocio entero en celdas desiguales: titular, una web nuestra de
verdad, el precio más bajo, el teléfono con su horario, las zonas y el dato del diagnóstico.
**Piezas:** B-03 bento con celda dominante · C-01 caso con resultado · D-01 · G-10 capas.
**Gana:** se entiende todo sin bajar, y mata el vacío de la página actual de una vez.
**Arriesga:** si dos celdas enseñan lo mismo, es ruido. Cada una tiene un trabajo distinto.

### 3 · Funcionando  ← Mollie `73ec75d6` + Retool `c45b115b`
No se enseña el servicio, se enseña lo que pasa cuando está puesto: una web nuestra ocupando el
ancho y, encima, píldoras con lo que hizo esta semana (contestó a las 21:40, agendó una cita,
subió al tercer puesto del mapa).
**Piezas:** A-05 producto vivo · G-04 foto con velo · G-07 maqueta mínima · C-06 cifras con procedencia.
**Gana:** es el argumento más difícil de discutir, porque es resultado y no promesa.
**Arriesga:** cada píldora tiene que ser verdad comprobable; si no, es humo (E-10).

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
