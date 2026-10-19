// ════════════════════════════════════════════════════════════════
//  lib/csv.mjs — Serializar registros a CSV (único serializador del servidor)
//
//  Dos protecciones para que el archivo se abra bien y seguro en Excel:
//    · BOM UTF-8 al inicio (SH-18, OP-17): sin él, Excel de Windows lee el
//      archivo como ANSI y "Diseño" sale como "DiseÃ±o".
//    · Neutralización de fórmulas (OP-16, CRM-17): los datos vienen de
//      formularios PÚBLICOS. Una celda que empieza por = + - @ tabulador o
//      retorno de carro se ejecutaría como fórmula (=HYPERLINK(…), DDE…).
//      Se le antepone una comilla simple, que Excel muestra como texto.
//  Además: comillas dobles, comas, saltos de línea y CR se citan (RFC 4180).
// ════════════════════════════════════════════════════════════════

export const CSV_BOM = '﻿';

// Primer carácter que convierte la celda en fórmula en Excel/Sheets/LibreOffice.
const FORMULA_START = /^[=+\-@\t\r]/;

function toText(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v))       return v.map(toText).join('; ');
  if (v instanceof Date)      return Number.isNaN(v.getTime()) ? '' : v.toISOString();
  if (typeof v === 'object')  return JSON.stringify(v);
  return String(v);
}

// Exportada para los tests (scripts/test-admin-backend.mjs).
export function escapeCell(v) {
  let s = toText(v);
  // Los números de verdad (p. ej. -1500 en centavos) no son fórmula:
  // solo se neutralizan los TEXTOS que empiezan por un carácter peligroso.
  if (typeof v !== 'number' && FORMULA_START.test(s)) s = `'${s}`;
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// rows: array de objetos · columns: orden y selección de claves (opcional).
// opts.bom (true por defecto): antepone el BOM UTF-8.
// opts.headers: etiquetas legibles para la cabecera { clave: 'Etiqueta' }.
export function rowsToCsv(rows, columns, opts = {}) {
  const { bom = true, headers = null } = opts;
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : []);
  const header = cols.map(c => escapeCell(headers && headers[c] ? headers[c] : c)).join(',');
  const lines  = rows.map(r => cols.map(c => escapeCell(r[c])).join(','));
  return (bom ? CSV_BOM : '') + [header, ...lines].join('\r\n') + '\r\n';
}

// Cabeceras HTTP de una descarga CSV (mismo formato en todos los exportes).
export function sendCsv(res, filename, csv) {
  const safe = String(filename).replace(/[^\w.\-]/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(csv);
}
