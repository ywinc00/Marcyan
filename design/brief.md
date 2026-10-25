```
Proyecto: Marcyan Web    Página/Vista: Brief corto público (/formulario y su versión EN) + Kit de arranque privado
Modo: REDISEÑO/IDENTIDAD (sistema del sitio DS v2 Space-Tech; DESIGN.md manda)
Encargo: docs/orbit/PLAN-orbit-v2.md, pista B (B1 y B3)
Estado: VALIDADO por: el dueño, que eligió el "Camino 2: expediente por pasos" entre tres bocetos
        (https://claude.ai/artifact/G8JCW1XxbUPioHP569y35N)   Fecha: 2026-10-19
```

## Inventario de marca conservada
CONSERVADO: tokens de `src/styles/tokens.css` (fondo #080808, tarjeta #141414, elevado #1c1c1c, oro #c8a96e
como acción, teal #4fc3a1 solo como señal de "en vivo/guardado/listo"), Space Grotesk / DM Sans / JetBrains Mono,
radios 4/8/12/20/pill, `Button.astro` y `BtnStates`, `SiteNav`, `SiteFooter`, `SpaceBackdrop`, `Kicker`,
iconos Lucide 1,5 px, política de plazos (contacto "1 hora hábil", propuesta "en 24 horas").
ELEVADO: formulario por pasos con reanudación, subidas con progreso, errores junto al campo, versión EN.
PROHIBIDO: estética Orbit (naranja/Inter) en el sitio público; nuevos estilos de botón; acordeones abiertos al
cargar (E-23); fondo sólido plano sin SpaceBackdrop (E-01).

## 1. Dirección visual
"Expediente por pasos": a la izquierda un raíl con los seis pasos con nombre, el tiempo que lleva ("unos 10
minutos") y "Se guarda solo"; a la derecha el paso actual con sus preguntas agrupadas en una pantalla. Las
subidas viven dentro del paso (zona de arrastre, filas con miniatura, nombre, barra de progreso, quitar). El
último paso enseña todo para revisar y editar antes de enviar.
Piezas: **D-09** formulario por pasos con progreso y reanudación, **D-10** acción principal con línea de
reaseguro, **E-10** error con rescate (campo, red y envío), y la pieza nueva **"subida guiada por tomas"** para
el Kit de arranque (pendiente de entrar al catálogo con el OK del dueño).
Referencias miradas en imagen: Metaview onboarding (Refero 97ccfcc6), Mercury subida de imágenes (bade88f7),
DocuSign lista de inicio (d197ffa5), Unsplash etiquetas por foto (7c5bf646). Se toman principios, no su sistema.

## 2. Jerarquía
(1) título del paso + una frase de para qué sirve, (2) preguntas del paso, (3) acción "Siguiente: <paso>" en
oro, una por pantalla, (4) "Atrás" fantasma. En el raíl: paso actual en oro, hechos con check teal, pendientes en
gris. Móvil (< 900 px): el raíl se convierte en una barra superior "Paso N de 6 · <nombre>" con progreso
segmentado y "10 min"; nada fijo abajo salvo la acción si el teclado no está abierto.

## 3. Intención por paso (brief corto)
1. Tu negocio: quién eres y dónde (nombre exacto, industria, ciudad, qué vendes). 2. Qué necesitas: servicios del
catálogo con su "desde" (fuente única `pricing.ts`), para cuándo lo necesita y los bloques condicionales de cada
servicio. 3. Tu marca: logo y fotos opcionales, colores, si la marca es cerrada, ajustable o nueva. 4. Cómo te
contactamos: nombre, teléfono y WhatsApp, correo, canal e idioma preferidos. 5. Revisar y enviar: todo editable,
aviso de privacidad, envío. Tras enviar: qué pasa ahora y cuándo. (2026-10-21, decisión del dueño: se quitó la
pregunta de inversión y con ella el paso "Plazo y presupuesto"; el plazo pasó a "Qué necesitas".)
Kit de arranque: lista de bloques con estado (hecho, a medias, pendiente, opcional) y progreso total; cada bloque
abre su panel; fotos por tomas guiadas con etiqueta (servicio, barrio, mes, propio o inspiración).

## 4. Estilo de componentes
Tarjeta del paso sobre la atmósfera (`--bg-card`, borde de 1 px, radio 12). Campos `--bg-base`/hundido con borde
`--border`, 16 px de texto en móvil (sin zoom de iOS), 44 px de alto táctil. Opciones como tarjetas
seleccionables con su "desde" en mono. Zona de subida con borde discontinuo; fila de archivo con miniatura 34 px
y barra de 3 px (oro subiendo, teal listo). Etiquetas legibles en sentence-case (no micro-mayúsculas), el
kicker mono solo para "Paso N de 6".

## 5. Errores evitados (NO → SÍ)
- NO página única de 6.500 px → SÍ seis pasos con nombre y tiempo.
- NO micro-etiquetas en mayúsculas grises → SÍ etiquetas legibles y obligatorios marcados.
- NO error en una caja arriba → SÍ mensaje junto al campo, foco al primero y nada se borra.
- NO "¿tienes logo?" sin poder subirlo → SÍ subida en el mismo paso.
- NO rangos de presupuesto que no casan con los precios → SÍ rangos derivados del catálogo.
- NO asistente a pantalla completa con avance automático → SÍ formulario dentro de la página, avance solo con clic.
- NO em-dash, voseo, jerga → SÍ español neutro de EE.UU. y un inglés escrito para Houston, no traducido.

Ledger aplicable: E-01, E-07, E-10, E-11, E-17, E-19, E-23, E-26, E-28, E-30.
