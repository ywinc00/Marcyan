// Una sola región viva por página (pieza E-10 del catálogo): lo que hay que
// anunciar a un lector de pantalla sin moverle el foco (un envío que falló, un
// acuse en un formulario corto) sale de aquí, nunca de un role="alert" por
// mensaje ni de destapar una región oculta, que no se anuncia de forma fiable.
// La región vive en Layout.astro desde la carga (#sr-avisos, polite); la
// assertive (#sr-avisos-urgente) queda solo para lo crítico.
//
// Se vacía y se escribe en el siguiente ciclo para que un mismo mensaje
// repetido (dos fallos seguidos) se vuelva a leer.
export function anunciar(msg, { urgente = false } = {}) {
  if (typeof document === 'undefined' || !msg) return;
  const region = document.getElementById(urgente ? 'sr-avisos-urgente' : 'sr-avisos');
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => { region.textContent = String(msg); }, 60);
}
