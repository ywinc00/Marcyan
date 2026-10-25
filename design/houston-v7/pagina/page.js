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

  // ── mapa del área: Houston iluminada desde lejos que se acerca hasta el mapa con las zonas ──
  const box = $('#metroBox'), cv = $('#metro'), plate = $('#metroPlate');
  if (box && cv && window.d3 && window.GEO) {
    const land = { type: 'MultiPolygon', coordinates: GEO.tx10 };
    const HOU = [-95.369, 29.760], FIN = [-95.48, 29.86];
    const ZONES = [
      { n: 'Houston', at: HOU, hq: true },
      { n: 'Katy', at: [-95.824, 29.786], href: '/es/houston/katy' },
      { n: 'Sugar Land', at: [-95.635, 29.620], href: '/es/houston/sugar-land' },
      { n: 'The Woodlands', at: [-95.489, 30.166] },
      { n: 'Pearland', at: [-95.286, 29.564] },
      { n: 'Pasadena', at: [-95.209, 29.691] },
    ];
    // luces de la ciudad vista de noche (estilizada, sin detalle): núcleo, los tres anillos y las autopistas radiales
    let sd = 7; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
    const KX = 96.4, KY = 111.0, LIGHTS = [];
    const add = (x, y, b) => LIGHTS.push([HOU[0] + x / KX, HOU[1] + y / KY, b]);
    [9.5, 19, 38].forEach((r, ri) => { const n = Math.round((r * 2 * Math.PI) / 0.7); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, j = (rnd() - 0.5) * 0.8; add((r + j) * Math.cos(a), (r + j) * Math.sin(a) * 0.92, 0.75 - ri * 0.12); } });
    [0, 180, 105, -40, -145, 50, 150, -90, -10].forEach((deg) => { const a = (deg * Math.PI) / 180; for (let r = 1.5; r < 58; r += 0.6) { const j = (rnd() - 0.5) * 0.7; add(r * Math.cos(a) - j * Math.sin(a), r * Math.sin(a) + j * Math.cos(a), 0.85 * Math.exp(-r / 70)); } });
    for (let i = 0; i < 1700; i++) { const r = -Math.log(1 - rnd() * 0.995) * 12, a = rnd() * Math.PI * 2; add(r * Math.cos(a), r * Math.sin(a), 0.35 + 0.4 * rnd()); }
    for (let i = 0; i < 260; i++) { const r = -Math.log(1 - rnd() * 0.99) * 2.2, a = rnd() * Math.PI * 2; add(r * Math.cos(a), r * Math.sin(a), 0.95); }
    const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    const ez = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const lp = (a, b, t) => a + (b - a) * t;
    let W = 0, H = 0, dpr = 1, kNow = 0, dotPat = null;
    function size() {
      W = plate.clientWidth; H = plate.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr;
      const p = document.createElement('canvas'); p.width = p.height = Math.round(6 * dpr);
      const pc = p.getContext('2d'); pc.fillStyle = 'rgba(8,7,5,.22)'; pc.beginPath(); pc.arc(p.width / 2, p.height / 2, 0.9 * dpr, 0, Math.PI * 2); pc.fill();
      dotPat = cv.getContext('2d').createPattern(p, 'repeat'); if (dotPat.setTransform) dotPat.setTransform(new DOMMatrix().scale(1 / dpr));
    }
    function projFor(k) {
      const kmF = Math.min((W - 80) / 92, (H - 120) / 76), e = ez(k);
      const km = Math.exp(lp(Math.log(kmF * 0.13), Math.log(kmF), e));
      const ctr = [lp(HOU[0], FIN[0], e), lp(HOU[1], FIN[1], e)];
      return { km, e, proj: d3.geoOrthographic().rotate([-ctr[0], -ctr[1]]).scale(6371 * km).translate([W * 0.5, H * 0.47]).clipAngle(90) };
    }
    function drawMap(k) {
      kNow = k;
      const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { km, e, proj } = projFor(k), path = d3.geoPath(proj, c);
      const sea = c.createRadialGradient(W * 0.75, H * 0.8, 10, W * 0.75, H * 0.8, W * 0.8);
      sea.addColorStop(0, '#12100c'); sea.addColorStop(1, '#070605');
      c.fillStyle = sea; c.fillRect(0, 0, W, H);
      const bronze = sm(0.5, 0.9, k), lightsA = 1 - sm(0.55, 0.92, k);
      c.fillStyle = '#0e0d0b'; c.beginPath(); path(land); c.fill();
      if (bronze > 0) {
        const g = c.createRadialGradient(W * 0.3, H * 0.25, 10, W * 0.45, H * 0.45, W * 0.9);
        g.addColorStop(0, '#8a6c3f'); g.addColorStop(0.6, '#6a5232'); g.addColorStop(1, '#4a3a24');
        c.globalAlpha = bronze; c.fillStyle = g; c.beginPath(); path(land); c.fill();
        c.save(); c.beginPath(); path(land); c.clip(); c.fillStyle = dotPat; c.fillRect(0, 0, W, H); c.restore();
        c.globalAlpha = 1;
      }
      if (lightsA > 0.01) {
        c.save(); c.beginPath(); path(land); c.clip();
        const hp = proj(HOU), gr = 34 * km;
        const glow = c.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], gr);
        glow.addColorStop(0, `rgba(255,190,110,${0.28 * lightsA})`); glow.addColorStop(1, 'rgba(255,190,110,0)');
        c.fillStyle = glow; c.fillRect(hp[0] - gr, hp[1] - gr, gr * 2, gr * 2);
        c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgb(255,196,122)';
        const rad = lp(0.9, 1.6, e);
        for (let i = 0; i < LIGHTS.length; i++) { const L = LIGHTS[i], pt = proj(L); if (!pt || pt[0] < -4 || pt[1] < -4 || pt[0] > W + 4 || pt[1] > H + 4) continue; c.globalAlpha = L[2] * lightsA * 0.85; c.fillRect(pt[0] - rad / 2, pt[1] - rad / 2, rad, rad); }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.restore();
      }
      c.strokeStyle = `rgba(232,214,174,${lp(0.28, 0.6, e)})`; c.lineWidth = 1; c.beginPath(); path(land); c.stroke();
      const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(9,8,7,0)'); v.addColorStop(1, 'rgba(9,8,7,.85)');
      c.fillStyle = v; c.fillRect(0, 0, W, H);
    }
    function placeZones() {
      const { proj } = projFor(1);
      $$('.mp', plate).forEach((e) => e.remove());
      ZONES.forEach((z, i) => {
        const [x, y] = proj(z.at);
        const el = document.createElement('div'); el.className = 'mp' + (z.hq ? ' mp--hq' : '');
        el.style.left = x + 'px'; el.style.top = (y - 13) + 'px'; el.style.setProperty('--d', (z.hq ? 0 : 0.15 + i * 0.09) + 's');
        el.innerHTML = (z.href ? `<a href="${z.href}">${z.n}${arrow}</a>` : `<span>${z.n}</span>`) + '<i></i>';
        plate.appendChild(el);
      });
    }
    size(); placeZones(); drawMap(reduce ? 1 : 0);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); placeZones(); drawMap(kNow); }, 120); });
    function fly() {
      const t0 = performance.now(), dur = 2600;
      const f = (now) => { const p = Math.min(1, (now - t0) / dur); drawMap(p); if (p < 1) requestAnimationFrame(f); else box.classList.add('on'); };
      requestAnimationFrame(f);
    }
    const mIO = new IntersectionObserver((es) => { if (es[0].isIntersecting) { fly(); mIO.disconnect(); } }, { threshold: 0.5 });
    reduce ? box.classList.add('on') : mIO.observe(box);
    if (!reduce) {
      let ticking = false;
      const par = () => { ticking = false; const r = box.getBoundingClientRect(); const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; plate.style.transform = `translate3d(0,${(-k * 26).toFixed(1)}px,0)`; };
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true }); par();
    }
  }

  // ── pie: la silueta de Houston a lo lejos (sutil); el protagonista es el cielo ──
  const skyline = $('#skyline');
  if (skyline) {
    let s2 = 21; const r2 = () => (s2 = (s2 * 9301 + 49297) % 233280) / 233280;
    const B = 170; let low = '';
    for (let x = 0; x < 1440;) { const w = 8 + r2() * 26, h = 5 + r2() * (x > 700 && x < 1120 ? 34 : 18); low += `M${x.toFixed(1)} ${B}V${(B - h).toFixed(1)}H${(x + w).toFixed(1)}V${B}Z`; x += w + (r2() < 0.25 ? r2() * 6 : 0); }
    const T = [
      // Uptown: Williams Tower y sus vecinos
      [372, 'M372 170V118H386V170Z'], [390, 'M390 170V100H402V170Z'],
      [408, 'M408 170V48L412 44L415 34L418 22L421 34L424 44L428 48V170ZM417.3 22V10H418.7V22Z'],
      [432, 'M432 170V110H448V170Z'], [452, 'M452 170V130H462V170Z'],
      // Downtown
      [712, 'M712 170V122H728V170Z'], [730, 'M730 170V100H734V94H746V100H750V170Z'], [754, 'M754 170V106H772V170Z'],
      [776, 'M776 170V74H798V170Z'],
      [802, 'M802 170V62H806V56H810V50H820V56H824V62H828V170Z'],                                       // Heritage Plaza
      [832, 'M832 170V80L836 74L840 80V68L845 62L849 68V56L854 48L859 56V68L863 62L868 68V80L872 74L876 80V170Z'], // Bank of America Center
      [880, 'M880 170V14H902L908 22V170ZM891.3 14V4H892.7V14Z'],                                      // JPMorgan Chase Tower
      [912, 'M912 170V38C912 30 916 26 923 26C930 26 934 30 934 38V170Z'],                             // Wells Fargo Plaza
      [940, 'M940 170V78L956 68V170Z'], [960, 'M960 170V68L976 78V170Z'],                              // Pennzoil Place
      [980, 'M980 170V80H1000V170ZM989.3 80V70H990.7V80Z'], [1004, 'M1004 170V62H1022V170Z'],
      [1026, 'M1026 170V96H1030V88H1046V96H1050V170Z'], [1054, 'M1054 170V108H1072V170Z'],
      [1076, 'M1076 170V124H1096V170Z'], [1100, 'M1100 170V136H1114V170Z'],
    ];
    let win = '';
    // ventanas encendidas solo DENTRO de cada torre: ancho y techo calculados de su propio trazo
    const box4 = (d) => { const xs = [], ys = []; let cx = 0, cy = 0;
      d.replace(/([MLHVCZ])([^MLHVCZ]*)/g, (_, c, args) => { const n = args.trim().split(/[ ,]+/).filter(Boolean).map(Number);
        if (c === 'M' || c === 'L') { cx = n[0]; cy = n[1]; } else if (c === 'H') cx = n[0]; else if (c === 'V') cy = n[0]; else if (c === 'C') { cx = n[4]; cy = n[5]; } else return '';
        xs.push(cx); ys.push(cy); return ''; });
      return { w: Math.max(...xs) - Math.min(...xs), top: Math.min(...ys) }; };
    T.forEach(([x, d]) => { const main = d.split('ZM')[0] + 'Z', bb = box4(main), top = bb.top + 8;
      for (let i = 0; i < 4; i++) if (r2() < 0.7 && top < 160) win += `<circle cx="${(x + 3 + r2() * (bb.w - 6)).toFixed(1)}" cy="${(top + r2() * (164 - top)).toFixed(1)}" r=".7"/>`; });
    skyline.innerHTML = '<defs><linearGradient id="skF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0d0b"/><stop offset="1" stop-color="#070706"/></linearGradient></defs>' +
      `<path d="${low}" fill="#090807"/><path d="${T.map((t) => t[1]).join('')}" fill="url(#skF)" stroke="rgba(200,169,110,.16)" stroke-width=".8"/>` +
      `<g fill="rgba(226,190,128,.5)">${win}</g>`;
  }

  // el formulario es de muestra: no envía nada
  const form = $('#form'); if (form) form.addEventListener('submit', (e) => e.preventDefault());
})();
