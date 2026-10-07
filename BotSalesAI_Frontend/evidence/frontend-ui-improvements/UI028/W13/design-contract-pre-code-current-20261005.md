# UI028.W13 — Procurement pre-code design contract

**Status:** drafted before W13 source edits. **Routes:** R44–R47. **Owner:** `apps/web/src/modules/procurement/index.tsx`; shared layout roles are owned by `apps/web/src/shared/ui/layout.ts`.

## Surface and hierarchy

- R44 `/s/:shopId/suppliers`: page title/action, supplier collection, then supplier-offer collection; create/edit supplier, change status, and add-offer dialogs.
- R45 `/s/:shopId/replenishment`: title, two existing tabs (suggestions and SKU rules), lookup completeness/errors, suggestion table, rule form/table.
- R46 `/s/:shopId/purchases`: purchase collection, draft dialog with supplier/offer lookups and line items, purchase detail and status/action confirmation dialogs.
- R47 `/s/:shopId/receipts`: receipt collection and receipt-draft dialog with confirmed-PO lookup and accepted/rejected quantity lines. The clean demo seed has no enabled receipt-detail row; verify the detail/post flow with the existing FE022 synthetic journey rather than inventing a baseline record.

The shell owns the page gutter (16px mobile / 24px desktop). The module owns only relationships among its page-local surfaces and fields. Keep collection tables under the shared `Panel`/`Toolbar`/`DataTable`/`Pager` owners; do not wrap or inset their table a second time.

## Role map before JSX/style changes

| Relationship | Existing semantic role | Intended use |
|---|---|---|
| Page heading to first collection | Shared `PageHeader` behavior | Keep existing shared owner |
| Supplier collection to offer collection | `layoutSx.surface.sectionBefore` | One 16px section separation; retain current pre-existing `beforeGap="section"` change |
| Tabs to selected panel | `layoutSx.page.sectionAfter` | 24px before tab content; no tab/route/state change |
| Vertical fields and dialog form groups | `layoutSx.form.fieldGap` | 16px field sequence in supplier/status/offer/rule/purchase/receipt forms |
| Related compact field/action row | `layoutSx.form.inlineGap` | 8px inline relationships, wrapping at narrow widths |
| Row actions and retry controls | `layoutSx.actions.inlineGap` or `layoutSx.form.inlineGap` by intent | 8px with wrap; keep action order and permission behavior |
| Lookup/filter tool rows | `layoutSx.toolbar.controlGap` / `layoutSx.form.inlineGap` | Shared spacing for controls and retry/error clusters |
| Inline line-item surface inset | `layoutSx.surface.inset` | 16px; border and radius remain separate existing visual roles |
| Query/detail state sequence | `layoutSx.query.stateGap` | 16px between state/detail blocks |

No new spacing role is expected. If source review finds a relationship with no semantic owner, stop and add a documented shared role before consuming it; do not create a procurement-local map.

## Invariants to preserve

- R44–R47 paths, operation IDs, permission gates, query keys, pagination cursors, modal/draft state, and module boundary remain unchanged by W13 layout work.
- Preserve supplier approval gating, offer MOQ/pack-size validation, reorder scope by SKU+warehouse, purchase approval/version/intent and unknown-send lockout, and receipt version plus accepted/rejected quantity semantics.
- UI uses the current local synthetic MSW demo only. Baseline and after captures submit no write command.
- Cover 390×844 and 1280×900 paired renders for each route and available representative form/dialog state. Route layout tests cover 320/390/768/1280/1440px; Chromium and Firefox. Inspect page width, table containment/scroll, dialog bounds, readable labels and wrapped actions. Validate receipt-detail/post behavior in the existing FE022 synthetic journey because the pristine seed exposes no enabled detail row.
- SPC-045: compare finding identity by file/property/normalized value/code/multiplicity; W13 must add none and reduce all Procurement-owned findings in this file. SPC-046: inspect the actual source diff against the theme/token roles; do not claim a visual-token checker until W26–W27.

## Current checkout provenance

At contract time, the module already had staged and unstaged changes. This contract and all baseline captures describe that exact current working-tree file, SHA-256 `3d867f8bb960470bee8ac95bcda54de7137f311ee8cc690592faeec69a5e034d`. Those existing staged/unstaged changes are preserved; W13 will touch only the remaining UI layout declarations after the immutable baseline is captured.
