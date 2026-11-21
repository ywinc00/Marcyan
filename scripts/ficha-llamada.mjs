// Ficha de llamada de un lead, en Markdown y SOLO LECTURA (encargo 2026-11-15).
// Junta lo que Orbit sabe de un lead antes de llamarle o escribirle: sus datos y notas,
// su etapa y su propuesta (opciones, recomendada, elegida, caducidad y seguimientos;
// tanda 2 de Ventas, 7b), el historial, la conversación con Marcy (precio que vio, si
// pidió una persona), sus citas, su brief, su diagnóstico y, si ya es cliente, sus
// proyectos. Nada de Finanzas: lo propuesto es venta, no cobros.
//
// Uso (desde la raíz del repo):
//   node --env-file=.env.local scripts/ficha-llamada.mjs LEAD-011
//   node --env-file=.env.local scripts/ficha-llamada.mjs cliente@correo.com
//   node --env-file=.env.local scripts/ficha-llamada.mjs LEAD-011 --guardar   (a .fichas/, fuera de git)
//   node --env-file=.env.local scripts/ficha-llamada.mjs --comprobar          (el usuario no escribe ni ve Finanzas)
//   node --env-file=.env.local scripts/ficha-llamada.mjs --embudo             (lista del embudo en JSON, para la rutina semanal de Ventas)
//
// Conecta SOLO con ORBIT_LECTURA_URL: el usuario orbit_lectura de db/sql/orbit-lectura.sql.
// Si esa conexión no es de ese usuario, no lee nada. La cadena nunca se imprime.
// Detalle: docs/orbit/ficha-llamada.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createPool, createClient } from '@vercel/postgres';
import {
  leadEventText, leadStatus, leadSource, BRIEF_STATUS, PROJECT_STATUS, OPEN_STATUSES,
  lostReason, dayLabel, houstonToday, nextStepText, optionPrice, money, PROPOSAL_AUTHOR,
} from '../src/components/dashboard/crm/crm.js';
import { nextStep, effectiveStatus, pendingPriceOf, OPEN_STAGES } from '../lib/proposals.mjs';

const USUARIO = 'orbit_lectura';
const TZ = 'America/Chicago';
const ULTIMOS_TURNOS = 8;

// ── Formato (puro, se prueba sin base) ───────────────────────────
const fecha = (v) => (v ? new Intl.DateTimeFormat('es-US', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '');
const fechaHora = (v) => (v ? new Intl.DateTimeFormat('es-US', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(v)) : '');
const corta = (s, n) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
const cita = (s) => String(s ?? '').trim().split(/\r?\n/).map((l) => '> ' + l).join('\n');
const linea = (pares) => pares.filter(([, v]) => v != null && String(v).trim() !== '').map(([k, v]) => `${k}: ${v}`).join(' · ');

const SEGUIMIENTOS = [2, 5, 10];   // los del catálogo (reglas.seguimientoDias)
const ESTADO_PROPUESTA = { draft: 'en borrador', sent: 'enviada', accepted: 'aceptada', rejected: 'rechazada', expired: 'vencida' };
const nombreOpcion = (o) => [o?.plan?.name, ...(o?.projects || []).map((x) => x.name)].filter(Boolean).join(' + ') || 'Opción';

/** «## Etapa y propuesta»: etapa, siguiente paso y la propuesta viva (o la última). Puro. */
export function seccionVenta(d, ahora = new Date()) {
  const { lead } = d;
  const out = ['', '## Etapa y propuesta'];
  out.push('- ' + linea([['Etapa', leadStatus(lead.status).label], ['Desde', fecha(lead.stage_changed_at)]]));
  if (lead.status === 'lost') out.push('- ' + linea([['Motivo', lostReason(lead.lost_reason)?.label], ['Nota', corta(lead.lost_note, 200)]]));
  const props = d.propuestas || [];
  // La viva: la enviada (o vencida); si no hay, el borrador sin enviar, que también pide plazo.
  const viva = props.find((p) => p.status === 'sent' || p.status === 'expired') || props.find((p) => p.status === 'draft') || null;
  if (OPEN_STATUSES.includes(lead.status)) {
    const n = nextStep(lead, viva, { now: ahora });
    const t = nextStepText(n, { now: ahora });
    const plazo = n.kind === 'none' ? `desde hace ${Number(n.days) || 0} ${Number(n.days) === 1 ? 'día' : 'días'}`
      : n.kind === 'waiting' && n.due ? `vence el ${dayLabel(n.due)}`
      : { late: 'atrasado', today: 'hoy', week: 'esta semana' }[n.bucket] || '';
    out.push(`- Siguiente paso: ${t.what}${plazo ? ` (${plazo})` : ''}`);
  }
  if (d.propuestasSinPermiso) {
    out.push('- Propuestas: el usuario de lectura todavía no puede verlas (falta aplicar `db/sql/orbit-lectura.sql`, bloque de la migración 029).');
    return out;
  }
  if (!props.length) { out.push('- Sin propuesta todavía.'); return out; }
  const p = viva || props[0];
  const hoy = houstonToday(ahora);
  const eff = effectiveStatus(p, hoy);
  const partes = [];
  if (eff === 'draft' || !p.sent_on) partes.push(ESTADO_PROPUESTA[eff] || eff);
  else {
    partes.push(`enviada el ${dayLabel(p.sent_on)}`);
    if (eff === 'sent' && p.expires_on) partes.push(`vale hasta el ${dayLabel(p.expires_on)}`);
    else if (eff === 'expired') partes.push(p.expires_on ? `venció el ${dayLabel(p.expires_on)} sin respuesta` : 'vencida sin respuesta');
    else if (eff !== 'sent') partes.push(ESTADO_PROPUESTA[eff] || eff);
  }
  out.push('', `**Propuesta ${p.ref_id}**: ${partes.join(', ')}. ${PROPOSAL_AUTHOR[p.created_by] || 'La hiciste tú en Orbit'}.`);
  const valor = p.client_value_cents == null ? null : Number(p.client_value_cents);
  (Array.isArray(p.options) ? p.options : []).forEach((o, i) => {
    const marcas = [
      o.pending ? 'precio por confirmar' : '',
      p.options.length > 1 && p.recommended_option === i ? 'recomendada' : '',
      p.chosen_option === i ? 'la eligió' : '',
      valor > 0 && o.monthly_cents > 0 ? `se paga con ${Math.ceil(o.monthly_cents / valor)} clientes nuevos al mes` : '',
    ].filter(Boolean);
    out.push(`- ${nombreOpcion(o)}: ${optionPrice(o)}${marcas.length ? ` (${marcas.join(', ')})` : ''}`);
  });
  if (valor > 0) out.push(`- Le vale ${money(valor)} cada cliente nuevo.`);
  if (eff === 'sent') {
    const hechos = Number(p.follow_ups_done) || 0;
    out.push(`- Seguimientos: ${hechos} de ${SEGUIMIENTOS.length} hechos${p.next_follow_up_on ? `; el próximo, el del día ${SEGUIMIENTOS[hechos]}, toca el ${dayLabel(p.next_follow_up_on)}` : ''}.`);
  }
  if (p.decision_note) out.push(`- Nota de la decisión: ${corta(p.decision_note, 300)}`);
  const antes = props.filter((x) => x !== p);
  if (antes.length) out.push(`- Antes: ${antes.map((x) => `${x.ref_id} (${ESTADO_PROPUESTA[effectiveStatus(x, hoy)] || x.status})`).join(', ')}.`);
  return out;
}

/** Texto Markdown de la ficha a partir de lo leído. `d` = { lead, eventos, convs, turnos, citas, brief, diag, cliente, proyectos }. */
export function armarFicha(d, ahora = new Date()) {
  const { lead } = d;
  const out = [];
  out.push(`# Ficha de llamada · ${lead.ref_id} · ${lead.business_name || lead.name || 'sin nombre'}`);
  out.push(`_Solo lectura · sacada el ${fechaHora(ahora)} (hora de Houston). No se guarda en el repo._`, '');

  out.push('## Quién es');
  out.push('- ' + linea([['Nombre', lead.name], ['Negocio', lead.business_name], ['Ciudad', lead.city]]));
  out.push('- ' + linea([['Teléfono', lead.phone], ['Correo', lead.email]]));
  out.push('- ' + linea([['Origen', leadSource(lead.source).label], ['Página de llegada', lead.page_url]]));
  out.push('- ' + linea([['Llegó', fecha(lead.created_at)], ['Último cambio', fecha(lead.updated_at)], ['Interés', lead.interest]]));
  if (lead.message) out.push('', '**Lo que escribió**', cita(corta(lead.message, 1200)));
  if (lead.notes) out.push('', '**Notas internas**', cita(corta(lead.notes, 1200)));

  out.push(...seccionVenta(d, ahora));

  if (d.eventos?.length) {
    out.push('', '## Historial');
    for (const ev of d.eventos) out.push(`- ${fecha(ev.created_at)} · ${leadEventText(ev)}`);
  }

  out.push('', '## Conversación con Marcy');
  if (!d.convs?.length) out.push('- No habló con Marcy (o no dejó su contacto en el chat).');
  else {
    const turnos = d.turnos || [];
    const precios = turnos.filter((t) => t.tool === 'cotizar' || /\$\s?\d/.test(t.reply || ''));
    const persona = d.convs.some((c) => c.lead_kind === 'handoff' || c.takeover_at) || turnos.some((t) => t.action_type === 'handoff');
    for (const c of d.convs) out.push(`- ${fecha(c.started_at)} · ${c.channel || 'web'} · ${c.lang === 'en' ? 'inglés' : 'español'} · ${c.turns || 0} mensajes`);
    out.push(`- Vio precio: ${precios.length ? 'sí' : 'no'}${precios.length ? '. Lo último que le dijo Marcy del precio:' : ''}`);
    if (precios.length) out.push(cita(corta(precios[precios.length - 1].reply, 500)));
    out.push(`- Pidió hablar con una persona: ${persona ? 'sí' : 'no'}`);
    const ult = turnos.slice(-ULTIMOS_TURNOS);
    if (ult.length) {
      out.push('', `**Últimos ${ult.length} intercambios**`);
      for (const t of ult) {
        if (t.user_text) out.push(`- Cliente: ${corta(t.user_text, 280)}`);
        if (t.reply) out.push(`  - Marcy: ${corta(t.reply, 280)}`);
      }
    }
  }

  out.push('', '## Citas');
  if (!d.citas?.length) out.push('- Sin citas.');
  for (const a of d.citas || []) out.push('- ' + linea([['Cuándo', fechaHora(a.starts_at)], ['Duración', a.duration_min ? `${a.duration_min} min` : ''], ['Estado', a.status], ['Tema', a.topic], ['Nota', corta(a.notes, 200)]]));

  if (d.brief) {
    const b = d.brief;
    out.push('', `## Brief ${b.project_id}`);
    out.push('- ' + linea([['Estado', BRIEF_STATUS[b.status]?.label || b.status], ['Recibido', fecha(b.created_at)], ['Sector', b.industry], ['Web actual', b.current_website]]));
    out.push('- ' + linea([['Qué quiere', b.website_type], ['Objetivo', b.main_objective], ['Que el visitante', b.visitor_action]]));
    out.push('- ' + linea([['Presupuesto que indicó', b.budget_range], ['Plazo', b.timeline], ['Fecha límite', b.deadline]]));
    if (b.summary) out.push('', cita(corta(b.summary, 800)));
  }

  if (d.diag) {
    const g = d.diag;
    out.push('', `## Diagnóstico ${g.ref_id || ''}`.trimEnd());
    out.push('- ' + linea([['Fecha', fecha(g.created_at)], ['Web', g.url], ['Puntuación', g.score_total != null ? `${g.score_total}/100` : ''], ['Problema que marcó', g.problem]]));
    const hall = Array.isArray(g.findings) ? g.findings : [];
    for (const h of hall.slice(0, 3)) out.push(`- ${corta(h.es || h.title || h.text || '', 200)}`);
  }

  if (d.cliente) {
    const c = d.cliente;
    out.push('', `## Ya es cliente · ${c.client_code}`);
    out.push('- ' + linea([['Estado', c.status === 'archived' ? 'archivado' : c.status === 'inactive' ? 'inactivo' : 'activo'], ['Cliente desde', fecha(c.created_at)]]));
    if (!d.proyectos?.length) out.push('- Sin proyectos.');
    for (const p of d.proyectos || []) out.push(`- ${p.project_code} · ${p.name}${p.service_type ? ` (${p.service_type})` : ''} · ${PROJECT_STATUS[p.status]?.label || p.status}`);
  }
  out.push('');
  return out.join('\n');
}

// ── Lista del embudo (Ventas 7d): JSON estable para la rutina semanal de Ventas ──
// Cambia `formato` si cambia la forma (no si se añaden avisos): la rutina lo comprueba.
export const FORMATO_EMBUDO = 'embudo/1';
const DIA_MS = 86400000;
const diaNum = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
const diasEntre = (a, b) => Math.round((diaNum(b) - diaNum(a)) / DIA_MS);   // b menos a, en días de calendario
const sumarDias = (s, n) => new Date(diaNum(s) + n * DIA_MS).toISOString().slice(0, 10);
const iso = (v) => (v == null ? null : new Date(v).toISOString());
const diaHouston = (v) => (v == null ? null : /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : houstonToday(new Date(v)));
const DE_PRUEBA = ['test', 'spam'];

/** La semana pasada completa (lunes a domingo) y el mes en curso hasta hoy, en días de Houston. Pura. */
export function ventanasEmbudo(hoy) {
  const lunes = sumarDias(hoy, -((new Date(diaNum(hoy)).getUTCDay() + 6) % 7));
  return { semana: { desde: sumarDias(lunes, -7), hasta: sumarDias(lunes, -1) }, mes: { desde: hoy.slice(0, 8) + '01', hasta: hoy } };
}

function propuestaEmbudo(p, hoy, viva) {
  const opts = Array.isArray(p.options) ? p.options : [];
  const eff = effectiveStatus(p, hoy);
  return {
    ref: p.ref_id,
    estado: eff,
    creada: iso(p.created_at),
    creada_por: p.created_by || 'orbit',
    enviada: p.sent_on || null,
    caduca: p.expires_on || null,
    dias_para_caducar: eff === 'sent' && p.expires_on ? diasEntre(hoy, p.expires_on) : null,
    seguimientos_hechos: Number(p.follow_ups_done) || 0,
    seguimientos_total: SEGUIMIENTOS.length,
    proximo_seguimiento: eff === 'sent' ? p.next_follow_up_on || null : null,
    opcion: opts.length ? nombreOpcion(opts[p.recommended_option ?? 0] || opts[0]) : null,
    opciones: opts.length,
    precio_por_confirmar: pendingPriceOf(opts)?.name || null,
    viva,
  };
}

function pasoEmbudo(n, ahora, hoy) {
  const venceDia = n.due ? diaHouston(n.due) : null;
  const tarde = n.bucket === 'late';
  return {
    tipo: n.kind,
    texto: nextStepText(n, { now: ahora }).what || '',
    plazo: n.bucket,
    vence: n.due ? (String(n.due).length > 10 ? iso(n.due) : n.due) : null,
    atrasado: tarde,
    dias_tarde: tarde && venceDia ? Math.max(0, diasEntre(venceDia, hoy)) : 0,
    ...(n.kind === 'none' ? { dias_sin_paso: Number(n.days) || 0 } : {}),
    ...(n.pending_price ? { precio_por_confirmar: true } : {}),
  };
}

/**
 * La lista del embudo a partir de lo leído (pura). `d` = { leads, propuestas, borradores,
 * altas, pasos, diags, movs, permisos }. Nada de Finanzas ni de contacto (correo, teléfono):
 * para escribir a alguien se pide su ficha.
 */
export function armarEmbudo(d, ahora = new Date()) {
  const hoy = houstonToday(ahora);
  const v = ventanasEmbudo(hoy);
  const porLead = new Map();
  for (const p of d.propuestas || []) {
    if (!porLead.has(p.lead_ref)) porLead.set(p.lead_ref, []);
    porLead.get(p.lead_ref).push(p);
  }
  // La viva, como en «Para hoy»: la enviada; si no, la vencida; si no, el borrador (la más reciente de cada una).
  const orden = { sent: 0, expired: 1, draft: 2 };
  const vivaDe = new Map();
  const contactos = (d.leads || []).map((l) => {
    const props = (porLead.get(l.ref_id) || []).slice()
      .sort((a, b) => (orden[a.status] ?? 3) - (orden[b.status] ?? 3) || new Date(b.created_at) - new Date(a.created_at));
    const viva = props[0] || null;
    if (viva) vivaDe.set(l.ref_id, viva.ref_id);
    const vivaPaso = viva ? { ...viva, pending_price: Boolean(pendingPriceOf(viva.options)) } : null;
    const desde = l.stage_changed_at || l.created_at;
    return {
      ref: l.ref_id,
      nombre: l.name || null,
      negocio: l.business_name || null,
      origen: l.source || null,
      etapa: l.status,
      etapa_texto: leadStatus(l.status).label,
      en_etapa_desde: iso(desde),
      dias_en_etapa: desde ? Math.max(0, diasEntre(diaHouston(desde), hoy)) : null,
      creado: iso(l.created_at),
      siguiente_paso: pasoEmbudo(nextStep(l, vivaPaso, { now: ahora }), ahora, hoy),
      propuestas: props.map((p, i) => propuestaEmbudo(p, hoy, i === 0)),
    };
  });
  const abiertos = new Set(contactos.map((x) => x.ref));
  const borradores = (d.borradores || []).map((b) => {
    const opts = Array.isArray(b.options) ? b.options : [];
    const horas = Math.max(0, Math.floor((ahora - new Date(b.created_at)) / 3600000));
    const de = b.lead_ref ? { tipo: 'contacto', ref: b.lead_ref, nombre: b.lead_name || null, negocio: b.lead_business || null }
      : b.client_id != null ? { tipo: 'cliente', ref: b.client_code || null, nombre: null, negocio: b.client_business || null }
      : { tipo: 'brief', ref: b.brief_ref || null, nombre: null, negocio: b.brief_business || null };
    return {
      ref: b.ref_id,
      creada: iso(b.created_at),
      horas,
      mas_de_24h: horas >= 24,
      creada_por: b.created_by || 'orbit',
      opcion: opts.length ? nombreOpcion(opts[b.recommended_option ?? 0] || opts[0]) : null,
      precio_por_confirmar: pendingPriceOf(opts)?.name || null,
      de,
      // «Para hoy» de Orbit solo enseña la propuesta viva de un contacto abierto: lo demás lo avisa la rutina.
      en_para_hoy: de.tipo === 'contacto' && abiertos.has(b.lead_ref) && vivaDe.get(b.lead_ref) === b.ref_id,
    };
  });
  const cifras = Object.fromEntries(Object.entries(v).map(([k, w]) => {
    const en = (dia) => Boolean(dia) && dia >= w.desde && dia <= w.hasta;
    const real = (r) => !DE_PRUEBA.includes(r.lead_status);
    return [k, {
      desde: w.desde,
      hasta: w.hasta,
      contactos_nuevos: (d.altas || []).filter((r) => en(r.dia) && !DE_PRUEBA.includes(r.status)).length,
      diagnosticos_hechos: new Set((d.pasos || []).filter((r) => en(r.dia) && real(r)).map((r) => r.lead_ref)).size,
      diagnosticos_web: (d.diags || []).filter((r) => en(r.dia)).length,
      propuestas_enviadas: (d.movs || []).filter((r) => en(r.enviada) && real(r)).length,
      propuestas_aceptadas: (d.movs || []).filter((r) => r.status === 'accepted' && en(r.decidida) && real(r)).length,
    }];
  }));
  const avisos = [];
  if (d.permisos && d.permisos.brief_ref === false) {
    avisos.push('El usuario de lectura no ve a qué brief pertenece cada borrador: sale como «brief» sin referencia (falta aplicar el bloque 032 de db/sql/orbit-lectura.sql).');
  }
  return { formato: FORMATO_EMBUDO, generado: iso(ahora), zona: TZ, hoy, avisos, contactos, borradores, cifras };
}

// ── Lectura ─────────────────────────────────────────────────────
async function conectar() {
  const url = process.env.ORBIT_LECTURA_URL;
  if (!url) {
    throw new Error('Falta ORBIT_LECTURA_URL en .env.local (usuario de solo lectura; ver docs/orbit/ficha-llamada.md). No se usa la conexión principal.');
  }
  // Siempre UNA conexión (las comprobaciones abren y deshacen una transacción en ella).
  let c;
  if (/-pooler\./.test(url)) {
    const pool = createPool({ connectionString: url });
    const cl = await pool.connect();
    c = { query: (t, p) => cl.query(t, p), end: async () => { cl.release(); await pool.end(); } };
  } else {
    const cl = createClient({ connectionString: url });
    await cl.connect();
    c = { query: (t, p) => cl.query(t, p), end: () => cl.end() };
  }
  const who = await c.query('SELECT current_user AS u');
  if (who.rows[0]?.u !== USUARIO) {
    await c.end?.();
    throw new Error(`Esa conexión no es del usuario ${USUARIO}: no se lee nada. Revisa ORBIT_LECTURA_URL.`);
  }
  return c;
}

const BRIEF_COLS = 'project_id, status, created_at, business_name, industry, current_website, website_type, main_objective, visitor_action, budget_range, timeline, deadline, summary';

// Sin el permiso nuevo (bloque de la migración 029 en db/sql/orbit-lectura.sql), la base
// niega esas columnas: la ficha sale igual, sin ellas, y lo dice.
const sinPermiso = (e) => Boolean(e && (e.code === '42501' || e.code === '42703' || e.code === '42P01'));
const LEAD_COLS = `ref_id, status, source, name, email, phone, business_name, city, interest, message, converted_brief_id,
            converted_client_id, notes, page_url, created_at, updated_at`;
const PROPUESTA_COLS = `ref_id, status, created_by, options, recommended_option, chosen_option, client_value_cents,
            to_char(sent_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS sent_on, to_char(expires_on, 'YYYY-MM-DD') AS expires_on,
            follow_ups_done, to_char(next_follow_up_on, 'YYYY-MM-DD') AS next_follow_up_on, decided_at, decision_note, created_at`;

export async function leerLead(c, clave) {
  const k = String(clave || '').trim();
  const buscar = (cols) => c.query(
    `SELECT ${cols}
       FROM leads WHERE ref_id = upper($1) OR lower(email) = lower($1)
      ORDER BY created_at DESC LIMIT 1`, [k]);
  let l;
  try { l = await buscar(`${LEAD_COLS}, stage_changed_at, lost_reason, lost_note`); }
  catch (e) { if (!sinPermiso(e)) throw e; l = await buscar(LEAD_COLS); }
  if (!l.rowCount) return null;
  const lead = l.rows[0];
  let propuestas = [];
  let propuestasSinPermiso = false;
  try {
    propuestas = (await c.query(
      `SELECT ${PROPUESTA_COLS} FROM proposals
        WHERE lead_ref = $1 OR ($2::bigint IS NOT NULL AND client_id = $2::bigint)
        ORDER BY created_at DESC LIMIT 5`,
      [lead.ref_id, lead.converted_client_id == null ? null : String(lead.converted_client_id)])).rows;
  } catch (e) { if (!sinPermiso(e)) throw e; propuestasSinPermiso = true; }
  const [eventos, convs, citas, diag, cliente] = await Promise.all([
    c.query('SELECT event_type, actor_email, data, created_at FROM lead_events WHERE lead_ref = $1 ORDER BY created_at', [lead.ref_id]),
    c.query('SELECT sid, channel, lang, started_at, last_at, turns, lead_kind, takeover_at FROM chat_conversations WHERE lead_ref = $1 ORDER BY started_at', [lead.ref_id]),
    c.query('SELECT starts_at, duration_min, status, topic, notes FROM appointments WHERE lead_ref = $1 ORDER BY starts_at', [lead.ref_id]),
    c.query('SELECT ref_id, created_at, url, problem, score_total, findings FROM diagnostics WHERE lead_ref = $1 ORDER BY created_at DESC LIMIT 1', [lead.ref_id]),
    c.query('SELECT id, client_code, status, created_at FROM clients WHERE source_lead_id = $1 OR id::text = $2 ORDER BY created_at LIMIT 1',
      [lead.ref_id, lead.converted_client_id == null ? '' : String(lead.converted_client_id)]),
  ]);
  const sids = convs.rows.map((r) => r.sid);
  const turnos = sids.length
    ? (await c.query('SELECT sid, created_at, user_text, reply, action_type, tool FROM chat_turns WHERE sid = ANY($1::text[]) ORDER BY id', [sids])).rows
    : [];
  const brief = lead.converted_brief_id
    ? (await c.query(`SELECT ${BRIEF_COLS} FROM briefs WHERE project_id = $1`, [lead.converted_brief_id])).rows[0] || null
    : null;
  const cli = cliente.rows[0] || null;
  const proyectos = cli
    ? (await c.query('SELECT project_code, name, service_type, status FROM projects WHERE client_id = $1 ORDER BY started_at NULLS LAST', [cli.id])).rows
    : [];
  return { lead, propuestas, propuestasSinPermiso, eventos: eventos.rows, convs: convs.rows, turnos, citas: citas.rows, brief, diag: diag.rows[0] || null, cliente: cli, proyectos };
}

/** Lo que necesita la lista del embudo, en solo lectura. */
export async function leerEmbudo(c, ahora = new Date()) {
  const v = ventanasEmbudo(houstonToday(ahora));
  const desdeMin = sumarDias(v.semana.desde < v.mes.desde ? v.semana.desde : v.mes.desde, -1);
  const T = `'${TZ}'`;
  const leads = (await c.query(
    `SELECT ref_id, status, source, name, business_name, created_at, updated_at, stage_changed_at
       FROM leads WHERE status = ANY($1::text[]) ORDER BY created_at`, [OPEN_STAGES])).rows;
  const refs = leads.map((l) => l.ref_id);
  const propuestas = refs.length
    ? (await c.query(
      `SELECT ${PROPUESTA_COLS}, lead_ref FROM proposals
        WHERE lead_ref = ANY($1::text[]) AND status IN ('draft', 'sent', 'expired')
        ORDER BY created_at DESC`, [refs])).rows
    : [];
  const borr = (conBrief) => c.query(
    `SELECT p.ref_id, p.created_by, p.options, p.recommended_option, p.created_at, p.lead_ref, p.client_id,
            ${conBrief ? 'p.brief_ref, b.business_name AS brief_business,' : ''}
            l.name AS lead_name, l.business_name AS lead_business, l.status AS lead_status,
            cl.client_code, cl.business_name AS client_business
       FROM proposals p
       LEFT JOIN leads l ON l.ref_id = p.lead_ref
       LEFT JOIN clients cl ON cl.id = p.client_id
       ${conBrief ? 'LEFT JOIN briefs b ON b.project_id = p.brief_ref' : ''}
      WHERE p.status = 'draft' AND (l.status IS NULL OR l.status <> ALL($1::text[]))
      ORDER BY p.created_at`, [DE_PRUEBA]);
  let borradores;
  let briefRef = true;
  try { borradores = (await borr(true)).rows; }
  catch (e) { if (!sinPermiso(e)) throw e; briefRef = false; borradores = (await borr(false)).rows; }
  const [altas, pasos, diags, movs] = await Promise.all([
    c.query(`SELECT status, to_char(created_at AT TIME ZONE ${T}, 'YYYY-MM-DD') AS dia FROM leads WHERE created_at >= $1::date`, [desdeMin]),
    c.query(
      `SELECT e.lead_ref, l.status AS lead_status, to_char(e.created_at AT TIME ZONE ${T}, 'YYYY-MM-DD') AS dia
         FROM lead_events e LEFT JOIN leads l ON l.ref_id = e.lead_ref
        WHERE e.event_type = 'status_changed' AND e.data->>'to' = 'diagnosed' AND e.created_at >= $1::date`, [desdeMin]),
    c.query(`SELECT to_char(created_at AT TIME ZONE ${T}, 'YYYY-MM-DD') AS dia FROM diagnostics WHERE created_at >= $1::date`, [desdeMin]),
    c.query(
      `SELECT p.status, l.status AS lead_status,
              to_char(p.sent_at AT TIME ZONE ${T}, 'YYYY-MM-DD') AS enviada,
              to_char(p.decided_at AT TIME ZONE ${T}, 'YYYY-MM-DD') AS decidida
         FROM proposals p LEFT JOIN leads l ON l.ref_id = p.lead_ref
        WHERE p.sent_at >= $1::date OR p.decided_at >= $1::date`, [desdeMin]),
  ]);
  return armarEmbudo({
    leads, propuestas, borradores,
    altas: altas.rows, pasos: pasos.rows, diags: diags.rows, movs: movs.rows,
    permisos: { brief_ref: briefRef },
  }, ahora);
}

/** Prueba que el usuario no escribe ni ve Finanzas, IP ni importes. Devuelve las líneas del resultado. */
export async function comprobar(c) {
  const casos = [
    ['no lee facturas', 'SELECT id FROM invoices LIMIT 1'],
    ['no lee pagos', 'SELECT id FROM payments LIMIT 1'],
    ['no lee gastos', 'SELECT id FROM company_expenses LIMIT 1'],
    ['no lee suscripciones', 'SELECT id FROM subscriptions LIMIT 1'],
    ['no lee sesiones del panel', 'SELECT id FROM admin_sessions LIMIT 1'],
    ['no lee importes de proyectos', 'SELECT agreed_amount_cents FROM projects LIMIT 1'],
    ['no lee la IP de los leads', 'SELECT ip_address FROM leads LIMIT 1'],
    ['no lee la lista interna de precios', 'SELECT version FROM sales_catalog LIMIT 1'],
    ['no lee quién preparó cada propuesta en Orbit', 'SELECT actor_email FROM proposals LIMIT 1'],
    ['no escribe', "INSERT INTO lead_events (lead_ref, event_type) VALUES ('LEAD-000', 'prueba_lectura')"],
  ];
  const out = [];
  let ok = true;
  for (const [nombre, q] of casos) {
    try {
      await c.query('BEGIN');
      await c.query(q);
      out.push(`NO PASA · ${nombre}: la base lo permitió`);
      ok = false;
    } catch (e) {
      const bien = e.code === '42501' || e.code === '25006';
      out.push(`${bien ? 'PASA' : 'NO PASA'} · ${nombre}${bien ? '' : ` (error inesperado ${e.code || ''})`}`);
      if (!bien) ok = false;
    } finally {
      await c.query('ROLLBACK').catch(() => {});
    }
  }
  try { await c.query('SELECT ref_id FROM leads LIMIT 1'); out.push('PASA · sí lee los leads'); } catch { out.push('NO PASA · no puede leer los leads'); ok = false; }
  try { await c.query('SELECT ref_id, options, expires_on FROM proposals LIMIT 1'); out.push('PASA · sí lee las propuestas'); } catch { out.push('NO PASA · no puede leer las propuestas'); ok = false; }
  try { await c.query('SELECT stage_changed_at, lost_reason FROM leads LIMIT 1'); out.push('PASA · sí lee la etapa y el motivo de perdido'); } catch { out.push('NO PASA · no puede leer la etapa ni el motivo de perdido'); ok = false; }
  return { ok, lineas: out };
}

async function main() {
  const args = process.argv.slice(2);
  const c = await conectar();
  try {
    if (args.includes('--comprobar')) {
      const r = await comprobar(c);
      console.log(r.lineas.join('\n'));
      process.exitCode = r.ok ? 0 : 1;
      return;
    }
    if (args.includes('--embudo')) {
      process.stdout.write(JSON.stringify(await leerEmbudo(c), null, 2) + '\n');
      return;
    }
    const clave = args.find((a) => !a.startsWith('--'));
    if (!clave) { console.error('Uso: node --env-file=.env.local scripts/ficha-llamada.mjs LEAD-XXX | correo [--guardar] · --embudo · --comprobar'); process.exitCode = 2; return; }
    const datos = await leerLead(c, clave);
    if (!datos) { console.error(`No hay ningún lead con «${clave}».`); process.exitCode = 1; return; }
    const md = armarFicha(datos);
    if (args.includes('--guardar')) {
      const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.fichas');
      fs.mkdirSync(dir, { recursive: true });
      const f = path.join(dir, `${datos.lead.ref_id}.md`);
      fs.writeFileSync(f, md);
      console.error(`Guardada en .fichas/${datos.lead.ref_id}.md (fuera de git).`);
    }
    process.stdout.write(md);
  } finally {
    await c.end?.();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
