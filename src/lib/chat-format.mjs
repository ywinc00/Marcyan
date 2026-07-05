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

// ¿El texto del bot PIDE explícitamente los datos del visitante? Red de seguridad
// para abrir la captura cuando el modelo pidió datos pero NO llamó a la herramienta
// (sin `action`). SOLO matchea frases inequívocas de "deja TUS datos/correo/etc" en
// 2ª persona (la INTENCIÓN de captar), no el sustantivo "formulario". Marcy VENDE
// sitios con "formulario de contacto", así que esa palabra es PRODUCTO, no una
// invitación a capturar → así evitamos el falso positivo que abría la captura sola.
const INVITE_RX = /d[eé]j\w*\s+(tus|tu)\s+(datos|informaci[óo]n|contacto|correo|email|tel[ée]fono|n[úu]mero|nombre)|leave\s+your\s+(details|info|email|phone|contact|number|name)|drop\s+your\s+(name|email|phone|details|info)/i;

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
// Nombre — dos vías:
//  · STRONG: frases de presentación explícitas ("me llamo X", "my name is X"),
//    de alta confianza → aceptan cualquier caso.
//  · WEAK: "soy X" / saludo + X ("Hola Juan", "soy Juan") → exigen MAYÚSCULA
//    inicial y que no sea una palabra común (rol/saludo/"Marcy"), para captar el
//    nombre sin tragarse "soy realtor" ni "Hola Marcy".
const NAME_STRONG_RX = /(?:me\s+llamo|mi\s+nombre\s+es|my\s+name\s+is|i\s*am\s+called|i'?m\s+called|les\s+habla|me\s+dicen)\s+([a-záéíóúñü][\wáéíóúñü'’.-]*(?:\s+[a-záéíóúñü][\wáéíóúñü'’.-]+)?)/i;
const NAME_SOY_RX = /(?:\b[Ss]oy|\b[Ii]\s*'?[Aa]?m)\s+([A-ZÁÉÍÓÚÑ][a-zñáéíóúü'’.-]{1,20}(?:\s+[A-ZÁÉÍÓÚÑ][a-zñáéíóúü'’.-]{1,20})?)/;
const NAME_GREET_RX = /(?:^|[¡!¿?,.]\s*)(?:[Hh]ola|[Hh]ey|[Hh]i|[Hh]ello|[Bb]uenas|[Bb]uenos\s+d[íi]as|[Qq]u[eé]\s+tal)\s+([A-ZÁÉÍÓÚÑ][a-zñáéíóúü'’.-]{1,20}(?:\s+[A-ZÁÉÍÓÚÑ][a-zñáéíóúü'’.-]{1,20})?)/;
// Palabras que NO son nombre: cortan la captura (p. ej. "me llamo de vacaciones").
const NAME_STOP = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'en', 'un', 'una', 'que', 'mi', 'tu', 'su', 'por', 'para', 'con', 'sin', 'a', 'al', 'me', 'no', 'si', 'and', 'the', 'of', 'my', 'is', 'am', 'to']);
// Palabras que, aunque vengan en mayúscula tras "soy"/saludo, NO son un nombre.
const NAME_BLOCK = new Set(['marcy', 'marcyan', 'realtor', 'riactor', 'agente', 'agent', 'broker', 'dueño', 'dueno', 'owner', 'corredor', 'corredora', 'vendedor', 'vendedora', 'cliente', 'gracias', 'hola', 'buenas', 'buenos', 'señor', 'senor', 'señora', 'senora', 'amigo', 'amiga', 'sr', 'sra']);

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

  // Nombre: primero frases explícitas (STRONG, cualquier caso); si no, señales
  // débiles "soy X" y luego saludo "Hola X" (exigen mayúscula + no palabra común).
  let nameRaw = '';
  const strong = s.match(NAME_STRONG_RX);
  if (strong && strong[1]) {
    nameRaw = strong[1];
  } else {
    const soy = s.match(NAME_SOY_RX);
    if (soy && soy[1] && !NAME_BLOCK.has(soy[1].toLowerCase())) {
      nameRaw = soy[1];
    } else {
      const gr = s.match(NAME_GREET_RX);
      if (gr && gr[1] && !NAME_BLOCK.has(gr[1].toLowerCase())) nameRaw = gr[1];
    }
  }
  if (nameRaw) {
    // Corta en la primera palabra que no parezca nombre (de, la, que, rol…) y limita.
    const words = nameRaw.trim().split(/\s+/);
    const nameWords = [];
    for (const w of words) {
      const wl = w.toLowerCase().replace(/[.,;:!?]+$/, '');
      if (NAME_STOP.has(wl) || NAME_BLOCK.has(wl)) break;
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
