# Art Direction · Registro del Art Director Gate

> **Esta es la puerta operativa de Marcyan.** Abrir, rellenar o invocar este archivo significa que **te comprometes con las reglas generales** y NO se escribe código de UI hasta que el `Estado` de la página esté `VALIDADO`.
>
> **Reglas generales que aplican SIEMPRE (no negociables):**
> - `CLAUDE.md`: north star del método (se carga cada sesión).
> - `DESIGN.md`: tokens del cliente + reglas por componente + `Anti-generic rules` + `Forbidden UI patterns`.
> - `.claude/rules/frontend-design.md`: enforcement + **Visual QA checklist** (puerta de salida con regla de bloqueo).
> - `.claude/skills/design-director/SKILL.md`: el protocolo que produce este registro + modelo de departamentos/sub‑agentes.
>
> **Cómo se usa:** este es un **template**. Duplica el bloque "FICHA DE PÁGINA/VISTA" por cada página o vista del proyecto. Una página sin su ficha `VALIDADO` no se construye.

---

## Cabecera del proyecto (rellenar 1 vez por cliente)

```
Proyecto / Cliente: <nombre>
Modo: <DESDE-CERO | REDISEÑO-IDENTIDAD>
Brief recibido: <sí/no + enlace>     Identidad/brandbook: <sí/no + enlace>     Assets (fotos/logos): <enlace>
Tokens del cliente: DESIGN.md → front matter relleno (<sí/no>)
```

### Inventario de marca conservada: OBLIGATORIO si modo = REDISEÑO-IDENTIDAD

```
CONSERVADO (no se toca):
- Logo + zona de protección + versiones (color/mono/negativo)
- Paleta: <hex exactos del brandbook>
- Tipografía de marca: <display> + <texto>
- Tono de voz / claims aprobados
ELEVADO (mejoro dentro del marco, sin cambiar la marca):
- <p.ej. escala tipográfica completa, estados de interacción, spacing system>
PROHIBIDO en este proyecto:
- Cambiar hex de marca, sustituir tipografía, rediseñar el logo
RIESGOS detectados en la identidad (si los hay):
- <incoherencias/defectos medibles → se reportan a Estructura, no se cambian unilateralmente>
```

---

## FICHA DE PÁGINA / VISTA  ·  (duplicar por cada página)

```
Página/Vista: <home | servicios | contacto | landing-X | vista-chatbot | ...>
Objetivo de conversión: <qué acción buscamos en esta página>
Departamento responsable: <UI | UX | Diseño>     Sub-agentes a invocar: <research-referencias | ilustración | creación-de-componentes | ninguno>
```

**1) Dirección visual**
- Concepto rector (1 frase): `<...>`
- Adjetivos operativos (3–5, medibles): `<...>`
- Referencias (3–5 con URL/captura, ≥2 fuera del nicho; qué tomo / qué NO): `<...>`
- Decisiones de núcleo (derivadas de los tokens de `DESIGN.md`): tipografía `<...>` · paleta/rol `<...>` · densidad y radios `<...>`
- > Si faltan referencias → invoca `research-referencias` antes de seguir.

**2) Jerarquía de la página**
- Orden de lectura (1º, 2º, 3º) y por qué, ligado al objetivo: `<...>`
- Mecanismos con valores (escala/peso/color/espacio/posición; salto H1/body ≥2.5×): `<...>`
- Acción primaria única (token `accent`) vs secundaria: `<...>`

**3) Intención de cada sección**

| Sección | Trabajo (pregunta/objeción que resuelve) | Acción que provoca | Formato | Métrica de éxito |
|---|---|---|---|---|
| `<...>` | `<...>` | `<...>` | `<...>` | `<...>` |

- Arquetipos usados (≥4 distintos, sin apilar bloques idénticos): `<...>`

**4) Estilo de componentes** (referencia tokens de `DESIGN.md`, no hex sueltos)
- Radios `rounded.*` · elevación (borde **o** sombra) · botones (5–6 estados) · inputs · iconografía (un set, un grosor): `<...>`
- Cómo expresan la dirección visual del punto 1: `<...>`
- > Si requiere prototipo → invoca `creación-de-componentes` (1–2 piezas con sus estados).

**5) Errores genéricos que voy a evitar** (formato `NO X → SÍ Y`, con valores)
- `<NO ... → SÍ ...>` (tipografía por defecto)
- `<NO ... → SÍ ...>` (layout plantilla)
- `<NO ... → SÍ ...>` (color/gradiente cliché)
- `<NO ... → SÍ ...>` (componentes cliché)
- `<NO ... → SÍ ...>` (imágenes/iconos cliché)
- `<NO ... → SÍ ...>` (copy de relleno)

**Patrones ⛔ que requieren excepción** (si aplica): registrados en `design/decisiones/{fecha}-{patron}.md` → ver `design/decisiones/_TEMPLATE.md`.

```
Estado: PROPUESTO → VALIDADO por: <Estructura/humano>   Fecha: <YYYY-MM-DD>
```

> **Solo con `Estado = VALIDADO` (nombre + fecha) se abre el editor de código.**

---

## Al cerrar la página (puerta de salida)

Antes de entregar, corre el **Visual QA checklist** completo de `.claude/rules/frontend-design.md` contra el render real (PASA/NO PASA). **Regla de bloqueo:** un solo `NO PASA` → no se entrega; se corrige o se documenta excepción (`design/decisiones/`) y se registra en el chat "Estructura".

```
QA ejecutado: <sí/no>   Items NO PASA: <0 | lista>   Excepciones documentadas: <enlaces>
Entregado: <fecha>   Validado en QA por: <...>
```
