# UI audit follow-up — local result

Scope: React frontend with synthetic MSW data, baseline `160f99cb`. No backend,
provider, release, owner acceptance or full-product tracker claim. Source hashes
are in `source-hashes.json`; the original historical checker outputs overwritten
by local commands were restored after copies were saved here.

## Implemented

- Explicit empty options for audited inbox, product, inventory, ledger and order
  selectors; accessible select names remain stable and values are exposed.
- Shared table width adapts to column count within a bounded range. Customer
  details use the available desktop width for the address table. Tables retain
  the named keyboard-scrollable region and all rows, columns and actions.
- Vietnamese date context and exclusive-end explanation for finance reports;
  date context on export, marketing and balance-sheet filters. Native date
  inputs and date-only/API semantics remain unchanged.
- Clearer CSV mapping grouping and button names; compact overview and demo
  disclosure; consent text alignment; intrinsic-width channel status; no accent
  for missing gross profit; localized known debt counterparty types and a
  permission-aware customer link in the order list.
- Demo notification no longer asks for an already acknowledged task. Mock
  confirmation markers are displayed as labeled evidence alongside message text;
  underlying message data and mock order checks are unchanged.

## Checks

- `browser-routes.log`: Chromium, 61 route entry states at 390×900 and 1440×900,
  two tests passed. Checks loaded heading, page errors and document width, not
  all interactions or visual completeness. R14, R36 and R61 used missing-fixture
  states in this matrix.
- `browser-address.log`: Chromium address edit and order selection journey
  passed. The initial run in `browser-regression.log` failed due to the global
  select accessible-name change; that approach was replaced by scoped selects,
  and the affected journey was rerun successfully. That initial run was stopped;
  its five C05 screenshots in this directory are provisional, not final evidence.
- `browser-components.log`: Chromium two tests passed for table empty states,
  keyboard scrolling and status-width cases at multiple viewport sizes.
- `verify-last.log`: generation, source, boundaries, lint, typecheck, domain
  117/117, Vitest 260/260, production build, layout 86/86, visual-token and
  composition 42/42 passed. Overall `npm run verify` failed at `test:evidence`:
  S17 fingerprints are stale for changed files. The old evidence has not been
  rewritten to claim coverage it does not contain.
- Browser visual review on current source covered inbox, order form, products,
  customer address, audit table, finance, notification, channel, CSV mapping and
  representative mock conversation across desktop and mobile. Not all changed
  routes and states received paired before/after visual review.

## Open limitations

- Mobile tables still require horizontal scrolling; actions are not pinned and
  the full P1 mobile table usability finding remains open. Some selects outside
  the audited set, including product-line selection, still have a blank value.
- The order API result provides a customer ID; the list now links to the customer
  when permitted but does not supply a customer name. Staff and stock-history
  identifiers still need verified source/permission-aware resolution. Do not
  infer names from incomplete or inaccessible records.
- Paired before/after saved baseline, all affected states/roles, Firefox, native
  zoom, text-only resize, screen reader, physical mobile and owner acceptance
  were not established. S17 remains stale and acceptance is NOT_VERIFIED.
