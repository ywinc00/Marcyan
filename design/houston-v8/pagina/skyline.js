// Silueta de Houston para el pie: vista lejana desde el oeste (como desde el parque de Buffalo Bayou).
// Tres capas de profundidad (torres de fondo más claras, el centro oscuro, la línea de árboles delante),
// coronas reconocibles (JPMorgan Chase con la esquina cortada, Wells Fargo redondeada, Bank of America con gabletes,
// Heritage Plaza escalonada, las dos Pennzoil inclinadas) y Williams Tower a lo lejos, en Uptown.
// Ventanas encendidas dispersas, como de noche. Sin trazos dorados: es luz de ciudad, no un logotipo.
(function () {
  function seeded(s) { return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
  // x y w como fracción del ancho del centro; h como fracción de la torre más alta
  const DOWNTOWN0 = [
    { x: 0.00, w: 0.045, h: 0.30, c: 'flat' }, { x: 0.05, w: 0.040, h: 0.44, c: 'notch' },
    { x: 0.10, w: 0.050, h: 0.62, c: 'notch2' }, { x: 0.16, w: 0.030, h: 0.40, c: 'mast', m: 0.16 },
    { x: 0.20, w: 0.050, h: 0.55, c: 'setback' }, { x: 0.26, w: 0.060, h: 1.00, c: 'slant' },        // JPMorgan Chase Tower
    { x: 0.33, w: 0.055, h: 0.93, c: 'round' },                                                       // Wells Fargo Plaza
    { x: 0.395, w: 0.040, h: 0.72, c: 'flat' }, { x: 0.44, w: 0.040, h: 0.42, c: 'flat' },
    { x: 0.49, w: 0.060, h: 0.66, c: 'gables' },                                                      // Bank of America Center
    { x: 0.56, w: 0.035, h: 0.48, c: 'flat' }, { x: 0.60, w: 0.050, h: 0.78, c: 'notch' },
    { x: 0.66, w: 0.035, h: 0.55, c: 'flat' }, { x: 0.71, w: 0.050, h: 0.72, c: 'stepped' },         // Heritage Plaza
    { x: 0.77, w: 0.035, h: 0.46, c: 'mast', m: 0.12 },
    { x: 0.82, w: 0.035, h: 0.50, c: 'slopeL' }, { x: 0.86, w: 0.035, h: 0.50, c: 'slopeR' },        // Pennzoil Place
    { x: 0.91, w: 0.040, h: 0.36, c: 'flat' }, { x: 0.955, w: 0.045, h: 0.28, c: 'flat' },
  ];
  // más esbeltas: el ancho real de estas torres es 1/6 a 1/8 de su altura
  const DOWNTOWN = DOWNTOWN0.map((t) => Object.assign({}, t, { x: t.x + t.w * 0.18, w: t.w * 0.64 }));
  const BACK = [{ x: 0.07, w: 0.035, h: 0.50 }, { x: 0.135, w: 0.03, h: 0.38 }, { x: 0.23, w: 0.03, h: 0.46 }, { x: 0.30, w: 0.035, h: 0.62 }, { x: 0.425, w: 0.03, h: 0.54 },
    { x: 0.52, w: 0.04, h: 0.58 }, { x: 0.635, w: 0.03, h: 0.44 }, { x: 0.74, w: 0.04, h: 0.60 }, { x: 0.80, w: 0.025, h: 0.4 }, { x: 0.89, w: 0.035, h: 0.42 }];

  function tower(c, X, B, W, H, crown, mast) {
    c.beginPath();
    const T = B - H;
    switch (crown) {
      case 'slant': c.moveTo(X, B); c.lineTo(X, T); c.lineTo(X + W * 0.72, T); c.lineTo(X + W, T + W * 0.32); c.lineTo(X + W, B); break;
      case 'round': c.moveTo(X, B); c.lineTo(X, T + W * 0.5); c.quadraticCurveTo(X, T, X + W * 0.5, T); c.quadraticCurveTo(X + W, T, X + W, T + W * 0.5); c.lineTo(X + W, B); break;
      case 'gables': { c.moveTo(X, B); c.lineTo(X, T + H * 0.2); const g = W / 6;
        c.lineTo(X + g * 0.5, T + H * 0.2 - g * 0.9); c.lineTo(X + g, T + H * 0.2); c.lineTo(X + g, T + H * 0.1);
        c.lineTo(X + g * 1.5, T + H * 0.1 - g * 0.9); c.lineTo(X + g * 2, T + H * 0.1); c.lineTo(X + g * 2, T + g * 0.9);
        c.lineTo(X + g * 3, T); c.lineTo(X + g * 4, T + g * 0.9); c.lineTo(X + g * 4, T + H * 0.1);
        c.lineTo(X + g * 4.5, T + H * 0.1 - g * 0.9); c.lineTo(X + g * 5, T + H * 0.1); c.lineTo(X + g * 5, T + H * 0.2);
        c.lineTo(X + g * 5.5, T + H * 0.2 - g * 0.9); c.lineTo(X + W, T + H * 0.2); c.lineTo(X + W, B); break; }
      case 'stepped': { c.moveTo(X, B); const s = H * 0.035; c.lineTo(X, T + s * 3); c.lineTo(X + W * 0.12, T + s * 3); c.lineTo(X + W * 0.12, T + s * 2);
        c.lineTo(X + W * 0.24, T + s * 2); c.lineTo(X + W * 0.24, T + s); c.lineTo(X + W * 0.36, T + s); c.lineTo(X + W * 0.5, T - s * 0.6);
        c.lineTo(X + W * 0.64, T + s); c.lineTo(X + W * 0.76, T + s); c.lineTo(X + W * 0.76, T + s * 2); c.lineTo(X + W * 0.88, T + s * 2);
        c.lineTo(X + W * 0.88, T + s * 3); c.lineTo(X + W, T + s * 3); c.lineTo(X + W, B); break; }
      case 'slopeL': c.moveTo(X, B); c.lineTo(X, T + W * 0.9); c.lineTo(X + W, T); c.lineTo(X + W, B); break;
      case 'slopeR': c.moveTo(X, B); c.lineTo(X, T); c.lineTo(X + W, T + W * 0.9); c.lineTo(X + W, B); break;
      case 'notch': c.moveTo(X, B); c.lineTo(X, T + H * 0.06); c.lineTo(X + W * 0.3, T + H * 0.06); c.lineTo(X + W * 0.3, T); c.lineTo(X + W, T); c.lineTo(X + W, B); break;
      case 'notch2': c.moveTo(X, B); c.lineTo(X, T + H * 0.07); c.lineTo(X + W * 0.2, T + H * 0.07); c.lineTo(X + W * 0.2, T + H * 0.03); c.lineTo(X + W * 0.4, T + H * 0.03); c.lineTo(X + W * 0.4, T); c.lineTo(X + W * 0.6, T); c.lineTo(X + W * 0.6, T + H * 0.03); c.lineTo(X + W * 0.8, T + H * 0.03); c.lineTo(X + W * 0.8, T + H * 0.07); c.lineTo(X + W, T + H * 0.07); c.lineTo(X + W, B); break;
      case 'setback': c.moveTo(X, B); c.lineTo(X, T + H * 0.12); c.lineTo(X + W * 0.15, T + H * 0.12); c.lineTo(X + W * 0.15, T); c.lineTo(X + W * 0.85, T); c.lineTo(X + W * 0.85, T + H * 0.12); c.lineTo(X + W, T + H * 0.12); c.lineTo(X + W, B); break;
      case 'pyramid': c.moveTo(X, B); c.lineTo(X, T + W * 0.9); c.lineTo(X + W * 0.5, T); c.lineTo(X + W, T + W * 0.9); c.lineTo(X + W, B); break;
      default: c.moveTo(X, B); c.lineTo(X, T); c.lineTo(X + W, T); c.lineTo(X + W, B);
    }
    c.closePath(); c.fill();
    if (mast) { c.fillRect(X + W * 0.5 - 0.7, T - mast, 1.4, mast); }
  }
  function windows(c, X, B, W, H, rnd, topPad) {
    const cw = 3.4, ch = 4.6;
    for (let y = B - H + topPad; y < B - 14; y += ch) for (let x = X + 2; x < X + W - 2.4; x += cw) {
      if (rnd() < 0.09) { const warm = rnd() < 0.72; c.fillStyle = warm ? `rgba(236,198,136,${0.35 + rnd() * 0.45})` : `rgba(210,216,222,${0.3 + rnd() * 0.35})`; c.fillRect(x, y, 1.1, 1.6); }
    }
  }
  function draw(cv) {
    const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const rnd = seeded(5), narrow = W < 700;
    const span = Math.min(narrow ? W * 0.92 : W * 0.44, 780), maxH = H * (narrow ? 0.62 : 0.7);
    const cx = narrow ? W * 0.5 : W * 0.6, X0 = cx - span / 2, B = H - 10;
    // luz de la ciudad en el cielo, detrás de las torres
    const glow = c.createRadialGradient(cx, H, 0, cx, H, Math.max(span * 0.95, H * 1.4));
    glow.addColorStop(0, 'rgba(206,152,86,.30)'); glow.addColorStop(0.4, 'rgba(170,118,62,.12)'); glow.addColorStop(1, 'rgba(160,112,58,0)');
    c.fillStyle = glow; c.fillRect(0, 0, W, H);
    const haze = c.createLinearGradient(0, H * 0.35, 0, H);
    haze.addColorStop(0, 'rgba(120,86,46,0)'); haze.addColorStop(1, 'rgba(120,86,46,.10)');
    c.fillStyle = haze; c.fillRect(0, 0, W, H);
    // Uptown a lo lejos: Williams Tower y sus vecinos
    if (!narrow) {
      const ux = W * 0.2; c.fillStyle = '#0f0e0c';
      tower(c, ux - 26, B, 14, maxH * 0.26, 'flat'); tower(c, ux + 18, B, 16, maxH * 0.34, 'notch');
      tower(c, ux, B, 13, maxH * 0.6, 'pyramid', 9);
      c.fillStyle = 'rgba(236,198,136,.7)'; c.fillRect(ux + 6.5 - 0.6, B - maxH * 0.6 - 9 - 1.4, 1.2, 1.2);
    }
    // torres de fondo (más claras: perspectiva atmosférica)
    c.fillStyle = '#100f0d';
    BACK.forEach((t) => tower(c, X0 + t.x * span, B, t.w * span, t.h * maxH * 0.92, 'flat'));
    // el centro
    DOWNTOWN.forEach((t) => {
      const X = X0 + t.x * span, Wt = t.w * span, Ht = t.h * maxH;
      c.fillStyle = '#060606'; tower(c, X, B, Wt, Ht, t.c, t.m ? t.m * maxH : 0);
      windows(c, X, B, Wt, Ht, rnd, t.c === 'gables' || t.c === 'stepped' ? Ht * 0.22 : 6);
    });
    // edificios bajos y línea de árboles delante
    c.fillStyle = '#080807';
    for (let x = 0; x < W;) { const w = 10 + rnd() * 30, h = 6 + rnd() * (Math.abs(x - cx) < span * 0.6 ? 22 : 12); c.fillRect(x, B - h, w, h + 10); x += w + rnd() * 4; }
    c.fillStyle = '#050505'; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W + 12; x += 7 + rnd() * 9) { const y = B - 4 - rnd() * 9 - (Math.abs(x - cx * 0.8) < span * 0.3 ? 4 : 0); c.quadraticCurveTo(x - 4, y - 5, x, y); }
    c.lineTo(W, H); c.closePath(); c.fill();
    // grano finísimo: rompe el bandeado del degradado en pantallas de 8 bits
    const n = document.createElement('canvas'); n.width = n.height = 96; const nc = n.getContext('2d'), id = nc.createImageData(96, 96);
    for (let i = 0; i < id.data.length; i += 4) { const v = 120 + rnd() * 30; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 7; }
    nc.putImageData(id, 0, 0); c.fillStyle = c.createPattern(n, 'repeat'); c.fillRect(0, 0, W, H);
  }
  function all() { document.querySelectorAll('canvas[data-skyline]').forEach(draw); }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(all, 150); });
  document.fonts && document.fonts.ready ? document.fonts.ready.then(all) : all();
  window.__skyline = { draw };
})();
