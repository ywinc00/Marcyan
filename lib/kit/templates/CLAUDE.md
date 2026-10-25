# Marcyan · North Star

> Always-loaded rules for every Marcyan client project. This is the summary; the detail lives in the files mapped at the bottom. When this and a detailed file seem to differ, the stricter one wins.

Marcyan is a web design agency. Each project runs with a central **"Estructura"** chat (the brain/director that plans and delegates) and dedicated **department** chats (UI, UX, Design, Security…) that share the same repo and data. Always identify the mode first: **from scratch** vs **redesign / landing on an existing identity** (derive and elevate the brand, never impose an agency style).

---

# Frontend Design Rules

Every UI change must follow `DESIGN.md`.

Before implementing:
- Define the intent of the section.
- Define the visual hierarchy.
- Identify what generic patterns must be avoided.

Never create UI only to fill space.

Avoid:
- generic cards
- random icons
- vague headlines
- decorative gradients
- repeated section layouts
- inconsistent spacing
- weak CTA text

Every section must have:
- purpose
- hierarchy
- clear copy
- responsive behavior
- conversion logic

---

## Config map (where the detail lives)

- **`DESIGN.md`**: design doctrine / source of truth: `Anti-generic rules`, `Forbidden UI patterns`, per-component rules (hero, cards, buttons, forms, navigation, sections, CTA).
- **`.claude/rules/frontend-design.md`**: enforcement layer: rules summary + forbidden patterns + non-negotiable minimums + the **mandatory visual review checklist** (binary PASS/FAIL) with a blocking rule.
- **`.claude/skills/design-director/SKILL.md`**: the **Art Director Gate**: before writing any UI code, propose and register visual direction, page hierarchy, section intent, component style, and the generic mistakes you will avoid. Code only after `VALIDATED`. Invoke it whenever you design/build UI.
