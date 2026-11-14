// Una sola región para anunciar las cargas del panel a un lector de pantalla
// (comprobaciones globales de salida, punto c): cada LoadingState que se ve suma
// su rótulo y la carcasa pinta un único texto en su región de estado.
export const cargando = $state({ etiquetas: [] });

export function entra(etiqueta) {
  cargando.etiquetas = [...cargando.etiquetas, etiqueta];
}

export function sale(etiqueta) {
  const i = cargando.etiquetas.indexOf(etiqueta);
  if (i < 0) return;
  const copia = cargando.etiquetas.slice();
  copia.splice(i, 1);
  cargando.etiquetas = copia;
}

/** Texto de la región: el rótulo si carga una sola cosa; si son varias, uno general. */
export function textoCarga() {
  const e = cargando.etiquetas;
  return e.length === 0 ? '' : e.length === 1 ? e[0] : 'Cargando la sección…';
}
