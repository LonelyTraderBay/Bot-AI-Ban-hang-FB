# UI028.W20 Notifications — contract and baseline before spacing edits

Date: 2026-10-06  
Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`; routes R39/R40 only.  
Status: canonical route/operation contract and source intake are recorded before changing the Notifications module.

## Immutable inputs and source intake

| Input | SHA-256 / observed state |
|---|---|
| `apps/web/src/modules/notifications/index.tsx` | `b5b78947f8d0b370ec66adef252ee0bdd25ef1dd2967f1aab2a661da02774bc8` |
| `apps/web/src/modules/notifications/push-capabilities.ts` | `5afb7d25417142b10f9df582062ff0103b17e89514af11db2f6138093259ff0a` |
| `botsales-kit/contracts/route-manifest.json` | `360871c008fac723cfc77dec79417838d24d4fae844452909eb347ec8893f2b2` |
| `botsales-kit/contracts/openapi.json` | `d88a70957a9de36402ff5ac0cb757a2f1c496519c7e1fd2e28df17e867f78c7c` |
| `UX-CONTRACT.md` | `da010abf3cf9ba37fd3ad9f7ee3ee201adf985d8a84c3fef2ff7469b5d2e72f2` |
| `botsales-kit/design/tokens.json` | `b4083eb2032d9ebac7f1f793f3aae1cda6a30e075b0dd9e19f241567651d1895` |
| `apps/web/src/shared/ui/layout.ts` | `02365c3c7fcb50c60707d3a4cb205537a7ed4dbd8a9975bf8a4fb80e00de9b06` |
| Intake Git state | `apps/web/src/modules/notifications/index.tsx` was already staged (`M `) before W20. The working-tree SHA above is the pre-edit baseline; preserve staged content and change only spacing ownership. |

The immediately preceding strict report is [W19 post-migration inventory](../W19/layout-after-spacing-current-20261006.json): 194 findings remain, 25 owned by Notifications. W20 may remove only those owner findings; the final scan must show zero Notifications findings, no new finding, and no identity/count change outside this module.

## Canonical behavior and ownership

| Route | Canonical route intent and operations | Permissions / constraints retained |
|---|---|---|
| R39 `/s/:shopId/notifications` — `FR2-R39` | Reads `listNotifications`, `getNotification`; acknowledges with `acknowledgeNotification`. | Read `notifications.read`; acknowledge `operations.claim`. Keep sent/opened/acknowledged as distinct evidence; order links stay in the active shop; a notification does not itself prove that work was accepted. |
| R40 `/s/:shopId/notifications/devices` — `FR2-R40` | Reads `listDevices`, `getNotificationPolicy`; actions use `createDevice`, `revokeDevice`, `testDevice`, `beginTelegramPairing`, `updateNotificationPolicy`. | Read and mutations follow manifest `notifications.manage`; versioned mutation and policy bounds stay intact. Demo registration/testing/pairing remains synthetic and must not request OS permission, register a Service Worker, send actual Push/Telegram, or claim delivery. Live Push permission is requested only after a user action and only after capability/security checks. |

Both routes declare loading, empty, error, forbidden, stale/offline, success, command-unknown, and capability-unavailable states. Existing coverage in `tests/fe019.spec.ts`, `tests/states/route-empty-composition.spec.ts`, and `tests/vertical-slices` verifies route/operation mapping, notification order/acknowledgment semantics, synthetic Push boundaries, and error/empty behavior. W20 changes spacing only; state ownership, API calls, shop scope, role checks, event evidence and browser capability behavior must remain unchanged.

## Layout contract before source edit

- R39: keep the Toolbar and notification cards readable on mobile; preserve safe message copy, status, timestamp, acknowledgment evidence and actions. Use shared surface/content/action roles; do not collapse delivery status into acknowledgment.
- R40: preserve device rows, register/test/revoke actions, Telegram placeholder and the full policy form. Use shared page/grid, surface inset, form field/group, action, notice, detail, and dialog roles. Multi-select and time inputs must wrap or stack within their pane; the live protection notice remains after both columns.
- Use existing semantic `layoutSx` roles and `Panel bodyMode` ownership. Do not add module-local spacing maps, raw consumer spacing, or an exception. Preserve route and data owners in the Notifications module.
- Breakpoints are mobile `<768`, tablet `768–1279`, desktop `≥1280`; baseline captures at 390×844/1280×900; route regression spans 320/390/768/1280/1440 and dialogs 320/390/1280.

The [pre-edit render artifact](render-before-spacing-current-20261006.json) was captured before any W20 source edit. It contains eight Chromium observations: R39 seeded list/empty and R40 device-policy/revoke dialog at 390×844 and 1280×900. The capture made zero API writes, logged zero page errors, and had no horizontal overflow; dialog bounds are recorded in the JSON. Screenshots are retained as `before-*`. The separate failing first harness attempt was resolved by setting the synthetic empty state through the same in-memory MSW helper used by the existing browser suite; the successful retry is [capture-before-spacing-retry-current-20261006.log](capture-before-spacing-retry-current-20261006.log).
