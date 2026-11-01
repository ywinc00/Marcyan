// Movimiento de las secciones: revelado de una vez, viñetas de servicios, panel de proyectos,
// cifras que suben, mapa del área. Todo respeta "reducir movimiento".
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // iconos Lucide (familia única del sitio)
  $$('[data-ic]').forEach((el) => { const b = window.LUCIDE && LUCIDE[el.dataset.ic]; if (b) el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${b}</svg>`; });

  // ── revelado al llegar, una sola vez ──
  $$('.svc__col').forEach((c, i) => c.style.setProperty('--i', i));
  $$('[data-rev-list]').forEach((ul) => $$(':scope>li', ul).forEach((li, i) => (li.style.transitionDelay = Math.min(i, 6) * 45 + 'ms')));
  const revIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revIO.unobserve(e.target); } }),
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
  $$('[data-rev],[data-rev-list]').forEach((el) => (reduce ? el.classList.add('in') : revIO.observe(el)));

  // ── viñetas de servicios: se cuentan una vez al llegar; al pasar el ratón por la tarjeta, otra vez ──
  const runs = new WeakMap();
  async function playSearch(v, id) {
    const q = $('.vf-q', v), text = q.dataset.q;
    v.classList.remove('st1', 'st2'); q.textContent = ''; v.classList.add('typing');
    await wait(350);
    for (let i = 1; i <= text.length; i++) { if (runs.get(v) !== id) return; q.textContent = text.slice(0, i); await wait(34 + (text[i - 1] === ' ' ? 40 : 0)); }
    await wait(260); if (runs.get(v) !== id) return;
    v.classList.remove('typing'); v.classList.add('st1');
    await wait(520); if (runs.get(v) !== id) return;
    v.classList.add('st2');
  }
  async function playWeb(v, id) {
    v.classList.remove('st1', 'st2', 'en');
    await wait(250); if (runs.get(v) !== id) return;
    v.classList.add('st1');
    await wait(650); if (runs.get(v) !== id) return;
    v.classList.add('st2');
    await wait(1500); if (runs.get(v) !== id) return;
    v.classList.add('en');
    await wait(1700); if (runs.get(v) !== id) return;
    v.classList.remove('en');
  }
  async function playChat(v, id) {
    const parts = $$('.vc>*', v); parts.forEach((p) => p.classList.remove('show'));
    const [ts, me, dots, bot, me2, ok] = parts;
    const show = async (el, ms) => { await wait(ms); if (runs.get(v) !== id) throw 0; el.classList.add('show'); };
    try {
      await show(ts, 150); await show(me, 350); await show(dots, 500);
      await wait(1100); if (runs.get(v) !== id) return; dots.classList.remove('show');
      await show(bot, 0); await show(me2, 1000); await show(ok, 700);
    } catch (e) { /* otra reproducción tomó el relevo */ }
  }
  const PLAY = { search: playSearch, web: playWeb, chat: playChat };
  function finalState(v) {
    const k = v.dataset.vig;
    if (k === 'search') { $('.vf-q', v).textContent = $('.vf-q', v).dataset.q; v.classList.add('st1', 'st2'); }
    if (k === 'web') v.classList.add('st1', 'st2');
    if (k === 'chat') $$('.vc>*', v).forEach((p) => { if (!p.classList.contains('dots')) p.classList.add('show'); });
  }
  function play(v) {
    const id = (runs.get(v) || 0) + 1; runs.set(v, id); v.dataset.busy = '1';
    PLAY[v.dataset.vig](v, id).finally(() => { if (runs.get(v) === id) v.dataset.busy = ''; });
  }
  const vigs = $$('.vig[data-vig]');
  if (reduce) vigs.forEach(finalState);
  else {
    // antes de entrar, en blanco (sin cambiar alturas)
    vigs.forEach((v) => { if (v.dataset.vig === 'search') $('.vf-q', v).textContent = ''; });
    const vIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { play(e.target); vIO.unobserve(e.target); } }), { threshold: 0.6 });
    vigs.forEach((v) => {
      vIO.observe(v);
      const card = v.closest('.svc__col');
      const again = () => { if (!v.dataset.busy && v.dataset.played) play(v); };
      card.addEventListener('mouseenter', again); card.addEventListener('focusin', again);
      v.addEventListener('animationstart', () => {}, { once: true });
    });
    // se marca "ya contada" tras la primera vez, para que el ratón no la repita mientras corre
    const mark = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setTimeout(() => (e.target.dataset.played = '1'), 400); mark.unobserve(e.target); } }), { threshold: 0.6 });
    vigs.forEach((v) => mark.observe(v));
  }

  // ── proyectos: el paso cuyo centro cruza el centro de la pantalla manda en el panel ──
  const stage = $('.pf__stage'), steps = $$('.pf__step');
  if (stage && steps.length) {
    const scr = $$('.pf__screen img', stage), ph = $$('.pf__pscreen img', stage);
    const nameEl = $('.pf__url b', stage), names = nameEl.dataset.names.split('|'), countEl = $('.pf__count b', stage);
    let cur = 0, timer;
    function go(i) {
      if (i === cur) return;
      stage.dataset.dir = i > cur ? 'down' : 'up';
      [scr, ph].forEach((set) => set.forEach((img, k) => {
        img.classList.remove('was');
        if (k === cur) { img.classList.remove('is-on'); img.classList.add('was'); }
        if (k === i) { img.classList.add('is-on'); }
        if (k !== i && k !== cur) img.classList.remove('is-on');
      }));
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      nameEl.style.opacity = 0;
      setTimeout(() => { nameEl.textContent = names[i]; nameEl.style.opacity = 1; }, 200);
      countEl.textContent = String(i + 1).padStart(2, '0');
      clearTimeout(timer); timer = setTimeout(() => $$('img.was', stage).forEach((im) => im.classList.remove('was')), 1100);
      cur = i;
    }
    const sIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) go(+e.target.dataset.i); }), { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => sIO.observe(s));
    // precargar las capturas del panel en cuanto la sección se acerca
    const pre = new IntersectionObserver((es) => { if (es[0].isIntersecting) { $$('img', stage).forEach((im) => (im.loading = 'eager')); pre.disconnect(); } }, { rootMargin: '600px 0px' });
    pre.observe(stage);
  }

  // ── cifras que suben (solo datos reales o la demo marcada como EJEMPLO) ──
  function count(el) {
    const to = +el.dataset.count; if (reduce) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1100;
    const f = (now) => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e); if (p < 1) requestAnimationFrame(f); };
    el.textContent = '0'; requestAnimationFrame(f);
  }
  const cIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const box = e.target; box.classList.add('in');
    $$('[data-count]', box).forEach(count); cIO.unobserve(box);
  }), { threshold: 0.4 });
  ['[data-demo]', '.answer__figs'].forEach((s) => { const el = $(s); if (!el) return; if (reduce) el.classList.add('in'); else { $$('[data-count]', el).forEach((n) => (n.textContent = '0')); cIO.observe(el); } });

  // ── mapa del área: el bronce del final del acercamiento, ya en plano ──
  const box = $('#metroBox'), cv = $('#metro'), plate = $('#metroPlate');
  if (box && cv && window.d3 && window.GEO) {
    const land = { type: 'MultiPolygon', coordinates: GEO.tx10 };
    const ZONES = [
      { n: 'Houston', at: [-95.369, 29.760], hq: true },
      { n: 'Katy', at: [-95.824, 29.786], href: '/es/houston/katy' },
      { n: 'Sugar Land', at: [-95.635, 29.620], href: '/es/houston/sugar-land' },
      { n: 'The Woodlands', at: [-95.489, 30.166] },
      { n: 'Pearland', at: [-95.286, 29.564] },
      { n: 'Pasadena', at: [-95.209, 29.691] },
    ];
    const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    function drawMap() {
      const W = plate.clientWidth, H = plate.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr;
      const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const kmpx = Math.min((W - 80) / 92, (H - 120) / 76);
      const proj = d3.geoOrthographic().rotate([95.48, -29.86]).scale(6371 * kmpx).translate([W * 0.5, H * 0.47]).clipAngle(90);
      const path = d3.geoPath(proj, c);
      const sea = c.createRadialGradient(W * 0.75, H * 0.8, 10, W * 0.75, H * 0.8, W * 0.8);
      sea.addColorStop(0, '#12100c'); sea.addColorStop(1, '#070605');
      c.fillStyle = sea; c.fillRect(0, 0, W, H);
      const g = c.createRadialGradient(W * 0.3, H * 0.25, 10, W * 0.45, H * 0.45, W * 0.9);
      g.addColorStop(0, '#8a6c3f'); g.addColorStop(0.6, '#6a5232'); g.addColorStop(1, '#4a3a24');
      c.fillStyle = g; c.beginPath(); path(land); c.fill();
      const p = document.createElement('canvas'); p.width = p.height = Math.round(6 * dpr);
      const pc = p.getContext('2d'); pc.fillStyle = 'rgba(8,7,5,.22)'; pc.beginPath(); pc.arc(p.width / 2, p.height / 2, 0.9 * dpr, 0, Math.PI * 2); pc.fill();
      const pat = c.createPattern(p, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / dpr));
      c.save(); c.beginPath(); path(land); c.clip(); c.fillStyle = pat; c.fillRect(0, 0, W, H); c.restore();
      c.strokeStyle = 'rgba(232,214,174,.6)'; c.lineWidth = 1; c.beginPath(); path(land); c.stroke();
      const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(9,8,7,0)'); v.addColorStop(1, 'rgba(9,8,7,.85)');
      c.fillStyle = v; c.fillRect(0, 0, W, H);
      $$('.mp', plate).forEach((e) => e.remove());
      ZONES.forEach((z, i) => {
        const [x, y] = proj(z.at);
        const el = document.createElement('div'); el.className = 'mp' + (z.hq ? ' mp--hq' : '');
        el.style.left = x + 'px'; el.style.top = (y - 13) + 'px'; el.style.setProperty('--d', (z.hq ? 0 : 0.15 + i * 0.09) + 's');
        el.innerHTML = (z.href ? `<a href="${z.href}">${z.n}${arrow}</a>` : `<span>${z.n}</span>`) + '<i></i>';
        plate.appendChild(el);
      });
    }
    drawMap();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawMap, 120); });
    const mIO = new IntersectionObserver((es) => { if (es[0].isIntersecting) { box.classList.add('on'); mIO.disconnect(); } }, { threshold: 0.45 });
    reduce ? box.classList.add('on') : mIO.observe(box);
    // parallax suave del mapa dentro de su marco
    if (!reduce) {
      let ticking = false;
      const par = () => { ticking = false; const r = box.getBoundingClientRect(); const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; plate.style.transform = `translate3d(0,${(-k * 26).toFixed(1)}px,0)`; };
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true }); par();
    }
  }

  // el formulario es de muestra: no envía nada
  const form = $('#form'); if (form) form.addEventListener('submit', (e) => e.preventDefault());
})();
