// Monograma del negocio (iniciales + color estable por hash). Es la pieza
// aprobada de las tarjetas de briefs; vive aquí para que la lista y la
// ficha usen la misma.
const AVATAR_PALETTE = ['#333333']   // fase 3: monograma neutro, sin colores que compitan (H-07);

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
