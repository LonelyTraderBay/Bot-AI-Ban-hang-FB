# UI018 C02 — Shared local-day start boundary

Date: 2026-10-03. Scope: React frontend with synthetic MSW data.

## UI result

- Finance still converts the selected `from` and exclusive `to` calendar dates to the first instant of each date in the shop timezone. Its `[from, to)` query and “Đến trước ngày” UI remain unchanged.
- Report export now uses the same local-day start for `from`. It still converts the selected end date to `23:59:59.999` local time, so that whole selected day remains included.
- A skipped midnight resolves to the first instant belonging to the selected date. A skipped whole date throws `RangeError`; malformed calendar dates and invalid timezone identifiers also throw.
- `dateTimeLocalToISOString` remains the separate resolver for user-entered wall times: nonexistent DST times are rejected and the existing earlier-fold behavior remains covered.

## Architecture result

`dateOnlyStartOfDayToISOString` now owns pure date-only start-boundary resolution and calendar-date validation in `apps/web/src/shared/model/format.ts`. The Finance page removed its private `localMidnight`; it now delegates both boundaries to the shared model. `reports/report-utils.ts` delegates only the start edge and retains its report-specific inclusive end adapter. Feature ownership, API DTOs, URL date values, query keys, permissions, generated files, route definitions, and design tokens are unchanged. No module imports another feature module and no dependency was added.

The shared resolver samples timezone offsets on both sides of the target date. If local midnight exists, it returns the earliest matching instant (including a repeated midnight); if midnight is skipped, it chooses the earliest representable local time on that date. If the timezone skips the date entirely, no candidate maps to that date and the helper rejects it. Tests cover UTC, Vientiane, Los Angeles, a UTC/shop date boundary, New York's spring transition, São Paulo's midnight gap, Apia's skipped date, and year `0000` handling.

## Files changed for UI018

- `apps/web/src/shared/model/format.ts`
- `apps/web/src/modules/finance/index.tsx`
- `apps/web/src/modules/reports/report-utils.ts`
- `apps/web/tests/timezone.test.ts`
- `apps/web/tests/report-utils.test.ts`

The root Playwright FE015/FE021/UI011 tests were retained as boundary and flow regressions; they did not need source changes.
