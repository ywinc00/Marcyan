// ─────────────────────────────────────────────────────────────
// CONTENT (EN) · Landing /en/houston/ai-seo — "SEO for AI / AI Visibility" (AEO).
// The biggest wedge of the business: getting ChatGPT/Gemini/Meta AI to RECOMMEND YOU.
// Different from Conversational AI (which serves YOUR customers). Bespoke page that
// reuses the DS components (services pattern) + PriceGrid for the 3 tiers
// (Free diagnostic - Foundations $500 - Monitoring $200/mo).
//
// Prices live in pricing.ts (PRICE_ANCHORS) and the chatbot KB - here they are only
// DISPLAYED (not the source). Hard honesty: no "#1"/guarantees; AEO is volatile
// (we say so); stat with source (SOCi 2026). EN positioning: bilingual studio, never
// "hispanic-label-in-EN" - we open the Spanish-speaking side of the market to the owner.
// ─────────────────────────────────────────────────────────────

import { HOUSTON_ID, type CrumbItem, type FaqItem, type ServiceInput } from '../lib/schema';
import type { RelatedLink } from './clusters';
import type { PriceService } from './pricing';

const LANDING = '/en/houston/ai-seo';

// ── The 3 product tiers (PriceGrid cards; the diagnostic is free) ──
export const aeoTiers: PriceService[] = [
  {
    id: 'aeo-diagnostico',
    icon: 'lucide:radar',
    name: 'AI Visibility Diagnostic',
    serviceType: 'Answer engine optimization (AEO)',
    description:
      'We check whether ChatGPT, Gemini and Meta AI can find you and recommend you. No cost, no commitment.',
    priceValue: '0',
    free: true,
    displayPrice: 'Free',
    displayUnit: 'no commitment',
    tagline: 'We check whether AI can find and recommend you today.',
    includes: [
      'A review in ChatGPT, Gemini and Meta AI',
      'The state of your Bing Places and your schema',
      'What you are missing for AI to cite you',
      'No cost, no commitment',
    ],
    href: '#contacto',
    ctaLabel: 'Get a free diagnostic',
    tone: 'teal',
  },
  {
    id: 'aeo-cimientos',
    icon: 'lucide:layers',
    name: 'AEO Foundations',
    serviceType: 'Answer engine optimization (AEO)',
    description:
      'We get you ready for AI assistants to read and cite you: Bing Places, schema, FAQ and llms.txt.',
    priceValue: '500',
    displayPrice: '$500',
    displayUnit: 'one-time',
    tagline: 'We get you ready for AI to read and cite you.',
    includes: [
      'Setup and optimization on Bing Places',
      'Structured data (schema) on your site',
      'Frequently asked questions in English and Spanish',
      'Consistent NAP and a file that guides AI (llms.txt)',
    ],
    href: '#contacto',
    ctaLabel: 'I want the foundations',
    tone: 'teal',
  },
  {
    id: 'aeo-monitoreo',
    icon: 'lucide:line-chart',
    name: 'AI Monitoring',
    serviceType: 'Answer engine optimization (AEO)',
    description:
      'Monthly tracking of how AI assistants see and mention you, with continuous adjustments.',
    priceValue: '200',
    monthly: true,
    displayPrice: '$200',
    displayUnit: '/mo',
    tagline: 'We track how the assistants see and mention you.',
    includes: [
      'Monthly tracking in ChatGPT and Gemini',
      'A clear report of mentions and citations',
      'Continuous adjustments based on results',
      'Month to month, no lock-in',
    ],
    href: '#contacto',
    ctaLabel: 'I want monitoring',
    tone: 'teal',
  },
];

export const seoIaPage = {
  meta: {
    title: 'SEO for AI in Houston - Get ChatGPT to recommend you | Marcyan',
    description:
      'Get ChatGPT, Gemini and Meta AI to recommend YOU when people ask for your service. Free AI visibility diagnostic; foundations from $500. Bilingual studio in Houston.',
  },
  path: LANDING,
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'SEO for AI', path: LANDING },
  ] as CrumbItem[],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'SEO for AI - AI Visibility',
    h1: 'Get ChatGPT to <em>recommend</em> you',
    sub: 'Your customers are already asking ChatGPT, Gemini and the AI in their WhatsApp for businesses like yours. We make AI find you, understand you and recommend you, in English and Spanish. Start with a free diagnostic.',
    primary: { label: 'Get your free diagnostic', href: '#contacto' },
    secondary: { label: 'See how to start', href: '#precios' },
    chips: ['Free diagnostic', 'We implement it for you', 'Less competition in Spanish'],
    tone: 'teal' as const,
  },
  answer: {
    q: 'How do I get ChatGPT and Gemini to recommend my business?',
    a: 'By preparing your information so AI can read you, understand you and cite you: Bing Places, structured data (schema), frequently asked questions and a consistent NAP. It matters to do it now. According to the SOCi 2026 Local Visibility Index, ChatGPT recommends only 1.2% of local businesses. Whoever shows up wins the conversation.',
    source: 'SOCi - Local Visibility Index 2026',
  },
  // KEY distinction - AI that recommends you != AI that serves (inline cross-link).
  distinction: {
    tag: 'Do not confuse them',
    title: 'AI that <em>recommends</em> you != AI that <em>serves</em>',
    paragraphs: [
      'There are two different things AI can do for your business. One is to <strong>serve your customers</strong>: an assistant that answers, books and captures leads 24/7. That is our <a href="/en/houston/conversational-ai">Conversational AI</a>. The other, which this page is about, is <strong>getting AI to recommend YOU</strong> when someone asks for a service like yours.',
      'Your customers are already asking ChatGPT and Gemini (the AI that already appears in Google searches) "which shop, lawyer or restaurant do you recommend?". The question is simple: <strong>do you show up, or does your competition?</strong> SEO for AI (also called AEO or GEO) makes it you.',
    ],
    tone: 'teal' as const,
  },
  grid: {
    tag: 'How we start',
    title: 'Three steps, the first one <em>free</em>',
    intro: 'Start with the free diagnostic. If you want us to do the work, the foundations and the monitoring have public pricing, no fine print.',
  },
  // Mechanics / what we do (FeatureGrid).
  mechanics: {
    tag: 'What we do',
    title: 'How we get you ready for <em>AI to cite you</em>',
    tone: 'teal' as const,
    items: [
      { icon: 'lucide:search', title: 'Bing Places (the base of ChatGPT)', desc: 'ChatGPT queries Bing, not Google. We set up and optimize your Bing Places: the easy step almost no one takes.' },
      { icon: 'lucide:braces', title: 'Structured data (schema)', desc: 'We mark up your information in JSON-LD so the assistants understand who you are, what you offer and at what price.' },
      { icon: 'marcyan-ai', title: 'Answers ready to be cited', desc: 'Clear questions and answers in English and Spanish, in the short 40-60 word format (answer-first) that AI cites word for word.' },
      { icon: 'lucide:list-checks', title: 'Consistent NAP and directories', desc: 'Your name, address and phone identical everywhere: AI pulls a good part of its local data from there.' },
      { icon: 'lucide:gauge', title: 'HTML that AI can actually read', desc: 'AI crawlers do not run JavaScript. We build in static HTML (Astro), readable for them; if a site relies on JavaScript to show its content, AI may not see it.' },
      { icon: 'lucide:line-chart', title: 'Measurement and adjustment', desc: 'We track how the assistants see and mention you, and we adjust. AI visibility is volatile: that is why it is tended to month by month.' },
    ],
  },
  // Case #0 + done-for-you + bilingual wedge (Prose).
  caso0: {
    tag: 'Real cases',
    title: 'We apply it on <em>our own site</em> and on our <em>clients</em>',
    paragraphs: [
      'This is not theory. This very site is built so AI can read it - clear HTML, direct answers, structured data. We are our own Case #0, but we are no longer the only one.',
      'Two real clients prove it: the pages for Texas Rush Remove (Houston) and Move Junk Away (Orlando) already rank in their areas, and Google\'s AI already includes them in its recommendations for some searches of their service. Texas Rush Remove, on top of that, already gets visits that arrive directly from ChatGPT. No tricks: clear, well-structured and honest information, the kind AI can cite.',
      'And we do not hand you a PDF of recommendations for you to fix on your own: <strong>we implement it for you</strong>, in English and Spanish and for your local market. SEO for AI in Spanish has far less competition than in English: a real advantage for a business that opens the Spanish-speaking side of its market today.',
    ],
    tone: 'teal' as const,
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'SEO for AI, <em>straight up</em>',
    items: [
      { q: 'What is SEO for AI (AEO/GEO)?', a: 'It is the optimization work that lets AI assistants (ChatGPT, Gemini, Meta AI) find you, understand you and recommend you when someone asks for a service like yours. It is also called AEO (answer engine optimization) or GEO. In short: getting AI to cite you, not just your competition.' },
      { q: 'Is it the same as regular SEO?', a: 'No, but they complement each other. Classic SEO aims to rank you in Google\'s list of results; SEO for AI aims to get the assistants to mention you in their direct answer. They share foundations (a fast, readable site with good information), but AI uses its own signals, like Bing and structured data.' },
      { q: 'How much does it cost?', a: 'The AI visibility diagnostic is free, no commitment. If you want us to build the foundations (Bing, structured data, frequently asked questions and a file that guides AI) it is from $500 one time, and monthly monitoring from $200 a month. All published, no fine print.' },
      { q: 'How long until you see results?', a: 'It is hard to give an exact date, and be wary of anyone who promises one. As a reference, not a guarantee, the first signals usually take weeks and a more solid presence, several months. On top of that, AI answers change on their own: that is why it is ongoing work, not a switch you flip once.' },
      { q: 'Do you guarantee ChatGPT will recommend me?', a: 'No, and be wary of anyone who promises it. No one controls what AI recommends and its answers are volatile. What we do is get you properly prepared to have the best odds, and measure it honestly. ChatGPT does not accept payment for local recommendations either.' },
      { q: 'Does it work in Spanish?', a: 'Yes, and it is our advantage: SEO for AI in Spanish has far less competition than in English. We prepare your information in English and Spanish, so you show up when your customer asks in their own language.' },
    ] as FaqItem[],
  },
  cta: {
    title: 'Find out whether AI <em>recommends</em> you - free',
    sub: 'Ask us for the AI visibility diagnostic: we check whether ChatGPT, Gemini and Meta AI can find you and we tell you honestly where you stand. No cost, no commitment.',
    primary: { label: 'Get a free diagnostic', href: '#contacto' },
    tone: 'teal' as const,
  },
  related: {
    tag: 'Keep exploring',
    title: 'Learn and compare',
    links: [
      { label: 'Guide: how to show up in ChatGPT and Gemini', href: '/en/blog/como-aparecer-en-chatgpt-perplexity', desc: 'The step-by-step guide, if you prefer to understand the how in depth.', icon: 'lucide:book-open' },
      { label: 'AI for your business', href: '/en/ai-for-small-business', desc: 'The other AI: an assistant that serves your customers 24/7.', icon: 'lucide:messages-square' },
      { label: 'Pricing and plans', href: '/en/pricing', desc: 'Every service with its starting price and what it includes.', icon: 'lucide:tag' },
      { label: 'Studio in Houston', href: '/en/houston', desc: 'All of our services for Houston businesses.', icon: 'lucide:map-pin' },
    ] as RelatedLink[],
  },
  // Schema: Service with one Offer per tier (free diagnostic price "0").
  service: {
    name: 'SEO for AI in Houston (AI Visibility)',
    serviceType: 'Answer engine optimization (AEO)',
    description:
      'Optimization so AI assistants (ChatGPT, Gemini, Meta AI) find, understand and recommend your business: Bing Places, structured data, answer-first content, NAP and monitoring. In English and Spanish, for Houston.',
    path: LANDING,
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '0',
    providerId: HOUSTON_ID,
    tiers: [
      { name: 'AI Visibility Diagnostic', priceValue: '0' },
      { name: 'AEO Foundations', priceValue: '500' },
      { name: 'AI Monitoring', priceValue: '200', monthly: true },
    ],
  } as ServiceInput,
};
