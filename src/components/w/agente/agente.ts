// ─────────────────────────────────────────────────────────────
// Motor de la ventana de agente y del mazo de hilos (design/rediseno-workos-v2.md
// §2 P05, §1.5 contrato de vida, §1.7 interactividad).
//
//   montarAgente(root)  · root = [data-w2-agente] de VentanaAgente.astro
//   montarMazo(root)    · root = [data-w2-mazo]   de MazoHilos.astro
//
// Reglas que cumple:
// · Nada arranca hasta que la pieza entra en vista (umbral 35 %). Sin JS o con
//   reducir movimiento, el HTML ya trae el estado final (opción 1 completa).
// · Demo con guion: se reproduce UNA vez al entrar y se queda en un estado final con
//   micro-vida (cursor que parpadea). Fuera de vista ≥ 8 s y vuelta → se reproduce de nuevo.
// · Elección automática: si nadie elige en 6 s, un cursor fantasma elige UNA vez por
//   ciclo. Se retira para siempre al primer pointerdown/pointerenter/focusin/keydown en
//   la pieza. Nunca dispara `mrc:ask` ni escribe en aria-live.
// · `mrc:ask` SOLO con un clic o Enter explícito en "Pregúntale tú a Marcy".
// · Todo se busca dentro de su nodo (root.querySelector), nunca global.
// ─────────────────────────────────────────────────────────────
import { GUIONES, T, type Bloque, type Parte, type Lang, type Escenario } from './guiones';

const RM = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Estado GLOBAL de pausa (§1.5) ───────────────────────────────
// Clave y evento compartidos con loop.ts (pendiente de que loop.ts los adopte):
//   sessionStorage 'w2:pausa' = '1'  ·  window 'w2:pausa' { detail: { pausa: boolean } }
const PAUSA_KEY = 'w2:pausa';
export function pausaGlobal(): boolean {
  try { return sessionStorage.getItem(PAUSA_KEY) === '1'; } catch { return false; }
}
export function setPausaGlobal(p: boolean) {
  try { p ? sessionStorage.setItem(PAUSA_KEY, '1') : sessionStorage.removeItem(PAUSA_KEY); } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new CustomEvent('w2:pausa', { detail: { pausa: p } }));
}

// ── Programador cancelable y PAUSABLE ───────────────────────────
// pause() congela lo pendiente (fuera de vista, pestaña oculta) y resume() lo retoma
// donde iba: el guion y la elección automática solo corren mientras se ven (§1.5).
function reloj() {
  type Job = { id: number; due: number; fn: () => void };
  let js: Job[] = [];
  let pausado = 0;
  const run = (j: Job) => {
    j.id = window.setTimeout(() => { js = js.filter((x) => x !== j); j.fn(); }, Math.max(0, j.due - performance.now()));
  };
  return {
    at(ms: number, fn: () => void) {
      const j: Job = { id: 0, due: (pausado || performance.now()) + ms, fn };
      js.push(j);
      if (!pausado) run(j);
    },
    cancel() { js.forEach((j) => clearTimeout(j.id)); js = []; },
    pause() { if (pausado) return; pausado = performance.now(); js.forEach((j) => clearTimeout(j.id)); },
    resume() {
      if (!pausado) return;
      const d = performance.now() - pausado;
      pausado = 0;
      js.forEach((j) => { j.due += d; run(j); });
    },
  };
}

// ── Pintado de bloques (mismo marcado que el HTML del servidor) ──
const h = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
function partes(el: HTMLElement, ps: Parte[]) {
  ps.forEach((p) => el.append(p.b ? h('b', undefined, p.s) : document.createTextNode(p.s)));
  return el;
}
/** Devuelve las filas en orden de entrada + los índices de paso para marcarlos. */
function filas(bloques: Bloque[]) {
  const out: { el: HTMLElement; paso?: HTMLElement }[] = [];
  bloques.forEach((b) => {
    if (b.t === 'paso') {
      const p = h('p', 'va__paso');
      p.dataset.st = 'pend';
      p.append(h('i', 'va__dot'), h('span', 'va__pt', b.texto));
      out.push({ el: p, paso: p });
      b.ramas.forEach((r, k) => {
        const f = h('p', 'va__rama');
        f.append(h('span', 'va__rg', k === b.ramas.length - 1 ? '└' : '├'));
        // "Clave: valor" → columna alineada (10ch) + valor en tinta de acento (W-ADV-16).
        const m = r.match(/^([^:]{1,12}): (.+)$/);
        if (m) f.append(h('span', 'va__rk', m[1]), h('span', 'va__rv', m[2]));
        else f.append(h('span', undefined, r));
        out.push({ el: f });
      });
    } else {
      out.push({ el: partes(h('p', 'va__txt'), b.partes) });
    }
  });
  return out;
}

// ── Cursor fantasma ─────────────────────────────────────────────
function fantasma(root: HTMLElement, target: HTMLElement, done: () => void, rl: ReturnType<typeof reloj>) {
  const g = root.querySelector<HTMLElement>('[data-w2-fantasma]');
  if (!g) { done(); return; }
  const rr = root.getBoundingClientRect();
  const tr = target.getBoundingClientRect();
  const x = tr.left - rr.left + Math.min(120, tr.width * 0.4);
  const y = tr.top - rr.top + tr.height * 0.55;
  g.style.transition = 'none';
  g.style.transform = `translate(${x + 60}px, ${y + 70}px)`;
  g.style.opacity = '0';
  void g.offsetWidth;
  g.style.transition = 'transform 700ms cubic-bezier(.22,1,.36,1), opacity 200ms linear';
  g.style.opacity = '1';
  g.style.transform = `translate(${x}px, ${y}px)`;
  rl.at(760, () => { g.classList.add('is-press'); target.classList.add('is-hot'); });
  rl.at(940, () => { g.classList.remove('is-press'); done(); });
  // Retirada fuera del reloj: la escena que arranca cancela su reloj, no el fantasma.
  window.setTimeout(() => { g.style.opacity = '0'; target.classList.remove('is-hot'); }, 1500);
}

// ── Segmentado accesible (radiogroup con tabulación itinerante) ──
function segmentado(group: HTMLElement, onPick: (v: string) => void) {
  const radios = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const pill = group.querySelector<HTMLElement>('[data-w2-pill]');
  const paint = (v: string) => {
    radios.forEach((r, i) => {
      const on = r.dataset.v === v;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
      if (on && pill) {
        pill.style.width = `${r.offsetWidth}px`;
        pill.style.transform = `translateX(${r.offsetLeft - 2}px)`;
      }
      void i;
    });
  };
  const pick = (r: HTMLButtonElement) => { if (r.getAttribute('aria-checked') === 'true') return; paint(r.dataset.v!); onPick(r.dataset.v!); };
  radios.forEach((r, i) => {
    r.addEventListener('click', () => pick(r));
    r.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'ArrowUp' && k !== 'ArrowDown') return;
      e.preventDefault();
      const n = radios[(i + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : radios.length - 1)) % radios.length];
      n.focus(); pick(n);
    });
  });
  const cur = radios.find((r) => r.getAttribute('aria-checked') === 'true') ?? radios[0];
  requestAnimationFrame(() => paint(cur.dataset.v!));
  // El ancho de las etiquetas cambia con la fuente: se repinta cuando carga.
  document.fonts?.ready.then(() => paint(radios.find((r) => r.getAttribute('aria-checked') === 'true')!.dataset.v!));
  return { paint };
}

// ── Navegación con flechas en una lista de botones de acción ─────
function flechas(btns: HTMLButtonElement[], onMove?: (i: number) => void) {
  btns.forEach((b, i) => {
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const vis = btns.filter((x) => !x.closest('[hidden]'));
      const j = vis.indexOf(b);
      const n = vis[(j + (e.key === 'ArrowDown' ? 1 : vis.length - 1)) % vis.length];
      n.focus(); onMove?.(btns.indexOf(n));
    });
    b.addEventListener('focus', () => onMove?.(i));
    b.addEventListener('pointerenter', () => onMove?.(i));
  });
}

// ── Observación de vista con reentrada ≥ 8 s ────────────────────
function vista(root: HTMLElement, onEnter: (reentrada: boolean) => void, onLeave?: () => void, onReturn?: () => void) {
  let visto = false;
  let salida = 0;
  if (!('IntersectionObserver' in window)) { onEnter(false); return; }
  const io = new IntersectionObserver((es) => {
    const e = es[es.length - 1];
    if (e.isIntersecting && e.intersectionRatio >= 0.35) {
      if (!visto) { visto = true; onEnter(false); }
      else if (salida && performance.now() - salida >= T.reentrada) { salida = 0; onEnter(true); }
      else if (salida) { salida = 0; onReturn?.(); }
    } else if (!e.isIntersecting && visto && !salida) {
      salida = performance.now(); onLeave?.();
    }
  }, { threshold: [0, 0.35] });
  io.observe(root);
}

// ═════════════════════════════════════════════════════════════
// VentanaAgente
// ═════════════════════════════════════════════════════════════
export function montarAgente(root: HTMLElement) {
  if (root.dataset.w2Montado) return;
  root.dataset.w2Montado = '1';
  const guion = root.dataset.guion as 'marcy' | 'buscar';
  if (guion === 'buscar') return montarBuscar(root);

  let lang = (root.dataset.lang as Lang) || 'es';
  const pageLang = lang;
  const q = <E extends HTMLElement = HTMLElement>(s: string) => root.querySelector<E>(s)!;
  const win = q('.va__win');
  const titulo = q('[data-w2-titulo]');
  const log = q('[data-w2-log]');
  const menu = q('[data-w2-menu]');
  const ops = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-w2-op]'));
  const ask = q<HTMLButtonElement>('[data-w2-ask]');
  const live = q('[data-w2-live]');
  const rl = reloj();
  let actual = 0; // escena activa
  let corriendo = false;
  let autoHecha = false; // elección automática ya usada en este ciclo
  let tocado = false; // el visitante ya interactuó: el fantasma se retira para siempre
  const hechas = new Set<number>([0]);

  const G = () => GUIONES.marcy[lang];

  // Textos que dependen del idioma (cabecera, menú, pie, sr).
  const pintarTextos = () => {
    const g = G();
    root.querySelectorAll<HTMLElement>('[data-w2-t]').forEach((el) => {
      const k = el.dataset.w2T as keyof typeof g;
      const v = g[k];
      if (typeof v === 'string') el.textContent = v;
    });
    ops.forEach((b, i) => { b.querySelector('[data-w2-optxt]')!.textContent = g.escenas[i].opcion; });
    root.querySelectorAll<HTMLElement>('[data-w2-hecha]').forEach((e) => { e.textContent = `(${g.hecha})`; });
    const sr = root.querySelector<HTMLElement>('[data-w2-sr]');
    if (sr) sr.textContent = g.sr;
    // Spans del otro idioma con su `lang` (§1.6).
    if (lang !== pageLang) { win.setAttribute('lang', lang); menu.setAttribute('lang', lang); sr?.setAttribute('lang', lang); }
    else { win.removeAttribute('lang'); menu.removeAttribute('lang'); sr?.removeAttribute('lang'); }
  };

  const pintarHechas = () => {
    ops.forEach((b, i) => {
      b.classList.toggle('is-done', hechas.has(i));
      b.classList.toggle('is-on', i === actual);
      b.querySelector<HTMLElement>('[data-w2-hecha]')!.hidden = !hechas.has(i);
    });
  };

  // Estado final de una escena, sin animación (reducir movimiento y cambio de idioma en RM).
  const finalDe = (i: number) => {
    const e = G().escenas[i];
    log.replaceChildren();
    const ev = h('div', 'va__ev');
    ev.append(h('p', 'va__evl', G().evento));
    const band = h('p', 'va__band is-sent');
    band.append(h('span', 'va__q', e.cliente));
    ev.append(band);
    log.append(ev);
    const resp = h('div', 'va__resp');
    filas(e.bloques).forEach((f) => { if (f.paso) f.paso.dataset.st = 'ok'; resp.append(f.el); });
    resp.append(partes(h('p', 'va__cierre'), e.cierre));
    log.append(resp);
    titulo.textContent = `✳ ${e.titulo}`;
  };

  const mostrarMenu = (si: boolean) => {
    menu.classList.toggle('is-off', !si);
    menu.toggleAttribute('inert', !si);
  };

  // Reproduce la escena i. primera = el guion completo de entrada (ventana que aparece).
  const reproducir = (i: number, primera: boolean) => {
    rl.cancel();
    actual = i;
    corriendo = true;
    root.classList.add('is-run');
    menu.setAttribute('aria-busy', 'true');
    const g = G();
    const e = g.escenas[i];
    pintarHechas();

    if (RM()) { finalDe(i); terminar(i, false); return; }

    log.replaceChildren();
    titulo.textContent = g.tituloInicial;
    if (primera) {
      mostrarMenu(false);
      win.classList.remove('is-in');
      void win.offsetWidth;
      win.classList.add('is-in');
    }
    const t0 = primera ? T.evento : 250;
    // En la entrada, la banda se envía a T.enviado en los dos idiomas (W-ADV-16): una frase más
    // larga se teclea algo más rápido, nunca más despacio que 60 ms/letra.
    const letra = primera ? Math.min(T.letra, (T.enviado - 320 - T.evento) / e.cliente.length) : T.letra;
    const fin = t0 + e.cliente.length * letra;
    const enviado = fin + 320;
    const respuesta = enviado + 1400;

    // Evento del historial: rótulo + banda que se escribe a 60 ms/letra.
    const ev = h('div', 'va__ev');
    const band = h('p', 'va__band');
    const qtxt = h('span', 'va__q');
    band.append(qtxt, h('i', 'va__car'));
    ev.append(h('p', 'va__evl', g.evento), band);
    rl.at(t0, () => log.append(ev));
    for (let k = 1; k <= e.cliente.length; k++) rl.at(t0 + k * letra, () => { qtxt.textContent = e.cliente.slice(0, k); });

    // Enviado: banda fijada, título nuevo, spinner.
    const spin = h('p', 'va__spin');
    const gl = h('span', 'va__gl');
    gl.append(h('span', 'va__gls', '· ✢ ✳ ✶ ✻ ✽ ✻ ✶ ✳ ✢'.split(' ').join('\n')));
    spin.append(gl, h('span', 'va__spt', e.pensando));
    rl.at(enviado, () => {
      band.classList.add('is-sent');
      titulo.textContent = `✳ ${e.titulo}`;
      log.append(spin);
    });

    // Respuesta en bloques, filas cada 150 ms; cada paso pasa a check.
    const resp = h('div', 'va__resp');
    const fs = filas(e.bloques);
    rl.at(respuesta, () => { spin.remove(); log.append(resp); });
    const pasos: { el: HTMLElement; ultima: number }[] = [];
    fs.forEach((f, k) => {
      rl.at(respuesta + k * T.fila, () => { f.el.classList.add('is-new'); resp.append(f.el); });
      if (f.paso) pasos.push({ el: f.paso, ultima: k });
      else if (pasos.length) pasos[pasos.length - 1].ultima = k;
    });
    pasos.forEach((p, j) => {
      const cuando = respuesta + (p.ultima + 1) * T.fila + 150 + j * 150;
      rl.at(cuando, () => { p.el.dataset.st = 'ok'; });
    });
    const cierre = Math.max(respuesta + fs.length * T.fila + 400, respuesta + 1000);
    rl.at(cierre, () => {
      const c = partes(h('p', 'va__cierre is-new'), e.cierre);
      resp.append(c);
    });
    rl.at(cierre + 500, () => terminar(i, true));
  };

  const terminar = (i: number, avisar: boolean) => {
    corriendo = false;
    root.classList.remove('is-run');
    menu.removeAttribute('aria-busy');
    hechas.add(i);
    pintarHechas();
    mostrarMenu(true);
    // Resumen del resultado en aria-live: solo si lo eligió el visitante.
    if (avisar && tocado) {
      const e = G().escenas[i];
      live.textContent = e.cierre.map((p) => p.s).join('');
    }
    // Elección automática: una vez por ciclo, solo si nadie ha tocado.
    if (!autoHecha && !tocado && !RM() && !pausaGlobal()) {
      rl.at(T.inactivo, () => {
        if (tocado || autoHecha || corriendo || pausaGlobal()) return;
        autoHecha = true;
        const sig = (actual + 1) % ops.length;
        fantasma(root, ops[sig], () => { if (!tocado) reproducir(sig, false); }, rl);
      });
    }
  };

  // El visitante toma el control: el fantasma se retira para siempre.
  const retirar = () => {
    if (tocado) return;
    tocado = true;
    const g = root.querySelector<HTMLElement>('[data-w2-fantasma]');
    if (g) g.style.opacity = '0';
    // Cancela una elección automática pendiente (sin cortar una escena en curso).
    if (!corriendo) rl.cancel();
  };
  const ctrl = q('[data-w2-ctrl]');
  ['pointerdown', 'pointerenter', 'keydown'].forEach((ev) => root.addEventListener(ev, retirar, { passive: true }));
  ctrl.addEventListener('focusin', retirar);
  root.addEventListener('focusin', retirar);

  // Menú: clic o Enter/Espacio (botón nativo) reproduce; flechas mueven.
  flechas([...ops, ask], (i) => {
    if (corriendo) return;
    ops.forEach((b, k) => b.classList.toggle('is-on', k === i));
  });
  ops.forEach((b, i) => b.addEventListener('click', () => {
    if (corriendo) return;
    retirar();
    reproducir(i, false);
  }));
  ask.addEventListener('mouseenter', () => ops.forEach((b) => b.classList.remove('is-on')));
  ask.addEventListener('click', (ev) => {
    // Solo un gesto real del visitante (clic o Enter): nunca el fantasma ni un script.
    if (!ev.isTrusted) return;
    // Frase pensada para el VISITANTE (dueño de negocio), nunca la del cliente del ejemplo.
    const texto = root.dataset.pregunta || G().escenas[actual].pide;
    window.dispatchEvent(new CustomEvent('mrc:ask', { detail: { text: texto } }));
  });

  // Segmentado de idioma.
  const seg = root.querySelector<HTMLElement>('[data-w2-seg]');
  if (seg) segmentado(seg, (v) => {
    lang = v as Lang;
    root.dataset.lang = lang;
    pintarTextos();
    retirar();
    if (RM()) { finalDe(actual); pintarHechas(); return; }
    reproducir(actual, false);
  });

  pintarHechas();
  if (RM()) return; // estado final del HTML, menú operativo
  root.classList.add('is-armed'); // la ventana espera fuera de vista (sin pintar el final)

  // Pausa: el reloj solo corre a la vista y con la pestaña visible. La pausa GLOBAL (§1.5)
  // deja la escena en su estado final, quieta (sin micro-vida ni elección automática); el menú
  // sigue respondiendo porque elegir es un gesto del visitante.
  let fuera = true;
  const sincronizar = () => {
    const pg = pausaGlobal();
    root.classList.toggle('is-pausa', pg);
    if (fuera || document.hidden) { rl.pause(); return; }
    if (pg && corriendo && !tocado) { rl.cancel(); finalDe(actual); terminar(actual, false); }
    rl.resume();
  };
  const entrar = (re: boolean) => {
    fuera = false;
    rl.cancel();
    rl.resume();
    if (re) { autoHecha = false; hechas.clear(); hechas.add(0); }
    if (pausaGlobal()) {
      root.classList.remove('is-armed');
      actual = 0; finalDe(0); terminar(0, false); pintarHechas();
      root.classList.add('is-pausa');
      return;
    }
    reproducir(0, true);
  };
  vista(root, entrar, () => { fuera = true; sincronizar(); }, () => { fuera = false; sincronizar(); });
  document.addEventListener('visibilitychange', sincronizar);
  window.addEventListener('w2:pausa', sincronizar);
}

// ═════════════════════════════════════════════════════════════
// Guion "buscar" (piel hueso, espera la elección del visitante)
// ═════════════════════════════════════════════════════════════
function montarBuscar(root: HTMLElement) {
  const lang = (root.dataset.lang as Lang) || 'es';
  const g = GUIONES.buscar[lang];
  const q = <E extends HTMLElement = HTMLElement>(s: string) => root.querySelector<E>(s)!;
  const menu = q('[data-w2-menu]');
  const ops = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-w2-op]'));
  const log = q('[data-w2-log]');
  const otra = q<HTMLButtonElement>('[data-w2-otra]');
  const live = q('[data-w2-live]');
  const rl = reloj();
  let esc: Escenario = (root.dataset.escenario as Escenario) || 'con';
  let elegida = 2;
  let tocado = false;
  let autoHecha = false;
  let corriendo = false;

  const esperar = () => {
    rl.cancel();
    log.replaceChildren();
    menu.hidden = false;
    otra.hidden = true;
    root.classList.remove('is-answered');
  };

  const responder = (i: number, animar: boolean) => {
    rl.cancel();
    elegida = i;
    menu.hidden = true;
    otra.hidden = true;
    root.classList.add('is-answered');
    log.replaceChildren();
    log.append(h('p', 'vb__pq', g.pregunta));
    const col = h('p', 'vb__col');
    col.append(h('span', 'vb__colm', '›'), document.createTextNode(` ${g.opciones[i]}`));
    log.append(col);
    const r = g.respuestas[esc];
    const items: HTMLElement[] = [h('p', 'va__txt', g.intro)];
    const fs = filas(r.bloques);
    const pasos = fs.filter((f) => f.paso).map((f) => f.paso!);
    fs.forEach((f) => items.push(f.el));
    const cierre = partes(h('p', 'va__cierre'), r.cierre);
    items.push(cierre);
    if (!animar) {
      pasos.forEach((p) => { p.dataset.st = 'ok'; });
      items.forEach((it) => log.append(it));
      otra.hidden = false;
      return;
    }
    corriendo = true;
    // Por bloques cada 0,6-1 s (W-NEW-04): intro, paso 1 con ramas, paso 2 con ramas, cierre.
    let t = 350;
    let pasoPend: HTMLElement | null = null;
    items.forEach((it) => {
      const esPaso = it.classList.contains('va__paso');
      const esRama = it.classList.contains('va__rama');
      if (esPaso || it === cierre) {
        const prev = pasoPend;
        if (prev) rl.at(t, () => { prev.dataset.st = 'ok'; });
        t += esPaso ? 700 : 600;
        if (esPaso) pasoPend = it;
      } else if (esRama) t += 160;
      else t += 0;
      rl.at(t, () => { it.classList.add('is-new'); log.append(it); });
    });
    rl.at(t + 700, () => {
      corriendo = false;
      otra.hidden = false;
      if (tocado) live.textContent = r.cierre.map((p) => p.s).join('');
    });
  };

  const retirar = () => {
    if (tocado) return;
    tocado = true;
    const gh = root.querySelector<HTMLElement>('[data-w2-fantasma]');
    if (gh) gh.style.opacity = '0';
    if (!corriendo) rl.cancel();
  };
  ['pointerdown', 'pointerenter', 'keydown', 'focusin'].forEach((ev) => root.addEventListener(ev, retirar, { passive: true }));

  flechas(ops, (i) => ops.forEach((b, k) => b.classList.toggle('is-on', k === i)));
  ops.forEach((b, i) => b.addEventListener('click', () => { retirar(); responder(i, !RM()); }));
  otra.addEventListener('click', () => { esperar(); ops[elegida]?.focus(); });

  const seg = root.querySelector<HTMLElement>('[data-w2-seg]');
  if (seg) segmentado(seg, (v) => {
    esc = v as Escenario;
    root.dataset.escenario = esc;
    retirar();
    if (root.classList.contains('is-answered')) responder(elegida, !RM());
  });

  if (RM()) return; // estado final del HTML (respuesta a la 3), "Otra pregunta" operativa
  // Arranca ESPERANDO, como el original: el menú es lo primero que se ve.
  esperar();
  let fuera = true;
  const sincronizar = () => {
    root.classList.toggle('is-pausa', pausaGlobal());
    if (fuera || document.hidden) rl.pause(); else rl.resume();
  };
  vista(root, (re) => {
    fuera = false;
    rl.resume();
    if (re && !tocado) { autoHecha = false; esperar(); }
    if (autoHecha || tocado || pausaGlobal()) return;
    rl.at(T.inactivo, () => {
      if (tocado || autoHecha || pausaGlobal()) return;
      autoHecha = true;
      fantasma(root, ops[2], () => { if (!tocado) responder(2, true); }, rl);
    });
  }, () => { fuera = true; sincronizar(); }, () => { fuera = false; sincronizar(); });
  document.addEventListener('visibilitychange', sincronizar);
  window.addEventListener('w2:pausa', sincronizar);
  sincronizar();
}

// ═════════════════════════════════════════════════════════════
// MazoHilos · carrusel de 4 conversaciones (W-ADV-22)
// ═════════════════════════════════════════════════════════════
export function montarMazo(root: HTMLElement) {
  if (root.dataset.w2Montado) return;
  root.dataset.w2Montado = '1';
  const cartas = Array.from(root.querySelectorAll<HTMLElement>('[data-w2-carta]'));
  const puntos = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-w2-punto]'));
  const prev = root.querySelector<HTMLButtonElement>('[data-w2-prev]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-w2-next]')!;
  const pausa = root.querySelector<HTMLButtonElement>('[data-w2-pausa]')!;
  const live = root.querySelector<HTMLElement>('[data-w2-live]')!;
  const n = cartas.length;
  const PASO = 5000;
  let i = 0;
  let enVista = false;
  let hover = false;
  let foco = false;
  let usuario = pausaGlobal();
  let tid = 0;
  let reduced = RM();
  const L = root.dataset.lang === 'en'
    ? { pause: 'Pause', play: 'Resume', pauseL: 'Pause conversations', playL: 'Resume conversations' }
    : { pause: 'Pausar', play: 'Reanudar', pauseL: 'Pausar conversaciones', playL: 'Reanudar conversaciones' };

  let delante = 0;
  const pintar = (anunciar: boolean) => {
    // Avance hacia delante: la carta de delante sale hacia arriba y se apaga (400 ms).
    if (!reduced && delante !== i && (delante + 1) % n === i) {
      const sale = cartas[delante];
      sale.classList.add('is-out');
      window.setTimeout(() => sale.classList.remove('is-out'), 400);
    }
    delante = i;
    cartas.forEach((c, k) => {
      const pos = (k - i + n) % n; // 0 = delante
      c.dataset.pos = String(pos);
      c.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      c.toggleAttribute('inert', pos !== 0);
    });
    puntos.forEach((p, k) => {
      const on = k === i;
      p.setAttribute('aria-current', on ? 'true' : 'false');
      p.classList.toggle('is-on', on);
    });
    if (anunciar) live.textContent = cartas[i].dataset.titulo ?? '';
  };
  const corre = () => !reduced && enVista && !hover && !foco && !usuario && !document.hidden;
  const sync = () => {
    clearTimeout(tid);
    const on = corre();
    root.classList.toggle('is-playing', on);
    if (on) {
      // Reinicia la barra de progreso del punto activo.
      root.classList.remove('is-tick'); void root.offsetWidth; root.classList.add('is-tick');
      tid = window.setTimeout(() => { i = (i + 1) % n; pintar(false); sync(); }, PASO);
    } else root.classList.remove('is-tick');
  };
  const ir = (k: number) => { i = (k + n) % n; pintar(true); sync(); };
  const pintarPausa = () => {
    pausa.setAttribute('aria-pressed', String(usuario));
    pausa.setAttribute('aria-label', usuario ? L.playL : L.pauseL);
    pausa.querySelector('[data-w2-pausa-t]')!.textContent = usuario ? L.play : L.pause;
    pausa.dataset.estado = usuario ? 'pausa' : 'marcha';
  };

  prev.addEventListener('click', () => ir(i - 1));
  next.addEventListener('click', () => ir(i + 1));
  puntos.forEach((p, k) => p.addEventListener('click', () => ir(k)));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(i + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(i - 1); }
  });
  pausa.addEventListener('click', () => { usuario = !usuario; setPausaGlobal(usuario); pintarPausa(); sync(); });
  window.addEventListener('w2:pausa', (e) => {
    const p = !!(e as CustomEvent).detail?.pausa;
    if (p !== usuario) { usuario = p; pintarPausa(); sync(); }
  });
  const pila = root.querySelector<HTMLElement>('[data-w2-pila]')!;
  pila.addEventListener('pointerenter', () => { hover = true; sync(); });
  pila.addEventListener('pointerleave', () => { hover = false; sync(); });
  root.addEventListener('focusin', (e) => { if (e.target === pausa) return; foco = true; sync(); });
  root.addEventListener('focusout', (e) => {
    if (e.relatedTarget instanceof Node && root.contains(e.relatedTarget) && e.relatedTarget !== pausa) return;
    foco = false; sync();
  });
  document.addEventListener('visibilitychange', sync);
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener?.('change', (e) => { reduced = e.matches; root.classList.toggle('is-rm', reduced); sync(); });
  root.classList.toggle('is-rm', reduced);
  root.classList.add('is-js');

  pintar(false);
  pintarPausa();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { enVista = es[es.length - 1].isIntersecting; sync(); }, { rootMargin: '100px' }).observe(root);
  } else { enVista = true; sync(); }
}
