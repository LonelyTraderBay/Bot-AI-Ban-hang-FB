# UI011 date and time inventory

Date: 2026-10-03. Scope: React frontend with synthetic MSW data. This is a source/contract/test inventory; no runtime change is included in C01.

## Canonical contract semantics

`botsales-kit/contracts/openapi.json` defines `DateTime` as a string with `format: date-time`. `FinanceEntryWrite.occurredAt` and `ShipmentEventWrite.occurredAt` use that type and therefore represent an instant with an explicit UTC offset. `JournalCreate.effectiveDate` is a string with `format: date`, so it is a calendar date and must not be shifted through UTC conversion. The active shop carries an IANA timezone; shared `dateTime(value, timezone)` renders instants in that zone.

## Source and existing-test inventory

| Surface | Current source behavior | Existing evidence | Gap to verify |
|---|---|---|---|
| Finance cashflow/profit-loss filters | Date-only inputs are converted to `[from, to)` instants using the shop timezone. `previousMonthRange()` chooses the calendar month using UTC fields before those values are converted. | `tests/fe015.spec.ts` checks Vientiane boundary conversion after manually selecting dates and checks UTC/Vientiane query parameters. | No default-range test pins the clock across a UTC/shop month boundary. At `2026-09-30T17:30Z`, Vientiane is already October 1, while UTC remains September 30; the default can select August instead of the shop's previous month, September. |
| Finance journal draft | `effectiveDate` is initialized once to `2026-09-29`; opening a new draft does not set it to the current shop-local date. The value is sent directly as a date-only string. | Finance tests cover balanced lines, payload shape, period lock, and other command outcomes. No test asserts the new journal's default date at a frozen clock. | The form can open with an old date instead of the current shop-local date. Confirm at a fixed clock and ensure the payload preserves the date-only value without UTC drift. |
| Finance entry draft | The initial state has an old literal, but `begin(null)` resets the create form to `new Date().toISOString()` before opening. The field is an explicit ISO 8601 text input; edit mode reuses the entry's instant. | Existing finance tests cover money, conflicts, and command behavior. | The stale initializer is not a user-visible default on the normal create path; do not change it based on source grep alone. The ISO text field is unambiguous but remains a usability concern outside the proven timezone defect. |
| Shipment event | The `datetime-local` value is formatted and parsed using the browser timezone, then converted to ISO. Shipment history is rendered using the shop timezone. | FE013 records a shipment event, but does not assert the exact instant under a browser timezone different from the shop timezone. | With shop `Asia/Vientiane` and browser `America/Los_Angeles`, entering `2026-10-01T12:00` currently means `19:00Z`; shop-local noon means `05:00Z`. The UI needs one declared timezone and matching payload semantics. |

## C01 decision

There are reproducible candidates for C02: derive report's previous calendar month from shop-local date; initialize journal `effectiveDate` from the current shop-local date; and make shipment-event `datetime-local` read/write in the shop timezone, preserving UTC instants in the API payload. Keep date-only values as date strings. Do not touch the finance-entry initializer without a browser-visible failure because the create handler replaces it before opening.

Before implementation, add fixed-clock/browser-zone browser tests for the boundary cases above. Preserve report `[from, to)` semantics, existing explicit ISO inputs, period validation, and any user-entered dates after failed mutations. Do not rewrite historical seed dates.
