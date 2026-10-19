// ════════════════════════════════════════════════════════════════
//  scripts/test-brief-v2.mjs  ·  npm run test:brief
//  Pruebas del brief v2 SIN base de datos ni red:
//    · servicios del esquema sincronizados con src/i18n/pricing.ts
//    · esquema único (lib/brief-schema.mjs): forma, copy, validación,
//      normalización y etiquetas legibles (B-08/B-09/B-10)
//    · compatibilidad con payloads v1 REALES (chat de Marcy y /formulario)
//    · límite de envíos con un almacén falso (lib/ratelimit.mjs)
//    · reglas de onBeforeGenerateToken, nombres seguros y tipo real por
//      bytes mágicos (lib/brief-upload-rules.mjs + file-type)
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import { fileTypeFromBuffer } from 'file-type';
import { checkGenerated } from './build-brief-services.mjs';
import {
  SECTIONS, FIELDS, FIELD_TYPES, LEGACY_COLUMNS, SERVICE_IDS, BRIEF_SERVICES,
  validate, normalize, labelFor, sectionsFor, splitByStorage, normalizeFileTags, shortLabel,
} from '../lib/brief-schema.mjs';
import { rateLimit, memoryStore, hashKey, windowStart, LIMITS } from '../lib/ratelimit.mjs';
import {
  KIND_RULES, DRAFT_LIMITS, UPLOAD_TOKEN_TTL_MS, safeFileName, buildPathname, parseBlobPathname,
  parseClientPayload, checkUploadRequest, isAllowedRealType, dispositionFor, hashSecret, secretMatches,
  looksLikeSvg, cleanOriginalName,
} from '../lib/brief-upload-rules.mjs';
import { hashKitToken, isKitTokenShape, newKitToken, kitUrl, kitPrefill } from '../lib/brief-kit.mjs';

let pass = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); pass++; } catch (e) { fails.push(name + ' → ' + e.message); }
}

// ── 1) Servicios derivados del catálogo ───────────────────────────
await check('servicios del esquema = catálogo de pricing.ts (sin precios a mano)', async () => {
  const r = await checkGenerated();
  assert.ok(r.ok, 'lib/brief-services.generated.mjs desfasado: corre npm run gen:brief-services');
});
await check('servicios: 7 productos con nombre ES/EN y niveles con precio', () => {
  assert.equal(BRIEF_SERVICES.length, 7);
  for (const s of BRIEF_SERVICES) {
    assert.ok(s.name.es && s.name.en, s.id);
    assert.ok(s.tiers.length >= 1, s.id);
  }
  assert.deepEqual(SERVICE_IDS.slice().sort(), ['branding', 'diseno-web', 'ecommerce', 'ia-conversacional', 'mantenimiento', 'seo-ia', 'seo-local']);
});

// ── 2) Forma del esquema y copy ───────────────────────────────────
const allFields = [];
for (const s of SECTIONS) for (const f of s.fields) {
  allFields.push(f);
  if (f.item) for (const sub of f.item.fields) allFields.push(sub);
}
await check('las 39 claves históricas existen y se guardan en su columna', () => {
  assert.equal(LEGACY_COLUMNS.length, 39);
  for (const k of LEGACY_COLUMNS) assert.equal(FIELDS.get(k).storage, 'column', k);
});
await check('todo campo tiene tipo válido, etiqueta ES/EN y opciones ES/EN', () => {
  for (const f of allFields) {
    assert.ok(FIELD_TYPES.includes(f.type), `${f.key}: tipo ${f.type}`);
    assert.ok(f.label && f.label.es && f.label.en, `${f.key}: etiqueta`);
    for (const o of f.options || []) assert.ok(o.label.es && o.label.en, `${f.key}.${o.value}`);
    if (f.type === 'file') assert.ok(KIND_RULES[f.kind], `${f.key}: kind ${f.kind}`);
  }
});
await check('claves únicas y momento válido en cada campo', () => {
  const keys = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));
  assert.equal(new Set(keys).size, keys.length);
  for (const [, f] of FIELDS) assert.ok(['inicial', 'arranque'].includes(f.moment), f.key);
});
await check('copy visible sin em-dash ni voseo', () => {
  const texts = [];
  for (const s of SECTIONS) { texts.push(s.label.es, s.label.en, s.help?.es, s.help?.en); }
  for (const f of allFields) {
    texts.push(f.label.es, f.label.en, f.help?.es, f.help?.en);
    for (const o of f.options || []) texts.push(o.label.es, o.label.en);
  }
  for (const t of texts.filter(Boolean)) {
    assert.ok(!/[—–]/.test(t), `em-dash en: ${t}`);
    assert.ok(!/\b(tocá|subí|elegí|escribí|tenés|podés|querés|contanos|sabés)\b/i.test(t), `voseo en: ${t}`);
  }
});
await check('brief inicial corto: pocos campos visibles, lo pesado en arranque', () => {
  const ini = sectionsFor('inicial', null).flatMap((s) => s.fields);
  const arr = sectionsFor('arranque', null).flatMap((s) => s.fields);
  assert.ok(ini.length <= 22, `inicial tiene ${ini.length} campos`);
  assert.ok(arr.length > ini.length * 3, 'el arranque debe llevar lo pesado');
  for (const k of ['leads_email', 'zones', 'hours', 'client_services', 'legal_name', 'brand_color_list', 'kit_photo_files', 'socials'])
    assert.equal(FIELDS.get(k).moment, 'arranque', k);
});
await check('sectionsFor filtra por servicio (sitio y tienda solo con esos servicios)', () => {
  const onlyBrand = sectionsFor('arranque', ['branding']).map((s) => s.key);
  assert.ok(!onlyBrand.includes('sitio') && !onlyBrand.includes('tienda') && !onlyBrand.includes('asistente'));
  const store = sectionsFor('arranque', ['ecommerce']).map((s) => s.key);
  assert.ok(store.includes('sitio') && store.includes('tienda'));
  const ini = sectionsFor('inicial', ['branding']).flatMap((s) => s.fields.map((f) => f.key));
  assert.ok(!ini.includes('website_type'), 'tipo de sitio no aplica a solo branding');
  assert.ok(!sectionsFor('arranque', null).flatMap((s) => s.fields).some((f) => f.hidden), 'ocultos fuera por defecto');
  assert.ok(sectionsFor('arranque', null, { includeHidden: true }).flatMap((s) => s.fields).some((f) => f.key === 'competitors'));
});

// ── 3) Validación v2 ──────────────────────────────────────────────
const V2_OK = {
  services: ['diseno-web', 'seo-local'], business_name: 'Garcia Hauling', owner_name: 'Leonard Garcia',
  email: 'leo@example.com', phone: '(407) 555-0101', main_objective: 'Más llamadas desde Google',
  website_type: 'corporativo', language: 'biling', budget_range: '1000-2500', timeline: '2-4sem',
  preferred_contact: 'whatsapp', referred_by: 'google',
};
await check('v2 inicial válido pasa y separa columnas de extra', () => {
  const v = validate('inicial', V2_OK);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  const s = splitByStorage(v.data);
  assert.equal(s.columns.business_name, 'Garcia Hauling');
  assert.equal(s.extra.preferred_contact, 'whatsapp');
  assert.deepEqual(s.extra.services, ['diseno-web', 'seo-local']);
});
await check('v2: obligatorios, servicios, correo y opción inválida dan error ES/EN', () => {
  const v = validate('inicial', { ...V2_OK, services: ['inventado'], business_name: '', email: 'malo', budget_range: 'muchísimo' });
  assert.equal(v.ok, false);
  assert.ok(v.errors.services.es && v.errors.services.en);
  assert.ok(v.errors.business_name);
  assert.match(v.errors.email.es, /correo válido/);
  assert.ok(v.errors.budget_range);
});
await check('v2: sin correo ni teléfono pide uno de los dos', () => {
  const v = validate('inicial', { ...V2_OK, email: '', phone: '' });
  assert.match(v.errors.email.es, /correo o un teléfono/);
});
await check('v2: campo condicional inactivo no se valida (solo branding)', () => {
  const v = validate('inicial', { ...V2_OK, services: ['branding'], website_type: 'cualquier-cosa' });
  assert.equal(v.ok, true, JSON.stringify(v.errors));
});
await check('arranque: guardado parcial no exige obligatorios; envío sí', () => {
  assert.equal(validate('arranque', {}, { partial: true }).ok, true);
  const full = validate('arranque', {});
  assert.ok(full.errors.leads_email);
});
await check('arranque: repeater, horario, zonas, mes y número', () => {
  const v = validate('arranque', {
    leads_email: 'pedidos@negocio.com',
    client_services: [{ name: 'Retiro de muebles', unit: 'item', price_from: '1,500', includes: 'Carga y retiro' }, { name: '', unit: 'xx' }],
    hours: { mon: { open: '08:00', close: '17:00' }, sun: { closed: true } },
    zones: [{ place: 'Orlando', zip: '32801', frequency: 'often' }, 'Kissimmee'],
    start_month: '2019-03',
    brand_color_list: [{ name: 'Rojo', hex: '#E11D2E' }, { name: 'Malo', hex: 'rojo' }],
    employees: '4.5',
  });
  assert.equal(v.data.client_services[0].price_from, 1500);
  assert.ok(v.errors['client_services.1.name'], 'nombre obligatorio en la fila');
  assert.ok(v.errors['client_services.1.unit'], 'unidad fuera de la lista');
  assert.ok(v.errors['brand_color_list.1.hex'], 'hex inválido');
  assert.ok(v.errors.employees, 'entero');
  assert.equal(v.data.zones.length, 2);
  assert.ok(!v.errors.hours && !v.errors.zones && !v.errors.start_month);
  assert.ok(validate('arranque', { start_month: '2019-13' }, { partial: true }).errors.start_month);
  assert.ok(validate('arranque', { hours: { mon: { open: '8am', close: '5pm' } } }, { partial: true }).errors.hours);
});

// ── 4) Compatibilidad v1 (payloads reales) ────────────────────────
// Tal como lo arma src/components/ChatWidget.astro (kind 'proyecto').
const CHAT_V1 = {
  source: 'chat', business_name: 'Tacos El Güero', owner_name: 'Ana', industry: 'restaurante',
  business_description: 'Taquería familiar', city_state: 'Houston, TX', current_website: '',
  website_type: 'sitio a medida con menú', target_audience: 'familias hispanas', main_objective: 'Pedidos en línea',
  budget_range: 'unos $1,500', timeline: 'en un mes', language: 'bilingüe', email: 'ana@example.com', phone: '7135550199',
  additional_notes: 'Brief armado por el asistente Marcy.\n\n--- Conversación ---\n...', referred_by: 'chatbot', website_hp: '',
};
// Tal como lo envía src/pages/formulario.astro (values exactos de sus opciones).
const FORM_V1 = {
  business_name: 'Rosy Nails', owner_name: 'Rosa', industry: 'salón', years_in_market: '5', phone: '7865550100',
  email: 'rosa@example.com', city_state: 'Miami, FL', google_business: 'noSe', website_type: 'reservas', has_domain: 'si',
  has_hosting: 'noSe', pages_required: ['Inicio (Home)', 'Reservas / Citas'], features_required: ['Integración WhatsApp'],
  has_logo: 'update', brand_personality: 'luxury', has_photos: 'pocas', has_copy: 'no', has_video: 'no', language: 'biling',
  budget_range: '5000+', timeline: '2-4sem', referred_by: 'instagram', previous_agency: 'no', website_hp: '',
};
await check('v1 chat: texto libre del asistente se conserva (modo free)', () => {
  const c = normalize(CHAT_V1, { only: LEGACY_COLUMNS, optionMode: 'free', truncate: 5000 });
  assert.equal(c.website_type, 'sitio a medida con menú');
  assert.equal(c.budget_range, 'unos $1,500');
  assert.equal(c.referred_by, 'chatbot');
  assert.equal(c.current_website, null);
  assert.ok(!('source' in c) && !('website_hp' in c), 'solo columnas del brief');
  assert.equal(labelFor('budget_range', c.budget_range), 'unos $1,500', 'valor desconocido se muestra tal cual');
});
await check('v1 formulario: opciones exactas se conservan y la basura pasa a null (modo drop)', () => {
  const c = normalize({ ...FORM_V1, timeline: '<script>' }, { only: LEGACY_COLUMNS, optionMode: 'drop', truncate: 5000 });
  assert.equal(c.website_type, 'reservas');
  assert.deepEqual(c.pages_required, ['Inicio (Home)', 'Reservas / Citas']);
  assert.deepEqual(c.features_required, ['Integración WhatsApp']);
  assert.equal(c.timeline, null);
  assert.equal(c.years_in_market, '5');
});
await check('v1: textos largos se recortan a 5000 como antes', () => {
  const c = normalize({ additional_notes: 'x'.repeat(9000) }, { only: LEGACY_COLUMNS, optionMode: 'free', truncate: 5000 });
  assert.equal(c.additional_notes.length, 5000);
});
await check('B-08: etiquetas legibles en lugar de códigos crudos', () => {
  assert.equal(labelFor('google_business', 'noSe'), 'No sé');
  assert.equal(labelFor('language', 'biling'), 'Bilingüe');
  assert.equal(labelFor('language', 'biling', 'en'), 'Bilingual');
  assert.equal(labelFor('timeline', '2-4sem'), 'En 2 a 4 semanas');
  assert.equal(labelFor('has_logo', 'update'), 'Quiero renovarlo');
  assert.equal(labelFor('brand_personality', 'luxury'), 'Lujo o premium');
  assert.equal(labelFor('budget_range', '5000+'), 'Más de $5,000');
  assert.equal(labelFor('features_required', ['Integración WhatsApp']), 'Botón de WhatsApp');
  assert.equal(labelFor('services', ['diseno-web', 'seo-local']), 'Diseño web · SEO local');
  assert.equal(labelFor('start_month', '2019-03'), 'marzo de 2019');
  assert.equal(labelFor('start_month', '2019-03', 'en'), 'March 2019');
  assert.equal(labelFor('hours', { mon: { open: '08:00', close: '17:00' }, sun: { closed: true } }), 'Lun 08:00 a 17:00 · Dom cerrado');
  assert.equal(shortLabel(FIELDS.get('owner_name')), 'Propietario');
});

// ── 5) Etiquetas de archivo ───────────────────────────────────────
await check('normalizeFileTags: solo etiquetas conocidas y opciones válidas', () => {
  const t = normalizeFileTags('photo', { shot: 'team', origin: 'own', stage: 'malo', month: '2026-09', evil: 'x', field: 'kit_photo_files', google_ok: 'true' });
  assert.deepEqual(t, { shot: 'team', origin: 'own', month: '2026-09', field: 'kit_photo_files', google_ok: true });
  assert.deepEqual(normalizeFileTags('logo', { field: 'business_name', variant: 'dark_bg' }), { variant: 'dark_bg' });
  assert.deepEqual(normalizeFileTags('photo', null), {});
});

// ── 6) Límite de envíos (almacén falso) ───────────────────────────
await check('ratelimit: 5 por ventana y el 6.º se rechaza con Retry-After', async () => {
  const store = memoryStore();
  const now = Date.UTC(2026, 9, 19, 15, 1, 0);
  const lim = [{ limit: 5, windowSec: 600 }];
  for (let i = 0; i < 5; i++) assert.equal((await rateLimit({ bucket: 'brief', key: '1.2.3.4', limits: lim, store, now })).ok, true);
  const r = await rateLimit({ bucket: 'brief', key: '1.2.3.4', limits: lim, store, now });
  assert.equal(r.ok, false);
  assert.ok(r.retryAfter > 0 && r.retryAfter <= 600);
  assert.equal((await rateLimit({ bucket: 'brief', key: '5.6.7.8', limits: lim, store, now })).ok, true, 'otra IP no comparte cuenta');
  assert.equal((await rateLimit({ bucket: 'contact', key: '1.2.3.4', limits: lim, store, now })).ok, true, 'otro bucket no comparte cuenta');
  assert.equal((await rateLimit({ bucket: 'brief', key: '1.2.3.4', limits: lim, store, now: now + 600000 })).ok, true, 'ventana nueva');
});
await check('ratelimit: ventana diaria también cuenta', async () => {
  const store = memoryStore();
  let now = Date.UTC(2026, 9, 19, 0, 0, 0);
  let last;
  for (let i = 0; i < 21; i++) { last = await rateLimit({ bucket: 'brief', key: 'ip', limits: LIMITS.brief, store, now }); now += 11 * 60 * 1000; }
  assert.equal(last.ok, false, 'el envío 21 del día se rechaza aunque la ventana corta esté libre');
});
await check('ratelimit: si el almacén falla, degrada a memoria sin romper', async () => {
  const broken = { async incr() { const e = new Error('relation "rate_limit_hits" does not exist'); e.code = '42P01'; throw e; } };
  const r = await rateLimit({ bucket: 'login', key: '9.9.9.9', limits: LIMITS.login, store: broken });
  assert.equal(r.ok, true);
  assert.equal(r.degraded, true);
});
await check('ratelimit: la clave no contiene la IP y las ventanas se alinean', () => {
  const h = hashKey('brief', '203.0.113.7');
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.ok(!h.includes('203'));
  assert.equal(windowStart(Date.UTC(2026, 0, 1, 10, 7, 30), 600).toISOString(), '2026-01-01T10:00:00.000Z');
});

// ── 7) Reglas de subida (onBeforeGenerateToken) ───────────────────
await check('safeFileName: sin rutas, sin acentos, extensión corta', () => {
  assert.equal(safeFileName('../../etc/passwd'), 'passwd');
  assert.equal(safeFileName('C:\\fotos\\Foto Niño #1.HEIC'), 'Foto-Nino-1.heic');
  assert.equal(safeFileName(''), 'archivo');
  assert.equal(safeFileName('.htaccess'), 'htaccess');
  assert.equal(safeFileName('logo final (2).svg'), 'logo-final-2.svg');
  assert.equal(safeFileName('a'.repeat(300) + '.jpeg').length, 85);
  assert.equal(cleanOriginalName('dir/Foto\u0000 Niño.jpg'), 'Foto Niño.jpg');
});
const DRAFT_ID = '3f2b8c1e-9a4d-4c7e-8b2a-1d5e6f7a8b9c';
const SECRET = 'secreto-de-prueba-largo-1234567890';
const DRAFT = { id: DRAFT_ID, secret_hash: hashSecret(SECRET), purpose: 'brief', expires_at: new Date(Date.now() + 3600e3).toISOString(), submitted_at: null, files_count: 0, bytes_total: 0 };
const payload = (o = {}) => parseClientPayload(JSON.stringify({ draftId: DRAFT_ID, secret: SECRET, kind: 'photo', size: 2_000_000, contentType: 'image/jpeg', originalName: 'IMG_0755.jpeg', tags: { shot: 'team' }, ...o }));
await check('pathname: se construye y se valida (sin traversal ni kind ajeno)', () => {
  const p = buildPathname(DRAFT_ID, 'photo', 'IMG 0755.jpeg');
  assert.equal(p, `briefs/${DRAFT_ID}/photo/IMG-0755.jpeg`);
  assert.deepEqual(parseBlobPathname(p), { draftId: DRAFT_ID, kind: 'photo', name: 'IMG-0755.jpeg' });
  assert.equal(parseBlobPathname(`briefs/${DRAFT_ID}/photo/../x.jpg`), null);
  assert.equal(parseBlobPathname(`briefs/${DRAFT_ID}/exe/x.jpg`), null);
  assert.equal(parseBlobPathname(`briefs/_test/photo/x.jpg`), null);
});
await check('token OK: tipo y tamaño exactos, 10 min, sufijo aleatorio, sin sobrescribir, sin secreto en el payload', () => {
  const now = Date.now();
  const r = checkUploadRequest({ pathname: buildPathname(DRAFT_ID, 'photo', 'a.jpg'), payload: payload(), draft: DRAFT, now });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.tokenOptions.allowedContentTypes, ['image/jpeg']);
  assert.equal(r.tokenOptions.maximumSizeInBytes, 2_000_000);
  assert.equal(r.tokenOptions.validUntil, now + UPLOAD_TOKEN_TTL_MS);
  assert.equal(r.tokenOptions.addRandomSuffix, true);
  assert.equal(r.tokenOptions.allowOverwrite, false);
  assert.ok(!r.tokenPayload.includes(SECRET), 'el secreto no viaja al webhook');
  assert.equal(JSON.parse(r.tokenPayload).kind, 'photo');
});
await check('token rechazado: secreto, enviado, caducado, tipo, tamaño, ruta y cupos', () => {
  const p = buildPathname(DRAFT_ID, 'photo', 'a.jpg');
  const code = (o) => checkUploadRequest({ pathname: p, payload: payload(), draft: DRAFT, ...o }).code;
  assert.equal(checkUploadRequest({ pathname: p, payload: payload({ secret: 'otro' }), draft: DRAFT }).status, 401);
  assert.equal(code({ draft: { ...DRAFT, submitted_at: new Date().toISOString() } }), 'submitted');
  assert.equal(code({ draft: { ...DRAFT, expires_at: new Date(Date.now() - 1000).toISOString() } }), 'expired');
  assert.equal(code({ draft: null }), 'no_draft');
  assert.equal(checkUploadRequest({ pathname: p, payload: payload({ contentType: 'text/html' }), draft: DRAFT }).status, 415);
  assert.equal(checkUploadRequest({ pathname: p, payload: payload({ size: KIND_RULES.photo.maxBytes + 1 }), draft: DRAFT }).status, 413);
  assert.equal(checkUploadRequest({ pathname: buildPathname(DRAFT_ID, 'logo', 'a.jpg'), payload: payload(), draft: DRAFT }).code, 'bad_path');
  assert.equal(checkUploadRequest({ pathname: p, payload: payload({ kind: 'zip' }), draft: DRAFT }).code, 'bad_kind');
  assert.equal(code({ draft: { ...DRAFT, files_count: DRAFT_LIMITS.maxFiles } }), 'quota_files');
  assert.equal(code({ draft: { ...DRAFT, bytes_total: DRAFT_LIMITS.maxBytes - 1000 } }), 'quota_bytes');
  assert.equal(checkUploadRequest({ pathname: p, payload: null, draft: DRAFT }).code, 'bad_payload');
  assert.equal(parseClientPayload('no es json'), null);
});
await check('límites por clase: logo 20 MB, foto 15, documento 25, legal 15', () => {
  assert.equal(KIND_RULES.logo.maxBytes, 20 * 1024 * 1024);
  assert.equal(KIND_RULES.photo.maxBytes, 15 * 1024 * 1024);
  assert.equal(KIND_RULES.doc.maxBytes, 25 * 1024 * 1024);
  assert.equal(KIND_RULES.legal.maxBytes, 15 * 1024 * 1024);
  assert.ok(KIND_RULES.logo.declared.includes('image/svg+xml') && KIND_RULES.logo.declared.includes('application/postscript'));
  assert.ok(KIND_RULES.photo.declared.includes('image/heic'));
  assert.equal(DRAFT_LIMITS.maxFiles, 60);
  assert.equal(DRAFT_LIMITS.maxBytes, 300 * 1024 * 1024);
});
await check('secretos: comparación por hash, sin aceptar vacíos', () => {
  assert.equal(secretMatches(SECRET, hashSecret(SECRET)), true);
  assert.equal(secretMatches('x', hashSecret(SECRET)), false);
  assert.equal(secretMatches('', hashSecret('')), false);
});

// ── 8) Tipo real por bytes mágicos ────────────────────────────────
const PNG = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001080600000026c9a5d2', 'hex');
const JPG = Buffer.concat([Buffer.from('ffd8ffe000104a46494600010100000100010000', 'hex'), Buffer.alloc(64)]);
const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
const SVG = Buffer.from('<?xml version="1.0"?>\n<!-- logo -->\n<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const real = async (kind, declared, buf) => isAllowedRealType({
  kind, declared, detected: (await fileTypeFromBuffer(buf))?.mime, headText: buf.subarray(0, 1024).toString('utf8'),
});
await check('tipo real: PNG y JPEG de verdad pasan como foto', async () => {
  assert.deepEqual(await real('photo', 'image/png', PNG), { ok: true, realType: 'image/png' });
  assert.deepEqual(await real('photo', 'image/jpeg', JPG), { ok: true, realType: 'image/jpeg' });
  assert.equal((await real('photo', 'image/jpeg', PNG)).ok, true, 'imagen por imagen se acepta');
});
await check('tipo real: un PDF disfrazado de JPEG se rechaza como foto', async () => {
  assert.equal((await real('photo', 'image/jpeg', PDF)).ok, false);
  assert.equal((await real('legal', 'image/jpeg', PDF)).ok, false, 'familia distinta aunque PDF sea legal');
  assert.equal((await real('legal', 'application/pdf', PDF)).ok, true);
  assert.equal((await real('doc', 'application/pdf', Buffer.from('<html><body>hola</body></html>'))).ok, false);
});
await check('tipo real: SVG se reconoce como logo y nunca se muestra en línea', async () => {
  assert.ok(looksLikeSvg(SVG.toString()));
  assert.deepEqual(await real('logo', 'image/svg+xml', SVG), { ok: true, realType: 'image/svg+xml' });
  assert.equal((await real('photo', 'image/jpeg', SVG)).ok, false, 'SVG no es foto');
  assert.match(dispositionFor('image/svg+xml', 'logo.svg'), /^attachment;/);
  assert.match(dispositionFor('application/pdf', 'seguro.pdf'), /^attachment;/);
  assert.match(dispositionFor('image/jpeg', 'Foto Niño.jpg'), /^inline; filename="Foto-Nino\.jpg"; filename\*=UTF-8''Foto%20Ni%C3%B1o\.jpg$/);
});

// ── 9) Kit de arranque (sin base de datos) ────────────────────────
await check('kit: token largo, solo su hash, URL por idioma y precarga sin PII', () => {
  const t = newKitToken();
  assert.ok(isKitTokenShape(t) && t.length >= 43);
  assert.match(hashKitToken(t), /^[0-9a-f]{64}$/);
  assert.ok(!isKitTokenShape('../../x'));
  assert.match(kitUrl(t, 'en'), new RegExp(`/en/kit/${t}$`));
  assert.match(kitUrl(t, 'es'), /\/es\/kit\//);
  const pre = kitPrefill({ business_name: 'X', email: 'a@b.co', phone: '1234567', ip_address: '1.1.1.1', budget_range: '5000+', summary: 'interno', target_audience: 'familias', pages_required: [] });
  assert.equal(pre.business_name, 'X');
  assert.equal(pre.target_audience, 'familias');
  for (const k of ['email', 'phone', 'ip_address', 'budget_range', 'summary']) assert.ok(!(k in pre), k);
});

// ── 10) /api/brief: rutas que responden ANTES de tocar la base ─────
// Solo sin conexión configurada: así es imposible escribir en una base real.
const noDb = !process.env.POSTGRES_URL && !process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL;
if (noDb) {
  const { default: briefHandler } = await import('../api/brief.mjs');
  const call = async (method, body) => {
    const res = {
      statusCode: 200, headers: {}, body: null,
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; },
    };
    await briefHandler({ method, body, headers: { 'x-forwarded-for': '198.51.100.9', 'user-agent': 'test' } }, res);
    return res;
  };
  await check('/api/brief: 405, honeypot y contacto obligatorio (v1)', async () => {
    assert.equal((await call('GET', {})).statusCode, 405);
    const hp = await call('POST', { website_hp: 'bot', email: 'x@y.co' });
    assert.deepEqual([hp.statusCode, hp.body.projectId], [200, 'MRC-000']);
    assert.equal((await call('POST', { business_name: 'X' })).statusCode, 400);
    const bad = await call('POST', { email: 'no-es-correo' });
    assert.equal(bad.statusCode, 400);
    assert.match(bad.body.error, /formato válido/);
  });
  await check('/api/brief v2: errores por campo en el idioma pedido', async () => {
    const r = await call('POST', { schema_version: 2, lang: 'en', services: [], email: 'x@y.co' });
    assert.equal(r.statusCode, 400);
    assert.equal(r.body.error, 'Please check the highlighted fields.');
    assert.ok(r.body.fields.services && r.body.fields.business_name && r.body.fields.main_objective);
  });
} else {
  console.warn('· pruebas del handler omitidas: hay una base de datos configurada en el entorno');
}

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) del brief v2 fallaron:\n - ` + fails.join('\n - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas del brief v2 pasaron.`);
