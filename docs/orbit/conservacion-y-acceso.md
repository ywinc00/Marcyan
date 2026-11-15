# Orbit · conservación de los libros y quién tiene acceso

Encargo legal de Orbit (`_cerebro/marcyan-web/encargos/2026-11-15-arreglos-legales.md` §4), 2026-11-15.

## 4a · Los libros se guardan 7 años

Facturas, pagos, gastos, suscripciones, devoluciones, ingresos sin factura, cuentas,
proveedores, meses cerrados, pagos de impuestos, millaje e importaciones son los libros
del negocio. Nada de eso se borra solo.

- **Tareas automáticas:** ninguna borra en esas tablas. Las limpiezas que existen
  (`api/cron/brief-cleanup.mjs`) tocan borradores y archivos de briefs, intentos del
  límite de envíos, conversaciones de Marcy, velocidad del sitio, bandeja de canales y
  correos clasificados. `npm run test:finance-retention` lo comprueba: lee cada función
  que importan las tareas automáticas y falla si alguna borra en los libros.
- **Única excepción automática:** el cargo «monto por confirmar» de una suscripción que
  varía es un estimado (no cuenta en los libros) y lo sustituye la factura real al llegar.
- **Borrar un cliente:** se llevaría en cascada sus facturas y cobros. Con facturas
  emitidas o cobros no se puede borrar (la API responde 409 y la ficha no ofrece el
  botón): se archiva. Solo se borra el que no tiene más que borradores.
- **Borrados a mano:** el dueño puede corregir un apunte equivocado (un gasto, un
  borrador). Una factura con pagos no se borra: se anula.

## 4b · Quién tiene acceso

Ajustes > Equipo enseña cada correo con acceso al panel (`ADMIN_ALLOWED_EMAILS`, se
cambia en Vercel) y la fecha de su último acceso (la más reciente de sus sesiones;
«Aún no ha entrado» si no tiene ninguna). Sale de `getTeamAccess()` en `lib/auth.mjs`.
