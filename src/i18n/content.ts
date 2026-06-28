// ─────────────────────────────────────────────────────────────
// Contenido del sitio (estático por idioma, sin swap JS).
// Portado del contenido honesto de Sprint 0 (public/assets/js/translations.js).
// Cada página /es/ /en/ importa su locale; los componentes son presentacionales.
// (EN se añade al hacer el espejo /en/; por ahora el slice trabaja en ES.)
// ─────────────────────────────────────────────────────────────

export type Locale = 'es' | 'en';

export interface Link { label: string; href: string }
export interface ServiceItem { n: string; icon: string; title: string; desc: string; price: string; href: string }

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
      // Nav plana unificada (home + páginas internas vía clusterNav): páginas REALES.
      links: [
        { label: 'Servicios', href: '/es/servicios' },
        { label: 'Portafolio', href: '/es/portafolio' },
        { label: 'Precios', href: '/es/precios' },
        { label: 'Ciudades', href: '/es/ciudades' },
        { label: 'Nosotros', href: '/es/sobre-nosotros' },
        { label: 'Blog', href: '/es/blog' },
      ] as Link[],
      cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
      langLabel: 'EN',
      langHref: '/en/',
      openMenu: 'Abrir menú',
      closeMenu: 'Cerrar menú',
    },

    hero: {
      tag: 'IA Operativa · Houston & Miami',
      h1: 'Diseño Web<br>que <em>piensa</em><br>por ti',
      sub: 'Sitios bilingües de verdad, en español e inglés, que cargan rápido y que ChatGPT sí puede leer, para que más clientes te encuentren. Propuesta gratis en menos de 24 horas.',
      primary: { label: 'Pedir propuesta gratis', href: '#contacto' },
      secondary: { label: 'Ver Proyectos', href: '#proyectos' },
      // nodos en órbita = enlaces reales (la home no es la única navegación)
      nodes: [
        { label: 'Servicios', href: '#servicios', icon: 'lucide:layers' },
        { label: 'IA', href: '#ia', icon: 'lucide:brain-circuit' },
        { label: 'Proyectos', href: '#proyectos', icon: 'lucide:folder' },
        { label: 'Ciudades', href: '#ciudades', icon: 'lucide:map-pin' },
      ],
    },

    services: {
      tag: 'Nuestros Servicios',
      title: 'Todo lo que tu<br>marca <em>necesita</em>',
      note: 'Precios públicos, sin letra pequeña, incluido el SEO mensual y el mantenimiento.',
      explore: 'Explorar',
      featuredBadge: 'Servicio estrella',
      cta: { label: 'Ver todos los servicios', href: '/es/servicios' },
      // Teaser: lidera con el ancla baja de cada producto. Precios espejo de
      // src/i18n/pricing.ts (PRICE_ANCHORS); el catálogo completo vive en /es/servicios.
      items: [
        { n: '01', icon: 'lucide:layout-template', title: 'Diseño Web', price: 'desde $400', href: '/es/houston/diseno-web',
          desc: 'Sitios de alto impacto a medida: desde una landing que convierte hasta un sitio completo, rápido y bilingüe, listo para Google y la IA.' },
        { n: '02', icon: 'lucide:messages-square', title: 'IA Conversacional', price: 'desde $500', href: '/es/ia-para-pymes',
          desc: 'Asistentes que atienden a tus clientes, responden preguntas y captan prospectos las 24 horas, en español e integrados a tu sitio.' },
        { n: '03', icon: 'marcyan-ai', title: 'SEO para IA', price: 'Diagnóstico gratis', href: '/es/houston/seo-para-ia',
          desc: 'Que ChatGPT, Gemini y Meta AI te recomienden a ti cuando alguien busca lo que ofreces. Empieza con un diagnóstico de visibilidad gratis.' },
        { n: '04', icon: 'lucide:shopping-bag', title: 'E-Commerce & Tiendas', price: 'desde $900', href: '/es/houston/ecommerce',
          desc: 'Tiendas en línea para vender de verdad: catálogo, carrito y pagos seguros, en experiencia bilingüe, desde una tienda esencial hasta una a medida.' },
        { n: '05', icon: 'lucide:search', title: 'SEO Local', price: 'desde $300', href: '/es/houston/seo-local',
          desc: 'Aparece cuando tus clientes buscan en Google y en Maps. Optimizamos tu Perfil de Google, tu sitio y tus reseñas, puntual o mes a mes.' },
        { n: '06', icon: 'lucide:palette', title: 'Branding & Identidad', price: 'desde $150', href: '/es/houston/branding',
          desc: 'Desde solo tu logo hasta una identidad completa: paleta, tipografías y guía de uso, generadas con IA y afinadas con criterio humano.' },
        { n: '07', icon: 'lucide:wrench', title: 'Mantenimiento Continuo', price: 'desde $120/mes', href: '#contacto',
          desc: 'Mantenemos tu sitio sano: disponibilidad, seguridad, respaldos periódicos y soporte bilingüe en Houston y Miami.' },
      ] as ServiceItem[],
    },

    ai: {
      tag: 'Tecnología Marcyan',
      title: 'La IA que<br>trabaja para<br><em>tu negocio</em>',
      desc: 'El asistente que te responde aquí mismo es el producto que construimos para ti: usamos la IA primero en nosotros, para entregar tu web más rápido y para que ChatGPT y Gemini puedan encontrarte.',
      features: [
        { icon: 'lucide:scan-search', title: 'Que la IA te encuentre', desc: 'Construimos en HTML estático y rápido que asistentes como ChatGPT y Gemini sí pueden leer, para que tu negocio aparezca cuando les preguntan.' },
        { icon: 'lucide:pen-tool', title: 'Contenido y textos', desc: 'Páginas y textos enfocados en SEO, redactados con IA y afinados a mano. Bilingüe español e inglés, escritos para tu mercado local.' },
        { icon: 'lucide:bot-message-square', title: 'Asistentes conversacionales', desc: 'Asistentes de chat que atienden a tus clientes, califican prospectos y agendan citas las 24 horas, en su idioma.' },
        { icon: 'lucide:waypoints', title: 'Automatizaciones', desc: 'Conectamos tu sitio con las herramientas que ya usas, para que los nuevos prospectos, avisos y seguimientos ocurran solos.' },
      ],
      cta: { label: 'Ver IA para tu negocio', href: '/es/ia-para-pymes' },
      // Demo ILUSTRATIVO del asistente (texto de muestra, editable). No es copy de negocio.
      demo: {
        title: 'Asistente Marcyan', status: 'En línea', lang: 'ES · EN',
        messages: [
          { who: 'user', text: 'Hola, ¿hacen páginas para restaurantes?' },
          { who: 'ai', text: '¡Claro! Diseñamos sitios con menú, reservas y pedidos. ¿Cómo se llama tu negocio?', meta: 'Responde al instante' },
          { who: 'user', text: 'Tacos El Güero, en Houston.' },
          { who: 'ai', text: 'Perfecto 🌮 Te preparo una propuesta gratis en 24 h. ¿A qué correo te la enviamos?', meta: 'Califica el prospecto' },
          { who: 'user', text: 'gerardo@tacoselguero.com' },
        ],
        flow: ['Mensaje', 'IA responde', 'Lead guardado', 'Te avisamos'],
        toast: { title: 'Nuevo lead capturado', sub: 'Enviado a tu CRM · WhatsApp notificado' },
      },
    },

    process: {
      tag: 'Cómo Trabajamos',
      title: 'Del concepto al<br><em>lanzamiento</em>',
      launch: { kicker: '¿Listo para despegar?', label: 'Lanza tu proyecto ahora', href: '#contacto' },
      steps: [
        { n: '01', title: 'Propuesta en 24h', desc: 'Nos cuentas tu negocio y en menos de 24 horas tienes una propuesta clara, gratis y sin compromiso, sin agendar una llamada de ventas para enterarte de algo.' },
        { n: '02', title: 'Plan a la vista', desc: 'Acordamos el alcance con los precios sobre la mesa, incluido el SEO mensual y el mantenimiento que otros te esconden, para que sepas qué pagas antes de tocar una sola línea de código.' },
        { n: '03', title: 'Diseño bilingüe', desc: 'Construimos tu sitio en español e inglés de verdad, no con un botón de Google Translate, y lo revisas en vivo hasta que suene como tú en los dos idiomas.' },
        { n: '04', title: 'Que te encuentren', desc: 'Lo dejamos rápido y en HTML limpio que ChatGPT, Gemini y Meta AI sí pueden leer, para que tu negocio aparezca cuando alguien pregunta por lo que ofreces.' },
        { n: '05', title: 'En vivo y contigo', desc: 'Salimos en vivo y tu asistente de IA, el mismo que te atiende aquí, entra a atender clientes; seguimos contigo después del lanzamiento, no desaparecemos.' },
      ],
    },

    projects: {
      tag: 'Portafolio',
      title: 'Trabajo real, negocios<br><em>reales</em>',
      cta: { label: 'Pedir propuesta gratis', href: '#contacto' },
      more: 'Ver Proyectos',
      shotAlt: { pc: 'vista de escritorio', movil: 'vista móvil' },
      items: [
        { name: 'Texas Rush Remove', cat: 'Junk Removal · Houston, TX', result: 'Reconstruido desde cero más SEO local. Ya posiciona.', accent: 'gold', badge: 'Sitio + SEO', tags: ['Reconstruido desde cero', 'SEO local'] },
        { name: 'Move Junk Away', cat: 'Junk Removal · Orlando, FL', result: 'Reconstruido desde cero más SEO local. Ya posiciona.', accent: 'teal', badge: 'Sitio + SEO', tags: ['Reconstruido desde cero', 'SEO local'] },
        { name: "Julio's Landscape TX", cat: 'Paisajismo · Houston, TX', result: 'Marca, identidad y sitio web creados desde cero.', accent: 'gold', badge: 'Marca + Sitio', tags: ['Identidad de marca', 'Sitio a medida'] },
        { name: 'Rosy Nails & Care', cat: 'Salón de uñas · Houston, TX', result: 'Web app a medida: las clientas agendan citas y exploran inspiración de uñas.', accent: 'teal', badge: 'Web app', tags: ['Agenda de citas', 'A medida'] },
      ],
    },

    guarantees: {
      tag: 'Por qué Marcyan',
      title: 'Con lo que puedes<br><em>contar</em>',
      featuredBadge: 'Diferencial',
      scanLabel: 'Legible para IA',
      items: [
        { icon: 'lucide:zap', title: 'Propuesta en 24h', desc: 'Cuéntanos tu idea y recibe una propuesta personalizada en menos de 24 horas, sin costo ni compromiso.' },
        { icon: 'lucide:ruler', title: 'Todo a medida', desc: 'Sin plantillas. Cada sitio se diseña y programa desde cero alrededor de tu negocio y tus objetivos.' },
        { icon: 'lucide:radar', title: 'Listo para IA y buscadores', desc: 'HTML rápido que Google y los asistentes de IA pueden leer, para que tu negocio aparezca donde la gente busca hoy.' },
        { icon: 'lucide:languages', title: 'Bilingüe y local', desc: 'Trabajamos contigo en español e inglés, con contexto local real de Houston y Miami.' },
      ],
    },

    locations: {
      tag: 'Nuestras Ciudades',
      title: 'Presentes donde<br>tu negocio <em>crece</em>',
      items: [
        { city: 'Houston', state: 'TX', badge: 'Área de servicio',
          tagline: 'Space City', taglineIcon: 'lucide:sparkle', illo: 'houston',
          area: 'Houston y toda el área metropolitana', tel: nap.houston,
          stateFull: 'Texas, USA', coords: '29.7604° N, 95.3698° W',
          connected: 'Conectados con Houston',
          links: [
            { label: 'Agencia en Houston', sub: 'Conoce nuestro equipo', href: '/es/houston', icon: 'lucide:users' },
            { label: 'Diseño web en Houston', sub: 'Sitios que inspiran confianza', href: '/es/houston/diseno-web', icon: 'lucide:monitor' },
            { label: 'SEO local en Houston', sub: 'Posicionamos tu negocio', href: '/es/houston/seo-local', icon: 'lucide:globe' },
            { label: 'Tienda en línea en Houston', sub: 'Vende más. Sin límites', href: '/es/houston/ecommerce', icon: 'lucide:shopping-bag' },
            { label: 'IA conversacional en Houston', sub: 'Atención que convierte', href: '/es/houston/ia-conversacional', icon: 'lucide:message-square' },
          ] },
        { city: 'Miami', state: 'FL', badge: 'Área de servicio',
          tagline: 'Magic City', taglineIcon: 'lucide:waves', illo: 'miami',
          area: 'Miami y toda el área metropolitana', tel: nap.miami,
          stateFull: 'Florida, USA', coords: '25.7617° N, 80.1918° W',
          connected: 'Conectados con Miami',
          links: [
            { label: 'Agencia en Miami', sub: 'Conoce nuestro equipo', href: '/es/miami', icon: 'lucide:users' },
            { label: 'Diseño web en Miami', sub: 'Diseños que enamoran', href: '/es/miami/diseno-web', icon: 'lucide:monitor' },
            { label: 'SEO local en Miami', sub: 'Más visibilidad, más clientes', href: '/es/miami/seo-local', icon: 'lucide:globe' },
            { label: 'Tienda en línea en Miami', sub: 'Vende más. Sin límites', href: '/es/miami/ecommerce', icon: 'lucide:shopping-bag' },
            { label: 'IA conversacional en Miami', sub: 'Atención que conecta', href: '/es/miami/ia-conversacional', icon: 'lucide:message-square' },
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
        phone: { label: 'Teléfono (opcional)', ph: 'Tu teléfono o WhatsApp' },
        service: { label: 'Servicio de Interés', ph: '¿Qué necesitas?', opts: ['Diseño Web', 'Rediseño de Sitio Actual', 'E-Commerce / Tienda Online', 'IA Conversacional / Chatbot', 'SEO Local', 'SEO para IA (Visibilidad en IA)', 'Branding & Identidad', 'Mantenimiento Continuo', 'Paquete Completo'] },
        message: { label: 'Cuéntanos tu proyecto', ph: 'Describe brevemente lo que necesitas...' },
        submit: 'Enviar Mensaje',
        sending: 'Enviando…',
        success: 'Recibido. Te contactamos en menos de 24h. Tu folio:',
        error: 'Algo salió mal. Intenta de nuevo o usa nuestro formulario de proyecto completo.',
        emailInvalid: 'Ingresa un email válido para que podamos contactarte.',
        briefLink: 'formulario de proyecto completo',
      },
    },

    footer: {
      tagline: 'Diseño Web Impulsado por IA · Houston & Miami',
      cta: { label: 'Pedir propuesta gratis', href: '/formulario' },
      cols: [
        { title: 'Servicios', links: [
          { label: 'Todos los servicios', href: '/es/servicios' },
          { label: 'Precios', href: '/es/precios' },
          { label: 'Diseño Web', href: '/es/houston/diseno-web' },
          { label: 'SEO para IA', href: '/es/houston/seo-para-ia' },
          { label: 'E-Commerce', href: '/es/houston/ecommerce' },
          { label: 'IA para Negocios', href: '/es/ia-para-pymes' },
          { label: 'SEO Local', href: '/es/houston/seo-local' },
          { label: 'Branding', href: '/es/houston/branding' },
          { label: 'Formulario de Proyecto', href: '/formulario' },
        ] },
        { title: 'Empresa', links: [
          { label: 'Sobre nosotros', href: '/es/sobre-nosotros' },
          { label: 'Portafolio', href: '/es/portafolio' },
          { label: 'Blog', href: '/es/blog' },
          { label: 'Privacidad', href: '/privacidad' },
          { label: 'Términos', href: '/terminos' },
        ] },
        { title: 'Ciudades', links: [
          { label: 'Houston y Miami', href: '/es/ciudades' },
          { label: 'Agencia en Houston', href: '/es/houston' },
          { label: 'Diseño Web · Houston', href: '/es/houston/diseno-web' },
          { label: 'IA Conversacional · Houston', href: '/es/houston/ia-conversacional' },
          { label: 'Agencia en Miami', href: '/es/miami' },
          { label: 'Diseño Web · Miami', href: '/es/miami/diseno-web' },
          { label: 'IA Conversacional · Miami', href: '/es/miami/ia-conversacional' },
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
      cta: { label: 'Get a free proposal', href: '#contacto' },
      langLabel: 'ES',
      langHref: '/es/',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },

    hero: {
      tag: 'Operational AI · Houston & Miami',
      h1: 'Web Design<br>that <em>thinks</em><br>for you',
      sub: 'Truly bilingual sites, in Spanish and English, that load fast and that ChatGPT can actually read, so more customers find you. Free proposal in under 24 hours.',
      primary: { label: 'Get a free proposal', href: '#contacto' },
      secondary: { label: 'View Projects', href: '#proyectos' },
      nodes: [
        { label: 'Services', href: '#servicios', icon: 'lucide:layers' },
        { label: 'AI', href: '#ia', icon: 'lucide:brain-circuit' },
        { label: 'Projects', href: '#proyectos', icon: 'lucide:folder' },
        { label: 'Cities', href: '#ciudades', icon: 'lucide:map-pin' },
      ],
    },

    services: {
      tag: 'Our Services',
      title: 'Everything your<br>brand <em>needs</em>',
      note: 'Public pricing, no fine print, down to monthly SEO and maintenance.',
      explore: 'Explore',
      featuredBadge: 'Featured service',
      cta: { label: 'Tell us your project', href: '#contacto' },
      // Teaser: leads with each product's low anchor. Mirror of src/i18n/pricing.ts.
      items: [
        { n: '01', icon: 'lucide:layout-template', title: 'Web Design', price: 'from $400', href: '#contacto',
          desc: 'High-impact custom sites: from a landing page that converts to a complete, fast, bilingual site, ready for Google and AI.' },
        { n: '02', icon: 'lucide:messages-square', title: 'Conversational AI', price: 'from $500', href: '#contacto',
          desc: 'Assistants that serve your customers, answer questions, and capture leads around the clock, in their language and built into your site.' },
        { n: '03', icon: 'marcyan-ai', title: 'AI SEO', price: 'Free audit', href: '#contacto',
          desc: 'Get recommended by ChatGPT, Gemini, and Meta AI when people search for what you offer. Starts with a free AI-visibility audit.' },
        { n: '04', icon: 'lucide:shopping-bag', title: 'E-Commerce & Stores', price: 'from $900', href: '#contacto',
          desc: 'Online stores built to actually sell: catalog, cart, and secure payments, in a bilingual experience, from an essential store to a custom one.' },
        { n: '05', icon: 'lucide:search', title: 'Local SEO', price: 'from $300', href: '#contacto',
          desc: 'Show up when your customers search on Google and Maps. We optimize your Google Business Profile, your site, and your reviews, one-time or monthly.' },
        { n: '06', icon: 'lucide:palette', title: 'Branding & Identity', price: 'from $150', href: '#contacto',
          desc: 'From just your logo to a full identity: palette, typography, and usage guide, generated with AI and refined with expert human judgment.' },
        { n: '07', icon: 'lucide:wrench', title: 'Continuous Maintenance', price: 'from $120/mo', href: '#contacto',
          desc: 'We keep your site healthy: uptime, security, regular backups, and bilingual support in Houston and Miami.' },
      ] as ServiceItem[],
    },

    ai: {
      tag: 'Marcyan Technology',
      title: 'The AI that<br>works for<br><em>your business</em>',
      desc: 'The assistant answering you right here is the product we build for you: we put AI to work on ourselves first, to ship your site faster and help ChatGPT and Gemini find you.',
      features: [
        { icon: 'lucide:scan-search', title: 'Found by AI', desc: 'We build in fast static HTML that AI assistants like ChatGPT and Gemini can actually read, so your business shows up when people ask them.' },
        { icon: 'lucide:pen-tool', title: 'Content & Copy', desc: 'SEO-focused pages and copy, drafted with AI and refined by hand. Bilingual Spanish and English, written for your local market.' },
        { icon: 'lucide:bot-message-square', title: 'Conversational Assistants', desc: 'Chat assistants that answer your customers, qualify leads, and book appointments around the clock, in their language.' },
        { icon: 'lucide:waypoints', title: 'Automations', desc: 'We connect your site to the tools you already use, so new leads, notifications, and follow-ups happen on their own.' },
      ],
      // Illustrative assistant demo (sample text, editable). Not business copy.
      demo: {
        title: 'Marcyan Assistant', status: 'Online', lang: 'ES · EN',
        messages: [
          { who: 'user', text: 'Hi, do you build websites for restaurants?' },
          { who: 'ai', text: 'Absolutely! We design sites with menus, reservations and ordering. What is your business called?', meta: 'Replies instantly' },
          { who: 'user', text: 'Tacos El Güero, in Houston.' },
          { who: 'ai', text: 'Perfect 🌮 I will prepare a free proposal within 24 h. What email should we send it to?', meta: 'Qualifies the lead' },
          { who: 'user', text: 'gerardo@tacoselguero.com' },
        ],
        flow: ['Message', 'AI replies', 'Lead saved', 'We notify you'],
        toast: { title: 'New lead captured', sub: 'Sent to your CRM · WhatsApp notified' },
      },
    },

    process: {
      tag: 'How We Work',
      title: 'From concept to<br><em>launch</em>',
      launch: { kicker: 'Ready for liftoff?', label: 'Launch your project now', href: '#contacto' },
      steps: [
        { n: '01', title: 'Proposal in 24h', desc: 'Tell us about your business and within 24 hours you get a clear proposal: free, no strings, no sales call required just to hear back.' },
        { n: '02', title: 'Plan in plain sight', desc: 'We agree on scope with prices on the table, including the monthly SEO and maintenance others hide from you, so you know what you pay before we touch a single line of code.' },
        { n: '03', title: 'Bilingual by design', desc: 'We build your site in real Spanish and English, not a Google Translate toggle, and you review it live until it sounds like you in both languages.' },
        { n: '04', title: 'Get found', desc: 'We ship it fast and in clean HTML that ChatGPT, Gemini, and Meta AI can actually read, so your business shows up when people ask for what you offer.' },
        { n: '05', title: 'Live, with you', desc: 'We go live and your AI assistant, the same one helping you here, starts handling customers; we stay with you after launch instead of disappearing.' },
      ],
    },

    projects: {
      tag: 'Portfolio',
      title: 'Real work, real<br><em>businesses</em>',
      cta: { label: 'Get a free proposal', href: '#contacto' },
      more: 'View Projects',
      shotAlt: { pc: 'desktop view', movil: 'mobile view' },
      items: [
        { name: 'Texas Rush Remove', cat: 'Junk Removal · Houston, TX', result: 'Full rebuild from scratch plus local SEO. Now ranking.', accent: 'gold', badge: 'Site + SEO', tags: ['Rebuilt from scratch', 'Local SEO'] },
        { name: 'Move Junk Away', cat: 'Junk Removal · Orlando, FL', result: 'Full rebuild from scratch plus local SEO. Now ranking.', accent: 'teal', badge: 'Site + SEO', tags: ['Rebuilt from scratch', 'Local SEO'] },
        { name: "Julio's Landscape TX", cat: 'Landscaping · Houston, TX', result: 'Brand, identity, and website created from zero.', accent: 'gold', badge: 'Brand + Site', tags: ['Brand identity', 'Custom site'] },
        { name: 'Rosy Nails & Care', cat: 'Nail Salon · Houston, TX', result: 'Custom web app: clients book appointments and browse nail inspiration.', accent: 'teal', badge: 'Web app', tags: ['Appointment booking', 'Custom'] },
      ],
    },

    guarantees: {
      tag: 'Why Marcyan',
      title: 'What you can<br><em>count on</em>',
      featuredBadge: 'Differentiator',
      scanLabel: 'AI-readable',
      items: [
        { icon: 'lucide:zap', title: 'Proposal in 24h', desc: "Tell us your idea and you'll get a personalized proposal in under 24 hours, no cost, no commitment." },
        { icon: 'lucide:ruler', title: 'Built to measure', desc: 'No templates. Every site is designed and coded from scratch around your business and your goals.' },
        { icon: 'lucide:radar', title: 'Ready for AI & search', desc: 'Fast HTML that Google and AI assistants can read, so your business gets found where people are now searching.' },
        { icon: 'lucide:languages', title: 'Bilingual & local', desc: 'We work with you in Spanish and English, with real local context for Houston and Miami.' },
      ],
    },

    locations: {
      tag: 'Our Cities',
      title: 'Present where<br>your business <em>grows</em>',
      items: [
        { city: 'Houston', state: 'TX', badge: 'Service Area',
          tagline: 'Space City', taglineIcon: 'lucide:sparkle', illo: 'houston',
          area: 'Houston & greater metro area', tel: nap.houston,
          stateFull: 'Texas, USA', coords: '29.7604° N, 95.3698° W',
          connected: 'Connected with Houston' },
        { city: 'Miami', state: 'FL', badge: 'Service Area',
          tagline: 'Magic City', taglineIcon: 'lucide:waves', illo: 'miami',
          area: 'Miami & greater metro area', tel: nap.miami,
          stateFull: 'Florida, USA', coords: '25.7617° N, 80.1918° W',
          connected: 'Connected with Miami' },
      ],
    },

    contact: {
      tag: 'Contact',
      title: "Let's talk about<br>your <em>project</em>",
      desc: 'Tell us your idea. In less than 24 hours you will have a personalized proposal, no commitment, completely free.',
      info: { hoursLbl: 'Hours', hours: 'Mon–Fri 9am–6pm CT' },
      form: {
        name: { label: 'Name', ph: 'Your name' },
        email: { label: 'Email', ph: 'you@email.com' },
        company: { label: 'Company', ph: 'Your company name' },
        city: { label: 'City', ph: 'Select', opts: ['Houston, TX', 'Miami, FL', 'Other city'] },
        phone: { label: 'Phone (optional)', ph: 'Phone or WhatsApp' },
        service: { label: 'Service of Interest', ph: 'What do you need?', opts: ['Web Design', 'Website Redesign', 'E-Commerce / Online Store', 'Conversational AI / Chatbot', 'Local SEO', 'AI Visibility (AEO)', 'Branding & Identity', 'Ongoing Maintenance', 'Complete Package'] },
        message: { label: 'Tell us about your project', ph: 'Briefly describe what you need...' },
        submit: 'Send Message',
        sending: 'Sending…',
        success: 'Got it. We will reach out within 24h. Your reference:',
        error: 'Something went wrong. Please try again, or use our full project form.',
        emailInvalid: 'Please enter a valid email so we can reach you.',
        briefLink: 'full project form',
      },
    },

    footer: {
      tagline: 'AI-Powered Web Design · Houston & Miami',
      cta: { label: 'Get a free proposal', href: '/formulario' },
      cols: [
        { title: 'Services', links: [
          { label: 'Web Design', href: '#servicios' },
          { label: 'E-Commerce', href: '#servicios' },
          { label: 'Conversational AI', href: '#ia' },
          { label: 'Local SEO', href: '#servicios' },
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
