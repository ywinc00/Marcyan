// Pruebas de la capa de medición del diagnóstico (sin red: fetch simulado).
import assert from 'node:assert/strict';
import { judge } from '../lib/diagnostic-rubric.mjs';
import { normalizeSiteUrl, baseDomain, parsePsi, pickPlace, parsePlace, measurePageSpeed, measurePlace, measureBusiness, PLACES_FIELDS } from '../lib/diagnostic-measure.mjs';

let n = 0;
const fails = [];
async function check(name, fn) {
  try { await fn(); n++; } catch (e) { fails.push(name + ': ' + e.message); }
}
const fakeFetch = (status, body, spy) => async (url, init) => { if (spy) spy.push({ url, init }); return { status, json: async () => body }; };

const PSI = {
  lighthouseResult: {
    finalDisplayedUrl: 'https://ejemplo.com/',
    categories: { performance: { score: 0.42 }, seo: { score: 0.83 }, accessibility: { score: 0.9 }, 'best-practices': { score: 1 } },
    audits: {
      'largest-contentful-paint': { numericValue: 6340 }, 'total-blocking-time': { numericValue: 812.4 },
      'cumulative-layout-shift': { numericValue: 0.213 }, 'total-byte-weight': { numericValue: 4_200_000 },
      'document-title': { score: 1 }, 'meta-description': { score: 0 }, 'image-alt': { score: 0.5 }, 'canonical': { score: null },
    },
  },
  originLoadingExperience: { overall_category: 'SLOW', metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 4100 }, INTERACTION_TO_NEXT_PAINT: { percentile: 380 }, CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 21 } } },
};

await check('normaliza URL y añade https', () => assert.equal(normalizeSiteUrl('ejemplo.com/inicio#x'), 'https://ejemplo.com/inicio'));
await check('rechaza URL interna o con credenciales', () => {
  for (const u of ['localhost', 'http://127.0.0.1', 'https://a:b@ejemplo.com', 'ftp://ejemplo.com', 'sinpunto', '']) assert.equal(normalizeSiteUrl(u), null, u);
});
await check('dominio base sin www', () => assert.equal(baseDomain('https://www.Ejemplo.com/x'), 'ejemplo.com'));
await check('PSI: puntuaciones, laboratorio y usuarios reales del dominio', () => {
  const r = parsePsi(PSI);
  assert.equal(r.ok, true);
  assert.deepEqual(r.puntuacion, { rendimiento: 42, seo: 83, accesibilidad: 90, buenas_practicas: 100 });
  assert.deepEqual(r.laboratorio, { lcp_s: 6.3, tbt_ms: 812, cls: 0.21, peso_kb: 4102 });
  assert.deepEqual(r.usuarios_reales, { ambito: 'dominio', lcp_s: 4.1, inp_ms: 380, cls: 0.21, veredicto: 'SLOW' });
});
await check('PSI: auditoría sin puntuación no cuenta como fallo', () => {
  const r = parsePsi(PSI);
  assert.equal('canonical' in r.seo_tecnico, false);
  assert.equal(r.seo_tecnico['meta-description'], false);
  assert.equal(r.seo_tecnico['image-alt'], false);
  assert.equal(r.seo_tecnico['document-title'], true);
});
await check('PSI: respuesta rota = no medido, no inventa', () => assert.deepEqual(parsePsi({}), { ok: false, motivo: 'respuesta-incompleta' }));
await check('PSI: web que no abre se reporta como tal', async () => {
  const r = await measurePageSpeed('ejemplo.com', { fetch: fakeFetch(400, { error: { message: 'Lighthouse returned error: FAILED_DOCUMENT_REQUEST' } }) });
  assert.deepEqual(r, { ok: false, motivo: 'web-no-abre' });
});
await check('PSI: pide móvil y las 4 categorías', async () => {
  const spy = [];
  await measurePageSpeed('ejemplo.com', { key: 'k', fetch: fakeFetch(200, PSI, spy) });
  const q = new URL(spy[0].url).searchParams;
  assert.equal(q.get('strategy'), 'mobile');
  assert.deepEqual(q.getAll('category').sort(), ['accessibility', 'best-practices', 'performance', 'seo']);
});
await check('PSI: URL inválida no llama a Google', async () => {
  const spy = [];
  assert.equal((await measurePageSpeed('localhost', { fetch: fakeFetch(200, PSI, spy) })).motivo, 'url-invalida');
  assert.equal(spy.length, 0);
});

const P1 = { id: 'a', displayName: { text: 'Otra Empresa' }, websiteUri: 'https://otra.com' };
const P2 = { id: 'b', displayName: { text: 'Techos Pérez LLC' }, websiteUri: 'https://www.techosperez.com/es', rating: 4.7, userRatingCount: 23, primaryTypeDisplayName: { text: 'Contratista de techos' }, nationalPhoneNumber: '(713) 000-0000', businessStatus: 'OPERATIONAL', regularOpeningHours: { weekdayDescriptions: ['lunes: 8–17'] } };
await check('ficha: la que enlaza la web del cliente gana con confianza alta', () => {
  const r = pickPlace([P1, P2], { siteUrl: 'techosperez.com', name: 'cualquiera' });
  assert.equal(r.place.id, 'b'); assert.equal(r.confianza, 'alta');
});
await check('ficha: por nombre sin acentos', () => {
  const r = pickPlace([P1, P2], { name: 'techos perez' });
  assert.equal(r.place.id, 'b'); assert.equal(r.confianza, 'alta');
});
await check('ficha: sin coincidencia = confianza baja (se confirma con el cliente)', () => assert.equal(pickPlace([P1], { name: 'Nada Que Ver' }).confianza, 'baja'));
await check('ficha: campos simples, sin teléfono expuesto', () => {
  const f = parsePlace(P2);
  assert.deepEqual(f, { id: 'b', nombre: 'Techos Pérez LLC', nota: 4.7, resenas: 23, categoria: 'Contratista de techos', web: 'https://www.techosperez.com/es', tiene_telefono: true, tiene_horario: true, estado: 'OPERATIONAL', mapa: null });
});
await check('ficha: incluye negocios sin dirección visible y pide solo los campos listados', async () => {
  const spy = [];
  await measurePlace({ name: 'Techos Pérez', city: 'Houston' }, { key: 'k', fetch: fakeFetch(200, { places: [P2] }, spy) });
  const body = JSON.parse(spy[0].init.body);
  assert.equal(body.includePureServiceAreaBusinesses, true);
  assert.equal(spy[0].init.headers['X-Goog-FieldMask'], PLACES_FIELDS);
});
await check('ficha: sin clave no llama', async () => assert.deepEqual(await measurePlace({ name: 'x' }, { fetch: fakeFetch(200, {}) }), { ok: false, motivo: 'sin-clave' }));
await check('ficha: sin resultados = encontrada false', async () => assert.deepEqual(await measurePlace({ name: 'x', city: 'y' }, { key: 'k', fetch: fakeFetch(200, {}) }), { ok: true, encontrada: false }));
await check('todo: una fuente caída no tumba la otra', async () => {
  const f = async (url) => (String(url).includes('pagespeed') ? { status: 500, json: async () => ({}) } : { status: 200, json: async () => ({ places: [P2] }) });
  const r = await measureBusiness({ url: 'techosperez.com', name: 'Techos Pérez', city: 'Houston' }, { key: 'k', fetch: f });
  assert.equal(r.web.ok, false); assert.equal(r.ficha.ficha.resenas, 23);
});

await check('criterio: web lenta por usuarios reales, con la cifra como prueba', () => {
  const r = judge({ web: parsePsi(PSI), ficha: { ok: true, encontrada: true, confianza: 'alta', ficha: parsePlace(P2) } });
  const lenta = r.hallazgos.find((h) => h.id === 'web_algo_lenta' || h.id === 'web_lenta');
  assert.equal(lenta.id, 'web_lenta'); assert.equal(lenta.prueba.carga_s, 4.1); assert.equal(lenta.prueba.fuente, 'usuarios_reales_dominio');
  assert.ok(r.hallazgos.find((h) => h.id === 'sin_descripcion'));
  assert.ok(r.fortalezas.includes('resenas_suficientes') && r.fortalezas.includes('buena_nota'));
});
await check('criterio: graves primero', () => {
  const r = judge({ web: parsePsi(PSI), ficha: { ok: true, encontrada: true, confianza: 'alta', ficha: { ...parsePlace(P2), resenas: 0, nota: null } } });
  assert.equal(r.hallazgos[0].gravedad, 'grave');
  const rank = { grave: 0, media: 1, leve: 2 };
  const g = r.hallazgos.map((h) => rank[h.gravedad]);
  assert.deepEqual(g, [...g].sort((x, y) => x - y));
});
await check('criterio: lo que no se midió no se inventa', () => {
  const r = judge({ web: { ok: false, motivo: 'tiempo' }, ficha: { ok: false, motivo: 'cupo' } });
  assert.deepEqual(r, { hallazgos: [], sin_medir: ['web', 'ficha'], fortalezas: [] });
});
await check('criterio: ficha dudosa no genera hallazgos de reseñas', () => {
  const r = judge({ web: { ok: false, motivo: 'sin-web' }, ficha: { ok: true, encontrada: true, confianza: 'baja', ficha: { ...parsePlace(P2), resenas: 0 } } });
  assert.deepEqual(r.hallazgos.map((h) => h.id), ['sin_web']); assert.ok(r.sin_medir.includes('ficha_por_confirmar'));
});

if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`✓ ${n} pruebas de la medición del diagnóstico pasaron.`);
