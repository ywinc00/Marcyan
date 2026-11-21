Proyecto: Marcyan Web    Página/Vista: /es/houston/ia-conversacional, /es/miami/ia-conversacional, /es/houston/ecommerce, /es/miami/ecommerce
Modo: REDISEÑO/IDENTIDAD (solo texto dentro de la plantilla v3 ya publicada)

Encargo: `_cerebro/marcyan-web/encargos/2026-11-15-parejas-rehechas-por-el-rediseno.md` (OK del dueño 18-nov).
El rediseño WorkOS (PR #65) pintó en las dos ciudades el mismo texto libre con el nombre cambiado:
92 % de parecido en IA conversacional y 82 % en tienda en línea (medido en producción el 18-nov), y la
página de Miami enseña ejemplos de Houston (Katy y un teléfono 832 en el hero).

Inventario de marca conservada:
- CONSERVADO: la plantilla v3 entera (DESIGN.md v3, PR #65 y #66): estructura, orden de secciones,
  componentes, tokens, tipografía, fondos, animaciones y maquetación. H1, respuesta directa, preguntas
  frecuentes, «por qué en la ciudad», precios y servicio siguen en clusters.ts sin tocar.
- ELEVADO: el texto libre de cada ciudad (src/i18n/w/ia-chat.ts y src/i18n/w/ecommerce.ts) y los
  ejemplos del hero de IA (EscenaDosActos) y del horario de la pieza de alta (AltaMarcy), con un dato
  opcional por ciudad que por defecto deja todo igual.
- PROHIBIDO: nuevas secciones, nuevos bloques de texto, cambios de estilo o de composición.

1. Dirección visual: la de la plantilla v3 validada (PR #65, OK del dueño 2026-11-10). Este encargo no la toca.
2. Jerarquía: sin cambios. Los textos nuevos ocupan los mismos huecos con largos parecidos.
3. Intención por sección: sin cambios de trabajo ni de formato. Cambia el ejemplo: Houston sigue con un
   negocio de servicios a domicilio (obras, visitas, zonas que se manejan); Miami pasa a un restaurante
   (WhatsApp primero, reservas, el español de cada cliente y turistas que escriben en inglés), como pedía
   el texto del 1-nov (PR #51) y la regla E-65 (c) del ledger: dos páginas hermanas no comparten ejemplo.
4. Estilo de componentes: sin cambios.
5. Errores genéricos evitados:
   - NO la misma página con el nombre de la ciudad cambiado → SÍ ejemplo, horario, reglas y avisos propios de cada ciudad.
   - NO restos de otra ciudad (Katy y 832 en Miami) → SÍ prefijos 305 y 786 y barrios de Miami-Dade en Miami.
   - NO cifras ni casos inventados → SÍ ejemplos rotulados «Ejemplo» y el caso real de siempre (Rosy Nails, Houston).
   - NO guiones como conector → SÍ comas y puntos (E-07).

Piezas del catálogo: I-02 (respuesta directa, ya propia de cada ciudad), I-04 (proceso en pasos: el
ejemplo de «Cómo trabaja» y «Así empiezas» pasa a ser de cada ciudad), C-10 (andamio de confianza sin
prueba social: Miami dice que aún no hay caso publicado allí).
Sub-agentes invocados: ninguno (sin material nuevo).
Estado: PROPUESTO → VALIDADO por: encargo del dueño del 18-nov (alcance: solo texto); el render lo aprueba el dueño antes de publicar.  Fecha: 2026-11-18
