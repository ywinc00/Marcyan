```
Proyecto: Marcyan Web    Página/Vista: Panel interno Orbit (/dashboard), todas las secciones
Modo: REDISEÑO/IDENTIDAD (pulido dentro de la gramática Orbit aprobada por el dueño el 2026-06-15)
Encargo: docs/orbit/PLAN-orbit-v2.md, pista A
Estado: VALIDADO por: el dueño (plan aprobado el 2026-10-19: "pulir dentro de la estética Orbit, no eliminar")
         Fecha: 2026-10-19. Los cambios marcados ⚑ se enseñan con captura antes/después antes de mergear.
```

## Inventario de marca conservada

CONSERVADO (no se toca):
- Acento ÚNICO naranja `#f97316` (token histórico `--accent-gold`), hover `#fb923c`, deep `#ea580c`.
- Verde de datos/positivo `#34d399` (token `--accent-teal`). Semánticos: éxito `#22c55e`, aviso `#f5b338`,
  error `#ef4444`, info `#60a5fa`.
- Capas oscuras: barra lateral `#0b0b0e`, fondo `#0e0e11`, tarjeta `#16161a`, elevado `#1b1b20`,
  `#23232a`; bordes hairline blancos al 4,5 / 7 / 11 %.
- Inter en todo, títulos apretados (-0,025em), sentence-case (mayúsculas solo en captions y cabeceras de tabla).
- Radios 6 / 9 / 14 / pill. Elevación plana; glow solo del acento en la barra activa del gráfico.
- KpiArt (ilustraciones glossy de los KPIs), BrandLogo en la barra lateral de suscripciones, gráficos SVG a
  mano con tooltip y línea guía, embudo de píldoras, tarjetas de briefs, saludo por hora.
- Estructura de escritorio: barra lateral de 264 px + barra superior + contenido.

ELEVADO (se mejora dentro del marco):
- Una sola definición de cada componente (cabecera de página, KPI, tarjeta, chip, modal, campo, tabla,
  vacío, carga, error, confirmación, aviso de acción hecha) con medidas idénticas en todas las secciones.
- Rejilla de KPIs que nunca deja una tarjeta huérfana (auto-fit con mínimo 220 px; 5 KPIs = 5 columnas en
  ≥1280 px, 3+2 equilibrado por debajo, nunca 4+1).
- Estados obligatorios en todo lo interactivo: hover, focus-visible (anillo 2 px acento, offset 2 px),
  active, disabled, cargando. Carga honesta (umbral 300 ms, esqueleto con la geometría real), vacío con
  salida, error con Reintentar.
- Contraste AA: `--fg-subtle` sube hasta ≥ 4,5:1 sobre `--bg-card` (hoy `#6b6b74` = 3,4:1) y queda solo
  para texto de apoyo; placeholder y deshabilitado usan un tercer nivel explícito. ⚑ Texto del botón primario:
  hoy blanco sobre naranja = 2,8:1; se propone texto `#0e0e11` sobre el mismo naranja (≈ 7:1).
- Carcasa móvil (< 900 px): barra superior compacta (marca, título de sección, menú) y menú en `<dialog>`
  nativo con las 7 secciones + suscripciones; nada se apila encima del contenido. Objetivos táctiles 44 px,
  zonas seguras del iPhone. Tablas → tarjetas por debajo de 720 px.
- Iconografía de UNA familia (la de la barra lateral: trazo 1,6 px, 24 px de caja), sin emojis como iconos.
- Copy: español neutro de EE.UU., sin voseo, sin em-dash, sin jerga técnica en mensajes al usuario.

PROHIBIDO en este encargo:
- Cambiar el acento, la tipografía, las capas de fondo, el estilo de los gráficos o KpiArt.
- Importar la gramática del sitio público (oro/teal, Space Grotesk) al panel, o la de Orbit al sitio.
- Añadir controles nuevos donde un elemento existente puede alojar la función (E-19).

## 1. Dirección visual
Concepto: "cabina de operaciones: todo a la vista, nada que adivinar". Adjetivos operativos: denso,
hairline, monocromo + 1 acento, honesto (cada número dice de dónde sale).
Piezas del catálogo: **H-06** rampa de superficies de cinco niveles (una tarjeta es un nivel, borde de 1 px,
nunca losas de negro crudo, E-01), **H-07** presupuesto del acento (naranja solo en: acción principal de cada
vista, foco, ítem activo de la navegación, barra activa del gráfico y un dato destacado; hoy se usa también
en botones secundarios, bordes de KPIs y chips de origen), **E-06** filtros en pastillas con el estado en la
URL (Leads, Briefs, Facturas, Progreso), **E-08/E-09/E-10** vacío que propone salida, carga honesta y error
con rescate, **E-03** menú móvil en `<dialog>` con la ceremonia al mínimo (sin escalonado vistoso).

## 2. Jerarquía
Por vista: (1) título de sección + acción principal (única en naranja), (2) KPIs, (3) contenido de trabajo
(lista o tabla con filtros), (4) acciones secundarias. Escala: título 28 px/600, título de tarjeta 15 px/600,
cuerpo 14 px/400, caption 12 px/500 (mayúsculas con tracking solo en captions y cabeceras de tabla), cifra de
KPI 30 px/650. Espaciado base 4: 8/12/16/24/32; separación entre bloques 24 px; padding de tarjeta 20 px.

## 3. Intención por sección
- Inicio: "¿qué necesita mi atención hoy?" (cifras veraces y enlaces directos a lo pendiente).
- Leads: atender y convertir (filtrar, abrir la ficha, cambiar estado, convertir).
- Clientes (nueva): ver todo de un cliente en un sitio (proyectos, facturas, briefs).
- Briefs: revisar, completar y arrancar (descargar el kit).
- Finanzas: saber qué entra, qué se debe y qué sale, y registrarlo sin errores.
- Progreso: avanzar proyectos por hitos.
- SEO: ver si Google funciona y qué traen las páginas.
- Avisos: no perder nada (cada aviso lleva a su registro).

## 4. Estilo de componentes (tokens)
- Tarjeta: `--bg-card`, borde `1px solid var(--border)`, radio 14, padding 20; hover solo en tarjetas
  clicables (`--border-strong`).
- Botón primario: fondo `--accent-gold`, texto ⚑ `#0e0e11`, 600, padding 8×14, alto mín. 36 (44 táctil),
  radio 9; hover `--accent-gold-hover`; active `--accent-gold-deep`; disabled 45 % de opacidad sin cursor.
  Secundario: fondo `--bg-elevated`, borde `--border`, texto `--fg-primary`. Peligro: texto `--color-error`
  con borde al 32 %. Un solo primario por vista.
- Chip de estado: pill, 12 px/500, fondo del color al 14 %, texto del color, siempre con texto (nunca solo color).
- Campo: `--bg-elevated`, borde `--border`, radio 9, alto 38 (44 táctil), foco = borde acento + anillo.
- Modal: `<dialog>` nativo, `--bg-card`, radio 14, `--shadow-modal`, foco inicial al primer campo, Escape
  cierra, el foco vuelve al disparador.
- Tabla: cabecera caption, filas 52 px, separadores `--border-subtle`; < 720 px pasa a tarjetas apiladas.
- Iconos: familia de la barra lateral, trazo 1,6, 18-20 px.

## 5. Errores genéricos evitados (NO → SÍ)
- NO cada sección con su `.card/.kpi/.chip/.modal` → SÍ una primitiva compartida por componente.
- NO 5 KPIs en rejilla de 4 → SÍ rejilla sin huérfanos.
- NO naranja en todo (botones secundarios, bordes, chips de origen) → SÍ presupuesto del acento (H-07).
- NO esqueleto infinito ni "Cargando…" que parpadea → SÍ carga honesta y error con Reintentar.
- NO indicadores decorativos que mienten ("↑ tendencia" fijo, "En línea" fijo) → SÍ dato real o nada.
- NO tablas cortadas en el móvil → SÍ tarjetas apiladas con la acción a la vista.
- NO emojis como iconos ni tres familias de iconos → SÍ una familia.
- NO "Tocá", "Cobrado vs mes anterior" sin comparación, em-dash → SÍ español neutro y textos que dicen la verdad.

Sub-agentes: ninguno (pulido de sistema existente).
Ledger aplicable: E-01, E-11, E-15, E-16, E-17, E-19, E-20, E-29, E-30.

## Añadido 2026-10-21 · Kit de arranque desde la ficha del cliente
Estado: PROPUESTO, pendiente del OK visual del dueño sobre capturas reales (escritorio 1440 y móvil 390 táctil).
- Anfitrión (E-19): la cabecera de la ficha (junto a "Archivar") y el MISMO diálogo del kit de Briefs
  (`briefs/KitDialog.svelte`); ninguna tarjeta ni componente nuevo.
- Piezas del catálogo: **D-10** una acción, sin competir con la principal de la vista ("Guardar cambios"
  sigue siendo el único naranja), **H-07** presupuesto del acento (botón secundario con el icono de enviar),
  **E-08** vacío que propone la salida (el "Alta manual" de Origen se convierte en el brief creado al enviar).
- Sin brief: "Enviar kit de arranque" abre el diálogo, que avisa de que se crea su brief con la ficha.
  Con brief: "Enviar kit desde su brief" lleva a ese brief, donde vive su kit.
