# Reglas de cotización de Marcy (P3, opción A)

Estado: **propuesta del 2026-11-07, pendiente del OK del dueño.** Marcy ya no calcula precios:
le pasa al servidor lo que pide el cliente y repite la cifra que sale. Si dice una cifra de 100
dólares o más que no sale de aquí, de los precios publicados o de lo que dijo el propio cliente,
el servidor la corta antes de que el cliente la vea.

Código: `lib/quote-rules.mjs` (mantener esta tabla igual al código).

## Precio base = precio publicado, con lo que incluye

| Servicio | Base | Incluye | Extras propuestos |
|---|---|---|---|
| Landing Page | $400 | 1 página, 1 idioma | segundo idioma +$150 |
| Rediseño de sitio | $500 | hasta 5 páginas, 1 idioma | página extra +$100 · segundo idioma +$200 |
| Sitio a medida completo | $1,500 | hasta 5 páginas, bilingüe | página extra +$150 |
| Asistente básico | $500 | 1 tarea, 1 canal | tarea extra +$200 · canal extra +$250 |
| Asistente completo | $900 | hasta 3 tareas, 2 canales | tarea extra +$200 · canal extra +$250 |
| Tienda esencial | $900 | hasta 25 productos, 1 idioma | cada 25 productos más +$150 · segundo idioma +$300 |
| Tienda a medida | $2,900 | hasta 100 productos, bilingüe | cada 50 productos más +$200 |
| Optimización inicial SEO local | $300 | 1 ubicación | ubicación extra +$150 |
| SEO local continuo | $600/mes | 1 ubicación | ubicación extra +$200/mes |
| Cimientos AEO | $500 | | |
| Monitoreo en IA | $200/mes | | |
| Logo | $150 | | |
| Branding completo | $750 | | |
| Mantenimiento | $120/mes | | |

"Tarea" del asistente = contestar, agendar, cotizar, captar datos… "Canal" = web, WhatsApp, Instagram…

## Reglas generales (propuesta)

1. **Descuento por combinación:** 2 o más proyectos de pago único en la misma cotización = 10 % menos
   sobre esos proyectos. Lo mensual nunca se descuenta.
2. **Rebaja si el cliente insiste:** solo después de ajustar el alcance, hasta un 10 % más, y siempre
   "sujeta a aprobación de un representante" (te llega como contacto para que la confirmes).
3. **Piso:** el pago único nunca baja del 85 % de la suma de los precios base.
4. Totales redondeados a múltiplos de 50.

## Ejemplo

Sitio de 8 páginas + asistente que contesta en la web y en WhatsApp:
sitio $1,500 + 3 páginas × $150 = $1,950 · asistente $500 + 1 canal × $250 = $750 ·
subtotal $2,700 · combinación −$250 · **total $2,450**. Si insiste: **$2,200 sujeto a aprobación.**

## Lo que tiene que decidir el dueño

Cambiar cualquier cifra de las tablas, quitar o añadir extras, y si el descuento por combinación
y la rebaja máxima le parecen bien.
