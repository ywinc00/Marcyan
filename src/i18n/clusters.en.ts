// ─────────────────────────────────────────────────────────────
// EN cluster data — espejo en inglés de clusters.ts (Bloque D · bilingüe total).
// Mismo tipo ClusterPage. proof en inglés vía content.en; caso0 en inglés.
// Concepto EN = estudio bilingue (nunca la etiqueta hispana en ingles). Precios = mismos
// PRICE_ANCHORS que ES (números idénticos). Doctrina + prueba real aplican igual.
// Consumido por los wrappers finos /en/**.astro con lang="en".
// ─────────────────────────────────────────────────────────────
import { content } from './content';
import { HOUSTON_ID, ORG_ID } from '../lib/schema';
import type { ClusterPage, ProjectItem } from './clusters';

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
  url: '/en',
  display: 'marcyanstudio.com',
  result: 'Built in static HTML so ChatGPT and Gemini can read and cite it.',
  accent: 'teal',
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
      { label: 'Web design in Houston', href: '/en/houston', desc: 'Bespoke, fast, and bilingual, with its starting price.', icon: 'lucide:layout-template' },
      { label: 'AI for your business', href: '/en/ai-for-small-business', desc: 'An assistant that takes orders and reservations over WhatsApp 24/7.', icon: 'lucide:messages-square' },
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
      { label: 'Web design in Houston', href: '/en/houston', desc: 'Custom, fast, and bilingual, with its starting price.', icon: 'lucide:layout-template' },
      { label: 'AI for your business', href: '/en/ai-for-small-business', desc: 'AI that catches the calls you miss on the job.', icon: 'lucide:messages-square' },
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

const enIaPymes: ClusterPage = {
  meta: {
    title: 'Artificial Intelligence for Your Business (Small Business) | Marcyan',
    description:
      'Practical AI for small businesses: assistants that answer 24/7, automatic WhatsApp, appointment booking and missed-call rescue. In true English and Spanish. Free proposal.',
  },
  path: '/en/ai-for-small-business',
  breadcrumb: [
    { name: 'Home', path: '/en/' },
    { name: 'Services', path: '/en/services' },
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
      { label: 'Web design in Houston', href: '/en/houston', desc: 'A fast site is the foundation your AI lives on.', icon: 'lucide:layout-template' },
      { label: 'Web design in Miami', href: '/en/miami', desc: 'Operating in Miami? We design there too.', icon: 'lucide:layout-template' },
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

export const clustersEn = {
  'houston/restaurants': enHoustonRestaurants,
  'houston/contractors': enHoustonContractors,
  'ai-for-small-business': enIaPymes,
} satisfies Record<string, ClusterPage>;
