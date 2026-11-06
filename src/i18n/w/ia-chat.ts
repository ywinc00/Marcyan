// ─────────────────────────────────────────────────────────────
// Copy nuevo del tipo `ia-chat` · IA conversacional por ciudad (design/rediseno-workos.md
// §4.12, ola 2). Solo texto LIBRE (eyebrow, cola, títulos de sección, textos de objetos).
// Lo congelado (H1, answer, faq, local.paragraphs, service, meta) sigue en clusters.ts y se
// pinta tal cual desde allí. Sin guiones conectores, "dominamos" la IA, sin cifras ni
// reseñas inventadas; las conversaciones son de EJEMPLO y van rotuladas.
// Marcy nunca da una cifra por chat (como en producción): "te paso la propuesta".
// ─────────────────────────────────────────────────────────────

export type IaCity = 'houston' | 'miami';

type Kind = 'ok' | 'mid' | 'off';

const base = (city: IaCity) => {
  const H = city === 'houston';
  const name = H ? 'Houston' : 'Miami';
  const zone = H ? 'Katy' : 'Doral';
  return {
    cityName: name,
    // Sin cola: H1 noche + cola pasaban de 2 líneas a 1440 (regla de §2.14); la idea abre la bajada.
    lead: H
      ? 'Tu recepcionista que no duerme: contesta tus mensajes, agenda citas y te pasa lo que necesita una persona, en español o en inglés.'
      : 'Tu recepcionista que no duerme: contesta tu WhatsApp, toma reservas y te pasa lo que necesita una persona, en tu español o en inglés.',
    primary: 'Quiero a Marcy',
    link: 'Ver preguntas',
    // Acto 2 del hero: ocupa la línea de la pregunta del acto 1 (sin hueco encima del H1).
    respondido: 'Respondido por Marcy.',

    // 01 · Sin Marcy / con Marcy (W-CORE-25)
    sinCon: {
      label: 'Lo que se te escapa',
      title: H
        ? '<span class="w-tone">Mensajes sin contestar.</span> Clientes que marcan al siguiente.'
        : '<span class="w-tone">WhatsApp sin contestar.</span> Clientes que le escriben a otro.',
      lead: H
        ? 'Mientras estás en una obra o manejando, los mensajes se acumulan. Toca el interruptor y mira la diferencia.'
        : 'Entre el servicio de la noche y el cierre de caja, los mensajes se acumulan. Toca el interruptor y mira la diferencia.',
      labels: ['Sin Marcy', 'Con Marcy'] as [string, string],
      sin: [
        { text: '¿Tienen cita para el sábado?', from: 'WhatsApp', time: '9:40 p. m.' },
        { text: '¿Cuánto cuesta el servicio?', from: 'Instagram', time: '10:15 p. m.' },
        { text: 'Llamada perdida', kind: 'notice' as const, time: '8:05 a. m.' },
        { text: '¿Siguen abiertos?', from: 'Web', time: '11:02 p. m.' },
        { text: 'Mensaje de voz sin escuchar', kind: 'notice' as const, time: '7:48 a. m.' },
        { text: H ? '¿Hacen presupuestos en Pearland?' : '¿Atienden en Brickell?', from: 'WhatsApp', time: '7:12 p. m.' },
        { text: '¿Me pueden llamar mañana temprano?', from: 'WhatsApp', time: '10:51 p. m.' },
        { text: 'Formulario sin respuesta', kind: 'notice' as const, time: 'Ayer' },
        { text: 'Sigo esperando, ¿me contestan?', from: 'Instagram', time: '9:30 a. m.' },
      ],
      conTitle: 'Todo contestado',
      con: [
        { label: 'Respondido', kind: 'ok' as Kind, note: '¿Tienen cita para el sábado? Apartó las 10:00 a. m.' },
        { label: 'Respondido', kind: 'ok' as Kind, note: '¿Siguen abiertos? Agendó la primera visita' },
        { label: 'Te lo pasa', kind: 'mid' as Kind, note: '¿Cuánto cuesta? Te pide la propuesta' },
        { label: 'Respondido', kind: 'ok' as Kind, note: H ? '¿Presupuestos en Pearland? Sí, está en tu zona' : '¿Atienden en Brickell? Sí, está en tu zona' },
        { label: 'Te lo pasa', kind: 'mid' as Kind, note: '¿Me llaman mañana? Te deja la nota' },
      ],
    },

    // 02 · Contesta en cada canal (MazoHilos, P05 · W-ADV-22). Canales que Marcy contesta (§5-14).
    canales: {
      label: 'Contesta en cada canal',
      title: '<span class="w-tone">Contesta en cada canal.</span> Con la misma voz en todos.',
      text: 'Tu web, tu WhatsApp, tu Instagram y tu Messenger: Marcy lleva cada conversación con los datos de tu negocio y no deja ninguna a medias. Antes de empezar te decimos cuáles se pueden conectar en tu caso.',
      points: [
        ['Tu web', 'Contesta en el chat de tu página, a cualquier hora.'],
        ['WhatsApp', 'Agenda y responde sin que sueltes lo que estás haciendo.'],
        ['Instagram', 'Los mensajes directos no se quedan sin leer.'],
        ['Messenger', 'Los mensajes de tu página de Facebook, contestados a tiempo.'],
      ] as [string, string][],
      sr: 'Ejemplo: Marcy contesta a tus clientes en tu web, WhatsApp, Instagram y Messenger, agenda citas y te pasa lo importante.',
      // Mazo de hilos (EJEMPLO). Las personas son las del hero; horario del negocio de ejemplo:
      // lun a sáb, 9:00 a. m. a 7:00 p. m. (el mismo de las reglas y de "Así empiezas").
      hilos: [
        {
          canal: 'WhatsApp', logo: 'whatsapp' as const, quien: 'Luis T.', ini: 'LT', color: ['#E9DCCB', '#6B4E2E'] as [string, string],
          responder: 'Responder a Luis T.',
          msgs: [
            { h: '11:21 p. m.', t: 'Buenas noches, ¿cuánto tarda una cotización?' },
            { m: true, h: '11:21 p. m.', t: 'Hola, Luis. Depende del trabajo: si me mandas una foto, el dueño te la prepara. ¿Te aparto una visita?' },
            { h: '11:22 p. m.', t: 'Sí, el sábado en la mañana.' },
            { m: true, h: '11:22 p. m.', t: 'Listo: sábado a las 10:00 a. m. Te llega la confirmación por aquí.' },
          ],
        },
        {
          canal: 'Instagram', logo: 'instagram' as const, quien: 'marisol.hz', ini: 'MH', color: ['#F3DCE4', '#8C3A5B'] as [string, string],
          responder: 'Responder a marisol.hz',
          msgs: [
            { h: '10:52 p. m.', t: `¿Hacen visitas en ${zone}? Quiero cambiar el fregadero.` },
            { m: true, h: '10:52 p. m.', t: `Sí, ${zone} está en nuestra zona. Tengo el lunes a las 9:00 a. m. o el martes a las 4:00 p. m.` },
            { h: '10:53 p. m.', t: 'El martes me va mejor.' },
            { m: true, h: '10:53 p. m.', t: 'Apartado el martes a las 4:00 p. m. Si te surge algo, escríbeme aquí.' },
          ],
        },
        {
          canal: 'Messenger', logo: 'messenger' as const, quien: 'Rosa G.', ini: 'RG', color: ['#DCE6F5', '#2F5689'] as [string, string], en: true,
          responder: 'Responder a Rosa G.',
          msgs: [
            { h: '11:06 p. m.', t: 'Hi! Could someone come by this week for an estimate?' },
            { m: true, h: '11:06 p. m.', t: 'Hi Rosa! Sure. I have Thursday at 11:00 AM or Friday at 3:00 PM. Which works for you?' },
            { h: '11:07 p. m.', t: 'Friday works.' },
            { m: true, h: '11:07 p. m.', t: "Booked: Friday at 3:00 PM. You'll get a reminder the day before." },
          ],
        },
        {
          canal: 'Tu web', logo: undefined, quien: 'Carlos P.', ini: 'CP', color: ['#DDEBDF', '#2F6B45'] as [string, string],
          responder: 'Responder a Carlos P.',
          msgs: [
            { h: '11:02 p. m.', t: '¿Pueden venir esta semana a ver la casa?' },
            { m: true, h: '11:02 p. m.', t: 'Hola, Carlos. Sí: tengo el miércoles a las 5:00 p. m. ¿Te lo aparto?' },
            { h: '11:03 p. m.', t: 'Sí. ¿Y cuánto costaría pintarla entera?' },
            { m: true, h: '11:03 p. m.', t: 'Eso lo cotiza el dueño al verla. Ya le pasé tu mensaje con el resumen.' },
          ],
        },
      ] as { canal: string; logo?: 'whatsapp' | 'instagram' | 'messenger'; quien: string; ini: string; color: [string, string]; en?: boolean; responder: string; msgs: { m?: boolean; h: string; t: string }[] }[],
    },

    // 03 · Cómo trabaja (W-ADV-05 + W-ADV-06)
    pasos: {
      label: 'Cómo trabaja',
      title: '<span class="w-tone">Entiende, actúa</span> y te dice qué hizo.',
      lead: 'Cada mensaje sigue el mismo camino: Marcy entiende qué quiere el cliente, usa los datos de tu negocio y decide si lo resuelve o te lo pasa.',
      steps: [
        { label: 'Paso 01', title: 'Entiende lo que le piden', text: 'Lee el mensaje como lo escribió tu cliente, en español, en inglés o mezclado.' },
        { label: 'Paso 02', title: 'Usa los datos de tu negocio', text: 'Tu horario, tus servicios y tu zona. Lo que no está en tus datos, no lo inventa.' },
        { label: 'Paso 03', title: 'Resuelve o te lo pasa', text: 'Agenda y contesta lo que puede, y te pasa con resumen lo que necesita una persona.' },
      ] as [{ label: string; title: string; text: string }, { label: string; title: string; text: string }, { label: string; title: string; text: string }],
      ask: H ? '¿Me pueden ver el sábado por una fuga en el baño? Estoy en Katy.' : '¿Me pueden ver el sábado por una fuga en el baño? Estoy en Doral.',
      actions: [
        ['agenda', 'sábado · libre 10:00 a. m.'],
        ['servicio', 'fuga · plomería'],
        ['zona', `${zone} · dentro de tu área`],
      ] as [string, string][],
      verdicts: [
        { label: 'Respondido', kind: 'ok' as Kind, note: 'Apartó el sábado' },
        { label: 'Te lo pasa', kind: 'mid' as Kind, note: 'Trabajo grande' },
        { label: 'Fuera de horario', kind: 'off' as Kind, note: 'Agenda mañana' },
      ],
    },

    // 03 · Contraste: tú le explicas, Marcy lo cumple (W-ADV-07)
    reglas: {
      label: 'Tú le explicas, Marcy lo cumple',
      title: '<span class="w-tone">Tú le explicas cómo trabajas.</span> Marcy lo cumple en cada mensaje.',
      sub: 'No hay que programar nada: nos cuentas tu negocio como se lo contarías a alguien nuevo y lo convertimos en reglas que Marcy sigue siempre.',
      ask: '¿Qué tiene que hacer Marcy?',
      said: [
        'Agenda visitas de lunes a sábado, de 9 de la mañana a 7 de la tarde.',
        `Trabajamos en ${zone} y alrededores. Si es más lejos, que me pregunten.`,
        'Si alguien pide precio, que le diga que le mando la propuesta por escrito.',
        'Las quejas y las facturas me las pasa a mí, con un resumen.',
      ],
      fixedTitle: 'Reglas fijas',
      fixedNote: 'Siempre activas',
      fixed: [
        ['ok', 'Sí', 'Agendar lun a sáb · 9:00 a. m. a 7:00 p. m.'],
        ['ok', 'Sí', `Zona · ${zone} y alrededores`],
        ['mid', 'Te lo pasa', 'Fuera de zona · te pregunta'],
        ['off', 'No', 'Dar precios por chat'],
      ] as [Kind, string, string][],
      checksTitle: 'En cada mensaje',
      checksNote: 'Se revisa al momento',
      checks: [
        'Si piden precio, ofrece la propuesta por escrito y te avisa.',
        'Si es una queja o una factura, te pasa la conversación con el resumen.',
      ],
      input: 'Ajustar una regla…',
      sr: `Ejemplo: el dueño de un negocio escribe cómo trabaja (horario, zona, precios y quejas) y Marcy lo convierte en reglas fijas y en revisiones de cada mensaje.`,
    },

    // Lo que pasó hoy (W-ADV-44 vivo + W-ADV-23)
    hoy: {
      label: 'Lo que pasó hoy',
      title: 'Al final del día, todo en orden',
      text: 'Cinco conversaciones de ejemplo y qué hizo Marcy con cada una. Tú solo miras lo que te pasó.',
      rows: [
        { icon: 'lucide:message-circle', label: 'Mensaje de WhatsApp', chip: 'Respondido', tone: 'ok' as const },
        { icon: 'lucide:calendar', label: 'Cita sábado 10:00 a. m.', chip: 'Agendada', tone: 'ok' as const },
        { icon: 'lucide:help-circle', label: 'Pregunta de precio', chip: 'Te lo pasa', tone: 'pass' as const },
        { icon: 'lucide:moon', label: 'Fuera de horario', chip: 'Respondido', tone: 'ok' as const },
        { icon: 'lucide:user', label: 'Quiere hablar con alguien', chip: 'Te lo pasa', tone: 'pass' as const },
      ],
      memoryLabel: 'Lo que ya sabe de tu negocio',
      memoryText: 'Lo que le cuentas una vez, lo recuerda en cada conversación. Si algo cambia, nos avisas y lo ajustamos.',
      memory: [
        { label: 'Canales', value: 'Web, WhatsApp, Instagram y Messenger' },
        { label: 'Citas', value: 'Lun a sáb' },
        { label: 'Zona', value: zone },
        { label: 'Idioma', value: 'Español e inglés' },
      ],
    },

    // A dónde te avisa (W-CORE-30: navegador + 2 satélites; la línea nace del globo de Marcy)
    aviso: {
      label: 'A dónde te avisa',
      title: '<span class="w-tone">¿Y tú cómo te enteras?</span> Te avisa donde ya miras.',
      text: 'Cada cita agendada y cada conversación que necesita una persona te llega con su resumen. No tienes que abrir otra app para saber qué pasó.',
      sr: 'Ejemplo: una clienta agenda una cita en el chat de la web; a ti te llega la cita por correo y su duda con la factura por WhatsApp.',
      ejemplo: 'Ejemplo',
      enLinea: 'en línea',
      escribe: 'Escribe un mensaje',
      chat: [
        { t: '¿Me pueden ver el sábado? Tengo una fuga en el baño.', h: '9:58 p. m.' },
        { m: true, o: 'a', t: 'Sí. Te aparté el sábado a las 10:00 a. m. Te llega la confirmación aquí.', h: '9:58 p. m.' },
        { t: 'Y tengo una duda con la factura pasada.', h: '9:59 p. m.' },
        { m: true, o: 'b', t: 'Se la paso al dueño con el resumen para que te conteste él.', h: '9:59 p. m.' },
      ] as { m?: boolean; o?: 'a' | 'b'; t: string; h: string }[],
      mail: { channel: 'Correo', from: 'Marcy · Tu Negocio', subject: 'Nueva cita: sábado, 10:00 a. m.', body: 'Ana · fuga en el baño · ' + zone, time: '9:58 p. m.' },
      wa: { channel: 'WhatsApp', body: 'Ana tiene una duda con su factura pasada. Te dejé el resumen.', time: '9:59 p. m.' },
      destA: { title: 'Por correo', text: 'Las citas y los contactos nuevos, con todos sus datos.' },
      destB: { title: 'Por WhatsApp', text: 'Lo urgente y lo que necesita que contestes tú.' },
    },

    prosa: { tone1: `Por qué en ${name},`, tone2: 'con nosotros' },

    // 06 · Tus datos, a salvo (W-PROOF-25, sin sellos)
    datos: {
      label: 'Tus datos, a salvo',
      title: '<span class="w-tone">Contesta por ti.</span> Sin poner en riesgo a tus clientes.',
      text: 'Así está hecha Marcy en este mismo sitio, y así la instalamos en tu negocio.',
      checks: [
        'Los datos personales de tus clientes no pasan por el modelo de IA.',
        'Te pasa a una persona cuando hace falta, con el resumen de lo que se habló.',
        'No inventa precios: si no está en tus datos, te lo pasa.',
        'Tú decides qué responde y qué no.',
      ],
      wrote: 'Lo que escribe tu cliente',
      sees: 'Lo que recibe la IA',
      msg: ['Hola, soy ', 'Ana Pérez', ', mi número es ', H ? '(713) 555 0142' : '(305) 555 0142', '. ¿Me agendan el sábado?'],
      masked: ['[nombre]', '[teléfono]'],
      stays: 'El nombre y el teléfono se quedan en tu negocio',
      sr: 'Ejemplo: el cliente escribe su nombre y su teléfono, y a la IA le llega el mensaje con esos datos ocultos.',
    },

    // Así empiezas con Marcy (AltaMarcy, P09 · W2N-05), antes del precio
    alta: {
      label: 'Cómo empezamos',
      title: '<span class="w-tone">Así empiezas con Marcy.</span> Corto y contigo.',
      text: 'No tienes que configurarla tú. Lo hacemos contigo y Marcy queda contestando con los datos de tu negocio.',
      sr: 'Ejemplo de cómo empiezas con Marcy: la conoces, revisas el horario y los idiomas de tu negocio, conectas tus canales y queda lista para contestar.',
      steps: [
        ['Nos cuentas tu negocio', 'Horario, servicios, zona y cómo quieres que conteste.'],
        ['Conectamos tus canales', 'Tu web, tu WhatsApp y tu calendario, y a dónde te avisa.'],
        ['Marcy empieza a contestar', 'Tú revisas lo que te pasa y ajustamos lo que haga falta.'],
      ] as [string, string][],
    },

    precio: {
      eyebrow: 'Inversión',
      title: 'Asistente con IA',
      cta: 'Quiero automatizar mi negocio',
      includesLabel: 'Qué incluye',
    },

    caso: {
      label: 'Automatización real',
      title: '<span class="w-tone">No es una promesa.</span> Ya está en uso.',
      lead: H
        ? 'Una web app de reservas que hicimos para un salón de Houston: sus clientas agendan solas.'
        : 'Una web app de reservas que hicimos para un salón de Houston: sus clientas agendan solas. Aún no tenemos un caso publicado en Miami.',
    },

    franja: {
      queEs: 'Qué es',
      verQue: 'Ver qué incluye',
      desde: 'Desde cuánto',
      desdeText: (basic: string, full: string) => `Asistente básico ${basic.toLowerCase()}. Completo, instalado y mantenido, ${full.toLowerCase()}.`,
      verPrecios: 'Ver precios',
      tiempo: 'En cuánto tiempo',
      tiempoText: 'Propuesta en 24 horas. Una primera automatización suele quedar lista en una a tres semanas.',
      pedir: 'Pedir propuesta',
    },

    cierre: {
      proof: 'Marcy, la asistente de este sitio, contesta en español y en inglés a cualquier hora. La tuya puede hacer lo mismo.',
      warmTitle: 'Pregúntale a Marcy ahora',
      warmText: 'Está aquí mismo. Pregúntale lo que quieras saber antes de pedir tu propuesta.',
      warmCta: 'Abrir el chat',
      ask: `¿Cómo funcionaría un asistente como tú en mi negocio en ${name}?`,
    },

    hermanas: {
      title: `<span class="w-tone">Marcy trabaja mejor</span> con todo lo demás.`,
      lead: 'Todo lo que hacemos, para que tu asistente tenga una buena casa.',
      precios: { title: 'Precios', text: 'Todos los servicios y lo que incluye cada uno.' },
      diag: { title: 'Diagnóstico gratis', text: 'Revisamos tu web, tu ficha de mapa y si la IA te encuentra.' },
    },
  };
};

export const iaChatCopy = {
  houston: base('houston'),
  miami: base('miami'),
};
export type IaChatCopy = ReturnType<typeof base>;
