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
import { fileURLToPath } from 'node:url';

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
  // Los \r\n y \r sueltos se normalizan antes de pintar (sin \r, ningún salto doble).
  const src = read('lib/email.mjs');
  const fn = src.slice(src.indexOf('export async function emailManualToClient'), src.indexOf('// ── Sección reutilizable'));
  assert.match(fn, /String\(body \?\? ''\)\.replace\(\/\\r\\n\?\/g, '\\n'\)/);
  assert.equal(one('Hola\r\n\r\nGracias\rAdiós'.replace(/\r\n?/g, '\n')), 'Hola<br><br>Gracias<br>Adiós');
  assert.equal(typeof emailManualToClient, 'function');
});
await check('panel: la ficha nunca pinta un archivo que el servidor no marcó en línea', () => {
  const s = read('src/components/dashboard/briefs/BriefFiles.svelte');
  assert.match(s, /\{#if f\.inline && !broken\[f\.id\]\}/);
  assert.ok(!/\{@html/.test(s));
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) fallaron:\n  - ` + fails.join('\n  - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas de Briefs en el panel pasaron.`);
