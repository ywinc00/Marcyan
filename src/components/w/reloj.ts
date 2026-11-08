// Relojes de los dispositivos de ejemplo (portátiles, teléfonos, chats): siempre la hora y el día
// REALES de quien mira (regla del dueño, 2026-11-08). Cualquier elemento con data-reloj recibe su
// texto aquí; el HTML trae un valor de reserva para quien no tiene JS.
//   data-reloj="menu"   → «sáb 8 nov  2:15 p. m.» / «Sat Nov 8  2:15 PM» (barra de menús)
//   data-reloj="hora"   → «2:15 p. m.» / «2:15 PM»
//   data-reloj="hm"     → «2:15» (pantalla de bloqueo, reloj grande)
//   data-reloj="ap"     → «p. m.» / «PM»
//   data-reloj="fecha"  → «sábado, 8 de noviembre» / «Saturday, November 8»
//   data-reloj="dia"    → «sábado» / «Saturday»
//   data-reloj-min="-3" → minutos de desfase (mensajes de hace un rato)
//   data-reloj-cap      → primera letra en mayúscula
type Fmt = 'menu' | 'hora' | 'hm' | 'ap' | 'fecha' | 'dia';

const loc = (el: Element) => ((el.closest('[lang]') as HTMLElement | null)?.lang || document.documentElement.lang || 'es').startsWith('en') ? 'en-US' : 'es-US';
const limpia = (s: string) => s.replace(/\./g, '').replace(/ | /g, ' ');

function hora12(d: Date, en: boolean) {
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return { hm: `${h}:${m}`, ap: d.getHours() < 12 ? (en ? 'AM' : 'a. m.') : (en ? 'PM' : 'p. m.') };
}

function texto(fmt: Fmt, d: Date, l: string): string {
  const en = l === 'en-US';
  const { hm, ap } = hora12(d, en);
  switch (fmt) {
    case 'hm': return hm;
    case 'ap': return ap;
    case 'hora': return `${hm} ${ap}`;
    case 'dia': return new Intl.DateTimeFormat(l, { weekday: 'long' }).format(d);
    case 'fecha': return limpia(new Intl.DateTimeFormat(l, { weekday: 'long', day: 'numeric', month: 'long' }).format(d));
    case 'menu': {
      const dia = limpia(new Intl.DateTimeFormat(l, { weekday: 'short' }).format(d));
      const mes = limpia(new Intl.DateTimeFormat(l, { month: 'short' }).format(d));
      return en ? `${dia} ${mes} ${d.getDate()}  ${hm} ${ap}` : `${dia} ${d.getDate()} ${mes}  ${hm} ${ap}`;
    }
  }
}

export function pintaRelojes(raiz: ParentNode = document) {
  const ahora = Date.now();
  raiz.querySelectorAll<HTMLElement>('[data-reloj]').forEach((el) => {
    const fmt = el.dataset.reloj as Fmt;
    const d = new Date(ahora + (Number(el.dataset.relojMin) || 0) * 60000);
    let t = texto(fmt, d, loc(el));
    if (el.hasAttribute('data-reloj-cap')) t = t.charAt(0).toUpperCase() + t.slice(1);
    if (el.textContent !== t) el.textContent = t;
  });
}

let iniciado = false;
export function iniciaRelojes() {
  if (iniciado) return;
  iniciado = true;
  pintaRelojes();
  // Cuerpos de ventanas que se ponen más tarde (<template>): se repinta cada 15 s, barato.
  window.setInterval(() => { if (!document.hidden) pintaRelojes(); }, 15000);
}
