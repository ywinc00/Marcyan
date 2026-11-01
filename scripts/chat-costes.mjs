#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  scripts/chat-costes.mjs — Coste y caché del chat de Marcy en un mes (P2)
//
//    node --env-file=.env.local scripts/chat-costes.mjs [AAAA-MM] [--env production|preview|all] [--json]
//
//  Lee chat_usage_daily (migración 017) y resume: conversaciones, turnos,
//  coste total y por conversación, % de caché y reparto por modelo. Por
//  defecto el mes en curso y solo producción (la vista previa son las pruebas).
//  Pensado para el informe mensual: --json devuelve el resumen en una línea.
//  Solo LEE números; no hay nada personal en esa tabla.
// ════════════════════════════════════════════════════════════════
import { summarize, PRICES_READ_ON } from '../lib/chat-usage.mjs';

const args = process.argv.slice(2);
const month = args.find((a) => /^\d{4}-\d{2}$/.test(a)) || new Date().toISOString().slice(0, 7);
const envArg = (() => { const i = args.indexOf('--env'); return i >= 0 ? args[i + 1] : 'production'; })();
const asJson = args.includes('--json');

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.error('Falta POSTGRES_URL. Ejecuta con: node --env-file=.env.local scripts/chat-costes.mjs');
  process.exit(1);
}

const { sql } = await import('@vercel/postgres');
const from = `${month}-01`;
const to = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10);

let rows;
try {
  const r = envArg === 'all'
    ? await sql`SELECT * FROM chat_usage_daily WHERE day >= ${from} AND day < ${to} ORDER BY day`
    : await sql`SELECT * FROM chat_usage_daily WHERE day >= ${from} AND day < ${to} AND env = ${envArg} ORDER BY day`;
  rows = r.rows;
} catch (err) {
  if (err && err.code === '42P01') {
    console.error('La tabla chat_usage_daily no existe todavía: falta aplicar db/migrations/017_chat_usage.sql en Neon.');
    process.exit(2);
  }
  throw err;
}

const t = summarize(rows);
const out = {
  mes: month, entorno: envArg, dias_con_uso: t.days,
  conversaciones: t.conversations, turnos: t.turns, turnos_por_conversacion: Number(t.turnsPerConversation.toFixed(2)),
  coste_usd: Number(t.costUsd.toFixed(4)), coste_por_conversacion_usd: Number(t.costPerConversationUsd.toFixed(4)),
  coste_por_turno_usd: Number(t.costPerTurnUsd.toFixed(4)), cache_pct: Math.round(t.cacheHitRate * 100),
  por_modelo: Object.fromEntries(Object.entries(t.byModel).map(([m, v]) => [m, { turnos: v.turns, coste_usd: Number((v.costMicro / 1e6).toFixed(4)) }])),
  precios_leidos: PRICES_READ_ON,
};

if (asJson) {
  console.log(JSON.stringify(out));
} else {
  console.log(`Chat de Marcy · ${month} · ${envArg}`);
  console.log(`  Conversaciones: ${out.conversaciones} · turnos: ${out.turnos} (${out.turnos_por_conversacion} por conversación)`);
  console.log(`  Coste: ${out.coste_usd} USD · por conversación: ${out.coste_por_conversacion_usd} · por turno: ${out.coste_por_turno_usd}`);
  console.log(`  Entrada leída de caché: ${out.cache_pct} %  (meta de referencia: 90 % o más)`);
  for (const [m, v] of Object.entries(out.por_modelo)) console.log(`  ${m}: ${v.turnos} turnos, ${v.coste_usd} USD`);
  console.log(`  Precios de la documentación oficial leídos el ${PRICES_READ_ON}.`);
}
