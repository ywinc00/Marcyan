// ─────────────────────────────────────────────────────────────
// P08 · Portátil en CSS y sus escenas (design/rediseno-workos-v2.md §2 P08).
// Datos y motor común de Portatil, Escritorio, VentanaApp y las tres escenas.
//
// · Medidas del original (N/css-passport-reglas.txt): pantalla fuente FIJA de
//   1378×895 dentro de una tapa de 1415×933 (marco 17,75 / 18,5 / 20,25 px),
//   escalada con consultas de contenedor. Todo lo de dentro se escribe en px de
//   la pantalla fuente y nunca se reescala a mano.
// · Motor por tiempo: `secuencia()` reproduce una lista de pasos UNA vez, se
//   puede cortar y reiniciar; `vigilar()` la dispara al entrar en vista (35 %)
//   y la vuelve a reproducir si la pieza estuvo ≥ 8 s fuera (§1.5).
// · Estado de pausa global de loop.ts (§1.5): la micro-vida obedece a la clase
//   `.w2-pausado` en <html> (si loop.ts la pone) además de la visibilidad.
// · Nada de document.querySelector global: cada escena busca dentro de su nodo.
// ─────────────────────────────────────────────────────────────

export const PANTALLA = { w: 1378, h: 895 } as const;
export const TAPA = { w: 1415, h: 933, top: 17.75, lado: 18.5, pie: 20.25 } as const;

/** Iconos del dock del escritorio (posición fija: el cursor viaja a coordenadas
 *  calculadas, ver `centroDock`). 12 baldosas de 58 px, hueco 8, relleno 8. */
export const DOCK = { baldosa: 58, hueco: 8, relleno: 8, abajo: 12 } as const;
export type DockId =
  | 'archivos' | 'navegador' | 'gmail' | 'googlecalendar' | 'googlemaps' | 'whatsapp'
  | 'instagram' | 'messenger' | 'marcy' | 'claude' | 'notas' | 'ajustes';
export const DOCK_ORDEN: DockId[] = [
  'archivos', 'navegador', 'gmail', 'googlecalendar', 'googlemaps', 'whatsapp',
  'instagram', 'messenger', 'marcy', 'claude', 'notas', 'ajustes',
];
/** Centro de un icono del dock en px de la pantalla fuente. */
export function centroDock(id: DockId): { x: number; y: number } {
  const i = DOCK_ORDEN.indexOf(id);
  const n = DOCK_ORDEN.length;
  const ancho = n * DOCK.baldosa + (n - 1) * DOCK.hueco + 2 * DOCK.relleno;
  const izq = (PANTALLA.w - ancho) / 2;
  return {
    x: izq + DOCK.relleno + DOCK.baldosa / 2 + i * (DOCK.baldosa + DOCK.hueco),
    y: PANTALLA.h - DOCK.abajo - DOCK.relleno - DOCK.baldosa / 2,
  };
}

// ── Logos de RESERVA ─────────────────────────────────────────
// Solo se usan si `src/components/w/marcas/LogoMarca.astro` (P06) aún no está en
// la rama: los componentes lo buscan con import.meta.glob y, si existe, mandan
// sus logos. Al integrar P06 este bloque se BORRA (pendiente anotado en el informe).
// Origen: simple-icons 16.36.0 (npm pack, https://github.com/simple-icons/simple-icons),
// licencia CC0 1.0 para los trazados. Las marcas pertenecen a sus dueños; uso
// nominativo (dónde contesta Marcy / qué apps usa el negocio), sin alianza.
// Multicolor (Gmail, Google Maps, Google Calendar, Instagram): en baldosa van en
// MONOCROMO (§1.4), nunca recoloreadas con un solo hex.
// Sin Claude ni Google: están bajo el cerrojo legal (marcas/LICENCIAS.md) y no se dibujan.
export type LogoReservaId = 'whatsapp' | 'instagram' | 'messenger';
export const MULTICOLOR: LogoReservaId[] = ['instagram'];
export const LOGOS_RESERVA: Record<LogoReservaId, { titulo: string; hex: string; d: string }> = {
  whatsapp: { titulo: "WhatsApp", hex: "#25D366", d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" },
  instagram: { titulo: "Instagram", hex: "#FF0069", d: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" },
  messenger: { titulo: "Messenger", hex: "#0866FF", d: "M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13" },
};

/** SVG de un logo de reserva. tono 'color' = hex oficial (o monocromo si es multicolor);
 *  'mono' = color de texto actual. Decorativo (aria-hidden): el nombre lo da el contexto. */
export function logoReserva(id: LogoReservaId, size = 24, tono: 'color' | 'mono' | 'blanco' = 'color'): string {
  const l = LOGOS_RESERVA[id];
  const fill = tono === 'blanco' ? '#fff' : tono === 'mono' || MULTICOLOR.includes(id) ? 'currentColor' : l.hex;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="${fill}" d="${l.d}"/></svg>`;
}

// ── Motor del cliente ────────────────────────────────────────

export const reducido = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const sesion = {
  get(k: string): string | null { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string): void { try { sessionStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
};

export interface Secuencia { play(): void; stop(): void; readonly corriendo: boolean }
/** Lista de pasos [ms desde el inicio, acción]. play() reinicia desde 0; stop() corta. */
export function secuencia(pasos: Array<[number, () => void]>, alTerminar?: () => void): Secuencia {
  let timers: number[] = [];
  let corriendo = false;
  const stop = () => { timers.forEach(clearTimeout); timers = []; corriendo = false; };
  return {
    get corriendo() { return corriendo; },
    stop,
    play() {
      stop();
      corriendo = true;
      const fin = Math.max(0, ...pasos.map((p) => p[0]));
      for (const [ms, fn] of pasos) timers.push(window.setTimeout(fn, ms));
      timers.push(window.setTimeout(() => { corriendo = false; alTerminar?.(); }, fin + 20));
    },
  };
}

export interface VigiaOpts {
  umbral?: number;          // 0,35 por defecto (§1.5)
  margen?: string;          // rootMargin, '100px 0px' por defecto
  reentradaMs?: number;     // 8000: tiempo fuera para volver a reproducir
  alEntrar: (primera: boolean) => void;
  alSalir?: () => void;
  /** micro-vida: se llama con true/false según esté a la vista y la pestaña visible */
  vivo?: (si: boolean) => void;
}
/** Dispara `alEntrar` al cruzar el umbral; tras ≥ reentradaMs fuera, vuelve a dispararlo. */
export function vigilar(el: Element, o: VigiaOpts): () => void {
  const umbral = o.umbral ?? 0.35;
  const reentrada = o.reentradaMs ?? 8000;
  let dentro = false;
  let primera = true;
  let salioEn = 0;
  let visible = false; // a la vista (margen 100 px) para la micro-vida
  const syncVivo = () => o.vivo?.(visible && !document.hidden);
  const io = new IntersectionObserver((ents) => {
    for (const e of ents) {
      const r = e.intersectionRatio;
      visible = e.isIntersecting;
      if (!dentro && r >= umbral) {
        dentro = true;
        if (primera || performance.now() - salioEn >= reentrada) { o.alEntrar(primera); primera = false; }
      } else if (dentro && !e.isIntersecting) {
        dentro = false;
        salioEn = performance.now();
        o.alSalir?.();
      }
      syncVivo();
    }
  }, { threshold: [0, 0.1, umbral, 0.6, 1], rootMargin: o.margen ?? '100px 0px' });
  io.observe(el);
  const onVis = () => syncVivo();
  document.addEventListener('visibilitychange', onVis);
  return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
}
