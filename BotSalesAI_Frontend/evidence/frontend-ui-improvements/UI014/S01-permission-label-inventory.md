# UI014 source and permission inventory

Date: 2026-10-03  
Scope: React/TypeScript frontend and synthetic MSW demo only. No API contract, generated output, backend, staging, or owner acceptance changes are included.

## Canonical permission evidence

| Surface | Contract evidence | UI implication |
|---|---|---|
| Dashboard route | `botsales-kit/contracts/route-manifest.json`, R04 `/s/:shopId/overview`, `dashboard.read` | The dashboard page is available to a read role; its panels have independent permissions. |
| Operations hero destination | Route R37 `/s/:shopId/operations`, read permission `operations.read` | Show “Xem việc cần làm” only when the current membership has `operations.read`. |
| Create-order hero destination | Route R18 `/s/:shopId/orders/new`, read and action permission `orders.write` | Do not show “Tạo đơn hàng” to memberships without `orders.write`. |
| Recent orders destination | Route R17 `/s/:shopId/orders`, read permission `orders.read` | Hide the “Tất cả đơn” shortcut and order data when `orders.read` is absent. |
| Dashboard financial panel | Route R04 content and `finance.read` permission | Preserve the existing permission-gated revenue/cash panel. |
| Agent-role labels | `packages/contracts/src/generated.ts`, `AgentRole.kind`; the API exposes tool IDs but no display-name field | Use known enum labels; for unknown/empty kinds state that no label/code was provided instead of fabricating a role name. |
| Unresolved command ID | `CommandResponse.id` and shared `CommandRecovery` | Keep the ID visible for lookup and make it copyable with accessible success/failure feedback. |

## Baseline findings

- `apps/web/src/modules/dashboard/index.tsx` rendered both hero links for every dashboard reader. A `viewer` has `dashboard.read`, `operations.read`, and `orders.read`, but not `orders.write`; the create-order link therefore led to a route denied by the existing guard.
- The same page rendered the “Tất cả đơn” panel action even when the recent-orders body was permission-gated.
- The dashboard showed the contract `AgentRole.kind` as a raw value when it did not match the four known role labels. The contract has no custom display-name field for this resource.
- `apps/web/src/app/CommandRecovery.tsx` showed unresolved command IDs as unstructured text with no copy action. The shared error alert also prints the code so it remains available in the originating form.
- `tests/fe021.spec.ts` previously asserted that the read-only viewer could see “Tạo đơn hàng”. `tests/fe012.spec.ts` already exercises an unknown command result and is the appropriate browser flow for verifying command-code copy feedback.

## Accepted changes and validation targets

- Derive hero shortcuts from the current membership permissions; preserve route guards as the final client-side boundary and do not claim backend authorization.
- Keep the read-only operations shortcut available to the viewer, hide the create-order shortcut without `orders.write`, and gate the recent-orders header shortcut on `orders.read`.
- Keep order/command IDs visible and lookupable; add one copy control in shared command recovery, and show copy feedback through a live status message.
- Use neutral greeting text for empty display names, preserve long names, and use an explicit “Vai trò chưa có nhãn” fallback for unknown role kinds. Never invent a human name for an API code.
- Verify generated contract freshness, relevant unit and browser tests, the full `npm run verify` gate, and full rebuilt-demo E2E. Record local Chromium/MSW limits separately from FE-G05 manual accessibility and FE-G09 owner acceptance.
