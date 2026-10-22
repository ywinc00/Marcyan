// ════════════════════════════════════════════════════════════════
//  scripts/test-brief-form.mjs — Pruebas del formulario nuevo y del kit
//  (Orbit v2 · B1). Lógica sin navegador: pasos, bytes mágicos, guardado,
//  bloques del kit, textos, el cableado del sitio (rutas, sitemap, pie) y
//  la clase de subidas con red y fotos simuladas (cancelar, reintentar, quitar).
//  npm run test:brief-form
// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileModule } from 'svelte/compiler';
import { cleanPage } from '../api/events.mjs';
import { STEPS, REVIEW_STEP, INITIAL_FIELDS, stepOfField, fieldsForStep, itemsForStep, groupOf, isHidden, effectiveData, validateStep, validateAll, errorsForStep, firstStepWithErrors } from '../src/components/brief/lib/steps.js';
import { sniffBytes, CLIENT_KINDS, allowedFor, fmtBytes, withExt, DEFAULT_LIMITS } from '../src/components/brief/lib/sniff.js';
import { fitWithin, PHOTO_MAX_SIDE, PHOTO_QUALITY } from '../src/components/brief/lib/images.js';
import { splitForStorage, CONTACT_KEYS, loadBrief } from '../src/components/brief/lib/persist.js';
import { kitTokenFrom, kitBlocks, blockStatus, cleanForSend, blockData, isFilled, shotsDone, SHOTS_TOTAL, errorsForBlock, visibleFields, validateKit } from '../src/components/brief/lib/kit.js';
import { STRINGS_ES, STRINGS_EN } from '../src/components/brief/lib/strings.js';
import { KIND_RULES, DRAFT_LIMITS, buildPathname, parseBlobPathname } from '../lib/brief-upload-rules.mjs';
import { sectionsFor, fieldByKey, SECTIONS } from '../lib/brief-schema.mjs';

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.error('✗', name); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), `${name} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const placed0 = () => STEPS.flatMap((s) => s.fields);

// ── 1. Cinco pasos y cada campo inicial en exactamente uno ────
eq(STEPS.length, 5, 'cinco pasos');
eq(REVIEW_STEP, 4, 'el último paso es revisar');
// 2026-10-21 (decisión del dueño): el formulario ya no pregunta la inversión.
ok(!placed0().includes('budget_range') && !INITIAL_FIELDS.some((f) => f.key === 'budget_range'), 'la inversión no se pregunta');
eq(stepOfField('timeline'), 1, 'el plazo va en "Qué necesitas"');
for (const s of STEPS) ok(s.label.es && s.label.en && s.intro.es && s.intro.en, `paso ${s.key} con nombre e intro ES/EN`);
const placed = STEPS.flatMap((s) => s.fields);
eq(placed.length, new Set(placed).size, 'ningún campo repetido entre pasos');
for (const f of INITIAL_FIELDS) {
  ok(placed.includes(f.key), `el campo inicial ${f.key} tiene paso asignado`);
}
for (const k of placed) ok(fieldByKey(k) && fieldByKey(k).moment === 'inicial', `${k} es del momento inicial`);
eq(stepOfField('logo_files'), 2, 'el logo se sube en "Tu marca"');
eq(stepOfField('email'), 3, 'el correo va en "Cómo te contactamos"');

// condicionales: tipo de sitio solo con servicios web
const s2none = fieldsForStep(1, ['seo-local']).map((f) => f.key);
const s2web = fieldsForStep(1, ['diseno-web']).map((f) => f.key);
ok(!s2none.includes('website_type'), 'sin servicio web no se pregunta el tipo de sitio');
ok(s2web.includes('website_type'), 'con diseño web se pregunta el tipo de sitio');

// Gate §3 (B1-R03): marca con colores y estado, idioma de contacto en el paso 5,
// y bloques cortos por servicio en "Qué necesitas".
eq(stepOfField('brand_status'), 2, 'el estado de la marca va en "Tu marca"');
eq(stepOfField('brand_color_list'), 2, 'los colores van en "Tu marca"');
eq(stepOfField('brand_colors_none'), 2, '"no tengo colores definidos" va en "Tu marca"');
eq(stepOfField('contact_language'), 3, 'el idioma de contacto va en "Cómo te contactamos"');
for (const k of ['web_extras', 'seo_scope', 'seo_areas', 'aeo_scope', 'aeo_tested', 'bot_channels', 'bot_tasks', 'product_count', 'shipping', 'brand_scope', 'brand_uses'])
  eq(stepOfField(k), 1, `${k} va en "Qué necesitas"`);
{
  const all = ['diseno-web', 'ia-conversacional', 'seo-ia', 'ecommerce', 'seo-local', 'branding'];
  const items = itemsForStep(1, all);
  const heads = items.filter((x) => x.head).map((x) => x.head);
  eq(heads, all, 'un encabezado por servicio elegido, en el orden del catálogo');
  eq(items.slice(0, 3).map((x) => x.fd.key), ['services', 'main_objective', 'language'], 'lo general va antes de los bloques');
  ok(items.every((x, i) => !x.head || i === 0 || groupOf(items[i - 1].fd, all) !== x.head), 'cada servicio abre su bloque una sola vez');
  eq(itemsForStep(1, ['branding']).filter((x) => x.head).map((x) => x.fd.key), ['brand_scope'], 'solo branding: un bloque, sin tipo de sitio');
  eq(itemsForStep(1, ['ecommerce']).filter((x) => groupOf(x.fd, ['ecommerce'])).map((x) => x.fd.key), ['website_type', 'product_count', 'shipping'], 'tienda sola: el tipo de sitio va en su bloque');
  eq(itemsForStep(1, []).filter((x) => x.head).length, 0, 'sin servicios elegidos no hay bloques');
  for (const id of all) ok(fieldsForStep(1, [id]).filter((f) => f.when).length <= 3, `${id}: de 1 a 3 preguntas`);
}
// Preguntas que dependen de otra respuesta: ocultas, no se validan ni se envían, y no se borran.
ok(isHidden('brand_status', { has_logo: 'no' }) && !isHidden('brand_status', { has_logo: 'si' }), 'sin logo no se pregunta si la marca está cerrada');
ok(isHidden('brand_color_list', { brand_colors_none: true }) && !isHidden('brand_color_list', {}), '"no tengo colores" oculta la lista');
{
  const d = { services: ['branding'], brand_colors_none: true, brand_color_list: [{ name: 'Rojo', hex: 'malo' }], seo_scope: 'xx', bot_channels: ['web'], brand_scope: 'logo' };
  const eff = effectiveData(d);
  ok(!('brand_color_list' in eff) && !('seo_scope' in eff) && !('bot_channels' in eff), 'lo oculto y lo de servicios no elegidos no se envía');
  eq(eff.brand_scope, 'logo', 'lo del servicio elegido sí');
  ok(d.brand_color_list && d.seo_scope, 'y nada se borra de lo que escribió el cliente');
  eq(Object.keys(validateStep(2, d)), [], 'un hex malo en una lista oculta no bloquea el paso');
  ok(validateStep(2, { brand_color_list: [{ name: 'Rojo', hex: 'malo' }] })['brand_color_list.0.hex'], 'con la lista visible, el hex malo se marca junto al campo');
  eq(Object.keys(validateStep(2, { brand_color_list: [{ name: 'Rojo', hex: '' }] })), [], 'el nombre solo, sin código, vale');
}

// ── 2. Validación por paso (mensajes ES/EN junto al campo) ────
const e0 = validateStep(0, {});
ok(e0.business_name && e0.business_name.es && e0.business_name.en, 'paso 1 exige el nombre del negocio (ES/EN)');
ok(!e0.services, 'paso 1 no muestra errores de otros pasos');
ok(validateStep(1, {}).services, 'paso 2 exige al menos un servicio');
ok(validateStep(3, {}).email, 'paso 4 exige correo o teléfono');
eq(Object.keys(validateStep(3, { phone: '832 555 0142', owner_name: 'Julio' })), [], 'con teléfono basta');
ok(validateStep(3, { email: 'julio@x', owner_name: 'Julio' }).email, 'correo mal escrito se marca');
eq(Object.keys(validateStep(2, {})), [], 'el paso de marca es opcional');
const full = {
  business_name: 'Julio’s Landscape', services: ['diseno-web'], main_objective: 'Más llamadas', owner_name: 'Julio',
  email: 'julio@ejemplo.com', budget_range: 'menos-500', website_type: 'corporativo',
};
ok(validateAll(full).ok, 'un brief completo valida igual que en el servidor');
eq(firstStepWithErrors({ email: {}, business_name: {} }), 0, 'el primer paso con errores es el primero');
eq(Object.keys(errorsForStep(3, { email: {}, business_name: {} })), ['email'], 'errores filtrados por paso');
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
  // Fotos: el cliente elige HEIC, PNG o WebP, pero lo que sube es SIEMPRE el
  // JPEG redibujado en el navegador (R5); el servidor solo acepta ese.
  if (k === 'photo') { eq(KIND_RULES.photo.declared, ['image/jpeg'], 'foto: el servidor solo acepta el JPEG del navegador'); continue; }
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
// Bloque "Lo que nos falta de tu brief" (R1): va primero, oculta lo que otra
// respuesta descarta, se manda y se valida con las reglas del brief corto.
const CATCH = ['contact_language', 'bot_channels', 'brand_status', 'brand_color_list', 'brand_colors_none'];
const withPend = kitBlocks(['ia-conversacional'], null, CATCH);
eq(withPend[0].key, 'pendientes', 'lo que falta del brief va primero');
eq(withPend[0].fields.map((f) => f.key), CATCH, 'con las claves que anuncia el servidor, en orden del esquema');
ok(!kitBlocks(['ia-conversacional'], null, []).some((b) => b.catchup), 'sin pendientes no hay bloque');
ok(!visibleFields(withPend[0], { brand_colors_none: true }).some((f) => f.key === 'brand_color_list'), '"No tengo colores" oculta la lista');
eq(Object.keys(blockData(withPend[0], { brand_colors_none: true, brand_color_list: [{ name: 'rojo', hex: '' }], contact_language: 'en' })).sort(), ['brand_colors_none', 'contact_language'], 'lo oculto no se manda');
ok(validateKit({ contact_language: 'fr' }, ['ia-conversacional'], true, withPend).errors.contact_language, 'se valida con las opciones del brief');
ok(validateKit({ contact_language: 'en', bot_channels: ['web'] }, ['ia-conversacional'], true, withPend).ok, 'respuestas válidas pasan');
ok(!validateKit({ contact_language: 'fr' }, ['ia-conversacional'], true, kitBlocks(['ia-conversacional'], null)).errors.contact_language, 'sin el bloque, la clave no es del kit');
// Brief creado desde el panel (sin formulario corto): lo obligatorio del corto
// que falta va en el bloque con otro título y sin exigirse ni bloquear el envío.
const PANEL = ['services', 'owner_name', 'main_objective', 'contact_language'];
const panelBlocks = kitBlocks([], null, PANEL, true);
eq(panelBlocks[0].label.es, 'Lo básico de tu proyecto', 'el bloque no habla de "tu brief" a quien no rellenó ninguno');
eq(kitBlocks([], null, PANEL)[0].label.es, 'Lo que nos falta de tu brief', 'sin panel, el título de siempre');
ok(panelBlocks[0].fields.every((f) => !f.required), 'nada obligatorio en el bloque');
ok(validateKit({ leads_email: 'a@b.co' }, [], false, panelBlocks).ok, 'enviar sin servicios ni objetivo no da error');
eq(blockStatus(panelBlocks[0], { owner_name: 'Rosa', main_objective: 'Más llamadas', contact_language: 'es' }).status, 'done', 'sin servicios el bloque puede quedar listo: no es obligatorio');

// ── 8. Textos: mismas claves ES/EN, sin em-dash ni voseo ─────
eq(Object.keys(STRINGS_ES).sort(), Object.keys(STRINGS_EN).sort(), 'mismas claves en ES y EN');
const flat = (o) => Object.values(o).flatMap((v) => (typeof v === 'string' ? [v] : typeof v === 'function' ? [String(v(1, 2, 'x'))] : typeof v === 'object' ? flat(v) : []));
// Una comprobación por regla (no una por texto) que nombra los culpables.
const dashed = [...flat(STRINGS_ES), ...flat(STRINGS_EN)].filter((s) => /[—–]/.test(s));
ok(!dashed.length, `sin em-dash: ${dashed.map((s) => `"${s.slice(0, 40)}"`).join(', ')}`);
const VOSEO = /(?<![\p{L}])(tenés|podés|querés|sabés|necesitás|elegís|subís|sos|vos|hacé|mirá|usá|poné|escribinos|contanos|decinos|fijate|avisanos)(?![\p{L}])/iu;
const voseo = flat(STRINGS_ES).filter((s) => VOSEO.test(s));
ok(!voseo.length, `sin voseo: ${voseo.map((s) => `"${s.slice(0, 40)}"`).join(', ')}`);
ok(VOSEO.test('Si querés, escribinos') && !VOSEO.test('Si quieres, escríbenos'), 'el detector de voseo distingue tú de vos');
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

// ── 10. Subidas: cancelar, reintentar y quitar (clase Uploads) ──
// La clase usa runas: se compila con Svelte en modo servidor (estado plano)
// y se cargan simulados fetch, la subida (put) y la preparación de fotos.
eq(cleanPage(`/es/kit/${TOK}`), '/es/kit', 'el token del kit no se guarda en los eventos');
eq(cleanPage(`/en/kit/${TOK}/`), '/en/kit/', 'ni en inglés');
eq(cleanPage('/es/kit-diseno'), '/es/kit-diseno', 'las demás rutas quedan igual');

async function loadUploads() {
  const abs = (p) => new URL(`../${p}`, import.meta.url).href;
  let code = compileModule(read('src/components/brief/lib/uploads.svelte.js'), { generate: 'server', filename: 'uploads.svelte.js' }).js.code;
  const dir = mkdtempSync(join(tmpdir(), 'brief-uploads-'));
  writeFileSync(join(dir, 'images-fake.mjs'), 'export const preparePhoto = (...a) => globalThis.__prep(...a);\n');
  code = code
    .replace(`'svelte/internal/server'`, `'${import.meta.resolve('svelte/internal/server')}'`)
    .replace(`'../../../../lib/brief-filename.mjs'`, `'${abs('lib/brief-filename.mjs')}'`)
    .replace(`'./sniff.js'`, `'${abs('src/components/brief/lib/sniff.js')}'`)
    .replace(`'./images.js'`, `'./images-fake.mjs'`)
    .replace(/import\.meta\.env\.DEV/g, 'true');
  const file = join(dir, 'uploads.mjs');
  writeFileSync(file, code);
  return import(pathToFileURL(file).href);
}

{
  const { Uploads } = await loadUploads();
  const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms = 2000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) return false; await wait(5); } return true; };
  const deferred = () => { let res; const p = new Promise((r) => { res = r; }); return { p, res }; };
  const png = (name = 'foto.png') => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(64).fill(1)])], name, { type: 'image/png' });
  const pdf = (name = 'doc.pdf') => new File([A('%PDF-1.7', 64)], name, { type: 'application/pdf' });

  // Simulados: borrador, token y subida directa.
  const puts = [];
  let holdPut = false;
  globalThis.fetch = async (url) => {
    const body = String(url).endsWith('/api/brief/draft') ? { ok: true, draftId, secret: 's3cr3t' } : { ok: true, clientToken: 'tok' };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  globalThis.window = { __briefMock: { put: (pathname, blob, opts) => new Promise((resolve, reject) => {
    puts.push(pathname);
    const done = () => resolve({ pathname });
    if (opts.abortSignal) opts.abortSignal.addEventListener('abort', () => reject(new DOMException('Abort', 'AbortError')));
    if (!holdPut) setTimeout(done, 5);
  }) } };
  const preps = [];
  globalThis.__prep = (file) => { const d = deferred(); preps.push(d); return d.p.then(() => ({ blob: file, name: 'foto.jpg', contentType: 'image/jpeg', convertedFrom: 'image/png', original: false })); };
  const consoleWarn = console.warn; console.warn = () => {};

  // a) Cancelar mientras dice "Preparando": no se sube nada.
  let u = new Uploads({ lang: 'es' });
  u.add([png()], { field: 'photo_files', kind: 'photo' });
  let row = u.files[0];
  ok(await until(() => row.status === 'preparing'), 'la foto pasa a "Preparando"');
  ok(u.busy, 'mientras prepara, el envío espera (busy)');
  u.cancel(row.id);
  preps.at(-1).res();
  await wait(40);
  eq(row.status, 'canceled', 'cancelar en "Preparando" deja la fila cancelada');
  eq(puts.length, 0, 'y el archivo NO se sube (B1-R01)');
  ok(!u.busy, 'una fila cancelada no bloquea el envío');

  // b) Reintentar tras cancelar, con la preparación vieja aún en marcha: una sola subida.
  u = new Uploads({ lang: 'es' });
  u.add([png()], { field: 'photo_files', kind: 'photo' });
  row = u.files[0];
  await until(() => row.status === 'preparing');
  const oldPrep = preps.at(-1);
  u.cancel(row.id);
  u.retry(row.id);
  await until(() => preps.at(-1) !== oldPrep);
  oldPrep.res();
  preps.at(-1).res();
  ok(await until(() => row.status === 'done'), 'reintentar tras cancelar termina la subida');
  await wait(30);
  eq(puts.length, 1, 'el mismo archivo se sube una sola vez');
  u.retry(row.id);
  await wait(20);
  eq(puts.length, 1, 'reintentar algo ya subido no hace nada');

  // c) Cancelar mientras dice "Revisando" (documento, sin preparación).
  u = new Uploads({ lang: 'es' });
  u.add([pdf()], { field: 'doc_files', kind: 'doc' });
  row = u.files[0];
  eq(row.status, 'checking', 'el documento empieza en "Revisando"');
  u.cancel(row.id);
  await wait(40);
  eq(row.status, 'canceled', 'cancelar en "Revisando" deja la fila cancelada');
  eq(puts.length, 1, 'y no se sube');

  // d) Cancelar durante la subida y reintentar: ruta nueva en el segundo intento.
  holdPut = true;
  u = new Uploads({ lang: 'es' });
  u.add([pdf()], { field: 'doc_files', kind: 'doc' });
  row = u.files[0];
  ok(await until(() => row.status === 'uploading' && puts.length === 2), 'el documento llega a "Subiendo"');
  u.cancel(row.id);
  ok(await until(() => row.status === 'canceled'), 'cancelar en "Subiendo" corta la subida');
  holdPut = false;
  u.retry(row.id);
  ok(await until(() => row.status === 'done'), 'reintentar después de cortar la subida la completa');
  eq(puts.length, 3, 'un intento nuevo, no dos');
  ok(puts[1] !== puts[2], 'cada intento usa una ruta nueva');

  // e) Quitar algo ya subido: sale de la lista y viaja con removed:true para
  //    que el servidor lo BORRE (B1-R04). El intento cortado de (d) también.
  eq(u.discarded, [puts[1]], 'el intento cortado queda apuntado para borrarlo');
  ok(u.meta().some((m) => m.pathname === row.pathname && !m.removed), 'antes de quitarlo, viaja como enviado');
  u.remove(row.id);
  eq(u.forField('doc_files').length, 0, 'lo quitado desaparece de la lista');
  eq(u.removedCount('doc_files'), 1, 'y la zona sabe cuántos quitó el cliente');
  const sent = u.meta();
  eq(sent.find((m) => m.pathname === row.pathname), { pathname: row.pathname, removed: true }, 'lo quitado viaja solo con removed:true, sin nombre ni etiquetas');
  eq(sent.find((m) => m.pathname === puts[1]), { pathname: puts[1], removed: true }, 'el intento cortado también se manda a borrar');
  ok(sent.every((m) => m.removed === true), 'nada quitado llega como archivo enviado');
  eq(u.active.length, 0, 'lo quitado no cuenta para el cupo');

  // f) Quitar algo que aún no se subió: desaparece del todo.
  u.add([png()], { field: 'photo_files', kind: 'photo' });
  row = u.files.at(-1);
  await until(() => row.status === 'preparing');
  u.remove(row.id);
  preps.at(-1).res();
  await wait(40);
  ok(!u.files.some((f) => f.id === row.id), 'quitar en "Preparando" borra la fila');
  eq(puts.length, 3, 'y no se sube');

  // g) Foto que el navegador no pudo convertir: NO se sube el original (B1-R02).
  for (const [purpose, heic] of [['brief', true], ['brief', false], ['kit', true]]) {
    const before = puts.length;
    globalThis.__prep = async () => ({ failed: true, heic });
    u = new Uploads({ lang: 'es', purpose });
    u.add([png(heic ? 'IMG_0001.HEIC' : 'rara.png')], { field: 'photo_files', kind: 'photo' });
    row = u.files[0];
    ok(await until(() => row.status === 'error'), `${purpose}/${heic ? 'HEIC' : 'otra'}: la fila queda en error`);
    eq(puts.length, before, `${purpose}/${heic ? 'HEIC' : 'otra'}: el original no se sube`);
    ok(!row.retryable, 'reintentar no tiene sentido: se ofrece otra vía');
    ok(/no subimos el original/.test(row.error) && /ubicación/.test(row.error), 'explica por qué no se subió');
    ok(/captura de pantalla/.test(row.error), 'ofrece la captura de pantalla');
    eq(/Fotos/.test(row.error), heic, 'a un HEIC le dice que la elija desde Fotos del iPhone');
    eq(/kit de arranque/.test(row.error), purpose === 'brief', 'en el brief ofrece mandarla en el kit; en el kit, no');
    ok(!u.meta().length, 'nada que enviar');
  }
  u = new Uploads({ lang: 'en' });
  u.add([png('IMG_0002.HEIC')], { field: 'photo_files', kind: 'photo' });
  row = u.files[0];
  await until(() => row.status === 'error');
  ok(/do not upload the original/.test(row.error) && /screenshot/.test(row.error), 'mismo aviso en inglés');

  console.warn = consoleWarn;
  delete globalThis.window;
}

console.log(`\ntest:brief-form · ${pass} OK · ${fail} fallos`);
if (fail) process.exit(1);
