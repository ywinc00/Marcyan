// /api/admin/finance/records?kind=<tipo>[&id=<id>][&year=2026]
//   tipos: accounts · vendors · refunds · income · tax-payments · mileage
//   GET    → { ok, rows }            (refunds, income, tax-payments y mileage por año)
//   POST   → { ok, row }             crear
//   PATCH  → { ok, row }             editar (accounts, vendors, income) · necesita id
//   DELETE → { ok, deleted }         borrar (no en accounts) · necesita id
// Protegido con requireAdmin. Montos en CENTAVOS USD. Errores de negocio con su
// código (400/404/409) y un mensaje en español llano que el panel enseña tal cual.
import { requireAdmin } from '../../../lib/auth.mjs';
import { houstonDate } from '../../../lib/dates.mjs';
import { isBusinessError } from '../../../lib/finance-rules.mjs';
import * as R from '../../../lib/finance-records.mjs';

const KINDS = {
  accounts: { list: () => R.listAccounts(), create: R.createAccount, update: R.updateAccount },
  vendors: { list: (y) => R.listVendors(y), create: R.createVendor, update: R.updateVendor, remove: R.deleteVendor },
  refunds: { list: (y) => R.listRefunds(y), create: R.createRefund, remove: R.deleteRefund },
  income: { list: (y) => R.listIncome(y), create: R.createIncome, update: R.updateIncome, remove: R.deleteIncome },
  'tax-payments': { list: (y) => R.listTaxPayments(y), create: R.createTaxPayment, remove: R.deleteTaxPayment },
  mileage: { list: (y) => R.listMileage(y), create: R.createMileage, remove: R.deleteMileage },
};

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  const q = req.query || {};
  const kind = KINDS[String(q.kind || '')];
  if (!kind) return res.status(400).json({ ok: false, error: 'Tipo de registro desconocido.' });
  const id = q.id === undefined ? null : String(q.id);
  if (id !== null && !/^\d{1,18}$/.test(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  try {
    if (req.method === 'GET') {
      const year = Number(q.year || houstonDate().slice(0, 4));
      return res.status(200).json({ ok: true, rows: await kind.list(year) });
    }
    if (req.method === 'POST') return res.status(201).json({ ok: true, row: await kind.create(body) });
    if (req.method === 'PATCH' && kind.update && id) {
      const row = await kind.update(id, body);
      if (!row) return res.status(404).json({ ok: false, error: 'No encontrado o sin cambios.' });
      return res.status(200).json({ ok: true, row });
    }
    if (req.method === 'DELETE' && kind.remove && id) {
      const ok = await kind.remove(id, session.email || null);
      if (!ok) return res.status(404).json({ ok: false, error: 'No encontrado.' });
      return res.status(200).json({ ok: true, deleted: id });
    }
    res.setHeader('Allow', ['GET', 'POST', kind.update && 'PATCH', kind.remove && 'DELETE'].filter(Boolean).join(', '));
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (isBusinessError(err)) return res.status(err.status).json({ ok: false, error: err.message });
    console.error(`[admin/finance/records ${q.kind} ${req.method}] error:`, err);
    return res.status(500).json({ ok: false, error: 'No se pudo guardar. Vuelve a intentarlo.' });
  }
}
