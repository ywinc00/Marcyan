```
Proyecto: Marcyan Web    Página/Vista: Orbit › Leads (ventas por etapas y propuestas, Ventas §1 fase 1)
Modo: REDISEÑO/IDENTIDAD dentro de la gramática Orbit (design/orbit.md)
Plan: docs/orbit/plan-ventas-orbit.md · Encargo: _cerebro/marcyan-web/encargos/2026-11-18-ventas-planes.md §1
Bocetos: _cerebro/marcyan-web/bocetos/ventas/bocetos.html (privado: llevan precios internos; formas 1, 2 y la fusión 1 + 2, baja fidelidad)
Estado: VALIDADO por el dueño 2026-11-20: fusión 1 + 2 (base la 2), sobre el boceto tras una ronda de crítica.
        Falta su OK sobre el render real antes de mergear.
```

## Inventario de lo que Leads enseña hoy (E-75, se conserva)
Lista: cifras de arriba (Este mes, Por atender, Convertidos con su %), filtros por estado con recuento, búsqueda,
filtro de origen, tabla (contacto con su color, origen, mensaje con interés, fecha, estado), Exportar, Actualizar.
Ficha: estado, mensaje con interés, conversión, notas internas, historial, contacto completo (página de origen,
actualizado, estado), llamar, WhatsApp, escribir, datos técnicos del envío y Borrar.

## 1. Dirección
Concepto: «cada contacto dice en qué paso está y qué toca». Adjetivos operativos: por etapas, con fecha, accionable,
monocromo + 1 acento. Piezas: **E-06** filtros en pastillas con estado en la URL, **I-06** pestañas segmentadas
(Por etapas / Para hoy), **D-02** tres opciones con una sola recomendada y diferencias reales, **I-09** cifras tabulares,
**E-08/E-09/E-10** vacío, carga y error.
Referencias miradas en imagen (Refero): Wrike bandeja con ficha (053b797e, fuera del nicho), Amie bandeja «Hoy»
(85d84a00, fuera del nicho), Linear lista agrupada por estado (4a094449, fuera del nicho), Rox oportunidad con etapa y
pendientes con fecha (11ed246e), Dock propuesta con precios y recomendada (56f6aa17). Se toman principios; ni sus
colores ni sus componentes. Descartado: tablero por etapas (Fibery 263e09e8): seis columnas no caben en 1366.

## 2. Jerarquía
(1) Lo atrasado (rojo) y lo de hoy (ámbar); (2) la etapa de cada contacto y lo propuesto; (3) la lista completa.
Una acción principal por vista: en la ficha, «Ganado: pasar a cliente» (convierte en cliente, como hoy); en las
listas, ninguna en naranja (la propuesta nace del contacto).

## 3. Intención por sección
- **Elegida (20-nov): forma 1 + 2.** La tabla de la forma 2 (agrupada por etapa, lo propuesto en una columna
  compacta) con un interruptor «Por etapas · Para hoy N (M tarde)» junto al título, en lugar de la franja. «Para hoy»
  ordena la misma tabla en atrasado, hoy y esta semana, con las mismas filas; sin tarjetas ni panel lateral; tocar
  una fila abre la ficha. Abre en «Por etapas». Teléfono: el mismo interruptor y secciones con filas de dos líneas.
  Motivo del dueño: la forma 1 «muestra todo en listas que abarcan demasiado en la pantalla» (ledger E-82).
- **Forma 1 · abre en Hoy**: cola «Para hoy» (atrasado primero) y «Esta semana», con la ficha al lado; «Todos» es
  la lista agrupada. Teléfono: la cola sola, la ficha al tocar.
- **Forma 2 · abre en la lista agrupada**: grupos en orden de embudo con recuento y suma; franja «Para hoy» encima.
  Teléfono: lista agrupada con la franja arriba.
- **Ficha (las dos)**: camino de etapas con fechas, seguimientos arriba, propuesta con tres opciones (completa
  primero, recomendada marcada), lo incluido y en cuántos trabajos se paga el plan; debajo, la ficha de hoy.
  Perdido: motivo obligatorio de una lista corta, nada marcado de inicio. Propuesta vencida: avisa, no da por perdido.

## 4. Componentes
Primitivas de Orbit sin cambios (tarjeta, pastilla de estado, tabla, `<dialog>`, botones). Nuevos usos sin tokens
nuevos: fila de pendiente (avatar, qué toca, quién, cuándo, pastilla de plazo), camino de etapas (pasos con fecha,
el actual subrayado en blanco), tarjeta de opción de propuesta.

## 5. Errores evitados (NO → SÍ)
- NO tablero de seis columnas estrechas → SÍ cola de hoy o lista agrupada que caben en el portátil.
- NO naranja en pastillas o en la fila elegida → SÍ naranja solo en la acción principal; plazos en ámbar y rojo.
- NO «Eligió una opción» ambiguo → SÍ «Ganado: pasar a cliente».
- NO perdido con un motivo ya marcado → SÍ nada marcado y el botón apagado hasta elegir.
- NO quitar lo que Leads enseña hoy → SÍ todo conservado (inventario de arriba).
Ledger aplicable: E-19, E-61, E-68, E-75, E-77, E-78, E-82. Crítica adversarial: ronda 1 «no sale» (A 4, B 6, C 5, ficha 6);
rehecho con sus arreglos.

## Puerta de salida (2026-11-20)
Bloques pasados: 1 Identidad, 2 Jerarquía, 3 Tipografía, 4 Color, 5 Espaciado, 6 Componentes, 7 Accesibilidad, 8 Responsive,
9 Anti-genérico y 10 Consistencia (pantalla nueva). Auditoría automática: PASA (excepciones anotadas: medidas del
segmentado de Marcy, monograma blanco de 11 px, negro de la máscara del fundido, foco de párrafos de inicio de diálogo).
Matriz de anchos en Chrome real (320 a 2560, 390 táctil): sin desbordamiento. Crítica adversarial sobre lo construido
en 4 rondas, aplicada; lo que quedó por decisión: tarjetas de cifras de Orbit en escritorio, formato de fecha de la
cabecera de la ficha y contador del menú. Falta el OK del dueño sobre el render.

## Ampliación: borradores que se corrigen y precio por confirmar (2026-11-20, petición de Bases y Estructura)
Encargo: un borrador de Marcy o del diagnóstico que vino mal se corrige o se descarta, y un servicio que en el
catálogo solo tiene «desde» queda «por confirmar» y no se puede enviar hasta poner su precio real. Dentro de la
dirección VALIDADA de arriba: sin pantallas, tokens ni primitivas nuevas.
- Piezas del catálogo: **D-01** (el «desde $X» se enseña como tal, nunca como precio cerrado), **F-10** (guardar y
  enviar con su estado de espera y apagados mientras guardan), **E-10** (si se guarda la corrección y falla el envío,
  lo dice y deja reintentar), **E-08** (al descartar, la tarjeta vacía propone «Nueva propuesta»).
- Tarjeta del borrador: en teléfono «Marcar como enviada» a lo ancho y Descartar (confirmación roja) y Corregir
  debajo. Con precio por confirmar, «Corregir» pasa a «Poner el precio», «Marcar como enviada» no sale y la opción dice
  «desde $X» y «falta el precio de «…»» con el punto ámbar de las pastillas (una señal por hecho, E-19).
- Diálogo: el mismo de «Nueva propuesta» con lo del borrador puesto; lo que el diálogo no elige (más servicios con su
  mensual, añadidos) sale en una línea cada uno con «Quitar» y su precio en la columna «Precio real». El foco abre en el
  campo que falta (borde ámbar; rojo si baja del mínimo, que se dice por línea). La razón de los botones apagados y el
  error de guardar van en el pie, junto a los botones. El proyecto lleva el precio delante: se corta el nombre, nunca el «desde».
- Embudo: «desde $X» y «borrador, precio por confirmar»; en teléfono, dos líneas: el paso se corta antes que la cifra
  y el mensual solo se quita en la fila que no cabe (consulta de contenedor; a 320, solo la cifra del proyecto).
  Paso «Poner precio», también en la ficha de llamada, con «desde $X (precio por confirmar)».
- Diálogo bajo 480 px: «Opción N» y «Quitar opción» en la primera línea, «Recomendada» debajo.
- Brief: la tarjeta de propuesta con su separación (venía pegada a «Negocio» desde el PR #96).
- NO un botón apagado sin razón → SÍ la razón en el pie. NO texto ámbar de poco contraste → SÍ punto ámbar y texto
  legible. NO borrar sin rastro → SÍ confirmación y línea en el historial. NO cifra cortada a medias → SÍ se corta el texto.

### Puerta de salida de la ampliación (2026-11-20)
Bloques: 2 Jerarquía, 3 Tipografía, 4 Color, 5 Espaciado y 6 Componentes (botones, diálogo y estados nuevos), 7
Accesibilidad y 8 Responsive (siempre), 10 Consistencia (clases nuevas). Saltados: 1 Identidad y 9 Anti-genérico (ni
página ni sección nueva, sin colores ni fuentes nuevas). Auditoría automática: PASA. Matriz 320 a 2560 (320, 360 y 390
táctiles) en Chrome real: sin desbordamiento en la página ni en el diálogo; alto contraste mirado. Crítica adversarial:
rondas 1 a 4 (5, 7, 8 y 8,5 sobre 10, «no sale») con sus arreglos; ronda 5, 9/10, «sale». Falta el OK del dueño.
