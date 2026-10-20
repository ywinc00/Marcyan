// ════════════════════════════════════════════════════════════════
//  scripts/test-crm.mjs  ·  npm run test:crm
//  Pruebas de Leads y Clientes (Orbit v2 · A2) SIN base de datos y SIN red:
//    · lib/finance.mjs  validación del alta (CRM-16), clave de duplicados,
//                       filtro de la lista, confirmación del borrado (CRM-13).
//    · lib/leads.mjs    conversión lead → cliente / brief con una conexión
//                       falsa: transacción completa, ROLLBACK en cada error,
//                       duplicados (409), ya convertido, sin migración (503).
//    · crm/crm.js       filtros de la URL ↔ API, textos y formato.
//    · Estático: la migración 011 es idempotente y lleva advisory lock.
//    · Integración CRM (int1): brief → cliente con UN solo evento y con
//      duplicados (409), briefs de la ficha sin repetir, lead que deja
//      "Convertido" conservando sus vínculos, y selector de cliente único.
//      Lo que usa la base corre sobre una copia de lib/finance.mjs y
//      lib/leads.mjs con @vercel/postgres sustituido por un doble en memoria
//      (nunca toca la base real).
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';

import {
  validateClientInput, normalizeEmail, phoneKey, buildClientFilter, clientDisplayName,
  deleteConfirmationMatches, CrmError, DUPLICATE_SQL, MIGRATION_011_MSG,
} from '../lib/finance.mjs';
import {
  convertLead, leadToClientData, leadToBriefColumns, packFacet, buildLeadFilter,
  safeHttpUrl, statusChangeError, keptConversionLinks,
} from '../lib/leads.mjs';
import {
  leadFiltersFromQuery, leadQueryPatch, leadApiParams, leadFilterPhrase,
  clientFiltersFromQuery, clientApiParams, clientQueryPatch, money, phoneHref, whatsappHref,
  deleteImpactText, leadEventText, leadStatus, leadSource, leavingConvertedMessage,
} from '../src/components/dashboard/crm/crm.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + (e && e.message)); }
}

// ── Validación del alta de cliente (CRM-16) ─────────────────────
await check('cliente: alta vacía → falta el nombre', () => {
  const v = validateClientInput({});
  assert.equal(v.ok, false);
  assert.ok(v.fields.business_name);
});
await check('cliente: basta el nombre de la persona', () => {
  const v = validateClientInput({ owner_name: '  Rosa Martínez ' });
  assert.equal(v.ok, true);
  assert.equal(v.clean.owner_name, 'Rosa Martínez');
  assert.equal(v.clean.status, 'active');
});
await check('cliente: correo mal escrito → error en el campo', () => {
  const v = validateClientInput({ business_name: 'X', email: 'rosa@' });
  assert.equal(v.ok, false);
  assert.ok(v.fields.email);
});
await check('cliente: correo se guarda en minúsculas', () => {
  assert.equal(validateClientInput({ business_name: 'X', email: ' Rosa@Ejemplo.COM ' }).clean.email, 'rosa@ejemplo.com');
});
await check('cliente: teléfono con menos de 7 dígitos → error', () => {
  assert.ok(validateClientInput({ business_name: 'X', phone: '555-12' }).fields.phone);
  assert.equal(validateClientInput({ business_name: 'X', phone: '(713) 555-0118' }).ok, true);
});
await check('cliente: parcial solo valida lo que llega', () => {
  const v = validateClientInput({ notes: 'hola' }, { partial: true });
  assert.equal(v.ok, true);
  assert.deepEqual(Object.keys(v.clean), ['notes']);
});
await check('cliente: parcial con estado desconocido → error', () => {
  assert.ok(validateClientInput({ status: 'borrado' }, { partial: true }).fields.status);
  assert.equal(validateClientInput({ status: 'archived' }, { partial: true }).clean.status, 'archived');
});
await check('cliente: textos recortados a su límite', () => {
  assert.equal(validateClientInput({ business_name: 'a'.repeat(500) }).clean.business_name.length, 200);
});

// ── Duplicados ─────────────────────────────────────────────────
await check('duplicados: correo normalizado', () => {
  assert.equal(normalizeEmail('  A@B.Com '), 'a@b.com');
  assert.equal(normalizeEmail(''), null);
});
await check('duplicados: teléfono por sus 10 últimos dígitos', () => {
  assert.equal(phoneKey('(713) 555-0118'), '7135550118');
  assert.equal(phoneKey('+1 713 555 0118'), '7135550118');
  assert.equal(phoneKey('555-12'), null);
});
await check('duplicados: la consulta compara correo sin mayúsculas y teléfono por dígitos', () => {
  assert.ok(/LOWER\(email\) = \$1/.test(DUPLICATE_SQL));
  assert.ok(/RIGHT\(REGEXP_REPLACE\(COALESCE\(phone, ''\), '\\D', '', 'g'\), 10\) = \$2/.test(DUPLICATE_SQL));
});

// ── Filtro de la lista de clientes ─────────────────────────────
await check('lista clientes: active excluye archivados sin parámetros', () => {
  const f = buildClientFilter({ active: true });
  assert.match(f.text, /c\.status <> 'archived'/);
  assert.equal(f.params.length, 0);
});
await check('lista clientes: el estado manda sobre active', () => {
  const f = buildClientFilter({ status: 'archived', active: true });
  assert.match(f.text, /c\.status = \$1/);
  assert.deepEqual(f.params, ['archived']);
});
await check('lista clientes: búsqueda por texto y por dígitos del teléfono', () => {
  const f = buildClientFilter({ search: '713-555' });
  assert.deepEqual(f.params, ['%713-555%', '%713555%']);
  assert.match(f.text, /city_state ILIKE \$1/);
  assert.match(f.text, /LIKE \$2/);
});
await check('lista clientes: estado desconocido se ignora', () => {
  assert.equal(buildClientFilter({ status: 'x' }).text, '');
});

// ── Confirmación del borrado definitivo (CRM-13) ───────────────
const CLI = { client_code: 'CLI-003', business_name: 'Café Habana 305', owner_name: 'Luis Herrera' };
await check('borrado: confirma con el nombre visible o el código', () => {
  assert.equal(deleteConfirmationMatches(CLI, 'café habana  305 '), true);
  assert.equal(deleteConfirmationMatches(CLI, 'cli-003'), true);
  assert.equal(deleteConfirmationMatches(CLI, 'Café Habana'), false);
  assert.equal(deleteConfirmationMatches(CLI, ''), false);
  assert.equal(deleteConfirmationMatches(CLI, undefined), false);
});
await check('borrado: nombre visible cae a la persona y al código', () => {
  assert.equal(clientDisplayName({ owner_name: 'Ana', client_code: 'CLI-1' }), 'Ana');
  assert.equal(clientDisplayName({ client_code: 'CLI-1' }), 'CLI-1');
});

// ── Datos que viajan del lead ──────────────────────────────────
const LEAD = {
  ref_id: 'LEAD-031', status: 'new', name: 'Daniela Ortiz', email: 'Daniela@Fiesta.example',
  phone: '(713) 555-0142', business_name: 'Fiesta Party Rentals', city: 'Houston, TX',
  interest: 'Página web', message: 'Quiere catálogo', converted_client_id: null, converted_brief_id: null,
};
await check('lead → cliente: copia negocio, persona, contacto y ciudad', () => {
  const d = leadToClientData(LEAD);
  assert.equal(d.business_name, 'Fiesta Party Rentals');
  assert.equal(d.owner_name, 'Daniela Ortiz');
  assert.equal(d.city_state, 'Houston, TX');
  assert.match(d.notes, /Página web/);
});
await check('lead → cliente: los datos corregidos mandan', () => {
  assert.equal(leadToClientData(LEAD, { business_name: 'Otro' }).business_name, 'Otro');
  assert.equal(leadToClientData(LEAD, { email: '' }).email, '');
});
await check('lead → brief: origen lead, pendiente, mensaje y referencia en notas', () => {
  const cols = Object.fromEntries(leadToBriefColumns(LEAD));
  assert.equal(cols.source, 'lead');
  assert.equal(cols.status, 'pending');
  assert.equal(cols.main_objective, 'Página web');
  assert.match(cols.additional_notes, /Quiere catálogo/);
  assert.match(cols.additional_notes, /LEAD-031/);
});

// ── Conversión con una conexión falsa ──────────────────────────
function fakeDb({ lead = LEAD, dups = [], existing = null, failOn = null, failCode = null } = {}) {
  const calls = [];
  let released = false;
  const db = {
    calls,
    get released() { return released; },
    release() { released = true; },
    async query(text, params = []) {
      const t = String(text).trim();
      calls.push({ t, params });
      if (failOn && failOn.test(t)) {
        const e = new Error('fallo simulado'); if (failCode) e.code = failCode; throw e;
      }
      if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(t)) return { rowCount: 0, rows: [] };
      if (/^SELECT \* FROM leads WHERE ref_id = \$1 FOR UPDATE/.test(t)) return lead ? { rowCount: 1, rows: [{ ...lead }] } : { rowCount: 0, rows: [] };
      if (/^SELECT client_code FROM clients/.test(t)) return { rowCount: 1, rows: [{ client_code: 'CLI-002' }] };
      if (/^SELECT \* FROM clients WHERE id = \$1/.test(t)) return existing ? { rowCount: 1, rows: [existing] } : { rowCount: 0, rows: [] };
      if (/LOWER\(email\) = \$1/.test(t)) return { rowCount: dups.length, rows: dups };
      if (/^INSERT INTO clients/.test(t)) return { rowCount: 1, rows: [{ id: '9', client_code: 'CLI-009', business_name: params[0], owner_name: params[1], status: 'active', source_brief_id: null }] };
      if (/^INSERT INTO briefs/.test(t)) return { rowCount: 1, rows: [{ project_id: 'MRC-020', status: 'pending', business_name: params[0], owner_name: params[1] }] };
      if (/^UPDATE leads/.test(t)) return { rowCount: 1, rows: [{ ...lead, status: 'converted', converted_client_id: params[1], converted_brief_id: params[2] }] };
      return { rowCount: 1, rows: [] };
    },
  };
  return db;
}
const kinds = (db) => db.calls.map((c) => c.t.split(/\s+/).slice(0, 3).join(' '));
const has = (db, re) => db.calls.some((c) => re.test(c.t));

await check('convertir: cliente nuevo + brief en una transacción', async () => {
  const db = fakeDb();
  const r = await convertLead('LEAD-031', { client: { mode: 'new' }, brief: true }, { connect: async () => db, actorEmail: 'yo@x' });
  const k = kinds(db);
  assert.equal(k[0], 'BEGIN');
  assert.equal(k[k.length - 1], 'COMMIT');
  assert.ok(!has(db, /^ROLLBACK/));
  assert.equal(r.client.client_code, 'CLI-009');
  assert.equal(r.brief.project_id, 'MRC-020');
  assert.deepEqual(r.created, { client: true, brief: true });
  const ins = db.calls.find((c) => /^INSERT INTO clients/.test(c.t));
  assert.match(ins.t, /next_client_id\(\)/);
  assert.ok(ins.params.includes('LEAD-031'), 'el cliente guarda el lead de origen');
  assert.ok(ins.params.includes('daniela@fiesta.example'), 'correo normalizado');
  assert.ok(has(db, /^UPDATE clients SET source_brief_id/), 'el cliente queda con el brief de origen');
  const up = db.calls.find((c) => /^UPDATE leads/.test(c.t));
  assert.deepEqual(up.params, ['LEAD-031', '9', 'MRC-020']);
  assert.ok(has(db, /'converted_to_client'/), 'evento en el brief');
  assert.equal(db.calls.filter((c) => /^INSERT INTO lead_events/.test(c.t)).length, 3);
  assert.equal(db.released, true);
});
await check('convertir: duplicado por correo o teléfono → 409 con los existentes y ROLLBACK', async () => {
  const dup = { id: '3', client_code: 'CLI-003', business_name: 'Fiesta', status: 'active' };
  const db = fakeDb({ dups: [dup] });
  await assert.rejects(
    convertLead('LEAD-031', { client: { mode: 'new' } }, { connect: async () => db }),
    (e) => e instanceof CrmError && e.status === 409 && e.extra.reason === 'duplicate' && e.extra.matches[0].client_code === 'CLI-003');
  assert.ok(has(db, /^ROLLBACK/));
  assert.ok(!has(db, /^INSERT INTO clients/));
  assert.ok(!has(db, /^COMMIT/));
  assert.equal(db.released, true);
});
await check('convertir: el dueño confirma el duplicado → se crea igual', async () => {
  const db = fakeDb({ dups: [{ id: '3', client_code: 'CLI-003' }] });
  const r = await convertLead('LEAD-031', { client: { mode: 'new', allowDuplicate: true } }, { connect: async () => db });
  assert.equal(r.created.client, true);
  assert.ok(!has(db, /LOWER\(email\) = \$1/), 'no vuelve a buscar duplicados');
});
await check('convertir: cliente existente no crea otro', async () => {
  const db = fakeDb({ existing: { id: '5', client_code: 'CLI-005', business_name: 'Bufete', status: 'active', source_brief_id: 'MRC-001' } });
  const r = await convertLead('LEAD-031', { client: { mode: 'existing', id: '5' }, brief: true }, { connect: async () => db });
  assert.equal(r.created.client, false);
  assert.ok(!has(db, /^INSERT INTO clients/));
  assert.ok(!has(db, /^UPDATE clients SET source_brief_id/), 'no pisa el brief de origen que ya tenía');
  assert.deepEqual(db.calls.find((c) => /^UPDATE leads/.test(c.t)).params, ['LEAD-031', '5', 'MRC-020']);
});
await check('convertir: cliente existente ARCHIVADO → 409 en texto llano y ROLLBACK (revisión int1, F2)', async () => {
  const db = fakeDb({ existing: { id: '5', client_code: 'CLI-005', business_name: 'Ana', status: 'archived' } });
  await assert.rejects(convertLead('LEAD-031', { client: { mode: 'existing', id: '5' } }, { connect: async () => db }),
    (e) => e instanceof CrmError && e.status === 409 && e.extra.reason === 'archived' && /archivado\. Reactívalo en su ficha/.test(e.message));
  assert.ok(has(db, /^ROLLBACK/));
  assert.ok(!has(db, /^UPDATE leads/));
});
await check('convertir: cliente existente que ya no existe → 404 y ROLLBACK', async () => {
  const db = fakeDb();
  await assert.rejects(convertLead('LEAD-031', { client: { mode: 'existing', id: '77' } }, { connect: async () => db }),
    (e) => e.status === 404);
  assert.ok(has(db, /^ROLLBACK/));
});
await check('convertir: ya convertido en cliente → 409', async () => {
  const db = fakeDb({ lead: { ...LEAD, converted_client_id: '2' } });
  await assert.rejects(convertLead('LEAD-031', { client: { mode: 'new' } }, { connect: async () => db }),
    (e) => e.status === 409 && e.extra.reason === 'already_client' && /CLI-002/.test(e.message));
});
await check('convertir: ya tiene brief → 409', async () => {
  const db = fakeDb({ lead: { ...LEAD, converted_brief_id: 'MRC-009' } });
  await assert.rejects(convertLead('LEAD-031', { brief: true }, { connect: async () => db }),
    (e) => e.status === 409 && e.extra.reason === 'already_brief');
});
await check('convertir: lead sin nombre → 400 con el campo; con nombre corregido, sí', async () => {
  const anon = { ...LEAD, name: null, business_name: null, email: null };
  await assert.rejects(convertLead('LEAD-029', { client: { mode: 'new' } }, { connect: async () => fakeDb({ lead: anon }) }),
    (e) => e.status === 400 && !!e.extra.fields.business_name);
  const r = await convertLead('LEAD-029', { client: { mode: 'new', data: { business_name: 'Restaurante' } } }, { connect: async () => fakeDb({ lead: anon }) });
  assert.equal(r.client.client_code, 'CLI-009');
});
await check('convertir: nada elegido → 400 sin abrir conexión', async () => {
  let opened = false;
  await assert.rejects(convertLead('LEAD-031', {}, { connect: async () => { opened = true; return fakeDb(); } }), (e) => e.status === 400);
  assert.equal(opened, false);
});
await check('convertir: lead inexistente → 404', async () => {
  await assert.rejects(convertLead('LEAD-999', { brief: true }, { connect: async () => fakeDb({ lead: null }) }), (e) => e.status === 404);
});
await check('convertir: sin la migración 011 (lead sin columnas nuevas) → 503', async () => {
  const legacy = { ...LEAD }; delete legacy.converted_client_id;
  const db = fakeDb({ lead: legacy });
  await assert.rejects(convertLead('LEAD-031', { brief: true }, { connect: async () => db }), (e) => e.status === 503);
  assert.ok(has(db, /^ROLLBACK/));
});
await check('convertir: tabla de historial ausente (42P01) → 503 y ROLLBACK', async () => {
  const db = fakeDb({ failOn: /^INSERT INTO lead_events/, failCode: '42P01' });
  await assert.rejects(convertLead('LEAD-031', { brief: true }, { connect: async () => db }), (e) => e.status === 503);
  assert.ok(has(db, /^ROLLBACK/));
  assert.ok(!has(db, /^COMMIT/));
});
await check('convertir: fallo a mitad (brief) → ROLLBACK, error original y conexión liberada', async () => {
  const db = fakeDb({ failOn: /^INSERT INTO briefs/ });
  await assert.rejects(convertLead('LEAD-031', { client: { mode: 'new' }, brief: true }, { connect: async () => db }), /fallo simulado/);
  assert.ok(has(db, /^ROLLBACK/));
  assert.ok(!has(db, /^UPDATE leads/));
  assert.equal(db.released, true);
});
await check('convertir: solo brief deja el cliente intacto', async () => {
  const db = fakeDb();
  const r = await convertLead('LEAD-031', { brief: true }, { connect: async () => db });
  assert.equal(r.client, null);
  assert.ok(!has(db, /clients/i) || !has(db, /^INSERT INTO clients/));
  assert.deepEqual(db.calls.find((c) => /^UPDATE leads/.test(c.t)).params, ['LEAD-031', null, 'MRC-020']);
});

// ── Recuentos de las pastillas ─────────────────────────────────
await check('pastillas: todas las claves presentes y total', () => {
  const o = packFacet([{ k: 'new', n: 3 }, { k: 'archived', n: 2 }], ['new', 'contacted', 'converted', 'archived']);
  assert.deepEqual(o, { all: 5, new: 3, contacted: 0, converted: 0, archived: 2 });
});
await check('pastillas: el filtro sin estado no lleva status', () => {
  const f = buildLeadFilter({ status: null, source: 'chat', search: 'ana' });
  assert.ok(!/status =/.test(f.text));
  assert.ok(/source =/.test(f.text));
});

// ── crm.js: URL ↔ API ───────────────────────────────────────────
await check('url leads: estado y origen legibles → valores de la API', () => {
  const f = leadFiltersFromQuery({ estado: 'nuevo', origen: 'diagnostico', q: ' ana ', pagina: '3' });
  assert.deepEqual(f, { status: 'new', source: 'diagnostic', search: 'ana', page: 3 });
});
await check('url leads: valores desconocidos se ignoran', () => {
  assert.deepEqual(leadFiltersFromQuery({ estado: 'x', origen: 'y', pagina: '-2' }), { status: '', source: '', search: '', page: 1 });
});
await check('url leads: patch con claves legibles y página 1 sin parámetro', () => {
  assert.deepEqual(leadQueryPatch({ status: 'contacted', source: '', page: 1 }), { estado: 'contactado', origen: '', pagina: '' });
});
await check('url leads: parámetros de la API con offset por página', () => {
  const p = leadApiParams({ status: 'new', source: '', search: 'ana', page: 2 });
  assert.equal(p.toString(), 'status=new&search=ana&limit=30&offset=30');
  assert.equal(leadApiParams({ status: 'new', search: '' }, { paged: false }).toString(), 'status=new');
});
await check('url leads: el vacío repite el filtro', () => {
  assert.equal(leadFilterPhrase({ status: 'new', source: 'chat', search: 'ana' }), 'leads nuevos por Chatbot que coincidan con «ana»');
  assert.equal(leadFilterPhrase({}), 'leads');
});
await check('url clientes: sin estado = sin archivados', () => {
  assert.equal(clientApiParams(clientFiltersFromQuery({})).get('active'), '1');
  assert.equal(clientApiParams(clientFiltersFromQuery({ estado: 'archivado' })).get('status'), 'archived');
  assert.deepEqual(clientQueryPatch({ status: 'inactive', page: 2 }), { estado: 'inactivo', pagina: '2' });
});
await check('formato: dinero, teléfono y WhatsApp', () => {
  assert.equal(money('150000'), '$1,500');
  assert.equal(money(150050), '$1,500.50');
  assert.equal(phoneHref('(713) 555-0142'), '+17135550142');
  assert.equal(whatsappHref('(713) 555-0142'), 'https://wa.me/17135550142');
  assert.equal(phoneHref('12'), '');
});
await check('textos: impacto del borrado dice exactamente qué se pierde', () => {
  assert.equal(deleteImpactText({ projects: 2, milestones: 9, invoices: 3, payments: 1, payments_cents: 50000 }),
    'También se borrarán para siempre 2 proyectos (con 9 hitos), 3 facturas y 1 pago ($500 cobrados).');
  assert.match(deleteImpactText({ projects: 0, invoices: 0, payments: 0 }), /solo se borra su ficha/);
});
await check('textos: historial y etiquetas legibles (nunca códigos crudos)', () => {
  assert.equal(leadEventText({ event_type: 'status_changed', data: { from: 'new', to: 'contacted' } }), 'Estado: Nuevo → Contactado');
  assert.equal(leadEventText({ event_type: 'converted_to_brief', data: { project_id: 'MRC-020' } }), 'Brief creado MRC-020');
  assert.equal(leadStatus('raro').label, 'Sin estado');
  assert.equal(leadSource('raro').label, 'Contacto');
});
await check('textos: copy sin em-dash ni voseo en crm.js', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/components/dashboard/crm/crm.js'), 'utf8');
  const strings = src.match(/'[^'\n]*'|`[^`\n]*`/g) || [];
  for (const s of strings) assert.ok(!/—/.test(s), 'em-dash en ' + s);
});

// ── Revisión adversarial (A2-R1…R8) ─────────────────────────────
await check('R1/R2: el evento del brief dice si el cliente es nuevo o ya existía', async () => {
  const nuevo = fakeDb();
  await convertLead('LEAD-031', { client: { mode: 'new' }, brief: true }, { connect: async () => nuevo });
  const e1 = JSON.parse(nuevo.calls.find((c) => /'converted_to_client'/.test(c.t) && /brief_events/.test(c.t)).params[2]);
  assert.equal(e1.created, true);
  assert.equal(e1.client_code, 'CLI-009');
  const exist = fakeDb({ existing: { id: '5', client_code: 'CLI-005', business_name: 'Bufete', status: 'active', source_brief_id: 'MRC-001' } });
  await convertLead('LEAD-031', { client: { mode: 'existing', id: '5' }, brief: true }, { connect: async () => exist });
  const e2 = JSON.parse(exist.calls.find((c) => /'converted_to_client'/.test(c.t) && /brief_events/.test(c.t)).params[2]);
  assert.equal(e2.created, false);
  assert.equal(e2.business_name, 'Bufete');
});
await check('R1: brief → cliente reconoce el vínculo a un cliente que ya existía y la ficha lo muestra', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/finance.mjs'), 'utf8');
  const conv = src.slice(src.indexOf('export async function convertBriefToClient'), src.indexOf('export async function createClientFromBrief'));
  assert.match(conv, /event_type = 'converted_to_client'/);
  assert.ok(conv.indexOf("'converted_to_client'") < conv.indexOf('createClient('), 'busca el vínculo antes de crear');
  const rel = src.slice(src.indexOf('export async function getClientRelated'));
  assert.match(rel, /DISTINCT ON \(project_id\)/);
});
await check('R3: solo se guardan URLs de origen http(s)', () => {
  assert.equal(safeHttpUrl('https://marcyan.com/es/'), 'https://marcyan.com/es/');
  assert.equal(safeHttpUrl(' http://x.example/a '), 'http://x.example/a');
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl('JavaScript:alert(1)'), null);
  assert.equal(safeHttpUrl('data:text/html,hola'), null);
  assert.equal(safeHttpUrl('/es/contacto'), null);
  assert.equal(safeHttpUrl(''), null);
  assert.equal(safeHttpUrl(null), null);
  const ficha = fs.readFileSync(path.join(ROOT, 'src/components/dashboard/crm/LeadDetail.svelte'), 'utf8');
  assert.match(ficha, /\/\^https\?:\\\/\\\/\/i\.test\(lead\.page_url\)/, 'la ficha solo enlaza http(s)');
});
await check('R4: el borrado definitivo manda la confirmación en el cuerpo, no en la URL', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/components/dashboard/crm/ClientDetail.svelte'), 'utf8');
  assert.ok(!/\?confirm=/.test(src));
  assert.match(src, /method: 'DELETE', body: \{ confirm:/);
});
await check('R6: "Convertido" sin cliente ni brief se rechaza con la migración aplicada', () => {
  const base = { status: 'new', converted_client_id: null, converted_brief_id: null };
  const e = statusChangeError(base, 'converted');
  assert.ok(e instanceof CrmError && e.status === 409 && e.extra.reason === 'use_convert');
  assert.equal(statusChangeError({ ...base, converted_client_id: 3 }, 'converted'), null, 'con cliente sí');
  assert.equal(statusChangeError({ ...base, converted_brief_id: 'MRC-020' }, 'converted'), null, 'con brief sí');
  assert.equal(statusChangeError({ status: 'new' }, 'converted'), null, 'sin la migración, como antes');
  assert.equal(statusChangeError({ ...base, status: 'converted' }, 'converted'), null, 'ya convertido de antes');
  assert.equal(statusChangeError(base, 'contacted'), null);
});
await check('R7: la búsqueda de leads mira también el interés', () => {
  const f = buildLeadFilter({ search: 'brincolines' });
  assert.match(f.text, /interest ILIKE \$1/);
  assert.deepEqual(f.params, ['%brincolines%']);
});
await check('R8: aviso sin migración sin siglas ni "quien mantiene el panel"', () => {
  assert.ok(!/\(CRM\)|mantiene el panel/.test(MIGRATION_011_MSG));
  const lista = fs.readFileSync(path.join(ROOT, 'src/components/dashboard/LeadsSection.svelte'), 'utf8');
  assert.ok(!/lead\.email \|\| lead\.ref_id\}/.test(lista), 'el monograma no sale del código del lead');
});

// ── Migración 011 ──────────────────────────────────────────────
await check('migración 011: transacción, advisory lock propio e idempotente', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'db/migrations/011_crm.sql'), 'utf8');
  assert.match(sql, /BEGIN;\s*SELECT pg_advisory_xact_lock\(91123770\);/);
  assert.match(sql, /COMMIT;\s*$/);
  const adds = sql.match(/ADD COLUMN(?! IF NOT EXISTS)/g);
  assert.equal(adds, null, 'todo ADD COLUMN lleva IF NOT EXISTS');
  assert.ok(!/CREATE (TABLE|INDEX)(?! IF NOT EXISTS)/.test(sql.replace(/CREATE UNIQUE INDEX IF NOT EXISTS/g, '')));
  for (const other of fs.readdirSync(path.join(ROOT, 'db/migrations'))) {
    if (other === '011_crm.sql') continue;
    assert.ok(!fs.readFileSync(path.join(ROOT, 'db/migrations', other), 'utf8').includes('91123770'), 'clave de lock repetida en ' + other);
  }
});
await check('estático: el endpoint de conversión exige sesión antes de nada', () => {
  const src = fs.readFileSync(path.join(ROOT, 'api/admin/leads/[id]/convert.mjs'), 'utf8');
  const i = src.indexOf('await requireAdmin(');
  assert.ok(i > 0 && i < src.indexOf('convertLead(id'));
});

// ── Integración CRM (int1) ──────────────────────────────────────
// Doble de @vercel/postgres SOLO para las copias "?crmfake" de los módulos.
const PG_FAKE = `
const run = (text, params) => {
  const f = globalThis.__crmSql;
  if (typeof f !== 'function') throw new Error('[prueba] sin doble de la base');
  (globalThis.__crmSqlLog ||= []).push({ text, params });
  return Promise.resolve(f(text, params) || []).then((rows) => ({ rows, rowCount: rows.length }));
};
export function sql(strings, ...values) { return run(strings.reduce((a, s, i) => a + '$' + i + s), values); }
sql.query = run;
export const db = { async connect() { return { query: run, release() {} }; } };
`;
const PG_HOOK = `
const FAKE = ${JSON.stringify('data:text/javascript,' + encodeURIComponent(PG_FAKE))};
export async function resolve(specifier, context, next) {
  if (specifier === '@vercel/postgres' && (context.parentURL || '').includes('crmfake')) return { url: FAKE, shortCircuit: true };
  return next(specifier, context);
}`;
register('data:text/javascript,' + encodeURIComponent(PG_HOOK), import.meta.url);
const FIN = await import(pathToFileURL(path.join(ROOT, 'lib/finance.mjs')).href + '?crmfake');
const LEADS = await import(pathToFileURL(path.join(ROOT, 'lib/leads.mjs')).href + '?crmfake');
function fakeSql(handler) { globalThis.__crmSqlLog = []; globalThis.__crmSql = handler; return () => globalThis.__crmSqlLog; }

const BRIEF_ROW = { project_id: 'MRC-021', business_name: 'Tacos Sol', owner_name: 'Rosa', email: 'Rosa@Sol.test', phone: '(713) 555-0118', city_state: 'Houston, TX', summary: null };
function briefDb({ dup = false } = {}) {
  return (text) => {
    if (/FROM briefs WHERE project_id/.test(text)) return [BRIEF_ROW];
    if (/FROM clients WHERE source_brief_id/.test(text)) return [];
    if (/FROM brief_events/.test(text) && /JOIN/.test(text)) return [];
    if (/LOWER\(email\)/.test(text)) return dup ? [{ id: 3, client_code: 'CLI-003', business_name: 'Tacos Sol Centro', email: 'rosa@sol.test', status: 'active' }] : [];
    if (/INSERT INTO clients/.test(text)) return [{ id: 9, client_code: 'CLI-009', business_name: 'Tacos Sol', status: 'active' }];
    if (/INSERT INTO brief_events/.test(text)) return [];
    throw new Error('consulta inesperada: ' + text.slice(0, 60));
  };
}

await check('int1: brief → cliente con duplicado por correo o teléfono → 409 con coincidencias y sin crear', async () => {
  const log = fakeSql(briefDb({ dup: true }));
  await assert.rejects(
    () => FIN.convertBriefToClient('mrc-021', 'equipo@marcyan.test', { checkDuplicates: true }),
    (e) => e.status === 409 && e.extra.reason === 'duplicate' && e.extra.matches[0].client_code === 'CLI-003' && /CLI-003/.test(e.message));
  assert.ok(!log().some((c) => /INSERT/.test(c.text)), 'no crea nada');
  // El correo del brief se compara en minúsculas y el teléfono por sus 10 dígitos.
  const dupQ = log().find((c) => /LOWER\(email\)/.test(c.text));
  assert.deepEqual(dupQ.params.slice(0, 2), ['rosa@sol.test', '7135550118']);
});
await check('int1: brief → cliente "crear igualmente" (sin comprobar) crea y deja UN evento con su actor', async () => {
  const log = fakeSql(briefDb({ dup: true }));
  const r = await FIN.convertBriefToClient('MRC-021', 'equipo@marcyan.test');
  assert.equal(r.created, true);
  assert.equal(r.client.client_code, 'CLI-009');
  assert.ok(!log().some((c) => /LOWER\(email\)/.test(c.text)), 'por defecto no busca duplicados');
  const evs = log().filter((c) => /INSERT INTO brief_events/.test(c.text));
  assert.equal(evs.length, 1, 'un solo converted_to_client');
  assert.match(evs[0].text, /'converted_to_client'/);
  assert.equal(evs[0].params[1], 'equipo@marcyan.test');
  const data = JSON.parse(evs[0].params[2]);
  assert.deepEqual({ client_id: data.client_id, created: data.created, linked: data.linked }, { client_id: 9, created: true, linked: false });
});
await check('int1: brief ya vinculado (por origen o por evento) → created:false y ningún evento nuevo', async () => {
  const log = fakeSql((text) => {
    if (/FROM briefs WHERE project_id/.test(text)) return [BRIEF_ROW];
    if (/FROM clients WHERE source_brief_id/.test(text)) return [];
    if (/FROM brief_events/.test(text) && /JOIN/.test(text)) return [{ id: 3, client_code: 'CLI-003' }];
    throw new Error('consulta inesperada: ' + text.slice(0, 60));
  });
  const r = await FIN.convertBriefToClient('MRC-021', 'equipo@marcyan.test', { checkDuplicates: true });
  assert.equal(r.created, false);
  assert.equal(r.client.client_code, 'CLI-003');
  assert.ok(!log().some((c) => /INSERT/.test(c.text)));
});
await check('int1: el handler del brief ya no escribe su propio converted_to_client', () => {
  const src = fs.readFileSync(path.join(ROOT, 'api/admin/briefs/[id].mjs'), 'utf8');
  const post = src.slice(src.indexOf("req.method === 'POST'"), src.indexOf("req.method === 'DELETE'"));
  assert.ok(!/type: 'converted_to_client'/.test(post), 'sin logEvent duplicado');
  assert.match(post, /convertBriefToClient\(id, session\.email, \{ checkDuplicates: body\.allow_duplicate !== true \}\)/);
  const cli = fs.readFileSync(path.join(ROOT, 'api/admin/clients.mjs'), 'utf8');
  assert.match(cli, /convertBriefToClient\(pid, session\.email, \{ checkDuplicates: body\.allow_duplicate !== true \}\)/);
});
await check('int1: la ficha del cliente lista cada brief una vez (origen, proyecto, evento y lead)', async () => {
  fakeSql((text, params) => {
    if (/FROM projects WHERE client_id/.test(text)) return [{ id: 1, brief_project_id: 'MRC-021' }];
    if (/FROM invoices i/.test(text)) return [];
    if (/AS projects/.test(text)) return [{ projects: 1, milestones: 0, invoices: 0, payments: 0, payments_cents: 0 }];
    if (/DISTINCT ON \(project_id\)/.test(text)) return [{ project_id: 'MRC-021' }, { project_id: 'MRC-030' }];
    if (/FROM leads/.test(text)) return [{ ref_id: 'LEAD-031', converted_brief_id: 'MRC-030' }];
    // La base devuelve una fila por cada código que se le pide (como haría
    // ANY($1)): si la lista llegara con repetidos, la ficha los pintaría.
    if (/FROM briefs WHERE project_id = ANY/.test(text)) {
      return params[0].map((pid) => ({ project_id: pid, status: 'won', business_name: 'Tacos Sol', created_at: '2026-10-01' }));
    }
    throw new Error('consulta inesperada: ' + text.slice(0, 60));
  });
  const related = await FIN.getClientRelated({ id: 3, source_brief_id: 'MRC-021', source_lead_id: null });
  const ids = related.briefs.map((b) => b.project_id);
  assert.deepEqual([...ids].sort(), ['MRC-021', 'MRC-030'], 'origen, proyecto, evento y lead: cada brief una vez');
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(related.leads.length, 1);
});
await check('int1: lead que deja "Convertido" conserva cliente y brief y lo dice el historial', async () => {
  const lead = { ref_id: 'LEAD-031', status: 'converted', notes: null, converted_client_id: 9, converted_brief_id: 'MRC-030', converted_at: '2026-10-01' };
  const log = fakeSql((text) => {
    if (/SELECT \* FROM leads WHERE ref_id/.test(text)) return [lead];
    if (/^UPDATE leads/.test(text.trim())) return [];
    if (/INSERT INTO lead_events/.test(text)) return [];
    throw new Error('consulta inesperada: ' + text.slice(0, 60));
  });
  await LEADS.updateLead('LEAD-031', { status: 'contacted' }, 'equipo@marcyan.test');
  const up = log().find((c) => /^UPDATE leads/.test(c.text.trim()));
  assert.match(up.text, /SET status = \$1 WHERE/);
  assert.ok(!/converted_/.test(up.text), 'no toca los vínculos de la conversión');
  const ev = log().find((c) => /INSERT INTO lead_events/.test(c.text));
  assert.deepEqual(JSON.parse(ev.params[3]), { from: 'converted', to: 'contacted', kept: { client_id: 9, brief_id: 'MRC-030' } });
});
// La base falsa EVALÚA cada COUNT(*) FILTER (WHERE …) de leadStats sobre unas
// filas en memoria (revisión int1, F3): si el conteo pasara a mirar los
// vínculos de la conversión en vez del estado, el resultado cambiaría.
function evalLeadCond(cond, l) {
  if (!cond) return true;
  return cond.split(/\s+AND\s+/).every((part) => {
    const p = part.trim();
    let m;
    if ((m = /^(\w+) = '([^']*)'$/.exec(p))) return l[m[1]] === m[2];
    if ((m = /^(\w+) IN \(([^)]*)\)$/.exec(p))) return m[2].split(',').map((x) => x.trim().replace(/'/g, '')).includes(l[m[1]]);
    if ((m = /^(\w+) IS NOT NULL$/.exec(p))) return l[m[1]] != null;
    if ((m = /^(\w+) IS NULL$/.exec(p))) return l[m[1]] == null;
    if (/^created_at [<>]=? \$\d+$/.test(p)) return false;
    throw new Error('condición sin evaluar en la prueba: ' + p);
  });
}
await check('int1: KPI y pastillas cuentan por estado (un lead que deja Convertido deja de contar)', async () => {
  const rows = [
    { status: 'converted', source: 'chat', converted_client_id: 9, converted_brief_id: null },
    { status: 'contacted', source: 'contact', converted_client_id: 9, converted_brief_id: 'MRC-030' }, // salió de Convertido
    { status: 'new', source: 'chat', converted_client_id: null, converted_brief_id: null },
  ];
  fakeSql((text) => {
    if (!/FROM leads/.test(text)) throw new Error('consulta inesperada: ' + text.slice(0, 60));
    const out = {};
    for (const m of text.matchAll(/COUNT\(\*\)(?: FILTER \(WHERE (.*?)\))?::int\s+AS (\w+)/g)) {
      out[m[2]] = rows.filter((l) => evalLeadCond(m[1], l)).length;
    }
    return [out];
  });
  const s = await LEADS.leadStats();
  assert.equal(s.total, 3);
  assert.equal(s.converted, 1, 'el lead que dejó Convertido ya no cuenta como convertido');
  assert.equal(s.contacted, 1, 'cuenta en su estado nuevo');
  assert.equal(s.pipeline, 2);
});
await check('int1: keptConversionLinks y el aviso del panel', () => {
  const conv = { ref_id: 'LEAD-031', status: 'converted', converted_client_id: 9, converted_brief_id: 'MRC-030' };
  assert.deepEqual(keptConversionLinks(conv, 'new'), { client_id: 9, brief_id: 'MRC-030' });
  assert.equal(keptConversionLinks(conv, 'converted'), null);
  assert.equal(keptConversionLinks({ ...conv, status: 'contacted' }, 'new'), null);
  assert.equal(keptConversionLinks({ ...conv, converted_client_id: null, converted_brief_id: null }, 'new'), null, 'convertido de etiqueta (antes de la 011)');
  const msg = leavingConvertedMessage(conv, 'contacted');
  assert.match(msg, /conservará su cliente y el brief MRC-030/);
  assert.match(msg, /Dejará de contar en Convertidos/);
  assert.ok(!/—/.test(msg));
  assert.match(leavingConvertedMessage({ ...conv, converted_brief_id: null }, 'archived'), /conservará su cliente:/);
  assert.equal(leavingConvertedMessage(conv, 'converted'), null);
  assert.equal(leavingConvertedMessage({ ...conv, converted_client_id: null, converted_brief_id: null }, 'new'), null);
  assert.equal(leadEventText({ event_type: 'status_changed', data: { from: 'converted', to: 'new', kept: { client_id: 9, brief_id: 'MRC-030' } } }),
    'Estado: Convertido → Nuevo (conserva su cliente y el brief MRC-030)');
  const sel = fs.readFileSync(path.join(ROOT, 'src/components/dashboard/crm/LeadStatusSelect.svelte'), 'utf8');
  assert.match(sel, /ConfirmDialog/);
  assert.match(sel, /crmReady && leavingConvertedMessage\(lead, next\)/, 'solo con la migración 011');
});
// Lo que pide el selector (active=1) devuelve de verdad la lista sin
// archivados: la base falsa aplica el WHERE que recibe sobre filas en memoria
// y falla si llega una condición que no sabe evaluar (revisión int1, F3).
const CLIENT_ROWS = [
  { id: 1, client_code: 'CLI-001', status: 'active' },
  { id: 2, client_code: 'CLI-002', status: 'archived' },
  { id: 3, client_code: 'CLI-003', status: 'inactive' },
];
function clientListDb(text, params) {
  if (/^\s*SELECT c\.\*/.test(text)) {
    const where = (/FROM clients c\s+WHERE ([\s\S]*?)\s+ORDER BY/.exec(text) || [])[1] || '';
    let out = CLIENT_ROWS;
    for (const part of where ? where.split(/\s+AND\s+/) : []) {
      let m;
      if (/^c\.status <> 'archived'$/.test(part.trim())) out = out.filter((r) => r.status !== 'archived');
      else if ((m = /^c\.status = \$(\d+)$/.exec(part.trim()))) out = out.filter((r) => r.status === params[m[1] - 1]);
      else throw new Error('condición sin evaluar en la prueba: ' + part.trim());
    }
    return out;
  }
  if (/COUNT\(\*\)::int AS n FROM clients c/.test(text)) return [{ n: 0 }];
  if (/GROUP BY c\.status/.test(text)) return [];
  if (/SUM\(x\.balance_cents\)/.test(text)) return [{ balance_cents: '0', with_active_projects: 0 }];
  throw new Error('consulta inesperada: ' + text.slice(0, 60));
}
await check('int1: la lista del selector (active=1) no trae archivados; sin el filtro sí', async () => {
  fakeSql(clientListDb);
  assert.deepEqual((await FIN.listClients({ active: true, limit: 8 })).rows.map((r) => r.client_code), ['CLI-001', 'CLI-003']);
  assert.deepEqual((await FIN.listClients({ limit: 8 })).rows.map((r) => r.client_code), ['CLI-001', 'CLI-002', 'CLI-003']);
  assert.deepEqual((await FIN.listClients({ status: 'archived', active: true })).rows.map((r) => r.client_code), ['CLI-002']);
  // El endpoint traduce active=1 a esa opción.
  const api = fs.readFileSync(path.join(ROOT, 'api/admin/clients.mjs'), 'utf8');
  assert.match(api, /const active = q\.active === '1' \|\| q\.active === 'true';/);
  assert.match(api, /listClients\(\{ status, active, search, limit, offset \}\)/);
});
await check('int1: ClientPicker es el único selector de cliente y no ofrece archivados', () => {
  const read = (f) => fs.readFileSync(path.join(ROOT, 'src/components/dashboard', f), 'utf8');
  for (const f of ['briefs/ConvertDialog.svelte', 'finanzas/InvoiceForm.svelte', 'progreso/ProjectForm.svelte', 'crm/ConvertLeadDialog.svelte']) {
    const src = read(f);
    assert.match(src, /import ClientPicker from '(\.\.\/crm|\.)\/ClientPicker\.svelte'/, f + ' usa ClientPicker');
    assert.ok(!/\/api\/admin\/clients\?/.test(src), f + ' no busca clientes por su cuenta');
  }
  assert.ok(!/\/api\/admin\/clients/.test(read('progreso/options.svelte.js')));
  const picker = read('crm/ClientPicker.svelte');
  assert.match(picker, /if \(!includeArchived\) p\.set\('active', '1'\)/);
  // Alta desde el selector: el envío del alta no se propaga al formulario de fuera.
  assert.match(picker, /<NewClientDialog bind:open=\{newOpen\}[^>]*onuse=\{pick\}/);
  assert.match(read('crm/NewClientDialog.svelte'), /e\.preventDefault\(\); e\.stopPropagation\(\);/);
});
// ── Archivados (revisión int1, F2): no se asignan a nada nuevo ────────
await check('int1: factura nueva para un cliente archivado → 409 en texto llano y sin crearla', async () => {
  const log = fakeSql((text) => {
    if (/FROM clients WHERE id/.test(text)) return [{ id: '5', status: 'archived' }];
    throw new Error('consulta inesperada: ' + text.slice(0, 60));
  });
  await assert.rejects(() => FIN.createInvoice({ client_id: '5', amount_cents: 50000 }),
    (e) => e instanceof FIN.FinanceError && e.status === 409 && /archivado\. Reactívalo en su ficha/.test(e.message));
  assert.ok(!log().some((c) => /INSERT/.test(c.text)));
});
await check('int1: pasar una factura a un cliente archivado → 409, ROLLBACK y sin cambios', async () => {
  const log = fakeSql((text) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(text.trim())) return [];
    if (/FROM invoices WHERE id = \$1 FOR UPDATE/.test(text)) return [{ id: '1', client_id: '3', project_id: null, status: 'sent', amount_cents: '50000', issued_at: null, due_date: null }];
    if (/FROM payments WHERE invoice_id/.test(text)) return [{ paid: '0' }];
    if (/FROM clients WHERE id/.test(text)) return [{ id: '5', status: 'archived' }];
    throw new Error('consulta inesperada: ' + text.slice(0, 60));
  });
  await assert.rejects(() => FIN.updateInvoice('1', { client_id: '5' }),
    (e) => e instanceof FIN.FinanceError && e.status === 409);
  assert.ok(log().some((c) => /^ROLLBACK$/.test(c.text.trim())));
  assert.ok(!log().some((c) => /^UPDATE invoices/.test(c.text.trim())));
});
await check('int1: el aviso de duplicados no deja "Usar este" un archivado (solo "Abrir ficha")', () => {
  const read = (f) => fs.readFileSync(path.join(ROOT, 'src/components/dashboard', f), 'utf8');
  const dup = read('crm/DuplicateNotice.svelte');
  assert.match(dup, /\{#if onuse && \(m\.status !== 'archived' \|\| archivedUsable\)\}/);
  assert.match(dup, /\{#if onuse && m\.status === 'archived' && !archivedUsable\}<span class="dup__note">Reactívalo en su ficha para usarlo\.<\/span>/);
  // Solo donde el botón abre la ficha se mantiene para archivados.
  assert.match(read('crm/ClientDetail.svelte'), /useLabel="Abrir ficha" archivedUsable/);
  assert.match(read('crm/NewClientDialog.svelte'), /archivedUsable=\{!onuse\}/);
  for (const f of ['crm/ConvertLeadDialog.svelte', 'briefs/ConvertDialog.svelte', 'finanzas/ClientForm.svelte', 'progreso/ProjectForm.svelte']) {
    assert.ok(!/archivedUsable/.test(read(f)), f + ' no elige archivados');
  }
});
await check('int1: "Usar este" del brief vincula al momento, como en el resto de altas (F4)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/components/dashboard/briefs/ConvertDialog.svelte'), 'utf8');
  assert.match(src, /function useExisting\(c\) \{ picked = c; mode = 'existing'; dupMatches = \[\]; error = ''; confirm\(\); \}/);
});
await check('int1: todos los puntos de alta ofrecen "usar el existente" o "crear igualmente"', () => {
  const read = (f) => fs.readFileSync(path.join(ROOT, 'src/components/dashboard', f), 'utf8');
  for (const f of ['crm/NewClientDialog.svelte', 'crm/ConvertLeadDialog.svelte', 'briefs/ConvertDialog.svelte', 'finanzas/ClientForm.svelte']) {
    const src = read(f);
    assert.match(src, /reason === 'duplicate'/, f + ' entiende el 409');
    assert.match(src, /<DuplicateNotice[^>]*onuse=/, f + ' ofrece usar el existente');
    assert.match(src, /onforce=/, f + ' ofrece crear igualmente');
  }
  assert.match(read('FinanzasSection.svelte'), /<NewClientDialog bind:open=\{newClientOpen\}/, 'el Nuevo cliente de Finanzas es el alta única');
  // Progreso, "El cliente del brief" (revisión int1, F1): el 409 lo recoge la
  // sección y el formulario pinta el mismo aviso.
  assert.match(read('ProgresoSection.svelte'), /reason === 'duplicate'/);
  assert.match(read('ProgresoSection.svelte'), /allow_duplicate: true/);
  assert.match(read('progreso/ProjectForm.svelte'), /<DuplicateNotice[^>]*onuse=\{useExisting\} onforce=\{onforce\}/);
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de CRM fallaron:\n  - ` + fails.join('\n  - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de Leads y Clientes pasaron.`);
