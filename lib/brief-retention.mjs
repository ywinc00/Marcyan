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
//  viejos) se usa completed_at. completed_at guarda la PRIMERA vez que se
//  completó (db.mjs no lo limpia al reabrir): con historial nunca se usa
//  solo, para no fechar el borrado con una terminación antigua (RET-01).
//
//  Si el brief tiene un proyecto enlazado en Progreso (projects), manda ese
//  proyecto (RET-04): mientras esté activo o en pausa no hay fecha; si se
//  completó, cuenta lo último entre el cierre del brief y el del proyecto.
//  Un proyecto cancelado no frena el reloj del brief.
//
//  Nunca se borra sin aviso previo (RET-02): el borrado espera al menos 7
//  días desde el aviso del panel. Si el aviso sale tarde (primer despliegue,
//  cron caído), la fecha efectiva se corre lo necesario (effectivePurgeDay).
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
// Mínimo de días entre el aviso del panel y el borrado.
export const MIN_NOTICE_DAYS = 7;
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
//   project: el proyecto (o lista de proyectos) enlazado en Progreso
//            { status, completed_at }, o null si no hay.
export function finishedAt(brief, events = [], project = null) {
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
  let done = clock;
  if (done === null) {
    const first = toMs(brief.completed_at);
    if (!changes.length) {
      done = first;                              // sin historial de estados: la fecha que exista
    } else if (brief.status === 'completed') {
      // Está en Completado pero el historial no registra ese paso (el evento
      // no se guardó). Pasó DESPUÉS del último cambio registrado: se toma lo
      // más reciente entre ese cambio y completed_at, nunca la primera
      // terminación sola (RET-01).
      done = Math.max(changes[changes.length - 1].at, first ?? -Infinity);
    }
  }
  if (done === null) return null;
  for (const p of [].concat(project || [])) {
    if (!p) continue;
    if (p.status === 'completed') {
      const t = toMs(p.completed_at);
      if (t !== null) done = Math.max(done, t);
    } else if (p.status !== 'cancelled') {
      return null;                               // el proyecto sigue en marcha: no hay fecha
    }
  }
  return new Date(done);
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

// Día + n días ('YYYY-MM-DD').
export function addDaysDay(day, n) {
  const m = DAY_RE.exec(String(day || ''));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)).toISOString().slice(0, 10);
}

// Fecha de borrado según la política ('YYYY-MM-DD', día de Houston) o null.
export function purgeDate(brief, events = [], project = null) {
  const done = finishedAt(brief, events, project);
  return done ? addMonthsDay(houstonDate(done), RETENTION_MONTHS) : null;
}

// Fecha en que de verdad se borra: la de la política, pero nunca antes de
// 7 días desde el aviso del panel (noticeAt). Sin aviso todavía, se cuenta
// desde hoy (el cron lo deja hoy mismo). null si no hay fecha (RET-02).
export function effectivePurgeDay(day, noticeAt = null, now = Date.now()) {
  if (!DAY_RE.test(String(day || ''))) return null;
  const from = toMs(noticeAt) ?? (now instanceof Date ? now.getTime() : now);
  const floor = addDaysDay(houstonDate(from), MIN_NOTICE_DAYS);
  return floor > day ? floor : day;
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
// cambia y el aviso nuevo sí sale). deleteOn = el día en que de verdad se
// borra (effectivePurgeDay); si es posterior a purgeOn, el aviso sale tarde
// y lo dice.
export function purgeNotice({ projectId, businessName = '', purgeOn, deleteOn = null, byKind = {} } = {}) {
  const ref = String(projectId || '');
  const label = [ref, String(businessName || '').trim()].filter(Boolean).join(', ');
  const late = Boolean(deleteOn && deleteOn > purgeOn);
  const when = fmtLongDay(late ? deleteOn : purgeOn);
  const what = filesSummary(byKind);
  const legal = Number(byKind && byKind.legal) > 0;
  const lead = late
    ? `Ya se cumplieron 12 meses desde que se terminó el proyecto. Sus archivos se borran ese día${what ? ': ' + what : ''}. `
    : `Ese día se cumplen 12 meses desde que se terminó el proyecto y se borran sus archivos${what ? ': ' + what : ''}. `;
  return {
    key: `files-purge:${ref}:${purgeOn}`,
    title: `Los archivos de ${label} se borrarán el ${when}`,
    body: lead
      + 'No se puede deshacer. Si quieres conservarlos, descarga el kit desde la ficha del brief antes de esa fecha.'
      + (legal ? ' Los documentos legales no van en el kit: descárgalos uno a uno en la sección Archivos.' : ''),
    url: `/dashboard#/briefs/${encodeURIComponent(ref)}`,
  };
}
