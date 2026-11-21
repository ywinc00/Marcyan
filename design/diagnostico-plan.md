# Diagnóstico: el resultado recomienda un plan (Ventas §5)

Proyecto: Marcyan Web    Página/Vista: resultado del diagnóstico (`DiagnosticWizard.astro`, es y en) y
resultado de ejemplo estático (`ResultadoEjemplo.astro`)
Modo: REDISEÑO/IDENTIDAD (cambio de contenido dentro de una pieza que ya existe)

Inventario de marca conservada:
- CONSERVADO: la tarjeta dorada `.dgw__rec` (superficie `--accent-gold-dim`, borde `--accent-gold-line`,
  `--radius-md`, padding `--space-4 --space-5`), la etiqueta monoespaciada en mayúsculas y el valor en oro
  600; en el ejemplo, el bloque `.re__ruta` (etiqueta, valor, nota) tal cual. Botones, tokens y el orden
  del resultado (anillo, barras, hallazgos, recomendación, Marcy, aviso, formulario) no se tocan.
- ELEVADO: la tarjeta deja de ser un enlace (ya no hay página a la que llevar: no existe página pública de
  planes) y gana una segunda línea con el porqué.
- PROHIBIDO: precios o cifras del plan; inventar un componente nuevo; un segundo botón que compita con
  «Recibir mi reporte completo».

Piezas del catálogo: **D-06** (la calculadora entrega su resultado al paso siguiente: el valor de un cliente
viaja con el reclamo hasta la propuesta, sin campo visible), **D-10** (una sola acción primaria: el botón dorado
del formulario; la tarjeta del plan no compite, deja de ser enlace y pierde la flecha), **H-05** (la etiqueta
monoespaciada «Plan recomendado» firma el bloque, como ya hacía «Ruta sugerida»).

1. Dirección visual: la del sitio (DESIGN.md v3). Nada nuevo: misma tarjeta, mismo oro, mismo ritmo.
2. Jerarquía: dentro de la tarjeta, (1) el nombre del plan en oro 600, (2) su frase, (3) el porqué en
   `--fg-secondary`, `--text-sm`. En la vista, la acción primaria sigue siendo el formulario de abajo.
3. Intención: responder «¿y ahora qué me conviene?» con un nombre y una razón ligada a lo que acaba de ver
   (lo más flojo de su web). Acción: seguir bajando hasta pedir el reporte. En teléfono, igual que en
   escritorio, apilado: etiqueta, nombre y frase, porqué. Métrica: reclamos tras ver el resultado.
4. Componentes: `.dgw__rec` como `div` (no enlace): sin hover, sin foco, sin flecha. Etiqueta y valor en una
   fila que se parte si no cabe (`flex-wrap`), el porqué a ancho completo debajo. Sin tokens nuevos.
5. Errores evitados:
   - NO tarjeta con flecha que no lleva a ningún sitio → SÍ tarjeta informativa sin flecha (E-22, un solo
     recurso de énfasis: el oro del nombre).
   - NO precio o «desde» junto al plan → SÍ nombre y frase del catálogo, sin cifras.
   - NO dos acciones doradas en la misma vista → SÍ un solo botón dorado, el del formulario (D-10).
   - NO copy genérico («el mejor plan para ti») → SÍ el porqué con el frente medido más flojo.

Textos (es / en), por qué del plan:
- sin web: «No encontramos tu web. Lo primero es que te encuentren.» / «We couldn't find your website, so the
  first step is getting found.»
- que te encuentren: «Lo más flojo hoy es que te encuentren en Google.» / «Your weakest point today is getting
  found on Google.»
- que te llamen: «Lo más flojo hoy es que te llamen o te escriban desde tu web.» / «Your weakest point today
  is turning visits into calls and messages.»
- IA: «Lo más flojo hoy es que la IA pueda leer y citar tu web.» / «Your weakest point today is whether AI can
  read and cite your site.»
- todo bien: «Tu web cumple lo básico. El siguiente paso es convertir más visitas en llamadas.» / «Your site
  covers the basics, so the next step is turning more visits into calls.»

Sub-agentes invocados: ninguno (cambio de contenido en una pieza existente).
Estado: VALIDADO por: el dueño (en el chat Marcyan Tecnologuia, «Sí, así» sobre el boceto)  Fecha: 2026-11-20
