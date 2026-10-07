# UI028.W16 — Customers pre-spacing design contract, 05/10/2026

## Provenance and scope

- W item: UI028.W16, C03, dependency W09; route owners R07, R08 and R54 only.
- Owner: `apps/web/src/modules/customers/index.tsx`; current module source SHA-256 before W16 edits: `153dd6b93f75d000096aefc2e7ad52788bef2f82255dfdff8956e364ce434493`.
- The Customers source already had staged work at W16 intake. The baseline describes this exact checkout and the W16 spacing-only delta; it does not claim a clean-HEAD or pre-staged-source baseline.
- Canonical source hashes at intake: route manifest `360871c008fac723cfc77dec79417838d24d4fae844452909eb347ec8893f2b2`; OpenAPI `d88a70957a9de36402ff5ac0cb757a2f1c496519c7e1fd2e28df17e867f78c7c`; UX contract `da010abf3cf9ba37fd3ad9f7ee3ee201adf985d8a84c3fef2ff7469b5d2e72f2`; `apps/web/src/mocks/auxiliary.ts` `3bbda57ab9828a03264b90aa67e388c55da2605254b7c76f59b4a2d36b42928c`; `apps/web/src/mocks/seed.json` `fa115cadbe18a035602d1fe1acffe9714b0eaf99354927f99823bf8b6c3d744d`; current shared layout bridge `477166aad27aedc466a7aaa14bd9ff797b287c3955caf749eef3a313aa738adc`.
- No route, API operation, permission, customer state or service-case lifecycle change is in scope. No Backend or provider is added.

## Canonical route/action trace

| Route | Contract operations and permission | UI invariants that must remain true |
|---|---|---|
| R07 `/s/:shopId/customers` | `listCustomers` (`customers.read`); `createCustomer` (`customers.write`) | Search/cursor is shop-scoped; validate fields before create; a successful create navigates to R08; do not merge customers by name or claim duplicate resolution. Masked/absent contacts remain truthful; user text stays plain/sanitized. |
| R08 `/s/:shopId/customers/:customerId` | `getCustomer` (`customers.read`); `updateCustomer` (`customers.write`); related reads `listOrders` (`orders.read`), `listShipments` (`fulfillment.read`) and `listServiceCases` (`customers.read`) | Server/ETag owns update; 412 keeps the draft; redacted fields remain disabled and are omitted from patch; null contact is not replaced with an empty string. Order/shipment previews remain bounded and shop/customer-linked; missing order/shipment permission and partial lists remain explicit. Cases are a limited preview because the API does not offer a customer filter. |
| R54 `/s/:shopId/service-cases` | `listServiceCases` (`customers.read`); `createServiceCase` and `setServiceCaseStatus` (`customers.write`); lookup `listCustomers`; optional `listOrders` only with `orders.read` | Case creation may omit an order; if selected, the order must belong to the chosen customer. Status mutation retains version and reason; pending/error/unknown states remain visible. A case update never represents a refund, return approval or payment. |

OpenAPI operation cross-check at intake: `GET/POST /shops/{shopId}/customers`, `GET/PATCH /shops/{shopId}/customers/{customerId}`, `GET /shops/{shopId}/service-cases`, `POST /shops/{shopId}/service-cases`, and `POST /shops/{shopId}/service-cases/{resourceId}/status`, with `listOrders` and `listShipments` only for the existing linked previews/lookups.

## Layout contract and baseline plan

- Shell owns the page gutter. The R08 two-column composition uses the shared grid gutter; each Panel body owns its inset exactly once. Do not add module-level padding around an already inset Panel.
- Forms use `form.fieldGap`; sections use the appropriate shared page/surface role; compact related shipment items use a semantic compact-detail role only if the existing bridge has no role with the same relationship. Any new role must be typed and defined once in `apps/web/src/shared/ui/layout.ts`, derived from canonical tokens, and justified here before consumer use.
- Preserve narrow-screen wrapping/scroll ownership, long customer/order/tracking IDs, masked contact readability, status/action separation, dialog bounds, and list/lookup cursor behavior. Do not add local typography/color/radius/elevation/focus/breakpoint literals. Existing visual values outside the W16 delta remain legacy debt, not newly certified token-compliant.
- Baseline was captured before W16 source edits for R07 collection/create dialog, R08 masked profile/related summaries, and R54 collection/create/status dialogs at 390×844 and 1280×900. Capture records module source hash, route/state/viewport, geometry, page errors and non-GET requests; existing artifacts are immutable.
- The W15 same-checker report is the W16 pre-migration layout starting point: 266 source findings, including 15 in `customers/index.tsx`. A fresh strict/report-mode result is retained in `layout-before-spacing-current-20261005.json`. W16 must remove all 15 owner findings and introduce zero added finding identity/count anywhere else.
- Responsive regression boundaries: 320, 390, 768, 1280 and 1440 CSS px; mobile/desktop dialog geometry; test only synthetic MSW fixtures. Paired after render must use the same route, state, browser, mock reset and viewport.

## Intended verification

Run the customer layout suite in Chromium and Firefox; existing `fe009` create/detail/privacy and `ui009` scope regressions; route state/permission/keyboard suites affected by this module; source map/operation checks; `test:layout`, generation, source/boundary, lint, typecheck, domain and Vitest. Full `verify` may truthfully end at the strict global spacing scan until W17–W25 clear their assigned debt. Separate UI and ARCH verdicts and explicitly exclude Backend, hosted CI, staging, production and owner acceptance.
