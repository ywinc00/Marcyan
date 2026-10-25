// Fondo de toda la página, vuelta 7: el viaje de la cámara.
//   espacio → borde del planeta a contraluz con el sol asomando por el centro (servicios)
//   → dentro: cielo de noche con estrellas y nubes (proyectos)
//   → Houston iluminada vista desde arriba, que se acerca (antes del mapa)
//   → terreno con curvas de nivel (resto de secciones) → horizonte al cierre
//   → pie: cielo estrellado con nubes sobre la silueta de la ciudad.
// Las estrellas son una capa CSS nítida DEBAJO del lienzo: el lienzo es transparente donde hay cielo abierto,
// así las nubes y el planeta las tapan de verdad.
export function initAtmo() {
  if (!document.getElementById('hx-atmo')) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = () => innerWidth <= 700;

  // ── estrellas: dos capas nítidas que suben al bajar (descendemos) ──
  const starsBox = document.getElementById('hx-atmo-stars');
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
  const cv = document.getElementById('hx-atmo');
  const gl = cv.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
  const css = document.getElementById('hx-atmo-css');
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
  vec3 light = vec3(0.0);                              // luz que se suma encima de todo (no se tapa con la transparencia)
  float pw = 1.0 / uRes.y;                             // un píxel del lienzo, en las unidades de p

  // ── borde del planeta a contraluz ──
  float R = 2.6;
  vec2 c = vec2(asp*0.5, uLimbY - R);
  float d = length(p - c) - R;                         // >0 espacio, <0 planeta
  float above = step(0.0, d);
  float inside = smoothstep(1.5*pw, -max(0.018, 3.0*pw), d) * uLimbA;
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
    light += vec3(0.55, 0.38, 0.17) * air * (0.1 + 0.6*near) * uLimbA;
    float lw = max(1.25*pw, 0.0026);                     // la línea nunca más fina que ~1,3 píxeles: así no se escalona
    light += vec3(0.98, 0.88, 0.66) * exp(-(d*d)/(lw*lw)) * (0.3 + 1.4*near) * uLimbA;
    // el sol asomando por el borde: núcleo, resplandor y una raya horizontal suave
    float sd = length((p - sp)*vec2(1.0, 1.3));
    float core = exp(-sd*34.0) * smoothstep(-0.006, 0.012, d);
    glare = exp(-sd*5.0) * uSun;
    float streak = exp(-abs(p.y - sp.y)*85.0) * exp(-dx*1.4) * above;
    light += vec3(1.0, 0.95, 0.84) * core * 1.5 * uSun;
    light += vec3(0.8, 0.6, 0.32) * glare * 0.42 * (0.35 + 0.65*above);
    light += vec3(0.95, 0.78, 0.48) * streak * 0.5 * uSun;
  }
  open = max(open, uSpace * (1.0 - inside) * (1.0 - clamp(glare*1.6, 0.0, 1.0)));

  // ── cielo de noche: limpio, con la luz de una luna fuera de cuadro (las nubes son dibujo aparte, en los márgenes) ──
  if (uNight > 0.004) {
    vec2 mp = vec2(asp*0.9, 1.1);
    float moon = exp(-length(p - mp)*1.9);
    vec3 sky = vec3(0.03, 0.03, 0.031) + vec3(0.075, 0.06, 0.04)*moon*0.55
             + vec3(0.17, 0.105, 0.045)*pow(smoothstep(0.62, 0.0, uv.y), 1.6)*uGlow;   // la ciudad encendida bajo el horizonte
    col = mix(col, sky, uNight*(1.0 - inside));
    open = max(open, uNight*(1.0 - inside)*(1.0 - moon*0.5));
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

  // grano finísimo dentro del propio fondo (antes era una capa con mezcla encima de todo: daba tirones)
  float gr = h21(gl_FragCoord.xy + fract(uTime*7.0)*61.0) - 0.5;
  col += gr * 0.010; light += gr * 0.006 * step(0.02, max(light.r, light.g));
  float a = 1.0 - clamp(open, 0.0, 1.0)*0.94;
  o = vec4(col*a + light, a);
}`;
  const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
  const NAMES = ['uRes', 'uTime', 'uScroll', 'uSpace', 'uLimbY', 'uLimbA', 'uSun', 'uNight', 'uCity', 'uCityZ', 'uGround', 'uDawn', 'uCalm', 'uGlow'];
  // El sombreador se compila en paralelo y cuando el navegador está libre: nunca bloquea la portada.
  // Mientras compila, se ven las estrellas (CSS) sobre el negro de la página.
  let glState = gl ? 'idle' : 'none', ext = null, fsh = null;
  function compileGL() {
    ext = gl.getExtension('KHR_parallel_shader_compile');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const v = sh(gl.VERTEX_SHADER, VS); fsh = sh(gl.FRAGMENT_SHADER, FS);
    prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, fsh); gl.linkProgram(prog);
    glState = 'compiling';
  }
  function finishGL() {
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getShaderInfoLog(fsh)); glState = 'failed'; cv.style.display = 'none'; css.hidden = false; return; }
    gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    NAMES.forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    gl.viewport(0, 0, cv.width, cv.height);
    glState = 'ready';
    cv.classList.add('ready');
  }
  if (!gl) { cv.style.display = 'none'; css.hidden = false; }
  else {
    const kick = () => { try { compileGL(); } catch (e) { glState = 'failed'; cv.style.display = 'none'; css.hidden = false; } };
    'requestIdleCallback' in window ? window.requestIdleCallback(kick, { timeout: 900 }) : setTimeout(kick, 250);
  }

  function size() {
    const k = mobile() ? 0.5 : 0.6;
    cv.width = Math.max(2, Math.round(innerWidth * k)); cv.height = Math.max(2, Math.round(innerHeight * k));
    if (glState === 'ready') gl.viewport(0, 0, cv.width, cv.height);
  }

  let last = 0, clock = 0, raf = 0, ph = phase(0);
  function render(now) {
    raf = requestAnimationFrame(render);
    const dt = now - last;
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
    if (glState === 'compiling' && (!ext || gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR))) finishGL();
    if (glState !== 'ready') {
      if (glState !== 'failed' && glState !== 'none') return;
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
}
