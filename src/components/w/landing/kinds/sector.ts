// ─────────────────────────────────────────────────────────────
// Tipo `sector` · landings de industria en Houston (design/rediseno-workos.md §4.19,
// ola 2). Su existencia activa el tipo (registry.ts); las páginas
// /es/houston/contratistas, /es/houston/bienes-raices, /en/houston/contractors y
// /en/houston/restaurants lo importan y montan WLanding.
//
// Contraste: el ciclo en U de 02 (.w-contrast). Firma: ninguna en bucle (el objeto del
// hero entra y se queda). Degradado: la cifra del precio.
// Orden: hero partido → 01 dilema → 02 ciclo (contraste) → 03 filas del oficio → prosa
// local → precio (#precios) → 04 trabajo real (#proyectos) → franja "En pocas palabras"
// → FAQ → hermanas + calculadora → cierre (Contact lo pone WLanding).
// ─────────────────────────────────────────────────────────────
import HeroSector from '../../heroes/HeroSector.astro';
import ProsaLocal from '../../ProsaLocal.astro';
import FranjaEnPocasPalabras from '../../FranjaEnPocasPalabras.astro';
import PreguntasFrecuentes from '../../PreguntasFrecuentes.astro';
import TarjetasHermanas from '../../TarjetasHermanas.astro';
import CierreDosTarjetas from '../../CierreDosTarjetas.astro';
import Dilema from '../../sections/sector/Dilema.astro';
import Ciclo from '../../sections/sector/Ciclo.astro';
import FilasOficio from '../../sections/sector/FilasOficio.astro';
import Precio from '../../sections/sector/Precio.astro';
import Proyectos from '../../sections/sector/Proyectos.astro';
import { sectorCopy, SECTOR_BY_PATH } from '../../../../i18n/w/sector';
import { nap } from '../../../../i18n/content';
import { catalog as catalogEs } from '../../../../i18n/pricing';
import { catalog as catalogEn } from '../../../../i18n/pricing.en';
import { serviciosPara } from '../../../../i18n/w/nav';
import type { KindSpec, LandingCtx } from '../types';

const copyOf = (ctx: LandingCtx) => {
  const key = SECTOR_BY_PATH[ctx.cluster.path];
  if (!key) throw new Error(`kinds/sector: ${ctx.cluster.path} no tiene copy en i18n/w/sector.ts`);
  return sectorCopy[key];
};
const usd = (n: number) => '$' + n.toLocaleString('en-US');

/** "Desde $X" / "From $X" (o "al mes" / "a month") del ancla baja de cada producto. */
const anchorOf = (id: string, lang: 'es' | 'en') => {
  const p = (lang === 'en' ? catalogEn : catalogEs).find((x) => x.id === id);
  if (!p) return undefined;
  const t = p.tiers.find((x) => x.anchor) ?? p.tiers[0];
  if (t.value === null) return undefined;
  if (lang === 'en') return t.monthly ? `From ${usd(t.value)} a month` : `From ${usd(t.value)}`;
  return t.monthly ? `Desde ${usd(t.value)} al mes` : `Desde ${usd(t.value)}`;
};

/** Caso de la ficha grande: Julio's Landscape TX SOLO en contratistas / contractors (§4.19-7). */
const LEAD_PROJECT: Record<string, string | undefined> = {
  '/es/houston/contratistas': "Julio's Landscape TX",
  '/en/houston/contractors': "Julio's Landscape TX",
};

const spec: KindSpec = {
  kind: 'sector',
  tone: 'gold',
  // v3: fondo F20, una escena por oficio con un solo motivo (E-57): atardecer con el haz de líneas que sale
  // por la izquierda en bienes raíces, armazón de obra en contratistas, mesa de comedor en restaurantes.
  // F20 elige la escena por la ruta.
  fondo: 'F20',
  fondoOpciones: () => ({ texto: 'izquierda' }),
  Hero: HeroSector,
  hero: (ctx) => {
    const t = copyOf(ctx);
    return {
      h1Html: ctx.cluster.hero.h1,
      chip: t.chip,
      eyebrow: t.eyebrow,
      lead: t.lead,
      primary: { label: ctx.cluster.hero.primary.label, href: '#contacto', track: 'proposal_requested' },
      link: { label: t.link, href: '#precios' },
      obj: t.obj,
      sr: t.heroSr,
      lang: ctx.lang,
    };
  },
  sections: [
    // 01 · El problema: dilema de dos caminos del oficio (disparo único).
    { component: Dilema, props: (ctx) => ({ copy: copyOf(ctx).dilema, n: 1, lang: ctx.lang }) },

    // 02 · Capítulo de contraste: ciclo en U. Conserva #proceso (id de la landing de antes).
    { component: Ciclo, id: 'proceso', contrast: 'contrast', props: (ctx) => ({ copy: copyOf(ctx).ciclo, n: 2 }) },

    // 03 · Lo que necesita tu web: filas alternas texto + objeto con includes.items.
    {
      component: FilasOficio,
      props: (ctx) => ({ copy: copyOf(ctx).filas, n: 3, items: ctx.cluster.includes.items, oficio: copyOf(ctx).obj, lang: ctx.lang }),
    },

    // Por qué este enfoque: local.paragraphs VERBATIM (contrato de paridad).
    {
      component: ProsaLocal,
      props: (ctx) => ({
        titleTone1: copyOf(ctx).prosa.tone1,
        titleTone2: copyOf(ctx).prosa.tone2,
        paragraphs: ctx.cluster.local.paragraphs,
      }),
    },

    // Precio con puntos (#precios, destino del enlace del hero) + lo que incluye.
    {
      component: Precio,
      id: 'precios',
      props: (ctx) => ({ copy: copyOf(ctx).precio, features: ctx.cluster.pricing.features, lang: ctx.lang }),
    },

    // 04 · Trabajo real (#proyectos, id de la landing de antes).
    {
      component: Proyectos,
      id: 'proyectos',
      props: (ctx) => ({
        copy: copyOf(ctx).proyectos,
        n: 4,
        items: ctx.cluster.proof.items,
        lead: LEAD_PROJECT[ctx.cluster.path],
        lang: ctx.lang,
      }),
    },

    // En pocas palabras (answer VERBATIM), justo antes de la FAQ (R1).
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
            { title: t.desdeT, text: t.desde, link: { label: t.verPrecios, href: t.preciosHref } },
            { title: t.tiempoT, text: t.tiempo, link: { label: t.pedir, href: '#contacto' } },
          ],
        };
      },
    },

    // Preguntas frecuentes (#faq), VERBATIM, todas cerradas; emite FAQPage.
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

    // Hermanas (hrefs = los del megamenú de la página, R5) + calculadora (sustituye a
    // GrowthCta: misma URL y evento tool_cta_clicked), diagnóstico y precios.
    {
      component: TarjetasHermanas,
      props: (ctx) => {
        const t = copyOf(ctx).hermanas;
        const tool = ctx.cluster.tool;
        return {
          titleHtml: t.title,
          lead: t.lead,
          lang: ctx.lang,
          items: serviciosPara(ctx.lang, ctx.cluster.path).map((s) => ({
            id: s.id, label: s.name, desc: s.promise, href: s.href, price: anchorOf(s.id, ctx.lang),
          })),
          recursos: [
            ...(tool ? [{ icon: 'lucide:calculator', title: tool.linkLabel, text: tool.text, href: tool.href, track: 'tool_cta_clicked' }] : []),
            { icon: 'lucide:scan-search', title: t.diag.title, text: t.diag.text, href: t.diag.href, track: 'tool_cta_clicked' },
            { icon: 'lucide:tag', title: t.precios.title, text: t.precios.text, href: t.precios.href },
          ],
        };
      },
    },

    // Cierre en dos tarjetas con el trío contractual (teléfono de Houston).
    {
      component: CierreDosTarjetas,
      props: (ctx) => {
        const t = copyOf(ctx).cierre;
        const num = nap.houston;
        return {
          titleHtml: ctx.cluster.cta.title,
          proof: t.proof,
          city: 'houston',
          tel: 'tel:' + num.replace(/[^\d+]/g, ''),
          wa: 'https://wa.me/' + num.replace(/\D/g, ''),
          lang: ctx.lang,
          warm: { kind: 'diagnostico', title: t.warmTitle, text: t.warmText, cta: t.warmCta, href: t.warmHref },
        };
      },
    },
  ],
};

export default spec;
