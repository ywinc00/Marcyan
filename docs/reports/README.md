# Reportes SEO mensuales de Marcyan

Cada fichero `YYYY-MM.md` de esta carpeta es el reporte de ese mes, generado por
`scripts/track-rankings.mjs` y disparado por la rutina `marcyan-monthly-seo-report`
(primer lunes de cada mes, 08:00 local). Es la misma mecánica que ya corre para
Texas Rush & Remove y Move Junk Away, con dos secciones que esos no tienen:
posición de mercado y embudo de conversión con datos propios.

## Cómo se corre a mano

```bash
node --env-file=.env.local scripts/track-rankings.mjs
```

Sin argumentos toma el último mes COMPLETO. Opciones:

| Flag | Para qué |
|---|---|
| `--month YYYY-MM` | Mes concreto. Si es el mes en curso, recorta al último día publicado y marca el reporte como parcial. |
| `--dry-run` | Imprime el reporte por consola, no escribe nada. |
| `--no-db` | Salta la sección de embudo aunque haya base de datos. |
| `--mostrar-ips` | Imprime por consola las IPs detrás de cada origen del embudo. Nunca entran al fichero. |

Un reporte parcial se puede regenerar las veces que haga falta: los CSV hacen
upsert por mes, no append, así que volver a correrlo sustituye las filas de ese
mes en vez de duplicarlas.

## Qué se edita a mano

- **`scripts/tracked-keywords.json`** — las palabras clave objetivo y su tier. El
  script lo lee en cada ejecución. Las rutas de `expectedPath` tienen que existir
  de verdad en el sitemap: una ruta inventada es un bug, no una aspiración.
- **`COHORT_CITY_CHILD` y `COHORT_TOP_LEVEL`** en `scripts/track-rankings.mjs` — al
  publicar un landing nuevo hay que dar de alta su slug, igual que se da de alta su
  par en `src/i18n/routes.ts`. Si se olvida, la URL cae en la cohorte "Sin
  clasificar" y el reporte la lista por nombre. Falla ruidosa a propósito.
- **`MARKET_CONFIG.markets`** en el mismo fichero — al abrir una ciudad nueva.

## Env

Obligatorias (mismo OAuth que MJA y TRR, cuenta con permiso sobre
`sc-domain:marcyanstudio.com`):

```
GSC_OAUTH_CLIENT_ID
GSC_OAUTH_CLIENT_SECRET
GSC_OAUTH_REFRESH_TOKEN
```

Opcionales:

```
POSTGRES_URL / DATABASE_URL     habilitan la sección de embudo
MARCYAN_INTERNAL_IPS            IPs nuestras, separadas por coma, para excluir del embudo
MARCYAN_INTERNAL_SIDS           mrc_sid nuestros, separados por coma
```

Sin base de datos el reporte se genera igual, con la sección de embudo degradada
y una nota que lo dice.

---

## Decisión: datos de competencia

**Estado: NO se compran todavía. Revisar cuando se cumpla la condición de disparo.**

### El hecho técnico

Google Search Console **no expone ningún dato de otros sitios**, y no es una
limitación nuestra, es que el dato no existe en la fuente:

- `searchAnalytics.query` admite las dimensiones `country`, `device`, `page`,
  `query`, `searchAppearance` y `date`/`hour`, y devuelve `clicks`, `impressions`,
  `ctr` y `position` siempre de la propiedad verificada.
- `urlInspection.index.inspect` exige que la URL inspeccionada esté dentro de la
  propiedad verificada. No puede mirar dominios ajenos.
- No hay ninguna otra superficie de la API que devuelva datos de terceros.

Corolario importante: **la posición media tampoco es un recuento de
competidores**. Google la define como la posición más alta que ocupa un enlace
nuestro, promediada, y cada bloque del resultado (mapa local, imágenes, respuesta
de IA, carrusel) ocupa una sola posición. Estar en la 41.9 significa "salimos muy
por debajo de la primera pantalla", no "41 competidores por delante". Presentar lo
segundo sería inventar una métrica.

Por eso la sección del reporte se llama **Posición de mercado** y no
**Competencia**: mide nuestra propia profundidad y cierra con la lista explícita
de lo que no mide.

### Opciones evaluadas (precios de agosto 2026, revalidar antes de contratar)

| Fuente | Coste | Veredicto |
|---|---|---|
| **DataForSEO SERP API** | 0,0006 USD por resultado en cola estándar. Depósito mínimo 50 USD, créditos sin caducidad. Con 25 consultas al mes, unos 0,02 USD al mes. | **La opción elegida cuando toque.** |
| ValueSERP | Desde 0,50 USD por 1.000 en pago por uso. | El proveedor pasó a ScraperAPI en abril de 2026, condiciones en movimiento. |
| Serper.dev | ~1 USD por 1.000 al empezar. | Los créditos prepago **caducan a los 6 meses**. Malo para 25 llamadas al mes. |
| SerpApi | 25 USD al mes por 1.000 búsquedas, sin pago por uso, lo no consumido se pierde. | La más cara por consulta con diferencia. |
| API de Bing | No existe. Microsoft la retiró el 11 de agosto de 2025. | Descartada. El sustituto de Azure devuelve contexto para redactar, no posiciones. |
| Scrapear Google | "Gratis" más horas de mantenimiento. | **No.** Rompe los términos de servicio, se cae cada pocas semanas y ahorra menos de 1 USD al mes frente a DataForSEO. Además es incoherente para una agencia que vende honestidad técnica. |
| Semrush / Ahrefs | 130 a 250 USD al mes por asiento. | Solo tiene sentido si se vende SEO como servicio recurrente y se quiere la herramienta para clientes. No para este informe. |

### Por qué todavía no

En agosto de 2026 el sitio tiene 323 impresiones, 2 clicks y decenas de páginas
indexadas que no reciben ni una impresión. Saber qué agencia ocupa el puesto 12 de
"diseño web miami" no cambia ninguna decisión: el trabajo de este trimestre ya
está fijado por datos que sí tenemos, que son las consultas a tiro de la primera
página y las páginas que están dentro del índice sin competir. Comprar datos de
competencia ahora es comprar una foto que no altera el plan.

### Condición de disparo

Contratar DataForSEO (cola estándar, depósito de 50 USD, unas 25 consultas al mes)
el mes en que se cumpla **cualquiera** de estas dos:

- la posición media del sitio baje de 20, o
- alguna consulta que no sea de marca entre en el top 20 con 50 o más impresiones.

En ese momento la pregunta pasa de "cómo entro" a "a quién tengo que desbancar y
con qué", y ahí sí importa quién ocupa los puestos de arriba.

### Mientras tanto

El teardown cualitativo de los 10 competidores de Houston y Miami que ya existe
sigue siendo la mejor foto del mercado que tenemos. Revalidarlo a mano un par de
horas cada trimestre da más que cualquier API en el estado actual, y cuesta cero.
Este reporte no lo actualiza ni lo sustituye.
