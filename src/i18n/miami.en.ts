// ─────────────────────────────────────────────────────────────
// CONTENT · Wave 2 · B3 — CITY HUB /en/miami (node of the geo silo).
// EN mirror of miami.ts. Introduces Miami and links to its services.
// GENUINE context (NOT a Houston clone): Miami-Dade ~69% Hispanic (Census),
// led by Cubans but pan-Latino (Venezuelans in Doral, Colombians in
// Kendall/Brickell, Nicaraguans in Sweetwater). Caribbean Spanish (NOT
// Mexican idioms). HARD honesty: NO Miami clients yet -> Founding Client
// + real proof labeled by its own city (Houston/Orlando), never Miami.
// No "#1". Saturated market -> differentiate by honesty/AEO/real local
// presence, NOT price. Positioning: bilingual studio (never "hispanic-label-in-EN").
// ─────────────────────────────────────────────────────────────

import type { FaqItem, CrumbItem, ListLink } from '../lib/schema';
import type { RelatedLink } from './clusters';

export const miamiHub = {
  meta: {
    title: 'Web Design in Miami | Bilingual studio: web, AI and SEO | Marcyan',
    description:
      'Bilingual web design studio in Miami: custom sites, conversational AI and local SEO. Built in true English and Spanish so you capture the Spanish-speaking side of your market, with public pricing. Free proposal in 24h.',
  },
  path: '/en/miami',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Miami', path: '/en/miami' },
  ] as CrumbItem[],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Local studio',
    h1: 'Web design in <em>Miami</em>',
    sub: 'One bilingual studio for your site, your AI and your local SEO in Miami: custom-built, in true English and Spanish, with public pricing. Made for how your Cuban, Venezuelan or Colombian customers really search.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See pricing and plans', href: '/en/pricing' },
    chips: ['The Spanish of Miami', 'Public pricing', 'All of Miami-Dade'],
    tone: 'gold' as const,
  },
  answer: {
    q: 'Why choose a bilingual web design studio in Miami?',
    a: 'Because in Miami, Spanish is the language of commerce: close to 69% of Miami-Dade is Hispanic, according to the U.S. Census Bureau. A studio that builds in true English and Spanish, for the way your Cuban, Venezuelan or Colombian customers actually speak, and structures your site so Google and AI can find you, connects you to your market better than a generic operation.',
    source: 'U.S. Census Bureau, ACS 2023',
  },
  services: {
    tag: 'Services in Miami',
    title: 'Everything for your business, in <em>one studio</em>',
    links: [
      { label: 'Web design in Miami', href: '/en/miami/web-design', desc: 'Custom sites, fast and bilingual. From $1,500.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Miami', href: '/en/miami/local-seo', desc: 'Show up on Google Maps and in AI. From $600/mo.', icon: 'lucide:search' },
      { label: 'Conversational AI in Miami', href: '/en/miami/conversational-ai', desc: 'Assistants that answer WhatsApp and book 24/7. From $900.', icon: 'lucide:messages-square' },
      { label: 'Online store in Miami', href: '/en/miami/ecommerce', desc: 'E-commerce that sells, with payments and catalog. From $2,900.', icon: 'lucide:shopping-bag' },
    ] as RelatedLink[],
  },
  barrios: {
    tag: 'By neighborhood',
    title: 'Solutions by <em>neighborhood</em>',
    links: [
      { label: 'Doral (Doralzuela)', href: '/en/miami/doral', desc: 'Web design, SEO and AI for Doral businesses. Bilingual, from $1,500.', icon: 'lucide:map-pin' },
      { label: 'Hialeah', href: '/en/miami/hialeah', desc: 'Web, local SEO and Spanish-language AI for Hialeah businesses.', icon: 'lucide:map-pin' },
    ] as RelatedLink[],
  },
  local: {
    tag: 'Miami',
    title: 'We know <em>Spanish-speaking Miami</em>',
    paragraphs: [
      'Miami-Dade is one of the most Latino markets in the United States: close to 69% of its population is Hispanic. But it is not a uniform block: it is Cuban at its roots, with Venezuelan Doral, Colombian Kendall and Brickell, Cuban Hialeah and Nicaraguan Sweetwater. We speak to each one in their own Spanish, not in a generic one.',
      '<strong>Let us be transparent:</strong> we are just opening our operation in Miami, so we do not show local case studies yet. What we do show is real, verifiable work we have already done in Houston and Orlando, and we are looking for our first Founding Clients in Miami. We serve all of Miami-Dade as a service-area business, in English and Spanish.',
    ],
    tone: 'gold' as const,
  },
  related: {
    tag: 'Keep exploring',
    title: 'Pricing and more',
    links: [
      { label: 'Pricing and plans', href: '/en/pricing', desc: 'Every service with its starting price and what it includes.', icon: 'lucide:tag' },
      { label: 'AI SEO (so AI recommends you)', href: '/en/houston/ai-seo', desc: 'So ChatGPT and Gemini recommend you. Free diagnosis.', icon: 'marcyan-ai' },
      { label: 'Studio in Houston', href: '/en/houston', desc: 'Our home base, with verifiable case studies.', icon: 'lucide:map-pin' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'A Miami studio, <em>no fluff</em>',
    items: [
      { q: 'What services do you offer in Miami?', a: 'Custom web design and development, local SEO, conversational AI (assistants that answer 24/7) and online stores; also branding and AI SEO. Everything bilingual in English and Spanish, and built for the Spanish-speaking side of your Miami market. You can take a single service or a coordinated package.' },
      { q: 'Do you have clients or an office in Miami?', a: 'We will be honest: we are starting our operation in Miami, so we do not yet have published case studies from this city or a public address (we work as a service-area business). We do have real, verifiable work done in Houston and Orlando, with links you can visit. That is why we offer Founding Client spots in Miami.' },
      { q: 'Do you work in the Spanish of Miami?', a: 'Yes. We are a bilingual team focused on the Spanish-speaking market in the United States. In Miami that means the Spanish that is really spoken here, Cuban, Venezuelan, Colombian, and English too. We write and configure for how your customer actually speaks and searches, not in a generic Spanish.' },
      { q: 'Do you serve the whole Miami area?', a: 'Yes. We cover Miami-Dade and its metro area (Doral, Hialeah, Kendall, Coral Gables, Brickell, Aventura and more) as a service-area business, remotely and efficiently. You do not need to visit an office: the entire process, from proposal to delivery, happens online and in your language.' },
      { q: 'How much do your services cost in Miami?', a: 'We publish our starting prices: web design from $1,500, AI from $900, online store from $2,900 and local SEO from $600 a month. The final price depends on scope, and we always give it to you in writing before we start. You can see them all on our pricing page.' },
      { q: 'Why a new bilingual studio in Miami and not an already established one?', a: 'Because we truly speak your language, we have real local presence (we are not an anonymous remote operation), and we work with honesty: public pricing, no forced contracts and no promising the "#1" spot. We are new in Miami, but with verifiable work, and we give our Founding Clients dedication and special terms.' },
    ] as FaqItem[],
  },
  cta: {
    title: 'Ready to grow in <em>Miami</em>?',
    sub: 'Tell us about your business and get a personalized proposal in under 24 hours, with no commitment.',
    primary: { label: 'Request a free proposal', href: '#contacto' },
    secondary: { label: 'See the full form', href: '/formulario' },
    tone: 'gold' as const,
  },
  // ItemList (schema) — the services offered in Miami, each linking to its landing.
  itemList: [
    { name: 'Web Design in Miami', path: '/en/miami/web-design' },
    { name: 'Local SEO in Miami', path: '/en/miami/local-seo' },
    { name: 'Conversational AI in Miami', path: '/en/miami/conversational-ai' },
    { name: 'Online Store in Miami', path: '/en/miami/ecommerce' },
    { name: 'Web Design and SEO in Doral', path: '/en/miami/doral' },
    { name: 'Web Design and SEO in Hialeah', path: '/en/miami/hialeah' },
  ] as ListLink[],
};
