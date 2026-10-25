// Silueta del centro de Houston para el pie, CALCADA de una foto real con licencia libre
// (Wikimedia Commons, "DowntownHouston.jpg", CC BY-SA 2.0: la vista clásica desde Buffalo Bayou / Eleanor Tinsley Park).
// Coordenadas medidas sobre la foto (x de 0 a 760, y = altura sobre la base, máx. 218). De noche: torres más oscuras
// que el cielo, cada una con su propio valor para que se separen, luz cálida de la ciudad desde abajo, ventanas
// encendidas en rejilla por torre y las balizas rojas de las torres más altas.
export function initSkyline() {
  function seeded(s) { return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
  // [puntos del contorno, tono, ventanas sí/no, baliza]; el orden es el de dibujo (de atrás hacia delante)
  const T = [
    { p: [[13,160],[22,160],[22,164],[57,164],[57,0],[13,0]], tone: 0.55, win: 1 },                                     // torre de la izquierda
    { p: [[55,78],[75,73],[90,73],[90,0],[55,0]], tone: 0.3, win: 1 },
    { p: [[88,64],[130,64],[130,0],[88,0]], tone: 0.62, win: 1 },
    { p: [[130,42],[150,42],[150,0],[130,0]], tone: 0.4, win: 0 },
    { p: [[150,142],[168,142],[168,146],[180,146],[180,142],[211,142],[211,0],[150,0]], tone: 0.7, win: 1, mast: [197, 142, 205], beacon: 1 }, // la torre gris con antena
    { p: [[211,40],[237,40],[237,0],[211,0]], tone: 0.35, win: 0 },
    { p: [[237,206],[241,214],[248,218],[277,218],[284,214],[288,206],[288,0],[237,0]], tone: 0.8, win: 1, glass: 1, beacon: 1 }, // azul de esquinas redondeadas
    { p: [[264,170],[270,170],[270,178],[277,178],[277,186],[284,186],[284,194],[291,194],[291,202],[298,202],[298,206],[318,206],[318,202],[325,202],[325,194],[332,194],[332,186],[339,186],[339,178],[346,178],[346,170],[352,170],[352,0],[264,0]], tone: 0.55, win: 1, glass: 1,
      recess: [[282,190],[334,190],[324,172],[314,164],[302,164],[292,172]] }, // la de la corona escalonada
    { p: [[352,162],[375,162],[375,135],[381,135],[381,0],[352,0]], tone: 0.42, win: 1 },
    { p: [[398,106],[445,106],[445,0],[398,0]], tone: 0.66, win: 1 },
    { p: [[445,48],[470,48],[470,0],[445,0]], tone: 0.38, win: 0 },
    { p: [[492,130],[503,130],[503,0],[492,0]], tone: 0.5, win: 0 },
    { p: [[499,205],[510,212],[570,212],[570,0],[499,0]], tone: 0.95, win: 1, beacon: 1 },                                // la más oscura y alta
    { p: [[612,100],[620,104],[637,104],[645,100],[645,0],[612,0]], tone: 0.45, win: 1 },
    { p: [[648,175],[658,182],[672,186],[690,188],[722,188],[722,0],[648,0]], tone: 0.7, win: 1, glass: 1 },           // la de cristal curvo
    { p: [[672,110],[700,110],[700,0],[672,0]], tone: 0.25, win: 1 },
    { p: [[720,142],[752,142],[752,0],[720,0]], tone: 0.6, win: 1, glass: 1 },
  ];
  const BACK = [[0,58,30],[60,40,96],[118,52,70],[140,40,90],[205,30,74],[230,36,60],[355,40,92],[388,24,58],[440,40,80],[466,34,64],[480,26,96],[575,36,70],[600,20,84],[640,26,66],[700,30,90],[745,30,58]];
  const SPAN = 760, TOP = 220;

  function draw(cv) {
    const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const rnd = seeded(5), narrow = W < 700;
    const B = H - 12;                                                    // base de las torres (encima de la línea de árboles)
    const k = Math.min((narrow ? W * 0.94 : Math.min(W * 0.46, 760)) / SPAN, (H * 0.74) / TOP);
    const cx = narrow ? W * 0.5 : W * 0.6, X0 = cx - (SPAN * k) / 2;
    const X = (x) => X0 + x * k, Y = (y) => B - y * k;

    // la ciudad enciende el cielo por detrás
    // resplandor elíptico: sube por detrás de las torres hasta pasar sus coronas, para que se lean como silueta
    c.save(); c.translate(cx, B); c.scale(SPAN * k * 0.62 / (TOP * k * 1.25), 1);
    const R0 = TOP * k * 1.25, glow = c.createRadialGradient(0, 0, 0, 0, 0, R0);
    glow.addColorStop(0, 'rgba(206,148,82,.42)'); glow.addColorStop(0.55, 'rgba(176,122,64,.20)'); glow.addColorStop(1, 'rgba(160,112,58,0)');
    c.fillStyle = glow; c.fillRect(-R0 * 3, -R0, R0 * 6, R0); c.restore();

    // capa de fondo
    c.fillStyle = 'hsl(30 12% 10%)';
    BACK.forEach(([x, w, h]) => c.fillRect(X(x), Y(h), w * k, h * k));
    // torres
    T.forEach((t, i) => {
      const path = new Path2D(); t.p.forEach(([x, y], j) => (j ? path.lineTo(X(x), Y(y)) : path.moveTo(X(x), Y(y))));
      path.closePath();
      const top = Math.max(...t.p.map((q) => q[1]));
      // valor propio por torre (entre 4 % y 10 % de luz) y la luz de la ciudad que sube desde abajo
      const v = 3.5 + (1 - t.tone) * 4.5;
      const g = c.createLinearGradient(0, Y(top), 0, B);
      g.addColorStop(0, `hsl(30 8% ${v}%)`); g.addColorStop(0.7, `hsl(30 12% ${v + 1.5}%)`); g.addColorStop(1, `hsl(30 22% ${v + 4}%)`);
      c.fillStyle = g; c.fill(path);
      if (t.glass) {
        c.save(); c.clip(path);
        const gl = c.createLinearGradient(0, Y(top), 0, B); gl.addColorStop(0, 'rgba(120,128,140,.05)'); gl.addColorStop(1, 'rgba(200,150,90,.08)');
        c.fillStyle = gl; c.fill(path);
        const xs0 = t.p.map((q) => q[0]), a0 = Math.min(...xs0), b0 = Math.max(...xs0), sx = X(a0 + (b0 - a0) * 0.22), sw = (b0 - a0) * k * 0.16;
        const st = c.createLinearGradient(sx, 0, sx + sw, 0); st.addColorStop(0, 'rgba(230,190,130,0)'); st.addColorStop(0.5, 'rgba(230,190,130,.07)'); st.addColorStop(1, 'rgba(230,190,130,0)');
        c.fillStyle = st; c.fillRect(sx, Y(top), sw, B - Y(top));
        c.restore();
      }
      // filo de luz en la corona: la luz de la ciudad toca los bordes altos y se apaga hacia abajo
      const rim = c.createLinearGradient(0, Y(top) - 1, 0, Y(top) + Math.max(8, 16 * k));
      rim.addColorStop(0, 'rgba(236,190,122,.42)'); rim.addColorStop(1, 'rgba(236,190,122,0)');   // solo el borde alto, nunca un contorno
      c.save(); c.strokeStyle = rim; c.lineWidth = 1; c.stroke(path); c.restore();
      if (t.recess) { const rp = new Path2D(); t.recess.forEach(([x, y], j) => (j ? rp.lineTo(X(x), Y(y)) : rp.moveTo(X(x), Y(y)))); rp.closePath(); c.fillStyle = 'rgba(0,0,0,.26)'; c.fill(rp); }
      // filo derecho muy tenue: separa torres que se tocan
      const xs = t.p.map((q) => q[0]), xr = Math.max(...xs), xl = Math.min(...xs);
      c.fillStyle = 'rgba(214,170,110,.07)'; c.fillRect(X(xr) - 1, Y(top) + 2, 1, B - Y(top) - 2);
      // ventanas: rejilla por torre, pocas encendidas (es de noche)
      if (t.win) {
        const cw = Math.max(2.6, 4.4 * k), ch = Math.max(3.2, 5.2 * k), ww = Math.max(0.9, 1.4 * k), wh = Math.max(1.1, 1.8 * k);
        c.save(); c.clip(path);
        for (let y = Y(top) + ch * 2.5; y < B - ch * 1.5; y += ch) {
          if (rnd() > 0.3) continue;                                      // planta apagada
          const cool = rnd() < 0.25, a = 0.4 + rnd() * 0.4;
          let run = 0;
          for (let x = X(xl) + cw * 0.6; x < X(xr) - cw * 0.4; x += cw) {
            if (run <= 0 && rnd() < 0.22) run = 2 + Math.floor(rnd() * 6);   // tramo de oficinas encendidas
            if (run > 0) { c.fillStyle = cool ? `rgba(214,222,228,${a * 0.8})` : `rgba(240,200,138,${a})`; c.fillRect(x, y, ww, wh); run--; }
          }
        }
        c.restore();
      }
      if (t.mast) { const [mx, y0, y1] = t.mast; c.fillStyle = `hsl(30 8% ${v}%)`; c.fillRect(X(mx) - 0.6, Y(y1), 1.2, Y(y0) - Y(y1)); }
      if (t.beacon) {                                                    // baliza roja de aviación en lo alto
        const bx = t.mast ? X(t.mast[0]) : X((xl + xr) / 2), by = t.mast ? Y(t.mast[2]) - 1 : Y(top) - 1.5;
        const bg = c.createRadialGradient(bx, by, 0, bx, by, 5); bg.addColorStop(0, 'rgba(255,92,72,.55)'); bg.addColorStop(1, 'rgba(255,92,72,0)');
        c.fillStyle = bg; c.fillRect(bx - 5, by - 5, 10, 10); c.fillStyle = '#ff6a55'; c.fillRect(bx - 0.75, by - 0.75, 1.5, 1.5);
      }
    });

    // edificios bajos y línea de árboles delante (los árboles del parque tapan la base, como en la foto)
    c.fillStyle = 'hsl(30 10% 4.5%)';
    for (let x = 0; x < W;) { const w = 9 + rnd() * 26, h = 4 + rnd() * (Math.abs(x - cx) < SPAN * k * 0.55 ? 14 : 8); c.fillRect(x, B - h, w, h + 14); x += w + rnd() * 3; }
    c.fillStyle = '#050505'; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 5 + rnd() * 7) { const y = B + 2 - rnd() * 8 - (Math.abs(x - X(360)) < 120 * k ? 5 : 0); c.quadraticCurveTo(x - 3, y - 5, x, y); }
    c.lineTo(W, H); c.closePath(); c.fill();

    // grano finísimo contra el bandeado
    const n = document.createElement('canvas'); n.width = n.height = 96; const nc = n.getContext('2d'), id = nc.createImageData(96, 96);
    for (let i = 0; i < id.data.length; i += 4) { const g2 = 120 + rnd() * 30; id.data[i] = id.data[i + 1] = id.data[i + 2] = g2; id.data[i + 3] = 7; }
    nc.putImageData(id, 0, 0); c.fillStyle = c.createPattern(n, 'repeat'); c.fillRect(0, 0, W, H);
  }
  const done = new Set();
  function all() { done.forEach(draw); }
  const near = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { near.unobserve(e.target); done.add(e.target); draw(e.target); } }), { rootMargin: '150% 0px' });
  document.querySelectorAll('canvas[data-skyline]').forEach((cv) => near.observe(cv));
  let rt, lastW = innerWidth;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth === lastW) return; lastW = innerWidth; all(); }, 150); });
}
