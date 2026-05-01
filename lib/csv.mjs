// ════════════════════════════════════════════════════════════════
//  lib/csv.mjs — Serializar registros a CSV
// ════════════════════════════════════════════════════════════════

function escapeCell(v) {
  if (v === null || v === undefined) return '';
  let s;
  if (Array.isArray(v))      s = v.join('; ');
  else if (v instanceof Date) s = v.toISOString();
  else if (typeof v === 'object') s = JSON.stringify(v);
  else s = String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(rows, columns) {
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : []);
  const header = cols.map(escapeCell).join(',');
  const lines  = rows.map(r => cols.map(c => escapeCell(r[c])).join(','));
  return [header, ...lines].join('\r\n') + '\r\n';
}
