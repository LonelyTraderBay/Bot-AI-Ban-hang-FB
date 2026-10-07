# UI028.W12 — Inventory layout contract (pre-code)

Date: 2026-10-05. Scope: React/TypeScript presentation in `apps/web/src/modules/inventory/index.tsx`; routes R15 `/s/:shopId/inventory` and R16 `/s/:shopId/inventory/movements`. No contract, route, permission, API, query key, command, seed, or mock/live behavior changes.

## Layout contract

| Region | Owner/profile | Existing behavior to preserve | Semantic spacing target |
|---|---|---|---|
| Page edge/header | Shell owns page gutter and `PageHeader` owns its title/actions | 16 px mobile / 24 px from 768 px; route title and sibling route link stay visible | No module-level page inset |
| Inventory policy notice | Page-level notice before collection surface | Snapshot policy and default warehouse remain complete | Existing 24 px after-gap maps to `layoutSx.page.sectionAfter` |
| Filter controls | Filter component owns fields; action group owns Apply/Clear spacing | URL filter values remain editable; Apply/Clear preserve unrelated query params and clear cursor | Field cluster 16 px; Apply/Clear 8 px; group separation owned once |
| Collection panel | Shared `Panel`/`Toolbar`/`DataTable`/`Pager` own their slots | Table overflow stays inside the named data region; table values, permission-gated links/actions, count and page remain unchanged | Flush collection profile; no extra panel inset |
| Adjustment dialog | Shared `EditDialog` owns viewport/inset/actions; form owns field gap | Validation, hidden cost permission, optimistic version, draft values and command recovery remain unchanged | Form field gap 16 px via `layoutSx.form.fieldGap` |
| Movement collection | Shared collection components own toolbar/table/pager | `kind`, `variantId`, `warehouseId`, search, cursor, source links, permission visibility and movement values remain unchanged | Same flush collection profile as R15 |

Responsive probes: 320, 390, 768, 1280, 1440 CSS px; modal bounds at 390 and 1280; heights 844/900. States: success collections on R15/R16, adjustment dialog with invalid synthetic draft, query filters including unrelated query state. Required checks: no document-level horizontal overflow; page gutter matches Shell; long labels/actions stay available; table may scroll only inside the shared table region; dialogs remain in viewport.

## SPC-046 interim source review

Before-source hash and paired captures are recorded in `render-before-source-edit-current-20261005.json`. The file currently has semantic MUI palette references (`warning.main`, `text.primary`, status tokens) and two existing numeric `fontWeight` values (`650`, `750`) for SKU/available stock emphasis. W12 must not add or spread new typography/color/radius/elevation literals; those two pre-existing values are recorded as existing owner debt for the later SPC-046 inventory, not represented as token-compliant or automated-clean. No noncanonical palette/radius/elevation/focus/breakpoint value will be introduced.
