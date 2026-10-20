// ════════════════════════════════════════════════════════════════
//  scripts/test-briefs-panel.mjs  ·  npm run test:briefs-panel
//  Pruebas de la sección Briefs del panel (Orbit v2 · A3 + B3) SIN base de
//  datos y SIN red:
//    · lib/db.mjs          prepareBriefEdits: solo lo que cambia (CRM-09),
//                          opciones validadas con el esquema (B-22) sin
//                          perder los valores antiguos, dónde se escribe cada
//                          campo (columna, extra, kit, servicios).
//    · briefs/brief-panel  secciones desde el esquema único (CRM-20), cambios
//                          del borrador, contactos clicables (CRM-21), estados
//                          en la URL (CRM-10), historial legible (CRM-18) y
//                          etiquetas de archivos.
//    · export.mjs          CSV de briefs con etiquetas legibles (B-08).
//    · Recorrido estático  notas (POST events), conversión a cliente (POST
//                          del brief) y correo con su cuerpo en el historial.
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';

import { LEGACY_COLUMNS, FIELDS } from '../lib/brief-schema.mjs';
import {
  BRIEF_EDITABLE_FIELDS, BRIEF_EDITABLE_KEYS, prepareBriefEdits, sameBriefValue,
} from '../lib/db.mjs';
import * as P from '../src/components/dashboard/briefs/brief-panel.js';
import { briefCsvRow } from '../api/admin/export.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + e.message); }
}

// ── Esquema único ───────────────────────────────────────────────
await check('esquema: las columnas editables son las 39 claves históricas del esquema', () => {
  assert.deepEqual(BRIEF_EDITABLE_FIELDS, LEGACY_COLUMNS);
  assert.equal(BRIEF_EDITABLE_FIELDS.length, 39);
});
await check('esquema: el panel edita los v2 sencillos y no las listas ni archivos', () => {
  assert.ok(BRIEF_EDITABLE_KEYS.includes('services'));
  assert.ok(BRIEF_EDITABLE_KEYS.includes('preferred_contact'));
  assert.ok(BRIEF_EDITABLE_KEYS.includes('legal_name'));
  assert.ok(!BRIEF_EDITABLE_KEYS.includes('hours'));
  assert.ok(!BRIEF_EDITABLE_KEYS.includes('zones'));
  assert.ok(!BRIEF_EDITABLE_KEYS.includes('logo_files'));
  for (const k of LEGACY_COLUMNS) assert.ok(BRIEF_EDITABLE_KEYS.includes(k), k);
});

// ── Edición: solo lo que cambia (CRM-09) ────────────────────────
const DATA = {
  business_name: 'Limpiezas Aurora', language: 'biling', timeline: '2-4sem',
  pages_required: ['FAQ', 'Inicio'], has_logo: 'Sí, pero en baja calidad',
  services: ['seo-local'], preferred_contact: 'whatsapp', legal_name: 'Aurora LLC',
};
await check('edición: enviar los 39 campos sin cambios no registra nada', () => {
  const fields = {};
  for (const k of LEGACY_COLUMNS) fields[k] = DATA[k] ?? '';
  const r = prepareBriefEdits({ data: DATA, fields });
  assert.deepEqual(r.errors, {});
  assert.deepEqual(Object.keys(r.changes), []);
});
await check('edición: un campo cambiado → un cambio con valor anterior y nuevo', () => {
  const r = prepareBriefEdits({ data: DATA, fields: { timeline: 'urgente', business_name: 'Limpiezas Aurora' } });
  assert.deepEqual(Object.keys(r.changes), ['timeline']);
  assert.deepEqual(r.changes.timeline, { from: '2-4sem', to: 'urgente' });
  assert.deepEqual(r.writes.columns, { timeline: 'urgente' });
});
await check('edición: una opción fuera de la lista se rechaza con mensaje (B-22)', () => {
  const r = prepareBriefEdits({ data: DATA, fields: { language: 'bilingue' } });
  assert.ok(r.errors.language);
  assert.match(r.errors.language, /opciones/);
  assert.deepEqual(r.changes, {});
});
await check('edición: el texto libre antiguo se conserva (no es error si no cambia)', () => {
  const r = prepareBriefEdits({ data: DATA, fields: { has_logo: 'Sí, pero en baja calidad' } });
  assert.deepEqual(r.errors, {});
  assert.deepEqual(r.changes, {});
});
await check('edición: casillas con un valor antiguo fuera de la lista se pueden ampliar', () => {
  const data = { ...DATA, pages_required: ['Inicio', 'FAQ'] };
  const r = prepareBriefEdits({ data, fields: { pages_required: ['Inicio', 'FAQ', 'Blog / Noticias'] } });
  assert.deepEqual(r.errors, {});
  assert.deepEqual(r.writes.columns.pages_required, ['Inicio', 'FAQ', 'Blog / Noticias']);
});
await check('edición: casillas con un valor NUEVO fuera de la lista se rechazan', () => {
  const r = prepareBriefEdits({ data: DATA, fields: { pages_required: ['FAQ', 'Inventado'] } });
  assert.ok(r.errors.pages_required);
});
await check('edición: servicios van a su columna, preferred_contact a extra, legal_name al kit', () => {
  const r = prepareBriefEdits({
    data: DATA, extra: { preferred_contact: 'whatsapp' }, kit: { legal_name: 'Aurora LLC' },
    fields: { services: ['seo-local', 'diseno-web'], preferred_contact: 'call', legal_name: 'Aurora Cleaning LLC' },
  });
  assert.deepEqual(r.errors, {});
  assert.deepEqual(r.writes.services, ['seo-local', 'diseno-web']);
  assert.deepEqual(r.writes.extra, { preferred_contact: 'call' });
  assert.deepEqual(r.writes.kit, { legal_name: 'Aurora Cleaning LLC' });
});
await check('edición: vaciar un campo de columna limpia la copia del kit (no reaparece)', () => {
  const r = prepareBriefEdits({ data: { ...DATA, brand_colors: 'Lila' }, kit: { brand_colors: 'Lila' }, fields: { brand_colors: '' } });
  assert.equal(r.writes.columns.brand_colors, null);
  assert.equal(r.writes.kit.brand_colors, null);
});
await check('edición: claves desconocidas o no editables se ignoran', () => {
  const r = prepareBriefEdits({ data: DATA, fields: { ip_address: '1.2.3.4', hours: {}, status: 'archived' } });
  assert.deepEqual(r.ignored.sort(), ['hours', 'ip_address', 'status']);
  assert.deepEqual(r.changes, {});
});
await check('edición: correo mal escrito se marca en su campo', () => {
  const r = prepareBriefEdits({ data: DATA, fields: { email: 'no-es-correo' } });
  assert.ok(r.errors.email);
});
await check('edición: un campo de otro servicio se valida igual (A3-02)', () => {
  const data = { ...DATA, services: ['seo-ia'], website_type: 'landing' };
  const r = prepareBriefEdits({ data, fields: { website_type: 'zzz' }, services: ['seo-ia'] });
  assert.ok(r.errors.website_type);
  assert.deepEqual(r.writes.columns, {});
  const ok = prepareBriefEdits({ data, fields: { website_type: 'ecommerce' }, services: ['seo-ia'] });
  assert.deepEqual(ok.errors, {});
});
await check('edición: un servicio que no está en el catálogo es un error (A3-02)', () => {
  const r = prepareBriefEdits({ data: DATA, fields: { services: ['seo-local', 'inventado'] } });
  assert.ok(r.errors.services);
  assert.equal(r.writes.services, undefined);
});
await check('edición: un servicio antiguo que ya tenía el brief se conserva en su orden', () => {
  const data = { ...DATA, services: ['viejo', 'seo-local'] };
  const same = prepareBriefEdits({ data, fields: { services: ['viejo', 'seo-local'] } });
  assert.deepEqual(same.errors, {});
  assert.deepEqual(same.changes, {});
  const more = prepareBriefEdits({ data, fields: { services: ['viejo', 'seo-local', 'diseno-web'] } });
  assert.deepEqual(more.errors, {});
  assert.deepEqual(more.writes.services, ['viejo', 'seo-local', 'diseno-web']);
});
await check('edición: no se pueden vaciar correo y teléfono a la vez (A3-02)', () => {
  const data = { ...DATA, email: 'a@b.co', phone: '7135550142' };
  const r = prepareBriefEdits({ data, fields: { email: '', phone: '' } });
  assert.ok(r.errors.email);
  const one = prepareBriefEdits({ data, fields: { email: '' } });
  assert.deepEqual(one.errors, {});
});
await check('edición: "" y [] valen lo mismo que vacío', () => {
  assert.ok(sameBriefValue(null, ''));
  assert.ok(sameBriefValue(undefined, []));
  assert.ok(!sameBriefValue(['a'], ['b']));
});

// ── Panel: secciones, borrador y cambios ─────────────────────────
await check('panel: las secciones salen del esquema con etiquetas internas', () => {
  const s = P.viewSections({ business_name: 'X', owner_name: 'Ana' });
  const negocio = s.find((x) => x.key === 'negocio');
  assert.ok(negocio);
  assert.equal(negocio.rows.find((r) => r.key === 'owner_name').label, 'Propietario');
  // Lectura: el kit vacío no sale; los servicios van en la cabecera.
  assert.ok(!s.some((x) => x.moment === 'arranque'));
  assert.ok(!s.some((x) => x.key === 'servicios'));
});
await check('panel: la ficha enseña lo nuevo del brief corto (marca, colores, idioma, bloques por servicio)', () => {
  const s = P.viewSections({
    services: ['ia-conversacional', 'branding'], brand_status: 'adjustable', contact_language: 'en',
    brand_color_list: [{ name: 'Vino', hex: '#7A1F2B' }], bot_channels: ['whatsapp'], brand_scope: 'full',
  });
  const rows = Object.fromEntries(s.flatMap((x) => x.rows.map((r) => [r.key, { ...r, moment: x.moment }])));
  assert.equal(P.valueText(rows.brand_status.fd, rows.brand_status.value), 'Se puede ajustar');
  assert.equal(rows.brand_status.label, 'Estado de la marca');
  assert.equal(P.valueText(rows.contact_language.fd, rows.contact_language.value), 'Inglés');
  assert.match(P.valueText(rows.brand_color_list.fd, rows.brand_color_list.value), /Vino/);
  assert.deepEqual(P.valuePills(rows.bot_channels.fd, rows.bot_channels.value), ['WhatsApp']);
  assert.equal(P.valueText(rows.brand_scope.fd, rows.brand_scope.value), 'Identidad completa: logo, colores, tipografías y guía');
  for (const k of ['brand_status', 'contact_language', 'brand_color_list', 'bot_channels', 'brand_scope']) assert.equal(rows[k].moment, 'inicial', k);
  // Lo de servicios no elegidos no sale como "Sin dato"; una casilla sin marcar, tampoco.
  assert.ok(!rows.seo_scope && !rows.product_count && !rows.brand_colors_none);
  assert.ok(rows.bot_tasks && rows.bot_tasks.value === null, 'lo del servicio elegido sin responder sí sale como Sin dato');
});
await check('panel: sin "Sin dato" de lo que nunca se preguntó (brief sin servicios, histórico, dependencias) (R2/R3)', () => {
  const keysOf = (s) => new Set(s.flatMap((x) => x.rows.map((r) => r.key)));
  // Brief del chat o v1: sin servicios y sin las preguntas nuevas.
  const v1 = keysOf(P.viewSections({ business_name: 'Chat SA', email: 'a@b.co', main_objective: 'x' }, { legacy: true }));
  for (const k of ['web_extras', 'seo_scope', 'bot_channels', 'product_count', 'brand_status', 'brand_color_list', 'contact_language']) assert.ok(!v1.has(k), k);
  assert.ok(v1.has('business_name') && v1.has('city_state') && v1.has('has_logo'), 'lo de siempre sigue saliendo (también como Sin dato)');
  // Sin servicios (aunque no sea histórico): nada de "Por servicio".
  const s0 = P.viewSections({ business_name: 'X' });
  assert.ok(!s0.some((x) => x.key === 'por_servicio'));
  // "No tengo colores" marcado: la lista no falta. Sin logo: el estado de la marca tampoco.
  const v2 = keysOf(P.viewSections({ services: ['branding'], brand_colors_none: true, has_logo: 'no' }));
  assert.ok(v2.has('brand_colors_none') && !v2.has('brand_color_list') && !v2.has('brand_status'));
  assert.equal(P.isLegacyBrief({ schema_version: 1 }), true);
});
await check('panel: en edición salen todas las columnas históricas (se podían editar antes)', () => {
  const s = P.viewSections({}, { edit: true });
  const keys = s.flatMap((x) => x.rows.map((r) => r.key));
  for (const k of LEGACY_COLUMNS) assert.ok(keys.includes(k), k);
  assert.ok(keys.includes('services'));
});
await check('panel: los datos del formulario anterior no se presentan como kit (A3-01)', () => {
  const v1 = { instagram: '@aurora', competitors: 'Otra', brand_fonts: 'Lora' };
  const s = P.viewSections(v1);
  assert.ok(!s.some((x) => x.moment === 'arranque'));
  const keys = s.filter((x) => x.moment === 'anterior').flatMap((x) => x.rows.map((r) => r.key));
  assert.deepEqual(keys.sort(), ['brand_fonts', 'competitors', 'instagram']);
  // En edición, sin kit recibido, las columnas vacías tampoco forman un bloque de kit.
  assert.ok(!P.viewSections({}, { edit: true }).some((x) => x.moment === 'arranque'));
});
await check('panel: con el kit recibido, lo que pregunta el kit va al kit y lo oculto sigue aparte', () => {
  const s = P.viewSections({ instagram: '@aurora', brand_fonts: 'Lora', legal_name: 'Aurora LLC' }, { kitReceived: true });
  const of = (m) => s.filter((x) => x.moment === m).flatMap((x) => x.rows.map((r) => r.key)).sort();
  assert.deepEqual(of('arranque'), ['brand_fonts', 'legal_name']);
  assert.deepEqual(of('anterior'), ['instagram']);
  assert.equal(P.kitReceived({ kit_status: 'submitted' }), true);
  assert.equal(P.kitReceived({ kit_status: 'sent' }), false);
  assert.equal(P.kitReceived({}), false);
});
await check('panel: un campo del kit con dato se ve aunque no se edite', () => {
  const s = P.viewSections({ hours: { mon: { closed: false, open: '08:00', close: '17:00' } } }, { edit: true });
  const row = s.flatMap((x) => x.rows).find((r) => r.key === 'hours');
  assert.ok(row && !row.editable);
});
await check('panel: changedFields solo devuelve lo que difiere (y recorta espacios)', () => {
  const data = { language: 'biling', pages_required: ['FAQ'], business_name: 'X' };
  const draft = P.editDraft(data);
  assert.deepEqual(P.changedFields(data, draft), {});
  draft.business_name = '  X  ';
  draft.language = 'es';
  draft.pages_required = ['FAQ'];
  const c = P.changedFields(data, draft);
  assert.deepEqual(Object.keys(c), ['business_name', 'language']);
  assert.equal(c.business_name, 'X');
});
await check('panel: etiquetas legibles en vez de códigos (B-08)', () => {
  assert.equal(P.valueText(FIELDS.get('language'), 'biling'), 'Bilingüe');
  assert.equal(P.valueText(FIELDS.get('timeline'), '2-4sem'), 'En 2 a 4 semanas');
  assert.equal(P.valueText(FIELDS.get('has_logo'), 'Texto libre del chat'), 'Texto libre del chat');
  assert.deepEqual(P.valuePills(FIELDS.get('services'), ['seo-local']), ['SEO local']);
});

// ── Contactos (CRM-21) ───────────────────────────────────────────
await check('contactos: tel, WhatsApp, correo, web e Instagram clicables', () => {
  const l = P.contactLinks({ phone: '(713) 555-0142', email: 'a@b.co', current_website: 'misitio.com', instagram: '@mi.negocio' });
  const by = Object.fromEntries(l.map((x) => [x.kind, x.href]));
  assert.equal(by.tel, 'tel:+17135550142');
  assert.equal(by.whatsapp, 'https://wa.me/17135550142');
  assert.equal(by.email, 'mailto:a@b.co');
  assert.equal(by.web, 'https://misitio.com');
  assert.equal(by.instagram, 'https://instagram.com/mi.negocio');
});
await check('contactos: lo que no es un dato marcable no se convierte en enlace', () => {
  const l = P.contactLinks({ phone: '555', email: 'no', current_website: 'Solo Facebook', instagram: 'no tengo cuenta' });
  assert.deepEqual(l, []);
  assert.equal(P.phoneE164('+52 55 1234 5678'), '+525512345678');
});

// ── URL (CRM-10) ─────────────────────────────────────────────────
await check('url: estados en español ida y vuelta', () => {
  for (const s of P.STATUSES) assert.equal(P.statusFromSlug(P.slugFromStatus(s.id)), s.id);
  assert.equal(P.statusFromSlug('en-curso'), 'in_progress');
  assert.equal(P.statusFromSlug('in_progress'), 'in_progress');
  assert.equal(P.statusFromSlug('<script>'), '');
});

// ── Historial (CRM-18) ───────────────────────────────────────────
await check('historial: nota, correo y edición se leen en llano', () => {
  assert.equal(P.describeEvent({ event_type: 'note', data: { text: 'Llamé' } }).body, 'Llamé');
  const mail = P.describeEvent({ event_type: 'email_sent_to_client', data: { subject: 'Hola', body: 'Texto' } });
  assert.equal(mail.detail, 'Asunto: Hola');
  assert.equal(mail.body, 'Texto');
  const ed = P.describeEvent({ event_type: 'brief_edited', data: { fields: ['timeline'], changes: { timeline: { from: '1-2mes', to: 'urgente' } } } });
  assert.equal(ed.detail, 'Plazo');
  assert.deepEqual(ed.changes, [{ label: 'Plazo', from: 'En 1 a 2 meses', to: 'Lo antes posible' }]);
  // Los eventos viejos (solo la lista de campos) siguen diciendo qué se tocó.
  const old = P.describeEvent({ event_type: 'brief_edited', data: { fields: ['language', 'timeline', 'email', 'phone'] } });
  assert.equal(old.detail, 'Idioma, Plazo, Correo y 1 más');
  assert.equal(P.describeEvent({ event_type: 'status_changed', data: { from: 'pending', to: 'contacted' } }).detail, 'Pendiente → Contactado');
  assert.match(P.describeEvent({ event_type: 'converted_to_client', data: { created: true, client_code: 'CLI-007', business_name: 'X' } }).detail, /Cliente nuevo: CLI-007/);
  assert.equal(P.describeEvent({ event_type: 'otro_raro' }).title, 'Actividad');
});

// ── Archivos (B3) ────────────────────────────────────────────────
await check('archivos: grupos en orden y legales aparte', () => {
  const g = P.groupFiles([{ kind: 'legal' }, { kind: 'photo' }, { kind: 'logo' }]);
  assert.deepEqual(g.map((x) => x.kind), ['logo', 'photo', 'legal']);
});
await check('archivos: etiquetas legibles sin la voz del formulario', () => {
  const t = P.fileTags({ kind: 'photo', tags: { field: 'photo_files', shot: 'team', neighborhood: 'Katy', month: '2026-08', google_ok: true }, convertedFrom: 'image/heic' });
  assert.ok(t.includes('Tu equipo trabajando'));
  assert.ok(t.includes('Katy'));
  assert.ok(t.includes('agosto de 2026'));
  assert.ok(t.includes('Convertida desde el iPhone'));
  assert.ok(!t.some((x) => /^Sube/.test(x)));
  assert.deepEqual(P.fileTags({ kind: 'doc', tags: { field: 'price_list' } }), ['Lista de precios']);
});
await check('archivos: verificación, tipo y tamaño', () => {
  assert.equal(P.fileCheck({ verified: false }).id, 'rejected');
  assert.equal(P.fileCheck({ verified: null }).id, 'pending');
  assert.equal(P.fileCheck({ verified: true }).label, '');
  assert.equal(P.fileTypeLabel({ contentType: 'image/svg+xml' }), 'SVG');
  assert.equal(P.fileTypeLabel({ contentType: 'application/x-otro', originalName: 'plano.dwg' }), 'DWG');
  assert.equal(P.fmtSize(1203344), '1,1 MB');
  assert.equal(P.fmtSize(18234), '18 KB');
});
await check('kit: estado legible y "no disponible" sin la migración 010', () => {
  assert.equal(P.kitState({ kit_status: 'submitted' }).label, 'Recibido');
  assert.equal(P.kitState({ business_name: 'X' }).available, false);
  assert.equal(P.kitState({ kit_status: 'raro' }).id, 'none');
});

// ── CSV (B-08) ───────────────────────────────────────────────────
await check('csv: estado, opciones, servicios y kit con etiqueta legible', () => {
  const r = briefCsvRow({
    project_id: 'MRC-1', status: 'in_progress', source: 'chat', lang: 'en', kit_status: 'sent',
    language: 'biling', timeline: '2-4sem', has_logo: 'Texto libre', services: ['seo-local'],
    extra: { preferred_contact: 'whatsapp' },
  });
  assert.equal(r.status, 'En curso');
  assert.equal(r.source, 'Chat del sitio');
  assert.equal(r.lang, 'Inglés');
  assert.equal(r.kit_status, 'Enviado');
  assert.equal(r.language, 'Bilingüe');
  assert.equal(r.timeline, 'En 2 a 4 semanas');
  assert.equal(r.has_logo, 'Texto libre');
  assert.equal(r.services, 'SEO local');
  assert.equal(r.preferred_contact, 'WhatsApp');
});

// ── Recorrido estático de los handlers tocados ───────────────────
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
await check('handlers: notas por POST con tipo note y límite de largo', () => {
  const s = read('api/admin/briefs/[id]/events.mjs');
  assert.match(s, /type: 'note'/);
  assert.match(s, /NOTE_MAX/);
  assert.ok(s.indexOf('requireAdmin(req, res)') < s.indexOf('getBriefByProjectId(id)'));
});
await check('handlers: convertir en cliente deja UN evento converted_to_client', () => {
  const s = read('api/admin/briefs/[id].mjs');
  assert.match(s, /convert_to_client/);
  assert.match(s, /already: true/);
  // Integración CRM: al crear lo escribe convertBriefToClient (con el actor) y
  // al vincular linkBriefToClient; el handler ya no lo repite.
  assert.match(s, /convertBriefToClient\(id, session\.email/);
  assert.ok(!/type: 'converted_to_client'/.test(s));
  const fin = read('lib/finance.mjs');
  const conv = fin.slice(fin.indexOf('export async function convertBriefToClient'), fin.indexOf('export async function createClientFromBrief'));
  assert.match(conv, /'converted_to_client', \$\{actorEmail\}/);
});
await check('handlers: el correo al cliente guarda su cuerpo en el historial', () => {
  assert.match(read('api/admin/briefs/[id]/email.mjs'), /body: text/);
});
await check('correo manual: sin pre-wrap junto a <br> (B-21)', () => {
  const s = read('lib/email.mjs');
  const fn = s.slice(s.indexOf('export function manualBodyHtml'), s.indexOf('// ── Sección reutilizable'));
  assert.ok(fn.length > 0);
  assert.ok(!/white-space:\s*pre-wrap/.test(fn));
  assert.match(fn, /html: manualBodyHtml\(text\)/);
});
await check('correo manual (A3-11): cada salto llega una vez, también con saltos de Windows', async () => {
  const { manualBodyHtml, emailManualToClient } = await import('../lib/email.mjs');
  const one = (body) => manualBodyHtml(body).match(/font-size:14px;line-height:1\.7;color:[^"]*">([\s\S]*?)<\/div>/)[1];
  assert.equal(one('Hola Ana,\n\nTe mando el kit.\nUn saludo'), 'Hola Ana,<br><br>Te mando el kit.<br>Un saludo');
  assert.equal(one('<b>x</b> & "y"'), '&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;');
  assert.ok(!/pre-wrap/.test(manualBodyHtml('a\nb')));
  assert.equal(typeof emailManualToClient, 'function');
});
await check('correo manual (A3-11): emailManualToClient con saltos de Windows envía cada salto una vez', async () => {
  // Revisión int1, F3: se llama a la función real con el envío sustituido por
  // un doble (una copia del módulo cuyo paquete de correo es falso; nunca sale
  // a la red) y se mira lo que de verdad se mandaría, html y texto.
  const FAKE_RESEND = 'export class Resend { constructor() { this.emails = { send: async (m) => { (globalThis.__mailSent ||= []).push(m); return { data: { id: "prueba" } }; } }; } }';
  const HOOK = `
const FAKE = ${JSON.stringify('data:text/javascript,' + encodeURIComponent(FAKE_RESEND))};
export async function resolve(specifier, context, next) {
  if (specifier === 'resend' && (context.parentURL || '').includes('mailfake')) return { url: FAKE, shortCircuit: true };
  return next(specifier, context);
}`;
  register('data:text/javascript,' + encodeURIComponent(HOOK), import.meta.url);
  const prev = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'clave-de-prueba';
  globalThis.__mailSent = [];
  try {
    const mail = await import(pathToFileURL(path.join(ROOT, 'lib/email.mjs')).href + '?mailfake');
    await mail.emailManualToClient({ to: 'ana@aurora.test', subject: 'Kit', body: 'Hola\r\n\r\nGracias\rAdiós', fromAdminEmail: 'equipo@marcyan.test' });
  } finally {
    if (prev === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = prev;
  }
  assert.equal(globalThis.__mailSent.length, 1);
  const m = globalThis.__mailSent[0];
  assert.equal(m.text, 'Hola\n\nGracias\nAdiós', 'texto sin \\r');
  const body = m.html.match(/font-size:14px;line-height:1\.7;color:[^"]*">([\s\S]*?)<\/div>/)[1];
  assert.equal(body, 'Hola<br><br>Gracias<br>Adiós', 'cada salto una vez, sin \\r');
  assert.ok(!/\r/.test(m.html));
  assert.equal(m.replyTo, 'equipo@marcyan.test');
});
await check('panel: la ficha nunca pinta un archivo que el servidor no marcó en línea', () => {
  const s = read('src/components/dashboard/briefs/BriefFiles.svelte');
  assert.match(s, /\{#if f\.inline && !broken\[f\.id\]\}/);
  assert.ok(!/\{@html/.test(s));
});
await check('archivos: plazo de conservación, borrado a mano y su rastro en el historial', () => {
  const files = [{ kind: 'logo' }, { kind: 'photo' }, { kind: 'photo' }, { kind: 'legal' }];
  const far = P.retentionView({ purgeOn: '2027-10-19', daysLeft: 200 }, files);
  assert.deepEqual([far.kind, far.day, far.soon, far.overdue, far.legal], ['scheduled', '2027-10-19', false, false, true]);
  assert.equal(P.retentionView({ purgeOn: '2027-10-19', daysLeft: 30 }, files).soon, true);
  assert.equal(P.retentionView({ purgeOn: '2027-10-19', daysLeft: 0 }, files).overdue, true);
  assert.equal(P.retentionView({ purgeOn: null, daysLeft: null }, files), null, 'sin terminar: no se dice nada');
  const gone = P.retentionView({ purgeOn: null, lastPurge: { at: '2026-10-19T15:00:00Z', files: 4, reason: 'request' } }, []);
  assert.equal(gone.kind, 'purged');
  assert.equal(P.purgedText(gone), 'Se borraron 4 archivos desde el panel. El brief y su historial se conservan.');
  assert.match(P.purgedText({ files: 1, reason: 'retention' }), /^Se borró 1 archivo al cumplirse 12 meses/);
  assert.equal(P.purgeConfirmMessage(files), 'Se borran los 4 archivos de este brief: 1 logo, 2 fotos y 1 documento legal. El brief y su historial se quedan. No se puede deshacer.');
  assert.match(P.purgeConfirmMessage([{ kind: 'logo' }]), /^Se borra el único archivo de este brief: 1 logo\./);
  const ev = P.describeEvent({ event_type: 'files_purged', data: { files: 4, reason: 'request' } });
  assert.deepEqual([ev.title, ev.detail], ['Archivos borrados', '4 archivos · Desde el panel']);
  assert.equal(P.describeEvent({ event_type: 'files_purged', data: { files: 1, reason: 'retention' } }).detail, '1 archivo · Plazo de 12 meses cumplido');
  for (const t of [P.purgedText(gone), P.purgeConfirmMessage(files), ev.detail]) assert.ok(!/[—–]/.test(t), 'sin guion largo');
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) fallaron:\n  - ` + fails.join('\n  - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de Briefs en el panel pasaron.`);
