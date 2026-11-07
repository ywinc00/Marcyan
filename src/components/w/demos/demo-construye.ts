// ─────────────────────────────────────────────────────────────
// Motor de DemoConstruye + Personalizador (P01 · design/rediseno-workos-v2.md §2 P01, §1.5, §1.7).
//
// · Consola (estado 1): se reproduce UNA vez al entrar la demo en vista (35 %), con los tiempos medidos
//   en el original (C/01): consola 60 ms · comando 214 · leyenda 290 · esqueleto en cascada 500-1460 cada
//   120 ms · bloques 570 / 1210 / 2120 / 2970 · check 2970-3070 · barrido de revelado 3220 (1170 ms).
//   El estado de salida (vacío) se pone al montar y, para repetir, se rearma con la demo ≥ 8 s del todo
//   fuera de vista en estado 1; pasar del estado 2 al 1 al subir NO la repite.
// · Estado 1 ⇄ 2 por umbral: la cabecera del bloque 2 cruza el 50 % de la ventana (IntersectionObserver).
// · Personalizador: cada clic escribe --ej-s-* o data-ej-* en el [data-ej-scope] (contrato WebEjemplo,
//   P02a). Grupos radiogroup con tabulación itinerante y flechas. Resumen en aria-live SOLO con cambios
//   del visitante; elecciones del visitante en sessionStorage (try/catch).
// · Cursor fantasma (§1.5): si nadie toca en 6 s, un ajuste cada 4 s (color → marcos → idioma), máx. 3;
//   se retira para siempre al primer pointerdown/focusin/keydown (v4: el hover ya no); nunca con reducir movimiento,
//   nunca escribe en aria-live ni en sessionStorage.
// · Solo transform/opacity; los nodos se buscan dentro de su raíz (nunca document.querySelector global).
// ─────────────────────────────────────────────────────────────

type Pal = { bg: string; ink: string; ink2: string; accent: string; onAccent: string };
type Item = { v: string; n: string; w?: number };
interface Datos {
  colores: { n: string; d: Pal; o: Pal }[];
  marcos: Item[]; modos: Item[]; idiomas: Item[]; letras: Item[]; botones: Item[];
  pieza: Record<string, string>; tuWeb: string;
  ini: Record<G, number>; marca: string; sinRailes: string;
}
type G = 'color' | 'marcos' | 'modo' | 'idioma' | 'letra' | 'botones';
type Quien = 'user' | 'ghost' | 'init';

const EASE = 'cubic-bezier(.22,1,.36,1)';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const apilado = () => matchMedia('(max-width: 1119.98px)').matches;
const $$ = <T extends Element = HTMLElement>(r: ParentNode, s: string) => Array.from(r.querySelectorAll<T & Element>(s)) as T[];

// Dónde poner la etiqueta fina de cada ajuste (detalle Pedestal): la parte que cambia en la maqueta.
const PARTE: Record<G, string> = {
  color: '.ej__btn', marcos: '.ej__marco', botones: '.ej__btn', modo: '.ej__tit', idioma: '.ej__tit', letra: '.ej__tit',
};

// ── Grupos radio: clic y flechas (APG), tabulación itinerante ──
function marcar(grupo: HTMLElement, i: number) {
  $$(grupo, '[role="radio"]').forEach((b, k) => {
    b.setAttribute('aria-checked', String(k === i));
    b.tabIndex = k === i ? 0 : -1;
  });
  grupo.setAttribute('data-i', String(i));
}
function radios(raiz: HTMLElement, alElegir: (grupo: HTMLElement, i: number) => void) {
  const elegir = (b: HTMLElement, foco: boolean) => {
    const g = b.closest<HTMLElement>('[role="radiogroup"]');
    if (!g) return;
    const i = $$(g, '[role="radio"]').indexOf(b);
    if (foco) b.focus();
    alElegir(g, i);
  };
  raiz.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[role="radio"]');
    if (b && raiz.contains(b)) elegir(b, false);
  });
  raiz.addEventListener('keydown', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[role="radio"]');
    const g = b?.closest<HTMLElement>('[role="radiogroup"]');
    if (!b || !g) return;
    const todos = $$(g, '[role="radio"]');
    let i = todos.indexOf(b);
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight') i = (i + 1) % todos.length;
    else if (k === 'ArrowUp' || k === 'ArrowLeft') i = (i - 1 + todos.length) % todos.length;
    else if (k === 'Home') i = 0;
    else if (k === 'End') i = todos.length - 1;
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); elegir(b, false); return; }
    else return;
    e.preventDefault();
    elegir(todos[i], true);
  });
}

function cuandoVisible(el: Element, cb: () => void, margen = '200px') {
  const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); cb(); } }, { rootMargin: margen });
  io.observe(el);
}

// ─────────────────────────────────────────────────────────────
// Personalizador
// ─────────────────────────────────────────────────────────────
interface Pz { estado: Record<G, number>; quieto: () => boolean; fantasmaFuera: () => void }

function montarPz(pz: HTMLElement, pieza: HTMLElement, activo: () => boolean): Pz {
  const D: Datos = JSON.parse(pz.getAttribute('data-pz-datos') || '{}');
  const estado = { ...D.ini } as Record<G, number>;
  const tray = pz.querySelector<HTMLElement>('[data-pz-tray]')!;
  const card = tray.querySelector<HTMLElement>('.pz-tray__card')!;
  const tag = pz.querySelector<HTMLElement>('[data-pz-tag]')!;
  const shine = pz.querySelector<HTMLElement>('.pz-shine');
  const sum = pz.querySelector<HTMLElement>('[data-pz-sum]')!;
  const live = pz.querySelector<HTMLElement>('[data-pz-live]')!;
  const clave = `mrc-pz:${D.marca}`;
  let tagT = 0;

  const resumen = () =>
    `${D.tuWeb}: ${D.colores[estado.color].n} · ${D.marcos[estado.marcos].n} · ${D.botones[estado.botones].n} · ${D.idiomas[estado.idioma].n}`;

  const escribir = (g: G) => {
    const s = pz.style;
    if (g === 'color' || g === 'modo') {
      const c = D.colores[estado.color];
      const p = estado.modo === 1 ? c.o : c.d;
      s.setProperty('--ej-s-bg', p.bg); s.setProperty('--ej-s-ink', p.ink); s.setProperty('--ej-s-ink-2', p.ink2);
      s.setProperty('--ej-s-accent', p.accent); s.setProperty('--ej-s-on-accent', p.onAccent);
      pz.setAttribute('data-ej-mode', D.modos[estado.modo].v);
    } else if (g === 'marcos') s.setProperty('--ej-s-radius', D.marcos[estado.marcos].v);
    else if (g === 'letra') { const f = D.letras[estado.letra]; s.setProperty('--ej-s-font-display', f.v); s.setProperty('--ej-s-display-weight', String(f.w ?? 500)); }
    else if (g === 'botones') pz.setAttribute('data-ej-btn', D.botones[estado.botones].v);
    else if (g === 'idioma') pz.setAttribute('data-ej-lang', D.idiomas[estado.idioma].v); // <ej-web> pinta el otro idioma
  };

  const etiqueta = (g: G) => {
    const vista = card.querySelector('.pz-view.is-on') ?? card;
    const t = $$(vista, PARTE[g]).find((x) => x.getClientRects().length) as HTMLElement | undefined;
    if (!t) return;
    // Marco de selección ajustado a la pieza (2 px de aire) con su mismo radio; el rótulo va encima
    // (en el hueco sobre la pieza) y, si la pieza llega al borde de la bandeja, por dentro.
    const r = t.getBoundingClientRect(); const b = tray.getBoundingClientRect();
    const pad = g === 'marcos' ? 0 : 2;
    tag.style.left = `${Math.round(r.left - b.left - pad)}px`;
    tag.style.top = `${Math.round(r.top - b.top - pad)}px`;
    tag.style.width = `${Math.round(r.width + pad * 2)}px`;
    tag.style.height = `${Math.round(r.height + pad * 2)}px`;
    const rad = parseFloat(getComputedStyle(t).borderTopLeftRadius) || 0;
    tag.style.borderRadius = `${Math.min(999, rad + pad)}px`;
    // Titular: el rótulo va encima y a la derecha (hueco tras el antetítulo corto); el resto, encima a la izquierda.
    tag.classList.toggle('is-in', PARTE[g] === '.ej__tit');
    tag.querySelector('b')!.textContent = D.pieza[g];
    tag.classList.add('is-on');
    clearTimeout(tagT); tagT = window.setTimeout(() => tag.classList.remove('is-on'), 1200);
  };

  // Rediseño: Antes (0) / Después (1).
  const verAB = (ab: HTMLElement, i: number) => {
    const seg = ab.querySelector<HTMLElement>('[data-dc-ab-g]');
    if (seg) marcar(seg, i);
    ab.setAttribute('data-i', String(i));
    $$(ab, '[data-dc-ab-v]').forEach((v) => v.classList.toggle('is-on', v.getAttribute('data-dc-ab-v') === String(i)));
  };

  const aplicar = (g: G, i: number, quien: Quien) => {
    const grupo = pz.querySelector<HTMLElement>(`[data-pz-g="${g}"]`);
    if (!grupo || i < 0) return;
    const antes = estado[g];
    estado[g] = i;
    marcar(grupo, i);
    escribir(g);
    sum.textContent = resumen();
    if (quien === 'init') return;
    // Rediseño en "Antes": la web vieja no sigue a la marca; tocar un control enseña el "Después".
    const ab = card.querySelector<HTMLElement>('.pz-view.is-on [data-dc-ab][data-i="0"]');
    if (ab) verAB(ab, 1);
    if (antes !== i && g === 'idioma' && shine && !reduced()) { shine.classList.remove('is-on'); void shine.offsetWidth; shine.classList.add('is-on'); }
    if (!reduced()) etiqueta(g);
    if (quien === 'user') {
      live.textContent = resumen();
      try { sessionStorage.setItem(clave, JSON.stringify(estado)); } catch { /* sin almacenamiento */ }
    }
  };

  // Lo elegido en esta sesión (solo del visitante) se repinta sin anuncio ni etiqueta; quien ya
  // tocó el personalizador no vuelve a ver el cursor fantasma.
  let yaToco = false;
  try {
    const g = JSON.parse(sessionStorage.getItem(clave) || 'null');
    yaToco = !!g;
    if (g) (Object.keys(D.ini) as G[]).forEach((k) => { if (typeof g[k] === 'number' && g[k] !== estado[k]) aplicar(k, g[k], 'init'); });
  } catch { /* sin almacenamiento */ }

  // ── Opciones de la lista (Landing / Rediseño / A medida): la maqueta inactiva vive en <template> ──
  const sinRailes = D.sinRailes.split(' ').filter(Boolean);
  const verOpcion = (id: string) => {
    for (const v of $$(card, '[data-pz-v]')) {
      const on = v.getAttribute('data-pz-v') === id;
      if (on) {
        const tpl = v.querySelector<HTMLTemplateElement>('template[data-pz-tpl]');
        if (tpl) tpl.replaceWith(tpl.content.cloneNode(true));
        v.hidden = false; void v.offsetWidth; v.classList.add('is-on');
      } else if (v.classList.contains('is-on')) {
        v.classList.remove('is-on');
        window.setTimeout(() => { if (!v.classList.contains('is-on')) v.hidden = true; }, 240);
      }
    }
    pz.setAttribute('data-pz-view', id);
    pz.classList.toggle('is-norails', sinRailes.includes(id));
  };

  radios(pieza, (grupo, i) => {
    fantasmaFuera();
    if (grupo.hasAttribute('data-dc-opts')) {
      marcar(grupo, i);
      const b = $$(grupo, '[role="radio"]')[i];
      verOpcion(b.getAttribute('data-dc-opt') || '');
    } else if (grupo.hasAttribute('data-dc-ab-g')) {
      verAB(grupo.closest<HTMLElement>('[data-dc-ab]')!, i);
    } else {
      const g = grupo.getAttribute('data-pz-g') as G | null;
      if (g) aplicar(g, i, 'user');
    }
  });

  // ── Cursor fantasma ──
  const ghost = pz.querySelector<HTMLElement>('[data-pz-ghost]');
  const pasos: G[] = ['color', 'marcos', 'idioma'];
  let hechos = 0; let retirado = reduced() || yaToco; let t = 0; let visible = false; let desde = 0;
  function fantasmaFuera() { retirado = true; clearTimeout(t); ghost?.classList.remove('is-on'); }
  // Gesto, foco o tecla en cualquier punto de la pieza lo retiran; el ratón solo cuando ENTRA en la demo
  // (con el ratón quieto sobre la columna de texto mientras se baja con la rueda, el fantasma sigue).
  for (const ev of ['pointerdown', 'focusin', 'keydown']) pieza.addEventListener(ev, fantasmaFuera, { once: true, passive: true });
  const ajuste = () => {
    if (retirado || !ghost || hechos >= 3) return;
    // Seis segundos seguidos a la vista y con los controles delante antes del primer ajuste.
    if (!visible) { desde = 0; t = 0; return; } // el observador lo rearma al volver a la vista
    if (!activo() || pz.classList.contains('is-norails') || document.hidden) { desde = 0; t = window.setTimeout(ajuste, 500); return; }
    if (!desde) desde = Date.now();
    const falta = (hechos ? 0 : 6000) - (Date.now() - desde);
    if (falta > 0) { t = window.setTimeout(ajuste, falta); return; }
    const g = pasos[hechos];
    const grupo = pz.querySelector<HTMLElement>(`[data-pz-g="${g}"]`);
    if (!grupo) { hechos++; t = window.setTimeout(ajuste, 100); return; }
    const opts = $$(grupo, '[role="radio"]');
    const i = (estado[g] + 1) % opts.length;
    const b = opts[i];
    const base = (ghost.offsetParent as HTMLElement | null)?.getBoundingClientRect();
    const r = b.getBoundingClientRect();
    if (!base) return;
    ghost.style.transform = `translate(${Math.round(r.left - base.left + r.width / 2 - 3)}px, ${Math.round(r.top - base.top + r.height / 2 - 2)}px)`;
    ghost.classList.add('is-on');
    t = window.setTimeout(() => {
      if (retirado) return;
      ghost.classList.add('is-press');
      aplicar(g, i, 'ghost');
      hechos++;
      t = window.setTimeout(() => {
        ghost.classList.remove('is-press');
        t = window.setTimeout(() => { ghost.classList.remove('is-on'); t = window.setTimeout(ajuste, 3000); }, 500);
      }, 160);
    }, 760);
  };
  if (!retirado) {
    new IntersectionObserver((es) => {
      const antes = visible; visible = es[0].isIntersecting;
      if (visible && !antes && hechos < 3 && !t && !retirado) t = window.setTimeout(ajuste, 500);
    }, { threshold: 0.5 }).observe(tray);
  }

  return { estado, quieto: () => retirado, fantasmaFuera };
}

// ─────────────────────────────────────────────────────────────
// Demo de construcción (consola → web)
// ─────────────────────────────────────────────────────────────
function partir(l: HTMLElement) {
  if (l.hasAttribute('data-dc-split')) return;
  l.setAttribute('data-dc-split', '');
  const tn = Array.from(l.childNodes).find((n) => n.nodeType === 3) as Text | undefined;
  if (!tn) return;
  const f = document.createDocumentFragment();
  Array.from(tn.data).forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'dcc__c'; s.textContent = ch; s.style.setProperty('--d', `${Math.round(i * 6.5)}ms`);
    f.append(s);
  });
  tn.replaceWith(f);
}

function montarDemo(dc: HTMLElement) {
  const pz = dc.querySelector<HTMLElement>('[data-pz]')!;
  const demo = dc.querySelector<HTMLElement>('[data-dc-demo]')!;
  const con = dc.querySelector<HTMLElement>('[data-dc-con]')!;
  const leg = dc.querySelector<HTMLElement>('[data-dc-leg]')!;
  const tray = pz.querySelector<HTMLElement>('[data-pz-tray]')!;
  const b2 = dc.querySelector<HTMLElement>('[data-dc-b2h]')!;
  const lineas = $$(con, '[data-dc-l]');
  let state = 1;

  montarPz(pz, dc, () => state === 2 || apilado());

  // ── Estado 1 ⇄ 2 ──
  let armado = false;
  const fijarEstado = (n: number) => {
    if (n === state && dc.getAttribute('data-dc-state') === String(n)) return;
    state = n; dc.setAttribute('data-dc-state', String(n));
    if (n === 2 && armado) final(); // armada y sin reproducir: el personalizador enseña la web terminada
  };
  if (reduced()) fijarEstado(2);
  else {
    // Umbral: la cabecera del bloque 2 por encima del 50 % de la ventana. Se mide en scroll (pasivo, un
    // cálculo por fotograma) SOLO mientras la sección está a la vista: un salto de scroll no se pierde.
    let rq = 0;
    const medir = () => { rq = 0; fijarEstado(b2.getBoundingClientRect().top < innerHeight * 0.5 ? 2 : 1); };
    const onScroll = () => { if (!rq) rq = requestAnimationFrame(medir); };
    new IntersectionObserver((es) => {
      if (es[es.length - 1].isIntersecting) { addEventListener('scroll', onScroll, { passive: true }); medir(); }
      else removeEventListener('scroll', onScroll);
    }).observe(dc);
  }

  // ── Coreografía ──
  let timers: number[] = [];
  const en = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
  const parar = () => { timers.forEach(clearTimeout); timers = []; };
  let trayVisto = false;
  new IntersectionObserver((es) => { trayVisto = es[0].isIntersecting; }, { threshold: 0.35 }).observe(tray);

  const final = () => {
    parar();
    armado = false;
    dc.classList.remove('is-building', 'is-reveal', 'is-armed');
    con.classList.remove('is-reset');
    con.classList.add('is-done');
    lineas.forEach((l) => { l.classList.add('is-on'); l.classList.remove('is-cur'); });
    leg.classList.remove('is-work', 'is-idle');
  };

  // Estado de salida de la reproducción (caja crema vacía, consola vacía, sin leyenda). Se pone al montar
  // (la demo se monta 200 px antes de asomar) y se rearma con la demo FUERA de la vista cuando toca repetir:
  // nadie ve la web terminada antes de verla construirse. El HTML conserva el estado final (sin JS y con
  // reducir movimiento).
  const armar = () => {
    parar();
    armado = true;
    lineas.forEach((l) => { partir(l); l.classList.remove('is-on', 'is-cur'); });
    $$(dc, '[data-dc-sk] .ej-k').forEach((x) => x.classList.remove('is-in'));
    con.classList.remove('is-done');
    con.classList.add('is-reset');
    dc.classList.remove('is-reveal');
    dc.classList.add('is-building', 'is-armed');
    leg.classList.remove('is-work');
    leg.classList.add('is-idle');
  };

  const reproducir = () => {
    if (reduced()) return final();
    armar();
    armado = false;
    dc.classList.remove('is-armed');
    // Solo los bloques que se pintan (los enlaces del menú no existen en la tarjeta): sin huecos en la cascada.
    const sk = $$(dc, '[data-dc-sk] .ej-k').filter((x) => x.getClientRects().length > 0);
    con.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 950, delay: 60, easing: EASE, fill: 'backwards' });

    const linea = (l: HTMLElement, cur = false) => {
      l.classList.add('is-on');
      if (l.hasAttribute('data-dc-paso')) lineas.forEach((x) => x.classList.remove('is-cur'));
      if (cur) l.classList.add('is-cur');
    };
    en(214, () => linea(lineas[0]));
    en(222, () => linea(lineas[1]));
    en(290, () => { leg.classList.add('is-work'); leg.classList.remove('is-idle'); });
    sk.forEach((x, i) => { x.style.setProperty('--sd', `${i * 120}ms`); en(500 + i * 120, () => x.classList.add('is-in')); });
    [570, 1210, 2120, 2970].forEach((t0, b) => {
      lineas.filter((l) => l.getAttribute('data-dc-b') === String(b)).forEach((l, k) => en(t0 + (k ? 100 + (k - 1) * 150 : 0), () => linea(l, k === 0 && b < 3)));
    });
    en(2970, () => leg.classList.remove('is-work'));
    const barrido = () => {
      if (!trayVisto && apilado()) { en(250, barrido); return; } // apilado: la maqueta está más abajo
      dc.classList.add('is-reveal');
      en(1300, () => { lineas.forEach((l) => l.classList.remove('is-cur')); final(); });
    };
    en(3220, barrido);
  };

  // ── Una vez por entrada (35 %); de nuevo solo tras ≥ 8 s del todo fuera y en estado 1 ──
  // El rearme ocurre a los 8 s con la demo sin un solo píxel en pantalla; al volver (35 %) se reproduce.
  const blanco = apilado() ? con : demo;
  let jugado = false; let tFuera = 0;
  if (!reduced()) armar();
  new IntersectionObserver((es) => {
    const e = es[es.length - 1];
    if (e.isIntersecting) { clearTimeout(tFuera); tFuera = 0; return; }
    if (!jugado || armado) return;
    clearTimeout(tFuera);
    tFuera = window.setTimeout(() => { tFuera = 0; if (state === 1 && !reduced()) armar(); }, 8000);
  }, { threshold: 0 }).observe(blanco);
  new IntersectionObserver((es) => {
    if (!es[es.length - 1].isIntersecting) return;
    if (!jugado) { jugado = true; reproducir(); }
    else if (armado) reproducir();
  }, { threshold: 0.35 }).observe(blanco);
}

export function initDemos() {
  for (const dc of $$(document, '[data-dc]:not([data-dc-on])')) {
    dc.setAttribute('data-dc-on', '');
    cuandoVisible(dc, () => montarDemo(dc));
  }
}

export function initPersonalizadores() {
  for (const pz of $$(document, '[data-pz]:not([data-pz-on])')) {
    if (pz.closest('[data-dc]')) continue;
    pz.setAttribute('data-pz-on', '');
    cuandoVisible(pz, () => montarPz(pz, pz, () => true));
  }
}
