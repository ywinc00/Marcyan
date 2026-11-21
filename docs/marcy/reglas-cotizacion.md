# Reglas de cotización de Marcy (Ventas §4, planes y paquetes)

Estado: **plan de Ventas aprobado por el dueño (18-nov-2026), con la corrección del 19-nov.**
Sustituye a las reglas del 7-nov (P3, opción A), que cotizaban con la lista vieja de 14 servicios.

Marcy no calcula precios: le pasa al servidor qué opciones quiere dar y repite las cifras que salen.
Si dice una cifra de 100 dólares o más que no sale de aquí, de los precios publicados o de lo que dijo
el propio cliente, el servidor la corta antes de que el cliente la vea.

Código: `lib/marcy-quote.mjs` (opciones y precios), `lib/chat-kb.mjs` (guion y herramienta `cotizar`).
Pruebas: `npm run test:cotizar` y la batería `npm run eval:marcy`.

## De dónde salen las cifras

- **Públicas** («desde»): bloque `preciosPublicos` del catálogo de Ventas, copiado al código con
  `npm run sync:catalogo`. Es lo único que Marcy dice **de entrada**.
- **Internas** (planes, paquetes y lista de servicios): solo en la base, tabla `sales_catalog`, la misma
  que usa Orbit. Este repo es público: aquí no hay ni una cifra interna. Marcy las da solo al cotizar,
  y el servidor les pone precio con `priceOption` de `lib/proposals.mjs`, así lo que dice en el chat y la
  propuesta que queda en Orbit son lo mismo.

## Cómo cotiza

1. **De entrada**, si preguntan por una cosa suelta: su «desde» público y, en una frase, el plan que la
   acompaña (página o web: Presencia o Crecimiento; SEO local: Presencia o Crecimiento; asistente con IA
   o que la IA te recomiende: Dominio). No recita la lista interna.
2. **Antes de la cifra** de un plan o de las opciones, pregunta cuánto le deja un cliente o un trabajo.
3. **Al cotizar**, tres opciones, la más completa primero:
   - Paquetes de siempre (`paquetes: true`): Dominio con la web de servicios por ciudades, Crecimiento con
     la Web que vende (la recomendada) y Presencia con la página web y la ficha de Google.
   - A la medida (`opciones`): hasta tres, cada una con un plan, servicios o los dos. El servidor las
     ordena de la más completa a la de entrada y marca como recomendada la de Crecimiento (o la del medio).
   - Con lo que le vale un cliente, dice con cuántos clientes al mes se paga lo mensual. Es una cuenta,
     nunca una promesa.
4. **El cliente decidido** no recibe tres opciones: se cierra con lo que pidió.

## Reglas de la lista (las hace cumplir el servidor)

1. **Planes:** se ofrecen Presencia, Crecimiento y Dominio. Base no se ofrece en propuestas.
2. **Lo mensual** (plan, cuota de los asistentes, Seguimiento en IA) va tal cual la lista: nunca se descuenta.
   En Dominio, la cuota del asistente con IA va incluida.
3. **Combinación:** dos o más proyectos de pago único en la misma opción = el descuento de la lista
   (`reglas.comboDescuentoProyectos`), redondeado (`reglas.redondeoProyectos`).
4. **Mínimo:** ningún proyecto baja de su precio público ni del mínimo de la lista (`reglas.pisoSobreBase`).
5. **Rebaja si el cliente insiste:** solo después de ajustar el alcance, hasta un 10 % más, nunca bajo el
   mínimo, y siempre «sujeta a aprobación de un representante» (le llega al equipo como contacto). Un
   servicio «desde» no se rebaja.
6. **Más alcance** (más páginas, otro idioma, más canales): se cotiza lo que hay y el ajuste va en la
   propuesta escrita. El rediseño en dos idiomas sí se cotiza (`segundoIdioma` de la lista).
7. **Todo precio o plazo** va como estimado que se confirma por escrito en la propuesta (Legal, 15-nov).

## Condiciones que puede decir (Legal, `05-condiciones-comerciales.md`, tal cual)

- «Mes a mes, sin permanencia, salvo con la web en tres pagos.»
- «Si un mes no hacemos lo que dice tu plan, ese mes no se cobra. Garantizamos el trabajo, no el resultado.»
- «Paga el año por adelantado y tienes un mes de regalo.»
- «Tu web en 3 pagos sin recargo si eliges 6 meses de plan.» (solo en el paquete que lo lleva)
- Nada sobre impuestos (pendiente del contador). Los textos en inglés son traducción de Marcy, sin revisar por Legal.

## Dónde queda la cotización

- En la conversación (migración 031, columnas `quote`, `quote_at` y `quote_proposal` de
  `chat_conversations`): los ids de plan, servicio y añadido con el precio que Marcy dijo (en centavos,
  para que la propuesta sea la misma; la base es privada), la recomendada y lo que le vale un cliente.
- En Orbit, como **borrador** (`created_by: 'marcy'`; enviada o no se decide en un solo sitio,
  `MARCY_QUOTE_SENT` de `lib/marcy-quote.mjs`, hoy borrador por decisión del 20-nov) en cuanto la
  conversación tiene contacto (`LEAD-…`: al dejar sus datos, al agendar o por WhatsApp e Instagram) o brief
  (`MRC-…`, el cliente que se decidió; `brief_ref`, desde la migración 032 de Orbit). La envía el dueño
  desde Orbit. `source_ref` = la conversación más una clave de la cotización: el reintento no duplica.
- Si no entra (Orbit caído, o un brief antes de la 032), queda pendiente y la tarea de cada 5 minutos
  (`api/cron/canales`) la reintenta durante 30 días.
- Pendiente (Orbit fase 2): si quien escribe ya es cliente, saber su plan y ofrecer el siguiente.

## Cambios

Una cifra se cambia solo en el catálogo de Ventas (`_cerebro/ventas/catalogo.json`), con el OK del dueño, y
se carga en la base con `npm run sync:catalogo-orbit`. Este documento y el código no llevan cifras.
