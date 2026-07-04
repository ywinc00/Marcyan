// ─────────────────────────────────────────────────────────────
// CONTENT · /en/portfolio — real proof (4 clients) + E-E-A-T.
// HARD honesty: 4 REAL businesses with real screenshots (public/Galeria/*.webp);
// NO invented metrics; NO links to client sites (privacy, UI-audit decision).
// Schema: CollectionPage + ItemList (CreativeWork).
// Screenshots and base data are the same the home uses (Projects.astro).
// ─────────────────────────────────────────────────────────────
import type { FaqItem, CrumbItem } from '../lib/schema';
import type { RelatedLink } from './clusters';

export interface PortfolioProject {
  name: string;
  cat: string;            // niche · city
  slug: string;           // screenshot base in /Galeria (slug-pc.webp / slug-movil.webp)
  mh: number;             // native height of the mobile screenshot (avoids CLS)
  accent: 'gold' | 'teal';
  badge: string;
  tags: string[];
  did: string;            // "what we did" — honest, no invented metrics
  result: string;         // real result
  serviceLabel: string;   // link to the relevant service
  serviceHref: string;
}

// The 4 real clients. cat/result consistent with content.ts (projects); mh mirrors
// the native heights in Projects.astro (SHOTS) to avoid CLS.
export const portfolioProjects: PortfolioProject[] = [
  {
    name: 'Texas Rush Remove', cat: 'Junk Removal · Houston, TX', slug: 'trr', mh: 2431, accent: 'gold',
    badge: 'Site + SEO', tags: ['Rebuilt from scratch', 'Local SEO', 'Bilingual'],
    did: 'We rebuilt their site from scratch, fast and bilingual, and set up their local SEO: Google Business Profile, consistent NAP and per-service pages for their Houston area.',
    result: 'It already ranks in its Houston area, Google\'s AI already includes it in its recommendations for some searches, and it gets visits arriving from ChatGPT.',
    serviceLabel: 'Local SEO in Houston', serviceHref: '/en/houston/local-seo',
  },
  {
    name: 'Move Junk Away', cat: 'Junk Removal · Orlando, FL', slug: 'mja', mh: 2282, accent: 'teal',
    badge: 'Site + SEO', tags: ['Rebuilt from scratch', 'Local SEO', 'Bilingual'],
    did: 'The same in Orlando: a site rebuilt from scratch, fast and bilingual, with local SEO (Google Business Profile, NAP and per-service content) for their Florida market.',
    result: 'It already ranks in its Orlando area and Google\'s AI already includes it in recommendations for some searches.',
    serviceLabel: 'Local SEO', serviceHref: '/en/houston/local-seo',
  },
  {
    name: "Julio's Landscape TX", cat: 'Landscaping · Houston, TX', slug: 'jls', mh: 2397, accent: 'gold',
    badge: 'Brand + Site', tags: ['Brand identity', 'Custom site', 'From scratch'],
    did: 'We created their brand from scratch (logo, palette and typography) and their custom website, consistent from start to finish, for a Houston landscaper.',
    result: 'A new brand identity and website, built to measure from scratch.',
    serviceLabel: 'Branding and identity', serviceHref: '/en/houston/branding',
  },
  {
    name: 'Rosy Nails & Care', cat: 'Nail Salon · Houston, TX', slug: 'rn', mh: 2710, accent: 'teal',
    badge: 'Web app', tags: ['Appointment booking', 'Custom-built', 'Online reservations'],
    did: 'We built a custom web app where clients book their appointments online and browse nail-design inspiration, for a Houston salon.',
    result: 'A custom booking web app, live and in use by their clients.',
    serviceLabel: 'Sites for beauty salons', serviceHref: '/en/houston/beauty-salons',
  },
];

export const portfolioPage = {
  meta: {
    title: 'Portfolio: real work, real businesses | Marcyan',
    description:
      'Marcyan Studio portfolio: websites, local SEO, branding and web apps for real businesses in Houston and Orlando. Real screenshots, no inflated metrics.',
  },
  path: '/en/portfolio',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Portfolio', path: '/en/portfolio' },
  ] as CrumbItem[],
  hero: {
    kicker: 'Portfolio',
    h1: 'Real work, <em>real</em> businesses',
    sub: 'We do not show catalog mockups: these are real clients we designed sites, SEO, brand and web apps for. Real screenshots of every project, in true English and Spanish, with no inflated metrics.',
    primary: { label: 'Request a free proposal', href: '#contacto' },
    secondary: { label: 'View services', href: '/en/services' },
    chips: ['4 real businesses', 'Houston and Orlando', 'Real screenshots'],
    tone: 'gold' as const,
  },
  answer: {
    q: 'What kind of projects does Marcyan do?',
    a: 'Marcyan designs and builds custom websites, local SEO, brand identity and web apps for local businesses. Our portfolio includes four real clients in Houston and Orlando: two junk-removal companies, a landscaper and a nail salon, each with its site or app live.',
  },
  worksHead: {
    tag: 'Real work',
    title: 'Four clients, <em>four solutions</em>',
    intro:
      'Every project was designed to measure around the business. Out of respect for our clients\' privacy we show the screenshots, not the links; we are happy to walk you through them on a call.',
  },
  related: {
    tag: 'Keep exploring',
    title: 'What we can do for you',
    links: [
      { label: 'All services', href: '/en/services', desc: 'Web design, AI, SEO, e-commerce and branding, with public pricing.', icon: 'lucide:layers' },
      { label: 'About Marcyan', href: '/en/about', desc: 'Who we are, how we work and why bilingual.', icon: 'lucide:users' },
      { label: 'Pricing and plans', href: '/en/pricing', desc: 'The starting price of every service and what it includes.', icon: 'lucide:tag' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'About our portfolio, <em>clearly</em>',
    items: [
      { q: 'Are these real clients?', a: 'Yes. All four are real businesses we worked for: Texas Rush Remove and Move Junk Away (junk removal), Julio\'s Landscape (landscaping) and Rosy Nails & Care (nail salon). The screenshots you see are of their real sites and app, not catalog mockups.' },
      { q: 'Why don\'t you show the links to the sites?', a: 'Out of respect for our clients\' privacy we do not publish their domains here. If you want to see them live, we are happy to show you on a call or in the proposal.' },
      { q: 'Do you have cases in my industry or city?', a: 'We work mainly in Houston and also in Orlando, in niches like home services, landscaping and beauty. If we do not yet have a published case in your industry or city (for example, Miami), we offer you a Founding Client spot with special terms.' },
      { q: 'Do you publish metrics or result numbers?', a: 'We only say what we can back up honestly: that we rebuild sites, set up local SEO that already ranks, and deliver custom brands and apps. Today that includes something new: Google\'s AI already includes our clients in its recommendations for some searches, and one of them already gets visits arriving from ChatGPT. When we have metrics with the client\'s permission, we will publish them; in the meantime, we do not inflate percentages or invent figures.' },
      { q: 'How long does a project like these take?', a: 'A custom site usually takes between 2 and 4 weeks depending on scope and how quickly we receive your content; a web app or a store take longer. We give you a realistic timeline in the free proposal.' },
    ] as FaqItem[],
  },
  cta: {
    title: 'The next case <em>could be yours</em>',
    sub: 'Tell us about your business and get a personalized proposal in under 24 hours, no strings attached.',
    primary: { label: 'Request a free proposal', href: '#contacto' },
    secondary: { label: 'Detailed project brief', href: '/formulario' },
    tone: 'gold' as const,
  },
};
