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

// ─────────────────────────────────────────────────────────────
// MEMORIA DE CONTACTO — extracción 100% del lado del cliente.
//
// Marcy "recuerda" lo que el visitante escribió (correo/teléfono/nombre)
// para PRE-RELLENAR el formulario y quitar fricción. CLAVE DE SEGURIDAD:
// esto corre SOLO en el navegador. Los valores extraídos NUNCA se envían a
// /api/chat ni al modelo — solo se usan para poblar los <input> de la
// captura (que postea a /api/contact). Al modelo únicamente le llega una
// línea de BANDERAS booleanas (contactFlags), jamás los valores. Puro y
// testeable (sin DOM, sin red).
// ─────────────────────────────────────────────────────────────

// Un correo bien formado dentro de texto libre (recorta puntuación final).
const EMAIL_FIND_RX = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// Secuencias telefónicas: dígitos con separadores comunes; se valida por
// conteo de dígitos (7–15) para no confundir años/precios/folios.
const PHONE_FIND_RX = /\+?\d[\d\s().\-]{5,}\d/g;
// Nombre: SOLO frases de presentación explícitas (evita "soy dueño de…").
const NAME_FIND_RX = /(?:me\s+llamo|mi\s+nombre\s+es|my\s+name\s+is|i\s*am\s+called|i'?m\s+called)\s+([a-záéíóúñü][\wáéíóúñü'’.-]*(?:\s+[a-záéíóúñü][\wáéíóúñü'’.-]+)?)/i;
// Palabras que NO son nombre: corta la captura (p. ej. "me llamo de vacaciones").
const NAME_STOP = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'en', 'un', 'una', 'que', 'mi', 'tu', 'su', 'por', 'para', 'con', 'sin', 'a', 'al', 'me', 'no', 'si', 'and', 'the', 'of', 'my', 'is', 'am', 'to']);

export function extractContact(text) {
  const s = String(text == null ? '' : text);
  const out = { name: '', email: '', phone: '' };

  // Email
  const em = s.match(EMAIL_FIND_RX);
  if (em) out.email = em[0].replace(/[.,;:!?)»"']+$/, '');

  // Teléfono (busca en el texto SIN el correo, para no capturar sus dígitos).
  const sNoEmail = out.email ? s.replace(out.email, ' ') : s;
  const cands = sNoEmail.match(PHONE_FIND_RX);
  if (cands) {
    for (const c of cands) {
      const t = c.trim();
      // Descarta rangos de años / spans numéricos: 2020-2024, 1990–1999, 2018/2024.
      if (/^\d{4}\s*[-–/]\s*\d{4}$/.test(t)) continue;
      const digits = (t.match(/\d/g) || []).length;
      if (digits >= 7 && digits <= 15) { out.phone = t; break; }
    }
  }

  // Nombre (frases explícitas). Corta en la primera palabra que no parezca nombre
  // (de, la, que, en…) para no capturar continuaciones ("me llamo de vacaciones").
  const nm = s.match(NAME_FIND_RX);
  if (nm && nm[1]) {
    const words = nm[1].trim().split(/\s+/);
    const nameWords = [];
    for (const w of words) {
      if (NAME_STOP.has(w.toLowerCase().replace(/[.,;:!?]+$/, ''))) break;
      nameWords.push(w);
      if (nameWords.length >= 3) break; // nombre + apellidos, sin desbordarse
    }
    const n = nameWords.join(' ').replace(/[.,;:!?]+$/, '').slice(0, 40);
    if (n) out.name = n;
  }

  return out;
}

// Línea de banderas NO-PII para el modelo: solo si/no por campo, JAMÁS los
// valores. El widget la antepone al turno del usuario en la petición para que
// Marcy pida únicamente los datos que faltan. Formato fijo y delimitado.
export function contactFlags(known) {
  const k = known || {};
  const f = (v) => (v && String(v).trim() ? 'si' : 'no');
  return '[contacto_ya_dado: nombre=' + f(k.name) + ' email=' + f(k.email) + ' telefono=' + f(k.phone) + ']';
}
