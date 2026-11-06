// ─────────────────────────────────────────────────────────────
// Tipo `seo-local` · landings de SEO local por ciudad (design/rediseno-workos.md §4.16,
// ola 2). Su existencia activa el tipo (registry.ts); las páginas /es/houston/seo-local y
// /es/miami/seo-local lo importan y montan WLanding.
//
// Contraste: la matriz "Barrio por barrio" (.w-contrast). Firma: el radar de la sección 01
// (celda de bento, W-CORE-09; nunca en el hero). Degradado: la cifra del precio.
// Orden (R1): hero → 01 lo que revisamos → 02 dónde te ponemos → 03 barrio por barrio
// (contraste) → 04 cómo trabajamos (#proceso) → prosa local → precio (#precios) →
// proyectos (#proyectos) → franja "En pocas palabras" → FAQ → hermanas → cierre
// (Contact lo pone WLanding).
// ─────────────────────────────────────────────────────────────
import HeroSeoLocal from '../../heroes/HeroSeoLocal.astro';
import ProsaLocal from '../../ProsaLocal.astro';
import FranjaEnPocasPalabras from '../../FranjaEnPocasPalabras.astro';
import PreguntasFrecuentes from '../../PreguntasFrecuentes.astro';
import TarjetasHermanas from '../../TarjetasHermanas.astro';
import CierreDosTarjetas from '../../CierreDosTarjetas.astro';
import LoQueRevisamos from '../../sections/seo-local/LoQueRevisamos.astro';
import DondeTePonemos from '../../sections/seo-local/DondeTePonemos.astro';
import BarrioPorBarrio from '../../sections/seo-local/BarrioPorBarrio.astro';
import ComoTrabajamos from '../../sections/seo-local/ComoTrabajamos.astro';
import Precio from '../../sections/seo-local/Precio.astro';
import Proyectos from '../../sections/seo-local/Proyectos.astro';
import { seoCopy, type SeoCity } from '../../../../i18n/w/seo-local';
import { nap } from '../../../../i18n/content';
import { catalog, PRICE_ANCHORS } from '../../../../i18n/pricing';
import { serviciosPara } from '../../../../i18n/w/nav';
import type { KindSpec, LandingCtx } from '../types';

const cityOf = (ctx: LandingCtx): SeoCity => (ctx.city === 'miami' ? 'miami' : 'houston');
const copyOf = (ctx: LandingCtx) => seoCopy[cityOf(ctx)];
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

/** Proyecto que encabeza la sección de cada ciudad (§4.16-8). */
const LEAD_PROJECT: Record<SeoCity, string> = {
  houston: 'Texas Rush Remove',
  miami: 'Move Junk Away',
};

const spec: KindSpec = {
  kind: 'seo-local',
  tone: 'gold',
  // v2 (G05, §1.3/P12): fondo temático F03 (radar de cercanía) en el hero; texto a la izquierda,
  // foco del radar en la ficha del hero. Sin eco: el capítulo de contraste ya es una matriz.
  fondo: 'F03',
  fondoOpciones: () => ({ texto: 'izquierda' }),
  Hero: HeroSeoLocal,
  hero: (ctx) => {
    const t = copyOf(ctx);
    return {
      h1Html: ctx.cluster.hero.h1,
      chip: t.chip,
      tail: t.tail,
      lead: t.lead,
      primary: { label: t.primary, href: '#contacto', track: 'proposal_requested' },
      link: { label: t.link, href: '#proceso' },
      cityName: t.cityName,
      sr: t.heroSr,
      lang: ctx.lang,
    };
  },
  sections: [
    // 2 · 01 Lo que revisamos: bento con el radar como celda dominante (firma).
    {
      component: LoQueRevisamos,
      props: (ctx) => ({ copy: copyOf(ctx).revisamos, n: 1, city: copyOf(ctx).cityName, lang: ctx.lang }),
    },

    // 3 · 02 Dónde te ponemos: pila de ventanas (W-CORE-27).
    { component: DondeTePonemos, props: (ctx) => ({ copy: copyOf(ctx).ventanas, n: 2 }) },

    // 4 · Capítulo de contraste: 03 Barrio por barrio (matriz zona × servicio).
    {
      component: BarrioPorBarrio,
      contrast: 'contrast',
      props: (ctx) => ({ copy: copyOf(ctx).barrios, n: 3, lang: ctx.lang }),
    },

    // 5 · 04 Cómo trabajamos (#proceso, destino del enlace del hero).
    { component: ComoTrabajamos, id: 'proceso', props: (ctx) => ({ copy: copyOf(ctx).pasos, n: 4 }) },

    // 6 · Por qué en la ciudad: local.paragraphs VERBATIM (contrato de paridad).
    {
      component: ProsaLocal,
      props: (ctx) => ({
        titleTone1: copyOf(ctx).prosa.tone1,
        titleTone2: copyOf(ctx).prosa.tone2,
        paragraphs: ctx.cluster.local.paragraphs,
        items: copyOf(ctx).prosa.items,
        itemsMobile: false,
      }),
    },

    // 7 · Precio con puntos (#precios): inicial en grande, mensual abajo (R6).
    {
      component: Precio,
      id: 'precios',
      props: (ctx) => ({ copy: copyOf(ctx).precio, note: ctx.cluster.pricing.note, features: ctx.cluster.pricing.features }),
    },

    // 8 · Proyectos (#proyectos): ficha grande del de la ciudad + el resto. Sin cifras.
    {
      component: Proyectos,
      id: 'proyectos',
      props: (ctx) => ({
        copy: copyOf(ctx).proyectos,
        n: 5,
        items: ctx.cluster.proof.items,
        lead: LEAD_PROJECT[cityOf(ctx)],
        wa: 'https://wa.me/' + (cityOf(ctx) === 'miami' ? nap.miami : nap.houston).replace(/\D/g, ''),
        addText: copyOf(ctx).proyectos.addText,
        // Miami: el rótulo honesto del dato (proof.cta), "Sé nuestro primer caso en Miami".
        addLabel: cityOf(ctx) === 'miami' ? ctx.cluster.proof.cta.label : undefined,
        lang: ctx.lang,
      }),
    },

    // 9 · En pocas palabras (answer VERBATIM), justo antes de la FAQ (R1).
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
            { title: t.queEs, text: ctx.cluster.service.description, link: { label: t.verQue, href: '#proceso' } },
            {
              title: 'Desde cuánto',
              text: t.desde(usd(PRICE_ANCHORS.seoInitial), usd(PRICE_ANCHORS.seoLocal)),
              link: { label: t.verPrecios, href: '/es/precios' },
            },
            { title: 'En cuánto tiempo', text: t.tiempo, link: { label: t.pedir, href: '#contacto' } },
          ],
        };
      },
    },

    // 9 · Preguntas frecuentes (#faq), VERBATIM, todas cerradas; emite FAQPage.
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

    // 10 · Hermanas de la misma ciudad (hrefs = los del megamenú de esa página, R5).
    {
      component: TarjetasHermanas,
      props: (ctx) => {
        const t = copyOf(ctx).hermanas;
        return {
          titleHtml: t.title,
          lead: t.lead,
          currentId: 'seo-local',
          lang: ctx.lang,
          items: serviciosPara('es', ctx.cluster.path).map((s) => ({
            id: s.id, label: s.name, desc: s.promise, href: s.href, price: anchorOf(s.id),
          })),
          recursos: [
            { icon: 'lucide:scan-search', title: t.diag.title, text: t.diag.text, href: '/es/diagnostico', track: 'tool_cta_clicked' },
            { icon: 'lucide:book-open', title: t.blog.title, text: t.blog.text, href: '/es/blog/como-aparecer-en-chatgpt-perplexity' },
            { icon: 'lucide:tag', title: t.precios.title, text: t.precios.text, href: '/es/precios' },
          ],
        };
      },
    },

    // 11 · Cierre en dos tarjetas con el trío contractual (teléfono de la ciudad).
    {
      component: CierreDosTarjetas,
      props: (ctx) => {
        const city = cityOf(ctx);
        const t = copyOf(ctx).cierre;
        const num = city === 'miami' ? nap.miami : nap.houston;
        return {
          titleHtml: ctx.cluster.cta.title,
          proof: t.proof,
          city,
          tel: 'tel:' + num.replace(/[^\d+]/g, ''),
          wa: 'https://wa.me/' + num.replace(/\D/g, ''),
          lang: ctx.lang,
          warm: { kind: 'diagnostico', title: t.warmTitle, text: t.warmText, cta: t.warmCta, href: '/es/diagnostico' },
        };
      },
    },
  ],
};

export default spec;
