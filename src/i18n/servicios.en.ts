// ─────────────────────────────────────────────────────────────
// CONTENT · EN MIRROR of `servicios.ts` — /en/services, the full services
// catalog (hub). Gathers the 7 products (with their tiers) into one
// navigable page, reusing the DS components. The price cards come from
// priceServices (i18n/pricing.en); here lives the page copy + the schema.
// Hard honesty: no #1/guarantees, Miami with no local claims, only the
// published prices.
// Positioning: bilingual studio (never "hispanic-label-in-EN").
// AI doctrine: AI works for the CLIENT's business (never "we use AI").
// ─────────────────────────────────────────────────────────────

import type { CrumbItem, FaqItem, ListLink } from '../lib/schema';
import type { RelatedLink } from './clusters';

export const serviciosPage = {
  meta: {
    title: 'Services — Web design, AI and SEO in Houston and Miami | Marcyan',
    description:
      'The complete Marcyan catalog: web design from $400, conversational AI from $500, AI SEO with a free diagnosis, e-commerce, local SEO, branding and maintenance. Public pricing.',
  },
  path: '/en/services',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Services', path: '/en/services' },
  ] as CrumbItem[],
  hero: {
    kicker: 'Services',
    h1: 'Everything your brand <em>needs</em>',
    sub: 'Seven services to grow your business in Houston and Miami: web design, AI, AI SEO so AI finds you, online stores, local SEO, branding and maintenance. Each one starts with an accessible option and grows with what you need.',
    primary: { label: 'I want my free proposal', href: '#contacto' },
    secondary: { label: 'See detailed pricing', href: '/en/pricing' },
    chips: ['7 services, from $150', 'Free AI diagnosis', 'Public pricing'],
    tone: 'gold' as const,
  },
  answer: {
    q: 'What services does Marcyan offer?',
    a: 'Marcyan offers seven services for small businesses in Houston and Miami: web design (from $400), conversational AI (from $500), AI SEO with a free diagnosis, online stores (from $900), local SEO (from $300), branding (from $150) and maintenance (from $120 a month). Each one starts with an accessible option and grows with what you need, always with the price in writing.',
  },
  grid: {
    tag: 'The catalog',
    title: 'Every service, with its <em>starting point</em>',
    intro: 'We show the most accessible option of each service first. Tap any of them to see the detail, or ask us for a free proposal with your exact scope.',
  },
  related: {
    tag: 'Explore in depth',
    title: 'Every service in <em>detail</em>',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'Landing, redesign or a complete custom site, fast and bilingual.', icon: 'lucide:layout-template' },
      { label: 'AI for your business', href: '/en/ai-for-small-business', desc: 'Assistants that reply, book appointments and capture leads 24/7.', icon: 'lucide:messages-square' },
      { label: 'AI SEO in Houston', href: '/en/houston/ai-seo', desc: 'So ChatGPT and Gemini recommend you. Free diagnosis.', icon: 'marcyan-ai' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'Show up on Google Maps and in local search in your area.', icon: 'lucide:search' },
      { label: 'Online store in Houston', href: '/en/houston/ecommerce', desc: 'Catalog, cart and secure payments to sell online.', icon: 'lucide:shopping-bag' },
      { label: 'Branding in Houston', href: '/en/houston/branding', desc: 'From just the logo to a complete brand identity.', icon: 'lucide:palette' },
      { label: 'Pricing and what it includes', href: '/en/pricing', desc: 'All rates published, no fine print.', icon: 'lucide:tag' },
    ] as RelatedLink[],
  },
  why: {
    tag: 'Why Marcyan',
    title: 'What makes us <em>different</em>',
    items: [
      { icon: 'lucide:languages', title: 'Truly bilingual', desc: 'Your site in real English and Spanish, not a Google Translate button. Our own site is bilingual.' },
      { icon: 'marcyan-ai', title: 'AI finds you', desc: 'We build in fast HTML that ChatGPT, Gemini and Meta AI can actually read, so you show up when people ask about what you offer.' },
      { icon: 'lucide:tag', title: 'Public pricing', desc: 'We publish it all, down to monthly SEO and maintenance. No fine print, no surprises on the invoice.' },
      { icon: 'lucide:map-pin', title: 'Real local presence', desc: 'We serve you in Houston and Miami, in your language and your time zone, not an anonymous remote operation.' },
    ],
    tone: 'gold' as const,
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'About our services, <em>no runaround</em>',
    items: [
      {
        q: 'Which service do I need to get started?',
        a: 'It depends on your starting point. If you have no site, it usually starts with a landing or a website; if you already have one and customers are not coming in, with local SEO or AI SEO; and if you are missing calls, with an AI assistant. In the free proposal we tell you honestly where it makes sense to start for your business.',
      },
      {
        q: 'Can I combine several services?',
        a: 'Yes, and it is usually the most effective approach: for example, a new site plus local SEO, or an AI assistant plus AI SEO. We put together a combined scope with a clear price in writing, and you can start with one part and grow whenever you want.',
      },
      {
        q: 'Is the AI visibility diagnosis really free?',
        a: 'Yes, no cost and no commitment. We check whether ChatGPT, Gemini and Meta AI can find and recommend you, and we tell you honestly where you stand. If you then want us to work on the foundations or monitoring, those do have a published price; the diagnosis does not.',
      },
      {
        q: 'Do you work custom or with templates?',
        a: 'Everything custom. We design and build each project from scratch around your brand, no recycled templates. That is why the price is a "from $" anchor and not a fixed rate: we define the real scope together in the proposal.',
      },
      {
        q: 'Do you only serve Houston and Miami?',
        a: 'Our focus is Houston and Miami, where we bring local context and support in your time zone. We work as a service-area business, remotely and efficiently, so we have also delivered projects in other cities. Tell us where you are and we will take a look.',
      },
    ] as FaqItem[],
  },
  cta: {
    title: 'Tell us what you need, <em>we advise you free</em>',
    sub: 'In under 24 hours you get a proposal with the service (or the combination) that best fits you, with clear scope and price, no commitment.',
    primary: { label: 'Request a free proposal', href: '#contacto' },
    secondary: { label: 'See the full brief', href: '/formulario' },
    tone: 'gold' as const,
  },
  // ItemList schema — the 7 services pointing to their real page (or the hub).
  itemList: [
    { name: 'Web Design', path: '/en/houston/web-design' },
    { name: 'Conversational AI', path: '/en/ai-for-small-business' },
    { name: 'AI SEO (AI Visibility)', path: '/en/houston/ai-seo' },
    { name: 'E-Commerce & Stores', path: '/en/houston/ecommerce' },
    { name: 'Local SEO', path: '/en/houston/local-seo' },
    { name: 'Branding & Identity', path: '/en/houston/branding' },
    { name: 'Ongoing Maintenance', path: '/en/services' },
  ] as ListLink[],
};
