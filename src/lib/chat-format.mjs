// ─────────────────────────────────────────────────────────────
// chat-format.mjs — utilidades de FORMATO del chat (cliente + tests).
// Pura, sin secretos ni KB → segura de bundlear al cliente.
// ─────────────────────────────────────────────────────────────

// Quita formato markdown del texto del modelo y lo deja como texto plano
// natural. Es string→string: el resultado se pinta con textContent (sin
// innerHTML), así que nunca introduce HTML. Defensa-en-profundidad junto a
// la regla "PROHIBIDO markdown" del system prompt.
export function stripMarkdown(s) {
  return String(s == null ? '' : s)
    // negrita/itálica/tachado → conservar el texto interno
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/(^|[^\w])\*([^*\n]+)\*(?!\w)/g, '$1$2')
    .replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1$2')
    // código en línea / vallas → conservar interno
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // marcadores de línea: encabezados, citas, viñetas, listas numeradas
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]*>[ \t]?/gm, '')
    .replace(/^[ \t]*[-*+][ \t]+/gm, '')
    .replace(/^[ \t]*\d+\.[ \t]+/gm, '')
    // enlaces markdown [texto](url) → "texto (url)" (la url conocida se linkifica luego)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .trim();
}
