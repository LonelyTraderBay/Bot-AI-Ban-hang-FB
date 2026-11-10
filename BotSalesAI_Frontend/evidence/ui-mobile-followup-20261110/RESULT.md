# UI follow-up: current result and limits

Scope: local React frontend and synthetic MSW demo, continuing the prior audit. The pre-follow-up working-tree hashes and contract are in this directory. Graphite Gold, the API contracts, permissions, and the table's semantic and keyboard-scroll behavior are retained.

- Order and customer list tables opt into a mobile-pinned final action column; other tables retain the existing horizontal scrolling profile.
- Order list customer names come from the permission-scoped customer endpoint; unavailable or unauthorized names fall back to the customer ID. Requests are deduplicated through the existing scope-aware query cache and the order page is bounded at 20 rows.
- Explicit empty choices are shown for the order product, category parent, service request, finance matching/import, journal and opening balance selectors. Accessible names remain tied to their labels.
- Browser screenshots, command logs and input hashes are retained here. `browser.log`, `browser-rerun.log`, `routes.log`, and earlier verify logs are intermediate runs; inspect the final logs for current results. The order selector screenshot can capture the menu close transition and is not a paired baseline.

Acceptance remains open: the other mobile tables have not all received pinned actions, staff and stock-history identifiers have not all been resolved to verified names, and not every selector state or permission was exercised. The route matrix covers entry states and document-width smoke checks, not every interaction or visual state. Paired pre/post screenshots, native browser zoom, Firefox text-only resize, physical mobile, screen-reader checks, backend and owner acceptance are not established. S17's status remains IN_PROGRESS; its records and hashes do not imply acceptance.

## Final verification

- `browser-final.log`: 14/14 cases passed across Chromium and Firefox. This includes 61 route-entry smoke checks at 390 and 1440 CSS px, empty-table and keyboard checks at 320/390/1440, and focused order/customer table and product-selector behavior.
- `browser-permissions-final.log`: 2/2 cases passed for the customer name and link after switching from owner to warehouse.
- `verify-final.log`: `npm run verify` passed, including 260 Vitest tests, source/layout/token/composition gates, build and S17 validation. S17 was then augmented with this verified log; `evidence-confirmation.log` confirms the updated manifest still validates with status IN_PROGRESS.
- Generated source/boundary/domain/mock-typecheck reports changed by verify were restored to their pre-run bytes. Failed/interrupted intermediate logs remain historical, including a parallel Playwright attempt blocked by its shared port.
