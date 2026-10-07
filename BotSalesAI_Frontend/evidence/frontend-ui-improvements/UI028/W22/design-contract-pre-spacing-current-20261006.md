# UI028.W22 Workspace — contract and baseline before spacing edits

Date: 2026-10-06  
Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`; routes R01, R02, R03, R32, R33, R34, R35, and R36.  
Status: canonical route/action contract, source intake, profile references, layout baseline, and paired pre-edit renders are captured before changing `workspace/index.tsx`.

## Immutable inputs and source intake

| Input | SHA-256 / observed state |
|---|---|
| `apps/web/src/modules/workspace/index.tsx` | `a59f54d27b4973fd8e015b129e1756748ba325cf85e99a35c636623f773cd43d` |
| `botsales-kit/contracts/route-manifest.json` | `360871c008fac723cfc77dec79417838d24d4fae844452909eb347ec8893f2b2` |
| `botsales-kit/contracts/openapi.json` | `d88a70957a9de36402ff5ac0cb757a2f1c496519c7e1fd2e28df17e867f78c7c` |
| `UX-CONTRACT.md` | `da010abf3cf9ba37fd3ad9f7ee3ee201adf985d8a84c3fef2ff7469b5d2e72f2` |
| `botsales-kit/design/tokens.json` | `b4083eb2032d9ebac7f1f793f3aae1cda6a30e075b0dd9e19f241567651d1895` |
| `apps/web/src/shared/ui/layout.ts` | `02365c3c7fcb50c60707d3a4cb205537a7ed4dbd8a9975bf8a4fb80e00de9b06` |
| `apps/web/src/shared/ui/components.tsx` | `66be880a201fe2a490a21b8332fbe6be934d12a2339d48632e519ff624834301` |
| `docs/FRONTEND_SPACING_STANDARD.md` | `e720077770d309ad9f6c6e50118a42fb4bfe9067d0c3e87da59e306d47b22618` (SPC-001–048) |
| Intake state | The workspace owner file already contained user work before W22. Its recorded SHA is the pre-edit baseline; preserve all current behavior and only migrate spacing ownership. |

W21 final strict report is the W22 starting inventory. W22 is allowed to remove only findings owned by `apps/web/src/modules/workspace/index.tsx`; final comparison must show zero workspace findings, zero additions, and unchanged identity/count outside this owner. Do not suppress, relocate, reclassify, or add exceptions to hide a finding.

## Canonical route, operation, and state contract

| Route | Canonical behavior and protected invariants |
|---|---|
| R01 `/login` — `FR-001` | Reads `getCsrfToken`; action `beginLogin`. Keep the mock label, safe internal `returnTo`, loading/error states, and do not enter real credentials or perform provider login. |
| R02 `/workspaces` — `FR-002` | Reads `listShops`, `getSession`; no action. Shop selection remains membership-scoped; do not show another shop's data or silently fall back after membership revocation. |
| R03 `/onboarding` — `FR-003` | Reads `getSession`; action `createShop`. Preserve the shop name, base currency and timezone inputs and the warning that real policies/connections do not activate. |
| R32 `/s/:shopId/settings/team` — `FR-032` | Reads `listMembers`, `getMember`; actions `inviteMember`, `updateMemberRoles`, `revokeMembership`; `members.manage`. Preserve ETag/version guards, role/permission preview, owner-last invariant, permission revocation, and secret-safe behavior. |
| R33 `/s/:shopId/settings/shop` — `FR-033` | Reads `getShop`; action `updateShop`; `shop.manage`. Preserve read-only currency/default warehouse/policy version and timezone preview semantics. |
| R34 `/s/:shopId/settings/audit` — `FR-034` | Reads `listAuditEvents`; `audit.read`; read-only. Preserve sanitization, shop scope, filters/cursor, timezone display, and truthful DTO limitations. |
| R35 `/s/:shopId/settings/privacy` — `FR-035` | Reads `getPrivacyPolicy`, `listPrivacyRequests`, `getCommand`; actions `updatePrivacyPolicy`, `createPrivacyRequest`, `stepUp`, `approvePrivacyRequest`; `privacy.manage`. Preserve draft/approved separation, step-up, legal-hold/authority constraints, and honest job/deletion status. |
| R36 `/s/:shopId/jobs/:jobId` — `FR-036` | Reads `getJob`; `jobs.read`; read-only. Preserve unknown progress totals, scoped access, safe download handling, and distinction between accepted and completed. Baseline uses `missing-job`, the existing canonical empty/error route fixture; the seed `jobs` collection is empty, so no command is submitted to manufacture a success state. |

All routes preserve the manifest's loading, empty, error, forbidden, stale/offline, success, command-unknown, and capability-unavailable states where applicable. W22 changes layout ownership only: no operation, permission, state, API/mock data meaning, query key, module boundary, or external-provider behavior changes.

## SPC-048 profile references and layout contract

| Route/profile | Reference used before coding | Layout invariants to compare |
|---|---|---|
| R01 auth; R03 onboarding form | R01 uses the documented auth profile and existing `AuthCard` composition. R03 has no migrated route with the same auth/setup form composition; use the semantic auth/form baseline in [SPC-048 §13.3](../../../../docs/FRONTEND_SPACING_STANDARD.md#133-mẫu-đối-chiếu-profile-để-ngăn-lệch-giữa-các-màn-cùng-loại), and compare the shared auth shell to R01. | Centered auth container, content hierarchy, input/action sequence, readable mobile width; shared spacing roles only. |
| R02 shop selection | Documented collection/selection profile; no already-migrated route has the same shop-picker/card-selection behavior. | Container width, card grid, shop identity/role hierarchy, primary selection action, responsive column change. Any new shared variant needs a workflow rationale. |
| R32 team management | Migrated R38 approvals collection/table and shared `Toolbar`/`DataTable`/`Pager` roles. | Header/action hierarchy, filter/table grouping, row-action wrapping, invite/edit/confirm dialog inset and focus. |
| R33 shop settings | Migrated R40 notification policy/settings profile. | Form section grouping, field/action roles, read-only values, warning placement, timezone preview feedback. |
| R34 audit collection | Migrated R38 approvals collection/table profile; it shares the toolbar → `DataTable` → pager composition. | Filter/search hierarchy, dense table legibility, long sanitized summary wrapping, pagination and empty/error states. |
| R35 privacy settings + requests | R40 settings profile plus R38 queue/reason/dialog pattern. | Policy draft grouping, request table, step-up/approval dialog boundaries, long reason wrapping and legal-hold status hierarchy. |
| R36 job detail | R14 import-result/detail is a reference for the shared detail shell and result hierarchy. The canonical `missing-job` fixture renders the error state, so success/progress details are not claimed as observed on R36. | Shared PageHeader/QueryState hierarchy, scoped not-found message and error state; the R14 comparison applies only to common detail-shell spacing. |

Breakpoints: mobile `<768`, tablet `768–1279`, desktop `≥1280`. Before screenshots and matching after screenshots use Chromium at `390×844` and `1280×900`; responsive behavior tests additionally use 320/390/768/1280/1440 widths. The captures perform route reads only and observe API writes/page errors/overflow. Every after-state is compared to its paired route/state/viewport. Visual values remain sourced from canonical theme/tokens; `VISUAL_SOURCE_REVIEW` is required under SPC-046. Profile consistency under SPC-048 is reviewed through the task evidence and is not an automated gate.

## Shared role additions planned before consumer edits

The current semantic bridge has no suitable role for the existing 12px auth mark/wordmark relation, 32px gap from that row to the title, or compact 12px inset/8px flow inside nested setup checklist items. Add only these typed shared roles before consumer use:

| Shared role | Token-derived value | Consumer / reason |
|---|---|---|
| `layoutSx.auth.brandMarkGap` | `space.md` = 12px | Keep the existing AuthCard logo/wordmark grouping without a local 1.5 factor. |
| `layoutSx.auth.brandTitleGap` | `space.xxl` = 32px | Preserve the auth brand-to-title relation through the auth profile owner. |
| `layoutSx.surface.compactInset` | `space.md` = 12px | Compact nested setup checklist items; main surfaces continue using `surface.inset` 16/24. |
| `layoutSx.surface.compactContentGap` | `space.sm` = 8px | Compact list rhythm for setup checklist rows; not used for general form spacing. |

The auth surface inset already maps to 24/32 and the form/card/page roles already cover the remaining layout. No alias, route-local spacing map, token change, exception, or generic style forwarding is part of this migration. Recheck all consumers of these shared roles before changing their values.

## SPC-048 reference audit correction

The first comparison draft selected R17 as the R03 form reference and R20 as the R34 collection reference. The captured route evidence showed these classifications were wrong: R17 is the orders collection, and R20 is a cash-flow summary without the collection/table composition. Those routes are not used as profile evidence. R03 now uses the semantic auth/form baseline in SPC-048 §13.3 (with R01 only for the shared auth shell); R34 uses R38 because its toolbar, table, and pager composition matches. The reference check was completed before W22 closure; it did not change React behavior or API/mock semantics.
