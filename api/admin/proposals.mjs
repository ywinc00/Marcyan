// /api/admin/proposals — Ventas por etapas y propuestas (Ventas §1, fase 1)
//   GET  ?view=pipeline        → { leads, funnel }: los contactos en curso con su propuesta viva y su
//                                siguiente paso (vistas «Por etapas» y «Para hoy»), y el embudo.
//   GET  ?view=catalog         → { catalog }: planes y proyectos con su precio y su mínimo (diálogo de Orbit)
//   GET  ?lead=LEAD-XXX        → { proposals } de ese contacto (la más reciente primero)
//   GET  ?client=ID            → { proposals } de ese cliente
//   POST { lead_ref?, client_id?, options, recommended_option?, client_value_cents?, send?, notes? }
//        → { proposal, created, lead_status }. Desde Orbit siempre created_by = 'orbit'.
// Errores: 400 con { field } si un dato no vale; 404; 503 sin la migración 029 o sin catálogo.
import { requireAdmin } from '../../lib/auth.mjs';
import { CrmError } from '../../lib/finance.mjs';
import { pipelineLeads, funnelSummary, listProposals, saveProposal, orbitCatalog } from '../../lib/proposals.mjs';

const normRef = (v) => String(v || '').trim().toUpperCase().slice(0, 40);

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      if (q.view === 'pipeline') {
        const [leads, funnel] = await Promise.all([pipelineLeads(), funnelSummary()]);
        return res.status(200).json({ ok: true, leads, funnel });
      }
      if (q.view === 'catalog') return res.status(200).json({ ok: true, catalog: await orbitCatalog() });
      if (q.lead) return res.status(200).json({ ok: true, proposals: await listProposals({ lead_ref: normRef(q.lead) }) });
      if (q.client) {
        const id = Number(q.client);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: 'Cliente no válido.' });
        return res.status(200).json({ ok: true, proposals: await listProposals({ client_id: id }) });
      }
      return res.status(400).json({ ok: false, error: 'Falta view=pipeline, lead o client.' });
    }

    if (req.method === 'POST') {
      const body = (typeof req.body === 'object' && req.body) ? req.body : {};
      const out = await saveProposal({
        lead_ref: body.lead_ref ? normRef(body.lead_ref) : null,
        client_id: body.client_id ?? null,
        created_by: 'orbit',
        options: body.options,
        recommended_option: body.recommended_option ?? null,
        client_value_cents: body.client_value_cents ?? null,
        send: body.send === true,
        notes: body.notes ?? null,
      }, { actorEmail: session.email });
      return res.status(201).json({ ok: true, ...out });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  } catch (err) {
    if (err instanceof CrmError) return res.status(err.status).json({ ok: false, error: err.message, ...err.extra });
    console.error('[admin/proposals] error:', err);
    return res.status(500).json({ ok: false, error: 'Error con las propuestas' });
  }
}
