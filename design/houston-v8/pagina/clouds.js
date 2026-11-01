// Nubes dibujadas (no ruido): siluetas de cúmulo con lóbulos, base plana, volumen por lóbulo y un filo de luz
// de luna arriba a la derecha. Principio tomado de Railway (77a2ae35): nubes de ilustración, de bajo contraste,
// que ENMARCAN la composición desde los bordes y nunca pasan por detrás del texto.
//   data-clouds="edges" → en los márgenes de una sección (solo escritorio)
//   data-clouds="bank"  → un banco de nubes a lo ancho, en un hueco sin texto (lo atravesamos al bajar)
//   data-clouds="foot"  → dos nubes finas sobre la ciudad del pie
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function seeded(s) { return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

  // Nube suave de noche: máscara de densidad (bocanadas difuminadas, forma de cúmulo con base casi plana)
  // → cuerpo coloreado por altura con bolsas de sombra → filo de luz de luna arriba a la derecha.
  const COL = {
    far:  { dark: '#171614', mid: '#34302b', lit: '#a08a66' },
    mid:  { dark: '#131211', mid: '#2c2925', lit: '#8e7a5c' },
    near: { dark: '#0f0e0d', mid: '#26231f', lit: '#7c6a51' },
  };
  function cloud(x, base, w, h, rnd, tone) {
    const K = COL[tone], pad = h * 0.8, W = Math.ceil(w + pad * 2), H = Math.ceil(h * 1.6 + pad);
    const ox = x - pad, oy = base - h * 1.35 - pad * 0.5, by = base - oy;
    const mk = () => { const k = document.createElement('canvas'); k.width = W; k.height = H; return [k, k.getContext('2d')]; };
    const [M, m] = mk();
    m.filter = `blur(${Math.max(2.5, h * 0.05)}px)`;
    const N = Math.round(70 + w / 5);
    for (let i = 0; i < N; i++) {
      const t = rnd(), env = Math.pow(Math.sin(Math.PI * (0.04 + 0.92 * t)), 0.8) * (0.82 + 0.18 * Math.sin(t * 17 + w));
      const px = x + w * t - ox, topY = base - h * env - oy;
      const py = by - (by - topY) * Math.pow(rnd(), 0.5), r = h * (0.09 + 0.2 * rnd()) * (0.5 + 0.5 * env);
      m.fillStyle = `rgba(255,255,255,${0.28 + 0.2 * rnd()})`; m.beginPath(); m.arc(px, py, r, 0, 7); m.fill();
    }
    m.filter = 'none'; m.globalCompositeOperation = 'destination-out';
    const cut = m.createLinearGradient(0, by - h * 0.06, 0, by + h * 0.12); cut.addColorStop(0, 'rgba(0,0,0,0)'); cut.addColorStop(1, 'rgba(0,0,0,1)');
    m.fillStyle = cut; m.fillRect(0, 0, W, H);
    const [Bc, b] = mk();
    const g = b.createLinearGradient(0, by - h * 1.1, 0, by); g.addColorStop(0, K.mid); g.addColorStop(0.55, K.dark); g.addColorStop(1, K.dark);
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    const side = b.createLinearGradient(0, 0, W, 0); side.addColorStop(0, 'rgba(0,0,0,.25)'); side.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = side; b.fillRect(0, 0, W, H);
    b.filter = `blur(${Math.max(3, h * 0.08)}px)`;
    for (let i = 0; i < Math.round(w / 40); i++) { b.fillStyle = 'rgba(6,6,5,.3)'; b.beginPath(); b.arc(w * rnd() + pad, by - h * (0.15 + 0.35 * rnd()), h * (0.12 + 0.16 * rnd()), 0, 7); b.fill(); }
    b.filter = 'none'; b.globalCompositeOperation = 'destination-in'; b.drawImage(M, 0, 0);
    const [Rc, r] = mk();
    r.drawImage(M, 0, 0); r.globalCompositeOperation = 'destination-out'; r.drawImage(M, -h * 0.05, h * 0.09);
    r.globalCompositeOperation = 'source-in'; r.fillStyle = K.lit; r.fillRect(0, 0, W, H);
    r.globalCompositeOperation = 'destination-in';
    const fv = r.createLinearGradient(0, by - h * 1.1, 0, by - h * 0.2); fv.addColorStop(0, 'rgba(0,0,0,1)'); fv.addColorStop(1, 'rgba(0,0,0,0)');
    r.fillStyle = fv; r.fillRect(0, 0, W, H);
    const fh = r.createLinearGradient(0, 0, W, 0); fh.addColorStop(0, 'rgba(0,0,0,.35)'); fh.addColorStop(1, 'rgba(0,0,0,1)');
    r.fillStyle = fh; r.fillRect(0, 0, W, H);
    const [O, o] = mk();
    o.drawImage(Bc, 0, 0); o.globalAlpha = 0.9; o.filter = 'blur(0.6px)'; o.drawImage(Rc, 0, 0);
    O.className = 'cloud'; O.style.left = ox + 'px'; O.style.top = oy + 'px';
    return O;
  }

  const boxes = [];
  function paint(b) {
    const W = b.el.clientWidth, H = b.el.clientHeight, kind = b.el.dataset.clouds;
    b.layers.forEach((g) => (g.innerHTML = ''));
    const put = (i, cv) => b.layers[i].appendChild(cv);
    if (kind === 'edges') {
      if (innerWidth < 1024) return;                                                        // en el teléfono no hay márgenes
      const wrap = b.el.parentElement.querySelector('.wrap'), r = wrap.getBoundingClientRect(), br = b.el.getBoundingClientRect();
      const left = r.left - br.left + 20, right = r.right - br.left - 20, rnd = seeded(41);
      const rows = Math.max(3, Math.round(H / 560));
      for (let i = 0; i < rows; i++) {
        const y = (i + 0.75) * (H / rows) + (rnd() - 0.5) * 120, side = i % 2 === 0;
        const w = 440 + rnd() * 160, h = 100 + rnd() * 40;
        put(0, cloud(side ? left - w * (0.8 + rnd() * 0.1) : right - w * (0.12 + rnd() * 0.08), y, w, h, rnd, 'far'));
        const w2 = 360 + rnd() * 140, h2 = 90 + rnd() * 30, y2 = y + 170 + rnd() * 90;
        put(1, cloud(side ? right - w2 * (0.08 + rnd() * 0.08) : left - w2 * (0.84 + rnd() * 0.08), y2, w2, h2, rnd, 'near'));
      }
    } else if (kind === 'bank') {
      const rnd = seeded(7), unit = Math.max(260, Math.min(520, W * 0.3));
      for (let x = -unit * 0.4; x < W; x += unit * (0.55 + rnd() * 0.25)) put(0, cloud(x, H * (0.4 + rnd() * 0.12), unit * (0.9 + rnd() * 0.4), unit * 0.26, rnd, 'far'));
      for (let x = -unit * 0.6; x < W; x += unit * (0.6 + rnd() * 0.3)) put(1, cloud(x, H * (0.62 + rnd() * 0.12), unit * (1.0 + rnd() * 0.4), unit * 0.29, rnd, 'mid'));
      for (let x = -unit * 0.5; x < W; x += unit * (0.75 + rnd() * 0.35)) put(2, cloud(x, H * (0.86 + rnd() * 0.08), unit * (1.1 + rnd() * 0.4), unit * 0.32, rnd, 'near'));
    } else if (kind === 'foot') {
      const rnd = seeded(23), u = Math.min(360, W * 0.3);
      put(0, cloud(W * 0.03, H * 0.42, u, u * 0.2, rnd, 'far'));
      if (W > 700) put(0, cloud(W * 0.8, H * 0.3, u * 0.75, u * 0.17, rnd, 'far'));
    }
  }
  function setup() {
    document.querySelectorAll('[data-clouds]').forEach((el) => {
      const kind = el.dataset.clouds;
      const speeds = kind === 'bank' ? [0.05, 0.12, 0.22] : kind === 'edges' ? [0.06, 0.14] : [0.03];
      const layers = speeds.map((sp) => { const g = document.createElement('div'); g.className = 'clouds__l'; g.dataset.speed = sp; el.appendChild(g); return g; });
      const b = { el, layers }; boxes.push(b); paint(b);
    });
  }
  let ticking = false;
  function scroll() {
    ticking = false; if (reduce) return;
    const vh = innerHeight;
    boxes.forEach((b) => {
      const r = b.el.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
      const k = r.top + r.height / 2 - vh / 2;                                            // 0 cuando el centro cruza el centro de la pantalla
      b.layers.forEach((cv) => (cv.style.transform = `translate3d(0,${(-k * +cv.dataset.speed).toFixed(1)}px,0)`));
    });
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(scroll); } }, { passive: true });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { boxes.forEach(paint); scroll(); }, 150); });
  const go = () => { setup(); scroll(); };
  document.fonts && document.fonts.ready ? document.fonts.ready.then(go) : go();
  window.__clouds = { cloud };
})();
