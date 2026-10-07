# Whole-route spacing-role audit — 2026-10-07

## Scope and baseline before source edits

- Canonical route manifest: 54 route entries. The source audit found 52 distinct exported page components across the 16 feature modules; repeated route entries map to shared page components.
- Current semantic composition gate before this task: `node scripts/check-ui-composition.mjs` — PASS, 74 source files, 0 findings. The gate did not resolve local components that return a `Panel`.
- Render baseline: `/s/shop-demo/shipments` in the local mock UI. The user-provided screenshot and a live CUA capture both show the shipping preview panel ending at the same boundary where the shipment-list panel starts.
- User baseline image: [`baseline-user-shipments.png`](baseline-user-shipments.png), SHA-256 `267b450135e24cac7f9815a6b85d6301726a1f830b03f5c7281ea76e1c7f520b`.
- Source baseline hashes: `apps/web/src/modules/fulfillment/index.tsx` `8e292f70195d3f65c62f9a81d0cad8ec44ad677526e2fb59af59bed9e6fbfc17`; `scripts/check-ui-composition.mjs` `cb24a677521ac8d0fb83f846c99255f4f0584e7fb4352e2584952ca58c7e413a`; `tests/ui-composition-checker.test.mjs` `efbdd1f3881e503606158a5649cabd0041643f6912d5ff8c7e703528b62425cc`.

## Confirmed finding

`ShipmentsPage` conditionally renders `ShippingQuotePreview` (whose root is a `Panel`) or the non-mock fee panel, then renders the shipment list in another `Panel`. The two sibling surfaces have no `PageSections` owner or explicit section boundary. The prior checker only inspected direct `<Panel>` siblings, so it missed the local wrapper. The user's screenshot and the live route both reproduce the zero-gap boundary.

The source audit also examined mutually exclusive branches in `ReplenishmentPage`; those alternatives do not render together and are not a spacing defect.

## Contract and invariants

Use `PageSections` to own the 24px `page.sectionGap` between the fee-preview section and shipment-list section, consistent with SPC-060/061 and the existing shared API. Preserve mock/non-mock branches, route, query/data, table columns, dialogs, permissions, and shipment actions.

Extend the existing composition gate to resolve a local component's finite JSX root when checking sibling section boundaries. Add negative and positive regression fixtures for a wrapped panel and a correctly grouped section. Do not add a new spacing scale or route-level margin override.

## Final audit and verification

The route/source reconciliation covered all **54 canonical routes**, **52 distinct exported page components** in 16 feature modules, and the strict composition scanner's **74 source files**. The scanner now follows local component root output through conditional branches and recognizes the existing `PageSections` and documented dashboard section-grid owners. That caught the hidden `ShippingQuotePreview -> Panel` boundary in Shipments. It also correctly treats the two Replenishment tab panels as mutually exclusive and accepts the documented Dashboard grid owner; neither needed a spacing patch.

Four affected route families now use the shared semantic owners: Approvals, Notification devices, Profit & loss, and Shipments. This task's Shipments correction wraps the conditional fee-preview/fallback panel and the shipment-list panel in `PageSections` for the contract's 24px section rhythm. No consumer-level margin, new token, spacing scale, generated contract, route, API, or business behavior was introduced or changed.

The live local mock browser was reviewed again on `/s/shop-demo/shipments` at approximately 822×875. The fee-preview and shipment-list panels are visibly separated by the section gap after the correction. This is a rendered spot check of the reproduced defect; the all-route assessment is the source/component audit and gate, not a claim that all routes were manually browser-reviewed. The full Chromium/Firefox E2E suite was not run for this follow-up.

`npm.cmd run verify` exited 0 using the process-scoped Windows PATH adjustment. The run passed generator checks (11 outputs, 283 schemas, 210 operations, 54 routes); source checks (68 files, 220 API references, 54 routes); boundaries (504 imports, 10/10 negative fixtures); lint and TypeScript; domain/MSW (88/88); unit tests (136/136); production build; layout tests (82/82 and 76 files/0 findings); visual-token tests (5/5 and 75 files/0 findings); composition tests (37/37 and 74 files/0 findings); and evidence validation (11/11 plus S17 PASS). The captured full log is [`verify-current-20261007.log`](verify-current-20261007.log), SHA-256 `8b6e84f46b904149a0c8c45b6b1365224088fe667315d05a1455c23d0971e699`. The focused combined composition log is [`composition-suite-current-20261007.log`](composition-suite-current-20261007.log), SHA-256 `c3a602dcf58b5d46fb351c66dbfc503c3ea519f73a880c7d5dc2276b6dfb9099`.

The local UI uses in-memory synthetic data. This verifies frontend layout and source contracts only; it does not establish live Backend, hosted CI, production, or owner acceptance.
