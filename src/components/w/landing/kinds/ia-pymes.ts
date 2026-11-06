// ─────────────────────────────────────────────────────────────
// Tipo `ia-pymes` · IA para pymes (design/rediseno-workos.md §4.11, ola 2), ES y EN.
// Su existencia activa el tipo (registry.ts); /es/ia-para-pymes y /en/ai-for-small-business
// lo importan y montan WLanding (EN con lang="en"; hreflang ES↔EN lo pone el Layout desde
// routes.ts, sin tocar).
//
// Contraste: el amanecer teal del hero (.w-dawn, en HeroIaPymes). Firma: la esclusa de Marcy.
// Degradado: la cifra del precio (desviación medida del plan: el plan lo ponía en la cola del
// H1, pero H1 noche + cola no caben en 2 líneas en la columna de 560 y la cola no se pinta,
// regla de §2.14).
// v2 (rediseno-workos-v2.md §3 G06): fondo F05 (placa); esclusa con canales legibles y
// amanecer teal; "Así está montada" (chip) y "Dónde trabaja" (constelación de logos).
// Orden: hero → tríada → 01 cómo decide → 02 la IA ya decide → 03 así está montada →
// 04 dónde trabaja → 05 tus datos → caso → precio → franja → FAQ → cierre → hermanas.
// Process desaparece (el secundario de antes iba a #faq, que sigue).
// ─────────────────────────────────────────────────────────────
import HeroIaPymes from '../../heroes/HeroIaPymes.astro';
import TriadaManifiesto from '../../TriadaManifiesto.astro';
import FranjaEnPocasPalabras from '../../FranjaEnPocasPalabras.astro';
import PreguntasFrecuentes from '../../PreguntasFrecuentes.astro';
import TarjetasHermanas from '../../TarjetasHermanas.astro';
import CierreDosTarjetas from '../../CierreDosTarjetas.astro';
import ComoDecide from '../../sections/ia/ComoDecide.astro';
import LaIaDecide from '../../sections/ia/LaIaDecide.astro';
import AsiMontada from '../../sections/ia/AsiMontada.astro';
import ConstelacionCanales from '../../sections/ia/ConstelacionCanales.astro';
import DatosASalvo from '../../sections/ia/DatosASalvo.astro';
import CasoIa from '../../sections/ia/CasoIa.astro';
import PrecioIa from '../../sections/ia/PrecioIa.astro';
import { iaPymesCopy } from '../../../../i18n/w/ia-pymes';
import { nap } from '../../../../i18n/content';
import { catalog, PRICE_ANCHORS } from '../../../../i18n/pricing';
import { catalog as catalogEn } from '../../../../i18n/pricing.en';
import { serviciosPara } from '../../../../i18n/w/nav';
import type { KindSpec, LandingCtx } from '../types';

const copyOf = (ctx: LandingCtx) => iaPymesCopy[ctx.lang];
const usd = (n: number) => '$' + n.toLocaleString('en-US');
const desdeOf = (ctx: LandingCtx) => (n: number) => `${ctx.lang === 'en' ? 'From' : 'Desde'} ${usd(n)}`;

/** "Desde $X" / "From $X" (o "al mes" / "a month") del ancla baja de cada producto. */
const anchorOf = (ctx: LandingCtx, id: string) => {
  const p = (ctx.lang === 'en' ? catalogEn : catalog).find((x) => x.id === id);
  if (!p) return undefined;
  const t = p.tiers.find((x) => x.anchor) ?? p.tiers[0];
  if (t.value === null) return undefined;
  const base = desdeOf(ctx)(t.value);
  return t.monthly ? `${base} ${ctx.lang === 'en' ? 'a month' : 'al mes'}` : base;
};

/** WhatsApp y teléfono del cierre: los de Houston, como el CtaBand de antes (city='houston'). */
const HOUSTON = nap.houston;

const spec: KindSpec = {
  kind: 'ia-pymes',
  tone: 'teal',
  // F05 (placa, P12): pistas teal con pulsos que nacen de la esclusa del hero (texto a la izquierda).
  fondo: 'F05',
  fondoOpciones: () => ({ texto: 'izquierda' }),
  Hero: HeroIaPymes,
  hero: (ctx) => {
    const t = copyOf(ctx);
    return {
      h1Html: ctx.cluster.hero.h1,
      eyebrow: t.eyebrow,
      lead: t.lead,
      primary: { label: t.primary, href: '#contacto', track: 'proposal_requested' },
      link: { label: t.link, href: '#como-decide' },
      lang: ctx.lang,
    };
  },
  sections: [
    // 1 · Tríada a dos tonos (W-ADV-08), sin caja ni icono.
    { component: TriadaManifiesto, props: (ctx) => ({ items: copyOf(ctx).triada }) },

    // 3 · 01 Cómo decide: dilema de dos caminos (destino de "Ver cómo decide").
    { component: ComoDecide, id: 'como-decide', props: (ctx) => ({ copy: copyOf(ctx).dilema, n: 1, lang: ctx.lang }) },

    // 4 · 02 La IA ya decide por tus clientes: local.paragraphs VERBATIM + respuesta en 3 columnas.
    {
      component: LaIaDecide,
      props: (ctx) => ({ copy: copyOf(ctx).decide, n: 2, paragraphs: ctx.cluster.local.paragraphs, lang: ctx.lang }),
    },

    // 03 Así está montada (ChipIA landing + PildorasMarcas, filas honestas de G01; v2 §3 G06).
    // Ancla #proceso: la de producción para "cómo funciona", perdida desde la v1 (revisión G06 r1).
    { component: AsiMontada, id: 'proceso', props: (ctx) => ({ copy: copyOf(ctx).montada, n: 3, lang: ctx.lang }) },

    // 04 Dónde trabaja: ConstelacionMarcas (W-ADV-21) con Marcy en el centro, viva.
    { component: ConstelacionCanales, props: (ctx) => ({ copy: copyOf(ctx).canales, n: 4, lang: ctx.lang }) },

    // 05 Tus datos, a salvo (DatosASalvo de 2-ia-chat).
    { component: DatosASalvo, props: (ctx) => ({ copy: copyOf(ctx).datos, n: 5, lang: ctx.lang }) },

    // 7 · Caso real (Rosy Nails & Care). Conserva el id #proyectos de antes.
    {
      component: CasoIa,
      id: 'proyectos',
      props: (ctx) => ({ copy: copyOf(ctx).caso, n: 6, items: ctx.cluster.proof.items, lang: ctx.lang }),
    },

    // 8 · Precio (#precios): "Desde $500" + "Asistente completo desde $900" (R6); degradado.
    {
      component: PrecioIa,
      id: 'precios',
      props: (ctx) => ({ copy: copyOf(ctx).precio, features: ctx.cluster.pricing.features, lang: ctx.lang }),
    },

    // 9 · En pocas palabras (answer + source VERBATIM), justo antes de la FAQ (R1).
    {
      component: FranjaEnPocasPalabras,
      props: (ctx) => {
        const t = copyOf(ctx).franja;
        const d = desdeOf(ctx);
        return {
          q: ctx.cluster.answer.q,
          a: ctx.cluster.answer.a,
          source: ctx.cluster.answer.source,
          lang: ctx.lang,
          cols: [
            { title: t.queEs, text: ctx.cluster.service.description, link: { label: t.verQue, href: '#precios' } },
            { title: t.desde, text: t.desdeText(d(PRICE_ANCHORS.iaBasic), d(PRICE_ANCHORS.ia)), link: { label: t.verPrecios, href: t.preciosHref } },
            { title: t.tiempo, text: t.tiempoText, link: { label: t.pedir, href: '#contacto' } },
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

    // 10 · Cierre: trío contractual (Houston, como antes) + "Pregúntale a Marcy" (mrc:ask, texto fijo).
    {
      component: CierreDosTarjetas,
      props: (ctx) => {
        const t = copyOf(ctx).cierre;
        return {
          // Un solo acento en el cierre (E-14): el amanecer y el botón son oro, así que el
          // titular va sin su <em> teal (el texto no cambia).
          titleHtml: ctx.cluster.cta.title.replace(/<\/?em>/g, ''),
          proof: t.proof,
          city: 'houston',
          tel: 'tel:' + HOUSTON.replace(/[^\d+]/g, ''),
          wa: 'https://wa.me/' + HOUSTON.replace(/\D/g, ''),
          lang: ctx.lang,
          warm: { kind: 'marcy', title: t.warmTitle, text: t.warmText, cta: t.warmCta, ask: t.ask },
        };
      },
    },

    // 11 · Hermanas (hrefs = los del megamenú de esa página, R5) + recursos (calculadora con
    // tool_cta_clicked, diagnóstico, precios).
    {
      component: TarjetasHermanas,
      props: (ctx) => {
        const t = copyOf(ctx).hermanas;
        return {
          titleHtml: t.title,
          lead: t.lead,
          currentId: 'ia-conversacional',
          lang: ctx.lang,
          items: serviciosPara(ctx.lang, ctx.cluster.path).map((s) => ({
            id: s.id, label: s.name, desc: s.promise, href: s.href, price: anchorOf(ctx, s.id),
          })),
          recursos: [
            { icon: 'lucide:calculator', title: t.calc.title, text: t.calc.text, href: t.calc.href, track: 'tool_cta_clicked' },
            { icon: 'lucide:scan-search', title: t.diag.title, text: t.diag.text, href: t.diag.href, track: 'tool_cta_clicked' },
            { icon: 'lucide:tag', title: t.precios.title, text: t.precios.text, href: t.precios.href },
          ],
        };
      },
    },
  ],
};

export default spec;
