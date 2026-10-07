# UI028.W23 Dashboard — contract and baseline before spacing edits

Date: 2026-10-06  
Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`; route R04 `/s/:shopId/overview`.  
Status: canonical route/action/state contract and source intake recorded before changing `dashboard/index.tsx`; baseline captures are stored separately and will not be overwritten.

## Immutable inputs and source intake

| Input | SHA-256 / observed state |
|---|---|
| `apps/web/src/modules/dashboard/index.tsx` | `138c3893afa1d347cdc95cfb0823dd4f110e1224308a6b24e7daa84c4180d688` |
| `botsales-kit/contracts/route-manifest.json` | `360871c008fac723cfc77dec79417838d24d4fae844452909eb347ec8893f2b2` |
| `botsales-kit/contracts/openapi.json` | `d88a70957a9de36402ff5ac0cb757a2f1c496519c7e1fd2e28df17e867f78c7c` |
| `UX-CONTRACT.md` | `da010abf3cf9ba37fd3ad9f7ee3ee201adf985d8a84c3fef2ff7469b5d2e72f2` |
| `botsales-kit/design/tokens.json` | `b4083eb2032d9ebac7f1f793f3aae1cda6a30e075b0dd9e19f241567651d1895` |
| `apps/web/src/shared/ui/layout.ts` | `6970c56454d90b6e07b1614962f1c12bb7b095328bb5a8ad96b38163f2f273ee` |
| `apps/web/src/shared/ui/components.tsx` | `66be880a201fe2a490a21b8332fbe6be934d12a2339d48632e519ff624834301` |
| `docs/FRONTEND_SPACING_STANDARD.md` | `7d0a9b97422e74e601b8ff583c8b576a28d8f3557cf152ceffa02d4983aeac67` (SPC-001–048 with semantic profile baseline table) |
| Strict intake | W22 final report: 102 findings total, 36 owned by this dashboard module. |

The source file already includes user work and staged/unstaged changes. Preserve all behavior and edit only spacing ownership in this assigned module. W23 may remove only dashboard-owned findings. Final comparison must show 0 dashboard findings, 0 added findings, and no identity/count changes outside the dashboard owner. Do not modify or stage unrelated work.

## Canonical route/action/state contract

| Route | Contract and protected behavior |
|---|---|
| R04 `/s/:shopId/overview` — `FR-004` | Requires `dashboard.read`; reads `getDashboard` and `getShop`. Shows open conversations, pending orders, low stock, bot status and `asOf`. Revenue/cash appear only with `finance.read`; optional operations/orders/bot sections remain capability-gated. |
| Dashboard action | `pauseBot` requires `bot.publish`; confirmation requires a reason and expected version; command status/unknown state remains truthful. Do not add provider/backend behavior. |
| KPI navigation | Open conversations → inbox, pending orders → orders, low-stock → inventory. Preserve target and shop scope. |
| Edge cases | Null finance values remain restricted/unavailable, never coerced to zero; partial/stale widget failures do not blank unrelated panels; empty/error/forbidden/capability-unavailable states remain explicit. |

Contract source: `route-manifest.json` R04, OpenAPI `getDashboard`/`pauseBot`, shared route/action source and existing MSW fixtures. W23 changes only spacing/layout ownership; it adds no operation, permission, field, state, query behavior or data meaning.

## SPC-048 profile baseline and layout invariants

R04 is the only dashboard-composition route in the current route manifest, and it has not yet been migrated. No existing migrated route is accepted as a same-profile reference. In particular, finance R20 is a cash-flow summary and Reports routes are not dashboard-layout references. Use the semantic **Dashboard/report** row in SPC-048 §13.3 and the existing shared roles as baseline. `Stats`, `Stat`, `Panel`, `DataTable` and `Empty` are shared components/slots; their reuse informs ownership but does not by itself prove another route has the same page profile.

| Region | Invariant before/after |
|---|---|
| Hero | Bounded to page content; headline/greeting and helper copy retain hierarchy; available KPI/CTA links keep permission and route semantics. Shared responsive group inset, no local spacing map. |
| KPI panel | `Stats` owns its card grid/gutter; four metrics and links/status remain readable at mobile and desktop. |
| Supporting panels | Finance summary, recent orders, AI team and bot controls remain independent; use page grid gutter 24 and each titled Panel's shared header/body contract. No duplicate body inset. |
| Breakpoints/content | Follow project mobile `<768`, tablet `768–1279`, desktop `≥1280`; maintain one-column at narrow widths, existing desktop columns and geometry. Page must not overflow; table scroll is internal if present. |
| Primary CTA/focus | Existing action target remains at least 44px; hover/pressed/focus distinction and focus visibility are unchanged. |
| Data/state truth | Keep null amount as unavailable, never zero; retain `asOf`, shop identity, permission gates, partial widget/retry behavior, empty/error/stale states and reason-required bot pause. |

Before/after browser captures will use Chromium at `390×844` and `1280×900` for both the owner/default view and the viewer/no-finance view. Responsive tests additionally use widths 320/390/768/1280/1440. Captures are read-only and record writes, page errors and document overflow. SPC-048 comparison is manual evidence, not an automated gate.
