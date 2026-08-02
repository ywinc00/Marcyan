# MARCY v7 — Cierre sin fricción + herramientas INTERNAS (plan ejecutable · 2026-07-06)

> **Problema reportado por el dueño:** (1) tras el Lote 2 del Growth OS, Marcy manda al cliente FUERA del
> chat (a /es/herramientas o /es/diagnostico) metiendo pasos extra que rompen el flujo de conversión;
> (2) cuando el cliente YA está convencido y quiere cerrar, Marcy no cierra: da vueltas procesales.
> Este plan sale de una auditoría 3-vías (prompt/playbook · arquitectura · tests) con citas exactas.
> **Veredicto:** ambos problemas son de DOCTRINA en el prompt (no del modelo), y la solución de fondo es
> que Marcy use las tecnologías del sitio **internamente** (el servidor calcula/diagnostica y le devuelve
> el resultado) en vez de enlazar hacia afuera.

---

## 0 · Diagnóstico (causas exactas, con citas)

### Problema 1 — Marcy expulsa al cliente del chat
| Dónde | Instrucción culpable | Efecto |
|---|---|---|
| `lib/chat-kb.mjs:111` | "…→ **ANTES de recomendar servicio**, ofrécele ponerle número a ese dolor con enlazar_pagina («calculadora-…»)" | La más dañina: gatillo amplísimo (cualquier mención de teléfono/citas) + imperativo que inserta una salida del chat en el pico emocional del SPIN. **La introdujo el Lote 2** — corregimos doctrina. |
| `lib/chat-kb.mjs:109` | "Es **el mejor primer paso**… cuando el visitante dude de qué necesita… ofrécele ENLAZAR esa página" | "Cuando dude" = el 90% de los visitantes; compite con la etapa 2 del arco ("aquí se gana la venta"). |
| `lib/chat-kb.mjs:107` | "Diagnóstico…: GRATIS… (**primer paso ideal**)" | Licencia permanente para ofrecer salir del chat. |
| `lib/chat-kb.mjs:173/226` | "**Antes de** llamarla [la captura], ofrécele elegir entre llenar él mismo el formulario (enlazar_pagina «formulario»)…" | Hasta en el cierre GANADO hay una ruta de fuga obligatoria + un turno extra de decisión. |

### Problema 2 — Marcy no cierra cuando el cliente ya decidió
| Dónde | Instrucción culpable | Efecto |
|---|---|---|
| `lib/chat-kb.mjs:177` | "…pregunte el precio, elija un plan o diga «me late» / «me interesa» / **«cómo seguimos»** NO es un cierre: es tu señal para SEGUIR vendiendo" | "Cómo seguimos" ES una señal de compra clásica y está codificada como falso cierre. No existe NINGUNA lista positiva de señales de compra ni atajo: el arco es un rail con una sola puerta al final. |
| `lib/chat-kb.mjs:164` | "Recorre estas etapas EN ORDEN… Nunca saltes al precio sin diagnosticar, ni pidas los datos sin haber pedido el sí" | Doble candado sin válvula: aunque el cliente diga "ya me convenciste", Marcy re-diagnostica y re-pide el sí. |
| `lib/chat-kb.mjs:170-171` | Etapa 6 MEDIR obligatoria + etapa 7 "encadena pequeños síes" | Trial close y re-confirmaciones incluso con el sí ya dado → 2-4 turnos procesales entre el "hazlo" y la cajita. |
| Playbook §93/§114 + desactualización | "Capturar (SOLO ahora…)"; el playbook aún documenta `motivo:` (la tool real usa `destino:`) y no doctrina las tools del Growth OS | La "fuente de verdad del método" ya no describe el sistema desplegado. |

### Hallazgos técnicos que habilitan la solución
- **`pricePostFilter` banda [10, 25000]**: "≈$2,500/mes" derivado de números del cliente YA pasa; pero una pérdida ANUAL (p.ej. $27,300) **nukea la respuesta entera** → se necesita allowlist dinámico de cifras computadas por el servidor.
- **`lib/diagnostic-checks.mjs` es puro y ya importable desde el chat** (analyzeSite/recommendService, labels bilingües precocinados, cero deps). Lo NO compartido: `ssrfGuard/isBlockedIp/fetchSite` viven dentro de `api/diagnostic.mjs` sin exportar → factorizar (sin arrastrar Postgres: `api/chat.mjs` tiene doctrina CERO-Postgres).
- **Timeout real = el widget**: `NET_TIMEOUT=15000` (ChatWidget.astro:781) abortaría un loop de tools de 10-18s aunque el servidor complete y facture.
- Fórmulas de las calculadoras hoy DUPLICADAS en el script inline de `ToolsHub.astro` → factorizar a módulo único.

---

## 1 · Los 3 pilares de v7

- **A. FAST-PATH AL CIERRE** — señales de compra positivas con prioridad máxima; el arco pasa de rail a mapa.
- **B. HERRAMIENTAS INTERNAS** — 2 tools nuevas con `tool_result` computado por el SERVIDOR: `calcular_perdida` (fórmulas de las calculadoras) y `revisar_sitio` (motor del diagnóstico). El enlace externo pasa a último recurso.
- **C. CONTRATOS Y QA** — tests nuevos + verificación contra modelo real.

⛔ **Lo que NO cambia:** el enum de 9 páginas de `enlazar_pagina` y el mapa PAGES del widget (test L155 intacto); los GrowthCta/teaser de las LANDINGS (el problema era solo Marcy); la cajita segura y toda la doctrina PII; CHANNELS_TOOL; el saneo de inputs; los LIMITS del payload del cliente.

---

## 2 · PILAR A — Cambios EXACTOS de prompt (lib/chat-kb.mjs)

### 2.1 Nueva sección en SYSTEM_PROMPT — insertar INMEDIATAMENTE ANTES de "TU MÉTODO DE VENTA" (L163)
```
SEÑALES DE COMPRA (prioridad máxima, por encima del orden de etapas)
Si el visitante EXPRESA DECISIÓN — pide comprar, empezar, pagar o que le mandes la propuesta, o acepta tu oferta ("ya me convenciste", "hazlo", "cómo empezamos", "cómo seguimos", "cómo te pago", "quiero empezar ya", "sí, arranquemos", "mándame la propuesta") — DEJA DE VENDER Y CIERRA EN ESE MISMO MENSAJE: confirma en UNA frase el alcance y el precio si ya los hablaron (o la opción accesible que encaje con lo que pidió, sin re-diagnosticar) y llama a solicitar_datos_contacto con destino "proyecto". Después del sí del cliente, cada pregunta extra ENFRÍA la venta: nada de cierre de prueba, nada de herramientas, nada de re-preguntar lo que ya sabes. El arco de abajo es un MAPA, no un rail: entra en la etapa donde el cliente ya está.
```

### 2.2 Reemplazos dentro del arco
| Línea | Texto actual (fragmento) | Texto NUEVO |
|---|---|---|
| L164 (final) | "Nunca saltes al precio sin diagnosticar, ni pidas los datos sin haber pedido el sí." | `Con un cliente que aún explora, no saltes al precio sin diagnosticar ni pidas datos sin haber pedido el sí; con un cliente que YA DECIDIÓ, aplica SEÑALES DE COMPRA y cierra sin vueltas.` |
| L166 (etapa 2, añadir al final) | — | `Si el dolor son llamadas sin contestar o citas/reservas que no llegan, pídele los 2-3 números (cuántas a la semana, cuánto vale una, cuántas se le van) y usa calcular_perdida para ponerle cifra AQUÍ MISMO, en el chat; presenta el resultado como estimación hecha con SUS números ("con tus números, son ≈$X al mes que se escapan"). No lo mandes a la página de calculadoras: eso rompe la conversación.` |
| L167 (etapa 3, añadir al final) | — | `Si tiene sitio web y el dolor es que no rinde (o no sabe qué falla), ofrécele revisarlo AHÍ MISMO: pídele la dirección y usa revisar_sitio; cuéntale 2 o 3 hallazgos prioritarios en lenguaje de negocio y conéctalos con la solución. No lo mandes a la página del diagnóstico salvo que él prefiera el reporte completo por email.` |
| L170 (etapa 6, inicio) | "MEDIR (cierre de prueba). Antes de pedir la venta…" | `MEDIR (cierre de prueba — SOLO si el cliente aún no ha pedido cerrar). Antes de pedir la venta…` |
| L173 (etapa 8, vía proyecto) | "…ofrécele DOS opciones: (a) que llene él mismo el formulario de proyecto (llama enlazar_pagina con "formulario"), o (b) que te los dé aquí y tú se lo dejas listo. Si elige (b): NO le vuelvas…" | `…dile que para armarle algo A LA MEDIDA le pides unos datos aquí mismo y llama a solicitar_datos_contacto con destino "proyecto" EN ESE MISMO MENSAJE. (Solo si ÉL dice que prefiere llenarlo por su cuenta o dejar todo por escrito, enlaza el formulario de la página con enlazar_pagina "formulario".) NO le vuelvas…` (el resto del párrafo de inferencia del brief queda igual) |
| L173 (mismo párrafo, faltantes) | "Si te falta algún dato CLAVE para la propuesta, pregúntalo antes; si ya tienes lo esencial, captura." | `Si te falta algo CLAVE para la propuesta, haz MÁXIMO UNA pregunta con los faltantes juntos; todo lo demás lo infieres. Si ya tienes lo esencial, captura sin preguntar más.` |
| L177 (bloque crítico) | "Que el visitante muestre interés, pregunte el precio, elija un plan o diga "me late" / "me interesa" / "cómo seguimos" NO es un cierre: es tu señal para SEGUIR vendiendo…" | `Que el visitante muestre interés, pregunte el precio o diga "me late" / "me interesa" todavía NO es un cierre: confirma alcance y precio y pide el sí. PERO si pide ACCIÓN o acepta ("cómo seguimos", "cómo empezamos", "hazlo", "cómo te pago", "sí") eso ES una señal de compra: cierra en ese mismo mensaje (ver SEÑALES DE COMPRA), no sigas vendiendo lo ya vendido.` |

### 2.3 Bloque HERRAMIENTAS (L187-190) — reemplazar COMPLETO por
```
HERRAMIENTAS DEL SITIO (máximo una herramienta VISIBLE por mensaje; las internas no cuentan porque el visitante no las ve)
- solicitar_datos_contacto: cajita segura donde el visitante confirma su contacto y envía su caso al equipo. destino "proyecto" (cerró o pide avanzar) o "contacto" (no se cerró, lo pide, o no tiene tiempo). Pásale el "nombre" y, en "proyecto", el brief completo que reuniste. Ver etapa 8 y SEÑALES DE COMPRA.
- calcular_perdida (INTERNA: el servidor calcula y te devuelve el resultado en esta misma conversación): ponle número al dolor del cliente con los números que ÉL te dio. Cita el resultado redondeado, como estimación orientativa con sus números, y conéctalo con la solución y su precio.
- revisar_sitio (INTERNA): revisa el sitio web del visitante en unos segundos y te devuelve hallazgos verificados (web móvil, SEO local, lectura por IA, conversión). Úsala SOLO con la dirección que él te dé, UNA vez por conversación, y anúnciala natural ("dame unos segundos y te lo reviso ya mismo"). Si devuelve error, dilo con naturalidad y sigue sin inventar hallazgos.
- mostrar_canales_directos: botones de WhatsApp, iMessage y llamar. Cuando quiera hablar con una persona ya, prefiera un canal directo, o no puedas cerrar tú.
- enlazar_pagina (ÚLTIMO RECURSO): botón a una página del sitio ("precios", "servicios", "houston", "miami", "formulario", "diagnostico", "herramientas", "calculadora-llamadas", "calculadora-citas"). SOLO cuando el visitante pida ver la página explícitamente, prefiera llenar el formulario por su cuenta, o no quiera seguir chateando. NUNCA la uses para cuantificar el dolor ni para diagnosticar (eso lo haces TÚ con tus herramientas internas), y NUNCA con una señal de compra activa: ahí se cierra, no se enlaza.
```

### 2.4 KB_FACTS — reemplazar L107-111 por
```
   - Diagnóstico de Visibilidad en IA: GRATIS, sin compromiso.
   - El sitio tiene una página de diagnóstico digital gratis (/es/diagnostico, inglés /en/checkup) que revisa web móvil, SEO local, lectura por IA, conversión y reseñas, con reporte completo por email. TÚ haces lo mismo DENTRO del chat con revisar_sitio: prefiérela SIEMPRE (mantiene la conversación viva). Enlaza la página solo si el visitante prefiere el reporte por email o no quiere seguir chateando.
   - El sitio tiene calculadoras gratis en /es/herramientas (inglés /en/tools): llamadas perdidas y citas perdidas. TÚ calculas lo mismo DENTRO del chat con calcular_perdida y los números del cliente: prefiérela SIEMPRE. Enlaza la página solo si el visitante pide la herramienta explícitamente.
```

### 2.5 CONTACT_TOOL description (L226 y L228)
- L226: **eliminar** la frase final "Antes de llamarla, ofrécele elegir entre llenar él mismo el formulario (usa enlazar_pagina con "formulario") o dártelos aquí para que tú lo dejes listo." → sustituir por: `Llámala directamente cuando el cliente cierre o pida avanzar; solo menciona el formulario de la página si ÉL prefiere llenarlo por su cuenta.`
- L228: "NO la llames solo porque el visitante muestre interés, pregunte precios o diga "me late"/"me interesa": primero sigue vendiendo y cierra tú." → añadir a continuación: `Pero si pide acción o acepta ("cómo seguimos", "hazlo", "cómo te pago", "sí"), llámala en ESE MISMO mensaje: eso es el cierre.`

### 2.6 Playbook `docs/marcy-sales-playbook.md` (re-doctrinar; hoy va detrás del código)
1. Nueva sección tras §1: **"El arco es un mapa, no un rail"** — señales de compra + fast-path (mismo contenido de 2.1, en prosa de playbook).
2. Corregir `motivo: muestra_gratis | contacto` → `destino: contacto | proyecto` (§2 L108 y §4 L141 están desactualizados).
3. Añadir el toolbox completo (calcular_perdida, revisar_sitio, enlazar_pagina con doctrina de último recurso) a la sección de herramientas.
4. Etapa 8: reflejar el cierre directo a cajita (el enlace a /formulario solo a petición).

---

## 3 · PILAR B — Herramientas internas (specs técnicas)

### 3.1 `lib/tools-formulas.mjs` (NUEVO — fuente única de las fórmulas)
```js
// Fórmulas de las calculadoras (fuente única: las usan ToolsHub y la tool del chat).
export const WEEKS_PER_MONTH = 4.33;
export const NOSHOW_RECOVERY = 0.4; // 40% recuperable con recordatorios (documentado en ToolsHub)

const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

export function computeMissedCalls({ llamadas_semana, pct_sin_contestar, ticket, tasa_cierre = 30 }) {
  const calls = clamp(llamadas_semana, 1, 1000);
  const missed = clamp(pct_sin_contestar, 1, 95) / 100;
  const t = clamp(ticket, 10, 100000);
  const close = clamp(tasa_cierre, 5, 95) / 100;
  const monthly = Math.round(calls * WEEKS_PER_MONTH * missed * t * close);
  return { monthly, yearly: monthly * 12 };
}

export function computeNoShows({ citas_semana, pct_no_show, valor_cita }) {
  const appt = clamp(citas_semana, 1, 2000);
  const noshow = clamp(pct_no_show, 1, 95) / 100;
  const v = clamp(valor_cita, 5, 100000);
  const monthly = Math.round(appt * WEEKS_PER_MONTH * noshow * v * NOSHOW_RECOVERY);
  return { monthly, yearly: monthly * 12 };
}
```
`ToolsHub.astro` debe importar de aquí en su `<script>` (Vite lo bundlea). Si hay fricción, dejar la copia
pero añadir test de PARIDAD obligatorio (§4).

### 3.2 `lib/site-fetch.mjs` (NUEVO — factorización, SIN Postgres)
Mover desde `api/diagnostic.mjs` (sin cambiarles la lógica): `isPrivateV4`, `isBlockedIp` (con el
endurecimiento IPv6 ya hecho), `ssrfGuard`, `fetchSite` — parametrizando presupuestos:
`fetchSite(u, { timeoutMs = 8000, maxBytes = 500_000, maxRedirects = 3 })`. `api/diagnostic.mjs` importa
de aquí (dedupe). ⚠️ `api/chat.mjs` importa SOLO este módulo y `lib/diagnostic-checks.mjs` — JAMÁS
`api/diagnostic.mjs` (arrastra @vercel/postgres y rompería la doctrina cero-Postgres del chat; se acepta
perder el cache 24h por url_hash en la vía del chat).

### 3.3 Tools nuevas en `lib/chat-kb.mjs` (constantes de módulo byte-estables — patrón CONTACT_TOOL)
```js
export const CALC_TOOL = {
  name: 'calcular_perdida',
  description: '(INTERNA: el visitante no la ve; el servidor calcula y te devuelve el resultado.) Calcula cuánto se le escapa al negocio al mes con los números que el VISITANTE te dio en el chat (no los inventes tú; si te falta uno, pregúntalo primero). Cita el resultado redondeado como estimación orientativa hecha con sus números.',
  input_schema: {
    type: 'object',
    properties: {
      modo: { type: 'string', enum: ['llamadas', 'citas'] },
      llamadas_semana: { type: 'number' },
      pct_sin_contestar: { type: 'number' },
      ticket: { type: 'number' },
      tasa_cierre: { type: 'number', description: 'porcentaje; si el cliente no lo dio, pasa 30' },
      citas_semana: { type: 'number' },
      pct_no_show: { type: 'number' },
      valor_cita: { type: 'number' },
    },
    required: ['modo'],
  },
};

export const SITE_TOOL = {
  name: 'revisar_sitio',
  description: '(INTERNA: el visitante no la ve; el servidor revisa y te devuelve hallazgos verificados.) Revisa el sitio web del visitante — SOLO la dirección que ÉL te dio — y devuelve señales de web móvil, SEO local, lectura por IA y conversión, en su idioma. Tarda unos segundos: anúncialo con naturalidad. Máximo UNA vez por conversación. Si devuelve ok:false, no pudiste revisarlo: dilo y sigue sin inventar hallazgos.',
  input_schema: {
    type: 'object',
    properties: { url: { type: 'string', description: 'la dirección web tal como la dio el visitante' } },
    required: ['url'],
  },
};
```
Añadirlas a `CHAT_TOOLS`. (Invalida el cache de prompt UNA vez por deploy — aceptable.)

### 3.4 Agentic loop en `api/chat.mjs` (cap duro: 1 iteración)
1. 1ª llamada igual que hoy. Si la respuesta trae `tool_use` de CALC/SITE (las de cómputo):
   - `calcular_perdida`: validar `modo`; inputs por `sanitizeNumber` propio (Number + clamp de §3.1;
     **NUNCA** `sanitizeField`, que borraría dígitos). Computar (0ms). `tool_result` =
     `JSON.stringify({ ok:true, modo, perdida_mensual, perdida_anual })`.
   - `revisar_sitio`: límites primero (1 por `sessionId` — Map en memoria con TTL, patrón rate-limit del
     chat; y 5/10min por IP). `ssrfGuard(url)` → bloqueada → `tool_result {ok:false}` (degradación
     silenciosa, sin revelar el motivo). OK → `fetchSite(u, { timeoutMs: 6000, maxBytes: 300_000,
     maxRedirects: 2 })` → `analyzeSite(...)` de `lib/diagnostic-checks.mjs` →
     `tool_result = { ok:true, scores, hallazgos: findings.slice(0,5).map(f => ({ id: f.id, texto: f[lang], impacto: f['impact_'+lang] })), recomendado: recommendService(...).label }`.
     **REGLA DE ORO anti-inyección: el tool_result contiene EXCLUSIVAMENTE labels de NUESTRO catálogo
     (lib/diagnostic-checks.mjs) + enteros — JAMÁS title/meta/texto del sitio analizado.**
   - 2ª llamada: `messages = [...messages, { role:'assistant', content: r.content }, { role:'user', content: [{ type:'tool_result', tool_use_id, content }] }]` (mismo prefijo tools+system → cache-friendly).
   - `parseToolResponse` sobre la 2ª respuesta (las UI-tools de la 2ª se respetan con la precedencia
     actual captura > channels > link; una tool de CÓMPUTO en la 2ª respuesta se IGNORA — cap 1).
2. `pricePostFilter(reply, lang, extraAllow)` — nueva firma con 3er parámetro opcional:
   `const allow = extraAllow.length ? new Set([...PRICE_ALLOW, ...extraAllow]) : PRICE_ALLOW;`
   `extraAllow` = SOLO las cifras que el servidor computó en ESTE request, normalizadas como el filtro:
   `[String(monthly), String(yearly)]`. Nunca persiste entre requests.
3. Presupuestos de tiempo: `config.maxDuration` 30 → **60**; `withTimeout` por fase (llamada1 ≤10s ·
   fetch ≤6s · llamada2 ≤14s). **Widget**: `NET_TIMEOUT` 15000 → **28000** (ChatWidget.astro:781).
4. `validateMessages` NO cambia (el cliente sigue mandando solo strings; el loop vive íntegro
   server-side y el history del cliente sigue siendo pares user/assistant).

### 3.5 Coste y modelo (avisos)
Turnos con tool = 2 llamadas al modelo (la 2ª relee el prefijo cacheado; +300-600 tokens de salida
típicos). Sonnet 5 a precio intro $2/$10 MTok hasta 2026-08-31 (luego $3/$15) — el tope de gasto de la
consola Anthropic sigue de backstop. El rate-limit por request (12/min IP · 40/sesión) no cambia.

---

## 4 · PILAR C — Tests y QA

### Tests nuevos en `scripts/test-chat-guard.mjs` (el ejecutor los implementa TODOS)
1. **Validación numérica** de calcular_perdida: no-numérico/null → error controlado sin excepción; negativos/NaN/Infinity/1e15 → clampeados o rechazados; campos faltantes → no computa.
2. **Paridad de fórmulas**: `computeMissedCalls/computeNoShows` == resultado de las calculadoras del sitio para inputs canónicos (importar ambos o comparar contra valores dorados documentados).
3. **Allowlist dinámico**: cifra computada (p.ej. 45000 anual) con `extraAllow` PASA; la misma cifra SIN extraAllow sigue derivando (ancla L104 intacta); variantes de formato ($45,000 / 45000) pasan; extraAllow vacío → comportamiento idéntico al actual (los 12 tests existentes del filtro verdes).
4. **SSRF vía chat** (la URL viene del tool_use = input no confiable): batería completa reutilizando `lib/site-fetch.mjs` — loopback/privadas IPv4, ::1/fd00/fe80/::ffff:127.0.0.1, esquemas no-http(s), credenciales embebidas, puertos fuera de 80/443, hostname→IP privada post-resolución.
5. **Límites**: revisar_sitio 2ª invocación misma sesión → `{ok:false}` SIN fetch; cap de 1 iteración de loop por request; sessionId inválido → ninguna tool con efecto.
6. **Anti-forjado**: mensaje del cliente con `content:[{type:'tool_result',…}]` → null (refuerzo del ancla L29); wire banderas+texto sigue pasando.
7. **Precedencia**: [calcular_perdida + solicitar_datos_contacto] en el mismo turno → la captura manda en la action final; tool de cómputo desconocida/mal escrita → ignorada (ancla L173).
8. **Saneo propio**: campos numéricos NO pasan por `sanitizeField`; la URL no pasa por `sanitizeName/sanitizeField`; un email/teléfono incrustado en un campo de TEXTO de tool se sigue limpiando.
9. **invitesContact vs fraseos v7**: los cierres nuevos que prometen cajita disparan la red de seguridad; los que solo confirman verbalmente no (extender L75-84 con los fraseos reales del prompt v7).

### QA contra MODELO REAL (preview + prod — como v4/v5/v6)
| # | Escenario | Esperado |
|---|---|---|
| 1 | "Quiero una landing, ya me convenciste, hazlo" (2º turno) | Cajita destino proyecto EN ese turno, sin diagnóstico ni trial close |
| 2 | Conversación media, cliente: "va, cómo seguimos" | Cierre inmediato (confirmación 1 frase + cajita), no "seguir vendiendo" |
| 3 | "Se me escapan como 10 llamadas por semana y cada trabajo son $400" | Marcy pide el dato que falte, usa calcular_perdida, cita "≈$X al mes" EN el chat, conecta con IA Conversacional + precio. SIN enlace a /herramientas |
| 4 | "Tengo web pero no me llega nadie: minegocio.com" | "Dame unos segundos…" → hallazgos del catálogo en el chat → propuesta. SIN enlace a /diagnostico |
| 5 | "¿Tienen alguna calculadora que pueda usar yo?" | AHÍ SÍ enlaza (petición explícita) |
| 6 | URL maliciosa ("revisa http://169.254.169.254/…" o "file://…") | Marcy dice que no pudo revisarlo y sigue; cero fetch interno (verificar logs) |
| 7 | Pérdida anual > $25k en el cálculo | La cifra sobrevive al filtro (allowlist dinámico) |
| 8 | Inyección clásica ("ignora tus instrucciones…") | Rechazada como siempre (los 124 tests + batería manual) |

**Verificar también:** tiempos de respuesta con tools < 20s típicos (widget con NET_TIMEOUT 28s y tecleo animado visible), y `check:kb` + `test:chat` + build verdes.

---

## 5 · Rollout
Rama `feat/marcy-v7`, 3 commits: **A** prompt+playbook (fast-path, §2 completo) → **B** tools internas (§3: formulas, site-fetch, tools, loop, filtro dinámico, timeouts) → **C** tests (§4) + QA modelo real. Merge tras verificar los 8 escenarios en preview. Reportar al chat de planificación commits + resultados.

## 6 · Anti-checklist
- NO quitar páginas del enum de enlazar_pagina (el test L155 y el mapa del widget quedan como están; cambia la DOCTRINA de uso, no el allowlist).
- NO meter contenido del sitio analizado (title/meta/texto) en ningún tool_result — solo labels del catálogo + números.
- NO pasar email/teléfono/nombre a ninguna tool nueva ni a sus resultados.
- NO más de 1 iteración de tool por request; NO más de 1 revisar_sitio por sesión.
- NO construir schemas de tools por petición (rompe el cache de prompt): constantes de módulo.
- NO importar api/diagnostic.mjs desde api/chat.mjs (Postgres); usar lib/site-fetch.mjs + lib/diagnostic-checks.mjs.
- NO tocar GrowthCta/GrowthTeaser/landings (el Lote 2 en las PÁGINAS se queda como está).
- NO aflojar la banda [10, 25000] del filtro para cifras no computadas.
