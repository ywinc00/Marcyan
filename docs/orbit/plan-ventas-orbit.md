# Orbit para vender por planes (Ventas §1)

Encargo: `_cerebro/marcyan-web/encargos/2026-11-18-ventas-planes.md` §1 (aprobado por el dueño el 2026-11-18).
Plan de Ventas: `Marcyan Estructura de Agencia/docs/ventas/plan-ventas-2026-11.html`, bloque «Orbit y su agente de
Finanzas» y «Añadidos». Precios y planes: `_cerebro/ventas/catalogo.json` (fuente única).

Precios (catálogo, bloque `usoDePrecios`): Orbit trabaja con los precios internos, el precio real de cada proyecto
según su alcance; propuestas, cotizaciones guardadas y facturas nunca usan el «desde», que es solo para lo que se
publica. Servicio `webPagina` (página web sola) y `webLanding` es «Página web + ficha de Google».

**Los precios internos nunca entran en este repo, que es público.** Orbit los lee de la base de datos (tabla
`sales_catalog`), cargados desde el catálogo con `npm run sync:catalogo-orbit`. En el repo solo hay nombres de
campos y, en las pruebas, un catálogo inventado. Los bocetos con cifras reales viven en
`_cerebro/marcyan-web/bocetos/ventas/`, no en `design/`.

Reglas que no cambian: cobro como hasta ahora (Zelle, a mano; nada automático con tarjeta), el agente de Finanzas
propone y nunca cobra ni escribe al cliente, migraciones a mano con OK del dueño, lo visible con su OK sobre el render.

## Fases

Tres entregas, cada una con su PR. La 1 va primero porque de ella dependen Marcy (guardar la cotización, §4) y el
Diagnóstico (etapa «diagnóstico hecho», §5).

### Fase 1 · Embudo y propuestas (desbloquea a ChatBot y Tecnologuia)

- **Etapas del embudo** en los contactos: nuevo, contactado, **diagnóstico hecho**, **propuesta enviada**, **ganado**
  (hoy «convertido»: el contacto pasa a cliente), **perdido** con motivo obligatorio, archivado. Prueba y Spam siguen
  aparte. Canal de origen: el `source` de hoy (formulario, chat, diagnóstico) más WhatsApp, Instagram, llamada,
  referido y otro.
- **Propuestas** (tabla nueva): unida al contacto o al cliente; opciones (plan + proyecto con sus precios del
  catálogo), cuál se recomendó, cuál eligió, cuánto le vale un cliente (para la cuenta «se paga con N trabajos»),
  fecha de envío y de caducidad (14 días), estado (borrador, enviada, aceptada, rechazada, caducada) y quién la hizo
  (Orbit, Marcy, Diagnóstico). Seguimientos de los días 2, 5 y 10 como avisos.
- **Para Marcy y el Diagnóstico**: una función del servidor (`lib/proposals.mjs`) que guarda la propuesta y mueve el
  contacto de etapa; ellos la llaman desde su código, sin pasar por la red. El nombre y la forma quedan escritos en
  «Para Marcy y el Diagnóstico» (abajo). Al publicar se avisa a Bases y Estructura, que lanza la tanda 2.
- **En Orbit**: la etapa y el motivo en la ficha del contacto; la lista de propuestas de cada contacto; el embudo con
  cuántos hay en cada etapa (y cuánto suma lo propuesto). Pasa por el gate de diseño con bocetos.
- Migración `029` (con OK).

### Fase 2 · Plan de cada cliente, factura del mes y cifras

- **Plan del cliente** (tabla nueva con historial): nivel (Base, Presencia, Crecimiento, Dominio), precio, añadidos
  (Seguimiento en IA, cuota de asistentes), día de cobro, fecha de inicio, estatus (activo, fundador, en pausa,
  terminado; «sin plan» se calcula), precio de fundador con fecha de fin, pago anual.
- **A la vista**: en la ficha y en la lista de clientes; «Sin plan» marcado en el cliente con proyecto terminado y sin
  plan. En la ficha de llamada (`scripts/ficha-llamada.mjs`), su plan.
- **Factura del mes**: la tarea diaria de Finanzas la deja en borrador el día de cobro (sin duplicar: una por plan y
  mes) y el dueño la confirma.
- **Agente de Finanzas, tres avisos**: factura del mes lista, cobro atrasado a 5 y 15 días, precio de fundador que
  vence en 30 días.
- **Cifras**: ingreso mensual fijo, clientes por plan, altas, bajas y subidas del mes.
- Alta del plan de los clientes de hoy (Move Junk Away, Julio's Landscape): las condiciones las pone el dueño a mano.
- Migración `030` (con OK).

### Fase 3 · Añadidos y Reports

- Garantía de entrega (mes sin cobro apuntado con su motivo), cupo de 2 altas al mes a la vista, recordatorio de
  recuperación a 90 días, «Ficha al día» como primera compra y su descuento si contrata un paquete en 30 días.
- Tipo de proyecto elegido del catálogo y los proyectos de SEO unidos a su cliente (hoy van por nombre).
- Plan y estatus de cada cliente hacia Reports (cuando Reports tenga dónde recibirlo).

## Para Marcy y el Diagnóstico (fase 1)

Estado: **en producción** desde el 2026-11-20 (PR #95). Código: `lib/proposals.mjs` (lo cambia solo Panel Admin;
lo que haga falta se pide por Bases y Estructura); pruebas: `npm run test:proposals`.

```js
import { saveProposal, advanceLeadStage } from '../lib/proposals.mjs';

// Guardar la cotización (Marcy) o la propuesta del diagnóstico.
const { proposal, created, lead_status } = await saveProposal({
  lead_ref: 'LEAD-123',              // o client_id, o brief_ref: 'MRC-045' (al menos uno; brief_ref con la 032)
  created_by: 'marcy',               // 'marcy' | 'diagnostic' | 'orbit'
  source_ref: 'conv-…',              // obligatorio para marcy y diagnostic: el reintento no duplica
  options: [                         // 1 a 3
    { plan: 'crecimiento', projects: [{ id: 'web' }], addons: [], label: 'Opcional' },
    { plan: 'dominio', projects: [{ id: 'webCiudades', price_cents: precioRealEnCentavos }] },
  ],
  recommended_option: 0,             // posición de la recomendada
  client_value_cents: null,          // cuánto le vale un cliente (para «se paga con N trabajos»)
  send: true,                        // true = enviada (caduca a los 14 días, seguimientos 2, 5 y 10)
});

// Mover al contacto en el embudo (el Diagnóstico, al terminar): solo hacia delante.
await advanceLeadStage('LEAD-123', 'diagnosed', { by: 'diagnostic' }); // → { lead_ref, status, moved }
```

- `plan` y los `id` de servicios y añadidos son las claves del catálogo tal cual (`base | presencia |
  crecimiento | dominio`). Marcy y el Diagnóstico no pueden ofrecer un plan con `enPropuestas: false`.
- Los precios los pone el catálogo privado de la base. `price_cents` solo se manda si el precio real es otro
  (un «desde» interno, o más alcance); nunca puede bajar del público ni del mínimo. Lo mensual no se manda:
  si se manda y no coincide, error.
- Errores: `CrmError` con `status` (400 dato mal, con `extra.field`; 404 contacto o cliente que no existe;
  503 sin la migración 029 o sin el catálogo cargado). Un 400 no se reintenta; un 503 sí, más tarde.
- `send: true` mueve el contacto a «propuesta enviada» si estaba antes en el embudo; nunca saca a nadie de
  ganado, perdido, archivado, prueba o spam.
- `send: false` deja un borrador: Orbit le pone el paso «enviar la propuesta» con 24 horas desde que se creó, sale
  en «Para hoy» y como atrasado si pasa el plazo (tanda 2, petición de ChatBot).
- Un servicio que en el catálogo solo tiene «desde» (`desde` sin `precio`, como `webCiudades` o `reservas`) y
  llega sin `price_cents` queda **por confirmar** (`pending_price` en el servicio y `pending` en la opción): se
  guarda como borrador, pero `send: true` da 400 (`extra.field` = `options.i.projects.j`) y Orbit no deja
  marcarla como enviada hasta que el dueño pone el precio real. Marcy y el Diagnóstico pueden dejarlo así: un
  «desde» nunca es una cotización. El precio real nunca baja de ese «desde» (`reglas.proyectoSoloDesde`), y «se paga
  con N clientes» se cuenta solo con lo mensual.
- El dueño corrige o descarta un borrador en Orbit (`editProposal(ref, { options, recommended_option?,
  client_value_cents? })` y `discardProposal(ref)`, solo en borrador; 409 si ya se envió). Corregir vuelve a
  preciar con el catálogo de hoy; descartar borra el borrador y lo apunta en el historial del contacto. Un borrador
  descartado deja libre su `source_ref`: si Marcy o el Diagnóstico vuelven a llamar con el mismo, se crea uno nuevo.
- **Varias cotizaciones en la misma conversación** (tanda 2, 7c): `replaces_prefix` (p. ej. `chat:<sid>:`) hace que
  la nueva sustituya a los borradores sin enviar cuyo `source_ref` empieza igual, del mismo autor y del mismo
  contacto, brief o cliente. Nunca toca una enviada ni un borrador que el dueño ya corrigió. Devuelve
  `replaced: [PROP-…]` y apunta «sustituido» en el historial. Tiene que ser el principio del `source_ref` de la
  nueva (si no, 400 con `field: 'replaces_prefix'`); un reintento con el mismo `source_ref` no sustituye nada.
- **Una sola abierta** (7e): con `skip_if_open: true`, `saveProposal` no crea otra si el contacto (o, sin contacto, el
  brief o el cliente) ya tiene una propuesta en borrador o enviada. Lo comprueba dentro de la transacción, con el contacto
  bloqueado y sus abiertas bloqueadas también, así que corregir o enviar a la vez no deja dos. Devuelve
  `{ created: false, open: true, proposal: <la abierta> }`. Un borrador sin tocar de la misma conversación
  (`replaces_prefix`) no bloquea, porque se sustituye. Uno que el dueño corrigió sí bloquea.
- **Orden de bloqueos** (7e): todo lo que cambia una propuesta (guardar, enviar, corregir, descartar, decidir,
  seguimiento y caducar) bloquea primero el contacto y después la propuesta. Así dos cambios a la vez no se
  esperan el uno al otro.
- **Aviso del mismo día de un borrador sin contacto** (7d): cuando Marcy o el Diagnóstico dejan un borrador
  en un brief o en un cliente, `saveProposal` deja un aviso en la bandeja de Orbit y en el móvil (tipo `system`,
  clave `borrador:<MRC-… o CLI-…>`, uno cada 24 horas por ficha). El aviso lleva a esa ficha y dice el plazo de 24 horas y
  si falta un precio. Esos borradores no salen en «Para hoy», que solo enseña contactos. Se manda después de guardar y
  nunca tumba el guardado. Los de un contacto no avisan, porque ya salen en «Para hoy».
- `brief_ref` (migración 032): la cotización de quien se decidió en el chat y fue directo al brief, sin contacto.
  Se ve en la ficha del brief en Orbit; si ese brief ya es cliente, queda unida también al cliente. Brief y
  contacto no se fusionan.

En Orbit (fusión de las formas 1 y 2, validada el 2026-11-20): Leads abre «En curso» agrupado por etapa, con el
interruptor «Para hoy»; la ficha lleva el camino de etapas, los seguimientos, la propuesta y «Marcar como perdido».
La tarea diaria de Finanzas (`api/cron/finanzas.mjs`) llama a `expireDueProposals()` y avisa de cada vencida.
Migración 029 aplicada y catálogo cargado en la base el 2026-11-20, con OK del dueño.

## Decisiones tomadas por defecto (se pueden cambiar)

- «Ganado» es el «convertido» de hoy: el contacto se convierte en cliente y su propuesta aceptada queda unida al
  cliente. No se crea una etapa doble.
- El motivo de «perdido» se elige de una lista corta (precio, eligió a otro, no era el momento, no contestó, no
  encaja) con un texto opcional.
- Una propuesta caduca sola a los 14 días si nadie la marca; caducar no mueve al contacto a «perdido»: avisa.
