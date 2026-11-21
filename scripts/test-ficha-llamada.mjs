// Pruebas de la ficha de llamada (scripts/ficha-llamada.mjs), sin base de datos.
// Uso: npm run test:ficha-llamada
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { armarFicha, leerLead, comprobar, armarEmbudo, leerEmbudo, ventanasEmbudo } from './ficha-llamada.mjs';

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

// ── Lista del embudo (Ventas 7d) ─────────────────────────────────
// Lunes 23-nov, 9:00 en Houston. Precios inventados.
const AHORA = new Date('2026-11-23T15:00:00Z');
const opt = (name, extra = {}) => ({ plan: { name: 'Plan Prueba' }, projects: [{ name, ...extra }], project_cents: 100000, monthly_cents: 10000 });
const EMBUDO = {
  leads: [
    { ref_id: 'LEAD-901', status: 'new', source: 'chat', name: 'Ana Prueba', business_name: 'Café Prueba', email: 'ana@marcyan.test', phone: '(713) 555-0101',
      created_at: '2026-11-21T15:00:00Z', updated_at: '2026-11-21T15:00:00Z', stage_changed_at: '2026-11-21T15:00:00Z' },
    { ref_id: 'LEAD-902', status: 'proposal', source: 'contact', name: 'Beto Prueba', business_name: 'Taller Prueba',
      created_at: '2026-11-10T15:00:00Z', updated_at: '2026-11-18T15:00:00Z', stage_changed_at: '2026-11-18T15:00:00Z' },
    { ref_id: 'LEAD-903', status: 'diagnosed', source: 'chat', name: 'Caro Prueba', business_name: 'Salón Prueba',
      created_at: '2026-11-19T15:00:00Z', updated_at: '2026-11-20T15:00:00Z', stage_changed_at: '2026-11-20T15:00:00Z' },
  ],
  propuestas: [
    { ref_id: 'PROP-902', lead_ref: 'LEAD-902', status: 'sent', created_by: 'orbit', options: [opt('Web Prueba')], recommended_option: 0,
      sent_on: '2026-11-18', expires_on: '2026-11-25', follow_ups_done: 1, next_follow_up_on: '2026-11-23', created_at: '2026-11-18T14:00:00Z' },
    { ref_id: 'PROP-912', lead_ref: 'LEAD-902', status: 'draft', created_by: 'marcy', options: [opt('Web Otra')], recommended_option: 0,
      created_at: '2026-11-12T14:00:00Z' },
    { ref_id: 'PROP-903', lead_ref: 'LEAD-903', status: 'draft', created_by: 'marcy', options: [opt('Reservas Prueba', { pending_price: true })], recommended_option: 0,
      created_at: '2026-11-22T10:00:00Z' },
  ],
  borradores: [
    { ref_id: 'PROP-912', created_by: 'marcy', options: [opt('Web Otra')], recommended_option: 0, created_at: '2026-11-12T14:00:00Z', lead_ref: 'LEAD-902', lead_name: 'Beto Prueba', lead_business: 'Taller Prueba', lead_status: 'proposal' },
    { ref_id: 'PROP-903', created_by: 'marcy', options: [opt('Reservas Prueba', { pending_price: true })], recommended_option: 0, created_at: '2026-11-22T10:00:00Z', lead_ref: 'LEAD-903', lead_name: 'Caro Prueba', lead_business: 'Salón Prueba', lead_status: 'diagnosed' },
    { ref_id: 'PROP-904', created_by: 'marcy', options: [opt('Web Brief')], recommended_option: 0, created_at: '2026-11-23T13:00:00Z', lead_ref: null, client_id: null, brief_ref: 'MRC-904', brief_business: 'Panadería Prueba' },
    { ref_id: 'PROP-905', created_by: 'orbit', options: [opt('Web Cliente')], recommended_option: 0, created_at: '2026-11-20T13:00:00Z', lead_ref: null, client_id: '5', client_code: 'CLI-005', client_business: 'Cliente Prueba' },
  ],
  altas: [{ status: 'new', dia: '2026-11-17' }, { status: 'test', dia: '2026-11-18' }, { status: 'won', dia: '2026-11-05' }, { status: 'new', dia: '2026-10-30' }],
  pasos: [{ lead_ref: 'LEAD-903', dia: '2026-11-19' }, { lead_ref: 'LEAD-903', dia: '2026-11-20' }, { lead_ref: 'LEAD-999', lead_status: 'test', dia: '2026-11-19' }],
  diags: [{ dia: '2026-11-16' }, { dia: '2026-11-23' }],
  movs: [
    { status: 'sent', enviada: '2026-11-18' },
    { status: 'accepted', enviada: '2026-11-02', decidida: '2026-11-20' },
    { status: 'sent', lead_status: 'spam', enviada: '2026-11-19' },
  ],
  permisos: { brief_ref: true },
};

await check('embudo: formato con versión, día de Houston y semana pasada completa', () => {
  const e = armarEmbudo(EMBUDO, AHORA);
  assert.equal(e.formato, 'embudo/1');
  assert.equal(e.hoy, '2026-11-23');
  assert.equal(e.zona, 'America/Chicago');
  assert.deepEqual(e.avisos, []);
  assert.deepEqual(ventanasEmbudo('2026-11-23').semana, { desde: '2026-11-16', hasta: '2026-11-22' });
  assert.deepEqual(ventanasEmbudo('2026-11-22').semana, { desde: '2026-11-09', hasta: '2026-11-15' }, 'el domingo aún es la semana en curso');
  assert.deepEqual(ventanasEmbudo('2026-12-01').mes, { desde: '2026-12-01', hasta: '2026-12-01' });
});
await check('embudo: cada contacto abierto con su etapa, desde cuándo y su siguiente paso con plazo y retraso', () => {
  const e = armarEmbudo(EMBUDO, AHORA);
  const [a, b, c] = e.contactos;
  assert.equal(a.ref, 'LEAD-901');
  assert.equal(a.etapa, 'new');
  assert.equal(a.dias_en_etapa, 2);
  assert.equal(a.siguiente_paso.tipo, 'reply');
  assert.equal(a.siguiente_paso.atrasado, true);
  assert.equal(a.siguiente_paso.dias_tarde, 1);
  assert.equal(b.siguiente_paso.tipo, 'follow_up');
  assert.equal(b.siguiente_paso.plazo, 'today');
  assert.equal(b.siguiente_paso.vence, '2026-11-23');
  assert.equal(b.siguiente_paso.texto, 'Seguimiento del día 5');
  assert.equal(c.siguiente_paso.tipo, 'send_proposal');
  assert.equal(c.siguiente_paso.texto, 'Poner precio');
  assert.equal(c.siguiente_paso.precio_por_confirmar, true);
});
await check('embudo: la propuesta viva primero, con caducidad, seguimientos y si falta el precio', () => {
  const e = armarEmbudo(EMBUDO, AHORA);
  const b = e.contactos[1];
  assert.deepEqual(b.propuestas.map((p) => [p.ref, p.viva]), [['PROP-902', true], ['PROP-912', false]]);
  const p = b.propuestas[0];
  assert.equal(p.estado, 'sent');
  assert.equal(p.enviada, '2026-11-18');
  assert.equal(p.caduca, '2026-11-25');
  assert.equal(p.dias_para_caducar, 2);
  assert.equal(p.seguimientos_hechos, 1);
  assert.equal(p.seguimientos_total, 3);
  assert.equal(p.proximo_seguimiento, '2026-11-23');
  assert.equal(e.contactos[2].propuestas[0].precio_por_confirmar, 'Reservas Prueba');
});
await check('embudo: borradores con antigüedad, autor, precio por confirmar y también los de un brief o un cliente', () => {
  const e = armarEmbudo(EMBUDO, AHORA);
  const by = Object.fromEntries(e.borradores.map((x) => [x.ref, x]));
  assert.equal(e.borradores.length, 4);
  assert.equal(by['PROP-903'].horas, 29);
  assert.equal(by['PROP-903'].mas_de_24h, true);
  assert.equal(by['PROP-903'].creada_por, 'marcy');
  assert.equal(by['PROP-903'].precio_por_confirmar, 'Reservas Prueba');
  assert.equal(by['PROP-903'].en_para_hoy, true);
  assert.equal(by['PROP-912'].en_para_hoy, false, 'ese contacto ya tiene una enviada: Orbit no enseña el borrador');
  assert.deepEqual(by['PROP-904'].de, { tipo: 'brief', ref: 'MRC-904', nombre: null, negocio: 'Panadería Prueba' });
  assert.equal(by['PROP-904'].mas_de_24h, false);
  assert.equal(by['PROP-904'].en_para_hoy, false);
  assert.equal(by['PROP-905'].de.tipo, 'cliente');
  assert.equal(by['PROP-905'].de.ref, 'CLI-005');
});
await check('embudo: cifras de la semana y del mes, sin contactos de prueba ni spam', () => {
  const { semana, mes } = armarEmbudo(EMBUDO, AHORA).cifras;
  assert.deepEqual(semana, { desde: '2026-11-16', hasta: '2026-11-22', contactos_nuevos: 1, diagnosticos_hechos: 1, diagnosticos_web: 1, propuestas_enviadas: 1, propuestas_aceptadas: 1 });
  assert.equal(mes.contactos_nuevos, 2);
  assert.equal(mes.diagnosticos_web, 2);
  assert.equal(mes.propuestas_enviadas, 2);
});
await check('embudo: ni correos ni teléfonos en la salida', () => {
  const s = JSON.stringify(armarEmbudo(EMBUDO, AHORA));
  assert.ok(!/@|555-0101/.test(s), 'sin datos de contacto');
});
await check('embudo: sin permiso para ver el brief, sale igual y lo avisa', () => {
  const sin = { ...EMBUDO, borradores: EMBUDO.borradores.map(({ brief_ref, brief_business, ...b }) => b), permisos: { brief_ref: false } };
  const e = armarEmbudo(sin, AHORA);
  assert.equal(e.avisos.length, 1);
  assert.deepEqual(e.borradores.find((x) => x.ref === 'PROP-904').de, { tipo: 'brief', ref: null, nombre: null, negocio: null });
});
await check('leer el embudo: solo SELECT con columnas con nombre; nada de Finanzas, IP, importes ni quién lo preparó', async () => {
  const vistas = [];
  const fake = (niegaBrief) => ({ query: async (t) => {
    vistas.push(t);
    if (niegaBrief && /brief_ref/.test(t)) { const e = new Error('permission denied'); e.code = '42501'; throw e; }
    if (/FROM leads WHERE status = ANY/.test(t)) return { rows: EMBUDO.leads };
    return { rows: [] };
  } });
  const e1 = await leerEmbudo(fake(false), AHORA);
  assert.equal(e1.contactos.length, 3);
  assert.deepEqual(e1.avisos, []);
  const e2 = await leerEmbudo(fake(true), AHORA);
  assert.equal(e2.avisos.length, 1, 'sin el permiso del brief, avisa y no falla');
  for (const t of vistas) {
    assert.match(t.trim(), /^SELECT /, 'solo lecturas: ' + t.slice(0, 60));
    assert.ok(!/SELECT \*|\.\*/.test(t), 'sin SELECT *');
    assert.ok(!FINANZAS.test(t), 'nada de Finanzas: ' + t.slice(0, 80));
    assert.ok(!/ip_address|user_agent|agreed_amount_cents|amount_cents|actor_email|sales_catalog|email|phone/.test(t), 'sin IP, importes, autor ni contacto: ' + t.slice(0, 80));
  }
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) de la ficha de llamada fallaron:\n - ${fails.join('\n - ')}`);
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de la ficha de llamada pasaron.`);
