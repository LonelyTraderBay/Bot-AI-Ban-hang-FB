# C06 shared composition gate — finding and intended correction

Date: 2026-10-09

## Observed baseline

- Command: `node --test tests/ui-composition-checker.test.mjs tests/ui-composition-ancestry.test.mjs tests/ui-shared-api-contract.test.mjs`.
- Result: 38/41 assertions passed; three failures identify current catalog/source drift, one missing primary-region loading profile, and one declared layout role with no consumer.
- The failing role is `form.pairedFields`: repository search found only its type/runtime definition and stale catalog row, with no production reference.
- `customers/addresses.tsx` renders the primary paged address table through `QueryState` but did not declare its approved `section` loading profile.
- The catalog line/JSX-use inventory is checked against resolved TypeScript exports and consumers; values must be refreshed from source, not estimated.

## Intended change and owners

- Keep shared API and loading behavior unchanged; declare `pendingProfile="section"` on the primary address list only.
- Remove the unused `form.pairedFields` leaf from the local shared layout contract and runtime because there is no current consumer. Do not create a synthetic consumer or add another composition API to preserve dead code.
- Refresh the crosswalk inventory only from resolved type/runtime paths and update shared catalog source line/use references from the checker.
- Preserve token values, spacing scale, permissions, business API and existing consumer behavior.

## Required proof

- Re-run shared composition/ancestry/API contract suites and layout binding checks.
- Re-run typecheck, lint, full unit suite, C06/FE015 browser suite and `generate:check` on the resulting source.
- Record current source fingerprints and keep any remaining strict failure open.
