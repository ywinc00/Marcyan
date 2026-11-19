// /api/admin/finance/books — libros de Finanzas (fase 1, migración 025)
//   GET ?view=year&year=2026          → historial mes a mes del año + año a año
//   GET ?view=schedule-c&year=2026    → resumen por línea del Schedule C
//   GET ?view=line&year=2026&line=8   → movimientos de esa línea
//   GET ?view=1099&year=2026          → contratistas y lista de 1099
//   GET ?view=tax&year=2026           → hoja del trimestral y calendario
//   GET ?view=month&month=2026-10     → el mes por dentro (cobros, gastos, comparación, pendientes)
//   GET ?view=close&month=2026-10     → checklist del cierre de ese mes
//   GET ?view=export&year=2026        → CSV con todos los movimientos del año (para el contador)
//   GET ?view=export&month=2026-10    → el mismo CSV, solo ese mes
//   GET ?view=settings                → ajustes de Finanzas
//   POST { action: 'close' | 'reopen', month }        → cerrar o reabrir un mes
//   POST { action: 'charges' }                         → generar ya los cargos de suscripciones
// Protegido con requireAdmin. Montos en CENTAVOS USD.
import { requireAdmin } from '../../../lib/auth.mjs';
import { houstonDate } from '../../../lib/dates.mjs';
import { rowsToCsv, sendCsv } from '../../../lib/csv.mjs';
import {
  BooksError, booksYear, booksYears, booksMonth, scheduleCSummary, contractors1099, estimatedTax,
  monthChecklist, closeMonth, reopenMonth, ledgerRows, getFinanceSettings, setFinanceSetting,
  generateSubscriptionCharges, scheduleCLine,
} from '../../../lib/finance-books.mjs';

const EXPORT_HEADERS = {
  fecha: 'Fecha', tipo: 'Tipo', contraparte: 'Cliente o proveedor', referencia: 'Concepto o factura',
  importe: 'Importe (USD)', comision: 'Comisión (USD)', categoria: 'Categoría',
  linea: 'Línea del Schedule C', cuenta: 'Cuenta', recibo: 'Recibo',
};
const dollars = (cents) => Number((Number(cents || 0) / 100).toFixed(2));

/** Filas del libro → CSV para el contador (montos en dólares, números de verdad). */
export function ledgerCsv(rows) {
  const out = rows.map((r) => ({ ...r, importe: dollars(r.importe), comision: dollars(r.comision) }));
  return rowsToCsv(out, Object.keys(EXPORT_HEADERS), { headers: EXPORT_HEADERS });
}

function yearOf(q) {
  const y = Number(q.year || houstonDate().slice(0, 4));
  return Number.isInteger(y) && y >= 2020 && y <= 2100 ? y : null;
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      const view = String(q.view || 'year');
      const year = yearOf(q);
      if (year === null) return res.status(400).json({ ok: false, error: 'Año no válido.' });
      if (view === 'year') return res.status(200).json({ ok: true, book: await booksYear(year), years: await booksYears() });
      if (view === 'schedule-c') return res.status(200).json({ ok: true, summary: await scheduleCSummary(year) });
      if (view === 'line') return res.status(200).json({ ok: true, ...(await scheduleCLine(year, q.line)) });
      if (view === '1099') return res.status(200).json({ ok: true, list: await contractors1099(year) });
      if (view === 'tax') return res.status(200).json({ ok: true, tax: await estimatedTax(year) });
      if (view === 'month') return res.status(200).json({ ok: true, month: await booksMonth(String(q.month || '')) });
      if (view === 'close') return res.status(200).json({ ok: true, checklist: await monthChecklist(String(q.month || '')) });
      if (view === 'settings') return res.status(200).json({ ok: true, settings: await getFinanceSettings() });
      if (view === 'export') {
        const mo = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(q.month || '')) ? String(q.month) : '';
        if (mo) {
          const rows = (await ledgerRows(Number(mo.slice(0, 4)))).filter((r) => String(r.fecha).startsWith(mo));
          return sendCsv(res, `marcyan-movimientos-${mo}.csv`, ledgerCsv(rows));
        }
        return sendCsv(res, `marcyan-movimientos-${year}.csv`, ledgerCsv(await ledgerRows(year)));
      }
      return res.status(400).json({ ok: false, error: 'Vista desconocida.' });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const by = session.email || null;
      if (body.action === 'close') return res.status(200).json({ ok: true, checklist: await closeMonth(body.month, by) });
      if (body.action === 'reopen') return res.status(200).json({ ok: true, checklist: await reopenMonth(body.month, by) });
      if (body.action === 'charges') return res.status(200).json({ ok: true, charges: await generateSubscriptionCharges() });
      return res.status(400).json({ ok: false, error: 'Acción desconocida.' });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof BooksError) return res.status(err.status).json({ ok: false, error: err.message });
    console.error('[admin/finance/books] error:', err);
    return res.status(500).json({ ok: false, error: 'No se pudieron leer los libros de Finanzas.' });
  }
}
