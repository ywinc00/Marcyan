// Color propio de cada cliente, lead, proyecto o brief (pedido del dueño 2026-11-15:
// «es bueno que cada uno tenga su propio color, así se distingue fácil»).
// Ocho tonos medios, ninguno es el naranja de la acción principal; con letra blanca
// en negrita pasan 4,5:1. El color sale del nombre: siempre el mismo para el mismo.
export const ENTITY_PALETTE = ['#5b5bd6', '#0284c7', '#0d9488', '#b45309', '#db2777', '#7c3aed', '#15803d', '#e11d48'];

export function entityColor(s) {
  let h = 0; const t = String(s || '?');
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return ENTITY_PALETTE[Math.abs(h) % ENTITY_PALETTE.length];
}
