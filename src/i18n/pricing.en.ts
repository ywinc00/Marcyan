// ─────────────────────────────────────────────────────────────
// PRODUCT CATALOG · EN MIRROR of `pricing.ts` (single source of prices).
// Same 7 products, each with TIERS (low anchor -> complete), in English.
// Used by: PriceGrid (/en/pricing), /en/services (detailed catalog),
// the OfferCatalog JSON-LD (schema) and the home (offerItems).
//
// ⚠️ NUMBERS ARE FROZEN. This file NEVER hardcodes a price: every value
//   comes from PRICE_ANCHORS imported from './pricing' (the single source of
//   truth, mirrored in `lib/chat-kb.mjs` and guarded by `npm run check:kb`).
//   Only the DISPLAY strings differ here (English: "$1,500", "$600/mo",
//   "Free" — never "/mes"/"Gratis").
//
// Types are REUSED from './pricing' and '../lib/schema' (not redefined).
// Copy translated to English. Hrefs use the EN slug route map.
//
// Honesty (hard rule): nothing false, no "#1" promise, no invented reviews.
// Positioning: bilingual studio (never "hispanic-label-in-EN").
// AI doctrine: AI works for the CLIENT's business (never "we use AI").
// ─────────────────────────────────────────────────────────────

import { PRICE_ANCHORS } from './pricing';
import type { CatalogProduct, CatalogTier, PriceService } from './pricing';
import type { OfferItem, FaqItem, CrumbItem } from '../lib/schema';

/** "$1,500" from 1500. */
const usd = (n: number): string => '$' + n.toLocaleString('en-US');

// Per-tier display helper (English): "$400", "$600/mo", "Free".
const tierDisplay = (value: number | null, monthly?: boolean): string =>
  value === null ? 'Free' : monthly ? `${usd(value)}/mo` : usd(value);

// ── The catalog (7 products · low anchor -> complete) ──────────
export const catalog: CatalogProduct[] = [
  {
    id: 'diseno-web',
    icon: 'lucide:layout-template',
    name: 'Web Design',
    serviceType: 'Web design',
    description:
      'Custom, fast, bilingual websites (English and Spanish) with baseline SEO, easy for AI assistants to read. From a one-page landing page to a complete site.',
    tagline: 'Custom, fast, bilingual sites, ready for Google and AI.',
    anchorUnit: 'project',
    href: '/en/houston/web-design',
    ctaLabel: 'See web design',
    tone: 'gold',
    tiers: [
      { key: 'webLanding', name: 'Landing Page', value: PRICE_ANCHORS.webLanding, display: tierDisplay(PRICE_ANCHORS.webLanding), anchor: true,
        blurb: 'A single page focused on converting: ideal for a promotion, one service or validating your business.', href: '/en/houston/web-design' },
      { key: 'webRedesign', name: 'Site redesign', value: PRICE_ANCHORS.webRedesign, display: tierDisplay(PRICE_ANCHORS.webRedesign),
        blurb: 'We refresh your current site (design, speed and copy) without starting from scratch.', href: '/en/houston/web-design' },
      { key: 'web', name: 'Complete custom site', value: PRICE_ANCHORS.web, display: tierDisplay(PRICE_ANCHORS.web),
        blurb: 'A multi-page custom, bilingual site with baseline SEO, ready for AI.', href: '/en/houston/web-design' },
    ],
  },
  {
    id: 'ia-conversacional',
    icon: 'lucide:messages-square',
    name: 'Conversational AI',
    serviceType: 'AI automation and conversational assistants',
    description:
      'AI assistants that serve YOUR customers: they reply, book appointments and capture leads 24/7, set up in English and Spanish and integrated with your tools.',
    tagline: 'Assistants that reply, book and capture leads 24/7, in English and Spanish.',
    anchorUnit: 'project',
    href: '/en/ai-for-small-business',
    ctaLabel: 'See AI for your business',
    tone: 'teal',
    tiers: [
      { key: 'iaBasic', name: 'Basic assistant', value: PRICE_ANCHORS.iaBasic, display: tierDisplay(PRICE_ANCHORS.iaBasic), anchor: true,
        blurb: 'An assistant with one main flow (reply and capture leads), set up in Spanish.', href: '/en/ai-for-small-business' },
      { key: 'ia', name: 'Complete assistant', value: PRICE_ANCHORS.ia, display: tierDisplay(PRICE_ANCHORS.ia),
        blurb: 'Done-for-you: we install it, train it on your business, integrate it and maintain it.', href: '/en/ai-for-small-business' },
    ],
  },
  {
    id: 'seo-ia',
    icon: 'marcyan-ai',
    name: 'AI SEO (AI Visibility)',
    serviceType: 'Answer engine optimization (AEO)',
    description:
      'Get ChatGPT, Gemini and Meta AI to recommend YOU when someone asks about your service. Different from Conversational AI (which serves your customers): here the goal is for AI to find and cite you.',
    tagline: 'Get AI to recommend you when people ask about your service.',
    anchorUnit: 'diagnosis',
    href: '/en/houston/ai-seo',
    ctaLabel: 'Get a free diagnosis',
    tone: 'teal',
    tiers: [
      { key: 'aeoDiagnostic', name: 'AI Visibility Diagnosis', value: null, display: tierDisplay(null), anchor: true,
        blurb: 'We check whether ChatGPT, Gemini and Meta AI can find and recommend you. No cost, no commitment.', href: '/en/houston/ai-seo' },
      { key: 'aeoFoundations', name: 'AEO Foundations', value: PRICE_ANCHORS.aeoFoundations, display: tierDisplay(PRICE_ANCHORS.aeoFoundations),
        blurb: 'We get you ready for AI: Bing Places, schema, FAQ and llms.txt so assistants can read and cite you.', href: '/en/houston/ai-seo' },
      { key: 'aeoMonitoring', name: 'AI Monitoring', value: PRICE_ANCHORS.aeoMonitoring, monthly: true, display: tierDisplay(PRICE_ANCHORS.aeoMonitoring, true),
        blurb: 'Monthly tracking of how AI assistants see and mention you, with ongoing adjustments.', href: '/en/houston/ai-seo' },
    ],
  },
  {
    id: 'ecommerce',
    icon: 'lucide:shopping-bag',
    name: 'E-Commerce & Stores',
    serviceType: 'Online store design (e-commerce)',
    description:
      'Online stores optimized to sell: catalog, cart and secure payments, in a bilingual experience. From an essential store to a fully custom one.',
    tagline: 'Online stores optimized to sell, with catalog and payments.',
    anchorUnit: 'project',
    href: '/en/houston/ecommerce',
    ctaLabel: 'See online store',
    tone: 'gold',
    tiers: [
      { key: 'ecommerceEssential', name: 'Essential Store', value: PRICE_ANCHORS.ecommerceEssential, display: tierDisplay(PRICE_ANCHORS.ecommerceEssential), anchor: true,
        blurb: 'A simple catalog with cart and payments, to start selling online without the hassle.', href: '/en/houston/ecommerce' },
      { key: 'ecommerce', name: 'Custom store', value: PRICE_ANCHORS.ecommerce, display: tierDisplay(PRICE_ANCHORS.ecommerce),
        blurb: 'A complete custom store, optimized for conversion and bilingual.', href: '/en/houston/ecommerce' },
    ],
  },
  {
    id: 'seo-local',
    icon: 'lucide:search',
    name: 'Local SEO',
    serviceType: 'Local SEO',
    description:
      'Show up on Google Maps and in local search: Google Business Profile, NAP consistency, bilingual local content and review management. One-time or month to month.',
    tagline: 'Show up on Google Maps and in local search in your area.',
    anchorUnit: 'one-time',
    href: '/en/houston/local-seo',
    ctaLabel: 'See local SEO',
    tone: 'gold',
    tiers: [
      { key: 'seoInitial', name: 'Initial optimization', value: PRICE_ANCHORS.seoInitial, display: tierDisplay(PRICE_ANCHORS.seoInitial), anchor: true,
        blurb: 'A tune-up of your Google Business Profile and local presence. One-time payment, no lock-in.', href: '/en/houston/local-seo' },
      { key: 'seoLocal', name: 'Ongoing Local SEO', value: PRICE_ANCHORS.seoLocal, monthly: true, display: tierDisplay(PRICE_ANCHORS.seoLocal, true),
        blurb: 'Monthly work: profile, NAP, local content and reviews, month to month with no forced contracts.', href: '/en/houston/local-seo' },
    ],
  },
  {
    id: 'branding',
    icon: 'lucide:palette',
    name: 'Branding & Identity',
    serviceType: 'Brand design (branding)',
    description:
      'A custom visual identity: from just the logo to a complete brand system (palette, typography and usage guide).',
    tagline: 'Logo, colors and typography designed for your business.',
    anchorUnit: 'project',
    href: '/en/houston/branding',
    ctaLabel: 'See branding',
    tone: 'gold',
    tiers: [
      { key: 'brandingLogo', name: 'Logo Design', value: PRICE_ANCHORS.brandingLogo, display: tierDisplay(PRICE_ANCHORS.brandingLogo), anchor: true,
        blurb: 'Just the logo and its variants. The most affordable way to start your brand.', href: '/en/houston/branding' },
      { key: 'branding', name: 'Complete branding', value: PRICE_ANCHORS.branding, display: tierDisplay(PRICE_ANCHORS.branding),
        blurb: 'Logo, palette, typography and usage guide: a ready-to-use identity.', href: '/en/houston/branding' },
    ],
  },
  {
    id: 'mantenimiento',
    icon: 'lucide:wrench',
    name: 'Ongoing Maintenance',
    serviceType: 'Website maintenance',
    description:
      'Monthly site maintenance: uptime checks, security updates, regular backups and bilingual support.',
    tagline: 'Keep your site healthy: backups, security and bilingual support.',
    anchorUnit: '/mo',
    href: '#contacto',
    ctaLabel: 'Get maintenance',
    tone: 'gold',
    cardBullets: [
      'Uptime checks and security updates',
      'Regular backups',
      'Bilingual support, month to month',
    ],
    tiers: [
      { key: 'maintenance', name: 'Monthly maintenance', value: PRICE_ANCHORS.maintenance, monthly: true, display: tierDisplay(PRICE_ANCHORS.maintenance, true), anchor: true,
        blurb: 'Uptime checks, security, backups and bilingual support, month to month.', href: '#contacto' },
    ],
  },
];

// ── PriceService: /en/pricing card (leads with the low anchor) ──
// Kept for compatibility (PriceGrid). Derived from the catalog.
export const priceServices: PriceService[] = catalog.map((p) => {
  const anchor = p.tiers.find((t) => t.anchor) ?? p.tiers[0];
  return {
    id: p.id,
    icon: p.icon,
    name: p.name,
    serviceType: p.serviceType,
    description: p.description,
    priceValue: anchor.value === null ? '0' : String(anchor.value),
    monthly: anchor.monthly,
    free: anchor.value === null,
    displayPrice: anchor.value === null ? 'Free' : usd(anchor.value),
    displayUnit: p.anchorUnit,
    tagline: p.tagline,
    includes: p.cardBullets ?? p.tiers.map((t) => `${t.name} — ${t.display}`),
    href: p.href,
    ctaLabel: p.ctaLabel,
    tone: p.tone,
  };
});

// ── Mapping to OfferItem (schema) — ALL tiers (AEO ammunition). ──
// The free diagnosis is emitted as Offer price "0" (an AEO "free" signal).
// url without fragment (#) and only if it is a real /en/ page, or the pricing hub.
export const offerItems: OfferItem[] = catalog.flatMap((p) =>
  p.tiers.map((t) => {
    const pageHref = (t.href || p.href).split('#')[0];
    return {
      name: `${p.name} — ${t.name}`,
      serviceType: p.serviceType,
      description: t.blurb,
      priceValue: t.value === null ? '0' : String(t.value),
      monthly: t.monthly,
      url: pageHref.startsWith('/en/') ? pageHref : '/en/pricing',
    };
  }),
);

// ── Copy for the /en/pricing page ─────────────────────────────
export const preciosPage = {
  meta: {
    title: 'Pricing — Web design, AI and SEO in Houston and Miami | Marcyan',
    description:
      'Public, clear pricing: web design from $400, AI from $500, local SEO from $300 and a free AI visibility diagnosis. No fine print, no hidden costs.',
  },
  path: '/en/pricing',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Pricing', path: '/en/pricing' },
  ] as CrumbItem[],
  hero: {
    kicker: 'Public pricing',
    h1: '<em>Clear</em> pricing, no fine print',
    sub: 'We publish it all: from a $400 landing page to monthly SEO and maintenance, the very things most agencies hide until they get you on a call. That is how transparent we are.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See what each service includes', href: '#precios' },
    chips: ['From $400 · free AI diagnosis', 'No forced contracts', 'Free proposal in 24h'],
    tone: 'gold' as const,
  },
  answer: {
    q: 'How much does it cost to work with Marcyan?',
    a: 'It depends on the service, which is exactly why we publish it all: a website starts from $400 (a complete custom site from $1,500), an AI assistant from $500, local SEO from $300 and a logo from $150. Even the recurring pricing (monthly SEO and maintenance) is published, and the AI visibility diagnosis is free. Every project gets a clear scope and price in writing, with no commitment.',
  },
  transparency: {
    tag: 'Why we publish it',
    title: 'Most agencies hide the <em>recurring</em> price',
    paragraphs: [
      'In this market it is normal to get an attractive starting price while the costs that really add up over time stay hidden: the monthly SEO fee, maintenance, renewals. You only find out once you are locked in.',
      'We do the opposite. <strong>We publish all our starting rates</strong>, recurring ones included, so you can decide with the full picture. Every service starts with an affordable option and grows with what you need. The final price depends on the real scope of your project and we always put it in writing before you decide. No surprises.',
    ],
    tone: 'gold' as const,
  },
  grid: {
    tag: 'Our pricing',
    title: 'What it costs and what it <em>includes</em>',
    intro: 'Every price is a real starting point, "from $". We show the most affordable option for each service first; we define the final scope together in a free, honest proposal.',
  },
  related: {
    tag: 'Pricing guides',
    title: 'Concrete answers',
    links: [
      {
        label: 'How much does a website cost in Houston?',
        href: '/en/pricing/website-cost-houston',
        desc: 'The real price of a site, with what it includes and what it depends on.',
        icon: 'lucide:layout-template',
      },
      {
        label: 'How much does a chatbot cost?',
        href: '/en/pricing/chatbot-cost',
        desc: 'What an AI assistant includes and why it is not just a subscription.',
        icon: 'lucide:messages-square',
      },
      {
        label: 'How much does local SEO cost in Houston?',
        href: '/en/pricing/local-seo-cost-houston',
        desc: 'The published monthly rate, with no long forced contracts.',
        icon: 'lucide:search',
      },
    ],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'On pricing, <em>no runaround</em>',
    items: [
      {
        q: 'Why do you show prices when almost no one does?',
        a: 'Because hiding the price usually means hiding something. Publishing our starting rates, monthly SEO and maintenance included, lets you compare at your own pace and walk into the conversation with confidence instead of a sales pitch. It is the way we would want to be treated ourselves.',
      },
      {
        q: 'Is the lowest price the same service as the complete one?',
        a: 'No: it is a smaller, real product. A one-page landing, a redesign or just the logo cost less because they are less work than a full site or a whole brand, not because they are a stripped-down, low-quality version. You start where it makes sense for your business and grow when you need to.',
      },
      {
        q: 'Is the AI visibility diagnosis really free?',
        a: 'Yes, no cost and no commitment. We check whether ChatGPT, Gemini and Meta AI can find and recommend you, and we tell you honestly where you stand. If you then want us to work on the foundations or monitoring, those do have a published price; the diagnosis does not.',
      },
      {
        q: 'Are there forced contracts or lock-in?',
        a: 'No. Recurring services like local SEO and maintenance are month to month; you can pause or cancel with reasonable notice. We do not believe in tying clients down with long contracts: we would rather you stay for the results, not because of a clause.',
      },
      {
        q: 'Can the "from $" price go up a lot?',
        a: 'The "from $" is the real starting point for that product. It goes up if you ask for more pages, more features (store, bookings, integrations) or more languages. We never change it on you mid-project: the scope and agreed total are in writing before you decide.',
      },
      {
        q: 'Does the proposal cost anything?',
        a: 'No. Tell us about your project and in under 24 hours you get a personalized proposal with scope and price, no cost and no commitment. If you decide not to move forward, no problem.',
      },
    ] as FaqItem[],
  },
  cta: {
    title: 'Get your <em>exact</em> price, free',
    sub: 'Tell us about your project and get a proposal with clear scope and price in under 24 hours, no commitment.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold' as const,
  },
};
