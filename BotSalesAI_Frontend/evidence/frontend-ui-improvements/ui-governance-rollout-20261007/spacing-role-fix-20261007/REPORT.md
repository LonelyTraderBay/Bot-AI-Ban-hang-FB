# Spacing role follow-up — 2026-10-07

This is a post-handoff defect correction discovered during local UI review. It does not reopen or change S20 status. The task is limited to the three verified consumers below and their composition checker regression.

## Contract and expected behavior

Canonical contract: `docs/FRONTEND_SPACING_STANDARD.md` v1.28, SPC-060/061 and §0.5/§0.6; shared API catalog: `apps/web/src/shared/ui/README.md`.

| Route/profile | Intent and current defect | Owner and expected role | Behavior invariants |
|---|---|---|---|
| `/s/:shopId/approvals` — action queue with preview context | Preview fields were owned by `PageSections`; the preview action inherited `SurfaceContent` content spacing; the preview and approval list panels were adjacent without a section owner. | `FormFields` (16 px) for independent values; `ActionGroup beforeGap="form"` (24 px) for the preview action; `PageSections` (24 px) for peer panels. An alert notice uses `layoutSx.notice.afterGap`. | Preview stays local-only, does not create an authorization rule or change reviewer permissions; approval list and decision flow unchanged. |
| `/s/:shopId/notifications/devices` — settings form | Quiet-hours time fields were owned by `PageSections` inside `FormFields`; Save was another field-flow child. | `FieldGroup` (8 px) for the paired quiet-hours values; `ActionGroup beforeGap="form"` (24 px) for Save. `FormFields` retains 16 px field rhythm. | Checkbox still controls conditional time fields; Save retains its existing permission, disabled, pending and mutation behavior. No save was submitted while recording baseline. |
| `/s/:shopId/finance/profit-loss` — report and explanation context | Detail and Q&A panels were siblings without a page-section owner; mock explanation notice, field and action shared one form gap. | `PageSections` (24 px) for peer panels; notice after-gap token, `FormFields` (16 px) for the question, `ActionGroup beforeGap="form"` (24 px) for the action; feedback surface owns its separation. | Query snapshot, mock-only explanation, answer content, source/warning notes and non-mock informational branch unchanged. |

## Baseline before source edits

Git baseline: branch `main`, `HEAD` matched `origin/main`; worktree clean before this task. Source SHA-256:

| File | SHA-256 |
|---|---|
| `apps/web/src/modules/operations/index.tsx` | `1710a8b4a14e75a91ce608d47567cba8297ccab4a4c6d5cc347a9dce956979e7` |
| `apps/web/src/modules/notifications/index.tsx` | `03bdd21513eb173f92b8e416a4f875bdac600cdb0273ea0e9d4c0237fc217dda` |
| `apps/web/src/modules/finance/index.tsx` | `6edee787cf58f16b01a8135fe2195b83d83178aa5e5b61705e160930618b481b` |
| `scripts/check-ui-composition.mjs` | `2a483e55188f9409624ea5893a1444583e6099c7a46a828e7ee3f98186dd4404` |
| `tests/ui-composition-checker.test.mjs` | `091d444ffd1a0e3a9ce78042e05a6c1b36c34b7f6abca0a2fbf37544dd09ce0e` |
| `docs/FRONTEND_SPACING_STANDARD.md` | `3e717844348860dc7bc440ba6abdf50ee9e10ebb1d67b5bb6beb982fcb2c0e4a` |
| `apps/web/src/shared/ui/README.md` | `34d3fd5a7dc66a067660451c0ae043109e5224c524cc7972d193607e20850284` |

The user-provided approvals screenshot is preserved as [`baseline-user-approvals-1687x768.png`](baseline-user-approvals-1687x768.png), SHA-256 `abafca51998888711dd4ac7ee3d7518af70ea046b96c32b6d119d77ef682811d`. It shows the preview panel and table touching, and highlights the preview controls.

Additional loaded local mock renders were inspected through CUA at viewport 825×878 before edits:

- `/s/shop-demo/approvals`: ready state, selected role “Kho & mua hàng”, amount `300000`, 3 approval rows; preview and list panels touch.
- `/s/shop-demo/notifications/devices`: ready mock state; quiet-hours checkbox was temporarily enabled in the unsaved UI to reveal both time fields (`22:00` and `08:00`), then no Save action was taken. The Save button is in the field flow.
- `/s/shop-demo/finance/profit-loss`: ready mock snapshot; the detail and Q&A panels touch. The question selector and mock action are present.

The active browser capture outputs are part of this task session; only the user-supplied approvals image is persisted as a baseline PNG. This limitation remains explicit for paired screenshot evidence.

## Source findings

The composition checker accepted the incorrect `PageSections` field pairing and did not report direct peer `Panel` siblings under fragments without a section owner. The source-level correction and focused negative/positive fixtures will close these evidenced gaps without changing the canonical policy or shared spacing values.

## Source changes and final fingerprints

The existing shared APIs and spacing values were sufficient; no token, component, plan, or Backend changes were needed. The consumer corrections and checker fixtures are:

- `apps/web/src/modules/operations/index.tsx`: PageSections owns the two approval panels; the preview form uses FormFields, notice-after spacing and a full-width ActionGroup action; feedback uses SurfaceContent.
- `apps/web/src/modules/notifications/index.tsx`: quiet-hour controls use FieldGroup; Save is separated from FormFields into a full-width ActionGroup while retaining the same permission, disabled and mutation props.
- `apps/web/src/modules/finance/index.tsx`: the two report panels use PageSections; the mock explanation uses explicit notice, form, action and feedback roles. The non-mock branch is unchanged.
- `scripts/check-ui-composition.mjs`: rejects paired direct TextFields under PageSections and adjacent direct peer Panels in a fragment when neither declares a supported boundary.
- `tests/ui-composition-checker.test.mjs` and `tests/ui-composition-ancestry.test.mjs`: negative/positive fixtures cover those rules; the existing positive peer-Panel fixture now declares PageSections.

| File | Final SHA-256 |
|---|---|
| `apps/web/src/modules/operations/index.tsx` | `608bdffd80bc3b3bc0bd2a6b49a3591b38262f797c195de09ee566a34db5518b` |
| `apps/web/src/modules/notifications/index.tsx` | `f3c4f450a411703bf605153eee7a9bb3f555882b276b191cd15ce1df26b8dd7d` |
| `apps/web/src/modules/finance/index.tsx` | `b232374ed17759d105022cc29d87205de9414b7d2b5327f0bf9135243248134c` |
| `scripts/check-ui-composition.mjs` | `cb24a677521ac8d0fb83f846c99255f4f0584e7fb4352e2584952ca58c7e413a` |
| `tests/ui-composition-checker.test.mjs` | `efbdd1f3881e503606158a5649cabd0041643f6912d5ff8c7e703528b62425cc` |
| `tests/ui-composition-ancestry.test.mjs` | `cdbb012fff52ae65b448a1cfc4062328c826719cf86fc6154fa5c93b9a66c2d8` |
| `evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json` | `520cd57d4f58a2b0fc147cd9150edbce614bbe1b902967d0e6efa88c9a2e5840` |

The S17 current manifest was refreshed with the owning composition check: 37/37 tests and 74 source files/0 findings. After the root report changed, its evidence gate was rerun and passed 11/11; see [`evidence-refresh-20261007.log`](evidence-refresh-20261007.log). Its status and the already-completed S20 handoff were not changed.

## Verification

`npm.cmd run verify` completed with exit code 0. The captured run is [`verify-final-20261007.log`](verify-final-20261007.log). It includes generator 11 outputs/283 schemas/210 operations/54 routes; source and boundary checks; lint/typecheck; domain 88/88; unit 136/136; production build; layout regressions 82/82 and 76 files/0 findings; visual-token 75 files/0 findings; composition 37/37 and 74 files/0 findings; and evidence validator 11/11 plus S17 PASS.

## Loaded render review

The local, in-memory mock UI was reviewed through CUA at 825×878 after the source changes:

- `/s/shop-demo/approvals`: alert-to-field clearance, paired form fields, full-width preview action, local preview feedback, and the 24 px peer-Panel section gap were visible. The original user screenshot showed the two panels touching; they are now visibly separated.
- `/s/shop-demo/notifications/devices`: enabling the unsaved quiet-hours checkbox exposed both time fields; their compact 8 px group spacing and full-width Save action were visible. Save was not submitted.
- `/s/shop-demo/finance/profit-loss`: the detail and Q&A panels are separated; the mock question field and full-width action retain their behavior; generating the local explanation shows its separate feedback surface. No API write is made by that button.

The before image supplied by the user is preserved in this folder. The after views were inspected in the active browser session but were not persisted as PNG files. Full Chromium/Firefox E2E was not run for this follow-up; rendered route checks above are local mock evidence only and do not establish Backend, production, hosted-CI, or owner acceptance.
