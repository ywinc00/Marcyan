# Ficha de llamada desde Orbit (solo lectura)

Encargo `_cerebro/marcyan-web/encargos/2026-11-15-ficha-llamada-desde-orbit.md` (OK del dueño, 2026-11-15).

Antes de llamar o escribir a un lead, saca en Markdown lo que Orbit sabe de él, para que
las skills de Ventas (`call-prep`, `handle-objection`, `draft-outreach`, `account-research`)
lo usen: datos y notas, historial, conversación con Marcy (qué precio vio, si pidió una
persona y sus últimos intercambios), citas, brief, diagnóstico y, si ya es cliente, sus
proyectos. **Nada de Finanzas** (ni facturas, ni pagos, ni importes), ni la IP ni el
navegador del visitante.

## Uso

```bash
node --env-file=.env.local scripts/ficha-llamada.mjs LEAD-011
node --env-file=.env.local scripts/ficha-llamada.mjs cliente@correo.com
node --env-file=.env.local scripts/ficha-llamada.mjs LEAD-011 --guardar   # copia en .fichas/ (fuera de git)
node --env-file=.env.local scripts/ficha-llamada.mjs --comprobar          # el usuario no escribe ni ve Finanzas
```

La ficha sale por pantalla. Con `--guardar` queda también en `.fichas/LEAD-XXX.md`, carpeta
ignorada por git. Para probar se usa un lead de prueba (LEAD-011 o LEAD-012), nunca uno real.

## Seguridad

- **Usuario propio de solo lectura en Neon** (`orbit_lectura`), creado con
  `db/sql/orbit-lectura.sql`. No es una migración: lo aplica el dueño a mano en el SQL
  Editor de Neon, con su OK, cambiando antes la clave del archivo. Lee solo las columnas
  que la ficha necesita (permisos por columna) y tiene las transacciones en solo lectura.
- **La cadena de conexión** va en `.env.local` como `ORBIT_LECTURA_URL` (nunca en el
  código ni impresa). El script no usa la conexión principal y, si la conexión no es del
  usuario `orbit_lectura`, no lee nada.
- **Comprobado por** `npm run test:ficha-llamada` (sin base: solo SELECT, ninguna tabla de
  Finanzas, ni IP ni importes; `.fichas/` fuera de git) y por `--comprobar` contra Neon
  (la base niega facturas, pagos, gastos, suscripciones, sesiones del panel, importes de
  proyectos, IP de los leads y escribir).
- Aparece en Ajustes > Equipo como acceso de lectura (encargo legal de Orbit §4b).

## Quitarlo

En Neon: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM orbit_lectura; DROP ROLE orbit_lectura;`
y borrar `ORBIT_LECTURA_URL` de `.env.local`.
