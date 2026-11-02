// ─────────────────────────────────────────────────────────────
// Copy nuevo del tipo `ia-chat` · IA conversacional por ciudad (design/rediseno-workos.md
// §4.12, ola 2). Solo texto LIBRE (eyebrow, cola, títulos de sección, textos de objetos).
// Lo congelado (H1, answer, faq, local.paragraphs, service, meta) sigue en clusters.ts y se
// pinta tal cual desde allí. Sin guiones conectores, "dominamos" la IA, sin cifras ni
// reseñas inventadas; las conversaciones son de EJEMPLO y van rotuladas.
// Marcy nunca da una cifra por chat (como en producción): "te paso la propuesta".
// ─────────────────────────────────────────────────────────────

export type IaCity = 'houston' | 'miami';

type Msg = { from: 'c' | 'm'; text: string; time?: string };
type Kind = 'ok' | 'mid' | 'off';

const base = (city: IaCity) => {
  const H = city === 'houston';
  const name = H ? 'Houston' : 'Miami';
  const zone = H ? 'Katy' : 'Doral';
  return {
    cityName: name,
    chip: H ? 'Houston, TX' : 'Miami, FL',
    eyebrow: 'Conoce a Marcy',
    // Sin cola: H1 noche + cola pasaban de 2 líneas a 1440 (regla de §2.14); la idea abre la bajada.
    lead: H
      ? 'Tu recepcionista que no duerme: contesta tus mensajes, agenda citas y te pasa lo que necesita una persona, en español o en inglés.'
      : 'Tu recepcionista que no duerme: contesta tu WhatsApp, toma reservas y te pasa lo que necesita una persona, en tu español o en inglés.',
    primary: 'Quiero a Marcy',
    link: 'Ver preguntas',
    avatarAlt: 'Marcy, la asistente con IA de Marcyan',

    /** Pestañas del hero: guion de ejemplo. Precio = "te paso la propuesta", nunca una cifra. */
    tabs: [
      { label: 'Agendar cita', script: [
        { from: 'c', text: 'Hola, ¿tienen cita este sábado?', time: '10:02' },
        { from: 'm', text: '¡Hola! El sábado tengo a las 10:00 o a las 12:30. ¿Cuál te aparto?', time: '10:02' },
        { from: 'c', text: 'La de las 10, porfa.', time: '10:03' },
        { from: 'm', text: 'Listo, quedó apartada el sábado a las 10:00. Te mandé la confirmación por mensaje.', time: '10:03' },
      ] as Msg[] },
      { label: 'Pedir precio', script: [
        { from: 'c', text: '¿Cuánto me cobran por arreglar una fuga en el baño?', time: '13:15' },
        { from: 'm', text: 'Depende de lo que haya que cambiar. Te paso la propuesta por escrito hoy mismo. ¿Me cuentas en qué zona estás?', time: '13:15' },
        { from: 'c', text: `En ${zone}.`, time: '13:16' },
        { from: 'm', text: `Perfecto, ${zone} está en nuestra zona. En un rato te llega la propuesta por aquí.`, time: '13:16' },
      ] as Msg[] },
      { label: 'Fuera de horario', script: [
        { from: 'c', text: '¿Siguen abiertos?', time: '23:40' },
        { from: 'm', text: 'Ahora estamos cerrados, abrimos mañana a las 8:00. ¿Te aparto la primera visita?', time: '23:40' },
        { from: 'c', text: 'Sí, a las 8 está bien.', time: '23:41' },
        { from: 'm', text: 'Hecho. Mañana a las 8:00 te esperamos.', time: '23:41' },
      ] as Msg[] },
      { label: 'Pasar a una persona', script: [
        { from: 'c', text: 'Tengo una duda con mi factura.', time: '16:20' },
        { from: 'm', text: 'Te paso con alguien del equipo ahora mismo. Ya le dejé el resumen para que no repitas nada.', time: '16:20' },
        { from: 'c', text: 'Gracias.', time: '16:21' },
        { from: 'm', text: 'Con gusto. Te escriben aquí mismo en unos minutos.', time: '16:21' },
      ] as Msg[] },
    ],
    heroSr: 'Ejemplo: Marcy agenda una cita, pasa la propuesta de precio por escrito, contesta fuera de horario y pasa el caso a una persona.',

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
        { text: '¿Tienen cita para el sábado?', from: 'WhatsApp', time: '21:40' },
        { text: '¿Cuánto cuesta el servicio?', from: 'Instagram', time: '22:15' },
        { text: 'Llamada perdida', kind: 'notice' as const, time: '08:05' },
        { text: '¿Siguen abiertos?', from: 'Web', time: '23:02' },
        { text: 'Mensaje de voz sin escuchar', kind: 'notice' as const, time: '07:48' },
        { text: H ? '¿Hacen presupuestos en Pearland?' : '¿Atienden en Brickell?', from: 'WhatsApp', time: '19:12' },
        { text: '¿Me pueden llamar mañana temprano?', from: 'WhatsApp', time: '22:51' },
        { text: 'Formulario sin respuesta', kind: 'notice' as const, time: 'Ayer' },
        { text: 'Sigo esperando, ¿me contestan?', from: 'Instagram', time: '09:30' },
      ],
      conTitle: 'Todo contestado',
      con: [
        { label: 'Respondido', kind: 'ok' as Kind, note: '¿Tienen cita para el sábado? Apartó las 10:00' },
        { label: 'Respondido', kind: 'ok' as Kind, note: '¿Siguen abiertos? Agendó la primera visita' },
        { label: 'Te lo pasa', kind: 'mid' as Kind, note: '¿Cuánto cuesta? Te pide la propuesta' },
        { label: 'Respondido', kind: 'ok' as Kind, note: H ? '¿Presupuestos en Pearland? Sí, está en tu zona' : '¿Atienden en Brickell? Sí, está en tu zona' },
        { label: 'Te lo pasa', kind: 'mid' as Kind, note: '¿Me llaman mañana? Te deja la nota' },
      ],
    },

    // 02 · Cómo trabaja (W-ADV-05 + W-ADV-06)
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
        ['agenda', 'sábado · libre 10:00'],
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
        'Agenda visitas de lunes a sábado, de 8 de la mañana a 6 de la tarde.',
        `Trabajamos en ${zone} y alrededores. Si es más lejos, que me pregunten.`,
        'Si alguien pide precio, que le diga que le mando la propuesta por escrito.',
        'Las quejas y las facturas me las pasa a mí, con un resumen.',
      ],
      fixedTitle: 'Reglas fijas',
      fixedNote: 'Siempre activas',
      fixed: [
        ['ok', 'Sí', 'Agendar lun a sáb · 8:00 a 18:00'],
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

    // 04 · Lo que pasó hoy (W-ADV-44 static + W-ADV-23)
    hoy: {
      label: 'Lo que pasó hoy',
      title: 'Al final del día, todo en orden',
      text: 'Cinco conversaciones de ejemplo y qué hizo Marcy con cada una. Tú solo miras lo que te pasó.',
      rows: [
        { icon: 'lucide:message-circle', label: 'Mensaje de WhatsApp', chip: 'Respondido', tone: 'ok' as const },
        { icon: 'lucide:calendar', label: 'Cita sábado 10:00', chip: 'Agendada', tone: 'ok' as const },
        { icon: 'lucide:help-circle', label: 'Pregunta de precio', chip: 'Te lo pasa', tone: 'pass' as const },
        { icon: 'lucide:moon', label: 'Mensaje fuera de horario', chip: 'Respondido', tone: 'ok' as const },
        { icon: 'lucide:user', label: 'Quiere hablar con alguien', chip: 'Te lo pasa', tone: 'pass' as const },
      ],
      memoryLabel: 'Lo que ya sabe de tu negocio',
      memoryText: 'Lo que le cuentas una vez, lo recuerda en cada conversación. Si algo cambia, nos avisas y lo ajustamos.',
      memory: [
        { label: 'Canal', value: 'WhatsApp' },
        { label: 'Citas', value: 'Lun a sáb' },
        { label: 'Zona', value: zone },
        { label: 'Idioma', value: 'Español e inglés' },
      ],
    },

    // 05 · A dónde te avisa (W-HOME-14)
    aviso: {
      label: 'A dónde te avisa',
      title: '<span class="w-tone">¿Y tú cómo te enteras?</span> Te avisa donde ya miras.',
      text: 'Cada cita agendada y cada conversación que necesita una persona te llega con su resumen. No tienes que abrir otra app para saber qué pasó.',
      nodes: [
        { icon: 'lucide:message-circle', label: 'Entra un mensaje' },
        { icon: 'lucide:bot', label: 'Marcy lo resuelve o lo prepara' },
      ],
      mail: { channel: 'Correo', from: 'Marcy', subject: 'Nueva cita: sábado 10:00', body: 'Ana · fuga en el baño · ' + zone, time: '10:03' },
      wa: { channel: 'WhatsApp', from: 'Marcy', body: 'Te pasé una conversación: duda con una factura. Ya tienes el resumen.', time: '16:20' },
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
