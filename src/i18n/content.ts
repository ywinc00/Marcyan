// ─────────────────────────────────────────────────────────────
// Contenido del sitio (estático por idioma, sin swap JS).
// Portado del contenido honesto de Sprint 0 (public/assets/js/translations.js).
// Cada página /es/ /en/ importa su locale; los componentes son presentacionales.
// (EN se añade al hacer el espejo /en/; por ahora el slice trabaja en ES.)
// ─────────────────────────────────────────────────────────────

export type Locale = 'es' | 'en';

export interface Link { label: string; href: string }
export interface ServiceItem { n: string; icon: string; title: string; desc: string; price: string }

// NAP real (Sprint 0) — Service-Area Business, sin dirección pública.
export const nap = {
  email: 'contact@marcyanstudio.com',
  houston: '+1 713-823-9144',
  miami: '+1 786-938-1754',
  hours: 'Lun–Vie 9am–6pm CT',
};

export const content = {
  es: {
    locale: 'es' as Locale,

    nav: {
      links: [
        { label: 'Servicios', href: '#servicios' },
        { label: 'IA', href: '#ia' },
        { label: 'Proyectos', href: '#proyectos' },
        { label: 'Ciudades', href: '#ciudades' },
      ] as Link[],
      cta: { label: 'Iniciar Proyecto', href: '#contacto' },
      langLabel: 'EN',
      langHref: '/en/',
      openMenu: 'Abrir menú',
      closeMenu: 'Cerrar menú',
    },

    hero: {
      tag: 'IA Operativa · Houston & Miami',
      h1: 'Diseño Web<br>que <em>piensa</em><br>por ti',
      sub: 'Marcyan Studio combina diseño de élite con inteligencia artificial operativa para crear sitios que convierten, posicionan y evolucionan — construidos rápido y para que te encuentren.',
      primary: { label: 'Ver Propuesta Gratis', href: '#contacto' },
      secondary: { label: 'Ver Proyectos', href: '#proyectos' },
      // nodos en órbita = enlaces reales (la home no es la única navegación)
      nodes: [
        { label: 'Servicios', href: '#servicios', icon: 'lucide:layers' },
        { label: 'IA', href: '#ia', icon: 'lucide:sparkles' },
        { label: 'Proyectos', href: '#proyectos', icon: 'lucide:folder' },
        { label: 'Ciudades', href: '#ciudades', icon: 'lucide:map-pin' },
      ],
      caso0: {
        label: 'Marcyan · Caso 0 (este sitio)',
        rows: [
          { l: 'Sitio', v: 'HTML estático' },
          { l: 'Rastreadores IA', v: 'Legible' },
          { l: 'Idiomas', v: 'ES · EN' },
          { l: 'Cobertura', v: 'Houston · Miami' },
          { l: 'Leads', v: 'Base propia' },
        ],
      },
    },

    services: {
      tag: 'Nuestros Servicios',
      title: 'Todo lo que tu<br>marca <em>necesita</em>',
      explore: 'Explorar',
      featuredBadge: 'Servicio estrella',
      cta: { label: 'Cuéntanos tu proyecto', href: '#contacto' },
      items: [
        { n: '01', icon: 'lucide:layout-template', title: 'Diseño Web Premium', price: 'desde $1,500',
          desc: 'Sitios de alto impacto construidos desde cero. Cada píxel responde a tu identidad de marca y a tus objetivos de negocio en Houston y Miami.' },
        { n: '02', icon: 'lucide:message-circle', title: 'IA Conversacional', price: 'desde $900',
          desc: 'Asistentes virtuales integrados directamente en tu sitio. Atienden a tus clientes a toda hora, responden preguntas y captan prospectos calificados incluso mientras duermes.' },
        { n: '03', icon: 'lucide:shopping-bag', title: 'E-Commerce & Tiendas', price: 'desde $2,900',
          desc: 'Plataformas de venta en línea optimizadas para conversión. Shopify, WooCommerce o soluciones propias con IA para recomendaciones personalizadas.' },
        { n: '04', icon: 'lucide:search', title: 'SEO Impulsado por IA', price: 'desde $600/mes',
          desc: 'SEO que sigue el ritmo del mercado. Usamos IA para analizar competidores y tendencias, y refinamos tu estrategia de forma continua para mejorar tu posicionamiento.' },
        { n: '05', icon: 'lucide:palette', title: 'Branding & Identidad', price: 'desde $750',
          desc: 'Logos, paletas de color, tipografías y sistemas visuales completos. Generamos conceptos con IA y refinamos cada detalle con criterio humano experto.' },
        { n: '06', icon: 'lucide:wrench', title: 'Mantenimiento Continuo', price: 'desde $120/mes',
          desc: 'Mantenemos tu sitio sano: chequeos de disponibilidad, actualizaciones de seguridad y software, respaldos periódicos y soporte bilingüe en Houston y Miami.' },
      ] as ServiceItem[],
    },

    ai: {
      tag: 'Tecnología Marcyan',
      title: 'La IA que<br>trabaja para<br><em>tu negocio</em>',
      desc: 'No usamos la IA como palabra de moda. La usamos para construir más rápido, escribir mejor y ayudar a que tu negocio aparezca — ante las personas y ante los asistentes de IA.',
      features: [
        { icon: 'lucide:bot', title: 'Que la IA te encuentre', desc: 'Construimos en HTML estático y rápido que asistentes como ChatGPT y Perplexity sí pueden leer, para que tu negocio aparezca cuando les preguntan.' },
        { icon: 'lucide:pen-tool', title: 'Contenido y textos', desc: 'Páginas y textos enfocados en SEO, redactados con IA y afinados a mano. Bilingüe español e inglés, escritos para tu mercado local.' },
        { icon: 'lucide:messages-square', title: 'Asistentes conversacionales', desc: 'Asistentes de chat que atienden a tus clientes, califican prospectos y agendan citas las 24 horas, en su idioma.' },
        { icon: 'lucide:workflow', title: 'Automatizaciones', desc: 'Conectamos tu sitio con las herramientas que ya usas, para que los nuevos prospectos, avisos y seguimientos ocurran solos.' },
      ],
      cta: { label: 'Ver IA para tu negocio', href: '/es/ia-para-pymes' },
    },

    process: {
      tag: 'Cómo Trabajamos',
      title: 'Del concepto al<br><em>lanzamiento</em>',
      launch: { kicker: '¿Listo para despegar?', label: 'Lanza tu proyecto ahora', href: '#contacto' },
      steps: [
        { n: '01', title: 'Descubrimiento', desc: 'Analizamos tu negocio, competidores y mercado local en Houston o Miami para definir la estrategia correcta.' },
        { n: '02', title: 'Estrategia IA', desc: 'Diseñamos el ecosistema digital ideal: sitio, IA, SEO y automatizaciones, todo coordinado.' },
        { n: '03', title: 'Diseño & Dev', desc: 'Construimos cada elemento con precisión. Revisiones constantes hasta que cada detalle sea perfecto.' },
        { n: '04', title: 'Pruebas & QA', desc: 'Pruebas rigurosas en todos los dispositivos. Revisamos velocidad, SEO, accesibilidad y seguridad en cada entrega.' },
        { n: '05', title: 'Lanzamiento', desc: 'Salimos en vivo con soporte en tiempo real. La IA entra en operación y comenzamos a optimizar desde el día uno.' },
      ],
    },

    projects: {
      tag: 'Portafolio',
      title: 'Trabajo real, negocios<br><em>reales</em>',
      cta: { label: 'Inicia tu proyecto', href: '#contacto' },
      items: [
        { name: 'Texas Rush Remove', cat: 'Junk Removal · Houston, TX', url: 'https://texasrushremove.com', display: 'texasrushremove.com', result: 'Reconstruido desde cero + SEO local — ya posiciona.', accent: 'gold', badge: 'Sitio + SEO', tags: ['Reconstruido desde cero', 'SEO local'] },
        { name: 'Move Junk Away', cat: 'Junk Removal · Orlando, FL', url: 'https://movejunkaway.com', display: 'movejunkaway.com', result: 'Reconstruido desde cero + SEO local — ya posiciona.', accent: 'teal', badge: 'Sitio + SEO', tags: ['Reconstruido desde cero', 'SEO local'] },
        { name: "Julio's Landscape TX", cat: 'Paisajismo · Houston, TX', url: 'https://julios-landscape-tx.vercel.app', display: 'julios-landscape-tx.vercel.app', result: 'Marca, identidad y sitio web creados desde cero.', accent: 'gold', badge: 'Marca + Sitio', tags: ['Identidad de marca', 'Sitio a medida'] },
        { name: 'Rosy Nails & Care', cat: 'Salón de uñas · Houston, TX', url: 'https://rosi-nails.vercel.app', display: 'rosi-nails.vercel.app', result: 'Web app a medida: las clientas agendan citas y exploran inspiración de uñas.', accent: 'teal', badge: 'Web app', tags: ['Agenda de citas', 'A medida'] },
      ],
    },

    guarantees: {
      tag: 'Por qué Marcyan',
      title: 'Con lo que puedes<br><em>contar</em>',
      items: [
        { icon: 'lucide:zap', title: 'Propuesta en 24h', desc: 'Cuéntanos tu idea y recibe una propuesta personalizada en menos de 24 horas — sin costo ni compromiso.' },
        { icon: 'lucide:ruler', title: 'Todo a medida', desc: 'Sin plantillas. Cada sitio se diseña y programa desde cero alrededor de tu negocio y tus objetivos.' },
        { icon: 'lucide:radar', title: 'Listo para IA y buscadores', desc: 'HTML rápido que Google y los asistentes de IA pueden leer, para que tu negocio aparezca donde la gente busca hoy.' },
        { icon: 'lucide:languages', title: 'Bilingüe y local', desc: 'Trabajamos contigo en español e inglés, con contexto local real de Houston y Miami.' },
      ],
    },

    locations: {
      tag: 'Nuestras Ciudades',
      title: 'Presentes donde<br>tu negocio <em>crece</em>',
      items: [
        { city: 'Houston', state: 'TX', badge: 'Área de servicio', area: 'Houston y toda el área metropolitana', tel: nap.houston,
          links: [
            { label: 'SEO local en Houston', href: '/es/houston/seo-local' },
            { label: 'Diseño web en Houston', href: '/es/houston/diseno-web' },
          ] },
        { city: 'Miami', state: 'FL', badge: 'Área de servicio', area: 'Miami y toda el área metropolitana', tel: nap.miami,
          links: [
            { label: 'Diseño web en Miami', href: '/es/miami/diseno-web' },
          ] },
      ],
    },

    contact: {
      tag: 'Contacto',
      title: 'Hablemos de<br>tu <em>proyecto</em>',
      desc: 'Cuéntanos tu idea. En menos de 24 horas tendrás una propuesta personalizada, sin compromisos y completamente gratis.',
      info: { hoursLbl: 'Horario', hours: nap.hours },
      form: {
        name: { label: 'Nombre', ph: 'Tu nombre' },
        email: { label: 'Email', ph: 'tu@email.com' },
        company: { label: 'Empresa', ph: 'Nombre de tu empresa' },
        city: { label: 'Ciudad', ph: 'Seleccionar', opts: ['Houston, TX', 'Miami, FL', 'Otra ciudad'] },
        service: { label: 'Servicio de Interés', ph: '¿Qué necesitas?', opts: ['Sitio Web desde Cero', 'Rediseño de Sitio Actual', 'E-Commerce / Tienda Online', 'IA Conversacional / Chatbot', 'SEO & Posicionamiento', 'Branding & Identidad Visual', 'Paquete Completo'] },
        message: { label: 'Cuéntanos tu proyecto', ph: 'Describe brevemente lo que necesitas...' },
        submit: 'Enviar Mensaje',
        sending: 'Enviando…',
        success: '✓ Mensaje enviado',
        error: 'Algo salió mal. Intenta de nuevo o usa nuestro formulario de proyecto completo.',
        emailInvalid: 'Ingresa un email válido para que podamos contactarte.',
        briefLink: 'formulario de proyecto completo',
      },
    },

    footer: {
      tagline: 'Diseño Web Impulsado por IA · Houston & Miami',
      cols: [
        { title: 'Servicios', links: [
          { label: 'Diseño Web', href: '/es/#servicios' },
          { label: 'E-Commerce', href: '/es/#servicios' },
          { label: 'IA para Negocios', href: '/es/ia-para-pymes' },
          { label: 'SEO con IA', href: '/es/#servicios' },
          { label: 'Branding', href: '/es/#servicios' },
          { label: 'Formulario de Proyecto', href: '/formulario' },
        ] },
        { title: 'Empresa', links: [
          { label: 'Proyectos', href: '/es/#proyectos' },
          { label: 'Privacidad', href: '/privacidad' },
          { label: 'Términos', href: '/terminos' },
        ] },
        { title: 'Ciudades', links: [
          { label: 'SEO Local · Houston', href: '/es/houston/seo-local' },
          { label: 'Diseño Web · Houston', href: '/es/houston/diseno-web' },
          { label: 'Diseño Web · Miami', href: '/es/miami/diseno-web' },
        ] },
      ],
      legal: [
        { label: 'Privacidad', href: '/privacidad' },
        { label: 'Términos', href: '/terminos' },
      ],
      copy: '© 2026 Marcyan Studio · Todos los derechos reservados',
    },
  },

  en: {
    locale: 'en' as Locale,

    nav: {
      links: [
        { label: 'Services', href: '#servicios' },
        { label: 'AI', href: '#ia' },
        { label: 'Projects', href: '#proyectos' },
        { label: 'Cities', href: '#ciudades' },
      ] as Link[],
      cta: { label: 'Start Project', href: '#contacto' },
      langLabel: 'ES',
      langHref: '/es/',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },

    hero: {
      tag: 'Operational AI · Houston & Miami',
      h1: 'Web Design<br>that <em>thinks</em><br>for you',
      sub: 'Marcyan Studio combines elite design with operational artificial intelligence to create sites that convert, rank, and evolve — built fast, built to be found.',
      primary: { label: 'Get Free Proposal', href: '#contacto' },
      secondary: { label: 'View Projects', href: '#proyectos' },
      nodes: [
        { label: 'Services', href: '#servicios', icon: 'lucide:layers' },
        { label: 'AI', href: '#ia', icon: 'lucide:sparkles' },
        { label: 'Projects', href: '#proyectos', icon: 'lucide:folder' },
        { label: 'Cities', href: '#ciudades', icon: 'lucide:map-pin' },
      ],
      caso0: {
        label: 'Marcyan · Case #0 (this site)',
        rows: [
          { l: 'Site', v: 'Static HTML' },
          { l: 'AI crawlers', v: 'Readable' },
          { l: 'Languages', v: 'ES · EN' },
          { l: 'Coverage', v: 'Houston · Miami' },
          { l: 'Leads', v: 'Own database' },
        ],
      },
    },

    services: {
      tag: 'Our Services',
      title: 'Everything your<br>brand <em>needs</em>',
      explore: 'Explore',
      featuredBadge: 'Featured service',
      cta: { label: 'Tell us your project', href: '#contacto' },
      items: [
        { n: '01', icon: 'lucide:layout-template', title: 'Premium Web Design', price: 'from $1,500',
          desc: 'High-impact sites built from scratch. Every pixel responds to your brand identity and business goals in Houston and Miami.' },
        { n: '02', icon: 'lucide:message-circle', title: 'Conversational AI', price: 'from $900',
          desc: 'Virtual assistants integrated directly into your site. They serve customers around the clock, answer questions, and capture qualified leads even while you sleep.' },
        { n: '03', icon: 'lucide:shopping-bag', title: 'E-Commerce & Stores', price: 'from $2,900',
          desc: 'Conversion-optimized online sales platforms. Shopify, WooCommerce, or custom solutions with AI for personalized recommendations.' },
        { n: '04', icon: 'lucide:search', title: 'AI-Powered SEO', price: 'from $600/mo',
          desc: 'SEO that keeps up with the market. We use AI to analyze competitors and trends, then continuously refine your strategy to improve how you rank.' },
        { n: '05', icon: 'lucide:palette', title: 'Branding & Identity', price: 'from $750',
          desc: 'Logos, palettes, typography, and complete visual systems. We generate concepts with AI and refine every detail with expert human judgment.' },
        { n: '06', icon: 'lucide:wrench', title: 'Continuous Maintenance', price: 'from $120/mo',
          desc: 'We keep your site healthy: uptime checks, security and software updates, regular backups, and bilingual support in Houston and Miami.' },
      ] as ServiceItem[],
    },

    ai: {
      tag: 'Marcyan Technology',
      title: 'The AI that<br>works for<br><em>your business</em>',
      desc: "We don't use AI as a buzzword. We use it to build faster, write better, and help your business get found — by people and by AI assistants alike.",
      features: [
        { icon: 'lucide:bot', title: 'Found by AI', desc: 'We build in fast static HTML that AI assistants like ChatGPT and Perplexity can actually read — so your business shows up when people ask them.' },
        { icon: 'lucide:pen-tool', title: 'Content & Copy', desc: 'SEO-focused pages and copy, drafted with AI and refined by hand. Bilingual Spanish and English, written for your local market.' },
        { icon: 'lucide:messages-square', title: 'Conversational Assistants', desc: 'Chat assistants that answer your customers, qualify leads, and book appointments around the clock, in their language.' },
        { icon: 'lucide:workflow', title: 'Automations', desc: 'We connect your site to the tools you already use, so new leads, notifications, and follow-ups happen on their own.' },
      ],
    },

    process: {
      tag: 'How We Work',
      title: 'From concept to<br><em>launch</em>',
      launch: { kicker: 'Ready for liftoff?', label: 'Launch your project now', href: '#contacto' },
      steps: [
        { n: '01', title: 'Discovery', desc: 'We analyze your business, competitors, and local market in Houston or Miami to define the right strategy.' },
        { n: '02', title: 'AI Strategy', desc: 'We design the ideal digital ecosystem: site, AI, SEO, and automations — all coordinated.' },
        { n: '03', title: 'Design & Dev', desc: 'We build every element with precision. Constant revisions until every detail is perfect.' },
        { n: '04', title: 'Testing & QA', desc: 'Rigorous testing across all devices — we check speed, SEO, accessibility, and security on every build.' },
        { n: '05', title: 'Launch', desc: 'Go live with live support. AI enters operation and we start optimizing from day one.' },
      ],
    },

    projects: {
      tag: 'Portfolio',
      title: 'Real work, real<br><em>businesses</em>',
      cta: { label: 'Start your project', href: '#contacto' },
      items: [
        { name: 'Texas Rush Remove', cat: 'Junk Removal · Houston, TX', url: 'https://texasrushremove.com', display: 'texasrushremove.com', result: 'Full rebuild from scratch + local SEO — now ranking.', accent: 'gold', badge: 'Site + SEO', tags: ['Rebuilt from scratch', 'Local SEO'] },
        { name: 'Move Junk Away', cat: 'Junk Removal · Orlando, FL', url: 'https://movejunkaway.com', display: 'movejunkaway.com', result: 'Rebuilt from scratch + local SEO — now ranking.', accent: 'teal', badge: 'Site + SEO', tags: ['Rebuilt from scratch', 'Local SEO'] },
        { name: "Julio's Landscape TX", cat: 'Landscaping · Houston, TX', url: 'https://julios-landscape-tx.vercel.app', display: 'julios-landscape-tx.vercel.app', result: 'Brand, identity, and website created from zero.', accent: 'gold', badge: 'Brand + Site', tags: ['Brand identity', 'Custom site'] },
        { name: 'Rosy Nails & Care', cat: 'Nail Salon · Houston, TX', url: 'https://rosi-nails.vercel.app', display: 'rosi-nails.vercel.app', result: 'Custom web app: clients book appointments and browse nail inspiration.', accent: 'teal', badge: 'Web app', tags: ['Appointment booking', 'Custom'] },
      ],
    },

    guarantees: {
      tag: 'Why Marcyan',
      title: 'What you can<br><em>count on</em>',
      items: [
        { icon: 'lucide:zap', title: 'Proposal in 24h', desc: "Tell us your idea and you'll get a personalized proposal in under 24 hours — no cost, no commitment." },
        { icon: 'lucide:ruler', title: 'Built to measure', desc: 'No templates. Every site is designed and coded from scratch around your business and your goals.' },
        { icon: 'lucide:radar', title: 'Ready for AI & search', desc: 'Fast HTML that Google and AI assistants can read, so your business gets found where people are now searching.' },
        { icon: 'lucide:languages', title: 'Bilingual & local', desc: 'We work with you in Spanish and English, with real local context for Houston and Miami.' },
      ],
    },

    locations: {
      tag: 'Our Cities',
      title: 'Present where<br>your business <em>grows</em>',
      items: [
        { city: 'Houston', state: 'TX', badge: 'Service Area', area: 'Houston & greater metro area', tel: nap.houston },
        { city: 'Miami', state: 'FL', badge: 'Service Area', area: 'Miami & greater metro area', tel: nap.miami },
      ],
    },

    contact: {
      tag: 'Contact',
      title: "Let's talk about<br>your <em>project</em>",
      desc: 'Tell us your idea. In less than 24 hours you will have a personalized proposal — no commitment, completely free.',
      info: { hoursLbl: 'Hours', hours: 'Mon–Fri 9am–6pm CT' },
      form: {
        name: { label: 'Name', ph: 'Your name' },
        email: { label: 'Email', ph: 'you@email.com' },
        company: { label: 'Company', ph: 'Your company name' },
        city: { label: 'City', ph: 'Select', opts: ['Houston, TX', 'Miami, FL', 'Other city'] },
        service: { label: 'Service of Interest', ph: 'What do you need?', opts: ['Website from Scratch', 'Redesign of Current Site', 'E-Commerce / Online Store', 'Conversational AI / Chatbot', 'SEO & Positioning', 'Branding & Visual Identity', 'Full Package'] },
        message: { label: 'Tell us about your project', ph: 'Briefly describe what you need...' },
        submit: 'Send Message',
        sending: 'Sending…',
        success: '✓ Message sent',
        error: 'Something went wrong. Please try again, or use our full project form.',
        emailInvalid: 'Please enter a valid email so we can reach you.',
        briefLink: 'full project form',
      },
    },

    footer: {
      tagline: 'AI-Powered Web Design · Houston & Miami',
      cols: [
        { title: 'Services', links: [
          { label: 'Web Design', href: '#servicios' },
          { label: 'E-Commerce', href: '#servicios' },
          { label: 'Conversational AI', href: '#ia' },
          { label: 'AI SEO', href: '#servicios' },
          { label: 'Branding', href: '#servicios' },
          { label: 'Project Form', href: '/formulario' },
        ] },
        { title: 'Company', links: [
          { label: 'Projects', href: '#proyectos' },
          { label: 'Privacy', href: '/privacidad' },
          { label: 'Terms', href: '/terminos' },
        ] },
        { title: 'Cities', links: [
          { label: 'Houston TX', href: '#ciudades' },
          { label: 'Miami FL', href: '#ciudades' },
        ] },
      ],
      legal: [
        { label: 'Privacy', href: '/privacidad' },
        { label: 'Terms', href: '/terminos' },
      ],
      copy: '© 2026 Marcyan Studio · All rights reserved',
    },
  },
};
