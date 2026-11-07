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

## Añadido 2026-11-07 · Sección Marcy (conversaciones en vivo, historial, citas, gasto)
Estado: PROPUESTO, ronda 2. La ronda 1 (bocetos A/B sin referencias) la rechazó el dueño: "nivel empresa top,
un CRM de calidad" (ledger E-61). Tres direcciones de verdad distintas en `design/orbit-marcy/direcciones.png`
(y `.html`), cada una al lado de sus referencias. El dueño elige antes de construir en fino.

Referencias de Refero MIRADAS en imagen (pantallas web, id completo · principio tomado):
- Lemni `f139a9a3-b343-4ef1-9860-60c5f62c32eb` · acciones del agente como tarjetas dentro de la conversación.
- Lemni `3a36c541-61e3-4f84-b1b6-220e38a07f65` · ficha lateral con estado, prioridad y resumen del hilo.
- Intercom `8e601e7d-bf19-4fa2-be9e-ab49d7d8d816` · avisos del sistema discretos entre mensajes.
- Intercom Fin `de1ab118-183b-45e5-832a-c2f5237103ea` · cifras del agente como pestañas que filtran.
- Intercom informes `0d71c83b-b64f-43a9-97d0-1df31ec1010c` · KPIs + tabla de rendimiento.
- Attio `a3cb9102-0320-4ed3-b39b-5a714d16e85f` · ficha de persona con pestañas y actividad por fechas.
- Krisp `eb64758d-6ba8-4b29-9ae6-1fecc6d5e603` · cinta de turnos sobre la transcripción.
- Factory `a57432d9-dc26-4267-bb76-04827eff439c` · sesión de agente oscura con pasos plegables.
- GlossGenius `bd279ce7-915e-403f-9f64-1bc258810d3b` · cita con su cliente en panel lateral.
- Mangomint `1663684e-5602-447a-ac79-99f36d56c690` · semana densa con citas por color.
- Rox `c794140c-de8b-46c4-8128-b3a652ea7461` · uso frente al límite con barra.
- Steel `d499ba7e-45e3-4365-be81-a2d756f9f775` · gasto del periodo y por día.
- Missive `1c47a246-4f51-4bbe-810b-0ad33fc5de46` · reparto por tramos para ver dónde se acumula.
- Zendesk `1686eace-68b9-43c8-b6ad-056eca9d35fe` · panel de llamadas en cola (para la fase de teléfono).
Biblioteca viva: Refero es la fuente de pantallas de producto; Mobbin no se conecta sin consultar; código base
de la bandeja si se elige A: el ejemplo "mail" de shadcn/ui (MIT) solo como estructura, con primitivas de Orbit.

Direcciones:
- **A · Consola en vivo:** bandeja | conversación con tarjetas de herramientas y avisos | ficha con recorrido de venta.
- **B · Embudo y diagnóstico:** embudo del mes que filtra, tabla con cinta de turnos, motivos de fallo ordenados.
- **C · Ficha de cliente:** contactos | ficha con línea de tiempo por días de todos los canales | datos del negocio.
- Común: Citas (semana con horas de atención, panel lateral) y Gasto (barra frente al tope con aviso al 80 %).
Piezas del catálogo: **E-06** filtros con estado en la URL, **I-06** pestañas segmentadas, **I-05** línea de
tiempo (C), **E-08/E-09/E-10** estados, **H-07** presupuesto del acento (naranja: ítem activo y lo que agenda
Marcy; verde de datos: en vivo y cerrado; ámbar: dónde falló, siempre con texto).
Ledger aplicable: E-11, E-17, E-19, E-28, E-30, E-39, E-55, E-60, E-61.

## Añadido 2026-11-07 · Citas (Orbit) y agenda en el chat
Estado: PROPUESTO, pendiente del OK visual del dueño en la vista previa.
- Orbit, pestaña Citas de la sección Marcy: semana en hora de Houston (referencias Mangomint
  `1663684e-5602-447a-ac79-99f36d56c690` y GlossGenius `bd279ce7-915e-403f-9f64-1bc258810d3b`): fuera de
  horario más oscuro, horario de atención en la superficie de tarjeta, citas como bloques con la hora y el
  nombre; las de Marcy con filo naranja (H-07: es lo pendiente que puso ella), las manuales en verde de datos.
  Ficha lateral con contacto, lo que necesita, enlace al lead y a la conversación; acciones Hecha, No contestó,
  Cancelar (peligro). Anfitrión E-19: pestaña nueva dentro de la sección ya aprobada, sin componentes globales.
- Chat: la cajita de captura de siempre con un bloque de días (pastillas) y horas (rejilla) encima de los
  campos; mismos tokens del widget (teal del sitio, radios y tipografía de la cajita). Nada nuevo fuera de ella.

## Añadido 2026-11-07 · Icono propio de Orbit (pedido del dueño)
Estado: PROPUESTO. El panel usaba el planeta oro/teal de Marcyan (el de la empresa), igual que otras apps de
Marcyan. Orbit pasa a tener su isotipo: planeta y anillo en el naranja de Orbit `#f97316` sobre `#0e0e11`,
satélite blanco en el anillo. Mismo vocabulario de la marca (planeta orbitado) con el color de Orbit, para que
se reconozca como de la familia y se distinga en la pantalla de inicio. Archivos: `public/dashboard/orbit-icon.svg`
y PNG 180/192/512 (iPhone no acepta SVG). Nombre de la app instalada: "Orbit". No toca el logo del navbar,
el de la empresa ni el favicon del sitio (memoria "Logos: NO unificar").
