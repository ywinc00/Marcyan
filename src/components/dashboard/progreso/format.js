// ─────────────────────────────────────────────────────────────
// Progreso · etiquetas, colores de estado y formatos de la sección.
// Sin Svelte ni DOM: lo prueba scripts/test-projects.mjs.
//
// Semántica de color ÚNICA de estado (OP-32), igual para proyectos, hitos,
// barras y stepper:
//   en curso  → info (azul)        pausa     → warning (ámbar)
//   hecho     → success (verde)    pendiente → neutral (gris)
//   cancelado → neutral (gris, archivado; no es un error)
// El naranja queda para la acción principal (presupuesto del acento, H-07).
// ─────────────────────────────────────────────────────────────

export const P_STATUSES = [
  { id: 'active',    slug: 'activo',     label: 'Activo',     tone: 'info' },
  { id: 'on_hold',   slug: 'pausa',      label: 'En pausa',   tone: 'warning' },
  { id: 'completed', slug: 'completado', label: 'Completado', tone: 'success' },
  { id: 'cancelled', slug: 'cancelado',  label: 'Cancelado',  tone: 'neutral' },
];

export const M_STATUSES = [
  { id: 'pending',     label: 'Pendiente', tone: 'neutral' },
  { id: 'in_progress', label: 'En curso',  tone: 'info' },
  { id: 'done',        label: 'Hecho',     tone: 'success' },
];

// Colores reales de cada tono (para SVG, donde no llegan las clases).
export const TONE_COLOR = {
  info: 'var(--color-info)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
  neutral: 'var(--fg-subtle)',
};

// Servicios del catálogo (códigos que ya guarda la base: landing | web | seo |
// aeo | logo | chatbot | other) con su nombre legible. Un valor antiguo que no
// esté aquí se muestra tal cual y se conserva al editar.
export const SERVICE_TYPES = [
  { id: 'web',     label: 'Sitio web' },
  { id: 'landing', label: 'Landing page' },
  { id: 'seo',     label: 'SEO local' },
  { id: 'aeo',     label: 'SEO para IA' },
  { id: 'chatbot', label: 'Chatbot con IA' },
  { id: 'logo',    label: 'Logo y marca' },
  { id: 'other',   label: 'Otro' },
];

export function pStatus(id) { return P_STATUSES.find((s) => s.id === id) || { id, slug: id, label: id || 'Sin estado', tone: 'neutral' }; }
export function mStatus(id) { return M_STATUSES.find((s) => s.id === id) || { id, label: id || 'Sin estado', tone: 'neutral' }; }
export function statusFromSlug(slug) { return (P_STATUSES.find((s) => s.slug === slug) || {}).id || ''; }
export function slugFromStatus(id) { return (P_STATUSES.find((s) => s.id === id) || {}).slug || ''; }

export function serviceLabel(code) {
  if (!code) return '';
  const hit = SERVICE_TYPES.find((s) => s.id === String(code).toLowerCase());
  return hit ? hit.label : String(code);
}

// ── Dinero ────────────────────────────────────────────────────
const usd = new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Centavos → "$1,500" (o "$1,500.50" si hay centavos). '—' si no hay dato. */
export function fmtMoney(cents) {
  if (cents == null || cents === '') return '—';
  const n = Number(cents);
  if (!Number.isFinite(n)) return '—';
  return n % 100 === 0 ? usd.format(n / 100) : usdCents.format(n / 100);
}

/**
 * Lo que escribe el dueño → centavos. Acepta "$1,500", "1.500", "1 500",
 * "1500.50", "1500,50". Vacío = { cents: 0, empty: true } (monto en $0).
 * Reglas de separadores:
 *   · los dos ("1.500,50" / "1,500.50"): el último es el decimal.
 *   · uno solo seguido de exactamente 3 cifras en grupos ("1.500", "12,000",
 *     "1,250,000"): es de miles.
 *   · uno solo con 1 o 2 cifras detrás ("1500,5", "99.90"): es decimal.
 */
export function parseMoneyToCents(input) {
  const raw = String(input ?? '').trim().replace(/^\$|\s|\$|USD/gi, '');
  if (!raw) return { cents: 0, empty: true };
  if (!/^[\d.,]+$/.test(raw)) return { error: 'Escribe solo la cifra, por ejemplo 1500 o 1,500.' };
  let intPart = raw, dec = '';
  const lastDot = raw.lastIndexOf('.'), lastComma = raw.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    const sep = lastDot > lastComma ? '.' : ',';
    const i = raw.lastIndexOf(sep);
    intPart = raw.slice(0, i); dec = raw.slice(i + 1);
    if (!/^\d{1,2}$/.test(dec)) return { error: 'La cifra no es válida.' };
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const parts = raw.split(sep);
    const groups = parts.slice(1);
    if (groups.every((g) => g.length === 3) && parts[0].length >= 1 && parts[0].length <= 3) {
      intPart = parts.join('');
    } else if (parts.length === 2 && /^\d{1,2}$/.test(parts[1])) {
      intPart = parts[0]; dec = parts[1];
    } else {
      return { error: 'La cifra no es válida.' };
    }
  }
  intPart = intPart.replace(/[.,]/g, '');
  if (!/^\d+$/.test(intPart || '0')) return { error: 'La cifra no es válida.' };
  const cents = Number(intPart || '0') * 100 + Number((dec + '00').slice(0, 2));
  if (!Number.isFinite(cents) || cents > 9999999999) return { error: 'El monto es demasiado alto. Revisa la cifra.' };
  return { cents };
}

/** Centavos → texto para el campo ("1500" o "1500.50"). */
export function centsToInput(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n % 100 === 0 ? String(n / 100) : (n / 100).toFixed(2);
}

// ── Listas ────────────────────────────────────────────────────
/** Copia de `arr` con el elemento `from` movido a `to` (índices fuera de rango = sin cambio). */
export function moveItem(arr, from, to) {
  const out = arr.slice();
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out;
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
}

/** Recorta una etiqueta para el stepper; el texto completo va en el title. */
export function truncateLabel(label, max = 16) {
  const s = String(label ?? '').trim();
  return s.length > max ? s.slice(0, Math.max(1, max - 1)).trimEnd() + '…' : s;
}

// ── Monograma de cliente/proyecto ─────────────────────────────
const MONO_PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f97316', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
export function monoColor(n) {
  let h = 0; const s = n || '?';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return MONO_PALETTE[Math.abs(h) % MONO_PALETTE.length];
}
export function initials(n) {
  const parts = (n || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * ¿Es una fecha completa que se puede guardar? Un campo de fecha escrito con
 * el teclado pasa por valores a medias (año 0002, 0020, 0202…) que el
 * navegador ya da por válidos; esos no se guardan (A5-R1).
 */
export function isCompleteDay(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= '2000-01-01';
}
