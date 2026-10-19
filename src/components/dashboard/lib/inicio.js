// ─────────────────────────────────────────────────────────────
// Lógica pura de Inicio (A1), separada del componente para poder
// probarla sin navegador (npm run test:inicio). Nada de aquí inventa
// cifras: si el servidor no manda el dato, la función lo dice (null) y
// la vista calla o explica, nunca pinta un "0" o una tendencia falsa.
// ─────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'YYYY-MM' → 'oct'. Cadena vacía si no es una clave de mes. */
export function monthShort(key) {
  const m = /^\d{4}-(\d{2})/.exec(String(key || ''));
  if (!m) return '';
  return MONTHS_SHORT[parseInt(m[1], 10) - 1] || '';
}

/** Número entero o null (los BIGINT llegan como string; null = sin dato). */
export function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Centavos → "$1,800" o "$1,800.50". */
export function money(cents) {
  const n = num(cents);
  if (n === null) return '';
  const abs = Math.abs(n) / 100;
  // Enteros sin decimales ("$1,800"); con centavos, siempre dos ("$12,840.50").
  const dec = Math.abs(n) % 100 === 0 ? 0 : 2;
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return (n < 0 ? '−$' : '$') + s;
}

/**
 * Comparación real contra el mes anterior.
 * Devuelve null si falta cualquiera de los dos datos (no hay comparación
 * que enseñar). dir: 'up' | 'down' | 'same'.
 * fmt formatea la magnitud (por defecto, número entero).
 */
export function delta(cur, prev, fmt = (n) => String(n)) {
  const a = num(cur), b = num(prev);
  if (a === null || b === null) return null;
  const d = a - b;
  if (d === 0) return { dir: 'same', diff: 0, text: 'igual' };
  return { dir: d > 0 ? 'up' : 'down', diff: d, text: (d > 0 ? '+' : '−') + fmt(Math.abs(d)) };
}

/** ¿Hubo alguna actividad en los meses recibidos? (OP-22) */
export function hasActivity(activity) {
  return Array.isArray(activity) && activity.some((a) => (num(a && a.total) || 0) > 0);
}

/**
 * Escala del eje Y del gráfico de barras (SH-13): ticks ENTEROS, únicos,
 * con el 0, y una cima que existe. paso = ceil(máx/4); cima = múltiplo
 * del paso ≥ máx. Ejemplos: 1 → [1,0] · 2 → [2,1,0] · 9 → [9,6,3,0]
 * · 10 → [12,9,6,3,0]. Sin datos → { top: 0, ticks: [] }.
 */
export function axisScale(max) {
  const m = Math.max(0, Math.ceil(num(max) || 0));
  if (m === 0) return { top: 0, ticks: [] };
  const step = Math.max(1, Math.ceil(m / 4));
  const top = step * Math.ceil(m / step);
  const ticks = [];
  for (let v = top; v >= 0; v -= step) ticks.push(v);
  return { top, ticks };
}

/**
 * Leads por estado con proporciones REALES (OP-19, SH-14): cada barra mide
 * su número frente al mayor de las etapas vivas; nada de "cada etapa más
 * estrecha que la anterior" ni mínimos que inflan. Archivados va aparte.
 * pipeline = new + contacted (si el servidor no lo manda, se calcula).
 */
export function leadStates(funnel) {
  if (!funnel) return null;
  const n = (k) => num(funnel[k]) || 0;
  const rows = [
    { key: 'new',       estado: 'nuevo',      name: 'Nuevos',      n: n('new') },
    { key: 'contacted', estado: 'contactado', name: 'Contactados', n: n('contacted') },
    { key: 'converted', estado: 'convertido', name: 'Convertidos', n: n('converted') },
  ];
  const max = Math.max(0, ...rows.map((r) => r.n));
  for (const r of rows) r.pct = max > 0 ? Math.round((r.n / max) * 1000) / 10 : 0;
  const pipeline = num(funnel.pipeline);
  return {
    rows,
    pipeline: pipeline === null ? n('new') + n('contacted') : pipeline,
    archived: n('archived'),
  };
}

/** Totales acumulados de la actividad (curva de "Actividad acumulada"). */
export function cumulative(activity) {
  let acc = 0;
  return (Array.isArray(activity) ? activity : []).map((a) => (acc += num(a && a.total) || 0));
}
