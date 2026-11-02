// ─────────────────────────────────────────────────────────────
// Tipo `branding` · /es/houston/branding (design/rediseno-workos.md §4.18, ola 2).
// Su existencia activa el tipo (registry.ts); la página lo importa y monta WLanding.
//
// Contraste: el plano técnico del hero (marco propio sobre --w-s1), así que ninguna
// sección lleva .w-contrast. Firma: ninguna en bucle (el plano reacciona al hover).
// Degradado: la cifra del precio. Marca de EJEMPLO "Tu Marca", nunca Julio's (E-32).
// Orden (R1): hero + plano → 01 entregables → 02 de la marca a todo lo demás →
// prosa local → 03 caso real → precio → franja "En pocas palabras" → FAQ → hermanas →
// cierre (Contact lo pone WLanding). Ids que ya tenía la página (`proceso`, `proyectos`,
// `precios`) se conservan en las secciones equivalentes.
// ─────────────────────────────────────────────────────────────
import HeroBranding from '../../heroes/HeroBranding.astro';
import ProsaLocal from '../../ProsaLocal.astro';
import FranjaEnPocasPalabras from '../../FranjaEnPocasPalabras.astro';
import PreguntasFrecuentes from '../../PreguntasFrecuentes.astro';
import TarjetasHermanas from '../../TarjetasHermanas.astro';
import CierreDosTarjetas from '../../CierreDosTarjetas.astro';
import Entregables from '../../sections/branding/Entregables.astro';
import DeLaMarca from '../../sections/branding/DeLaMarca.astro';
import Caso from '../../sections/branding/Caso.astro';
import Precio from '../../sections/branding/Precio.astro';
import { brandingCopy as t } from '../../../../i18n/w/branding';
import { nap } from '../../../../i18n/content';
import { catalog, PRICE_ANCHORS } from '../../../../i18n/pricing';
import { serviciosPara } from '../../../../i18n/w/nav';
import type { KindSpec } from '../types';

const usd = (n: number) => '$' + n.toLocaleString('en-US');
const desde = (n: number) => `Desde ${usd(n)}`;

/** "Desde $X" (o "al mes") del ancla baja de cada producto, desde pricing.ts. */
const anchorOf = (id: string) => {
  const p = catalog.find((x) => x.id === id);
  if (!p) return undefined;
  const tier = p.tiers.find((x) => x.anchor) ?? p.tiers[0];
  if (tier.value === null) return undefined;
  return tier.monthly ? `Desde ${usd(tier.value)} al mes` : desde(tier.value);
};

const spec: KindSpec = {
  kind: 'branding',
  tone: 'gold',
  Hero: HeroBranding,
  hero: (ctx) => ({
    h1Html: ctx.cluster.hero.h1,
    chip: t.chip,
    eyebrow: t.eyebrow,
    // Sin cola: en el hero partido el H1 ya ocupa 2 líneas (§2.14); la idea va en la bajada.
    lead: t.lead,
    primary: { label: t.primary, href: '#contacto', track: 'proposal_requested' },
    link: { label: t.link, href: '/es/precios' },
    lang: ctx.lang,
  }),
  sections: [
    // 2 · 01 Entregables: ficha del encargo 4×2.
    { component: Entregables, props: () => ({ copy: t.entregables, n: 1 }) },

    // 3 · 02 De la marca a todo lo demás: escalera de 4 con maquetas de "Tu Marca".
    {
      component: DeLaMarca,
      id: 'proceso',
      props: (ctx) => ({ copy: t.marca, n: 2, city: t.cityName, lang: ctx.lang }),
    },

    // 4 · Cómo lo hacemos: local.paragraphs VERBATIM (contrato de paridad).
    {
      component: ProsaLocal,
      props: (ctx) => ({ titleTone1: t.prosa.tone1, titleTone2: t.prosa.tone2, paragraphs: ctx.cluster.local.paragraphs }),
    },

    // 5 · 03 Caso real: Julio's Landscape TX (#proyectos).
    {
      component: Caso,
      id: 'proyectos',
      props: (ctx) => ({ copy: t.caso, n: 3, items: ctx.cluster.proof.items, lead: "Julio's Landscape TX", lang: ctx.lang }),
    },

    // 6 · Precio con puntos (#precios): "Desde $150" el logo, el slice $750 abajo a la derecha.
    { component: Precio, id: 'precios', props: (ctx) => ({ copy: t.precio, note: ctx.cluster.pricing.note }) },

    // 7 · En pocas palabras (answer VERBATIM), justo antes de la FAQ (R1).
    {
      component: FranjaEnPocasPalabras,
      props: (ctx) => {
        const f = t.franja;
        return {
          q: ctx.cluster.answer.q,
          a: ctx.cluster.answer.a,
          source: ctx.cluster.answer.source,
          lang: ctx.lang,
          cols: [
            { title: f.queEs, text: ctx.cluster.service.description, link: { label: f.verQue, href: '#proceso' } },
            {
              title: f.desdeT,
              text: f.desde(desde(PRICE_ANCHORS.brandingLogo), desde(PRICE_ANCHORS.branding)),
              link: { label: f.verPrecios, href: '/es/precios' },
            },
            { title: f.tiempoT, text: f.tiempo, link: { label: f.pedir, href: '#contacto' } },
          ],
        };
      },
    },

    // 7 · Preguntas frecuentes (#faq), VERBATIM, todas cerradas; emite FAQPage.
    {
      component: PreguntasFrecuentes,
      props: (ctx) => ({
        id: 'faq',
        tag: ctx.cluster.faq.tag,
        titleHtml: ctx.cluster.faq.title,
        items: ctx.cluster.faq.items,
        lang: ctx.lang,
      }),
    },

    // 8 · Hermanas de Houston (hrefs = los del megamenú de esta página, R5).
    {
      component: TarjetasHermanas,
      props: (ctx) => {
        const h = t.hermanas;
        return {
          titleHtml: h.title,
          lead: h.lead,
          currentId: 'branding',
          lang: ctx.lang,
          items: serviciosPara('es', ctx.cluster.path).map((s) => ({
            id: s.id, label: s.name, desc: s.promise, href: s.href, price: anchorOf(s.id),
          })),
          recursos: [
            { icon: 'lucide:layout-template', title: h.portafolio.title, text: h.portafolio.text, href: '/es/portafolio' },
            { icon: 'lucide:scan-search', title: h.diag.title, text: h.diag.text, href: '/es/diagnostico', track: 'tool_cta_clicked' },
            { icon: 'lucide:tag', title: h.precios.title, text: h.precios.text, href: '/es/precios' },
          ],
        };
      },
    },

    // 9 · Cierre en dos tarjetas con el trío contractual (teléfono de Houston).
    {
      component: CierreDosTarjetas,
      props: (ctx) => {
        const c = t.cierre;
        return {
          titleHtml: ctx.cluster.cta.title,
          proof: c.proof,
          city: 'houston',
          tel: 'tel:' + nap.houston.replace(/[^\d+]/g, ''),
          wa: 'https://wa.me/' + nap.houston.replace(/\D/g, ''),
          lang: ctx.lang,
          warm: { kind: 'marcy', title: c.warmTitle, text: c.warmText, cta: c.warmCta, ask: c.ask },
        };
      },
    },
  ],
};

export default spec;
