// ════════════════════════════════════════════════════════════════
//  scripts/test-brief-form.mjs — Pruebas del formulario nuevo y del kit
//  (Orbit v2 · B1). Solo lógica pura: pasos, bytes mágicos, guardado,
//  bloques del kit, textos y el cableado del sitio (rutas, sitemap, pie).
//  npm run test:brief-form
// ════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { STEPS, REVIEW_STEP, INITIAL_FIELDS, stepOfField, fieldsForStep, validateStep, validateAll, errorsForStep, firstStepWithErrors } from '../src/components/brief/lib/steps.js';
import { sniffBytes, CLIENT_KINDS, allowedFor, fmtBytes, withExt, DEFAULT_LIMITS } from '../src/components/brief/lib/sniff.js';
import { fitWithin, PHOTO_MAX_SIDE, PHOTO_QUALITY } from '../src/components/brief/lib/images.js';
import { splitForStorage, CONTACT_KEYS, loadBrief } from '../src/components/brief/lib/persist.js';
import { kitTokenFrom, kitBlocks, blockStatus, cleanForSend, blockData, isFilled, shotsDone, SHOTS_TOTAL, errorsForBlock } from '../src/components/brief/lib/kit.js';
import { STRINGS_ES, STRINGS_EN } from '../src/components/brief/lib/strings.js';
import { KIND_RULES, DRAFT_LIMITS, buildPathname, parseBlobPathname } from '../lib/brief-upload-rules.mjs';
import { sectionsFor, fieldByKey, SECTIONS } from '../lib/brief-schema.mjs';

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.error('✗', name); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), `${name} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ── 1. Seis pasos y cada campo inicial en exactamente uno ─────
eq(STEPS.length, 6, 'seis pasos');
eq(REVIEW_STEP, 5, 'el último paso es revisar');
for (const s of STEPS) ok(s.label.es && s.label.en && s.intro.es && s.intro.en, `paso ${s.key} con nombre e intro ES/EN`);
const placed = STEPS.flatMap((s) => s.fields);
eq(placed.length, new Set(placed).size, 'ningún campo repetido entre pasos');
for (const f of INITIAL_FIELDS) {
  ok(placed.includes(f.key), `el campo inicial ${f.key} tiene paso asignado`);
}
for (const k of placed) ok(fieldByKey(k) && fieldByKey(k).moment === 'inicial', `${k} es del momento inicial`);
eq(stepOfField('logo_files'), 2, 'el logo se sube en "Tu marca"');
eq(stepOfField('email'), 4, 'el correo va en "Cómo te contactamos"');

// condicionales: tipo de sitio solo con servicios web
const s2none = fieldsForStep(1, ['seo-local']).map((f) => f.key);
const s2web = fieldsForStep(1, ['diseno-web']).map((f) => f.key);
ok(!s2none.includes('website_type'), 'sin servicio web no se pregunta el tipo de sitio');
ok(s2web.includes('website_type'), 'con diseño web se pregunta el tipo de sitio');

// ── 2. Validación por paso (mensajes ES/EN junto al campo) ────
const e0 = validateStep(0, {});
ok(e0.business_name && e0.business_name.es && e0.business_name.en, 'paso 1 exige el nombre del negocio (ES/EN)');
ok(!e0.services, 'paso 1 no muestra errores de otros pasos');
ok(validateStep(1, {}).services, 'paso 2 exige al menos un servicio');
ok(validateStep(4, {}).email, 'paso 5 exige correo o teléfono');
eq(Object.keys(validateStep(4, { phone: '832 555 0142', owner_name: 'Julio' })), [], 'con teléfono basta');
ok(validateStep(4, { email: 'julio@x', owner_name: 'Julio' }).email, 'correo mal escrito se marca');
eq(Object.keys(validateStep(2, {})), [], 'el paso de marca es opcional');
const full = {
  business_name: 'Julio’s Landscape', services: ['diseno-web'], main_objective: 'Más llamadas', owner_name: 'Julio',
  email: 'julio@ejemplo.com', budget_range: 'menos-500', website_type: 'corporativo',
};
ok(validateAll(full).ok, 'un brief completo valida igual que en el servidor');
eq(firstStepWithErrors({ email: {}, business_name: {} }), 0, 'el primer paso con errores es el primero');
eq(Object.keys(errorsForStep(4, { email: {}, business_name: {} })), ['email'], 'errores filtrados por paso');
ok(!validateAll({ ...full, budget_range: 'cualquier-cosa' }).ok, 'opción de presupuesto inventada no pasa (B-10)');

// ── 3. Presupuesto acorde a los precios publicados ────────────
const budget = fieldByKey('budget_range').options.map((o) => o.value);
ok(budget.includes('menos-500'), 'existe el rango "menos de $500" (landing $400, logo $150)');
const svc = fieldByKey('services').options;
ok(svc.length >= 7 && svc.every((o) => o.hint && o.hint.es && o.hint.en), 'cada servicio trae su "desde" (pricing.ts)');

// ── 4. Bytes mágicos ─────────────────────────────────────────
const B = (...xs) => new Uint8Array(xs);
const A = (s, pad = 0) => new Uint8Array([...Buffer.from(s, 'latin1'), ...new Array(pad).fill(0)]);
eq(sniffBytes(B(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg', 'JPEG');
eq(sniffBytes(B(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'image/png', 'PNG');
eq(sniffBytes(A('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp', 'WebP');
eq(sniffBytes(A('\0\0\0\x18ftypheic\0\0\0\0mif1heic')), 'image/heic', 'HEIC');
eq(sniffBytes(A('\0\0\0\x18ftypmif1\0\0\0\0mif1heic')), 'image/heif', 'HEIF');
eq(sniffBytes(A('\0\0\0\x14ftypqt  \0\0\0\0')), 'video/quicktime', 'MOV');
eq(sniffBytes(A('\0\0\0\x18ftypisom\0\0\0\0')), 'video/mp4', 'MP4');
eq(sniffBytes(B(0x1a, 0x45, 0xdf, 0xa3)), 'video/webm', 'WebM');
eq(sniffBytes(A('%PDF-1.7')), 'application/pdf', 'PDF (y .ai moderno)');
eq(sniffBytes(A('%!PS-Adobe-3.0 EPSF-3.0')), 'application/postscript', 'EPS/PS en texto');
eq(sniffBytes(B(0xc5, 0xd0, 0xd3, 0xc6)), 'application/eps', 'EPS binario');
eq(sniffBytes(A('<?xml version="1.0"?>\n<!-- logo -->\n<svg xmlns="http://www.w3.org/2000/svg">')), 'image/svg+xml', 'SVG');
eq(sniffBytes(A('PK\x03\x04....[Content_Types].xml...word/document.xml')), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'DOCX');
eq(sniffBytes(A('PK\x03\x04....cosas.txt')), 'application/zip', 'ZIP genérico se reconoce como ZIP');
eq(sniffBytes(A('hola mundo')), null, 'texto cualquiera: desconocido');
ok(!allowedFor('photo', 'application/pdf'), 'un PDF con extensión .jpg no pasa como foto');
ok(!allowedFor('logo', 'application/zip'), 'sin ZIP del cliente');
ok(allowedFor('logo', 'image/svg+xml') && allowedFor('photo', 'image/heic'), 'SVG en logo y HEIC en foto');

// accept: image/jpeg primero (Safari de iOS convierte HEIC) y subconjunto del servidor
ok(CLIENT_KINDS.photo.accept.startsWith('image/jpeg'), 'accept de fotos pide image/jpeg primero');
for (const [k, r] of Object.entries(CLIENT_KINDS)) {
  ok(KIND_RULES[k], `clase ${k} existe en el servidor`);
  for (const t of r.types) ok(KIND_RULES[k].declared.includes(t), `${k}: ${t} lo acepta el servidor`);
}
eq(DEFAULT_LIMITS.maxFiles, DRAFT_LIMITS.maxFiles, 'tope de archivos igual al del servidor');
eq(DEFAULT_LIMITS.maxBytes, DRAFT_LIMITS.maxBytes, 'tope de MB igual al del servidor');
for (const k of Object.keys(KIND_RULES)) eq(DEFAULT_LIMITS.kinds[k].maxBytes, KIND_RULES[k].maxBytes, `tope por clase ${k}`);
// la ruta que arma el navegador la acepta el servidor
const draftId = '6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f';
const pth = buildPathname(draftId, 'photo', 'Foto de Julio (1).HEIC');
ok(parseBlobPathname(pth), 'la ruta de subida del navegador pasa la regla del servidor');

// ── 5. Fotos a calidad web ───────────────────────────────────
eq(PHOTO_MAX_SIDE, 3000, 'lado largo 3000 px');
eq(PHOTO_QUALITY, 0.85, 'JPEG 0,85');
eq(fitWithin(4032, 3024), { width: 3000, height: 2250 }, 'foto de iPhone horizontal');
eq(fitWithin(3024, 4032), { width: 2250, height: 3000 }, 'foto vertical');
eq(fitWithin(1200, 900), { width: 1200, height: 900 }, 'una foto pequeña no se agranda');
eq(withExt('IMG_0042.HEIC', 'jpg'), 'IMG_0042.jpg', 'extensión cambiada al convertir');
ok(fmtBytes(5 * 1024 * 1024, 'es').includes('MB') && fmtBytes(2048, 'en') === '2 KB', 'tamaños legibles');

// ── 6. Guardado: el contacto nunca va a localStorage ─────────
const sp = splitForStorage({ business_name: 'X', email: 'a@b.co', phone: '1', owner_name: 'Y', services: ['branding'] });
eq(Object.keys(sp.session).sort(), [...CONTACT_KEYS].sort(), 'nombre, correo y teléfono solo en la sesión');
ok(!('email' in sp.local) && sp.local.business_name === 'X', 'el resto se guarda para retomar');
eq(loadBrief(), null, 'sin navegador no hay nada que retomar (y no rompe)');

// ── 7. Kit de arranque ───────────────────────────────────────
const TOK = 'AbC_def-1234567890abcdefXYZ';
eq(kitTokenFrom(`/es/kit/${TOK}`), TOK, 'token desde /es/kit/<token>');
eq(kitTokenFrom(`/en/kit/${TOK}/`), TOK, 'token desde /en/kit/<token>/');
eq(kitTokenFrom('/es/kit', `?t=${TOK}`), TOK, 'token desde ?t= en local');
eq(kitTokenFrom('/es/kit/<script>'), '', 'token raro: se ignora');
const blocks = kitBlocks(['seo-local'], null);
ok(blocks.every((b) => b.moment === 'arranque'), 'los bloques son del momento arranque');
ok(!blocks.some((b) => b.key === 'tienda'), 'sin tienda en línea no aparece el bloque de tienda');
ok(blocks.some((b) => b.key === 'seo'), 'con SEO local aparece "Cómo te buscan"');
eq(kitBlocks(null, ['canales', 'fotos']).map((b) => b.key), ['canales', 'fotos'], 'solo los bloques que anuncia el servidor');
const canales = SECTIONS.find((s) => s.key === 'canales');
eq(blockStatus(canales, {}).status, 'pending', 'bloque vacío: pendiente');
eq(blockStatus(SECTIONS.find((s) => s.key === 'prueba_social'), {}).status, 'optional', 'reseñas y seguros: opcional');
eq(blockStatus(canales, { public_phone: '8325550142' }).status, 'partial', 'falta el obligatorio: a medias');
eq(blockStatus(canales, { leads_email: 'a@b.co' }, [], new Set(['canales'])).status, 'done', 'guardado con lo obligatorio: listo');
const fotos = SECTIONS.find((s) => s.key === 'fotos');
const files = [{ field: 'kit_photo_files', status: 'done', tags: { shot: 'owner' } }, { field: 'kit_photo_files', status: 'done', tags: { shot: 'storefront' } }, { field: 'kit_photo_files', status: 'done', removed: true, tags: { shot: 'team' } }];
eq(shotsDone(files), 2, 'tomas con foto (las quitadas no cuentan)');
eq(SHOTS_TOTAL, 7, 'siete tomas guiadas además de "otra"');
ok(blockStatus(fotos, {}, files).filled >= 1, 'las fotos subidas cuentan para el bloque');
const hours = fieldByKey('hours');
eq(cleanForSend(hours, { mon: { closed: false, open: '', close: '' }, tue: { closed: false, open: '08:00', close: '17:00' }, sun: { closed: true, open: '09:00' } }),
  { tue: { closed: false, open: '08:00', close: '17:00' }, sun: { closed: true, open: null, close: null } }, 'horario sin días vacíos');
eq(cleanForSend(hours, { mon: { closed: false, open: '', close: '' } }), null, 'horario vacío no se manda');
eq(cleanForSend(fieldByKey('zones'), [{ place: '', zip: '', frequency: null }, { place: 'Katy', zip: '', frequency: 'often' }]), [{ place: 'Katy', zip: '', frequency: 'often' }], 'zonas en blanco fuera');
ok(!isFilled(fieldByKey('responders'), [{ channel: '', person: '', languages: [] }]), 'fila de repetidor vacía no cuenta');
const ubic = SECTIONS.find((s) => s.key === 'ubicacion');
ok(!('legal_name' in blockData(ubic, { legal_name: 'X', address: 'Y' })), 'guardar un bloque manda solo sus campos');
eq(Object.keys(errorsForBlock(canales, { leads_email: {}, legal_name: {}, 'responders.0.person': {} })), ['leads_email', 'responders.0.person'], 'errores del kit filtrados por bloque');

// ── 8. Textos: mismas claves ES/EN, sin em-dash ni voseo ─────
eq(Object.keys(STRINGS_ES).sort(), Object.keys(STRINGS_EN).sort(), 'mismas claves en ES y EN');
const flat = (o) => Object.values(o).flatMap((v) => (typeof v === 'string' ? [v] : typeof v === 'function' ? [String(v(1, 2, 'x'))] : typeof v === 'object' ? flat(v) : []));
for (const s of [...flat(STRINGS_ES), ...flat(STRINGS_EN)]) {
  ok(!/[—–]/.test(s), `sin em-dash: "${s.slice(0, 40)}"`);
}
for (const s of flat(STRINGS_ES)) ok(!/\b(tenés|podés|querés|sabés|vos)\b/i.test(s), `sin voseo: "${s.slice(0, 40)}"`);
ok(flat(STRINGS_ES).some((s) => s.includes('1 hora hábil')) && flat(STRINGS_ES).some((s) => s.includes('24 horas')), 'plazos del sitio: 1 hora hábil y 24 horas');
ok(flat(STRINGS_EN).some((s) => s.includes('1 business hour')) && flat(STRINGS_EN).some((s) => s.includes('24 hours')), 'plazos en inglés');
// "Siguiente: <paso>" lo fija el gate validado (design/brief.md §2), por eso no entra aquí.
const btnPairs = [['send', 'send'], ['back', 'back'], ['kitSave', 'kitSave'], ['kitSend', 'kitSend'], ['choose', 'choose'], ['retry', 'retry']];
for (const [k] of btnPairs) ok(STRINGS_ES[k].length <= STRINGS_EN[k].length + 4, `botón "${STRINGS_ES[k]}" no mucho más largo que "${STRINGS_EN[k]}"`);

// ── 9. Cableado del sitio ────────────────────────────────────
const vercel = JSON.parse(read('vercel.json'));
ok((vercel.rewrites || []).some((r) => r.source === '/es/kit/:token' && r.destination === '/es/kit'), 'rewrite /es/kit/:token');
ok((vercel.rewrites || []).some((r) => r.source === '/en/kit/:token' && r.destination === '/en/kit'), 'rewrite /en/kit/:token');
ok(read('astro.config.mjs').includes("!page.includes('/project-brief')"), 'el brief en inglés fuera del sitemap');
ok(read('src/i18n/content.ts').includes("{ label: 'Project Form', href: '/en/project-brief' }"), 'el pie EN enlaza al brief en inglés');
ok(read('src/i18n/routes.ts').includes("['/formulario', '/en/project-brief']"), 'el conmutador ES|EN une los dos briefs');
ok(read('api/events.mjs').includes("'brief_submitted'"), 'evento de envío en la lista permitida');
ok(read('src/components/ChatWidget.astro').includes("lang === 'en' ? '/en/project-brief' : '/formulario'"), 'el chat en inglés enlaza al brief en inglés');
for (const p of ['src/pages/formulario.astro', 'src/pages/en/project-brief.astro', 'src/pages/es/kit.astro', 'src/pages/en/kit.astro']) {
  const src = read(p);
  ok(src.includes('noindex={true}'), `${p} es noindex`);
  ok(src.includes('import.meta.env.DEV && <script is:inline src="/dev/brief-mock.js">'), `${p} carga el mock solo en desarrollo`);
  ok(src.includes('SpaceBackdrop'), `${p} con atmósfera (E-01)`);
}
const pkg = JSON.parse(read('package.json'));
ok(/^\d+\.\d+\.\d+$/.test(pkg.dependencies['heic-to'] || ''), 'heic-to con versión exacta');
for (const p of ['src/pages/privacidad.astro', 'src/pages/en/privacy.astro']) {
  const src = read(p);
  ok(src.includes('48') && src.includes('12') && src.includes('heic-to') && src.includes('LGPL'), `${p}: conservación de archivos y atribución LGPL`);
}

console.log(`\ntest:brief-form · ${pass} OK · ${fail} fallos`);
if (fail) process.exit(1);
