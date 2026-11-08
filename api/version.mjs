// GET /api/version — la versión publicada ahora mismo (commit del despliegue).
// Orbit la compara con la suya y se recarga sola si hay una nueva.
// Público y sin datos: solo un identificador corto.
export default function handler(req, res) {
  const v = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'dev').slice(0, 12);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ v });
}
