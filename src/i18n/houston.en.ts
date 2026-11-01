// ─────────────────────────────────────────────────────────────
// CONTENT · Wave 2 — CITY HUB /en/houston (node of the geographic silo).
// EN mirror of houston.ts (bilingual-total). Same shape, English values.
// This is NOT a single-service landing: it presents Houston and links to the
// services x Houston. Differentiator (NOT a price war): web + AI/chatbot +
// public pricing, from a bilingual studio. Honesty: no "#1", no absolute
// superlatives. Positioning EN = bilingual studio (never the "hispanic-label-in-EN"
// label). Prices = same PRICE_ANCHORS as ES (identical numbers).
// ─────────────────────────────────────────────────────────────

import type { FaqItem, CrumbItem, ListLink } from '../lib/schema';
import type { RelatedLink } from './clusters';
import { PRICE_ANCHORS } from './pricing';
import { nap } from './content';

// Display formatting of the canonical figures. Figures ALWAYS come from
// PRICE_ANCHORS (single source, guarded by check:kb); here we only format them
// (pricing.ts does not export its usd() and touching it is vetoed).
const usd = (n: number): string => '$' + n.toLocaleString('en-US');

// Direct-dial href derived from the real NAP (single source in content.ts).
const telHref = 'tel:' + nap.houston.replace(/[^\d+]/g, '');

// Canonical price chain for the hero — consistent with the FAQ on this same
// page. NOTE: monthly local SEO = seoLocal ($600/mo); seoInitial ($300) is a
// one-time fee and is FORBIDDEN to show as a monthly rate.
const priceChain = `Web from ${usd(PRICE_ANCHORS.web)} · Landing from ${usd(PRICE_ANCHORS.webLanding)} · SEO from ${usd(PRICE_ANCHORS.seoLocal)}/mo`;

export const houstonHub = {
  meta: {
    title: 'Web Design in Houston | Bilingual studio: web, AI and SEO | Marcyan',
    description:
      'Bilingual web design studio in Houston: custom sites, conversational AI and local SEO. Real English and Spanish, public pricing. Free proposal in 24h.',
  },
  path: '/en/houston',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
  ] as CrumbItem[],
  // Hero "Arrival horizon" (CityHero): kicker merges badge+kicker, ONE single
  // CTA + micro-reassurance, telemetry rail with the data that decides a call
  // (tel/hours/pricing/coords) and the official skyline as the stage.
  hero: {
    kicker: 'Bilingual studio · Houston, TX',
    h1: 'Web design in <em>Houston</em>',
    sub: 'One bilingual studio for your website, your AI, and your SEO, with public pricing.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    microcopy: 'Reply in 1 business hour · No commitment',
    explore: { label: 'See services and pricing ↓', href: '#servicios' },
    telemetry: [
      { label: 'Direct line', value: nap.houston, href: telHref, live: true },
      { label: 'Hours', value: nap.hoursEn },
      { label: 'Public pricing', value: priceChain, href: '#servicios' },
      { label: 'Base', value: '29.7604° N, 95.3698° W' },
    ],
    // No skyline illustration: the stage stays a minimal horizon (ground line +
    // atmosphere + city seal). `src` optional to restore it.
    skyline: { caption: 'HOUSTON, TX — SPACE CITY' },
    tone: 'gold' as const,
  },
  answer: {
    q: 'Why choose a web design studio in Houston?',
    a: 'A local studio understands your market: 46% of Google searches have local intent and 76% of people who search "near me" visit a business within 24 hours. In Houston, a bilingual studio helps you show up on Google and in AI, and speak to your customers in their own language.',
    source: 'Google · BrightLocal, 2025',
  },
  // Services WITH PRICE: the price lives in its own `price` field (display,
  // figures from PRICE_ANCHORS) and the descs go on a diet — no "From $X" tail.
  // Order: the first 2 = the hub's featured cards (web + AI, the two pillars of
  // the "your web, your AI and your SEO" positioning); the rest, rows.
  services: {
    tag: 'Services in Houston',
    title: 'Everything your business needs, in <em>one studio</em>',
    links: [
      { label: 'Web design in Houston', desc: 'Custom, fast, bilingual sites, ready for Google and AI.', icon: 'lucide:layout-template', price: `from ${usd(PRICE_ANCHORS.web)}` },
      { label: 'Conversational AI in Houston', desc: 'Assistants that answer, book and capture leads 24/7, in English and Spanish.', icon: 'lucide:messages-square', price: `from ${usd(PRICE_ANCHORS.ia)}` },
      { label: 'Local SEO in Houston', desc: 'Show up on Google Maps and in AI.', icon: 'lucide:search', price: `from ${usd(PRICE_ANCHORS.seoLocal)}/mo` },
      { label: 'AI SEO in Houston', desc: 'So ChatGPT and Gemini recommend you.', icon: 'marcyan-ai', price: 'Free diagnostic' },
      { label: 'Online store in Houston', desc: 'E-commerce that sells, with payments and catalog.', icon: 'lucide:shopping-bag', price: `from ${usd(PRICE_ANCHORS.ecommerce)}` },
      { label: 'Branding and identity in Houston', desc: 'Logo, colors and typography with expert judgment.', icon: 'lucide:palette', price: `from ${usd(PRICE_ANCHORS.branding)}` },
    ] as Array<Omit<RelatedLink, 'href'> & { href?: string }>,
  },
  // Directory by industry: dense index — mono subs of 3-6 words derived from the
  // original honest descs (no repeated figures or new claims).
  industries: {
    tag: 'By industry',
    title: 'Solutions by sector',
    links: [
      { label: 'Restaurants', href: '/en/houston/restaurants', desc: 'QR menu and orders via WhatsApp', icon: 'lucide:utensils' },
      { label: 'Contractors', href: '/en/houston/contractors', desc: 'AI that rescues missed calls', icon: 'lucide:hard-hat' },
    ] as RelatedLink[],
  },
  // Houston Card (merge of local context + NAP rail): the paragraphs keep the
  // market claim ("fourth-largest city... Spanish-speaking population") and the
  // <strong> of "We are not a remote agency..." — the full local argument.
  local: {
    tag: 'Houston',
    title: 'We know the <em>Houston market</em>',
    paragraphs: [
      'Houston is the fourth-largest city in the United States and home to one of the largest Spanish-speaking populations in the country. It is a huge, competitive market, where showing up first on Google, on Maps and in AI assistants is the difference between a call and a lost customer.',
      'We work the entire metro area as a service-area business, in both English and Spanish. <strong>We are not a remote agency that "also covers" Houston:</strong> we design, write and optimize for how your customer actually searches here.',
    ],
    tone: 'gold' as const,
  },
  // NAP rail of the Card (dt/dd pattern with hairlines). Data already present on
  // the site (content.ts / Locations); nothing invented.
  ficha: {
    meta: [
      { ic: 'lucide:phone', label: 'Direct line', value: nap.houston, href: telHref },
      { ic: 'lucide:clock', label: 'Hours', value: nap.hoursEn },
      { ic: 'lucide:map-pinned', label: 'Coverage', value: 'Katy, Sugar Land, The Woodlands, Pearland' },
      { ic: 'lucide:languages', label: 'Languages', value: 'English · Spanish' },
      { ic: 'lucide:locate-fixed', label: 'Coordinates', value: '29.7604° N, 95.3698° W' },
    ],
    statePill: 'Texas, USA',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Pricing and more',
    links: [
      { label: 'Pricing and plans', href: '/en/pricing', desc: 'Every starting price, published', icon: 'lucide:tag' },
      { label: 'Web design in Miami', href: '/en/miami', desc: 'We also design in Miami', icon: 'lucide:layout-template' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'A Houston studio, <em>no runaround</em>',
    items: [
      { q: 'What services do you offer in Houston?', a: 'Custom web design and development, local SEO, conversational AI (assistants that respond 24/7), online stores, branding and maintenance. All bilingual in English and Spanish, built to reach the Spanish-speaking side of your Houston market. You can start with a single service or a coordinated package.' },
      { q: 'Do you have an office in Houston?', a: 'We work as a service-area business: we cover Houston and its entire metro area remotely and efficiently, without a public address. You do not need to visit an office. The whole process, from proposal to delivery, happens online and in your language.' },
      { q: 'Do you work in English and Spanish?', a: 'Yes. We are a bilingual studio. We design, write and optimize in real English and Spanish, because in Houston your customers search in both languages.' },
      { q: 'Do you serve only Houston or the metro area too?', a: 'We cover Houston and its entire metro area (Katy, Sugar Land, The Woodlands, Pearland and more). As a service-area business, we can serve you in the areas where you actually operate, with no need for a public address.' },
      { q: 'How much do your services cost in Houston?', a: 'We publish our starting prices: web design from $1,500, AI from $900, online store from $2,900 and local SEO from $600 a month. The final price depends on scope, and we always put it in writing before we start. You can see them all on our pricing page.' },
      { q: 'Why a local bilingual studio and not a big agency?', a: 'Because we build your site in real English and Spanish so you can capture the Spanish-speaking side of your market, with public pricing and no lock-in contracts. We bring together something few offer as a package: web design, conversational AI and SEO, all bilingual and under one team.' },
    ] as FaqItem[],
  },
  // Final CTA: verb unified with the hero ("Get my free proposal") and the
  // secondary is the PHONE (direct dial) — the leak to /formulario dies.
  cta: {
    title: 'Ready to grow in <em>Houston</em>?',
    sub: 'Tell us about your business and get a personalized proposal in under 24 hours, no commitment.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: `Call us: ${nap.houston}`, href: telHref },
    tone: 'gold' as const,
  },
  // Micro-reassurance (slim row between the CTA and the form). "Price in writing"
  // is verbatim from this page's FAQ; the reply window is the site-wide contact
  // commitment (same as the emails and the chat), not a claim specific to this
  // landing. It names BOTH windows on purpose: the cta.sub right above promises
  // the proposal in 24 hours, and without disambiguating they read as
  // contradictory numbers. Reply = contact · Proposal = deliverable.
  reassure: 'Reply in 1 business hour · Free proposal in 24h · Price in writing before we start',
  // ItemList (schema): the Houston pages that keep their own landing (the services
  // themselves now live on this hub, so they are not listed as separate URLs).
  itemList: [
    { name: 'Websites for Restaurants in Houston', path: '/en/houston/restaurants' },
    { name: 'Websites for Contractors in Houston', path: '/en/houston/contractors' },
  ] as ListLink[],
  // ── "The journey" redesign (2026-10-25) ── new page copy; the keys above stay untouched.
  // Hero H1 approved by the owner; title and meta belong to the SEO chat (brief 2026-10-24).
  journey: {
    h1: 'The studio that puts your business on the map in <em>Houston</em>',
    lead: 'Web, SEO and AI from one team. Customers find you on Google, on Maps and in AI answers, and your business replies in their language.',
    call: { label: '713-823-9144', href: telHref },
    pinsLabel: 'Sample searches across Houston areas',
    pins: [
      { name: 'THE WOODLANDS', q: 'kitchen remodeling contractor', en: false },
      { name: 'KATY', q: 'realtor que hable español' },
      { name: 'GULFTON', q: 'abogado de inmigración en español' },
      { name: 'PASADENA', q: 'taller mecánico que hable español' },
    ],
    card: {
      label: 'Sample result', name: 'Your business', meta: 'Pasadena, TX · Open now',
      named: 'Named by', checks: ['✓ Google', '✓ Maps', '✓ AI'], ai: 'Your assistant answers in English or Spanish, 24/7',
    },
    services: {
      title: 'Customers find you, choose you <em>and get an answer</em>',
      lead: 'Three jobs, one team. Every service has a published starting price, and we put the final price in writing before we start.',
      steps: [
        { n: '01', title: 'Get found', txt: 'Show up when people search on Google, on Maps and in AI.', links: [2, 3], vig: 'search', note: 'Google, Maps, ChatGPT and Gemini read your site and your profile: we get them ready to name you.' },
        { n: '02', title: 'Get chosen', txt: 'A fast, bilingual site that wins people over in seconds.', links: [0, 4, 5, 6], vig: 'web', note: '' },
        { n: '03', title: 'Always answer', txt: 'An assistant that replies, books and captures leads around the clock.', links: [1], vig: 'chat', note: 'On your site and on WhatsApp, in English and Spanish. When it does not know something, it hands the conversation to you.' },
      ],
      vig: {
        query: 'auto repair near me open now', result: 'Your business', open: 'Open now', checks: ['✓ Google', '✓ Maps', '✓ AI'],
        time: '11:42 PM', me1: 'Can you check my brakes tomorrow?', bot: 'Sure, we have an opening at 8:30. Want me to book it?', me2: 'Yes please. Carlos.', ok: 'Booked · tomorrow 8:30',
      },
      all: { label: 'See all pricing', href: '/en/pricing' },
    },
    projects: {
      tag: 'Portfolio', title: 'Real work, real <em>businesses</em>', did: 'What we did', result: 'Result',
      note: 'Out of respect for our clients\' privacy we show the screenshots, not the links; we are happy to walk you through them on a call.',
      more: { label: 'View projects', href: '/en/portfolio' }, shotPc: 'desktop view', shotMovil: 'mobile view',
    },
    local: {
      nap: [
        { label: 'Direct line', value: nap.houston, href: telHref },
        { label: 'Hours', value: nap.hours },
        { label: 'Languages', value: 'English · Spanish' },
      ],
      mapLabel: 'Map of the Houston area with the zones we serve',
      mapCap: 'The entire metro area',
      zonesLabel: 'Houston-area zones',
      zones: [
        { n: 'Houston', hq: true }, { n: 'Katy', href: '/en/houston/katy' }, { n: 'Sugar Land', href: '/en/houston/sugar-land' },
        { n: 'The Woodlands' }, { n: 'Pearland' }, { n: 'Pasadena' },
      ],
    },
    sectors: {
      tag: 'By industry', title: 'How Houston searches for <em>your industry</em>',
      lead: 'Each industry has its own page, with what its customers search for and how we serve them.',
      queries: ['immigration lawyer who speaks Spanish', 'realtor near me', 'tacos near me open now', 'kitchen remodeling contractor', 'auto repair near me', 'nail salon near me', 'dentist who speaks Spanish'],
      en: [],
    },
    answer: {
      figs: [
        { n: 46, txt: 'of Google searches have local intent' },
        { n: 76, txt: 'of people who search "near me" visit a business within 24 hours' },
      ],
    },
    cta: { call: `Call us: ${nap.houston}`, wa: 'Message us on WhatsApp' },
  },
};
