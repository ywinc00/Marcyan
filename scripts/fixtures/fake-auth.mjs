// Sustituto de lib/auth.mjs para scripts/test-projects.mjs: la sesión siempre
// es válida (la exigencia de sesión de cada handler la vigila test:admin).
export async function requireAdmin() {
  return { email: 'prueba@marcyan.test' };
}
