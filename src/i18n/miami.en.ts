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

import type { FaqItem, CrumbItem } from '../lib/schema';
import type { RelatedLink } from './clusters';
import { PRICE_ANCHORS } from './pricing';
import { nap } from './content';

const telHref = 'tel:' + nap.miami.replace(/[^\d+]/g, '');
const usd = (n: number) => '$' + n.toLocaleString('en-US');

export const miamiHub = {
  meta: {
    title: 'Web Design in Miami | Bilingual studio: web, AI and SEO | Marcyan',
    description:
      'Bilingual web design studio in Miami: custom sites, conversational AI and local SEO. Real English and Spanish, public pricing. Free proposal in 24h.',
  },
  path: '/en/miami',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Miami', path: '/en/miami' },
  ] as CrumbItem[],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Bilingual studio · Miami, FL',
    microcopy: 'Reply in 1 business hour · No commitment',
    h1: 'Web design in <em>Miami</em>',
    sub: 'One bilingual studio for your site, your AI and your local SEO in Miami: custom-built, in true English and Spanish, with public pricing. Made for how your Cuban, Venezuelan or Colombian customers really search.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See pricing and plans', href: '/en/pricing' },
    chips: ['Miami Spanish', 'Public pricing', 'All of Miami-Dade'],
    tone: 'gold' as const,
  },
  answer: {
    q: 'Why choose a bilingual web design studio in Miami?',
    a: 'Because in Miami, Spanish is the language of commerce: close to 69% of Miami-Dade is Hispanic, according to the U.S. Census Bureau. You need a studio that builds in real English and Spanish, writes for the way your Cuban, Venezuelan or Colombian customers actually speak, and structures your site so Google and AI can find you. That connects you to your market far better than a generic agency.',
    source: 'U.S. Census Bureau, ACS 2023',
  },
  services: {
    tag: 'Services in Miami',
    title: 'Everything for your business, in <em>one studio</em>',
    links: [
      { label: 'Web design in Miami', desc: 'Custom sites, fast and bilingual. From $1,500.', icon: 'lucide:layout-template', price: `from ${usd(PRICE_ANCHORS.web)}` },
      { label: 'Local SEO in Miami', desc: 'Show up on Google Maps and in AI. From $600/mo.', icon: 'lucide:search', price: `from ${usd(PRICE_ANCHORS.seoLocal)}/mo` },
      { label: 'Conversational AI in Miami', desc: 'Assistants that answer WhatsApp and book 24/7. From $900.', icon: 'lucide:messages-square', price: `from ${usd(PRICE_ANCHORS.ia)}` },
      { label: 'Online store in Miami', desc: 'E-commerce that sells, with payments and catalog. From $2,900.', icon: 'lucide:shopping-bag', price: `from ${usd(PRICE_ANCHORS.ecommerce)}` },
    ] as Array<Omit<RelatedLink, 'href'> & { href?: string }>,
  },
  local: {
    tag: 'Miami',
    title: 'We know <em>Spanish-speaking Miami</em>',
    paragraphs: [
      'Miami-Dade is one of the most Latino markets in the United States: close to 69% of its population is Hispanic. But it is not a uniform block: it is Cuban at its roots, with Venezuelan Doral, Colombian Kendall and Brickell, Cuban Hialeah and Nicaraguan Sweetwater. We speak to each one in their own Spanish, not in a generic one.',
      '<strong>Let\'s be transparent:</strong> we are just getting started in Miami, so we do not show local case studies yet. What we do show is real, verifiable work we have already done in Houston and Orlando, and we are looking for our first Founding Clients in Miami. We serve all of Miami-Dade as a service-area business, in English and Spanish.',
    ],
    tone: 'gold' as const,
  },
  related: {
    tag: 'Keep exploring',
    title: 'Pricing and more',
    links: [
      { label: 'Pricing and plans', href: '/en/pricing', desc: 'Every service with its starting price and what it includes.', icon: 'lucide:tag' },
      { label: 'Studio in Houston', href: '/en/houston', desc: 'Our home base, with verifiable case studies.', icon: 'lucide:map-pin' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'A Miami studio, <em>no runaround</em>',
    items: [
      { q: 'What services do you offer in Miami?', a: 'Custom web design and development, local SEO, conversational AI (assistants that answer 24/7) and online stores; also branding and AI SEO. Everything bilingual in English and Spanish, and built for the Spanish-speaking side of your Miami market. You can start with a single service or a coordinated package.' },
      { q: 'Do you have clients or an office in Miami?', a: 'We\'ll be honest: we are just getting started in Miami, so we do not yet have published case studies from this city or a public address (we work as a service-area business). We do have real, verifiable work done in Houston and Orlando, with links you can visit. That is why we offer Founding Client spots in Miami.' },
      { q: 'Do you work in the Spanish of Miami?', a: 'Yes. We are a bilingual team focused on the Spanish-speaking market in the United States. In Miami that means the Spanish that is really spoken here, Cuban, Venezuelan, Colombian, and English too. We write and optimize for how your customer actually speaks and searches, not in generic Spanish.' },
      { q: 'Do you serve the whole Miami area?', a: 'Yes. We cover Miami-Dade and its metro area (Doral, Hialeah, Kendall, Coral Gables, Brickell, Aventura and more) as a service-area business, remotely and efficiently. You do not need to visit an office: the entire process, from proposal to delivery, happens online and in your language.' },
      { q: 'How much do your services cost in Miami?', a: 'We publish our starting prices: web design from $1,500, AI from $900, online store from $2,900 and local SEO from $600 a month. The final price depends on scope, and we always give it to you in writing before we start. You can see them all on our pricing page.' },
      { q: 'Why a new bilingual studio in Miami and not an already established one?', a: 'Because we truly speak your language, we have a real local presence (we are not an anonymous remote operation), and we work with honesty: public pricing, no lock-in contracts and no promising the "#1" spot. We are new in Miami, but our work is verifiable, and our Founding Clients get hands-on attention and special terms.' },
    ] as FaqItem[],
  },
  cta: {
    title: 'Ready to grow in <em>Miami</em>?',
    sub: 'Tell us about your business and get a personalized proposal in under 24 hours, with no commitment.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold' as const,
  },
  reassure: 'Reply in 1 business hour · Free proposal in 24h · Price in writing before we start',
  // ── "The journey" redesign (2026-11-01, the Houston base with Miami's own elements) ── new page copy; the keys above
  // stay untouched. Title and meta do not change here (they belong to the SEO department).
  journey: {
    h1: 'The studio that puts your business on the map in <em>Miami</em>',
    lead: 'Web, SEO and AI from one team. In Miami people search in English and in Spanish: get found on Google, on Maps and in AI answers, and have your business reply in both.',
    call: { label: '786-938-1754', href: telHref },
    pinsLabel: 'Sample searches across Miami areas',
    pins: [
      { name: 'HIALEAH', q: 'taller de mecánica cerca de mí' },
      { name: 'DORAL', q: 'abogado de inmigración en español' },
      { name: 'KENDALL', q: 'dentist near me' },
      { name: 'MIAMI BEACH', q: 'restaurante cubano abierto ahora' },
    ],
    card: {
      label: 'Sample result', name: 'Your business', meta: 'Miami Beach, FL · Open now',
      named: 'Named by', checks: ['✓ Google', '✓ Maps', '✓ AI'], ai: 'Your assistant answers in English or Spanish, 24/7',
    },
    services: {
      title: 'Customers find you, choose you <em>and get an answer</em>',
      lead: 'Three jobs, one team for all of Miami-Dade. Every service has a published starting price, and your final quote comes in writing before any work starts.',
      steps: [
        { n: '01', title: 'Get found', txt: 'Show up when Miami searches for you, in English or Spanish, on Google, on Maps and in AI.', links: [1], vig: 'search', note: 'Your site and your Google profile, ready for the way Miami searches: in English, in Spanish and often both in the same sentence.' },
        { n: '02', title: 'Get chosen', txt: 'A fast site in real English and real Spanish, so nobody has to settle for a translation.', links: [0, 3], vig: 'web', note: '' },
        { n: '03', title: 'Always answer', txt: 'An assistant that answers, books and captures leads at any hour, in the language each customer writes in.', links: [2], vig: 'chat', note: 'On your site and on WhatsApp, the app Miami runs on. When it does not know something, it hands the conversation to you.' },
      ],
      vig: {
        query: 'cuban restaurant open now', result: 'Your business', open: 'Open now', checks: ['✓ Google', '✓ Maps', '✓ AI'],
        time: '11:42 PM', me1: 'Do you have a table for four tomorrow at 8?', bot: 'Of course. Tomorrow at 8 we have a table on the terrace. Want me to hold it?', me2: 'Yes please, under Carlos.', ok: 'Table held · tomorrow 8:00 PM',
      },
      all: { label: 'See all pricing', href: '/en/pricing' },
    },
    projects: {
      slugs: ['mja'],
      tag: 'Portfolio', title: 'Real work in <em>Florida</em>', did: 'What we did', result: 'Result',
      note: 'Move Junk Away is in Orlando: it is our closest project to Miami and we show it with its real city. For privacy we show the screenshots, not the links; we are happy to walk you through it on a call.',
      more: { label: 'View projects', href: '/en/portfolio' }, shotPc: 'desktop view', shotMovil: 'mobile view',
    },
    local: {
      nap: [
        { label: 'Direct line', value: nap.miami, href: telHref },
        { label: 'Hours', value: nap.hoursEn },
        { label: 'Languages', value: 'English · Spanish' },
      ],
      mapLabel: 'Map of the Miami area with the zones we serve',
      mapCap: 'All of Miami-Dade',
      zonesLabel: 'Miami-area zones',
      zones: [
        { n: 'Miami', hq: true }, { n: 'Doral' }, { n: 'Hialeah' },
        { n: 'Miami Beach' }, { n: 'Coral Gables' }, { n: 'Kendall' }, { n: 'Aventura' },
      ],
    },
    sectors: {
      tag: 'By industry', title: 'How Miami searches for <em>your industry</em>',
      lead: "What each industry's customers type in Miami, in English or in Spanish. We get your site and your profile ready for that search.",
      rows: [
        { label: 'Restaurants', icon: 'lucide:utensils', q: 'cuban restaurant open now' },
        { label: 'Immigration lawyers', icon: 'lucide:scale', q: 'abogado de inmigración en Doral' },
        { label: 'Real estate', icon: 'lucide:home', q: 'realtor in Brickell' },
        { label: 'Contractors', icon: 'lucide:hard-hat', q: 'roofing contractor near me' },
        { label: 'Auto repair shops', icon: 'lucide:car', q: 'taller de mecánica en Hialeah' },
        { label: 'Beauty salons', icon: 'lucide:scissors', q: 'nail salon in Kendall' },
        { label: 'Dental clinics', icon: 'lucide:stethoscope', q: 'dentist who speaks Spanish' },
      ],
    },
    answer: {
      figs: [
        { n: 46, txt: 'of Google searches have local intent' },
        { n: 76, txt: 'of people who search "near me" visit a business within 24 hours' },
      ],
    },
    cta: { call: `Call us: ${nap.miami}`, wa: 'Message us on WhatsApp' },
  },

};
