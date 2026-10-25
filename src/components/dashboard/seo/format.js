// ─────────────────────────────────────────────────────────────
// Formato de la sección SEO: números, fechas cortas y los estados de
// Search Console traducidos (nunca se enseña el texto crudo en inglés).
// ─────────────────────────────────────────────────────────────
import { fmtDay, fmtDayShort, fmtDateTime, fmtTime, todayISO } from '../lib/dates.js';

const NF = new Intl.NumberFormat('es-US');

/** Entero con separador de miles; '—' si no hay número. */
export function nfmt(n) {
  if (n == null || n === '' || !Number.isFinite(+n)) return '—';
  return NF.format(Math.round(+n));
}

// Formato compacto propio: el 'compact' de Intl da '10 K' en es-US y cambia
// según el navegador.
const NF1 = new Intl.NumberFormat('es-US', { maximumFractionDigits: 1 });
/** Rótulo del eje Y: '2,000' hasta 9,999; desde ahí compacto ('10 mil',
 *  '1.5 M') para que quepa a la izquierda del gráfico (A6-R6). */
export function axisNum(n) {
  if (n == null || !Number.isFinite(+n)) return '';
  const v = +n, a = Math.abs(v);
  if (a < 10000) return nfmt(v);
  if (a < 1e6) return NF1.format(v / 1000) + ' mil';
  return NF1.format(v / 1e6) + ' M';
}

/** Proporción 0..1 → '3,4 %'. */
export function pct(n) {
  if (n == null || !Number.isFinite(+n)) return '—';
  return (Math.round(+n * 1000) / 10).toLocaleString('es-US', { maximumFractionDigits: 1 }) + ' %';
}

/** Posición media con un decimal. */
export function pos(n) {
  if (n == null || !Number.isFinite(+n) || +n <= 0) return '—';
  return (Math.round(+n * 10) / 10).toLocaleString('es-US', { maximumFractionDigits: 1 });
}

/** DATE 'YYYY-MM-DD' → '16 oct' (sin año, para rótulos). */
export function dayShort(d) {
  return fmtDay(d, { day: 'numeric', month: 'short' }).replace('.', '');
}
export { fmtDay, fmtDayShort, fmtDateTime };

/** Rango de días corto: '17 al 18 oct' (mismo mes) o '30 sept al 2 oct'. */
export function dayRangeShort(a, b) {
  if (!a || !b) return '';
  if (a === b) return dayShort(a);
  if (a.slice(0, 7) === b.slice(0, 7)) return `${+a.slice(8, 10)} al ${dayShort(b)}`;
  return `${dayShort(a)} al ${dayShort(b)}`;
}

/** Momento legible en hora de Houston: 'hoy, 3:02 a.m.', 'ayer, …', '12 oct, …'. */
export function whenTxt(ts) {
  if (!ts) return '';
  const t = new Date(ts);
  if (Number.isNaN(t.getTime())) return '';
  const d = todayISO(t);
  const today = todayISO();
  const yest = todayISO(new Date(Date.now() - 86400000));
  const hm = fmtTime(t);
  if (d === today) return `hoy, ${hm}`;
  if (d === yest) return `ayer, ${hm}`;
  const opts = d.slice(0, 4) === today.slice(0, 4) ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' };
  return `${fmtDay(d, opts).replace('.', '')}, ${hm}`;
}

// Estados de cobertura de Search Console (URL Inspection) en español.
const STATES = [
  [/^submitted and indexed$/i, 'Enviada e indexada', 'success'],
  [/^indexed, not submitted in sitemap$/i, 'Indexada, fuera del sitemap', 'success'],
  [/^pass$/i, 'Indexada', 'success'],
  [/^crawled - currently not indexed$/i, 'Rastreada, sin indexar', 'warning'],
  [/^discovered - currently not indexed$/i, 'Descubierta, sin indexar', 'warning'],
  [/^url is unknown to google$/i, 'Google no la conoce', 'warning'],
  [/^duplicate/i, 'Duplicada, Google eligió otra', 'warning'],
  [/^alternate page with proper canonical tag$/i, 'Alternativa con canónica correcta', 'neutral'],
  [/^page with redirect$/i, 'Página con redirección', 'neutral'],
  [/noindex/i, 'Excluida por noindex', 'error'],
  [/^not found \(404\)$/i, 'No encontrada (404)', 'error'],
  [/blocked by robots\.txt/i, 'Bloqueada por robots.txt', 'error'],
  [/server error|5xx/i, 'Error del servidor', 'error'],
  [/^(fail|error)$/i, 'Con error', 'error'],
  [/^neutral$/i, 'Sin indexar', 'warning'],
  [/^desconocido$/i, 'Desconocido', 'neutral'],
];

/** { label, tone } de un estado de cobertura (tone para StatusChip). */
export function coverageState(state) {
  const s = String(state || '').trim();
  for (const [re, label, tone] of STATES) if (re.test(s)) return { label, tone };
  return { label: s || 'Desconocido', tone: 'neutral' };
}

/** Motivo de exclusión legible ("Página de inicio: Crawled - …" → en español). */
export function issueLabel(reason) {
  const r = String(reason || '');
  const m = /^(Home|Página de inicio):\s*(.+)$/i.exec(r);
  if (m) return 'Página de inicio: ' + coverageState(m[2]).label.toLowerCase();
  return r;
}

/** Nombres de las fuentes para el usuario. */
export const SOURCE_LABEL = { gsc: 'Search Console', ga4: 'Analytics', indexation: 'Indexación' };
