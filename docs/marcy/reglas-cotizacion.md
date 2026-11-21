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
   o que la IA te recomiende: Dominio). No recita la lista interna. En su primera respuesta el servidor no
   deja cotizar con la lista (`cotizar` devuelve `de_entrada`).
2. **Antes de la cifra** de un plan o de las opciones, pregunta cuánto le deja un cliente o un trabajo.
3. **Al cotizar**, tres opciones, la más completa primero:
   - Paquetes de siempre (`paquetes: true`): Dominio con la web de servicios por ciudades, Crecimiento con
     la Web que vende (la recomendada) y Presencia con la página web y la ficha de Google.
   - A la medida (`opciones`): hasta tres, cada una con un plan, servicios o los dos. El servidor las
     ordena de la más completa a la de entrada y marca como recomendada la de Crecimiento (o la del medio).
   - **Si revisó su web** en la conversación (`revisar_sitio`), la recomendada es la opción del plan que dio
     la revisión, con la misma regla y los mismos datos que el diagnóstico (`recommendPlan` de
     `lib/diagnostic-plan.mjs`, «por lo más flojo», con la ciudad si la dijo): el chat, el diagnóstico y
     su propuesta en Orbit dicen lo mismo, salvo que la web tarde y el chat vea menos (su límite es más
     corto). La pone el servidor (columnas `diag_plan` y `diag_plan_at` de la 031), nunca el modelo; caduca
     a los 7 días, como la conversación que ve Marcy, y la revisión de otra web la sustituye. Si ninguna
     opción lleva ese plan, vale la regla de arriba. Si el plan ya era el recomendado, la cotización es la
     de siempre (misma clave). Marcy nombra el plan de la revisión con su frase y sin cifras.
   - Con lo que le vale un cliente, dice con cuántos clientes al mes se paga lo mensual. Es una cuenta,
     nunca una promesa.
4. **El cliente decidido** (señales de compra) no recibe tres opciones ni la pregunta del valor de un
   cliente: se cotiza lo que pidió y se cierra en ese turno.

## Reglas de la lista (las hace cumplir el servidor)

1. **Planes:** se ofrecen Presencia, Crecimiento y Dominio. Base no se ofrece en propuestas.
2. **Lo mensual** (plan, cuota de los asistentes, Seguimiento en IA) va tal cual la lista: nunca se descuenta.
   En Dominio, la cuota del asistente con IA va incluida. Un añadido cuya lista interna queda por debajo de
   su precio público, o que el plan no admite, no se cotiza: la opción lo trae en `no_cotizado`, Marcy no
   lo promete ni lo suma, y la nota del borrador dice que lo pidió.
3. **Combinación:** dos o más proyectos de pago único en la misma opción = el descuento de la lista
   (`reglas.comboDescuentoProyectos`), redondeado hacia arriba (`reglas.redondeoProyectos`): nunca pasa
   del porcentaje.
4. **Mínimo:** ningún proyecto baja de su precio público ni del mínimo de la lista (`reglas.pisoSobreBase`).
   Con un plan, el SEO inicial va incluido (nota de la lista): no se cobra y sale en `incluido_en_el_plan`.
   Dos opciones que quedan iguales se juntan en una.
5. **Rebaja si el cliente insiste:** solo después de ajustar el alcance, hasta un 10 % más (redondeado
   hacia arriba), nunca bajo el mínimo, y siempre «sujeta a aprobación de un representante» (le llega al equipo como contacto). Un
   servicio «desde» no se rebaja.
6. **Más alcance** (más páginas, otro idioma, más canales): se cotiza lo que hay y el ajuste va en la
   propuesta escrita. El rediseño en dos idiomas sí se cotiza (`segundoIdioma` de la lista).
7. **Todo precio o plazo** va como estimado que se confirma por escrito en la propuesta (Legal, 15-nov).
8. **Proyecto solo «desde»** (`reglas.proyectoSoloDesde`; hoy la web de servicios por ciudades y las
   reservas): no tiene precio cerrado. En el chat se dice «desde», nunca como precio final. En el borrador
   va con su «desde» interno y la nota «Precio por confirmar»; la marca y el bloqueo de envío hasta que el
   dueño ponga el precio real los pone Orbit (pedido a Panel Admin). «Se paga con N clientes» cuenta solo
   lo mensual.
9. **Nombres de plan** (`usoDePrecios.nombresDePlanes`): fuera de una cotización, el nombre del plan y su
   frase, nunca sus cifras. Al cotizar, las cifras como estimado. En inglés, el plan va sin frase: las
   frases en inglés (`fraseEn`) están sin el OK del dueño.

## Condiciones que puede decir

Las frases cortas de Legal (`05-condiciones-comerciales.md`), tal cual, viven en un solo sitio:
`lib/condiciones-legales.mjs`. Las importan el guion y la cotización, y `test:cotizar` falla si alguna
se copia en otro archivo. Cambiar una es cambiarla ahí, con el texto que dé Legal.

- `permanencia` (mes a mes, salvo con la web en tres pagos), `garantia`, `tresPagos` (solo en el paquete
  que lo lleva) y `recuerda` (es un estimado que se confirma por escrito).
- `anual` (pago del año por adelantado): **pendiente de Legal** (20-nov). Dicha en el chat puede
  entenderse como 13 meses por el precio de 12; el texto final llega antes de publicar.
- Nada sobre impuestos (pendiente del contador). Los textos en inglés son traducción, sin revisar por Legal.

## Dónde queda la cotización

- En la conversación (migración 031 en `chat_conversations`): lo que pidió Marcy, **sin cifras**
  (paquetes u opciones con sus ids, lo que le vale un cliente, si pidió rebaja, el idioma y la versión de
  la lista), más su estado: `quote_proposal` (la propuesta de Orbit, «descartada» o vacía = pendiente),
  `quote_tries` y `quote_error`. `diag_plan` guarda el plan de la revisión de su web; la cotización
  marcada por él lo lleva dentro (`plan_diagnostico`), y la tarea la pasa a Orbit con la misma recomendada.
- En Orbit, como **borrador** (`created_by: 'marcy'`; enviada o no se decide en un solo sitio,
  `MARCY_QUOTE_SENT` de `lib/marcy-quote.mjs`, hoy borrador por decisión del 20-nov), unida al contacto
  (`LEAD-…`: al dejar sus datos, al agendar o por WhatsApp e Instagram) o al brief (`MRC-…`, el cliente
  que se decidió; `brief_ref`). La pasa la tarea de cada 5 minutos (`api/cron/canales`), fuera del camino
  de la respuesta al cliente, con la lista de la base de ese momento: si cambió desde que Marcy cotizó,
  lo dice en las notas. `source_ref` = la conversación más la clave de lo pedido: el reintento no duplica.
- **Interruptor:** solo pasa a Orbit con `MARCY_COTIZACION_ORBIT=on` en Vercel. Apagado (hoy), queda
  pendiente en la conversación y entra sola al encenderlo, si tiene menos de 30 días. Se enciende cuando
  Orbit deje corregir o descartar un borrador (aviso de Bases y Estructura, 20-nov).
- Si Orbit la rechaza (dato no válido, contacto que no existe) se descarta y avisa al dueño; si Orbit está
  caído, se reintenta (hasta 20 veces, luego avisa).
- Una cotización nueva en la misma conversación sustituye a sus borradores sin enviar
  (`replaces_prefix: chat:<sid>:`, Orbit PR #98); nunca toca una enviada ni una que el dueño corrigió.
  Antes del #98 Orbit lo ignora y queda otro borrador: por eso el interruptor sigue apagado.
- **Una sola propuesta abierta por ficha** (`skip_if_open: true`, Orbit PR #102, la misma regla que el
  Diagnóstico): si el contacto, el brief o el cliente ya tiene una propuesta enviada, o un borrador que el
  dueño corrigió, no se crea otra. La cotización queda marcada con esa propuesta (no se reintenta) y se
  avisa al dueño. Una propuesta caducada o cerrada no bloquea. Antes del #102 Orbit lo ignora.
- Lo mismo pedido otra vez en menos de 30 días conserva su marca: un borrador que el dueño descartó no
  vuelve a crearse. Pasado ese plazo (WhatsApp dura meses) es otra venta y la tarea avisa si ya existía.
- Un proyecto solo «desde» va sin precio al borrador: Orbit lo deja «por confirmar» y no deja enviarlo
  hasta poner el precio real (PR #98).
- Pendiente (Orbit fase 2): si quien escribe ya es cliente, saber su plan y ofrecer el siguiente.

## Cambios

Una cifra se cambia solo en el catálogo de Ventas (`_cerebro/ventas/catalogo.json`), con el OK del dueño, y
se carga en la base con `npm run sync:catalogo-orbit`. Este documento y el código no llevan cifras.
