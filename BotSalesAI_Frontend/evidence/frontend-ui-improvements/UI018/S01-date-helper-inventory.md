# UI018 — Date helper inventory and C01 decision

Date: 2026-10-03  
Scope: React frontend with synthetic MSW data. C01 only; no runtime/source/test changes are part of this inventory.  
Baseline HEAD: `e68cb65e61c5c1aab2ae169dd8033df305df8872`. The working tree already contained extensive local changes; they were preserved.

## UI surface, canonical contract, and boundaries

The finance cashflow/profit-loss filters accept date-only form values, display “Đến trước ngày”, and convert both values to shop-local start-of-day UTC instants. The UI and FE015 tests treat the request as a half-open `[from, to)` range. In `reports`, date-only inputs select report days; export converts the selected start to the start of that local day and the selected end to `23:59:59.999`, so the selected end day is included. The FE021 browser test asserts this inclusive export behavior.

The canonical `ExportRequest` schema has required `from` and `to` fields of `DateTime` (`format: date-time`) and a `timezone` string. It does not declare inclusive/exclusive interpretation. Do not infer or change API range semantics from the field type: preserve the established frontend flows and their UI/browser expectations. `JournalCreate.effectiveDate` is date-only; finance entry and shipment event values are instants. Those data types are not interchangeable.

## Current ownership and behavior

| Surface / owner | Helper and current behavior | Relevant evidence | C01 finding |
|---|---|---|---|
| Finance range; `finance/index.tsx` | Private `localMidnight(date, timezone)` validates the calendar date, then runs three `Intl.DateTimeFormat` offset corrections and returns an ISO instant. It is used for both `[from, to)` boundaries. | `tests/fe015.spec.ts`; `tests/ui011-date-time.spec.ts`; UI011 S01/S06 | Semantically matches the report start boundary for ordinary dates, offsets, and tested DST days. Private duplicate timezone conversion lives inside a feature page. |
| Report export start/end; `reports/report-utils.ts` | Private `parseDateOnly` validates the input. `reportDateBoundary(..., 'start')` and `(..., 'end')` call a separate converter with four corrections; `end` uses local 23:59:59 plus 999 ms. | `apps/web/tests/report-utils.test.ts`; `tests/fe021.spec.ts`; FE021 handoff | Start-of-day overlaps with Finance. Inclusive end-of-selected-day is a distinct adapter and must remain inclusive. |
| Shared date/time model; `shared/model/format.ts` | `dateTimeLocalToISOString` resolves a user-entered local wall time to an instant, rejects nonexistent DST wall times, and selects the earlier instant in an overlap. `isValidDateOnly` validates calendar dates. | `apps/web/tests/timezone.test.ts`; `tests/ui011-date-time.spec.ts` | Wall-time input has different gap/fold semantics from date-only day boundaries; do not replace either range helper with this converter or alter shipment input behavior. |

## Reproduced boundary difference

The two private algorithms return equal start boundaries for the existing ordinary cases: UTC (`2026-09-30` → `2026-09-30T00:00:00.000Z`), Asia/Vientiane (`2026-09-30` → `2026-09-29T17:00:00.000Z`), and the tested America/New_York spring-forward day (`2026-03-08` → `2026-03-08T05:00:00.000Z`). Current report-end expectations stay `2026-09-30T16:59:59.999Z` for Vientiane, `2026-09-30T23:59:59.999Z` for UTC, and `2026-03-09T03:59:59.999Z` for New York.

A source-equivalent run of the existing correction loops with `America/Sao_Paulo`, date `2018-11-04` (local midnight skipped by the DST transition) exposes a real discrepancy. Finance's three passes resolve to `2018-11-04T03:00:00.000Z`, the first instant at local `01:00` on that date. Reports' four passes resolve to `2018-11-04T02:00:00.000Z`, which formats as `2018-11-03 23:00`; it is outside the selected local date. The existing report unit tests cover a New York DST day but not a midnight gap. This finding is derived from the exact correction counts and `Intl` parts conversion currently in source; it is a focused reproduction, not a browser/backend test.

## C01 paired decision

- **UI:** keep Finance `[from, to)` and selected-date inclusive report export behavior. Ensure the requested local date's start boundary belongs to that local calendar date, including when midnight is skipped; retain existing UTC, offset, day-boundary, and New York DST UTC bounds.
- **ARCH:** move the shared date-only local-day-start conversion/validation responsibility out of the Finance page into the shared model and reuse it for Finance and report starts. Keep Finance and Reports as owners of their separate range adapters; do not merge inclusive report end with Finance's exclusive boundary. Keep date-only values separate from timestamp/wall-time input and preserve the latter's gap/fold policy. No cross-module imports, generated edits, contract changes, or additional date library.
- **C02 verification target:** add direct unit coverage for the shared day-start conversion in UTC, positive/negative offsets, a shop/browser date boundary, New York DST, and the São Paulo midnight gap. Preserve FE015 half-open request bounds and FE021 inclusive report-end assertions in browser regressions. Only adjust behavior necessary to ensure the shared local-day start resolves to the selected date; do not redefine date ranges.
- **Risk to resolve in implementation:** the date-only resolver needs an explicit and tested policy for midnight gaps, and must reject invalid/nonexistent whole calendar dates instead of silently returning a different date. Keep the implementation small and avoid extracting a generic timezone framework.

## Inputs inspected and SHA-256

Hashes fingerprint the C01 snapshot and make no claim that these files are clean in Git.

| File | SHA-256 |
|---|---|
| `botsales-kit/contracts/openapi.json` | `D88A70957A9DE36402FF5AC0CB757A2F1C496519C7E1FD2E28DF17E867F78C7C` |
| `botsales-kit/contracts/route-manifest.json` | `360871C008FAC723CFC77DEC79417838D24D4FAE844452909EB347EC8893F2B2` |
| `apps/web/src/shared/model/format.ts` | `9A743055D50164D7F57208294E6E3B43565CED9A36198BA6B553CB48D3370230` |
| `apps/web/src/modules/finance/index.tsx` | `C0815F25DBE3954FFCDD8CFC946ED823485EBA1F78E14899F509416AC00D1498` |
| `apps/web/src/modules/reports/index.tsx` | `3679AFCB983208D12ADC5F8600956BDB1049AAB0759CD96BD74EE2C073435BB6` |
| `apps/web/src/modules/reports/report-utils.ts` | `0D0889A8E43A0F6EC2B2594D01E940C77F8E7C0FE23F17925B0E1A9DA089AD97` |
| `apps/web/tests/format.test.ts` | `EDB0B519D06D1628EE717BDD77394FFB441EE340859506A919F58C66B2FBDDC4` |
| `apps/web/tests/timezone.test.ts` | `F4A2029A41888A19279DC089E2264366CA97D69A1B330D71BE8055BC0B2D7A20` |
| `apps/web/tests/report-utils.test.ts` | `21EA2B1FDB60982705830150E7B2B2BDE8279EC527F6A9AA642D6E3989DAD4AA` |
| `tests/fe015.spec.ts` | `AF4BC133DD079FB115FC6E365F1E482B18D3F65751E9451E85D3309B9DBED665` |
| `tests/fe021.spec.ts` | `26AFEF11D6424CE8C12454BC6969CF0A78E292DC32837E8FA57863D8804D9FE7` |
| `tests/ui011-date-time.spec.ts` | `3B0C72599267F42D22493D44F06257FE66F3F697A855792FCF0C8CA857B6358E` |
| `evidence/frontend-ui-improvements/UI011/S01-date-time-inventory.md` | `7B923284E15CE98738619AF5E6BF24DBD9C6A86CDA67FAD7A5CD2F434040427E` |
| `botsales-kit/execution/frontend-evidence/FE015/handoff.md` | `F2E700417E61B58347752B56CE094C6C2F15882D35F8A3EE114A246D15F80140` |
| `botsales-kit/execution/frontend-evidence/FE021/handoff.md` | `623EBB556A9A1B61D520872AF6E4C8A379EE14FCBC92E6C92FF1FF208BC5B812` |

## Scope and limits

This is a React source/contract/test inventory. No API, backend, provider, staging, production, CI, or owner-UAT behavior was tested. The API contract alone does not specify range inclusion; the existing frontend labels and FE015/FE021 tests are the evidence for preserving each flow's current range semantics.
