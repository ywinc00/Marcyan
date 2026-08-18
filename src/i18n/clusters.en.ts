// ─────────────────────────────────────────────────────────────
// EN cluster data — espejo en inglés de clusters.ts (Bloque D · bilingüe total).
// Mismo tipo ClusterPage. proof en inglés vía content.en; caso0 en inglés.
// Concepto EN = estudio bilingue (nunca la etiqueta hispana en ingles). Precios = mismos
// PRICE_ANCHORS que ES (números idénticos). Doctrina + prueba real aplican igual.
// Consumido por los wrappers finos /en/**.astro con lang="en".
// ─────────────────────────────────────────────────────────────
import { content } from './content';
import { HOUSTON_ID, MIAMI_ID, ORG_ID } from '../lib/schema';
import type { ClusterPage, ProjectItem, FeatureItem } from './clusters';

// proof: mismos proyectos REALES de la home EN por nombre (results en inglés).
const homeProjectsEn = content.en.projects.items as unknown as ProjectItem[];
const proj = (...names: string[]): ProjectItem[] =>
  names
    .map((n) => homeProjectsEn.find((p) => p.name === n))
    .filter((p): p is ProjectItem => Boolean(p));

// Caso #0 — nuestro propio sitio (honesto), versión EN.
const caso0: ProjectItem = {
  name: 'This site · Case #0',
  cat: 'Marcyan · Our own site',
  url: '/en/',
  display: 'marcyanstudio.com',
  result: 'Built in static HTML so ChatGPT and Gemini can read and cite it.',
  accent: 'teal',
};

// Contenido compartido entre las dos landings de diseño web (EN) — espejo de clusters.ts.
const webIncludesItems: FeatureItem[] = [
  { icon: 'lucide:pen-tool', title: 'Custom design', desc: 'Every site is designed from scratch around your brand and your goals. No recycled templates.' },
  { icon: 'lucide:gauge', title: 'Fast, mobile-first', desc: 'Lightweight HTML that loads in a couple of seconds, flawless on phone and desktop.' },
  { icon: 'lucide:languages', title: 'Truly bilingual, English and Spanish', desc: 'Your site in both languages, written for how your customers actually search.' },
  { icon: 'lucide:search', title: 'SEO and AI-ready', desc: 'Structure optimized for Google and so ChatGPT and Gemini can read you.' },
  { icon: 'lucide:inbox', title: 'Forms and lead capture', desc: 'Forms that reach your inbox and your database, so no prospect slips away.' },
  { icon: 'lucide:server', title: 'Hosting and domain', desc: 'We guide you through hosting, domain and the technical setup so you go live without headaches.' },
];
const webFeatures = [
  '100% custom design',
  'Multiple pages depending on the plan',
  'English and Spanish versions',
  'Base SEO optimization',
  'Built-in contact form',
  'Mobile- and AI-ready',
];
const webPriceNote =
  '$1,500 is the starting point for a professional site. Online stores (e-commerce) and projects with special features have their own scope: we detail it for you, no obligation.';

const enHoustonSeo: ClusterPage = {
  meta: {
    title: 'Local SEO in Houston: get your business found on Google | Marcyan',
    description:
      'Bilingual local SEO in Houston. We tune your Google Business Profile, your site and your reviews so customers find you in English and Spanish, and put AI to work for your business. Free proposal in 24h.',
  },
  path: '/en/houston/local-seo',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Local SEO', path: '/en/houston/local-seo' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Local SEO',
    h1: 'Local SEO in <em>Houston</em>',
    sub: 'Show up when your customers search on Google Maps and ask AI assistants. We tune your local presence so your Houston business earns more calls, visits and reviews, in English and Spanish, and we put AI to work for your business.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See how we work', href: '#proceso' },
    chips: ['Bilingual EN/ES', 'No long lock-in contracts', 'Clear reporting'],
    tone: 'gold',
  },
  answer: {
    q: 'What is local SEO and how does it help a Houston business?',
    a: 'Local SEO is the optimization work that makes your business show up when someone searches for a service "near me" in Houston. It matters because 46% of Google searches have local intent and 76% of people who search "near me" visit a business within 24 hours.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'What it includes',
    title: 'Local SEO that <em>actually</em> moves the needle',
    items: [
      { icon: 'lucide:map-pin', title: 'Google Business Profile', desc: 'We create or optimize your listing: categories, services, photos, bilingual description and posts.' },
      { icon: 'lucide:list-checks', title: 'Consistent NAP', desc: 'Your name, address and phone identical across Google, Bing, Apple Maps and directories, the foundation AI reads.' },
      { icon: 'lucide:file-text', title: 'Local content and pages', desc: 'Pages by service and city, written for your Houston market, in English and Spanish.' },
      { icon: 'lucide:star', title: 'Reviews and reputation', desc: 'We help you request and reply to reviews consistently, in each customer’s language.' },
      { icon: 'lucide:gauge', title: 'Technical SEO and speed', desc: 'A fast HTML site that Google and AI assistants can read without tripping up.' },
      { icon: 'marcyan-ai', title: 'Ready for AI (AEO)', desc: 'Your information on Bing and in a format ChatGPT and Gemini can cite, so AI recommends your business.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why local',
    title: 'Houston is a <em>big, competitive</em> market',
    paragraphs: [
      'Houston is the fourth-largest city in the United States and one of the most bilingual markets in the country. That means opportunity, and it also means competition. Showing up in Google’s local pack when someone searches for your service can be the difference between a phone call and a lost customer.',
      'We work the whole Houston metro with real context: <strong>we know the bilingual market</strong> and we write for how your customers actually search, in English and Spanish. Most agencies hand English-speaking owners a Google Translate button; we build your presence in true English and Spanish so you capture the Spanish-speaking side of your Houston market. No generic templates, no empty promises.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Local SEO, <em>from $600 a month</em>',
    price: '$600',
    unit: '/mo',
    lead: 'No long lock-in contracts. We start with the essentials and grow with the results.',
    features: [
      'Google Business Profile optimization',
      'NAP across key directories',
      '1 optimized local page per month',
      'Review management',
      'Clear monthly report',
      'Bilingual support',
    ],
    cta: { label: 'Get my free proposal', href: '#contacto' },
    note: 'The final price depends on where your business stands today and on your competition. We give you an honest scope in the proposal, with no surprises.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Houston businesses that <em>already rank</em>',
    cta: { label: 'Get my free proposal', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Local SEO in Houston, no <em>fine print</em>',
    items: [
      { q: 'How much does local SEO cost in Houston?', a: 'Our local SEO plans start at $600 a month, with no long-term contracts. The final price depends on where your business stands today, on your competition and on how many pages or locations we work on. We give you a clear scope and price in the free proposal, before you decide.' },
      { q: 'How long until I see results?', a: 'The first signals usually show up in 2 to 8 weeks: more reviews and more views on your Google listing. Solid standing in competitive searches takes 3 to 6 months of consistent work. SEO is cumulative: it’s not a switch, it’s an investment that compounds.' },
      { q: 'Do you guarantee the #1 spot on Google?', a: 'No, and be wary of anyone who promises it. Nobody controls Google’s algorithm. What we do guarantee is honest, measurable work: correct optimization, clear reporting and continuous improvement. Our commitment is to the method and to transparency, not to a number nobody can promise.' },
      { q: 'What exactly does the service include?', a: 'Optimization of your Google Business Profile, consistency of your name, address and phone (NAP) across directories, local pages by service, review management, technical SEO and preparation for AI assistants. We tune the scope to your budget and your priorities.' },
      { q: 'Do you work in English and Spanish?', a: 'Yes. We’re a bilingual studio. We optimize and create content in English and Spanish, because your customers in Houston search in both languages, and building for both is how you capture the Spanish-speaking side of your market.' },
      { q: 'Do you serve only Houston or the whole metro?', a: 'We cover Houston and its entire metro area. We work as a service-area business, so we can rank you in the areas you actually serve, without needing a public address.' },
    ],
  },
  cta: {
    title: 'Ready for Houston to <em>find you</em>?',
    sub: 'Tell us about your business and get a personalized local SEO proposal in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'A fast, custom site is the foundation of good SEO.', icon: 'lucide:layout-template' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'Answer and capture customers 24/7 with a bilingual assistant.', icon: 'lucide:messages-square' },
      { label: 'How much does local SEO cost in Houston?', href: '/en/pricing/local-seo-cost-houston', desc: 'The published monthly rate and what it includes.', icon: 'lucide:tag' },
    ],
  },
  service: {
    name: 'Local SEO in Houston',
    serviceType: 'Local SEO',
    description:
      'Local SEO for small businesses in Houston: Google Business Profile, NAP consistency, bilingual local content, review management and preparation for AI assistants.',
    path: '/en/houston/local-seo',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '600',
    monthly: true,
    providerId: HOUSTON_ID,
  },
};

const enHoustonWeb: ClusterPage = {
  meta: {
    title: 'Web Design in Houston | Custom, bilingual websites | Marcyan',
    description:
      'Professional web design in Houston for small businesses. Fast, custom, bilingual sites, ready for Google and AI. Free proposal in under 24 hours.',
  },
  path: '/en/houston/web-design',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Web Design', path: '/en/houston/web-design' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Web Design',
    h1: 'Web Design in <em>Houston</em>',
    sub: 'Custom, fast, bilingual websites for Houston businesses. Built to look incredible, load instantly and turn visits into customers, ready for Google and for AI.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See real work', href: '#proyectos' },
    chips: ['Custom, no templates', 'Bilingual EN/ES', 'Ready for AI and SEO'],
    tone: 'gold',
  },
  answer: {
    q: 'How much does a professional website cost in Houston?',
    a: 'A custom professional website in Houston starts around $1,500 and varies by the number of pages, the features and the content. Investing in good design matters: 75% of people judge a business’s credibility by its website, according to a Stanford University study.',
    source: 'Stanford University',
  },
  includes: {
    tag: 'What it includes',
    title: 'Everything a good site <em>needs</em>',
    items: webIncludesItems,
    tone: 'gold',
  },
  local: {
    tag: 'Why local',
    title: 'A site built for the <em>Houston market</em>',
    paragraphs: [
      'In Houston, most of your customers find you first on their phone. If your site is slow or looks bad, you lose them: 53% of visitors abandon a mobile page that takes more than 3 seconds to load. That’s why we build in fast, lightweight HTML.',
      'On top of that, Houston is a deeply bilingual market. A site in English only leaves out a huge share of your customers. Most agencies hand English-speaking owners a Google Translate button; we design in <strong>true English and Spanish</strong> from the start, with the right cultural context, so you capture the Spanish-speaking side of your Houston market.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Web design, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Pay per project, no mandatory monthly fees. The price depends on the scope.',
    features: webFeatures,
    cta: { label: 'Get my free proposal', href: '#contacto' },
    note: webPriceNote,
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Houston businesses with a <em>new site</em>',
    cta: { label: 'Get my free proposal', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX", 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Web design in Houston, <em>clear</em>',
    items: [
      { q: 'How much does a website cost in Houston?', a: 'A custom professional site starts at $1,500. The final price depends on how many pages you need, which features you want (bookings, payments, blog) and whether you need an online store. We give you a clear, written quote in the free proposal, with no hidden costs.' },
      { q: 'How long until my site is ready?', a: 'A typical multi-page site takes 2 to 4 weeks, depending on how quickly we receive your content (copy, photos, logo) and the number of revisions. Larger projects, like online stores, take longer. We give you a realistic timeline from the start.' },
      { q: 'Do you use templates or is it custom?', a: 'Everything custom. We design and build each site from scratch around your brand, with no recycled generic templates. That makes your site faster, more secure and truly yours.' },
      { q: 'Does the site include SEO?', a: 'Yes, we include base technical SEO: correct structure, speed, tags and a format that Google and AI assistants can read. Ongoing local ranking (Google Business Profile, reviews, monthly content) is a separate local SEO service, if you need it.' },
      { q: 'Is the site bilingual?', a: 'It can be. We build in English and Spanish from the design stage, because in Houston your customers search in both languages. If you prefer a single language, that works too: we define it based on your market.' },
      { q: 'Who maintains the site afterward?', a: 'You decide. You can manage it yourself or take our maintenance plan (from $120 a month) with backups, security updates and bilingual support. We never lock you in: the site is yours.' },
    ],
  },
  cta: {
    title: 'Your next website <em>starts here</em>',
    sub: 'Tell us about your project and get a personalized web design proposal in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'Get your new site to show up on Google and Maps.', icon: 'lucide:search' },
      { label: 'Bilingual web design', href: '/en/houston/bilingual-web-design', desc: 'Your site in true English and Spanish, not translated.', icon: 'lucide:languages' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'Add an assistant that answers and books 24/7.', icon: 'lucide:messages-square' },
      { label: 'Online store in Houston', href: '/en/houston/ecommerce', desc: 'When you want to sell online, we set up the store.', icon: 'lucide:shopping-bag' },
      { label: 'Real estate websites', href: '/en/houston/real-estate', desc: 'Are you an agent? A site with your listings and SEO by area.', icon: 'lucide:home' },
    ],
  },
  service: {
    name: 'Web Design in Houston',
    serviceType: 'Web design',
    description:
      'Custom website design and development for small businesses in Houston: fast, bilingual (English and Spanish), optimized for SEO and readable by AI assistants.',
    path: '/en/houston/web-design',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enHoustonIa: ClusterPage = {
  tool: { text: 'Your assistant answers what slips away today. See what that is worth per month.', linkLabel: 'Missed-calls calculator', href: '/en/tools#calls' },
  meta: {
    title: 'Conversational AI in Houston | An Assistant That Answers 24/7 | Marcyan',
    description:
      'An AI assistant for Houston businesses: it catches missed calls and WhatsApp messages, books appointments, and answers in English and Spanish 24/7. We set it up and maintain it for you. From $900.',
  },
  path: '/en/houston/conversational-ai',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Conversational AI', path: '/en/houston/conversational-ai' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Conversational AI',
    h1: 'An AI assistant for your <em>business</em> in Houston',
    sub: 'Losing customers because you can\'t answer in time? We put an AI assistant to work for your business: it catches missed calls and messages, books appointments, and answers in both English and Spanish around the clock. We set it up, train it on your business, and maintain it.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See how it works', href: '#faq' },
    chips: ['Real English and Spanish', 'We set it up and maintain it', 'Always hands off to a real person'],
    tone: 'teal',
  },
  answer: {
    q: 'How can an AI assistant help a business in Houston?',
    a: 'An AI assistant replies instantly, right when it matters most: it catches missed calls and messages, books appointments, and answers questions in English and Spanish around the clock. Responding to a lead within the first 5 minutes makes it up to 21 times more likely to qualify than waiting 30, according to the MIT Lead Response Management Study.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'What it does for you',
    title: 'AI that <em>never lets</em> a customer slip away',
    items: [
      { icon: 'lucide:phone-missed', title: 'Rescues missed calls', desc: 'When you can not pick up, the AI texts back instantly so the customer does not walk over to a competitor.' },
      { icon: 'lucide:message-circle', title: 'Answers WhatsApp and messages', desc: 'It replies and follows up on WhatsApp and social channels at any hour, even at 11 at night and on weekends.' },
      { icon: 'lucide:calendar-check', title: 'Books appointments on its own', desc: 'Your customers book without phone tag or back-and-forth: day or night, in English or Spanish.' },
      { icon: 'lucide:languages', title: 'Real English and Spanish', desc: 'Set up in the real English and Spanish your customers speak, in your own voice. Not robotic machine translation.' },
      { icon: 'lucide:user-round', title: 'Always hands off to a person', desc: 'When a human is needed, it hands the conversation to your team. The customer is never stuck talking to a bot.' },
      { icon: 'lucide:wrench', title: 'We set it up and maintain it', desc: 'We do not hand you software to wrestle with: we leave it running, trained on your business, and we look after it.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'Why work with us',
    title: 'A bilingual studio that <em>sets it up for you</em>, not software you fight alone',
    paragraphs: [
      'There are dozens of AI tools online that sell you a subscription and leave you on your own to configure it. For a busy business owner, that almost always ends up forgotten. We work differently: we are a bilingual studio in Houston that installs it, trains it on your business, and maintains it.',
      'We speak your language and we know your Spanish-speaking customers. We set the assistant up in real Spanish, not robot translation, so you capture the Spanish-speaking side of your Houston market, and we make sure that when a customer wants a person, they reach your team. <strong>You focus on your business; we handle the technology.</strong>',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Investment',
    title: 'An AI assistant, <em>from $900</em>',
    price: '$900',
    unit: 'starter project',
    lead: 'We start with a focused fix for your biggest pain point, not a giant project.',
    features: [
      'Assistant configured for your business',
      'In English and Spanish, in your voice',
      'Integrated with WhatsApp and your calendar',
      'Messages and replies ready to go',
      'Training for your team',
      'Setup and maintenance included',
    ],
    cta: { label: 'Automate my business', href: '#contacto' },
    note: '$900 is the starting point for an initial automation (for example, an assistant or an appointment booker). Unlike a software subscription you set up yourself, this includes the setup, the training on your business, and the maintenance. More complete projects are quoted based on scope.',
    tone: 'teal',
  },
  proof: {
    tag: 'Real automation',
    title: 'Automation that is <em>already live</em>',
    cta: { label: 'I want something like this', href: '#contacto' },
    // Rosy Nails = real booking web-app (automates scheduling) + Case #0.
    items: [...proj('Rosy Nails & Care'), caso0],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'AI for your Houston business, in <em>plain terms</em>',
    items: [
      { q: 'How much does it cost to put an AI assistant in my business?', a: 'An initial automation starts at $900 and includes the setup, the training on your business, and the maintenance: it is not just a software subscription you configure yourself. We start with a single fix for your biggest pain point and grow from there. You get a clear price in the free proposal.' },
      { q: 'Do I need to be technical to use it?', a: 'No, and that is exactly the point. We configure it, connect it, and leave it running for you, with simple training for your team. You focus on your business; we handle the technical side.' },
      { q: 'Does the assistant speak real Spanish, or does it sound like a robot?', a: 'It speaks real Spanish, in your business voice, not a robotic translation. We set it up for the Spanish your Houston customers actually speak, and in English too if you need it. The goal is for your customers to feel genuinely taken care of.' },
      { q: 'Can the AI answer my WhatsApp and book appointments on its own?', a: 'Yes. We connect the assistant to your WhatsApp, your calendar, and many of the tools you already use, so it replies to messages and books appointments at any hour. In the proposal we tell you honestly what can and can not be integrated, with no empty promises.' },
      { q: 'What if the customer wants to talk to a person?', a: 'They always can. The assistant is built to help, not to trap anyone: when a human is needed, it hands the conversation to your team. The customer is never left going in circles with a bot.' },
      { q: 'How long until it is up and running?', a: 'An initial automation is usually ready in one to three weeks, depending on which tools we connect and how ready your content is (answers, hours, services). We give you a realistic timeline from the start.' },
    ],
  },
  cta: {
    title: 'Stop losing customers because <em>no one answered</em>',
    sub: 'Tell us your biggest pain point (missed calls, unanswered WhatsApp, appointments that never get booked) and we will propose an AI solution in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'teal',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'A fast website is the foundation your AI assistant lives on.', icon: 'lucide:layout-template' },
      { label: 'How much does a chatbot cost?', href: '/en/pricing/chatbot-cost', desc: 'What an AI assistant costs and what it includes.', icon: 'lucide:tag' },
      { label: 'AI for immigration lawyers', href: '/en/houston/immigration-lawyers', desc: 'The use case: capture and book consultations 24/7 in English and Spanish.', icon: 'lucide:scale' },
    ],
  },
  service: {
    name: 'Conversational AI in Houston',
    serviceType: 'AI automation and conversational assistants',
    description:
      'Conversational AI assistants for Houston businesses: rescuing missed calls and messages, WhatsApp support, appointment booking, and 24/7 support in English and Spanish. Setup and maintenance included.',
    path: '/en/houston/conversational-ai',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '900',
    providerId: HOUSTON_ID,
  },
};

const enHoustonEcommerce: ClusterPage = {
  meta: {
    title: 'Online Store Design in Houston | Bilingual E-Commerce | Marcyan',
    description:
      'Online store design in Houston: catalog, secure payments and a true bilingual store (Shopify, WooCommerce or custom) so you sell to the Spanish-speaking side of your market too. From $2,900. Free proposal in 24h.',
  },
  path: '/en/houston/ecommerce',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Online Store', path: '/en/houston/ecommerce' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Online store',
    h1: 'Online store design in <em>Houston</em>',
    sub: 'Sell online around the clock with a custom, fast, bilingual store. Catalog, secure payments and everything ready for your Houston customers to buy from their phone, in both English and Spanish.',
    primary: { label: 'Get my store quote', href: '#contacto' },
    secondary: { label: 'See all pricing', href: '/en/pricing' },
    chips: ['Secure payments', 'Bilingual EN/ES', 'Shopify, WooCommerce or custom'],
    tone: 'gold',
  },
  answer: {
    q: 'How much does an online store cost in Houston?',
    a: 'A professional online store in Houston starts at $2,900 and includes a catalog, cart, secure payments and a bilingual version. And the investment makes sense: e-commerce already tops 16% of retail sales in the United States and grows year after year, according to the U.S. Census Bureau.',
    source: 'U.S. Census Bureau',
  },
  includes: {
    tag: 'What is included',
    title: 'A store built to <em>sell</em>',
    items: [
      { icon: 'lucide:shopping-bag', title: 'Catalog and cart', desc: 'Your products organized, with photos and variants, and a clear, easy-to-use shopping cart.' },
      { icon: 'lucide:credit-card', title: 'Secure online payments', desc: 'Accept cards and PayPal through trusted gateways like Stripe. We guide you through the account and requirements.' },
      { icon: 'lucide:smartphone', title: 'Built for the phone', desc: 'Most people buy from their phone. Your store loads fast and looks flawless on any screen.' },
      { icon: 'lucide:languages', title: 'True English and Spanish', desc: 'Sell in English and capture the Spanish-speaking side of your market too, all in the same store.' },
      { icon: 'lucide:search', title: 'Ready for Google and AI', desc: 'Structured so you get found in search engines and in assistants like ChatGPT.' },
      { icon: 'lucide:settings', title: 'The right platform for you', desc: 'Shopify, WooCommerce or a custom build: we choose it with you, based on your product and your budget.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'How we do it',
    title: 'Shopify, WooCommerce or <em>custom</em>?',
    paragraphs: [
      'We do not force a single platform on you. If you want to launch fast and sell simply, Shopify is often ideal; if you need more control or already use WordPress, WooCommerce is a better fit; and for special needs, we build custom. We choose it with you, honestly, based on your product, your volume and your budget.',
      'To sell in the United States, a few requirements fall on you: an account to receive payments and, depending on your case, your EIN from the IRS. <strong>We guide you step by step through the whole process.</strong> And because most agencies just hand you a Google Translate button, we build your store in true English and Spanish from day one, so you capture the Spanish-speaking side of your Houston market: an edge few competitors use.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Online store, <em>from $2,900</em>',
    price: '$2,900',
    unit: 'one-time project',
    lead: 'Paid per project. The price depends on the number of products and the features you need.',
    features: [
      'Custom design for your store',
      'Catalog and shopping cart',
      'Secure payments (card and PayPal)',
      'English and Spanish versions',
      'Base SEO optimization',
      'Ready for mobile and for AI',
    ],
    cta: { label: 'Get my store quote', href: '#contacto' },
    note: '$2,900 is the starting point for a professional store. The final price depends on the number of products, the features (subscriptions, shipping, integrations) and migration if you already have a store. Maintenance and product updates are quoted separately, always with a clear price.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'We build custom, and <em>your store could be next</em>',
    cta: { label: 'Be our first e-commerce case', href: '#contacto' },
    // Honesty: there is NO e-commerce client yet. We show real capability (custom
    // web app for Rosy Nails + live sites), labeled for what it is. No implying
    // they are stores. The FAQ clarifies the "Founding Client" framing.
    items: proj('Rosy Nails & Care', 'Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your online store in Houston, <em>made clear</em>',
    items: [
      { q: 'How much does it cost to build an online store in Houston?', a: 'A professional custom store starts at $2,900. The final price depends on the number of products, the features (subscriptions, shipping, integrations) and whether an existing store needs to be migrated. You get a clear, written quote in the free proposal, with no hidden costs.' },
      { q: 'Which is better for my store: Shopify or WooCommerce?', a: 'It depends on your case. Shopify is ideal to launch fast and sell simply, without worrying about the technical side; WooCommerce gives you more control and fits if you already use WordPress. For special needs, we build custom. We choose it with you, honestly, based on your product and your budget.' },
      { q: 'How do I receive card and PayPal payments?', a: 'Your store connects to secure gateways like Stripe and PayPal. To sell in the United States you need an account to receive payments and, depending on your case, your EIN from the IRS; we guide you step by step through what is yours, without leaving you alone with the complicated part.' },
      { q: 'Does the store include domain, hosting and security certificate (SSL)?', a: 'We guide you with the domain, hosting and SSL certificate so your store goes live and secure, with no headaches. Depending on the platform, some are included in its plan; we explain clearly what is paid and to whom, before we start.' },
      { q: 'Is the store bilingual in English and Spanish?', a: 'Yes, and it is one of our advantages. We build your store in English and Spanish from the start, so you sell in English and capture the Spanish-speaking side of your market: an edge few competitors in Houston use.' },
      { q: 'Do you have finished online stores I can look at?', a: 'We will be honest: we are just getting started with e-commerce, so we have not published a store case of our own yet. We do build web apps and custom sites that are already live (like the Rosy Nails booking app). That is why we offer Founding Client slots for your store, with special terms.' },
    ],
  },
  cta: {
    title: 'Start selling online in <em>Houston</em>',
    sub: 'Tell us what you sell and how many products you have, and get an online store proposal in under 24 hours, no strings attached.',
    primary: { label: 'Get my free store quote', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'If you do not need to sell online yet, start with your site.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'Get your store to show up in Google and on Maps.', icon: 'lucide:search' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'An assistant that answers and books 24/7.', icon: 'lucide:messages-square' },
    ],
  },
  service: {
    name: 'Online Store Design in Houston',
    serviceType: 'Online store design (e-commerce)',
    description:
      'Custom online store design and development for Houston businesses: catalog, cart, secure payments, bilingual (English and Spanish), on Shopify, WooCommerce or custom.',
    path: '/en/houston/ecommerce',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '2900',
    providerId: HOUSTON_ID,
  },
};

const enHoustonBranding: ClusterPage = {
  meta: {
    title: 'Logo & Brand Design in Houston | Bilingual Branding | Marcyan',
    description:
      'Custom logo and brand identity in Houston: logo, color palette, typography and a usage guide. Built for the English- and Spanish-speaking sides of your market, from $750. Free proposal in 24h.',
  },
  path: '/en/houston/branding',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Branding & Identity', path: '/en/houston/branding' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Branding & identity',
    h1: 'Logo &amp; brand design in <em>Houston</em>',
    sub: 'An identity that looks professional and feels like yours: logo, colors, typography and a coherent visual system. Designed from scratch and built to speak to both the English- and Spanish-speaking sides of your Houston market, so your business makes a great first impression with every customer.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See all pricing', href: '/en/pricing' },
    chips: ['From $750', 'Custom, not templates', 'Ready-to-use files'],
    tone: 'gold',
  },
  answer: {
    q: 'How much does logo and brand design cost in Houston?',
    a: 'Logo and brand design in Houston with Marcyan starts at $750 and includes your logo, color palette, typography and a usage guide. The investment matters: an academic study (Lindgaard et al., 2006) found that a visual first impression forms in just 50 milliseconds. You get a coherent identity, ready to use across English and Spanish.',
    source: 'Lindgaard et al., 2006 · Behaviour & Information Technology',
  },
  includes: {
    tag: "What's included",
    title: 'A <em>complete</em> brand, not just a logo',
    items: [
      { icon: 'lucide:pen-tool', title: 'Custom logo', desc: 'Designed from scratch around your business, with the variants you need for every use.' },
      { icon: 'lucide:palette', title: 'Color palette', desc: 'Colors that carry your brand personality and work on screen and in print.' },
      { icon: 'lucide:type', title: 'Typography', desc: 'The font selection that gives everything you communicate a consistent voice.' },
      { icon: 'lucide:book-open', title: 'Usage guide', desc: 'A clear document on how to use your brand, so it looks consistent everywhere.' },
      { icon: 'lucide:folder', title: 'Ready-to-use files', desc: 'Your logo in every format you need (vector, PNG, PDF), ready to go.' },
      { icon: 'lucide:sparkles', title: 'A brand designed on purpose, not a template', desc: 'We explore a wide range of directions for your brand, and a designer defines and refines the final one. Strategy and judgment behind every decision.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'How we do it',
    title: 'Broad exploration, <em>designer-led</em> decisions',
    paragraphs: [
      "Today's tools let us explore many more creative directions in less time. What doesn't change is who decides: a designer sets the direction, refines every detail and makes sure your brand says the right thing. You get a brand built with strategy, not a template spun up at random.",
      'And if you need both a brand <strong>and</strong> a website, we build them together, so your identity and your site stay consistent from day one. We design for Houston, in true English and Spanish, so your brand connects with every side of your market, including the Spanish-speaking customers most shops never reach.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Branding & identity, <em>from $750</em>',
    price: '$750',
    unit: 'one-time project',
    lead: 'Paid per project. The price depends on scope: logo only or a complete brand system.',
    features: [
      'Custom logo and its variants',
      'Color palette and typography',
      'Brand usage guide',
      'Ready-to-use files',
      'Directions explored broadly',
      'Option to add your website',
    ],
    cta: { label: 'I want my brand', href: '#contacto' },
    note: '$750 is the starting point for a brand identity. The final price depends on scope: from a logo with the essentials to a complete visual system. If you combine it with your website, we give you clear scope and a clear price for the whole project.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Brands and sites <em>built from scratch</em>',
    cta: { label: 'Start your brand', href: '#contacto' },
    // Julio's = brand + identity + site from scratch (real branding proof). The rest, custom-built.
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Brand design in Houston, <em>made clear</em>',
    items: [
      { q: 'How much does a professional logo cost in Houston?', a: 'It starts at $750 and includes your custom logo with its variants, color palette, typography and a usage guide. The final price depends on scope: from the essentials of a logo to a complete brand system. We give you a clear quote in your free proposal.' },
      { q: 'What does a brand identity package include?', a: 'Your logo and its variants, color palette, font selection, a usage guide so your brand stays consistent, and the final files in every format you need. If you want, we add your website so everything is coherent from the start.' },
      { q: "What's the difference between a logo and a brand identity?", a: 'The logo is the symbol of your business; the brand identity is the whole visual system around it: colors, typography, style and the rules for using them. A logo alone identifies you; a full identity makes your business look professional and coherent everywhere.' },
      { q: 'Can you design a brand that reaches both my English- and Spanish-speaking customers?', a: 'Yes, that is our specialty. We are a bilingual studio: we build your brand and its voice to work in true English and Spanish, with the right cultural context, so it connects with every customer in your Houston market, including the Spanish-speaking side most competitors leave on the table.' },
      { q: 'Does brand design include the website?', a: 'It can. Branding and the website are separate services, but we often combine them because together they stay coherent from the start. If you want brand and site, we give you clear scope and a clear price for the whole project.' },
      { q: 'How do you make sure my brand does not look like a template?', a: 'We explore a wide range of directions and a designer makes every strategy and refinement decision, with your business and your customer in mind. You get a brand designed on purpose, with a usage guide, not a generic logo.' },
    ],
  },
  cta: {
    title: 'Give your business a <em>brand that measures up</em>',
    sub: 'Tell us about your business and get a personalized branding proposal in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'Add your site so brand and web are coherent from the start.', icon: 'lucide:layout-template' },
      { label: 'Studio in Houston', href: '/en/houston', desc: 'All of our services for Houston businesses.', icon: 'lucide:map-pin' },
      { label: 'All pricing', href: '/en/pricing', desc: 'The starting price of every service and what it includes.', icon: 'lucide:tag' },
    ],
  },
  service: {
    name: 'Branding & Identity in Houston',
    serviceType: 'Brand design (branding)',
    description:
      'Custom logo and brand identity for Houston businesses: logo and variants, color palette, typography, usage guide and final files. Built for both the English- and Spanish-speaking sides of your market, with the option to add your website.',
    path: '/en/houston/branding',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '750',
    providerId: HOUSTON_ID,
  },
};

const enHoustonImmigration: ClusterPage = {
  tool: { text: 'Every unanswered call can be a case walking to another firm. Put a number on it.', linkLabel: 'Missed-calls calculator', href: '/en/tools#calls' },
  meta: {
    title: 'AI Marketing for Immigration Lawyers in Houston | Marcyan',
    description:
      'Capture more immigration consultations in Houston: an AI assistant that answers and books 24/7 in Spanish, a bilingual site that builds trust and local SEO. No empty promises. Free proposal.',
  },
  path: '/en/houston/immigration-lawyers',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Immigration lawyers', path: '/en/houston/immigration-lawyers' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Immigration · Houston',
    h1: 'AI marketing for <em>immigration lawyers</em> in Houston',
    sub: 'Your future clients look for help in Spanish, often at night or on weekends. We capture and book those consultations with a 24/7 AI assistant, on a bilingual site that builds trust, without promising the outcome of any case.',
    primary: { label: 'I want more consultations', href: '#contacto' },
    secondary: { label: 'See how it works', href: '#faq' },
    chips: ['Captures consultations 24/7', 'In true Spanish', 'The AI never gives legal advice'],
    tone: 'teal',
  },
  answer: {
    q: 'How does an immigration lawyer get more clients in Houston?',
    a: 'By getting there first and in Spanish: most immigration inquiries come in after hours and go to whoever answers first. Responding within 5 minutes makes a prospect 21 times more likely to qualify than at 30 minutes, according to the MIT Lead Response Management Study. An AI assistant captures and books consultations 24/7.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'What it includes',
    title: 'A system so you <em>never lose a consultation</em>',
    items: [
      { icon: 'lucide:bot-message-square', title: 'AI that captures consultations 24/7', desc: 'Answers and books the first consultation in Spanish at any hour, even in the middle of the night or on weekends. Not a single one goes cold.' },
      { icon: 'lucide:clipboard-list', title: 'Basic intake (consultation details)', desc: 'The AI gathers the general case details (name, contact, type of matter) and hands them to you ready to go. You decide who to follow up with and how.' },
      { icon: 'lucide:shield-check', title: 'Bilingual site that builds trust', desc: 'People choose a firm on trust. A professional site in English and Spanish, fast, with your practice areas and clear calls to action.' },
      { icon: 'lucide:search', title: 'Immigration local SEO', desc: 'You show up when someone searches "immigration lawyer near me" in Houston, on Google Maps and with AI assistants.' },
      { icon: 'lucide:star', title: 'Reviews and reputation', desc: 'Trust is built on real reviews. We help you request and reply to them, in each client\'s language.' },
      { icon: 'lucide:scale', title: 'No automated legal advice', desc: 'The AI books and answers the general questions (hours, location, practice areas). The legal advice comes from you: clear, ethical and with no promises.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'Why this approach',
    title: 'In immigration, the consultation you <em>don\'t answer</em> goes to someone else',
    paragraphs: [
      'Houston is one of the largest immigration markets in the country, and your future clients look for help in their own language, often at night or on weekends, when your firm is already closed. In that moment, whoever answers first keeps the case.',
      'That\'s why the heart of our system is an AI assistant that captures and books those consultations 24/7, in Spanish, <strong>without giving legal advice</strong>: it gathers the basics and hands them to you, and you handle the case. We pair it with a bilingual site that builds trust and local SEO so you get found. Most agencies hand English-speaking owners a Google Translate button; we build your presence in true English and Spanish so you capture the Spanish-speaking side of your Houston market. <strong>Honesty above all:</strong> we never promise the outcome of a case or a "guaranteed visa": that\'s not something anyone can promise.',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Investment',
    title: 'AI lead capture, <em>from $900</em>',
    price: '$900',
    unit: 'starter project',
    lead: 'We start with the assistant that captures consultations. The site and SEO get added on based on your firm.',
    features: [
      'AI assistant that captures and books 24/7',
      'In Spanish, in your firm\'s tone',
      'Integration with WhatsApp and your calendar',
      'Basic intake for every consultation',
      'Training for your team',
      'Setup and maintenance',
    ],
    cta: { label: 'I want more consultations', href: '#contacto' },
    note: '$900 is the starting point for the lead-capture assistant. The bilingual website (from $1,500) and local SEO (from $600/mo) are services that get added on based on what your firm needs. We never charge to promise the outcome of a case, because that\'s not something anyone can promise.',
    tone: 'teal',
  },
  proof: {
    tag: 'Real automation',
    title: 'Automated booking that\'s <em>already live</em>',
    cta: { label: 'I want this for my firm', href: '#contacto' },
    // Honesty: no client immigration firm yet. Rosy Nails = real web app that books
    // appointments (an honest parallel to "booking consultations") + Case #0. It is not
    // implied to be a law firm; the FAQ clarifies the Founding Client framing.
    items: [...proj('Rosy Nails & Care'), caso0],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'AI for your immigration firm, <em>clear and ethical</em>',
    items: [
      { q: 'Does the AI give my clients legal advice?', a: 'No, and that\'s deliberate. The assistant answers the general questions (hours, location, practice areas, how to book), captures the basic consultation details and books with you. The legal advice comes from you. We make it clear to the client so they know when they\'re talking to an assistant and when to you.' },
      { q: 'Do you guarantee more cases or the outcome of a matter?', a: 'No, and be wary of anyone who promises it. No ethical professional can guarantee the outcome of an immigration case or a visa. What we do is make sure not a single consultation slips away and that your firm looks professional and trustworthy. The rest, and the case, is on you.' },
      { q: 'Do you have immigration firms as clients?', a: 'We\'ll be honest: we haven\'t published a case with an immigration firm yet. We do have real automation live (like the app that books appointments for Rosy Nails) and our own site as Case #0. That\'s why we offer Founding Client spots for firms, with special terms.' },
      { q: 'How much does it cost?', a: 'The AI lead-capture assistant starts at $900. The bilingual website starts at $1,500 and local SEO at $600 a month. We build the system around your firm and give you a clear price in writing in the free proposal.' },
      { q: 'Does it work in Spanish and integrate with WhatsApp?', a: 'Yes. Spanish is the difference in this market: we set up the assistant in your clients\' Spanish and connect it to your WhatsApp and your calendar, so the consultation reaches you where they message you. We\'re a bilingual studio, and we tell you honestly what integrates and what doesn\'t.' },
      { q: 'Is it compatible with attorney advertising rules?', a: 'We work to make it so: no outcome promises, no "#1," no invented testimonials, and making it clear that the assistant is not a lawyer. You review the content before publishing; the ethical responsibility for your firm\'s communication is yours, and we respect that.' },
    ],
  },
  cta: {
    title: 'Never let an immigration consultation <em>go cold</em>',
    sub: 'Tell us how your consultations come in today and we\'ll propose an AI lead-capture system in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'teal',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Services that make up the system',
    links: [
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'The assistant that captures and books 24/7, in detail.', icon: 'lucide:messages-square' },
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The bilingual site that builds trust.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'Get found when they search for a lawyer.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'AI Marketing for Immigration Lawyers in Houston',
    serviceType: 'Digital marketing and AI lead capture for immigration firms',
    description:
      'Lead-capture system for immigration firms in Houston: an AI assistant that captures and books consultations 24/7 in Spanish (without giving legal advice), a bilingual site and local SEO. No outcome promises.',
    path: '/en/houston/immigration-lawyers',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '900',
    providerId: HOUSTON_ID,
  },
};

const enHoustonRealEstate: ClusterPage = {
  tool: { text: 'How many leads go cold because the reply came late? Put a number on it in 30 seconds.', linkLabel: 'Missed-calls calculator', href: '/en/tools#calls' },
  meta: {
    title: 'Websites for Real Estate Agents in Houston | Marcyan',
    description:
      'Web design and SEO for real estate agents in Houston: a bilingual site with your listings, buyer and seller capture, and local SEO. From $1,500. Free proposal.',
  },
  path: '/en/houston/real-estate',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Real estate', path: '/en/houston/real-estate' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Real estate · Houston',
    h1: 'Websites for <em>real estate agents</em> in Houston',
    sub: 'A bilingual site with your listings, fast on mobile and built to capture buyers and sellers, plus local SEO so you show up when people search "homes for sale" in your Houston area.',
    primary: { label: 'I want my site', href: '#contacto' },
    secondary: { label: 'See what it includes', href: '#precios' },
    chips: ['Your listings', 'Bilingual EN/ES', 'Fast on mobile'],
    tone: 'gold',
  },
  answer: {
    q: 'What does a real estate agent in Houston need on their website?',
    a: 'A site that\'s fast on mobile (that\'s where most buyers search), bilingual, with your listings presented well and forms that capture whoever wants to buy or sell. Plus local SEO so you show up when people search "homes for sale" in your area. 53% of people abandon a mobile page that takes more than 3 seconds to load.',
    source: 'Think with Google (2017)',
  },
  includes: {
    tag: 'What it includes',
    title: 'A site that <em>works</em> for your business',
    items: [
      { icon: 'lucide:home', title: 'Your listings, presented well', desc: 'Listings with photos, a map and details, easy to browse. We connect to your property source wherever possible.' },
      { icon: 'lucide:inbox', title: 'Buyer and seller capture', desc: 'Forms and an assistant that answers 24/7 so every prospect is logged, not lost in messages.' },
      { icon: 'lucide:search', title: 'Local SEO by area', desc: 'You show up when people search "homes for sale in Katy" or "real estate agent in Sugar Land," on Google and in AI.' },
      { icon: 'lucide:smartphone', title: 'Fast on mobile', desc: 'Most people house-hunt from their phone. Your site loads instantly and looks flawless on any screen.' },
      { icon: 'lucide:languages', title: 'Bilingual English and Spanish', desc: 'You speak to your Spanish-speaking buyer in their language and widen your reach in English, all on the same site.' },
      { icon: 'lucide:badge-check', title: 'Your personal brand', desc: 'In real estate, people choose YOU. Your site projects your brand, your reviews and your track record.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why this approach',
    title: 'In Houston, your buyer house-hunts <em>from their phone and in Spanish</em>',
    paragraphs: [
      'Houston\'s real estate market is huge and heavily bilingual, and the search almost always starts on the phone: someone types "homes for sale in Katy" or "townhomes in Cypress" on the way to work. If your site doesn\'t load fast or doesn\'t speak their language, you lose that buyer in seconds.',
      'That\'s why we build your site fast and bilingual, with your listings up front and capture set up right, and we back it with local SEO by area so you show up in those searches. Most agencies hand English-speaking owners a Google Translate button; we build your site in true English and Spanish so you capture the Spanish-speaking side of your Houston market. <strong>No promises on ranking:</strong> nobody controls Google\'s algorithm; what we do is give you the best honest foundation.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Real estate site, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Pay per project. The price depends on the number of pages, the listings and the integrations.',
    features: [
      'Custom design with your brand',
      'Property listings',
      'Buyer and seller capture',
      'English and Spanish versions',
      'Base SEO and fast on mobile',
      'Ready for Google and AI',
    ],
    cta: { label: 'I want my site', href: '#contacto' },
    note: '$1,500 is the starting point for a professional site. Ongoing local SEO (from $600/mo) and an AI assistant to answer 24/7 (from $900) are added on based on what you need. We give you a clear scope and price in writing, with no surprises.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Real custom sites, and <em>your real estate brand</em> could be next',
    cta: { label: 'Be our first real estate case', href: '#contacto' },
    // Honesty: no real estate agent client yet. Real proof of custom sites
    // (labeled by their actual niche/city) + Founding Client. Without implying
    // they are real estate.
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your Houston real estate site, <em>clear</em>',
    items: [
      { q: 'How much does a website for a real estate agent cost?', a: 'A professional custom site starts at $1,500. The final price depends on the number of pages, how many listings you show and what integrations you need. We give you a clear, written quote in the free proposal, with no hidden costs.' },
      { q: 'Does it connect with the MLS or an IDX?', a: 'It depends on your access and your MLS rules. Where it\'s possible, we integrate or embed a property feed; where it isn\'t, we set up your listings manually or semi-automatically. We tell you honestly what can be done in your case before we start, without promising integrations that don\'t exist.' },
      { q: 'Do you have real estate clients?', a: 'We\'ll be honest: we haven\'t published a real estate agent case yet. We do have real, verifiable custom sites in other niches (with links you can visit) and our own site as Case #0. That\'s why we offer Founding Client spots for agents, with special terms.' },
      { q: 'Does the site capture buyers and sellers?', a: 'Yes: clear forms, calls to action and, if you add it, an AI assistant that answers 24/7. The idea is that no prospect gets lost in messages: each one is logged and with you.' },
      { q: 'Is the site bilingual?', a: 'Yes. In Houston your buyer searches in both English and Spanish, so we design in both languages from the start, with the right context for your market. Building for both is how you capture the Spanish-speaking side of your market.' },
      { q: 'Do you guarantee the #1 spot on Google?', a: 'No, and be wary of anyone who promises it. Nobody controls the algorithm. We give you a solid technical foundation, honest local SEO and clear reports; leadership in competitive searches is built with consistent work, not with an impossible guarantee.' },
    ],
  },
  cta: {
    title: 'Your next <em>real estate</em> site starts here',
    sub: 'Tell us how you work and which areas you cover, and get a site and SEO proposal in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'The services that make up the system',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The service in detail: custom, fast and bilingual.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'So you show up when people search for homes in your area.', icon: 'lucide:search' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'An assistant that answers and captures prospects 24/7.', icon: 'lucide:messages-square' },
    ],
  },
  service: {
    name: 'Websites for Real Estate Agents in Houston',
    serviceType: 'Web design and SEO for real estate agents',
    description:
      'Design and development of websites for real estate agents in Houston: bilingual, fast on mobile, with property listings, lead capture and local SEO by area.',
    path: '/en/houston/real-estate',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enHoustonRestaurants: ClusterPage = {
  tool: { text: 'How many reservations and orders slip away when nobody answers? Put a number on it in 30 seconds.', linkLabel: 'Missed-calls calculator', href: '/en/tools#calls' },
  meta: {
    title: 'Restaurant Websites in Houston | Marcyan',
    description:
      'A website with a digital menu and QR code for restaurants and food trucks in Houston. Orders and reservations over WhatsApp, no commissions. From $1,500. Free proposal.',
  },
  path: '/en/houston/restaurants',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Restaurants', path: '/en/houston/restaurants' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Restaurants · Houston',
    h1: 'Websites for <em>restaurants</em> in Houston',
    sub: 'Your own site with a digital menu and a QR code right on the table, photos that make people hungry, and orders or reservations over WhatsApp. You take direct orders, keep the commission the third-party apps would skim, and reach both your English and Spanish-speaking guests on one page.',
    primary: { label: 'I want my restaurant website', href: '#contacto' },
    secondary: { label: "See what's included", href: '#precios' },
    chips: ['QR code menu', 'Orders over WhatsApp', 'No commissions'],
    tone: 'gold',
  },
  answer: {
    q: 'How can a restaurant or food truck in Houston take orders without paying commissions?',
    a: 'With your own website: a digital menu with a QR code on the table, photos of your dishes, and a button to order or reserve over WhatsApp. The customer messages you directly, without the 25% to 30% commission the delivery apps charge. 53% of people abandon a mobile page that takes more than 3 seconds to load.',
    source: 'Think with Google (2017)',
  },
  includes: {
    tag: "What's included",
    title: 'A site that <em>fills your kitchen</em>',
    items: [
      { icon: 'lucide:utensils', title: 'Digital menu with QR code', desc: 'Your menu online, ready to open from a QR code on the table or from a phone, with sections, prices, and photos.' },
      { icon: 'lucide:message-circle', title: 'Orders over WhatsApp', desc: 'The customer builds their order and it lands straight in your WhatsApp, with no third-party app taking a cut of every sale.' },
      { icon: 'lucide:calendar-check', title: 'Reservations over WhatsApp', desc: 'Anyone who wants a table messages you and books on the spot. An AI assistant answers the general questions while you are at the grill.' },
      { icon: 'lucide:image', title: 'Photos that make people hungry', desc: 'Your tacos, pupusas, ceviches, and desserts, well presented. A good photo sells a dish better than any description.' },
      { icon: 'lucide:map-pin', title: "Today's location (food trucks)", desc: 'Does your truck move around? We show where you are today so your customers can find you without losing sales.' },
      { icon: 'lucide:languages', title: 'Updatable, bilingual menu', desc: 'Change prices or pull a sold-out dish without reprinting anything, in English and Spanish, so every guest can read it.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why this approach',
    title: 'In Houston, your taqueria lives on <em>WhatsApp, not an expensive app</em>',
    paragraphs: [
      'Houston has one of the largest Spanish-speaking communities in the country, with a Hispanic diner base that grows most in the Mexican heart of Magnolia Park and the Second Ward (East End) and among the Central Americans of Gulfton and Spring Branch, where pupuserias are everywhere. Yet most taquerias and food trucks have no site of their own: they live off a Yelp or Facebook listing, sometimes put together by a third-party directory with the name misspelled and old photos.',
      'The hardest hit comes from the delivery apps: they take 25% to 30% of every order, a bite that wrecks the margin on a taco or a pupusa. That is why we build your own site, in true English and Spanish, with a QR menu, photos that make people hungry, and direct orders or reservations over WhatsApp, so you keep the full sale. <strong>You own the site and your menu:</strong> you update it when prices go up or a dish runs out, without reprinting menus or paying a commission per sale.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'A site for your restaurant, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Priced per project. The final number depends on the size of the menu, the photos, and the order or reservation features.',
    features: [
      'Digital menu with QR code',
      'Orders and reservations over WhatsApp',
      'Photo gallery of your dishes',
      'English and Spanish versions',
      'A menu you update yourself',
      'Fast on mobile and ready for Google',
    ],
    cta: { label: 'I want my restaurant website', href: '#contacto' },
    note: '$1,500 is the starting point for a professional site with a menu. An AI assistant that answers and takes orders over WhatsApp 24/7 (from $900) and local SEO to show up on Google and Maps (from $600/mo) are added on based on what you need. We give you a clear scope and price in writing, with no surprises.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Real bespoke sites, and <em>we want your restaurant</em>',
    cta: { label: 'Be our first restaurant case', href: '#contacto' },
    items: proj('Rosy Nails & Care', "Julio's Landscape TX", 'Texas Rush Remove'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your Houston restaurant website, <em>made clear</em>',
    items: [
      { q: 'How much does a website for a restaurant or food truck cost?', a: 'A professional bespoke site with a digital menu starts at $1,500. The final price depends on the size of your menu, how many photos you prepare, and whether you want orders or reservations over WhatsApp with an assistant. We hand you a clear, written estimate in the free proposal, with no hidden costs.' },
      { q: 'How do I take orders without paying a commission to Uber Eats or DoorDash?', a: 'Your site includes a button for the customer to build their order and send it straight to you over WhatsApp. The order comes to you, not to an app that keeps 25% to 30% of the sale. You collect the full amount and serve them in their language. It is your direct channel, not a third party\'s.' },
      { q: 'Do you have restaurant clients?', a: 'We will be honest: we have not published a restaurant or food truck case yet. We do have real, verifiable bespoke sites in other fields (with links you can visit), like a booking web app for a salon, an honest parallel to ordering and reserving online. That is why we offer Founding Client slots for restaurants, with special terms.' },
      { q: 'Can I change the menu myself when prices go up?', a: 'Yes. We leave your menu easy to update so you can change prices or pull a sold-out dish without reprinting menus or waiting on us. If you would rather we handle it, we can do that too with a maintenance plan (from $120 a month). The menu is yours.' },
      { q: 'Does it work for a food truck that moves around?', a: 'Yes. For food trucks we show the location and hours for the day, so your customers know where to find you today without guessing. That way you stop losing sales because you could not get the word out in time about where you are.' },
      { q: 'Are the menu and the site bilingual?', a: 'Yes. In Houston your guests search in both English and Spanish, so we design the menu and the site in both languages from the start. You speak to your Spanish-speaking customer in their language and widen your reach in English, all on the same page.' },
    ],
  },
  cta: {
    title: 'Your <em>restaurant</em> website starts here',
    sub: 'Tell us what you cook and how you want to take orders, and get a proposal for a site with a menu in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'The services that make up the system',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The service in detail: bespoke, fast, and bilingual.', icon: 'lucide:layout-template' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'An assistant that takes orders and reservations over WhatsApp 24/7.', icon: 'lucide:messages-square' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'Get your restaurant showing up on Google and Maps.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Restaurant Websites in Houston',
    serviceType: 'Web design for restaurants and food trucks',
    description:
      'Design and development of websites for restaurants, taquerias, and food trucks in Houston: a digital menu with a QR code, dish photos, orders and reservations over WhatsApp with no commissions, bilingual and fast on mobile.',
    path: '/en/houston/restaurants',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enHoustonContractors: ClusterPage = {
  tool: { text: 'How many jobs do you lose to unanswered calls? Put a number on it in 30 seconds.', linkLabel: 'Missed-calls calculator', href: '/en/tools#calls' },
  meta: {
    title: 'Websites for Contractors in Houston | Marcyan',
    description:
      'Web design and local SEO for Houston contractors: a bilingual site with before-and-after photos, free estimate requests, and AI that catches the calls you miss on the job. From $1,500. Free proposal.',
  },
  path: '/en/houston/contractors',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Contractors', path: '/en/houston/contractors' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Contractors · Houston',
    h1: 'Websites for <em>contractors</em> in Houston',
    sub: 'Your own site that shows up on Google when people search "contractor near me," with your before-and-after photos and free estimate requests. Plus AI that answers for you while you\'re on the job, so the next project doesn\'t slip away.',
    primary: { label: 'I want my site', href: '#contacto' },
    secondary: { label: 'See what\'s included', href: '#precios' },
    chips: ['Before-and-after photos', 'Free estimates', 'Bilingual EN/ES'],
    tone: 'gold',
  },
  answer: {
    q: 'What does a contractor\'s website in Houston need?',
    a: 'The most important thing is your own site that shows up on Google when people search "contractor near me" or "remodeling in Houston," with your before-and-after photos, reviews, and free estimate requests. Add AI that catches the calls you miss on the job: responding within 5 minutes makes a lead up to 21x more likely to qualify. And because we build in true English and Spanish, you also capture the Spanish-speaking side of your market.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'What\'s included',
    title: 'A site that <em>wins you jobs</em>',
    items: [
      { icon: 'lucide:search', title: 'Local SEO by trade and area', desc: 'You show up when people search "contractor near me" or "remodeling in Houston" in English, and when your Spanish-speaking customers search for the same jobs in Spanish, on Google and in AI.' },
      { icon: 'lucide:image', title: 'Before-and-after photos', desc: 'Your best work up front: a gallery of finished projects that proves quality and breaks the distrust that comes with the trade.' },
      { icon: 'lucide:phone-missed', title: 'Catch missed calls', desc: 'When you\'re up on the roof or under the sink and can\'t pick up, AI answers by text instantly so the customer doesn\'t call the next contractor.' },
      { icon: 'lucide:clipboard-list', title: 'Estimate requests', desc: 'Clear "free estimate" forms that land in your inbox organized, even when the prospect writes at night or between jobs.' },
      { icon: 'lucide:badge-check', title: 'Trust: license and reviews', desc: 'We show your "licensed and insured," your real reviews, and your guarantees, exactly what a customer needs to call you instead of someone else.' },
      { icon: 'lucide:smartphone', title: 'Fast and bilingual on mobile', desc: 'Your customer searches from their phone, often in Spanish. Your site loads instantly and speaks their language, without relying on directories.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why this approach',
    title: 'In Houston, the job goes to <em>whoever answers first</em>',
    paragraphs: [
      'Houston has one of the largest Spanish-speaking communities in the country, concentrated in neighborhoods like East End, Gulfton, Spring Branch, Pasadena, and Alief, where a contractor\'s customers are their own community. People search "contractor who speaks Spanish," "licensed and insured," and "free estimate," but they almost always end up in directories and classifieds, where you show up lumped in with everyone else and play by someone else\'s rules. Most agencies would hand you a Google Translate button; we build your site in true English and Spanish so you actually reach that side of the market.',
      'The real pain of the trade is simple: you\'re up on the roof or driving between jobs and can\'t pick up, so the customer calls the next guy. Answering fast is what decides who wins the work: reaching a prospect within the first 5 minutes makes them up to 21x more likely to qualify than waiting 30 (Lead Response Management Study, MIT). <strong>That\'s why we pair your own site and local SEO with AI that answers for you instantly:</strong> so the $5,000 or $15,000 job closes with you, not with the contractor who answered first.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'A contractor site, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Per-project pricing. The price depends on the number of pages, the project gallery, and integrations.',
    features: [
      'Custom design with your brand',
      'Before-and-after gallery',
      'Free estimate requests',
      'English and Spanish versions',
      'Base SEO and fast on mobile',
      'Ready for Google and AI',
    ],
    cta: { label: 'I want my site', href: '#contacto' },
    note: '$1,500 is the starting point for a professional site. Ongoing local SEO (from $600/mo) and AI that catches missed calls and answers 24/7 (from $900) are added based on what you need. We give you a clear scope and price in writing, no surprises.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: '<em>Real</em> local businesses in Houston',
    cta: { label: 'Be our first contractor case', href: '#contacto' },
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your Houston contractor site, <em>made clear</em>',
    items: [
      { q: 'How much does a website for a contractor cost?', a: 'A professional custom site starts at $1,500. The final price depends on how many pages you need, the size of your before-and-after gallery, and which integrations you want (estimates, AI for calls). We give you a clear, written price in the free proposal, with no hidden costs.' },
      { q: 'How does it help with the calls I miss on the job?', a: 'We add AI that answers by text the moment you can\'t pick up: it greets the customer, takes their details, and lets them know you\'ll reach out. That way they don\'t call the next contractor. Answering fast is the difference between winning the job or losing it, especially in a trade where you\'re on the job and not next to your phone.' },
      { q: 'Why do I need a site if I\'m already in the directories?', a: 'In directories and classifieds you compete lumped in with everyone else and play by their rules. Your own site shows up on Google when people search "remodeling in Houston," displays your work and your reviews, and prospects come straight to you instead of being split among your competitors.' },
      { q: 'Do you have contractor clients?', a: 'We\'ll be honest: we haven\'t published a roofing or remodeling case yet. We do work with real, verifiable local businesses in Houston, like a landscaper and a junk removal service, with links you can visit. That\'s why we offer Founding Client slots in construction and remodeling, with special terms.' },
      { q: 'Is the site bilingual?', a: 'Yes. In Houston your customers search in both English and Spanish, so we design in both languages from the start, using the job-site and neighborhood language people actually use: "free estimate," "licensed and insured," "no-obligation quote."' },
      { q: 'Do you guarantee the #1 spot on Google?', a: 'No, and be wary of anyone who promises it. No one controls the algorithm. We give you a solid technical foundation, honest local SEO, your work presented well, and clear reports; ranking in competitive searches is built with steady work, not an impossible guarantee.' },
    ],
  },
  cta: {
    title: 'Your next <em>contractor</em> site starts here',
    sub: 'Tell us what work you do and which areas you serve, and get a proposal for a site, SEO, and missed-call rescue in under 24 hours, no obligation.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'The services that make up the system',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The service in detail: custom, fast, and bilingual.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'So you show up when people search "contractor near me."', icon: 'lucide:search' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'AI that catches the calls you miss on the job.', icon: 'lucide:messages-square' },
    ],
  },
  service: {
    name: 'Websites for Contractors in Houston',
    serviceType: 'Web design and SEO for contractors and home services',
    description:
      'Design and development of websites for contractors and home services in Houston: bilingual, fast on mobile, with a before-and-after gallery, estimate requests, local SEO by trade and area, and AI that catches missed calls.',
    path: '/en/houston/contractors',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enHoustonAutoRepair: ClusterPage = {
  tool: { text: 'How many repairs end up at the shop next door because nobody picked up? Put a number on it.', linkLabel: 'Missed-calls calculator', href: '/en/tools#calls' },
  meta: {
    title: 'Websites for Auto Repair Shops in Houston | Marcyan',
    description:
      'Web design and local SEO for auto repair shops in Houston: a bilingual site with your services, location and hours, plus AI that answers WhatsApp and books appointments. From $1,500. Free proposal.',
  },
  path: '/en/houston/auto-repair',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Auto repair', path: '/en/houston/auto-repair' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Auto repair · Houston',
    h1: 'Websites for <em>auto repair shops</em> in Houston',
    sub: 'A bilingual site with your services, location and hours, built to show up when people search "auto repair near me", plus an AI assistant that answers WhatsApp and books appointments while you are under a car.',
    primary: { label: 'I want my site', href: '#contacto' },
    secondary: { label: 'See what it includes', href: '#precios' },
    chips: ['Your services and hours', 'Show up "near me"', 'AI that answers WhatsApp'],
    tone: 'gold',
  },
  answer: {
    q: 'What does an auto repair shop website in Houston need?',
    a: 'In Houston, a custom professional website for your auto repair shop starts at $1,500: fast, bilingual and geo-targeted so you show up when people search "auto repair near me". 76% of people who search "near me" visit a business within 24 hours.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'What it includes',
    title: 'A site that <em>brings cars</em> to your shop',
    items: [
      { icon: 'lucide:wrench', title: 'Your services, made clear', desc: 'General mechanics, brakes, A/C, body and paint, tires and more: every service explained so the customer knows what you do before they even call.' },
      { icon: 'lucide:map-pin', title: 'Location and hours up front', desc: 'Your address, map and hours front and center, so people know whether you are open and how to get there, without having to guess.' },
      { icon: 'lucide:search', title: 'Local "near me" SEO', desc: 'You show up when people search "auto repair near me" or "Spanish-speaking mechanic in Houston", on Google Maps and in AI answers.' },
      { icon: 'lucide:message-circle', title: 'AI that answers WhatsApp', desc: 'When you are under a car and cannot get to the phone, an assistant replies instantly by chat and WhatsApp, in English and Spanish.' },
      { icon: 'lucide:calendar-check', title: 'Appointment booking', desc: 'The customer books their service online, day or night, and stops calling three shops just to go with the first one that answers.' },
      { icon: 'lucide:smartphone', title: 'Fast on the phone', desc: 'The person with a stranded car is searching from their phone. Your site loads instantly and looks flawless on any screen.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why this approach',
    title: 'In Houston, the customer <em>calls the shop that answers first</em>',
    paragraphs: [
      'In Houston almost no one gets by without a car: public transit is limited and people depend entirely on their vehicle to get to work, often a used one with plenty of miles on it. That makes a repair an emergency, not a luxury, and the search almost always starts on the phone. A big part of your market searches in Spanish too: "Spanish-speaking mechanic", "car A/C not blowing cold", "body and paint". In neighborhoods like East End, Gulfton, Spring Branch and Pasadena, your customer is looking for someone who will speak plainly and give an estimate before touching the car. Most agencies hand you a Google Translate button and call it bilingual; we build your site in true English and Spanish so you capture that Spanish-speaking side of your market.',
      'The real problem in this trade is simple: the owner is under a car or painting and cannot get to the phone or WhatsApp, so the customer moves on to the next shop. Most competitors run on Facebook, TikTok and Nextdoor, with no site of their own, no visible hours or address. <strong>So we put the two things together:</strong> a geo-targeted site that gets you found and an AI assistant working for your shop, answering instantly so no car slips away.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'A site for your shop, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Priced per project. The final number depends on the number of pages, your services and the integrations.',
    features: [
      'Custom design with your brand',
      'Your services, location and hours',
      'True English and Spanish versions',
      'Local "near me" SEO',
      'Fast on mobile and readable by AI',
      'Contact form and customer capture',
    ],
    cta: { label: 'I want my site', href: '#contacto' },
    note: '$1,500 is the starting point for a professional site. The AI assistant that answers WhatsApp and books appointments (from $900) and ongoing local SEO (from $600/mo) are added based on what you need. We give you a clear scope and price in writing, no surprises.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Real custom sites (and we are <em>looking for your shop</em>)',
    cta: { label: 'Be our first auto repair case', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX", 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your auto repair website in Houston, <em>made clear</em>',
    items: [
      { q: 'How much does a website for an auto repair shop cost?', a: 'A custom professional site starts at $1,500. The final price depends on the number of pages, how many services you show and which integrations you need. We give you a clear, written quote in the free proposal, with no hidden costs.' },
      { q: 'Does the AI answer WhatsApp while I am under a car?', a: 'Yes, that is exactly the problem it solves. When you cannot get to the phone, the assistant replies instantly by chat and WhatsApp, in English and Spanish, gives general information about your services and books the appointment. The AI assistant starts at $900 and is added to your site.' },
      { q: 'Do you have clients in auto repair?', a: 'We will be honest: we have not published an auto repair case yet. We do have real, verifiable custom sites in other trades (with links you can visit) and our own site as Case #0. That is why we offer Founding Client slots for shops, with special terms.' },
      { q: 'Will the site show up when people search "auto repair near me"?', a: 'That is the goal. We build the site with local SEO and connect it to your Google Business Profile so you have the best possible foundation for searches like "Spanish-speaking mechanic in Houston". No one controls Google\'s algorithm, so we do not promise the top spot, but we do promise honest, measurable work.' },
      { q: 'Is the site bilingual?', a: 'Yes. In Houston your customers search in both English and Spanish, with terms like "check engine" or "alignment and balancing". We design in both languages from the start, in the real English and the Mexican and Central American Spanish your customers actually use.' },
      { q: 'Can I show my location, hours and prices?', a: 'Yes: your address, map, hours (for example Mon–Sat) and your services go clearly up front, so the customer knows whether you are open and what you do. If you want, we show estimates or ranges; you decide which prices to publish and which to leave for the visit.' },
    ],
  },
  cta: {
    title: 'Your next <em>auto repair</em> website starts here',
    sub: 'Tell us what services you offer and which part of Houston you are in, and get a proposal for the site, SEO and AI assistant in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'The services that make up the system',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The service in detail: custom, fast and bilingual.', icon: 'lucide:layout-template' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'An assistant that answers WhatsApp and books appointments 24/7.', icon: 'lucide:messages-square' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'So you show up when people search "auto repair near me".', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Websites for Auto Repair Shops in Houston',
    serviceType: 'Web design and local SEO for auto repair shops',
    description:
      'Web design and development for auto repair shops in Houston: bilingual, fast on mobile, with services, location and hours, local "near me" SEO and an AI assistant that answers WhatsApp and books appointments.',
    path: '/en/houston/auto-repair',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enHoustonBeautySalons: ClusterPage = {
  tool: { text: 'What are no-show appointments costing you? Put a number on it in 30 seconds.', linkLabel: 'No-show calculator', href: '/en/tools#appointments' },
  meta: {
    title: 'Booking Websites for Beauty Salons in Houston | Marcyan',
    description: 'Web design with online booking for beauty salons in Houston: your clients book 24/7 and an AI answers WhatsApp. From $1,500. Free proposal.',
  },
  path: '/en/houston/beauty-salons',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Beauty salons', path: '/en/houston/beauty-salons' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Beauty salons · Houston',
    h1: 'Sites with <em>online booking</em> for Houston salons',
    sub: 'A bilingual site with online scheduling so your clients book themselves around the clock, a gallery of your work, and an AI that answers WhatsApp and Instagram. For salons, barbershops, nail studios and spas that do not want to lose a single appointment.',
    primary: { label: 'I want my booking site', href: '#contacto' },
    secondary: { label: 'See what it includes', href: '#precios' },
    chips: ['24/7 booking', 'Work gallery', 'Bilingual EN/ES'],
    tone: 'gold',
  },
  answer: {
    q: 'What does a beauty salon website in Houston need?',
    a: 'A Houston salon site needs online booking so your clients can schedule themselves 24/7, a gallery of your work, and an AI assistant that answers WhatsApp and Instagram instantly. Responding within 5 minutes makes a lead up to 21 times more likely to qualify.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'What it includes',
    title: 'A site that <em>fills your calendar</em> on its own',
    items: [
      { icon: 'lucide:calendar-check', title: '24/7 online booking', desc: 'Your clients pick the service, stylist and time from their phone, without calling or waiting for a reply. Every booking lands in one place.' },
      { icon: 'lucide:bot-message-square', title: 'AI that answers and books', desc: 'An assistant replies to WhatsApp and Instagram instantly, handles the basics (hours, prices, services) and guides the client to book.' },
      { icon: 'lucide:image', title: 'Gallery of your work', desc: 'Cuts, color, nails and beard work presented well. A new client sees your style before deciding and arrives knowing what she wants.' },
      { icon: 'lucide:smartphone', title: 'Fast on mobile', desc: 'Almost every salon search starts on the phone. Your site loads instantly and looks flawless on any screen.' },
      { icon: 'lucide:search', title: 'Local SEO by area', desc: 'You show up when people search "beauty salon near me" or "barber who speaks Spanish" in your part of Houston, on Google and in AI.' },
      { icon: 'lucide:languages', title: 'Bilingual English and Spanish', desc: 'You speak to your Spanish-speaking clients in their own language, which is exactly why many choose a salon: being able to explain the cut they want.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why this approach',
    title: 'In Houston, your client looks for a salon <em>from her phone and in Spanish</em>',
    paragraphs: [
      'Houston has one of the largest Spanish-speaking populations in the country, and in neighborhoods like Gulfton, Spring Branch, the East End and the Bellaire Blvd and S Gessner corridors, people look for their salon on the phone and in Spanish: they type "nail salon near me" or "barber who speaks Spanish" and book with whoever answers first. Many clients choose a salon precisely because there they can explain the cut or color they want in their own language.',
      'The pain in this trade is real: a good share of appointments end in no-shows, and a WhatsApp message left unread for hours while you tend to someone in the chair is a client who already booked somewhere else. That is why we set up your online booking, your gallery and an AI that answers instantly, and we back it with local SEO. <strong>No promises about rankings:</strong> nobody controls Google\'s algorithm; what we do is give you the best honest foundation so you stop losing appointments.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Salon site with booking, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Paid per project. The price depends on the number of pages, the services to book and the scheduling integrations.',
    features: [
      'Custom design with your brand',
      'Online scheduling and booking',
      'Gallery of your work',
      'English and Spanish versions',
      'Base SEO and fast on mobile',
      'Ready for Google and AI',
    ],
    cta: { label: 'I want my booking site', href: '#contacto' },
    note: '$1,500 is the starting point for a professional site with booking. An AI assistant that answers WhatsApp and Instagram 24/7 (from $900) and ongoing local SEO (from $600/mo) are added on according to what you need. We give you a clear scope and price in writing, with no surprises and no per-appointment commission.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'A real Houston salon already books with its <em>own web app</em>',
    cta: { label: 'I want something like this for my salon', href: '#contacto' },
    items: proj('Rosy Nails & Care', "Julio's Landscape TX", 'Texas Rush Remove'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your salon with online booking, <em>made clear</em>',
    items: [
      { q: 'How much does a booking website for a beauty salon cost?', a: 'A professional, custom site with online scheduling starts at $1,500. The final price depends on the number of pages, how many services you want to be bookable and which calendar integrations you need. We hand you a clear, written quote in the free proposal, with no hidden costs.' },
      { q: 'How does online booking work?', a: 'Your client goes in from her phone, picks the service, stylist and time, and is booked without calling or waiting for a reply. Every booking lands in one place, not scattered across calls, WhatsApp and Instagram. We adapt the flow to how your salon works.' },
      { q: 'Do you have clients in the salon industry?', a: 'Yes. Rosy Nails & Care is a real nail salon in Houston for which we built a custom web app where clients book their appointments and browse nail inspiration. It is verifiable work in the same sector, not a borrowed example.' },
      { q: 'Can I stop paying a commission on every appointment?', a: 'That is exactly the idea. Today many salons book through Fresha or Booksy and pay a commission on every appointment. With your own site and your own calendar, bookings come straight to you. If you prefer to keep using your current tool, we can also connect it; we will tell you what is possible in your case.' },
      { q: 'Does the AI answer WhatsApp and Instagram?', a: 'Yes, if you add it. The assistant instantly answers common questions (hours, prices, services) and guides the client to book, so no message goes unanswered while you are working in the chair. The AI assistant starts at $900.' },
      { q: 'Do you guarantee the #1 spot on Google?', a: 'No, and be wary of anyone who promises it. Nobody controls the algorithm. We give you a solid technical foundation, honest local SEO and clear reports; showing up at the top of competitive searches is built with consistent work, not with an impossible guarantee.' },
    ],
  },
  cta: {
    title: 'Your salon with <em>online booking</em> starts here',
    sub: 'Tell us what services you offer and how you work, and get a proposal for a site with scheduling and SEO in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Services that make up the system',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The service in detail: custom, fast and bilingual.', icon: 'lucide:layout-template' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'An assistant that answers WhatsApp and Instagram and books 24/7.', icon: 'lucide:messages-square' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'So you show up when people search "salon near me".', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Booking Websites for Beauty Salons in Houston',
    serviceType: 'Web design with online booking for beauty salons',
    description: 'Design and development of websites with online scheduling for beauty salons, barbershops, nail studios and spas in Houston: bilingual, fast on mobile, with 24/7 booking, work gallery, AI assistant and local SEO.',
    path: '/en/houston/beauty-salons',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enHoustonDentalClinics: ClusterPage = {
  tool: { text: 'What do no-shows cost your practice every month? Put a number on it in 30 seconds.', linkLabel: 'No-show calculator', href: '/en/tools#appointments' },
  meta: {
    title: 'Websites for Dental Clinics in Houston | Marcyan',
    description:
      'Bilingual website for dental clinics in Houston: builds trust, shows up for "Spanish-speaking dentist near me" and books appointments 24/7. From $1,500. Free proposal.',
  },
  path: '/en/houston/dental-clinics',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Dental clinics', path: '/en/houston/dental-clinics' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Dental clinics · Houston',
    h1: 'Websites for <em>dental clinics</em> in Houston',
    sub: 'A bilingual site that builds trust, shows your services and insurance clearly, and shows up when people search for a Spanish-speaking dentist near them. Plus an assistant that books appointments and answers common questions (hours, insurance, directions) 24/7, in Spanish.',
    primary: { label: 'I want my site', href: '#contacto' },
    secondary: { label: 'See what it includes', href: '#precios' },
    chips: ['True Spanish, not translated', 'Books appointments 24/7', 'The AI never gives dental advice'],
    tone: 'gold',
  },
  answer: {
    q: 'What does a dental clinic website in Houston need?',
    a: 'A dental clinic website in Houston needs to be bilingual, fast on mobile and reassuring, with local SEO for "Spanish-speaking dentist near me" and an assistant that books appointments 24/7. 46% of Google searches have local intent.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'What it includes',
    title: 'A site that <em>builds trust</em> and books appointments',
    items: [
      { icon: 'lucide:shield-check', title: 'Trust from the first click', desc: 'A clean, professional site that reassures a nervous patient: your team, your services and your reviews, presented with warmth.' },
      { icon: 'lucide:calendar-check', title: 'Appointment booking 24/7', desc: 'Your patients request or book their appointment day or night, without having to call during office hours or wait for someone to pick up.' },
      { icon: 'lucide:languages', title: 'Bilingual Spanish and English', desc: 'Spanish is not an "extra": it is how your patient understands a treatment. We speak their language from the very first screen.' },
      { icon: 'lucide:credit-card', title: 'Clear insurance and payment plans', desc: 'We show which insurance you accept, whether you see patients without insurance or on Medicaid, and your payment plans, to remove the fear of a surprise bill.' },
      { icon: 'lucide:search', title: 'Local SEO in Spanish', desc: 'You show up when people search for a Spanish-speaking dentist in Houston or a dental clinic near them, on Google Maps and in AI assistants.' },
      { icon: 'lucide:bot-message-square', title: 'An assistant that answers the general questions', desc: 'An AI assistant answers hours, services, accepted insurance and directions, in Spanish. It never gives a diagnosis or dental advice: that comes from you.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why this approach',
    title: 'In Houston, your patient is looking for a dentist <em>who explains things in Spanish</em>',
    paragraphs: [
      'The Spanish-speaking dental patient in Houston is often first-generation, with limited English, and concentrated in areas of very high Latino density like Gulfton, Sharpstown, Spring Branch, the East End and the Hillcroft and Westpark corridor in the Southwest. For them, Spanish is not a preference: it is what they need to understand what will be done in their mouth, how much it costs and what insurance you accept, before they sit in the chair.',
      'That is why we build a site that inspires trust and speaks their language, with your services, insurance and payment plans clearly laid out, and we back it with local SEO and an assistant that books and answers the general questions 24/7 (many patients work shifts and cannot call during the day). <strong>Care above all:</strong> the AI never gives a diagnosis or dental advice and never promises clinical results; it only books and guides, and professional care always comes from you.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'A site for your dental clinic, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Pay per project. The price depends on the number of pages, the services you show and the integrations.',
    features: [
      'Custom design with your brand',
      'Clear services, insurance and payment plans',
      'Appointment request or booking',
      'Spanish and English versions',
      'Base SEO and fast on mobile',
      'Ready for Google and AI',
    ],
    cta: { label: 'I want my site', href: '#contacto' },
    note: '$1,500 is the starting point for a professional site. Ongoing local SEO (from $600/mo) and an AI assistant that books and answers the general questions 24/7 (from $900) are added based on what you need. We give you a clear scope and price in writing, with no surprises.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Real custom work, and <em>we are looking for your</em> dental clinic',
    cta: { label: 'Be our first dental clinic', href: '#contacto' },
    // Honesty: no dental clinic client yet. Real proof from custom sites
    // (labeled by their real niche/city) + Founding Client. Web-led page (gold):
    // 3 real projects, WITHOUT caso0 (caso0 is reserved for AI-led pages).
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your dental clinic site in Houston, <em>clear</em>',
    items: [
      { q: 'How much does a website for a dental clinic cost?', a: 'A professional custom site starts at $1,500. The final price depends on the number of pages, how many services you show and what integrations you need (appointment booking, AI assistant). We give you a clear, written quote in the free proposal, with no hidden costs.' },
      { q: 'Does the AI give dental advice or a diagnosis to my patients?', a: 'No, and that is deliberate. The assistant answers the general questions (hours, services, insurance you accept, payment plans, directions) and helps book the appointment. It never gives a diagnosis or dental advice: that comes from your team. We make it clear to the patient so they know when they are talking to an assistant and when to the clinic.' },
      { q: 'Does the assistant actually book appointments?', a: 'Yes. Depending on your flow, the assistant captures the appointment request (name, general reason, preferred time) and leaves it ready for your team, or connects with your scheduling system where possible. The goal is that no patient is lost for calling after hours, without promising integrations that do not exist in your case.' },
      { q: 'Do you have dental clinics as clients?', a: "We will be honest: we have not published a dental clinic case yet. We do have real, verifiable work, like a web app that books appointments for a salon (Rosy Nails) and custom sites in other niches, plus our own site as Case #0. That is why we offer Founding Client spots for clinics, with special terms." },
      { q: 'Does the site show insurance and payment plans?', a: 'Yes, and in Houston that is key. We clearly show which insurance you accept, whether you see patients without insurance or on Medicaid, and your payment plans, to remove the patient\'s fear of a surprise bill before they call. You give us the exact information and we present it clearly and honestly.' },
      { q: 'Do you guarantee more patients or the #1 spot on Google?', a: 'No, and be wary of anyone who promises it. Nobody controls the algorithm and we cannot guarantee clinical or business results. We give you a solid technical foundation, a site that builds trust, honest local SEO and clear reporting; the rest is built with consistent work, not with an impossible guarantee.' },
    ],
  },
  cta: {
    title: 'Your next <em>dental clinic</em> site starts here',
    sub: 'Tell us what services you offer and what insurance you accept, and get a proposal for a site, SEO and AI booking in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Services that make up the system',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The service in detail: custom, fast and bilingual.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'So you show up for "Spanish-speaking dentist near me".', icon: 'lucide:search' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'An assistant that books and answers the general questions 24/7.', icon: 'lucide:messages-square' },
    ],
  },
  service: {
    name: 'Websites for Dental Clinics in Houston',
    serviceType: 'Web design and SEO for dental clinics',
    description:
      'Design and development of websites for dental clinics and practices in Houston: bilingual, fast on mobile, with clear services and insurance, appointment booking, local SEO and an AI assistant that answers the general questions (without giving dental advice or a diagnosis).',
    path: '/en/houston/dental-clinics',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enHoustonKaty: ClusterPage = {
  meta: {
    title: 'Web Design in Katy, TX: websites and local SEO | Marcyan',
    description:
      'Web design and local SEO for businesses in Katy, TX: a bilingual site, fast on mobile and ranked by area (Cinco Ranch, Mason Rd, Grand Parkway 99). From $1,500. Free proposal.',
  },
  path: '/en/houston/katy',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Katy', path: '/en/houston/katy' },
  ],
  hero: {
    badge: 'Katy, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Web design · Katy',
    h1: 'Web design in <em>Katy</em>, for your local business',
    sub: 'A bilingual, mobile-fast, custom-built site, plus local SEO so families in Cinco Ranch, Cross Creek Ranch and all of Katy find you when they search by their own area, not buried in generic "Houston" results.',
    primary: { label: 'I want my site', href: '#contacto' },
    secondary: { label: 'See what it includes', href: '#precios' },
    chips: ['Local SEO by area', 'Bilingual EN/ES', 'Fast on mobile'],
    tone: 'gold',
  },
  answer: {
    q: 'What does a business website in Katy, TX need?',
    a: 'In Katy you need a site that is fast on mobile, bilingual and built with local SEO for your corridor (Mason Rd, Grand Parkway 99). 46% of Google searches have local intent and 76% of people who search "near me" visit a business within 24 hours.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'What it includes',
    title: 'A site built to <em>win customers in Katy</em>',
    intro: 'Custom web design and local SEO, in a single honest system, for home-service and professional businesses across west Houston.',
    items: [
      { icon: 'lucide:layout-template', title: '100% custom design', desc: 'Your site is designed from scratch around your brand and your services. No recycled templates that look just like your competitor’s.' },
      { icon: 'lucide:smartphone', title: 'Fast on mobile', desc: 'The family in Cinco Ranch judges you from their phone. Your site loads instantly and looks flawless on any screen.' },
      { icon: 'lucide:search', title: 'Local SEO by area', desc: 'You show up when people search "plumber in Katy" or "remodeling near me," by your corridor (Mason Rd, FM 1463, Grand Parkway 99), on Google and in AI.' },
      { icon: 'lucide:languages', title: 'Bilingual Spanish and English', desc: 'You speak to Katy’s Spanish-speaking community in their language and to English-speaking customers in theirs, all on the same site.' },
      { icon: 'lucide:inbox', title: 'Forms and lead capture', desc: 'Every prospect lands in your inbox and is logged. In a competitive area, whoever answers first wins the job.' },
      { icon: 'lucide:navigation', title: 'Your business on the Katy map', desc: 'We structure your area and service information so it’s clear who you serve and where, and you read as a true local of Katy.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why this approach',
    title: 'In Katy, customers search <em>by their area, not by "Houston"</em>',
    paragraphs: [
      'Katy went from a railroad town to one of the most sought-after master-planned hubs in west Houston: Cinco Ranch, Cross Creek Ranch, Cane Island and Elyson draw thousands of young families every year, many who move "for the schools" of Katy ISD. That new household constantly needs services (remodeling, HVAC, landscaping, cleaning, plumbing, food), and it almost always starts searching on mobile by its own area or corridor, not by a generic "Houston," because Katy residents identify with Katy.',
      'That is why your website should lead with Katy and load fast on mobile, where the first impression is decided, and serve a bilingual clientele equally (English-speaking families and a growing Spanish-speaking community). We build your site custom and back it with local SEO by area so you show up in those searches along Mason Rd, FM 1463 and the Grand Parkway. Most agencies hand English-speaking owners a Google Translate button; we build your site in true English and Spanish so you capture the Spanish-speaking side of your Katy market. <strong>No promises of position:</strong> nobody controls Google’s algorithm; what we give you is the best honest foundation to compete.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Your site in Katy, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'We start with a professional, bilingual, custom-built site. Local SEO and AI are added according to what your Katy business needs.',
    features: [
      '100% custom design',
      'Spanish and English versions',
      'Fast on mobile and ready for AI',
      'Local SEO optimization by area',
      'Integrated contact form',
      'Guidance with domain and hosting',
    ],
    cta: { label: 'I want my site', href: '#contacto' },
    note: '$1,500 is the starting point for a professional site. Local SEO (from $600/mo) and an AI assistant (from $900) are services that are added according to what your business needs. We spell it out in writing in the free proposal, with no commitment.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Real businesses from the <em>Houston metro area</em>',
    cta: { label: 'I want something like this for my business', href: '#contacto' },
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Web design in Katy, <em>clear and with no fine print</em>',
    items: [
      { q: 'Do you build websites specifically for Katy businesses?', a: 'Yes. We work the Houston metro area, and Katy is part of that metro, so we design your site to lead with Katy: your area, your corridors (Mason Rd, FM 1463, Grand Parkway 99) and your communities (Cinco Ranch, Cross Creek Ranch). Katy customers search by Katy, not by a generic "Houston."' },
      { q: 'Do you have clients in Katy?', a: 'We’ll be honest: our published work is from the Houston metro area, and we label it by its real city (Houston, TX). We’re not going to invent a "Katy" client that doesn’t exist. Katy is part of that same Houston market we already serve, and your site is built with copy that is 100% specific to your area.' },
      { q: 'How much does a website cost in Katy?', a: 'A professional, bilingual, custom-built site starts at $1,500 (one-time project). Local SEO starts at $600 a month and an AI assistant at $900. We put the system together according to your business and give you a clear price in writing in the free proposal.' },
      { q: 'Do you guarantee the #1 spot on Google in Katy?', a: 'No, and be wary of anyone who promises it. Nobody controls Google’s algorithm. What we do is give you a fast, bilingual site and honest local SEO, structured around your area and your corridors, so you have the best possible foundation to compete in Katy searches.' },
      { q: 'Does the site work in Spanish and English?', a: 'Yes, and in Katy it matters: you serve English-speaking families and a Spanish-speaking community that keeps growing. We build your site in both languages, written for how each customer actually searches, all in one place, so you capture both sides of your Katy market.' },
      { q: 'Why is it so important that it loads fast on mobile?', a: 'Because that’s where it’s decided. The family that just moved to Cinco Ranch searches for you from their phone and compares two or three options in seconds. A slow site, or one that looks bad on mobile, loses that customer before they ever call you; that’s why we build in lightweight HTML that loads instantly.' },
    ],
  },
  cta: {
    title: 'Make Katy find you <em>first</em>',
    sub: 'Tell us what you do and which part of Katy you serve, and we’ll propose a site and a local SEO plan in under 24 hours, with no commitment.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Services that make up the system',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The service in detail: custom, fast and bilingual.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'Get found when people search by your area.', icon: 'lucide:search' },
      { label: 'Houston and its areas', href: '/en/houston', desc: 'All the services and areas we cover in Houston.', icon: 'lucide:map-pin' },
    ],
  },
  service: {
    name: 'Web Design and Local SEO in Katy, TX',
    serviceType: 'Web design and local SEO for businesses',
    description:
      'Custom web design and local SEO for businesses in Katy, Texas: a bilingual site, fast on mobile and ranked by area (Cinco Ranch, Mason Rd, Grand Parkway 99). From $1,500. No promises of position.',
    path: '/en/houston/katy',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enHoustonSugarLand: ClusterPage = {
  meta: {
    title: 'Web Design in Sugar Land, TX: premium, bilingual sites | Marcyan',
    description:
      'Web design and local SEO for businesses in Sugar Land (Town Square, First Colony, Fort Bend). A premium, fast, bilingual site in English and Spanish. From $1,500. Free proposal.',
  },
  path: '/en/houston/sugar-land',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Sugar Land', path: '/en/houston/sugar-land' },
  ],
  hero: {
    badge: 'Sugar Land, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Web design and SEO · Sugar Land',
    h1: 'Premium web design in <em>Sugar Land</em>',
    sub: 'Custom-built sites and local SEO for businesses in Sugar Land and Fort Bend County. A site that looks the part next to Town Square and First Colony: fast, professional and bilingual in English and Spanish, ready for a demanding customer.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See what it includes', href: '#precios' },
    chips: ['Custom premium design', 'Bilingual EN/ES', 'Local SEO by area'],
    tone: 'gold',
  },
  answer: {
    q: 'How much does a professional website cost for a business in Sugar Land?',
    a: 'A custom professional site in Sugar Land starts from $1,500 as a one-time project. It is an investment that carries weight: 75% of people judge a business\'s credibility by its website, and in an affluent, professional market like Fort Bend, the first impression decides who gets the call.',
    source: 'Stanford University',
  },
  includes: {
    tag: 'What it includes',
    title: 'A site worthy of Sugar Land',
    intro: 'Custom premium design plus local SEO, built for a professional, multicultural audience that decides fast.',
    items: [
      { icon: 'lucide:pen-tool', title: 'Custom premium design', desc: 'Every site is designed from scratch around your brand. No recycled templates, with the visual quality your Sugar Land customers already expect.' },
      { icon: 'lucide:languages', title: 'Bilingual English and Spanish', desc: 'English as the main business language and Spanish where it adds real value, for a multicultural, demanding clientele.' },
      { icon: 'lucide:search', title: 'Local SEO by area', desc: 'We optimize you for Town Square, First Colony, Riverstone, Telfair and the "near me" searches in your field.' },
      { icon: 'lucide:smartphone', title: 'Fast on mobile', desc: 'Lightweight HTML that loads in a couple of seconds, flawless on phone and desktop, because a professional will not wait.' },
      { icon: 'lucide:badge-check', title: 'Visible credibility', desc: 'Reviews, certifications and trust signals presented well, so the site backs up your local reputation.' },
      { icon: 'lucide:inbox', title: 'Forms and lead capture', desc: 'Forms that reach your inbox and your database, so no prospect gets lost between inquiries.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why this approach',
    title: 'In Sugar Land, not just any site will do',
    paragraphs: [
      'Sugar Land is a thriving city southwest of Houston, the hub of Fort Bend County, one of the most diverse counties in the United States. Large South Asian, East Asian and Spanish-speaking communities live side by side here, and the commercial heart beats at Sugar Land Town Square and First Colony. The business fabric is professional services and mid-to-upper-tier consumer spending: clinics, law firms, accountants, restaurants, boutiques and real estate offices, where the customer judges credibility by the site and expects top-tier design.',
      'That is why the angle here is not "cheaper," it is premium and bilingual. <strong>Your site competes against the polished image of all of Sugar Land, where local SEO is fiercely contested.</strong> We lead with custom design that communicates clearly to a multicultural clientele, English and Spanish where it adds value, and local SEO by area (Town Square, First Colony, Riverstone, Telfair) so you show up when they search by area name or "near me." Most agencies hand English-speaking owners a Google Translate button; we build your presence in true English and Spanish so you capture the Spanish-speaking side of your Fort Bend market.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Website in Sugar Land, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'A single payment for a premium, custom, bilingual site, with no monthly fees tied to the design.',
    features: [
      '100% custom design (no templates)',
      'Multiple pages depending on the plan',
      'English and Spanish versions',
      'Base local SEO optimization',
      'Integrated contact form',
      'Ready for mobile and for AI',
    ],
    cta: { label: 'Get my free proposal', href: '#contacto' },
    note: '$1,500 is the starting point for a professional site. Local SEO (from $600/mo) and a conversational AI (from $900) are added if you need them; online stores have their own scope. We detail it all for you, no strings attached.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Real work from the Houston metro area',
    cta: { label: 'Get my free proposal', href: '#contacto' },
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Web design in Sugar Land, <em>made clear</em>',
    items: [
      { q: 'How much does a website cost in Sugar Land?', a: 'A custom professional site starts from $1,500 as a one-time project (a single payment). The final price depends on the number of pages and features; we send you a clear, no-obligation proposal before we start.' },
      { q: 'Do you work with businesses outside downtown Sugar Land?', a: 'Yes. We serve all of Sugar Land and Fort Bend County: Town Square, First Colony, Riverstone, Telfair and nearby areas, plus the rest of the Houston metro area.' },
      { q: 'Does the site come in Spanish and English?', a: 'Yes. We treat English as the main business language and Spanish where it adds real value for your clientele. In a market as multicultural as Sugar Land, that bilingual flexibility makes the difference.' },
      { q: 'Can you improve my Google ranking for Sugar Land?', a: 'We optimize your site and your local presence (Google Business Profile, reviews, content by area) so customers find you. We do not promise the #1 spot: nobody serious can guarantee an exact position on Google, but we do work with a clear method and clear reporting.' },
      { q: 'Do you have clients in Sugar Land?', a: 'We show real work from the Houston metro area (Sugar Land is part of that metro and of Fort Bend), labeled by the actual city of each project. We would rather be honest than inflate a case that does not apply.' },
      { q: 'How long does it take to deliver the site?', a: 'It depends on the scope, but a typical site takes a few weeks once we have your content and your sign-off on the design. In the proposal we give you a realistic estimated timeline.' },
    ],
  },
  cta: {
    title: 'Your Sugar Land business deserves a premium site',
    sub: 'Tell us what you do and who you serve. We will send you a free, bilingual, no-obligation proposal.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'The services that make up the system',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The web design service in detail: what it includes, how we work and what we deliver.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'Show up on Google and Maps when your customer searches by area or "near me."', icon: 'lucide:search' },
      { label: 'Houston and its metro area', href: '/en/houston', desc: 'Everything we do in Houston, Fort Bend and the suburbs like Sugar Land.', icon: 'lucide:building-2' },
    ],
  },
  service: {
    name: 'Web Design and Local SEO in Sugar Land',
    serviceType: 'Web design and local SEO',
    description:
      'Custom premium web design and local SEO for businesses in Sugar Land and Fort Bend County: a bilingual site in English and Spanish, fast on mobile and optimized by area (Town Square, First Colony). From $1,500.',
    path: '/en/houston/sugar-land',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enHoustonBilingual: ClusterPage = {
  meta: {
    title: 'Bilingual Web Design in Houston (English and Spanish) | Marcyan',
    description:
      'Bilingual web design in Houston: your site in true English and Spanish, written the way your customers search, not run through Google Translate. From $1,500. Free proposal.',
  },
  path: '/en/houston/bilingual-web-design',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Houston', path: '/en/houston' },
    { name: 'Bilingual web design', path: '/en/houston/bilingual-web-design' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Bilingual web design · Houston',
    h1: 'Bilingual <em>web design</em> in Houston (English and Spanish)',
    sub: 'A real site in two languages for your Houston business: written the way your customers actually search in English and in Spanish, not run through Google Translate. With separate URLs, hreflang and native-speaker review.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See what it includes', href: '#precios' },
    chips: ['True English and Spanish', 'No Google Translate', 'Contact by WhatsApp'],
    tone: 'gold',
  },
  answer: {
    q: 'What is a truly bilingual website and why does it matter in Houston?',
    a: 'It is a site with native content in both English and Spanish, written the way each customer searches (not translated word for word), with separate URLs and hreflang so Google shows the right version. It matters because 75% of people judge a business\'s credibility by its website.',
    source: 'Stanford University',
  },
  includes: {
    tag: 'How we make it bilingual',
    title: 'A methodology, not a <em>translate button</em>',
    intro: 'We do not slap a Google Translate widget at the bottom. We build each language from the start, with the technical structure so Google and AI understand they are two versions of your business.',
    items: [
      { icon: 'lucide:pen-tool', title: 'Native content, not translated', desc: 'We write each language separately, the way your customers really speak and search. Your Spanish-speaking customers notice a robotic phrase instantly, and that costs you trust.' },
      { icon: 'lucide:search', title: 'The words people actually search', desc: 'We do not translate the English keyword literally. Your customer searches "pagina web" or colloquial terms from their country, not the translation of "web design". We research how they search in each language.' },
      { icon: 'lucide:languages', title: 'Separate URLs and hreflang', desc: 'One URL per language with hreflang tags set up correctly, so Google knows which version to show and the two pages do not cannibalize each other.' },
      { icon: 'lucide:users', title: 'Native-speaker review', desc: 'The pages that convert are reviewed by a native speaker, so the Spanish sounds natural and the English does too, with no stitched-together phrases or cultural-context errors.' },
      { icon: 'lucide:smartphone', title: 'Clear language switch on mobile', desc: 'A visible, easy language selector on the phone, because the same person searches in English during the day and in Spanish in the evening depending on the context.' },
      { icon: 'lucide:phone-call', title: 'Closing over WhatsApp', desc: 'A WhatsApp button in both languages, because your customers would rather message you there than fill out a form or send an email.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why bilingual in Houston',
    title: 'Your Houston customer <em>searches in two languages</em>',
    paragraphs: [
      'In corridors like East End, Gulfton, Sharpstown, Near Northside, Alief and Spring Branch, your customers are genuinely bilingual and switch languages by the moment: the same person searches in English in the morning and in Spanish in the afternoon, browses Instagram in Spanish and Google in English. A site that exists in only one language leaves half of your market unable to find you.',
      'And there is a real gap of opportunity: showing up in Spanish-language results in your Houston ZIP faces far less competition than the same service in English. <strong>A bilingual plumber in Sharpstown competes with few others in Spanish versus hundreds in English.</strong> That is why we do not translate the keyword: we write each language the way people really search and claim that space almost no one is working.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Bilingual site, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Pay per project, with no mandatory monthly fees. Both languages are built into the design from the start, not tacked on as an extra at the end.',
    features: [
      '100% custom design',
      'Native content in English and Spanish',
      'Separate URLs per language + hreflang',
      'Native-speaker review',
      'Base SEO in both languages',
      'WhatsApp button and form',
    ],
    cta: { label: 'Get my free proposal', href: '#contacto' },
    note: '$1,500 is the starting point for a professional bilingual site. The number of pages and features define the final scope. Local SEO (from $600/mo) and a conversational AI (from $900) are added if you need them.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Houston businesses with a <em>custom site</em>',
    cta: { label: 'Get my free proposal', href: '#contacto' },
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Bilingual web design, no <em>fine print</em>',
    items: [
      { q: 'How is this different from putting Google Translate on my site?', a: 'Very different. Google Translate produces robotic phrases that your Spanish-speaking customers notice instantly and that undercut your business\'s credibility. We write each language from scratch, the way your customers really search and speak, and a native speaker reviews the pages that convert.' },
      { q: 'How much does a bilingual website cost in Houston?', a: 'It starts at $1,500 per project, with both languages built into the design. The final price depends on how many pages you need and which features you want (bookings, payments, blog). We give you a clear, written quote in the free proposal.' },
      { q: 'Isn\'t it enough to just translate the site I already have?', a: 'Translating word for word almost never works for Google. People do not search the literal translation of the English keyword: they search "pagina web" or colloquial terms from their country. That is why we research how your customer searches in each language and write for that, we do not translate.' },
      { q: 'How do you keep the two versions from competing on Google?', a: 'With separate URLs per language and hreflang tags configured correctly from the start. That way Google understands they are two versions of the same business and shows the right one based on the user\'s language, without them cannibalizing each other.' },
      { q: 'Do you guarantee the #1 spot on Google?', a: 'No. Nobody serious can guarantee the #1 spot, and be wary of anyone who promises it. What we do is give you a solid technical foundation in both languages and take advantage of the fact that there is far less local competition in Spanish in your ZIP, which is a real edge.' },
      { q: 'Can I reach my customers over WhatsApp from the site?', a: 'Yes, and we recommend it. Your customers usually prefer WhatsApp over email or a form. We add a visible button in both languages so messaging you is one tap, with no friction.' },
    ],
  },
  cta: {
    title: 'Your site in <em>two languages</em> starts here',
    sub: 'Tell us about your business and get a personalized bilingual site proposal in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The web design service in detail: scope, process and everything it includes.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'Get your bilingual site to show up on Google and Maps in both languages.', icon: 'lucide:search' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'Add an assistant that answers in English and Spanish 24/7.', icon: 'lucide:messages-square' },
      { label: 'Online store in Houston', href: '/en/houston/ecommerce', desc: 'When you want to sell online, we set up your bilingual store.', icon: 'lucide:shopping-bag' },
    ],
  },
  service: {
    name: 'Bilingual Web Design in Houston (English and Spanish)',
    serviceType: 'Bilingual web design',
    description:
      'Design and development of bilingual websites (English and Spanish) for small businesses in Houston: native content in each language, separate URLs with hreflang and native-speaker review, instead of machine translation.',
    path: '/en/houston/bilingual-web-design',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enMiamiWeb: ClusterPage = {
  meta: {
    title: 'Web Design in Miami | Custom, bilingual sites | Marcyan',
    description:
      'Professional web design for Miami businesses and the metro area. Custom, fast, bilingual sites, ready for Google and AI. Free proposal in 24h.',
  },
  path: '/en/miami/web-design',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Miami', path: '/en/miami' },
    { name: 'Web Design', path: '/en/miami/web-design' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Web Design',
    h1: 'Web Design in <em>Miami</em>',
    sub: 'Custom, fast, bilingual websites for Miami businesses and the metro area. Elite design that loads instantly, turns visits into customers and gets you ready for Google and AI.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See real work', href: '#proyectos' },
    chips: ['Custom, no templates', 'Bilingual EN/ES', 'Founding Client spots'],
    tone: 'gold',
  },
  answer: {
    q: 'How much does a professional website cost in Miami?',
    a: 'A custom professional website for a Miami business starts around $1,500 and varies with the number of pages, features and content. Design is not a luxury: 75% of people judge a business’s credibility by its website, according to a Stanford University study.',
    source: 'Stanford University',
  },
  includes: {
    tag: 'What it includes',
    title: 'Everything a good site <em>needs</em>',
    items: webIncludesItems,
    tone: 'gold',
  },
  local: {
    tag: 'Why Miami',
    title: 'Miami is <em>bilingual by nature</em>',
    paragraphs: [
      'Miami is one of the most bilingual markets in the country, close to 69% of Miami-Dade, from Hialeah to Doral and from Brickell to Kendall, and Spanish is not an "extra": it’s the language of your customers. A site that doesn’t speak their language, and that doesn’t load fast on mobile, leaves money on the table. Most agencies hand English-speaking owners a Google Translate button; we build your site in true English and Spanish so you capture the Spanish-speaking side of your Miami market.',
      '<strong>Let’s be transparent:</strong> we’re just opening our design operation in Miami, so we don’t show local case studies here yet. What we do show is real, verifiable work we’ve already done for other businesses (in Houston and Orlando), and we’re looking for our first Miami Founding Clients to add cases from this city.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Web design, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Pay per project, no mandatory monthly fees. The price depends on the scope.',
    features: webFeatures,
    cta: { label: 'Get my free proposal', href: '#contacto' },
    note: webPriceNote,
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Recent <em>verifiable</em> work',
    cta: { label: 'Be our first case in Miami', href: '#contacto' },
    // Labeled with their real city (Houston/Orlando). They are not from Miami and we don’t imply it.
    items: proj('Texas Rush Remove', 'Move Junk Away', "Julio's Landscape TX", 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Web design in Miami, no <em>runaround</em>',
    items: [
      { q: 'How much does a website cost in Miami?', a: 'A custom professional site starts at $1,500. The final price depends on how many pages you need, which features you want (bookings, payments, blog) and whether you need an online store. We give you a clear, written quote in the free proposal, with no hidden costs.' },
      { q: 'Do you have clients in Miami?', a: 'We’ll be honest: we’re just starting our operation in Miami, so we don’t have published cases from this city yet. We do have real, verifiable work done for businesses in Houston and Orlando, with links you can visit. That’s why we offer Founding Client spots in Miami, with special terms.' },
      { q: 'What is a Founding Client?', a: 'It’s one of our first clients in Miami. In exchange for trusting a young studio in this city, you get priority attention, preferred terms and you become one of our local case studies. Spots are limited, because we give real dedication to each one.' },
      { q: 'Do you use templates or build custom?', a: 'Everything custom. We design and code every site from scratch around your brand, with no recycled generic templates. That makes your site faster, more secure and truly yours.' },
      { q: 'Is the site bilingual?', a: 'Yes, and in Miami it’s practically essential. We design in Spanish and English from the start, in the Caribbean and Latin American Spanish your customers actually speak. Your site speaks to Miami in its own language, so you capture the Spanish-speaking side of your market.' },
      { q: 'Do you serve the whole Miami area?', a: 'Yes. We work Miami and its metro area as a service-area business, remotely and efficiently. You don’t need to visit an office: the whole process, from proposal to delivery, happens online and in your language.' },
    ],
  },
  cta: {
    title: 'Be one of our first <em>cases in Miami</em>',
    sub: 'We’re looking for Founding Clients in Miami. Tell us about your project and get a personalized proposal in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Local SEO in Miami', href: '/en/miami/local-seo', desc: 'Get your new site to show up on Google and Maps.', icon: 'lucide:search' },
      { label: 'Conversational AI in Miami', href: '/en/miami/conversational-ai', desc: 'Answer and capture customers 24/7 with a Spanish-speaking assistant.', icon: 'lucide:messages-square' },
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The same service, at our home base.', icon: 'lucide:layout-template' },
    ],
  },
  service: {
    name: 'Web Design in Miami',
    serviceType: 'Web design',
    description:
      'Custom website design and development for Miami businesses and the metro area: fast, bilingual (Spanish and English), optimized for SEO and readable by AI assistants.',
    path: '/en/miami/web-design',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '1500',
    providerId: MIAMI_ID,
  },
};

const enMiamiIa: ClusterPage = {
  tool: { text: 'Your assistant answers what slips away today. See what that is worth per month.', linkLabel: 'Missed-calls calculator', href: '/en/tools#calls' },
  meta: {
    title: 'Conversational AI in Miami | An assistant that answers 24/7 | Marcyan',
    description:
      'An AI assistant for Miami businesses: it answers WhatsApp and missed calls, books appointments and helps customers in Spanish 24/7. We install and maintain it for you. From $900.',
  },
  path: '/en/miami/conversational-ai',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Miami', path: '/en/miami' },
    { name: 'Conversational AI', path: '/en/miami/conversational-ai' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Conversational AI',
    h1: 'An AI assistant for your <em>business</em> in Miami',
    sub: 'Losing customers because you can\'t answer in time? We put an AI assistant to work for you: it answers WhatsApp and missed calls, books appointments and helps your Spanish-speaking customers around the clock. We install it, train it on your business and keep it running.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See how it works', href: '#faq' },
    chips: ['True Spanish, not a translation', 'We install and maintain it', 'It always hands off to a person'],
    tone: 'teal',
  },
  answer: {
    q: 'How can an AI assistant help a business in Miami?',
    a: 'In Miami your customers message you on WhatsApp, and whoever answers first wins the sale. An AI assistant replies instantly, books appointments and helps customers in Spanish 24 hours a day. Answering within the first 5 minutes makes you 21 times more likely to qualify a lead than waiting 30, according to the MIT Lead Response Management Study.',
    source: 'Lead Response Management Study (MIT)',
  },
  includes: {
    tag: 'What it does for you',
    title: 'AI that <em>never lets</em> a customer slip away',
    items: [
      { icon: 'lucide:message-circle', title: 'Answers WhatsApp and messages', desc: 'WhatsApp is the channel your Spanish-speaking customers in Miami use to reach you. The AI replies and follows up at any hour, even in the middle of the night.' },
      { icon: 'lucide:calendar-check', title: 'Books appointments on its own', desc: 'Your restaurant, aesthetic clinic or shop fills the calendar without you stopping to work: customers book on their own, day or night.' },
      { icon: 'lucide:phone-missed', title: 'Rescues missed calls', desc: 'When you can\'t pick up, the AI replies by text instantly so the customer doesn\'t walk over to the shop next door.' },
      { icon: 'lucide:languages', title: 'Speaks the way Miami speaks', desc: 'We set it up in the true Spanish your customers actually use, with their tone and accent. It doesn\'t sound like a translation or a robot, and it detects when they\'d rather speak English.' },
      { icon: 'lucide:user-round', title: 'Always hands off to a person', desc: 'When a human is needed, it passes the conversation to your team. The customer is never stuck with a robot.' },
      { icon: 'lucide:wrench', title: 'We install and maintain it', desc: 'We don\'t hand you software to wrestle with: we leave it up and running, trained on your business, and we look after it.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'Why work with us',
    title: 'A bilingual studio that <em>installs it for you</em>, not software you fight alone',
    paragraphs: [
      'Online there are dozens of AI apps that sell you a subscription and leave you alone to configure it. For a busy business, that almost always ends up forgotten. We work differently: we install it, train it on your business and maintain it; you don\'t touch a thing.',
      'In Miami that matters even more: here the first contact happens over WhatsApp, from a cafe in Hialeah to a clinic in Brickell, and most often in Spanish. We set the assistant up to speak the way your customers do and reply in a heartbeat. Most agencies hand English-speaking owners a Google Translate button; we build your assistant in true English and Spanish so you capture the Spanish-speaking side of your Miami market. <strong>You focus on your business; we handle the technology.</strong>',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Investment',
    title: 'An AI assistant, <em>from $900</em>',
    price: '$900',
    unit: 'starter project',
    lead: 'We start with a concrete solution to your biggest pain point, not with a huge project.',
    features: [
      'Assistant configured to fit your business',
      'In the Spanish your customers speak',
      'Integration with WhatsApp and your calendar',
      'Messages and replies ready to go',
      'Training for your team',
      'Installation and maintenance',
    ],
    cta: { label: 'I want to automate my business', href: '#contacto' },
    note: '$900 is the starting point for an initial automation (for example, an assistant or an appointment scheduler). Unlike a software subscription you configure yourself, here we include installation, training on your business and maintenance. More complete projects are quoted based on scope.',
    tone: 'teal',
  },
  proof: {
    tag: 'Real automation',
    title: 'Automation that\'s <em>already live</em>',
    cta: { label: 'I want something like this', href: '#contacto' },
    // Rosy Nails = real booking web-app (Houston) + Case #0. NOT from Miami.
    items: [...proj('Rosy Nails & Care'), caso0],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'AI for your business in Miami, in <em>plain terms</em>',
    items: [
      { q: 'How much does it cost to put an AI assistant in my business?', a: 'An initial automation starts at $900 and includes installation, training on your business and maintenance: it\'s not just a software subscription you configure yourself. We start with a single solution to your biggest pain point and grow from there. We give you a clear price in the free proposal.' },
      { q: 'Do I need to know technology to use it?', a: 'No, and that\'s exactly the idea. We configure it, connect it and leave it running for you, with simple training for your team. You focus on your business; we take care of the technical side.' },
      { q: 'Does the assistant speak Miami Spanish or does it sound like a robot?', a: 'It speaks the way your customers do: the true Spanish that\'s actually used in Miami, with the tone of your business. It\'s not a robotic translation, and it detects when a customer would rather speak English.' },
      { q: 'Can the AI answer my WhatsApp and book appointments on its own?', a: 'Yes. We connect the assistant to your WhatsApp, your calendar and the tools you already use, so it replies and books appointments or reservations at any hour, ideal for restaurants, clinics, shops and practices. In the proposal we tell you honestly what can and can\'t be integrated.' },
      { q: 'What if the customer wants to talk to a person?', a: 'They always can. The assistant is built to help, not to trap anyone: when a human is needed, it passes the conversation to your team. The customer is never left going in circles with a robot.' },
      { q: 'How long until it\'s up and running?', a: 'An initial automation is usually ready in one to three weeks, depending on which tools we connect and how ready your content is (replies, hours, services). We give you a realistic timeline from the start.' },
    ],
  },
  cta: {
    title: 'Stop losing customers because <em>no one answered</em>',
    sub: 'In Miami, the customer who messages you on WhatsApp and gets no reply goes to someone else. Tell us your biggest pain point and we\'ll propose an AI solution in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'teal',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Web design in Miami', href: '/en/miami/web-design', desc: 'A fast site is the foundation your AI assistant lives on.', icon: 'lucide:layout-template' },
      { label: 'How much does a chatbot cost?', href: '/en/pricing/chatbot-cost', desc: 'The price of an AI assistant and what it includes.', icon: 'lucide:tag' },
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'The same service, at our home base.', icon: 'lucide:messages-square' },
    ],
  },
  service: {
    name: 'Conversational AI in Miami',
    serviceType: 'AI automation and conversational assistants',
    description:
      'Conversational AI assistants for Miami businesses: WhatsApp and missed-call rescue, appointment booking and 24/7 support in the Spanish your Miami customers speak. Installation and maintenance included.',
    path: '/en/miami/conversational-ai',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '900',
    providerId: MIAMI_ID,
  },
};

const enMiamiSeo: ClusterPage = {
  meta: {
    title: 'Local SEO in Miami: get your business found on Google | Marcyan',
    description:
      'Bilingual local SEO in Miami. We tune your Google Business Profile, your site and your reviews so customers find you across Miami-Dade in English and Spanish, and put AI to work for your business. Free proposal in 24h.',
  },
  path: '/en/miami/local-seo',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Miami', path: '/en/miami' },
    { name: 'Local SEO', path: '/en/miami/local-seo' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Local SEO',
    h1: 'Local SEO in <em>Miami</em>',
    sub: 'Show up when your customers search on Google Maps and ask AI assistants. We tune your local presence so your Miami business earns more calls, visits and reviews, in English and Spanish, and we put AI to work for your business.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See how we work', href: '#proceso' },
    chips: ['Bilingual EN/ES', 'No long lock-in contracts', 'Clear reporting'],
    tone: 'gold',
  },
  answer: {
    q: 'What is local SEO and how does it help a Miami business?',
    a: 'Local SEO is the optimization work that makes your business show up when someone searches for a service "near me" in Miami. It matters because 46% of Google searches have local intent and 76% of people who search "near me" visit a business within 24 hours.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'What it includes',
    title: 'Local SEO that <em>actually</em> moves the needle',
    items: [
      { icon: 'lucide:map-pin', title: 'Google Business Profile', desc: 'We create or optimize your listing: categories, services, photos, bilingual description and posts.' },
      { icon: 'lucide:list-checks', title: 'Consistent NAP', desc: 'Your name, address and phone identical across Google, Bing, Apple Maps and directories, the foundation AI reads.' },
      { icon: 'lucide:file-text', title: 'Local content and pages', desc: 'Pages by service and area, written for your Miami market, in English and Spanish.' },
      { icon: 'lucide:star', title: 'Reviews and reputation', desc: 'We help you request and reply to reviews consistently, in each customer\'s language.' },
      { icon: 'lucide:gauge', title: 'Technical SEO and speed', desc: 'A fast HTML site that Google and AI assistants can read without tripping up.' },
      { icon: 'marcyan-ai', title: 'Ready for AI (AEO)', desc: 'Your information on Bing and in a format ChatGPT and Gemini can cite, so AI recommends your business.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why local',
    title: 'In Miami, Spanish <em>runs the market</em>',
    paragraphs: [
      'Miami-Dade is one of the most Spanish-speaking markets in the United States: close to 69% of its population is Latino, according to the U.S. Census Bureau (ACS 2023). Here Spanish is not an "extra", it is the language of commerce, and showing up in Google Maps\' local pack, in Spanish, can be the difference between a phone call and a lost customer.',
      'We work the whole Miami-Dade area with real context: Doral, Hialeah, Kendall, Coral Gables, Brickell and more. Most agencies hand English-speaking owners a Google Translate button; we build your presence in true English and Spanish, in the Spanish your customers actually speak, so you capture the Spanish-speaking side of your Miami market. No generic templates, no empty promises.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Local SEO, <em>from $600 a month</em>',
    price: '$600',
    unit: '/mo',
    lead: 'No long lock-in contracts. We start with the essentials and grow with the results.',
    features: [
      'Google Business Profile optimization',
      'NAP across key directories',
      '1 optimized local page per month',
      'Review management',
      'Clear monthly report',
      'Bilingual support',
    ],
    cta: { label: 'Get my free proposal', href: '#contacto' },
    note: 'The final price depends on where your business stands today and on your competition. We give you an honest scope in the proposal, with no surprises.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Real, verifiable SEO, and <em>we want your business</em> in Miami',
    cta: { label: 'Be our first case in Miami', href: '#contacto' },
    // Honesty: there is NO Miami SEO client. Proof is labeled by its real
    // city (Houston). We never imply it is from Miami; the title and FAQ make it clear.
    items: proj('Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Local SEO in Miami, no <em>fine print</em>',
    items: [
      { q: 'How much does local SEO cost in Miami?', a: 'Our local SEO plans start at $600 a month, with no long-term contracts. The final price depends on where your business stands today, on your competition and on how many pages or locations we work on. We give you a clear scope and price in the free proposal, before you decide.' },
      { q: 'Do you have clients in Miami?', a: 'We\'ll be honest: we\'re just opening our operation in Miami, so we don\'t have published cases from this city yet. We do have real, verifiable SEO work done for businesses in Houston, with links you can visit. That\'s why we offer Founding Client spots in Miami, with special terms.' },
      { q: 'How long until I see results?', a: 'The first signals usually show up in 2 to 8 weeks: more reviews and more views on your Google listing. Solid standing in competitive searches takes 3 to 6 months of consistent work. SEO is cumulative: it\'s not a switch, it\'s an investment that compounds.' },
      { q: 'Do you guarantee the #1 spot on Google?', a: 'No, and be wary of anyone who promises it. Nobody controls Google\'s algorithm. What we do guarantee is honest, measurable work: correct optimization, clear reporting and continuous improvement. Our commitment is to the method and to transparency, not to a number nobody can promise.' },
      { q: 'What exactly does the service include?', a: 'Optimization of your Google Business Profile, consistency of your name, address and phone (NAP) across directories, local pages by service, review management, technical SEO and preparation for AI assistants. We tune the scope to your budget and your priorities.' },
      { q: 'Do you work in English and Spanish?', a: 'Yes. We\'re a bilingual studio. In Miami, Spanish is the language of commerce, so we prioritize content in the Spanish your customers actually use, and we do it in English too. Building for both is how you capture the Spanish-speaking side of your market.' },
    ],
  },
  cta: {
    title: 'Be one of our first <em>cases in Miami</em>',
    sub: 'We\'re looking for Founding Clients in Miami. Tell us about your business and get a local SEO proposal in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Web design in Miami', href: '/en/miami/web-design', desc: 'A fast, custom site is the foundation of good SEO.', icon: 'lucide:layout-template' },
      { label: 'Conversational AI in Miami', href: '/en/miami/conversational-ai', desc: 'Answer and capture customers 24/7 with a bilingual assistant.', icon: 'lucide:messages-square' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'The same service, at our base of operations.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Local SEO in Miami',
    serviceType: 'Local SEO',
    description:
      'Local SEO for small businesses in Miami: Google Business Profile, NAP consistency, bilingual local content, review management and preparation for AI assistants.',
    path: '/en/miami/local-seo',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '600',
    monthly: true,
    providerId: MIAMI_ID,
  },
};

const enMiamiEcommerce: ClusterPage = {
  meta: {
    title: 'Online Store Design in Miami | Bilingual E-Commerce | Marcyan',
    description:
      'Online store design in Miami: catalog, secure payments and bilingual (Shopify, WooCommerce or custom-built). From $2,900. Free proposal in 24h.',
  },
  path: '/en/miami/ecommerce',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Miami', path: '/en/miami' },
    { name: 'Online Store', path: '/en/miami/ecommerce' },
  ],
  hero: {
    badge: 'Miami, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Online store',
    h1: 'Online store design in <em>Miami</em>',
    sub: 'Sell online around the clock with a custom, fast, bilingual store. Catalog, secure payments and everything ready so your Miami customers can buy from their phone, in English and Spanish.',
    primary: { label: 'Get a quote for my store', href: '#contacto' },
    secondary: { label: 'See all pricing', href: '/en/pricing' },
    chips: ['Secure payments', 'Bilingual EN/ES', 'Shopify, WooCommerce or custom'],
    tone: 'gold',
  },
  answer: {
    q: 'How much does an online store cost in Miami?',
    a: 'A professional online store in Miami starts at $2,900 and includes a catalog, cart, secure payments and a bilingual version. And in Miami, the gateway to Latin America, a store lets you sell to your Spanish-speaking customers locally and beyond: e-commerce already tops 16% of retail sales in the U.S., according to the U.S. Census Bureau.',
    source: 'U.S. Census Bureau',
  },
  includes: {
    tag: 'What it includes',
    title: 'A store built to <em>sell</em>',
    items: [
      { icon: 'lucide:shopping-bag', title: 'Catalog and cart', desc: 'Your products organized, with photos and variants, and a clear, easy-to-use shopping cart.' },
      { icon: 'lucide:credit-card', title: 'Secure payments, from anywhere', desc: 'Accept cards and PayPal with trusted gateways like Stripe, including the customer paying from Latin America. We guide you through the account and the requirements.' },
      { icon: 'lucide:smartphone', title: 'Built for the phone', desc: 'Most people buy from their phone. Your store loads fast and looks flawless on any screen.' },
      { icon: 'lucide:languages', title: 'Bilingual for Miami and the region', desc: 'Sell in Spanish to your Spanish-speaking customers in Miami, and widen your reach in English, all in the same store.' },
      { icon: 'lucide:search', title: 'Ready for Google and AI', desc: 'A structure optimized so people find you in search engines and in assistants like ChatGPT.' },
      { icon: 'lucide:settings', title: 'The right platform for you', desc: 'Shopify, WooCommerce or a custom-built solution: we pick it with you based on your product and your budget.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'How we do it',
    title: 'Shopify, WooCommerce or <em>custom-built</em>?',
    paragraphs: [
      'Miami has stores for everything, from the bakery in Hialeah to the fashion brand in Wynwood, and each one calls for its own platform. We don\'t force a single one on you: Shopify to launch fast and sell simply, WooCommerce if you need more control or already use WordPress, and custom-built for the special cases. We choose it with you, honestly, based on your product and your budget.',
      'To sell in the United States there are requirements that are yours: an account to receive payments and, depending on the case, your EIN from the IRS. <strong>We guide you step by step through the whole process.</strong> And because Miami is the gateway to Latin America and your market is bilingual, we design your store in English and Spanish from the start, so you can sell to your Spanish-speaking customers in Miami and beyond.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Online store, <em>from $2,900</em>',
    price: '$2,900',
    unit: 'one-time project',
    lead: 'One-time project fee. The price depends on the number of products and the features you need.',
    features: [
      'Custom design for your store',
      'Catalog and shopping cart',
      'Secure payments (card and PayPal)',
      'English and Spanish version',
      'Baseline SEO optimization',
      'Ready for mobile and for AI',
    ],
    cta: { label: 'Get a quote for my store', href: '#contacto' },
    note: '$2,900 is the starting point for a professional store. The final price depends on the number of products, the features (subscriptions, shipping, integrations) and migration if you already have a store. Maintenance and product updates are quoted separately, always with a clear price.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'We build custom, and <em>we\'re looking for your store</em> in Miami',
    cta: { label: 'Be our first e-commerce case', href: '#contacto' },
    // Honesty: NO e-commerce or Miami client yet. Real capability (Rosy Nails
    // web-app + live Houston sites), labeled for what it is.
    items: proj('Rosy Nails & Care', 'Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your online store in Miami, <em>made clear</em>',
    items: [
      { q: 'How much does it cost to build an online store in Miami?', a: 'A custom professional store starts at $2,900. The final price depends on the number of products, the features (subscriptions, shipping, integrations) and whether an existing store needs to be migrated. We give you a clear, written estimate in the free proposal, with no hidden costs.' },
      { q: 'Which is better for my store: Shopify or WooCommerce?', a: 'It depends on your case. Shopify is ideal for launching fast and selling simply, without worrying about the technical side; WooCommerce gives you more control and fits if you already use WordPress. For special needs we build custom. We choose it with you, honestly, based on your product and your budget.' },
      { q: 'How do I receive card and PayPal payments?', a: 'Your store connects to secure gateways like Stripe and PayPal. To sell in the United States you need an account to receive payments and, depending on the case, your EIN from the IRS; we guide you step by step through what\'s yours, without leaving you alone with the complicated part.' },
      { q: 'Does the store include domain, hosting and security certificate (SSL)?', a: 'We guide you with the domain, the hosting and the SSL certificate so your store goes live and secure, without headaches. Depending on the platform, some are included in its plan; we explain clearly what is paid and to whom, before we start.' },
      { q: 'Is the store bilingual, and can I sell to customers outside Miami?', a: 'Yes to both. We design your store in English and Spanish from the start, so you can sell to your Spanish-speaking customers in Miami. And because Miami is the gateway to Latin America, we make it ready to receive orders and payments from customers in other countries, if your product lends itself to it.' },
      { q: 'Do you have online stores already built in Miami that I can see?', a: 'We\'ll be honest: we\'re getting started with e-commerce and our Miami operation, so we haven\'t published a store case of our own in this city yet. We do build web-apps and custom sites that are already live (like the booking app for Rosy Nails). That\'s why we offer Founding Client spots for your store, with special terms.' },
    ],
  },
  cta: {
    title: 'Start selling online in <em>Miami</em>',
    sub: 'In Miami, a bilingual online store opens up the local market and the region. Tell us what you sell and how many products you have, and get a proposal in under 24 hours, no strings attached.',
    primary: { label: 'Get my store quote', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Web design in Miami', href: '/en/miami/web-design', desc: 'If you don\'t need to sell online yet, start with your site.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Miami', href: '/en/miami/local-seo', desc: 'Get your store to show up on Google and Maps.', icon: 'lucide:search' },
      { label: 'Online store in Houston', href: '/en/houston/ecommerce', desc: 'The same service, at our home base.', icon: 'lucide:shopping-bag' },
    ],
  },
  service: {
    name: 'Online Store Design in Miami',
    serviceType: 'Online store design (e-commerce)',
    description:
      'Design and development of custom online stores for businesses in Miami: catalog, cart, secure payments, bilingual (English and Spanish), on Shopify, WooCommerce or custom-built.',
    path: '/en/miami/ecommerce',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '2900',
    providerId: MIAMI_ID,
  },
};

const enMiamiDoral: ClusterPage = {
  meta: {
    title: 'Web Design and SEO in Doral (Doralzuela) | Marcyan',
    description:
      'Web design, local SEO and conversational AI for Doral businesses: arepa spots, Venezuelan bakeries, professional services and import/export firms. Bilingual and AI-ready. From $1,500. Free proposal.',
  },
  path: '/en/miami/doral',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Miami', path: '/en/miami' },
    { name: 'Doral', path: '/en/miami/doral' },
  ],
  hero: {
    badge: 'Doral, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Doral · Miami-Dade',
    h1: 'Web design and SEO for businesses in <em>Doral</em>',
    sub: 'Bilingual sites, local SEO and conversational AI for Doral businesses, the "Doralzuela." So your arepa spot, bakery, professional service or import/export firm shows up on Google and in ChatGPT, and welcomes customers over WhatsApp, in Spanish and English.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See what it includes', href: '#precios' },
    chips: ['Bilingual EN/ES', 'AI-ready', 'Customers reach you on WhatsApp'],
    tone: 'gold',
  },
  answer: {
    q: 'Why does a Doral business need a bilingual website and local SEO?',
    a: 'Because Doral customers search and message in Spanish, often over WhatsApp. A bilingual site with local SEO makes you visible when someone searches "near me": 46% of Google searches have local intent and 76% of people who search "near me" visit a business within 24 hours.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'What it includes',
    title: 'A complete system for <em>your Doral business</em>',
    items: [
      { icon: 'lucide:layout-template', title: 'Custom website', desc: 'Designed from scratch for your brand, fast on mobile and built for the Venezuelan and Colombian customer in Doral.' },
      { icon: 'lucide:languages', title: 'Bilingual Spanish and English', desc: 'In the Spanish actually spoken in Doral, and in English for the U.S.-Latin America trade corridors.' },
      { icon: 'lucide:search', title: 'Local SEO for Doral', desc: 'We optimize your Google Business Profile and your site for "web design Doral," "arepa spots in Doral" and searches near Downtown and CityPlace Doral.' },
      { icon: 'lucide:bot-message-square', title: 'Conversational AI', desc: 'A bilingual assistant that answers and captures customers 24/7, ideal for the Doral customer who would rather message than call.' },
      { icon: 'lucide:scan-search', title: 'AI-ready (AEO)', desc: 'Structure and schema so ChatGPT and Gemini can read and cite you when someone asks about options in Doral.' },
      { icon: 'lucide:smartphone', title: 'WhatsApp built in', desc: 'A visible WhatsApp button and forms that land in your inbox, so you never lose a lead.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why Doral',
    title: 'Doral is not "generic Miami": it is <em>Doralzuela</em>',
    paragraphs: [
      'Doral is an incorporated city in western Miami-Dade, right next to MIA airport and known as "Doralzuela" for being home to one of the largest Venezuelan communities in the United States, alongside a strong Colombian, Argentine and Cuban presence. Here Spanish is the language of commerce: arepa spots and bakeries like the ones in Downtown Doral, Spanish-speaking professional services and import/export firms moving freight between the U.S., Venezuela and Colombia.',
      'The Doral customer searches in their own language and reaches out over WhatsApp, and they value that you understand their culture, not just "Miami." That is why the real differentiator is not price: it is <strong>a genuinely bilingual site, local SEO by corridor (Downtown Doral, CityPlace Doral) and AI-ready schema</strong>, written for your Venezuelan or Colombian customer and for your specific vertical. Most agencies hand English-speaking owners a Google Translate button; we build your site in true English and Spanish so you capture the Spanish-speaking side of your Doral market.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Professional website, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Pay per project. The foundation for your Doral business to have a bilingual presence that lives up to its offline reputation.',
    features: [
      '100% custom design',
      'Spanish and English versions',
      'Base SEO optimization + schema',
      'WhatsApp button and form',
      'Mobile-ready and AI-ready',
      'We guide you on domain and hosting',
    ],
    cta: { label: 'Get my free proposal', href: '#contacto' },
    note: '$1,500 is the starting point for a professional site. Local SEO (from $600/mo) and a conversational AI (from $900) add on based on what you need. Online stores and special features have their own scope: we spell it out for you, no strings attached.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Real, verifiable work, and <em>we want your business</em> in Doral',
    cta: { label: 'Be our first case in Doral', href: '#contacto' },
    // Honesty: NO clients in Miami/Doral. Proof labeled by its REAL city
    // (Houston / Orlando). The title and FAQ make it clear; nothing implies Doral.
    items: proj("Julio's Landscape TX", 'Texas Rush Remove', 'Move Junk Away', 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your digital presence in Doral, no <em>fine print</em>',
    items: [
      { q: 'How much does a website cost for a Doral business?', a: 'A custom professional site starts at $1,500 (one-time payment). The final price depends on the number of pages and the features you need. Local SEO (from $600 a month) and a conversational AI (from $900) are quoted separately. We give you a clear scope and price in the free proposal, before you decide.' },
      { q: 'Do you have clients in Doral or Miami?', a: 'We will be honest: we are just starting our operation in Miami, so we do not have published cases in Doral yet. We do have real, verifiable work, with links you can visit, for businesses in Houston and Orlando. That is why we offer Founding Client spots in Doral, with special terms.' },
      { q: 'Does the site work for my arepa spot, bakery or Venezuelan restaurant?', a: 'Yes. We design for food and hospitality: a clear menu, photos that make people hungry, a WhatsApp and ordering button, and local SEO so you show up when someone searches for arepas or empanadas in Doral. We write in the Spanish of your Venezuelan or Colombian customer, without sounding like a generic English template.' },
      { q: 'What if I run an import/export firm or a professional service near MIA?', a: 'That too. For freight forwarders, customs brokers, accountants, immigration lawyers and clinics, we build a professional bilingual site that builds trust across the U.S.-Venezuela/Colombia corridors. English and Spanish from the start, with the structure to be found on Google and in AI assistants.' },
      { q: 'Do customers get helped over WhatsApp?', a: 'Yes, we leave it integrated. The Doral customer usually prefers to message on WhatsApp rather than call, so we add a visible button and, if you want, a bilingual conversational AI that replies instantly 24/7 and captures the lead even when you are busy.' },
      { q: 'Do you guarantee the #1 spot on Google?', a: 'No, and be wary of anyone who promises it: nobody controls Google\'s algorithm. What we do guarantee is honest, measurable work: a correct bilingual site, local SEO done well, AI-ready schema and clear reports. Our commitment is to the method and to transparency, not to a number nobody can promise.' },
    ],
  },
  cta: {
    title: 'Put your <em>Doral</em> business on the digital map',
    sub: 'We are looking for Founding Clients in Doral. Tell us about your business (arepa spot, bakery, service or import/export) and get a bilingual proposal in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'The services that make up the system',
    links: [
      { label: 'Web design in Miami', href: '/en/miami/web-design', desc: 'The bilingual web design service in detail.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Miami', href: '/en/miami/local-seo', desc: 'Get your business to show up on Google and Maps.', icon: 'lucide:search' },
      { label: 'Conversational AI in Miami', href: '/en/miami/conversational-ai', desc: 'Answer and capture customers 24/7 with a bilingual assistant.', icon: 'lucide:messages-square' },
      { label: 'Miami (hub)', href: '/en/miami', desc: 'All our services for Miami-Dade.', icon: 'lucide:globe' },
    ],
  },
  service: {
    name: 'Web Design and SEO in Doral',
    serviceType: 'Web design, local SEO and conversational AI',
    description:
      'Bilingual web design, local SEO and conversational AI for businesses in Doral (Miami-Dade): arepa spots, Venezuelan bakeries and restaurants, Spanish-speaking professional services and import/export firms near MIA. In English and Spanish, ready for Google and for AI assistants.',
    path: '/en/miami/doral',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '1500',
    providerId: MIAMI_ID,
  },
};

const enMiamiHialeah: ClusterPage = {
  meta: {
    title: 'Web Design and SEO in Hialeah | Bilingual local businesses | Marcyan',
    description:
      'Bilingual web design, local SEO and AI for Hialeah businesses: cafeterias, bakeries, auto shops, salons and markets. A fast site in true English and Spanish from $1,500. Free proposal.',
  },
  path: '/en/miami/hialeah',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Miami', path: '/en/miami' },
    { name: 'Hialeah', path: '/en/miami/hialeah' },
  ],
  hero: {
    badge: 'Hialeah, FL',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Local businesses · Hialeah',
    h1: 'Web design and SEO for your <em>business</em> in Hialeah',
    sub: 'Your Hialeah business runs on Spanish, on WhatsApp and at the walk-up window. We build you a fast site, an organized Google listing and instant replies so the customer searching "near me" finds you and messages you, in the language your neighborhood actually speaks.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See what it includes', href: '#precios' },
    chips: ['True English and Spanish', 'Fast on mobile', 'Organized Google listing'],
    tone: 'gold',
  },
  answer: {
    q: 'Is it worth it for a Hialeah business to have a bilingual website?',
    a: 'Yes, one of the best local investments a Hialeah business can make. 46% of Google searches have local intent and 76% of people who search "near me" visit a business within 24 hours. Here your customers search in Spanish from their phones, so a fast site with an organized Google listing puts you right in front of them.',
    source: 'Google · BrightLocal, 2025',
  },
  includes: {
    tag: 'What it includes',
    title: 'Your Hialeah business, <em>built right</em> for a Spanish-speaking market',
    items: [
      { icon: 'lucide:layout-template', title: 'Custom bilingual site', desc: 'A site designed from scratch for your business, not a template: cafeteria, bakery, auto shop, salon, botanica or market, written in the Spanish your neighborhood really speaks and in English wherever you need it.' },
      { icon: 'lucide:smartphone', title: 'Fast on mobile', desc: 'Lightweight HTML that loads in a couple of seconds, right on the device your customers use to search. No heavy pages that take forever to open.' },
      { icon: 'lucide:map-pin', title: 'Organized Google listing', desc: 'We create or optimize your Google Business Profile: category, hours, photos, services and a bilingual description, so you show up on Maps when people look for you.' },
      { icon: 'lucide:search', title: 'Neighborhood local SEO', desc: 'We rank you for "Cuban bakery near me," "auto shop in Hialeah" and the real searches around Palm Ave, W 49 St and Hialeah Dr, in Spanish and English.' },
      { icon: 'lucide:bot-message-square', title: 'Instant replies with AI', desc: 'An assistant that answers on WhatsApp and on your site while you work the counter, so the customer who messages you does not walk over to the shop next door.' },
      { icon: 'lucide:languages', title: 'Spanish first, English where it counts', desc: 'Everything starts in Spanish, the day-to-day language in Hialeah, and we add English only where you truly need it. Never sounding like a translation.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why Hialeah',
    title: 'In Hialeah, Spanish <em>is the business</em>',
    paragraphs: [
      'Hialeah is one of the most Cuban cities in the United States, a working-class Miami-Dade city where Spanish is not an afterthought: it is the language of daily life. People grab their coffee at the walk-up window, buy bread at the bakery they have gone to for years and message the auto shop or the salon on WhatsApp, almost always in Spanish. Your business does not need a generic English-only website: it needs to exist properly in the language of the neighborhood, and in true English where it helps.',
      'The real opportunity is not competing on price, it is <strong>existing properly in Spanish</strong>. So many Hialeah businesses live on Facebook, Instagram or word of mouth alone, with no site of their own and no well-built Google listing, so the customer searching "near me" on their phone cannot find them even from a block away. Most agencies hand an owner a Google Translate button; we build your presence in true English and Spanish, so you reach the Spanish-speaking side of your Hialeah market and any English-speaking customers too. A fast site, an organized listing and instant replies put you right in front of that customer.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'A site for your Hialeah business, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Pay per project, no mandatory monthly fees. The price depends on scope.',
    features: webFeatures,
    cta: { label: 'Get my free proposal', href: '#contacto' },
    note: '$1,500 is the starting point for a professional site. Local SEO (from $600/mo) to rank you in the neighborhood and an AI assistant (from $900) to reply instantly are added on based on what you need. We spell it out with no obligation.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Real, <em>verifiable</em> work',
    cta: { label: 'Be our first case in Hialeah', href: '#contacto' },
    // Hard honesty: NO clients in Miami. Proof is labeled by its real
    // city (Houston/Orlando). Never implied to be from Hialeah or Miami.
    items: proj('Texas Rush Remove', "Julio's Landscape TX", 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your Hialeah business, <em>no runaround</em>',
    items: [
      { q: 'How much does a website cost for my business in Hialeah?', a: 'A custom professional site starts at $1,500, one-time, with no mandatory monthly fees. The final price depends on how many pages you need and the features (bookings, menu, payments). If you want local SEO to rank in the neighborhood (from $600 a month) or an AI assistant (from $900), those are quoted separately. Everything is clear and in writing in the free proposal.' },
      { q: 'Do you have clients in Hialeah or Miami?', a: 'We will be honest: we are just starting our operation in Miami, so we do not have published cases from Hialeah or Miami yet. We do have real, verifiable work done for businesses in Houston and Orlando, with links you can visit. That is why we offer Founding Client spots in Hialeah, with special terms for our first local cases.' },
      { q: 'Is the site and the support really in Spanish?', a: 'Yes, and it is our specialty. In Hialeah Spanish is the language of business, so everything starts in Spanish: the site, the Google listing and the assistant that replies. We write it in the Caribbean Spanish your customers actually use, not a robotic translation, and we add English wherever you need it. We are a bilingual studio.' },
      { q: 'Can you answer my WhatsApp while I work the counter?', a: 'Yes. An AI assistant replies on WhatsApp and on your site instantly, right when you are working the window or the counter and cannot pick up the phone. That way the prospect who messages gets a quick answer and does not walk over to the shop next door. We tell you honestly what can be integrated and what cannot.' },
      { q: 'Do you guarantee the #1 spot on Google?', a: 'No, and be wary of anyone who promises it: nobody controls Google\'s algorithm. What we do is honest, measurable work: a fast site, an organized Google listing, consistent NAP and local content in Spanish and English, so you show up when someone searches for your service in Hialeah. Our commitment is to the method and to transparency.' },
      { q: 'Do you work all of Hialeah and the Miami area?', a: 'Yes. We work Hialeah and the entire Miami-Dade area as a service-area business, remotely and efficiently. You do not need to visit an office: the whole process, from proposal to delivery, happens online and in your language.' },
    ],
  },
  cta: {
    title: 'Be one of our first <em>cases in Hialeah</em>',
    sub: 'We are looking for Founding Clients in Hialeah. Tell us about your business and get a personalized proposal, in your language, in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Services that build the system',
    links: [
      { label: 'Web design in Miami', href: '/en/miami/web-design', desc: 'The web design service in detail: process, what it includes and FAQ.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Miami', href: '/en/miami/local-seo', desc: 'Get your business to show up on Google and Maps across Miami-Dade.', icon: 'lucide:search' },
      { label: 'Conversational AI in Miami', href: '/en/miami/conversational-ai', desc: 'An assistant that answers your WhatsApp 24/7, in Spanish and English.', icon: 'lucide:messages-square' },
      { label: 'Miami and its area', href: '/en/miami', desc: 'All our services for Miami-Dade businesses.', icon: 'lucide:map-pin' },
    ],
  },
  service: {
    name: 'Web Design and SEO in Hialeah',
    serviceType: 'Web design, local SEO and conversational AI',
    description:
      'Custom web design, local SEO and conversational AI in true English and Spanish for Hialeah businesses (Miami-Dade): cafeterias, bakeries, auto shops, salons, botanicas and markets. A fast bilingual site, a Google listing and instant replies on WhatsApp.',
    path: '/en/miami/hialeah',
    areaCity: 'Miami',
    areaRegion: 'Florida',
    priceValue: '1500',
    providerId: MIAMI_ID,
  },
};

const enIaPymes: ClusterPage = {
  meta: {
    title: 'Artificial Intelligence for Your Business (Small Business) | Marcyan',
    description:
      'Practical AI for small businesses: assistants that answer 24/7, automatic WhatsApp, appointment booking and missed-call rescue. In true English and Spanish. Free proposal.',
  },
  path: '/en/ai-for-small-business',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Services', path: '/en/#servicios' },
    { name: 'AI for Your Business', path: '/en/ai-for-small-business' },
  ],
  hero: {
    badge: 'AI for your business',
    badgeIcon: 'marcyan-ai',
    kicker: 'AI for small business',
    h1: 'AI for your <em>business</em>',
    sub: 'Is your business losing customers because you can\'t answer in time? We put artificial intelligence to work for you: assistants that reply, book appointments and capture leads around the clock, in true English and Spanish, without you having to know a thing about technology.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See how it works', href: '#faq' },
    chips: ['English and Spanish', 'No tech knowledge needed', 'Works with what you already use'],
    tone: 'teal',
  },
  answer: {
    q: 'How can artificial intelligence help a small business?',
    a: 'AI helps your business respond instantly and stop losing sales: it handles messages, books appointments and answers questions 24 hours a day. Speed matters: replying to a lead within the first 5 minutes can raise your odds of reaching them by up to 100 times, according to Harvard Business Review.',
    source: 'Harvard Business Review',
  },
  includes: {
    tag: 'What we can do',
    title: 'AI that <em>works</em> while you work',
    items: [
      { icon: 'lucide:bot-message-square', title: 'Assistant that answers 24/7', desc: 'A chat assistant on your site that answers questions and captures leads at any hour, in English and Spanish.' },
      { icon: 'lucide:message-circle', title: 'Automatic WhatsApp', desc: 'Automatic replies and follow-up over WhatsApp and messaging, so no customer is left waiting.' },
      { icon: 'lucide:calendar-check', title: 'AI appointment booking', desc: 'Your customers book appointments themselves, day or night, with no calls and no back-and-forth.' },
      { icon: 'lucide:phone-missed', title: 'Rescue missed calls', desc: 'When you can\'t pick up, AI texts back instantly so you don\'t lose the customer.' },
      { icon: 'marcyan-ai', title: 'Show up in ChatGPT and Gemini', desc: 'We prepare your information so AI assistants can find you and recommend your business.' },
      { icon: 'lucide:workflow', title: 'Automate follow-up', desc: 'We connect AI with the tools you already use so reminders and follow-ups happen on their own.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'The stat that matters',
    title: 'Most businesses are <em>invisible</em> to AI',
    paragraphs: [
      'More and more people ask ChatGPT, Gemini or the AI in their WhatsApp for a service instead of searching Google. The problem: according to SOCi\'s 2026 local visibility index, ChatGPT recommends barely <strong>1.2% of local businesses</strong>. The rest simply don\'t show up.',
      'That is both a risk and a huge opportunity. It\'s new ground where a small business can get ahead of bigger competitors, especially in Spanish, where almost no one is working on this yet. We help you be one of the businesses that actually show up.',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Investment',
    title: 'AI automation, <em>from $900</em>',
    price: '$900',
    unit: 'starter project',
    lead: 'We start with one concrete solution to your biggest pain point, not a giant project.',
    features: [
      'Custom assistant or automation',
      'Set up in English and Spanish',
      'Integration with your tools',
      'Messages and replies ready to go',
      'Training for your team',
      'Post-launch support',
    ],
    cta: { label: 'I want to automate my business', href: '#contacto' },
    note: '$900 is the starting point for an initial automation (for example, an assistant or appointment booking). More complete projects are quoted by scope, always with a clear price up front.',
    tone: 'teal',
  },
  proof: {
    tag: 'Real automation',
    title: 'Automation that is <em>already live</em>',
    cta: { label: 'I want something like this', href: '#contacto' },
    // Rosy Nails = booking web app (automates scheduling, honest framing). + Case #0.
    items: [...proj('Rosy Nails & Care'), caso0],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'AI for your business, in <em>plain terms</em>',
    items: [
      { q: 'How expensive is this for a small business?', a: 'More affordable than you think. An initial automation starts at $900 and pays for itself quickly once you stop losing customers because you couldn\'t answer in time. We start with a single solution to your biggest pain point, not a giant project, and we grow from there.' },
      { q: 'Do I need to know about technology?', a: 'No, and that\'s exactly the point. We set everything up and hand it over ready to use, with simple training for your team. You focus on your business; we handle the technical side.' },
      { q: 'Does it work in Spanish?', a: 'Yes, and it\'s our specialty. We\'re a bilingual studio, so we set up assistants and automations in your customers\' Spanish, with the right tone, and in true English too. Most agencies hand you a Google Translate button; we build it in real English and Spanish so you capture the Spanish-speaking side of your market.' },
      { q: 'Does it integrate with the tools I already use?', a: 'In most cases, yes. We connect AI with your site, your WhatsApp, your calendar and many of the tools you already use. In the proposal we tell you honestly what can and can\'t be integrated, with no empty promises.' },
      { q: 'What\'s this about showing up in ChatGPT?', a: 'More and more people ask ChatGPT or Gemini for recommendations instead of searching the old-fashioned way. Right now those assistants recommend very few local businesses. We prepare your information so you have a better chance of showing up when someone asks for your kind of service.' },
      { q: 'Is the AI going to sound like a cold robot?', a: 'No, not when it\'s done right. We write the messages in your tone and personality, in natural English and Spanish. The goal is for your customers to feel well taken care of, and to know clearly when they\'re talking to a person and when to an assistant.' },
    ],
  },
  cta: {
    title: 'Stop losing customers because you <em>couldn\'t answer</em>',
    sub: 'Tell us your biggest pain point and we\'ll propose an AI solution in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'teal',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'A fast site is the foundation your AI lives on.', icon: 'lucide:layout-template' },
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'Show up on Google as well as in AI.', icon: 'lucide:search' },
      { label: 'Web design in Miami', href: '/en/miami/web-design', desc: 'Operating in Miami? We design there too.', icon: 'lucide:layout-template' },
    ],
  },
  service: {
    name: 'Artificial Intelligence for Businesses',
    serviceType: 'AI automation and conversational assistants',
    description:
      'Artificial intelligence solutions for small businesses: 24/7 conversational assistants, WhatsApp and messaging automation, appointment booking, missed-call rescue and visibility in AI assistants. In true English and Spanish, for Houston and Miami.',
    path: '/en/ai-for-small-business',
    priceValue: '900',
    providerId: ORG_ID,
  },
};

const enPriceWebHouston: ClusterPage = {
  meta: {
    title: 'How much does a website cost in Houston? Real 2026 pricing | Marcyan',
    description:
      'A professional website in Houston starts at $1,500: custom-built, bilingual and with base SEO. We explain what it includes and what the price depends on, with no hidden costs.',
  },
  path: '/en/pricing/website-cost-houston',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Pricing', path: '/en/pricing' },
    { name: 'How much does a website cost in Houston?', path: '/en/pricing/website-cost-houston' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Pricing · Web design',
    h1: 'How much a <em>website</em> costs in Houston',
    sub: 'A straight answer, no runaround: how much to invest, what it includes and what the price of a professional site in Houston depends on, with real figures, not a "contact us for a quote".',
    primary: { label: 'Get my exact price', href: '#contacto' },
    secondary: { label: 'See all pricing', href: '/en/pricing' },
    chips: ['From $1,500', 'Custom-built and bilingual', 'Base SEO included'],
    tone: 'gold',
  },
  answer: {
    q: 'How much does a website cost in Houston?',
    a: 'A professional, custom-built website in Houston starts at $1,500. That price includes a fast site, bilingual (English and Spanish) and with base SEO. The final total depends on the number of pages and the features you need: an online store or a booking system raises the investment.',
  },
  includes: {
    tag: 'What that price includes',
    title: 'What you get <em>from $1,500</em>',
    items: webIncludesItems,
    tone: 'gold',
  },
  local: {
    tag: 'What it depends on',
    title: 'Why we say <em>"from"</em> and not a flat price',
    paragraphs: [
      'The price of a website is not one-size-fits-all: it depends on how many pages you need, on the features (booking, payments, blog, integrations) and on whether you want one or two language versions. A multi-page presentation site starts at $1,500; an online store (e-commerce) starts higher, around $2,900.',
      'That is why we publish the real starting point and not an inflated number to "close you on the call". <strong>We give you the scope and the total in writing in the proposal</strong>, before you decide, with no costs that show up later. And because we build in true English and Spanish, that second language version is real reach into the Spanish-speaking side of your Houston market, not a Google Translate button.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Website in Houston, <em>from $1,500</em>',
    price: '$1,500',
    unit: 'one-time project',
    lead: 'Pay per project, with no mandatory monthly fees. The price depends on the scope.',
    features: webFeatures,
    cta: { label: 'Get my free proposal', href: '#contacto' },
    note: webPriceNote,
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Real sites that are <em>already live</em>',
    cta: { label: 'Get my free proposal', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX", 'Rosy Nails & Care'),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Your website price, no <em>fine print</em>',
    items: [
      { q: 'What does the $1,500 price include?', a: 'It includes a professional, custom multi-page site, designed from scratch, fast, mobile-ready, with a Spanish and English version, base technical SEO and a contact form that lands in your inbox. It is not a template: it is designed around your brand and your goals.' },
      { q: 'Why "from $1,500" and not a flat price?', a: 'Because every business needs something different. $1,500 is the real starting point for a presentation site. The total goes up if you ask for more pages, an online store, booking or integrations. We give you the scope and the locked-in price in writing in the proposal, before we start.' },
      { q: 'Does the price include SEO?', a: 'It includes base technical SEO: correct structure, speed, tags and a format Google and AI assistants can read. Ongoing local ranking (Google Business Profile, reviews, monthly content) is the separate local SEO service, from $600 a month, if you need it.' },
      { q: 'How long until my site is ready?', a: 'A typical multi-page site takes 2 to 4 weeks, depending on how quickly we receive your content (copy, photos, logo) and the number of revisions. Online stores take longer. We give you a realistic timeline from the start.' },
      { q: 'Are there mandatory monthly fees?', a: 'No. Web design is paid per project, one time only. Maintenance (from $120 a month) is optional: backups, security and support. You can manage the site yourself if you prefer: the site is yours, we never lock you in.' },
      { q: 'Is there a cost for the proposal?', a: 'No. Tell us about your project and in under 24 hours you get a personalized proposal with scope and price, at no cost and no commitment. If you decide not to move forward, no problem at all.' },
    ],
  },
  cta: {
    title: 'Get the <em>exact</em> price of your site',
    sub: 'Tell us how many pages and what features you need, and get a proposal with a firm price in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'Related services and pricing',
    links: [
      { label: 'Web design in Houston', href: '/en/houston/web-design', desc: 'The service in detail: process, projects and FAQ.', icon: 'lucide:layout-template' },
      { label: 'How much does a chatbot cost?', href: '/en/pricing/chatbot-cost', desc: 'The price of an AI assistant and what it includes.', icon: 'lucide:messages-square' },
      { label: 'How much does local SEO cost in Houston?', href: '/en/pricing/local-seo-cost-houston', desc: 'The published monthly rate and what it includes.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Web Design in Houston',
    serviceType: 'Web design',
    description:
      'Custom website design and development for businesses in Houston: fast, bilingual (English and Spanish), with base SEO, from $1,500.',
    path: '/en/pricing/website-cost-houston',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '1500',
    providerId: HOUSTON_ID,
  },
};

const enPriceChatbot: ClusterPage = {
  meta: {
    title: 'How much does a WhatsApp AI chatbot cost? The real price | Marcyan',
    description:
      'An AI assistant with Marcyan starts at $900, a one-time payment, and includes setup, training and maintenance, not a subscription that grows every month. Free proposal in 24h.',
  },
  path: '/en/pricing/chatbot-cost',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Pricing', path: '/en/pricing' },
    { name: 'How much does a chatbot cost?', path: '/en/pricing/chatbot-cost' },
  ],
  hero: {
    badge: 'AI assistant',
    badgeIcon: 'marcyan-ai',
    kicker: 'Price · Conversational AI',
    h1: 'How much an AI <em>chatbot</em> costs',
    sub: 'The direct answer: how much to invest in an AI assistant for your WhatsApp and your site, what it includes, and why a service we build for you is not the same as a software subscription that grows every month.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See conversational AI in Houston', href: '/en/houston/conversational-ai' },
    chips: ['From $900, one-time payment', 'Setup + training', 'We maintain it for you'],
    tone: 'teal',
  },
  answer: {
    q: 'How much does a WhatsApp chatbot cost for your business?',
    a: 'With Marcyan, an AI assistant for your WhatsApp and your site starts at $900 as a one-time payment, and it includes setup, training with your business information and maintenance. It is not a software subscription you configure yourself: it is a service we build for you, with a clear price up front.',
  },
  includes: {
    tag: 'What it includes',
    title: 'What the <em>price</em> covers',
    items: [
      { icon: 'lucide:settings-2', title: 'Full setup', desc: 'We get it running on your site and your WhatsApp. You never fight with any configuration.' },
      { icon: 'lucide:graduation-cap', title: 'Training with your business', desc: 'We feed it your services, prices, hours and frequently asked questions, so it answers like your business.' },
      { icon: 'lucide:message-circle', title: 'WhatsApp and website', desc: 'We connect the assistant to your WhatsApp and your site so it replies where your customers message you.' },
      { icon: 'lucide:calendar-check', title: 'Lead capture and scheduling', desc: 'It captures prospects and books appointments around the clock, so you never lose a customer.' },
      { icon: 'lucide:user-round', title: 'Handoff to a person', desc: 'When a human is needed, it passes the conversation to your team. The customer is never left stuck.' },
      { icon: 'lucide:wrench', title: 'Support and maintenance', desc: 'We do not leave you on your own after launch: we fine-tune it and keep it maintained.' },
    ],
    tone: 'teal',
  },
  local: {
    tag: 'How it is billed',
    title: 'A service we build for you, not a <em>subscription that grows</em>',
    paragraphs: [
      'The market is full of subscription chatbot apps: they start cheap (around $15 to $30 a month) but the price climbs once you add the AI, the templates and the usage charges, and you configure it yourself. At the other end, a fully custom build can cost thousands of dollars. Our middle ground: $900 once, built by us.',
      '<strong>Let us be clear about one technical detail:</strong> if the official WhatsApp API is used, Meta charges for some conversations (there is a free volume per month and then a per-conversation cost). That charge is Meta\'s, not ours: we explain it up front so there are no surprises. We charge for getting your assistant up and running, not for each message.',
    ],
    tone: 'teal',
  },
  pricing: {
    tag: 'Investment',
    title: 'AI assistant, <em>from $900</em>',
    price: '$900',
    unit: 'one-time payment',
    lead: 'A one-time payment for the service: setup, training, launch and maintenance. No mandatory monthly fee.',
    features: [
      'Setup and launch',
      'Training with your business',
      'Connection to WhatsApp and your site',
      'Messages and replies in English and Spanish',
      'Training for your team',
      'Maintenance and support',
    ],
    cta: { label: 'I want my assistant', href: '#contacto' },
    note: '$900 is the starting point for an initial automation (for example, an assistant that answers and schedules) and includes setup, training, launch and maintenance. More complete projects are quoted based on scope. Separately: if the official WhatsApp API is used, Meta charges for some conversations; that cost is Meta\'s, not ours, and we explain it to you up front.',
    tone: 'teal',
  },
  proof: {
    tag: 'Real automation',
    title: 'Automation that is <em>already live</em>',
    cta: { label: 'I want something like this', href: '#contacto' },
    items: [...proj('Rosy Nails & Care'), caso0],
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Chatbot pricing, no <em>fine print</em>',
    items: [
      { q: 'Is the chatbot a one-time payment or monthly?', a: 'With us it is a one-time payment: from $900 for the setup, the training and the launch, with maintenance included. We do not lock you into a mandatory monthly fee. If later on you want a broader ongoing maintenance plan, it is optional and quoted separately, always with a clear price.' },
      { q: 'What does the $900 price include?', a: 'It includes setting up the assistant, training it with your business information (services, prices, hours, frequently asked questions), connecting it to your WhatsApp and your site, getting the messages ready in English and Spanish, training your team and maintaining it. It is a service we build for you, not software you configure yourself.' },
      { q: 'Do I have to pay WhatsApp or Meta anything separately?', a: 'You might, and we prefer to tell you straight: if the official WhatsApp API is used, Meta offers a free volume of conversations per month and then charges a per-conversation cost. That charge is Meta\'s, not ours. We explain up front whether it applies to your case, so there are no surprises.' },
      { q: 'How is it different from a subscription chatbot app?', a: 'Subscription apps usually start cheap and climb as you add the AI and the extras, and you configure them yourself. We hand it to you up and running, trained on your business and truly bilingual in English and Spanish. You pay for the result, not for wrestling with a tool every month.' },
      { q: 'Do I need to know anything about technology?', a: 'No. We configure it, connect it and hand it to you working, with simple training for your team. You focus on your business; we handle the technical side.' },
      { q: 'How long until it is ready?', a: 'An initial automation is usually ready in one to three weeks, depending on which tools we connect and how ready your content is (answers, hours, services). We give you a realistic timeline from the start.' },
    ],
  },
  cta: {
    title: 'Put an assistant to <em>answer for you</em>',
    sub: 'Tell us what you want it to answer and schedule, and we give you a proposal with a locked-in price in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'teal',
  },
  related: {
    tag: 'Keep exploring',
    title: 'AI and pricing',
    links: [
      { label: 'Conversational AI in Houston', href: '/en/houston/conversational-ai', desc: 'The service in detail, with real use cases.', icon: 'lucide:messages-square' },
      { label: 'How much does a website cost in Houston?', href: '/en/pricing/website-cost-houston', desc: 'The price of a site, and what it includes.', icon: 'lucide:layout-template' },
      { label: 'How much does local SEO cost in Houston?', href: '/en/pricing/local-seo-cost-houston', desc: 'The published monthly rate and what it includes.', icon: 'lucide:search' },
    ],
  },
  service: {
    name: 'Chatbot and Conversational AI',
    serviceType: 'AI automation and conversational assistants',
    description:
      'Managed AI assistant service for businesses: setup, training with the business information, connection to WhatsApp and website, and maintenance. In English and Spanish, from $900 (one-time payment).',
    path: '/en/pricing/chatbot-cost',
    priceValue: '900',
    providerId: ORG_ID,
  },
};

const enPriceSeoHouston: ClusterPage = {
  meta: {
    title: 'How much does local SEO cost in Houston? Real monthly price | Marcyan',
    description:
      'Local SEO in Houston with Marcyan starts at $600 a month, published up front and with no long lock-in contracts. What it includes and when you see results. Free proposal in 24h.',
  },
  path: '/en/pricing/local-seo-cost-houston',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Pricing', path: '/en/pricing' },
    { name: 'How much does local SEO cost in Houston?', path: '/en/pricing/local-seo-cost-houston' },
  ],
  hero: {
    badge: 'Houston, TX',
    badgeIcon: 'lucide:map-pin',
    kicker: 'Price · Local SEO',
    h1: 'How much <em>local SEO</em> costs in Houston',
    sub: 'A straight answer, with the monthly rate published: how much to invest in local SEO in Houston, what it includes and how long until you see results, without having to book a call just to learn the price.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    secondary: { label: 'See local SEO in Houston', href: '/en/houston/local-seo' },
    chips: ['From $600/mo', 'No long lock-in contracts', 'Clear reporting'],
    tone: 'gold',
  },
  answer: {
    q: 'How much does local SEO cost in Houston?',
    a: 'Local SEO in Houston with Marcyan starts at $600 a month, and we publish it up front. The final price depends on your competition and on how many pages or locations we work on. We charge month to month, with no long lock-in contracts, and you will see the first signals in 2 to 8 weeks, with real traction in 3 to 6 months.',
  },
  includes: {
    tag: 'What it includes',
    title: 'What your <em>monthly plan</em> includes',
    items: [
      { icon: 'lucide:map-pin', title: 'Google Business Profile', desc: 'We create or optimize your listing: categories, services, photos, bilingual description and posts.' },
      { icon: 'lucide:list-checks', title: 'NAP and directories', desc: 'Your name, address and phone consistent across Google, Bing, Apple Maps and key directories.' },
      { icon: 'lucide:file-text', title: 'Monthly local content', desc: 'Pages and content by service and area, written for your Houston market, in English and Spanish.' },
      { icon: 'lucide:star', title: 'Reviews and reputation', desc: 'We help you request and reply to reviews consistently, in each customer\'s language.' },
      { icon: 'lucide:bar-chart-3', title: 'Clear monthly report', desc: 'Every month you see what we did and how your ranking is going, with no confusing jargon.' },
      { icon: 'marcyan-ai', title: 'Ready for AI (AEO)', desc: 'Your information in a format ChatGPT and Gemini can read and cite, so AI recommends your business.' },
    ],
    tone: 'gold',
  },
  local: {
    tag: 'Why we publish it',
    title: 'The monthly rate, <em>out in the open</em>',
    paragraphs: [
      'Local SEO billed month to month runs anywhere from a few hundred to several thousand dollars, depending on the competition in your industry and your city. Many agencies won\'t tell you their rate until they get you on a sales call. We publish ours: it starts at $600 a month, and from there we adjust to your case, always in writing.',
      '<strong>SEO is not a switch, it\'s an investment that compounds.</strong> That\'s why we work month to month, with no long contract locking you in, but we tell you honestly that results take time: the first signals arrive in weeks and solid standing in competitive searches in several months. We\'d rather you stay for the results. Most agencies just hand English-speaking owners a Google Translate button; we build and optimize your presence in true English and Spanish, so you capture the Spanish-speaking side of your Houston market too.',
    ],
    tone: 'gold',
  },
  pricing: {
    tag: 'Investment',
    title: 'Local SEO, <em>from $600 a month</em>',
    price: '$600',
    unit: '/mo',
    lead: 'Month to month, with no long lock-in contracts. We start with the essentials and grow with the results.',
    features: [
      'Google Business Profile optimization',
      'NAP across key directories',
      '1 optimized local page per month',
      'Review management',
      'Clear monthly report',
      'Bilingual support',
    ],
    cta: { label: 'Get my free proposal', href: '#contacto' },
    note: 'The final price depends on where your business stands today, on your competition and on how many pages or locations we work on. We give you a clear scope and price in the free proposal, before you decide. We don\'t promise the #1 spot: nobody controls Google\'s algorithm.',
    tone: 'gold',
  },
  proof: {
    tag: 'Real work',
    title: 'Houston businesses that <em>already rank</em>',
    cta: { label: 'Get my free proposal', href: '#contacto' },
    items: proj('Texas Rush Remove', "Julio's Landscape TX"),
  },
  faq: {
    tag: 'Frequently asked questions',
    title: 'Local SEO pricing, <em>no runaround</em>',
    items: [
      { q: 'How much does local SEO in Houston cost per month?', a: 'It starts at $600 a month. The final price depends on your competition, on where your business stands today and on how many pages or locations we work on. We publish it up front and give you a clear scope and price in the free proposal, before you decide.' },
      { q: 'Is there a contract or minimum commitment?', a: 'We don\'t lock you into a long contract: we work month to month and you can pause or cancel with reasonable notice. That said, we tell you honestly that SEO needs several months to pay off: we\'d rather you stay for the results, not because of a clause.' },
      { q: 'How long until I see results?', a: 'The first signals usually show up in 2 to 8 weeks: more reviews and more views on your Google listing. Solid traction in competitive searches takes 3 to 6 months of consistent work. SEO is cumulative: an investment that compounds, not a switch.' },
      { q: 'What does the monthly plan include?', a: 'Optimization of your Google Business Profile, consistency of your NAP across directories, one local page per month, review management, technical SEO and preparation for AI assistants, plus a clear monthly report. We tune the scope to your budget and your priorities.' },
      { q: 'Do you guarantee the #1 spot on Google?', a: 'No, and be wary of anyone who promises it. Nobody controls Google\'s algorithm. What we do guarantee is honest, measurable work: correct optimization, clear reporting and continuous improvement. Our commitment is to the method and to transparency, not to a number nobody can promise.' },
      { q: 'Why do some agencies charge $600 and others charge thousands?', a: 'Because the scope varies enormously: number of locations, industry competition, amount of content and whether they include ads or not. Our rate starts at $600 a month for the essentials of local SEO and goes up based on what your case needs, always stated up front.' },
    ],
  },
  cta: {
    title: 'Show up in Houston, month <em>after month</em>',
    sub: 'Tell us about your business and get a local SEO proposal with clear scope and price in under 24 hours, no strings attached.',
    primary: { label: 'Get my free proposal', href: '#contacto' },
    tone: 'gold',
  },
  related: {
    tag: 'Keep exploring',
    title: 'SEO and pricing',
    links: [
      { label: 'Local SEO in Houston', href: '/en/houston/local-seo', desc: 'The service in detail, with what it includes and projects.', icon: 'lucide:search' },
      { label: 'How much does a website cost in Houston?', href: '/en/pricing/website-cost-houston', desc: 'The price of a site, what it includes and what it depends on.', icon: 'lucide:layout-template' },
      { label: 'How much does a chatbot cost?', href: '/en/pricing/chatbot-cost', desc: 'The price of an AI assistant and what it includes.', icon: 'lucide:messages-square' },
    ],
  },
  service: {
    name: 'Local SEO in Houston',
    serviceType: 'Local SEO',
    description:
      'Monthly local SEO for small businesses in Houston: Google Business Profile, NAP consistency, bilingual local content, review management and a monthly report. From $600 a month, with no long lock-in contracts.',
    path: '/en/pricing/local-seo-cost-houston',
    areaCity: 'Houston',
    areaRegion: 'Texas',
    priceValue: '600',
    monthly: true,
    providerId: HOUSTON_ID,
  },
};

export const clustersEn = {
  'houston/local-seo': enHoustonSeo,
  'houston/web-design': enHoustonWeb,
  'houston/conversational-ai': enHoustonIa,
  'houston/ecommerce': enHoustonEcommerce,
  'houston/branding': enHoustonBranding,
  'houston/immigration-lawyers': enHoustonImmigration,
  'houston/real-estate': enHoustonRealEstate,
  'houston/restaurants': enHoustonRestaurants,
  'houston/contractors': enHoustonContractors,
  'houston/auto-repair': enHoustonAutoRepair,
  'houston/beauty-salons': enHoustonBeautySalons,
  'houston/dental-clinics': enHoustonDentalClinics,
  'houston/katy': enHoustonKaty,
  'houston/sugar-land': enHoustonSugarLand,
  'houston/bilingual-web-design': enHoustonBilingual,
  'miami/web-design': enMiamiWeb,
  'miami/conversational-ai': enMiamiIa,
  'miami/local-seo': enMiamiSeo,
  'miami/ecommerce': enMiamiEcommerce,
  'miami/doral': enMiamiDoral,
  'miami/hialeah': enMiamiHialeah,
  'ai-for-small-business': enIaPymes,
  'pricing/website-cost-houston': enPriceWebHouston,
  'pricing/chatbot-cost': enPriceChatbot,
  'pricing/local-seo-cost-houston': enPriceSeoHouston,
} satisfies Record<string, ClusterPage>;
