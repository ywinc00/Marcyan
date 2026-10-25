# Orbit v2 · Contratos del backend (rama `orbit/backsec`, A0 parte servidor)

Lo que las demás ramas del panel deben saber. Todo es aditivo: ningún campo ni
endpoint anterior desaparece. Montos siempre en **centavos USD**. "Hoy" y "este mes"
siempre en **hora de Houston** (`America/Chicago`).

## Fechas · `lib/dates.mjs`
- `monthRange(offset, now?)` y `dayRange(offset, now?)` → `{ key, startISO, endISO, startDate, endDate }`.
  Rango semiabierto `[start, end)`. `*ISO` para columnas `timestamptz`, `*Date` para columnas `DATE`.
- `houstonDate()`, `houstonMonthKey()`, `lastMonthKeys(n)`, `formatHoustonDateTime(d)`.
- Fragmentos SQL para `client.query`: `SQL_TODAY_HOUSTON`, `SQL_MONTH_START_HOUSTON`,
  `SQL_PREV_MONTH_START_HOUSTON`, `sqlMonthKey(col)`. En el tag `sql\`\`` se pasan los límites
  como parámetros (el tag no admite SQL crudo).
- Aplicado en: `dashboard/analytics`, `leadStats`, `briefStats`, `financeSummary`, `financeExtras`
  y el documento del brief (`briefs/[id]/document`).
  Pendiente (otras ramas): `projects/[id]` (`CURRENT_DATE`).

## CSV · `lib/csv.mjs`
- `rowsToCsv(rows, cols, { bom = true, headers })`: BOM UTF-8 y neutralización de celdas
  de texto que empiezan por `= + - @ \t \r` (se antepone `'`). Los números no se tocan.
- `sendCsv(res, filename, csv)`: cabeceras de descarga + `Cache-Control: no-store`.
- El cliente (DashboardApp `csvCell`) debe dejar de serializar y usar el endpoint.

## `GET /api/admin/export`
- Sin `type` (o `type=briefs`): briefs como siempre (`?status=&search=`), ahora con BOM y fórmulas neutralizadas.
- `?type=leads&status=&source=&search=&from=YYYY-MM-DD&to=YYYY-MM-DD`: **todos** los leads
  filtrados (tope 10.000), columnas `LEAD_EXPORT_COLUMNS` (ref, estado, origen, fechas,
  nombre, email, teléfono, negocio, ciudad, interés, mensaje, brief convertido). Sin IP ni navegador.

## `GET /api/admin/leads`
- Filtros nuevos opcionales: `source` (contact|chat|diagnostic), `from`, `to` (días de Houston, inclusivos).
  `search` busca también en ciudad y mensaje.
- Las filas ya **no** traen `ip_address` ni `user_agent` (solo la ficha `GET /api/admin/leads/:id`).
- `stats` añade `from_diagnostic`, `pipeline` (new + contacted) y `prev_month`.

## `GET /api/admin/dashboard/analytics`
Campos nuevos en `kpis`:
| campo | significado |
|---|---|
| `new_leads_this_month` / `new_leads_prev_month` | leads creados este mes / el anterior |
| `uncontacted_leads` | leads en estado `new` de cualquier fecha |
| `active_projects` | proyectos con `status='active'` (null si falla la consulta) |
| `briefs_this_month` | briefs recibidos este mes |
| `revenue_this_month_cents` / `revenue_prev_month_cents` | cobrado (centavos) desde `financeSummary()`; null si Finanzas falla |
| `revenue_this_month` / `revenue_prev_month` | siempre `null` (compatibilidad, ver abajo) |
| `leads_from_contact` / `leads_from_diagnostic` | por origen |

Compatibilidad: `new_leads` (= sin contactar, **no** "este mes"), `leads_this_month`,
`projects_this_month` (= briefs), `pending_briefs`, `in_progress_briefs`, `leads_from_chat`.
**Ojo:** `revenue_this_month` sigue en `null` a propósito: el panel actual lo pinta en crudo y con centavos mostraría una cifra 100 veces mayor. El panel nuevo lee `revenue_this_month_cents` y lo formatea con `money()`.
`funnel.pipeline` = new + contacted (para "en pipeline"; `total` incluye archivados).
`meta = { tz, month, prev_month }`.

## Avisos · `/api/admin/notifications`
- Cada aviso guarda `type` y `ref` (LEAD-xxx / MRC-xxx). Los nuevos guardan en `url` el enlace
  profundo; todas las filas traen además `link` calculado (los viejos también enlazan):
  `/dashboard#/leads/<ref>`, `/dashboard#/briefs/<MRC>`, handoff → `/dashboard#/avisos`.
- `GET ?countOnly=1` → `{ ok, unread }` (barato, para el contador del menú).
- `GET` acepta `before=<id>` (cursor) u `offset`, y `type`. Respuesta: `rows, limit, offset,
  total, has_more, next_cursor, unread, counts{ total, unread, by_type{ tipo:{ total, unread } } }`.
- `PATCH /api/admin/notifications/:id` devuelve también `link`.

## Correos al dueño · `lib/email.mjs`
- `orbitLink(kind, ref)`: brief nuevo → `/dashboard#/briefs/MRC-xxx`, lead nuevo → `/dashboard#/leads/LEAD-xxx`,
  handoff → `/dashboard#/avisos`. Ya no enlazan a `/admin`.
- "Recibido el …" en hora de Houston.
- El panel debe leer el hash al cargar **y conservarlo durante el login** (el enlace mágico
  redirige a `/dashboard` y el hash se pierde si no se guarda antes).

## `vercel.json`
- `/admin/briefs/detail?id=MRC-xxx` → 308 a `/dashboard#/briefs/MRC-xxx` (conserva el enlace
  directo de los correos viejos; va ANTES de la regla genérica). Vercel podría arrastrar la query
  original (`?id=…`): el lector del hash debe cortar el id en `?`, `&` o `/`. Comprobarlo en preview.
- `/admin` y `/admin/:path*` → 308 a `/dashboard` (los archivos de `public/admin` siguen en el repo).

## Orden de fusión (obligatorio)
Esta rama **no** debe llegar a `main` antes que el enrutado por hash del panel (A0, parte interfaz).
Hasta entonces el panel actual no lee `#/briefs/…` ni `#/leads/…`: el correo de brief nuevo y los
correos viejos (por la redirección de `/admin`) abrirían el inicio en vez del brief, y "Abrir →"
de un aviso, desde la propia `/dashboard`, solo cambiaría el hash sin efecto visible. El panel debe
escuchar `hashchange`, no solo leer el hash al cargar.
`revenue_this_month` ya no depende del orden (sigue en `null`).

## Hallazgos con backend listo y falta interfaz
El servidor ya entrega los datos; el arreglo visible lo cierra la rama del panel:
| id | lo que falta en el panel |
|---|---|
| CRM-15, OP-03 | usar `new_leads_this_month` (y `new_leads_prev_month` para el delta) en "+N este mes"; hoy pinta `new_leads` (sin contactar) |
| OP-12 | navegar al registro con `link` del aviso (enrutado por hash + `hashchange`) |
| OP-13 | contador de no leídos en la barra lateral con refresco usando `?countOnly=1` |
| OP-14 | botón "Cargar más" con `next_cursor` |
| CRM-11, B-12 | leer `#/briefs/…` y `#/leads/…` al cargar y conservarlo durante el login |
| CRM-12 | el enlace directo por brief existe en Orbit (condición para que la redirección de `/admin` no pierda nada) |
- `/dashboard`, `/dashboard/:path*`: `X-Frame-Options: DENY`, CSP **solo** `frame-ancestors 'none'`
  (no toca scripts), `nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy` restrictiva.
- `/api/admin/:path*`: lo mismo sin CSP + `Cache-Control: no-store`.

## Autenticación (auditoría 2026-10-19)
| punto | estado |
|---|---|
| Enlace mágico de un solo uso y 15 min | ya estaba bien (UPDATE atómico con `used_at IS NULL`) |
| Token y sesión guardados en claro en la BD | **arreglado**: se guarda SHA-256; las sesiones viejas siguen valiendo y pasan a hash en su primer uso (la sesión del dueño no se cierra) |
| Hash leído de la BD presentado como token | bloqueado: el valor en claro solo se acepta con la longitud de los tokens viejos (43) |
| Cookie | HttpOnly, Secure, SameSite=Lax, Path=/ (sin cambios) |
| Sesión deslizante 90 días | se mantiene; ahora escribe en BD como mucho cada 5 min (el contador de avisos no genera un UPDATE por consulta) |
| Email quitado de `ADMIN_ALLOWED_EMAILS` | **arreglado**: sus sesiones abiertas dejan de valer (antes solo se bloqueaba el login) |
| Cierre de sesión | revoca en servidor; si falla responde 500 `{ ok:false }` (antes decía ok) |
| Comparación de secretos | `CRON_SECRET` de `seo/sync` en tiempo constante (`safeEqual`); tokens se buscan por hash |
| Cobertura de `requireAdmin` | 30 de 33 handlers; exentos `login`, `verify`, `logout` (con motivo). Lo vigila `npm run test:admin` |
| Respuestas de admin cacheables | `requireAdmin` y `vercel.json` ponen `no-store` |
| `verify` | valida formato antes de la BD, `no-store` y `Referrer-Policy: no-referrer` |

Pendientes (fuera de esta rama): límite de intentos del login en memoria y respuesta que
revela si el email está autorizado cuando falla el envío (`login.mjs`, rama del brief);
limpieza periódica de tokens y sesiones caducadas; tope absoluto de vida de la sesión;
lectores de enlaces de correo que pudieran consumir el enlace mágico con un GET.

## Briefs ↔ clientes (A3, revisión)
- `POST /api/admin/briefs/:id { action: 'convert_to_client', client_id? }`: 201 si crea el cliente,
  200 si vincula (`linked`) o si ya era ese cliente (`already`), **409 si el brief ya es de OTRO
  cliente** (no se cambia por aquí), 404 si el brief o el cliente no existen.
- Vincular a un cliente existente (`linkBriefToClient`) escribe el `source_brief_id` (solo si el
  cliente no tenía brief de origen) y el evento `converted_to_client` en UNA sentencia.
- Si el cliente ya tenía otro brief de origen, el vínculo vive solo en el evento del brief: la ficha
  del brief lo muestra (`getBriefClient`) y la ficha del cliente también, porque `getClientRelated`
  lee los eventos `converted_to_client` (resuelto en la integración, ver abajo).
- La tarjeta Cliente de la ficha del brief enlaza a `#/clientes/<id numérico>` (el formato que lee
  `ClientesSection` de A2 y `/api/admin/clients/:id`), no al código CLI.

## Integración CRM (rama `orbit/int1`)
- **Un solo `converted_to_client` por conversión.** Al CREAR un cliente desde un brief lo escribe
  `convertBriefToClient(pid, actorEmail, { checkDuplicates })` (`lib/finance.mjs`), con el actor y
  `data = { client_id, client_code, business_name, created: true, linked: false }`. El handler
  `POST /api/admin/briefs/:id` ya no lo repite. Al VINCULAR lo escribe `linkBriefToClient` (con
  `linked: true`); desde un lead, `convertLead` (con `lead`). `createClientFromBrief` sigue como
  compatibilidad y no comprueba duplicados.
- **Duplicados en el alta desde un brief.** `POST /api/admin/briefs/:id { action:'convert_to_client',
  allow_duplicate? }` y `POST /api/admin/clients { from_brief, allow_duplicate? }` responden
  **409 `{ reason:'duplicate', matches[] }`** si ya hay un cliente con el correo (sin mayúsculas) o
  el teléfono (10 últimos dígitos) del brief. El panel ofrece "Usar este" (vincula con `client_id`)
  o "No es el mismo, crear uno nuevo igualmente" (repite con `allow_duplicate: true`). Un brief ya
  vinculado responde antes 200 `already` / `created:false`, sin mirar duplicados.
  Los demás puntos de alta ya lo hacían: `POST /api/admin/clients` (alta manual),
  `POST /api/admin/leads/:id/convert` y `{ from_lead }`.
- **Proyecto con "el cliente del brief" (revisión int1, F1).** `POST /api/admin/projects
  { briefProjectId, allow_duplicate? }` sin `clientId` resuelve el cliente con el mismo criterio que
  la ficha del brief (`source_brief_id` o el último `converted_to_client`) y, si no tiene, lo crea
  vía `convertBriefToClient` (evento con el actor). Si ya hay un cliente con su correo o teléfono:
  **409 `{ reason:'duplicate', matches[] }`**; el formulario de Progreso pinta el mismo aviso
  ("Usar este" lo elige en el selector, "crear igualmente" repite con `allow_duplicate: true`).
- **Archivados (revisión int1, F2).** Un cliente archivado no se asigna a nada nuevo: **409** en
  texto llano ("Ese cliente está archivado. Reactívalo en su ficha para usarlo o elige otro.") al
  vincularlo a un brief (`reason:'archived'`, sin escribir vínculo ni evento), al convertir un lead
  a él (`reason:'archived'`), al crear una factura o pasarla a él, y al crear un proyecto o pasarlo
  a él (también si el cliente del brief está archivado). El aviso de duplicados muestra los
  archivados como información, con su ficha enlazada, sin "Usar este".
- **Ficha del cliente sin briefs repetidos.** `related.briefs` reúne, sin repetir, el brief de
  origen (`source_brief_id`), los de sus proyectos, los vinculados por su último evento
  `converted_to_client` y los de sus leads convertidos.
- **Lead que deja "Convertido"** (con la 011 aplicada): `PATCH /api/admin/leads/:id { status }`
  conserva `converted_client_id`, `converted_brief_id` y `converted_at` (solo escribe `status`), y
  el evento `status_changed` lleva `kept: { client_id, brief_id }`. Los recuentos (`stats.converted`,
  pastillas, embudo) cuentan por **estado**, así que deja de contar como convertido y todo cuadra;
  volver a marcarlo Convertido lo acepta porque tiene vínculos. El panel avisa antes con un
  ConfirmDialog. Sin vínculos sigue el 409 `use_convert` de A2-R6; sin la 011, como siempre.
- **Selector de cliente único:** `crm/ClientPicker.svelte` (`GET /api/admin/clients?search=&limit=8&active=1`,
  nunca archivados) en conversión de lead y de brief, factura (alta y edición) y proyecto. Props
  nuevas: sin `oncreate`, `allowCreate` abre el alta (`NewClientDialog`) y elige el cliente creado o
  el existente; `autoOption` + `auto`/`onauto` para la opción "cliente del brief / cuenta Directo"
  de Progreso. `NewClientDialog` acepta `onuse(match)` ("Usar este" en vez de "Abrir ficha").
  El "Nuevo cliente" de Finanzas es ese mismo alta; "Cliente desde brief" queda en
  `finanzas/ClientForm.svelte` con el aviso de duplicados.
- **Correo manual al cliente (A3-11, B-21).** `emailManualToClient` normaliza `\r\n` y `\r` a `\n`
  y pinta el cuerpo con `manualBodyHtml(text)`: saltos como `<br>` y SIN `white-space:pre-wrap`
  (con los dos, cada salto llegaba doble). El texto plano del correo va con los saltos ya
  normalizados. Probado en `npm run test:briefs-panel`.

## Plazo de conservación de archivos (rama `orbit/ret`, decisión del dueño 2026-10-19)

- **Regla.** Los archivos de un brief se borran solos 12 meses después de terminar el proyecto,
  con aviso en el panel 30 días antes; a petición del cliente se borran antes desde la ficha. Sin
  migración nueva: se calcula con `brief_events`. Decisión del dueño 2026-10-19: los de un
  prospecto que nunca llegó a ser proyecto (brief archivado sin completar) se borran 12 meses
  después de archivarlo, con el mismo aviso y el mismo mínimo de 7 días.
- **`lib/brief-retention.mjs` (puro).** `purgeDate(brief, events, projects)` → `'YYYY-MM-DD'`
  (día de Houston) o `null`. Cuenta la ÚLTIMA vez que el brief pasó a `completed` (eventos
  `status_changed`); volver a `pending`/`contacted`/`in_progress` anula el reloj; archivar desde
  Completado lo mantiene (el proyecto sigue terminado). Sin historial de estados usa
  `completed_at`. Con historial, `completed_at` (que guarda la PRIMERA terminación: `db.mjs` no lo
  limpia al reabrir) nunca se usa solo: si el brief está en Completado sin su paso registrado se
  toma lo más reciente entre ese campo y el último cambio (RET-01). Proyectos de Progreso
  enlazados (`projects.brief_project_id`): si alguno está `active`/`on_hold` no hay fecha; si
  está `completed` cuenta lo último entre su `completed_at` y el cierre del brief; `cancelled` no
  frena (RET-04). Archivado sin terminación vigente (el reloj de Completado es `null`): cuenta el
  ÚLTIMO paso a `archived` del historial (volver luego a un estado de trabajo lo anula); archivado
  sin historial de estados y nunca completado → `null` (conservador); un proyecto de Progreso
  activo o en pausa también lo frena. `retentionCause(brief, events, projects, opts)` →
  `'completed'` | `'archived'` | `'archived_after_work'` | `null`, misma lógica que `finishedAt`
  (un solo cálculo interno); un proyecto de Progreso completado deja la causa en `'completed'`.
  `'archived_after_work'` = archivado sin completarse, pero el brief se completó alguna vez
  (`completed_at` o un paso a `completed` en el historial): el texto no dice "sin llegar a ser
  proyecto" (RET-A2). **Brief que ya es cliente (RET-A1).** `opts.isClient` = existe un cliente
  con `source_brief_id` = el brief o un evento `converted_to_client`. Cada proyecto trae `via`:
  `'brief'` (por `brief_project_id`) o `'client'` (por `client_id` del cliente del brief); sin
  `via` cuenta como `'brief'`. Si el brief es cliente y está archivado sin terminación vigente,
  mandan TODOS los proyectos de ese cliente: alguno `active`/`on_hold`, o ninguno `completed`
  → `null`; si no, cuenta lo último entre el archivado y sus cierres. Los de `'client'` no pesan
  en ningún otro caso (un brief Completado sigue su reloj aunque el cliente tenga otra
  mensualidad). `retentionStage(day, now)` → `keep` | `notice` (≤ 30 días) | `purge`.
  `effectivePurgeDay(day, noticeAt, now)` → la fecha de la política, pero nunca antes de 7 días
  desde el aviso (sin aviso, desde hoy) (RET-02).
- **Cambio de estado + evento atómicos.** `updateBriefStatus` (`lib/db.mjs`) escribe el cambio y
  su `status_changed { from, to }` en UNA transacción (`SELECT … FOR UPDATE`, `UPDATE`, `INSERT`);
  el PATCH de `/api/admin/briefs/:id` ya no lo registra aparte (RET-01).
- **Cron** `api/cron/brief-cleanup.mjs` (mismo secreto y horario): paso `conservación` =
  `runFileRetention({ limit: 25, budgetMs: 45000 })`, por tandas con cursor por id. Sin aviso
  previo → aviso `system` con clave `files-purge:<MRC>:<fecha de la política>` (ventana de 40
  días; el tope de `createNotification` sube de 7 a 60 días) que dice el día REAL del borrado; si
  sale tarde (primer despliegue, cron caído) lo dice ("Ya se cumplieron 12 meses…"). El texto
  sigue la causa (`purgeNotice({ …, cause })`): "desde que se terminó el proyecto" o "desde que se
  archivó este brief sin llegar a ser proyecto" ("desde que se archivó este brief" con
  `'archived_after_work'`). Solo con el
  aviso fuera hace 7 días o más y la fecha efectiva cumplida → `purgeBriefFiles`, que
  re-comprueba que siga terminado y deja `files_purged { files, reason: 'retention', cause }` sin
  actor (`cause` = la causa con la que se borró, RET-A4).
  Si algún brief falla: aviso `system` `files-purge-failed` (uno al día) y `retention.ok = false`
  en la respuesta del cron (RET-03).
- **`purgeBriefFiles`.** Borra los blobs (si Blob falla, lanza con `phase: 'storage'` sin tocar la
  base) y luego, en UNA sola sentencia (`WITH gone AS (DELETE …) INSERT INTO brief_events …`),
  las filas y el evento: o quedan los dos o ninguno; si falla lanza con `phase: 'records'` y
  repetir el borrado lo termina (RET-06). Borra TODO lo enlazado al brief, también lo que un kit
  aún abierto ya guardó por partes; de ese kit solo quedan las subidas aún sin enlazar (RET-07).
- **`/api/admin/briefs/:id/files`** (requireAdmin). `GET` añade
  `retention { purgeOn, daysLeft, cause, lastPurge { at, files, reason, cause, actor } }`, con
  `purgeOn` = la fecha efectiva (la misma que usa el cron) y `cause` = `'completed'` |
  `'archived'` | `'archived_after_work'` (`null` sin fecha). `lastPurge.cause` es la causa
  guardada en el evento (`null` a petición o en borrados anteriores a guardarla). El historial se lee con los 500 eventos MÁS
  RECIENTES (RET-08). `DELETE` borra todos los archivos enlazados (blobs bajo los borradores
  cerrados incluidos), responde `{ files }` y deja `files_purged { files, reason: 'request' }` con
  el actor; 502 con texto distinto si falla el almacén ("No se borró nada") o si falló la ficha
  tras borrar del almacén ("Los archivos ya se borraron… vuelve a pulsar").
- **RET-05 (resuelto en parte el 2026-10-19).** Los archivados sin completar (el prospecto
  descartado, que no es cliente) ya tienen plazo: 12 meses desde que se archivaron. Siguen sin plazo los briefs que
  se quedan en Pendiente, Contactado o En curso (la política dice "mientras sean necesarios para
  atenderte"); un tope por inactividad sería un borrado irreversible nuevo y no se implementa sin
  su OK. RET-04 se resolvió en la versión
  conservadora (solo retrasa borrados); si prefiere otra regla para clientes con mensualidad,
  también es decisión suya.
- **Panel.** Sección Archivos: "Se borrarán el <fecha>, 12 meses después de terminar el proyecto |
  de archivarlo" (según `retention.cause`; aviso amarillo a 30 días o menos),
  "Borrar archivos" (secundaria de peligro con confirmación que dice cuántos y qué) y vacío
  "Archivos borrados el <fecha>" con la causa con la que se borró ("al cumplirse el plazo de 12
  meses" si el evento no la guarda). Política: "se conservan hasta 12 meses después de cerrar la
  solicitud y después se eliminan" (ES y EN, misma forma que la de proyectos). Historial: "Archivos borrados · Desde el panel | Plazo de 12
  meses cumplido". Probado en `npm run test:brief-files` y `npm run test:briefs-panel`.
