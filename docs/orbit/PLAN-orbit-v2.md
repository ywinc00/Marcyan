# Plan: Orbit v2 (panel) + Brief v2 (formulario y kit para Claude Code)

> **Estado:** PROPUESTO 2026-10-19, esperando las decisiones del dueño (sección 7).
> **Rama base:** `feat/orbit-v2` (worktree `.claude/worktrees/orbit`, sobre `origin/main`@`1b514e4`).
> **Encargo del dueño (2026-10-19):** reencaminar el panel (funciones a medias o mal hechas y diseño sin pulir:
> **arreglar, no eliminar**), actualizar a la par el brief del cliente (subir fotos, logos y documentos; salida
> como paquete .zip en markdown que sirva para arrancar el proyecto en Claude Code en lugar del documento
> imprimible) y analizar qué hemos necesitado en los proyectos y el formulario no pide.
> **Evidencia:** `docs/orbit/auditoria-2026-10-19.json` (11 agentes: 6 auditores del panel y el brief, 2 de
> proyectos pasados, 1 de infraestructura, 1 mock local, 1 verificador adversarial). 157 hallazgos con
> `ruta:línea`; los 32 graves (P0/P1) se comprobaron contra el código: 27 confirmados, 5 matizados, 0 refutados.
> Capturas "antes" en Chrome real (1440×900 y 390×844 táctil) de las 7 secciones y del brief.

---

## 1. Diagnóstico en una página

**El panel funciona, pero está a medias por debajo y por encima.**

- **Datos que mienten en la portada.** "Leads nuevos +N este mes" cuenta todos los leads nuevos de siempre;
  "En curso (mes) / proyectos activos" muestra briefs recibidos; "Cobrado (mes)" sale siempre "—" aunque
  Finanzas ya calcula el cobrado. Indicadores decorativos fijos ("↑ tendencia", "En línea").
- **Errores invisibles.** Seis clientes HTTP copiados, 15 `catch {}` vacíos, la sesión caducada solo se detecta
  en 2 llamadas: con la sesión vencida las secciones salen vacías en vez de pedir login. El login dice "te
  enviamos el enlace" aunque falle el envío.
- **Endpoints construidos sin pantalla** (y al revés): ficha de cliente, borrar y ver facturas, ficha de lead,
  diagnóstico de Google, sincronización masiva, borrar hito. No existe la vista **Clientes**.
- **Estados sin reglas:** un lead "Convertido" no convierte nada; una factura puede quedar "Pagada" con saldo;
  "Vencida" nunca se marca sola.
- **Fechas un día antes** (columnas DATE leídas como medianoche UTC; "este mes" calculado en UTC).
- **Sin enlaces profundos:** recargar vuelve al inicio; los avisos y el correo de brief nuevo llevan a la
  portada o al panel viejo `/admin`, que sigue publicado.
- **Móvil roto:** el menú se apila arriba como un bloque, la barra superior se pisa, las tablas de Leads y
  Facturas se cortan (la columna Estado queda fuera).
- **Diseño sin pulir:** cada sección define sus propias tarjetas, chips, modales y campos con medidas distintas
  (los títulos saltan al cambiar de sección), 5 KPIs en rejillas de 4 dejan una tarjeta huérfana (Finanzas,
  Progreso), texto atenuado y botón primario bajo AA, sin foco visible, iconos de tres familias, copy con
  voseo, jerga y em-dash.
- **SEO:** sin interfaz para el diagnóstico de permisos, errores de Google en crudo y en inglés, "Google
  conectado" en verde aunque el acceso falle, sin sincronización automática (el cron del que habla el código
  no existe), dos bugs de caché (top búsquedas pisa el dato diario; cambiar de propiedad sigue mostrando la
  anterior).

**El brief es el formulario de abril de 2026 con la piel nueva.** 39 campos de texto en una página de 6.500 px,
solo en español, sin pasos ni guardado, sin ningún campo de archivo. Pregunta "¿tiene logotipo?" pero no deja
subirlo. Cubre solo "sitio web" (no los servicios del catálogo) y sus rangos de presupuesto no casan con los
precios publicados. `/api/brief` no tiene límite de envíos y manda correo a cualquier dirección. La salida es un
HTML para imprimir como PDF.

**Lo que hemos necesitado y el formulario no pide** (Move Junk Away, Texas Rush, Julio's, Rosy Nails; 81
necesidades con evidencia en el JSON): logo en archivo con variantes, fotos reales etiquetadas por servicio,
barrio y mes (llegaron tarde, por WhatsApp y en HEIC), nombre legal y comercial exactos, fecha real de apertura,
zonas reales (ciudades, ZIP), horario, canales y quién contesta en qué idioma, correo donde recibir pedidos,
precios "desde" por servicio con unidad e inclusiones, lo que NO hace, recargos, seguros, licencias y garantías
con documento, accesos (dominio, DNS, ficha de Google, Search Console, Analytics, redes, directorios: a nombre de
quién, nunca contraseñas), competidores reales del mapa, objetivo medible y anuncios activos, otras agencias que
tocan el sitio, quién aprueba y por qué canal, responsables tras el lanzamiento.

---

## 2. Reglas del encargo

1. **Arreglar, no eliminar.** Ninguna función desaparece. El panel viejo `/admin` se redirige a `/dashboard`
   cuando todo lo suyo exista en Orbit; su código se conserva hasta que el dueño diga.
2. **La gramática de Orbit está aprobada** (decisión del dueño 2026-06-15: el panel es interno y adopta la
   estética de Orbit 1:1): acento naranja único `#f97316`, verde de datos `#34d399`, capas oscuras
   `#0e0e11/#16161a/#1b1b20`, Inter, sentence-case, ilustraciones KpiArt, estilo de gráficos y embudo de píldoras.
   Se **pule dentro** de ella; no se cambia (ledger E-20).
3. **El brief es del sitio público**: usa el sistema del sitio (DS v2 Space-Tech, `Button.astro`, `SiteNav`,
   tokens de `DESIGN.md`), no el de Orbit.
4. **El diff es el encargo** (E-16). Cada paso declara su lista de archivos.
5. **Ojos** (E-11, E-17, E-30): nada se da por bueno sin captura en Chrome real, escritorio y móvil con
   emulación táctil. OK visual del dueño sobre el render antes de mergear a `main`.
6. **Seguridad:** PII nunca al modelo del chat; el mock `public/dev/` nunca llega a producción; sin claves de
   cuenta de servicio (solo WIF); no se registra el token OIDC; merges a producción solo con OK explícito.
7. **Migraciones a mano** en Neon (como 002-009), con su archivo en `db/migrations/`.
8. **Copy visible:** español neutro de EE.UU. (sin voseo), sin em-dash ni guiones de conector, sin jerga.

---

## 3. Pista A: el panel (rama `feat/orbit-v2`)

### A0 · Base común (primero; todo lo demás se apoya aquí)
- **Un solo cliente HTTP** `src/components/dashboard/lib/api.js`: timeout, JSON seguro, `onUnauthorized` →
  vuelta al login con "Tu sesión caducó", errores legibles. Sustituye los 6 `api()` locales. Cero `catch {}`
  vacíos: todo error llega a un estado visible.
- **Rutas con URL** (`#/leads?estado=nuevo`, `#/briefs/MRC-017`, `#/finanzas/facturas/INV-004`…): recargar
  conserva la vista, Atrás funciona, los avisos y los correos enlazan al registro concreto.
- **Fechas** `lib/dates.js` (cliente) y helpers SQL: DATE como fecha local sin hora, timestamps en
  `America/Chicago`, "este mes" en hora de Houston. Sustituye los 6 `fmtDate` copiados.
- **Primitivas de UI** (una sola definición, medidas iguales en todas las secciones): cabecera de página, rejilla
  de KPIs sin huérfanos, tarjeta, chip de estado (color + texto), modal sobre `<dialog>` (foco, Escape), campo,
  tabla que pasa a tarjetas por debajo de 720 px, vacío que propone salida (E-08), carga honesta (E-09), error
  con Reintentar (E-10), confirmación de borrado, aviso breve de acción hecha.
- **Carcasa móvil:** barra superior compacta + menú en `<dialog>` (sin ceremonia), zonas seguras del iPhone,
  objetivos táctiles de 44 px. Escritorio sin cambios de estructura.
- **Accesibilidad:** texto atenuado y botón primario a AA, anillo de foco visible, `aria-current`,
  `prefers-reduced-motion`. Iconos de una sola familia (la de la barra lateral).
- **CSV** único (`lib/csv.mjs`): BOM UTF-8 (tildes en Excel) y neutralización de fórmulas.
- **Seguridad transversal:** límite de envíos persistente en Neon para `/api/brief`, `/api/contact` y
  `/api/admin/login` (el actual en memoria no es global); quitar el log de claims OIDC de `lib/seo.mjs`;
  cabeceras de seguridad para `/dashboard`; `/admin` → `/dashboard` y el correo de brief nuevo enlaza a Orbit.
- **Mock local** `public/dev/dash-mock.js` (ya creado, ignorado por git) para revisar el panel sin backend.

### A1 · Inicio
KPIs veraces (leads de este mes, proyectos activos reales, cobrado del mes desde Finanzas con delta real o sin
delta), error con reintento en vez de esqueleto infinito, embudo con proporciones reales, eje Y del gráfico
correcto, indicadores decorativos fuera o con dato real, refresco de la carcasa (suscripciones, proyectos).

### A2 · Leads y Clientes
- Leads: búsqueda, filtros por estado y origen, y paginación con el estado en la URL (E-06); el mensaje visible
  aunque haya "interés"; **ficha de lead** (todo lo guardado, historial, borrar con confirmación); cambio de
  estado sin parpadeo y con error visible; exportar todos los leads filtrados.
- **Convertir lead** → cliente o → brief, dejando rastro (el estado "Convertido" pasa a significar algo).
- **Vista nueva Clientes** con los endpoints que ya existen: lista, ficha (proyectos, facturas, briefs, notas),
  editar, y archivar en lugar de borrar en cascada (el borrado definitivo pide confirmación y dice qué arrastra).
- Brief → cliente desde la ficha del brief eligiendo cliente existente o nuevo, sin teclear IDs.

### A3 · Briefs (lado panel)
Guardar solo los campos que cambian (hoy registra los 39), notas internas, etiquetas legibles en vez de códigos
crudos, filtros que no se pierden al volver del detalle, contactos clicables (tel, correo, WhatsApp), aviso de
cambios sin guardar, acciones visibles en móvil. La Pista B añade aquí los archivos y "Descargar kit".

### A4 · Finanzas
Editar, anular y borrar facturas y pagos; reglas de estado (saldo 0 = pagada, pago parcial = parcial, vencida
sola por fecha); montos validados ("1.500" y "1,500"); pagos que no superan el saldo ni van a anuladas;
factura enlazada a proyecto; historial de pagos por factura; editar gastos y suscripciones, borrar con
confirmación, "próximo cargo" que avanza; resumen con criterio explícito (por cobrar sin borradores); KPIs sin
huérfanos; tabla de facturas en tarjetas en móvil; numeración INV/CLI/PRJ atómica de verdad.

### A5 · Progreso
Editar el proyecto completo (nombre, servicio, monto, cliente, brief); hitos: renombrar, fecha, borrar,
reordenar, un solo control de estado; `started_at` correcto; KPIs sobre todos los proyectos (no solo los de
pantalla) y cartera solo de activos; stepper legible con muchos hitos y en móvil; aviso al borrar de que se
desvinculan facturas.

### A6 · SEO
Estado real de Google (el diagnóstico existente con interfaz y explicación en español claro de cada error);
"Google conectado" solo si el acceso funciona; **sincronización diaria automática** con su cron protegido y
"última sincronización" honesta (por fuente, con el error guardado); arreglos de caché (top búsquedas,
propiedad cambiada); gráficos con eje Y, días reales y tooltips táctiles; comparativa con el período previo
real; "no configurado" en vez de ceros; validación de identificadores; sync más rápida (lotes, `maxDuration`);
rango de fechas en la interfaz.

### A7 · Avisos
"Abrir" lleva al lead o brief concreto; contador de no leídos en el menú con refresco; paginación; marcar como
no leído y archivar.

---

## 4. Pista B: Brief v2 + Kit para Claude Code (rama `feat/brief-v2`)

### B0 · Infraestructura de archivos
- **Almacén:** Vercel Blob **privado** (nadie lo ve sin sesión, no se indexa), subida directa desde el navegador
  (las funciones de Vercel no aceptan más de 4,5 MB por petición: una foto de iPhone ya lo supera).
- **Migración 010:** `brief_drafts` (borrador con secreto, caducidad 48 h, IP, cupos) y `brief_files` (tipo
  logo/foto/documento, ruta, tipo real, tamaño, sha256, nombre original, etiquetas: servicio, barrio, mes,
  propio o inspiración, antes/después; si se convirtió de HEIC).
- **Endpoints:** crear borrador, emitir token de subida (valida borrador, tipo, tamaño y cupos: 60 archivos /
  300 MB por brief), listar y servir archivos al panel (solo con sesión), **kit.zip** en streaming.
- **Validación de tipo real** por bytes mágicos al enviar; SVG solo como descarga; sin ZIP del cliente en v1.
- **HEIC del iPhone:** el navegador lo convierte a JPG antes de subir (librería bajo demanda solo cuando hace
  falta); si falla, se guarda el original marcado.
- **Limpieza:** cron diario que borra borradores no enviados de más de 48 h; borrar un brief borra sus archivos.
- **Privacidad:** `/privacidad` explica qué se guarda, cuánto tiempo y cómo pedir el borrado.
- El chat (Marcy) sigue creando briefs sin archivos: todo es compatible hacia atrás.

### B1 · Formulario (según la decisión 1)
- **Por pasos** con progreso visible y reanudación (D-09), dentro de la página, sin avance automático, el
  último paso resume antes de enviar.
- **ES + EN** con el mismo modelo de datos (hoy el pie en inglés enlaza a un formulario solo en español).
- **Servicios del catálogo** (`pricing.ts`, fuente única) y presupuesto acorde a los precios publicados; los
  bloques de preguntas aparecen según los servicios elegidos (web, SEO local, SEO para IA, chatbot, e-commerce,
  branding).
- **Subida guiada:** logo (con "versión para fondo claro/oscuro/solo icono" o "no tengo, quiero uno"), fotos con
  etiquetas, documentos.
- Errores junto al campo, obligatorios marcados, etiquetas legibles (no micro-mayúsculas), enlace a privacidad.
- Tras enviar: siguiente paso claro (qué pasa ahora y en cuánto).

### B2 · El kit `.zip` (sustituye al documento imprimible como salida principal)
```
kit-MRC-0XX-<negocio>/
  LEEME.md              índice, modo (desde cero / rediseño sobre identidad) y orden de lectura
  CLAUDE.md             borrador de reglas del proyecto (idioma, tono, lo que el cliente no quiere,
                        reglas de copy de Marcyan) siguiendo la plantilla de Estructura de Agencia
  DESIGN.md             front matter de la plantilla rellenado (colores del logo, tipografías,
                        personalidad, sector); lo que falta va marcado "# EDITAR"
  design/art-direction.md   cabecera del proyecto con enlaces al brief y a los assets
  BRIEF.md              todo el brief por secciones, con front matter (MRC, negocio, ciudad, idioma, plazo)
  brief.json            datos crudos legibles por máquina (sin IP ni navegador)
  data/site.json        nombre, teléfonos, WhatsApp, correo, redes, horario, zonas: genera site.ts
  docs/handoff/         NEGOCIO.md · SERVICIOS.md + precios.json · CLAIMS.md (cada afirmación con su
                        prueba) · FOTOS.md (archivo, servicio, barrio, mes, origen, uso) · CUENTAS.md
                        (qué existe y a nombre de quién, sin contraseñas) · PLACEHOLDERS.md (lo pendiente)
                        · COMPETENCIA.md · OBJETIVOS.md · OPERACION.md
  docs/seo/seo.config.json  semilla del alta SEO (skill posicionamiento)
  assets/logo/ · assets/fotos/ · assets/docs/ · assets/MANIFEST.md
```
El documento HTML actual se conserva como "Ver ficha". Los documentos legales confidenciales (registro, seguro)
no viajan en el kit de diseño: se descargan aparte.

### B3 · Panel
En la ficha del brief: miniaturas y descarga de archivos, botón principal **Descargar kit**, y (si la decisión 1
es "dos momentos") **Enviar al cliente el enlace del kit de arranque**.

---

## 5. Dirección de diseño (Art Director Gate)

**Panel · REDISEÑO/IDENTIDAD sobre Orbit aprobado.**
- CONSERVADO: acento naranja `#f97316` único, verde de datos, capas oscuras, Inter, KpiArt, estilo de gráficos,
  embudo de píldoras, barra lateral con suscripciones y logos, sentence-case.
- ELEVADO: una sola definición por componente; rampa de superficies completa; estados de carga, vacío y error;
  foco y contraste AA; carcasa móvil; iconografía de una familia.
- PROHIBIDO: cambiar el acento, la tipografía o el estilo de gráficos aprobado.
- Piezas del catálogo: **H-06** rampa de superficies (una tarjeta = un nivel, borde de 1 px, nada de losas de
  negro crudo, E-01), **H-07** presupuesto del acento (naranja solo en la acción principal, el foco, el activo
  y un dato destacado; hoy hay naranja en botones secundarios, KPIs y bordes), **E-06** filtros con el estado en
  la URL (Leads, Facturas, Briefs), **E-08/E-09/E-10** vacío, carga y error, **E-03** menú móvil en `<dialog>`
  con la ceremonia al mínimo.

**Brief · sistema del sitio.** Piezas: **D-09** formulario por pasos con reanudación, **D-10** acción principal
con reaseguro, **E-10** error con rescate, y una **pieza nueva** para el catálogo si el dueño la aprueba:
"subida guiada por tomas" (lista de fotos que necesitamos, cada una con su casilla y su subida). Antes de
construir: 2 o 3 direcciones en baja fidelidad para que el dueño elija (E-28, E-31).

---

## 6. Orden de ejecución

1. **Ya:** A0 (base común) y B0 (infraestructura) en paralelo, cada una en su rama.
2. **Después de A0:** A1 a A7 en paralelo por sección (cada una toca su componente y sus endpoints); a la vez,
   bocetos del brief para que el dueño elija dirección.
3. **Con la dirección elegida:** B1, B2 y B3.
4. **Verificación por paso:** build, `check:kb`, `test:chat`, `test:diag` y pruebas nuevas de los endpoints
   tocados; capturas en Chrome real (escritorio 1440 y móvil 390 táctil) contra las de "antes"; revisión
   adversarial del código; OK visual del dueño; merge a `main` con su OK.

**Lo que hace el dueño:** decisiones de la sección 7; aplicar la migración 010 (o autorizar que la aplique yo
por el editor de Neon con su sesión, como la 008); OK visual; probar la subida de fotos desde su iPhone.

## 7. Decisiones pendientes del dueño

1. **Cómo pedimos la información:** dos momentos (brief corto al pedir propuesta + kit de arranque privado al
   contratar) / un solo formulario completo / brief corto y el resto por llamada.
2. **Fotos:** reducidas a calidad web (~3.000 px, sin GPS) / originales siempre. Logos y documentos siempre
   originales.
3. **Almacén de archivos:** lo crea Claude en la cuenta de Vercel / lo crea el dueño. Antes se confirma el plan
   de Vercel (en Hobby, pasar de 1 GB bloquea el almacén 30 días).
4. **Facturas enviables al cliente** (PDF con la marca, correo y estado de pago): en esta tanda / después.

Valores por defecto si no se dice otra cosa: borradores sin enviar se borran a las 48 h; archivos de proyecto
se conservan 12 meses tras completarse; topes de 60 archivos y 300 MB por brief.

## 8. Riesgos
- Subida anónima: sin borrador + secreto + cupos, cualquiera llena el almacén. Por eso B0 va antes que B1.
- Safari iOS cambia según versión al convertir HEIC: prueba obligatoria en un iPhone físico.
- Licencia de la librería HEIC (LGPL-3.0, cargada aparte y sin modificar): compatible, con atribución.
- Las secciones A1-A7 comparten `dashboard.css`: por eso las primitivas van primero (A0) y cada sección solo
  añade estilos con su propio ámbito.
