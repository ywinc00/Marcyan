// Fondo de toda la página, vuelta 7: el viaje de la cámara.
//   espacio → borde del planeta a contraluz con el sol asomando por el centro (servicios)
//   → dentro: cielo de noche con estrellas y nubes (proyectos)
//   → Houston iluminada vista desde arriba, que se acerca (antes del mapa)
//   → terreno con curvas de nivel (resto de secciones) → horizonte al cierre
//   → pie: cielo estrellado con nubes sobre la silueta de la ciudad.
// Las estrellas son una capa CSS nítida DEBAJO del lienzo: el lienzo es transparente donde hay cielo abierto,
// así las nubes y el planeta las tapan de verdad.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = () => innerWidth <= 700;

  // ── estrellas: dos capas nítidas que suben al bajar (descendemos) ──
  const starsBox = document.getElementById('atmoStars');
  function starTile(seed, n, w, h, big) {
    let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    let out = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>`;
    for (let i = 0; i < n; i++) {
      const gold = rnd() < 0.22, r = big ? (rnd() < 0.35 ? 1.1 : 0.75) : (rnd() < 0.3 ? 0.8 : 0.55);
      out += `<circle cx='${(rnd() * w).toFixed(1)}' cy='${(rnd() * h).toFixed(1)}' r='${r}' fill='${gold ? '%23c8a96e' : '%23f0ede8'}' opacity='${(gold ? 0.7 : 0.3 + rnd() * 0.5).toFixed(2)}'/>`;
    }
    return `url("data:image/svg+xml;utf8,${out}</svg>")`;
  }
  const L1 = document.createElement('i'), L2 = document.createElement('i'), L3 = document.createElement('i');
  L1.style.backgroundImage = starTile(31, 34, 720, 720, false);
  L2.style.backgroundImage = starTile(77, 12, 900, 900, true); L2.style.backgroundSize = '900px 900px';
  L3.style.backgroundImage = starTile(13, 60, 640, 640, false); L3.style.backgroundSize = '640px 640px'; // más densas: cielo de noche
  starsBox.append(L1, L2, L3);

  // ── fases por sección ──
  const DEF = { space: 1, limb: -0.6, limbA: 0, sun: 0, night: 0, city: 0, cityZ: 0, ground: 0, dawn: 0, calm: 0, glow: 0 };
  let marks = [];
  function measure() {
    const vh = innerHeight; marks = [];
    document.querySelectorAll('[data-atmo]').forEach((el) => {
      const top = el.getBoundingClientRect().top + scrollY, h = el.offsetHeight;
      el.dataset.atmo.split(';').forEach((part) => {
        const [at, vals] = part.split('|'); if (!vals) return;
        const m = at.trim().match(/^(top|mid|end|[\d.]+)([+-][\d.]+)?$/);
        const base = m[1] === 'top' ? 0 : m[1] === 'mid' ? 0.5 : m[1] === 'end' ? 1 : +m[1];
        const y = top + h * base + (m[2] ? +m[2] * vh : 0);
        const v = {}; vals.trim().split(/\s+/).forEach((kv) => { const [k, n] = kv.split(':'); v[k] = +n; });
        marks.push({ y, v });
      });
    });
    marks.sort((a, b) => a.y - b.y);
    let prev = Object.assign({}, DEF);
    marks.forEach((m) => { m.v = Object.assign({}, prev, m.v); prev = m.v; });
  }
  function phase(y) {
    if (!marks.length) return DEF;
    if (y <= marks[0].y) return marks[0].v;
    for (let i = 1; i < marks.length; i++) {
      if (y < marks[i].y) {
        const a = marks[i - 1], b = marks[i], t = (y - a.y) / (b.y - a.y), s = t * t * (3 - 2 * t), o = {};
        for (const k in b.v) o[k] = a.v[k] + (b.v[k] - a.v[k]) * s;
        return o;
      }
    }
    return marks[marks.length - 1].v;
  }

  // ── lienzo WebGL2 (transparente donde hay cielo abierto) ──
  const cv = document.getElementById('atmo');
  const gl = cv.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
  const css = document.getElementById('atmoCss');
  let prog, U = {};
  const FS = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes; uniform float uTime, uScroll, uSpace, uLimbY, uLimbA, uSun, uNight, uCity, uCityZ, uGround, uDawn, uCalm, uGlow;
float h21(vec2 p){ p = fract(p*vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
const mat2 M = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*vn(p); p = M*p + 17.3; a *= 0.5; } return v; }
// autopistas radiales de Houston vistas desde arriba (norte arriba): I-10 E/O, I-45 N/S, US-59 NE/SO, US-290, SH-288, SH-225
const vec2 SP[9] = vec2[9](vec2(1.0,0.0), vec2(-1.0,0.0), vec2(-0.26,0.97), vec2(0.77,-0.64), vec2(-0.82,-0.57),
                           vec2(0.64,0.77), vec2(-0.87,0.5), vec2(0.0,-1.0), vec2(0.98,-0.17));
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x*asp, uv.y);
  vec3 col = vec3(0.031, 0.031, 0.03);
  float t = uTime * 0.03 * (1.0 - 0.8*uCalm);
  float open = 0.0;

  // ── borde del planeta a contraluz ──
  float R = 2.6;
  vec2 c = vec2(asp*0.5, uLimbY - R);
  float d = length(p - c) - R;                         // >0 espacio, <0 planeta
  float above = step(0.0, d);
  float inside = smoothstep(0.004, -0.018, d) * uLimbA;
  float glare = 0.0;
  if (uLimbA > 0.004) {
    vec2 sp = vec2(asp*0.5, uLimbY - 0.014);
    float dx = abs(p.x - sp.x);
    float near = exp(-dx*2.4) * uSun;
    // cara de noche del planeta, con la atmósfera encendida junto al borde
    float scat = exp(min(d, 0.0)*16.0);
    col = mix(col, vec3(0.02, 0.019, 0.017) + vec3(0.2, 0.13, 0.06)*scat*(0.12 + 0.5*near), inside);
    // la capa de aire iluminada por detrás: un halo fino que se ensancha cerca del sol
    float air = exp(-max(d, 0.0)*mix(16.0, 4.5, near)) * above;
    col += vec3(0.55, 0.38, 0.17) * air * (0.1 + 0.6*near) * uLimbA;
    col += vec3(0.98, 0.88, 0.66) * exp(-abs(d)*240.0) * (0.3 + 1.4*near) * uLimbA;
    // el sol asomando por el borde: núcleo, resplandor y una raya horizontal suave
    float sd = length((p - sp)*vec2(1.0, 1.3));
    float core = exp(-sd*34.0) * smoothstep(-0.006, 0.012, d);
    glare = exp(-sd*5.0) * uSun;
    float streak = exp(-abs(p.y - sp.y)*85.0) * exp(-dx*1.4) * above;
    col += vec3(1.0, 0.95, 0.84) * core * 1.5 * uSun;
    col += vec3(0.8, 0.6, 0.32) * glare * 0.42 * (0.35 + 0.65*above);
    col += vec3(0.95, 0.78, 0.48) * streak * 0.5 * uSun;
  }
  open = max(open, uSpace * (1.0 - inside) * (1.0 - clamp(glare*1.6, 0.0, 1.0)));

  // ── cielo de noche con nubes (una luna cálida fuera de cuadro ilumina sus bordes) ──
  float cl = 0.0;
  if (uNight > 0.004) {
    vec2 mp = vec2(asp*0.86, 1.08);
    float moon = exp(-length(p - mp)*2.2);
    vec3 sky = vec3(0.03, 0.03, 0.032) + vec3(0.07, 0.055, 0.035)*moon*0.6
             + vec3(0.06, 0.04, 0.02)*smoothstep(0.65, 0.0, uv.y)*(0.2 + 0.8*max(uCity, uGlow));
    col = mix(col, sky, uNight*(1.0 - inside));
    vec2 q = p*vec2(0.85, 2.0) + vec2(t*1.2, uScroll*0.5);
    vec2 w = vec2(fbm(q*0.6 + vec2(t*0.35, 0.0)), fbm(q*0.6 + 5.0));
    float n = fbm(q + 1.1*w);
    float cover = mix(0.43, 0.6, uCity);
    cl = smoothstep(cover, cover + 0.2, n) * uNight;
    float edge = smoothstep(cover, cover + 0.04, n) - smoothstep(cover + 0.04, cover + 0.16, n);
    float dens = smoothstep(cover + 0.04, cover + 0.34, n);
    vec3 cc = mix(vec3(0.15, 0.135, 0.118), vec3(0.075, 0.069, 0.062), dens);
    cc += vec3(0.36, 0.27, 0.15) * edge * (0.4 + 0.9*moon);
    cc += vec3(0.2, 0.13, 0.06) * smoothstep(0.55, 0.0, uv.y) * max(uCity, uGlow) * 0.6;   // la ciudad las enciende por debajo   // la ciudad las enciende por debajo
    col = mix(col, cc, cl*0.95);
    open = max(open, uNight*(1.0 - cl)*(1.0 - uCity)*(1.0 - inside));
  }

  // ── Houston iluminada desde arriba: los tres anillos (610, Beltway 8, Grand Parkway) y las radiales, como en una foto nocturna ──
  if (uCity > 0.004) {
    float z = exp(mix(log(0.45), log(3.0), uCityZ)) * clamp(asp/1.6, 0.55, 1.0);   // en el teléfono, la ciudad más pequeña
    float unit = 0.1*z;                                  // 1 unidad = ~10 km
    vec2 q = (p - vec2(asp*0.5, 0.46)) / unit;
    float r = length(q);
    float px = unit*uRes.y;                              // píxeles del lienzo por unidad
    float bay = 1.0 - smoothstep(0.9, 0.35, length((q - vec2(3.2, -2.4))*vec2(0.75, 1.0)) / 1.6);
    float fade = smoothstep(6.5, 3.8, r) * bay;
    float wpx = 0.85;
    float L = 0.0;
    L += exp(-pow(abs(length(q*vec2(1.0, 1.08)) - 1.0)*px/wpx, 2.0)) * 0.9;
    L += exp(-pow(abs(length(q*vec2(1.0, 1.05)) - 2.0)*px/wpx, 2.0)) * 0.75;
    L += exp(-pow(abs(length(q*vec2(1.0, 1.03)) - 3.8)*px/wpx, 2.0)) * 0.5;
    for (int k = 0; k < 9; k++) { float tt = dot(q, SP[k]); float dd = length(q - SP[k]*tt);
      L += exp(-pow(dd*px/wpx, 2.0)) * 0.85 * exp(-max(tt, 0.0)*0.12) * smoothstep(0.05, 0.3, tt); }
    L *= 0.6 + 0.4*vn(q*22.0);                          // las vías no brillan parejo: cuentas de luz
    // barrios: puntos dispersos que se apagan hacia fuera
    float cs = 0.045;
    vec2 g = q / cs, gi = floor(g), gf = fract(g);
    vec2 jt = vec2(h21(gi + 1.1), h21(gi + 2.3))*0.8 + 0.1;
    float dn = exp(-length((gi + jt)*cs)*0.95)*0.5;
    float dot1 = step(h21(gi + 3.7), dn) * exp(-pow(length(gf - jt)*cs*px, 2.0)*0.8);
    vec3 lc = mix(vec3(1.0, 0.68, 0.34), vec3(1.0, 0.9, 0.74), smoothstep(1.3, 0.0, r));
    vec3 add = lc*(L*0.95 + dot1*0.55)*fade + vec3(0.32, 0.18, 0.07)*exp(-r*0.8)*0.3*fade;
    col += add * uCity * (1.0 - cl*0.8) * 0.72;          // tenue: hay texto encima
  }

  // ── terreno: curvas de nivel por manchas ──
  if (uGround > 0.004) {
    vec2 g = p*1.1 + vec2(0.35, uScroll*0.2);
    float h = fbm(g*0.8 + 3.1 + vec2(t*0.08, 0.0));
    float patchy = smoothstep(0.38, 0.72, fbm(p*0.42 + vec2(9.0, uScroll*0.12)));
    col = mix(col, mix(col, vec3(0.055, 0.045, 0.032), smoothstep(0.35, 0.75, h)), uGround*0.7);
    float lv = h*13.0;
    float dist = abs(fract(lv + 0.5) - 0.5);
    float fw = fwidth(lv);
    float line = 1.0 - smoothstep(fw*0.6, fw*1.7, dist);
    float idx = 1.0 - step(0.5, abs(mod(floor(lv + 0.5), 5.0)));
    col += vec3(0.78, 0.66, 0.43) * line * mix(0.05, 0.13, idx) * uGround * (0.3 + 0.7*patchy);
  }

  // ── horizonte del cierre: el sol en el horizonte (sube al llegar y baja al seguir) ──
  if (uDawn > 0.004) {
    float hy = 0.03 + 0.15*uDawn;
    float cy = hy - 0.05*pow((uv.x - 0.5)*2.0, 2.0);
    float dy = uv.y - cy;
    col += vec3(0.3, 0.2, 0.095) * exp(-max(dy, 0.0)*4.2) * 0.5 * uDawn * step(0.0, dy);
    col += vec3(0.95, 0.8, 0.52) * exp(-abs(dy)*uRes.y*0.22) * 0.55 * uDawn;
    float sd = length(vec2((uv.x - 0.5)*asp, dy));
    col += vec3(0.85, 0.66, 0.38) * exp(-sd*6.0) * 0.3 * uDawn * smoothstep(-0.01, 0.02, dy);
    col = mix(col, col*0.5, smoothstep(0.0, -0.02, dy) * uDawn);
  }

  float a = 1.0 - clamp(open, 0.0, 1.0)*0.94;
  o = vec4(col*a, a);
}`;
  const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
  const NAMES = ['uRes', 'uTime', 'uScroll', 'uSpace', 'uLimbY', 'uLimbA', 'uSun', 'uNight', 'uCity', 'uCityZ', 'uGround', 'uDawn', 'uCalm', 'uGlow'];
  function initGL() {
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS); if (!v || !f) return false;
    prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    NAMES.forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    return true;
  }
  const ok = initGL();
  if (!ok) { cv.style.display = 'none'; css.hidden = false; }

  function size() {
    const k = mobile() ? 0.5 : 0.6;
    cv.width = Math.max(2, Math.round(innerWidth * k)); cv.height = Math.max(2, Math.round(innerHeight * k));
    if (ok) gl.viewport(0, 0, cv.width, cv.height);
  }

  let last = 0, clock = 0, raf = 0, ph = phase(0);
  function render(now) {
    raf = requestAnimationFrame(render);
    const dt = now - last;
    if (dt < (mobile() ? 40 : 30)) return;
    last = now;
    if (!reduce.matches) clock += Math.min(dt, 100) / 1000;
    const vh = innerHeight, y = scrollY + vh * 0.5;
    ph = phase(y);
    const scroll = reduce.matches ? 0 : scrollY / vh;
    const sOp = Math.max(ph.space, ph.night * (1 - ph.city));
    starsBox.style.opacity = Math.max(0, Math.min(1, sOp)).toFixed(3);
    L3.style.opacity = Math.max(0, Math.min(1, ph.night)).toFixed(3);
    if (sOp > 0.01) {
      L1.style.transform = `translate3d(0,${-((scrollY * 0.12) % 720)}px,0)`;
      L2.style.transform = `translate3d(0,${-((scrollY * 0.22) % 900)}px,0)`;
      L3.style.transform = `translate3d(0,${-((scrollY * 0.07) % 640)}px,0)`;
    }
    if (!ok) {
      css.style.setProperty('--atm', Math.max(ph.night * 0.6, ph.limbA * ph.sun * 0.6).toFixed(3));
      css.style.setProperty('--ground', ph.ground.toFixed(3));
      css.style.setProperty('--dawn', ph.dawn.toFixed(3));
      return;
    }
    gl.uniform2f(U.uRes, cv.width, cv.height);
    gl.uniform1f(U.uTime, clock);
    gl.uniform1f(U.uScroll, scroll);
    gl.uniform1f(U.uSpace, ph.space);
    gl.uniform1f(U.uLimbY, ph.limb);
    gl.uniform1f(U.uLimbA, ph.limbA);
    gl.uniform1f(U.uSun, ph.sun);
    gl.uniform1f(U.uNight, ph.night);
    gl.uniform1f(U.uCity, ph.city);
    gl.uniform1f(U.uCityZ, ph.cityZ);
    gl.uniform1f(U.uGround, ph.ground);
    gl.uniform1f(U.uDawn, ph.dawn);
    gl.uniform1f(U.uCalm, ph.calm);
    gl.uniform1f(U.uGlow, ph.glow);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function start() { cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(render); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else start(); });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); measure(); }, 120); });
  window.__atmo = { measure, phase: () => ph };
  size(); measure(); start();
  addEventListener('load', measure);
  document.fonts && document.fonts.ready.then(measure);
})();
