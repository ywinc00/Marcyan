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
  del brief lo muestra (`getBriefClient`), pero la ficha del cliente de A2 lista sus briefs por
  `source_brief_id` y `projects.brief_project_id`, así que no lo verá. Al integrar la ola 2 hay que
  decidir si A2 lee también los eventos `converted_to_client` o si se crea un vínculo real.
- La tarjeta Cliente de la ficha del brief enlaza a `#/clientes/<id numérico>` (el formato que lee
  `ClientesSection` de A2 y `/api/admin/clients/:id`), no al código CLI.
- Al fusionar con A2: su `createClientFromBrief` pasa a registrar él mismo `converted_to_client`;
  el handler del brief también lo registra al crear. Hay que quitar uno de los dos para no duplicar.
