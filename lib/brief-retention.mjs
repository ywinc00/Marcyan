// ════════════════════════════════════════════════════════════════
//  lib/brief-retention.mjs — Plazo de conservación de los archivos del brief
//
//  Decisión del dueño (2026-10-19): los archivos de un cliente (logo, fotos,
//  documentos, video y legales) se conservan hasta 12 meses después de
//  terminar su proyecto y luego se borran solos. 30 días antes sale un aviso
//  en el panel para poder descargar el kit; si el cliente lo pide, se borran
//  antes desde la ficha del brief. Es lo que dice la política de privacidad
//  (src/pages/privacidad.astro y en/privacy.astro).
//
//  "Terminar el proyecto" = el brief pasó a Completado. Cuenta la ÚLTIMA vez
//  que pasó a Completado según su historial (brief_events 'status_changed').
//  Si después vuelve a un estado de trabajo (Pendiente, Contactado, En
//  curso), el reloj se anula; si se archiva desde Completado, el proyecto
//  sigue terminado y el reloj sigue. Sin historial de estados (briefs muy
//  viejos) se usa completed_at.
//
//  Todo es PURO (sin base ni red): lo prueban scripts/test-brief-files.mjs,
//  lo usan el cron diario (api/cron/brief-cleanup.mjs) y la ficha del panel
//  (GET /api/admin/briefs/:id/files). Las fechas son días de Houston
//  ('YYYY-MM-DD'): el cron corre a las 4:40 a. m. de Houston, así que los
//  archivos se borran en la madrugada del día que dice el panel.
// ════════════════════════════════════════════════════════════════
import { houstonDate } from './dates.mjs';

export const RETENTION_MONTHS = 12;
export const NOTICE_DAYS = 30;
// Estados en los que el proyecto cuenta como terminado.
export const FINISHED_STATUSES = ['completed', 'archived'];

const DAY_MS = 86400000;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toMs(v) {
  if (v === null || v === undefined || v === '') return null;
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}
function eventData(ev) {
  const d = ev && ev.data;
  if (d && typeof d === 'object') return d;
  if (typeof d === 'string') { try { return JSON.parse(d) || {}; } catch { return {}; } }
  return {};
}

// Instante en que se terminó el proyecto (Date) o null si no está terminado.
export function finishedAt(brief, events = []) {
  if (!brief || !FINISHED_STATUSES.includes(brief.status)) return null;
  const changes = (Array.isArray(events) ? events : [])
    .filter((e) => e && e.event_type === 'status_changed')
    .map((e) => ({ at: toMs(e.created_at), to: eventData(e).to }))
    .filter((c) => c.at !== null)
    .sort((a, b) => a.at - b.at);
  let clock = null;
  for (const c of changes) {
    if (c.to === 'completed') clock = c.at;      // la última vez que pasó a Completado
    else if (c.to !== 'archived') clock = null;  // volvió a un estado de trabajo: se anula
  }
  if (clock !== null) return new Date(clock);
  // Sin historial de estados, o historial que no cuadra con el estado actual
  // (Completado sin ningún paso a Completado registrado): la fecha que exista.
  const done = toMs(brief.completed_at);
  if (done === null) return null;
  if (brief.status === 'completed' || !changes.length) return new Date(done);
  return null;
}

// Día + n meses, sin desbordar el mes (31 ene + 1 mes = 28/29 feb).
export function addMonthsDay(day, n) {
  const m = DAY_RE.exec(String(day || ''));
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  const z = y * 12 + mo + n;
  const ty = Math.floor(z / 12), tm = ((z % 12) + 12) % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${ty}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

// Fecha de borrado prevista ('YYYY-MM-DD', día de Houston) o null.
export function purgeDate(brief, events = []) {
  const done = finishedAt(brief, events);
  return done ? addMonthsDay(houstonDate(done), RETENTION_MONTHS) : null;
}

// Días de calendario de Houston que faltan hasta `day` (negativo si ya pasó).
export function daysUntil(day, now = Date.now()) {
  const a = DAY_RE.exec(String(day || ''));
  const b = DAY_RE.exec(houstonDate(now));
  if (!a || !b) return null;
  return Math.round((Date.UTC(+a[1], +a[2] - 1, +a[3]) - Date.UTC(+b[1], +b[2] - 1, +b[3])) / DAY_MS);
}

// Qué toca hoy: 'keep' (falta más de 30 días o no hay fecha), 'notice'
// (faltan 30 días o menos: avisar) o 'purge' (la fecha ya llegó: borrar).
export function retentionStage(day, now = Date.now()) {
  const left = daysUntil(day, now);
  if (left === null) return 'keep';
  if (left <= 0) return 'purge';
  return left <= NOTICE_DAYS ? 'notice' : 'keep';
}

// Último borrado de archivos del historial ('files_purged') o null.
//   { at, files, reason: 'retention'|'request', actor }
export function lastPurge(events = []) {
  let best = null;
  for (const e of Array.isArray(events) ? events : []) {
    if (!e || e.event_type !== 'files_purged') continue;
    const at = toMs(e.created_at);
    if (at === null || (best && best.t >= at)) continue;
    const d = eventData(e);
    best = { t: at, at: new Date(at).toISOString(), files: Number(d.files) || 0, reason: d.reason === 'request' ? 'request' : 'retention', actor: e.actor_email || null };
  }
  if (!best) return null;
  const { t, ...out } = best;
  void t;
  return out;
}

// ── Textos ────────────────────────────────────────────────────
// 'YYYY-MM-DD' → "19 de octubre de 2027".
export function fmtLongDay(day) {
  const m = DAY_RE.exec(String(day || ''));
  if (!m) return '';
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toLocaleDateString('es-US', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

const KIND_WORDS = [
  ['logo', 'logo', 'logos'],
  ['photo', 'foto', 'fotos'],
  ['doc', 'documento', 'documentos'],
  ['video', 'video', 'videos'],
  ['legal', 'documento legal', 'documentos legales'],
];
// { logo: 1, photo: 3 } → "1 logo y 3 fotos".
export function filesSummary(byKind = {}) {
  const parts = [];
  for (const [k, one, many] of KIND_WORDS) {
    const n = Number(byKind && byKind[k]) || 0;
    if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`);
  }
  if (!parts.length) return '';
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}

// Aviso 'system' de borrado próximo. La clave lleva la fecha: un aviso por
// brief y fecha (si el brief se reabre y se vuelve a terminar, la fecha
// cambia y el aviso nuevo sí sale).
export function purgeNotice({ projectId, businessName = '', purgeOn, byKind = {} } = {}) {
  const ref = String(projectId || '');
  const label = [ref, String(businessName || '').trim()].filter(Boolean).join(', ');
  const when = fmtLongDay(purgeOn);
  const what = filesSummary(byKind);
  const legal = Number(byKind && byKind.legal) > 0;
  return {
    key: `files-purge:${ref}:${purgeOn}`,
    title: `Los archivos de ${label} se borrarán el ${when}`,
    body: `Ese día se cumplen 12 meses desde que se terminó el proyecto y se borran sus archivos${what ? ': ' + what : ''}. `
      + 'No se puede deshacer. Si quieres conservarlos, descarga el kit desde la ficha del brief antes de esa fecha.'
      + (legal ? ' Los documentos legales no van en el kit: descárgalos uno a uno en la sección Archivos.' : ''),
    url: `/dashboard#/briefs/${encodeURIComponent(ref)}`,
  };
}
