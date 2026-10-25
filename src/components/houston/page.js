import { geoOrthographic, geoPath } from 'd3-geo';
// Movimiento de las secciones: revelado de una vez, viñetas de servicios, panel de proyectos,
// cifras que suben, mapa del área. Todo respeta "reducir movimiento".
export function initSections(loadGeo) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));


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
    for (let i = 1; i <= text.length; i++) { if (runs.get(v) !== id) return; q.textContent = text.slice(0, i); await wait(26 + (text[i - 1] === ' ' ? 30 : 0)); }
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
    let tk = false;
    const fade = () => {
      tk = false;
      if (innerWidth < 1024 || reduce) { steps.forEach((st) => (st.style.opacity = '')); return; }
      const vh = innerHeight;
      steps.forEach((st) => {
        const r = st.getBoundingClientRect(), dd = Math.abs(r.top + r.height / 2 - vh / 2) / vh;
        const t = Math.min(1, Math.max(0, (dd - 0.3) / 0.22)), e = t * t * (3 - 2 * t);
        st.style.opacity = (1 - 0.74 * e).toFixed(3);
      });
    };
    addEventListener('scroll', () => { if (!tk) { tk = true; requestAnimationFrame(fade); } }, { passive: true });
    addEventListener('resize', fade); fade();
    steps.forEach((s) => sIO.observe(s));
    // precargar las capturas del panel en cuanto la sección se acerca
    const pre = new IntersectionObserver((es) => { if (es[0].isIntersecting) { $$('img', stage).forEach((im) => (im.loading = 'eager')); pre.disconnect(); } }, { rootMargin: '600px 0px' });
    pre.observe(stage);
  }

  // ── proyectos en el teléfono: sin panel fijo, el teléfono de cada maqueta se desliza un poco contra el portátil ──
  const minis = $$('.pf__mini');
  if (minis.length && !reduce) {
    let tk2 = false;
    const slide = () => {
      tk2 = false;
      if (innerWidth >= 1024) return;
      const vh = innerHeight;
      minis.forEach((m) => {
        const r = m.getBoundingClientRect(); if (r.bottom < -80 || r.top > vh + 80) return;
        const k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2)));
        const ph = m.querySelector('.pf__mph'); if (ph) ph.style.transform = `translate3d(0,${(k * 22).toFixed(1)}px,0)`;
      });
    };
    addEventListener('scroll', () => { if (!tk2) { tk2 = true; requestAnimationFrame(slide); } }, { passive: true });
    slide();
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

  // ── mapa del área: el mismo gesto aprobado del planeta de la portada, a escala de la ciudad ──
  // empieza lejos, con la costa en puntos dorados; se acerca a Houston y los puntos crecen y se funden en bronce;
  // al terminar, las zonas hacen su pulso una sola vez. La lista de zonas debajo enlaza a sus páginas.
  const box = $('#hx-map'), cv = $('#hx-map-cv'), plate = $('#hx-map-plate');
  if (box && cv) loadGeo().then((GEO) => {
    const land = { type: 'MultiPolygon', coordinates: GEO.tx10 };
    const HOU = [-95.369, 29.760], FIN = [-95.48, 29.86], GOLD = '#dcc089';
    const AT = { 'Houston': HOU, 'Katy': [-95.824, 29.786], 'Sugar Land': [-95.635, 29.620], 'The Woodlands': [-95.489, 30.166], 'Pearland': [-95.286, 29.564], 'Pasadena': [-95.209, 29.691] };
    const ZONES = JSON.parse(box.dataset.zones || '[]').map((z) => Object.assign({ at: AT[z.n] }, z)).filter((z) => z.at);
    const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    // Houston estilizada (comprobada contra el mapa de OpenStreetMap): Loop 610, Beltway 8, Grand Parkway y las radiales
    const L610 = [[-95.4555,29.8095],[-95.41,29.811],[-95.388,29.809],[-95.35,29.8095],[-95.317,29.8105],[-95.29,29.803],[-95.2745,29.788],[-95.2725,29.7705],[-95.269,29.74],[-95.2627,29.714],[-95.27,29.696],[-95.295,29.688],[-95.348,29.686],[-95.388,29.685],[-95.435,29.685],[-95.454,29.693],[-95.4565,29.7306],[-95.456,29.76],[-95.4555,29.7845],[-95.4555,29.8095]];
    const BW8 = [[-95.5594,29.7848],[-95.559,29.83],[-95.553,29.88],[-95.53,29.91],[-95.49,29.93],[-95.4106,29.9376],[-95.35,29.944],[-95.306,29.948],[-95.26,29.942],[-95.215,29.92],[-95.19,29.88],[-95.1737,29.7905],[-95.1706,29.7036],[-95.18,29.64],[-95.22,29.605],[-95.29,29.596],[-95.3888,29.5965],[-95.46,29.605],[-95.53,29.64],[-95.5565,29.6985],[-95.56,29.74],[-95.5594,29.7848]];
    const GP99 = [[-95.41,29.518],[-95.56,29.55],[-95.723,29.59],[-95.78,29.69],[-95.8015,29.7838],[-95.79,29.89],[-95.733,29.989],[-95.65,30.07],[-95.55,30.11],[-95.438,30.1195],[-95.33,30.12],[-95.26,30.114],[-95.15,30.07],[-95.05,29.95],[-94.977,29.815]];
    const RADIALS = [
      [[-95.95,29.79],[-95.8015,29.7838],[-95.65,29.784],[-95.5594,29.7848],[-95.4555,29.7845],[-95.39,29.778],[-95.365,29.77],[-95.33,29.773],[-95.2725,29.7705],[-95.1737,29.7905],[-95.05,29.8],[-94.977,29.815],[-94.85,29.83]],  // I-10
      [[-95.365,29.765],[-95.38,29.79],[-95.3876,29.8087],[-95.4,29.86],[-95.4106,29.9376],[-95.415,30.0],[-95.438,30.1195],[-95.4613,30.1658],[-95.47,30.25]],  // I-45 norte
      [[-95.355,29.745],[-95.318,29.718],[-95.285,29.688],[-95.24,29.65],[-95.2,29.6],[-95.13,29.54],[-95.07,29.48],[-95.0,29.4]],  // I-45 sur
      [[-95.375,29.75],[-95.4,29.735],[-95.4565,29.7306],[-95.5,29.718],[-95.5565,29.6985],[-95.6349,29.6197],[-95.723,29.59],[-95.8,29.55]],  // US-59 suroeste
      [[-95.355,29.77],[-95.33,29.8],[-95.317,29.8105],[-95.306,29.948],[-95.2622,29.9988],[-95.2,30.07],[-95.15,30.15]],  // US-59 noreste
      [[-95.4555,29.8],[-95.49,29.835],[-95.553,29.88],[-95.62,29.93],[-95.733,29.989],[-95.85,30.06]],  // US-290
      [[-95.38,29.745],[-95.388,29.685],[-95.3888,29.5965],[-95.395,29.56],[-95.41,29.518],[-95.42,29.45]],  // SH-288
      [[-95.2627,29.708],[-95.2,29.703],[-95.1706,29.7036],[-95.11,29.705],[-95.03,29.69]],  // SH-225
    ];
    const CHANNEL = [[-95.365,29.762],[-95.33,29.756],[-95.293,29.7495],[-95.255,29.735],[-95.2,29.729],[-95.14,29.736],[-95.09,29.733],[-95.03,29.7],[-94.985,29.68]];  // Buffalo Bayou y el canal de barcos
    const LAKE = [[-95.145,29.92],[-95.105,29.95],[-95.1,30.0],[-95.115,30.05],[-95.135,30.045],[-95.12,30.0],[-95.13,29.96],[-95.145,29.92]];  // Lake Houston
    const ez = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const lp = (a, b, t) => a + (b - a) * t;
    const mixHex = (a, b, t) => { const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
      return 'rgb(' + pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(',') + ')'; };
    let W = 0, H = 0, dpr = 1, kNow = 0, fine = null; const pats = new Map();
    const c = cv.getContext('2d');
    function dotsFor(g) {
      const q = Math.round(g * 20) / 20, key = q + '|' + dpr; if (pats.has(key)) return pats.get(key);
      const k = document.createElement('canvas'); k.width = k.height = Math.round(4.5 * dpr);
      const x = k.getContext('2d'); x.fillStyle = mixHex(GOLD, '#8f7142', q); x.beginPath(); x.arc(k.width / 2, k.height / 2, (1.05 + 2.1 * q) * dpr, 0, Math.PI * 2); x.fill();
      const pat = c.createPattern(k, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / dpr)); pats.set(key, pat); return pat;
    }
    function size() {
      W = plate.clientWidth; H = plate.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1); pats.clear();
      cv.width = W * dpr; cv.height = H * dpr;
      const p = document.createElement('canvas'); p.width = p.height = Math.round(6 * dpr);
      const pc = p.getContext('2d'); pc.fillStyle = 'rgba(8,7,5,.12)'; pc.beginPath(); pc.arc(p.width / 2, p.height / 2, 0.9 * dpr, 0, Math.PI * 2); pc.fill();   // trama más suave: no ensucia los rótulos
      fine = c.createPattern(p, 'repeat'); if (fine.setTransform) fine.setTransform(new DOMMatrix().scale(1 / dpr));
    }
    function projFor(k) {
      const kmF = Math.min((W - 80) / 92, (H - 120) / 76), e = ez(k);
      const km = Math.exp(lp(Math.log(kmF * 0.32), Math.log(kmF), e));      // de lejos se lee la costa del Golfo
      const ctr = [lp(HOU[0], FIN[0], e), lp(HOU[1], FIN[1], e)];
      return geoOrthographic().rotate([-ctr[0], -ctr[1]]).scale(6371 * km).translate([W * 0.5, H * 0.47]).clipAngle(90).clipExtent([[-30, -30], [W + 30, H + 30]]).precision(0.6);
    }
    function drawMap(k) {
      kNow = k;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const proj = projFor(k), P = new Path2D(geoPath(proj)(land) || '');
      const sea = c.createRadialGradient(W * 0.75, H * 0.8, 10, W * 0.75, H * 0.8, W * 0.8);
      sea.addColorStop(0, '#12100c'); sea.addColorStop(1, '#070605');
      c.fillStyle = sea; c.fillRect(0, 0, W, H);
      const grow = sm(0.38, 0.74, k), solid = sm(0.6, 0.84, k), dotsA = 1 - sm(0.72, 0.92, k);
      if (solid > 0) {
        const g = c.createRadialGradient(W * 0.3, H * 0.25, 10, W * 0.45, H * 0.45, W * 0.9);
        g.addColorStop(0, '#8a6c3f'); g.addColorStop(0.6, '#6a5232'); g.addColorStop(1, '#4a3a24');
        c.globalAlpha = solid; c.fillStyle = g; c.fill(P);
        c.save(); c.clip(P); c.fillStyle = fine; c.fillRect(0, 0, W, H); c.restore(); c.globalAlpha = 1;
      }
      if (dotsA > 0) { c.globalAlpha = dotsA; c.fillStyle = dotsFor(grow); c.fill(P); c.globalAlpha = 1; }
      c.strokeStyle = '#e8d6ae'; c.lineWidth = lp(0.6, 1, solid); c.globalAlpha = lp(0.38, 0.6, solid); c.stroke(P); c.globalAlpha = 1;
      const ra = 0.55 + 0.45 * sm(0.4, 0.9, k);                            // los anillos de Houston se ven desde el principio: así se reconoce
      if (ra > 0.01) {
        const gp = geoPath(proj, c);
        c.save(); c.globalAlpha = ra; c.lineJoin = 'round'; c.lineCap = 'round';
        c.fillStyle = '#0c0a08'; c.beginPath(); gp({ type: 'Polygon', coordinates: [LAKE.slice().reverse()] }); c.fill();   // anillo en el sentido que espera d3 (si no, rellena el mundo entero)
        c.strokeStyle = '#0c0a08'; c.lineWidth = 2.4; c.beginPath(); gp({ type: 'LineString', coordinates: CHANNEL }); c.stroke();
        const line = (coords, core, casing, a) => {
          c.beginPath(); gp({ type: 'LineString', coordinates: coords });
          c.strokeStyle = 'rgba(22,15,8,.42)'; c.lineWidth = casing; c.stroke();
          c.strokeStyle = `rgba(248,238,216,${a})`; c.lineWidth = core; c.stroke();
        };
        RADIALS.forEach((r) => line(r, 1, 2.6, 0.42));
        line(GP99, 1, 2.6, 0.38);
        line(BW8, 1.3, 3.2, 0.6);
        line(L610, 1.4, 3.4, 0.7);
        c.restore();
      }
      const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(9,8,7,0)'); v.addColorStop(1, 'rgba(9,8,7,.85)');
      c.fillStyle = v; c.fillRect(0, 0, W, H);
    }
    const chips = {}; $$('#hx-zones [data-z]').forEach((el) => (chips[el.dataset.z] = el));
    function placeZones() {
      const proj = projFor(1);
      $$('.mp', plate).forEach((e) => e.remove());
      ZONES.forEach((z, i) => {
        const [x, y] = proj(z.at);
        const el = document.createElement('div'); el.className = 'mp' + (z.hq ? ' mp--hq' : '');
        el.style.left = x + 'px'; el.style.top = (y - 13) + 'px'; el.style.setProperty('--d', (z.hq ? 0 : 0.15 + i * 0.09) + 's');
        // en un mapa pequeño (teléfono) solo llevan rótulo Houston y las zonas con página; las demás las nombra la lista de abajo
        const label = W >= 500 || z.href || z.hq;
        el.innerHTML = (label ? (z.href ? `<a href="${z.href}">${z.n}${arrow}</a>` : `<span>${z.n}</span>`) : '') + '<i></i>';
        plate.appendChild(el);
        // la lista y el mapa se señalan entre sí
        const chip = chips[z.n];
        const on = () => { el.classList.add('hl'); chip && chip.classList.add('hl'); };
        const off = () => { el.classList.remove('hl'); chip && chip.classList.remove('hl'); };
        el.addEventListener('mouseenter', on); el.addEventListener('mouseleave', off);
        if (chip && !chip.dataset.wired) { chip.dataset.wired = '1'; chip.addEventListener('mouseenter', () => pinOn(z.n)); chip.addEventListener('mouseleave', () => pinOff(z.n)); chip.addEventListener('focus', () => pinOn(z.n)); chip.addEventListener('blur', () => pinOff(z.n)); }
      });
    }
    const pinEl = (n) => $$('.mp', plate).find((e) => e.textContent.trim().startsWith(n));
    function pinOn(n) { const e = pinEl(n); e && e.classList.add('hl'); chips[n] && chips[n].classList.add('hl'); }
    function pinOff(n) { const e = pinEl(n); e && e.classList.remove('hl'); chips[n] && chips[n].classList.remove('hl'); }
    let ready = false;
    const prep = () => { if (ready) return; ready = true; size(); placeZones(); drawMap(reduce ? 1 : 0); };
    const nIO = new IntersectionObserver((es) => { if (es[0].isIntersecting) { prep(); nIO.disconnect(); } }, { rootMargin: '150% 0px' });
    nIO.observe(box);
    let rt; addEventListener('resize', () => { if (!ready) return; clearTimeout(rt); rt = setTimeout(() => { size(); placeZones(); drawMap(kNow); }, 120); });
    function fly() {
      prep();
      const t0 = performance.now(), dur = 2100;
      const f = (now) => { const p = Math.min(1, (now - t0) / dur); drawMap(p); if (p < 1) requestAnimationFrame(f); else box.classList.add('on'); };
      requestAnimationFrame(f);
    }
    const mIO = new IntersectionObserver((es) => { if (es[0].isIntersecting) { fly(); mIO.disconnect(); } }, { threshold: 0.55 });
    reduce ? box.classList.add('on') : mIO.observe(box);
    if (!reduce) {
      let ticking = false;
      const par = () => { ticking = false; const r = box.getBoundingClientRect(); const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; plate.style.transform = `translate3d(0,${(-k * 22).toFixed(1)}px,0)`; };
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true }); par();
    }
  });

}
