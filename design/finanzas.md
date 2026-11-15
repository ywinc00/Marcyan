```
Proyecto: Marcyan Web    Página/Vista: Orbit › Finanzas (libros listos para impuestos, fase 1)
Modo: REDISEÑO/IDENTIDAD dentro de la gramática Orbit (design/orbit.md, VALIDADO 2026-10-19)
Plan: _cerebro/marcyan-web/encargos/2026-11-14-plan-panel-finanzas.md (fase 1)
Bocetos: design/finanzas/bocetos.html (tres direcciones, baja fidelidad, cifras de ejemplo)
Estado: PROPUESTO, el dueño elige dirección sobre los bocetos. Fecha: 2026-11-14
```

## Inventario de marca conservada
CONSERVADO: todo lo de `design/orbit.md` (capas, hairlines, acento naranja único, verde de datos,
semánticos, Inter, radios 6/9/14/pill, barra lateral, primitivas compartidas de tarjeta, chip, tabla,
modal, campo, vacío, carga y error). Los gráficos SVG a mano con tooltip siguen siendo el estilo de
gráfico. KpiArt y BrandLogo se rehacen en la fase 3 con su OK (no en esta).
ELEVADO: tablas de cifras con `tabular-nums` y alineadas a la derecha; estados de mes (cerrado, por
cerrar con su número de pendientes, en curso) como chip con texto; aviso fiscal fijo en cada cifra
fiscal («Para revisión de tu contador, no es consejo fiscal»).
PROHIBIDO: colores nuevos, segundo acento, iconos de otra familia, pantallas fuera de Finanzas.

## 1. Dirección visual
Concepto: «el libro abierto: cada cifra dice de dónde sale y si ya está cerrada». Adjetivos operativos:
tabular, verificable (cada total se abre en sus movimientos), con estado (cerrado / pendiente),
monocromo + 1 acento.
Piezas del catálogo: **I-09** ficha de datos citables (el año y la declaración son tablas de verdad,
cifras tabulares, fila de total), **I-06** pestañas segmentadas (Resumen o portada elegida ·
Movimientos · Cierre · Impuestos · Registros; en teléfono, fila desplazable con pista visible),
**E-06** filtros en pastillas con estado en la URL (Movimientos: pendientes, por cuenta, por
categoría), **H-07** presupuesto del acento, **E-08/E-09/E-10** vacío, carga y error.
Referencias miradas en imagen (Refero): ShareWillow plan 448 (c22c345f: el año como 12 filas con total
y panel lateral), Mercury Insights (320c6124: pestañas, tira de meses, totales sin tarjetas), Mercury
Transactions con panel (8fd6e234: la fila abre categoría, recibo y comentario), GitHub Actions run
(6a2ab671, fuera del nicho: pasos con estado que se despliegan), declaración de Wealthsimple
(90268d6a: un documento con índice y revisión de errores, avisos y sugerencias), Monarch (cea8e821:
recurrentes con fecha del próximo cargo). Se toman principios; ni sus colores ni sus componentes.

## 2. Jerarquía
(1) Título + selector de año + una sola acción primaria naranja; (2) lo que necesita atención y el
próximo plazo fiscal; (3) la tabla de trabajo de la pestaña; (4) acciones secundarias. Escala de
Orbit: título 26-28/600, título de tarjeta 15-17/600, cuerpo 14/400, caption 11,5-12/500 en
mayúsculas solo en cabeceras de tabla, cifra destacada 26-30/650.

## 3. Intención por sección (pestañas)
- **Portada** (la que elija el dueño: A libro del año, B cierre, C declaración). Trabajo: «¿cómo va el
  año y qué tengo que hacer?». Teléfono: lo pendiente primero, luego los meses como lista, y la acción
  al alcance del pulgar.
- **Movimientos**: lo importado y lo apuntado a mano; lo pendiente arriba con su sugerencia
  (cobro de factura, traspaso, cargo de suscripción, categoría aprendida) y aceptar en la misma fila.
  La fila abre un panel lateral (diálogo en teléfono) con categoría, uso de negocio, proveedor y recibo.
- **Cierre**: comprobaciones del mes que pasan o fallan, cada una con su arreglo; botón «Cerrar
  <mes>» solo activo cuando nada bloquea; reabrir con confirmación.
- **Impuestos**: Schedule C por línea (cada línea abre sus movimientos), 1099 con estado del W-9,
  trimestral con sus supuestos y calendario de plazos; descarga del CSV para el contador.
- **Registros**: suscripciones (con alta y baja), cuentas, contratistas, devoluciones, ingresos sin
  factura, pagos de impuestos ya hechos y millaje.

## 4. Estilo de componentes
Primitivas de Orbit sin cambios (tarjeta 14, botón 9, chip pill, campo 38/44 y 16 px en táctil,
tabla 46-52 px por fila, `<dialog>` nativo). Nuevos usos, sin tokens nuevos: barra divergente con eje
en 0 para el neto del mes (verde a la derecha, rojo a la izquierda, misma escala); fila de
comprobación (icono de estado de la familia de la barra lateral, texto, recuento, acción); línea de
formulario (número de línea en `--fg-subtle`, concepto, total tabular, desplegable).

## 5. Errores genéricos evitados (NO → SÍ)
- NO cuatro KPIs genéricos «Ingresos / Gastos / Neto / Suscripciones» → SÍ el año como tabla con
  estado de cada mes y totales que se abren.
- NO cifras sin procedencia → SÍ «con los libros cerrados hasta septiembre» y el aviso fiscal.
- NO naranja en chips, índices o pestañas → SÍ naranja solo en la acción primaria y la barra activa
  de la navegación principal.
- NO tabla cortada en el móvil → SÍ lista de meses y de líneas con la cifra a la derecha.
- NO «Nothing here» o «Error 500» → SÍ vacío con la salida (importar un extracto) y error con Reintentar.
- NO jerga («source_ref», «review_status», «tax_line») → SÍ «pendiente de revisar», «línea del
  Schedule C».

Sub-agentes: crítica adversarial de los bocetos (E-64) antes de enseñarlos.
Ledger aplicable: E-11, E-17, E-19, E-28, E-55, E-61, E-62, E-64, E-68.
