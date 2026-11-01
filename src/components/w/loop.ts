// ─────────────────────────────────────────────────────────────
// Bucles firma y contrato de movimiento reducido (design/rediseno-workos.md
// §2.10, F-02 / F-06). UNA animación firma por página, en su objeto principal.
//
//   registerLoop(el, { start, stop, still }, { pauseButton, lang, durationMs })
//
// · Arranca solo con el objeto en pantalla (IntersectionObserver threshold 0,
//   rootMargin 100px) y con la pestaña visible (visibilitychange).
// · prefers-reduced-motion: reduce (también si cambia en vivo) → still() pinta
//   un fotograma representativo y quieto, y nunca arranca.
// · Se para mientras haya foco (focusin) o puntero (pointerenter) dentro.
// · Bucles > 5 s: botón "Pausar animación" / "Reanudar animación" 44×44
//   (WCAG 2.2.2), esquina inferior derecha, aria-pressed, fuera de aria-hidden.
//   Va con estilos en línea (solo variables): funciona también fuera de v3.
// · Sin callbacks: start/stop alternan .is-playing (bucles CSS con
//   animation-play-state) y still añade .is-still.
// · Solo temporizadores o animaciones CSS; nunca un rAF continuo.
// Los objetos de bucle busca dentro de su nodo (el.querySelector), nunca global.
// ─────────────────────────────────────────────────────────────

export interface LoopHandlers {
  start?: () => void;
  stop?: () => void;
  still?: () => void;
}
export interface LoopOptions {
  /** Botón de pausa (por defecto true). Obligatorio en bucles de más de 5 s. */
  pauseButton?: boolean;
  lang?: 'es' | 'en';
  /** Dónde colgar el botón (por defecto el propio objeto). */
  buttonHost?: HTMLElement;
}
export interface LoopController {
  /** Pausa/reanuda por decisión del visitante (lo que hace el botón). */
  setUserPaused(paused: boolean): void;
  destroy(): void;
}

const ICON_PAUSE =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="5" height="18" x="14" y="3" rx="1"/><rect width="5" height="18" x="5" y="3" rx="1"/></svg>';
const ICON_PLAY =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>';

const TXT = {
  es: { pause: 'Pausar animación', play: 'Reanudar animación' },
  en: { pause: 'Pause animation', play: 'Resume animation' },
};

export function registerLoop(el: HTMLElement, handlers: LoopHandlers = {}, options: LoopOptions = {}): LoopController {
  const { pauseButton = true, lang = (document.documentElement.lang === 'en' ? 'en' : 'es'), buttonHost = el } = options;
  const start = handlers.start ?? (() => el.classList.add('is-playing'));
  const stop = handlers.stop ?? (() => el.classList.remove('is-playing'));
  const still = handlers.still ?? (() => { el.classList.remove('is-playing'); el.classList.add('is-still'); });

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let inView = false;
  let hovered = false;
  let focused = false;
  let userPaused = false;
  let playing = false;
  let reduced = mq.matches;

  const shouldPlay = () => !reduced && inView && !document.hidden && !hovered && !focused && !userPaused;
  const sync = () => {
    const want = shouldPlay();
    if (want && !playing) { playing = true; start(); }
    else if (!want && playing) { playing = false; stop(); }
  };

  // Botón de pausa (fuera de cualquier aria-hidden: se cuelga del host).
  let btn: HTMLButtonElement | null = null;
  const paintBtn = () => {
    if (!btn) return;
    const t = TXT[lang];
    btn.setAttribute('aria-pressed', String(userPaused));
    btn.setAttribute('aria-label', userPaused ? t.play : t.pause);
    btn.title = userPaused ? t.play : t.pause;
    btn.innerHTML = userPaused ? ICON_PLAY : ICON_PAUSE;
  };
  if (pauseButton && !reduced) {
    if (getComputedStyle(buttonHost).position === 'static') buttonHost.style.position = 'relative';
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'w-loop-pause';
    btn.style.cssText = [
      'position:absolute', 'right:12px', 'bottom:12px', 'z-index:4',
      'width:44px', 'height:44px', 'display:inline-flex', 'align-items:center', 'justify-content:center',
      'border-radius:var(--w-r-cell, 8px)', 'border:1px solid var(--w-line-strong)',
      'background:var(--w-s-solid, #1c1c1c)', 'color:var(--w-ink, #f0ede8)', 'cursor:pointer', 'padding:0',
    ].join(';');
    btn.addEventListener('click', () => { userPaused = !userPaused; paintBtn(); sync(); });
    paintBtn();
    buttonHost.appendChild(btn);
  }

  // El propio botón no debe contar como "foco dentro" que pare el bucle.
  const isBtn = (t: EventTarget | null) => !!btn && t === btn;
  const onEnter = () => { hovered = true; sync(); };
  const onLeave = () => { hovered = false; sync(); };
  const onFocusIn = (e: FocusEvent) => { if (isBtn(e.target)) return; focused = true; sync(); };
  const onFocusOut = (e: FocusEvent) => {
    if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget) && !isBtn(e.relatedTarget)) return;
    focused = false; sync();
  };
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('focusin', onFocusIn);
  el.addEventListener('focusout', onFocusOut);

  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);

  const onMq = (e: MediaQueryListEvent) => {
    reduced = e.matches;
    if (reduced) {
      if (playing) { playing = false; stop(); }
      still();
      if (btn) btn.hidden = true;
    } else {
      el.classList.remove('is-still');
      if (btn) btn.hidden = false;
      sync();
    }
  };
  mq.addEventListener?.('change', onMq);

  let io: IntersectionObserver | null = null;
  if (reduced) {
    still();
  } else if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) inView = e.isIntersecting;
      sync();
    }, { threshold: 0, rootMargin: '100px' });
    io.observe(el);
  } else {
    inView = true; sync();
  }

  return {
    setUserPaused(p: boolean) { userPaused = p; paintBtn(); sync(); },
    destroy() {
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      mq.removeEventListener?.('change', onMq);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
      btn?.remove();
      if (playing) { playing = false; stop(); }
    },
  };
}
