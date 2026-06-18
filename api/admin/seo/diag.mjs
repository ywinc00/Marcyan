// GET /api/admin/seo/diag
//   Diagnóstico de acceso de la service account a Google (GSC + GA4).
//   Admin-only. SOLO LECTURA: no escribe nada, no muta configuración.
//
//   Por qué existe: cuando la sync da 403 ("User does not have sufficient
//   permission for site …" / "… for this property") pero "GOOGLE CONECTADO"
//   está en verde, el token WIF se obtiene bien y el 403 viene de la API de
//   Google → es un problema de PERMISOS/identidad de propiedad, no de infra.
//   Este endpoint enumera lo que la SA VE realmente y lo contrasta con lo que
//   cada proyecto tiene guardado, para señalar el fix exacto:
//     · GSC: dominio ('sc-domain:x.com') vs prefijo ('https://www.x.com/').
//     · GA4: Property ID equivocado o SA no añadida a nivel de propiedad.
import { requireAdmin } from '../../../lib/auth.mjs';
import {
  isConfigured, setOidcToken, listSeoProjects,
  gscListSites, ga4ListAccountSummaries, ga4ProbeProperty, gscProbeSite,
} from '../../../lib/seo.mjs';

// Dominio "desnudo" para comparar propiedades equivalentes (sin esquema, www
// ni sufijo de ruta): 'https://www.x.com/abc' → 'x.com', 'sc-domain:x.com' → 'x.com'.
function bareDomain(s) {
  return String(s || '')
    .replace(/^sc-domain:/, '')
    .replace(/^https?:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/^www\./, '')
    .toLowerCase();
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  setOidcToken(req.headers['x-vercel-oidc-token']);

  const out = {
    configured: isConfigured(),
    sa_email: (process.env.GOOGLE_SA_EMAIL || '').trim() || null,
    wif_audience_present: Boolean((process.env.GOOGLE_WIF_AUDIENCE || '').trim()),
  };

  // Lo que la SA puede VER (enumeración global de acceso).
  try { out.gsc_sites = await gscListSites(); }
  catch (e) { out.gsc_sites_error = e.message; }

  try { out.ga4_properties = await ga4ListAccountSummaries(); }
  catch (e) { out.ga4_properties_error = e.message; }

  // Contraste por proyecto: ¿lo guardado coincide con algo accesible?
  const projects = await listSeoProjects();
  out.projects = [];
  for (const p of projects) {
    const entry = {
      id: p.id, name: p.name, domain: p.domain,
      gsc_site_url: p.gsc_site_url, ga4_property_id: p.ga4_property_id,
    };

    if (p.gsc_site_url) {
      if (Array.isArray(out.gsc_sites)) {
        entry.gsc_exact_match = out.gsc_sites.some((s) => s.siteUrl === p.gsc_site_url);
        const dom = bareDomain(p.gsc_site_url) || bareDomain(p.domain);
        // Propiedades accesibles del MISMO dominio (revela el desajuste
        // dominio↔prefijo: p.ej. la SA ve 'sc-domain:x.com' pero guardamos
        // 'https://www.x.com/').
        entry.gsc_same_domain_accessible = out.gsc_sites.filter((s) => bareDomain(s.siteUrl) === dom);
      }
      try { entry.gsc_probe = await gscProbeSite(p.gsc_site_url); }
      catch (e) { entry.gsc_probe = { ok: false, error: e.message }; }
    }

    if (p.ga4_property_id) {
      if (Array.isArray(out.ga4_properties)) {
        entry.ga4_exact_match = out.ga4_properties.some((x) => x.propertyId === String(p.ga4_property_id).trim());
      }
      try { entry.ga4_probe = await ga4ProbeProperty(p.ga4_property_id); }
      catch (e) { entry.ga4_probe = { ok: false, error: e.message }; }
    }

    out.projects.push(entry);
  }

  return res.status(200).json(out);
}
