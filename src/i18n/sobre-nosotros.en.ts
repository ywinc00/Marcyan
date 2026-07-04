// ─────────────────────────────────────────────────────────────
// CONTENT · /en/about — honest E-E-A-T (who we are, how we work).
// HARD honesty: NO invented founder (the Person node + photo are added LATER —
// there is a commented JSON-LD block in the page, ready for the real datum); no "#1";
// SAB (no public office); no LLC (we do not claim incorporation). Schema: AboutPage
// pointing to the Organization in the Layout base @graph.
// ─────────────────────────────────────────────────────────────
import type { FaqItem, CrumbItem } from '../lib/schema';
import type { SectionFeatures, RelatedLink } from './clusters';

export const sobreNosotros = {
  meta: {
    title: 'About Marcyan: bilingual web, AI and SEO studio | Marcyan',
    description:
      'Marcyan Studio: the bilingual studio that puts AI to work for your business. Web, AI assistants and local SEO in Houston and Miami. True English and Spanish, public pricing and verifiable work.',
  },
  path: '/en/about',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'About', path: '/en/about' },
  ] as CrumbItem[],
  hero: {
    kicker: 'About us',
    h1: 'The bilingual studio that <em>puts AI to work for your business</em>',
    sub: 'We are Marcyan Studio: web, AI and local SEO for businesses in the United States. We put the latest technology to work for your business — truly bilingual, with public pricing and real work you can verify.',
    primary: { label: 'Request a free proposal', href: '#contacto' },
    secondary: { label: 'View portfolio', href: '/en/portfolio' },
    chips: ['Houston and Miami', 'Bilingual EN/ES', 'Public pricing'],
    tone: 'gold' as const,
  },
  answer: {
    q: 'What is Marcyan Studio?',
    a: 'Marcyan Studio is a bilingual web design studio based in Houston, serving Miami: custom sites, AI assistants that serve your customers, and SEO — in true English and Spanish, with public pricing and verifiable work — so your business reaches both the English- and Spanish-speaking market.',
  },
  story: {
    tag: 'Who we are',
    title: 'A <em>young</em> studio, with real work',
    paragraphs: [
      'Marcyan was born to close a clear gap: businesses in the United States deserve sites as good as the ones big agencies build, but done in true English and Spanish, with real context and at an honest price. Our bet is simple: we put the latest technology to work for your business — from a site that loads fast to the AI that serves your customers — so it always stays up to date and shows up when someone asks ChatGPT, Gemini or Meta AI.',
      'We will be transparent: we are a young, growing studio, but we are not starting from zero. We already work with real businesses in Houston and Orlando, with live sites, SEO, branding and web apps you can see in our portfolio. And there are already signals that do not depend on our word: Google\'s AI already includes our clients in its recommendations for some searches, and one of them already gets visits arriving from ChatGPT. <strong>We would rather show you real work than promise what we cannot deliver.</strong>',
    ],
    tone: 'gold' as const,
  },
  values: {
    tag: 'Our approach',
    title: 'What makes us <em>different</em>',
    intro: 'It is not a single trick: it is the combination almost no one runs together for the bilingual market.',
    items: [
      { icon: 'marcyan-ai', title: 'AI, within reach of your business', desc: 'We make AI accessible: an assistant that serves your customers for you and an HTML site that ChatGPT and Gemini can actually read, so AI finds and recommends you.' },
      { icon: 'lucide:languages', title: 'Truly bilingual', desc: 'English and Spanish written for how your customer searches, not a Google Translate button. We know the U.S. bilingual market.' },
      { icon: 'lucide:tag', title: 'Public pricing', desc: 'We publish even the price of monthly SEO and maintenance. No fine print and no sales call just to find out what it costs.' },
      { icon: 'lucide:map-pin', title: 'Local and close', desc: 'Houston and Miami as a service-area business. Direct attention, no call center, in your language and with context from your market.' },
    ],
    tone: 'gold' as const,
  } as SectionFeatures,
  founders: {
    tag: 'Founding Clients',
    title: 'Grow with us <em>from the start</em>',
    paragraphs: [
      'When we open a new market or industry, we offer Founding Client spots: in exchange for trusting a young studio in that area, you get priority attention, preferred terms and become one of our local case studies.',
      'It is honesty in both directions: <strong>we do not pretend to have clients where we do not have them yet</strong> (for example, in Miami we are just getting started), and those who arrive first get real dedication and special treatment.',
    ],
    tone: 'gold' as const,
  },
  proof: {
    tag: 'Real work',
    title: 'Real businesses that already <em>trusted us</em>',
    links: [
      { label: 'See the full portfolio', href: '/en/portfolio', desc: 'Texas Rush Remove, Move Junk Away, Julio\'s Landscape and Rosy Nails: live sites, SEO, branding and app.', icon: 'lucide:folder' },
      { label: 'Our cities', href: '/en/cities', desc: 'Houston and Miami, as a service-area business.', icon: 'lucide:map-pin' },
      { label: 'Pricing and plans', href: '/en/pricing', desc: 'The starting price of every service, no fine print.', icon: 'lucide:tag' },
    ] as RelatedLink[],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'About Marcyan, <em>straight up</em>',
    items: [
      { q: 'Do you have an office in Houston or Miami?', a: 'We work as a service-area business: we cover Houston, Miami and their metro areas remotely and efficiently, without a public address. The whole process, from proposal to delivery, we do online and in your language.' },
      { q: 'Are you a new agency? Can I trust you?', a: 'We are a young studio and we say so up front, but with real, verifiable work: sites, local SEO that already ranks, branding and a live web app for clients in Houston and Orlando, and Google\'s AI already includes some of them in its recommendations. You can see the screenshots in our portfolio, and we are happy to show you the live sites on a call.' },
      { q: 'Who is behind Marcyan?', a: 'A bilingual team focused on the U.S. market, combining design, development and artificial intelligence. You work directly with whoever builds your project, no middlemen and no call center.' },
      { q: 'How are you different from other agencies?', a: 'In the combination: custom design, AI that truly makes you visible in search engines and assistants, real bilingual with hreflang, public pricing and local presence. Someone has each piece; together, almost no one in the bilingual niche.' },
      { q: 'Do you work in English and Spanish?', a: 'Yes, it is our specialty. We design, write and serve you in English and Spanish, with the right cultural context for the Houston and Miami market.' },
      { q: 'Do you guarantee first place on Google?', a: 'No, and be wary of anyone who promises it: no one controls the algorithm. What we guarantee is honest, measurable work (fast sites, correct SEO, clear reports) and a solid base to compete.' },
    ] as FaqItem[],
  },
  cta: {
    title: 'Let\'s talk about <em>your project</em>',
    sub: 'Tell us about your business and get a personalized proposal in under 24 hours, no commitment.',
    primary: { label: 'Request a free proposal', href: '#contacto' },
    secondary: { label: 'Detailed project brief', href: '/formulario' },
    tone: 'gold' as const,
  },
};
