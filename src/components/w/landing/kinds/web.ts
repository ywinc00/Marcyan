// ─────────────────────────────────────────────────────────────
// Tipo `web` · landings de diseño web por ciudad (design/rediseno-workos.md §4.14,
// ola 1, PILOTO). Su existencia activa el tipo (registry.ts); las páginas
// /es/houston/diseno-web y /es/miami/diseno-web lo importan y montan WLanding.
//
// Contraste: el bento "Más que una web" (.w-contrast). Degradado: la cifra del precio.
// v2 (design/rediseno-workos-v2.md §3 G03): fondo F01 (retícula de maqueta, P12) en el hero;
// 01 y 02 FUNDIDAS en la demo de construcción (P01, firma de la página) por un solo camino:
// Proceso.astro monta DemoConstruye en la celda #proceso y HazlaTuya.astro ya no se monta
// (el archivo se conserva). Cierre: EscenaCierre (P08) con el trío dentro de la tarjeta de
// la pantalla; CierreDosTarjetas ya no se monta aquí.
// Orden (R1): hero → tríada → 01+02 demo → contraste → prosa local → 03 proyectos →
// precio → franja "En pocas palabras" → FAQ → hermanas → cierre (Contact lo pone WLanding).
// ─────────────────────────────────────────────────────────────
import HeroWeb from '../../heroes/HeroWeb.astro';
import TriadaManifiesto from '../../TriadaManifiesto.astro';
import ProsaLocal from '../../ProsaLocal.astro';
import FranjaEnPocasPalabras from '../../FranjaEnPocasPalabras.astro';
import PreguntasFrecuentes from '../../PreguntasFrecuentes.astro';
import TarjetasHermanas from '../../TarjetasHermanas.astro';
import Proceso from '../../sections/web/Proceso.astro';
import MasQueUnaWeb from '../../sections/web/MasQueUnaWeb.astro';
import Proyectos from '../../sections/web/Proyectos.astro';
import Precio from '../../sections/web/Precio.astro';
import Cierre from '../../sections/web/Cierre.astro';
import { webCopy, type WebCity } from '../../../../i18n/w/web';
import { nap } from '../../../../i18n/content';
import { catalog, PRICE_ANCHORS } from '../../../../i18n/pricing';
import { serviciosPara } from '../../../../i18n/w/nav';
import type { KindSpec, LandingCtx } from '../types';

const cityOf = (ctx: LandingCtx): WebCity => (ctx.city === 'miami' ? 'miami' : 'houston');
const copyOf = (ctx: LandingCtx) => webCopy[cityOf(ctx)];
const usd = (n: number) => '$' + n.toLocaleString('en-US');
const desde = (n: number) => `Desde ${usd(n)}`;

/** "Desde $X" (o "al mes") del ancla baja de cada producto, desde pricing.ts. */
const anchorOf = (id: string) => {
  const p = catalog.find((x) => x.id === id);
  if (!p) return undefined;
  const t = p.tiers.find((x) => x.anchor) ?? p.tiers[0];
  if (t.value === null) return undefined;
  return t.monthly ? `Desde ${usd(t.value)} al mes` : desde(t.value);
};

/** Proyecto que encabeza la sección de cada ciudad (§4.14-8). */
const LEAD_PROJECT: Record<WebCity, string> = {
  houston: 'Texas Rush Remove',
  miami: 'Move Junk Away',
};

const spec: KindSpec = {
  kind: 'web',
  tone: 'gold',
  // F01 · retícula de maqueta (P12): su marco de selección abraza las 3 webs del abanico.
  fondo: 'F01',
  Hero: HeroWeb,
  hero: (ctx) => {
    const t = copyOf(ctx);
    return {
      h1Html: ctx.cluster.hero.h1,
      chip: t.chip,
      eyebrow: t.eyebrow,
      tail: t.tail,
      lead: t.lead,
      primary: { label: t.primary, href: '#contacto', track: 'proposal_requested' },
      link: { label: t.link, href: '#proyectos' },
      city: ctx.city,
      cityName: t.cityName,
      lang: ctx.lang,
    };
  },
  sections: [
    // 2 · Tríada a dos tonos (W-ADV-08), sin caja ni icono.
    { component: TriadaManifiesto, props: (ctx) => ({ items: copyOf(ctx).triada }) },

    // 4 · 01 Cómo se construye tu web + 02 Hazla tuya: UNA demo fija (P01). Conserva #proceso.
    {
      component: Proceso,
      id: 'proceso',
      props: (ctx) => ({ copy: copyOf(ctx).demo, lang: ctx.lang }),
    },

    // 6 · Capítulo de contraste: dos frases + bento con un objeto por celda.
    {
      component: MasQueUnaWeb,
      contrast: 'contrast',
      props: (ctx) => ({ copy: copyOf(ctx).bento, city: copyOf(ctx).cityName, lang: ctx.lang }),
    },

    // 7 · Por qué en la ciudad: local.paragraphs VERBATIM (contrato de paridad).
    {
      component: ProsaLocal,
      props: (ctx) => ({
        titleTone1: copyOf(ctx).prosa.tone1,
        titleTone2: copyOf(ctx).prosa.tone2,
        paragraphs: ctx.cluster.local.paragraphs,
        items: copyOf(ctx).prosa.items,
        // Móvil sin la rejilla: repetía la tríada y alargaba la página (control 2, E-18).
        itemsMobile: false,
      }),
    },

    // 8 · 03 Proyectos (#proyectos, destino del enlace del hero).
    {
      component: Proyectos,
      id: 'proyectos',
      props: (ctx) => ({
        copy: copyOf(ctx).proyectos,
        n: 3,
        items: ctx.cluster.proof.items,
        lead: LEAD_PROJECT[cityOf(ctx)],
        leadLink: cityOf(ctx) !== 'miami',
        lang: ctx.lang,
      }),
    },

    // 9 · Precio con puntos (#precios) + qué incluye.
    {
      component: Precio,
      id: 'precios',
      props: (ctx) => ({ copy: copyOf(ctx).precio, note: ctx.cluster.pricing.note }),
    },

    // 10 · En pocas palabras (answer VERBATIM), justo antes de la FAQ (R1).
    {
      component: FranjaEnPocasPalabras,
      props: (ctx) => {
        const t = copyOf(ctx).franja;
        return {
          q: ctx.cluster.answer.q,
          a: ctx.cluster.answer.a,
          source: ctx.cluster.answer.source,
          lang: ctx.lang,
          cols: [
            { title: t.queEs, text: ctx.cluster.service.description, link: { label: t.verQue, href: '#precios' } },
            {
              title: 'Desde cuánto',
              text: t.desde(desde(PRICE_ANCHORS.webLanding), `desde ${usd(PRICE_ANCHORS.web)}`),
              link: { label: t.verPrecios, href: '/es/precios' },
            },
            { title: 'En cuánto tiempo', text: t.tiempo, link: { label: t.pedir, href: '#contacto' } },
          ],
        };
      },
    },

    // 10 · Preguntas frecuentes (#faq), VERBATIM, todas cerradas; emite FAQPage.
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

    // 11 · Hermanas de la misma ciudad (hrefs = los del megamenú de esa página, R5).
    {
      component: TarjetasHermanas,
      props: (ctx) => {
        const t = copyOf(ctx).hermanas;
        return {
          titleHtml: t.title,
          lead: t.lead,
          currentId: 'diseno-web',
          lang: ctx.lang,
          items: serviciosPara('es', ctx.cluster.path).map((s) => ({
            id: s.id, label: s.name, desc: s.promise, href: s.href, price: anchorOf(s.id),
          })),
          recursos: [
            { icon: 'lucide:book-open', title: t.guia.title, text: t.guia.text, href: '/es/blog/precio-pagina-web-houston-guia' },
            { icon: 'lucide:scan-search', title: t.diag.title, text: t.diag.text, href: '/es/diagnostico', track: 'tool_cta_clicked' },
            { icon: 'lucide:tag', title: t.precios.title, text: t.precios.text, href: '/es/precios' },
          ],
        };
      },
    },

    // 12 · Cierre en la pantalla del portátil (P08) con el trío contractual (teléfono de la ciudad).
    {
      component: Cierre,
      wrap: 'none',
      props: (ctx) => {
        const city = cityOf(ctx);
        const num = city === 'miami' ? nap.miami : nap.houston;
        return {
          copy: copyOf(ctx).escena,
          city,
          cityName: copyOf(ctx).cityName,
          tel: 'tel:' + num.replace(/[^\d+]/g, ''),
          wa: 'https://wa.me/' + num.replace(/\D/g, ''),
          lang: ctx.lang,
        };
      },
    },
  ],
};

export default spec;
