// Pruebas de la ficha de llamada (scripts/ficha-llamada.mjs), sin base de datos.
// Uso: npm run test:ficha-llamada
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { armarFicha, leerLead, comprobar } from './ficha-llamada.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let pass = 0;
const fails = [];
async function check(name, fn) { try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + (e && e.message)); } }

const LEAD = {
  ref_id: 'LEAD-900', status: 'new', source: 'chat', name: 'Prueba Ficha', email: 'prueba@marcyan.test', phone: '(713) 555-0100',
  business_name: 'Taller de Prueba', city: 'Houston, TX', interest: 'Diseño web', message: 'Quiero una web para mi taller.',
  converted_brief_id: 'MRC-900', converted_client_id: '90', notes: 'Prefiere WhatsApp.', page_url: '/es/houston/diseno-web',
  created_at: '2026-11-10T15:00:00Z', updated_at: '2026-11-12T15:00:00Z',
};
const DATOS = {
  lead: LEAD,
  eventos: [{ event_type: 'status_changed', data: { from: 'new', to: 'contacted' }, created_at: '2026-11-11T15:00:00Z' }],
  convs: [{ sid: 's1', channel: 'web', lang: 'es', started_at: '2026-11-10T14:50:00Z', turns: 4, lead_kind: 'handoff', takeover_at: null }],
  turnos: [
    { sid: 's1', user_text: '¿Cuánto cuesta una web?', reply: 'Una web de 5 páginas sale desde $1,500.', tool: 'cotizar' },
    { sid: 's1', user_text: 'Quiero hablar con alguien', reply: 'Te llamamos hoy.', action_type: 'handoff' },
  ],
  citas: [{ starts_at: '2026-11-18T16:00:00Z', duration_min: 30, status: 'confirmed', topic: 'Web del taller' }],
  brief: { project_id: 'MRC-900', status: 'pending', created_at: '2026-11-12T15:00:00Z', website_type: 'Varias páginas', main_objective: 'Recibir citas', budget_range: '$1,000 a $2,500', timeline: '1 mes' },
  diag: { ref_id: 'DIAG-9', created_at: '2026-11-09T15:00:00Z', url: 'https://taller.test', score_total: 41, problem: 'No me encuentran', findings: [{ es: 'La web tarda 6 s en cargar en el móvil.' }] },
  cliente: { id: '90', client_code: 'CLI-090', status: 'active', created_at: '2026-11-13T15:00:00Z' },
  proyectos: [{ project_code: 'PRJ-090', name: 'Web del taller', service_type: 'web', status: 'active' }],
};

await check('la ficha trae lo que pide el encargo y en lenguaje llano', () => {
  const md = armarFicha(DATOS, new Date('2026-11-15T20:00:00Z'));
  for (const t of ['# Ficha de llamada · LEAD-900 · Taller de Prueba', '## Quién es', 'Prefiere WhatsApp.', '## Historial',
    'Etapa: Nuevo → Contactado', '## Conversación con Marcy', 'Vio precio: sí', 'desde $1,500', 'Pidió hablar con una persona: sí',
    '## Citas', '## Brief MRC-900', 'Presupuesto que indicó: $1,000 a $2,500', '## Diagnóstico DIAG-9', '41/100',
    'La web tarda 6 s', '## Ya es cliente · CLI-090', 'PRJ-090 · Web del taller']) {
    assert.ok(md.includes(t), 'falta: ' + t);
  }
  assert.ok(!/ip_address|user_agent|agreed_amount|undefined|null/.test(md), 'nada de sistema ni datos que sobran');
});
// ── Etapa y propuesta (tanda 2 de Ventas, 7b). Cifras inventadas: el repo es público. ──
const PROP = {
  ref_id: 'PROP-090', status: 'sent', created_by: 'marcy', recommended_option: 1, chosen_option: null, client_value_cents: '12300',
  sent_on: '2026-11-13', expires_on: '2026-11-27', follow_ups_done: 1, next_follow_up_on: '2026-11-18', decision_note: null,
  options: [
    { plan: { id: 'dominio', name: 'Dominio' }, projects: [{ name: 'Web por ciudades' }], project_cents: 123400, monthly_cents: 45600 },
    { plan: { id: 'crecimiento', name: 'Crecimiento' }, projects: [{ name: 'Web que vende' }], project_cents: 78900, monthly_cents: 32100 },
  ],
};
const EN_VENTA = { ...LEAD, status: 'proposal', stage_changed_at: '2026-11-13T15:00:00Z' };
await check('venta: etapa, siguiente paso, opciones con la recomendada, caducidad y seguimientos', () => {
  const md = armarFicha({ ...DATOS, lead: EN_VENTA, propuestas: [PROP, { ...PROP, ref_id: 'PROP-080', status: 'rejected' }] }, new Date('2026-11-20T18:00:00Z'));
  for (const t of ['## Etapa y propuesta', 'Etapa: Propuesta enviada', 'Desde: 13 nov 2026', 'Siguiente paso: Seguimiento del día 5',
    '**Propuesta PROP-090**: enviada el 13 nov, vale hasta el 27 nov. La preparó Marcy.', 'Siguiente paso: Seguimiento del día 5 (atrasado)',
    '- Dominio + Web por ciudades: $1,234 + $456/mes (se paga con 4 clientes nuevos al mes)',
    '- Crecimiento + Web que vende: $789 + $321/mes (recomendada, se paga con 3 clientes nuevos al mes)',
    'Le vale $123 cada cliente nuevo.', 'Seguimientos: 1 de 3 hechos; el próximo, el del día 5, toca el 18 nov.', 'Antes: PROP-080 (rechazada).']) {
    assert.ok(md.includes(t), 'falta: ' + t);
  }
  assert.ok(md.indexOf('## Etapa y propuesta') < md.indexOf('## Historial'), 'la venta va arriba, antes del historial');
  assert.ok(!/undefined|null|NaN/.test(md));
});
await check('venta: vencida sin respuesta, aceptada con la elegida y perdido con su motivo', () => {
  const ahora = new Date('2026-12-01T18:00:00Z');
  const vencida = armarFicha({ lead: EN_VENTA, propuestas: [PROP], eventos: [], convs: [], turnos: [], citas: [] }, ahora);
  assert.match(vencida, /enviada el 13 nov, venció el 27 nov sin respuesta/);
  assert.match(vencida, /Siguiente paso: Decidir la propuesta/);
  const aceptada = armarFicha({ lead: { ...EN_VENTA, status: 'converted' }, propuestas: [{ ...PROP, status: 'accepted', chosen_option: 0 }], eventos: [], convs: [], turnos: [], citas: [] }, ahora);
  assert.match(aceptada, /Dominio \+ Web por ciudades: \$1,234 \+ \$456\/mes \(la eligió/);
  assert.match(aceptada, /enviada el 13 nov, aceptada\./);
  assert.ok(!/Siguiente paso/.test(aceptada), 'ganado: sin siguiente paso');
  const perdido = armarFicha({ lead: { ...LEAD, status: 'lost', lost_reason: 'price', lost_note: 'Le pareció caro' }, propuestas: [], eventos: [], convs: [], turnos: [], citas: [] }, ahora);
  assert.match(perdido, /Motivo: Precio · Nota: Le pareció caro/);
  assert.match(perdido, /Sin propuesta todavía/);
});
await check('venta: un borrador con un precio por confirmar lo dice y pide ponerlo', () => {
  const borrador = { ...PROP, status: 'draft', sent_on: null, expires_on: null, next_follow_up_on: null, follow_ups_done: 0, created_at: '2026-11-20T15:00:00Z',
    options: [{ ...PROP.options[0], pending: true, projects: [{ name: 'Web por ciudades', pending_price: true }] }, PROP.options[1]] };
  const md = armarFicha({ lead: { ...EN_VENTA, status: 'diagnosed' }, propuestas: [borrador], eventos: [], convs: [], turnos: [], citas: [] }, new Date('2026-11-20T18:00:00Z'));
  assert.match(md, /Siguiente paso: Poner precio \(hoy\)/);
  assert.match(md, /- Dominio \+ Web por ciudades: desde \$1,234 \+ \$456\/mes \(precio por confirmar, /);
  assert.match(md, /- Crecimiento \+ Web que vende: \$789 \+ \$321\/mes \(recomendada/);
});
await check('venta: sin el permiso nuevo la ficha sale igual y lo dice', async () => {
  const c = { query: async (t) => {
    if (/stage_changed_at/.test(t) || /FROM proposals/.test(t)) { const e = new Error('permission denied'); e.code = '42501'; throw e; }
    if (/FROM leads/.test(t)) return { rowCount: 1, rows: [LEAD] };
    return { rowCount: 0, rows: [] };
  } };
  const d = await leerLead(c, 'LEAD-900');
  assert.equal(d.lead.ref_id, 'LEAD-900');
  assert.equal(d.propuestasSinPermiso, true);
  assert.match(armarFicha(d), /todavía no puede verlas/);
});
await check('sin chat ni citas lo dice, no deja secciones vacías', () => {
  const md = armarFicha({ lead: LEAD, eventos: [], convs: [], turnos: [], citas: [] });
  assert.match(md, /No habló con Marcy/);
  assert.match(md, /Sin citas/);
  assert.ok(!md.includes('## Brief') && !md.includes('## Ya es cliente'));
});

// Lectura: solo SELECT, columnas con nombre, nunca Finanzas, IP ni importes.
const FINANZAS = /\b(invoices|payments|company_expenses|subscriptions|refunds|income_entries|finance_[a-z_]+|tax_estimated_payments|mileage_trips|admin_sessions|admin_magic_tokens)\b/;
await check('leer un lead: solo SELECT con columnas con nombre; nada de Finanzas, IP ni importes', async () => {
  const vistas = [];
  const c = { query: async (t, p) => {
    vistas.push(t);
    if (/FROM leads/.test(t)) return { rowCount: 1, rows: [LEAD] };
    if (/FROM clients/.test(t)) return { rowCount: 1, rows: [{ id: '90', client_code: 'CLI-090', status: 'active' }] };
    if (/FROM briefs/.test(t)) return { rowCount: 1, rows: [DATOS.brief] };
    if (/FROM chat_conversations/.test(t)) return { rowCount: 1, rows: DATOS.convs };
    return { rowCount: 0, rows: [] };
  } };
  const d = await leerLead(c, 'lead-900');
  assert.equal(d.lead.ref_id, 'LEAD-900');
  assert.ok(vistas.length >= 8);
  for (const t of vistas) {
    assert.match(t.trim(), /^SELECT /, 'solo lecturas: ' + t.slice(0, 60));
    assert.ok(!/SELECT \*/.test(t), 'sin SELECT *');
    assert.ok(!FINANZAS.test(t), 'nada de Finanzas: ' + t.slice(0, 80));
    assert.ok(!/ip_address|user_agent|agreed_amount_cents|amount_cents/.test(t), 'sin IP ni importes: ' + t.slice(0, 80));
  }
});
await check('comprobar: pasa solo si la base niega Finanzas, IP, importes y escribir', async () => {
  const niega = { query: async (t) => {
    if (/^(BEGIN|ROLLBACK)/.test(t)) return {};
    if (/^SELECT (ref_id|stage_changed_at, lost_reason) FROM leads/.test(t) || /^SELECT ref_id, options, expires_on FROM proposals/.test(t)) return { rows: [] };
    const e = new Error('denied'); e.code = /INSERT/.test(t) ? '25006' : '42501'; throw e;
  } };
  const r1 = await comprobar(niega);
  assert.equal(r1.ok, true, r1.lineas.join(' | '));
  const deja = { query: async (t) => ({ rows: [] }) };
  const r2 = await comprobar(deja);
  assert.equal(r2.ok, false);
  assert.ok(r2.lineas.some((l) => /NO PASA · no lee facturas/.test(l)));
});
await check('el script solo conecta con ORBIT_LECTURA_URL, nunca con la conexión principal', () => {
  const src = fs.readFileSync(path.join(here, 'ficha-llamada.mjs'), 'utf8');
  assert.ok(src.includes('process.env.ORBIT_LECTURA_URL'));
  assert.ok(!/POSTGRES_URL|DATABASE_URL/.test(src.replace(/^\/\/.*$/gm, '')), 'no usa la conexión principal');
  assert.ok(!/console\.(log|error)\([^)]*ORBIT_LECTURA_URL\b[^'`"]/.test(src), 'no imprime la cadena');
  const gi = fs.readFileSync(path.join(here, '..', '.gitignore'), 'utf8');
  assert.match(gi, /^\.fichas\/?$/m, '.fichas/ fuera de git');
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de la ficha de llamada fallaron:\n - ${fails.join('\n - ')}`);
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de la ficha de llamada pasaron.`);
