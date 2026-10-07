# S08 — spacing value and unit provenance

**Run date:** 2026-10-07. **Scope:** strict source value/unit semantics for Frontend spacing. The change is limited to checker and regression fixtures; no shared or feature UI runtime styles changed.

The red probe reproduced that a spacing object with an unknown responsive key could pass, and CSS shorthand with several canonical tokens was rejected as if it were a raw literal. The gate now:

- Parses CSS spacing shorthand and logical properties as token lists. Every length must be a canonical generated `--space-*` variable or a permitted zero reset; an unknown variable, literal, fallback, or `calc()` expression fails.
- Allows `auto` only for margin properties, including valid margin shorthand such as `0 auto`; it does not allow `gap: auto` or `padding: auto`.
- Reads breakpoint names from the binding-resolved `createTheme` call in `apps/web/src/shared/ui/theme.ts`. Responsive object keys must exist in that map; arrays cannot exceed the configured breakpoint count. If the theme source is missing, dynamic, or ambiguous, responsive spacing is UNKNOWN and fails.
- Keeps spacing unit semantics separate from geometry and other theme roles; the generated token source remains checked by the existing generator.

## Verification

- Before repro: [S08-spacing-provenance-before.log](S08-spacing-provenance-before.log) — expected failure; the unknown responsive key had no finding.
- Targeted after: [S08-spacing-provenance-after-final-v2.log](S08-spacing-provenance-after-final-v2.log) — 1/1 passed, including positive canonical shorthand/responsive cases and negative fallback/alias/literal/calc/breakpoint cases.
- Full checker regression: [S08-layout-regression-final-v2-20261007.log](S08-layout-regression-final-v2-20261007.log) — **82/82 passed**, 0 skipped (10 layout-checker + 72 binding/layout cases), including token-vs-factor unit checks.
- Layout gate: [76 files, 0 findings](S08-layout-gate-final-20261007.log); one declared exception is used.
- Visual-token gate: [75 files, 0 findings](S08-visual-gate-final-20261007.log).
- Composition gate: [74 files, 0 findings](S08-composition-gate-final-20261007.log).
- Generator check: [11 outputs, 283 schemas, 210 operations, 54 routes](S08-generator-final-20261007.log).

## Remaining limits

This closes S08's value/unit guard scope, not full project acceptance. S18 still must wire the complete regression set into the durable `verify` path. S19 still owns final inventory/hash reconciliation and rendered state/route acceptance; no browser, owner, hosted-CI, or screen-reader result is claimed here.
