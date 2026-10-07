# UI028.W21 Operations — contract and baseline before spacing edits

Date: 2026-10-06  
Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`; routes R37, R38, and R52.  
Status: route/permission/operation contract and current source intake are recorded before changing the Operations module.

## Immutable inputs and source intake

| Input | SHA-256 / observed state |
|---|---|
| `apps/web/src/modules/operations/index.tsx` | `f228f311285d9361ea9ba5a0117b8d03a6d02e00edf1baffddeba647ec4a59ba` |
| `botsales-kit/contracts/route-manifest.json` | `360871c008fac723cfc77dec79417838d24d4fae844452909eb347ec8893f2b2` |
| `botsales-kit/contracts/openapi.json` | `d88a70957a9de36402ff5ac0cb757a2f1c496519c7e1fd2e28df17e867f78c7c` |
| `UX-CONTRACT.md` | `da010abf3cf9ba37fd3ad9f7ee3ee201adf985d8a84c3fef2ff7469b5d2e72f2` |
| `botsales-kit/design/tokens.json` | `b4083eb2032d9ebac7f1f793f3aae1cda6a30e075b0dd9e19f241567651d1895` |
| `apps/web/src/shared/ui/layout.ts` | `02365c3c7fcb50c60707d3a4cb205537a7ed4dbd8a9975bf8a4fb80e00de9b06` |
| `apps/web/src/shared/ui/components.tsx` | `66be880a201fe2a490a21b8332fbe6be934d12a2339d48632e519ff624834301` |
| Intake Git state | `apps/web/src/modules/operations/index.tsx` was already dirty before W21. The working-tree SHA above is its pre-edit baseline; preserve the existing staged/unstaged work and change only spacing ownership. |

W20's final strict report is [the W21 starting inventory](layout-before-spacing-current-20261006.json): 169 source findings, 30 owned by Operations. W21 may remove those owner findings only. The final comparison must show zero Operations findings, zero new findings, and unchanged identity/count outside this module.

## Canonical route and behavior contract

| Route | Canonical operations | Permissions and invariants retained |
|---|---|---|
| R37 `/s/:shopId/operations` — `FR2-R37` | Reads `getOperationsSummary`, `listWorkItems`; actions `claimWorkItem`, `updateWorkItem`. | Read `operations.read`; claim `operations.claim`; update `operations.manage`. One WorkItem per business intent; assignment, dependencies, due time, status, and evidence stay linked. Commands remain version/policy guarded; unknown is distinct from failure and stale/offline work is not blindly retried. |
| R38 `/s/:shopId/approvals` — `FR2-R38` | Reads `listApprovals`, `getApproval`; action `decideApproval`. | Read `approvals.read`; decide `approvals.decide`. Decision stays bound to shop/action/resource version/policy version/intent hash/expiry. Reject requires a reason; expired, changed, or replayed approvals remain ineligible; batch results explain stale rows. |
| R52 `/s/:shopId/operations/digests` — `FR2-R52` | Reads `listDigests`, `getOperationsSummary`; action `controlAutomation`. | Read `operations.read`; pause/resume capability `bot.pause`. Digest periods stay shop/timezone scoped. Unknown/down/stale health and readiness remain distinct; missing restore or deploy evidence cannot be rendered as verified/green. The local demo does not prove worker health, durable delivery, provider operation, restore, or release readiness. |

All three routes declare loading, empty, error, forbidden, stale/offline, success, command-unknown, and capability-unavailable states. W21 changes spacing ownership only; do not edit API operations, permission gates, approval reasons/drafts, selected rows, command versioning, readiness truth, or synthetic data semantics.

## Layout contract before source edit

- Reuse shared semantic roles for page/header flow, stats, surface inset, content groups, forms, notices, action groups, table detail, and dialogs.
- R37 work/exception cards keep assignment, urgency, status/evidence, and actions legible; nested cards must not accumulate a second panel inset.
- R38 approval cards, selection/decision controls, required reason, delegated-access preview, and stale/expired explanations keep their current grouping and interaction order.
- R52 digest/status/restore/readiness summaries preserve separation between measured mock state and backend-only proof; summary cards use one owner per inset.
- Breakpoints: mobile `<768`, tablet `768–1279`, desktop `≥1280`; capture defaults at 390×844/1280×900 and regression checks 320/390/768/1280/1440.

Before screenshots must be captured from the current working source before any W21 edit. Paired after captures must use the same route, state, browser, and viewport. Capture only performs route reads; do not submit claim/update/approval/control commands.
