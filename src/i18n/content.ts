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
        { label: 'Servicios', href: '#servicios' },
        { label: 'IA', href: '#ia' },
        { label: 'Proyectos', href: '#proyectos' },
        { label: 'Ciudades', href: '#ciudades' },
      ] as Link[],
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
    },

    process: {
      tag: 'Cómo Trabajamos',
      title: 'Del concepto al<br><em>lanzamiento</em>',
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
        { name: 'Texas Rush Remove', cat: 'Junk Removal · Houston, TX', url: 'https://texasrushremove.com', display: 'texasrushremove.com', result: 'Reconstruido desde cero + SEO local — ya posiciona.', accent: 'gold' },
        { name: 'Move Junk Away', cat: 'Junk Removal · Orlando, FL', url: 'https://movejunkaway.com', display: 'movejunkaway.com', result: 'Reconstruido desde cero + SEO local — ya posiciona.', accent: 'teal' },
        { name: "Julio's Landscape TX", cat: 'Paisajismo · Houston, TX', url: 'https://julios-landscape-tx.vercel.app', display: 'julios-landscape-tx.vercel.app', result: 'Marca, identidad y sitio web creados desde cero.', accent: 'gold' },
        { name: 'Rosy Nails & Care', cat: 'Salón de uñas · Houston, TX', url: 'https://rosi-nails.vercel.app', display: 'rosi-nails.vercel.app', result: 'Web app a medida: las clientas agendan citas y exploran inspiración de uñas.', accent: 'teal' },
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
        { city: 'Houston', state: 'TX', badge: 'Área de servicio', area: 'Houston y toda el área metropolitana', tel: nap.houston },
        { city: 'Miami', state: 'FL', badge: 'Área de servicio', area: 'Miami y toda el área metropolitana', tel: nap.miami },
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
          { label: 'Diseño Web', href: '#servicios' },
          { label: 'E-Commerce', href: '#servicios' },
          { label: 'IA Conversacional', href: '#ia' },
          { label: 'SEO con IA', href: '#servicios' },
          { label: 'Branding', href: '#servicios' },
          { label: 'Formulario de Proyecto', href: '/formulario' },
        ] },
        { title: 'Empresa', links: [
          { label: 'Proyectos', href: '#proyectos' },
          { label: 'Privacidad', href: '/privacidad' },
          { label: 'Términos', href: '/terminos' },
        ] },
        { title: 'Ciudades', links: [
          { label: 'Houston TX', href: '#ciudades' },
          { label: 'Miami FL', href: '#ciudades' },
        ] },
      ],
      copy: '© 2026 Marcyan Studio · Todos los derechos reservados',
    },
  },
};
