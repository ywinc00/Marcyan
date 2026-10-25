// Portada de Houston: el planeta se acerca SOLO cuando el visitante empieza a bajar.
// La portada se queda fija mientras dura el acercamiento (el desplazamiento lo dirige, suavizado),
// y luego la página baja con normalidad. Las búsquedas salen una sola vez; el pulso de los puntos
// también es de una sola vez. Al volver arriba, el mapa se aleja; al bajar otra vez, aparece el estado final sin repetir.
(function () {
  const GOLD = '#dcc089', TEAL = '#4fc3a1';
  const HOUSTON = [-95.369, 29.760];
  // Zonas por negocio: Pasadena (70,5 % hispano, censo 2020) y Gulfton (inmigración centroamericana),
  // y el poder de compra de Katy y The Woodlands. Cada búsqueda es de un sector con página propia.
  const ZONES = [
    { name: 'THE WOODLANDS', q: 'kitchen remodeling contractor', en: true, at: [-95.489, 30.166], side: 'up', wire: 54, dx: -70 },
    { name: 'KATY', q: 'realtor que hable español', at: [-95.824, 29.786], side: 'up', wire: 86, dx: -150 },
    { name: 'GULFTON', q: 'abogado de inmigración en español', at: [-95.478, 29.718], side: 'down', wire: 70, dx: -230 },
    { name: 'PASADENA', q: 'taller mecánico que hable español', at: [-95.209, 29.691], side: 'up', wire: 70, dx: -120, lit: true },
  ];
  const mobile = () => innerWidth <= 600;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frames() {
    if (mobile()) {
      const W = innerWidth, H = sticky.clientHeight || innerHeight;
      return {
        W, H,
        A: { cx: W * 0.62, cy: H * 0.86, R: Math.min(170, W * 0.44), center: [-97, 33] },
        B: { cx: W * 0.70, cy: H * 0.97, R: W * 0.60, target: [W * 0.60, H * 0.80], kmpx: 1.4 },
      };
    }
    return { W: 1440, H: 900, A: { cx: 1080, cy: 470, R: 300, center: [-97, 33] }, B: { cx: 1250, cy: 520, R: 400, target: [1112, 462], kmpx: 3.3 } };
  }

  const pin = document.getElementById('heroPin'), sticky = document.getElementById('heroSticky'), stage = document.getElementById('stage');
  const canvas = document.getElementById('globe');
  const ctx = canvas.getContext('2d');
  let F, dpr, scale = 1;
  const landGlobal = () => ({ type: 'MultiPolygon', coordinates: mobile() && GEO.land110.length ? GEO.land110 : GEO.land50 });
  let land110 = landGlobal();
  const land10 = { type: 'MultiPolygon', coordinates: GEO.tx10 };
  const texas = { type: 'MultiPolygon', coordinates: GEO.texas };

  function setup() {
    F = frames();
    land110 = landGlobal();
    dpr = Math.min(1.75, (window.devicePixelRatio || 1) * (mobile() ? 1 : scale)); patCache.clear();
    canvas.width = Math.round(F.W * dpr); canvas.height = Math.round(F.H * dpr);
  }

  const patCache = new Map();
  const mixHex = (a, b, t) => { const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return 'rgb(' + pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(',') + ')'; };
  function dotsFor(g) {
    const q = Math.round(g * 24) / 24, key = q + '|' + dpr;
    if (patCache.has(key)) return patCache.get(key);
    const step = 4.5, c = document.createElement('canvas'); c.width = c.height = Math.round(step * dpr);
    const x = c.getContext('2d'); x.fillStyle = mixHex(GOLD, '#8f7142', q);
    x.beginPath(); x.arc(c.width / 2, c.height / 2, (1.05 + 2.1 * q) * dpr, 0, Math.PI * 2); x.fill();
    const pat = ctx.createPattern(c, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / dpr));
    patCache.set(key, pat); return pat;
  }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function state(t) {
    const e = ease(t), A = F.A, B = F.B;
    const cx = lerp(A.cx, B.cx, e), cy = lerp(A.cy, B.cy, e), R = lerp(A.R, B.R, e);
    const SB = 6371 * B.kmpx;
    const S = Math.exp(lerp(Math.log(A.R), Math.log(SB), e));
    const base = d3.geoInterpolate(A.center, HOUSTON)(Math.min(1, e * 1.15));
    const spin = 1.6 * (1 - smooth(0.35, 1, e));
    const center = [base[0] + spin, base[1]];
    const k = (1 - R / S) / (1 - B.R / SB);
    const tx = lerp(cx, B.target[0] + (cx - B.cx), Math.max(0, Math.min(1, k)));
    const ty = lerp(cy, B.target[1] + (cy - B.cy), Math.max(0, Math.min(1, k)));
    const proj = d3.geoOrthographic().rotate([-center[0], -center[1]]).scale(S).translate([tx, ty]).clipAngle(90).precision(0.3);
    return { cx, cy, R, S, proj, zoom: S / R, e, t };
  }
  function ringGeo(s) { const e = s.e; return { rx: s.R * lerp(1.2, 1.4, e), ry: s.R * lerp(0.27, 0.35, e), rot: lerp(-13, -18, e) * Math.PI / 180 }; }
  function ringPath(c, s, half) {
    const g = ringGeo(s);
    c.save(); c.translate(s.cx, s.cy); c.rotate(g.rot);
    c.beginPath(); c.ellipse(0, 0, g.rx, g.ry, 0, half === 'back' ? Math.PI : 0, half === 'back' ? Math.PI * 2 : Math.PI); c.restore();
  }

  function draw(t, satPing) {
    const s = state(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, F.W, F.H);
    const halo = ctx.createRadialGradient(s.cx, s.cy, s.R * 0.9, s.cx, s.cy, s.R * 1.35);
    halo.addColorStop(0, 'rgba(200,169,110,.10)'); halo.addColorStop(1, 'rgba(200,169,110,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(s.cx, s.cy, s.R * 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(200,169,110,.72)'; ctx.lineCap = 'round';
    ringPath(ctx, s, 'back'); ctx.stroke();
    const body = ctx.createRadialGradient(s.cx - s.R * 0.45, s.cy - s.R * 0.45, s.R * 0.1, s.cx, s.cy, s.R);
    body.addColorStop(0, '#16120c'); body.addColorStop(0.55, '#0a0907'); body.addColorStop(1, '#050404');
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(s.cx, s.cy, s.R, 0, Math.PI * 2); ctx.fill();

    ctx.save(); ctx.beginPath(); ctx.arc(s.cx, s.cy, s.R - 1, 0, Math.PI * 2); ctx.clip();
    const hi = smooth(14, 24, s.zoom);
    const grow = smooth(0.38, 0.74, s.t);
    const solid = smooth(0.6, 0.84, s.t);
    const dotsA = 1 - smooth(0.72, 0.92, s.t);
    const gp = d3.geoPath(s.proj);
    const P50 = hi < 1 ? new Path2D(gp(land110) || '') : null;
    const P10 = hi > 0 ? new Path2D(gp(land10) || '') : null;
    const fillLand = (style, alpha) => {
      ctx.fillStyle = style;
      if (P50) { ctx.globalAlpha = alpha * (1 - hi); ctx.fill(P50); }
      if (P10) { ctx.globalAlpha = alpha * hi; ctx.fill(P10); }
    };
    if (solid > 0) {
      const g = ctx.createRadialGradient(s.cx - s.R * 0.5, s.cy - s.R * 0.45, s.R * 0.08, s.cx - s.R * 0.2, s.cy - s.R * 0.1, s.R * 1.35);
      g.addColorStop(0, '#9c7c49'); g.addColorStop(0.55, '#7d6139'); g.addColorStop(1, '#58432a');
      fillLand(g, solid);
    }
    if (dotsA > 0) fillLand(dotsFor(grow), dotsA);
    ctx.strokeStyle = '#e8d6ae'; ctx.lineWidth = lerp(0.6, 1, solid);
    if (P50) { ctx.globalAlpha = (1 - hi) * lerp(0.38, 0.6, solid); ctx.stroke(P50); }
    if (P10) { ctx.globalAlpha = hi * 0.6; ctx.stroke(P10); }
    ctx.globalAlpha = 1;
    const sh = ctx.createRadialGradient(s.cx - s.R * 0.55, s.cy - s.R * 0.5, s.R * 0.25, s.cx - s.R * 0.2, s.cy - s.R * 0.15, s.R * 1.55);
    sh.addColorStop(0, 'rgba(5,4,4,0)'); sh.addColorStop(0.45, 'rgba(5,4,4,.22)'); sh.addColorStop(0.8, 'rgba(5,4,4,.72)'); sh.addColorStop(1, 'rgba(5,4,4,.95)');
    ctx.fillStyle = sh; ctx.fillRect(s.cx - s.R, s.cy - s.R, s.R * 2, s.R * 2);
    ctx.restore();

    const tx = smooth(2.2, 5, s.zoom) * (1 - smooth(18, 34, s.zoom));
    if (tx > 0.01) {
      ctx.save(); ctx.beginPath(); ctx.arc(s.cx, s.cy, s.R - 1, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = tx; ctx.strokeStyle = 'rgba(226,207,164,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); d3.geoPath(s.proj, ctx)(texas); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    }
    const rim = ctx.createLinearGradient(s.cx - s.R, s.cy - s.R, s.cx + s.R * 0.4, s.cy + s.R * 0.4);
    rim.addColorStop(0, 'rgba(226,207,164,.85)'); rim.addColorStop(0.45, 'rgba(200,169,110,.25)'); rim.addColorStop(1, 'rgba(200,169,110,0)');
    ctx.strokeStyle = rim; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(s.cx, s.cy, s.R - 0.8, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4.6; ctx.strokeStyle = 'rgba(8,7,5,.42)'; ringPath(ctx, s, 'front'); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(214,186,128,.95)'; ringPath(ctx, s, 'front'); ctx.stroke();
    const a = 100 * Math.PI / 180, g = ringGeo(s), rx = g.rx, ry = g.ry, rot = g.rot;
    const px = -rx * Math.cos(a), py = ry * Math.sin(a);
    const sx = s.cx + px * Math.cos(rot) - py * Math.sin(rot), sy = s.cy + px * Math.sin(rot) + py * Math.cos(rot);
    ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(sx, sy, mobile() ? 7 : 9, 0, Math.PI * 2); ctx.fill();
    if (satPing > 0 && satPing < 1) { ctx.strokeStyle = `rgba(79,195,161,${0.9 * (1 - satPing)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 9 + 22 * satPing, 0, Math.PI * 2); ctx.stroke(); }
    return s;
  }

  // ── puntos, etiquetas e hilos en su sitio final ──
  const pinsBox = document.getElementById('pins'), wires = document.getElementById('wires');
  const found = document.getElementById('found'), foundAi = document.getElementById('foundAi');
  let items = [], houstonPx;
  function mkWire(x1, y1, x2, y2) {
    const ns = 'http://www.w3.org/2000/svg', g = document.createElementNS(ns, 'g'); g.setAttribute('class', 'w');
    ['u', 't'].forEach((c) => { const l = document.createElementNS(ns, 'line'); l.setAttribute('class', c);
      l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2 + 0.01); l.setAttribute('y2', y2); g.appendChild(l); });
    return g;
  }
  function layout() {
    pinsBox.innerHTML = ''; [...wires.querySelectorAll('g.w')].forEach((l) => l.remove()); items = [];
    const s = state(1);
    houstonPx = s.proj(HOUSTON);
    ZONES.forEach((z, i) => {
      const [x, y] = s.proj(z.at);
      const pt = document.createElement('span'); pt.className = 'pt'; pt.style.left = x + 'px'; pt.style.top = y + 'px'; pt.innerHTML = '<b></b><b></b><i></i>';
      pinsBox.appendChild(pt);
      const tag = document.createElement('span'); tag.className = 'tag';
      tag.innerHTML = `<small>${z.name}</small><span>${z.q}${z.en ? ' <span class="en">EN</span>' : ''}</span>`;
      pinsBox.appendChild(tag);
      const th = 50;
      let lx, ly;
      if (mobile()) { lx = -999; ly = -999; } else { lx = x + z.dx; ly = z.side === 'up' ? y - z.wire - th : y + z.wire; }
      tag.style.left = lx + 'px'; tag.style.top = ly + 'px';
      const wy1 = z.side === 'up' ? ly + th : y, wy2 = z.side === 'up' ? y : ly;
      const line = mkWire(x, y, x, z.side === 'up' ? ly + th : ly);
      line.style.strokeDasharray = Math.abs(wy2 - wy1); line.style.strokeDashoffset = Math.abs(wy2 - wy1);
      if (mobile()) line.style.display = 'none';
      wires.appendChild(line);
      items.push({ z, pt, tag, line, x, y, lx, ly, i });
    });
    const P = items.find((it) => it.z.lit);
    const fx = mobile() ? 20 : Math.min(P.x - 190, 1328 - 344), fy = mobile() ? F.H * 0.843 : P.y + 200;
    found.style.left = fx + 'px'; found.style.top = fy + 'px';
    const down = mkWire(P.x, P.y + 9, P.x, fy); down.classList.add('down');
    down.style.strokeDasharray = fy - P.y; down.style.strokeDashoffset = fy - P.y;
    if (mobile()) down.style.display = 'none';
    wires.appendChild(down); P.down = down;
  }

  // ── la historia de las búsquedas: corre una sola vez, la primera vez que el mapa llega a Houston ──
  let storyT0 = 0, storyDone = false, storyOn = false;
  const STORY_MS = 3800;
  function finalDom() {
    stage.classList.add('no-blip');
    items.forEach((it) => { it.pt.classList.add('on'); it.tag.style.opacity = 1; it.tag.style.transform = 'none'; it.line.style.strokeDashoffset = 0;
      if (it.z.lit) { it.pt.classList.add('lit'); it.tag.classList.add('lit'); it.line.classList.add('lit'); it.down.style.strokeDashoffset = 0; } });
    found.classList.add('on'); foundAi.classList.add('on');
  }
  function story(T) {
    if (T > -300) items.forEach((it) => it.pt.classList.add('on'));
    items.forEach((it) => {
      if (T < 0) return;
      const p = Math.min(1, T / 700), e = 1 - Math.pow(1 - p, 3);
      const ox = houstonPx[0] - it.lx - 60, oy = houstonPx[1] - it.ly - 20;
      const bend = Math.sin(Math.PI * e) * (it.i % 2 ? -70 : 70);
      it.tag.style.opacity = Math.min(1, p * 2.2);
      it.tag.style.transform = `translate(${ox * (1 - e) + bend * 0.4}px,${oy * (1 - e) - bend}px) scale(${0.82 + 0.18 * e})`;
      if (p >= 1) { const len = +it.line.style.strokeDasharray; const wp = Math.min(1, (T - 700) / 300); it.line.style.strokeDashoffset = Math.max(0, len * (1 - wp)); }
    });
    if (T > 1150) { const P = items.find((it) => it.z.lit); P.pt.classList.add('lit'); P.tag.classList.add('lit'); P.line.classList.add('lit');
      const len = +P.down.style.strokeDasharray; const dp = Math.min(1, Math.max(0, (T - 1350) / 600)); P.down.style.strokeDashoffset = Math.max(0, len * Math.pow(1 - dp, 3)); }
    if (T > 1900) found.classList.add('on');
    if (T > 2350) foundAi.classList.add('on');
  }

  // ── el desplazamiento dirige el acercamiento ──
  let cur = 0, target = 0, raf = 0, lastT = 0, started = false;
  const cue = document.getElementById('cue');
  function progress() {
    const range = pin.offsetHeight - sticky.offsetHeight;
    if (range <= 0) return 1;
    const y = Math.min(range, Math.max(0, scrollY - pin.offsetTop));
    return Math.min(1, y / (range * 0.65));         // el último 35 % del recorrido fijo deja ver la historia quieta
  }
  function tick(now) {
    const dt = lastT ? Math.min(64, now - lastT) : 16; lastT = now;
    // suavizado con un límite de velocidad: aunque el visitante baje de golpe, el viaje dura al menos ~1,2 s
    let step = (target - cur) * (1 - Math.exp(-dt / 150));
    const maxStep = dt / 1200;
    step = Math.max(-maxStep * 1.6, Math.min(maxStep, step));
    cur = Math.abs(target - cur) < 0.0008 ? target : cur + step;
    const zoomed = cur > 0.985;
    stage.classList.toggle('zoomed', zoomed);
    if (cur > 0.02 && cue) cue.classList.add('gone');
    let ping = 0;
    if (zoomed && !storyOn && !storyDone) { storyOn = true; storyT0 = now; }
    if (storyOn) {
      const T = now - storyT0;
      story(T);
      ping = T > 2300 && T < 3700 ? (T - 2300) / 1400 : 0;
      if (T > STORY_MS) { storyOn = false; storyDone = true; }
    }
    draw(cur, ping);
    if (cur !== target || storyOn) raf = requestAnimationFrame(tick); else { raf = 0; lastT = 0; }
  }
  function onScroll() {
    target = progress();
    if (!raf) { lastT = 0; raf = requestAnimationFrame(tick); }
  }

  function fit() {
    if (mobile()) { scale = 1; stage.style.transform = 'none'; stage.style.left = '0px'; stage.style.top = '0px'; return; }
    const vw = sticky.clientWidth, vh = sticky.clientHeight;
    scale = Math.min(vw / 1440, vh / 900);
    stage.style.transform = `scale(${scale})`;
    stage.style.left = (vw - 1440 * scale) / 2 + 'px';
    stage.style.top = (vh - 900 * scale) / 2 + 'px';
  }

  function init() {
    fit(); setup(); layout();
    const h = location.hash;
    if (reduce || h === '#final') {
      pin.classList.add('hero-pin--static');
      cur = target = 1; storyDone = true; stage.classList.add('zoomed'); finalDom(); draw(1, 0);
      if (cue) cue.classList.add('gone');
      return;
    }
    cur = target = progress();
    if (cur > 0.985) { storyDone = true; stage.classList.add('zoomed'); finalDom(); }
    draw(cur, 0);
    addEventListener('scroll', onScroll, { passive: true });
  }
  window.__hero = { get cur() { return cur; }, get target() { return target; }, get storyDone() { return storyDone; } };
  addEventListener('resize', () => {
    fit(); setup(); layout();
    if (storyDone || storyOn) { storyOn = false; storyDone = true; finalDom(); }
    target = reduce ? 1 : progress(); if (reduce) cur = 1;
    draw(cur, 0);
  });
  document.fonts && document.fonts.ready ? document.fonts.ready.then(init) : init();
})();
