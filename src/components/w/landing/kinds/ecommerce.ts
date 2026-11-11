// ─────────────────────────────────────────────────────────────
// Tipo `ecommerce` · landings de tienda en línea por ciudad (design/rediseno-workos.md
// §4.15, ola 2). Su existencia activa el tipo (registry.ts); las páginas
// /es/houston/ecommerce y /es/miami/ecommerce lo importan y montan WLanding.
//
// v2 (design/rediseno-workos-v2.md G04; v3: fondo de la v1, sin F02): hero con PedidosHoy (productos ilustrados y raíl
// de estados), 01 con PasoTienda + "¿Y a ti cómo te llega?" (navegador con satélites, W-CORE-30),
// 02 con casillas de logos de P06, contraste con RegistroVivo VIVO y bento con objetos nuevos.
// Contraste: "El día de tu tienda" (.w-contrast). Degradado: la cifra del precio.
// Orden (R1): hero → tríada → 01 del carrito al pago (#proceso) → 02 todo conectado →
// contraste → 03 qué incluye → prosa local → precio (#precios) → 04 trabajo real
// (#proyectos) → franja "En pocas palabras" → FAQ → hermanas → cierre (Contact lo pone
// WLanding). Desviación medida del plan: los proyectos van tras el precio con cabecera
// numerada propia (en §4.15 eran el punto 9, sin número), porque sin caso de tienda la
// honestidad necesita su titular.
// ─────────────────────────────────────────────────────────────
import HeroEcommerce from '../../heroes/HeroEcommerce.astro';
import TriadaManifiesto from '../../TriadaManifiesto.astro';
import ProsaLocal from '../../ProsaLocal.astro';
import FranjaEnPocasPalabras from '../../FranjaEnPocasPalabras.astro';
import PreguntasFrecuentes from '../../PreguntasFrecuentes.astro';
import TarjetasHermanas from '../../TarjetasHermanas.astro';
import CierreDosTarjetas from '../../CierreDosTarjetas.astro';
import DelCarritoAlPago from '../../sections/ecommerce/DelCarritoAlPago.astro';
import TodoConectado from '../../sections/ecommerce/TodoConectado.astro';
import DiaTienda from '../../sections/ecommerce/DiaTienda.astro';
import QueIncluye from '../../sections/ecommerce/QueIncluye.astro';
import Precio from '../../sections/ecommerce/Precio.astro';
import Proyectos from '../../sections/ecommerce/Proyectos.astro';
import { shopCopy, type ShopCity } from '../../../../i18n/w/ecommerce';
import { nap } from '../../../../i18n/content';
import { catalog, PRICE_ANCHORS } from '../../../../i18n/pricing';
import { serviciosPara } from '../../../../i18n/w/nav';
import type { KindSpec, LandingCtx } from '../types';

const cityOf = (ctx: LandingCtx): ShopCity => (ctx.city === 'miami' ? 'miami' : 'houston');
const copyOf = (ctx: LandingCtx) => shopCopy[cityOf(ctx)];
const usd = (n: number) => '$' + n.toLocaleString('en-US');
const desde = (n: number) => `Desde ${usd(n)}`;
const numOf = (ctx: LandingCtx) => (cityOf(ctx) === 'miami' ? nap.miami : nap.houston);
const waOf = (ctx: LandingCtx) => 'https://wa.me/' + numOf(ctx).replace(/\D/g, '');

/** "Desde $X" (o "al mes") del ancla baja de cada producto, desde pricing.ts. */
const anchorOf = (id: string) => {
  const p = catalog.find((x) => x.id === id);
  if (!p) return undefined;
  const t = p.tiers.find((x) => x.anchor) ?? p.tiers[0];
  if (t.value === null) return undefined;
  return t.monthly ? `Desde ${usd(t.value)} al mes` : desde(t.value);
};

const spec: KindSpec = {
  kind: 'ecommerce',
  tone: 'gold',
  // v3 (E-57): sin fondo temático. El hero vuelve al espacio de la v1 (SpaceBackdrop) con el campo de
  // puntos oro detrás de la tarjeta; los haces de F02 se van. F02 se conserva, sin montar.
  Hero: HeroEcommerce,
  hero: (ctx) => {
    const t = copyOf(ctx);
    return {
      h1Html: ctx.cluster.hero.h1,
      chip: t.chip,
      eyebrow: t.eyebrow,
      lead: t.lead,
      primary: { label: t.primary, href: '#contacto', track: 'proposal_requested' },
      // "Ver precios ›" apunta hoy a /es/precios (hero.secondary): se mantiene (§4.15).
      link: { label: t.link, href: ctx.cluster.hero.secondary?.href ?? '/es/precios' },
      lang: ctx.lang,
    };
  },
  sections: [
    // 1 · Tríada a dos tonos (W-ADV-08), sin caja ni icono.
    { component: TriadaManifiesto, props: (ctx) => ({ items: copyOf(ctx).triada }) },

    // 3 · 01 Del carrito al pago: tres pasos en bandeja (W-ADV-37). Conserva #proceso.
    {
      component: DelCarritoAlPago,
      id: 'proceso',
      props: (ctx) => ({ copy: copyOf(ctx).pasos, tax: copyOf(ctx).tax, n: 1, city: cityOf(ctx), lang: ctx.lang }),
    },

    // 4 · 02 Todo conectado: pestañas Pagos / Envíos / Mensajería (W-ADV-38).
    {
      component: TodoConectado,
      reveal: false,
      props: (ctx) => ({ copy: copyOf(ctx).conectado, n: 2, lang: ctx.lang, uid: 'tc-' + cityOf(ctx) }),
    },

    // 5 · Capítulo de contraste: "El día de tu tienda" (RegistroVivo estático).
    {
      component: DiaTienda,
      contrast: 'contrast',
      props: (ctx) => ({ copy: copyOf(ctx).dia, lang: ctx.lang }),
    },

    // 6 · 03 Qué incluye: bento 2×2 con un objeto por celda.
    {
      component: QueIncluye,
      props: (ctx) => ({ copy: copyOf(ctx).incluye, tax: copyOf(ctx).tax, n: 3, city: cityOf(ctx), lang: ctx.lang }),
    },

    // 7 · Por qué en la ciudad: local.paragraphs VERBATIM (contrato de paridad), sin rejilla.
    {
      component: ProsaLocal,
      props: (ctx) => ({
        titleTone1: copyOf(ctx).prosa.tone1,
        titleTone2: copyOf(ctx).prosa.tone2,
        paragraphs: ctx.cluster.local.paragraphs,
      }),
    },

    // 8 · Precio con puntos (#precios).
    {
      component: Precio,
      id: 'precios',
      props: (ctx) => ({ copy: copyOf(ctx).precio, city: cityOf(ctx) }),
    },

    // 9 · 04 Trabajo real (#proyectos): webs y apps reales, sin llamarlas tienda.
    {
      component: Proyectos,
      id: 'proyectos',
      props: (ctx) => ({ copy: copyOf(ctx).proyectos, n: 4, items: ctx.cluster.proof.items, wa: waOf(ctx), lang: ctx.lang }),
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
              title: t.desdeTitle,
              text: `${desde(PRICE_ANCHORS.ecommerceEssential)} una tienda esencial; ${desde(PRICE_ANCHORS.ecommerce).toLowerCase()} una tienda a medida.`,
              link: { label: t.verPrecios, href: '/es/precios' },
            },
            { title: t.tiempoTitle, text: t.tiempo, link: { label: t.pedir, href: '#contacto' } },
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
          currentId: 'ecommerce',
          lang: ctx.lang,
          items: serviciosPara('es', ctx.cluster.path).map((s) => ({
            id: s.id, label: s.name, desc: s.promise, href: s.href, price: anchorOf(s.id),
          })),
          recursos: [
            { icon: 'lucide:scan-search', title: t.diag.title, text: t.diag.text, href: '/es/diagnostico', track: 'tool_cta_clicked' },
            { icon: 'lucide:tag', title: t.precios.title, text: t.precios.text, href: '/es/precios' },
            { icon: 'lucide:book-open', title: t.guia.title, text: t.guia.text, href: '/es/blog/precio-pagina-web-houston-guia' },
          ],
        };
      },
    },

    // 12 · Cierre en dos tarjetas con el trío contractual (teléfono de la ciudad).
    {
      component: CierreDosTarjetas,
      props: (ctx) => {
        const city = cityOf(ctx);
        const t = copyOf(ctx).cierre;
        const num = numOf(ctx);
        return {
          titleHtml: ctx.cluster.cta.title,
          proof: t.proof,
          city,
          tel: 'tel:' + num.replace(/[^\d+]/g, ''),
          wa: waOf(ctx),
          lang: ctx.lang,
          warm: { kind: 'diagnostico', title: t.warmTitle, text: t.warmText, cta: t.warmCta, href: '/es/diagnostico' },
        };
      },
    },
  ],
};

export default spec;
