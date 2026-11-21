// ════════════════════════════════════════════════════════════════
//  scripts/test-proposals.mjs  ·  npm run test:proposals
//  Pruebas del embudo de ventas y las propuestas (Ventas §1, fase 1) SIN base y SIN red:
//    · lib/proposals.mjs  precios de cada opción con las reglas del catálogo (lo mensual
//                         no se descuenta; un proyecto nunca baja del público ni del
//                         mínimo), fechas de caducidad y seguimientos, etapas que solo
//                         avanzan, y las funciones de la base con una base falsa en
//                         memoria (transacción, reintento sin duplicar, contacto que
//                         avanza, 503 sin migración o sin catálogo).
//    · lib/leads.mjs      «perdido» pide motivo.
//    · Estático: la migración 029 solo añade y sus listas coinciden con el código.
//    · Fuga: ningún precio INTERNO del catálogo real aparece en los archivos de ventas
//      del repo (que es público). El catálogo de estas pruebas es inventado.
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  priceOption, projectPricing, catalogRules, paysBackWith, addDays, expiryDate, nextFollowUp,
  effectiveStatus, canAutoAdvance, money, rowToProposal, saveProposal, advanceLeadStage,
  sendProposal, editProposal, discardProposal, pendingPriceOf, decideProposal, markFollowUpDone, listProposals, funnelSummary, expireDueProposals,
  nextStep, pipelineLeads,
  OPEN_STAGES, LOST_REASONS, PROPOSAL_STATUSES, PROPOSAL_AUTHORS, MIGRATION_029_MSG, NO_CATALOG_MSG,
} from '../lib/proposals.mjs';
import { LEAD_STATUSES, LOST_REASONS as LEAD_LOST_REASONS } from '../lib/leads.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + (e && e.message)); }
}
const err400 = (field) => (e) => e.status === 400 && (!field || e.extra?.field === field);

// Catálogo INVENTADO (cifras que no son las reales; el repo es público).
const CAT = {
  version: 'prueba-1',
  reglas: { pisoSobreBase: 0.8, propuestaValidaDias: 14, seguimientoDias: [2, 5, 10], mensualSinDescuento: true },
  proyectos: {
    diag: { nombre: 'Diagnóstico', precio: 0 },
    pagina: { nombre: 'Página', precio: 1010 },
    sitio: { nombre: 'Sitio', precio: 3030 },
    ciudades: { nombre: 'Ciudades', desde: 7070 },
    ia: { nombre: 'Asistente', precio: 2020, mensual: 77 },
    seo1: { nombre: 'SEO', precio: 505 },
  },
  planes: {
    base: { nombre: 'Base', mensual: 111, enPropuestas: false },
    presencia: { nombre: 'Presencia', mensual: 333, enPropuestas: true },
    crecimiento: { nombre: 'Crecimiento', mensual: 555, enPropuestas: true },
    dominio: { nombre: 'Dominio', mensual: 888, enPropuestas: true, incluyeCuotaAsistente: true },
  },
  anadidosMensuales: { extra: { nombre: 'Extra', mensual: 44, para: ['presencia', 'crecimiento'] } },
  preciosPublicos: { anclas: { pagina: 900, seo1: 9999 }, mensuales: ['seo1'] },
};

// ── Precios de cada opción ──────────────────────────────────────
await check('precio: plan + proyecto con su precio interno y lo mensual del plan', () => {
  const o = priceOption(CAT, { plan: 'crecimiento', projects: [{ id: 'sitio' }] });
  assert.equal(o.plan.monthly_cents, 55500);
  assert.equal(o.projects[0].cents, 303000);
  assert.equal(o.project_cents, 303000);
  assert.equal(o.monthly_cents, 55500);
});
await check('precio: el mínimo es el mayor entre el público y piso × interno', () => {
  assert.equal(projectPricing(CAT, 'pagina').floor_cents, 90000);   // público 900 > 0,8 × 1010
  assert.equal(projectPricing(CAT, 'sitio').floor_cents, 242400);   // sin público: 0,8 × 3030
});
await check('precio: un ancla MENSUAL pública no es mínimo de un proyecto', () => {
  assert.equal(projectPricing(CAT, 'seo1').floor_cents, 40400);
});
await check('precio: por debajo del mínimo → 400 con el mínimo', () => {
  assert.throws(() => priceOption(CAT, { plan: null, projects: [{ id: 'pagina', price_cents: 89999 }] }),
    (e) => e.status === 400 && e.extra.floor_cents === 90000 && /no puede bajar de \$900/.test(e.message));
});
await check('precio: en el mínimo exacto y por encima del interno, sí', () => {
  assert.equal(priceOption(CAT, { projects: [{ id: 'pagina', price_cents: 90000 }] }).project_cents, 90000);
  assert.equal(priceOption(CAT, { projects: [{ id: 'ciudades', price_cents: 900000 }] }).project_cents, 900000);
});
await check('precio: un «desde» interno parte de su desde y nunca baja de él', () => {
  const o = priceOption(CAT, { projects: ['ciudades'] });
  assert.equal(o.projects[0].cents, 707000);
  assert.equal(projectPricing(CAT, 'ciudades').from_price, true);
  assert.equal(projectPricing(CAT, 'ciudades').floor_cents, 707000, 'el «desde», no el piso sobre la base');
  assert.throws(() => priceOption(CAT, { projects: [{ id: 'ciudades', price_cents: 706900 }] }),
    (e) => e.status === 400 && e.extra.field === 'options.0.projects.0' && e.extra.floor_cents === 707000);
});
await check('precio: un «desde» sin precio real queda por confirmar; con su precio, no', () => {
  const o = priceOption(CAT, { plan: 'crecimiento', projects: ['ciudades', 'sitio'] });
  assert.equal(o.projects[0].pending_price, true);
  assert.ok(!('pending_price' in o.projects[1]), 'un precio fijo nunca está por confirmar');
  assert.equal(o.pending, true);
  assert.deepEqual(pendingPriceOf([{ projects: [] }, o]), { option: 1, project: 0, name: 'Ciudades' });
  const real = priceOption(CAT, { projects: [{ id: 'ciudades', price_cents: 707000 }] });
  assert.ok(!real.pending && !real.projects[0].pending_price, 'con precio real, aunque sea el mismo que el «desde»');
  assert.equal(pendingPriceOf([real]), null);
  assert.equal(pendingPriceOf(null), null);
});
await check('precio: lo mensual no se descuenta', () => {
  assert.throws(() => priceOption(CAT, { plan: 'presencia', monthly_cents: 30000 }), err400('options.0.monthly_cents'));
  assert.equal(priceOption(CAT, { plan: 'presencia', monthly_cents: 33300 }).monthly_cents, 33300);
});
await check('precio: añadido solo en los planes que lo admiten', () => {
  assert.equal(priceOption(CAT, { plan: 'presencia', addons: ['extra'] }).monthly_cents, 33300 + 4400);
  assert.throws(() => priceOption(CAT, { plan: 'dominio', addons: ['extra'] }), err400('options.0.addons'));
  assert.throws(() => priceOption(CAT, { projects: ['sitio'], addons: ['extra'] }), err400('options.0.addons'));
});
await check('precio: la cuota del asistente suma, salvo en el plan que la incluye', () => {
  assert.equal(priceOption(CAT, { plan: 'crecimiento', projects: ['ia'] }).monthly_cents, 55500 + 7700);
  const d = priceOption(CAT, { plan: 'dominio', projects: ['ia'] });
  assert.equal(d.monthly_cents, 88800);
  assert.equal(d.projects[0].monthly_included, true);
});
await check('precio: Marcy y el Diagnóstico no ofrecen el plan que no va en propuestas', () => {
  assert.throws(() => priceOption(CAT, { plan: 'base' }, { author: 'marcy' }), err400('options.0.plan'));
  assert.equal(priceOption(CAT, { plan: 'base' }, { author: 'orbit' }).monthly_cents, 11100);
});
await check('precio: desconocidos, repetidos y opción vacía → 400', () => {
  assert.throws(() => priceOption(CAT, { plan: 'oro' }), err400('options.0.plan'));
  assert.throws(() => priceOption(CAT, { projects: ['nada'] }), err400('options.0.projects.0'));
  assert.throws(() => priceOption(CAT, { projects: ['sitio', 'sitio'] }), err400('options.0.projects.1'));
  assert.throws(() => priceOption(CAT, {}), err400('options.0'));
  assert.throws(() => priceOption(CAT, { projects: [{ id: 'sitio', price_cents: 12.5 }] }), err400());
});
await check('precio: el campo del error dice qué opción falla', () => {
  assert.throws(() => priceOption(CAT, { plan: 'oro' }, { index: 2 }), err400('options.2.plan'));
});
await check('precio: el diagnóstico gratis vale cero', () => {
  assert.equal(priceOption(CAT, { projects: ['diag'] }).project_cents, 0);
});

// ── Reglas, fechas y etapas ─────────────────────────────────────
await check('reglas: sin catálogo, lo acordado (14 días; 2, 5 y 10)', () => {
  assert.deepEqual(catalogRules(null), { floorRatio: 1, validDays: 14, followUpDays: [2, 5, 10] });
  assert.equal(catalogRules(CAT).floorRatio, 0.8);
});
await check('fechas: sumar días cruza mes y año', () => {
  assert.equal(addDays('2026-11-25', 14), '2026-12-09');
  assert.equal(addDays('2026-12-30', 5), '2027-01-04');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});
await check('fechas: caducidad y seguimientos 2, 5 y 10; después, ninguno', () => {
  assert.equal(expiryDate('2026-11-20', 14), '2026-12-04');
  assert.equal(nextFollowUp('2026-11-20', 0), '2026-11-22');
  assert.equal(nextFollowUp('2026-11-20', 1), '2026-11-25');
  assert.equal(nextFollowUp('2026-11-20', 2), '2026-11-30');
  assert.equal(nextFollowUp('2026-11-20', 3), null);
});
await check('estado: una enviada pasada de fecha cuenta como caducada', () => {
  assert.equal(effectiveStatus({ status: 'sent', expires_on: '2026-11-19' }, '2026-11-20'), 'expired');
  assert.equal(effectiveStatus({ status: 'sent', expires_on: '2026-11-20' }, '2026-11-20'), 'sent');
  assert.equal(effectiveStatus({ status: 'accepted', expires_on: '2026-01-01' }, '2026-11-20'), 'accepted');
});
await check('«se paga con N trabajos»', () => {
  assert.equal(paysBackWith(55500, 25000), 3);
  assert.equal(paysBackWith(55500, null), null);
  assert.equal(paysBackWith(0, 25000), null);
});
await check('etapas: lo automático solo avanza y solo dentro del embudo abierto', () => {
  assert.ok(canAutoAdvance('new', 'diagnosed'));
  assert.ok(canAutoAdvance('diagnosed', 'proposal'));
  assert.ok(!canAutoAdvance('proposal', 'diagnosed'));
  assert.ok(!canAutoAdvance('proposal', 'proposal'));
  for (const s of ['converted', 'lost', 'archived', 'test', 'spam']) assert.ok(!canAutoAdvance(s, 'proposal'), s);
});
await check('dinero: formato con y sin centavos', () => {
  assert.equal(money(303000), '$3,030');
  assert.equal(money(4950), '$49.50');
});
await check('fila → propuesta: números y «se paga con» por opción', () => {
  const p = rowToProposal({ id: '4', client_id: '9', client_value_cents: '25000', status: 'sent', expires_on: '2026-12-01',
    options: [{ monthly_cents: 55500 }] }, '2026-11-20');
  assert.equal(p.id, 4);
  assert.equal(p.client_id, 9);
  assert.equal(p.options[0].pays_back_jobs, 3);
  assert.equal(p.effective_status, 'sent');
});

// ── Base falsa en memoria ───────────────────────────────────────
function fakeDb({ catalog = CAT, leads = {}, clients = [9], briefs = ['MRC-050'], briefClients = {}, proposals = [], failOn = null, failCode = null, today = '2026-11-20' } = {}) {
  const st = { leads: structuredClone(leads), proposals: structuredClone(proposals), events: [], calls: [], inserts: [], released: false, seq: proposals.length };
  const one = (row) => ({ rowCount: row ? 1 : 0, rows: row ? [row] : [] });
  const findP = (ref) => st.proposals.find((p) => p.ref_id === ref);
  const db = {
    st,
    release() { st.released = true; },
    async query(text, params = []) {
      const t = String(text).replace(/\s+/g, ' ').trim();
      st.calls.push(t);
      if (failOn && failOn.test(t)) { const e = new Error('fallo simulado'); if (failCode) e.code = failCode; throw e; }
      if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(t)) return one(null);
      if (/FROM sales_catalog/.test(t)) return one(catalog ? { version: catalog.version, body: catalog } : null);
      if (/^SELECT .* FROM proposals WHERE created_by = \$1 AND source_ref = \$2/.test(t)) {
        return one(st.proposals.find((p) => p.created_by === params[0] && p.source_ref === params[1]));
      }
      if (/^SELECT .* FROM proposals WHERE ref_id = \$1 FOR UPDATE/.test(t)) return one(findP(params[0]));
      if (/^SELECT .* FROM leads WHERE ref_id = \$1/.test(t)) {
        const l = st.leads[params[0]];
        return one(l ? { ref_id: params[0], ...l } : null);
      }
      if (/^SELECT id FROM clients WHERE id = \$1/.test(t)) return one(clients.includes(params[0]) ? { id: params[0] } : null);
      if (/^SELECT project_id FROM briefs WHERE project_id = \$1/.test(t)) return one(briefs.includes(params[0]) ? { project_id: params[0] } : null);
      if (/^SELECT id FROM clients WHERE source_brief_id = \$1/.test(t)) return one(briefClients[params[0]] ? { id: briefClients[params[0]] } : null);
      if (/^SELECT .* FROM proposals WHERE brief_ref = \$1/.test(t)) {
        const rows = st.proposals.filter((p) => p.brief_ref === params[0]);
        return { rowCount: rows.length, rows: [...rows].reverse() };
      }
      if (/^SELECT next_proposal_id\(\)/.test(t)) return one({ id: 'PROP-' + String(++st.seq).padStart(3, '0') });
      if (/^INSERT INTO proposals/.test(t)) {
        st.inserts.push(t);
        const [ref, lead_ref, client_id, status, created_by, source_ref, actor_email, catalog_version, options, rec, value, expires, next, notes, brief_ref = null] = params;
        if (source_ref && st.proposals.some((p) => p.created_by === created_by && p.source_ref === source_ref)) return one(null);
        const sent = /\$11, NOW\(\)/.test(t);
        const row = {
          id: String(st.proposals.length + 1), ref_id: ref, lead_ref, client_id: client_id == null ? null : String(client_id), status,
          created_by, source_ref, actor_email, catalog_version, options: JSON.parse(options), recommended_option: rec, brief_ref,
          chosen_option: null, client_value_cents: value == null ? null : String(value), sent_at: sent ? 'ahora' : null,
          sent_on: sent ? today : null, expires_on: expires, follow_ups_done: 0, next_follow_up_on: next, notes,
          created_at: 'creada', updated_at: 'creada',
        };
        st.proposals.push(row);
        return one(row);
      }
      if (/^UPDATE leads SET status = \$1, stage_changed_at = NOW\(\) WHERE ref_id = \$2/.test(t)) {
        st.leads[params[1]].status = params[0];
        return one(null);
      }
      if (/^INSERT INTO lead_events/.test(t)) {
        st.events.push({ ref: params[0], type: params[1], data: params[3] ? JSON.parse(params[3]) : null });
        return one(null);
      }
      if (/^UPDATE proposals SET options = \$2::jsonb, recommended_option = \$3, client_value_cents = \$4, catalog_version = \$5/.test(t)) {
        const p = findP(params[0]);
        Object.assign(p, { options: JSON.parse(params[1]), recommended_option: params[2], client_value_cents: params[3] == null ? null : String(params[3]), catalog_version: params[4], updated_at: 'corregida' });
        return one(p);
      }
      if (/^DELETE FROM proposals WHERE status = 'draft' AND created_by = \$1 AND source_ref LIKE \$2 AND source_ref <> \$3 AND updated_at = created_at AND (lead_ref|brief_ref|client_id) = \$4 RETURNING ref_id$/.test(t)) {
        const col = t.match(/AND (lead_ref|brief_ref|client_id) = \$4/)[1];
        let re = '';
        for (let i = 0; i < params[1].length; i++) {
          const c = params[1][i];
          if (c === '\\') re += params[1][++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          else if (c === '%') re += '.*';
          else if (c === '_') re += '.';
          else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        const like = new RegExp('^' + re + '$', 's');
        const hit = st.proposals.filter((p) => p.status === 'draft' && p.created_by === params[0] && like.test(String(p.source_ref || ''))
          && p.source_ref !== params[2] && p.updated_at === p.created_at && String(p[col]) === String(params[3]));
        st.proposals = st.proposals.filter((p) => !hit.includes(p));
        return { rowCount: hit.length, rows: hit.map((p) => ({ ref_id: p.ref_id })) };
      }
      if (/^DELETE FROM proposals WHERE ref_id = \$1 AND status = \$2$/.test(t)) {
        const i = st.proposals.findIndex((p) => p.ref_id === params[0] && p.status === params[1]);
        if (i >= 0) st.proposals.splice(i, 1);
        return { rowCount: i >= 0 ? 1 : 0, rows: [] };
      }
      if (/^UPDATE proposals SET status = 'sent'/.test(t)) {
        const p = findP(params[0]);
        Object.assign(p, { status: 'sent', sent_at: 'ahora', sent_on: today, expires_on: params[1], next_follow_up_on: params[2], follow_ups_done: 0 });
        return one(p);
      }
      if (/^UPDATE proposals SET status = \$2, chosen_option = \$3/.test(t)) {
        const p = findP(params[0]);
        Object.assign(p, { status: params[1], chosen_option: params[2], decision_note: params[3], next_follow_up_on: null });
        return one(p);
      }
      if (/^UPDATE proposals SET follow_ups_done = \$2/.test(t)) {
        const p = findP(params[0]);
        Object.assign(p, { follow_ups_done: params[1], next_follow_up_on: params[2] });
        return one(p);
      }
      if (/^UPDATE proposals SET status = 'expired'/.test(t)) {
        const hit = st.proposals.filter((p) => p.status === 'sent' && p.expires_on < params[0]);
        hit.forEach((p) => { p.status = 'expired'; p.next_follow_up_on = null; });
        return { rowCount: hit.length, rows: hit.map((p) => ({ ref_id: p.ref_id, lead_ref: p.lead_ref, brief_ref: p.brief_ref || null })) };
      }
      if (/^SELECT status, COUNT\(\*\)::int AS n FROM leads/.test(t)) {
        const m = {};
        for (const l of Object.values(st.leads)) if (!['test', 'spam'].includes(l.status)) m[l.status] = (m[l.status] || 0) + 1;
        return { rowCount: Object.keys(m).length, rows: Object.entries(m).map(([status, n]) => ({ status, n })) };
      }
      if (/FROM proposals WHERE status = 'sent'$/.test(t)) {
        const d = params[0];
        const sent = st.proposals.filter((p) => p.status === 'sent');
        const live = sent.filter((p) => p.expires_on >= d);
        const pick = (p, k) => p.options[p.recommended_option ?? 0][k];
        return one({
          open: live.length,
          project_cents: String(live.reduce((s, p) => s + pick(p, 'project_cents'), 0)),
          monthly_cents: String(live.reduce((s, p) => s + pick(p, 'monthly_cents'), 0)),
          follow_ups_due: live.filter((p) => p.next_follow_up_on && p.next_follow_up_on <= d).length,
          expired: sent.filter((p) => p.expires_on < d).length,
        });
      }
      if (/^SELECT .* FROM proposals WHERE \(\$1::text/.test(t)) {
        const rows = st.proposals.filter((p) => (params[0] && p.lead_ref === params[0]) || (params[1] != null && Number(p.client_id) === params[1]));
        return { rowCount: rows.length, rows: [...rows].reverse() };
      }
      throw new Error('consulta inesperada: ' + t.slice(0, 80));
    },
  };
  return db;
}
const NOW = new Date('2026-11-20T18:00:00Z'); // 20-nov en Houston
const deps = (db, extra = {}) => ({ connect: async () => db, now: NOW, ...extra });
const OPTS3 = [
  { plan: 'dominio', projects: [{ id: 'ciudades', price_cents: 800000 }] },
  { plan: 'crecimiento', projects: ['sitio'] },
  { plan: 'presencia', projects: ['pagina'] },
];

await check('guardar: Marcy envía 3 opciones, el contacto pasa a «propuesta enviada»', async () => {
  const db = fakeDb({ leads: { 'LEAD-010': { status: 'contacted', converted_client_id: null } } });
  const r = await saveProposal({ lead_ref: 'LEAD-010', created_by: 'marcy', source_ref: 'conv-1', options: OPTS3,
    recommended_option: 1, client_value_cents: 30000, send: true }, deps(db));
  assert.equal(r.created, true);
  assert.equal(r.lead_status, 'proposal');
  assert.equal(r.proposal.ref_id, 'PROP-001');
  assert.equal(r.proposal.status, 'sent');
  assert.equal(r.proposal.expires_on, '2026-12-04');
  assert.equal(r.proposal.next_follow_up_on, '2026-11-22');
  assert.equal(r.proposal.options[1].pays_back_jobs, 2);
  assert.equal(r.proposal.options[0].project_cents, 800000);
  assert.deepEqual(db.st.events.map((e) => e.type), ['proposal_created', 'status_changed']);
  assert.deepEqual(db.st.events[1].data, { from: 'contacted', to: 'proposal', by: 'marcy' });
  assert.equal(db.st.calls[0], 'BEGIN');
  assert.equal(db.st.calls.at(-1), 'COMMIT');
  assert.ok(db.st.released);
});
await check('guardar: el reintento de Marcy devuelve la misma y no crea otra', async () => {
  const db = fakeDb({ leads: { 'LEAD-010': { status: 'contacted' } } });
  const input = { lead_ref: 'LEAD-010', created_by: 'marcy', source_ref: 'conv-1', options: OPTS3, send: true };
  await saveProposal(input, deps(db));
  const again = await saveProposal(input, deps(db));
  assert.equal(again.created, false);
  assert.equal(again.proposal.ref_id, 'PROP-001');
  assert.equal(again.lead_status, 'proposal');
  assert.equal(db.st.proposals.length, 1);
});
await check('guardar: el reintento no se cae aunque el catálogo haya cambiado', async () => {
  const db = fakeDb({ catalog: null, proposals: [{ ref_id: 'PROP-001', created_by: 'diagnostic', source_ref: 'diag-7', status: 'draft', options: [], lead_ref: null }] });
  const r = await saveProposal({ client_id: 9, created_by: 'diagnostic', source_ref: 'diag-7', options: [{ plan: 'crecimiento' }] }, deps(db));
  assert.equal(r.created, false);
});
await check('guardar: borrador en Orbit no mueve al contacto', async () => {
  const db = fakeDb({ leads: { 'LEAD-011': { status: 'new' } } });
  const r = await saveProposal({ lead_ref: 'LEAD-011', options: [{ plan: 'base' }] }, deps(db, { actorEmail: 'yo@x' }));
  assert.equal(r.proposal.status, 'draft');
  assert.equal(r.proposal.expires_on, null);
  assert.equal(r.lead_status, 'new');
  assert.deepEqual(db.st.events.map((e) => e.type), ['proposal_created']);
});
await check('guardar: contacto ya ganado: se une a su cliente y no se mueve', async () => {
  const db = fakeDb({ leads: { 'LEAD-012': { status: 'converted', converted_client_id: '9' } } });
  const r = await saveProposal({ lead_ref: 'LEAD-012', options: [{ plan: 'presencia' }], send: true }, deps(db));
  assert.equal(r.proposal.client_id, 9);
  assert.equal(r.lead_status, 'converted');
});
await check('guardar: contacto perdido no vuelve solo al embudo', async () => {
  const db = fakeDb({ leads: { 'LEAD-013': { status: 'lost' } } });
  const r = await saveProposal({ lead_ref: 'LEAD-013', options: [{ plan: 'presencia' }], send: true }, deps(db));
  assert.equal(r.lead_status, 'lost');
});
await check('guardar: los errores de forma salen antes de abrir la base', async () => {
  let opened = false;
  const d = { connect: async () => { opened = true; return fakeDb(); } };
  await assert.rejects(saveProposal({ created_by: 'marcy', lead_ref: 'LEAD-1', options: OPTS3 }, d), err400('source_ref'));
  await assert.rejects(saveProposal({ options: OPTS3 }, d), err400('lead_ref'));
  await assert.rejects(saveProposal({ lead_ref: 'L', options: [] }, d), err400('options'));
  await assert.rejects(saveProposal({ lead_ref: 'L', options: [...OPTS3, OPTS3[0]] }, d), err400('options'));
  await assert.rejects(saveProposal({ lead_ref: 'L', options: OPTS3, recommended_option: 3 }, d), err400('recommended_option'));
  await assert.rejects(saveProposal({ lead_ref: 'L', options: OPTS3, client_value_cents: -5 }, d), err400('client_value_cents'));
  await assert.rejects(saveProposal({ lead_ref: 'L', options: OPTS3, created_by: 'otro' }, d), err400('created_by'));
  assert.equal(opened, false);
});
await check('guardar: precio por debajo del mínimo → 400 y ROLLBACK', async () => {
  const db = fakeDb({ leads: { 'LEAD-014': { status: 'new' } } });
  await assert.rejects(saveProposal({ lead_ref: 'LEAD-014', options: [{ projects: [{ id: 'pagina', price_cents: 100 }] }] }, deps(db)), err400('options.0.projects.0'));
  assert.ok(db.st.calls.includes('ROLLBACK'));
  assert.equal(db.st.proposals.length, 0);
  assert.ok(db.st.released);
});
await check('guardar: sin catálogo cargado → 503 que dice cómo cargarlo', async () => {
  const db = fakeDb({ catalog: null, leads: { 'LEAD-015': { status: 'new' } } });
  await assert.rejects(saveProposal({ lead_ref: 'LEAD-015', options: [{ plan: 'presencia' }] }, deps(db)),
    (e) => e.status === 503 && e.message === NO_CATALOG_MSG);
});
await check('guardar: sin la migración 029 → 503', async () => {
  const db = fakeDb({ failOn: /sales_catalog/, failCode: '42P01' });
  await assert.rejects(saveProposal({ lead_ref: 'LEAD-1', options: [{ plan: 'presencia' }] }, deps(db)),
    (e) => e.status === 503 && e.message === MIGRATION_029_MSG);
});
await check('guardar (032): la propuesta de un brief, sin contacto; si el brief ya es cliente, va también al cliente', async () => {
  const db = fakeDb({ briefClients: { 'MRC-050': '9' } });
  const r = await saveProposal({ brief_ref: 'mrc-050', created_by: 'marcy', source_ref: 'conv-9', options: [{ plan: 'crecimiento' }] }, deps(db));
  assert.equal(r.created, true);
  assert.equal(r.proposal.client_id, 9);
  assert.equal(db.st.proposals[0].brief_ref, 'MRC-050');
  assert.equal(r.lead_status, null);
  assert.match(db.st.inserts[0], /notes, brief_ref/);
  const l = await listProposals({ brief_ref: 'MRC-050' }, deps(db));
  assert.deepEqual(l.map((p) => p.ref_id), ['PROP-001']);
  await assert.rejects(saveProposal({ brief_ref: 'MRC-404', options: [{ plan: 'crecimiento' }] }, deps(fakeDb())), (e) => e.status === 404);
});
await check('guardar: sin brief, el INSERT no nombra brief_ref (funciona sin la 032)', async () => {
  const db = fakeDb({ leads: { 'LEAD-060': { status: 'new' } } });
  await saveProposal({ lead_ref: 'LEAD-060', options: [{ plan: 'presencia' }] }, deps(db));
  assert.ok(!/brief_ref/.test(db.st.inserts[0]));
});
await check('guardar: contacto o cliente que no existen → 404', async () => {
  await assert.rejects(saveProposal({ lead_ref: 'LEAD-999', options: [{ plan: 'presencia' }] }, deps(fakeDb())), (e) => e.status === 404);
  await assert.rejects(saveProposal({ client_id: 77, options: [{ plan: 'presencia' }] }, deps(fakeDb())), (e) => e.status === 404);
});

await check('avanzar: el Diagnóstico mueve a «diagnóstico hecho» y queda en el historial', async () => {
  const db = fakeDb({ leads: { 'LEAD-020': { status: 'new' } } });
  const r = await advanceLeadStage('LEAD-020', 'diagnosed', deps(db, { by: 'diagnostic' }));
  assert.deepEqual(r, { lead_ref: 'LEAD-020', status: 'diagnosed', moved: true });
  assert.deepEqual(db.st.events[0].data, { from: 'new', to: 'diagnosed', by: 'diagnostic' });
});
await check('avanzar: hacia atrás o desde ganado, no hace nada', async () => {
  const db = fakeDb({ leads: { 'LEAD-021': { status: 'proposal' }, 'LEAD-022': { status: 'converted' } } });
  assert.equal((await advanceLeadStage('LEAD-021', 'diagnosed', deps(db))).moved, false);
  assert.equal((await advanceLeadStage('LEAD-022', 'proposal', deps(db))).moved, false);
  assert.equal(db.st.events.length, 0);
});
await check('avanzar: etapa no válida → 400; contacto que no existe → 404', async () => {
  await assert.rejects(advanceLeadStage('LEAD-1', 'converted', deps(fakeDb())), err400('stage'));
  await assert.rejects(advanceLeadStage('LEAD-1', 'lost', deps(fakeDb())), err400('stage'));
  await assert.rejects(advanceLeadStage('LEAD-404', 'diagnosed', deps(fakeDb())), (e) => e.status === 404);
});

const DRAFT = { ref_id: 'PROP-005', lead_ref: 'LEAD-030', status: 'draft', created_by: 'orbit', options: [{ project_cents: 1, monthly_cents: 2 }, { project_cents: 3, monthly_cents: 4 }] };
await check('enviar: borrador → enviada con caducidad y primer seguimiento; el contacto avanza', async () => {
  const db = fakeDb({ leads: { 'LEAD-030': { status: 'diagnosed' } }, proposals: [DRAFT] });
  const r = await sendProposal('PROP-005', deps(db));
  assert.equal(r.proposal.status, 'sent');
  assert.equal(r.proposal.expires_on, '2026-12-04');
  assert.equal(r.proposal.next_follow_up_on, '2026-11-22');
  assert.equal(r.lead_status, 'proposal');
  assert.deepEqual(db.st.events.map((e) => e.type), ['proposal_sent', 'status_changed']);
});
await check('enviar: solo un borrador (409)', async () => {
  const db = fakeDb({ proposals: [{ ...DRAFT, status: 'sent' }] });
  await assert.rejects(sendProposal('PROP-005', deps(db)), (e) => e.status === 409);
  await assert.rejects(sendProposal('PROP-404', deps(db)), (e) => e.status === 404);
});
await check('guardar: con un precio por confirmar no se guarda como enviada (400); en borrador, sí', async () => {
  const db = fakeDb({ leads: { 'LEAD-070': { status: 'diagnosed', converted_client_id: null } } });
  await assert.rejects(saveProposal({ lead_ref: 'LEAD-070', options: [{ plan: 'presencia' }, { projects: ['ciudades'] }], send: true }, deps(db)),
    err400('options.1.projects.0'));
  assert.equal(db.st.proposals.length, 0);
  assert.equal(db.st.leads['LEAD-070'].status, 'diagnosed', 'el contacto no avanza');
  const r = await saveProposal({ lead_ref: 'LEAD-070', created_by: 'marcy', source_ref: 'conv-70', options: [{ projects: ['ciudades'] }] }, deps(db));
  assert.equal(r.proposal.status, 'draft');
  assert.equal(r.proposal.options[0].pending, true);
});
await check('sustituir: una cotización nueva de la misma conversación sustituye al borrador anterior sin enviar', async () => {
  const db = fakeDb({ leads: { 'LEAD-080': { status: 'contacted', converted_client_id: null } } });
  const a = await saveProposal({ lead_ref: 'LEAD-080', created_by: 'marcy', source_ref: 'chat:s1:a', replaces_prefix: 'chat:s1:', options: [{ plan: 'presencia' }] }, deps(db));
  assert.deepEqual(a.replaced, [], 'la primera no sustituye nada');
  const b = await saveProposal({ lead_ref: 'LEAD-080', created_by: 'marcy', source_ref: 'chat:s1:b', replaces_prefix: 'chat:s1:', options: [{ plan: 'crecimiento' }] }, deps(db));
  assert.deepEqual(b.replaced, [a.proposal.ref_id]);
  assert.deepEqual(db.st.proposals.map((p) => p.ref_id), [b.proposal.ref_id]);
  assert.deepEqual(db.st.events.filter((e) => e.type === 'proposal_replaced'),
    [{ ref: 'LEAD-080', type: 'proposal_replaced', data: { proposal: a.proposal.ref_id, by: 'marcy', new_proposal: b.proposal.ref_id } }]);
  const again = await saveProposal({ lead_ref: 'LEAD-080', created_by: 'marcy', source_ref: 'chat:s1:b', replaces_prefix: 'chat:s1:', options: [{ plan: 'crecimiento' }] }, deps(db));
  assert.equal(again.created, false, 'un reintento devuelve la misma y no sustituye nada');
  assert.equal(db.st.proposals.length, 1);
});
await check('sustituir: nunca toca una enviada, una que el dueño corrigió, otra conversación, otro contacto ni otro autor', async () => {
  const base = { status: 'draft', created_by: 'marcy', lead_ref: 'LEAD-081', options: [], created_at: 'creada', updated_at: 'creada' };
  const db = fakeDb({ leads: { 'LEAD-081': { status: 'contacted', converted_client_id: null } }, proposals: [
    { ...base, ref_id: 'PROP-001', source_ref: 'chat:s1:a', status: 'sent' },
    { ...base, ref_id: 'PROP-002', source_ref: 'chat:s1:b', updated_at: 'corregida' },
    { ...base, ref_id: 'PROP-003', source_ref: 'chat:s2:a' },
    { ...base, ref_id: 'PROP-004', source_ref: 'chat:s1:c', lead_ref: 'LEAD-999' },
    { ...base, ref_id: 'PROP-005', source_ref: 'chat:s1:d', created_by: 'diagnostic' },
    { ...base, ref_id: 'PROP-006', source_ref: 'chat:s1x:e' },
    { ...base, ref_id: 'PROP-007', source_ref: 'chat:s1:f' },
  ] });
  const r = await saveProposal({ lead_ref: 'LEAD-081', created_by: 'marcy', source_ref: 'chat:s1:z', replaces_prefix: 'chat:s1:', options: [{ plan: 'presencia' }] }, deps(db));
  assert.deepEqual(r.replaced, ['PROP-007']);
  assert.deepEqual(db.st.proposals.map((p) => p.ref_id), ['PROP-001', 'PROP-002', 'PROP-003', 'PROP-004', 'PROP-005', 'PROP-006', r.proposal.ref_id]);
});
await check('sustituir: también en un brief; y el principio tiene que ser el del source_ref (400)', async () => {
  const db = fakeDb({ proposals: [{ ref_id: 'PROP-001', status: 'draft', created_by: 'marcy', source_ref: 'chat:s9:a', brief_ref: 'MRC-050', options: [], created_at: 'creada', updated_at: 'creada' }] });
  const r = await saveProposal({ brief_ref: 'MRC-050', created_by: 'marcy', source_ref: 'chat:s9:b', replaces_prefix: 'chat:s9:', options: [{ plan: 'presencia' }] }, deps(db));
  assert.deepEqual(r.replaced, ['PROP-001']);
  for (const p of ['chat:s8:', 'chat:s9:b', 'ch', '']) {
    if (p === '') { assert.ok(!('replaced' in (await saveProposal({ brief_ref: 'MRC-050', created_by: 'marcy', source_ref: 'chat:s9:c', replaces_prefix: p, options: [{ plan: 'presencia' }] }, deps(db))))); continue; }
    await assert.rejects(saveProposal({ brief_ref: 'MRC-050', created_by: 'marcy', source_ref: 'chat:s9:b', replaces_prefix: p, options: [{ plan: 'presencia' }] }, deps(db)), err400('replaces_prefix'));
  }
});
await check('sustituir: los comodines del principio no se cuelan en la búsqueda', async () => {
  const base = { status: 'draft', created_by: 'marcy', lead_ref: 'LEAD-082', options: [], created_at: 'creada', updated_at: 'creada' };
  const db = fakeDb({ leads: { 'LEAD-082': { status: 'contacted', converted_client_id: null } }, proposals: [
    { ...base, ref_id: 'PROP-001', source_ref: 'chat:sAB:a' },
    { ...base, ref_id: 'PROP-002', source_ref: 'chat:s_%:a' },
  ] });
  const r = await saveProposal({ lead_ref: 'LEAD-082', created_by: 'marcy', source_ref: 'chat:s_%:b', replaces_prefix: 'chat:s_%:', options: [{ plan: 'presencia' }] }, deps(db));
  assert.deepEqual(r.replaced, ['PROP-002'], '«_» y «%» del principio cuentan como letras');
});
const PENDING = { ...DRAFT, ref_id: 'PROP-006', lead_ref: 'LEAD-031', created_by: 'marcy', created_at: '2026-11-20T10:00:00Z',
  options: [{ projects: [{ id: 'ciudades', name: 'Ciudades', cents: 707000, pending_price: true }], project_cents: 707000, monthly_cents: 0, pending: true }] };
await check('enviar: con un precio por confirmar no se envía (409) y el contacto no se mueve', async () => {
  const db = fakeDb({ leads: { 'LEAD-031': { status: 'diagnosed' } }, proposals: [PENDING] });
  await assert.rejects(sendProposal('PROP-006', deps(db)), (e) => e.status === 409 && e.extra?.reason === 'pending_price' && /«Ciudades»/.test(e.message));
  assert.equal(db.st.proposals[0].status, 'draft');
  assert.equal(db.st.leads['LEAD-031'].status, 'diagnosed');
  assert.equal(db.st.events.length, 0);
});
await check('corregir: el borrador toma las opciones nuevas con los precios de hoy, se apunta, y ya se puede enviar', async () => {
  const db = fakeDb({ leads: { 'LEAD-031': { status: 'diagnosed' } }, proposals: [PENDING] });
  const r = await editProposal('PROP-006', { options: [{ plan: 'dominio', projects: [{ id: 'ciudades', price_cents: 800000 }] }, { plan: 'crecimiento', projects: ['sitio'] }],
    recommended_option: 1, client_value_cents: 15000 }, deps(db, { actorEmail: 'yo@x' }));
  assert.equal(r.proposal.status, 'draft');
  assert.equal(r.proposal.options.length, 2);
  assert.equal(r.proposal.options[0].project_cents, 800000);
  assert.ok(!r.proposal.options[0].pending);
  assert.equal(r.proposal.recommended_option, 1);
  assert.equal(r.proposal.client_value_cents, 15000);
  assert.equal(r.proposal.catalog_version, CAT.version);
  assert.deepEqual(db.st.events, [{ ref: 'LEAD-031', type: 'proposal_edited', data: { proposal: 'PROP-006' } }]);
  assert.equal((await sendProposal('PROP-006', deps(db))).proposal.status, 'sent');
});
await check('corregir: Orbit puede ofrecer cualquier plan, sin bajar del mínimo', async () => {
  const db = fakeDb({ proposals: [PENDING] });
  assert.equal((await editProposal('PROP-006', { options: [{ plan: 'base' }] }, deps(db))).proposal.options[0].monthly_cents, 11100);
  await assert.rejects(editProposal('PROP-006', { options: [{ projects: [{ id: 'pagina', price_cents: 89999 }] }] }, deps(db)), err400('options.0.projects.0'));
});
await check('corregir: solo un borrador (409); sin opciones (400); no existe (404)', async () => {
  const db = fakeDb({ proposals: [{ ...PENDING, status: 'sent' }] });
  await assert.rejects(editProposal('PROP-006', { options: [{ plan: 'presencia' }] }, deps(db)), (e) => e.status === 409);
  await assert.rejects(editProposal('PROP-006', { options: [] }, deps(db)), err400('options'));
  await assert.rejects(editProposal('PROP-006', { options: [{ plan: 'presencia' }], recommended_option: 3 }, deps(db)), err400('recommended_option'));
  await assert.rejects(editProposal('PROP-404', { options: [{ plan: 'presencia' }] }, deps(db)), (e) => e.status === 404);
});
await check('descartar: el borrador se borra y queda en el historial; una enviada no (409)', async () => {
  const db = fakeDb({ leads: { 'LEAD-031': { status: 'diagnosed' } }, proposals: [PENDING] });
  assert.deepEqual(await discardProposal('PROP-006', deps(db)), { discarded: 'PROP-006' });
  assert.equal(db.st.proposals.length, 0);
  assert.deepEqual(db.st.events, [{ ref: 'LEAD-031', type: 'proposal_discarded', data: { proposal: 'PROP-006', by: 'marcy' } }]);
  assert.equal(db.st.leads['LEAD-031'].status, 'diagnosed', 'el contacto se queda en su etapa');
  const db2 = fakeDb({ proposals: [{ ...PENDING, status: 'sent' }] });
  await assert.rejects(discardProposal('PROP-006', deps(db2)), (e) => e.status === 409);
  assert.equal(db2.st.proposals.length, 1);
  await assert.rejects(discardProposal('PROP-404', deps(db2)), (e) => e.status === 404);
});
await check('descartar: el de un brief, sin contacto, también (y sin historial de contacto)', async () => {
  const db = fakeDb({ proposals: [{ ...PENDING, lead_ref: null, brief_ref: 'MRC-050' }] });
  await discardProposal('PROP-006', deps(db));
  assert.equal(db.st.proposals.length, 0);
  assert.equal(db.st.events.length, 0);
});
await check('decidir: aceptada pide qué opción eligió (con dos o más)', async () => {
  const db = fakeDb({ proposals: [{ ...DRAFT, status: 'sent' }] });
  await assert.rejects(decideProposal('PROP-005', { status: 'accepted' }, deps(db)), err400('chosen_option'));
  const r = await decideProposal('PROP-005', { status: 'accepted', chosen_option: 1 }, deps(db));
  assert.equal(r.proposal.status, 'accepted');
  assert.equal(r.proposal.chosen_option, 1);
  assert.deepEqual(db.st.events.at(-1), { ref: 'LEAD-030', type: 'proposal_accepted', data: { proposal: 'PROP-005', option: 1 } });
});
await check('decidir: con una sola opción, aceptada es esa; rechazada sin opción', async () => {
  const one = { ...DRAFT, status: 'sent', options: [DRAFT.options[0]] };
  const a = await decideProposal('PROP-005', { status: 'accepted' }, deps(fakeDb({ proposals: [one] })));
  assert.equal(a.proposal.chosen_option, 0);
  const r = await decideProposal('PROP-005', { status: 'rejected', note: 'eligió a otro' }, deps(fakeDb({ proposals: [one] })));
  assert.equal(r.proposal.chosen_option, null);
  assert.equal(r.proposal.decision_note, 'eligió a otro');
});
await check('decidir: una caducada se puede decidir; un borrador no; estado raro → 400', async () => {
  const ok = await decideProposal('PROP-005', { status: 'rejected' }, deps(fakeDb({ proposals: [{ ...DRAFT, status: 'expired' }] })));
  assert.equal(ok.proposal.status, 'rejected');
  await assert.rejects(decideProposal('PROP-005', { status: 'rejected' }, deps(fakeDb({ proposals: [DRAFT] }))), (e) => e.status === 409);
  await assert.rejects(decideProposal('PROP-005', { status: 'sent' }, deps(fakeDb({ proposals: [DRAFT] }))), err400('status'));
});
await check('seguimientos: 1.º → toca el del día 5; 3.º → ya no queda ninguno', async () => {
  const p = { ...DRAFT, status: 'sent', sent_on: '2026-11-20', follow_ups_done: 0, next_follow_up_on: '2026-11-22' };
  const db = fakeDb({ proposals: [p] });
  assert.equal((await markFollowUpDone('PROP-005', deps(db))).proposal.next_follow_up_on, '2026-11-25');
  assert.equal((await markFollowUpDone('PROP-005', deps(db))).proposal.next_follow_up_on, '2026-11-30');
  const last = await markFollowUpDone('PROP-005', deps(db));
  assert.equal(last.proposal.follow_ups_done, 3);
  assert.equal(last.proposal.next_follow_up_on, null);
  assert.deepEqual(db.st.events.map((e) => e.data.step), [1, 2, 3]);
  await assert.rejects(markFollowUpDone('PROP-005', deps(fakeDb({ proposals: [DRAFT] }))), (e) => e.status === 409);
});
await check('caducar: solo las enviadas pasadas de fecha; el contacto no pasa a perdido', async () => {
  const db = fakeDb({
    leads: { 'LEAD-030': { status: 'proposal' } },
    proposals: [
      { ...DRAFT, ref_id: 'PROP-001', status: 'sent', expires_on: '2026-11-19' },
      { ...DRAFT, ref_id: 'PROP-002', status: 'sent', expires_on: '2026-11-20' },
      { ...DRAFT, ref_id: 'PROP-003', status: 'draft', expires_on: null },
    ],
  });
  const r = await expireDueProposals(deps(db));
  assert.deepEqual(r.expired, ['PROP-001']);
  assert.equal(db.st.leads['LEAD-030'].status, 'proposal');
  assert.deepEqual(db.st.events.map((e) => e.type), ['proposal_expired']);
});
await check('embudo: cuenta por etapa sin prueba ni spam y suma la recomendada de las vigentes', async () => {
  const db = fakeDb({
    leads: { a: { status: 'new' }, b: { status: 'proposal' }, c: { status: 'proposal' }, d: { status: 'spam' } },
    proposals: [
      { ...DRAFT, ref_id: 'PROP-001', status: 'sent', expires_on: '2026-12-01', recommended_option: 1, next_follow_up_on: '2026-11-20' },
      { ...DRAFT, ref_id: 'PROP-002', status: 'sent', expires_on: '2026-12-01', recommended_option: null, next_follow_up_on: '2026-11-25' },
      { ...DRAFT, ref_id: 'PROP-003', status: 'sent', expires_on: '2026-11-01' },
    ],
  });
  const f = await funnelSummary(deps(db));
  assert.deepEqual(f.stages, { new: 1, proposal: 2 });
  assert.deepEqual(f.proposed, { open: 2, project_cents: 4, monthly_cents: 6 });
  assert.equal(f.follow_ups_due, 1);
  assert.equal(f.expired_pending, 1);
});
await check('lista: las del contacto, la más reciente primero; sin filtro → 400', async () => {
  const db = fakeDb({ proposals: [{ ...DRAFT, ref_id: 'PROP-001' }, { ...DRAFT, ref_id: 'PROP-002' }, { ...DRAFT, ref_id: 'PROP-003', lead_ref: 'otro' }] });
  const l = await listProposals({ lead_ref: 'LEAD-030' }, deps(db));
  assert.deepEqual(l.map((p) => p.ref_id), ['PROP-002', 'PROP-001']);
  await assert.rejects(listProposals({}, deps(db)), err400());
});

// ── Siguiente paso de cada contacto ─────────────────────────────
const at = (iso) => new Date(iso);
const N = at('2026-11-20T18:00:00Z'); // 20-nov, 12:00 en Houston
await check('siguiente: contacto nuevo, 24 horas para contestar', () => {
  assert.deepEqual(nextStep({ status: 'new', created_at: at('2026-11-20T15:00:00Z') }, null, { now: N }),
    { kind: 'reply', due: '2026-11-21T15:00:00.000Z', bucket: 'today' });
  assert.equal(nextStep({ status: 'new', created_at: at('2026-11-19T14:40:00Z') }, null, { now: N }).bucket, 'late');
});
await check('siguiente: diagnóstico hecho, la propuesta en 24 horas desde que pasó de etapa', () => {
  const s = nextStep({ status: 'diagnosed', created_at: at('2026-10-01T00:00:00Z'), stage_changed_at: at('2026-11-20T10:00:00Z') }, null, { now: N });
  assert.equal(s.kind, 'send_proposal');
  assert.equal(s.bucket, 'today');
  assert.equal(nextStep({ status: 'diagnosed', created_at: at('2026-10-31T00:00:00Z') }, null, { now: N }).bucket, 'late');
});
await check('siguiente: propuesta enviada, el seguimiento que toca y su día', () => {
  const p = { status: 'sent', sent_on: '2026-11-15', expires_on: '2026-11-29', follow_ups_done: 1, next_follow_up_on: '2026-11-20' };
  assert.deepEqual(nextStep({ status: 'proposal' }, p, { now: N }), { kind: 'follow_up', due: '2026-11-20', step: 5, bucket: 'today' });
  assert.equal(nextStep({ status: 'proposal' }, { ...p, next_follow_up_on: '2026-11-18' }, { now: N }).bucket, 'late');
  assert.equal(nextStep({ status: 'proposal' }, { ...p, next_follow_up_on: '2026-11-21' }, { now: N }).bucket, 'week');
});
await check('siguiente: sin seguimientos que hacer, espera; vencida, atrasado', () => {
  const p = { status: 'sent', sent_on: '2026-11-01', expires_on: '2026-11-25', follow_ups_done: 3, next_follow_up_on: null };
  assert.deepEqual(nextStep({ status: 'proposal' }, p, { now: N }), { kind: 'waiting', due: '2026-11-25', bucket: 'week' });
  assert.equal(nextStep({ status: 'proposal' }, { ...p, expires_on: '2026-11-15' }, { now: N }).kind, 'expired');
  assert.equal(nextStep({ status: 'proposal' }, { ...p, status: 'expired', expires_on: '2026-11-15' }, { now: N }).bucket, 'late',
    'la ya marcada como caducada sigue avisando hasta que el dueño decida');
});
await check('siguiente: un borrador sin enviar pide enviarlo en 24 horas desde que se creó, y manda sobre lo demás', () => {
  const draft = { status: 'draft', created_at: at('2026-11-20T10:00:00Z') };
  assert.deepEqual(nextStep({ status: 'new', created_at: at('2026-11-18T00:00:00Z') }, draft, { now: N }), { kind: 'send_proposal', due: '2026-11-21T10:00:00.000Z', bucket: 'today' });
  assert.equal(nextStep({ status: 'contacted', created_at: at('2026-11-01T00:00:00Z') }, { ...draft, created_at: at('2026-11-18T10:00:00Z') }, { now: N }).bucket, 'late');
  assert.equal(nextStep({ status: 'proposal' }, draft, { now: N }).kind, 'send_proposal', 'en «propuesta enviada» sin enviar nada todavía');
  assert.equal(nextStep({ status: 'converted' }, draft, { now: N }).kind, 'none', 'ganado: no pide nada');
});
await check('siguiente: un borrador con un precio por confirmar pide primero el precio', () => {
  const draft = { status: 'draft', created_at: at('2026-11-20T10:00:00Z'), options: [{ projects: [{ name: 'Ciudades', pending_price: true }] }] };
  assert.equal(nextStep({ status: 'diagnosed' }, draft, { now: N }).pending_price, true);
  assert.equal(nextStep({ status: 'diagnosed' }, { status: 'draft', created_at: draft.created_at, options: 1, pending_price: true }, { now: N }).pending_price, true,
    'con el resumen del embudo (sin opciones)');
  assert.ok(!('pending_price' in nextStep({ status: 'diagnosed' }, { ...draft, options: [{ projects: [{ name: 'Sitio' }] }] }, { now: N })));
});
await check('siguiente: contactado, sin siguiente paso y los días que lleva', () => {
  assert.deepEqual(nextStep({ status: 'contacted', created_at: at('2026-11-01T00:00:00Z'), stage_changed_at: at('2026-11-14T12:00:00Z') }, null, { now: N }),
    { kind: 'none', days: 6, bucket: 'week' });
});
await check('en curso: cada contacto con su propuesta viva resumida y su siguiente paso', async () => {
  const db = fakeDb();
  db.query = async (text) => {
    const t = String(text).replace(/\s+/g, ' ').trim();
    if (/FROM sales_catalog/.test(t)) return { rowCount: 1, rows: [{ version: CAT.version, body: CAT }] };
    if (/FROM leads l LEFT JOIN LATERAL/.test(t)) {
      assert.match(t, /WHERE l\.status IN \('new', 'contacted', 'diagnosed', 'proposal'\)/);
      return { rowCount: 2, rows: [
        { ref_id: 'LEAD-1', status: 'proposal', created_at: at('2026-11-10T00:00:00Z'), p_ref: 'PROP-1', p_status: 'sent',
          p_options: [{ project_cents: 10, monthly_cents: 20 }, { project_cents: 30, monthly_cents: 40 }], p_rec: 1,
          p_expires_on: '2026-11-27', p_next: '2026-11-20', p_done: 1, p_sent_on: '2026-11-13', p_created_at: at('2026-11-12T00:00:00Z') },
        { ref_id: 'LEAD-2', status: 'new', created_at: at('2026-11-19T10:00:00Z'), p_ref: null },
      ] };
    }
    throw new Error('consulta inesperada: ' + t.slice(0, 60));
  };
  const rows = await pipelineLeads(deps(db));
  assert.deepEqual(rows[0].proposal, { ref_id: 'PROP-1', status: 'sent', options: 2, project_cents: 30, monthly_cents: 40,
    expires_on: '2026-11-27', next_follow_up_on: '2026-11-20', follow_ups_done: 1, sent_on: '2026-11-13', created_at: at('2026-11-12T00:00:00Z'), effective_status: 'sent' });
  assert.deepEqual(rows[0].next, { kind: 'follow_up', due: '2026-11-20', step: 5, bucket: 'today' });
  assert.equal(rows[1].proposal, null);
  assert.equal(rows[1].next.bucket, 'late');
  assert.ok(!('ip_address' in rows[1]), 'sin IP ni navegador en la lista');
});

// ── Estático: la migración y las listas del código ──────────────
const MIG32 = fs.readFileSync(path.join(ROOT, 'db/migrations/032_propuestas_brief.sql'), 'utf8')
  .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
await check('032: solo añade la columna del brief, su índice y su relación', () => {
  assert.match(MIG32, /ADD COLUMN IF NOT EXISTS brief_ref TEXT/);
  assert.match(MIG32, /REFERENCES briefs\(project_id\) ON DELETE SET NULL/);
  assert.match(MIG32, /CREATE INDEX IF NOT EXISTS idx_proposals_brief/);
  assert.ok(!/\bDROP\b|^\s*DELETE\b|^\s*UPDATE\b/im.test(MIG32));
});
const MIG = fs.readFileSync(path.join(ROOT, 'db/migrations/029_ventas_embudo.sql'), 'utf8');
const sqlOnly = MIG.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const listIn = (re) => [...(sqlOnly.match(re)?.[1] || '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
await check('029: solo añade (nada de borrar ni cambiar datos)', () => {
  assert.ok(!/\bDROP\s+(TABLE|COLUMN)\b/i.test(sqlOnly));
  assert.ok(!/^\s*DELETE\b|\bTRUNCATE\b|\bALTER\s+COLUMN\b/im.test(sqlOnly));
  assert.ok(!/^\s*UPDATE\b/im.test(sqlOnly));
  assert.ok(!/RENAME/i.test(sqlOnly));
});
await check('029: idempotente y la regla de estados no revisa filas viejas', () => {
  assert.ok(/CHECK \(status IN \([^)]*\)\)\s*NOT VALID/.test(sqlOnly));
  for (const m of sqlOnly.matchAll(/CREATE (?:UNIQUE )?(?:TABLE|INDEX)\s+(?!IF NOT EXISTS)\w+/g)) assert.fail('sin IF NOT EXISTS: ' + m[0]);
  for (const m of sqlOnly.matchAll(/ADD COLUMN\s+(?!IF NOT EXISTS)/g)) assert.fail('ADD COLUMN sin IF NOT EXISTS');
});
await check('029: sus listas coinciden con el código', () => {
  assert.deepEqual(listIn(/leads_status_check\s+CHECK \(status IN \(([^)]*)\)/), LEAD_STATUSES);
  assert.deepEqual(listIn(/CHECK \(lost_reason IS NULL OR lost_reason IN \(([^)]*)\)/), LOST_REASONS);
  assert.deepEqual(listIn(/CHECK \(status IN \(('draft'[^)]*)\)/), PROPOSAL_STATUSES);
  assert.deepEqual(listIn(/CHECK \(created_by IN \(([^)]*)\)/), PROPOSAL_AUTHORS);
  assert.deepEqual(LOST_REASONS, LEAD_LOST_REASONS);
  for (const s of OPEN_STAGES) assert.ok(LEAD_STATUSES.includes(s), s);
});
await check('029: el dinero en centavos y enteros grandes', () => {
  for (const m of sqlOnly.matchAll(/^\s+(\w+_cents)\s+(\w+)/gm)) assert.equal(m[2], 'BIGINT', m[1]);
});

// ── Fuga: los precios internos del catálogo real no están en el repo ──
function findCatalog() {
  let dir = ROOT;
  for (let i = 0; i < 12; i++) {
    const f = path.join(dir, '_cerebro/ventas/catalogo.json');
    if (fs.existsSync(f)) return f;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const realPath = process.env.MARCYAN_CATALOGO || findCatalog();
if (realPath && fs.existsSync(realPath)) {
  await check('fuga: ningún precio interno en los archivos de ventas del repo', () => {
    const real = JSON.parse(fs.readFileSync(realPath, 'utf8'));
    const pub = new Set(Object.values(real.preciosPublicos?.anclas || {}));
    const vals = new Set();
    for (const p of Object.values(real.proyectos || {})) for (const k of ['precio', 'desde', 'mensual', 'segundoIdioma']) if (p[k] > 0) vals.add(p[k]);
    for (const p of Object.values(real.planes || {})) if (p.mensual > 0) vals.add(p.mensual);
    for (const a of Object.values(real.anadidosMensuales || {})) if (a.mensual > 0) vals.add(a.mensual);
    const internal = [...vals].filter((v) => !pub.has(v));
    const files = [
      'lib/proposals.mjs', 'db/migrations/029_ventas_embudo.sql', 'docs/orbit/plan-ventas-orbit.md', 'design/ventas.md',
      'scripts/test-proposals.mjs', 'scripts/sync-catalogo-orbit.mjs', 'api/admin/leads/[id].mjs',
    ];
    files.push('scripts/test-crm.mjs', 'src/components/dashboard/LeadsSection.svelte', 'api/admin/proposals.mjs', 'api/cron/finanzas.mjs',
      'scripts/ficha-llamada.mjs', 'scripts/test-ficha-llamada.mjs', 'docs/orbit/ficha-llamada.md', 'db/sql/orbit-lectura.sql');
    for (const dir of ['src/components/dashboard/crm', 'src/components/dashboard/ventas']) {
      const abs = path.join(ROOT, dir);
      if (fs.existsSync(abs)) for (const f of fs.readdirSync(abs)) files.push(dir + '/' + f);
    }
    const hits = [];
    for (const f of files) {
      const p = path.join(ROOT, f);
      if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const v of internal) {
        const fmt = [String(v), v.toLocaleString('en-US')].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        if (new RegExp(`\\$\\s?(${fmt.join('|')})(?![\\d,])`).test(text)) hits.push(`${f}: $${v}`);
      }
    }
    assert.deepEqual(hits, []);
  });
}

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de propuestas fallaron:`);
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de propuestas pasaron${realPath ? '' : ' (sin catálogo real: la prueba de fuga no corrió)'}.`);
