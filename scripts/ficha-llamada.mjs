// Ficha de llamada de un lead, en Markdown y SOLO LECTURA (encargo 2026-11-15).
// Junta lo que Orbit sabe de un lead antes de llamarle o escribirle: sus datos y notas,
// el historial, la conversación con Marcy (precio que vio, si pidió una persona), sus
// citas, su brief, su diagnóstico y, si ya es cliente, sus proyectos. Nada de Finanzas.
//
// Uso (desde la raíz del repo):
//   node --env-file=.env.local scripts/ficha-llamada.mjs LEAD-011
//   node --env-file=.env.local scripts/ficha-llamada.mjs cliente@correo.com
//   node --env-file=.env.local scripts/ficha-llamada.mjs LEAD-011 --guardar   (a .fichas/, fuera de git)
//   node --env-file=.env.local scripts/ficha-llamada.mjs --comprobar          (el usuario no escribe ni ve Finanzas)
//
// Conecta SOLO con ORBIT_LECTURA_URL: el usuario orbit_lectura de db/sql/orbit-lectura.sql.
// Si esa conexión no es de ese usuario, no lee nada. La cadena nunca se imprime.
// Detalle: docs/orbit/ficha-llamada.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createPool, createClient } from '@vercel/postgres';
import { leadEventText, leadStatus, leadSource, BRIEF_STATUS, PROJECT_STATUS } from '../src/components/dashboard/crm/crm.js';

const USUARIO = 'orbit_lectura';
const TZ = 'America/Chicago';
const ULTIMOS_TURNOS = 8;

// ── Formato (puro, se prueba sin base) ───────────────────────────
const fecha = (v) => (v ? new Intl.DateTimeFormat('es-US', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '');
const fechaHora = (v) => (v ? new Intl.DateTimeFormat('es-US', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(v)) : '');
const corta = (s, n) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
const cita = (s) => String(s ?? '').trim().split(/\r?\n/).map((l) => '> ' + l).join('\n');
const linea = (pares) => pares.filter(([, v]) => v != null && String(v).trim() !== '').map(([k, v]) => `${k}: ${v}`).join(' · ');

/** Texto Markdown de la ficha a partir de lo leído. `d` = { lead, eventos, convs, turnos, citas, brief, diag, cliente, proyectos }. */
export function armarFicha(d, ahora = new Date()) {
  const { lead } = d;
  const out = [];
  out.push(`# Ficha de llamada · ${lead.ref_id} · ${lead.business_name || lead.name || 'sin nombre'}`);
  out.push(`_Solo lectura · sacada el ${fechaHora(ahora)} (hora de Houston). No se guarda en el repo._`, '');

  out.push('## Quién es');
  out.push('- ' + linea([['Nombre', lead.name], ['Negocio', lead.business_name], ['Ciudad', lead.city]]));
  out.push('- ' + linea([['Teléfono', lead.phone], ['Correo', lead.email]]));
  out.push('- ' + linea([['Origen', leadSource(lead.source).label], ['Página de llegada', lead.page_url], ['Estado', leadStatus(lead.status).label]]));
  out.push('- ' + linea([['Llegó', fecha(lead.created_at)], ['Último cambio', fecha(lead.updated_at)], ['Interés', lead.interest]]));
  if (lead.message) out.push('', '**Lo que escribió**', cita(corta(lead.message, 1200)));
  if (lead.notes) out.push('', '**Notas internas**', cita(corta(lead.notes, 1200)));

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

export async function leerLead(c, clave) {
  const k = String(clave || '').trim();
  const l = await c.query(
    `SELECT ref_id, status, source, name, email, phone, business_name, city, interest, message, converted_brief_id,
            converted_client_id, notes, page_url, created_at, updated_at
       FROM leads WHERE ref_id = upper($1) OR lower(email) = lower($1)
      ORDER BY created_at DESC LIMIT 1`, [k]);
  if (!l.rowCount) return null;
  const lead = l.rows[0];
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
  return { lead, eventos: eventos.rows, convs: convs.rows, turnos, citas: citas.rows, brief, diag: diag.rows[0] || null, cliente: cli, proyectos };
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
    const clave = args.find((a) => !a.startsWith('--'));
    if (!clave) { console.error('Uso: node --env-file=.env.local scripts/ficha-llamada.mjs LEAD-XXX | correo [--guardar]'); process.exitCode = 2; return; }
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
