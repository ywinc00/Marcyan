// Sustituto de @vercel/postgres para scripts/test-projects.mjs (nunca toca la
// base real). Cada consulta del tag sql`` se pasa a globalThis.__fakeDb(text,
// values), que la prueba define; el texto lleva $1, $2… en lugar de valores.
// Todas las consultas quedan en globalThis.__fakeDbLog para inspeccionarlas.
export async function sql(strings, ...values) {
  const text = strings.reduce((acc, s, i) => acc + '$' + i + s);
  (globalThis.__fakeDbLog ||= []).push({ text, values });
  const handler = globalThis.__fakeDb;
  if (!handler) throw new Error('fake-postgres: sin __fakeDb definido');
  const rows = (await handler(text, values)) || [];
  return { rows, rowCount: rows.length };
}
export const db = { connect() { throw new Error('fake-postgres: connect() no disponible'); } };
