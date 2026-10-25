// Mapa del área de Houston (sección "Conocemos el mercado"): el mismo mapa de la portada, ya en plano.
(function () {
  const box = document.getElementById('metroBox'), cv = document.getElementById('metro');
  if (!box || !cv || !window.d3 || !window.GEO) return;
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
  function draw() {
    const W = box.clientWidth, H = box.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const kmpx = Math.min((W - 80) / 92, (H - 90) / 76);
    const proj = d3.geoOrthographic().rotate([95.48, -29.86]).scale(6371 * kmpx).translate([W * 0.5, H * 0.47]).clipAngle(90);
    const path = d3.geoPath(proj, c);
    c.clearRect(0, 0, W, H);
    // agua: noche con luz suave
    const sea = c.createRadialGradient(W * 0.75, H * 0.8, 10, W * 0.75, H * 0.8, W * 0.8);
    sea.addColorStop(0, '#12100c'); sea.addColorStop(1, '#070605');
    c.fillStyle = sea; c.fillRect(0, 0, W, H);
    // tierra: el bronce sólido del final del acercamiento
    const g = c.createRadialGradient(W * 0.3, H * 0.25, 10, W * 0.45, H * 0.45, W * 0.9);
    g.addColorStop(0, '#8a6c3f'); g.addColorStop(0.6, '#6a5232'); g.addColorStop(1, '#4a3a24');
    c.fillStyle = g; c.beginPath(); path(land); c.fill();
    // trama fina encima, como recuerdo de la portada
    const p = document.createElement('canvas'); p.width = p.height = Math.round(6 * dpr);
    const pc = p.getContext('2d'); pc.fillStyle = 'rgba(8,7,5,.22)'; pc.beginPath(); pc.arc(p.width / 2, p.height / 2, 0.9 * dpr, 0, Math.PI * 2); pc.fill();
    const pat = c.createPattern(p, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / dpr));
    c.save(); c.beginPath(); path(land); c.clip(); c.fillStyle = pat; c.fillRect(0, 0, W, H); c.restore();
    // costa
    c.strokeStyle = 'rgba(232,214,174,.6)'; c.lineWidth = 1; c.beginPath(); path(land); c.stroke();
    // viñeta para que el borde no corte en seco
    const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(9,8,7,0)'); v.addColorStop(1, 'rgba(9,8,7,.85)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    // zonas
    box.querySelectorAll('.mp').forEach((e) => e.remove());
    ZONES.forEach((z) => {
      const [x, y] = proj(z.at);
      const el = document.createElement('div'); el.className = 'mp' + (z.hq ? ' mp--hq' : '');
      el.style.left = x + 'px'; el.style.top = (y - 13) + 'px';
      el.innerHTML = (z.href ? `<a href="${z.href}">${z.n}${arrow}</a>` : `<span>${z.n}</span>`) + '<i></i>';
      box.appendChild(el);
    });
  }
  draw();
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 120); });
})();
