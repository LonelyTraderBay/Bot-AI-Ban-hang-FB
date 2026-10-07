# UI028.W11 — Orders pre-code design contract

Captured before W11 spacing edits on the current checkout. The existing staged and unstaged Orders changes are part of this measured starting point; this task will preserve them and only alter layout-role consumption needed for W11.

## Scope and routes

- Canonical scope: `apps/web/src/modules/orders/index.tsx`, route IDs R17, R18, R19 and R43 from `botsales-kit/contracts/route-manifest.json`.
- Profiles: collection/table for R17 and R43; draft form for R18; detail/actions for R19; modal form for return request and inspection.
- Representative render sizes: Chromium 390×844 and 1280×900; the focused responsive regression also covers 320, 768 and 1440 CSS px where existing order acceptance applies.
- Theme authority: `botsales-kit/design/tokens.json` and the existing single MUI theme. Reuse `layoutSx`/`Panel`/`Toolbar`/`DataTable`/`Pager`/`DetailLine`/`EditDialog`/`ConfirmDialog`; add a bridge role only if an actual semantic relationship has no existing owner.

## Container and spacing ownership

| Route/surface | Parent owner | Child owner | Intended shared roles |
|---|---|---|---|
| R17 Orders list | Page owns responsive gutter and page-header/action spacing | Panel owns surface inset; Toolbar owns search/control inset and gap; DataTable/Pager own table and paging geometry | `page.gutter`, `pageHeader.afterGap/actionsGap`, `toolbar.inset/controlGap`, `surface` roles, shared table CSS, `pager` roles |
| R18 Draft create/edit | Page form stack owns section rhythm | Panel owns header/body inset; form stack owns field/group gaps; row stack owns inline relationship | `page.sectionGap`, `surface` roles, `form.fieldGap/groupGap/inlineGap`, `field.hintGap`, `actions.beforeGap` |
| R19 Order detail | Page owns gutter/header; detail grid owns column gutter | Panels own body inset; detail rows use shared detail role; action groups own wrapping/gap; dialogs own viewport/inset/action spacing | `page.gutter`, `pageHeader.afterGap`, `grid.gutter`, `surface`, `detail`, `actions`, `dialog` |
| R43 Returns | Page owns gutter/header; list panel owns surface | Toolbar/table/pager own their respective spacing; return and inspection dialogs own form field and action gaps | `page`, `surface`, `toolbar`, shared table CSS, `pager`, `form.fieldGap`, `dialog` |

No ancestor and descendant may both apply the same surface inset. Do not create a second theme, route-local spacing map, spacing-shaped `sx`, or literal values to compensate for a missing role. Typography, color, radius, shadow, and focus continue to use existing theme/token variants.

## Behavior and content invariants

- R17 keeps order, fulfillment and payment states distinct; URL filter, row detail navigation and pagination remain unchanged; no unsupported bulk action is introduced.
- R18 keeps remote customer/product lookup, selected IDs, address-preview/demo label, quantity validation, draft persistence and error state. Saving a draft does not reserve stock or recognize revenue.
- R19 keeps server `allowedActions`/permissions, order version and expected-version commands, quote expiry, customer evidence and confirmation gating, payment/refund evidence dialogs and focus behavior.
- R43 keeps order selection/search/paging, returned-quantity validation, inspection `expectedVersion`, and separation of return inspection from refund or inventory restock.
- Preserve wrapping for long IDs, error/helper text, narrow screens and dialogs; do not hide or truncate required state to meet a spacing target.

## Pre-edit acceptance evidence

Before changing Orders source, capture immutable baseline checker findings for the exact file and source hashes, and Chromium measurements/screenshots for R17/R18/R19/R43 at both representative viewports. After editing, use the same routes, mock mode, browser and viewport; compare layout findings by `(file, property, normalized value, code, multiplicity)` under SPC-045. Target: no new finding, zero remaining finding in the touched Orders file, no horizontal page overflow/page errors, preserved workflow behavior, and explicit separate UI/ARCH verdicts. Strict global scan may remain red only for the already assigned W12–W25 debt; report its exact after count without calling it PASS.
