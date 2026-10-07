# UI028.W14 — pre-spacing design contract, 05/10/2026

## Scope and provenance

- Work item: UI028.W14, C03, dependency W09; R41 and R42 only.
- Source owner: `apps/web/src/modules/fulfillment/index.tsx`.
- Source SHA-256 before this spacing migration: `021f2e6ce435a78517ea11c45d7399e950af470b4415befeb9d3ed1cbd1f622f`.
- The module already had staged changes at task intake. This contract captures that exact checked-out source for the spacing-only delta; it does not claim a baseline from before those staged edits. Existing staged changes remain preserved.
- Canonical behavior: `botsales-kit/contracts/route-manifest.json`, `contracts/openapi.json`, `UX-CONTRACT.md`, shared UI, and synthetic MSW flow. No new route, API, permission, or backend behavior is in scope.

## Route and behavior contract

| Route | Reads | Mutations and permissions | Invariants to retain |
|---|---|---|---|
| R41 `/s/:shopId/fulfillment` | `listPrepJobs`, `getPrepJob`; associated work item via its existing contract | `pickPrepLine`, `packPrepJob` (`fulfillment.write`); claim follows `operations.claim` and the work item's current `allowedActions` | Preserve version checks, scan/quantity validation, issue resolution, assignee ownership, loading/error/forbidden/unknown states; packed is not delivered; do not let stale/offline work submit |
| R42 `/s/:shopId/shipments` | `listShipments`, `getShipment`; order lookup via `listOrders`/`getOrder` | `createShipment` and `recordShipmentEvent` (`fulfillment.write`); `handoverShipment` (`fulfillment.handover`) | Preserve packed-order prerequisite, shipment/order/payment separation, versioned/idempotent command behavior, explicit human handover, duplicate/unknown event safeguards, shop-timezone conversion; no real carrier call or fake success |

## Layout contract

- Page gutter remains owned by the app shell. Shared `PageHeader`, `Panel`, `Toolbar`, `DataTable`, `Pager`, `EditDialog`, `DetailLine`, `Status`, `LookupLoadMore`, and `QueryState` keep their current ownership and behavior.
- Fulfillment composes existing `layoutSx` semantic roles. Add a shared role only if no role represents the same relation; record the reason, units, responsive behavior, consumers, and checks before using it.
- One owner per gap/inset. Preserve flow, dialog bounds, long Vietnamese text, order identity, selected lookup state, action permissions, focus and draft behavior.
- Baseline captures: routes R41/R42 and representative prep, create-shipment, shipment-detail, and event states at 390×844 and 1280×900. Final responsive checks cover 320/390/768/1280/1440.

