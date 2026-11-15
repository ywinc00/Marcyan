// Monograma del negocio (iniciales + color estable por hash). Es la pieza
// aprobada de las tarjetas de briefs; vive aquí para que la lista y la
// ficha usen la misma.
const AVATAR_PALETTE = ['#5b5bd6', '#0284c7', '#0d9488', '#b45309', '#db2777', '#7c3aed', '#15803d', '#e11d48']   // color propio de cada uno (pedido del dueño 2026-11-15); misma paleta que lib/colors.js

export function initials(s) {
  const parts = (s || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function avatarColor(s) {
  let h = 0; const str = s || '?';
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
