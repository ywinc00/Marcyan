// ════════════════════════════════════════════════════════════════
//  scripts/test-diagnostic.mjs  ·  npm run test:diag
//  Pruebas del motor del diagnóstico (lib/diagnostic-checks.mjs), SIN red.
//  Nacen de la calibración contra sitios reales (2026-08-18): el motor daba
//  falsos negativos ("no tiene formulario" contra movejunkaway.com, "CTA no
//  aparece pronto" contra marcyanstudio.com) y un hallazgo inventado de
//  reseñas cuando el dato no se declaró ('ns').
// ════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import { analyzeSite, findContactHref, mergeContactSignals, recommendService } from '../lib/diagnostic-checks.mjs';

let pass = 0;
const fails = [];
function check(name, fn) {
  try { fn(); pass++; } catch (e) { fails.push(name + ' → ' + e.message); }
}

// ── Fixtures compactos ───────────────────────────────────────────
const BASE = (body, head = '') => `<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Negocio de Prueba en Houston TX</title><meta name="description" content="${'x'.repeat(80)}">${head}</head><body>${body}</body></html>`;
const run = (html, extra = {}) => analyzeSite({ html, https: true, hasSite: true, city: 'Houston', reviewsBucket: 'ns', ...extra });

// ── C3: detección de formulario ──────────────────────────────────
check('C3 pass: etiqueta <form>', () => {
  assert.equal(run(BASE('<form action="/x"><input type="text"></form>')).checks.C3, 'pass');
});
check('C3 pass: input type=email SIN <form> (form renderizado por JS)', () => {
  assert.equal(run(BASE('<div class="contact"><input type="email" placeholder="tu correo"></div>')).checks.C3, 'pass');
});
check('C3 pass: widget embebido conocido (jotform)', () => {
  assert.equal(run(BASE('<iframe src="https://form.jotform.com/123"></iframe>')).checks.C3, 'pass');
});
check('C3 pass: widget embebido conocido (leadconnector, común en home services)', () => {
  assert.equal(run(BASE('<iframe src="https://api.leadconnectorhq.com/widget/form/abc"></iframe>')).checks.C3, 'pass');
});
check('C3 partial (NO fail): sin form pero con mailto — hay cómo escribirle', () => {
  const r = run(BASE('<a href="mailto:info@negocio.com">Escríbenos</a>'));
  assert.equal(r.checks.C3, 'partial');
  assert.ok(!r.findings.some((f) => f.id === 'C3'), 'partial no debe emitir hallazgo');
});
check('C3 fail: sin ningún canal escrito', () => {
  assert.equal(run(BASE('<p>Llámanos al <a href="tel:+17131234567">713-123-4567</a></p>')).checks.C3, 'fail');
});

// ── C4: CTA temprano sobre HTML VISIBLE (sin script/style/svg) ───
check('C4 pass: tel: en el header aunque haya 100KB de CSS/SVG inline antes', () => {
  const noise = `<style>${'x'.repeat(100_000)}</style><svg>${'y'.repeat(50_000)}</svg>`;
  const html = BASE(`<header><a href="tel:+17131234567">Llámanos</a></header><main>${'z'.repeat(30_000)}</main>`, noise);
  assert.equal(run(html).checks.C4, 'pass');
});
check('C4 pass: CTA ancla a #contacto en el nav (patrón marcyanstudio)', () => {
  assert.equal(run(BASE('<nav><a href="#contacto">Propuesta gratis</a></nav>' + 'x'.repeat(5000))).checks.C4, 'pass');
});
check('C4 pass: link temprano a /contact', () => {
  assert.equal(run(BASE('<nav><a href="/contact">Contact us</a></nav>' + 'x'.repeat(5000))).checks.C4, 'pass');
});
check('C4 fail: primer canal de contacto al final de una página larga', () => {
  const html = BASE('<main>' + '<p>texto relleno de la página</p>'.repeat(400) + '</main><footer><a href="tel:+17131234567">tel</a></footer>');
  assert.equal(run(html).checks.C4, 'fail');
});

// ── S3: schema de negocio ────────────────────────────────────────
check('S3 pass: subtipo no listado explícito (MovingCompany) vía sufijo', () => {
  const html = BASE('<p>hola</p>', '<script type="application/ld+json">{"@type":"MovingCompany","name":"X"}</script>');
  assert.equal(run(html).checks.S3, 'pass');
});
check('S3 pass: JSON-LD con telephone+address aunque el @type sea raro', () => {
  const html = BASE('<p>hola</p>', '<script type="application/ld+json">{"@type":"Cosa","telephone":"+1713","address":{"@type":"PostalAddress"}}</script>');
  assert.equal(run(html).checks.S3, 'pass');
});
check('S3 partial: JSON-LD sin señales de negocio', () => {
  const html = BASE('<p>hola</p>', '<script type="application/ld+json">{"@type":"WebSite"}</script>');
  assert.equal(run(html).checks.S3, 'partial');
});
check('S3 fail: sin JSON-LD', () => {
  assert.equal(run(BASE('<p>hola</p>')).checks.S3, 'fail');
});

// ── A4: resumen inicial ──────────────────────────────────────────
check('A4 pass: el 2º párrafo es el bueno (el 1º es un banner de cookies)', () => {
  const html = BASE(`<p>Aceptar cookies</p><p>${'Texto de presentación del negocio con sustancia real. '.repeat(4)}</p>`);
  assert.equal(run(html).checks.A4, 'pass');
});
check('A4 partial (NO fail): sin <p> útiles pero con meta desc y texto real (builder con divs)', () => {
  const html = BASE(`<div>${'Contenido real del negocio maquetado con divs. '.repeat(60)}</div>`);
  const r = run(html);
  assert.equal(r.checks.A4, 'partial');
  assert.ok(!r.findings.some((f) => f.id === 'A4'));
});
check('A4 fail: página vacía de texto', () => {
  const html = '<!doctype html><html><head><title>Negocio de Prueba en Houston</title></head><body><div>corto</div></body></html>';
  assert.equal(analyzeSite({ html, https: true, hasSite: true, city: '', reviewsBucket: 'ns' }).checks.A4, 'fail');
});

// ── R1: reseñas no declaradas ('ns') no inventan hallazgo ────────
check("R1 'ns' → partial (score 50), SIN hallazgo inventado", () => {
  const r = run(BASE('<p>hola mundo desde houston</p>'));
  assert.equal(r.checks.R1, 'partial');
  assert.equal(r.scores.rep, 50);
  assert.ok(!r.findings.some((f) => f.id === 'R1'));
});
check("R1 '0' declarado por el dueño → fail CON hallazgo (honesto)", () => {
  const r = run(BASE('<p>hola</p>'), { reviewsBucket: '0' });
  assert.equal(r.checks.R1, 'fail');
  assert.ok(r.findings.some((f) => f.id === 'R1'));
});
check("R1 'ns' ya no arrastra la recomendación hacia reseñas sin evidencia", () => {
  // Sitio con conv débil y reseñas no declaradas: la debilidad REAL (conv) debe
  // ganar el desempate, no rep=0 fabricado (caso real: texasrushremove.com).
  const r = run(BASE('<main>' + '<p>relleno</p>'.repeat(300) + '</main>'));
  const rec = recommendService({ scores: r.scores, industry: 'otro' });
  assert.notEqual(rec.key, 'rep');
});

// ── findContactHref ──────────────────────────────────────────────
check('encuentra /contact', () => {
  assert.equal(findContactHref('<a href="/about">x</a><a href="/contact">y</a>'), '/contact');
});
check('encuentra /es/contacto con query', () => {
  assert.equal(findContactHref('<a href="/es/contacto?utm=1">y</a>'), '/es/contacto?utm=1');
});
check('ignora anclas #, mailto:, tel: y externos', () => {
  assert.equal(findContactHref('<a href="#contacto">a</a><a href="mailto:x@y.com">b</a><a href="tel:123">c</a><a href="https://otro.com/contact">d</a>'), null);
});
check('sin página de contacto → null', () => {
  assert.equal(findContactHref('<a href="/servicios">a</a>'), null);
});

// ── mergeContactSignals ──────────────────────────────────────────
check('merge: form en /contacto sube C3 fail→pass y recalcula conv/total', () => {
  const home = run(BASE('<p>solo texto, cero canales aqui</p><a href="tel:+17131234567">tel</a>'));
  assert.equal(home.checks.C3, 'fail');
  const merged = mergeContactSignals(home, '<form><input type="email"></form>');
  assert.equal(merged.checks.C3, 'pass');
  assert.ok(merged.scores.conv > home.scores.conv);
  assert.ok(merged.scores.total >= home.scores.total);
  assert.ok(!merged.findings.some((f) => f.id === 'C3'));
});
check('merge: solo MEJORA, nunca degrada', () => {
  const home = run(BASE('<form></form><a href="tel:+17131234567">t</a><a href="https://wa.me/1">w</a>'));
  const merged = mergeContactSignals(home, '<p>página de contacto vacía</p>');
  assert.deepEqual(merged.checks, home.checks);
});
check('merge: entrada inválida devuelve el resultado original', () => {
  const home = run(BASE('<p>x</p>'));
  assert.equal(mergeContactSignals(home, null), home);
  assert.equal(mergeContactSignals(null, '<form>'), null);
});
check('merge: los checks NO tocados se conservan tal cual', () => {
  const home = run(BASE('<p>sin canales</p>'));
  const merged = mergeContactSignals(home, '<form><input type="tel"></form>');
  for (const k of ['W1', 'W2', 'W3', 'W4', 'W5', 'S2', 'S3', 'S4', 'S5', 'A1', 'A2', 'A3', 'A4', 'R1']) {
    assert.equal(merged.checks[k], home.checks[k], k);
  }
});

// ── Regresión: comportamiento base intacto ───────────────────────
check('sin sitio → W1 fail y web 0 (igual que antes)', () => {
  const r = analyzeSite({ html: '', https: false, hasSite: false, city: '', reviewsBucket: 'ns' });
  assert.equal(r.checks.W1, 'fail');
  assert.equal(r.scores.web, 0);
});
check('sitio sano → sin hallazgos fail relevantes', () => {
  const html = BASE(
    '<header><a href="tel:+17131234567">Llámanos</a><a href="https://wa.me/17131234567">WA</a></header>' +
    `<h1>Negocio en Houston</h1><p>${'Somos un negocio de Houston con años de experiencia sirviendo a la comunidad. '.repeat(3)}</p>` +
    '<h2>¿Cuánto cuesta?</h2><form><input type="email"></form>' +
    '<a href="/servicios">s</a><a href="/precios">p</a><a href="/nosotros">n</a><img src="x.jpg" alt="foto">',
    '<script type="application/ld+json">{"@type":"LocalBusiness","telephone":"+1713","address":"x"}</script>'
  );
  const r = run(html);
  assert.equal(r.findings.length, 0, JSON.stringify(r.findings.map((f) => f.id)));
});

if (fails.length) {
  console.error(`✗ ${fails.length} prueba(s) del diagnóstico fallaron:\n - ` + fails.join('\n - '));
  process.exit(1);
}
console.log(`✓ ${pass} pruebas del motor del diagnóstico pasaron.`);
