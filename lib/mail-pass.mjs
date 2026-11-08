// ─────────────────────────────────────────────────────────────
// Pasada de Marcy por el buzón (la llama la tarea programada).
// Encargo: _cerebro/marcyan-web/encargos/2026-11-07-marcy-correo.md
//
// Por cada correo nuevo de la bandeja de entrada:
//   1) ¿Ya lo vimos? (mail_items, id de Gmail único) → se salta.
//   2) ¿Quién escribe? Cliente, brief o lead de formulario en la base.
//   3) Haiku 5.5 lo clasifica (JSON con esquema; el correo es dato).
//   4) Se guarda la fila ANTES de tocar Gmail (reintento sin duplicar).
//   5) Etiquetas "Marcy/…" en Gmail.
//   6) Borrador de respuesta (Sonnet 5.5) en el mismo hilo, si toca.
//   7) Acuse de texto fijo, solo a oportunidades nuevas o clientes con
//      algo urgente, una vez por hilo, salvo MAIL_ACK_ENABLED=0 (interruptor de apagado).
//
// dryRun: lee y clasifica, NO escribe en Gmail ni en la base (para probar).
// ─────────────────────────────────────────────────────────────
import {
  MAILBOXES, LABELS, CLASSIFY_MODEL, DRAFT_MODEL, CLASSIFY_SYSTEM, DRAFT_SYSTEM,
  headerMap, parseAddress, isAutomated, isOwnSender, extractText, buildClassifyInput,
  parseClassification, fallbackClassification, shouldAck, ackText, buildReplyRaw, needsDraft,
} from './mail-triage.mjs';
import { gmail, ensureLabels } from './gmail.mjs';
import { sumUsage, turnCostMicroUsd } from './chat-usage.mjs';

const FORM_LEAD_DAYS = 14;
const MAX_PER_PASS = 25;

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: ['cliente', 'oportunidad', 'importante', 'facturas', 'boletines', 'spam'] },
    urgent: { type: 'boolean' },
    summary: { type: 'string' },
    lang: { type: 'string', enum: ['es', 'en'] },
  },
  required: ['category', 'urgent', 'summary', 'lang'],
  additionalProperties: false,
};

async function getSql(sqlImpl) { return sqlImpl || (await import('@vercel/postgres')).sql; }
async function getClient(c) {
  if (c) return c;
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30000, maxRetries: 1 });
}
const textOf = (msg) => (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
const costOf = (model, msg) => turnCostMicroUsd(model, sumUsage([msg]));

// ¿Quién es? Cliente activo, brief o lead (con su antigüedad).
async function lookupSender(sql, email) {
  if (!email) return { known: '', fromFormLead: false, leadRef: null };
  const c = await sql`SELECT business_name FROM clients WHERE lower(email) = ${email} AND status <> 'archived' LIMIT 1`;
  if (c.rows.length) return { known: `cliente ${c.rows[0].business_name || ''}`.trim(), fromFormLead: false, leadRef: null, isClient: true };
  const b = await sql`SELECT project_id, created_at FROM briefs WHERE lower(email) = ${email} ORDER BY created_at DESC LIMIT 1`;
  const l = await sql`SELECT ref_id, created_at FROM leads WHERE lower(email) = ${email} ORDER BY created_at DESC LIMIT 1`;
  const recent = (row) => row && Date.now() - new Date(row.created_at).getTime() < FORM_LEAD_DAYS * 864e5;
  const row = b.rows[0] || l.rows[0];
  if (!row) return { known: '', fromFormLead: false, leadRef: null };
  return {
    known: b.rows[0] ? `brief ${b.rows[0].project_id}` : `lead ${l.rows[0].ref_id}`,
    fromFormLead: recent(b.rows[0]) || recent(l.rows[0]),
    leadRef: b.rows[0] ? b.rows[0].project_id : l.rows[0].ref_id,
  };
}

async function newMessageIds(mailbox, state) {
  if (state && state.history_id) {
    try {
      const ids = []; let page; let last = state.history_id;
      do {
        const h = await gmail.history(mailbox, state.history_id, page);
        last = h.historyId || last;
        for (const rec of h.history || []) for (const a of rec.messagesAdded || []) {
          const labs = a.message.labelIds || [];
          if (labs.includes('INBOX') && !labs.includes('SENT') && !labs.includes('DRAFT')) ids.push(a.message.id);
        }
        page = h.nextPageToken;
      } while (page && ids.length < 200);
      return { ids: [...new Set(ids)], historyId: last };
    } catch (e) {
      if (e.status !== 404) throw e; // 404 = historial caducado: se vuelve a mirar el último día
    }
  }
  const p = await gmail.profile(mailbox);
  const r = await gmail.recent(mailbox, process.env.MAIL_Q || 'in:inbox newer_than:1d', MAX_PER_PASS);
  return { ids: (r.messages || []).map((m) => m.id), historyId: p.historyId };
}

export async function processMessage({ mailbox, id, sql, client, labelIds, dryRun, ackEnabled }) {
  const m = await gmail.message(mailbox, id);
  const h = headerMap(m.payload && m.payload.headers);
  const from = parseAddress(h.from);
  const own = isOwnSender(from.email);
  const automated = isAutomated(h, from.email);
  const subject = (h.subject || '').slice(0, 300);
  const text = extractText(m.payload);
  const who = await lookupSender(sql, from.email);

  let cls = null; let cost = 0;
  try {
    const res = await client.messages.create({
      model: CLASSIFY_MODEL,
      max_tokens: 1500,
      system: CLASSIFY_SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: CLASSIFY_SCHEMA } },
      messages: [{ role: 'user', content: buildClassifyInput({ fromEmail: from.email, fromName: from.name, subject, text, known: who.known }) }],
    });
    cost += costOf(CLASSIFY_MODEL, res);
    cls = parseClassification(textOf(res));
  } catch (e) {
    console.warn('[correo] clasificar falló', e && (e.status || e.message));
  }
  if (!cls) cls = fallbackClassification({ automated });
  // Un cliente de la base siempre es "cliente", diga lo que diga el modelo (salvo spam claro).
  if (who.isClient && cls.category !== 'spam') cls.category = 'cliente';

  const item = {
    gmail_id: id, thread_id: m.threadId, from_email: from.email, from_name: from.name.slice(0, 120), subject,
    category: cls.category, urgent: cls.urgent, summary: cls.summary, lang: cls.lang, lead_ref: who.leadRef,
    received_at: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : null,
  };
  const wantDraft = needsDraft({ category: cls.category, automated, own });
  const threadAcked = dryRun ? false : (await sql`SELECT 1 FROM mail_items WHERE mailbox = ${mailbox} AND thread_id = ${m.threadId} AND acked_at IS NOT NULL LIMIT 1`).rows.length > 0;
  const wantAck = shouldAck({ category: cls.category, urgent: cls.urgent, automated, own, fromFormLead: who.fromFormLead, threadAcked });
  if (dryRun) return { ...item, automated, wantDraft, wantAck, costMicro: cost };

  // 4) Fila primero: si otra pasada ya lo tomó, aquí termina.
  const ins = await sql`
    INSERT INTO mail_items (mailbox, gmail_id, thread_id, received_at, from_email, from_name, subject, category, urgent, summary, lang, lead_ref, model_cost_usd)
    VALUES (${mailbox}, ${id}, ${m.threadId}, ${item.received_at}, ${item.from_email}, ${item.from_name}, ${subject}, ${cls.category}, ${cls.urgent}, ${cls.summary}, ${cls.lang}, ${who.leadRef}, ${cost / 1e6})
    ON CONFLICT (mailbox, gmail_id) DO NOTHING RETURNING id`;
  if (!ins.rows.length) return { ...item, skipped: true };
  const rowId = ins.rows[0].id;

  // 5) Etiquetas.
  const add = [labelIds.get(LABELS[cls.category]), cls.urgent ? labelIds.get(LABELS.urgent) : null].filter(Boolean);
  if (add.length) await gmail.modify(mailbox, id, add).catch((e) => console.warn('[correo] etiqueta', e.status));

  // 6) Borrador.
  if (wantDraft) {
    try {
      const d = await client.messages.create({
        model: DRAFT_MODEL,
        max_tokens: 2000,
        system: DRAFT_SYSTEM,
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: buildClassifyInput({ fromEmail: from.email, fromName: from.name, subject, text, known: who.known }) }],
      });
      cost += costOf(DRAFT_MODEL, d);
      const body = textOf(d).replace(/—/g, ',');
      if (body) {
        const raw = buildReplyRaw({ from: mailbox, to: from.email, subject, messageId: h['message-id'], references: h.references, body });
        const dr = await gmail.draft(mailbox, raw, m.threadId);
        await sql`UPDATE mail_items SET draft_id = ${dr.id || null}, model_cost_usd = ${cost / 1e6} WHERE id = ${rowId}`;
      }
    } catch (e) { console.warn('[correo] borrador falló', e && (e.status || e.message)); }
  }

  // 7) Acuse (texto fijo). Se marca ANTES de enviar: si el envío falla no se repite a ciegas.
  if (wantAck && ackEnabled) {
    const mark = await sql`UPDATE mail_items SET acked_at = NOW() WHERE id = ${rowId} AND acked_at IS NULL RETURNING id`;
    if (mark.rows.length) {
      try {
        const raw = buildReplyRaw({ from: `Marcyan <${mailbox}>`, to: from.email, subject, messageId: h['message-id'], references: h.references, body: ackText(cls.lang) });
        await gmail.send(mailbox, raw, m.threadId);
        const acked = labelIds.get(LABELS.acked);
        if (acked) await gmail.modify(mailbox, id, [acked]).catch(() => {});
      } catch (e) {
        await sql`UPDATE mail_items SET acked_at = NULL WHERE id = ${rowId}`;
        console.warn('[correo] acuse falló', e && (e.status || e.message));
      }
    }
  }
  return { ...item, id: rowId, wantDraft, wantAck };
}

export async function runMailPass({ sqlImpl, client: c, dryRun = false, deadline = Date.now() + 50000 } = {}) {
  const sql = await getSql(sqlImpl);
  const client = await getClient(c);
  const ackEnabled = process.env.MAIL_ACK_ENABLED !== '0';
  const out = [];
  for (const mailbox of MAILBOXES) {
    const st = dryRun ? null : (await sql`SELECT history_id FROM mail_state WHERE mailbox = ${mailbox}`).rows[0];
    const { ids, historyId } = await newMessageIds(mailbox, st);
    const labelIds = dryRun ? new Map() : await ensureLabels(mailbox, Object.values(LABELS));
    let done = 0; let stoppedEarly = false;
    for (const id of ids.slice(0, MAX_PER_PASS)) {
      if (Date.now() > deadline) { stoppedEarly = true; break; }
      if (!dryRun) {
        const seen = await sql`SELECT 1 FROM mail_items WHERE mailbox = ${mailbox} AND gmail_id = ${id}`;
        if (seen.rows.length) continue;
      }
      try { out.push(await processMessage({ mailbox, id, sql, client, labelIds, dryRun, ackEnabled })); done++; }
      catch (e) { stoppedEarly = true; console.warn('[correo] mensaje', e && (e.status || e.message)); break; }
    }
    // El punto de lectura solo avanza si se terminó todo: si no, la siguiente pasada repite (sin duplicar).
    if (!dryRun && !stoppedEarly && ids.length <= MAX_PER_PASS) {
      await sql`INSERT INTO mail_state (mailbox, history_id, updated_at, last_error) VALUES (${mailbox}, ${String(historyId)}, NOW(), NULL)
        ON CONFLICT (mailbox) DO UPDATE SET history_id = EXCLUDED.history_id, updated_at = NOW(), last_error = NULL`;
    }
  }
  return out;
}

// Para Orbit.
export async function listMail({ sqlImpl, days = 14, limit = 200 } = {}) {
  const sql = await getSql(sqlImpl);
  const { rows } = await sql`
    SELECT id, received_at, from_email, from_name, subject, category, urgent, summary, lang, lead_ref,
      draft_id IS NOT NULL AS has_draft, acked_at, status, thread_id
    FROM mail_items WHERE received_at > NOW() - make_interval(days => ${days})
    ORDER BY received_at DESC LIMIT ${limit}`;
  return rows;
}

export async function setMailStatus({ id, status, sqlImpl }) {
  if (!['nuevo', 'visto', 'respondido', 'archivado'].includes(status)) throw new Error('estado no válido');
  const sql = await getSql(sqlImpl);
  const r = await sql`UPDATE mail_items SET status = ${status} WHERE id = ${id} RETURNING id`;
  return r.rows.length > 0;
}

export async function purgeOldMail({ sqlImpl } = {}) {
  const sql = await getSql(sqlImpl);
  const r = await sql`DELETE FROM mail_items WHERE created_at < NOW() - make_interval(months => 12)`;
  return r.rowCount || 0;
}
