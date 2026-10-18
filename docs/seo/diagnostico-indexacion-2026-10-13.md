# Diagnóstico de la caída de indexación e impresiones · Marcyan Studio · 13-oct-2026

> Encargo del dueño (13-oct): análisis profundo de SEO y AEO de por qué Google sacó tantas páginas del índice y por qué cayeron las impresiones, evaluando todas las causas sin cerrarse en un diagnóstico.
> Método: dos rondas de investigación independiente (10 lentes: cronología y descomposición, técnica, contenido y políticas de spam, forense de nuestros cambios con builds de 5 commits, contexto de Google, autoridad y grupo de control TRR/JLX/MJA, AEO, renderizado y duplicados, capa inglesa con control de variables, revisión adversarial del plan), cada lente revisada por un verificador escéptico, crítica de completitud, cierre de huecos y síntesis. Toda cifra lleva su fuente; las evidencias están en `docs/seo/diagnostico-2026-10-13/`.
> **Estado: diagnóstico entregado; ningún cambio aplicado al sitio.** Las acciones con OK del dueño se deciden el 15-oct (ver §5). Este documento corrige y sustituye la recomendación de ejecución de `triage-indexacion-2026-10-12.md` (la lógica del triage se mantiene; su aplicación pasa a dos fases).

## 1. Respuesta corta

No fue algo que rompimos ni un cambio de los últimos dos meses: el sitio funciona bien, Google no nos ha castigado a mano y entre el 7 y el 24 de septiembre no publicamos nada que Google lea. Pasaron dos cosas. El 10 de septiembre Google dejó de mostrar la página principal de Miami, que daba más de la mitad de nuestras apariciones pero casi todas en las páginas 3 a 6 de Google, así que en clics perdimos poco (10 en agosto, 1 desde el 24 de septiembre) y en clientes nada (0 antes y después). Y desde el 29 de septiembre, durante una actualización de Google contra el spam, Google sacó de su lista 40 de nuestras 84 páginas, mientras los otros tres sitios de la cuenta perdían entre 0 y 2; lo más probable es que no le convenzan tantas páginas de plantilla, sobre todo las de servicios en inglés, en un sitio de seis meses sin reseñas, sin enlaces de nadie y con muy poca búsqueda real. El plan es no tocar nada hasta leer los datos el 15 y el 18 de octubre, pedirle a Google una sola vez que relea 5 páginas y, después, con tu visto bueno y un cambio grande por semana, juntar las páginas que ya están fuera dentro de las que siguen, quitar de los textos lo que no podemos demostrar y conseguir reseñas, enlaces y fichas reales. Esto se recupera en meses, no en semanas: la meta razonable es que deje de caer a primeros de noviembre y volver a tener 8 de cada 10 páginas en Google en enero.

## 2. ¿Hicimos algo hace uno o dos meses?

Tu intuición apunta a algo real, pero no a un cambio de hace uno o dos meses. Revisamos todo lo que hicimos desde mediados de agosto y nada lo explica. Los arreglos de textos del 18 al 20 de agosto vinieron seguidos de una subida (de 70 a 84 páginas en Google). La rutina que pedía a Google mirar páginas (17 de agosto a 21 de septiembre) añadió 14 páginas y 13 siguen dentro; las peticiones no hicieron ni daño ni bien medible. La ficha de Google de Miami (4 de septiembre) no movió nada en los 6 días siguientes. El aviso de idioma (6 de septiembre) Google lo ve unos segundos en las páginas en español, pero esas cayeron menos que las inglesas, que no lo llevan. Entre el 7 y el 24 de septiembre no publicamos ningún cambio, solo datos internos. La página principal de Miami la soltó Google el 10 de septiembre después de releerla él mismo a las 11:07 de la mañana, hora de Houston; nuestra petición llegó 47 minutos después y ni siquiera hizo que la volviera a leer. Lo que sí es nuestro es más viejo y no es un error puntual: la estructura que montamos en junio y julio, con 84 páginas (44 de ciudad y servicio, con textos de plantilla muy parecidos entre Houston y Miami) y un espejo completo en inglés desde el 4 de julio, en un dominio comprado nuevo el 14 de abril, sin reseñas ni enlaces. Google lo aceptó mientras nos daba el beneficio de la duda y desde el 29 de septiembre lo recorta, empezando por las páginas de servicios en inglés. Queda además un resto pequeño de un fallo de direcciones que tuvimos del 6 de junio al 2 de agosto: 4 páginas que Google guarda con la dirección vieja están fuera.

## 3. Causas evaluadas

### Principal (2)

**Google reevalúa el sitio entero y lo recorta a un núcleo (ola de desindexación desde el 29-sep)** · confianza media

Google decide, sobre las copias que ya tenía guardadas, que el sitio no merece tantas páginas y las saca del índice sin releerlas. Selecciona por tipo de página: conserva casi todas las estructurales (portadas, hubs, legales, herramientas) y recorta las de servicio y sector; fuera de las estructurales, estar en el menú protege en español pero no en inglés. Dentro de las landings nada de lo medido explica cuál cae (las gemelas de idioma tienen destinos independientes). Solo le pasa a Marcyan. Es lo que Mueller describe como sitio sano que Google no termina de aceptar (doctrina §7). No requiere ningún cambio nuestro.

- Control 25-sep → 13-oct: Marcyan 78 → 41 indexadas sin barra; MJA 56 → 54; TRR 35 → 33; JLX 12 → 12 (autoridad/serie-control.json, historial.jsonl de cada repo)
- Cobertura real 84 → 44 (41 sin barra + 3 indexadas por su versión con barra). 13-oct: 36 «rastreada, sin indexar» y 7 «alternativa con canónica correcta» (hueco1/serie-cobertura.csv; REN-03 verificado)
- 37 de las 40 salidas sin ningún rastreo posterior al 25-sep, y 38 de las 44 que se quedan tampoco se rastrearon: Google decidió sobre copias guardadas (ING-03 verificado; el dato de rastreo llega con retraso, ver preguntas)
- Por tipo: salen 1 de 14 estructurales, 15 de 22 de sector o ciudad secundaria y 12 de 22 de servicio. No estructurales con menú: salen 2 de 15 en ES y 10 de 15 en EN (ING-01 y ING-02 verificados, r2-verif-capa/resultados.txt)
- Gemelas ES/EN: kappa 0,11 en total y −0,18 en las 22 parejas de landings (ING-04 verificado)
- Técnica sana: 84/84 responden 200, sin noindex, canónicas y hreflang correctos; render limpio con Googlebot móvil y escritorio; sin acción manual (TEC-01/02, REN-01 verificado, Search Console 13-oct)

**El hub /es/miami deja de mostrarse el 10-sep (la mayor parte de la caída de impresiones)** · confianza alta

El hub de Miami concentraba la mayoría de las impresiones del sitio, en posiciones profundas. El 10-sep Google lo rastreó por su cuenta a las 16:07 UTC y dejó de mostrarlo: 8 impresiones ese día, 0 del 11 al 18-sep y un residuo de 1-4 al día desde el 19-sep. Nuestra petición fue a las 16:54 y no provocó rastreo. Parte de sus búsquedas pasaron a /es/miami/diseno-web cuando esta se indexó el 12-sep. Corrección a la ronda 1: no hay un patrón de «cada rastreo orgánico la echa»; en agosto la visibilidad se perdió el 11-ago, antes del rastreo del 15-ago, el rastreo del 23-ago no quitó impresiones y el estado de la herramienta oscila sin rastreos. El porqué del 10-sep sigue sin saberse.

- /es/miami: 19-41 impresiones al día del 19-ago al 9-sep; 8 el 10-sep; 0 del 11 al 18-sep; 1-4 al día desde el 19-sep (r2-verif-render/miami-daily.txt)
- Explica el 56 % de la caída entre la base y la caída y el 69 % entre el pico y la caída; posición media 41,3 (decomp.txt, CRO-02 verificado)
- Rastreo 16:07:24 UTC, lectura de la rutina 16:42, petición 16:54:29; lastCrawlTime sigue en 10-sep 16:07 el 13-oct (REN-06 verificado)
- Relevo de «diseño web miami» por semana: hub 35 → 19 → 0; landing 0 → 3 → 22 → 6 (r2-verif-render/subst.txt)
- 8-sep: unas 66 URL pasan a «rastreada, sin indexar» sin rastreo y vuelven el 9-sep, con /es/miami mostrando 26 y 21 impresiones: el estado de un día no es fiable (REN-07 refutado, exits-hasta-24sep.txt)
- Descartadas como causa la ficha de Miami del 4-sep, el PR #37 y la canibalización (hueco 2, CRO-02)

### Contribuye (6)

**Confianza externa nula en un dominio joven** · confianza media

Google no tiene señales externas con las que respaldar 84 páginas: ni reseñas, ni enlaces, ni apenas búsquedas de marca, y el dominio tiene 6 meses. Es lo que más separa a Marcyan de los controles, pero con tres sitios no se puede separar este factor de la demanda, la plantilla o las peticiones (ING-07 debilitado).

- Reseñas 13-oct: Marcyan 0 y 0; MJA 34; TRR 38 (resenas.json, AUT-04)
- Dominio comprado nuevo el 14-abr-2026 04:13 UTC, sin transferencia, 0 capturas en Wayback de cualquier subdominio; MJA de mar-2025 (REN-05 verificado)
- 0 enlaces externos en Search Console y en Bing. Corrección a la ronda 1: el pie de JLX dice «Web design by Marcyan Studio», sin enlace (AEO-09 verificado)
- Búsquedas de marca: 3, 1 y 1 impresiones en agosto, septiembre y 1-12 oct (gsc-marcyan.json)

**Sitio sobredimensionado para su demanda: mucha superficie de plantilla (arquitectura de junio y julio)** · confianza media · cambio nuestro

84 URLs, 44 de ellas landings de ciudad hechas con la misma plantilla y con pares Houston/Miami muy parecidos, para muy poca búsqueda real. Cuando Google reevalúa, recorta esa superficie. Marcyan está igual o más plantillado que los controles, pero los controles también tienen plantilla y no pierden páginas, así que la plantilla sola no basta: pesa junto con la poca demanda y la poca confianza.

- 23 impresiones en 90 días por página indexada, frente a 276 en MJA y 741 en TRR (ctrl-gsc.json, ING-07 verificado)
- Texto compartido medido igual en los tres sitios: Marcyan 57-60 %, TRR 47-50 %, MJA 42-44 % (r2-verif-capa, ING-06 verificado)
- 16 páginas de servicio en pares Houston/Miami con similitud 0,41-0,68; política de páginas puerta actualizada el 28-ago-2026 (tabla-84, spam-policies)
- En contra: ninguna medida de plantilla o similitud separa las páginas que salieron una vez descontado el tipo de página (ING-05 verificado)

**Capa inglesa: páginas EN de servicio e institucionales** · confianza media · cambio nuestro

El inglés sale más y eso no se explica por rastreo, impresiones, peticiones ni enlaces. El efecto está en las páginas de servicio e institucionales en inglés enlazadas desde el menú y en los clones EN de servicio Houston/Miami; no en las de sector (salen igual en ambos idiomas) ni en las estructurales EN, que siguen todas dentro. TRR, cuya capa espejo es el español, solo perdió 2 páginas de esa capa. El criterio de Google es por URL e idioma, no por el contenido compartido.

- Salen 22 de 39 en EN y 18 de 45 en ES; OR ajustado 2,4-3,2; sin las 14 estructurales 3,15 [1,10-9,03] (ING-02 verificado)
- No estructurales con menú: 10 de 15 fuera en EN frente a 2 de 15 en ES; sin menú no hay diferencia (12 de 17 frente a 15 de 23)
- Clones de servicio Houston/Miami: salen 7 de 8 en EN y 2 de 8 en ES; sector: 5 de 7 en ambos idiomas
- Las 7 estructurales EN siguen dentro (/en, /en/houston, /en/miami, /en/blog, /en/checkup, /en/tools, /en/privacy)
- Corrección a la ronda 1: el «6 de 6 frente a 0 de 6, p=0,002» estaba confundido por peticiones, rastreo e impresiones
- TRR: pierde solo /es/limpieza-de-propiedades-houston y /es/remocion-de-escombros-houston (ING-08 verificado, n=2)

**La base de impresiones era profunda y frágil (el «pico» estaba en las páginas 3-6)** · confianza alta

La caída se mide contra un pico formado casi entero por apariciones en posiciones mayores de 20, sin valor comercial, más dos picos anómalos el 29 y 30-ago. Por eso el gráfico se desploma y los clics y clientes casi no cambian.

- En el pico (19-ago a 9-sep) el 89 % de las impresiones con consulta visible estaba en posición >20 (CRO-03 verificado)
- Clics: 10 en agosto, 6 en septiembre, 1 entre el 24-sep y el 11-oct; último clic el 27-sep; 0 contactos (reporte mensual, windows.txt)
- GA4 orgánico: 19 sesiones en agosto, 12 en septiembre y 8 del 1 al 12-oct, sin filtro interno (ga4-marcyan.json)

**Cambio de medición común a la cuenta (impresiones profundas de escritorio, mediados de septiembre)** · confianza media

Desde mediados de septiembre desaparecen en todos los sitios de la cuenta impresiones de escritorio en posiciones profundas, coherente con el bloqueo de rastreadores de posiciones. Explica solo una parte del tramo profundo de Marcyan.

- Escritorio por semana: MJA 1.352 → 420 y TRR 1.484 → 758, con el móvil plano en MJA (gsc-v.json)
- En Marcyan explica como mucho 85-90 de unas 340 impresiones semanales (EXT-06 verificado)

**Residuo de las canónicas con barra final (defecto del 6-jun al 2-ago)** · confianza media · cambio nuestro

Google sigue evaluando 7 páginas con copias de junio y julio que declaran la dirección vieja con barra. 3 siguen dentro por esa versión y 4 están fuera en sus dos formas. Un rastreo nuevo cambia la etiqueta pero no protege: de las 13 que se volvieron a rastrear, 7 han salido. Peso marginal.

- Fuera en sus dos formas: /es/miami/seo-local (último rastreo 14-jun), /es/blog/ia-que-contesta-llamadas-mensajes-perdidos (6-jul), /es/houston/bienes-raices (7-jul), /es/miami/doral (9-jul) (inspect-adv02.txt, ADV-02 verificado)
- Dentro por la versión con barra: /es/portafolio, /es/sobre-nosotros, /es/herramientas
- 13 de 13 alternativas rastreadas pasaron a la URL sin barra; 7 de ellas fuera hoy (54 %), igual que el resto (ADV-02)

### Sin determinar (6)

**La September 2026 spam update como disparador de la ola de desindexación** · confianza media

La ola neta empieza el 29-sep, dentro de la actualización, y su peor tramo cae en días de impacto. La comunidad habla de páginas plantilladas por ciudad. Pero Google no dijo a qué apuntaba, los controles con plantillas de ciudad pierden 0-2, y siguen saliendo páginas después del fin. La caída de impresiones no la explica: empezó el 10-sep con el hub de Miami y siguió sin cortes. Corrección a la ronda 1: el 20-21 sep no es el arranque de nada; las salidas breves sin rastreo empiezan el 26-ago.

- Actualización del 24-sep 16:15 UTC al 8-oct 08:00 UTC (panel de estado de Google)
- Salidas: 29-sep 1, 30-sep 1, 5-oct 4, 6-oct 10, 7-oct 5, 9-oct 8, 12-oct 6, 13-oct 3 (surv.txt)
- Impresiones semanales de la propiedad (semanas de domingo): 374 → 217 → 199 → 113 → 71 desde la del 30-ago (REN-08 verificado)
- Lectura del índice posible el 15-oct; impresiones completas el 18-oct (ADV-11 verificado)

**Contenido redactado con IA a escala (plantilla con fórmulas repetidas)** · confianza baja · cambio nuestro

Las landings salen de una plantilla redactada con asistencia de IA en tandas, con mucho texto y fórmulas comerciales repetidos. Un clasificador de sitio de Google podría pesarlo, pero no es observable, ninguna medida de contenido separa las páginas que salieron y los controles, con marcas de texto generado, no pierden páginas.

- src/i18n/clusters.ts: 28 de 28 commits coautorizados por Claude; oleadas del 23-jun (941d828, 5167b95) (ING-05 verificado)
- «sin letra pequeña / sin compromiso» 134 veces en 42 de 45 páginas ES; «24 horas» literal 142 veces; «la IA de Google ya lo recomienda» en 22 páginas ES
- Controles: 14,8-16 rayas largas por 1.000 palabras y «not just» en 46 de 47 páginas EN de MJA, sin pérdidas (ING-06 verificado)

**Afirmaciones no verificables en los textos (confianza)** · confianza baja · cambio nuestro

El sitio promete cosas que no muestra. No hay datos que lo liguen a qué páginas cayeron, pero choca con la regla del dueño de no inventar nada y con la guía de contenido útil, que valora la exactitud.

- «Ya posiciona y la IA de Google ya lo recomienda»: 2 cadenas, 44 páginas (content.ts:134 y :362). Respaldo parcial: TRR aparece en el 27-30 % de las respuestas de Gemini de su panel, pero no se muestra en la página (AEO-09 verificado)
- «con enlaces que puedes visitar»: 18 respuestas (9 ES y 9 EN) y el sitio enlaza a 0 clientes (ADV-10 verificado)
- /en/about: «Google's AI already includes our clients in some recommendations»; oferta de 400 en los datos de la portada apuntando a una página de 1.500

**Copias externas del contenido (scrapers)** · confianza baja

No se encontraron copias, pero la búsqueda disponible no indexa ni el propio sitio, así que no sirve para descartarlas. El único dato fiable va en contra: Google no marca ninguna URL como duplicada de otro host.

- Google elige marcyanstudio.com como canónica en 84 de 84 URL y ninguna figura como duplicada de otro host (estado-urls.json, REN-03/04)

**Consecuencia en IA: la desindexación hundió la visibilidad en asistentes** · confianza baja

No se observa: las páginas que salieron no se citaban antes y la única citada en el set sigue indexada. Con 30 respuestas por lectura y el modelo sin fijar no se puede descartar ni afirmar nada.

- De 38 páginas salidas desde el 26-sep solo /es/miami/ecommerce se ha citado, hoy y ya fuera del índice (AEO-02 debilitado)
- Gemini 0/30, 5/30, 4/30; p≈0,05-0,11 (AEO-01 verificado)

**Volatilidad no confirmada de septiembre** · confianza baja

Algunos escalones por página coinciden con días de volatilidad reportados, sin actualización confirmada. No verificable.

- Search Engine Roundtable: volatilidad 4-13 sep, 15-sep y hacia el 23-sep; nada del 20-21 sep (REN-09 verificado)
- /es/houston/talleres-mecanicos a 0 desde el 15-sep (gone.txt)

### Descartada (17)

**Peticiones de indexación (rutina del 17-ago al 21-sep): inflaron el índice, sus rescates no duraron o pedir rastreo hace daño** · confianza media · cambio nuestro

La rutina no infló el índice ni lo dañó. A igual frescura de rastreo, pedir no muestra ventaja ni perjuicio. El relevo de búsquedas en Miami es secuela de la pérdida del hub, no de la petición. Corrige a la ronda 1, que la tenía como causa que contribuye con confianza alta.

- Línea base 17-ago: 70 de 84 (53 + 17 con barra); la rutina añadió 14 páginas y 13 siguen (hueco 1)
- Rescates desde «rastreada, sin indexar» con petición: 11 URL, 6 siguen dentro (corrige «4 de 5 volvieron a caer») (r2-verif-plan/rescue.txt)
- Rastreadas en septiembre: salen 3 de 13 pedidas y 4 de 15 no pedidas; la ventaja bruta (21 % frente a 60 %) viene del rastreo reciente, no de la petición (r2-verif-plan/a01.txt)
- En la ola, de 6 indexadas que Google volvió a rastrear salió de forma duradera 1; de 70 sin rastreo, 35 (ADV-01 verificado)

**Enlazado interno débil y rastreo viejo como selectores propios** · confianza media · cambio nuestro

Los enlaces entrantes y la antigüedad del rastreo se asocian a la salida en bruto, pero son indicadores del tipo de página. Controlado el tipo, los enlaces dentro del texto y los días sin rastreo no tienen efecto detectable. Corrige a la ronda 1.

- Enlaces en el cuerpo con el menú controlado: OR 1,03 [0,58-1,81] (ING-01 verificado)
- Días de rastreo: OR 1,08-1,12 por cada 10 días, no significativo; impresiones previas 0,88-0,96 (ING-03 verificado)
- Salieron con 40-70 días sin rastreo, lejos de la regla de 130; TRR conserva 12 páginas con más de 60 días (EXT-D4, AUT-10)

**Pista de idioma «Prefer English?» (PR #37) contamina el texto que ve Google** · confianza alta · cambio nuestro

Google probablemente ve 2 palabras en inglés durante unos segundos en las páginas en español con espejo. Pero esas páginas cayeron menos que las inglesas, que no la muestran.

- Visible de 2 a 7 s con navigator.language en-US, en Googlebot móvil y escritorio; nunca en páginas EN (REN-02 verificado)
- 25-sep → 13-oct: EN sin pista pierden 22 de 39; ES con pista 12 de 34 (lang.mjs)

**Cambios de código de septiembre y octubre (PR #37, BingSiteAuth.xml, enlaces legales, despliegues diarios de datos)** · confianza alta · cambio nuestro

No cambian nada indexable. Entre el 6-sep 12:00 UTC y el 24-sep solo hubo commits de datos.

- 17 commits «auto(seo)» del 6 al 24-sep, todos solo en data/; último cambio de código a2d7c90 (6-sep 00:56 UTC) (REN-09 verificado)
- Diff 0c9ae95..f1c5778: 0 cambios en title, H1, canonical, hreflang, robots, JSON-LD y texto salvo 4 enlaces legales (CAM-01)

**PR #30 «calidad total» y PR #31 (18-20 ago)** · confianza media · cambio nuestro

Cambio de contenido moderado seguido de subida del índice y de impresiones. No se excluye del todo un efecto de sitio con retraso.

- Vistas con el PR #30: salen 24 de 40 (60 %); nunca vistas: 7 de 11 (64 %) (CAM-04)
- Copia anterior al PR #30 en el modelo ajustado: OR 1,64 [0,48-5,63] (ING-03)

**Corrección de canónicas del 2-ago, CSS inline del 4-ago y logo en los datos estructurados** · confianza alta · cambio nuestro

La corrección arregló un defecto; el HTML más pesado sigue muy por debajo del límite; el logo no altera tipos.

- Alternativas con barra: de 17 a 5 entre el 17-ago y el 27-sep (CAM-02)
- HTML mediano de 210 KB, igual en indexadas y no indexadas (TEC-06)

**Defecto técnico de indexabilidad o de renderizado** · confianza alta

Todas las señales son correctas en vivo y en el build. El render con Googlebot no tiene errores y el JS no oculta contenido.

- 84/84 con 200, 0 noindex, sitemap sin errores (TEC-01/02)
- Render propio con Googlebot móvil y escritorio: 0 errores de consola, 0 respuestas 4xx/5xx; sin JS hay más texto, no menos; mismo HTML para cualquier agente e idioma (REN-01 verificado). No es el renderizador real de Google

**Copia duplicada en marcyan.vercel.app u otros alias, o el subdominio reports** · confianza alta

El alias sirve el sitio idéntico pero declara la canónica del dominio y Google elige siempre el dominio. Los demás alias exigen inicio de sesión y llevan noindex. reports es una pantalla de acceso con noindex.

- md5 idéntico en 7 rutas; canonical a marcyanstudio.com; googleCanonical en el dominio 84/84 (REN-03 verificado)
- reports.marcyanstudio.com: 307 a /sign-in con noindex, nofollow (REN-10 verificado)

**Dominio caducado reutilizado o historial previo** · confianza alta

Se compró nuevo el 14-abr-2026 y no hay rastro de vida anterior.

- RDAP y Vercel coinciden al segundo (04:13:24 UTC), registrar «new»; Wayback 0 capturas mientras TRR sí devuelve (REN-05 verificado)

**La ficha de Google de Miami (creada el 4-sep)** · confianza alta · cambio nuestro

Sin efecto medible en los 6 días siguientes; el control de Houston muestra que una ficha no traspasa búsquedas a la página que enlaza.

- /es/miami: 25,4 impresiones al día antes frente a 23,3 después (hueco 2)
- Ficha operativa, 0 reseñas, fuera del top 20 en 5 búsquedas de categoría (places-rank.json)

**Acción manual, seguridad o retiradas** · confianza alta

No existe ninguna; la caída es gradual y selectiva.

- Search Console 13-oct: ninguna en 6 meses

**Fallo de Search Console o de la herramienta de inspección** · confianza alta

La ola de octubre es sostenida y cuadra con el informe de páginas. El estado de un día suelto sí es poco fiable (8-sep), por eso se exigen dos lecturas.

- Informe de páginas del 8-oct: 52 indexadas, coherente con la API (58 el 7-oct, 50 el 9-oct)
- 8-sep: los 4 sitios leen 0 y unas 66 URL de Marcyan oscilan sin rastreo (EXT-D2, REN-07)

**Otras actualizaciones de Google (August 2026 spam update, actualización principal)** · confianza alta

Tras la de agosto el índice y las impresiones subieron; no hubo principal confirmada después de mayo.

- August spam update 18-ago a 21-ago; después la cobertura pasó de 70 a 84 (CRO-12)

**Contenido fino, relleno de palabras clave, marcado engañoso o traducción automática** · confianza alta

Las que salieron son más largas; no hay reseñas propias en los datos estructurados; el inglés es traducción curada.

- Mediana de palabras: 1.354 en las que salieron frente a 1.177 (CC-09)
- 0 aggregateRating y 0 Review (CC-07)

**Caída de la demanda del mercado, de país o de marca** · confianza media

La demanda del sector se mantiene y la caída es de búsquedas sin marca.

- «web design» en Bing EE.UU. +48 % (palabras.json); EE.UU. explica el 75 % de la caída (CRO-07)

**Lectores de IA o Bing no pueden leer el sitio, o Bing también desindexó** · confianza alta

10 agentes reciben 200 y el mismo HTML; robots.txt los permite. Bing conoce 82 de 84 URL y su índice sube.

- bots.json: 10 agentes × 10 páginas, mismo hash (AEO-07 verificado)
- Bing: índice 68 → 71 (1-7 oct), 0 bloqueos (AEO-06 verificado)

**GA4 (11-ago) y alta en el departamento SEO (25-sep)** · confianza alta · cambio nuestro

No tocan nada indexable.

- El alta (6bb0937) solo toca configuración y datos (CRO-14)

## 4. AEO (asistentes de IA)

En los asistentes de inteligencia artificial casi no aparecemos, y la caída en Google todavía no lo ha empeorado. En Gemini, el asistente de Google, con 10 preguntas fijas repetidas 3 veces, salimos en 0 de 30 respuestas el 26 de septiembre, en 5 el 6 de octubre y en 4 hoy, siempre a través de la página de Houston en inglés y solo en las preguntas de diseño web bilingüe; en 7 preguntas reales de clientes salimos 0 de 14 veces, y cuando le preguntan por Marcyan por su nombre nos describe bien. Ninguna de las páginas que Google soltó se citaba antes, así que por ahora no hemos perdido nada ahí, pero si Google suelta la página de Houston en inglés desaparecemos de esas respuestas; por eso esa página y otras cinco quedan protegidas en el plan. Lo que hace que un asistente te cite es que tu propia página sea la que Google o Bing muestran para esa pregunta, y hoy casi ninguna nuestra lo consigue; Bing conoce casi todo el sitio y no lo ha soltado, pero apenas lo muestra (3 apariciones en dos semanas) y tiene registrado un mapa del sitio que no existe, cosa que se arregla en minutos. ChatGPT y Perplexity no se pudieron medir porque no hay claves contratadas, y eso lo decides tú.

## 5. Decisiones del dueño

| Decisión | Recomendación | Cuándo |
|---|---|---|
| Triage en dos fases: aprobar la Fase A (7 fusiones de páginas que ya están fuera, con destino indexado) y aplazar las 9 páginas que Google conserva, sin tocar ahora las herramientas. | Sí. Aplicar el triage entero quitaría 9 páginas que Google conserva y mandaría dos fusiones a destinos que están fuera del índice. | 15-oct-2026 |
| Ampliación opcional de la capa en inglés: añadir a la Fase A /en/houston/katy, /real-estate, /auto-repair y /local-seo (las 4 fuera, con 1-4 apariciones en 90 días). | Sí, en una segunda tanda de /en/houston una semana después de la primera. No podar el inglés en bloque: las 7 páginas estructurales en inglés siguen dentro. | 15-oct-2026 |
| Un único cambio de metas del trimestre, con su motivo (la meta de 80 de 84 se fijó sobre un contador que mezclaba etiquetas y antes de la ola). | Cobertura sobre un conjunto fijo de URL vivas: que deje de caer el 4-nov (2 lecturas semanales iguales o mejores), 60 % el 4-dic y 80 % en enero. Reseñas: 3 en Houston al 31-dic más 1 por cada trabajo nuevo. Miami: «ficha completa y vigilada» en lugar de «visible en Maps». | 15-oct-2026 |
| Destinatarios de las reseñas y confirmación de que son clientes independientes. | TRR, JLX y Rosy Nails en la ficha de Houston, una persona por cliente, desde su cuenta, sin texto sugerido ni regalo. MJA solo fuera de Google o como testimonio con permiso. Miami, ninguna hasta tener cliente allí. | 16-oct-2026 (vence la petición del 26-sep) |
| Quién hace las 5 peticiones del 16-17 oct, ya que el 13-oct la interfaz de Search Console quedó bloqueada por permisos. | Dar permiso puntual a la sesión o hacerlas tú (unos 5 minutos), antes de las 09:05. | 15-oct-2026 |
| Alcance del arreglo de honestidad, y qué hacer con «la IA de Google ya lo recomienda» en la tarjeta de TRR (TRR sí aparece en el 27-30 % de las respuestas de Gemini de su panel, pero la página no lo demuestra). | Borrado mínimo en un solo cambio: quitar la cláusula y «con enlaces que puedes visitar» sin poner frases nuevas comunes. Si quieres conservar el logro de TRR, mostrarlo una sola vez con prueba fechada en su caso del portafolio. | Antes del 31-oct-2026 |
| Arreglar el mapa del sitio en Bing y activar IndexNow solo con cambios de contenido. | Sí. Es configuración de cuenta, cuesta minutos y Bing alimenta a ChatGPT y Copilot. | 19 a 30-oct-2026 |
| Método y fecha del filtro de tráfico interno de GA4. | Probarlo primero en modo prueba con una marca en tu dispositivo y activarlo después, con la fecha anotada. No es urgente. | 19 a 30-oct-2026 |
| Cerrar la ficha de Miami con la socia (horario, fotos, servicios) y enviar una captura del panel. | Sí, un campo cada vez. | Antes del 4-nov-2026 |
| Pedir a JLX que su crédito «Web design by Marcyan Studio» lleve enlace, y a TRR y MJA que añadan uno; altas en Bing Places, Apple, Yelp y 2 perfiles de agencia. | Sí, con permiso de cada cliente y nombre y teléfono idénticos en todo. | Noviembre-2026 |
| Redirigir el alias marcyan.vercel.app al dominio. | Sí, prioridad baja, cualquier semana tras el 30-oct. | Noviembre-2026 |
| PR #36 (anclas) y enlaces contextuales, sobre el render. | Aprobar tras ver el render, en su propia semana de diciembre, sabiendo que en estos datos no muestran efecto. | Diciembre-2026 |
| Pagar las claves para medir ChatGPT y Perplexity. | Todavía no: con 3 apariciones en Bing en dos semanas la lectura daría casi seguro 0. Revisarlo en enero. | Enero-2027 |
| Fase B (9 páginas conservadas, incluidas las herramientas de captación), capa en inglés y, si no mejora, replantear la arquitectura. | Decidir con los datos de noviembre y diciembre, no antes. | 4-dic-2026 y enero-2027 |

## 6. Plan

| # | Fase | Cuándo | Acción | Palanca | Métrica | Riesgo | OK del dueño |
|---|---|---|---|---|---|---|---|
| 1 | Ya | 13 a 15-oct-2026 | Congelar: no publicar cambios en el sitio, no pedir indexación y no tocar el kit compartido hasta las lecturas del 15-oct (índice) y del 18-oct (impresiones). | §4 (esperar una semana tras la actualización) y §7 | Contador diario y cobertura sin intervenciones nuestras | Ninguno. | no |
| 2 | Ya | 13 a 15-oct-2026 | Corregir la lista de peticiones pendientes en CAMBIOS.md: quitar /es/sobre-nosotros (está dentro por su versión con barra), mantener /es/miami/seo-local, /es/blog/ia-que-contesta-llamadas-mensajes-perdidos, /es/houston/bienes-raices y /es/miami/doral, añadir /es/houston y pasar la fecha al 16-17 oct. No pedir /es/portafolio, /es/herramientas, /en/blog ni /es/diagnostico. | §7 (una petición por página con cambio real que Google no ha visto) | Lista corregida y anotada | Ninguno. | no |
| 3 | Ya | 13 a 15-oct-2026 | Escribir en el plan y en el triage que /en/houston, /en, /en/pricing, /en/miami, /es y /es/portafolio no se retiran ni se fusionan. | §3 (la IA de Google solo cita páginas indexadas) | Las 6 siguen indexadas en cada lectura | Ninguno. | no |
| 4 | Ya | Vence el 16-oct-2026 | Reseñas: no repetir la petición (pedida el 26-sep). Corregir los destinatarios: TRR, JLX y Rosy Nails en la ficha de Houston, una persona por cliente, desde su propia cuenta, escrita por ellos, sin texto sugerido ni regalo. MJA no va en Houston ni en Miami. En Miami, ninguna hasta tener un cliente allí. | §2.3 Reseñas con ritmo | Reseñas en la ficha de Houston (hoy 0) | Reseñas desde cuentas o dispositivos que gestione Marcyan, o de alguien con relación societaria, violan la política de Google. Confirmar que son clientes independientes. | sí |
| 5 | Tras el 15-oct | 15-oct (índice) y 18-oct (impresiones) | Leer la actualización con el control al lado: contador y cobertura de Marcyan frente a TRR y JLX el 15-oct; impresiones de la semana 8-15 oct frente a la anterior al 24-sep el 18-oct. MJA no es control limpio (52 peticiones desde el 25-sep). | §1 El reloj y §4 Medición | Variación de Marcyan frente a TRR y JLX | Exigir dos lecturas seguidas antes de concluir: el estado de un día oscila. | no |
| 6 | Tras el 15-oct | 16 o 17-oct-2026, antes de las 09:05 | Una sola petición de indexación para /es/miami/seo-local, /es/blog/ia-que-contesta-llamadas-mensajes-perdidos, /es/houston/bienes-raices, /es/miami/doral y /es/houston. Seguir a diario estado, canónica y fecha de rastreo hasta el 30-oct. Se trata como señal, no como experimento: no hay un grupo de control comparable. | §7 (una petición por página con cambio real) | A los 14 días: rastreadas sí o no, canónica sin barra, dentro o fuera | El cupo es por cuenta y día y lo gastan las rutinas de TRR y MJA a las 09:05. El 13-oct la interfaz quedó bloqueada por permisos: hace falta una sesión con permiso o que lo haga Yan. /es/miami/seo-local se reescribirá después; una segunda petición tras reescribirla es legítima. | no |
| 7 | Tras el 15-oct | 19 a 30-oct-2026 | Arreglos del kit que solo añaden, con el contador viejo en paralelo 2 semanas y probados en TRR, MJA y JLX: cobertura que inspecciona la versión con barra de las alternativas; dos lecturas seguidas antes de reaccionar a una caída; búsqueda de lugares que incluya negocios sin dirección; ficha de Miami en la vigilancia; panel de Gemini con el modelo fijado y guardando el texto. Neutralizar la cola automática de peticiones: excluir del cambio detectado el menú, el pie, las tarjetas compartidas y el aviso de idioma, o bajar el tope mientras dure el plan. Excluir de la medición los eventos de las pruebas de render del 13-oct (20:25-20:45). | §4 Medición y §7 | Serie de cobertura diaria publicada; cola automática vacía tras un cambio de texto de prueba | Son scripts compartidos por los 4 sitios: no romper las series de los controles. | no |
| 8 | Tras el 15-oct | 19 a 30-oct-2026 | Bing Webmaster: registrar /sitemap-index.xml y quitar el /sitemap.xml muerto. Activar IndexNow atado solo a los despliegues que cambian contenido, no a los diarios de datos. | §2.7 Salud técnica, §3 (ChatGPT y Copilot usan Bing) y §7 (IndexNow para Bing) | Mapa del sitio en «Success» en Bing; índice de Bing y apariciones | Cambio de configuración de cuenta. Efecto esperado pequeño: Bing ya descubre 82 de 84 URL. | sí |
| 9 | Tras el 15-oct | 19 a 30-oct-2026 | Filtro de tráfico interno de GA4: comprobarlo en modo prueba, preferir una marca guardada en el dispositivo del dueño frente a la IP y activarlo en una fecha anotada. | §4 Medición | Visitas propias marcadas en la prueba; fecha de activación en CAMBIOS.md | Una vez activo, lo excluido no se recupera. La IP del dueño cambia. | sí |
| 10 | Tras el 15-oct | Antes del 4-nov-2026 | Cerrar la ficha de Miami con la socia: horario coherente con el sitio, fotos de marca y servicios, un campo cada vez, y una captura del panel para revisarla. | §2.1 Ficha de Google | Ficha completa y vigilada a diario | Cambiar varios campos a la vez puede pedir una nueva verificación. | sí |
| 11 | Tras el 15-oct | 30-oct-2026 | Revisar la señal de las 5 peticiones y anotar el resultado en CAMBIOS.md antes de cualquier cambio de sitio. | §4 Medición | Estado de las 5 URL a 14 días | Con 5 páginas solo es una señal. | no |
| 12 | 4-8 semanas | 31-oct a 6-nov-2026 (un solo cambio, su propio día) | Arreglo de honestidad como borrado mínimo, tras neutralizar la cola: quitar la cláusula «y la IA de Google ya lo recomienda» de la tarjeta de TRR (2 cadenas, 44 páginas) sin poner una frase nueva común; quitar «con enlaces que puedes visitar» de las 18 respuestas; revisar la frase de /en/about y «Ya posiciona en su zona» de MJA; corregir la oferta de 400 de los datos de la portada; decir a qué nivel corresponden los precios de los pies del blog. Sin guiones como conector. | Regla del dueño «nada inventado» y §2.4 | 0 afirmaciones sin respaldo en el build; entrada en CAMBIOS.md «sin efecto esperado en indexación» | Si se publica sin neutralizar la cola, lanza unas 41 peticiones automáticas. Los enlaces a webs de clientes van aparte, con permiso, design-director y OK sobre el render. | sí |
| 13 | 4-8 semanas | 4-nov-2026 | Reporte mensual con las métricas nuevas: cobertura sobre un conjunto fijo de URL, clics, impresiones en posiciones 1-20, páginas con impresiones, control al lado, Gemini y Bing. Fuera la posición media y las impresiones totales. | §4 Medición | Las del bloque de medición | Ninguno. | no |
| 14 | 4-8 semanas | 7 a 13-nov-2026 | Higiene técnica invisible y lastmod veraz en una misma publicación: logo y migas a /es y /en sin barra (158 enlaces que redirigen), Organization.url a /es, y lastmod en el sitemap tomado de la fecha del último cambio del contenido principal de cada página (sin menú, pie, tarjetas ni aviso de idioma). | §2.7 (higiene) y §7 (sitemap con lastmod veraz) | 0 enlaces internos a redirecciones; lastmod presente; mediana de días sin rastreo a los 14 días | Un lastmod tomado del build cambiaría a diario (cada commit de datos despliega) y Google lo ignoraría. | no |
| 15 | 4-8 semanas | Cualquier semana tras el 30-oct | Redirigir marcyan.vercel.app al dominio. | §2.7 Salud técnica | El alias responde con redirección | Cambio de configuración del despliegue. | sí |
| 16 | 4-8 semanas | 14-nov a 4-dic-2026, un hub por semana | Fase A del triage, solo con páginas que ya están fuera: semana 1, /en/houston/conversational-ai, /dental-clinics, /ecommerce e /immigration-lawyers a /en/houston; semana 2, /en/miami/ecommerce a /en/miami y /es/precios/cuanto-cuesta-seo-local-houston a /es/houston/seo-local; semana 3, /en/pricing/local-seo-cost-houston directamente a su destino final (/en/pricing, o /en/houston si se aprueba la ampliación) y, si se aprueba, la ampliación EN (katy, real-estate, auto-repair, local-seo) en una segunda tanda de /en/houston. Cada fusión con una sección breve y útil, redirección permanente, sin hreflang del par y una petición por destino cambiado. | §7 (menos páginas y más fuertes) y §5 prueba 7 | Cobertura sobre el conjunto fijo; los destinos siguen indexados 7 días después de cada tanda | /en/houston es la página que cita Gemini: revisar a los 7 días antes de la siguiente tanda. Nunca fusionar hacia /en/houston/local-seo (está fuera y es candidata: cadena de redirecciones). | sí |
| 17 | 4-8 semanas | 21-nov a 18-dic-2026, una por semana | Las 4 diferenciaciones con ficha previa y prueba real, sin cifras ni casos inventados: /es/houston/talleres-mecanicos reenfocada a «página web para talleres en Houston»; /en/miami/conversational-ai; /en/houston/beauty-salons con Houston en título y H1; /es/miami/seo-local con contenido propio de SEO local en Miami (segunda petición tras publicarla). | §5 pruebas 1, 2 y 5 | Indexación y apariciones a las 4 semanas de publicar cada una | Cambio de texto visible; sin prueba local real se convierten en otro clon. Si toca diseño, design-director y OK sobre el render. | sí |
| 18 | 4-8 semanas | Noviembre a diciembre-2026 | Señales externas reales: Bing Places con las 2 ubicaciones, Apple Business Connect, Yelp, 2 perfiles de agencia (Clutch, DesignRush o The Manifest) y la cámara de comercio hispana de Houston. Con permiso de cada cliente, convertir en enlace el crédito del pie de JLX y añadirlo en las webs de TRR y MJA. | §2.5 Directorios núcleo, §2.6 Menciones y enlaces reales y §3 | Enlaces externos en Search Console y Bing; directorios activos | Nada de directorios de relleno ni enlaces comprados. Nombre y teléfono idénticos en todos. | sí |
| 19 | 4-8 semanas | 7 a 20-dic-2026 (su propia semana) | Enlaces contextuales dentro del texto hacia las páginas que se mantienen y revisión del PR #36 con OK sobre el render. | §7 (enlaces internos contextuales) | Páginas mantenidas con enlaces en el cuerpo desde páginas rastreadas | Anclas forzadas o repetidas suman más plantilla. | sí |
| 20 | 4-8 semanas | 4-dic-2026 | Reporte mensual y decisión sobre la Fase B, la capa en inglés y las herramientas de captación con los datos de noviembre. | §4 Medición y §11 | Cobertura sobre el conjunto fijo frente a la meta del 4-dic | Ninguno. | sí |
| 21 | 3 meses | Enero-2027 (revisión trimestral) | Fase B, solo si hay 2 lecturas semanales seguidas sin caída: las 9 páginas que Google hoy conserva (/en/checkup, /en/tools, /en/cities, /es/diagnostico, /es/herramientas, /en/miami/hialeah, /en/miami/local-seo, /es/houston/sugar-land, /es/precios/cuanto-cuesta-un-chatbot). /es/houston/sugar-land no se fusiona mientras /es/houston siga fuera. | §5 prueba 7 | Cobertura estable 4 semanas antes de aplicarla | Quita páginas, incluidas herramientas de captación. | sí |
| 22 | 3 meses | Enero-2027 | Revisión de la prueba 7: las de «mantener» con 5 apariciones o menos pasan a fusión. Ninguna página nueva de ciudad, sector o idioma hasta que la cobertura se estabilice. | §5 prueba 7 y §2.2 | Apariciones por página en 90 días | Quita páginas. | sí |
| 23 | 3 meses | Diciembre-2026 a enero-2027 | Confianza propia: una persona real en «sobre nosotros» y como autora del blog, y casos de estudio reales con permiso de cada cliente. | §2.4 y §5 prueba 2 | Páginas con autoría y casos con enlace verificable | Cambio visible y de diseño: design-director y OK sobre el render. | sí |
| 24 | 3 meses | Enero-2027 | Si la cobertura no llega al 80 % de las URL vivas con todo lo anterior, replantear la arquitectura con el tope de la doctrina: un núcleo de servicios y pocas páginas de ciudad con prueba. | §2.2 y §7 | Cobertura y clics frente a las metas | Es la decisión más drástica; solo con 3 meses de datos. | sí |
| 25 | 3 meses | Mensual desde noviembre; decisión de gasto en enero-2027 | Medición de IA: panel de Gemini (10 preguntas × 3) con el modelo fijado y el texto guardado; informe de IA de Search Console y AI Performance de Bing leídos a mano; decidir si se pagan las claves para medir ChatGPT y Perplexity. | §3 (cómo se mide) | % de apariciones en Gemini sostenido en 3 lecturas | Gasto de las claves (decide el dueño). | sí |

## 7. Lo que no se hace

- No publicar cambios, pedir indexación ni tocar el kit antes de las lecturas del 15-oct (índice) y del 18-oct (impresiones), salvo cambios del kit que solo añadan y mantengan el contador viejo.
- No pedir indexación en bloque ni a diario (doctrina §6 y §7). No porque haga daño, que los datos no lo muestran, sino porque no sirve. Una sola petición por página con un cambio real.
- No pedir /es/portafolio, /es/sobre-nosotros, /es/herramientas, /en/blog ni /es/diagnostico: ya están dentro.
- No publicar ningún cambio de texto visible sin neutralizar antes la cola automática de la vigilancia: lanzaría unas 41 peticiones en 6 días con el cupo que comparten TRR y MJA.
- No aplicar el triage entero ni de golpe: no retirar las 9 páginas que Google conserva antes de que la cobertura se estabilice, no fusionar hacia destinos fuera del índice y no crear cadenas de redirección.
- No retirar ni fusionar /en/houston, /en, /en/pricing, /en/miami, /es ni /es/portafolio: son las únicas que cita la IA.
- No podar el inglés en bloque ni decidir las landings de sector por idioma: salen igual en los dos.
- No juntar en la misma semana dos cambios que afecten a todo el sitio (textos, lastmod, enlaces); los cambios por página pueden ir en paralelo si son páginas distintas, como mucho un hub por semana.
- No sustituir la frase quitada por otra frase común a las 44 páginas: sería más plantilla.
- No inventar casos, cifras, reseñas ni enlaces; no pedir reseñas con incentivo, solo a los satisfechos, desde cuentas que gestione Marcyan, ni poner la de MJA en Houston o Miami.
- No poner un lastmod atado al build o a los despliegues diarios de datos, ni cambiar fechas para parecer fresco.
- No crear páginas nuevas de ciudad, sector o idioma hasta que la cobertura se estabilice.
- No revertir el PR #30, el PR #37 ni la corrección del 2-ago, ni quitar la pista de idioma por motivos de SEO: están descartados.
- No presentar los enlaces internos en el cuerpo como remedio demostrado: en estos datos no muestran efecto.
- No vender ni perseguir humo: llms.txt como palanca, «posición en ChatGPT», datos estructurados como interruptor, listas «los mejores» autopromocionales (aunque Gemini las cite), directorios de relleno, enlaces comprados o servicios de indexación.
- No medir la recuperación con la posición media ni con las impresiones totales, ni sacar conclusiones del estado de inspección de un solo día (el 8-sep oscilaron unas 66 URL).
- No comparar lecturas de Gemini como tendencia con 30 respuestas y el modelo sin fijar.
- No usar MJA como control limpio: pidió 52 indexaciones desde el 25-sep.
- No contar en la medición de la pista de idioma los eventos de las pruebas de render del 13-oct (20:25-20:45).
- No activar el filtro de GA4 sin probarlo: lo excluido no se recupera.
- No tomar decisiones drásticas (eliminar todo el inglés, rediseñar o cambiar de dominio) por el desplome de impresiones: más de la mitad era una sola página en las páginas 3 a 6 de Google.

## 8. El triage del 12-oct

El triage del 12-oct acierta en la lógica (menos páginas y más fuertes, prueba 7) y en sus 48 veredictos como dirección, pero no debe aplicarse entero ni de golpe. Se decide el 15-oct con estos cambios.

Hechos que corregir en el documento: la ola empezó el 29-sep, dentro de la actualización, con su peor tramo del 5 al 7-oct, y siguió el 9, 12 y 13-oct; no fue «el día siguiente al fin». La cobertura real es 44 (41 sin barra más /es/herramientas, /es/portafolio y /es/sobre-nosotros por su versión con barra); /es/miami/seo-local, /es/miami/doral, /es/houston/bienes-raices y /es/blog/ia-que-contesta-llamadas-mensajes-perdidos están fuera en sus dos formas. La línea base del 17-ago es 70 de 84, no 53. /es/miami/diseno-web volvió sola el 7-oct.

Fase A (tras el 30-oct, un hub por semana, con OK): solo páginas que ya están fuera y tienen destino indexado. /en/houston/conversational-ai, /dental-clinics, /ecommerce e /immigration-lawyers a /en/houston; /en/miami/ecommerce a /en/miami; /es/precios/cuanto-cuesta-seo-local-houston a /es/houston/seo-local; /en/pricing/local-seo-cost-houston directamente a su destino final (/en/pricing, o /en/houston si se aprueba la ampliación), nunca a /en/houston/local-seo, que está fuera y es candidata a fusión. Cobertura: 44 de 77 en lugar de 35 de 68.

Fase B (enero, o antes si hay 2 lecturas semanales sin caída): las 9 que Google conserva (/en/checkup, /en/tools, /en/cities, /es/diagnostico, /es/herramientas, /en/miami/hialeah, /en/miami/local-seo, /es/houston/sugar-land, /es/precios/cuanto-cuesta-un-chatbot). Las herramientas no se tocan ahora. /es/houston/sugar-land no se fusiona mientras /es/houston siga fuera.

Protección: /en/houston, /en, /en/pricing, /en/miami, /es y /es/portafolio no se retiran ni fusionan; son las únicas que cita Gemini.

Inglés: la evidencia ajustada sitúa la desventaja del inglés en las páginas de servicio e institucionales del menú (10 de 15 fuera frente a 2 de 15 en español) y en los clones de servicio Houston/Miami (7 de 8 fuera frente a 2 de 8); las de sector salen igual en los dos idiomas (5 de 7), así que esas se deciden por demanda. La ampliación opcional (katy, real-estate, auto-repair y local-seo en inglés, las 4 fuera) puede entrar en la Fase A como segunda tanda de /en/houston. No se poda el inglés en bloque.

Diferenciaciones (4): se mantienen, una por semana, con ficha previa y sin promesas no verificables; /es/miami/seo-local recibe una petición el 16-17 oct y otra tras reescribirla.

Ejecución de cada fusión: sección breve y útil (no texto de plantilla copiado), redirección permanente a esa sección, se quita el hreflang del par, una petición por destino cambiado, y antes de publicar se neutraliza la cola automática.

Meta: la de «60 de 68 a las 4 semanas» no cuadra con las otras tres metas vigentes. Se sustituye por un único cambio de meta del trimestre: cobertura sobre un conjunto fijo de URL vivas, que deje de caer el 4-nov, 60 % el 4-dic y 80 % en enero.

## 9. Medición

| Métrica | Hoy | Meta | Fecha |
|---|---|---|---|
| Cobertura sobre un conjunto fijo de URL vivas (sin barra indexada, o alternativa cuya versión con barra está indexada) | 44 de 84 (52 %) el 13-oct; 70 de 84 el 17-ago; techo de 84 del 27-ago al 27-sep | Deja de caer (2 lecturas semanales seguidas iguales o mejores); 60 %; 80 % (nivel del 17-ago) | 4-nov-2026; 4-dic-2026; enero-2027 |
| Contador de indexadas sin barra (inspección de Google) | 41 (13-oct) | Sin nuevas salidas en 2 lecturas seguidas | Lecturas del 15-oct y semanales |
| Variación frente al control limpio (TRR y JLX) | 25-sep → 13-oct: Marcyan −47 % (78 → 41), TRR −6 % (35 → 33), JLX 0 % (12 → 12) | Marcyan estable mientras los controles lo estén | 15-oct, 18-oct y 4-nov-2026 |
| Señal de las 5 peticiones (/es/miami/seo-local, /es/blog/ia-que-contesta-llamadas-mensajes-perdidos, /es/houston/bienes-raices, /es/miami/doral, /es/houston) | Las 5 fuera; 4 con copias de junio y julio, /es/houston con copia del 2-ago | Anotar si se rastrearon, si la canónica pasó a sin barra y si entraron (señal, no meta de éxito) | 30-oct-2026 |
| Clics de Google al mes | 10 en agosto, 6 en septiembre; 1 entre el 24-sep y el 11-oct | ≥10 al mes | Enero-2027 (control el 4-dic) |
| Impresiones al día en posiciones 1-20 | 0,5 al día (29-sep a 11-oct) | ≥2,3 al día; ≥3,6 al día | 4-dic-2026; enero-2027 |
| Páginas con impresiones por semana | 19 (semana del 5-oct); 44 en la del 24-ago | ≥26 (nivel de la semana del 7-sep) | 4-dic-2026 |
| Visibilidad de Miami (/es/miami + /es/miami/diseno-web) | 8 impresiones del 1 al 12-oct, con ambas indexadas | ≥5 impresiones al día entre las dos | Enero-2027 |
| Mediana de días desde el último rastreo (señal de salud, no selector) | 49 días (MJA 10); 12 de 84 rastreadas en 30 días | ≤30 días | 4-dic-2026 |
| Reseñas reales en las fichas de Google | Houston 0, Miami 0 | 3 en Houston más 1 por cada trabajo nuevo; Miami tras el primer cliente de allí | 31-dic-2026 |
| Enlaces externos reales | 0 (JLX menciona a Marcyan sin enlace) | ≥3 (créditos de clientes con permiso, cámara, perfiles de agencia) | Enero-2027 |
| Directorios activos | 2 fichas de Google (Houston y Miami) | Más Bing Places (2), Apple, Yelp y 2 perfiles de agencia | 4-dic-2026 |
| Bing | Mapa del sitio registrado con 404; 71 páginas en su índice; 3 impresiones y 0 clics desde el 30-sep | Mapa en «Success»; impresiones vigiladas en el reporte mensual | 31-oct-2026 (mapa); mensual |
| Apariciones en Gemini (10 preguntas × 3, modelo fijado, texto guardado) | 4 de 30 (13 %), 3 de 30 nombrando a Marcyan; 0 de 14 en preguntas de cliente; 4 de 4 en preguntas de marca | ≥17 % sostenido en 3 lecturas y al menos una pregunta distinta de las bilingües | Enero-2027 |
| Páginas citadas por la IA que siguen indexadas | 6 de 6 (/en/houston, /en, /en/pricing, /en/miami, /es, /es/portafolio por su versión con barra) | 6 de 6 en cada lectura | Semanal |
| Sesiones orgánicas en GA4 con el filtro interno activo | 8 del 1 al 12-oct, sin filtro (cota superior) | Línea base limpia desde la activación | 4-dic-2026 |
| Contactos reales que llegan desde Google | 0 en agosto, septiembre y octubre | ≥1 | Enero-2027 |

## 10. Cronología

| Fecha | Evento | Tipo |
|---|---|---|
| 24-mar-2026 | Se crea el proyecto en Vercel con el alias marcyan.vercel.app. | otro |
| 14-abr-2026 | Se compra nuevo el dominio marcyanstudio.com (sin historial previo; 6 meses hoy). | otro |
| 6-jun a 2-ago-2026 | Canonical, hreflang y sitemap apuntan a direcciones con barra final que redirigen (defecto). | nuestro cambio |
| 14-jun-2026 | Bing descubre las primeras páginas /es. | indexacion |
| 23-jun-2026 | Oleadas de landings de industria y de barrios, redactadas con asistencia de IA (941d828, 5167b95). | nuestro cambio |
| 24 a 26-jun-2026 | June 2026 spam update. | Google |
| 29-jun-2026 | Rediseño Space-Tech de secciones y landings. | nuestro cambio |
| 4-jul-2026 | Bilingüe total: 25 landings EN y hubs EN; el sitio llega a 84 URLs. | nuestro cambio |
| 1-ago-2026 | Primer día con datos en Search Console. Ficha de Google de Houston enlazando /es/houston/diseno-web. | otro |
| 2-ago-2026 | Canónicas sin barra (1021681), 8 peticiones manuales y logo en los datos estructurados. | nuestro cambio |
| 4-ago-2026 | CSS inline, llms.txt e imágenes responsive. | nuestro cambio |
| 11-ago-2026 | Se instala GA4. /es/miami pasa a 0 impresiones del 11 al 17-ago, antes del rastreo del 15-ago. | trafico |
| 17-ago-2026 | Primera foto de la rutina: cobertura 70 de 84 (53 sin barra + 17 con barra). | indexacion |
| 17-ago a 21-sep-2026 | Rutina de peticiones: 32 peticiones sobre 24 URL; añade 14 páginas (13 siguen). | nuestro cambio |
| 18 a 21-ago-2026 | August 2026 spam update, sin efecto negativo visible. | Google |
| 19/20-ago-2026 | Despliegue del PR #30 «calidad total» y del PR #31. | nuestro cambio |
| 26-ago-2026 | Primera salida breve sin rastreo nuevo (/es/miami), revertida con petición; siguen otras breves el 29-ago, 30-ago, 1-sep, 3-sep y 7-sep. | indexacion |
| 27-ago-2026 | Cobertura 84 de 84 (techo), estable hasta el 27-sep. | indexacion |
| 28-ago-2026 | Google actualiza su política de spam (páginas puerta y contenido a escala). | Google |
| 31-ago a 6-sep-2026 | Semana de máximo: 342 impresiones (212 de /es/miami). 4-sep: máximo de la media de 7 días (54,7 al día) y ficha de Google de Miami creada. | trafico |
| 6-sep-2026 00:56 UTC | PR #37 (pista de idioma) en producción: último cambio de código hasta el 25-sep. | nuestro cambio |
| 8-sep-2026 | Fallo de Search Console (0 indexadas en los 4 sitios) y oscilación de unas 66 URL de Marcyan sin rastreo; 7 peticiones sobre esa lectura falsa. | Google |
| 10-sep-2026 | Google rastrea /es/miami por su cuenta (16:07 UTC) y deja de mostrarla: 8 impresiones ese día y 0 del 11 al 18-sep. Nuestra petición (16:54) no provoca rastreo. | trafico |
| 12-sep-2026 | /es/miami/diseno-web se indexa tras la petición del 11-sep y recoge parte de las búsquedas que el hub perdió. | indexacion |
| 13 a 17-sep-2026 | Bloqueo de rastreadores de posiciones; los controles pierden impresiones profundas de escritorio. | Google |
| 15-sep-2026 | /es/houston/talleres-mecanicos pasa a 0 impresiones. | trafico |
| 21-sep-2026 | Última petición de la rutina. (Corrección: el 20-21 sep no es un arranque; la caída de impresiones es continua desde la semana del 31-ago.) | nuestro cambio |
| 24-sep-2026 16:15 UTC | Empieza la September 2026 spam update. | Google |
| 25/26-sep-2026 | Alta en el departamento SEO; verificación en Bing; Bing registra /sitemap.xml, que da 404. Primera lectura de Gemini (0 de 30). Se pide al dueño gestionar reseñas. | nuestro cambio |
| 26/27-sep-2026 | Máximo del contador: 79 indexadas sin barra. | indexacion |
| 29-sep-2026 | Empieza la ola neta de desindexación. | indexacion |
| 5 a 7-oct-2026 | Peor tramo: 72 → 62 → 58. /es/miami/diseno-web vuelve sola el 7-oct. 6-oct: Gemini 5 de 30; metas del trimestre fijadas. | indexacion |
| 8-oct-2026 08:00 UTC | Fin de la spam update. Informe de páginas: 52 indexadas. | Google |
| 9-oct-2026 | 50 indexadas; sale el hub /es/houston. | indexacion |
| 12-oct-2026 | 44 indexadas; triage de 48 páginas; enlaces legales corregidos; cupo de peticiones agotado a las 16:30. | indexacion |
| 13-oct-2026 | 41 indexadas sin barra (cobertura real 44). Gemini 4 de 30. Peticiones bloqueadas por permisos. Pruebas de render de 20:25 a 20:45 que pudieron registrar eventos falsos. | indexacion |
| 15-oct-2026 | Lectura del índice tras la actualización y decisiones del dueño. | otro |
| 18-oct-2026 | Lectura de impresiones de la semana posterior al fin de la actualización. | otro |

## 11. Cifras clave

| Cifra | Valor | Fuente |
|---|---|---|
| Contador de indexadas sin barra | 79 el 26/27-sep → 41 el 13-oct | URL Inspection API, data/seo/historial.jsonl |
| Cobertura real | 70 de 84 el 17-ago; techo de 84 del 27-ago al 27-sep; 44 de 84 el 13-oct (40 perdidas) | diag/hueco1/serie-cobertura.csv y cobertura.txt; inspección de variantes del 13-oct |
| Estado del 13-oct | 41 indexadas, 36 «rastreada, sin indexar», 7 alternativas (3 dentro por la barra, 4 fuera en sus dos formas) | estado-urls.json (REN-03 y ADV-02 verificados) |
| Control 25-sep → 13-oct | Marcyan 78 → 41; MJA 56 → 54; TRR 35 → 33; JLX 12 → 12 | diag/autoridad/serie-control.json |
| Salidas sin rastreo nuevo | 37 de 40 sin rastreo posterior al 25-sep; 38 de 44 de las que se quedan tampoco se rastrearon | ING-03 verificado (estado-urls.json, lastCrawlTime) |
| Salida por tipo de página | Estructurales 1 de 14; sector y secundaria 15 de 22; servicio 12 de 22 | r2-capa-ingles-escala/tabla-84 (ING-01 verificado) |
| Efecto del inglés | Salen 22 de 39 EN frente a 18 de 45 ES; OR ajustado 2,4-3,2; sin estructurales 3,15 [1,10-9,03]; servicios e institucionales del menú 10 de 15 EN frente a 2 de 15 ES; clones de servicio 7 de 8 EN frente a 2 de 8 ES | ING-02 verificado (r2-verif-capa/resultados.txt) |
| Independencia de las gemelas ES/EN | Kappa 0,11 en total; −0,18 en las 22 parejas de landings | ING-04 verificado |
| Enlaces en el cuerpo | OR 1,03 [0,58-1,81] con el menú controlado | ING-01 verificado (links.json, lr.mjs) |
| Plantilla frente a controles | Texto compartido en landings: Marcyan 57-60 %, TRR 47-50 %, MJA 42-44 %; 28 de 28 commits de clusters.ts coautorizados por Claude | ING-05 e ING-06 verificados |
| Demanda por página indexada (90 días) | Marcyan 23, MJA 276, TRR 741 impresiones | r2-capa-ingles-escala/ctrl-gsc.json (ING-07 verificado) |
| Confianza externa | 0 reseñas (MJA 34, TRR 38); 0 enlaces externos; dominio comprado nuevo el 14-abr-2026, 0 capturas en Wayback; JLX menciona a Marcyan sin enlace | AUT-04, REN-05 y AEO-09 verificados |
| Impresiones semanales (semanas de lunes) | 320 (24-ago), 342, 210, 184, 115, 54, 46 (5-oct) | cronologia/gsc-daily.json (CAM-07) |
| Peso de /es/miami en la caída de impresiones | 56 % (base frente a caída) y 69 % (pico frente a caída); posición media 41,3 | decomp.txt (CRO-02 verificado) |
| /es/miami tras el 10-sep | 8 impresiones el 10-sep; 0 del 11 al 18-sep; 1-4 al día desde el 19-sep | r2-verif-render/miami-daily.txt |
| Secuencia del 10-sep | Rastreo de Google 16:07:24 UTC; lectura de la rutina 16:42; petición 16:54:29 sin rastreo posterior | indexing-status.json en f68bbe8 y f62769f (REN-06 verificado) |
| Relevo de «diseño web miami» por semana | Hub 35 → 19 → 0; landing 0 → 3 → 22 → 6 | r2-verif-render/subst.txt |
| Profundidad del pico | 89 % de las impresiones con consulta visible en posición >20 (19-ago a 9-sep) | CRO-03 verificado |
| Clics y contactos | 10 en agosto, 6 en septiembre, 1 entre el 24-sep y el 11-oct (último el 27-sep); 0 contactos | Reporte mensual SEO y windows.txt |
| Tráfico orgánico en GA4 | 19 sesiones en agosto, 12 en septiembre, 8 del 1 al 12-oct (sin filtro interno) | GA4 549587864 (ga4-marcyan.json) |
| Peticiones de indexación | 32 sobre 24 URL (18-ago a 21-sep); +14 páginas, 13 siguen; rescates 11, 6 siguen dentro | Hueco 1 y r2-verif-plan/rescue.txt |
| Peticiones a igual frescura de rastreo | Rastreadas en septiembre: salen 3 de 13 pedidas y 4 de 15 no pedidas | r2-verif-plan/a01.txt (ADV-01 verificado) |
| Rastreos frescos durante la ola | De 6 indexadas rastreadas, 1 salida duradera; de 70 sin rastreo, salen 35 | ADV-01 verificado |
| Cola automática de peticiones | Unas 41 de las 44 páginas con la tarjeta de TRR entrarían si cambia su texto; tope de 8 al día, unos 6 días | kit/lib/vigilancia.mjs:321-342 y r2-verif-plan/cola.mjs (ADV-03 verificado) |
| Triage completo frente a Fase A | 9 de las 16 URL a quitar están hoy cubiertas; triage completo 44/84 → 35/68; solo Fase A 44/77 | r2-adversarial-plan/triage-state.txt (ADV-04 verificado) |
| Salidas por fecha | 29-sep 1, 30-sep 1, 5-oct 4, 6-oct 10, 7-oct 5, 9-oct 8, 12-oct 6, 13-oct 3 | surv.txt y fallen.json (ronda 1) |
| Ventana de la September 2026 spam update | 24-sep 16:15 UTC a 8-oct 08:00 UTC | Panel de estado de Google |
| Gemini (set fijo de 10 preguntas × 3) | 0 de 30 (26-sep), 5 de 30 (6-oct), 4 de 30 (13-oct); 0 de 14 en preguntas de cliente; 4 de 4 en preguntas de marca; competidores 0 % | data/seo/ia/*.json y r2-aeo/panel-hoy.json (AEO-01 verificado) |
| Bing | 82 de 84 URL conocidas; índice 68 → 71; 3 impresiones y 0 clics desde el 30-sep; único mapa del sitio registrado /sitemap.xml con 404 | r2-aeo/bing-raw.json (AEO-06 verificado) |
| Contenido citable fuera del índice | 22 de 40 URL (55 %), con el 27-28 % de las impresiones del grupo | r2-aeo/citable.json (AEO-08 verificado) |
| Render con Googlebot | 0 errores en móvil y escritorio; «Prefer English?» visible de 2 a 7 s en páginas ES; ES con pista pierden 12 de 34 frente a EN 22 de 39 | r2-render/render.json y r2-verif-render/myrender2-sum.txt (REN-01/02 verificados) |
| Afirmaciones no verificables | Tarjeta de TRR: 2 cadenas en 44 páginas; «con enlaces que puedes visitar» en 18 respuestas; 1 frase en /en/about | content.ts:134 y :362, about.astro:43 (ADV-10 verificado) |
| Retraso de Search Console | El 13-oct, datos finales hasta el 11-oct y provisionales hasta el 12-oct | ADV-11 verificado |
| Ruido de medición del 13-oct | 48 cargas de prueba con 40 envíos a GA abortados y unos 8 eventos falsos de pista de idioma (20:25-20:45 hora local) | REN-11 verificado |

## 12. Preguntas abiertas

- ¿Por qué dejó Google de mostrar el hub /es/miami el 10-sep? El patrón de «cada rastreo la echa» quedó refutado y la ficha, el PR #37 y la canibalización están descartados.
- ¿Fue la September 2026 spam update el disparador de la ola o coincidió con una reevaluación ordinaria? Lectura del índice el 15-oct y de impresiones el 18-oct, con TRR y JLX al lado.
- ¿Ha terminado la caída del índice? El 13-oct seguían saliendo páginas.
- ¿Qué separa a Marcyan de los controles: la demanda, la confianza, la plantilla o las peticiones continuas de MJA? Con tres sitios no es identificable.
- ¿Por qué, dentro de las landings, unas salen y otras no? Nada de lo medido lo explica y las gemelas de idioma tienen destinos independientes.
- ¿Qué ve el renderizador real de Google? Solo la prueba en vivo de la interfaz lo muestra; el render propio está limpio.
- ¿Cuánto retrasa el dato de último rastreo? Falta cruzar las 40 salidas con los ejemplos de las estadísticas de rastreo (solo en la interfaz).
- ¿Tuvo Google URL de marcyan.vercel.app en su índice entre el 24-mar y el 6-jun, cuando el sitio no tenía canónica?
- ¿Hay copias externas del contenido? No se puede comprobar sin buscar frases exactas en Google.
- ¿Cuál es la visibilidad en ChatGPT, Perplexity, Copilot, AI Overviews y AI Mode? Sin medir (claves vacías, sin navegador).
- ¿Por qué citó Gemini /es/miami/ecommerce estando fuera del índice?
- ¿Quién registró /sitemap.xml en Bing el 26-sep y usa Bing la línea del mapa de robots.txt?
- ¿Existen fichas de Marcyan en Yelp, Bing Places, Apple o perfiles de agencia?
- ¿Qué causó la pérdida común de impresiones profundas de escritorio a mediados de septiembre?
- ¿Qué configuró la socia en la ficha de Miami y hubo alguna suspensión temporal en septiembre?
- ¿Tienen TRR, JLX o Rosy Nails alguna relación personal o societaria con el dueño (conflicto en reseñas)?
- ¿Quita la exclusión de tráfico interno los eventos de las pruebas de render del 13-oct al guardarlos o solo en los informes?
- ¿Cuál es la fuente primaria de las cifras 46 % y 76 % atribuidas a «Google · BrightLocal, 2025» en 16 páginas?
- Hueco de la crítica 1 (línea base de 53 y pico inflado): cerrado en la ronda 1; la base real era 70 de 84 y la rutina añadió 14 páginas.
- Hueco 2 (ficha de Miami): cerrado; existe, está operativa y queda descartada como causa; corregidas las métricas a 2 fichas.
- Hueco 3 (sin AEO): cerrado en parte; medidos Gemini, Bing y los lectores de IA; siguen sin medir ChatGPT, Perplexity, AI Overviews, AI Mode y los informes de IA de las consolas.
- Hueco 4 (retirar herramientas y metas contradictorias): cerrado; triage en dos fases, herramientas sin tocar y un único cambio de metas.
- Hueco 5 (pedir rastreo puede empeorar): cerrado; los datos no muestran daño, la lista se corrige y queda como señal de 5 páginas sin control válido.
- Hueco 6 (capa inglesa confundida): cerrado; el efecto ajustado se sostiene en el límite y se concentra en servicios EN del menú y clones Houston/Miami.
- Hueco 7 (contenido con IA a escala): evaluado; el sitio está más plantillado que los controles, pero no separa páginas y a nivel de sitio queda sin determinar.
- Hueco 8 (retraso del rastreo y render de Google): render cerrado con renderizador propio; el cruce con las estadísticas de rastreo sigue abierto.
- Hueco 9 (contradicción del 10-sep): cerrado; Google rastreó primero y nuestra petición no provocó rastreo.
- Hueco 10 (afirmaciones de la síntesis): corregidas; las de sector se explican por tipo de página, la cifra de −91 % se retira por estar dominada por /es/miami y el residuo de la barra baja a confianza media.
- Hueco 11 (reseñas y política): cerrado; destinatarios TRR, JLX y Rosy Nails, sin MJA en Houston o Miami.
- Hueco 12 (arranque del 20-21 sep): cerrado; no es un arranque, la caída de impresiones es continua desde la semana del 31-ago.
- Hueco 13 (historial del dominio y copias): dominio y alias cerrados; las copias externas y la indexación histórica del alias siguen abiertas.

## 13. Evidencias

- `diagnostico-2026-10-13/sintesis-final.json`: la síntesis definitiva completa (esta página sale de ella).
- `diagnostico-2026-10-13/series.json`: series de los gráficos (indexación diaria con cobertura, impresiones por semana con la parte de /es/miami y posiciones 1-20, control antes y después) y su fuente.
- `diagnostico-2026-10-13/serie-cobertura.csv`: contador y cobertura diarios del 17-ago al 13-oct (URL Inspection, historial git de `data/indexing-status.json` y `data/seo/estado-urls.json`).
- `diagnostico-2026-10-13/expediente-ronda1.json` y `expediente-ronda2.json`: hallazgos de cada lente con evidencia, evidencia en contra y veredicto del verificador. Las rutas `diag/...` que citan eran carpetas temporales de la sesión: las cifras están en los propios hallazgos.
- Nota de medición: las pruebas de renderizado del 13-oct (20:25 a 20:45, hora de Houston) cargaron páginas con un navegador automatizado; excluir esos eventos de GA4 y de la tabla propia de eventos al medir la pista de idioma.

## 14. Lectura posterior a la actualización (18-oct) y ajuste del calendario

> El dueño aprobó el 18-oct todas las decisiones de §5 y el plan de §6. Lectura sin ruido (la actualización terminó el 8-oct); datos en `diagnostico-2026-10-13/lectura-18oct.md` y `ajuste-18oct.json`. Revisada por tres lentes independientes (doctrina y medición, riesgo de empeorar, velocidad de recuperación) y sintetizada.

**Conclusión.** La caída sigue y solo afecta a Marcyan. Entre el 13 y el 18-oct la cobertura bajó de 44 a 37 de 84 y el contador de 41 a 35, mientras los controles no se movieron (TRR 33 a 33, JLX 12/13 a 13, MJA 54 a 54). El ritmo baja de 2,5 a 1,4 páginas al día, pero no se para. El mecanismo es el mismo: 7 de las 8 salidas se decidieron sobre copias de julio a septiembre, y entre el 13 y el 18 no cambió el contenido de ninguna página, así que no lo provoca nada nuestro. La actualización de spam terminó hace 10 días y las salidas siguen, lo que refuerza la causa principal: Google reevalúa el sitio entero. En apariciones casi no cuesta nada: las 8 páginas que salieron sumaban unas 8 de 88 del 8 al 16-oct, y el sitio sigue en 8,9 al día con 0 clics y 0 contactos, igual que antes. Hay tres hechos nuevos que obligan a ajustar el plan. (1) /en/houston, la única vía por la que nos citaba Gemini (4 de 30), salió el 18-oct tras una relectura propia de Google el 17-oct. Eso bloquea la tanda 1 de la Fase A y la ampliación inglesa, porque la regla aprobada prohíbe fusionar hacia destinos fuera del índice. (2) Toda la familia de diseño web de Houston está fuera en los dos idiomas, incluida /es/houston/diseno-web, que es el enlace de la ficha de Houston. (3) El dato del diagnóstico de que releer protege («de 6 indexadas releídas salió 1») ya no se sostiene. De las 9 que estaban dentro el 27-sep y Google volvió a leer, 4 están fuera (/en/houston, /en/houston/beauty-salons, /en/miami/conversational-ai y /es/houston/abogados-inmigracion). Entre las 70 sin relectura salieron 39. Releer ni protege ni daña de forma demostrable. Las peticiones no salieron el 16-17 oct porque el cupo compartido se agotó el 18-oct a las 10:35, y pasan al 19-oct. Con todo esto, adelantar cambios en el sitio no aporta nada medible y rompería las lecturas del 2-nov y del 4-nov. Lo que sí admite adelanto es lo que no toca el sitio.

**Decisión: adelantar partes.** Lo que toca el sitio mantiene sus ventanas; se adelanta lo que no lo toca.

| # | Cuándo | Acción | OK del dueño | Por qué |
|---|---|---|---|---|
| 1 | Lunes 19-oct, 07:45. Si da 'Quota Exceeded', un único reintento el martes 20-oct antes de las 09:05 | Lanzar la tarea única de 4 peticiones de indexación: /es/miami/seo-local, /es/houston/bienes-raices, /es/miami/doral y /es/houston. No añadir ninguna URL más: ni /en/houston, ni /es/houston/diseno-web, ni las 7 salidas del 13 al 18-oct. Si falla también el 20-oct, se dan por no hechas y no se insiste. | no (ya aprobado o interno) | Ya aprobadas (plan #6). Se movieron de fecha porque el cupo compartido se agotó el 18-oct. La doctrina pide una petición por página con un cambio real; una página 'rastreada, sin indexar' no se reenvía y pedir a diario es humo (§6, §7). |
| 2 | 19 y 20-oct, en la vigilancia de las 09:05 | Segunda y tercera lectura del índice antes de mover nada: confirmar las 8 salidas y que /en/houston sigue fuera, y anotarlo en CAMBIOS.md. No leer como recuperación el repunte del 13 al 16-oct (13, 10, 13 y 10 apariciones), que viene de un solo artículo. | no (ya aprobado o interno) | La del 18-oct es una lectura sola tras 3 días sin vigilancia, y el 8-sep oscilaron unas 66 URL en un día. El plan exige dos lecturas seguidas antes de reaccionar. |
| 3 | Cada mañana del 19-oct al 4-nov | Garantizar que corren la tarea de las 07:45 y la vigilancia de las 09:05: o la máquina encendida a esas horas, o la lectura movida a un sitio que no dependa de ella. | sí | Del 15 al 17-oct no hubo lecturas porque la máquina estuvo apagada. La confirmación de /en/houston, la señal de las peticiones y la meta del 4-nov, que pide dos lecturas semanales, dependen de esas lecturas. Mover la lectura a otro sitio es un cambio de configuración, y lo decide el dueño. |
| 4 | 19 a 21-oct, como primera prioridad del dueño esta semana | Recordatorio de una línea al dueño: pedir las reseñas para la ficha de Houston a TRR, JLX y Rosy Nails. Una persona por cliente, desde su propia cuenta, escrita por ellos, sin texto sugerido ni regalo. MJA no va ni en Houston ni en Miami. | no (ya aprobado o interno) | Aprobado el 18-oct; vencía el 16-oct. Es la palanca con evidencia fuerte (§2.3) y la única que acorta el camino a contactos sin esperar a que Google relea el sitio: Houston tiene 0 reseñas frente a 95, 103 y 117 de la competencia. La doctrina §11 permite un recordatorio de una línea cuando la fecha ha vencido. |
| 5 | 19-oct, con la actualización del plan | Actualizar PLAN.md y el diagnóstico con lo siguiente. Fechas nuevas: señal de las peticiones el 2-nov, honestidad el 3-nov, higiene el 10-nov. Nuevo orden de la Fase A, marcado como propuesto hasta el OK. Corregir el dato de la relectura: de las 9 indexadas el 27-sep que Google volvió a leer hay 4 fuera, y de las 70 sin relectura, 39; releer ni protege ni daña de forma demostrable. Anotar que /es/houston/diseno-web no se fusiona en la revisión de enero sin decidir antes a qué página apunta la ficha de Houston. | no (ya aprobado o interno) | Así ninguna rutina ni sesión usa peticiones para 'asegurar' las páginas protegidas. Y la regla de enero (5 apariciones o menos en 90 días pasan a fusión) mandaría a fusión la página que enlaza la ficha. |
| 6 | 19 a 23-oct, antes que el resto del paquete del kit | Neutralizar la cola automática de peticiones: excluir del cambio detectado el menú, el pie, las tarjetas compartidas y el aviso de idioma, o bajar el tope mientras dure el plan. Probarlo con un cambio simulado en local en los 4 sitios, nunca publicando un texto de prueba, y mantener en paralelo el contador viejo. | no (ya aprobado o interno) | Ya aprobado (plan #7). Es requisito del arreglo de honestidad, de las fusiones y de los créditos en las webs de los clientes. Sin él, un cambio de texto común lanza unas 41 peticiones con el cupo que se comparte con TRR, JLX y MJA. Si el 30-oct no está probado, la honestidad pasa al 10-nov y todo lo siguiente se corre una semana. |
| 7 | 19 a 30-oct | Resto de los arreglos del kit, que solo añaden: cobertura que inspecciona la versión con barra; dos lecturas seguidas antes de reaccionar; búsqueda de negocios sin dirección; ficha de Miami en la vigilancia; panel de Gemini con el modelo fijado y el texto guardado; y excluir de la medición los eventos de las pruebas de render del 13-oct. | no (ya aprobado o interno) | Sin cambios respecto a lo aprobado. No romper las series de TRR y JLX antes de la lectura del 4-nov. |
| 8 | 19 a 30-oct | Activar IndexNow atado solo a los despliegues que cambian contenido (el mapa del sitio de Bing quedó arreglado el 18-oct). Probar el filtro de tráfico interno de GA4 en modo prueba con una marca en el dispositivo del dueño, y activarlo en una fecha anotada. | sí | Ya aprobados (plan #8 y #9), pero son configuración de cuentas. Lo que el filtro excluye no se recupera. |
| 9 | 22 a 30-oct, en cuanto el panel tenga el modelo fijado, y otra vez el miércoles 4-nov | Pasar el panel de Gemini (10 preguntas × 3) y leerlo pregunta por pregunta, como sí o no. Anotar si sigue citando /en/houston, si pasa a citar /en u otra página, o si nos perdió. | no (ya aprobado o interno) | /en/houston era la única vía de citación y salió el 17-oct. La doctrina dice que la IA de Google solo cita páginas indexadas, pero Gemini citó /es/miami/ecommerce estando fuera, así que hay que medirlo. El resultado alimenta la decisión del 4-dic sobre /en/houston. |
| 10 | 22 a 31-oct, después de pedir las reseñas | Bing Places con las 2 ubicaciones y Apple Business Connect, adelantados desde noviembre. Las altas las hace el dueño. Nombre y teléfono idénticos en todas, y la dirección de Miami sigue oculta. | sí | No tocan el sitio, así que no pueden empeorar el índice ni romper ninguna lectura. Atacan lo que más nos separa de los controles: confianza externa nula. Con /en/houston fuera, son la vía de visibilidad en los asistentes que no depende del índice (ChatGPT usa Bing y Yelp, §3). La evidencia es media (§2.5) y una inconsistencia de nombre o teléfono sí haría daño. |
| 11 | Lunes 26-oct, y cada lunes hasta diciembre | Lectura semanal con el control al lado. Junto al contador de TRR y JLX, anotar cuántas peticiones hizo cada uno esa semana y la fecha en que el arreglo de la cola entró en cada sitio. | no (ya aprobado o interno) | El 18-oct las vigilancias de TRR y JLX también pidieron indexación, y el arreglo de la cola cambia cómo piden los controles. Sin anotarlo, la comparación de la meta del 4-nov deja de ser limpia. |
| 12 | Antes del 4-nov | Cerrar la ficha de Miami con la socia (horario, fotos, servicios), un campo cada vez, con una captura del panel. | sí | Sin cambios respecto a lo aprobado (plan #10). Toca una ficha. |
| 13 | Lunes 2-nov (o 3-nov por la mañana si hubo reintento el 20-oct) | Lectura semanal y señal de las 4 peticiones a 14 días: si se rastrearon, si la canónica pasó a la versión sin barra y si entraron. Se anota en CAMBIOS.md antes de cualquier cambio en el sitio. | no (ya aprobado o interno) | Es el plan #11 con la fecha movida, porque las peticiones salen el 19-oct y no el 16-17. Se descarta la primera mirada del 30-oct: sería una lectura de un solo día a 11 días, y la vigilancia diaria ya las sigue. |
| 14 | Martes 3-nov, después de anotar la señal | Arreglo de honestidad como borrado mínimo, en un solo cambio: quitar «y la IA de Google ya lo recomienda» de la tarjeta de TRR y «con enlaces que puedes visitar» de las 18 respuestas; revisar la frase de /en/about y «Ya posiciona en su zona» de MJA; corregir la oferta de 400; decir a qué nivel corresponden los precios de los pies del blog. Sin frase común nueva y sin guiones. Solo con la cola neutralizada y probada; si no lo está, el 10-nov. Esa semana no sale ningún otro despliegue visible, tampoco el avatar. | sí | Está dentro de la ventana aprobada (31-oct a 6-nov) y entra después de la lectura del 2-nov, que es una de las dos que deciden la meta del 4-nov. Cambia texto visible: hace falta el OK del dueño sobre el render. |
| 15 | Miércoles 4-nov | Reporte mensual con las métricas nuevas. (1) Meta «deja de caer» con las lecturas del 26-oct y del 2-nov; si no se cumple, no dispara nada. (2) Segunda lectura de Gemini. (3) Estado de /en/houston y de la familia de diseño web de Houston. (4) Anotar lo que exige la meta del 4-dic: con la Fase A completa, 73 URL vivas y 44 dentro; con solo las 7, 77 y 47; con la tanda de /en/houston en espera, 81 y 49. Hoy hay 37. | no (ya aprobado o interno) | Al ritmo actual lo probable es que no se cumpla. La doctrina no permite adelantar la Fase B ni el replanteo por eso. Y el dueño debe saber que el porcentaje sube sobre todo porque las fusiones quitan del total páginas que ya están fuera, antes de leerlo como recuperación. |
| 16 | Propuesta el 4-nov; si se aprueba, en una semana libre entre el 21-nov y el 18-dic | Proponer /es/houston/diseno-web como diferenciación, como quinta o en lugar de una de las 4 aprobadas: reescritura con ficha previa y prueba real, sin cifras inventadas. No fusionar nada hacia ella mientras esté fuera, y no cambiar el enlace de la ficha de Houston. | sí | Están fuera las 6 páginas de diseño web de Houston en los dos idiomas. Es el producto principal en la ciudad de la ficha verificada, y la ficha enlaza justo a esta página. Ninguna de las 4 diferenciaciones aprobadas la toca. Reescribir una página que ya está fuera no puede empeorarla. Su valor es de negocio y de ficha, no de búsquedas: 12 apariciones del 1-ago al 17-oct. |
| 17 | Desde el jueves 5-nov, los tres el mismo día | Créditos con enlace en las webs de TRR, JLX y MJA, con permiso de cada cliente, con la cola ya neutralizada en los 4 sitios y anotado en el registro de cambios de cada uno. | sí | Las tres revisiones coinciden en hacerlo después de la lectura del 4-nov. Cambiar el pie de los controles antes rompería la comparación justo cuando se lee si la caída se detiene. Cambia texto visible en webs de clientes. |
| 18 | Noviembre, después de Bing Places y Apple | Yelp y 2 perfiles de agencia (Clutch, DesignRush o The Manifest); la cámara de comercio hispana de Houston entre noviembre y diciembre. | sí | Sin cambios respecto a lo aprobado (plan #18). Son cuentas y perfiles, con nombre y teléfono idénticos. |
| 19 | Martes 10-nov | Higiene técnica invisible y lastmod veraz en una misma publicación: logo y migas a /es y /en sin barra (158 enlaces), Organization.url a /es, y lastmod tomado del último cambio del contenido principal. | no (ya aprobado o interno) | Dentro de la ventana aprobada (7 a 13-nov), siete días después de la honestidad. Las dos tocan las 44 páginas y no se juntan en la misma semana. |
| 20 | Noviembre, un día sin otro cambio en la web | Redirigir el alias marcyan.vercel.app al dominio. | sí | Aprobado con prioridad baja (plan #15). Es configuración del despliegue. |
| 21 | Martes 17-nov | Fase A, tanda 1 (nuevo orden): /es/precios/cuanto-cuesta-seo-local-houston hacia /es/houston/seo-local. Sección breve y útil, redirección permanente, sin hreflang del par y una petición al destino. | sí | La tanda 1 aprobada apuntaba a /en/houston, que está fuera, y la regla aprobada lo prohíbe. Se empieza por el único destino indexado que no está entre los 6 protegidos y que tuvo 0 apariciones del 8 al 16-oct: si algo sale mal, es la prueba más barata. Cambia el orden aprobado y el texto visible del destino. |
| 22 | Martes 24-nov | Fase A, tanda 2: /en/miami/ecommerce hacia /en/miami, solo si /es/houston/seo-local sigue dentro 7 días después de su tanda. Si salió, se paran las tandas siguientes y se decide el 4-dic. | sí | /en/miami es protegida y seguía dentro el 18-oct. La comprobación a los 7 días es la condición de riesgo ya aprobada (plan #16). |
| 23 | Martes 1-dic | Fase A, tanda 3: /en/pricing/local-seo-cost-houston hacia /en/pricing, con el destino ya fijado (se descarta /en/houston). Misma condición sobre /en/miami. | sí | /en/pricing está dentro (rastreo del 3-oct). /en/houston está fuera, y nunca se fusiona hacia /en/houston/local-seo. |
| 24 | 21-nov a 18-dic y 7 a 20-dic | Las 4 diferenciaciones aprobadas, una por semana y con ficha previa. Después, enlaces contextuales y PR #36 en su propia semana de diciembre. | sí | Sin cambios. Es texto visible y, si toca diseño, pasa por design-director con OK sobre el render. |
| 25 | Viernes 4-dic | Reporte y decisiones con los datos de noviembre. Primera: la tanda de /en/houston (conversational-ai, dental-clinics, ecommerce e immigration-lawyers, más la ampliación de katy, real-estate, auto-repair y local-seo). Entra tal como se aprobó si /en/houston está dentro en dos lecturas semanales seguidas; si sigue fuera, se decide si va como rescate deliberado, con lectura de Gemini antes y después. Además: la Fase B, incluidas /en/miami/hialeah y /es/precios/cuanto-cuesta-un-chatbot, que ya están fuera; la capa en inglés y las herramientas. | sí | La decisión sobre la capa en inglés ya estaba fijada para esta fecha (plan #20). Para entonces habrá tres lecturas de Gemini y un mes viendo si /en/houston vuelve sola, como volvieron /es/miami/diseno-web y el artículo del blog. |

**Desacuerdos entre revisiones y cómo se resolvieron**

- Orden de la Fase A. La revisión 1 empezaba por /en/miami. La 3, en su plan alternativo, juntaba /en/miami y /es/houston/seo-local en la misma semana. Me quedo con el orden de la revisión 2: primero /es/houston/seo-local, que es el único destino indexado fuera de los 6 protegidos y tuvo 0 apariciones del 8 al 16-oct. Las fusiones y las semanas son las mismas; solo cambia el orden. El dato sobre si una relectura daña no es concluyente (4 de 9 fuera frente a 39 de 70), así que el destino más barato va primero como prueba.
- /en/houston. La revisión 3 quería decidir el 4-nov y lanzar desde el 14-nov un refuerzo de /en/houston fusionando en ella las 8 páginas. Lo descarto por cuatro razones. Rompe una regla aprobada (no fusionar hacia destinos fuera del índice). /en/houston tuvo 1 aparición en tres semanas. Google tarda una mediana de 49 días en releer, así que un cambio del 14-nov no se juzgaría antes de finales de diciembre. Y la decisión sobre la capa en inglés ya estaba fijada para el 4-dic, cuando habrá tres lecturas de Gemini. Queda como opción de rescate deliberado para el 4-dic, como propuso la revisión 2.
- Relectura que protege. La revisión 3 afirmaba que 5 de 6 páginas releídas siguen dentro. Lo descarto: e18.json muestra que esa cuenta omite /en/houston/beauty-salons, /en/miami/conversational-ai y /es/houston/abogados-inmigracion, releídas entre el 4 y el 8-oct y hoy fuera. La cuenta completa de la revisión 2 da 4 de 9 fuera frente a 39 de 70 sin relectura. Se corrige el «1 de 6» del diagnóstico, y releer ni protege ni daña de forma demostrable.
- Pasar /en/miami/hialeah y /es/precios/cuanto-cuesta-un-chatbot de la Fase B a la A, como proponía la revisión 1: descartado por ahora. Solo hay una lectura de su salida, tienen casi 0 apariciones (esperar no cuesta nada), una de ellas cargaría /en/miami, que es protegida, y la decisión de la Fase B ya está fijada para el 4-dic.
- Señales fuera del sitio. La revisión 1 solo adelantaba las reseñas; las revisiones 2 y 3 adelantaban también Bing Places y Apple. Adopto el adelanto porque no puede tocar el índice ni ninguna lectura y, con /en/houston fuera, es la única vía de visibilidad en los asistentes que no depende de Google. Va después de las reseñas y con OK, porque son cuentas. Yelp, los perfiles de agencia y la cámara siguen en noviembre, y los créditos en las webs de los clientes van después del 4-nov, en lo que las tres coinciden.
- Diseño web de Houston. La revisión 3 proponía consolidar la familia en una página fuerte por idioma. Lo descarto como fusión, porque el destino natural, /es/houston/diseno-web, está fuera y la regla lo prohíbe. Adopto la versión de la revisión 2: reescritura con ficha previa como diferenciación, propuesta el 4-nov. A eso le sumo la protección de la revisión 1 para la revisión de enero: no se fusiona sin decidir antes el enlace de la ficha.
- Dos condiciones de la revisión 2 que no adopto. Primera, la mirada del 30-oct a las peticiones: sería una lectura de un solo día a 11 días. Segunda, frenar cada tanda de la Fase A si la cobertura cayó esa semana: pararía la fusión de páginas que ya están fuera por una caída que no provocamos. Se mantiene solo la condición aprobada: el destino sigue dentro 7 días después.
- Etiqueta de la decisión. Dos revisiones decían «mantener calendario» y en todo lo que toca el sitio se mantiene. Elijo «adelantar partes» porque se adelantan la neutralización de la cola (al 19-23 oct, dentro de su ventana), las reseñas vencidas, una lectura de Gemini en octubre, y Bing Places y Apple, que pasan de noviembre a octubre.

**Aprobación.** El 18-oct el dueño dio su OK al orden nuevo de la Fase A (filas 21 a 23: primero /es/precios/cuanto-cuesta-seo-local-houston hacia /es/houston/seo-local el 17-nov) y al aplazamiento de la tanda de /en/houston al 4-dic. Siguen pendientes de su OK cuando lleguen: la reescritura de /es/houston/diseno-web (propuesta el 4-nov) y la forma de mantener las lecturas diarias con la máquina apagada.

**Corrección a §3 y §6.** El dato "de 6 indexadas releídas salió 1" ya no se sostiene: de las 9 que estaban dentro el 27-sep y Google volvió a leer, 4 están fuera el 18-oct (/en/houston, /en/houston/beauty-salons, /en/miami/conversational-ai, /es/houston/abogados-inmigracion); de las 70 sin relectura, 39. Releer ni protege ni daña de forma demostrable: ninguna petición se usa para "asegurar" páginas protegidas.

