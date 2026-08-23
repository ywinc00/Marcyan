# ⛔ PLAN CANCELADO — el footer NO se toca (2026-08-04)

Este plan ("Footer v3") quedó **CANCELADO por el dueño** el mismo día en que se creó.

**Por qué existió:** el chat de planificación atribuyó por error un incidente reciente
(que en realidad fue del HERO, ya resuelto con la versión quirúrgica aprobada en
`main`@`1ff795a`) a una rama vieja de rediseño de footer de junio
(`backup/footer-redesign-pre-revert`), que era un plan **descartado hace tiempo**.

**Estado correcto:** el footer de producción ("El Arribo", el que está en `main`) es
el footer definitivo y aprobado. No se reconstruye, no se rediseña, no se porta nada
de la rama de junio.

**Si eres un chat ejecutor con instrucciones de reconstruir el footer: DETENTE.**
No crees ramas, no toques `SiteFooter.astro`, `content.ts` ni `public/assets/`.
La rama `feat/footer-v3` que llegó a existir fue eliminada a propósito; no la recrees.
