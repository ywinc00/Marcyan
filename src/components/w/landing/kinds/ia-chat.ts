// ─────────────────────────────────────────────────────────────
// Tipo `ia-chat` · IA conversacional por ciudad (design/rediseno-workos.md §4.12, ola 2).
// Su existencia activa el tipo (registry.ts); /es/houston/ia-conversacional y
// /es/miami/ia-conversacional lo importan y montan WLanding.
//
// Contraste: "Tú le explicas, Marcy lo cumple" (.w-contrast). Firma: las pestañas de Marcy
// del hero (el avatar está quieto). Degradado: la cifra del precio.
// Orden (§4.12): hero → 01 sin/con → 02 cómo trabaja → 03 contraste → 04 lo que pasó hoy →
// 05 a dónde te avisa → prosa local → 06 tus datos → precio → caso → franja → FAQ →
// cierre → hermanas (Contact lo pone WLanding). Process desaparece (su ancla no la usaba
// nadie: el secundario del hero ya iba a #faq).
// ─────────────────────────────────────────────────────────────
import HeroIaChat from '../../heroes/HeroIaChat.astro';
import ProsaLocal from '../../ProsaLocal.astro';
import FranjaEnPocasPalabras from '../../FranjaEnPocasPalabras.astro';
import PreguntasFrecuentes from '../../PreguntasFrecuentes.astro';
import TarjetasHermanas from '../../TarjetasHermanas.astro';
import CierreDosTarjetas from '../../CierreDosTarjetas.astro';
import SinMarcy from '../../sections/ia/SinMarcy.astro';
import ComoTrabaja from '../../sections/ia/ComoTrabaja.astro';
import ReglasNaturales from '../../sections/ia/ReglasNaturales.astro';
import LoQuePasoHoy from '../../sections/ia/LoQuePasoHoy.astro';
import AvisoBifurca from '../../sections/ia/AvisoBifurca.astro';
import DatosASalvo from '../../sections/ia/DatosASalvo.astro';
import PrecioIa from '../../sections/ia/PrecioIa.astro';
import CasoIa from '../../sections/ia/CasoIa.astro';
import { iaChatCopy, type IaCity } from '../../../../i18n/w/ia-chat';
import { nap } from '../../../../i18n/content';
import { catalog, PRICE_ANCHORS } from '../../../../i18n/pricing';
import { serviciosPara } from '../../../../i18n/w/nav';
import type { KindSpec, LandingCtx } from '../types';

const cityOf = (ctx: LandingCtx): IaCity => (ctx.city === 'miami' ? 'miami' : 'houston');
const copyOf = (ctx: LandingCtx) => iaChatCopy[cityOf(ctx)];
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

const spec: KindSpec = {
  kind: 'ia-chat',
  tone: 'teal',
  Hero: HeroIaChat,
  hero: (ctx) => {
    const t = copyOf(ctx);
    return {
      h1Html: ctx.cluster.hero.h1,
      chip: t.chip,
      eyebrow: t.eyebrow,
      lead: t.lead,
      primary: { label: t.primary, href: '#contacto', track: 'proposal_requested' },
      link: { label: t.link, href: '#faq' },
      tabs: t.tabs,
      sr: t.heroSr,
      avatarAlt: t.avatarAlt,
      lang: ctx.lang,
    };
  },
  sections: [
    // 2 · 01 Sin Marcy / con Marcy (W-CORE-25).
    { component: SinMarcy, props: (ctx) => ({ copy: copyOf(ctx).sinCon, n: 1, lang: ctx.lang }) },

    // 3 · 02 Cómo trabaja (W-ADV-05 + W-ADV-06).
    { component: ComoTrabaja, id: 'proceso', props: (ctx) => ({ copy: copyOf(ctx).pasos, n: 2, lang: ctx.lang }) },

    // 4 · Capítulo de contraste: 03 Tú le explicas, Marcy lo cumple (W-ADV-07).
    {
      component: ReglasNaturales,
      contrast: 'contrast',
      props: (ctx) => ({ copy: copyOf(ctx).reglas, n: 3, lang: ctx.lang }),
    },

    // 5 · 04 Lo que pasó hoy (W-ADV-44 static + W-ADV-23).
    { component: LoQuePasoHoy, props: (ctx) => ({ copy: copyOf(ctx).hoy, n: 4, lang: ctx.lang }) },

    // 6 · 05 A dónde te avisa (W-HOME-14).
    { component: AvisoBifurca, props: (ctx) => ({ copy: copyOf(ctx).aviso, n: 5, lang: ctx.lang }) },

    // 7 · Por qué en la ciudad: local.paragraphs VERBATIM (contrato de paridad).
    {
      component: ProsaLocal,
      props: (ctx) => ({
        titleTone1: copyOf(ctx).prosa.tone1,
        titleTone2: copyOf(ctx).prosa.tone2,
        paragraphs: ctx.cluster.local.paragraphs,
      }),
    },

    // 8 · 06 Tus datos, a salvo (W-PROOF-25 sin sellos).
    { component: DatosASalvo, props: (ctx) => ({ copy: copyOf(ctx).datos, n: 6, lang: ctx.lang }) },

    // 9 · Precio con puntos (#precios): "Desde $500" + "Asistente completo desde $900" (R6).
    {
      component: PrecioIa,
      id: 'precios',
      props: (ctx) => ({ copy: copyOf(ctx).precio, features: ctx.cluster.pricing.features, lang: ctx.lang }),
    },

    // 10 · Caso real (Rosy Nails & Care, web app de reservas).
    {
      component: CasoIa,
      id: 'proyectos',
      props: (ctx) => ({
        copy: copyOf(ctx).caso, n: 7, items: ctx.cluster.proof.items,
        // Miami: sin el enlace al servicio de Houston del proyecto (insinuaría un caso en Miami).
        link: cityOf(ctx) !== 'miami', lang: ctx.lang,
      }),
    },

    // 11 · En pocas palabras (answer VERBATIM), justo antes de la FAQ (R1).
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
              title: t.desde,
              text: t.desdeText(desde(PRICE_ANCHORS.iaBasic), desde(PRICE_ANCHORS.ia)),
              link: { label: t.verPrecios, href: '/es/precios' },
            },
            { title: t.tiempo, text: t.tiempoText, link: { label: t.pedir, href: '#contacto' } },
          ],
        };
      },
    },

    // 11 · Preguntas frecuentes (#faq), VERBATIM, todas cerradas; emite FAQPage.
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

    // 12 · Cierre en dos tarjetas con el trío contractual (teléfono de la ciudad); la
    // pequeña abre a Marcy con un texto FIJO (mrc:ask).
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
          warm: { kind: 'marcy', title: t.warmTitle, text: t.warmText, cta: t.warmCta, ask: t.ask },
        };
      },
    },

    // 13 · Hermanas de la misma ciudad (hrefs = los del megamenú de esa página, R5) +
    // recurso calculadora (sustituye al GrowthCta de antes; mismo enlace y evento).
    {
      component: TarjetasHermanas,
      props: (ctx) => {
        const t = copyOf(ctx).hermanas;
        const tool = ctx.cluster.tool;
        return {
          titleHtml: t.title,
          lead: t.lead,
          currentId: 'ia-conversacional',
          lang: ctx.lang,
          items: serviciosPara('es', ctx.cluster.path).map((s) => ({
            id: s.id, label: s.name, desc: s.promise, href: s.href, price: anchorOf(s.id),
          })),
          recursos: [
            ...(tool ? [{ icon: 'lucide:calculator', title: tool.linkLabel, text: tool.text, href: tool.href, track: 'tool_cta_clicked' }] : []),
            { icon: 'lucide:scan-search', title: t.diag.title, text: t.diag.text, href: '/es/diagnostico', track: 'tool_cta_clicked' },
            { icon: 'lucide:tag', title: t.precios.title, text: t.precios.text, href: '/es/precios' },
          ],
        };
      },
    },
  ],
};

export default spec;
