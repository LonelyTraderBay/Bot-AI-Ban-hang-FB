# UI028.W18 Bot — contract and baseline before spacing edits

Date: 2026-10-06  
Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`; R26/R27/R28/R51 only.  
Status: baseline and contract captured before changing `apps/web/src/modules/bot/index.tsx`.

## Immutable inputs and source intake

| Input | SHA-256 / observed state |
|---|---|
| `apps/web/src/modules/bot/index.tsx` | `c7336421c40188823de27438a11d282a5e88980a815fe8729cef5a3fe34aa57c` |
| `botsales-kit/contracts/route-manifest.json` | `360871c008fac723cfc77dec79417838d24d4fae844452909eb347ec8893f2b2` |
| `botsales-kit/contracts/openapi.json` | `d88a70957a9de36402ff5ac0cb757a2f1c496519c7e1fd2e28df17e867f78c7c` |
| `UX-CONTRACT.md` | `da010abf3cf9ba37fd3ad9f7ee3ee201adf985d8a84c3fef2ff7469b5d2e72f2` |
| `botsales-kit/design/tokens.json` | `b4083eb2032d9ebac7f1f793f3aaE1cda6a30e075b0dd9e19f241567651d1895` |
| `apps/web/src/shared/ui/layout.ts` | `02365c3c7fcB50c60707D3a4cb205537a7ed4dbd8a9975bf8a4fb80e00de9b06` |
| Intake Git state | `apps/web/src/modules/bot/index.tsx` was already `MM` (staged and unstaged changes) before this W18 edit. Working-tree SHA above is the W18 baseline; do not reset or replace the user's pre-existing content. |

## Canonical behavior and ownership

| Route | Canonical route intent and operations | Permissions / constraints retained |
|---|---|---|
| R26 `/s/:shopId/bot` — `FR-026` | Reads `getBotConfig`, `listAIConnections`, `listKnowledge`, `listBotRevisions`, `getBotRevision`; draft/publish/pause/restore use `updateBotDraft`, `publishBotConfig`, `pauseBot`, `restoreBotRevision`. | Read `bot.read`; edit/restore `bot.configure`; publish/pause `bot.publish`. Save is versioned; publish requires evaluation for the exact draft; pause is explicit; restore creates a draft and never activates it. `requireHumanOrderConfirmation` remains contract-locked `true`. |
| R27 `/s/:shopId/bot/playground` — `FR-027` | Reads `getBotConfig`; submit uses `runPlayground`. | `bot.configure`; sandbox only, no external message. Unknown cost/token values remain unknown, provider/capability failure stays visible, and the demo must not use real customer PII. |
| R28 `/s/:shopId/bot/evaluations` — `FR-028` | Reads `listEvaluations`, `getEvaluation`, `getJob`; start uses `createEvaluation`. | Read `bot.read`; start `bot.configure`. Evaluation is asynchronous and bound to config/dataset/knowledge revision. Synthetic demo output is not evidence of real model quality; failed/pending/partial outcomes must not be labeled passed. |
| R51 `/s/:shopId/bot/team` — `FR2-R51` | Reads `listAgentRoles`, `listBudgetPolicies`; role edits/control use `updateAgentRole`, `controlAutomation`. | Read `bot.read`; role configuration `bot.configure`; role control `bot.pause`. Commands remain versioned and scoped; Frontend cannot grant tools or synthesize permissions. Budget update uses canonical `updateBudgetPolicy` with OpenAPI permission `operations.manage`. The route manifest does not list that operation under R51 actions; this known mapping gap is already explicit in `tests/fe018-source-map.test.mjs` and must not be silently rewritten as a new route action. |

All four manifest entries declare `loading`, `empty`, `error`, `forbidden`, `stale_or_offline`, `success`, `command_unknown`, and `capability_unavailable`. The source-map suite covers 18 Bot operations across these route groups. FE018 already tests the version/permission/evaluation/sandbox/budget/kill-switch invariants; the FE027 failover preview is exercised in `tests/fe018.spec.ts`. These behaviors are out of scope for a spacing-only change.

## Layout contract before source edit

- R26: keep the configuration summary, revision history, status and action hierarchy; the panel owns its body inset. Use shared `surface`, `page`, `notice`, and `actions` roles for existing relationships.
- R27: preserve the sandbox two-column geometry on wide screens and stacked mobile flow; each Panel owns its body inset; form fields and result/source/warning groups use shared `form`, `surface`, `notice`, and `code` roles.
- R28: preserve the registered-dataset form and dense evaluation table; toolbar/search/action geometry stays as it is; use shared form/notice/action roles for spacing.
- R51: preserve the responsive four-role grid, budget table, local failover explanation, role assignment/control dialogs, and approved budget dialog; parent/child inset ownership must remain singular. Use existing shared `page`, `surface`, `form`, `notice`, `actions`, and `dataTable` roles where they match; do not create a Bot-local scale or role map.
- Breakpoints are mobile `<768`, tablet `768–1279`, desktop `≥1280`; representative capture at 390×844/1280×900 and layout regression at 320/390/768/1280/1440. Dialog checks use 320/390/1280. Keep long policy/code strings readable and scrollable; preserve actions, focus, query state, API behavior and module boundaries.
- This is spacing-only: no typography, palette, elevation, radius, API, state, permission, route or mock contract changes. If a shared semantic role is genuinely missing, add a typed shared role with token source and consumer-impact evidence before using it.

The baseline checker report is [layout-before-spacing-current-20261006.json](layout-before-spacing-current-20261006.json): 232 source findings across 67 files, 25 owned by Bot. The owner is the only expected finding scope for W18; after scan must show 0 Bot findings, no new identities, and no changed finding identity/count outside Bot.

## Paired browser baseline

[Before render artifact](render-before-spacing-current-20261006.json) was captured from the original working-tree SHA above before any W18 React edit. It contains 18 Chromium observations: R26 config/editor, R27 sandbox empty/result, R28 list/evaluation dialog, and R51 team/role assignment/budget approval at 390×844 and 1280×900. The only setup writes are two local `POST /api/v2/shops/shop-demo/bot/playground` calls (one per viewport) to create the synthetic R27 result state. No provider call or customer message is sent. The capture logged 0 page errors and no horizontal page overflow at the tested viewports. Dialog bounds are recorded in the JSON. Every PNG is retained in this directory as `before-*`.

Contract provenance: route IDs/actions/states from `route-manifest.json`; operation fields and permissions from `openapi.json`; theme roles/scale from `design/tokens.json` and the shared layout bridge; existing frontend behavior from `tests/fe018-source-map.test.mjs` and `tests/fe018.spec.ts`. No HTML prototype is used as an implementation source.
