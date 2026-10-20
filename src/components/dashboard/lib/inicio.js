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
 * Formas de la cifra del KPI de dinero, de la más precisa a la más corta
 * (A1-01). La tarjeta corta con "…" lo que no cabe, y el hueco junto a la
 * ilustración va de ~72 px (móvil de 360) a más de 120: la vista pinta la
 * primera que cabe. Nunca centavos (la cifra exacta va en la nota).
 *   $1,800.50  → ['$1,801', '$1.8k', '$2k']
 *   $12,840.50 → ['$12,841', '$12.8k', '$13k']
 *   $420       → ['$420']
 */
export function moneyFits(cents) {
  const n = num(cents);
  if (n === null) return [];
  const sign = n < 0 ? '−$' : '$';
  const d = Math.abs(n) / 100;
  const whole = Math.round(d);
  const out = [sign + whole.toLocaleString('en-US')];
  if (whole < 1000) return out;
  // dec = decimales como máximo; con 100 o más, entero ("$128k", no "$128.4k").
  const show = (v, dec) => {
    const x = Math.round(v * 10 ** dec) / 10 ** dec;
    return x < 100 ? x : Math.round(v);
  };
  const compact = (dec) => {
    let v = d / 1e3, unit = 'k';
    if (show(v, dec) >= 1000) { v = d / 1e6; unit = 'M'; }   // nunca "$1000k"
    return sign + String(show(v, dec)) + unit;
  };
  for (const s of [compact(1), compact(0)]) if (!out.includes(s)) out.push(s);
  return out;
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

/**
 * Etiqueta accesible del gráfico de actividad con el desglose de cada mes
 * (A1-03): el globo solo sale con ratón o toque, así que el lector de
 * pantalla recibe aquí lo mismo. "may: 2 leads y 1 brief; jun: sin actividad".
 */
export function activityLabel(activity) {
  const p = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const parts = (Array.isArray(activity) ? activity : []).map((a) => {
    const l = num(a && a.leads) || 0, b = num(a && a.briefs) || 0;
    const what = l || b ? `${p(l, 'lead', 'leads')} y ${p(b, 'brief', 'briefs')}` : 'sin actividad';
    return `${monthShort(a && a.month)}: ${what}`;
  });
  return parts.length ? 'Actividad por mes. ' + parts.join('; ') : 'Actividad por mes';
}

/** Totales acumulados de la actividad (curva de "Actividad acumulada"). */
export function cumulative(activity) {
  let acc = 0;
  return (Array.isArray(activity) ? activity : []).map((a) => (acc += num(a && a.total) || 0));
}
