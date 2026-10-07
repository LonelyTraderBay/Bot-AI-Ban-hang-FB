# UI028.W19 Integrations — contract and baseline before spacing edits

Date: 2026-10-06  
Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`; routes R29/R30 only.  
Status: source contract, strict layout baseline, and paired viewport captures are recorded before changing `apps/web/src/modules/integrations/index.tsx`.

## Immutable inputs and source intake

| Input | SHA-256 / observed state |
|---|---|
| `apps/web/src/modules/integrations/index.tsx` | `de8a8c8407b80792e2b8c3b25d5a31dc8239a99654f3df254f2685e9a4d2f44b` |
| `botsales-kit/contracts/route-manifest.json` | `360871c008fac723cfc77dec79417838d24d4fae844452909eb347ec8893f2b2` |
| `botsales-kit/contracts/openapi.json` | `d88a70957a9de36402ff5ac0cb757a2f1c496519c7e1fd2e28df17e867f78c7c` |
| `UX-CONTRACT.md` | `da010abf3cf9ba37fd3ad9f7ee3ee201adf985d8a84c3fef2ff7469b5d2e72f2` |
| `botsales-kit/design/tokens.json` | `b4083eb2032d9ebac7f1f793f3aae1cda6a30e075b0dd9e19f241567651d1895` |
| `apps/web/src/shared/ui/layout.ts` | `02365c3c7fcb50c60707d3a4cb205537a7ed4dbd8a9975bf8a4fb80e00de9b06` |
| Intake Git state | `apps/web/src/modules/integrations/index.tsx` was already staged (`M `) before W19. The working-tree SHA above is the pre-edit baseline; preserve the staged content and only apply the intended spacing migration. |

## Canonical behavior and ownership

| Route | Canonical route intent and operations | Permissions / constraints retained |
|---|---|---|
| R29 `/s/:shopId/integrations/channels` — `FR-029` | Reads `listChannels`, `getChannel`, `getJob`; actions use `beginChannelConnect`, `reconnectChannel`, `disconnectChannel`, and `checkChannelHealth`. | Read `integrations.read`; all actions `integrations.manage`. Preserve empty CTA, channel identity/status, policy/capability warnings, reason-required disconnect, and history retention. OAuth is initiated by the contract operation; mock mode must not navigate to Facebook or send a real message. |
| R30 `/s/:shopId/integrations/ai` — `FR-030` | Reads `listAIConnections`, `getAIConnection`, `getProviderCatalog`, `getJob`; actions use `createAIConnection`, `updateAIConnection`, `testAIConnection`, and `deleteAIConnection`. | Read `integrations.read`; mutations `integrations.manage`. Credential fields are OpenAPI `writeOnly`: never render credentials in read data, logs, storage, or errors; clear the input after submit/close; demo accepts only synthetic `demo-` values and does not connect to a real provider. Preserve adapter/model/capability, endpoint policy, version, and delete-in-use constraints. |

Both routes declare loading, empty, error, forbidden, stale/offline, success, command-unknown, and capability-unavailable states. `tests/fe019.spec.ts`, `tests/ui008-integration-empty.spec.ts`, and route empty/error/permission suites already cover the relevant source-map, synthetic secret, and route-state invariants. W19 is a spacing-only migration; no route, operation, permission, state owner, credential behavior, or mock response change is in scope.

## Layout contract before source edit

- R29: preserve the channel card hierarchy, warning/capability wrapping, connect/health/reconnect/disconnect actions, empty state and reason dialog. Use shared page/header, surface inset/content, notice and action roles; do not place a Page token in settings.
- R30: preserve provider card and capability rows, responsive one/two-column layout, empty state, create/edit forms, write-only key helper, and delete dialog. Use shared page/header, grid gutter, surface inset/content, form field/group, notice, action and dialog roles; secret/helper text must wrap and remain visible.
- Use the existing semantic `layoutSx` bridge only. Panel owns its body inset; remove consumer padding where that same inset is selected. Do not add a local scale, arbitrary inline spacing or exception.
- Breakpoints are mobile `<768`, tablet `768–1279`, desktop `≥1280`; capture at 390×844/1280×900; viewport regression spans 320/390/768/1280/1440 and dialogs 320/390/1280.

The pre-edit checker report is [W18 post-migration layout inventory](../W18/layout-after-spacing-current-20261006.json): 207 findings across the source, 13 owned by Integrations. Only these owner findings may change; the post-scan must show 0 Integrations findings, no new findings, and no identity/count changes outside this module.

## Paired browser baseline

[Before render artifact](render-before-spacing-current-20261006.json) was captured against the source SHA above before any W19 React edit. It contains 12 Chromium observations: R29 seeded channel card, disconnect confirmation, and synthetic empty state; R30 provider list, edit-secret dialog, and create-secret dialog at 390×844 and 1280×900. Capture made zero API writes and recorded zero page errors or horizontal overflow. All captured dialogs were in-bounds: 326 px wide at 390 px and 768 px at 1280 px. PNGs are retained as `before-*` in this directory.

Contract provenance: route/action/state IDs from `route-manifest.json`; operation permissions and write-only credential schemas from `openapi.json`; visual roles/scale from `design/tokens.json` and `shared/ui/layout.ts`; behavior tests and synthetic fixtures from the existing Frontend tests and MSW. No HTML prototype or live provider is used as implementation input.
