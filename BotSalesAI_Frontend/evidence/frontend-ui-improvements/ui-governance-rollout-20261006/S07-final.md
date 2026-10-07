# S07 — style producer coverage closeout

**Run date:** 2026-10-07. **Scope:** static enforcement for style entry points in the Frontend source closure. This closes S07's local source and regression criteria only; S18 pipeline wiring and S19 final all-source/rendered-state reconciliation remain open.

## Covered entry points

- JSX `style`, `sx`, `css`, `slotProps`, `componentsProps`, `styles`, and MUI `GlobalStyles` / Emotion `Global` inputs, including nested objects and spreads.
- Binding-resolved MUI/native React element factories: `createElement`, JSX runtime `jsx`/`jsxs`/`jsxDEV`, and `cloneElement`; unknown element targets with style-like props fail closed.
- MUI and Emotion `styled` factories and tagged CSS templates; CSS declarations are parsed and dynamic spacing remains UNKNOWN.
- Inline `<style>` elements and `style` attributes in JSX, React factories, DOM element creation, and `apps/web/index.html`.
- `CSSStyleDeclaration` direct spacing writes and `setProperty`; opaque `cssText`, raw `style` attributes, token overrides, and dynamic property names fail closed.
- Runtime HTML/style escape hatches: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`/`writeln`, `dangerouslySetInnerHTML`, style-element content/mutators, `CSSStyleSheet` mutations, and `Document`/`ShadowRoot.adoptedStyleSheets` access fail closed. Plain text insertion remains outside this prohibition.

The first adversarial probe showed that HTML parsing and runtime stylesheet mutation produced no findings. The corrected checker rejects those paths. Before and after output is preserved in [the failing probe](S07-runtime-style-bypass-before.log) and [the full regression run](S07-layout-regression-final-v2.log).

## Verification

- `node --test tests/ui-layout-binding-gates.test.mjs` — **71/71 passed**, 0 skipped.
- `node --test tests/layout-checker.test.mjs` — **10/10 passed**.
- `node scripts/check-layout.mjs` — **76 source files, 0 findings**, one declared and used exception.
- `node scripts/check-visual-tokens.mjs` — **75 source files, 0 findings**.
- `node scripts/check-ui-composition.mjs` — **74 source files, 0 findings**.

Individual command output is retained in the `S07-*-final*.log` files beside this report. The added negative coverage is isolated to tooling/tests; no shared or feature UI runtime component changed in S07. The strict scanner currently has no finding in the application source closure.

## Remaining limits

The new binding/layout regression suite is not yet part of `npm run verify`; S18 owns durable workflow wiring. This evidence does not establish browser rendering, all interactive states, screen-reader review, owner acceptance, or overall UI conformance. Final inventory/hash/state reconciliation remains S19.
