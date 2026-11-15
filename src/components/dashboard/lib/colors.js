// Color propio de cada cliente, lead, proyecto o brief (pedido del dueño 2026-11-15:
// «es bueno que cada uno tenga su propio color, así se distingue fácil»).
// Ocho tonos medios ordenados para que dos seguidos nunca se parezcan; ninguno es el
// naranja de la marca y todos pasan 4,5:1 con la inicial en blanco.
// Una sola fuente para todas las vistas: el mismo lead o cliente sale igual en Inicio,
// Leads, Clientes, Progreso y Briefs.
export const ENTITY_PALETTE = ['#5b5bd6', '#15803d', '#db2777', '#0369a1', '#4d7c0f', '#7c3aed', '#0f766e', '#e11d48'];

/**
 * Color de una entidad. Va por su número fijo (id, o el número final de su código,
 * como LEAD-011 o MRC-0012): las altas seguidas salen con colores distintos y el color
 * no cambia nunca. Sin número, por el nombre.
 */
export function entityColor(id, name) {
  const raw = id == null ? '' : String(id).trim();
  const m = raw.match(/(\d+)$/);
  if (m) return ENTITY_PALETTE[Number(m[1]) % ENTITY_PALETTE.length];
  let h = 0; const t = String(name || raw || '?');
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return ENTITY_PALETTE[Math.abs(h) % ENTITY_PALETTE.length];
}

/** Iniciales: primera letra de las dos primeras palabras (una palabra: sus dos primeras letras). */
export function initials(s) {
  const parts = String(s || '?').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
