# Ficha de llamada desde Orbit (solo lectura)

Encargo `_cerebro/marcyan-web/encargos/2026-11-15-ficha-llamada-desde-orbit.md` (OK del dueño, 2026-11-15).

Antes de llamar o escribir a un lead, saca en Markdown lo que Orbit sabe de él, para que
las skills de Ventas (`call-prep`, `handle-objection`, `draft-outreach`, `account-research`)
lo usen: datos y notas, **su etapa y su propuesta** (siguiente paso, opciones con su precio,
la recomendada, la elegida, hasta cuándo vale y los seguimientos de los días 2, 5 y 10;
tanda 2 de Ventas, 7b), historial, conversación con Marcy (qué precio vio, si pidió una
persona y sus últimos intercambios), citas, brief, diagnóstico y, si ya es cliente, sus
proyectos. **Nada de Finanzas** (ni facturas, ni pagos, ni importes de proyectos), ni la
lista interna de precios, ni la IP ni el navegador del visitante. Lo propuesto es venta,
no cobros: sin la cifra no se prepara una llamada.

## Uso

```bash
node --env-file=.env.local scripts/ficha-llamada.mjs LEAD-011
node --env-file=.env.local scripts/ficha-llamada.mjs cliente@correo.com
node --env-file=.env.local scripts/ficha-llamada.mjs LEAD-011 --guardar   # copia en .fichas/ (fuera de git)
node --env-file=.env.local scripts/ficha-llamada.mjs --comprobar          # el usuario no escribe ni ve Finanzas
node --env-file=.env.local scripts/ficha-llamada.mjs --embudo             # lista del embudo en JSON (abajo)
```

La ficha sale por pantalla. Con `--guardar` queda también en `.fichas/LEAD-XXX.md`, carpeta
ignorada por git. Para probar se usa un lead de prueba (LEAD-011 o LEAD-012), nunca uno real.

## Lista del embudo (`--embudo`, Ventas 7d)

Para la rutina semanal de Ventas (`_cerebro/ventas/rutina-semanal.md`): todo el embudo de una
vez, en JSON y con el mismo usuario de solo lectura. Lleva lo justo para decidir a quién toca
escribir. Para escribirle se pide su ficha, por eso no salen correos ni teléfonos. Tampoco hay
nada de Finanzas ni importes.

- `formato`: versión de la forma (`embudo/1`). Si cambia un nombre o un tipo, sube; la rutina
  lo comprueba antes de leer. Añadir un aviso no la cambia.
- `hoy` y todas las fechas de día van en hora de Houston (`zona`). Los instantes van en ISO (UTC).
- `avisos`: lo que el usuario de lectura todavía no puede ver. La lista sale igual.
- `contactos`: los abiertos (nuevo, contactado, diagnóstico hecho, propuesta enviada).
  - Cada uno trae su etapa, desde cuándo (`en_etapa_desde`, `dias_en_etapa`) y su
    `siguiente_paso`, que es el mismo de «Para hoy» en Orbit.
  - Del siguiente paso salen `tipo` (`reply`, `send_proposal`, `follow_up`, `waiting`,
    `expired` o `none`), `plazo` (`late`, `today` o `week`), `vence`, `atrasado` y
    `dias_tarde`.
  - `propuestas` trae sus propuestas abiertas, con la viva primero (`viva: true`): estado,
    envío, caducidad, días que le quedan, seguimientos hechos de 3, el próximo y si falta un
    precio por confirmar.
- `borradores`: todos los que están sin enviar, del más antiguo al más nuevo.
  - Cada uno trae sus horas (`mas_de_24h`), quién lo creó (`orbit`, `marcy` o
    `diagnostic`) y si lleva un precio por confirmar.
  - `de` dice de quién cuelga: un contacto, un cliente o un brief.
  - `en_para_hoy: false` marca los que Orbit no enseña en «Para hoy»: los de un brief o de un
    cliente, y los de un contacto que ya tiene otra propuesta enviada. Esos los avisa la rutina
    y, si son de un brief o un cliente y los hizo Marcy o el Diagnóstico, también un aviso de Orbit
    el mismo día (`docs/orbit/plan-ventas-orbit.md`).
- `cifras`: dos periodos, `semana` (la pasada completa, de lunes a domingo) y `mes` (el mes en
  curso hasta hoy). No cuentan los contactos de prueba ni el spam.
  - `contactos_nuevos`: los que llegaron en el periodo.
  - `diagnosticos_hechos`: contactos que pasaron a «diagnóstico hecho».
  - `diagnosticos_web`: veces que se usó el Diagnóstico de la web.
  - `propuestas_enviadas` y `propuestas_aceptadas`: por la fecha de envío y por la fecha de
    la decisión.

Ejemplo con datos inventados:

```json
{
  "formato": "embudo/1",
  "generado": "2026-11-23T15:00:00.000Z",
  "zona": "America/Chicago",
  "hoy": "2026-11-23",
  "avisos": [],
  "contactos": [
    {
      "ref": "LEAD-901",
      "nombre": "Nombre Ejemplo",
      "negocio": "Negocio Ejemplo",
      "origen": "contact",
      "etapa": "proposal",
      "etapa_texto": "Propuesta enviada",
      "en_etapa_desde": "2026-11-18T15:00:00.000Z",
      "dias_en_etapa": 5,
      "creado": "2026-11-10T15:00:00.000Z",
      "siguiente_paso": {
        "tipo": "follow_up",
        "texto": "Seguimiento del día 5",
        "plazo": "today",
        "vence": "2026-11-23",
        "atrasado": false,
        "dias_tarde": 0
      },
      "propuestas": [
        {
          "ref": "PROP-901",
          "estado": "sent",
          "creada": "2026-11-18T14:00:00.000Z",
          "creada_por": "orbit",
          "enviada": "2026-11-18",
          "caduca": "2026-11-25",
          "dias_para_caducar": 2,
          "seguimientos_hechos": 1,
          "seguimientos_total": 3,
          "proximo_seguimiento": "2026-11-23",
          "opcion": "Plan Ejemplo + Web Ejemplo",
          "opciones": 1,
          "precio_por_confirmar": null,
          "viva": true
        }
      ]
    }
  ],
  "borradores": [
    {
      "ref": "PROP-904",
      "creada": "2026-11-22T10:00:00.000Z",
      "horas": 29,
      "mas_de_24h": true,
      "creada_por": "marcy",
      "opcion": "Plan Ejemplo + Reservas Ejemplo",
      "precio_por_confirmar": "Reservas Ejemplo",
      "de": {
        "tipo": "brief",
        "ref": "MRC-904",
        "nombre": null,
        "negocio": "Negocio del brief"
      },
      "en_para_hoy": false
    }
  ],
  "cifras": {
    "semana": {
      "desde": "2026-11-16",
      "hasta": "2026-11-22",
      "contactos_nuevos": 1,
      "diagnosticos_hechos": 0,
      "diagnosticos_web": 1,
      "propuestas_enviadas": 1,
      "propuestas_aceptadas": 0
    },
    "mes": {
      "desde": "2026-11-01",
      "hasta": "2026-11-23",
      "contactos_nuevos": 1,
      "diagnosticos_hechos": 0,
      "diagnosticos_web": 1,
      "propuestas_enviadas": 1,
      "propuestas_aceptadas": 0
    }
  }
}
```

## Seguridad

- **Usuario propio de solo lectura en Neon** (`orbit_lectura`), creado con
  `db/sql/orbit-lectura.sql`. No es una migración: lo aplica el dueño a mano en el SQL
  Editor de Neon, con su OK, cambiando antes la clave del archivo. Lee solo las columnas
  que la ficha necesita (permisos por columna) y tiene las transacciones en solo lectura.
- **La cadena de conexión** va en `.env.local` como `ORBIT_LECTURA_URL` (nunca en el
  código ni impresa). El script no usa la conexión principal y, si la conexión no es del
  usuario `orbit_lectura`, no lee nada.
- **Propuestas y etapa (migración 029):** el bloque final de `db/sql/orbit-lectura.sql`
  añade, por columnas, la etapa y el motivo de perdido de los leads y las propuestas (sin
  quién las preparó en Orbit ni sus notas internas). Sin ese bloque, la ficha sale igual y
  dice que aún no puede ver las propuestas.
- **A qué brief pertenece cada borrador (migración 032):** una sola columna más, `brief_ref`,
  en el último bloque de `db/sql/orbit-lectura.sql`. Sin ella, la lista del embudo sale igual,
  con los borradores de un brief sin su referencia, y lo dice en `avisos`.
- **Comprobado por** `npm run test:ficha-llamada` (sin base: solo SELECT, ninguna tabla de
  Finanzas, ni IP ni importes; `.fichas/` fuera de git) y por `--comprobar` contra Neon
  (la base niega facturas, pagos, gastos, suscripciones, sesiones del panel, importes de
  proyectos, IP de los leads, la lista interna de precios y escribir; y sí deja leer los
  leads, su etapa y las propuestas).
- Aparece en Ajustes > Equipo como acceso de lectura (encargo legal de Orbit §4b).

## Quitarlo

En Neon: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM orbit_lectura; DROP ROLE orbit_lectura;`
y borrar `ORBIT_LECTURA_URL` de `.env.local`.
