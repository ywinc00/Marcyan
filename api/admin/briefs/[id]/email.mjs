// POST /api/admin/briefs/:id/email
// Body: { subject, body }  → envía email al cliente del brief.
import { requireAdmin } from '../../../../lib/auth.mjs';
import { getBriefByProjectId, logEvent } from '../../../../lib/db.mjs';
import { emailManualToClient } from '../../../../lib/email.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const session = await requireAdmin(req, res);
  if (!session) return;

  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ ok: false, error: 'ID requerido' });

  try {
    const body = (typeof req.body === 'object' && req.body) ? req.body : {};
    const subject = String(body.subject || '').trim();
    const text    = String(body.body || '').trim();

    if (!subject) return res.status(400).json({ ok: false, error: 'Asunto requerido' });
    if (!text)    return res.status(400).json({ ok: false, error: 'Mensaje requerido' });
    if (subject.length > 200) return res.status(400).json({ ok: false, error: 'Asunto demasiado largo (máx 200)' });
    if (text.length > 10000)  return res.status(400).json({ ok: false, error: 'Mensaje demasiado largo (máx 10000)' });

    const brief = await getBriefByProjectId(id);
    if (!brief) return res.status(404).json({ ok: false, error: 'Brief no encontrado' });
    if (!brief.email) return res.status(400).json({ ok: false, error: 'Este brief no tiene email del cliente' });

    await emailManualToClient({
      to: brief.email,
      subject,
      body: text,
      replyTo: session.email,
      fromAdminEmail: session.email,
    });

    await logEvent({
      projectId: id,
      type: 'email_sent_to_client',
      actorEmail: session.email,
      data: { subject, to: brief.email, length: text.length },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin/briefs/:id/email] error:', err);
    return res.status(500).json({
      ok: false,
      error: err && err.message ? `No se pudo enviar: ${err.message}` : 'Error al enviar email',
    });
  }
}
