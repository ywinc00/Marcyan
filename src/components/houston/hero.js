import { geoOrthographic, geoPath, geoInterpolate } from 'd3-geo';
// Portada de Houston: el planeta se acerca SOLO cuando el visitante empieza a bajar.
// La portada se queda fija mientras dura el acercamiento (el desplazamiento lo dirige, suavizado),
// y luego la página baja con normalidad. Las búsquedas salen una sola vez; el pulso de los puntos
// también es de una sola vez. Al volver arriba, el mapa se aleja; al bajar otra vez, aparece el estado final sin repetir.
export function initHero(GEO) {
  const GOLD = '#dcc089', TEAL = '#4fc3a1';
  const HOUSTON = [-95.369, 29.760];
  // Zonas por negocio: Pasadena (70,5 % hispano, censo 2020) y Gulfton (inmigración centroamericana),
  // y el poder de compra de Katy y The Woodlands. Cada búsqueda es de un sector con página propia.
  const ZONES_POS = [
    { at: [-95.489, 30.166], side: 'up', wire: 54, dx: -70 },
    { at: [-95.824, 29.786], side: 'up', wire: 86, dx: -150 },
    { at: [-95.478, 29.718], side: 'down', wire: 70, dx: -230 },
    { at: [-95.209, 29.691], side: 'up', wire: 70, dx: -120, lit: true },
  ];
  const pin = document.getElementById('hx-hero-pin'), sticky = document.getElementById('hx-hero-sticky'), stage = document.getElementById('hx-stage');
  if (!pin || !stage) return;
  // nombres y búsquedas vienen del idioma de la página (data-pins); la posición es diseño
  const ZONES = JSON.parse(stage.dataset.pins || '[]').map((z, i) => Object.assign({}, ZONES_POS[i], z));
  // por debajo de 900 px la portada se compone en vertical (texto arriba, planeta abajo)
  // teléfono en horizontal (poca altura): composición en horizontal, sin etiquetas (la búsqueda va en la ficha)
  const mobile = () => innerWidth < 900 && innerHeight >= 520;
  const tagsOff = () => innerHeight < 520;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frames() {
    if (mobile()) {
      const W = sticky.clientWidth || innerWidth, H = sticky.clientHeight || innerHeight;
      // Houston queda justo debajo del texto (lo mide: el inglés ocupa más) y la ficha cabe entera debajo
      const copy = stage.querySelector('.copy');
      // pantallas cortas: al acercarse, el párrafo de entrada se recoge para dejar sitio a la historia
      const short = H < 760; stage.classList.toggle('short', short);
      const lead = copy && copy.querySelector('.lead');
      let cb = copy ? copy.getBoundingClientRect().bottom - stage.getBoundingClientRect().top : H * 0.62;
      if (short && lead && !stage.classList.contains('zoomed')) cb -= lead.scrollHeight + 16;
      const sr = stage.getBoundingClientRect();
      const Ra = Math.min(W * 0.44, H * 0.24, 260);
      // al empezar, el planeta asoma por debajo de TODO el texto (nunca detrás del teléfono ni del botón)
      const full = copy ? copy.getBoundingClientRect().bottom - sr.top : H * 0.62;
      const pad = copy ? Math.max(16, copy.getBoundingClientRect().left - sr.left) : 20, navH = 64;
      // la historia ocupa la franja entre la barra y el botón del chat; la escala del mapa sale de lo que cabe:
      // de alto (etiquetas arriba, ficha abajo) y de ancho: de Katy (44 km al oeste) hasta que asome la bahía de
      // Galveston (36 km al este), que es lo que dice "esto es Houston" igual que en escritorio
      const th = W <= 600 ? 52 : 60, cardH = found.offsetHeight || 130;
      // de la barra hasta el pie de la pantalla: la ficha nunca llega a la columna del botón del chat (a la derecha)
      const band = H - navH - 14 - 24;
      const kW = (W - 2 * pad - 70) / 80;
      // cuatro etiquetas: The Woodlands arriba, Katy y Pasadena en escalera entre los puntos, Gulfton (a veces en dos
      // líneas) abajo y la ficha al final. La escalera necesita 52,8 km de alto entre The Woodlands y Pasadena.
      const kFit = (band - (30 + th + 34 + (th + 22) + 18 + cardH)) / 49.8, kStair = (2 * th + 16 + 36) / 52.8;
      const lite = Math.min(kFit, kW) < Math.max(2.2, kStair);         // teléfonos bajos: solo la búsqueda encendida
      let kmpx, up, down;
      if (!lite) {
        kmpx = Math.min(5.2, kFit, kW);
        up = 45.1 * kmpx + 30 + th; down = Math.max(4.7 * kmpx + 34 + th + 22, 7.7 * kmpx + 20) + 18 + cardH;
      } else {
        kmpx = Math.max(1.9, Math.min(4.5, kW, (band - 54 - cardH) / 52.8));
        up = Math.max(45.1 * kmpx + 16, 30 + th - 7.7 * kmpx); down = 7.7 * kmpx + 38 + cardH;
      }
      const yh = navH + 14 + up + Math.max(0, (band - up - down) / 2);
      const xh = Math.max(pad + 20 + 44 * kmpx, Math.min(W - 70 - 36 * kmpx, W / 2 - 10 * kmpx));
      // la lente llena la pantalla: de la barra hasta pasado el borde de abajo (se ven solo sus curvas)
      const Rb = (H - navH) / 2 + 20, cyB = (navH + H) / 2, Rm = Math.min(W * 0.42, (H - navH) * 0.3, 300);
      // el satélite termina en el borde derecho de la pantalla, como en escritorio (no junto a los puntos)
      const rot = -18 * Math.PI / 180, rx = Rb * 1.4, ry = Rb * 0.35;
      let satA = 150;
      for (let a = 100; a <= 150; a++) { const r = a * Math.PI / 180; if (W / 2 - rx * Math.cos(r) * Math.cos(rot) - ry * Math.sin(r) * Math.sin(rot) >= W - 18) { satA = a; break; } }
      return {
        W, H, pad, tm: 0.34, lite, satA,
        A: { cx: W * 0.62, cy: Math.max(H * 0.86, full + 20 + Ra), R: Ra, center: [-97, 33] },
        M: { cx: W / 2, cy: navH + (H - navH) * 0.48, R: Rm, center: geoInterpolate([-97, 33], HOUSTON)(0.5) },
        B: { cx: W / 2, cy: cyB, R: Rb, target: [xh, yh], kmpx },
      };
    }
    // Escritorio, a pantalla completa: el texto va alineado con la barra (contenedor del sitio) y el planeta
    // se ancla al borde derecho de la ventana, con aire de sobra entre los dos (ya no hay caja central escalada).
    const W = sticky.clientWidth, H = sticky.clientHeight;
    const copy = stage.querySelector('.copy'), sr = stage.getBoundingClientRect();
    const copyRight = copy ? copy.getBoundingClientRect().right - sr.left : W * 0.45;
    // el planeta entero a la vista al empezar, nunca encima del texto; crece con la altura de la pantalla
    // el aro (1,17 R hacia la izquierda) nunca se acerca a menos de 48 px del texto; el planeta deja aire al borde
    const edge = Math.max(24, W * 0.025);
    const R = Math.min(H * 0.34, W * 0.27, (W - edge - copyRight - 48) / 2.17);
    const cx = Math.min(W - R - edge, Math.max(W * 0.75, copyRight + 48 + R * 1.17)), cy = H * 0.53;
    // el acercamiento conserva las proporciones del prototipo aprobado (1440×900: R 300 → lente de 400)
    // las zonas conservan la separación del prototipo en portátiles, pero siempre caben dentro de la lente
    const k = Math.min(1.4, Math.max(Math.min(0.95, R / 240), R / 300));
    return {
      W, H,
      A: { cx, cy, R, center: [-97, 33] },
      B: { cx: cx + R * 0.567, cy: cy + R * 0.167, R: R * 1.333, target: [cx + R * 0.107, cy - R * 0.027], kmpx: 3.3 * k },
    };
  }

  const canvas = document.getElementById('hx-globe');
  const ctx = canvas.getContext('2d');
  let F, dpr;
  const landGlobal = () => ({ type: 'MultiPolygon', coordinates: !mobile() && GEO.land50 ? GEO.land50 : GEO.land110 });
  let land110 = landGlobal();
  const land10 = { type: 'MultiPolygon', coordinates: GEO.tx10 };
  const texas = { type: 'MultiPolygon', coordinates: GEO.texas };

  function setup() {
    if (copyEl) copyEl.style.transform = '';            // se mide el texto en su sitio, sin el desplazamiento de salida
    if (mobile() && innerHeight >= 520) { found.style.width = ''; const q = document.getElementById('hx-found-q'); if (q) q.hidden = true; }
    F = frames();
    land110 = landGlobal();
    dpr = Math.min(mobile() ? 2 : 1.75, window.devicePixelRatio || 1); patCache.clear();
    // el lienzo es la ventana entera (CSS 100 % × 100 %): el planeta y su brillo nunca se cortan
    canvas.width = Math.round(F.W * dpr); canvas.height = Math.round(F.H * dpr);
    // el resplandor dorado del fondo sigue al planeta
    const cueEl = document.getElementById('hx-cue');
    if (cueEl && copyEl) { cueEl.hidden = false; cueEl.hidden = cueEl.getBoundingClientRect().top < copyEl.getBoundingClientRect().bottom + 24; }
    stage.style.setProperty('--pcx', F.A.cx + 'px'); stage.style.setProperty('--pcy', F.A.cy + 'px'); stage.style.setProperty('--pr', F.A.R + 'px');
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
    const M = F.M;
    if (!M) return stateAB(F.A, F.B, t);
    if (t >= F.tm) return stateAB(M, F.B, (t - F.tm) / (1 - F.tm));
    // primer tiempo (móvil): el planeta entero sube al centro y crece mientras gira hacia Texas
    const u = smooth(0.04 / F.tm, 1, t / F.tm), A = F.A;
    const cx = lerp(A.cx, M.cx, u), cy = lerp(A.cy, M.cy, u), R = lerp(A.R, M.R, u);
    const c0 = geoInterpolate(A.center, M.center)(u);
    const proj = geoOrthographic().rotate([-(c0[0] + 1.6), -c0[1]]).scale(R).translate([cx, cy]).clipAngle(90).precision(1);
    return { cx, cy, R, S: R, proj, zoom: 1, e: 0, t: 0 };
  }
  function stateAB(A, B, t) {
    const e = ease(t);
    const cx = lerp(A.cx, B.cx, e), cy = lerp(A.cy, B.cy, e), R = lerp(A.R, B.R, e);
    const SB = 6371 * B.kmpx;
    const S = Math.exp(lerp(Math.log(A.R), Math.log(SB), e));
    const base = geoInterpolate(A.center, HOUSTON)(Math.min(1, e * 1.15));
    const spin = 1.6 * (1 - smooth(0.35, 1, e));
    const center = [base[0] + spin, base[1]];
    const k = (1 - R / S) / (1 - B.R / SB);
    const tx = lerp(cx, B.target[0] + (cx - B.cx), Math.max(0, Math.min(1, k)));
    const ty = lerp(cy, B.target[1] + (cy - B.cy), Math.max(0, Math.min(1, k)));
    const proj = geoOrthographic().rotate([-center[0], -center[1]]).scale(S).translate([tx, ty]).clipAngle(90).precision(mobile() ? 1 : 0.3);   // en el teléfono, menos remuestreo (la pantalla no lo nota)
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
    const gp = geoPath(s.proj);
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
      ctx.globalAlpha = tx; ctx.strokeStyle = 'rgba(226,207,164,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); geoPath(s.proj, ctx)(texas); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    }
    const rim = ctx.createLinearGradient(s.cx - s.R, s.cy - s.R, s.cx + s.R * 0.4, s.cy + s.R * 0.4);
    rim.addColorStop(0, 'rgba(226,207,164,.85)'); rim.addColorStop(0.45, 'rgba(200,169,110,.25)'); rim.addColorStop(1, 'rgba(200,169,110,0)');
    ctx.strokeStyle = rim; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(s.cx, s.cy, s.R - 0.8, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4.6; ctx.strokeStyle = 'rgba(8,7,5,.42)'; ringPath(ctx, s, 'front'); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(214,186,128,.95)'; ringPath(ctx, s, 'front'); ctx.stroke();
    const a = (F.satA ? lerp(100, F.satA, s.e) : 100) * Math.PI / 180, g = ringGeo(s), rx = g.rx, ry = g.ry, rot = g.rot;
    const px = -rx * Math.cos(a), py = ry * Math.sin(a);
    const sx = s.cx + px * Math.cos(rot) - py * Math.sin(rot), sy = s.cy + px * Math.sin(rot) + py * Math.cos(rot);
    ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(sx, sy, mobile() ? 7 : 9, 0, Math.PI * 2); ctx.fill();
    if (satPing > 0 && satPing < 1) { ctx.strokeStyle = `rgba(79,195,161,${0.9 * (1 - satPing)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 9 + 22 * satPing, 0, Math.PI * 2); ctx.stroke(); }
    return s;
  }

  // ── puntos, etiquetas e hilos en su sitio final ──
  const pinsBox = document.getElementById('hx-pins'), wires = document.getElementById('hx-wires');
  const found = document.getElementById('hx-found'), foundAi = document.getElementById('hx-found-ai');
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
      items.push({ z, pt, tag, x, y, i, side: z.side, th: 50 });
    });
    if (tagsOff()) items.forEach((it) => { it.lx = -999; it.ly = -999; });
    else if (!mobile()) items.forEach((it) => { it.lx = it.x + it.z.dx; it.ly = it.side === 'up' ? it.y - it.z.wire - it.th : it.y + it.z.wire; });
    else {
      // móvil: The Woodlands arriba; Katy debajo de ese punto, a la izquierda; Pasadena debajo de Katy, a la derecha;
      // Gulfton debajo del grupo. Cada hilo sale de su punto y ninguno cruza otra etiqueta.
      const cx = (l, w) => Math.max(F.pad, Math.min(F.W - F.pad - w, l));
      items.forEach((it) => { it.tw = it.tag.offsetWidth; it.th = it.tag.offsetHeight || 52; });
      const [wd, ka, gu, pa] = items;
      // parte una etiqueta en dos líneas equilibradas y ajusta la caja a la línea más larga (sin hueco a la derecha)
      const wrap = (it, maxW) => {
        it.tag.style.maxWidth = Math.max(120, maxW) + 'px'; it.tag.style.whiteSpace = 'normal';
        const tr = it.tag.getBoundingClientRect(), cs = getComputedStyle(it.tag), rg = document.createRange();
        rg.selectNodeContents(it.tag.querySelector('span'));
        const right = Math.max(it.tag.querySelector('small').getBoundingClientRect().right, ...[...rg.getClientRects()].map((r) => r.right));
        it.tag.style.width = Math.ceil(right - tr.left + parseFloat(cs.paddingRight) + 2) + 'px';
        it.tw = it.tag.offsetWidth; it.th = it.tag.offsetHeight;
      };
      if (F.lite) {
        // teléfono bajo: los cuatro puntos y solo la búsqueda encendida (Pasadena) con su ficha
        [wd, ka, gu].forEach((it) => { it.lx = it.ly = -999; it.hide = true; });
        pa.side = 'up'; pa.lx = cx(pa.x + 22 - pa.tw, pa.tw); pa.ly = pa.y - 30 - pa.th;
      } else {
        wd.side = 'up'; wd.lx = cx(wd.x - wd.tw / 2, wd.tw); wd.ly = wd.y - 30 - wd.th;
        ka.side = 'up'; ka.lx = cx(ka.x - 22, ka.tw); ka.ly = Math.min(wd.y + 18, ka.y - 18 - ka.th);
        // Pasadena nunca tapa el hilo de Katy ni se despega del suyo: se corre lo justo y, si no cabe, va en dos líneas
        const minL = ka.x + 14;
        pa.lx = Math.max(minL, cx(pa.x + 22 - pa.tw, pa.tw));
        if (pa.lx + pa.tw > F.W - F.pad || pa.lx > pa.x - 14) {
          wrap(pa, F.W - F.pad - minL);
          pa.lx = Math.max(minL, Math.min(F.W - F.pad - pa.tw, pa.x + 22 - pa.tw));
        }
        pa.side = 'up'; pa.ly = Math.min(ka.ly + ka.th + 16, pa.y - 18 - pa.th);
        if (pa.ly < ka.ly + ka.th + 12) ka.ly = Math.max(wd.y + 10, pa.ly - 12 - ka.th);
        // Gulfton no se cruza con el hilo que baja de Pasadena a la ficha: si no cabe a su izquierda, dos líneas
        if (gu.x + 22 - gu.tw < F.pad && pa.x - 14 - F.pad < gu.tw) wrap(gu, pa.x - 14 - F.pad);
        gu.side = 'down'; gu.lx = Math.max(F.pad, Math.min(cx(gu.x + 22 - gu.tw, gu.tw), pa.x - 14 - gu.tw)); gu.ly = gu.y + 34;
      }
    }
    items.forEach((it) => {
      it.tag.style.left = it.lx + 'px'; it.tag.style.top = it.ly + 'px';
      const end = it.side === 'up' ? it.ly + it.th : it.ly, len = Math.abs(end - it.y);
      const line = mkWire(it.x, it.y, it.x, end);
      line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
      if (tagsOff() || it.hide) line.style.display = 'none';
      wires.appendChild(line); it.line = line;
    });
    const P = items.find((it) => it.z.lit);
    const fq = document.getElementById('hx-found-q');
    if (fq) { fq.querySelector('span').textContent = P.z.q; fq.hidden = !tagsOff(); }
    // la ficha cuelga del punto encendido y cabe entera en pantalla, también en portátiles de poca altura
    const drop = Math.min(200, Math.max(120, F.H * 0.22));
    // nunca encima del texto: si no cabe a su lado, la ficha se estrecha (teléfono en horizontal)
    let fx = 20, fyM = 0;
    if (mobile()) {
      const cw = found.offsetWidth || 284, gu = items[2];
      // en el teléfono la ficha va a la izquierda para dejar ver la bahía a la derecha
      fx = F.W <= 600 ? F.pad : Math.max(F.pad, Math.min(F.W - 84 - cw, P.x - cw * 0.62));
      fyM = F.lite ? P.y + 24 : Math.max(gu.ly + gu.th, P.y + 20) + 18;
      found.style.width = '';
    } else {
      const cEl = stage.querySelector('.copy'), cr = cEl ? cEl.getBoundingClientRect().right - stage.getBoundingClientRect().left : 0;
      fx = Math.max(cr + 24, Math.min(P.x - 190, F.W - 112 - 344));
      found.style.width = Math.min(344, F.W - 16 - fx) + 'px';
    }
    const fy = mobile() ? fyM : Math.min(P.y + drop, F.H - (found.offsetHeight || 140) - 28);
    found.style.left = fx + 'px'; found.style.top = fy + 'px';
    const down = mkWire(P.x, P.y + 9, P.x, fy); down.classList.add('down');
    down.style.strokeDasharray = fy - P.y; down.style.strokeDashoffset = fy - P.y;
    if (tagsOff()) down.style.display = 'none';
    wires.appendChild(down); P.down = down;
  }

  // ── la historia de las búsquedas: corre una sola vez, la primera vez que el mapa llega a Houston ──
  let storyT0 = 0, storyDone = false, storyOn = false;
  const STORY_MS = 2400;
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
      const p = Math.min(1, T / 440), e = 1 - Math.pow(1 - p, 3);
      const ox = houstonPx[0] - it.lx - 60, oy = houstonPx[1] - it.ly - 20;
      const bend = Math.sin(Math.PI * e) * (it.i % 2 ? -70 : 70);
      it.tag.style.opacity = Math.min(1, p * 2.2);
      it.tag.style.transform = `translate(${ox * (1 - e) + bend * 0.4}px,${oy * (1 - e) - bend}px) scale(${0.82 + 0.18 * e})`;
      if (p >= 1) { const len = +it.line.style.strokeDasharray; const wp = Math.min(1, (T - 440) / 200); it.line.style.strokeDashoffset = Math.max(0, len * (1 - wp)); }
    });
    if (T > 720) { const P = items.find((it) => it.z.lit); P.pt.classList.add('lit'); P.tag.classList.add('lit'); P.line.classList.add('lit');
      const len = +P.down.style.strokeDasharray; const dp = Math.min(1, Math.max(0, (T - 840) / 380)); P.down.style.strokeDashoffset = Math.max(0, len * Math.pow(1 - dp, 3)); }
    if (T > 1180) found.classList.add('on');
    if (T > 1460) foundAi.classList.add('on');
  }

  // ── móvil: el texto se retira en cuanto empieza el viaje, para que el planeta tenga la pantalla entera ──
  const copyEl = stage.querySelector('.copy');
  function copyFade(c) {
    if (!copyEl) return;
    if (!F || !F.M) { ['--fb', '--ft'].forEach((k) => copyEl.style.removeProperty(k)); copyEl.style.transform = ''; copyEl.style.pointerEvents = ''; copyEl.inert = false; return; }
    const fb = smooth(0.003, 0.04, c), ft = smooth(0.012, 0.07, c);
    copyEl.style.setProperty('--fb', (1 - fb).toFixed(3));
    copyEl.style.setProperty('--ft', (1 - ft).toFixed(3));
    copyEl.style.transform = ft > 0 ? `translate3d(0,${(-40 * ft).toFixed(1)}px,0)` : '';
    copyEl.style.pointerEvents = ft > 0.5 ? 'none' : '';
    copyEl.inert = ft > 0.98;                            // invisible = sin foco ni toques
  }

  // ── un gesto dispara el viaje entero ──
  // En cuanto el visitante baja (un deslizamiento, un golpe de rueda, una flecha), el acercamiento corre COMPLETO
  // solo, sin ir atado al recorrido; mientras corre, la página se queda quieta para que se vea entero. Al volver
  // arriba del todo, el planeta se aleja solo. La historia de las búsquedas sigue al acercamiento.
  let cur = 0, target = 0, raf = 0, lastT = 0, anim = null;
  const cue = document.getElementById('hx-cue');
  const DUR_IN = () => (F && F.M ? 1350 : 1150), DUR_OUT = 850;
  const atTop = () => scrollY - pin.offsetTop <= 2;
  function goTo(to) {
    if (target === to) return;
    target = to;
    if (reduce) { cur = to; anim = null; }
    else anim = { from: cur, to, t0: performance.now(), dur: (to > cur ? DUR_IN() : DUR_OUT) * Math.max(0.25, Math.abs(to - cur)) };
    if (!raf) { lastT = 0; raf = requestAnimationFrame(tick); }
  }
  // la página se queda quieta mientras corre el acercamiento (rueda, dedo y teclado)
  let locked = false, lockY = 0, lockT = 0;
  function lock() { locked = true; lockY = scrollY; clearTimeout(lockT); lockT = setTimeout(unlock, DUR_IN() + 120); }
  function unlock() { locked = false; clearTimeout(lockT); }
  const DOWN_KEYS = new Set(['ArrowDown', 'PageDown', ' ', 'Spacebar', 'End']);
  function start(e) { if (e && e.cancelable) e.preventDefault(); if (cue) cue.classList.add('gone'); lock(); goTo(1); }
  addEventListener('wheel', (e) => {
    if (locked) { if (e.cancelable) e.preventDefault(); return; }
    if (!reduce && target === 0 && atTop() && e.deltaY > 0) start(e);
  }, { passive: false });
  let ty0 = null;
  addEventListener('touchstart', (e) => { ty0 = e.touches[0] ? e.touches[0].clientY : null; }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (locked) { if (e.cancelable) e.preventDefault(); return; }
    if (reduce || ty0 == null || target !== 0 || !atTop()) return;
    if (e.touches[0] && ty0 - e.touches[0].clientY > 2) start(e);        // el dedo sube: la página iba a bajar
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (locked && DOWN_KEYS.has(e.key)) { e.preventDefault(); return; }
    if (!reduce && target === 0 && atTop() && DOWN_KEYS.has(e.key) && !/input|textarea|select/i.test((e.target && e.target.tagName) || '')) start(e);
  });
  function tick(now) {
    lastT = now;
    if (anim) {
      const p = Math.min(1, (now - anim.t0) / anim.dur);
      cur = anim.from + (anim.to - anim.from) * p;                         // la curva la pone el propio viaje (state)
      if (p >= 1) { cur = anim.to; anim = null; if (cur === 1) unlock(); }
    }
    const zoomed = cur > 0.985;
    stage.classList.toggle('zoomed', zoomed);
    copyFade(cur);
    if (cur > 0.02 && cue) cue.classList.add('gone');
    let ping = 0;
    if (zoomed && !storyOn && !storyDone) { storyOn = true; storyT0 = now; }
    if (storyOn) {
      const T = now - storyT0;
      story(T);
      ping = T > 1460 && T < 2380 ? (T - 1460) / 920 : 0;
      if (T > STORY_MS) { storyOn = false; storyDone = true; }
    }
    draw(cur, ping);
    if (anim || storyOn) raf = requestAnimationFrame(tick); else { raf = 0; lastT = 0; }
  }
  const ctabar = document.querySelector('[data-nav-ctabar]');
  function guardBar() {
    const pinned = scrollY < pin.offsetTop + pin.offsetHeight - innerHeight * 0.6;
    document.body.classList.toggle('hx-pinned', pinned);            // el globo del chat espera a que termine la portada
    if (ctabar && pinned) { ctabar.classList.remove('is-visible'); document.body.classList.remove('has-ctabar'); }
  }
  // al salir la portada, la ficha clara se funde antes de meterse bajo la barra (no queda una tira suelta)
  function exitFade() {
    if (!found.classList.contains('on')) return;
    const ex = scrollY - pin.offsetTop - (pin.offsetHeight - sticky.offsetHeight);
    if (ex <= 0) { if (found.dataset.xf) { found.style.opacity = ''; found.style.transition = ''; delete found.dataset.xf; } return; }
    const top = (parseFloat(found.style.top) || 0) - ex;
    found.dataset.xf = '1'; found.style.transition = 'none';
    found.style.opacity = Math.max(0, Math.min(1, (top - 72) / 110)).toFixed(3);
  }
  function onScroll() {
    // mientras corre el acercamiento, la inercia no mueve la página
    if (locked && Math.abs(scrollY - lockY) > 1) { scrollTo(0, lockY); return; }
    guardBar(); exitFade();
    if (target === 0 && !atTop()) {
      // se bajó sin rueda ni dedo (barra de desplazamiento, un enlace a una sección): el viaje corre igual, pero
      // la página NO se frena (un salto a una sección tiene que llegar a su sitio)
      if (cue) cue.classList.add('gone');
      goTo(1);
    } else if (target === 1 && atTop()) goTo(0);                            // arriba del todo: el planeta se aleja
  }


  function init() {
    setup(); layout(); lastWH = innerWidth + 'x' + sticky.clientHeight + '@' + devicePixelRatio;
    const h = location.hash;
    if (mobile() && (reduce || h === '#final')) {
      // móvil: la portada sigue fija; con movimiento reducido la historia sale entera al bajar, sin animación,
      // y con #final se empieza en la historia terminada. Al subir, el texto vuelve.
      storyDone = true; finalDom();
      cur = target = h === '#final' ? 1 : (atTop() ? 0 : 1);
      stage.classList.toggle('zoomed', cur > 0.985); copyFade(cur); draw(cur, 0); canvas.classList.add('ready');
      if (cue) cue.classList.add('gone');
      addEventListener('scroll', onScroll, { passive: true }); guardBar();
      return;
    }
    if (reduce || h === '#final') {
      pin.classList.add('hero-pin--static');
      cur = target = 1; storyDone = true; stage.classList.add('zoomed'); finalDom(); copyFade(1); draw(1, 0); canvas.classList.add('ready');
      if (cue) cue.classList.add('gone');
      return;
    }
    cur = target = atTop() ? 0 : 1;                                  // si la página se abre ya bajada, el viaje está hecho
    if (cur > 0.985) { storyDone = true; stage.classList.add('zoomed'); finalDom(); if (cue) cue.classList.add('gone'); }
    copyFade(cur); draw(cur, 0);
    requestAnimationFrame(() => canvas.classList.add('ready'));
    addEventListener('scroll', onScroll, { passive: true });
    guardBar();
  }
  window.__hero = { get cur() { return cur; }, get target() { return target; }, get storyDone() { return storyDone; }, draw: (t) => draw(t, 0) };
  // el globo detallado (solo escritorio) sustituye al ligero cuando llega
  window.addEventListener('hx-geo50', () => { land110 = landGlobal(); draw(cur, 0); });
  let lastWH = '';
  addEventListener('resize', () => {
    // en el teléfono, la barra del navegador que aparece y se esconde no cambia la portada: no se redibuja
    const wh = innerWidth + 'x' + sticky.clientHeight + '@' + devicePixelRatio; if (wh === lastWH) return; lastWH = wh;
    setup(); layout();
    if (reduce) {
      const m = mobile();
      pin.classList.toggle('hero-pin--static', !m);
      storyOn = false; storyDone = true; finalDom();
      cur = target = m ? (atTop() ? 0 : 1) : 1;
      stage.classList.toggle('zoomed', cur > 0.985);
    } else {
      if (storyDone || storyOn) { storyOn = false; storyDone = true; finalDom(); }
    }
    copyFade(cur); draw(cur, 0);
  });
  init();
  // las etiquetas se recolocan cuando llegan las fuentes (cambian de ancho)
  document.fonts && document.fonts.ready.then(() => { setup(); layout(); if (storyDone) finalDom(); copyFade(cur); draw(cur, 0); });
}
