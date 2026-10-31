# Marcy frente a la plantilla de comercio de Anthropic

> Revisión del 2026-10-31. Encargo: `_cerebro/marcyan-web/encargos/2026-10-31-marcy-vs-plantilla-commerce.md`
> (paso 1 de 3, **solo informe**: este documento no cambia nada del sitio).
> Código revisado: `main`@`5dbb761`, ya con la puerta técnica del PR #46 en producción.

## Resumen para el dueño

**Marcy ya hace bien lo más importante de la plantilla.** Es un solo asistente (no una cadena de
asistentes que se pasan la conversación), sus botones y tarjetas salen de herramientas que el
servidor valida, los datos personales del visitante nunca pasan por la IA, y ninguna web ajena le
puede colar texto: cuando revisa la web de un cliente, la IA solo ve nuestras propias conclusiones,
no el contenido de esa web. En esto último vamos por delante de la plantilla.

**Lo que la plantilla hace mejor y nos conviene, por orden:**

1. **Pruebas de comportamiento antes de cada cambio.** Hoy probamos a mano cuando tocamos a Marcy.
   La plantilla prueba casos fijos (cliente decidido, pregunta de precio, intento de engaño…) y no
   deja publicar si empeoran. Además, sirve tal cual para los chatbots de los clientes.
2. **Saber cuánto cuesta cada conversación.** Hoy Marcy no anota cuánto gasta ni si el ahorro de la
   caché funciona. Es barato de añadir y sin eso no se puede decidir nada de coste con datos.
3. **Precios con respaldo** *(decisión tuya)*. Hoy Marcy cotiza en vivo y el único freno en código
   es que la cifra esté entre 10 y 25.000 dólares; lo demás depende de que la IA obedezca. La
   plantilla solo deja decir cifras que salen de una fuente: precios publicados, cálculos del
   servidor o números que dijo el propio cliente.
4. **Plan con presupuesto como tarjeta** *(decisión tuya, después del 3)*. "Tengo 1.500 y necesito
   que me encuentren": Marcy arma la combinación con nuestro catálogo, la enseña como tarjeta y la
   cierra en el brief.

**Lo que no conviene:** memoria entre visitas (casi nadie vuelve y es guardar datos personales) y
partir sus instrucciones en piezas que se cargan bajo demanda (añade una llamada a la IA y Marcy ya
es pequeña para eso).

## Fuente y método

- Referencia: repositorio `anthropics/commerce-agents` (Apache-2.0, publicado por Anthropic,
  **sin mantenimiento y sin aceptar contribuciones**), `docs/safety.md`, el skill
  `shopping-agent/skills/planning-goals`, el comando `/review-commerce-agent` del plugin
  `commerce-builder` (su mapa de 10 filas es la columna vertebral de este informe) y el artículo
  "The anatomy of effective commerce agents" (claude.com/blog).
- **No se instaló nada** ni se clonó el repositorio: la referencia se leyó en línea. Por eso no
  hizo falta pasarla por `skill-inspector`. Si más adelante se instala el plugin, ese paso sigue
  siendo obligatorio.
- Marcy: `api/chat.mjs`, `lib/chat-kb.mjs`, `lib/ratelimit.mjs`, `lib/site-fetch.mjs`,
  `lib/diagnostic-checks.mjs`, `scripts/test-chat-guard.mjs`, `docs/marcy-sales-playbook.md`.
  Medidas tomadas sobre el código: instrucciones de Marcy ~22.000 caracteres (~6.100 tokens),
  definiciones de herramientas ~6.700 caracteres; nada variable (fecha, página) dentro de las
  instrucciones.

## Mapa: las 10 filas de la revisión de la plantilla

| Fila | Qué pide la referencia | Marcy hoy | ¿Coincide? |
|---|---|---|---|
| Arquitectura | Un modelo por conversación; procedimientos como skills | Un modelo (Sonnet 5), un bucle con 1 iteración de herramienta como máximo (`api/chat.mjs`, 2.ª llamada solo si hubo herramienta interna) | **Sí** |
| Reglas | Lo frecuente en el prompt; lo de una herramienta en su descripción | Instrucciones + catálogo en el prompt; cada herramienta trae su propio uso en la descripción (`lib/chat-kb.mjs`) | **Sí** |
| Herramientas | Lista corta, resultados tipados, nada que escriba sin puerta | 5 herramientas: 3 de interfaz (captura, canales, enlace) y 2 internas (`calcular_perdida`, `revisar_sitio`), resultados JSON; ninguna escribe nada | **Sí** |
| Petición y caché | Prompt y herramientas fijos; marca de caché; comprobar lecturas de caché en el 2.º turno | Prompt y herramientas fijos con marca de caché en las instrucciones. **No se anota el uso de tokens**, así que no se sabe si la caché acierta. El historial no se cachea | **A medias** |
| Contenido ajeno | Texto de terceros saneado, cercado y con tope antes de la IA | `revisar_sitio` **no pasa ni una línea de la web ajena**: solo puntuaciones y textos de nuestro catálogo de hallazgos (`buildSiteToolResult`). Mensajes del visitante saneados (caracteres de control, roles, tamaños, `tool_result` falsos) | **Mejor que la referencia** |
| Escrituras | Solo ids vistos; topes en código; cambios con aprobación | Marcy no escribe: abre la cajita de captura y el **widget** manda los datos a `/api/contact` o `/api/brief`. La IA nunca ve email ni teléfono | **Mejor que la referencia** |
| Cifras | Cada cifra ligada a una lectura, mejor forzada en código | Catálogo en el prompt, paridad con `pricing.ts` vigilada (`check:kb`), filtro posterior. **El filtro acepta cualquier cifra entre 10 y 25.000 dólares** (`pricePostFilter`, `lib/chat-kb.mjs:408-429`): la disciplina de precio vive en el prompt | **No** |
| Interfaz | Componentes por herramienta, valores del servidor, un evento por componente | Captura, canales y enlace salen como `action` validada (`LINK_PAGES` como lista cerrada). No hay tarjeta de paquete ni de plan | **Sí, incompleto** |
| Sesión y memoria | Sesión atada en el servidor; memoria validada | El id de conversación lo genera el navegador (`validSessionId`, solo formato). Sin memoria entre visitas. Con los frenos por conexión y el tope diario (PR #46), un id falso no abre gasto nuevo | **A medias, aceptable** |
| Pruebas | Batería que corre antes de cada cambio: estado construido, un turno, correctores en código, puerta de repetición | 195 pruebas deterministas de las guardas (validación, filtros, herramientas, frenos). **Ninguna prueba del comportamiento del modelo**: las versiones v7 y v8 se validaron a mano | **No** |

## Tabla de adopción (los 7 puntos del encargo)

| Pieza de la referencia | Cómo está Marcy | Adoptar | Por qué | Esfuerzo | Coste por conversación |
|---|---|---|---|---|---|
| 1. Precios con respaldo | Cotiza en vivo; en código solo una banda de 10 a 25.000 | **Sí, con tu decisión** | Hoy un precio inventado dentro de la banda llega al cliente. Con procedencia, solo pasan los publicados, los que calcula el servidor y los que dijo el propio cliente | Medio-bajo (medio día + pruebas) | Igual. Si se añade una herramienta de cotizar, una llamada extra solo en los turnos de precio |
| 2. Componentes como herramientas | Ya lo hace para captura, canales y enlaces | **Después** (tarjeta de paquete o plan) | La base ya está; falta la pieza de precio, que depende del punto 1 y de tu regla de precios | Medio (incluye puerta de diseño) | Igual |
| 3. Plan con presupuesto que cierra en el brief | No existe como flujo; Marcy lo hace en prosa | **Después** | Es el patrón `planning-goals`: objetivo + presupuesto, una elección por paso, tarjeta y cierre. Encaja con el brief, pero pide antes el punto 1 | Medio-alto (2-3 días) | Sube poco en esos turnos (una llamada más); se compensa si convierte |
| 4. Skills bajo demanda | Un prompt único de ~6.100 tokens, cacheado | **No** | La regla de la referencia: lo que sirve a un tercio o más del tráfico va en el prompt, y casi todo lo de Marcy sirve en casi cada turno. Cargar una pieza cuesta un turno de IA | — | Subiría |
| 5. Seguridad del arnés | Guardas en código, PII fuera, sin texto ajeno, frenos guardados y tope diario desde hoy | **Ya está** (2 detalles abajo) | La referencia exige al despliegue frenos en las rutas del chat y fuera de la IA las credenciales: los dos están | Bajo | Igual |
| 6. Memoria entre sesiones | No hay | **No** | Casi nadie vuelve, y guardar hechos de visitantes es guardar datos personales. La propia referencia pide validadores, retención y borrado | — | — |
| 7. Pruebas con puerta | Solo pruebas de guardas; comportamiento a mano | **Sí, primero** | Es lo que pide la referencia antes de tocar cualquier prompt, y es reutilizable para los chatbots de los clientes | Medio (1-2 días para la primera batería) | Igual (las pruebas cuestan aparte, por pasada) |

**Dos detalles de seguridad, baja prioridad:** los registros del servidor guardan la IP en claro en
los avisos de bloqueo (`[chat] blocked=… ip=…`); la referencia advierte de datos personales en los
registros. Y el id de conversación nace en el navegador; con los frenos de hoy no abre gasto, así
que no merece cambio ahora.

## Propuestas priorizadas

### P1 · Pruebas del comportamiento de Marcy con puerta (primero)

- **Qué:** una batería de casos fijos al estilo de la referencia ("evaluar instantáneas, no
  conversaciones"): se construye el historial, se añade el mensaje del visitante, Marcy responde una
  vez y un corrector en código decide. Casos de salida: cliente ya decidido que no debe volver al
  diagnóstico, no cambiarle el producto, abrir la captura cuando toca, cifras solo de las
  permitidas, intento de inyección en el mensaje, idioma, enlaces de la lista. Cada caso positivo
  con su contrario.
- **Tamaño:** 15 a 20 casos al principio (la referencia habla de 50 a 100 por flujo a escala; con
  nuestro tráfico no hace falta), varias pasadas por caso.
- **Puerta:** se corre antes de cualquier cambio de instrucciones, herramientas o modelo; no se
  publica si baja el porcentaje de aciertos.
- **Por qué primero:** el comando de revisión de la plantilla pone las pruebas antes que todo lo
  demás, y es lo que hace seguras las propuestas 3 y 4. Para la agencia es además el estándar para
  los chatbots de clientes.

### P2 · Medir coste y caché por turno

- **Qué:** anotar por turno, sin contenido, los tokens de entrada, salida, lectura y escritura de
  caché, y si hubo segunda llamada. Un resumen diario en el panel o en el informe mensual.
- **Por qué:** hoy no se sabe si la caché acierta ni cuánto cuesta una conversación. La referencia
  pide comprobarlo en el segundo turno y usarlo como puerta junto con las pruebas. Sin este dato, el
  tope diario de 200 mensajes está puesto a criterio y no con números.
- **Esfuerzo:** bajo (horas). Sin efecto en el coste.

### P3 · Precios con respaldo (decisión tuya)

- **Qué:** cambiar la banda de 10 a 25.000 por procedencia: pasa una cifra si es un precio
  publicado, si la calculó el servidor en ese turno (como ya hace `calcular_perdida`) o si aparece en
  los mensajes del propio cliente ("un corte 25", "facturo 3.000"). Lo demás se reconduce a "te armo
  una cotización real", como hoy.
- **La decisión:** Marcy hoy da rangos, estimados, combinaciones y descuentos sujetos a aprobación.
  Con este cambio, los rangos y combinaciones tendrían que salir de una herramienta de cotizar en el
  servidor (con tus reglas: pisos, combinaciones y descuentos permitidos), no de la cabeza de la IA.
  Tú decides si Marcy sigue cotizando en vivo con esas reglas o pasa a dar solo los "desde" y deja el
  número final a la cotización, como ya decidiste para los formularios el 23-oct.
- **Esfuerzo:** medio-bajo, y depende de P1 para no romper ventas que hoy funcionan.

### P4 · Plan con presupuesto como tarjeta (después de P3, decisión tuya)

- **Qué:** el patrón `planning-goals` de la referencia llevado a nuestro catálogo: objetivo, plazo y
  presupuesto del cliente; tres a cinco pasos; una opción por paso de `pricing.ts`; tarjeta en el
  chat; "lo quiero" abre el brief ya relleno.
- **Por qué después:** sin P3 la tarjeta enseñaría cifras sin respaldo, y cambia lo que se ve, así
  que pasa por la puerta de diseño y por tu OK sobre el render.

### Lo que queda fuera

Los pasos 2 y 3 del encargo (demo bilingüe de tienda con asistente y un posible nivel "Tienda con
asistente" en E-Commerce) **no están encargados** y no se tocan aquí. Esta revisión sí deja una
conclusión útil para ellos: la plantilla es buena referencia de arquitectura, pero es Python, no
tiene mantenimiento y no trae frenos de las rutas del chat; cualquier demo tendría que llevar los
de este sitio.
