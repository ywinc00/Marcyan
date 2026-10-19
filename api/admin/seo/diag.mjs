// GET /api/admin/seo/diag
//   Diagnóstico de acceso de la service account a Google (GSC + GA4).
//   Admin-only. SOLO LECTURA: no escribe nada, no muta configuración.
//   Lo usa la ventana "Estado de Google" del panel (SEO-01).
//
//   Por qué existe: cuando la sync da 403 ("User does not have sufficient
//   permission for site …" / "… for this property") el token WIF se obtiene
//   bien y el 403 viene de la API de Google: es un problema de PERMISOS o de
//   identidad de propiedad, no de infraestructura. Este endpoint enumera lo
//   que la SA VE realmente y lo contrasta con lo que cada proyecto tiene
//   guardado, para señalar el arreglo exacto:
//     · GSC: dominio ('sc-domain:x.com') vs prefijo ('https://www.x.com/').
//     · GA4: Property ID equivocado o SA no añadida a nivel de propiedad.
//
//   Respuesta: { ok, configured, sa_email, wif_audience_present,
//     gsc_sites | gsc_sites_error, ga4_properties | ga4_properties_error,
//     access_error?: { code, title, action, detail },
//     projects: [{ id, name, domain, gsc_site_url, ga4_property_id,
//       gsc_exact_match, gsc_same_domain_accessible, gsc_probe, ga4_exact_match,
//       ga4_probe, findings:[{ source, level, title, action, suggestion? }] }] }
//   Las sondas por proyecto van en paralelo (SEO-21).
import { requireAdmin } from '../../../lib/auth.mjs';
import {
  isConfigured, setOidcToken, listSeoProjects,
  gscListSites, ga4ListAccountSummaries, ga4ProbeProperty, gscProbeSite,
} from '../../../lib/seo.mjs';
import { bareDomain, explainDiagProject, classifyGoogleError, explainCode } from '../../../lib/seo-core.mjs';

export const config = { maxDuration: 60 };

async function probe(fn, arg) {
  try { return await fn(arg); }
  catch (e) { return { ok: false, status: Number(e && e.status) || 0, error: (e && e.message) || 'error' }; }
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  setOidcToken(req.headers['x-vercel-oidc-token']);

  try {
    const configured = isConfigured();
    const out = {
      ok: true,
      configured,
      sa_email: (process.env.GOOGLE_SA_EMAIL || '').trim() || null,
      wif_audience_present: Boolean((process.env.GOOGLE_WIF_AUDIENCE || '').trim()),
    };

    const projects = await listSeoProjects();

    if (!configured) {
      out.access_error = explainCode('not_configured');
      out.projects = projects.map((p) => ({
        id: p.id, name: p.name, domain: p.domain, gsc_site_url: p.gsc_site_url, ga4_property_id: p.ga4_property_id,
        findings: [{ source: 'all', level: 'error', title: out.access_error.title, action: out.access_error.action }],
      }));
      return res.status(200).json(out);
    }

    // Lo que la SA puede VER (enumeración global de acceso), en paralelo.
    const [sites, props] = await Promise.allSettled([gscListSites(), ga4ListAccountSummaries()]);
    if (sites.status === 'fulfilled') out.gsc_sites = sites.value;
    else out.gsc_sites_error = (sites.reason && sites.reason.message) || 'error';
    if (props.status === 'fulfilled') out.ga4_properties = props.value;
    else out.ga4_properties_error = (props.reason && props.reason.message) || 'error';

    // Si ni siquiera se pudo entrar en Google, todo lo demás fallará igual.
    if (sites.status === 'rejected' && props.status === 'rejected') {
      const r = sites.reason || {};
      if (r.code === 'not_configured' || /STS token-exchange|Impersonación del SA/i.test(String(r.message || ''))) {
        out.access_error = r.code === 'not_configured' ? explainCode('not_configured', r.message) : explainCode('auth_failed', r.message);
      }
    }

    const ctx = { gscListed: Array.isArray(out.gsc_sites), ga4Listed: Array.isArray(out.ga4_properties) };
    out.projects = await Promise.all(projects.map(async (p) => {
      const entry = {
        id: p.id, name: p.name, domain: p.domain,
        gsc_site_url: p.gsc_site_url, ga4_property_id: p.ga4_property_id,
      };
      if (p.gsc_site_url && Array.isArray(out.gsc_sites)) {
        entry.gsc_exact_match = out.gsc_sites.some((s) => s.siteUrl === p.gsc_site_url);
        const dom = bareDomain(p.gsc_site_url) || bareDomain(p.domain);
        // Propiedades accesibles del MISMO dominio (revela el desajuste
        // dominio↔prefijo: la SA ve 'sc-domain:x.com' pero guardamos 'https://www.x.com/').
        entry.gsc_same_domain_accessible = out.gsc_sites.filter((s) => bareDomain(s.siteUrl) === dom);
      }
      if (p.ga4_property_id && Array.isArray(out.ga4_properties)) {
        entry.ga4_exact_match = out.ga4_properties.some((x) => x.propertyId === String(p.ga4_property_id).trim());
      }
      if (out.access_error) {
        entry.findings = [{ source: 'all', level: 'error', title: out.access_error.title, action: out.access_error.action }];
        return entry;
      }
      const [g, a] = await Promise.all([
        p.gsc_site_url ? probe(gscProbeSite, p.gsc_site_url) : null,
        p.ga4_property_id ? probe(ga4ProbeProperty, p.ga4_property_id) : null,
      ]);
      if (g) entry.gsc_probe = g;
      if (a) entry.ga4_probe = a;
      entry.findings = explainDiagProject(entry, ctx);
      return entry;
    }));

    if (out.gsc_sites_error) out.gsc_sites_explained = classifyGoogleError('gsc', { message: out.gsc_sites_error });
    if (out.ga4_properties_error) out.ga4_properties_explained = classifyGoogleError('ga4', { message: out.ga4_properties_error });

    return res.status(200).json(out);
  } catch (err) {
    console.error('[admin/seo/diag] error:', err);
    return res.status(500).json({ ok: false, error: 'No se pudo revisar el acceso a Google. Inténtalo de nuevo.' });
  }
}
