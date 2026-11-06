// ─────────────────────────────────────────────────────────────
// P09 · Guion del asistente de alta de Marcy (AltaMarcy.astro).
// Tiempos medidos en el original W2N-05 (tira-1440.jpg), tolerancia ±100 ms:
//   0 Conoce a Marcy · 2500 Hola · 4800 Tus canales (checks cada 250 ms desde 5350,
//   la lista baja a 5950) · 8200 Lista para contestar (checks 8650 y 8950) ·
//   10500 panel web de ejemplo · 11200 "Repetir".
// Contrato de vida (§1.5): se reproduce UNA vez al entrar en vista (35 %) y otra al
// reentrar tras ≥ 8 s fuera; estado final con micro-vida (halo del interruptor y punto
// "en línea") solo mientras está a la vista. Reducir movimiento: panel quieto y "Repetir"
// despliega los 4 pasos como lista. Busca SOLO dentro de su nodo; atributos data-w2-*.
// ─────────────────────────────────────────────────────────────

const T = {
  s2: 2500,
  s3: 4800,
  c3: [5350, 5600, 5850, 6100, 6350, 6600, 6850],
  bajar: 5950,
  s4: 8200,
  c4: [8650, 8950],
  panel: 10500,
  repetir: 11200,
};
const REENTRADA_MS = 8000;

function initAlta(root: HTMLElement) {
  if (root.dataset.w2AltaInit) return;
  root.dataset.w2AltaInit = '1';
  root.setAttribute('data-w2-js', '');

  const btn = root.querySelector<HTMLButtonElement>('[data-w2-alta-replay]');
  const lista = root.querySelector<HTMLElement>('[data-w2-alta-lista]');
  const c3 = Array.from(root.querySelectorAll<HTMLElement>('[data-w2-alta-c3]'));
  const c4 = Array.from(root.querySelectorAll<HTMLElement>('[data-w2-alta-c4]'));
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  let timers: number[] = [];
  let played = false;
  let inView = false;
  let leftAt = 0;
  let reduced = mq.matches;

  const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
  const clear = () => { timers.forEach((t) => clearTimeout(t)); timers = []; };
  const step = (n: number) => root.setAttribute('data-w2-step', String(n));
  const vivo = () => root.classList.toggle('is-vivo', inView && !reduced && root.getAttribute('data-w2-step') === '5');

  // Al repetir con teclado el botón se oculta: el foco pasa a la tarjeta (tabindex -1) y
  // vuelve al botón cuando reaparece, para no caer en <body>.
  const mostrarRepetir = () => {
    root.classList.add('is-replay');
    if (document.activeElement === root && btn) btn.focus({ preventScroll: true });
  };
  const setLista = (abierta: boolean) => {
    if (!lista) return;
    lista.hidden = !abierta;
    root.classList.toggle('is-lista', abierta);
    btn?.setAttribute('aria-expanded', String(abierta));
  };

  const final = () => {
    clear();
    step(5);
    c3.forEach((r) => r.classList.add('is-on'));
    c4.forEach((r) => r.classList.add('is-on'));
    root.classList.add('is-bajada');
    mostrarRepetir();
    vivo();
  };

  const play = () => {
    if (reduced) { final(); return; }
    clear();
    played = true;
    if (lista) { lista.hidden = true; root.classList.remove('is-lista'); }
    if (btn && document.activeElement === btn) root.focus({ preventScroll: true });
    root.classList.remove('is-replay', 'is-bajada', 'is-vivo');
    c3.forEach((r) => r.classList.remove('is-on'));
    c4.forEach((r) => r.classList.remove('is-on'));
    step(1);
    at(T.s2, () => step(2));
    at(T.s3, () => step(3));
    c3.forEach((r, i) => at(T.c3[Math.min(i, T.c3.length - 1)], () => r.classList.add('is-on')));
    at(T.bajar, () => root.classList.add('is-bajada'));
    at(T.s4, () => step(4));
    c4.forEach((r, i) => at(T.c4[Math.min(i, T.c4.length - 1)], () => r.classList.add('is-on')));
    at(T.panel, () => { step(5); vivo(); });
    at(T.repetir, mostrarRepetir);
  };

  // Modo reducido: "Repetir" despliega / recoge la lista de los 4 pasos.
  const syncReduced = () => {
    reduced = mq.matches;
    if (!btn) return;
    if (reduced) {
      final();
      if (lista) { btn.setAttribute('aria-controls', lista.id); btn.setAttribute('aria-expanded', String(!lista.hidden)); }
    } else {
      if (lista) { lista.hidden = true; root.classList.remove('is-lista'); }
      btn.removeAttribute('aria-controls');
      btn.removeAttribute('aria-expanded');
    }
  };

  btn?.addEventListener('click', () => {
    if (reduced) {
      if (lista) setLista(lista.hidden);
      return;
    }
    play();
  });

  mq.addEventListener?.('change', syncReduced);
  syncReduced();

  // Sin reducir movimiento: listo en la pantalla 1 hasta que entra en vista.
  if (!reduced) {
    root.classList.remove('is-replay', 'is-bajada');
    c3.forEach((r) => r.classList.remove('is-on'));
    c4.forEach((r) => r.classList.remove('is-on'));
    step(1);
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting && e.intersectionRatio >= 0.35) {
        if (!inView) {
          inView = true;
          const fuera = leftAt ? performance.now() - leftAt : Infinity;
          if (!reduced && (!played || fuera >= REENTRADA_MS)) play();
        }
      } else if (!e.isIntersecting && inView) {
        inView = false;
        leftAt = performance.now();
      }
      vivo();
    }
  }, { threshold: [0, 0.35] });
  io.observe(root);
}

export function initAltas() {
  document.querySelectorAll<HTMLElement>('[data-w2-alta]').forEach(initAlta);
}
