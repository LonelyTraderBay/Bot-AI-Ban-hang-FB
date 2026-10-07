# UI012/S33 — Knowledge validation field labels and keyboard regression

Date: 04/10/2026 (UTC run window began 2026-10-03 19:20Z). Scope: one reproduced Knowledge create-dialog validation response and the coupled React ownership/copy fix.

## Baseline and expected behavior

The earlier UI012/S22 synthetic HTTP 422 capture showed the alert exposing the API field key as `Trường content: Hãy rà soát nội dung nguồn.` The Knowledge create dialog's textarea is named `content` for API/DOM field matching, while its visible label is “Nội dung”. The user-facing alert should use the same Vietnamese label as the control, and keyboard focus should still move to that control.

## Change and paired result

- **UI: PASS for the bounded synthetic 422 state.** The alert now reads `Trường Nội dung: Hãy rà soát nội dung nguồn.` and no longer exposes `content:`. The textarea receives focus and `aria-invalid="true"`. The targeted Chromium regression passed 1/1 with exit 0; see [test log](S33-targeted-browser-test-20261004.log).
- **ARCH: PASS; module ownership retained and made explicit.** Knowledge owns `title`/`content` display labels in `apps/web/src/app/locales/vi/knowledge.ts` and passes its field-label map into the shared `ErrorNotice`. The shared renderer normalizes API field paths to resolve the provided label; existing path-to-control focus behavior remains in place. The shared component has no Knowledge import, module boundaries remain clean, and no cross-module dependency was introduced.
- API operation/schema, route, permission, design tokens, generated output, query/cache ownership and progress ledgers were not changed. The map applies to this Knowledge form; other callers without `fieldLabels` retain their existing fallback behavior.

## Current-source verification

`S33-frontend-gates-20261004.log` records generator check, source policy and its tests, boundary check, lint, TypeScript, domain/MSW tests, Vitest, production and demo builds, production MSW-isolation scan, and the full UI012 keyboard spec. The npm aggregate wrapper could not resolve nested `npm`; its exit is reported as a launcher failure, not source-gate failure. The direct constituent checks passed. Both builds used new temporary output directories and did not replace the existing ignored `apps/web/dist` or `apps/web/dist-demo`. The current production output has no MSW startup markers or worker file; the demo output includes its mock worker. See [S33 artifact audit](S33-artifact-audit-20261004.json) and [keyboard suite log](S33-keyboard-suite-20261004.log).

The complete rebuilt-demo E2E suite was not rerun for S33. S30's 194/194 result is a previous source snapshot. The current-diff FE-G04 status is therefore `NEEDS_REVERIFY`; local FE-G08 artifact separation/isolation passes on S33 outputs. The previous overall 7/9 readiness score is historical and is not recomputed while FE-G04 needs a full current-source run. UI012 remains IN_PROGRESS 4/5, C04 PARTIAL because screen-reader speech/transcript and broad manual review remain absent. No frontend/product checkpoint or ledger was advanced.

## Evidence fingerprints

SHA-256 of the source/test files at acceptance time:

| File | SHA-256 |
|---|---|
| `apps/web/src/shared/ui/components.tsx` | `979AF3FE07E53BD428CD75AE8F5DC8164C80D33914F0092A47AD1B9C4AE89157` |
| `apps/web/src/app/i18n.ts` | `535228DF84E97DC5E4369880A4499C93F31FBAE34057726FB48D5A35F7CA2340` |
| `apps/web/src/modules/knowledge/index.tsx` | `2488E7AC7C35EE8BA50A47F086587B847DB563CA3FD8D33BADFBE8D48F8BC50A` |
| `apps/web/src/app/locales/vi/knowledge.ts` | `A186BDA01F5F1FF24E37A8398D090E301B6AF44F90487553929C459059B460C9` |
| `tests/ui012-keyboard.spec.ts` | `F780DA7C5716AB6EC28844A880AAB3168B1A74C9D3829BF40D26122ABFC964C8` |
