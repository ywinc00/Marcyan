// ─────────────────────────────────────────────────────────────
// Tipo `barrio` · landings de barrio (design/rediseno-workos.md §4.20, ola 2):
// /es/houston/katy, /es/houston/sugar-land, /es/miami/doral, /es/miami/hialeah.
// Su existencia activa el tipo (registry.ts); cada página lo importa y monta WLanding.
//
// Contraste: "Zonas que cubrimos" como panel de mapa (lista + mapa real, vuelta 3) (.w-contrast), con
// la ficha de mapa de ejemplo en claro al lado (revisión 1, I3: decisión del director).
// Firma: los pulsos del chip del hero (vías reales, TIGER/Line). Degradado: el titular
// del cierre (sin cola en el H1, R2; el precio va en TarjetaPrecio, sin cifra W-CORE-14).
// Orden (§4.20 y R1): hero → 01 servicios → 02 zonas (contraste) → prosa local →
// 03 inversión (#precios) → 04 trabajo real → franja "En pocas palabras" → FAQ → cierre
// (Contact lo pone WLanding).
// ─────────────────────────────────────────────────────────────
import HeroBarrio from '../../heroes/HeroBarrio.astro';
import ProsaLocal from '../../ProsaLocal.astro';
import FranjaEnPocasPalabras from '../../FranjaEnPocasPalabras.astro';
import PreguntasFrecuentes from '../../PreguntasFrecuentes.astro';
import CierreDosTarjetas from '../../CierreDosTarjetas.astro';
import QueRecibe from '../../sections/barrio/QueRecibe.astro';
import Ciclo from '../../sections/sector/Ciclo.astro';
import Zonas from '../../sections/barrio/Zonas.astro';
import Precio from '../../sections/barrio/Precio.astro';
import Caso from '../../sections/barrio/Caso.astro';
import { barrioCopy, barrioComun as T, barrioOf, zonasCiudad, type Barrio } from '../../../../i18n/w/barrio';
import { nap } from '../../../../i18n/content';
import { catalog } from '../../../../i18n/pricing';
import { serviciosPara } from '../../../../i18n/w/nav';
import type { IconoId } from '../../objects/registry';
import type { KindSpec, LandingCtx } from '../types';


const slugOf = (ctx: LandingCtx) => barrioOf(ctx.cluster.path);
const copyOf = (ctx: LandingCtx) => barrioCopy[slugOf(ctx)];
const usd = (n: number) => '$' + n.toLocaleString('en-US');
/** Titular del dato con <em> a dos tonos (W-ADV-32): lo de antes del <em> al 45 %, el resto al 100 %. */
const dosTonos = (html: string) => {
  const m = html.match(/^(.*?)<em>(.*?)<\/em>(.*)$/);
  return m ? `<span class="w-tone">${m[1].trim()}</span> ${m[2]}${m[3]}` : html;
};

/** Nivel de un producto de pricing.ts por su clave (nombre + precio + unidad). */
const tier = (productId: string, key: string) => {
  const p = catalog.find((x) => x.id === productId)!;
  const t = p.tiers.find((x) => x.key === key)!;
  return { label: t.name, value: t.value as number, monthly: !!t.monthly };
};
/** Lo que cubre la página de cada barrio (su `service` y su texto: web + SEO local; en
 *  Miami también la IA). Esas casillas enlazan a la página del barrio. */
const COVERS: Record<Barrio, IconoId[]> = {
  katy: ['diseno-web', 'seo-local'],
  'sugar-land': ['diseno-web', 'seo-local'],
  doral: ['diseno-web', 'seo-local', 'ia-conversacional'],
  hialeah: ['diseno-web', 'seo-local', 'ia-conversacional'],
};
/** Columnas de la matriz: los servicios con página por ciudad en las dos ciudades. */
const COLS: IconoId[] = ['diseno-web', 'seo-local', 'ia-conversacional', 'ecommerce'];

/** Proyectos de la sección de trabajo real: los más cercanos de proof.items, de dos en dos. */
const caseItems = (ctx: LandingCtx) => {
  const items = ctx.cluster.proof.items;
  const mja = items.find((p) => p.name === 'Move Junk Away');
  // Doral: el proyecto de Florida primero (rotulado con su ciudad real, Orlando).
  const ordered = mja ? [mja, ...items.filter((p) => p !== mja)] : items;
  // Cada tarjeta dice con verdad de qué ciudad es el proyecto (la de su `cat` real): en
  // una página de barrio, un caso sin ciudad se leería como local.
  return ordered.slice(0, 2).map((p) => {
    const city = p.cat.split('·')[1]?.trim();
    return city && p.result ? { ...p, result: `${city}. ${p.result}` } : p;
  });
};

const spec: KindSpec = {
  kind: 'barrio',
  tone: 'gold',
  // v2 (G05, §1.3/P12, §5-6): fondo F08. En el hero, trama de calles ABSTRACTA y declarada (el
  // mapa real del barrio ya lo dibuja ChipBarrio); en el capítulo de contraste, eco quieto con
  // las vías REALES del barrio (public/geo/<ciudad>-mapa.json).
  // v3 (dueño, E-57): el hero lleva SOLO la malla de rombos (F30), sin la trama de calles. Sin
  // eco en el capítulo de contraste: «Zonas que cubrimos» ya trae su mapa real del área.
  // v4 (dueño, 2026-11-06): la malla «no calzó»; el hero lleva el plano REAL de calles del barrio (F31).
  // v7: ningún barrio usa ya el plano de calles en la portada; cada uno pinta su propio fondo.
  fondo: () => undefined,
  Hero: HeroBarrio,
  hero: (ctx) => {
    const t = copyOf(ctx);
    return {
      h1Html: ctx.cluster.hero.h1,
      eyebrow: ctx.cluster.hero.badge ?? t.name,
      lead: t.lead,
      primary: { label: ctx.cluster.hero.primary.label, href: '#contacto', track: 'proposal_requested' },
      link: { label: t.link, href: '#precios' },
      name: t.name,
      producto: t.escena.producto,
      pildora: t.escena.pildora,
      chat: t.escena.chat,
      lados: t.escena.lados,
      chatSr: t.escena.chat ? `Ejemplo: un cliente de ${t.name} escribe por WhatsApp y Marcy le contesta en español al momento.` : undefined,
      lang: ctx.lang,
    };
  },
  sections: [
    // 2 · 01 Qué recibe tu negocio (v6): celdas con mini pantalla (W-CORE-08) en lugar de las 7
    // tarjetas de texto; debajo, la línea con todos los servicios de la ciudad (enlaces internos).
    {
      component: QueRecibe,
      props: (ctx) => {
        const t = copyOf(ctx);
        const svc = serviciosPara('es', ctx.cluster.path);
        const href = (id: string) => svc.find((s) => s.id === id)?.href ?? `/es/${t.city}`;
        return {
          n: 1,
          label: T.recibeLabel,
          titleHtml: T.recibeTitle(t.name),
          lead: T.recibeLead,
          name: t.name,
          cells: T.recibe(t.name).map((c) => ({ ...c, href: href(c.id) })),
          todos: svc.map((s) => ({ label: s.name, href: s.href })),
          tambien: T.tambien,
          lang: ctx.lang,
        };
      },
    },

    // 2b · 02 Cómo llega un cliente (v6): el ciclo en U de los sectores (W-PROOF-11) con la búsqueda del barrio.
    {
      component: Ciclo,
      props: (ctx) => {
        const t = copyOf(ctx);
        return {
          n: 2,
          copy: {
            label: T.cicloLabel, title: T.cicloTitle(t.name), lead: T.cicloLead,
            uTitle: T.cicloU.title, uSub: T.cicloU.sub, nodes: T.cicloNodes(t.ciclo.busca, t.ciclo.zona),
          },
        };
      },
    },

    // 3 · 02 Zonas que cubrimos: capítulo de contraste, fila del barrio fija.
    {
      component: Zonas,
      contrast: 'contrast',
      props: (ctx) => {
        const t = copyOf(ctx);
        const slug = slugOf(ctx);
        const svc = serviciosPara('es', ctx.cluster.path);
        const cols = COLS.map((id) => svc.find((s) => s.id === id)!);
        const zonas = zonasCiudad[t.city];
        // Zonas del mapa del hub con sus servicios: la página propia del barrio para lo que esa
        // página cubre (o #precios si es esta misma) y la del servicio en la ciudad para el resto.
        const zones = zonas.map((z) => {
          const own = z.page ? (Object.entries(barrioCopy).find(([, c]) => c.name === z.name)?.[0] as Barrio | undefined) : undefined;
          const here = z.page === ctx.cluster.path;
          return {
            name: z.name,
            kind: (here ? 'here' : own ? 'own' : 'zone') as 'here' | 'own' | 'zone',
            services: cols.map((c) => {
              const propia = !!(own && z.page && COVERS[own].includes(c.id));
              return {
                label: c.name,
                href: propia ? (here ? '#precios' : z.page!) : c.href,
                where: propia ? (here ? T.zonasTag.here : z.name) : t.cityName,
              };
            }),
          };
        });
        return {
          n: 3,
          label: T.zonasLabel,
          title: t.zonas.title,
          lead: t.zonas.lead,
          city: t.city,
          zones,
          listLabel: T.zonasLista(t.cityName, zonas.length),
          mapLabel: T.zonasMapa(t.name, t.cityName),
          tags: T.zonasTag,
          servicesLabel: T.zonasServicios,
          ficha: { city: t.name, caption: T.fichaCaption(t.name) },
          lang: ctx.lang,
        };
      },
    },

    // 4 · Por qué local: local.paragraphs VERBATIM (contrato de paridad).
    {
      component: ProsaLocal,
      props: (ctx) => {
        const t = copyOf(ctx);
        // v6: sin la rejilla de 4 tarjetas de texto (lo que incluye ya lo cuentan las celdas de 01) y
        // con el texto plegado tras dos párrafos (sigue en el HTML para Google).
        return {
          titleTone1: t.prosa.tone1,
          titleTone2: t.prosa.tone2,
          paragraphs: ctx.cluster.local.paragraphs,
          fold: { visible: 2, more: T.prosaMore },
        };
      },
    },

    // 5 · 03 Inversión (#precios): tarjeta de precio con niveles de pricing.ts.
    {
      component: Precio,
      id: 'precios',
      props: (ctx) => {
        const t = copyOf(ctx);
        const p = ctx.cluster.pricing;
        const tiers = [tier('diseno-web', 'web'), tier('seo-local', 'seoLocal'), tier('ia-conversacional', 'ia')].map((x) => ({
          label: x.label,
          price: usd(x.value),
          unit: x.monthly ? 'al mes' : 'proyecto',
        }));
        return {
          n: 4,
          label: T.precioLabel,
          title: dosTonos(p.title),
          card: {
            serviceId: 'diseno-web',
            name: T.precioName(t.name),
            desc: p.lead,
            tiers,
            includes: p.features,
            cta: { label: T.precioCta, href: '#contacto' },
            note: p.note ? { title: T.precioNoteTitle, text: p.note } : undefined,
            tiersLabel: T.tiersLabel,
            includesLabel: T.includesLabel,
            track: 'pricing_cta_clicked',
            tone: 'gold',
          },
        };
      },
    },

    // 6 · 04 Trabajo real: los proyectos más cercanos de proof.items.
    {
      component: Caso,
      // Conserva el ancla #proyectos de la landing de antes (la prueba vivía ahí).
      id: 'proyectos',
      props: (ctx) => ({
        n: 5,
        label: T.casoLabel,
        title: dosTonos(ctx.cluster.proof.title),
        lead: copyOf(ctx).caso.lead,
        items: caseItems(ctx),
        lang: ctx.lang,
      }),
    },

    // 7 · En pocas palabras (answer VERBATIM), justo antes de la FAQ (R1).
    {
      component: FranjaEnPocasPalabras,
      props: (ctx) => {
        const f = T.franja;
        const web = tier('diseno-web', 'web'), seo = tier('seo-local', 'seoLocal'), ia = tier('ia-conversacional', 'ia');
        return {
          q: ctx.cluster.answer.q,
          a: ctx.cluster.answer.a,
          source: ctx.cluster.answer.source,
          lang: ctx.lang,
          cols: [
            { title: f.queEs, text: ctx.cluster.service.description, link: { label: f.verQue, href: '#precios' } },
            {
              title: f.desdeTitle,
              text: f.desde(`Desde ${usd(web.value)}`, `desde ${usd(seo.value)} al mes`, `desde ${usd(ia.value)}`),
              link: { label: f.verPrecios, href: '/es/precios' },
            },
            { title: f.tiempoTitle, text: f.tiempo, link: { label: f.pedir, href: '#contacto' } },
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

    // 8 · Cierre en dos tarjetas con el trío contractual; titular en degradado (único).
    {
      component: CierreDosTarjetas,
      props: (ctx) => {
        const t = copyOf(ctx);
        const num = t.city === 'miami' ? nap.miami : nap.houston;
        return {
          titleHtml: ctx.cluster.cta.title,
          proof: t.cierre.proof,
          city: t.city,
          tel: 'tel:' + num.replace(/[^\d+]/g, ''),
          wa: 'https://wa.me/' + num.replace(/\D/g, ''),
          lang: ctx.lang,
          grad: true,
          warm: { kind: 'diagnostico', title: T.warm.warmTitle, text: T.warm.warmText, cta: T.warm.warmCta, href: '/es/diagnostico' },
        };
      },
    },
  ],
};

export default spec;
