// ─────────────────────────────────────────────────────────────
// Copy nuevo del tipo `ia-chat` · IA conversacional por ciudad (design/rediseno-workos.md
// §4.12, ola 2). Solo texto LIBRE (eyebrow, cola, títulos de sección, textos de objetos).
// Lo congelado (H1, answer, faq, local.paragraphs, service, meta) sigue en clusters.ts y se
// pinta tal cual desde allí. Sin guiones conectores, "dominamos" la IA, sin cifras ni
// reseñas inventadas; las conversaciones son de EJEMPLO y van rotuladas.
// Marcy nunca da una cifra por chat (como en producción): "te paso la propuesta".
//
// Cada ciudad enseña SU negocio de ejemplo (ledger E-65 c; encargo de parejas del 15-nov,
// design/parejas-ciudad-v3.md): Houston, servicios a domicilio (obras, visitas, zonas que se
// manejan); Miami, un restaurante (WhatsApp primero, reservas, el español de cada cliente y
// turistas que escriben en inglés), como el texto propio del 1-nov (PR #51). El horario del
// negocio de ejemplo es el mismo en las reglas, en "Así empiezas" (alta.horario) y en los hilos.
// ─────────────────────────────────────────────────────────────

export type IaCity = 'houston' | 'miami';

type Kind = 'ok' | 'mid' | 'off';
type Hilo = { canal: string; logo?: 'whatsapp' | 'instagram' | 'messenger'; quien: string; ini: string; color: [string, string]; en?: boolean; responder: string; msgs: { m?: boolean; h: string; t: string }[] };
type MsgSin = { text: string; from?: string; time?: string; kind?: 'notice'; en?: boolean };

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

    // Escena del hero (EscenaDosActos): Miami enseña su restaurante de ejemplo, prefijos 305 y 786 y barrios de
    // Miami-Dade, con las mismas posiciones y largos parecidos que las ventanas de Houston (que usa las de la pieza).
    escena: H
      ? undefined
      : {
          resumen: 'Ejemplo animado: de noche llegan a un restaurante mensajes por WhatsApp, Instagram, Messenger, el formulario y el chat de la web; Marcy los contesta y por la mañana el panel muestra todo respondido, y te avisa de la llamada perdida y del mensaje de texto.',
          pedir: 'Reservar mesa',
          campos: ['Nombre', 'Personas', 'Mensaje'],
          ventanas: [
            { canal: 'whatsapp' as const, x: 36, y: 50, w: 300, quien: 'Mariela R.', texto: '¿Tienen mesa para seis el sábado?', hora: '10:47 p. m.' },
            { canal: 'instagram' as const, x: 318, y: 74, w: 290, quien: 'lucia.mia', texto: 'Hola, ¿hacen comida para una fiesta en Doral?', hora: '10:52 p. m.' },
            { canal: 'form' as const, x: 584, y: 46, w: 300, quien: 'Javier M.', texto: '¿Se puede reservar el local para un evento?', hora: '11:02 p. m.' },
            { canal: 'messenger' as const, x: 862, y: 66, w: 290, quien: 'Kate L.', texto: 'Hi! Can we book a table for four on Friday?', hora: '11:06 p. m.', enLang: true },
            { canal: 'web' as const, x: 1104, y: 44, w: 250, quien: 'Visitante', texto: 'Hola, ¿abren mañana para el almuerzo?', hora: '11:10 p. m.' },
            { canal: 'llamada' as const, x: 1030, y: 318, w: 318, quien: '(305) 555-0142', texto: 'No dejó mensaje', hora: '11:14 p. m.' },
            { canal: 'whatsapp' as const, x: 110, y: 352, w: 300, quien: 'Yoel T.', texto: 'Buenas, ¿tienen platos sin gluten?', hora: '11:21 p. m.', extra: true },
            { canal: 'instagram' as const, x: 402, y: 400, w: 290, quien: 'andrea.gm', texto: '¿Llevan pedidos a Brickell mañana?', hora: '11:33 p. m.', extra: true },
            { canal: 'sms' as const, x: 1030, y: 452, w: 318, quien: '(786) 555-0187', texto: '¿Aceptan reservas para diez?', hora: '11:41 p. m.', extra: true },
            { canal: 'web' as const, x: 714, y: 404, w: 290, quien: 'Visitante', texto: 'Hi, is there parking nearby?', hora: '11:52 p. m.', extra: true, enLang: true },
          ],
          filas: [
            { canal: 'whatsapp' as const, txt: 'Mariela R. y Yoel T.', est: 'ok' as const },
            { canal: 'instagram' as const, txt: 'lucia.mia y andrea.gm', est: 'ok' as const },
            { canal: 'form' as const, txt: 'Javier M. · evento', est: 'ok' as const },
            { canal: 'messenger' as const, txt: 'Kate L. · en inglés', est: 'ok' as const },
            { canal: 'web' as const, txt: '2 visitantes', est: 'ok' as const },
            { canal: 'llamada' as const, txt: '(305) 555-0142', est: 'aviso' as const },
            { canal: 'sms' as const, txt: '(786) 555-0187', est: 'aviso' as const },
          ],
        },

    // 01 · Sin Marcy / con Marcy (W-CORE-25)
    sinCon: {
      label: 'Lo que se te escapa',
      title: H
        ? '<span class="w-tone">Mensajes sin contestar.</span> Clientes que marcan al siguiente.'
        : '<span class="w-tone">WhatsApp sin contestar.</span> Mesas que se reservan en otro lado.',
      lead: H
        ? 'Mientras estás en una obra o manejando de Katy a Pasadena, los mensajes se acumulan. Toca el interruptor y mira la diferencia.'
        : 'Entre el servicio de la noche y el cierre de caja, los mensajes se acumulan. Toca el interruptor y mira la diferencia.',
      labels: ['Sin Marcy', 'Con Marcy'] as [string, string],
      sin: (H
        ? [
            { text: '¿Tienen cita para el sábado?', from: 'WhatsApp', time: '9:40 p. m.' },
            { text: '¿Cuánto cuesta el servicio?', from: 'Instagram', time: '10:15 p. m.' },
            { text: 'Llamada perdida', kind: 'notice', time: '8:05 a. m.' },
            { text: '¿Siguen abiertos?', from: 'Web', time: '11:02 p. m.' },
            { text: 'Mensaje de voz sin escuchar', kind: 'notice', time: '7:48 a. m.' },
            { text: '¿Hacen presupuestos en Pearland?', from: 'WhatsApp', time: '7:12 p. m.' },
            { text: '¿Me pueden llamar mañana temprano?', from: 'WhatsApp', time: '10:51 p. m.' },
            { text: 'Formulario sin respuesta', kind: 'notice', time: 'Ayer' },
            { text: 'Sigo esperando, ¿me contestan?', from: 'Instagram', time: '9:30 a. m.' },
          ]
        : [
            { text: '¿Tienen mesa para seis el sábado?', from: 'WhatsApp', time: '9:40 p. m.' },
            { text: '¿Hacen menú para eventos?', from: 'Instagram', time: '10:15 p. m.' },
            { text: 'Llamada perdida', kind: 'notice', time: '8:05 a. m.' },
            { text: '¿Abren mañana para el almuerzo?', from: 'Web', time: '11:02 p. m.' },
            { text: 'Mensaje de voz sin escuchar', kind: 'notice', time: '7:48 a. m.' },
            { text: '¿Llevan pedidos a Brickell?', from: 'WhatsApp', time: '7:12 p. m.' },
            { text: 'Hi, do you take reservations?', from: 'WhatsApp', time: '10:51 p. m.', en: true },
            { text: 'Formulario sin respuesta', kind: 'notice', time: 'Ayer' },
            { text: 'Sigo esperando, ¿me contestan?', from: 'Instagram', time: '9:30 a. m.' },
          ]) as MsgSin[],
      conTitle: 'Todo contestado',
      con: H
        ? [
            { label: 'Respondido', kind: 'ok' as Kind, note: '¿Tienen cita para el sábado? Apartó las 10:00 a. m.' },
            { label: 'Respondido', kind: 'ok' as Kind, note: '¿Siguen abiertos? Agendó la primera visita' },
            { label: 'Te lo pasa', kind: 'mid' as Kind, note: '¿Cuánto cuesta? Te pide la propuesta' },
            { label: 'Respondido', kind: 'ok' as Kind, note: '¿Presupuestos en Pearland? Sí, está en tu zona' },
            { label: 'Te lo pasa', kind: 'mid' as Kind, note: '¿Me llaman mañana? Te deja la nota' },
          ]
        : [
            { label: 'Respondido', kind: 'ok' as Kind, note: '¿Mesa para seis el sábado? Reservó a las 7:30\u00a0p.\u00a0m.' },
            { label: 'Respondido', kind: 'ok' as Kind, note: '¿Abren para el almuerzo? Le dio el horario' },
            { label: 'Te lo pasa', kind: 'mid' as Kind, note: '¿Menú para eventos? Te pide la propuesta' },
            { label: 'Respondido', kind: 'ok' as Kind, note: '¿Llevan a Brickell? Sí, está en tu zona' },
            { label: 'Respondido', kind: 'ok' as Kind, note: 'Turista que escribe en inglés: reservó el viernes' },
          ],
    },

    // 02 · Contesta en cada canal (MazoHilos, P05 · W-ADV-22). Canales que Marcy contesta (§5-14).
    canales: {
      label: 'Contesta en cada canal',
      title: H
        ? '<span class="w-tone">Contesta en cada canal.</span> Con la misma voz en todos.'
        : '<span class="w-tone">Primero WhatsApp.</span> Y la misma voz en tus otros canales.',
      text: H
        ? 'Tu web, tu WhatsApp, tu Instagram y tu Messenger: Marcy lleva cada conversación con los datos de tu negocio, pregunta la zona y el trabajo antes de pasártela y no deja ninguna a medias. Antes de empezar te decimos cuáles se pueden conectar en tu caso.'
        : 'WhatsApp suele ser la primera puerta, pero también te escriben por Instagram, Messenger y tu web. Marcy contesta con tu menú y tus horas, y no deja ninguna conversación a medias. Antes de empezar te decimos cuáles se pueden conectar en tu caso.',
      points: (H
        ? [
            ['Tu web', 'Contesta en el chat de tu página, a cualquier hora.'],
            ['WhatsApp', 'Agenda y responde sin que sueltes lo que estás haciendo.'],
            ['Instagram', 'Los mensajes directos no se quedan sin leer.'],
            ['Messenger', 'Los mensajes de tu página de Facebook, contestados a tiempo.'],
          ]
        : [
            ['WhatsApp', 'Reservas y preguntas contestadas mientras atiendes el salón.'],
            ['Instagram', 'Quien ve tus platos y pregunta recibe respuesta esa misma noche.'],
            ['Tu web', 'El chat de tu página contesta en los dos idiomas de tus clientes.'],
            ['Messenger', 'Los mensajes de tu página de Facebook no se quedan sin leer.'],
          ]) as [string, string][],
      sr: H
        ? 'Ejemplo: Marcy contesta a tus clientes en tu web, WhatsApp, Instagram y Messenger, agenda citas y te pasa lo importante.'
        : 'Ejemplo: Marcy contesta a los clientes de un restaurante por WhatsApp, Instagram, Messenger y la web, toma reservas y te pasa lo importante.',
      // Mazo de hilos (EJEMPLO). Las personas son las del hero; horario del negocio de ejemplo: alta.horario.
      hilos: (H
        ? [
            {
              canal: 'WhatsApp', logo: 'whatsapp', quien: 'Luis T.', ini: 'LT', color: ['#E9DCCB', '#6B4E2E'],
              responder: 'Responder a Luis T.',
              msgs: [
                { h: '11:21 p. m.', t: 'Buenas noches, ¿cuánto tarda una cotización?' },
                { m: true, h: '11:21 p. m.', t: 'Hola, Luis. Depende del trabajo: si me mandas una foto, el dueño te la prepara. ¿Te aparto una visita?' },
                { h: '11:22 p. m.', t: 'Sí, el sábado en la mañana.' },
                { m: true, h: '11:22 p. m.', t: 'Listo: sábado a las 10:00 a. m. Te llega la confirmación por aquí.' },
              ],
            },
            {
              canal: 'Instagram', logo: 'instagram', quien: 'marisol.hz', ini: 'MH', color: ['#F3DCE4', '#8C3A5B'],
              responder: 'Responder a marisol.hz',
              msgs: [
                { h: '10:52 p. m.', t: `¿Hacen visitas en ${zone}? Quiero cambiar el fregadero.` },
                { m: true, h: '10:52 p. m.', t: `Sí, ${zone} está en nuestra zona. Tengo el lunes a las 9:00 a. m. o el martes a las 4:00 p. m.` },
                { h: '10:53 p. m.', t: 'El martes me va mejor.' },
                { m: true, h: '10:53 p. m.', t: 'Apartado el martes a las 4:00 p. m. Si te surge algo, escríbeme aquí.' },
              ],
            },
            {
              canal: 'Messenger', logo: 'messenger', quien: 'Rosa G.', ini: 'RG', color: ['#DCE6F5', '#2F5689'], en: true,
              responder: 'Responder a Rosa G.',
              msgs: [
                { h: '11:06 p. m.', t: 'Hi! Could someone come by this week for an estimate?' },
                { m: true, h: '11:06 p. m.', t: 'Hi Rosa! Sure. I have Thursday at 11:00 AM or Friday at 3:00 PM. Which works for you?' },
                { h: '11:07 p. m.', t: 'Friday works.' },
                { m: true, h: '11:07 p. m.', t: "Booked: Friday at 3:00 PM. You'll get a reminder the day before." },
              ],
            },
            {
              canal: 'Tu web', logo: undefined, quien: 'Carlos P.', ini: 'CP', color: ['#DDEBDF', '#2F6B45'],
              responder: 'Responder a Carlos P.',
              msgs: [
                { h: '11:02 p. m.', t: '¿Pueden venir esta semana a ver la casa?' },
                { m: true, h: '11:02 p. m.', t: 'Hola, Carlos. Sí: tengo el miércoles a las 5:00 p. m. ¿Te lo aparto?' },
                { h: '11:03 p. m.', t: 'Sí. ¿Y cuánto costaría pintarla entera?' },
                { m: true, h: '11:03 p. m.', t: 'Eso lo cotiza el dueño al verla. Ya le pasé tu mensaje con el resumen.' },
              ],
            },
          ]
        : [
            {
              canal: 'WhatsApp', logo: 'whatsapp', quien: 'Mariela R.', ini: 'MR', color: ['#E9DCCB', '#6B4E2E'],
              responder: 'Responder a Mariela R.',
              msgs: [
                { h: '10:47 p. m.', t: '¿Tienen mesa para seis el sábado en la noche?' },
                { m: true, h: '10:47 p. m.', t: 'Hola, Mariela. Sí: tengo a las 7:30\u00a0p.\u00a0m. o a las 9:00\u00a0p.\u00a0m. ¿Cuál te aparto?' },
                { h: '10:48 p. m.', t: 'A las 7:30, por favor. Es un cumpleaños.' },
                { m: true, h: '10:48 p. m.', t: 'Listo: sábado a las 7:30\u00a0p.\u00a0m., mesa para seis. Te llega la confirmación por aquí.' },
              ],
            },
            {
              canal: 'Instagram', logo: 'instagram', quien: 'lucia.mia', ini: 'LM', color: ['#F3DCE4', '#8C3A5B'],
              responder: 'Responder a lucia.mia',
              msgs: [
                { h: '10:52 p. m.', t: `¿Hacen comida para una fiesta en ${zone}? Seríamos unas 30 personas.` },
                { m: true, h: '10:52 p. m.', t: `Sí, ${zone} está en nuestra zona. El dueño te prepara la propuesta: ¿para qué día sería?` },
                { h: '10:53 p. m.', t: 'Para el sábado 14.' },
                { m: true, h: '10:53 p. m.', t: 'Anotado: 30 personas, el sábado 14. Ya le pasé tu pedido con el resumen.' },
              ],
            },
            {
              canal: 'Messenger', logo: 'messenger', quien: 'Kate L.', ini: 'KL', color: ['#DCE6F5', '#2F5689'], en: true,
              responder: 'Responder a Kate L.',
              msgs: [
                { h: '11:06 p. m.', t: "Hi! We're visiting Miami. Can we book a table for four on Friday?" },
                { m: true, h: '11:06 p. m.', t: 'Hi Kate! Sure. I have Friday at 7:00 PM or 8:30 PM. Which works for you?' },
                { h: '11:07 p. m.', t: '8:30 works.' },
                { m: true, h: '11:07 p. m.', t: "Booked: Friday at 8:30 PM, table for four. You'll get a reminder that morning." },
              ],
            },
            {
              canal: 'Tu web', logo: undefined, quien: 'Javier M.', ini: 'JM', color: ['#DDEBDF', '#2F6B45'],
              responder: 'Responder a Javier M.',
              msgs: [
                { h: '11:02 p. m.', t: '¿Se puede reservar el local entero para un evento?' },
                { m: true, h: '11:02 p. m.', t: 'Hola, Javier. Sí, para grupos grandes. ¿Qué fecha y cuántas personas serían?' },
                { h: '11:03 p. m.', t: 'El viernes 20, unas 50. ¿Cuánto costaría?' },
                { m: true, h: '11:03 p. m.', t: 'Eso te lo cotiza el dueño según el menú. Ya le pasé tu mensaje con el resumen.' },
              ],
            },
          ]) as Hilo[],
    },

    // 03 · Cómo trabaja (W-ADV-05 + W-ADV-06)
    pasos: {
      label: 'Cómo trabaja',
      title: H
        ? '<span class="w-tone">Entiende, actúa</span> y te dice qué hizo.'
        : '<span class="w-tone">Entiende, reserva</span> y te dice qué hizo.',
      lead: H
        ? 'Cada mensaje sigue el mismo camino: Marcy entiende qué quiere el cliente, usa los datos de tu negocio y decide si lo resuelve o te lo pasa.'
        : 'Cada mensaje sigue el mismo camino: Marcy entiende qué quiere el cliente, mira tu horario y tus reservas, y decide si lo resuelve o te lo pasa.',
      steps: (H
        ? [
            { label: 'Paso 01', title: 'Entiende lo que le piden', text: 'Lee el mensaje como lo escribió tu cliente, en español, en inglés o mezclado.' },
            { label: 'Paso 02', title: 'Usa los datos de tu negocio', text: 'Tu horario, tus servicios y tu zona. Lo que no está en tus datos, no lo inventa.' },
            { label: 'Paso 03', title: 'Resuelve o te lo pasa', text: 'Agenda y contesta lo que puede, y te pasa con resumen lo que necesita una persona.' },
          ]
        : [
            { label: 'Paso 01', title: 'Entiende lo que le piden', text: 'Lee el español de cada cliente, con sus palabras, y también el inglés.' },
            { label: 'Paso 02', title: 'Mira tu menú y tu horario', text: 'Tu carta, tus horas y las mesas libres. Lo que no está en tus datos, no lo inventa.' },
            { label: 'Paso 03', title: 'Reserva o te lo pasa', text: 'Aparta la mesa cuando puede, y te pasa con resumen los eventos, las quejas y lo que necesita una persona.' },
          ]) as [{ label: string; title: string; text: string }, { label: string; title: string; text: string }, { label: string; title: string; text: string }],
      ask: H ? '¿Me pueden ver el sábado por una fuga en el baño? Estoy en Katy.' : '¿Tienen mesa para dos el domingo a la 1:30?',
      actions: (H
        ? [
            ['agenda', 'sábado · libre 10:00 a. m.'],
            ['servicio', 'fuga · plomería'],
            ['zona', `${zone} · dentro de tu área`],
          ]
        : [
            ['reserva', 'domingo · libre 1:30\u00a0p.\u00a0m.'],
            ['mesa', 'dos personas'],
            ['nota', 'almuerzo'],
          ]) as [string, string][],
      verdicts: H
        ? [
            { label: 'Respondido', kind: 'ok' as Kind, note: 'Apartó el sábado' },
            { label: 'Te lo pasa', kind: 'mid' as Kind, note: 'Trabajo grande' },
            { label: 'Fuera de horario', kind: 'off' as Kind, note: 'Agenda mañana' },
          ]
        : [
            { label: 'Respondido', kind: 'ok' as Kind, note: 'Reservó el domingo' },
            { label: 'Te lo pasa', kind: 'mid' as Kind, note: 'Evento de 50' },
            { label: 'Fuera de horario', kind: 'off' as Kind, note: 'Contesta igual' },
          ],
    },

    // 03 · Contraste: tú le explicas, Marcy lo cumple (W-ADV-07)
    reglas: {
      label: 'Tú le explicas, Marcy lo cumple',
      title: H
        ? '<span class="w-tone">Tú le explicas cómo trabajas.</span> Marcy lo cumple en cada mensaje.'
        : '<span class="w-tone">Tú le explicas tu local.</span> Marcy lo cumple en cada mensaje.',
      sub: H
        ? 'No hay que programar nada: nos cuentas tu negocio como se lo contarías a alguien nuevo y lo convertimos en reglas que Marcy sigue siempre.'
        : 'No hay que programar nada: nos cuentas tu negocio como se lo contarías a un mesero nuevo y lo convertimos en reglas que Marcy sigue siempre.',
      ask: '¿Qué tiene que hacer Marcy?',
      said: H
        ? [
            'Agenda visitas de lunes a sábado, de 9 de la mañana a 7 de la tarde.',
            `Trabajamos en ${zone} y alrededores. Si es más lejos, que me pregunten.`,
            'Si alguien pide precio, que le diga que le mando la propuesta por escrito.',
            'Las quejas y las facturas me las pasa a mí, con un resumen.',
          ]
        : [
            'Reserva mesas de martes a domingo, del mediodía a las 10 de la noche.',
            'Grupos de hasta diez, directo. Si son más, que me pregunten antes.',
            'Si alguien pide precio de un evento, que le diga que le mando la propuesta por escrito.',
            'Llevamos pedidos a Doral y Brickell. Del resto de Miami-Dade, que me pregunten.',
          ],
      fixedTitle: 'Reglas fijas',
      fixedNote: 'Siempre activas',
      fixed: (H
        ? [
            ['ok', 'Sí', 'Agendar lun a sáb · 9:00 a. m. a 7:00 p. m.'],
            ['ok', 'Sí', `Zona · ${zone} y alrededores`],
            ['mid', 'Te lo pasa', 'Fuera de zona · te pregunta'],
            ['off', 'No', 'Dar precios por chat'],
          ]
        : [
            ['ok', 'Sí', 'Reservar mar a dom · mediodía a 10\u00a0p.\u00a0m.'],
            ['ok', 'Sí', 'Grupos · hasta diez personas'],
            ['mid', 'Te lo pasa', 'Grupos grandes · te pregunta'],
            ['off', 'No', 'Cotizar eventos por chat'],
          ]) as [Kind, string, string][],
      checksTitle: 'En cada mensaje',
      checksNote: 'Se revisa al momento',
      checks: H
        ? [
            'Si piden precio, ofrece la propuesta por escrito y te avisa.',
            'Si es una queja o una factura, te pasa la conversación con el resumen.',
          ]
        : [
            'Si piden precio de un evento, ofrece la propuesta por escrito y te avisa.',
            'Si escriben en inglés, contesta en inglés con el mismo tono.',
          ],
      input: 'Ajustar una regla…',
      sr: H
        ? 'Ejemplo: el dueño de un negocio escribe cómo trabaja (horario, zona, precios y quejas) y Marcy lo convierte en reglas fijas y en revisiones de cada mensaje.'
        : 'Ejemplo: el dueño de un restaurante escribe cómo funciona su local (horario, grupos, precios de eventos y zona de pedidos) y Marcy lo convierte en reglas fijas y en revisiones de cada mensaje.',
    },

    // Lo que pasó hoy (W-ADV-44 vivo + W-ADV-23)
    hoy: {
      label: 'Lo que pasó hoy',
      title: H ? 'Al final del día, todo en orden' : 'Al cerrar el local, todo en orden',
      text: H
        ? 'Cinco conversaciones de ejemplo y qué hizo Marcy con cada una. Tú solo miras lo que te pasó.'
        : 'Cinco conversaciones de ejemplo de una noche de servicio y qué hizo Marcy con cada una. Tú solo miras lo que te pasó.',
      rows: H
        ? [
            { icon: 'lucide:message-circle', label: 'Mensaje de WhatsApp', chip: 'Respondido', tone: 'ok' as const },
            { icon: 'lucide:calendar', label: 'Cita sábado 10:00 a. m.', chip: 'Agendada', tone: 'ok' as const },
            { icon: 'lucide:help-circle', label: 'Pregunta de precio', chip: 'Te lo pasa', tone: 'pass' as const },
            { icon: 'lucide:moon', label: 'Fuera de horario', chip: 'Respondido', tone: 'ok' as const },
            { icon: 'lucide:user', label: 'Quiere hablar con alguien', chip: 'Te lo pasa', tone: 'pass' as const },
          ]
        : [
            { icon: 'lucide:message-circle', label: 'Reserva de mesa', chip: 'Respondido', tone: 'ok' as const },
            { icon: 'lucide:calendar', label: 'Mesa domingo 1:30\u00a0p.\u00a0m.', chip: 'Reservada', tone: 'ok' as const },
            { icon: 'lucide:help-circle', label: 'Evento de 50', chip: 'Te lo pasa', tone: 'pass' as const },
            { icon: 'lucide:languages', label: 'Turista en inglés', chip: 'Respondido', tone: 'ok' as const },
            { icon: 'lucide:user', label: 'Queja de pedido', chip: 'Te lo pasa', tone: 'pass' as const },
          ],
      memoryLabel: 'Lo que ya sabe de tu negocio',
      memoryText: 'Lo que le cuentas una vez, lo recuerda en cada conversación. Si algo cambia, nos avisas y lo ajustamos.',
      memory: H
        ? [
            { label: 'Canales', value: 'Web y redes' },
            { label: 'Citas', value: 'Lun a sáb' },
            { label: 'Zona', value: zone },
            { label: 'Idioma', value: 'Español e inglés' },
          ]
        : [
            { label: 'Zona', value: 'Doral y Brickell' },
            { label: 'Reservas', value: 'Mar a dom' },
            { label: 'Grupos', value: 'Hasta diez' },
            { label: 'Idioma', value: 'Español e inglés' },
          ],
    },

    // A dónde te avisa (W-CORE-30: navegador + 2 satélites; la línea nace del globo de Marcy)
    aviso: {
      label: 'A dónde te avisa',
      title: '<span class="w-tone">¿Y tú cómo te enteras?</span> Te avisa donde ya miras.',
      text: H
        ? 'Cada cita agendada y cada conversación que necesita una persona te llega con su resumen. No tienes que abrir otra app para saber qué pasó.'
        : 'Cada reserva y cada conversación que necesita una persona te llega con su resumen. No tienes que abrir otra app en pleno servicio para saber qué pasó.',
      sr: H
        ? 'Ejemplo: una clienta agenda una cita en el chat de la web; a ti te llega la cita por correo y su duda con la factura por WhatsApp.'
        : 'Ejemplo: una clienta reserva mesa en el chat de la web; a ti te llega la reserva por correo y su pregunta por un almuerzo de empresa por WhatsApp.',
      ejemplo: 'Ejemplo',
      enLinea: 'en línea',
      escribe: 'Escribe un mensaje',
      chat: (H
        ? [
            { t: '¿Me pueden ver el sábado? Tengo una fuga en el baño.', h: '9:58 p. m.' },
            { m: true, o: 'a', t: 'Sí. Te aparté el sábado a las 10:00 a. m. Te llega la confirmación aquí.', h: '9:58 p. m.' },
            { t: 'Y tengo una duda con la factura pasada.', h: '9:59 p. m.' },
            { m: true, o: 'b', t: 'Se la paso al dueño con el resumen para que te conteste él.', h: '9:59 p. m.' },
          ]
        : [
            { t: '¿Tienen mesa para dos el domingo a la 1:30?', h: '9:58 p. m.' },
            { m: true, o: 'a', t: 'Sí. Te aparté la mesa el domingo a la 1:30\u00a0p.\u00a0m. Te llega la confirmación aquí.', h: '9:58 p. m.' },
            { t: 'Y quería preguntar por un almuerzo de empresa el mes que viene.', h: '9:59 p. m.' },
            { m: true, o: 'b', t: 'Se lo paso al dueño con el resumen para que te conteste él.', h: '9:59 p. m.' },
          ]) as { m?: boolean; o?: 'a' | 'b'; t: string; h: string }[],
      mail: H
        ? { channel: 'Correo', from: 'Marcy · Tu Negocio', subject: 'Nueva cita: sábado, 10:00 a. m.', body: 'Ana · fuga en el baño · ' + zone, time: '9:58 p. m.' }
        : { channel: 'Correo', from: 'Marcy · Tu Negocio', subject: 'Nueva reserva: domingo, 1:30\u00a0p.\u00a0m.', body: 'Ana · mesa para dos', time: '9:58 p. m.' },
      wa: H
        ? { channel: 'WhatsApp', body: 'Ana tiene una duda con su factura pasada. Te dejé el resumen.', time: '9:59 p. m.' }
        : { channel: 'WhatsApp', body: 'Ana pregunta por un almuerzo de empresa el mes que viene. Te dejé el resumen.', time: '9:59 p. m.' },
      destA: H
        ? { title: 'Por correo', text: 'Las citas y los contactos nuevos, con todos sus datos.' }
        : { title: 'Por correo', text: 'Las reservas y los contactos nuevos, con todos sus datos.' },
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
      msg: H
        ? ['Hola, soy ', 'Ana Pérez', ', mi número es ', '(713) 555 0142', '. ¿Me agendan el sábado?']
        : ['Hola, soy ', 'Ana Pérez', ', mi número es ', '(305) 555 0142', '. ¿Me reservan mesa el sábado?'],
      masked: ['[nombre]', '[teléfono]'],
      stays: 'El nombre y el teléfono se quedan en tu negocio',
      sr: 'Ejemplo: el cliente escribe su nombre y su teléfono, y a la IA le llega el mensaje con esos datos ocultos.',
    },

    // Así empiezas con Marcy (AltaMarcy, P09 · W2N-05), antes del precio
    alta: {
      label: 'Cómo empezamos',
      title: '<span class="w-tone">Así empiezas con Marcy.</span> Corto y contigo.',
      text: H
        ? 'No tienes que configurarla tú. Lo hacemos contigo y Marcy queda contestando con los datos de tu negocio.'
        : 'No tienes que configurarla tú entre servicio y servicio. Lo hacemos contigo y Marcy queda contestando con los datos de tu local.',
      sr: 'Ejemplo de cómo empiezas con Marcy: la conoces, revisas el horario y los idiomas de tu negocio, conectas tus canales y queda lista para contestar.',
      /** Horario del negocio de ejemplo dentro de la pieza de alta (AltaMarcy); el mismo de las reglas y de los hilos. */
      horario: H ? 'Lun a sáb · 9:00 a. m. a 7:00 p. m.' : 'Mar a dom · mediodía a 10\u00a0p.\u00a0m.',
      steps: (H
        ? [
            ['Nos cuentas tu negocio', 'Horario, servicios, zona y cómo quieres que conteste.'],
            ['Conectamos tus canales', 'Tu web, tu WhatsApp y tu calendario, y a dónde te avisa.'],
            ['Marcy empieza a contestar', 'Tú revisas lo que te pasa y ajustamos lo que haga falta.'],
          ]
        : [
            ['Nos cuentas tu local', 'Menú, horario, grupos y cómo quieres que conteste.'],
            ['Conectamos tus canales', 'Tu WhatsApp, tu web y tus reservas, y a dónde te avisa.'],
            ['Marcy empieza a contestar', 'Tú revisas lo que te pasa y ajustamos lo que haga falta.'],
          ]) as [string, string][],
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
      proof: H
        ? 'Marcy, la asistente de este sitio, contesta en español y en inglés a cualquier hora. La tuya puede hacer lo mismo.'
        : 'Marcy, la asistente de este sitio, contesta en español y en inglés a cualquier hora. La tuya puede hacer lo mismo en tu WhatsApp.',
      warmTitle: 'Pregúntale a Marcy ahora',
      warmText: 'Está aquí mismo. Pregúntale lo que quieras saber antes de pedir tu propuesta.',
      warmCta: 'Abrir el chat',
      ask: `¿Cómo funcionaría un asistente como tú en mi negocio en ${name}?`,
    },

    hermanas: {
      title: `<span class="w-tone">Marcy trabaja mejor</span> con todo lo demás.`,
      lead: 'Todo lo que hacemos, para que tu asistente tenga una buena casa.',
      precios: { title: 'Precios', text: 'Todos los servicios y lo que incluye cada uno.' },
      guia: { title: '¿Cuánto cuesta un chatbot?', text: 'Guía de precios en Estados Unidos: apps, a medida y el cobro de Meta.' },
      diag: { title: 'Diagnóstico gratis', text: 'Revisamos tu web, tu ficha de mapa y si la IA te encuentra.' },
    },
  };
};

export const iaChatCopy = {
  houston: base('houston'),
  miami: base('miami'),
};
export type IaChatCopy = ReturnType<typeof base>;
