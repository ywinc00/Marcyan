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
export type LogoReservaId = 'whatsapp' | 'instagram' | 'messenger' | 'gmail' | 'googlemaps' | 'googlecalendar' | 'claude';
export const MULTICOLOR: LogoReservaId[] = ['gmail', 'googlemaps', 'googlecalendar', 'instagram'];
export const LOGOS_RESERVA: Record<LogoReservaId, { titulo: string; hex: string; d: string }> = {
  whatsapp: { titulo: "WhatsApp", hex: "#25D366", d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" },
  instagram: { titulo: "Instagram", hex: "#FF0069", d: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" },
  messenger: { titulo: "Messenger", hex: "#0866FF", d: "M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13" },
  gmail: { titulo: "Gmail", hex: "#EA4335", d: "M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" },
  googlemaps: { titulo: "Google Maps", hex: "#4285F4", d: "M19.527 4.799c1.212 2.608.937 5.678-.405 8.173-1.101 2.047-2.744 3.74-4.098 5.614-.619.858-1.244 1.75-1.669 2.727-.141.325-.263.658-.383.992-.121.333-.224.673-.34 1.008-.109.314-.236.684-.627.687h-.007c-.466-.001-.579-.53-.695-.887-.284-.874-.581-1.713-1.019-2.525-.51-.944-1.145-1.817-1.79-2.671L19.527 4.799zM8.545 7.705l-3.959 4.707c.724 1.54 1.821 2.863 2.871 4.18.247.31.494.622.737.936l4.984-5.925-.029.01c-1.741.601-3.691-.291-4.392-1.987a3.377 3.377 0 0 1-.209-.716c-.063-.437-.077-.761-.004-1.198l.001-.007zM5.492 3.149l-.003.004c-1.947 2.466-2.281 5.88-1.117 8.77l4.785-5.689-.058-.05-3.607-3.035zM14.661.436l-3.838 4.563a.295.295 0 0 1 .027-.01c1.6-.551 3.403.15 4.22 1.626.176.319.323.683.377 1.045.068.446.085.773.012 1.22l-.003.016 3.836-4.561A8.382 8.382 0 0 0 14.67.439l-.009-.003zM9.466 5.868L14.162.285l-.047-.012A8.31 8.31 0 0 0 11.986 0a8.439 8.439 0 0 0-6.169 2.766l-.016.018 3.665 3.084z" },
  googlecalendar: { titulo: "Google Calendar", hex: "#4285F4", d: "M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z" },
  claude: { titulo: "Claude", hex: "#D97757", d: "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" },
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
