// ════════════════════════════════════════════════════════════════
//  POST /api/brief
//  Recibe el brief, genera project_id MRC-XXX, inserta en Postgres,
//  registra event y notifica:
//    1) Email al admin (notificación de nuevo brief)
//    2) Email al cliente (auto-respuesta de confirmación)
//
//  Acepta DOS formas (compatibilidad hacia atrás):
//    · v1 (sin schema_version): el formulario /formulario y el chat
//      (source:'chat'). Mismos 39 campos planos de siempre +
//      pages_required/features_required (arrays).
//    · v2 (schema_version: 2): brief corto del momento 'inicial', validado
//      en el servidor con lib/brief-schema.mjs (B-10). Campos planos y/o
//      dentro de `extra`; además `lang`, `services` y, si hubo subidas,
//      `draftId` + `secret` + `files` (metadatos por archivo).
//  El contrato completo está documentado en la entrega de orbit/infra.
// ════════════════════════════════════════════════════════════════
import { sql } from '@vercel/postgres';
import { logEvent } from '../lib/db.mjs';
import { createNotification, notifyEmailFailure } from '../lib/notifications.mjs';
import {
  emailAdminNewBrief, emailClientConfirmation, resend,
} from '../lib/email.mjs';
import { clientIp } from '../lib/auth.mjs';
import {
  LEGACY_COLUMNS, LEGACY_JSONB, EMAIL_RE, normalize, validate, splitByStorage, labelFor, shortLabel, fieldByKey,
} from '../lib/brief-schema.mjs';
import { rateLimit, LIMITS } from '../lib/ratelimit.mjs';
import {
  getDraft, markDraftSubmitted, reconcileDraft, verifyFiles, blobConfigured, isMissingSchema,
} from '../lib/brief-files.mjs';
import { secretMatches } from '../lib/brief-upload-rules.mjs';

function sanitize(v, max = 5000) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)
    ),
  ]);

const hasEnoughDigits = (p) => (String(p).match(/\d/g) || []).length >= 7;

const MSG = {
  rate: {
    es: 'Recibimos varios envíos seguidos desde tu conexión. Espera unos minutos y vuelve a intentarlo.',
    en: 'We received several submissions in a row from your connection. Please wait a few minutes and try again.',
  },
  contact: {
    es: 'Necesitamos al menos un email o un teléfono para contactarte.',
    en: 'We need at least an email or a phone number to reach you.',
  },
  email: {
    es: 'El email no tiene un formato válido. Revísalo, por favor.',
    en: 'The email does not look valid. Please check it.',
  },
  phone: {
    es: 'El teléfono no parece válido. Incluye al menos 7 dígitos.',
    en: 'The phone number does not look valid. Include at least 7 digits.',
  },
  fields: {
    es: 'Revisa los campos marcados, por favor.',
    en: 'Please check the highlighted fields.',
  },
  error: {
    es: 'Error al procesar el formulario. Por favor intenta de nuevo en un momento.',
    en: 'We could not process the form. Please try again in a moment.',
  },
};

// INSERT con el MRC generado DENTRO de la misma sentencia (B-11): el
// advisory lock de next_project_id() dura la transacción del INSERT, así
// que dos briefs simultáneos (chat + formulario) ya no reciben el mismo MRC.
async function insertBrief(cols) {
  const names = cols.map(([n]) => n);
  const values = cols.map(([, v]) => v);
  const ph = cols.map(([, , cast], i) => `$${i + 1}${cast ? `::${cast}` : ''}`);
  const text = `INSERT INTO briefs (project_id, ${names.join(', ')})
                VALUES (next_project_id(), ${ph.join(', ')})
                RETURNING id, project_id`;
  const r = await sql.query(text, values);
  return r.rows[0];
}

function legacyCols(columns, meta) {
  const cols = LEGACY_COLUMNS.map((k) => (LEGACY_JSONB.includes(k)
    ? [k, JSON.stringify(Array.isArray(columns[k]) ? columns[k] : []), 'jsonb']
    : [k, columns[k] ?? null]));
  cols.push(['ip_address', meta.ip], ['user_agent', meta.ua], ['source', meta.source]);
  return cols;
}

// Si la migración 010 aún no está aplicada, el brief v2 no se pierde: los
// campos nuevos se añaden como texto legible al final de las notas.
function extraAsNotes(extra, services) {
  const lines = [];
  if (services && services.length) lines.push(`${shortLabel(fieldByKey('services'))}: ${labelFor('services', services, 'es')}`);
  for (const [k, v] of Object.entries(extra || {})) {
    const fd = fieldByKey(k);
    const t = labelFor(fd || k, v, 'es');
    if (t) lines.push(`${fd ? shortLabel(fd) : k}: ${t}`);
  }
  return lines.length ? `--- Datos del brief v2 ---\n${lines.join('\n')}` : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = (typeof req.body === 'object' && req.body) ? req.body : {};
    if (JSON.stringify(body).length > 500000) return res.status(413).json({ ok: false, error: 'Payload demasiado grande' });

    // Honeypot anti-spam
    if (body.website_hp) {
      return res.status(200).json({ ok: true, projectId: 'MRC-000' });
    }

    const isV2 = Number(body.schema_version) === 2;
    const lang = isV2 && body.lang === 'en' ? 'en' : 'es';
    const ip = clientIp(req);

    // Origen del brief (allowlist): 'web' (formulario /formulario) o 'chat' (el asistente
    // Marcy arma el brief por el cliente). Default seguro a 'web'.
    const SOURCE_ALLOW = new Set(['web', 'chat']);
    const source = SOURCE_ALLOW.has(body.source) ? body.source : 'web';

    let columns, extra = {}, services = [];
    if (isV2) {
      // v2: validación completa con el esquema (momento inicial).
      const merged = { ...body, ...((body.extra && typeof body.extra === 'object') ? body.extra : {}) };
      const v = validate('inicial', merged, { optionMode: 'keep' });
      if (!v.ok) {
        return res.status(400).json({ ok: false, error: MSG.fields[lang], fields: v.errors });
      }
      const split = splitByStorage(v.data);
      columns = split.columns;
      services = Array.isArray(v.data.services) ? v.data.services : [];
      extra = { ...split.extra };
      delete extra.services; // va a su propia columna
    } else {
      // v1: mismas claves de siempre. Opciones fuera de la lista → null en el
      // formulario (B-10); el chat manda texto libre razonado y se conserva.
      columns = normalize(body, {
        only: LEGACY_COLUMNS,
        optionMode: source === 'chat' ? 'free' : 'drop',
        truncate: 5000,
      });
      for (const k of LEGACY_JSONB) {
        const arr = Array.isArray(body[k]) ? body[k] : [];
        columns[k] = arr.filter((x) => x !== null && x !== undefined && x !== '').slice(0, 50).map((x) => String(x).slice(0, 120));
      }
    }

    // Contacto: al menos uno, y con formato válido (B-03/B-10).
    const email = sanitize(columns.email, 200);
    const phone = sanitize(columns.phone, 50);
    if (!email && !phone) return res.status(400).json({ ok: false, error: MSG.contact[lang] });
    if (email && !EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: MSG.email[lang] });
    if (phone && !hasEnoughDigits(phone) && !email) return res.status(400).json({ ok: false, error: MSG.phone[lang] });
    columns.email = email;
    columns.phone = phone;

    // Límite de envíos persistente por IP (B-03). Degrada a memoria sin la
    // migración. Va DESPUÉS de validar: un cliente que corrige errores del
    // formulario varias veces no gasta su cupo (solo cuentan envíos válidos).
    const rl = await rateLimit({ bucket: 'brief', key: ip, limits: LIMITS.brief });
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter));
      return res.status(429).json({ ok: false, error: MSG.rate[lang] });
    }

    // Borrador de archivos (opcional, solo v2): se valida ANTES del INSERT; si
    // no vale, el brief entra igual y los archivos se ignoran (log breve).
    let draft = null;
    if (isV2 && body.draftId && body.secret) {
      try {
        const d = await getDraft(String(body.draftId));
        if (d && d.purpose === 'brief' && !d.submitted_at && secretMatches(String(body.secret), d.secret_hash)) draft = d;
        else console.warn('[brief] borrador de archivos no válido o ya enviado; se ignoran los archivos');
      } catch (err) {
        console.warn('[brief] no se pudo leer el borrador:', isMissingSchema(err) ? 'migración 010 sin aplicar' : (err && err.message));
      }
    }

    const meta = { ip, ua: sanitize(req.headers['user-agent'], 500), source };
    let inserted;
    if (isV2) {
      const cols = [
        ...legacyCols(columns, meta),
        ['extra', JSON.stringify(extra), 'jsonb'],
        ['schema_version', 2],
        ['lang', lang],
        ['services', services, 'text[]'],
      ];
      try {
        inserted = await insertBrief(cols);
      } catch (err) {
        if (!isMissingSchema(err)) throw err;
        console.warn('[brief] migración 010 sin aplicar: brief v2 guardado como v1 con los datos nuevos en las notas');
        const notes = [columns.additional_notes, extraAsNotes(extra, services)].filter(Boolean).join('\n\n');
        inserted = await insertBrief(legacyCols({ ...columns, additional_notes: notes.slice(0, 20000) }, meta));
        draft = null;
      }
    } else {
      inserted = await insertBrief(legacyCols(columns, meta));
    }
    const projectId = inserted.project_id;
    const data = columns;

    // Audit log: brief recibido
    await logEvent({
      projectId,
      type: 'brief_received',
      actorEmail: null,
      data: {
        business_name: data.business_name || null,
        email: data.email || null,
        ip,
        ...(isV2 ? { schema_version: 2, services } : {}),
      },
    });

    // Archivos: cerrar el borrador (el secreto deja de valer) y conciliar con
    // lo que hay en Blob (el webhook no llega en local). Solo concilia quien
    // cierra el borrador: con un doble envío simultáneo, el segundo brief
    // entra sin archivos en vez de quitárselos al primero.
    let fileRows = [];
    if (draft) {
      try {
        const claimed = await markDraftSubmitted(draft.id, inserted.id);
        if (!claimed) console.warn(`[brief] ${projectId} el borrador de archivos ya se envió con otro brief; este entra sin archivos`);
        else if (blobConfigured()) fileRows = await reconcileDraft({ draftId: draft.id, briefId: inserted.id, filesMeta: body.files });
      } catch (err) {
        console.error(`[brief] ${projectId} conciliación de archivos falló:`, err && err.message);
      }
    }

    // Aviso in-dashboard (createNotification nunca lanza; es defensiva)
    await createNotification({
      type: 'new_brief',
      title: `Nuevo brief — ${data.business_name || 'sin nombre'}`,
      body: data.main_objective || null,
      ref: projectId,
      url: '/dashboard',
    });

    // Notificaciones email + verificación de archivos EN PARALELO: la
    // verificación (bytes mágicos) no retrasa los correos y tiene su propio tope.
    let emailAdminOk = false;
    let emailClientOk = false;
    let filesCheck = null;

    const verifyP = fileRows.length
      ? withTimeout(verifyFiles(fileRows), 15000, 'Verificación de archivos')
          .then((r) => { filesCheck = r; })
          .catch((err) => console.warn(`[brief] ${projectId} verificación pendiente (la termina el cron):`, err && err.message))
      : Promise.resolve();

    if (resend) {
      const adminP = withTimeout(
        emailAdminNewBrief({
          projectId, data, pages: data.pages_required, features: data.features_required,
          extra, services, filesCount: fileRows.length,
        }),
        8000, 'Resend admin'
      ).then(() => { emailAdminOk = true; })
       .catch(err => console.error(`[brief] ${projectId} admin email falló:`, err && err.message));

      // Una confirmación por correo cada 24 h (B-03): un bot no puede usar
      // el formulario para escribirle repetidamente a un tercero.
      const confirm = data.email
        ? await rateLimit({ bucket: 'confirmEmail', key: data.email.toLowerCase(), limits: LIMITS.confirmEmail })
        : { ok: false };
      const clientP = data.email && confirm.ok
        ? withTimeout(
            emailClientConfirmation({
              projectId,
              clientEmail: data.email,
              ownerName: data.owner_name,
              businessName: data.business_name,
              lang,
            }),
            8000, 'Resend client'
          ).then(() => { emailClientOk = true; })
           .catch(err => console.error(`[brief] ${projectId} client email falló:`, err && err.message))
        : Promise.resolve();

      await Promise.all([adminP, clientP, verifyP]);

      // Aviso 'system' en el panel si un correo no salió (dedup por brief).
      if (!emailAdminOk) await notifyEmailFailure({ projectId, who: 'admin', businessName: data.business_name });
      if (data.email && confirm.ok && !emailClientOk) await notifyEmailFailure({ projectId, who: 'client', businessName: data.business_name });

      console.log(`[brief] ${projectId} insertado · adminEmail=${emailAdminOk} · clientEmail=${emailClientOk}${data.email && !confirm.ok ? ' (confirmación ya enviada hoy)' : ''} · archivos=${fileRows.length}`);
    } else {
      await verifyP;
      console.warn(`[brief] ${projectId} insertado · RESEND_API_KEY no configurada, sin emails`);
    }

    return res.status(200).json({
      ok: true,
      projectId,
      emailAdmin: emailAdminOk,
      emailClient: emailClientOk,
      ...(isV2 ? {
        files: {
          linked: fileRows.length,
          verified: filesCheck ? filesCheck.verified : 0,
          rejected: filesCheck ? filesCheck.rejected : 0,
        },
      } : {}),
    });

  } catch (err) {
    console.error('[brief] submission error:', err);
    const lang = (req.body && req.body.lang === 'en') ? 'en' : 'es';
    return res.status(500).json({
      ok: false,
      error: MSG.error[lang],
    });
  }
}
