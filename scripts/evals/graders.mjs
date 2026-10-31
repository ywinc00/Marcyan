// ════════════════════════════════════════════════════════════════
//  scripts/evals/graders.mjs — Correctores en código para las pruebas de chatbots
//
//  Genéricos (sirven para Marcy y para los chatbots de clientes): miran SOLO lo
//  que ve el visitante, el texto de la respuesta y la acción de interfaz. Nada
//  de juzgar con otra IA: si un corrector no se puede escribir en código, el
//  caso no está bien planteado (principio de la plantilla de comercio de
//  Anthropic: "correctores en código, instantáneas, no conversaciones").
// ════════════════════════════════════════════════════════════════

// Cifras de dinero: "$1,500", "$ 400", "1.500 dólares", "900 USD". Devuelve enteros.
export function figures(text = '') {
  const out = [];
  const rx = /\$\s?(\d[\d.,]*)|(\d[\d.,]*)\s?(?:d[óo]lares|dollars|usd)\b/gi;
  let m;
  while ((m = rx.exec(String(text))) !== null) {
    const raw = (m[1] || m[2] || '')
      .replace(/[.,]+$/, '')            // puntuación de final de frase: "$400."
      .replace(/[.,]\d{1,2}$/, '');     // céntimos: "$400.00"
    const v = parseInt(raw.replace(/[.,]/g, ''), 10);
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

// Números que el propio visitante escribió (su economía: "un corte 25", "20 llamadas").
export function userNumbers(messages = []) {
  const set = new Set();
  for (const m of messages) {
    if (m.role !== 'user') continue;
    for (const x of String(m.content).match(/\d[\d.,]*/g) || []) set.add(parseInt(x.replace(/[.,]/g, ''), 10));
  }
  return set;
}

// Cifras sin respaldo: ni publicadas, ni dichas por el visitante, ni calculadas.
export function unbackedFigures(text, { published = [], messages = [], computed = [], tolerance = 0.03 } = {}) {
  const pub = new Set(published.map(Number));
  const usr = userNumbers(messages);
  return figures(text).filter((v) => !pub.has(v) && !usr.has(v)
    && !computed.some((c) => c && Math.abs(v - c) / c <= tolerance));
}

export const questions = (text = '') => (String(text).match(/\?/g) || []).length;

const ES = /\b(el|la|los|las|que|para|con|una|por|tu|tus|negocio|página|puedo|sitio|clientes)\b/gi;
const EN = /\b(the|and|for|your|you|with|can|website|business|customers|this|that)\b/gi;
export function language(text = '') {
  const es = (String(text).match(ES) || []).length;
  const en = (String(text).match(EN) || []).length;
  return en > es ? 'en' : 'es';
}

export const hasEmDash = (text = '') => /[—]/.test(String(text));
export const hasMarkdown = (text = '') => /\*\*|^#{1,6}\s|^\s*[-*]\s/m.test(String(text));

// "garantiz…" afirmativo: cada aparición debe llevar una negación cerca antes.
export function affirmsGuarantee(text = '') {
  const t = String(text).toLowerCase();
  const rx = /garantiz\w*|guarantee\w*/g;
  let m;
  while ((m = rx.exec(t)) !== null) {
    const before = t.slice(Math.max(0, m.index - 40), m.index);
    if (!/\b(no|nadie|ninguna?|nunca|not|no one|can't|cannot|don't|won't)\b/.test(before)) return true;
  }
  return false;
}

// Ejecuta los correctores de un caso y los globales de estilo.
// check(res) devuelve una lista de motivos de fallo (vacía = pasa).
export function grade(caseDef, res) {
  const reasons = [];
  if (!res || res.status !== 200 || typeof res.reply !== 'string' || !res.reply.trim()) {
    reasons.push(`sin respuesta útil (estado ${res && res.status})`);
    return { pass: false, reasons, style: [] };
  }
  try {
    reasons.push(...(caseDef.check(res) || []));
  } catch (e) {
    reasons.push('el corrector falló: ' + (e && e.message));
  }
  if (caseDef.lang && language(res.reply) !== caseDef.lang) reasons.push(`respondió en ${language(res.reply)}, se esperaba ${caseDef.lang}`);
  const style = [];
  if (hasEmDash(res.reply)) style.push('guion largo');
  if (hasMarkdown(res.reply)) style.push('formato markdown');
  return { pass: reasons.length === 0, reasons, style };
}
