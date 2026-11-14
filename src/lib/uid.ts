// Ids únicos por instancia en el HTML construido: un componente que sale dos veces
// en la misma página (el formulario del raíl del blog: columna y versión móvil) no
// puede repetir id, o sus etiquetas y avisos apuntan a la copia equivocada.
// Contador de módulo: determinista en cada build.
let n = 0;
export function siguienteId(prefijo: string): string {
  n += 1;
  return `${prefijo}-${n}`;
}
