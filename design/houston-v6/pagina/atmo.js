// Fondo de toda la página: "entramos en la atmósfera".
// Un solo lienzo fijo detrás del contenido. Según por dónde va el visitante:
//   espacio (estrellas) → borde del planeta que sube → atmósfera que fluye → terreno con curvas de nivel → amanecer.
// Las fases se leen de la posición de las secciones (data-atmo), así que el recorrido sigue al contenido.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = () => innerWidth <= 700;

  // ── estrellas: dos capas nítidas en CSS que se mueven a distinta velocidad (profundidad) ──
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
  const L1 = document.createElement('i'), L2 = document.createElement('i');
  L1.style.backgroundImage = starTile(31, 34, 720, 720, false);
  L2.style.backgroundImage = starTile(77, 12, 900, 900, true);
  L2.style.backgroundSize = '900px 900px';
  starsBox.append(L1, L2);

  // ── fases por sección ──
  const KEYS = ['space', 'limb', 'atm', 'ground', 'dawn', 'calm'];
  let marks = [];
  function measure() {
    const vh = innerHeight; marks = [];
    document.querySelectorAll('[data-atmo]').forEach((el) => {
      const top = el.getBoundingClientRect().top + scrollY, h = el.offsetHeight;
      el.dataset.atmo.split(';').forEach((part) => {
        const [at, vals] = part.split('|'); if (!vals) return;
        // at: "top", "mid", "end", "pin" o fracción "0.3"; + desplazamiento opcional en vh: "top-0.5"
        const m = at.trim().match(/^(top|mid|end|[\d.]+)([+-][\d.]+)?$/);
        const base = m[1] === 'top' ? 0 : m[1] === 'mid' ? 0.5 : m[1] === 'end' ? 1 : +m[1];
        const y = top + h * base + (m[2] ? +m[2] * vh : 0);
        const v = {}; vals.trim().split(/\s+/).forEach((kv) => { const [k, n] = kv.split(':'); v[k] = +n; });
        marks.push({ y, v });
      });
    });
    marks.sort((a, b) => a.y - b.y);
    // cada marca hereda lo que no declara de la anterior
    let prev = { space: 1, limb: -0.4, atm: 0, ground: 0, dawn: 0, calm: 0, limbA: 0 };
    marks.forEach((m) => { m.v = Object.assign({}, prev, m.v); prev = m.v; });
  }
  function phase(y) {
    if (!marks.length) return { space: 1, limb: -0.4, atm: 0, ground: 0, dawn: 0, calm: 0, limbA: 0 };
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

  // ── lienzo WebGL2 ──
  const cv = document.getElementById('atmo');
  const gl = cv.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power', premultipliedAlpha: false });
  const css = document.getElementById('atmoCss');
  let prog, U = {};
  const FS = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes; uniform float uTime, uScroll, uLimbY, uLimbA, uAtm, uGround, uDawn, uCalm;
float h21(vec2 p){ p = fract(p*vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
const mat2 M = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*vn(p); p = M*p + 17.3; a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x*asp, uv.y);
  vec3 col = vec3(0.031, 0.031, 0.03);
  float t = uTime * 0.03 * (1.0 - 0.8*uCalm);

  // borde del planeta: un círculo enorme cuya cima está en uLimbY (0 = abajo, 1 = arriba)
  float R = 2.6;
  vec2 c = vec2(asp*0.5, uLimbY - R);
  float d = length(p - c) - R;                       // >0 fuera (espacio), <0 dentro (atmósfera)
  float inside = smoothstep(0.03, -0.16, d) * uLimbA;
  float haze = max(uAtm, inside);

  // atmósfera: corrientes lentas (dominio deformado), estiradas en horizontal como vientos altos
  if (haze > 0.004) {
    vec2 q = p*vec2(1.05, 2.1) + vec2(0.0, uScroll*0.42);
    vec2 w = vec2(fbm(q + vec2(0.0, t)), fbm(q + vec2(5.2, 1.3) - t));
    float n = fbm(q + 2.3*w + vec2(t*0.7, 0.0));
    vec3 hz = mix(vec3(0.042, 0.034, 0.026), vec3(0.155, 0.115, 0.068), smoothstep(0.3, 0.84, n));
    hz = mix(hz, vec3(0.27, 0.205, 0.125), smoothstep(0.72, 0.96, n)*0.34);
    // filamentos: hilos finos de luz en las corrientes (casi quietos cuando hay un panel que leer)
    float r = 1.0 - abs(2.0*fbm(q*1.5 + 3.0*w - vec2(t, 0.0)) - 1.0);
    hz += vec3(0.42, 0.33, 0.2) * pow(r, 22.0) * 0.12 * (1.0 - 0.8*uCalm);
    col = mix(col, hz, haze);
  }
  // la línea del borde y su luz hacia el espacio
  if (uLimbA > 0.004) {
    float line = exp(-abs(d)*150.0);
    float glow = exp(-max(d, 0.0)*9.0) * step(0.0, d);
    col += vec3(0.89, 0.8, 0.61) * line * 0.55 * uLimbA;
    col += vec3(0.42, 0.32, 0.18) * glow * 0.32 * uLimbA;
  }

  // terreno: curvas de nivel doradas que pasan despacio, como sobrevolar Houston
  if (uGround > 0.004) {
    vec2 g = p*1.1 + vec2(0.35, uScroll*0.2);
    float h = fbm(g*0.8 + 3.1 + vec2(t*0.08, 0.0));
    // el terreno va por manchas (zonas con relieve y zonas lisas), no como papel pintado
    float patchy = smoothstep(0.38, 0.72, fbm(p*0.42 + vec2(9.0, uScroll*0.12)));
    col = mix(col, mix(col, vec3(0.055, 0.045, 0.032), smoothstep(0.35, 0.75, h)), uGround*0.7);
    float lv = h*13.0;
    float dist = abs(fract(lv + 0.5) - 0.5);
    float fw = fwidth(lv);
    float line = 1.0 - smoothstep(fw*0.6, fw*1.7, dist);
    float idx = 1.0 - step(0.5, abs(mod(floor(lv + 0.5), 5.0)));
    col += vec3(0.78, 0.66, 0.43) * line * mix(0.05, 0.13, idx) * uGround * (0.3 + 0.7*patchy);
  }

  // amanecer: el horizonte sube con el visitante y el sol asoma (eco del logo de la tarjeta)
  if (uDawn > 0.004) {
    float hy = 0.03 + 0.15*uDawn;
    float cy = hy - 0.05*pow((uv.x - 0.5)*2.0, 2.0);
    float dy = uv.y - cy;
    vec3 warm = vec3(0.3, 0.2, 0.095);
    col += warm * exp(-max(dy, 0.0)*4.2) * 0.5 * uDawn * step(0.0, dy);
    col += vec3(0.95, 0.8, 0.52) * exp(-abs(dy)*uRes.y*0.22) * 0.55 * uDawn;
    float sd = length(vec2((uv.x - 0.5)*asp, dy));
    col += vec3(0.85, 0.66, 0.38) * exp(-sd*6.0) * 0.3 * uDawn * smoothstep(-0.01, 0.02, dy);
    col = mix(col, col*0.5, smoothstep(0.0, -0.02, dy) * uDawn);
  }
  o = vec4(col, 1.0);
}`;
  const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

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
    ['uRes', 'uTime', 'uScroll', 'uLimbY', 'uLimbA', 'uAtm', 'uGround', 'uDawn', 'uCalm'].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    return true;
  }
  const ok = initGL();
  if (!ok) { cv.style.display = 'none'; css.hidden = false; }

  function size() {
    const k = mobile() ? 0.5 : 0.6;                    // resolución reducida: es luz y bruma, no detalle
    cv.width = Math.max(2, Math.round(innerWidth * k)); cv.height = Math.max(2, Math.round(innerHeight * k));
    if (ok) gl.viewport(0, 0, cv.width, cv.height);
  }

  let last = 0, clock = 0, raf = 0, ph = phase(0);
  function render(now) {
    raf = requestAnimationFrame(render);
    const dt = now - last;
    if (dt < (mobile() ? 40 : 30)) return;           // ~30 fps: el flujo es lento, no necesita más
    last = now;
    if (!reduce.matches) clock += Math.min(dt, 100) / 1000;
    const vh = innerHeight, y = scrollY + vh * 0.5;
    ph = phase(y);
    const scroll = reduce.matches ? 0 : scrollY / vh;
    // estrellas: suben al bajar (descendemos), dos velocidades
    starsBox.style.opacity = Math.max(0, Math.min(1, ph.space)).toFixed(3);
    if (ph.space > 0.01) {
      L1.style.transform = `translate3d(0,${-((scrollY * 0.12) % 720)}px,0)`;
      L2.style.transform = `translate3d(0,${-((scrollY * 0.22) % 900)}px,0)`;
    }
    document.documentElement.style.setProperty('--dawn', ph.dawn.toFixed(3));
    if (!ok) {
      css.style.setProperty('--atm', Math.max(ph.atm, ph.limbA * 0.6).toFixed(3));
      css.style.setProperty('--ground', ph.ground.toFixed(3));
      css.style.setProperty('--dawn', ph.dawn.toFixed(3));
      return;
    }
    gl.uniform2f(U.uRes, cv.width, cv.height);
    gl.uniform1f(U.uTime, clock);
    gl.uniform1f(U.uScroll, scroll);
    gl.uniform1f(U.uLimbY, ph.limb);
    gl.uniform1f(U.uLimbA, ph.limbA);
    gl.uniform1f(U.uAtm, ph.atm);
    gl.uniform1f(U.uGround, ph.ground);
    gl.uniform1f(U.uDawn, ph.dawn);
    gl.uniform1f(U.uCalm, ph.calm);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function start() { cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(render); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else start(); });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); measure(); }, 120); });
  window.__atmo = { measure, phase: () => ph };
  size(); measure(); start();
  // las imágenes y las fuentes cambian alturas: volver a medir cuando terminen
  addEventListener('load', measure);
  document.fonts && document.fonts.ready.then(measure);
})();
