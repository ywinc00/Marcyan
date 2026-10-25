# Art Direction — Landing de Houston (`/es/houston` + `/en/houston`)

Proyecto: Marcyan Web  ·  Página/Vista: hub de ciudad de Houston, rediseño completo
Modo: **REDISEÑO / LANDING-CON-IDENTIDAD**
Estado: **DIRECCIÓN ELEGIDA por el dueño (2026-10-24): la 2, "el planeta de Marcyan sobre Houston"**. Versión trabajada pendiente de su OK para construir la landing entera. Prototipo en movimiento: https://claude.ai/artifact/Lo2sarETumZn9rw7Xt1dKj (fuente `design/houston-v5/d2-houston.html`).
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
2. **Las búsquedas en órbita** ← Raycast (sustituida en el repaso, ver abajo). Titular centrado; el planeta del isotipo con su aro y
   búsquedas de clientes de Houston (ES/EN) girando; una se enciende y el aro la lleva a la ficha
   del negocio que Google, Maps y la IA nombran. Piezas G-09, F-06, A-07. **Ojo E-31:** centrar el
   titular es gramática nueva (ninguna portada del sitio centra) + las tarjetas claras = dos
   concesiones; se le planteó al dueño.
3. **El recorrido del cliente** ← ai.work. Titular a la izquierda y acción a la derecha; el aro se
   vuelve un camino que sube con tres paradas: te busca, te encuentra, te escribe y tu asistente
   le aparta cita. Piezas A-05, I-04, A-07.

**Repaso del mismo día con el buscador de estilos ya funcionando.** 9 búsquedas de estilos por
tema (llamadas e IA, planeta y órbitas, recorrido del cliente), 36 vistas previas miradas en tres
hojas de contacto. Cambios:
- **1 · La llamada perdida → Dimension** (estilo `f2951292-dcf2-48db-af42-4bb3b783eb6e`, "la IA que
  nunca duerme"): línea con lugar y hora sobre la escena y resumen de la noche. La portada pasa de
  las 11:41 p. m. (reposo) a las 8:00 a. m. (historia, el cielo amanece) y la tarjeta del dueño es
  "Mientras dormías: 1 cliente nuevo". El teléfono sigue saliendo de Cal.ai `10196b83`.
- **2 · Las búsquedas de Houston → Cosmos** (estilo `227f384c-28b0-4195-a94c-d5e9911cd803`): texto
  a la IZQUIERDA y planeta a la derecha con puntos que laten y etiquetas (zona + búsqueda). **Ya no
  centra el titular: desaparece la concesión de gramática (E-31).** La búsqueda de Pasadena se
  enciende y un hilo dorado baja hasta la ficha del negocio.
- **3 · El recorrido** se queda con ai.work `5e7f709b`: Genway `c770834d` (pasos en la portada),
  Mintlify `27815973`, Duna `2681e09e` y Portal `7f2e567d` no aportan relato.
Miradas y descartadas (estilos): Vapi `11db6cab`, Applied Labs `9b153e60` (pide foto de persona),
Giga `b37d0708`, AIUC `a4aebfee`, Superwhisper `a3afe0c0`, Quo `07447756`, Honk `856297f1`, Textla
`2eb942b8`, Stocketa `a7a9b702`, Operate `a0f473eb`, Voiceflow `7e979bac`, Rally `37afcd4b`, Circle
`614a17bc`, Gt-planar `8ac461ad`, Apollo `e7ffa47a`, Eclipse `e16ba0e1`, Galileo `5f1aae03`,
Geniestudio `5d7ed901`, Balsa `09316ffe`, BlueYard `8f1d3ac2`, Elementor `86351665`, Desktop.fm
`5b70f172`, TheyDo `9b86f70b`, customer.io `80dfc59f`, Adora `21ec5f01`, Portrait `0a8a4374`,
Antimetal `d2eb4c56`, Hey Low `f0c45744`, Browserbase `1c88fb20`.

**La 2 trabajada (v3, 2026-10-24).** El dueño la eligió "por ser la que más nos representa y la
más interesante". Cambios: (1) el planeta es EL MISMO de la portada principal (`Hero.astro`: oro →
oro hondo → núcleo, media luna en sombra, aro a −18°, satélite teal = IA), a escala de paisaje y
saliéndose por la derecha (principio de SpaceX, estilo `7f5db065-f181-4612-90e4-9b5dc1bd4e96`);
(2) cuatro zonas (The Woodlands, Katy en inglés, Sugar Land, Pasadena) con punto que late y etiqueta
zona + búsqueda (Cosmos `227f384c`); (3) historia en un gesto: entran las etiquetas escalonadas,
a los 2,3 s se enciende Pasadena, baja el hilo dorado, sube la ficha "Taller Ejemplo" y el satélite
de la IA da un pulso nítido (sin halo, E-03) junto a "Tu asistente le contesta en español, 24/7";
después solo laten los puntos. Con movimiento reducido se ve directamente el final. Piezas G-09,
F-06, F-03. Dos ciclos de captura y crítica: satélite tapado por una etiqueta, etiqueta pegada a la
ficha, hilos que aparecían antes que su etiqueta y frase partida en móvil, corregidos.
**Al construir:** convertir el planeta en componente reutilizable con `Hero.astro` (mismo trazo y
gradientes por token), etiquetas y puntos como datos en `houston.ts`/`houston.en.ts`, y verificar
movimiento en el Chrome real (E-09).

**v4 · el planeta que se acerca (encargo del dueño, 2026-10-24).** Mezcla de ideas: (1) al cargar,
el planeta con el tamaño y encuadre del boceto 2 del lienzo (centro 1080,470, radio 300, aro corto a
−13°); (2) planeta NEGRO como el globo de Cosmos, con los continentes en trama de puntos DORADOS;
(3) al primer gesto del visitante (ratón, rueda, toque, tecla; si no hay gesto, a los 3 s) se acerca
en 2,6 s al encuadre del prototipo v3 (centro 1250,520, radio 400, aro −18°). **El globo solo crece
hasta ese tamaño; lo que se acerca de verdad es el MAPA** (regla del dueño: si los puntos van sobre un
mapa lejano de EE. UU. quedan amontonados): pasa por Norteamérica, el contorno de Texas y la costa del
Golfo, y termina a ~3,6 px por km sobre Houston, con la bahía de Galveston y la costa en línea fina,
para que The Woodlands, Katy, Sugar Land y Pasadena queden separados 150 a 250 px. (4) Las búsquedas
SALEN desde el punto de Houston en curva hacia su sitio, se dibujan los hilos y sigue la historia
(Pasadena, ficha, pulso del satélite de la IA). Móvil: globo abajo, acercamiento a la bahía, puntos sin
etiquetas y la ficha abajo.
Técnica: lienzo 2D con proyección ortográfica de d3, escala del mapa interpolada en logaritmo y el
centro de la proyección desplazado solo cuando el mapa ya supera el disco (nunca se ve el borde del
hemisferio). Datos abiertos Natural Earth (world-atlas 110m global + 10m recortado a Texas, us-atlas
para Texas) decodificados con `planeta/geo-prep.mjs` sin ejecutar código descargado: 104 KB. Trama de
puntos en pantalla rellenando la tierra con un patrón (una pasada): **2 ms por fotograma** medido sin
aceleración gráfica (la primera versión con capas superpuestas daba 53 ms: tirones). Fuente:
`design/houston-v5/planeta/`. Prototipo: https://claude.ai/artifact/J51LYU7au8VD9w87mEjZMQ
**Al construir:** d3 completo pesa ~280 KB; en producción basta `d3-geo` (~30 KB) cargado tras la
primera pintura, y la imagen inicial puede ir pre-renderizada para no tocar el LCP.

**v4.1 · afinado del dueño (2026-10-24).** (1) Continente más preciso: mapa de 50 m simplificado
(Douglas–Peucker 0,05°) en vez del de 110 m, trama más fina (cada 4,5 px, punto de 1,05 px) y contorno
de costa en línea fina; en el teléfono se usa el de 110 m por rendimiento. (2) Pequeño giro sobre su eje
al acercarse: el globo gira 1,6° hacia el oeste en la segunda mitad del acercamiento y el encuadre final
deja Texas algo más centrado (Houston pasa a 1112,462 y la escala a 3,3 px/km). (3) Al acercarse, la
trama de puntos se funde en color sólido (entre ×8 y ×28 de acercamiento), en un bronce de la familia
oro más oscuro que el botón (#9e7d47 → #3a2c17) para no apagar el titular ni las etiquetas (E-14).
Etiquetas de Katy y Pasadena separadas para que cada hilo se lea con su punto. Fluidez: 9 ms por
fotograma medido sin aceleración gráfica (con aceleración, bastante menos), trazados reutilizados por
fotograma. Datos: 359 KB en el prototipo; en producción se recortan.

**v4.2 · papel de la página, titular y zonas (2026-10-24).** El dueño fija la estructura: portada global
(marca) → principal de ciudad (la agencia en Houston / Miami) → landings. Esta página es **la agencia en
Houston**; "diseño web Houston" pasa a `/es/houston/diseno-web`. El cambio SEO (title, meta, anchors, EN)
NO lo hace el chat de diseño: queda encargado al chat de SEO en
`_cerebro/marcyan-web/encargos/2026-10-24-seo-houston-hub-agencia.md`.
- **Titular propuesto:** "La agencia que pone tu negocio en el mapa de Houston" (escala `.h1` del sitio,
  36 → 64, la que ya admite `LandingHero`), en tres líneas. Dice "agencia", promete un resultado concreto
  (que te encuentren, en Maps) y se apoya en lo que se ve: el planeta que se acerca al mapa de Houston.
  Bajada: "Web, SEO e IA con un solo equipo. Te encuentran en Google, en Maps y en la IA, y tu negocio les
  contesta en su idioma." (24 palabras).
- **Zonas por negocio** (sin cifras visibles): The Woodlands (poder de compra; "kitchen remodeling
  contractor", EN → contratistas), Katy (suburbio de mayor crecimiento; "realtor que hable español" →
  bienes raíces), Gulfton (corazón de la inmigración centroamericana; "abogado de inmigración en español"
  → abogados de inmigración), Pasadena (70,5 % hispano, censo 2020; "taller mecánico que hable español" →
  talleres; la que se enciende). Cada búsqueda es de un sector con página propia. Las zonas del centro
  (Spring Branch, East End) quedan fuera porque a esta escala se amontonan con Gulfton.

**v4.3 · contraste, "Tu negocio" y fusión suave (2026-10-24, correcciones del dueño).**
- Contraste (ledger E-35): el punto encendido y el hilo eran dorados sobre el mapa dorado. Ahora el encendido es
  marfil (#fbf6ec) con anillo oscuro y halo; todos los hilos llevan doble trazo (núcleo marfil + contorno oscuro)
  para leerse sobre el dorado y sobre el agua negra; puntos normales con anillo marfil y contorno; el aro delantero
  lleva contorno oscuro donde cruza el mapa.
- Tarjeta: "Tu negocio" en vez de "Taller Ejemplo" (sin la etiqueta EJEMPLO: ya no nombra un negocio real) y un
  logotipo sencillo (sol sobre el horizonte en un cuadrado verde oscuro) en lugar de la inicial sobre círculo, que se
  leía como contacto sin foto. Un primer intento (círculo sobre arco) parecía silueta de persona y se descartó antes
  de enseñarlo.
- Fusión de puntos a sólido: los puntos crecen (radio 1,05 → 3,15 px) y su color baja del dorado al bronce del sólido
  mientras el sólido entra por debajo; repartido en ~1 s del acercamiento (antes ocurría en menos de medio segundo).
- Movimiento: los puntos aparecen escalonados con un pequeño rebote, las etiquetas frenan suave (salida cúbica), los
  hilos nacen del punto hacia la etiqueta y el hilo a la ficha baja con frenada; la ficha entra con leve escala.
  Fluidez: 8,6 ms por fotograma sin aceleración gráfica.

**Página completa, primera versión (2026-10-24).** El dueño da por buena la portada (puntos y etiquetas
sincronizados: salen a la vez) y pide la página completa "buscando resultados top". Prototipo:
https://claude.ai/artifact/Ny1GsjAY6qHGBKcNw5xyKq (fuente `design/houston-v5/pagina/`, se monta con
`build_page.py` sobre `planeta/portada-houston-zoom.html`). Orden y trabajo de cada bloque:
1. **Portada** (planeta). Sin riel de datos: el precio y el teléfono salen una vez más abajo.
2. **Servicios** `#servicios`: la historia de la portada servicio a servicio, en tres pasos reales
   (01 Te encuentran: SEO local $600/mes, SEO para IA diagnóstico gratis · 02 Te eligen: diseño web $1,500,
   bilingüe $1,500, tienda $2,900, branding $750 · 03 Te contestan: IA conversacional $900), cada paso con
   una viñeta hecha con las piezas de la portada. **El precio aparece una sola vez en la página.** Los 7
   enlaces del silo, intactos. Piezas I-04 (pasos en orden real), B-01 (filas con precio), G-09.
3. **Proyectos** (sección actual, no cambia).
4. **Houston** (nuevo, fusiona la ficha y la cobertura): los dos párrafos del mercado intactos, datos de
   contacto (sin coordenadas, E-13) y el mapa del área en plano con las zonas; Katy y Sugar Land enlazan a
   sus páginas. **La cobertura sale una sola vez.** Piezas G-09, A-07.
5. **Sectores** (nuevo): los 7 sectores con la búsqueda típica de su cliente, que continúa las búsquedas de
   la portada. Pieza B-07 (índice editorial).
6. **Diagnóstico** (actual): **único imán de captación**; desaparece la franja de calculadoras.
7. Respuesta directa y preguntas frecuentes (actuales, congeladas). 8. Sigue explorando (actual).
9. Cierre y contacto (actuales); desaparece la franja de "compromisos", que repetía promesas.
Dos ciclos de captura y crítica (escritorio y móvil con táctil): planeta que volvía al encuadre inicial al
cambiar el tamaño de ventana, viñeta del chat cortada en móvil, imagen de proyectos sin cargar y hueco en la
tercera columna, corregidos.

**Página completa, vuelta 6: "entramos en la atmósfera" (2026-10-24).** Pedido del dueño: al bajar, el
recorrido se siente como entrar en la atmósfera, con fondos de flujo fluidos y coherentes; animar la parte
gráfica de las tarjetas de servicios; la portada NO se anima hasta que el visitante baja (los primeros
segundos de bajar son la animación, luego baja normal); el pulso de los puntos, una sola vez; portafolio
rehecho para esta página; inspiración de Refero y de la galería. Prototipo:
https://claude.ai/artifact/A1rsWKMteZNjNfz1X5dcJx (fuente `design/houston-v6/pagina/`, se monta con
`build4.py`).
- **Fondo único fijo** (WebGL2 a 0,6 de resolución, 30 fps, pausa en pestaña oculta, CSS de reserva sin
  WebGL2) con fases leídas de la posición de cada sección (`data-atmo`): espacio con estrellas que suben al
  bajar → el borde del planeta sube detrás de servicios → atmósfera con corrientes lentas (dominio deformado,
  calmada mientras dura el panel de proyectos: F-05 y F-06 no compiten) → terreno con curvas de nivel por
  manchas (Houston y sectores; casi apagado en respuesta y preguntas, zonas de lectura) → amanecer en el
  cierre: el horizonte sube y asoma el sol, eco del logo de "Tu negocio". Junto al formulario, quieto.
- **Portada fija** mientras el desplazamiento dirige el acercamiento (suavizado con límite de velocidad:
  nunca dura menos de ~1,2 s aunque se baje de golpe). Recorrido fijo de 150 vh: el acercamiento ocupa el 65 %
  y el resto deja ver la historia quieta. Al volver arriba se aleja y oculta las etiquetas; al bajar otra vez
  aparece el final sin repetir. Pista de desplazamiento mínima que se va al empezar (solo escritorio).
- **Viñetas de servicios** (una vez al llegar, otra al pasar el ratón): la búsqueda se escribe y aparece "Tu
  negocio" con Google, Maps y la IA; la web se construye y cambia ES → EN → ES; la conversación de las 11:42 p. m.
  ocurre delante con "escribiendo" hasta "Cita apartada".
- **Portafolio** `#proyectos`: panel fijo con navegador y teléfono (G-07) y las capturas reales de los 4
  clientes, que cambian con una cortina que sube (o baja si se vuelve); a la derecha, por paso: qué hicimos,
  resultado, etiquetas y enlace al servicio (texto real de `portfolio.ts`). En móvil, tarjetas apiladas.
- **Reconstruidas en HTML** con su texto congelado: diagnóstico (anillo y barras de la demo EJEMPLO que suben,
  F-12), respuesta directa (46 % y 76 % con su fuente), preguntas (6, todas cerradas), sigue explorando,
  cierre y contacto. El pie sigue como captura.
- Piezas: F-05, G-07, F-04, F-06, F-12, G-01, G-02, F-02. Referencias miradas en imagen: monopo saigon
  `76c30104` (borde de planeta + flujo líquido), Active Theory `9d795615` (polvo de estrellas a la deriva),
  Mike Matas `749d923d` (maquetas mínimas presentando trabajo real), Websmith `d9ea7f1e` (proyecto grande con
  rótulo). Galería: curvas de nivel tipo Haikei (principio, no recurso), cifra que sube tipo Magic UI.
- **Ojos:** 2 ciclos. Ciclo 1 (Chrome sin ventana): vetas del portafolio tipo mármol, curvas de nivel como
  papel pintado detrás de la lectura y chat cortado; corregidos. Ciclo 2 en el **Chrome real con GPU** (Intel
  UHD): portada quieta a los 2,5 s sin bajar, a 400 px va al 36 %, pulso terminado tras la historia (8/8
  "finished"), al subir se oculta y al volver no repite; 65 fps bajando. Móvil 390 con táctil y movimiento
  reducido revisados (nada queda invisible). Pendiente: OK del dueño sobre el render.

**Vuelta 6, arreglo (comentario del dueño).** "Una línea rara" en la portada: en pantallas más anchas que 1440 el planeta se cortaba
en seco por la derecha y, al bajar, en una línea horizontal. El lienzo del planeta ahora cubre la ventana entera y el borde inferior
de la portada se funde. Lección E-36 al ledger. Punto de regreso: etiqueta `houston-v6-atmosfera` y el prototipo
https://claude.ai/artifact/A1rsWKMteZNjNfz1X5dcJx (versión 2).

**Vuelta 7: "el viaje" (2026-10-24).** El dueño describe la página como un plano continuo: planeta que se acerca a Houston → entrar en la
atmósfera viendo el borde a contraluz con el sol por el centro (servicios) → dentro, cielo de noche estrellado con algunas nubes
(proyectos) → la silueta de Houston desde arriba, que se acerca hasta el mapa con las zonas → el resto con fondos parecidos → el pie
cierra con el skyline lejano, protagonista el cielo con nubes. Prototipo aparte (la vuelta 6 queda intacta):
https://claude.ai/artifact/V3db8f3ctFNusP7j6QFR45 (fuente `design/houston-v7/pagina/`, `build5.py`).
- **Servicios:** cabecera centrada sola sobre el horizonte del planeta; debajo, el sol asoma por el borde a contraluz (núcleo, halo de
  la capa de aire más ancho cerca del sol y una raya horizontal suave); las tarjetas suben sobre la cara de noche del planeta.
- **Estrellas nítidas por debajo del lienzo:** el lienzo es transparente donde hay cielo abierto, así las nubes y el planeta las tapan.
- **Proyectos:** noche con nubes cálidas iluminadas por una luna fuera de cuadro; calmadas mientras dura el panel fijo.
- **Houston desde arriba:** el fondo dibuja la ciudad de noche con sus tres anillos (610, Beltway 8, Grand Parkway) y las radiales,
  sin la bahía; se acerca al bajar y se apaga al llegar al mapa. El mapa empieza igual (la ciudad iluminada desde lejos) y al entrar
  vuela 2,6 s hasta el bronce con las zonas, que hacen su pulso una vez. Estilizado, sin detalle de calles.
- **Pie propio de esta página** (el contenido del pie del sitio intacto): cielo de noche con nubes encendidas por la ciudad y la silueta
  lejana del centro de Houston y Uptown (JPMorgan Chase, Wells Fargo, Bank of America Center, Pennzoil, Heritage Plaza, Williams
  Tower), sutil, con algunas ventanas encendidas. Ojo: el pie global "El Arribo" no se toca; esto es solo para esta página, como pidió.
- Ojos: Chrome real (1440, 1920 y salida de la portada) y móvil 390 con táctil. Corregido en los ciclos: ciudad que parecía polvo dorado,
  nubes invisibles, ventanas fuera de las torres, borde del brillo del pie y ciudad demasiado intensa detrás del texto.

**Vuelta 8 (2026-10-25), tras la corrección dura del dueño.** Sobre la vuelta 7: la ciudad iluminada desde arriba se superponía
con los textos (bajo contraste, ruido, "sin sentido"); el pie dejaba un vacío enorme y la ciudad "es basura", lejos del nivel del
hero; las nubes "parecen manchas"; y todo ello por atajos y por no verificar. El mapa de zonas se mantiene: sus zonas enlazan a las
landings. Lecciones E-37, E-38 y E-39 al ledger. Prototipo aparte (v6 y v7 intactas): https://claude.ai/artifact/7gCcFczpgQciqsPqk3d6iz
(fuente `design/houston-v8/pagina/`, `build6.py`).
- **Referencias de Refero miradas en imagen:** Railway `77a2ae35-b27a-4ba4-816e-a84c1fd7d449` (nubes de ilustración con silueta,
  enmarcando desde los bordes, nunca tras el texto), Cora `15c36325-0ee9-4aeb-946e-1951a570e6be` (nubes con volumen y luz real),
  Drepute `aa138c1f-2b42-4b10-9a3d-bdb09c216c99` (cielo nocturno real con la silueta abajo, sobria), Joby Aviation
  `e38f56d1-e3b6-4b4e-9f4b-072cedf44bf4` (la ciudad con luz cálida de fondo), Titan `56105743-b6f0-49df-8788-1578972a2e1d`
  (ciudad de ilustración precisa). Silueta real de Houston mirada en fotografía antes de dibujarla.
- **Fuera:** la ciudad iluminada del fondo y las nubes de ruido del fondo.
- **Nubes nuevas:** máscara de densidad con bocanadas difuminadas en forma de cúmulo, cuerpo coloreado por altura con bolsas de
  sombra y filo de luz de luna arriba a la derecha. Viven en los márgenes del portafolio (solo escritorio) y en un banco de nubes
  entre proyectos y Houston, en un hueco sin texto; tres capas a distinta velocidad al bajar.
- **Mapa:** el mismo gesto aprobado del hero a escala de la ciudad: empieza lejos con la costa del Golfo en puntos dorados, se
  acerca y los puntos se funden en bronce; las zonas hacen su pulso una vez. Debajo, la lista de zonas (Katy y Sugar Land enlazan a
  sus páginas) y lista y mapa se señalan entre sí al pasar el ratón. En el teléfono solo se rotulan Houston y las zonas con página.
- **Pie:** compacto, la ciudad pegada a la barra legal: Uptown con Williams Tower a lo lejos, torres de fondo más claras, el centro
  oscuro con coronas reales (JPMorgan Chase, Wells Fargo, Bank of America Center, Heritage Plaza, Pennzoil), ventanas encendidas
  dispersas, línea de árboles delante y la luz cálida de la ciudad en el cielo; dos nubes finas a los lados. Borde superior fundido.
- **Ojos:** piezas probadas aisladas antes de integrarlas (tres rondas de nubes: globos, escamas, nubes suaves con luz; dos de la
  silueta: torres anchas y más claras que el cielo, corregidas). Integrado y revisado en Chrome real a 1280, 1440 y 1920 y en móvil
  390 con táctil. Corregido además: un choque de nombres que rompía los contactos del pie, el corte recto del banco de nubes, el
  borde de la ciudad del pie y un mapa que de lejos mostraba el recorte cuadrado de los datos.

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


**Vuelta 9 (2026-10-25).** Correcciones del dueño sobre la 8, en página aparte (v8 intacta):
https://claude.ai/artifact/8Tm146y57jNrDtBePzLFSQ (fuente `design/houston-v9/pagina/`, `build7.py`).
- Arco de la atmósfera sin dientes de sierra (también aplicado a v7 y v8): línea con grosor mínimo suavizable y luz sumada por encima.
- Tarjetas de servicios sin precios (siguen en preguntas frecuentes y en "Ver todos los precios").
- Proyectos: el paso que se está leyendo se ve entero; solo se apaga en el último tramo antes del siguiente. Las capturas cambian con
  fundido acelerado por la tarjeta gráfica (antes, cortina con clip-path).
- Fluidez: la capa fija de grano con mezcla daba tirones (65 fotogramas lentos en un recorrido completo; ahora 3, medido en Chrome real
  con Intel UHD). El fondo va a todos los fotogramas; el grano vive dentro del fondo.
- Mapa de zonas: Loop 610, Beltway 8, Grand Parkway, radiales (I-10, I-45, US-59, US-290, SH-288, SH-225), canal de barcos y Lake Houston,
  comprobados contra OpenStreetMap; visibles desde el primer fotograma. El mapa del hero no se toca.
- Fondos después del mapa (sectores, diagnóstico, respuesta, preguntas, cierre, contacto): la noche del viaje con nubes en los márgenes
  (fuera de la columna de texto) y el resplandor de la ciudad bajo el horizonte; fuera las curvas de nivel y el amanecer. Cierre compacto.
- Pie: silueta calcada de una foto con licencia libre (Wikimedia Commons, "DowntownHouston.jpg", CC BY-SA 2.0, vista desde Buffalo
  Bayou), comprobada con la foto superpuesta; valor propio por torre, filo de luz solo en las coronas, resplandor detrás, ventanas por
  plantas y balizas rojas en las más altas. Lecciones E-41 a E-43 al ledger.