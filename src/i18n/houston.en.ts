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
      { label: 'Hours', value: nap.hours },
      { label: 'Public pricing', value: priceChain, href: '#servicios' },
      { label: 'Base', value: '29.7604° N, 95.3698° W' },
    ],
    // No skyline illustration: the stage stays a minimal horizon (ground line +
    // atmosphere + city seal). `src` optional to restore it.
    skyline: { caption: 'HOUSTON, TX — SPACE CITY' },
    tone: 'gold' as const,
    // ── ADDITIVE fields for the "El Domo" hero (DomoHero; spec in
    // docs/landings/SPEC-hero-houston-domo.md). telemetry/skyline are KEPT:
    // CityHero still exists and rollback = reverting the import.
    aiCard: {
      title: 'Zero missed calls',
      body: 'An AI agent answers your phone and your WhatsApp 24/7, in English and Spanish, and books appointments while you rest.',
      linkLabel: 'See how it works →',
      href: '/en/houston/conversational-ai',
    },
    builtWithLabel: 'We build with',
    builtWith: ['OpenAI', 'Google', 'WhatsApp', 'Shopify', 'Stripe'],
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
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'Custom, fast, bilingual sites, ready for Google and AI.', icon: 'lucide:layout-template', price: `from ${usd(PRICE_ANCHORS.web)}` },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'Assistants that answer, book and capture leads 24/7, in English and Spanish.', icon: 'lucide:messages-square', price: `from ${usd(PRICE_ANCHORS.ia)}` },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'Show up on Google Maps and in AI.', icon: 'lucide:search', price: `from ${usd(PRICE_ANCHORS.seoLocal)}/mo` },
      { label: 'AI SEO in Houston', href: '/en/houston/ai-seo', desc: 'So ChatGPT and Gemini recommend you.', icon: 'marcyan-ai', price: 'Free diagnostic' },
      { label: 'Bilingual web design (ES/EN)', href: '/en/houston/bilingual-web-design', desc: 'Your site in true English and Spanish, not machine-translated.', icon: 'lucide:languages', price: `from ${usd(PRICE_ANCHORS.web)}` },
      { label: 'Online store in Houston', href: '/en/houston/ecommerce', desc: 'E-commerce that sells, with payments and catalog.', icon: 'lucide:shopping-bag', price: `from ${usd(PRICE_ANCHORS.ecommerce)}` },
      { label: 'Branding and identity in Houston', href: '/en/houston/branding', desc: 'Logo, colors and typography with expert judgment.', icon: 'lucide:palette', price: `from ${usd(PRICE_ANCHORS.branding)}` },
    ] as RelatedLink[],
  },
  // Directory by industry: dense index — mono subs of 3-6 words derived from the
  // original honest descs (no repeated figures or new claims).
  industries: {
    tag: 'By industry',
    title: 'Solutions by sector',
    links: [
      { label: 'Immigration lawyers', href: '/en/houston/immigration-lawyers', desc: 'AI that books consultations 24/7', icon: 'lucide:scale' },
      { label: 'Real estate', href: '/en/houston/real-estate', desc: 'Listings, lead capture and SEO by area', icon: 'lucide:home' },
      { label: 'Restaurants', href: '/en/houston/restaurants', desc: 'QR menu and orders via WhatsApp', icon: 'lucide:utensils' },
      { label: 'Contractors', href: '/en/houston/contractors', desc: 'AI that rescues missed calls', icon: 'lucide:hard-hat' },
      { label: 'Auto repair shops', href: '/en/houston/auto-repair', desc: 'Services, hours and "near me" SEO', icon: 'lucide:car' },
      { label: 'Beauty salons', href: '/en/houston/beauty-salons', desc: 'Bookings 24/7 and gallery', icon: 'lucide:scissors' },
      { label: 'Dental clinics', href: '/en/houston/dental-clinics', desc: 'Bilingual site that books appointments', icon: 'lucide:stethoscope' },
    ] as RelatedLink[],
  },
  // Areas: they live as route-pills inside the Houston Card (the 2 silo <a>).
  zonas: {
    tag: 'By area',
    title: 'Web design by <em>Houston area</em>',
    links: [
      { label: 'Katy, TX', href: '/en/houston/katy', desc: 'Web and local SEO in Katy', icon: 'lucide:map-pin' },
      { label: 'Sugar Land, TX', href: '/en/houston/sugar-land', desc: 'Bilingual web and SEO in Sugar Land', icon: 'lucide:map-pin' },
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
      { ic: 'lucide:clock', label: 'Hours', value: nap.hours },
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
      { label: 'How much does a website cost in Houston?', href: '/en/pricing/website-cost-houston', desc: 'The direct answer, with real pricing', icon: 'lucide:help-circle' },
      { label: 'Web design in Miami', href: '/en/miami/web-design', desc: 'We also design in Miami', icon: 'lucide:layout-template' },
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
  // ItemList (schema) — the services offered in Houston, each to its landing.
  itemList: [
    { name: 'Web Design in Houston', path: '/en/houston/web-design' },
    { name: 'Local SEO in Houston', path: '/en/houston/local-seo' },
    { name: 'Conversational AI in Houston', path: '/en/houston/conversational-ai' },
    { name: 'AI SEO in Houston', path: '/en/houston/ai-seo' },
    { name: 'Online Store in Houston', path: '/en/houston/ecommerce' },
    { name: 'Branding and Identity in Houston', path: '/en/houston/branding' },
    { name: 'Websites for Restaurants in Houston', path: '/en/houston/restaurants' },
    { name: 'Websites for Contractors in Houston', path: '/en/houston/contractors' },
    { name: 'Websites for Auto Repair Shops in Houston', path: '/en/houston/auto-repair' },
    { name: 'Websites with Booking for Beauty Salons in Houston', path: '/en/houston/beauty-salons' },
    { name: 'Websites for Dental Clinics in Houston', path: '/en/houston/dental-clinics' },
    { name: 'Web Design and Local SEO in Katy, TX', path: '/en/houston/katy' },
    { name: 'Web Design and Local SEO in Sugar Land', path: '/en/houston/sugar-land' },
    { name: 'Bilingual Web Design in Houston (English and Spanish)', path: '/en/houston/bilingual-web-design' },
  ] as ListLink[],
};
