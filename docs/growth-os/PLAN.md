# MARCYAN GROWTH OS — Plan de implementación ADAPTADO (v1 · 2026-07-05)

> **Origen:** propuesta externa "Marcyan Growth OS" (roadmap de 22 secciones + demo). El autor NO conocía el
> repo: proponía Next.js, OpenAI, tokens cyan/violet, un CRM nuevo y reconstruir a Marcy. Este documento es la
> versión **adaptada por el chat de planificación** al stack real (Astro estático + Vercel Functions + Neon +
> Anthropic + DS v2 Space-Tech). El ejecutor sigue ESTE documento, no los archivos de la propuesta.
> Complementa: memoria `marcyan_growth_os_plan` (resumen), `DESIGN.md` (doctrina visual), `marcyan_backend_datamodel` (contratos), `marcyan_conversion_cta_policy`.

---

## 0 · Veredicto módulo a módulo (qué se hace, qué ya existe, qué se descarta)

| Propuesta | Veredicto | Por qué |
|---|---|---|
| M1 Diagnóstico Inteligente | ✅ **CONSTRUIR** (pieza central de este plan) | No existe. Convierte el CTA "Diagnóstico gratis" en herramienta real. |
| M2 Marcy Sales Agent | ⛔ **YA EXISTE y es superior** (v4-v6.1: playbook SPIN/Challenger, captura por tool solo-UI, brief completo) | Solo se integra: Marcy podrá **enlazar** al diagnóstico (§7). NO adoptar su prompt (retrocede) ni su "JSON con contacto desde el modelo" (viola doctrina PII). |
| M3 Calculadoras | ✅ **CONSTRUIR 2** (llamadas perdidas + citas perdidas) en `/es/herramientas` | No existen. Client-side puro, sin IA. |
| M4 Tracking + CRM | 🔶 **ADAPTAR**: CRM ya existe (tabla `leads` + dashboard). Añadir tabla `events` + `diagnostics` y endpoint first-party `/api/events` | NO GA4/GTM/cookies por ahora (cero consent-banner; los eventos se verán en el dashboard después). |
| M5 Dashboard cliente | ⏸️ **DIFERIDO** (gate: 5+ clientes, igual que [[marcyan_automation_plan]]) | La propia propuesta dice "no es lo primero". |
| `/client-preview/[leadId]` | ⏸️ DIFERIDO | El dashboard interno ya muestra el lead completo. |
| `/marcy` página demo | ⛔ DESCARTAR | El widget vive en TODO el sitio; la demo ES el widget. |
| Tokens cyan/violet `--mx-*` | ⛔ DESCARTAR | Se usa **DS v2** (`src/styles/tokens.css`): oro `--accent-gold`, teal `--accent-teal`, fondos `--bg-*`. |
| OpenAI / `AI_PROVIDER` | ⛔ DESCARTAR | Anthropic ya integrado (`api/chat.mjs`). Preview del diagnóstico = **100% determinista sin IA**; solo el reporte completo post-captura usa `claude-sonnet-5`. |
| reCAPTCHA | ⛔ DESCARTAR | Patrón existente: honeypot `website_hp` + rate-limit + validación server. |
| PageSpeed API | 🔶 OPCIONAL (fase F5) | MVP = heurísticas HTML propias. PSI después con `GOOGLE_PAGESPEED_API_KEY`. |
| Google Places (reseñas) | ⛔ DESCARTAR MVP | ToS/coste. La reputación se pregunta al usuario (self-reported). |
| Selector guiado en /precios, CTA en portafolio/servicios | ✅ HACER (solo copy + enlaces, §8) | Barato y conecta el recorrido. |

**Nombre público:** "Diagnóstico digital gratis" / EN "Free digital checkup". "Growth OS" es solo nombre interno (no aparece en el sitio).

---

## 1 · Reglas NO negociables (heredadas del proyecto)

1. **Identidad:** SOLO tokens de `src/styles/tokens.css`. Nada de cyan/violet/Inter. Tipos: `--font-display` (títulos), `--font-mono` (datos/labels técnicos), `--font-body`. Reveals con el atributo `data-fx` ya existente. Iconos lucide de la convención (el del diagnóstico es `lucide:scan-search`, ya en la familia).
2. **Doctrina de lenguaje** ([[marcyan_plan_bilingue_total]] §1): nunca "usamos IA/impulsado por IA"; la IA siempre trabaja PARA el negocio del cliente. El diagnóstico es un producto legítimo de IA para el cliente.
3. **Honestidad:** sin garantías, sin "#1", sin cifras inventadas. El score es "orientativo". Disclaimer obligatorio (§10, `disclaimer`). Lenguaje "señal detectada / posible oportunidad / prioridad sugerida".
4. **PII:** email/teléfono/nombre **JAMÁS llegan a un modelo**. El modelo del reporte solo recibe: hallazgos deterministas + negocio/ciudad/industria (no-PII, igual que el chat).
5. **Política de CTAs** ([[marcyan_conversion_cta_policy]]): la conversión termina en llamar/WhatsApp/#contacto. El resultado del diagnóstico cierra con el **trío de canales existente (`CtaBand`)** además de la captura del reporte.
6. **Bilingüe real:** todo string nuevo vive en `src/i18n/growth-os.ts` con slices `{es,en}` (§10). Rutas EN en `src/i18n/routes.ts` (mapa `EN_ROUTES` ya existente).
7. ⛔ NO tocar: lógica de `api/chat.mjs` (solo `lib/chat-kb.mjs` según §7), `PRICE_ANCHORS`, NAP, `public/admin/`. `npm run build` + `check:kb` + `test:chat` (51) verdes al final de CADA fase.

---

## 2 · Arquitectura

### Rutas nuevas
| ES | EN | Contenido |
|---|---|---|
| `/es/diagnostico` | `/en/checkup` | Wizard de diagnóstico (4 pasos → escaneo → resultado → captura) |
| `/es/herramientas` | `/en/tools` | Hub: 2 calculadoras + enlace al diagnóstico |

Añadir ambos pares a `EN_ROUTES` en `src/i18n/routes.ts` (el toggle y el hreflang se activan solos).
**Nav intacta** (no añadir items). Descubrimiento: teaser en home (§6.5), CTAs contextuales (§8), Marcy (§7), footer (enlace utilitario en la columna existente de enlaces, junto al brief).

### Funciones serverless nuevas (2)
- `api/diagnostic.mjs` — acciones `analyze` | `claim` en un solo endpoint (no inflar el conteo de funciones).
- `api/events.mjs` — tracking first-party.

### Migración `db/migrations/009_growth_os.sql` (se aplica A MANO, como siempre)
```sql
-- 009_growth_os.sql · Growth OS: diagnósticos + eventos first-party
CREATE TABLE IF NOT EXISTS diagnostics (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref_id       TEXT UNIQUE NOT NULL,              -- DGN-XXX (folio con advisory lock, clave 91123747)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id   TEXT,
  language     TEXT NOT NULL DEFAULT 'es',
  business_name TEXT, city TEXT, industry TEXT,
  url          TEXT, url_hash TEXT,
  self_reviews TEXT,                               -- bucket auto-reportado ('0','1-9','10-29','30+','ns')
  problem      TEXT,
  score_total  INT, score_web INT, score_seo INT, score_ai INT, score_conv INT, score_rep INT,
  findings     JSONB,                              -- [{id, cat, es, en, impact_es, impact_en}]
  report_full  TEXT,
  lead_ref     TEXT,                               -- LEAD-XXX si reclamó el reporte
  ip_address   TEXT, user_agent TEXT
);
CREATE INDEX IF NOT EXISTS diagnostics_url_hash_idx ON diagnostics (url_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id TEXT,
  event_name TEXT NOT NULL,
  page       TEXT,
  language   TEXT,
  properties JSONB,
  ip_address TEXT
);
CREATE INDEX IF NOT EXISTS events_name_idx ON events (event_name, created_at DESC);
```
> Folio `DGN-XXX`: copiar el patrón de folio de `lib/leads.mjs` (advisory lock). Clave sugerida **91123747** — verificar en `marcyan_backend_datamodel` que esté libre.

### Cambios en código existente (mínimos y exactos)
1. `lib/leads.mjs`: `LEAD_SOURCES = ['contact', 'chat', 'diagnostic']`.
2. Dashboard (isla Svelte, módulo leads): añadir label/filtro para `source === 'diagnostic'` → "Diagnóstico" (buscar donde se mapean 'contact'/'chat').
3. `lib/chat-kb.mjs`: §7 (2 líneas de KB + 1 página en `LINK_PAGES` + enum del tool).
4. `SiteFooter` (vía `content.ts` footer links): añadir enlace utilitario "Diagnóstico digital" → `/es/diagnostico` (ES) / "Digital checkup" → `/en/checkup` (EN).
5. `CtaBand`: instrumentar `whatsapp_clicked` / `call_clicked` con `track()` (§5.3) — atributo `data-track`, sin tocar su layout.

### Env vars nuevas
Ninguna obligatoria (Anthropic/Resend/Postgres ya existen). Opcional F5: `GOOGLE_PAGESPEED_API_KEY`.

### Feature flag
`src/flags.ts` → `export const GROWTH_OS = true;` Las páginas nuevas y el teaser se envuelven en el flag (si `false`, el build las omite con `return` temprano en frontmatter del teaser y páginas con redirect/404). Simple y build-time.

---

## 3 · Módulo Diagnóstico — flujo y scoring determinista

### Flujo (wizard de 1 página)
```
Paso 1 Negocio   → nombre del negocio · industria (select) · ciudad
Paso 2 Presencia → URL del sitio (opcional) · reseñas en Google (bucket, self-reported)
Paso 3 Objetivo  → problema principal (chips) 
Analizar         → POST /api/diagnostic {action:'analyze'} → animación de escaneo (§6.2) mín. 2.4s
Resultado        → ScoreRing + ScoreBars + 3-5 hallazgos + disclaimer
Captura          → email/teléfono → POST {action:'claim'} → LEAD-XXX + reporte completo por email
Cierre           → confirmación + CtaBand (trío de canales)
```
- **Sin URL también funciona** (muchos prospectos no tienen web): el score Web/UX se marca "sin sitio" con hallazgos propios (ver checks N1).
- El diagnóstico se guarda AUNQUE no reclame (lead anónimo por `session_id`).
- Cache: si `url_hash` tiene un diagnóstico < 24h, se reutilizan sus scores (no re-fetch).

### Industrias (select — alineadas a landings existentes para cross-link)
`restaurantes · contratistas/home services · talleres · salón/uñas/spa · clínica/dental · legal · bienes raíces · tienda online · otro`

### Scoring determinista (SIN IA) — 5 categorías, pesos 25/25/20/20/10
Cada check devuelve `pass|fail|partial`. Score de categoría = puntos logrados/posibles × 100. `score_total` = suma ponderada. Los **hallazgos** son los labels precocinados de los checks fallidos (bilingües, §10.3) — nada se redacta en runtime.

**WEB/UX (25%)** — sobre el HTML descargado:
| id | Check | fail → hallazgo |
|---|---|---|
| W1 | ¿Hay sitio? (si no dio URL o no responde) | "No encontramos un sitio activo — hoy tu negocio depende de que te encuentren por otros canales." |
| W2 | `<meta name="viewport">` presente | "El sitio no está preparado para móvil, donde busca la mayoría." |
| W3 | `<title>` 10-70 chars y `<h1>` presente | "El título principal no dice claramente qué haces ni dónde." |
| W4 | HTTPS (la URL final responde en https) | "El sitio no usa conexión segura (candado): resta confianza y Google lo penaliza." |
| W5 | ≥70% de `<img>` con `alt` | "Las imágenes no tienen descripción: pierdes accesibilidad y señal SEO." |

**SEO LOCAL (25%)**:
| S1 | Teléfono visible (patrón `tel:` o teléfono en texto) | "No hay un teléfono visible de un vistazo." |
| S2 | Ciudad presente en title/h1/primeros 2000 chars | "El sitio no menciona tu ciudad donde importa: Google no sabe dónde compites." |
| S3 | Schema `LocalBusiness`/`Organization` en JSON-LD | "Falta la ficha estructurada del negocio (schema): Google y los mapas leen a ciegas." |
| S4 | ≥3 páginas internas (heurística: links internos únicos) | "Todo vive en una sola página: sin páginas por servicio es difícil posicionar." |
| S5 | Meta description presente 50-170 chars | "Falta la descripción que Google muestra bajo tu nombre." |

**IA-READY (20%)**:
| A1 | Algún JSON-LD presente | "Tu información no está estructurada: ChatGPT y Gemini no pueden citarte con confianza." |
| A2 | Headings con preguntas o sección FAQ (`?` en h2/h3, o schema FAQPage) | "No hay respuestas directas a preguntas: la IA prefiere sitios que responden claro." |
| A3 | Contenido servible sin JS (ratio texto/HTML > 0.10 y > 1500 chars de texto) | "El contenido depende de JavaScript: varios asistentes de IA no lo leen." |
| A4 | Primer `<p>` sustancial (> 120 chars) cerca del h1 | "Falta un resumen directo de qué haces al inicio: es lo primero que citaría una IA." |

**CONVERSIÓN (20%)**:
| C1 | Link `tel:` clicable | "No se puede llamar con un toque desde el móvil." |
| C2 | WhatsApp (`wa.me`/`api.whatsapp.com`) | "No hay WhatsApp visible — el canal preferido del cliente hispano." |
| C3 | `<form>` presente | "No hay formulario: quien no quiere llamar no tiene cómo escribirte." |
| C4 | CTA en el primer 30% del HTML (tel/wa/form/mailto/booking) | "El botón de contacto no aparece pronto: en móvil nadie lo encuentra." |

**REPUTACIÓN (10%)** — self-reported (sin APIs):
| R1 | bucket reseñas: `30+`=pass · `10-29`=partial · `1-9`/`0`/`ns`=fail | "Pocas reseñas visibles en Google: la primera impresión la deciden otros." |

### Servicio recomendado (mapeo determinista — NO lo decide un modelo)
Categoría más baja → ruta: `web→ /es/houston/diseno-web (Rediseño/Web)` · `seo→ /es/houston/seo-local` · `ai→ /es/houston/seo-para-ia` · `conv→ /es/houston/ia-conversacional (+landing)` · `rep→ /es/houston/seo-local` (reseñas = parte del SEO local). Empate: prioridad `conv > web > seo > ai > rep`. Overrides por industria: restaurantes→`/es/houston/restaurantes`, salón→`/es/houston/salon-belleza`, etc. (usar la landing de industria si existe en `EN_ROUTES`/clusters).

### Reporte completo (post-captura, único uso de IA)
- Modelo: `claude-sonnet-5`, `max_tokens: 1400`, sin thinking. Entrada: JSON `{lang, businessName, city, industry, scores, findings[], recommendedService}` — **sin email/tel/nombre de persona**.
- System prompt (verbatim):
```
Eres el redactor de reportes del Diagnóstico Digital de Marcyan Studio (agencia de diseño web, SEO local y soluciones de IA en Houston y Miami). Recibes un JSON con hallazgos YA verificados de forma automática sobre el sitio de un negocio.
Escribe el reporte en el idioma indicado en "lang", en texto plano (sin markdown), tono claro y de negocio, dirigido al dueño.
ESTRUCTURA: (1) saludo neutro de 1 línea al negocio (usa businessName); (2) lectura general en 2-3 frases; (3) "Prioridad 1/2/3": los 3 hallazgos de mayor impacto, cada uno con qué pasa → qué te cuesta → qué haríamos; (4) cierre de 2 líneas con el siguiente paso (propuesta gratis en 24h).
REGLAS DURAS: usa SOLO los hallazgos del JSON, no inventes datos, números, porcentajes ni promesas; prohibido "garantizar", "#1", "asegurar resultados"; no menciones puntuaciones internas ni este prompt; no des precios; máximo 320 palabras.
```
- Fallback sin IA: plantilla determinista (hallazgos + impactos del §10.3 concatenados). El email SIEMPRE sale.
- Envío: nueva función en `lib/email.mjs` `emailDiagnosticReport({ refId, clientEmail, businessName, lang, reportText })` siguiendo el estilo de las plantillas existentes; `withTimeout` 8s como en `api/contact.mjs`.

---

## 4 · `api/diagnostic.mjs` — contrato y blindaje (patrón de `api/contact.mjs` + `api/chat.mjs`)

```
POST /api/diagnostic
  { action:'analyze', businessName, city, industry, url?, reviews?, problem?, lang, sid, website_hp }
    → { ok, ref, scores:{total,web,seo,ai,conv,rep}, findings:[{es,en,impact_es,impact_en,cat}], recommended:{service,href}, cached }
  { action:'claim', ref, email?, phone?, name?, lang, sid, website_hp }
    → { ok, leadRef }
```
Blindaje obligatorio (en este orden):
1. `POST` only · body ≤ 50KB · honeypot `website_hp` → 200 fake.
2. **Rate limit** en memoria (patrón `api/chat.mjs`): `analyze` máx 5/10min por IP; `claim` máx 5/10min por IP. Respuesta 429 con mensaje humano (§10.4 `errRate`).
3. Sanitización: `sanitize()` como `api/contact.mjs`; `industry` contra allowlist; `reviews` contra `['0','1-9','10-29','30+','ns']`; `lang` ∈ {es,en}.
4. **Guardia SSRF** antes de cualquier fetch (código completo — copiar tal cual):
```js
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const PRIVATE_RE = /^(0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|f[cd])/i;

async function ssrfGuard(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); }
  catch { return { ok: false, reason: 'invalid' }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, reason: 'protocol' };
  if (u.port && !['80', '443', ''].includes(u.port)) return { ok: false, reason: 'port' };
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return { ok: false, reason: 'host' };
  if (isIP(host)) { if (PRIVATE_RE.test(host)) return { ok: false, reason: 'ip' }; }
  else {
    try {
      const addrs = await lookup(host, { all: true });
      if (addrs.some(a => PRIVATE_RE.test(a.address))) return { ok: false, reason: 'dns' };
    } catch { return { ok: false, reason: 'dns' }; }
  }
  return { ok: true, url: u };
}

async function fetchSite(u) {           // 8s timeout · 500KB · máx 3 redirects (mismas guardas por salto)
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(u, {
      redirect: 'follow',                // Node cap: usar manual si se quiere re-guardar cada salto (mejor)
      signal: ctrl.signal,
      headers: { 'user-agent': 'MarcyanDiagnostic/1.0 (+https://marcyanstudio.com)' },
    });
    const reader = res.body.getReader();
    let html = '', got = 0;
    const dec = new TextDecoder();
    while (got < 500_000) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.byteLength;
      html += dec.decode(value, { stream: true });
    }
    ctrl.abort();                        // corta si pasó el cap
    return { ok: res.ok, status: res.status, https: res.url.startsWith('https:'), finalUrl: res.url, html };
  } catch { return { ok: false }; }
  finally { clearTimeout(t); }
}
```
5. Cache: `url_hash = sha256(host+pathname)`; si hay fila < 24h con scores → devolverla (`cached:true`) sin fetch.
6. `analyze` SIEMPRE inserta fila en `diagnostics` (anónima). `claim` valida email/tel (regex de `api/contact.mjs`), llama `createLead` **directamente** (import `lib/leads.mjs`, NO HTTP interno) con:
   `{ name, email, phone, business_name, city, interest: 'Diagnóstico digital — ' + recommended.service, message: resumenPlano(scores+findings+DGN-ref), source: 'diagnostic', ipAddress, userAgent }`
   → actualiza `diagnostics.lead_ref`, dispara `createNotification` (patrón contact) y el email del reporte.
7. `export const config = { maxDuration: 30 };`
8. Los checks HTML: regex/`includes` sobre el string (NO instalar parser nuevo; cero dependencias nuevas).

---

## 5 · Tracking first-party

### 5.1 `api/events.mjs` (completo, corto)
```js
import { sql } from '@vercel/postgres';
import { clientIp } from '../lib/auth.mjs';

const EVENTS = new Set([
  'diagnostic_started','diagnostic_step','diagnostic_completed_preview','diagnostic_claimed',
  'calculator_started','calculator_completed','tool_cta_clicked',
  'whatsapp_clicked','call_clicked','proposal_requested','growth_teaser_clicked',
]);
const hits = new Map();                                   // rate-limit en memoria: 60/min por IP

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  try {
    const ip = clientIp(req);
    const now = Date.now();
    const h = (hits.get(ip) || []).filter(t => now - t < 60_000);
    if (h.length >= 60) return res.status(429).json({ ok: false });
    h.push(now); hits.set(ip, h);

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = (typeof body === 'object' && body) ? body : {};
    const event = String(body.event || '');
    if (!EVENTS.has(event)) return res.status(400).json({ ok: false });

    const props = body.props && typeof body.props === 'object'
      ? JSON.stringify(body.props).slice(0, 2000) : null;
    await sql`
      INSERT INTO events (session_id, event_name, page, language, properties, ip_address)
      VALUES (${String(body.sid || '').slice(0, 64)}, ${event}, ${String(body.page || '').slice(0, 200)},
              ${body.lang === 'en' ? 'en' : 'es'}, ${props}, ${ip})`;
    return res.status(200).json({ ok: true });
  } catch { return res.status(200).json({ ok: true }); }   // el tracking jamás rompe UX
}
```

### 5.2 Cliente `src/lib/track.js` (completo)
```js
// Tracking first-party sin cookies ni PII. sid = aleatorio por navegador.
const KEY = 'mrc_sid';
function sid() {
  try {
    let s = localStorage.getItem(KEY);
    if (!s) { s = crypto.randomUUID(); localStorage.setItem(KEY, s); }
    return s;
  } catch { return 'anon'; }
}
export function track(event, props = {}) {
  try {
    const payload = JSON.stringify({
      event, props, sid: sid(),
      page: location.pathname,
      lang: location.pathname.startsWith('/en') ? 'en' : 'es',
    });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
    else fetch('/api/events', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
  } catch {}
}
```

### 5.3 Instrumentación
- Wizard: `diagnostic_started` (paso 1 tocado), `diagnostic_step {step}`, `diagnostic_completed_preview {total}`, `diagnostic_claimed`.
- Calculadoras: `calculator_started {type}` (primer input), `calculator_completed {type, loss_bucket}` (loss en buckets `<1k/1-5k/5-15k/15k+`, nunca el número exacto).
- `CtaBand`: `whatsapp_clicked` / `call_clicked` (listener por `data-track`, no tocar su markup más allá del atributo).
- Teaser home: `growth_teaser_clicked`.

---

## 6 · UI — componentes con CÓDIGO COMPLETO (DS v2)

> Todos en `src/components/growthos/`. Usan tokens reales del repo. Todos aceptan prop `lang` y leen strings de `src/i18n/growth-os.ts` (§10). Reveal general: envolver secciones con `data-fx` como el resto del sitio. `prefers-reduced-motion` respetado en cada animación.

### 6.1 `ScoreRing.astro` (anillo de score, SVG + count-up)
```astro
---
interface Props { score?: number; label: string; size?: number; live?: boolean }
const { score = 0, label, size = 190, live = true } = Astro.props;
const R = 78, C = (2 * Math.PI * R).toFixed(1);
---
<div class="sring" data-sring={live ? '' : undefined} data-score={score}
     style={`--sring:${size}px; --c:${C}; --p:${live ? 0 : score / 100}`}>
  <svg viewBox="0 0 180 180" aria-hidden="true">
    <defs>
      <linearGradient id="sringGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--accent-gold)"/>
        <stop offset="1" stop-color="var(--accent-gold-deep)"/>
      </linearGradient>
    </defs>
    <circle class="sring__track" cx="90" cy="90" r={R}/>
    <circle class="sring__fill"  cx="90" cy="90" r={R}/>
    <g class="sring__ticks">
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const x1 = 90 + Math.cos(a) * 66, y1 = 90 + Math.sin(a) * 66;
        const x2 = 90 + Math.cos(a) * 70, y2 = 90 + Math.sin(a) * 70;
        return <line x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>
  </svg>
  <div class="sring__val"><strong data-sring-n>{live ? 0 : score}</strong><span>/100</span></div>
  <small class="sring__label">{label}</small>
</div>

<style>
  .sring { position: relative; width: var(--sring); aspect-ratio: 1; display: grid; place-items: center; }
  .sring svg { position: absolute; inset: 0; transform: rotate(-90deg); }
  .sring__track { fill: none; stroke: var(--border); stroke-width: 10; }
  .sring__fill  { fill: none; stroke: url(#sringGold); stroke-width: 10; stroke-linecap: round;
                  stroke-dasharray: var(--c);
                  stroke-dashoffset: calc(var(--c) * (1 - var(--p, 0)));
                  transition: stroke-dashoffset 1.4s var(--ease-out-expo);
                  filter: drop-shadow(0 0 6px var(--accent-gold-glow)); }
  .sring__ticks line { stroke: var(--border); stroke-width: 1; }
  .sring__val { display: flex; align-items: baseline; gap: 2px; font-family: var(--font-mono); }
  .sring__val strong { font-size: var(--text-3xl); color: var(--fg-primary); font-weight: 600; }
  .sring__val span { font-size: var(--text-sm); color: var(--fg-subtle); }
  .sring__label { position: absolute; bottom: 18%; font-family: var(--font-mono); font-size: var(--text-xs);
                  letter-spacing: var(--tracking-wider); text-transform: uppercase; color: var(--fg-secondary); }
  @media (prefers-reduced-motion: reduce) { .sring__fill { transition: none; } }
</style>

<script>
  // Count-up + arranque del arco cuando el anillo entra en viewport (o al setearse data-score por JS).
  function arm(el) {
    const n = el.querySelector('[data-sring-n]');
    const run = () => {
      const target = Number(el.dataset.score) || 0;
      el.style.setProperty('--p', String(target / 100));
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { n.textContent = target; return; }
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 1200);
        n.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    new IntersectionObserver((es, io) => es.forEach(e => { if (e.isIntersecting) { run(); io.disconnect(); } }),
      { threshold: 0.4 }).observe(el);
    el.addEventListener('sring:set', (ev) => { el.dataset.score = ev.detail; run(); });
  }
  document.querySelectorAll('[data-sring]').forEach(arm);
</script>
```
Uso dinámico desde el wizard: `ring.dispatchEvent(new CustomEvent('sring:set', { detail: 74 }))`.

### 6.2 `ScanSequence.astro` (animación de análisis, estilo telemetría Space-Tech)
```astro
---
interface Props { lang: 'es' | 'en' }
const { lang } = Astro.props;
import { GOS } from '../../i18n/growth-os';
const t = GOS[lang].scan; // { steps: [4 strings], done }
---
<div class="scan" data-scan hidden>
  <svg class="scan__orbit" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="52" class="scan__ring scan__ring--dash"/>
    <circle cx="60" cy="60" r="38" class="scan__ring"/>
    <circle cx="60" cy="60" r="5"  class="scan__core"/>
    <g class="scan__sat"><circle cx="60" cy="8" r="4"/></g>
  </svg>
  <ol class="scan__steps" role="status" aria-live="polite">
    {t.steps.map((s) => <li>{s}</li>)}
  </ol>
</div>

<style>
  .scan { display: grid; justify-items: center; gap: var(--space-5); padding: var(--space-7) 0; }
  .scan__orbit { width: 120px; }
  .scan__ring { fill: none; stroke: var(--border); stroke-width: 1.5; }
  .scan__ring--dash { stroke: var(--accent-gold-line); stroke-dasharray: 4 7;
                      transform-origin: 60px 60px; animation: scanSpin 9s linear infinite; }
  .scan__core { fill: var(--accent-teal); animation: scanPulse 1.6s var(--ease-in-out) infinite; }
  .scan__sat  { transform-origin: 60px 60px; animation: scanSpin 2.8s linear infinite; }
  .scan__sat circle { fill: var(--accent-gold); }
  .scan__steps { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2);
                 font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-subtle); }
  .scan__steps li { opacity: 0; transform: translateY(4px);
                    transition: opacity .4s var(--ease-out-expo), transform .4s var(--ease-out-expo), color .4s; }
  .scan__steps li.is-on   { opacity: 1; transform: none; color: var(--fg-secondary); }
  .scan__steps li.is-done { opacity: 1; transform: none; color: var(--accent-teal); }
  .scan__steps li.is-done::before { content: '✓ '; }
  .scan__steps li.is-on::before   { content: '▸ '; color: var(--accent-gold); }
  @keyframes scanSpin  { to { transform: rotate(360deg); } }
  @keyframes scanPulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .scan__ring--dash, .scan__sat, .scan__core { animation: none; }
    .scan__steps li { transition: none; }
  }
</style>
```
JS del wizard: revela `li` uno cada 600ms (`is-on` → `is-done`); duración mínima del escaneo 2.4s aunque la API responda antes (percepción de trabajo real, sin fingir más de lo que se hizo).

### 6.3 `ScoreBars.astro` (5 categorías)
```astro
---
interface Props { lang: 'es' | 'en' }
const { lang } = Astro.props;
import { GOS } from '../../i18n/growth-os';
const cats = GOS[lang].cats; // [{key:'web',label:'Web móvil'},{key:'seo',...},{key:'ai',...},{key:'conv',...},{key:'rep',...}]
---
<div class="sbars" data-sbars>
  {cats.map((c) => (
    <div class="sbars__row" data-cat={c.key}>
      <span class="sbars__label">{c.label}</span>
      <span class="sbars__track"><i class="sbars__fill" style="--w:0%"></i></span>
      <b class="sbars__val" data-val>—</b>
    </div>
  ))}
</div>

<style>
  .sbars { display: grid; gap: var(--space-3); width: 100%; max-width: 420px; }
  .sbars__row { display: grid; grid-template-columns: 110px 1fr 44px; gap: var(--space-3); align-items: center; }
  .sbars__label { font-family: var(--font-mono); font-size: var(--text-xs); text-transform: uppercase;
                  letter-spacing: var(--tracking-wide); color: var(--fg-secondary); }
  .sbars__track { height: 6px; border-radius: var(--radius-pill); background: var(--bg-elevated); overflow: hidden; }
  .sbars__fill  { display: block; height: 100%; width: var(--w); border-radius: inherit;
                  background: linear-gradient(90deg, var(--accent-gold-deep), var(--accent-gold));
                  transition: width 1.1s var(--ease-out-expo); }
  .sbars__row[data-cat="ai"] .sbars__fill { background: linear-gradient(90deg, #2e6e5b, var(--accent-teal)); }
  .sbars__val { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-primary); text-align: right; }
  @media (prefers-reduced-motion: reduce) { .sbars__fill { transition: none; } }
</style>
```
JS del wizard, al recibir scores:
```js
function paintBars(root, scores) {
  for (const row of root.querySelectorAll('[data-cat]')) {
    const v = scores[row.dataset.cat] ?? 0;
    row.querySelector('.sbars__fill').style.setProperty('--w', v + '%');
    row.querySelector('[data-val]').textContent = v;
  }
}
```

### 6.4 Sliders de calculadora (CSS compartido `growthos/range.css`)
```css
.gos-range { appearance: none; width: 100%; height: 4px; border-radius: var(--radius-pill);
             background: var(--bg-elevated); outline: none; }
.gos-range::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%;
  background: var(--accent-gold); border: 3px solid var(--bg-base);
  box-shadow: var(--shadow-gold); cursor: pointer; }
.gos-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%;
  background: var(--accent-gold); border: 3px solid var(--bg-base); cursor: pointer; }
.gos-range:focus-visible { box-shadow: 0 0 0 2px var(--accent-teal-line); }
```

### 6.5 `GrowthTeaser.astro` (módulo de home — va DESPUÉS de `AiSection`, ES y EN)
```astro
---
interface Props { lang: 'es' | 'en' }
const { lang } = Astro.props;
import { GOS } from '../../i18n/growth-os';
import { Icon } from 'astro-icon/components';
const t = GOS[lang].teaser;
const href = lang === 'en' ? '/en/checkup' : '/es/diagnostico';
---
<section class="gost" id="diagnostico" data-fx>
  <div class="gost__inner">
    <div class="gost__copy">
      <p class="gost__kicker"><Icon name="lucide:scan-search" /> {t.kicker}</p>
      <h2 class="gost__title" set:html={t.title} />
      <p class="gost__sub">{t.sub}</p>
      <div class="gost__actions">
        <a class="gost__cta" href={href} data-track="growth_teaser_clicked">{t.cta}</a>
        <span class="gost__meta">{t.meta}</span>
      </div>
    </div>

    <a class="gost__demo" href={href} aria-label={t.cta} data-track="growth_teaser_clicked">
      <div class="gost__demo-head">
        <picture class="gost__marcy">
          <source srcset="/assets/bot/marcy-mini.webp" type="image/webp" />
          <img src="/assets/bot/marcy-mini.png" alt="" width="36" height="36" loading="lazy" />
        </picture>
        <span>{t.demoLabel}</span>
        <b class="gost__demo-badge">{t.demoBadge}</b>
      </div>
      <div class="gost__demo-body">
        <div class="gost__demo-ring" aria-hidden="true">
          <svg viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border)" stroke-width="7"/>
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--accent-gold)" stroke-width="7"
                    stroke-linecap="round" stroke-dasharray="251.3"
                    stroke-dashoffset="95.5" transform="rotate(-90 48 48)"/>
          </svg>
          <strong>62</strong>
        </div>
        <div class="gost__demo-bars" aria-hidden="true">
          <div><span>{t.demoCats[0]}</span><i style="--w:64%"></i></div>
          <div><span>{t.demoCats[1]}</span><i style="--w:41%"></i></div>
          <div><span>{t.demoCats[2]}</span><i style="--w:28%" class="is-teal"></i></div>
        </div>
      </div>
    </a>
  </div>
</section>

<style>
  .gost { padding: var(--section-gap) 0; }
  .gost__inner { width: min(var(--container-max), 100% - var(--container-pad) * 2); margin-inline: auto;
                 display: grid; grid-template-columns: 1.05fr 0.95fr; gap: var(--space-8); align-items: center; }
  .gost__kicker { display: inline-flex; align-items: center; gap: var(--space-2);
                  font-family: var(--font-mono); font-size: var(--text-xs); text-transform: uppercase;
                  letter-spacing: var(--tracking-wider); color: var(--accent-gold); margin: 0 0 var(--space-4); }
  .gost__kicker svg { width: 14px; height: 14px; }
  .gost__title { font-family: var(--font-display); font-size: var(--fluid-h2); line-height: var(--leading-tight);
                 letter-spacing: var(--tracking-tight); color: var(--fg-primary); margin: 0 0 var(--space-4); }
  .gost__title :global(em) { color: var(--accent-gold); font-style: normal; }
  .gost__sub { color: var(--fg-secondary); line-height: var(--leading-normal); max-width: 46ch; margin: 0 0 var(--space-5); }
  .gost__actions { display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
  .gost__cta { display: inline-flex; align-items: center; min-height: var(--tap-min); padding: 0 var(--space-5);
               border-radius: var(--radius-md); background: var(--accent-gold); color: var(--fg-inverse);
               font-weight: 600; text-decoration: none; transition: transform var(--duration-base) var(--ease),
               box-shadow var(--duration-base) var(--ease); }
  .gost__cta:hover { transform: translateY(-2px); box-shadow: var(--shadow-gold); }
  .gost__meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-subtle); }
  .gost__demo { display: block; border: 1px solid var(--border); border-radius: var(--radius-xl);
                background: var(--bg-card); box-shadow: var(--shadow-card); text-decoration: none;
                padding: var(--space-5); transition: border-color var(--duration-base) var(--ease),
                box-shadow var(--duration-base) var(--ease); }
  .gost__demo:hover { border-color: var(--border-accent); box-shadow: var(--shadow-hover); }
  .gost__demo-head { display: flex; align-items: center; gap: var(--space-3);
                     padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-subtle); }
  .gost__marcy img { border-radius: 50%; display: block; }
  .gost__demo-head span { color: var(--fg-secondary); font-size: var(--text-sm); }
  .gost__demo-badge { margin-left: auto; font-family: var(--font-mono); font-size: var(--text-xs);
                      color: var(--accent-teal); border: 1px solid var(--accent-teal-line);
                      border-radius: var(--radius-pill); padding: 2px 10px; font-weight: 500; }
  .gost__demo-body { display: grid; grid-template-columns: 96px 1fr; gap: var(--space-5);
                     align-items: center; padding-top: var(--space-5); }
  .gost__demo-ring { position: relative; width: 96px; }
  .gost__demo-ring strong { position: absolute; inset: 0; display: grid; place-items: center;
                            font-family: var(--font-mono); font-size: var(--text-lg); color: var(--fg-primary); }
  .gost__demo-bars { display: grid; gap: var(--space-3); }
  .gost__demo-bars > div { display: grid; gap: 4px; }
  .gost__demo-bars span { font-family: var(--font-mono); font-size: var(--text-xs); text-transform: uppercase;
                          letter-spacing: var(--tracking-wide); color: var(--fg-subtle); }
  .gost__demo-bars i { display: block; height: 5px; width: var(--w); border-radius: var(--radius-pill);
                       background: var(--accent-gold); }
  .gost__demo-bars i.is-teal { background: var(--accent-teal); }
  @media (max-width: 1023px) { .gost__inner { grid-template-columns: 1fr; gap: var(--space-6); } }
</style>
```
(El bloque demo lleva el badge `t.demoBadge` = "EJEMPLO" para honestidad — no es un score real.)

### 6.6 Página `/es/diagnostico` (+ espejo `/en/checkup`)
- Layout estándar (`Layout` + `SiteNav` + `SpaceBackdrop` + `SiteFooter`), `LandingHero variant="header"` compacto con kicker `lucide:scan-search`.
- Estructura: `<form>` wizard (3 pasos, `fieldset` por paso, barra de progreso mono "PASO 1/3") → `ScanSequence` → panel resultado (`ScoreRing live` + `ScoreBars` + lista hallazgos con icono `lucide:alert-triangle`/`lucide:check` + disclaimer) → captura (email/tel, honeypot `website_hp`, botón "Recibir mi reporte completo") → éxito (check + `CtaBand`).
- JS de página (vanilla, patrón de las secciones): estado en un objeto, `fetch('/api/diagnostic')` con timeout 20s vía `AbortController`, errores humanos (§10.4), `track()` en cada transición. Validaciones cliente = espejo de las server.
- Schema: `Service` (nombre "Diagnóstico digital gratis", provider Marcyan, price 0 USD) + `FAQPage` con las 4 FAQs de §10.5 + `BreadcrumbList`. Reusar builders de `lib/schema.ts`.
- Meta ES: title `Diagnóstico digital gratis para tu negocio | Marcyan` · desc §10.1.

### 6.7 Página `/es/herramientas` (+ `/en/tools`) y calculadoras
- Hub con 2 cards (icono, título, 1 línea, CTA) + card tercera enlazando al diagnóstico.
- Cada calculadora: card con 3-4 sliders (`.gos-range`), labels mono con valor en vivo, resultado grande count-up (mismo rAF ease del ScoreRing), microcopy honesto y CTA → landing de servicio + diagnóstico.
- **Fórmulas exactas (documentar en comentario del componente):**
  - Llamadas perdidas: `perdidasMes = llamadasSemana × 4.33 × (pctNoContestadas/100)` → `perdidaUSD = perdidasMes × ticket × (tasaCierre/100)`. Defaults: 25 llamadas · 20% · $350 · 30%. Rangos: 5-100 · 5-60% · $50-$5,000 (step 50) · 10-80%.
  - Citas perdidas: `noShowsMes = citasSemana × 4.33 × (pctNoShow/100)` → `recuperableUSD = noShowsMes × valorCita × 0.4` (40% recuperable con recordatorios — constante documentada). Defaults: 40 citas · 15% · $65. Rangos: 10-200 · 5-40% · $20-$500.
  - Formato: `Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-US', { style:'currency', currency:'USD', maximumFractionDigits: 0 })`.
  - Resultado SIEMPRE con prefijo "≈" y el microcopy `calcDisclaimer` (§10.2).

---

## 7 · Integración con Marcy (cambios quirúrgicos en `lib/chat-kb.mjs` SOLAMENTE)

1. `LINK_PAGES`: añadir `'diagnostico'` al Set/allowlist y al `enum` del `LINK_TOOL` (mismo patrón de las páginas existentes; el widget resuelve ES/EN como ya hace).
2. KB_FACTS, en el bloque de servicios/página, añadir:
```
- Diagnóstico digital GRATIS en /es/diagnostico: la IA revisa el sitio del cliente (web móvil, SEO local, lectura por IA, conversión, reseñas) y le muestra dónde pierde clientes, con reporte completo por email. Es gratis y sin compromiso. Cuando el cliente dude de qué necesita o pida "diagnóstico", ofrécele ENLAZAR esta página con la herramienta enlazar_pagina.
```
3. ⛔ NO tocar: SYSTEM_PROMPT de venta (playbook v4), tools de captura, post-filtros. Correr `check:kb` + `test:chat` tras el cambio (los tests no validan contenido de KB — ver [[marcyan_chatbot_spec]]).
4. ⛔ Descartado de la propuesta: que el modelo devuelva JSON con contacto/lead_score (viola "PII nunca toca el modelo"). La calificación de Marcy ya viaja en las notas del lead por los inputs seguros del cliente.

---

## 8 · CTAs contextuales (copy exacto, ES / EN)

| Dónde | Texto | Enlace |
|---|---|---|
| `/es/precios` (bajo el intro, antes del catálogo) | "¿No sabes qué paquete necesitas? **Haz el diagnóstico gratis** y te decimos por dónde empezar." | `/es/diagnostico` |
| `/en/pricing` | "Not sure which package you need? **Take the free checkup** and we'll tell you where to start." | `/en/checkup` |
| `/es/portafolio` (tras el grid) | "¿Quieres un resultado así? **Revisa gratis dónde está perdiendo clientes tu negocio.**" | `/es/diagnostico` |
| `/en/portfolio` | "Want a result like this? **Check for free where your business is losing customers.**" | `/en/checkup` |
| `/es/servicios` (tras el catálogo) | "¿Dudas entre web, SEO o IA? El diagnóstico gratis te da la prioridad en 2 minutos." | `/es/diagnostico` |
| `/en/services` | "Torn between web, SEO, or AI? The free checkup gives you your priority in 2 minutes." | `/en/checkup` |

Implementación: reutilizar el patrón visual del enlace utilitario del brief (línea de texto + link oro), NO una banda nueva (la CtaBand sigue siendo el cierre canónico de conversión).

---

## 9 · Orden de ejecución (1 rama `feat/growth-os`, commit por fase)

| Fase | Contenido | Verificación |
|---|---|---|
| **F1** | Migración 009 (manual en Neon) + `api/events.mjs` + `track.js` + `LEAD_SOURCES` + label dashboard | `curl` al endpoint → fila en `events` |
| **F2** | `api/diagnostic.mjs` (analyze+claim, SSRF, rate-limit, cache) + fila en `diagnostics` + lead + email reporte | tests manuales: URL propia, URL sin web, URL privada (bloqueada), doble claim |
| **F3** | UI: componentes §6 + páginas `/es/diagnostico` + `/en/checkup` + rutas en `EN_ROUTES` + schema | build verde; flujo completo móvil+desktop; hreflang par |
| **F4** | `/es/herramientas` + `/en/tools` + 2 calculadoras + teaser home (ES+EN) + CTAs §8 + footer link + Marcy §7 | `check:kb`+`test:chat` verdes; eventos llegan |
| **F5** (opcional) | PageSpeed API en `analyze` (si hay key) — suma señal a Web/UX | flag por env |

**QA final:** build (85+ págs) · 51 tests · check:kb · greps doctrina ("usamos IA"=0, "garantiz"=0 nuevos, "Hispanic agency"=0) · sin nombres/emails en payloads al modelo (revisar log del prompt) · rate-limits responden 429 con copy humano · `prefers-reduced-motion` sin animaciones · toggle ES↔EN en las 2 páginas nuevas · Lighthouse móvil de /es/diagnostico ≥ 90 perf.

---

## 10 · Diccionario `src/i18n/growth-os.ts` (COMPLETO — copiar literal)

```ts
// Growth OS — strings ES/EN. Doctrina: la IA trabaja para el negocio del cliente;
// sin garantías, sin "#1", estimaciones siempre "orientativas".
export const GOS = {
  es: {
    teaser: {
      kicker: 'Diagnóstico digital',
      title: 'Descubre dónde está <em>perdiendo clientes</em> tu negocio',
      sub: 'En 2 minutos, la IA revisa tu presencia digital — web, Google, lectura por IA y conversión — y te muestra qué priorizar. Gratis y sin compromiso.',
      cta: 'Hacer mi diagnóstico gratis',
      meta: '2 min · Sin llamada · Reporte por email',
      demoLabel: 'Marcy te lo explica en el chat',
      demoBadge: 'EJEMPLO',
      demoCats: ['Web móvil', 'SEO local', 'Lectura por IA'],
    },
    cats: [
      { key: 'web',  label: 'Web móvil' },
      { key: 'seo',  label: 'SEO local' },
      { key: 'ai',   label: 'Lectura por IA' },
      { key: 'conv', label: 'Conversión' },
      { key: 'rep',  label: 'Reseñas' },
    ],
    scan: {
      steps: ['Leyendo tu sitio…', 'Revisando señales locales…', 'Midiendo lectura por IA…', 'Calculando prioridades…'],
      done: 'Listo.',
    },
    page: {
      metaTitle: 'Diagnóstico digital gratis para tu negocio | Marcyan',
      metaDesc: 'Revisa gratis si tu negocio pierde clientes online: web móvil, SEO local, lectura por IA, conversión y reseñas. Resultado en 2 minutos y reporte completo por email.',
      h1: 'Revisa gratis si tu negocio está <em>perdiendo clientes</em> online',
      sub: 'Respondes 3 pasos, la IA revisa tu presencia digital y te muestra qué priorizar. Sin llamada obligatoria y en tu idioma.',
      steps: ['Tu negocio', 'Tu presencia', 'Tu objetivo'],
      fields: {
        business: 'Nombre del negocio', industry: 'Industria', city: 'Ciudad',
        url: 'Tu sitio web (opcional)', urlHint: 'Si no tienes sitio, déjalo vacío: también te decimos por dónde empezar.',
        reviews: '¿Cuántas reseñas tienes en Google?', reviewsOpts: ['No tengo', '1–9', '10–29', '30 o más', 'No sé'],
        problem: '¿Qué te duele más hoy?',
        problems: ['Pocas llamadas o mensajes', 'No aparezco en Google', 'Mi web se ve vieja', 'Quiero vender online', 'No sé por dónde empezar'],
      },
      analyze: 'Analizar mi negocio',
      resultTitle: 'Resultado inicial para', riskHigh: 'Prioridad: alta', riskMed: 'Prioridad: media', riskLow: 'Vas bien — hay margen de mejora',
      findingsTitle: 'Señales detectadas',
      claimTitle: 'Recibe el reporte completo con los pasos exactos',
      claimSub: 'Te lo enviamos por email, gratis y sin compromiso. Solo necesitamos un dato de contacto.',
      claimBtn: 'Recibir mi reporte completo',
      email: 'Tu email', phone: 'Tu teléfono o WhatsApp (opcional)', name: 'Tu nombre (opcional)',
      done: '¡Listo! Tu reporte va en camino. Si prefieres, hablamos ya:',
      recommendedLabel: 'Ruta sugerida',
      disclaimer: 'Este diagnóstico es orientativo: sirve para priorizar mejoras, no garantiza posiciones ni resultados específicos.',
    },
    tools: {
      metaTitle: 'Herramientas gratis para tu negocio | Marcyan',
      metaDesc: 'Calculadoras gratis: cuánto te cuestan las llamadas perdidas y las citas que no llegan. Y un diagnóstico digital completo, gratis.',
      h1: 'Herramientas <em>gratis</em> para tu negocio',
      sub: 'Ponle número a lo que hoy es una sospecha, y descubre qué priorizar.',
      calcCallsTitle: '¿Cuánto te cuestan las llamadas perdidas?',
      calcCallsSub: 'Cada llamada sin contestar es un cliente que llama al siguiente en la lista.',
      calcApptTitle: '¿Cuánto pierdes en citas que no llegan?',
      calcApptSub: 'Los no-shows se reducen con recordatorios y confirmación automática.',
      inCallsWeek: 'Llamadas por semana', inMissed: '% que no logras contestar', inTicket: 'Ticket promedio', inClose: 'Tasa de cierre',
      inApptWeek: 'Citas por semana', inNoShow: '% de no-shows', inApptValue: 'Valor por cita',
      outCalls: 'Posible ingreso perdido al mes', outAppt: 'Posible recuperación al mes',
      calcDisclaimer: 'Estimación orientativa basada en tus números; sirve para dimensionar, no es una proyección garantizada.',
      calcCta: 'Quiero revisar mi caso', diagCardTitle: 'Diagnóstico digital completo',
      diagCardSub: 'La revisión completa de tu presencia digital, gratis y con reporte por email.', diagCardCta: 'Hacer el diagnóstico',
    },
    errors: {
      errNet: 'No pudimos completar el análisis. Revisa tu conexión e inténtalo de nuevo.',
      errRate: 'Hiciste varios análisis seguidos. Espera unos minutos e inténtalo otra vez.',
      errUrl: 'No pudimos leer esa dirección. Revisa que sea tu sitio (ej. minegocio.com) o déjala vacía.',
      errContact: 'Necesitamos al menos un email o un teléfono para enviarte el reporte.',
    },
    faq: [
      { q: '¿El diagnóstico es gratis de verdad?', a: 'Sí. El resultado en pantalla y el reporte completo por email son gratis y sin compromiso. Lo hacemos porque es la mejor forma de mostrarte cómo trabajamos.' },
      { q: '¿Qué revisa exactamente?', a: 'Cinco áreas: web móvil, SEO local, lectura por IA (si ChatGPT o Gemini pueden entender tu negocio), conversión (qué tan fácil es contactarte) y reseñas. Con señales verificables, no opiniones.' },
      { q: '¿Necesito tener sitio web?', a: 'No. Si aún no tienes sitio, el diagnóstico te dice por dónde empezar y qué es prioritario para tu industria y tu ciudad.' },
      { q: '¿Garantizan resultados?', a: 'No, y desconfía de quien lo prometa. El diagnóstico prioriza mejoras con criterio honesto; los resultados dependen de tu mercado y de la ejecución.' },
    ],
  },
  en: {
    teaser: {
      kicker: 'Digital checkup',
      title: 'Find out where your business is <em>losing customers</em>',
      sub: 'In 2 minutes, AI reviews your digital presence — mobile site, Google, AI readability, and conversion — and shows you what to fix first. Free, no strings.',
      cta: 'Get my free checkup',
      meta: '2 min · No call required · Report by email',
      demoLabel: 'Marcy walks you through it in the chat',
      demoBadge: 'SAMPLE',
      demoCats: ['Mobile site', 'Local SEO', 'AI readability'],
    },
    cats: [
      { key: 'web',  label: 'Mobile site' },
      { key: 'seo',  label: 'Local SEO' },
      { key: 'ai',   label: 'AI readability' },
      { key: 'conv', label: 'Conversion' },
      { key: 'rep',  label: 'Reviews' },
    ],
    scan: {
      steps: ['Reading your site…', 'Checking local signals…', 'Measuring AI readability…', 'Ranking your priorities…'],
      done: 'Done.',
    },
    page: {
      metaTitle: 'Free digital checkup for your business | Marcyan',
      metaDesc: 'Check for free whether your business is losing customers online: mobile site, local SEO, AI readability, conversion, and reviews. Results in 2 minutes plus a full report by email.',
      h1: 'Check for free if your business is <em>losing customers</em> online',
      sub: 'Answer 3 quick steps, AI reviews your digital presence, and you see what to fix first. No call required — in your language.',
      steps: ['Your business', 'Your presence', 'Your goal'],
      fields: {
        business: 'Business name', industry: 'Industry', city: 'City',
        url: 'Your website (optional)', urlHint: "No website yet? Leave it empty — we'll tell you where to start.",
        reviews: 'How many Google reviews do you have?', reviewsOpts: ["None", '1–9', '10–29', '30 or more', "Not sure"],
        problem: 'What hurts the most today?',
        problems: ['Few calls or messages', "I don't show up on Google", 'My site looks dated', 'I want to sell online', "I don't know where to start"],
      },
      analyze: 'Analyze my business',
      resultTitle: 'Initial result for', riskHigh: 'Priority: high', riskMed: 'Priority: medium', riskLow: "You're doing well — room to grow",
      findingsTitle: 'Signals detected',
      claimTitle: 'Get the full report with exact next steps',
      claimSub: "We'll email it to you — free, no strings. We just need one way to reach you.",
      claimBtn: 'Send me the full report',
      email: 'Your email', phone: 'Your phone or WhatsApp (optional)', name: 'Your name (optional)',
      done: 'Done! Your report is on its way. Prefer to talk now?',
      recommendedLabel: 'Suggested path',
      disclaimer: 'This checkup is directional: it helps you prioritize improvements — it does not guarantee rankings or specific results.',
    },
    tools: {
      metaTitle: 'Free tools for your business | Marcyan',
      metaDesc: 'Free calculators: what missed calls and no-show appointments cost you. Plus a complete free digital checkup.',
      h1: 'Free <em>tools</em> for your business',
      sub: "Put a number on what today is just a hunch — and see what to fix first.",
      calcCallsTitle: 'What are missed calls costing you?',
      calcCallsSub: 'Every unanswered call is a customer dialing the next name on the list.',
      calcApptTitle: 'What are no-shows costing you?',
      calcApptSub: 'No-shows drop with automatic reminders and confirmations.',
      inCallsWeek: 'Calls per week', inMissed: "% you can't answer", inTicket: 'Average ticket', inClose: 'Close rate',
      inApptWeek: 'Appointments per week', inNoShow: '% no-shows', inApptValue: 'Value per appointment',
      outCalls: 'Potential revenue lost per month', outAppt: 'Potential recovery per month',
      calcDisclaimer: 'A directional estimate based on your numbers — useful for sizing, not a guaranteed projection.',
      calcCta: 'Review my case', diagCardTitle: 'Complete digital checkup',
      diagCardSub: 'The full review of your digital presence — free, with an email report.', diagCardCta: 'Start the checkup',
    },
    errors: {
      errNet: "We couldn't finish the analysis. Check your connection and try again.",
      errRate: 'You ran several analyses in a row. Wait a few minutes and try again.',
      errUrl: "We couldn't read that address. Make sure it's your site (e.g. mybusiness.com) or leave it empty.",
      errContact: 'We need at least an email or a phone number to send your report.',
    },
    faq: [
      { q: 'Is the checkup really free?', a: 'Yes. Both the on-screen result and the full email report are free, no strings attached. It is the best way to show you how we work.' },
      { q: 'What exactly does it review?', a: 'Five areas: mobile site, local SEO, AI readability (whether ChatGPT or Gemini can understand your business), conversion (how easy it is to contact you), and reviews. Verifiable signals, not opinions.' },
      { q: 'Do I need a website?', a: "No. If you don't have a site yet, the checkup tells you where to start and what matters first for your industry and city." },
      { q: 'Do you guarantee results?', a: 'No — and be wary of anyone who does. The checkup prioritizes improvements honestly; results depend on your market and on execution.' },
    ],
  },
} as const;
```

### 10.3 Hallazgos (labels bilingües de los checks)
Los textos ES de la tabla §3 son los `es` de cada finding; el ejecutor escribe el espejo `en` con el MISMO significado (localización, no literal) y un `impact_es/impact_en` de 1 frase ("qué te cuesta") por check, siguiendo el tono de los ejemplos. Viven en `lib/diagnostic-checks.mjs` junto a los tests de cada check (así el server y el reporte usan la misma fuente).

---

## 11 · Qué NO hacer (anti-checklist para el ejecutor)

- NO instalar dependencias nuevas (ni cheerio/jsdom: los checks van por regex/includes; ni GTM/GA4; ni Tailwind).
- NO crear otro avatar de Marcy ni otro planeta (usar `/assets/bot/marcy-mini.webp` vía `<picture>`; el planeta del hero NO se replica fuera de la home).
- NO usar los colores/tokens de la propuesta (`#4DE7FF`, `#9B5CFF`, `--mx-*`).
- NO poner "Growth OS" en copy público.
- NO mandar email/teléfono/nombre al modelo, en ningún prompt.
- NO añadir el diagnóstico a la nav principal (política de CTAs: la conversión canónica sigue siendo llamar/WhatsApp/#contacto).
- NO fabricar números en resultados ("podrías estar perdiendo $12,600" solo sale de la CALCULADORA con inputs del usuario y prefijo ≈).
- NO bloquear el preview tras contacto (valor primero; el contacto desbloquea solo el reporte COMPLETO).

---
---

# LOTE 2 · INTEGRACIÓN — llevar las herramientas a las landings y a Marcy (2026-07-06)

> **Contexto:** F1-F4 están LIVE en `main`, pero las calculadoras quedaron HUÉRFANAS: nada las enlaza
> (los 6 `GrowthCta` apuntan solo al diagnóstico, los hubs de ciudad no tienen nada, Marcy solo conoce
> `diagnostico`, y el hero de `/es/herramientas` tiene `primary.href='#'` = botón muerto). Este lote las
> conecta. Mismas reglas §1 y anti-checklist §11. Rama sugerida: `feat/growth-os-integracion`.

## L2.1 · Anclas en las calculadoras (prerequisito de todo lo demás)

En `src/components/growthos/ToolsHub.astro`:
1. Derivar ids por idioma en frontmatter: `const ids = lang === 'en' ? { calls: 'calls', appt: 'appointments' } : { calls: 'llamadas', appt: 'citas' };`
2. `<div class="gtcard" data-calc="calls" id={ids.calls}>` y `<div class="gtcard" data-calc="appt" id={ids.appt}>`.
3. A `.gtcard` añadir `scroll-margin-top: calc(var(--nav-h) + var(--space-4));` (nav fija).

Deep-links resultantes (usar EXACTAMENTE estos en todo el lote):
`/es/herramientas#llamadas` · `/es/herramientas#citas` · `/en/tools#calls` · `/en/tools#appointments`

## L2.2 · Fix del botón muerto del hero de herramientas
En `src/pages/es/herramientas.astro`: `primary={{ label: tt.calcCta, href: '#llamadas' }}`.
En `src/pages/en/tools.astro`: `primary={{ label: tt.calcCta, href: '#calls' }}`.

## L2.3 · Hubs de ciudad (las 2 landings principales) — diagnóstico + calculadoras

### a) `GrowthTeaser` parametrizable por ciudad
Añadir a `src/components/sections/GrowthTeaser.astro` la prop opcional `city?: 'houston' | 'miami'`.
Si viene, sobreescribe `t.title` y `t.sub` con estos textos (añadirlos a `GOS.{es,en}.teaser.cityOverrides`):

```ts
// ES
houston: {
  title: 'Descubre dónde está <em>perdiendo clientes</em> tu negocio en Houston',
  sub: 'En 2 minutos, la IA revisa tu presencia digital — web, Google, lectura por IA y conversión — y te dice qué priorizar para competir en Houston. Gratis y sin compromiso.',
},
miami: {
  title: 'Descubre dónde está <em>perdiendo clientes</em> tu negocio en Miami',
  sub: 'En 2 minutos, la IA revisa tu presencia digital — web, Google, lectura por IA y conversión — y te dice qué priorizar para competir en Miami. Gratis y sin compromiso.',
},
// EN
houston: {
  title: 'Find out where your Houston business is <em>losing customers</em>',
  sub: 'In 2 minutes, AI reviews your digital presence — mobile site, Google, AI readability, and conversion — and shows you what to fix first to compete in Houston. Free, no strings.',
},
miami: {
  title: 'Find out where your Miami business is <em>losing customers</em>',
  sub: 'In 2 minutes, AI reviews your digital presence — mobile site, Google, AI readability, and conversion — and shows you what to fix first to compete in Miami. Free, no strings.',
},
```

### b) Colocación exacta en los 4 hubs
| Página | Insertar | Dónde (estado actual del archivo) |
|---|---|---|
| `src/pages/es/houston.astro` | `<GrowthTeaser lang="es" city="houston" />` | Entre la sección `inddir` (directorio de industrias, cierra ~L216) y `<AnswerBlock …>` (~L219) |
| `src/pages/es/houston.astro` | `<GrowthCta …calculadoras ES…>` | Inmediatamente DESPUÉS del cierre de la sección `svcprice` (#servicios, ~L141), antes de `<Projects …>` |
| `src/pages/es/miami.astro` | `<GrowthTeaser lang="es" city="miami" />` | Entre `<Prose …>` (~L135-140) y el `<RelatedLinks tag={h.related…}>` (~L142) |
| `src/pages/es/miami.astro` | `<GrowthCta …calculadoras ES…>` | Inmediatamente DESPUÉS del cierre de la sección `showcase` (~L129), antes de `<AnswerBlock>` |
| `src/pages/en/houston.astro` + `src/pages/en/miami.astro` | Espejos con `lang="en"` + `city` + GrowthCta EN | Posiciones análogas |

### c) Texto del `GrowthCta` de calculadoras en hubs (literal)
```astro
<!-- ES (ambos hubs) -->
<GrowthCta
  text="¿Te suena? Llamadas que no alcanzas a contestar, citas que no llegan. Ponle número en 30 segundos."
  linkLabel="Calculadoras gratis"
  href="/es/herramientas"
/>
<!-- EN (ambos hubs) -->
<GrowthCta
  text="Sound familiar? Calls you can't answer, appointments that never show. Put a number on it in 30 seconds."
  linkLabel="Free calculators"
  href="/en/tools"
/>
```

## L2.4 · Landings de industria — calculadora contextual vía data

### a) Cambio de infraestructura (1 sola vez)
1. En el tipo `ClusterPage` (donde vive en `src/i18n/clusters.ts`): campo opcional
   `tool?: { text: string; linkLabel: string; href: string };`
2. En `src/components/ClusterLanding.astro`: importar `GrowthCta` y renderizar
   `{cluster.tool && <GrowthCta {...cluster.tool} />}` **justo antes de `<Faq …>`** (hoy ~L109).

### b) Data por landing (literal — ES en `clusters.ts`, EN en `clusters.en.ts`)
| Cluster | `text` ES | `href` ES |
|---|---|---|
| houstonContratistas | `'¿Cuántos trabajos pierdes por llamadas sin contestar? Ponle número en 30 segundos.'` | `/es/herramientas#llamadas` |
| houstonTalleresMecanicos | `'¿Cuántas reparaciones se van al taller de al lado por no contestar el teléfono? Ponle número.'` | `/es/herramientas#llamadas` |
| houstonRestaurantes | `'¿Cuántas reservas y pedidos se pierden cuando nadie contesta? Ponle número en 30 segundos.'` | `/es/herramientas#llamadas` |
| houstonAbogadosInmigracion | `'Cada llamada sin contestar puede ser un caso que se va con otro despacho. Ponle número.'` | `/es/herramientas#llamadas` |
| houstonBienesRaices | `'¿Cuántos prospectos se enfrían por no responder a tiempo? Ponle número en 30 segundos.'` | `/es/herramientas#llamadas` |
| houstonSalonBelleza | `'¿Cuánto te cuestan las citas que no llegan? Ponle número en 30 segundos.'` | `/es/herramientas#citas` |
| houstonClinicasDentales | `'¿Cuánto pierde tu clínica por los no-shows? Ponle número en 30 segundos.'` | `/es/herramientas#citas` |
| houstonIa + miamiIa (IA Conversacional) | `'Tu asistente contesta lo que hoy se te escapa. Mira cuánto vale eso al mes.'` | `/es/herramientas#llamadas` |

`linkLabel` ES: `'Calculadora de llamadas perdidas'` (los de #llamadas) · `'Calculadora de citas perdidas'` (los de #citas).

EN (mismos clusters en `clusters.en.ts`, hrefs `/en/tools#calls` · `/en/tools#appointments`; labels `'Missed-calls calculator'` / `'No-show calculator'`):
| Cluster EN | `text` EN |
|---|---|
| contractors | `'How many jobs do you lose to unanswered calls? Put a number on it in 30 seconds.'` |
| auto-repair | `'How many repairs end up at the shop next door because nobody picked up? Put a number on it.'` |
| restaurants | `'How many reservations and orders slip away when nobody answers? Put a number on it in 30 seconds.'` |
| immigration-lawyers | `'Every unanswered call can be a case walking to another firm. Put a number on it.'` |
| real-estate | `'How many leads go cold because the reply came late? Put a number on it in 30 seconds.'` |
| beauty-salons | `'What are no-show appointments costing you? Put a number on it in 30 seconds.'` |
| dental-clinics | `'What do no-shows cost your practice every month? Put a number on it in 30 seconds.'` |
| conversational-ai (Houston + Miami) | `'Your assistant answers what slips away today. See what that is worth per month.'` |

## L2.5 · Footer — enlace a herramientas
Verificar la columna de enlaces del footer en `content.ts` (ES y EN): si F4 solo añadió el diagnóstico,
añadir junto a él: ES `'Herramientas gratis' → /es/herramientas` · EN `'Free tools' → /en/tools`.
(Mismo estilo utilitario que el brief — NO es CTA de conversión.)

## L2.6 · Marcy — que ofrezca las calculadoras donde duele (solo `lib/chat-kb.mjs` + widget + tests)

1. **Enum del `LINK_TOOL` + `LINK_PAGES`** (mismo patrón de 'diagnostico'): añadir
   `'herramientas'`, `'calculadora-llamadas'`, `'calculadora-citas'`.
2. **Mapa de URLs del widget** (donde 'diagnostico' resuelve a /es/diagnostico | /en/checkup):
   `herramientas → /es/herramientas | /en/tools` ·
   `calculadora-llamadas → /es/herramientas#llamadas | /en/tools#calls` ·
   `calculadora-citas → /es/herramientas#citas | /en/tools#appointments`.
3. **KB_FACTS** — añadir junto al hecho del diagnóstico (literal):
```
- HERRAMIENTAS GRATIS en /es/herramientas (inglés /en/tools): dos calculadoras al instante, sin registro. (1) Llamadas perdidas: cuánto ingreso se escapa al mes por llamadas sin contestar. (2) Citas perdidas: cuánto cuestan los no-shows. Son orientativas y el cliente mete sus propios números.
- CUÁNDO USARLAS (etapa de implicación de la venta): si el cliente menciona llamadas sin contestar, mensajes perdidos, que no da abasto con el teléfono, citas que no llegan o no-shows → ANTES de recomendar servicio, ofrécele ponerle número a ese dolor con enlazar_pagina ("calculadora-llamadas" o "calculadora-citas" según el caso). Un dolor con número decide más rápido. Después conecta el resultado con la solución (IA Conversacional / web con conversión) o con el diagnóstico completo.
```
4. **Doctrina intacta:** nada de cifras inventadas por Marcy — la calculadora la llena el CLIENTE. Marcy no dice "pierdes $X"; dice "ponle número".
5. **Tests:** si `test:chat` valida el enum/allowlist del LINK_TOOL (se tocó en F4), actualizar el caso con las 3 páginas nuevas. Correr `check:kb` + `test:chat` (124) → verdes.

## L2.7 · QA del lote
1. `npm run build` verde; `check:kb` ✓; `test:chat` ✓ (enum actualizado).
2. Anclas: click en cada deep-link (ES+EN) aterriza en la calculadora correcta con la nav fija sin taparla.
3. Hubs: teaser con título de ciudad correcto en los 4; GrowthCta visible; sin overflow-x móvil.
4. Landings de industria: el CTA de calculadora sale ANTES del FAQ solo en los clusters con `tool`; las demás landings intactas.
5. Marcy (modelo real, preview): "se me escapan llamadas" → ofrece la calculadora de llamadas y el link abre con ancla; "me cancelan citas" → la de citas; sigue SIN prometer cifras.
6. Tracking: `tool_cta_clicked` llega a `events` desde un hub y desde una landing de industria.
7. Greps doctrina (§1) = 0 nuevos; "Growth OS" en copy público = 0.
