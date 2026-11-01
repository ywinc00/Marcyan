import { geoOrthographic, geoPath, geoInterpolate, geoDistance } from 'd3-geo';
// Portada de Houston: UN gesto (un golpe de rueda, un deslizamiento, una flecha) dispara el viaje entero del planeta
// hasta Houston; la página espera quieta mientras dura y al volver arriba del todo el planeta se aleja solo.
// Vuelta 13 (2026-10-31, "tirones" y "nodos que aparecen de la nada"):
//  · una sola curva de tiempo para todo el viaje (sin paradas a mitad ni cortes de giro), medida canal por canal;
//  · el mapa solo proyecta lo que se ve (descarte por casquete + recorte al disco, directo a Path2D, sin cadenas);
//  · los puntos nacen sobre el mapa mientras aún se acerca, pegados a su sitio, y la historia (hilos, etiquetas,
//    búsqueda encendida, ficha) corre con transiciones CSS en el compositor; el lienzo deja de dibujarse al llegar.
export function initHero(GEO, C) {
  const GOLD = '#dcc089', TEAL = '#4fc3a1';
  // la ciudad del hub (cities.js): su centro, sus cuatro zonas y el encuadre del acercamiento
  const HOUSTON = C.center;                          // (nombre histórico: es el centro de la ciudad, sea cual sea)
  const ZONES_POS = C.zones;
  const pin = document.getElementById('hx-hero-pin'), sticky = document.getElementById('hx-hero-sticky'), stage = document.getElementById('hx-stage');
  if (!pin || !stage) return;
  // nombres y búsquedas vienen del idioma de la página (data-pins); la posición es diseño
  const ZONES = JSON.parse(stage.dataset.pins || '[]').map((z, i) => Object.assign({}, ZONES_POS[i], z));
  // por debajo de 900 px la portada se compone en vertical (texto arriba, planeta abajo)
  // teléfono en horizontal (poca altura): composición en horizontal, sin etiquetas (la búsqueda va en la ficha)
  const mobile = () => innerWidth < 900 && innerHeight >= 520;
  // por debajo de 520 px de alto, siempre sin etiquetas; por encima, en escritorio, se decide al colocar (si caben)
  const tagsOff = () => innerHeight < 520;
  let isM = mobile(), noTags = tagsOff();            // se fijan en setup(): nunca se leen dentro del dibujo
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const copyEl = stage.querySelector('.copy');
  const found = document.getElementById('hx-found'), foundAi = document.getElementById('hx-found-ai');
  const pinsBox = document.getElementById('hx-pins');

  function frames() {
    // el texto puede estar retirado (16 px hacia arriba): se mide en su sitio
    const lift = !reduce && copyEl && copyEl.classList.contains('away') ? 16 : 0;
    if (isM) {
      const W = sticky.clientWidth || innerWidth, H = sticky.clientHeight || innerHeight;
      // Houston queda justo debajo del texto (lo mide: el inglés ocupa más) y la ficha cabe entera debajo
      const copy = copyEl;
      // pantallas cortas: al acercarse, el párrafo de entrada se recoge para dejar sitio a la historia
      const short = H < 760; stage.classList.toggle('short', short);
      const lead = copy && copy.querySelector('.lead');
      let cb = copy ? copy.getBoundingClientRect().bottom + lift - stage.getBoundingClientRect().top : H * 0.62;
      if (short && lead && !stage.classList.contains('zoomed')) cb -= lead.scrollHeight + 16;
      const sr = stage.getBoundingClientRect();
      const Ra = Math.min(W * 0.44, H * 0.24, 260);
      // al empezar, el planeta asoma por debajo de TODO el texto (nunca detrás del teléfono ni del botón)
      const full = copy ? copy.getBoundingClientRect().bottom + lift - sr.top : H * 0.62;
      const pad = copy ? Math.max(16, copy.getBoundingClientRect().left - sr.left) : 20, navH = 64;
      // la historia ocupa la franja entre la barra y el botón del chat; la escala del mapa sale de lo que cabe:
      // de alto (etiquetas arriba, ficha abajo) y de ancho: de Katy (44 km al oeste) hasta que asome la bahía de
      // Galveston (36 km al este), que es lo que dice "esto es Houston" igual que en escritorio
      const th = W <= 600 ? 52 : 60, cardH = found.offsetHeight || 130;
      const band = H - navH - 14 - 24;
      let kmpx, up, down, lite, xh, bandUse = band;
      if (C.mobile === 'miami') {
        // la ficha va a la derecha (bajo Miami Beach): termina por encima del botón del chat
        bandUse = band - 66;
        // Miami: Hialeah arriba (10,7 km al norte), Miami Beach encendida a la derecha (6,2 km al este) con su
        // etiqueta encima, Doral (16,2 km al oeste) y Kendall (9,2 km al sur) con la etiqueta debajo, y la ficha al
        // final. Todo cabe en 22,4 km de ancho y 19,9 km de alto: el acercamiento llega mucho más cerca que en Houston.
        const kW = (W - 2 * pad - 48) / 22.4;
        const kFit = (bandUse - (30 + th) - (30 + th + 18 + cardH)) / 19.9;
        lite = Math.min(kFit, kW) < 5;                                 // teléfonos bajos: solo la búsqueda encendida
        if (!lite) {
          kmpx = Math.min(13, kFit, kW);
          up = 10.7 * kmpx + 30 + th; down = 9.2 * kmpx + 30 + th + 18 + cardH;
        } else {
          kmpx = Math.max(4, Math.min(11, kW, (bandUse - 54 - cardH - 30 - th) / 13.9));
          up = Math.max(10.7 * kmpx + 16, 3.2 * kmpx + 30 + th); down = 9.2 * kmpx + 24 + cardH;
        }
        // la franja de las zonas centrada en la pantalla, sin que Doral ni la etiqueta de Miami Beach se salgan
        xh = Math.max(pad + 22 + 16.2 * kmpx, Math.min(W - pad - 30 - 6.2 * kmpx, W / 2 + 5 * kmpx));
      } else {
        const kW = (W - 2 * pad - 70) / 80;
        // cuatro etiquetas: The Woodlands arriba, Katy y Pasadena en escalera entre los puntos, Gulfton (a veces en dos
        // líneas) abajo y la ficha al final. La escalera necesita 52,8 km de alto entre The Woodlands y Pasadena.
        const kFit = (band - (30 + th + 34 + (th + 22) + 18 + cardH)) / 49.8, kStair = (2 * th + 16 + 36) / 52.8;
        lite = Math.min(kFit, kW) < Math.max(2.2, kStair);             // teléfonos bajos: solo la búsqueda encendida
        if (!lite) {
          kmpx = Math.min(5.2, kFit, kW);
          up = 45.1 * kmpx + 30 + th; down = Math.max(4.7 * kmpx + 34 + th + 22, 7.7 * kmpx + 20) + 18 + cardH;
        } else {
          kmpx = Math.max(1.9, Math.min(4.5, kW, (band - 54 - cardH) / 52.8));
          up = Math.max(45.1 * kmpx + 16, 30 + th - 7.7 * kmpx); down = 7.7 * kmpx + 38 + cardH;
        }
        xh = Math.max(pad + 20 + 44 * kmpx, Math.min(W - 70 - 36 * kmpx, W / 2 - 10 * kmpx));
      }
      const yh = navH + 14 + up + Math.max(0, (bandUse - up - down) / 2);
      // la lente llena la pantalla: de la barra hasta pasado el borde de abajo (se ven solo sus curvas)
      const Rb = (H - navH) / 2 + 20, cyB = (navH + H) / 2;
      // el satélite termina en el borde derecho de la pantalla, como en escritorio (no junto a los puntos)
      const rot = -18 * Math.PI / 180, rx = Rb * 1.4, ry = Rb * 0.35;
      let satA = 150;
      for (let a = 100; a <= 150; a++) { const r = a * Math.PI / 180; if (W / 2 - rx * Math.cos(r) * Math.cos(rot) - ry * Math.sin(r) * Math.sin(rot) >= W - 18) { satA = a; break; } }
      // un solo trayecto de A a B: el planeta sube desde debajo del texto y crece a la vez (antes subía, se paraba
      // y luego crecía: esa parada era el tirón del móvil)
      return {
        W, H, pad, lite, satA,
        A: { cx: W * 0.62, cy: Math.max(H * 0.86, full + 20 + Ra), R: Ra, center: C.start },
        B: { cx: W / 2, cy: cyB, R: Rb, target: [xh, yh], kmpx },
      };
    }
    // Escritorio, a pantalla completa: el texto va alineado con la barra (contenedor del sitio) y el planeta
    // se ancla al borde derecho de la ventana, con aire de sobra entre los dos (ya no hay caja central escalada).
    const W = sticky.clientWidth, H = sticky.clientHeight;
    const sr = stage.getBoundingClientRect();
    const copyRight = copyEl ? copyEl.getBoundingClientRect().right - sr.left : W * 0.45;
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
      A: { cx, cy, R, center: C.start },
      B: { cx: cx + R * 0.567, cy: cy + R * 0.167, R: R * 1.333, target: [cx + R * C.desk.target[0], cy + R * C.desk.target[1]], kmpx: C.desk.kmpx * k },
    };
  }

  const canvas = document.getElementById('hx-globe');
  const ctx = canvas.getContext('2d');
  let F, dpr, goAt = 0.93;
  const landGlobal = () => ({ type: 'MultiPolygon', coordinates: !isM && GEO.land50 ? GEO.land50 : GEO.land110 });
  let land110 = landGlobal();
  // detalle de la costa del área y contorno del estado (Houston: tx10 y texas; las ciudades nuevas: detail y state)
  const land10 = { type: 'MultiPolygon', coordinates: GEO.detail || GEO.tx10 };
  const texas = { type: 'MultiPolygon', coordinates: GEO.state || GEO.texas };
  // casquete de cada polígono (centro y radio angular): permite no proyectar lo que cae fuera de lo visible
  const D = Math.PI / 180, capsCache = new Map();
  function capsOf(coords) {
    if (capsCache.has(coords)) return capsCache.get(coords);
    const out = coords.map((poly) => {
      let x = 0, y = 0, z = 0;
      for (const [l, p] of poly[0]) { const cp = Math.cos(p * D); x += cp * Math.cos(l * D); y += cp * Math.sin(l * D); z += Math.sin(p * D); }
      const c = [Math.atan2(y, x) / D, Math.atan2(z, Math.hypot(x, y)) / D];
      let r = 0; for (const pt of poly[0]) r = Math.max(r, geoDistance(c, pt));
      return { poly, c, r };
    });
    capsCache.set(coords, out); return out;
  }
  function visibleLand(s) {
    const C = capsOf(land110.coordinates), keep = [];
    for (const q of C) if (geoDistance(q.c, s.center) - q.r < s.vis + 0.02) keep.push(q.poly);
    return { type: 'MultiPolygon', coordinates: keep };
  }
  const DUR_IN = () => (isM ? 1350 : 1150), DUR_OUT = 850;

  function setup() {
    isM = mobile(); noTags = tagsOff();
    F = frames();
    land110 = landGlobal();
    const A = F.A, B = F.B;
    F.SB = 6371 * B.kmpx; F.lnZ = Math.log(F.SB / A.R); F.c0 = [A.center[0] + 1.6, A.center[1]];
    F.H0 = geoOrthographic().rotate([-F.c0[0], -F.c0[1]]).scale(A.R).translate([A.cx, A.cy]).clipAngle(90)(HOUSTON);
    // el desvanecido de abajo va dentro del propio lienzo (una máscara CSS encima obligaba a recomponerlo cada fotograma)
    F.fade = innerWidth >= 900 ? 140 : innerHeight >= 520 ? 110 : 0;
    goAt = 1 - 80 / DUR_IN();                          // la historia arranca 80 ms antes de posarse (residuo < 1 px)
    dpr = Math.min(isM ? 2 : 1.75, window.devicePixelRatio || 1); patCache.clear();
    // el lienzo es la ventana entera (CSS 100 % × 100 %): el planeta y su brillo nunca se cortan
    canvas.width = Math.round(F.W * dpr); canvas.height = Math.round(F.H * dpr);
    // el resplandor dorado del fondo sigue al planeta
    const cueEl = document.getElementById('hx-cue');
    if (cueEl && copyEl) { cueEl.hidden = false; cueEl.hidden = cueEl.getBoundingClientRect().top < copyEl.getBoundingClientRect().bottom + 24; }
    stage.style.setProperty('--pcx', A.cx + 'px'); stage.style.setProperty('--pcy', A.cy + 'px'); stage.style.setProperty('--pr', A.R + 'px');
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
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  // UNA curva de tiempo para todos los canales: velocidad en campana (pico a un tercio, 1,8 veces la media), arranca en
  // el mismo fotograma del gesto (4 % a los 100 ms) y llega frenando suave. Sin codos: es infinitamente suave.
  const ezoom = (u) => { u = clamp01(u); return u * u * (6 - 8 * u + 3 * u * u); };

  function state(u) {
    const e = ezoom(u), A = F.A, B = F.B, SB = F.SB;
    const cx = lerp(A.cx, B.cx, e), cy = lerp(A.cy, B.cy, e), R = lerp(A.R, B.R, e);
    // lente: el mapa crece desde el tamaño del planeta; en el móvil empieza algo después (primero sube el planeta)
    const S = R * Math.pow(SB / B.R, isM ? Math.pow(e, 1.5) : e);
    // el giro hacia Houston se reparte según lo que cuesta en pantalla: nunca pelea con el zoom ni se corta en seco
    const r = clamp01(1 - (1 - e) * A.R / S);
    const center = geoInterpolate(F.c0, HOUSTON)(r);
    const proj = geoOrthographic().rotate([-center[0], -center[1]]).scale(S).translate([0, 0]).clipAngle(90);
    const f = proj(HOUSTON);
    // Houston va pegado al planeta mientras este se mueve y se desliza en línea recta hasta su sitio final
    const k = clamp01((1 - R / S) / (1 - B.R / SB)), w = Math.pow(k, 0.3);
    const hx = lerp(cx + f[0] * R / S, lerp(F.H0[0], B.target[0], e), w), hy = lerp(cy + f[1] * R / S, lerp(F.H0[1], B.target[1], e), w);
    const tx = hx - f[0], ty = hy - f[1];
    proj.translate([tx, ty]).precision(isM ? 1 : 0.5)
      .clipExtent([[Math.max(-2, cx - R - 4), Math.max(-2, cy - R - 4)], [Math.min(F.W + 2, cx + R + 4), Math.min(F.H + 2, cy + R + 4)]]);
    // radio angular de lo que se ve dentro del disco
    const vis = Math.asin(Math.min(1, (Math.hypot(tx - cx, ty - cy) + R) / S));
    return { cx, cy, R, S, proj, center, vis, zoom: S / R, e, zf: Math.log(S / A.R) / F.lnZ };
  }
  function ringGeo(s) { const e = s.e; return { rx: s.R * lerp(1.2, 1.4, e), ry: s.R * lerp(0.27, 0.35, e), rot: lerp(-13, -18, e) * Math.PI / 180 }; }
  function ringPath(c, s, half) {
    const g = ringGeo(s);
    c.save(); c.translate(s.cx, s.cy); c.rotate(g.rot);
    c.beginPath(); c.ellipse(0, 0, g.rx, g.ry, 0, half === 'back' ? Math.PI : 0, half === 'back' ? Math.PI * 2 : Math.PI); c.restore();
  }
  function satAt(s) {
    const a = (F.satA ? lerp(100, F.satA, s.e) : 100) * Math.PI / 180, g = ringGeo(s);
    const px = -g.rx * Math.cos(a), py = g.ry * Math.sin(a);
    return [s.cx + px * Math.cos(g.rot) - py * Math.sin(g.rot), s.cy + px * Math.sin(g.rot) + py * Math.cos(g.rot)];
  }
  // dibuja directamente en un Path2D (sin construir ni parsear una cadena por fotograma)
  const pathOf = (proj, geo) => { const P = new Path2D(); geoPath(proj, P)(geo); return P; };

  function draw(u) {
    const s = state(u);
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
    // la textura de la tierra va atada al acercamiento (no al reloj): puntos que crecen → relleno sólido
    const grow = smooth(0.18, 0.93, s.zf), solid = smooth(0.74, 0.98, s.zf), dotsA = 1 - smooth(0.86, 1, s.zf);
    const P50 = hi < 1 ? pathOf(s.proj, visibleLand(s)) : null;
    const P10 = hi > 0 ? pathOf(s.proj, land10) : null;
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
      ctx.globalAlpha = tx; ctx.strokeStyle = 'rgba(226,207,164,.85)'; ctx.lineWidth = 1.2; ctx.stroke(pathOf(s.proj, texas));
      ctx.restore(); ctx.globalAlpha = 1;
    }
    const rim = ctx.createLinearGradient(s.cx - s.R, s.cy - s.R, s.cx + s.R * 0.4, s.cy + s.R * 0.4);
    rim.addColorStop(0, 'rgba(226,207,164,.85)'); rim.addColorStop(0.45, 'rgba(200,169,110,.25)'); rim.addColorStop(1, 'rgba(200,169,110,0)');
    ctx.strokeStyle = rim; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(s.cx, s.cy, s.R - 0.8, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4.6; ctx.strokeStyle = 'rgba(8,7,5,.42)'; ringPath(ctx, s, 'front'); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(214,186,128,.95)'; ringPath(ctx, s, 'front'); ctx.stroke();
    const [sx, sy] = satAt(s);
    ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(sx, sy, isM ? 7 : 9, 0, Math.PI * 2); ctx.fill();
    if (F.fade) {
      ctx.globalCompositeOperation = 'destination-out';
      const fg = ctx.createLinearGradient(0, F.H - F.fade, 0, F.H); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = fg; ctx.fillRect(0, F.H - F.fade, F.W, F.fade);
      ctx.globalCompositeOperation = 'source-over';
    }
    return s;
  }

  // ── puntos, etiquetas, hilos y ficha en su sitio final (los hilos son piezas del DOM que crecen en el compositor) ──
  const oldWires = document.getElementById('hx-wires'); if (oldWires) oldWires.remove();
  let items = [], P = null, downEl = null, satEl = null, tBirth = 0.6, isBorn = false;
  function mkWire(x, y1, y2, cls) {
    // hilo vertical que crece desde y1 (su punto) hacia y2
    const el = document.createElement('span'); el.className = 'wr' + (cls ? ' ' + cls : ''); el.innerHTML = '<i></i>';
    el.style.left = x + 'px'; el.style.top = Math.min(y1, y2) + 'px'; el.style.height = Math.abs(y2 - y1) + 'px';
    el.style.transformOrigin = y2 < y1 ? '50% 100%' : '50% 0';
    pinsBox.appendChild(el); return el;
  }
  const ms = (el, k, v) => el && el.style.setProperty(k, Math.round(v) + 'ms');
  function layout(pass = 0) {
    pinsBox.innerHTML = ''; items = []; isBorn = false;
    const s = state(1);
    ZONES.forEach((z, i) => {
      const [x, y] = s.proj(z.at);
      const pt = document.createElement('span'); pt.className = 'pt'; pt.style.left = x + 'px'; pt.style.top = y + 'px'; pt.innerHTML = '<b></b><b></b><i></i>';
      pinsBox.appendChild(pt);
      const tag = document.createElement('span'); tag.className = 'tag';
      const lg = z.lang || (z.en ? 'en' : '');
      tag.innerHTML = `<small>${z.name}</small><span${lg ? ` lang="${lg}"` : ''}>${z.q}${z.en ? ' <span class="en">EN</span>' : ''}</span>`;
      pinsBox.appendChild(tag);
      items.push({ z, pt, tag, x, y, i, side: z.side, th: 50, tr: '' });
    });
    if (noTags) items.forEach((it) => { it.lx = -999; it.ly = -999; it.hide = true; });
    else if (!isM) {
      // borde derecho real del texto de la portada: ninguna etiqueta se acerca a menos de 24 px
      const sl = stage.getBoundingClientRect().left;
      const txR = copyEl ? Math.max(0, ...[...copyEl.children].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 1 && r.height > 1).map((r) => r.right - sl)) : 0;
      items.forEach((it) => {
      const tw = it.tag.offsetWidth || 200;
      it.lx = Math.max(it.x - tw + 22, Math.min(it.x - 22, it.x + it.z.dx));
      it.lx = Math.max(16, Math.min(F.W - 16 - tw, it.lx));
      // si apartarla del texto deja su punto fuera de ella, las etiquetas no caben (se decide al colocar la ficha)
      if (it.lx < txR + 24) { it.lx = txR + 24; it.off = it.lx > it.x - 22; }
      it.ly = it.side === 'up' ? it.y - it.z.wire - it.th : it.y + it.z.wire;
      });
    }
    else {
      const cx = (l, w) => Math.max(F.pad, Math.min(F.W - F.pad - w, l));
      items.forEach((it) => { it.tw = it.tag.offsetWidth; it.th = it.tag.offsetHeight || 52; });
      // parte una etiqueta en dos líneas equilibradas y ajusta la caja a la línea más larga (sin hueco a la derecha)
      const wrap = (it, maxW) => {
        it.tag.style.maxWidth = Math.max(120, maxW) + 'px'; it.tag.style.whiteSpace = 'normal';
        const tr = it.tag.getBoundingClientRect(), cs = getComputedStyle(it.tag), rg = document.createRange();
        rg.selectNodeContents(it.tag.querySelector('span'));
        const right = Math.max(it.tag.querySelector('small').getBoundingClientRect().right, ...[...rg.getClientRects()].map((r) => r.right));
        it.tag.style.width = Math.ceil(right - tr.left + parseFloat(cs.paddingRight) + 2) + 'px';
        it.tw = it.tag.offsetWidth; it.th = it.tag.offsetHeight;
      };
      if (C.mobile === 'miami') {
        // móvil, Miami: Hialeah arriba; Miami Beach (la búsqueda encendida) encima de su punto, a la derecha y sin tapar
        // el punto de Hialeah; Doral y Kendall con la etiqueta debajo, siempre a la izquierda del hilo que baja de
        // Miami Beach a la ficha.
        const [hi, dor, ke, mb] = items;
        if (F.lite) {
          [hi, dor, ke].forEach((it) => { it.lx = it.ly = -999; it.hide = true; });
          mb.side = 'up'; mb.lx = cx(mb.x + 22 - mb.tw, mb.tw); mb.ly = mb.y - 30 - mb.th;
        } else {
          hi.side = 'up'; hi.lx = cx(hi.x - hi.tw / 2, hi.tw); hi.ly = hi.y - 30 - hi.th;
          const minL = hi.x + 18;
          mb.side = 'up'; mb.lx = Math.max(minL, cx(mb.x + 22 - mb.tw, mb.tw));
          if (mb.lx + mb.tw > F.W - F.pad || mb.lx > mb.x - 14) {
            wrap(mb, F.W - F.pad - minL);
            mb.lx = Math.max(minL, Math.min(F.W - F.pad - mb.tw, mb.x + 22 - mb.tw));
          }
          mb.ly = mb.y - 30 - mb.th;
          // si la de Miami Beach sube hasta la de Hialeah, la de Hialeah sube lo justo
          if (mb.ly < hi.ly + hi.th + 10 && mb.lx < hi.lx + hi.tw) hi.ly = mb.ly - 10 - hi.th;
          const maxR = mb.x - 14;
          [dor, ke].forEach((it) => {
            it.side = 'down';
            const l0 = Math.max(F.pad, it.x - 22);
            if (l0 + it.tw > maxR) wrap(it, maxR - l0);
            it.lx = Math.max(F.pad, Math.min(l0, maxR - it.tw)); it.ly = it.y + 30;
          });
        }
      } else {
      // móvil: The Woodlands arriba; Katy debajo de ese punto, a la izquierda; Pasadena debajo de Katy, a la derecha;
      // Gulfton debajo del grupo. Cada hilo sale de su punto y ninguno cruza otra etiqueta.
      const [wd, ka, gu, pa] = items;
      if (F.lite) {
        // teléfono bajo: los cuatro puntos y solo la búsqueda encendida (Pasadena) con su ficha
        [wd, ka, gu].forEach((it) => { it.lx = it.ly = -999; it.hide = true; });
        pa.side = 'up'; pa.lx = cx(pa.x + 22 - pa.tw, pa.tw); pa.ly = Math.min(pa.y - 30 - pa.th, ka.y - 14 - pa.th);
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
    }
    // escritorio: dos etiquetas del mismo lado que se tocan se separan alargando el hilo de la que va por fuera
    if (!isM && !noTags) for (let n = 0; n < 2; n++) items.forEach((a) => items.forEach((b) => {
      if (a === b || a.side !== b.side) return;
      const g = 8, ah = a.tag.offsetHeight, bh = b.tag.offsetHeight;
      if (!(a.lx < b.lx + b.tag.offsetWidth + 2 && b.lx < a.lx + a.tag.offsetWidth + 2)) return;   // una encima de otra
      if (a.side === 'up' && a.y < b.y && a.ly + ah + g > b.ly) a.ly = b.ly - g - ah;
      if (a.side !== 'up' && a.y > b.y && b.ly + bh + g > a.ly) a.ly = b.ly + bh + g;
    }));
    items.forEach((it) => {
      it.tag.style.left = it.lx + 'px'; it.tag.style.top = it.ly + 'px';
      it.tag.classList.toggle('dn', it.side === 'down');
      if (it.hide) { it.tag.hidden = true; return; }
      it.line = mkWire(it.x, it.y, it.side === 'up' ? it.ly + it.th : it.ly, '');
    });
    P = items.find((it) => it.z.lit);
    [P.pt, P.tag, P.line].forEach((el) => el && el.classList.add('lz'));
    const fq = document.getElementById('hx-found-q');
    if (fq) { const sp = fq.querySelector('span'); sp.textContent = P.z.q; if (P.z.lang || P.z.en) sp.lang = P.z.lang || 'en'; else sp.removeAttribute('lang'); fq.hidden = !noTags; }
    // la ficha cuelga del punto encendido y cabe entera en pantalla, también en portátiles de poca altura
    const drop = Math.min(200, Math.max(120, F.H * 0.22));
    // nunca encima del texto: si no cabe a su lado, la ficha se estrecha (teléfono en horizontal)
    let fx = 20, fyM = 0;
    if (isM) {
      const cw = found.offsetWidth || 284, gu = items[2];
      // en el teléfono la ficha va a la izquierda para dejar ver la bahía a la derecha
      fx = C.mobile === 'miami' ? Math.max(F.pad, Math.min(F.W - F.pad - cw, P.x - cw + 44))
        : F.W <= 600 ? F.pad : Math.max(F.pad, Math.min(F.W - 84 - cw, P.x - cw * 0.62));
      fyM = F.lite ? P.y + 24 : Math.max(gu.ly + gu.th, P.y + 20) + 18;
      found.style.width = '';
    }
    const cr = isM || !copyEl ? 0 : copyEl.getBoundingClientRect().right - stage.getBoundingClientRect().left;
    if (!isM) {
      fx = Math.max(cr + 24, Math.min(P.x - 190, F.W - 112 - 344));
      // en horizontal, sin pisar el botón del chat; nunca más estrecha de 280 px (si no cabe, se corre a la izquierda)
      const fw = Math.max(Math.min(280, F.W - 32), Math.min(344, F.W - (noTags ? 84 : 16) - fx));
      if (fx + fw > F.W - 16) fx = Math.max(16, F.W - 16 - fw);
      found.style.width = fw + 'px';
    }
    let fy = isM ? fyM : Math.min(P.y + drop, F.H - (found.offsetHeight || 140) - 28);
    if (!isM) {
      // la ficha no tapa ningún punto ni ninguna etiqueta: prueba su sitio, debajo de todo, a un lado (con el hilo
      // de Pasadena cayendo dentro) o encima; si nada cabe, debajo recortada a la pantalla
      const cw = found.offsetWidth || 344, ch = found.offsetHeight || 140, m = 12;
      const boxes = items.map((it) => [it.x - 9, it.y - 9, it.x + 9, it.y + 9]);
      if (!noTags) items.forEach((it) => { if (!it.hide) boxes.push([it.lx, it.ly, it.lx + it.tag.offsetWidth, it.ly + it.tag.offsetHeight]); });
      const hit = (x, y) => boxes.some(([a, b, c, d]) => c > x - m && a < x + cw + m && d > y - m && b < y + ch + m);
      const lo = Math.max(...boxes.map((b) => b[3])) + m, hiY = Math.min(...boxes.map((b) => b[1])) - m - ch;
      const okX = (x) => x >= Math.min(fx, cr + 16) && x + cw <= F.W - (noTags ? 84 : 16) && (noTags || (P.x >= x + 24 && P.x <= x + cw - 24));
      const okY = (y) => y >= 70 && y + ch <= F.H - 6;
      const cands = [[fx, fy], [fx, lo]];
      boxes.forEach((b) => cands.push([b[2] + m, fy], [b[0] - m - cw, fy]));
      if (noTags) cands.push([Math.max(...boxes.map((b) => b[2])) + 24, fy]);
      cands.push([fx, hiY]);
      const chatY = F.H - 96 - ch;
      cands.slice().forEach(([x]) => cands.push([x, chatY]));
      const clearChat = (x, y) => x + cw <= F.W - 84 || y + ch <= F.H - 96;
      const pick = cands.find(([x, y]) => okX(x) && okY(y) && clearChat(x, y) && !hit(x, y));
      if (pick) [fx, fy] = pick; else fy = Math.min(Math.max(fy, lo), F.H - ch - 6);
      // no cabe: si con etiquetas la ficha tapa algo, o dos etiquetas se tocan, o una se mete bajo la barra o tapa
      // otro punto, la portada va sin etiquetas (la búsqueda pasa a la ficha), como en las pantallas bajas
      if (!noTags && pass === 0) {
        const tb = items.map((it) => [it.lx, it.ly, it.lx + it.tag.offsetWidth, it.ly + it.tag.offsetHeight]);
        const over = (a, b, g) => a[2] + g > b[0] && b[2] + g > a[0] && a[3] + g > b[1] && b[3] + g > a[1];
        const clash = items.some((it) => it.off) || tb.some((a, i) => a[1] < 70 || a[3] > F.H - 6 || a[2] > F.W - 6 || tb.some((b, j) => j > i && over(a, b, 6))
          || items.some((it, j) => j !== i && over(a, [it.x - 7, it.y - 7, it.x + 7, it.y + 7], 0)));
        const cardOn = !pick && boxes.some(([a, b, c, d]) => c > fx && a < fx + cw && d > fy && b < fy + ch);
        if (clash || cardOn) { noTags = true; return layout(1); }
      }
      // sin etiquetas y la ficha sigue sin sitio: el grupo de zonas sube lo justo para que la ficha quepa debajo
      // de todos los puntos (sin meter el de arriba bajo la barra)
      if (noTags && !pick && pass < 2) {
        const ys = items.map((it) => it.y);
        const d = Math.min(Math.max(...ys) + 9 + m + 2 - (F.H - ch - 6), Math.min(...ys) - 9 - 78);
        if (d > 1) { F.B.target = [F.B.target[0], F.B.target[1] - d]; return layout(2); }
      }
    }
    found.style.left = fx + 'px'; found.style.top = fy + 'px';
    downEl = noTags ? null : mkWire(P.x, P.y + 9, fy, 'down');
    // el pulso del satélite es una pieza del DOM: el lienzo ya no se redibuja cuando el planeta llega
    const [sx, sy] = satAt(s);
    satEl = document.createElement('i'); satEl.className = 'satp'; satEl.style.left = sx + 'px'; satEl.style.top = sy + 'px';
    pinsBox.appendChild(satEl);
    // línea de tiempo de la historia (ms desde que arranca, 80 ms antes de que el mapa se pose): cada pieza entra
    // cuando la anterior va por el 60-85 %, escalonadas de 80 en 80 ms. Total ≈1,4 s.
    const vis = items.filter((it) => !it.hide);
    vis.forEach((it, i) => { ms(it.pt, '--d', i * 80); ms(it.line, '--d', i * 80); ms(it.tag, '--d', 120 + i * 80); });
    const lit = noTags ? 0 : 120 + vis.indexOf(P) * 80 + 200;
    const down = lit + 60, card = noTags ? 120 : down + 240, ai = card + 160;
    [P.pt, P.tag, P.line].forEach((el) => ms(el, '--dl', lit));
    ms(downEl, '--d', down); ms(found, '--d', card); ms(foundAi, '--d', ai); ms(satEl, '--d', ai);
    // los puntos nacen cuando ya se distinguen entre sí (28 px de separación mínima) y se posan con el propio zoom
    tBirth = 0.98;
    for (let n = 18; n <= 60; n++) {
      const st = state(n / 60), pts = ZONES.map((z) => st.proj(z.at));
      let m = Infinity; for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) m = Math.min(m, Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]));
      if (m >= 28) { tBirth = n / 60; break; }
    }
    tBirth = Math.min(tBirth, 1 - 420 / DUR_IN());
    it0();
  }
  function it0() { items.forEach((it) => { it.tr = ''; }); found.style.translate = ''; if (downEl) downEl.style.translate = ''; }
  // pega puntos, etiquetas, hilos y ficha a su sitio geográfico mientras el mapa aún se mueve
  function glue(s) {
    for (const it of items) {
      let v = '';
      if (s) {
        const p = s.proj(it.z.at), dx = p[0] - it.x, dy = p[1] - it.y;
        if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) v = dx.toFixed(2) + 'px ' + dy.toFixed(2) + 'px';
      }
      if (v === it.tr) continue;
      it.tr = v;
      it.pt.style.translate = v; it.tag.style.translate = v; if (it.line) it.line.style.translate = v;
      if (it === P) { if (downEl) downEl.style.translate = v; found.style.translate = v; }
    }
  }
  // estado de la historia: 'born' en los puntos, 'go' (con 'again' si ya se vio) y 'leaving' en el escenario
  let storyDone = false;
  function setBorn(b) { if (b === isBorn) return; isBorn = b; items.forEach((it) => it.pt.classList.toggle('born', b)); }
  let storyEnd = 0;
  function phase(goOk = true) {
    setBorn(cur >= tBirth);
    const go = goOk && cur >= 0.9999;
    const on = stage.classList.contains('go');
    if (go && !on) {
      stage.classList.remove('leaving'); stage.classList.toggle('again', storyDone);
      storyEnd = performance.now() + (storyDone ? 400 : 1900);           // mientras dura, nada se recoloca
      stage.classList.add('go');
      if (scrollY - pin.offsetTop < pin.offsetHeight - innerHeight * 0.6) storyDone = true;
    } else if (!go && on && cur < 0.9999) { stage.classList.remove('go', 'again'); stage.classList.add('leaving'); }
  }
  // el mismo estado sin animar (al cargar, al cambiar de tamaño, con movimiento reducido)
  function sync(beforeStory = false) {
    stage.classList.add('no-anim');
    isBorn = !(cur >= tBirth); setBorn(cur >= tBirth);
    const go = !beforeStory && cur >= goAt;
    stage.classList.toggle('go', go); stage.classList.toggle('again', go); stage.classList.remove('leaving');
    if (go) storyDone = true;
    copyAway(true);
    it0(); glue(cur > 0 && cur < 1 && isBorn ? state(cur) : null);
    void stage.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('no-anim')));
  }

  // ── móvil: el texto se retira en cuanto empieza el viaje (120 ms) y vuelve al final del alejamiento (200 ms) ──
  let away = false;
  function copyAway(force) {
    if (!copyEl) return;
    const a = isM && (target === 1 ? cur > 0.002 : cur > 0.24);
    if (a === away && !force) return;
    away = a;
    // invisible = sin foco ni toques; si el foco estaba en el texto, pasa a la ficha y vuelve al regresar
    if (a && copyEl.contains(document.activeElement)) { focusBack = document.activeElement; found.focus({ preventScroll: true }); }
    copyEl.classList.toggle('away', a); copyEl.inert = a;
    if (!a && focusBack) { if (document.activeElement === found || document.activeElement === document.body) focusBack.focus({ preventScroll: true }); focusBack = null; }
  }
  let focusBack = null;

  // ── un gesto dispara el viaje entero ──
  let cur = 0, target = 0, raf = 0, anim = null, pendingLayout = false, swapT = 0;
  const cue = document.getElementById('hx-cue');
  const atTop = () => scrollY - pin.offsetTop <= 2;
  function goTo(to) {
    if (target === to) return;
    target = to;
    if (reduce) {
      cur = to; anim = null;
      // sin viaje: el lienzo se funde al cambiar (nada de saltos en seco)
      canvas.classList.add('swap'); clearTimeout(swapT);
      swapT = setTimeout(() => {
        if (!raf) raf = requestAnimationFrame(tick);
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => canvas.classList.remove('swap'))));
      }, 160);
      return;
    }
    else anim = { from: cur, to, t0: null, dur: (to > cur ? DUR_IN() : DUR_OUT) * Math.max(0.25, Math.abs(to - cur)) };
    if (!raf) raf = requestAnimationFrame(tick);
  }
  // la página se queda quieta mientras corre el acercamiento (rueda, dedo y teclado), y la inercia que sigue al
  // gesto (panel táctil, dedo apoyado) tampoco la mueve mientras salen los nodos
  let locked = false, lockY = 0, lockT = 0, swallowWheel = false, lastWheel = -1e9, lastAbs = 0, unlockAt = 0, touchHold = false, lastCtrl = -1e9;
  function lock() { locked = true; lockY = scrollY; clearTimeout(lockT); lockT = setTimeout(unlock, DUR_IN() + 400); }
  function unlock() { if (locked) unlockAt = performance.now(); locked = false; clearTimeout(lockT); }
  const DOWN_KEYS = new Set(['ArrowDown', 'PageDown', ' ', 'Spacebar']);
  // los gestos dentro del chat, de un diálogo o del menú no son para la portada
  const foreign = (e) => e.target instanceof Element && !!e.target.closest('#mrc-chat, [role="dialog"], [aria-modal="true"], #nav-drawer');
  // un salto a una sección (enlace interno) siempre llega a su sitio
  addEventListener('click', (e) => { if (e.target instanceof Element && e.target.closest('a[href^="#"]')) { unlock(); swallowWheel = false; } }, true);
  addEventListener('hashchange', unlock);
  function start(e, kind) {
    if (e && e.cancelable) e.preventDefault();
    if (cue) cue.classList.add('gone');
    lock(); if (kind === 'wheel') swallowWheel = true; if (kind === 'touch') touchHold = true;
    goTo(1);
  }
  addEventListener('wheel', (e) => {
    if (e.ctrlKey) { lastCtrl = performance.now(); return; }               // zoom del navegador o pellizco
    if (foreign(e)) return;
    const t = e.timeStamp, a = Math.abs(e.deltaY);
    const inertia = swallowWheel && t - lastWheel < 160 && (performance.now() - unlockAt < 500 || a < lastAbs || (a <= lastAbs && a <= 4));
    if (locked || inertia) { if (e.cancelable) e.preventDefault(); lastWheel = t; lastAbs = a; return; }
    swallowWheel = false; lastWheel = t; lastAbs = a;
    if (!reduce && target === 0 && atTop() && e.deltaY > 0) start(e, 'wheel');
    else if (e.deltaY < 0) back();
  }, { passive: false });
  let ty0 = null;
  addEventListener('touchstart', (e) => { ty0 = e.touches.length === 1 && !foreign(e) ? e.touches[0].clientY : null; keepWarm(); }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (foreign(e) || e.touches.length > 1) { ty0 = null; return; }
    if (locked || touchHold) { if (e.cancelable) e.preventDefault(); return; }
    if (reduce || ty0 == null || !atTop() || !e.touches[0]) return;
    const dy = ty0 - e.touches[0].clientY;
    if (target === 0 && dy > 2) start(e, 'touch');                         // el dedo sube: la página iba a bajar
    else if (target === 1 && dy < -12) back();                              // el dedo baja estando arriba: se aleja
  }, { passive: false });
  const endTouch = () => { touchHold = false; };
  addEventListener('touchend', endTouch, { passive: true }); addEventListener('touchcancel', endTouch, { passive: true });
  addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || foreign(e)) return;
    // Espacio sobre un botón o un enlace es para ese botón
    if (e.key === ' ' && e.target instanceof Element && e.target.closest('button, [role="button"], summary, input, select, textarea')) return;
    if (locked && DOWN_KEYS.has(e.key)) { e.preventDefault(); return; }
    if (/input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
    if (!reduce && target === 0 && atTop() && DOWN_KEYS.has(e.key)) start(e, 'key');
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home') back();
  });
  function tick(now) {
    raf = 0;
    if (anim) {
      if (anim.t0 == null) anim.t0 = now;                                 // el reloj del viaje empieza en el primer fotograma
      const p = clamp01((now - anim.t0) / anim.dur);
      cur = anim.from + (anim.to - anim.from) * p;                         // la curva la pone el propio viaje (state)
      if (p >= 1) { cur = anim.to; anim = null; if (cur === 1) { unlock(); landed = true; } }
    }
    stage.classList.toggle('zoomed', cur > 0.985);
    copyAway();
    if (cur > 0.02 && cue) cue.classList.add('gone');
    const s = draw(cur);
    glue(cur > 0 && cur < 1 ? s : null);
    phase(!landed && !anim);
    if (landed) {
      landed = false; storyArming = true;
      // si algo pidió recolocar durante el viaje (fuentes, tamaño), se hace ahora, ANTES de que arranque la historia
      const relaid = pendingLayout; if (relaid) relayout(true);
      const startStory = () => {
        storyArming = false;
        if (!anim) phase();
        if (pendingGeo && !anim) { pendingGeo(); pendingGeo = null; }
        if (pendingLayout) requestRelayout();
      };
      // tras recolocar se espera a que se quite el modo sin animación (dos fotogramas) para que la historia se vea
      requestAnimationFrame(relaid ? () => requestAnimationFrame(() => requestAnimationFrame(startStory)) : startStory);
    } else if (!anim) {
      if (pendingGeo) { pendingGeo(); pendingGeo = null; }                // también si el viaje acaba alejándose
      if (pendingLayout) requestRelayout();
    }
    if (anim) raf = requestAnimationFrame(tick);
  }
  let landed = false, pendingGeo = null, storyArming = false;
  const ctabar = document.querySelector('[data-nav-ctabar]');
  function guardBar() {
    const pinned = scrollY < pin.offsetTop + pin.offsetHeight - innerHeight * 0.6;
    document.body.classList.toggle('hx-pinned', pinned);            // el globo del chat espera a que termine la portada
    if (ctabar && pinned) { ctabar.classList.remove('is-visible'); document.body.classList.remove('has-ctabar'); }
  }
  // al salir la portada, la ficha clara se funde antes de meterse bajo la barra (no queda una tira suelta)
  function exitFade() {
    if (!stage.classList.contains('go')) return;
    const ex = scrollY - pin.offsetTop - (pin.offsetHeight - sticky.offsetHeight);
    if (ex <= 0) { if (found.dataset.xf) { found.style.opacity = ''; found.style.transition = ''; delete found.dataset.xf; } return; }
    const top = (parseFloat(found.style.top) || 0) - ex;
    found.dataset.xf = '1'; found.style.transition = 'none';
    found.style.opacity = Math.max(0, Math.min(1, (top - 72) / 110)).toFixed(3);
  }
  function onScroll() {
    // mientras corre el acercamiento, la inercia no mueve la página
    if (locked && Math.abs(scrollY - lockY) > 1) { scrollTo({ top: lockY, behavior: 'instant' }); return; }
    guardBar(); exitFade();
    const up = scrollY < lastSY; lastSY = scrollY;
    if (locked) return;                                                     // nunca se invierte el viaje a mitad
    if (target === 0 && !atTop()) {
      // se bajó sin rueda ni dedo (barra de desplazamiento, un enlace a una sección): el viaje corre igual, pero
      // la página NO se frena (un salto a una sección tiene que llegar a su sitio)
      if (performance.now() - lastCtrl < 400) return;                    // el zoom del navegador no lanza el viaje
      if (cue) cue.classList.add('gone');
      goTo(1);
    } else if (target === 1 && atTop() && up) armBack();                    // se vuelve arriba del todo: el planeta se aleja
  }
  let backT = 0;
  function armBack() {
    cancelAnimationFrame(backT); let y = scrollY, n = 0;
    const f = () => { if (scrollY !== y) { y = scrollY; n = 0; } else n++; if (n >= 2) { if (target === 1 && atTop()) goTo(0); } else backT = requestAnimationFrame(f); };
    backT = requestAnimationFrame(f);
  }
  let lastSY = scrollY;
  // ya arriba del todo, el gesto contrario (rueda hacia arriba, dedo hacia abajo, flecha arriba) también lo aleja
  function back() { if (!reduce && !locked && target === 1 && cur === 1 && atTop()) goTo(0); }

  // ── calentar la GPU antes del gesto: sin el tirón del primer fotograma ni el de la primera vez que salen los nodos ──
  let warmT = -1e9;
  function keepWarm() {
    if (anim || target !== 0 || cur !== 0 || !atTop()) return;
    const now = performance.now(); if (now - warmT < 1500) return; warmT = now;
    let n = 0; const f = () => { if (anim) return; draw(cur); if (++n < 4) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  addEventListener('pointermove', keepWarm, { passive: true });
  function warm() {
    if (anim || cur !== 0) return;
    for (let g = 0; g <= 24; g++) dotsFor(g / 24);
    // varios estados del viaje en una sola tarea (solo se presenta el último): compila los sombreadores del lienzo
    [0.35, 0.6, 0.85, 1].forEach((t) => draw(t)); draw(cur);
    // dos fotogramas con las piezas de la historia casi transparentes: compila los suyos
    stage.classList.add('warm');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      stage.classList.add('no-anim'); stage.classList.remove('warm'); void stage.offsetWidth;
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('no-anim')));
    }));
  }
  const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 400));

  let rlT = 0;
  function requestRelayout() {
    clearTimeout(rlT);
    if (anim || storyArming) { pendingLayout = true; return; }
    const w = storyEnd - performance.now();
    if (w > 0) { pendingLayout = true; rlT = setTimeout(requestRelayout, w + 40); return; }
    relayout();
  }
  function relayout(beforeStory = false) {
    pendingLayout = false;
    setup(); layout();
    if (reduce) {
      pin.classList.toggle('hero-pin--static', !isM);
      storyDone = true; cur = target = isM ? (atTop() ? 0 : 1) : 1;
    }
    sync(beforeStory); draw(cur);
  }
  function init() {
    setup(); layout(); lastWH = innerWidth + 'x' + sticky.clientHeight + '@' + devicePixelRatio;
    const h = location.hash;
    if (isM && (reduce || h === '#final')) {
      // móvil: la portada sigue fija; con movimiento reducido la historia sale entera al bajar, sin viaje,
      // y con #final se empieza en la historia terminada. Al subir, el texto vuelve.
      storyDone = true;
      cur = target = h === '#final' ? 1 : (atTop() ? 0 : 1);
      sync(); draw(cur); canvas.classList.add('ready');
      if (cue) cue.classList.add('gone');
      addEventListener('scroll', onScroll, { passive: true }); guardBar();
      idle(warm);
      return;
    }
    if (reduce || h === '#final') {
      pin.classList.add('hero-pin--static');
      cur = target = 1; storyDone = true; sync(); draw(1); canvas.classList.add('ready');
      if (cue) cue.classList.add('gone');
      addEventListener('scroll', guardBar, { passive: true }); guardBar();
      return;
    }
    cur = target = atTop() ? 0 : 1;                                  // si la página se abre ya bajada, el viaje está hecho
    if (cur === 1) { storyDone = true; if (cue) cue.classList.add('gone'); }
    sync(); draw(cur);
    requestAnimationFrame(() => canvas.classList.add('ready'));
    addEventListener('scroll', onScroll, { passive: true });
    guardBar();
    idle(warm);
  }
  window.__hero = { get noTags() { return noTags; }, get cur() { return cur; }, get target() { return target; }, get storyDone() { return storyDone; }, get tBirth() { return tBirth; }, draw: (t) => draw(t),
    // para las pruebas: dónde caen en pantalla el planeta, Houston y las zonas en un instante t del viaje
    probe: (t) => { const s = state(t); return { cx: s.cx, cy: s.cy, R: s.R, S: s.S, houston: s.proj(HOUSTON), city: s.proj(HOUSTON), zones: ZONES.map((z) => s.proj(z.at)) }; } };
  // el globo detallado (solo escritorio) sustituye al ligero cuando llega; sus casquetes se preparan en un rato libre
  window.addEventListener('hx-geo50', () => idle(() => {
    const L = landGlobal(); capsOf(L.coordinates);
    const apply = () => { land110 = L; if (!anim) draw(cur); };
    if (anim) pendingGeo = apply; else apply();                    // nunca cambia el detalle de la costa a mitad del viaje
  }));
  let lastWH = '';
  addEventListener('resize', () => {
    // en el teléfono, la barra del navegador que aparece y se esconde no cambia la portada: no se redibuja
    const wh = innerWidth + 'x' + sticky.clientHeight + '@' + devicePixelRatio; if (wh === lastWH) return; lastWH = wh;
    if (anim || storyArming) { setup(); draw(cur); pendingLayout = true; return; }   // el lienzo ya; las piezas al posarse
    clearTimeout(rlT); relayout();                                  // en reposo o en plena historia: todo a su sitio al momento
  });
  init();
  // las etiquetas se recolocan cuando llegan las fuentes (cambian de ancho)
  document.fonts && document.fonts.ready.then(requestRelayout);
}
