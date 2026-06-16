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

// ¿El texto del bot OFRECE/PROMETE el formulario de contacto? Red de seguridad
// para abrir la captura cuando el modelo escribió la invitación pero NO llamó a
// la herramienta (sin `action`). Matchea frases de oferta de captura; NO matchea
// el simple enlace a /formulario.
const INVITE_RX = /(mostrar\w*|abrir|abro|muestro|despliego|ense[ñn]ar\w*)\s+(un|el|tu|la)?\s*formulario|formulario\s+(r[áa]pido|breve|seguro|ahora|aqu[íi]|de\s+contacto)|d[eé]j\w*\s+(tus|tu)\s+(datos|informaci[óo]n|contacto|correo|email|tel[ée]fono|n[úu]mero)|show\s+(you\s+)?(a|the)?\s*(quick\s+|brief\s+)?form|leave\s+your\s+(details|name|info|email|phone|contact|number)|drop\s+your\s+(name|email|phone|details|info)/i;

export function invitesContact(text) {
  return typeof text === 'string' && INVITE_RX.test(text);
}
