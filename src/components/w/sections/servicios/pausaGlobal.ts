// Servicios · pausa GLOBAL de la página (rev1 de G09, importante 4; §4.4 y WCAG 2.2.2).
// En /servicios el fondo F10 no pinta su botón (el hero ya trae la pausa de los interruptores), así
// que nadie producía el contrato global. Aquí lo producen las pausas visibles de la página (hero,
// pedidos y cuidado) con EXACTAMENTE el contrato de Fondo.astro:
//   <html data-w-pausa> · sessionStorage['w-pausa'] === '1' · evento `w:pausa` en document
//   con detail { paused: boolean }.
// Pulsar cualquiera de esas pausas para TODO (fondo, hero, mapa, teléfono, pedidos, cuidado) y lo
// recuerda en la sesión; reanudar desde cualquiera reanuda todo.
// rev2 de G09 (menor): el mazo de Marcy (agente.ts) habla otro contrato ('w2:pausa' en sesión y
// en window). Este archivo hace de PUENTE en los dos sentidos para que su botón diga "Reanudar"
// cuando la página está en pausa y para que pausar el mazo pare todo lo demás.
import type { LoopController } from '../../loop';
import { pausaGlobal as pausaMazo, setPausaGlobal as fijaPausaMazo } from '../../agente/agente';

const KEY = 'w-pausa';

export function pausaActiva(): boolean {
  if (document.documentElement.hasAttribute('data-w-pausa')) return true;
  try { return window.sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
}

export function fijaPausa(p: boolean): void {
  const root = document.documentElement;
  if (p === root.hasAttribute('data-w-pausa')) return;
  if (p) root.setAttribute('data-w-pausa', ''); else root.removeAttribute('data-w-pausa');
  try { if (p) window.sessionStorage.setItem(KEY, '1'); else window.sessionStorage.removeItem(KEY); } catch (e) {}
  document.dispatchEvent(new CustomEvent('w:pausa', { detail: { paused: p } }));
  if (pausaMazo() !== p) fijaPausaMazo(p);
}

// Puente (una vez por página): el mazo pausa → la página pausa; al cargar, igualar los dos.
const w = window as Window & { __wPuentePausa?: boolean };
if (!w.__wPuentePausa) {
  w.__wPuentePausa = true;
  window.addEventListener('w2:pausa', (e) => fijaPausa(!!(e as CustomEvent).detail?.pausa));
  if (pausaActiva() !== pausaMazo()) {
    if (pausaActiva()) fijaPausaMazo(true); else fijaPausa(true);
  }
}

/** Enlaza un bucle de loop.ts al contrato: su botón PRODUCE la pausa global y el bucle la obedece. */
export function enlazaPausa(ctrl: LoopController, host: HTMLElement): void {
  if (pausaActiva()) { ctrl.setUserPaused(true); fijaPausa(true); }
  document.addEventListener('w:pausa', (e) => ctrl.setUserPaused(!!(e as CustomEvent).detail?.paused));
  const btn = host.querySelector<HTMLButtonElement>('.w-loop-pause');
  // loop.ts registró antes su propio clic: aquí aria-pressed ya trae el estado nuevo.
  btn?.addEventListener('click', () => fijaPausa(btn.getAttribute('aria-pressed') === 'true'));
}
