import { geoMercator, geoPath } from 'd3-geo';
// Movimiento de las secciones: revelado de una vez, viñetas de servicios, panel de proyectos,
// cifras que suben, mapa del área. Todo respeta "reducir movimiento".
export function initSections(loadGeo, C) {
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

  // ── mapa del área: Houston de noche desde arriba, con sus carreteras, la bahía, los lagos y los bayous REALES ──
  // (TIGER/Line 2024 del Censo de EE. UU., dominio público). Al entrar, la cámara baja hacia la ciudad y las
  // autopistas se encienden desde el centro hacia fuera; luego las zonas hacen su pulso. La lista de zonas y los
  // puntos se señalan entre sí, y al pasar por una zona el mapa la ilumina.
  const box = $('#hx-map'), cv = $('#hx-map-cv'), plate = $('#hx-map-plate');
  if (box && cv) {
    const HOU = C.center, AT = C.map.at;            // (el nombre HOU es histórico: es el centro de la ciudad del hub)
    const ZONES = JSON.parse(box.dataset.zones || '[]').map((z) => Object.assign({ at: AT[z.n] }, z)).filter((z) => z.at);
    const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    // el encuadre final de la ciudad (cities.js)
    const VIEW = { type: 'MultiPoint', coordinates: C.map.view };
    const ez = (t) => 1 - Math.pow(1 - t, 3);
    const c = cv.getContext('2d');
    let MAP = null, W = 0, H = 0, dpr = 1, layers = null, hl = null, revealed = false;
    const mk = () => { const k = document.createElement('canvas'); k.width = Math.round(W * dpr); k.height = Math.round(H * dpr); const x = k.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [k, x]; };
    const projFinal = () => geoMercator().fitExtent([[18, 26], [W - 18, H - 44]], VIEW);

    // dos capas dibujadas UNA vez: el fondo (tierra, agua, bayous y el resplandor de la ciudad) y la luz de las carreteras
    function build() {
      W = plate.clientWidth; H = plate.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const proj = projFinal(), [hx, hy] = proj(HOU);
      const [B, b] = mk(), [R, r] = mk();
      const gp = (ctx) => geoPath(proj, ctx);
      // tierra de noche, con el resplandor de la ciudad alrededor del centro
      b.fillStyle = '#13100c'; b.fillRect(0, 0, W, H);
      const glow = b.createRadialGradient(hx, hy, 0, hx, hy, Math.max(W, H) * 0.42);
      glow.addColorStop(0, 'rgba(214,172,104,.20)'); glow.addColorStop(0.45, 'rgba(160,118,62,.08)'); glow.addColorStop(1, 'rgba(20,16,12,0)');
      b.fillStyle = glow; b.fillRect(0, 0, W, H);
      // agua: bahía, lagos y embalses, con una costa fina en oro
      b.beginPath(); MAP.w.forEach((poly) => gp(b)({ type: 'Polygon', coordinates: poly }));
      b.fillStyle = '#060505'; b.fill('evenodd');
      b.strokeStyle = 'rgba(220,192,137,.28)'; b.lineWidth = 0.8; b.stroke();
      // bayous: hilos de agua oscura (la "Bayou City")
      b.lineCap = b.lineJoin = 'round';
      b.beginPath(); MAP.b.forEach((l) => gp(b)({ type: 'LineString', coordinates: l }));
      b.strokeStyle = 'rgba(6,5,5,.95)'; b.lineWidth = 1.7; b.stroke();
      b.strokeStyle = 'rgba(220,192,137,.10)'; b.lineWidth = 0.6; b.stroke();
      // carreteras: las secundarias como luz tenue; las autopistas con halo y núcleo cálido
      r.lineCap = r.lineJoin = 'round';
      r.beginPath(); MAP.r2.forEach((l) => gp(r)({ type: 'LineString', coordinates: l }));
      r.strokeStyle = 'rgba(214,180,118,.34)'; r.lineWidth = 0.75; r.stroke();
      r.beginPath(); MAP.r1.forEach((l) => gp(r)({ type: 'LineString', coordinates: l }));
      r.strokeStyle = 'rgba(220,180,110,.13)'; r.lineWidth = 4.5; r.stroke();
      r.strokeStyle = 'rgba(244,224,180,.88)'; r.lineWidth = 1.25; r.stroke();
      layers = { B, R, hx, hy, proj };
    }
    // un fotograma: la cámara baja (de 0,6 a 1 de escala, hacia el centro) y la luz se extiende desde el centro
    function frame(k) {
      const L = layers; if (!L) return;
      const e = ez(k), s = 0.6 + 0.4 * e;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      c.save(); c.translate(L.hx, L.hy); c.scale(s, s); c.translate(-L.hx, -L.hy);
      c.drawImage(L.B, 0, 0, W, H);
      const rad = Math.max(W, H) * 1.25 * e;
      if (rad > 0) {
        const [T, t] = tmp();
        t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, T.width, T.height); t.setTransform(dpr, 0, 0, dpr, 0, 0);
        t.globalCompositeOperation = 'source-over'; t.drawImage(L.R, 0, 0, W, H);
        if (k < 1) {
          const m = t.createRadialGradient(L.hx, L.hy, Math.max(0, rad - 90), L.hx, L.hy, rad);
          m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
          t.globalCompositeOperation = 'destination-in'; t.fillStyle = m; t.fillRect(0, 0, W, H);
        }
        c.drawImage(T, 0, 0, W, H);
      }
      // la zona señalada se ilumina
      if (hl) {
        const [x, y] = L.proj(hl.at), g = c.createRadialGradient(x, y, 0, x, y, 70);
        g.addColorStop(0, 'rgba(236,206,150,.22)'); g.addColorStop(1, 'rgba(236,206,150,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, 70, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      // viñeta: los bordes del mapa se funden con la tarjeta
      const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
      v.addColorStop(0, 'rgba(9,8,7,0)'); v.addColorStop(1, 'rgba(9,8,7,.78)');
      c.fillStyle = v; c.fillRect(0, 0, W, H);
    }
    let TMP = null;
    function tmp() { if (!TMP || TMP[0].width !== Math.round(W * dpr) || TMP[0].height !== Math.round(H * dpr)) TMP = mk(); return TMP; }

    const chips = {}; $$('#hx-zones [data-z]').forEach((el) => (chips[el.dataset.z] = el));
    const pinEls = {};
    function placeZones() {
      const proj = layers.proj;
      $$('.mp', plate).forEach((e) => e.remove());
      ZONES.forEach((z, i) => {
        const [x, y] = proj(z.at);
        const el = document.createElement('div'); el.className = 'mp' + (z.hq ? ' mp--hq' : '');
        el.style.left = x + 'px'; el.style.top = (y - 13) + 'px'; el.style.setProperty('--d', (z.hq ? 0 : 0.12 + i * 0.08) + 's');
        // en un mapa pequeño (teléfono) solo llevan rótulo Houston y las zonas con página; las demás las nombra la lista
        const label = W >= 500 || z.href || z.hq;
        el.innerHTML = (label ? (z.href ? `<a href="${z.href}">${z.n}${arrow}</a>` : `<span>${z.n}</span>`) : '') + '<i></i>';
        plate.appendChild(el); pinEls[z.n] = el;
        el.addEventListener('mouseenter', () => zoneOn(z.n)); el.addEventListener('mouseleave', () => zoneOff(z.n));
        const chip = chips[z.n];
        if (chip && !chip.dataset.wired) {
          chip.dataset.wired = '1';
          ['mouseenter', 'focus'].forEach((ev) => chip.addEventListener(ev, () => zoneOn(z.n)));
          ['mouseleave', 'blur'].forEach((ev) => chip.addEventListener(ev, () => zoneOff(z.n)));
        }
      });
    }
    function zoneOn(n) { const z = ZONES.find((q) => q.n === n); if (!z) return; hl = z; pinEls[n] && pinEls[n].classList.add('hl'); chips[n] && chips[n].classList.add('hl'); if (revealed) frame(1); }
    function zoneOff(n) { hl = null; pinEls[n] && pinEls[n].classList.remove('hl'); chips[n] && chips[n].classList.remove('hl'); if (revealed) frame(1); }

    let mapP = null;
    const loadMap = () => mapP || (mapP = fetch(C.map.file).then((r) => r.json()).then((d) => { MAP = d; build(); placeZones(); frame(reduce ? 1 : 0); revealed = reduce; }));
    const nIO = new IntersectionObserver((es) => { if (es[0].isIntersecting) { loadMap(); nIO.disconnect(); } }, { rootMargin: '150% 0px' });
    nIO.observe(box);
    let rt; addEventListener('resize', () => { if (!MAP) return; clearTimeout(rt); rt = setTimeout(() => { build(); placeZones(); frame(revealed ? 1 : 0); }, 140); });
    function playMap() {                               // (nombre propio: «play» es el de las viñetas de servicios)
      loadMap().then(() => {
        const t0 = performance.now(), dur = 1500;
        const f = (now) => { const p = Math.min(1, (now - t0) / dur); frame(p); if (p < 1) requestAnimationFrame(f); else { revealed = true; box.classList.add('on'); } };
        requestAnimationFrame(f);
      });
    }
    const mIO = new IntersectionObserver((es) => { if (es[0].isIntersecting) { playMap(); mIO.disconnect(); } }, { threshold: 0.45 });
    if (reduce) loadMap().then(() => box.classList.add('on')); else mIO.observe(box);
    if (!reduce) {
      let ticking = false;
      const par = () => { ticking = false; const r = box.getBoundingClientRect(); const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; plate.style.transform = `translate3d(0,${(-k * 18).toFixed(1)}px,0)`; };
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true }); par();
    }
  }

}
