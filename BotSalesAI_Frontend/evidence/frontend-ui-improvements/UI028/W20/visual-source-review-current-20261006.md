# UI028.W20 Notifications — visual and source review

Date: 2026-10-06  
Scope: React/TypeScript Frontend, synthetic MSW, routes R39/R40.  
Owner: `apps/web/src/modules/notifications/index.tsx`.

## Change and invariant review

The 25 pre-edit strict spacing findings in Notifications were replaced with the existing named `layoutSx` roles and `Panel bodyMode="inset"`. The post-edit report has 169 findings overall and zero in Notifications. A multiplicity-aware comparison found 25 removals, zero additions, and zero finding identity/count changes outside the Notifications owner. No exception or new spacing role was added. The pre-edit source hash is `b5b78947f8d0b370ec66adef252ee0bdd25ef1dd2967f1aab2a661da02774bc8`; the post-edit hash is `db902d443a9b21f2b6125b5cce52a0ba9e2f0e47fdfeabdf9fdb3cc40ff15951`.

Source review confirms that this diff changes layout ownership only: route mapping, operations, permissions, data/state, validation, mock behavior, Push capability checks, and copy are unchanged. `push-capabilities.ts` stayed byte-identical at `5afb7d25417142b10f9df582062ff0103b17e89514af11db2f6138093259ff0a`. The route/operation contract and mock boundaries remain those recorded in the [pre-spacing contract](design-contract-pre-spacing-current-20261006.md).

## Paired render review

Before and after captures have the same eight observations at 390×844 and 1280×900: R39 notification list and empty state; R40 devices/policy and revoke-device dialog. The screenshots and metrics are in [before render](render-before-spacing-current-20261006.json) and [after render](render-after-spacing-current-20261006.json); the [delta report](layout-delta-current-20261006.json) checks their state order and source hashes.

The inspected R39 card retains the title, safe body, delivery status, timestamp, opened/acknowledged evidence, order link, and separate acknowledge action. The inset increased from the previous 20px literal to the shared responsive surface role; text and actions remain readable and in order. The empty state remains visible inside the list surface.

R40 uses aligned panel insets and a shared grid gutter. The policy fields follow the existing form-field role, so the mobile view is vertically scrollable and the two desktop columns remain separate. The synthetic device row and revoke confirmation remain visible. The dialog stays within the captured viewport. No clipped copy, obscured action, or horizontal document overflow was observed in the reviewed captures.

Across the paired captures there were zero API writes, page errors, horizontal overflow observations, or out-of-viewport dialogs. Push registration, Telegram pairing, and device actions were not invoked; capture and layout tests remain local synthetic evidence. Visual source review is recorded for SPC-046; it is not an automated visual-token checker or a screen-reader/owner acceptance result.

## Verification

- Targeted E2E: **26/26**, Chromium 13/13 and Firefox 13/13. Includes FE019 notification contract/behavior, route empty composition 11/11 in both browsers, route fit at 320/390/768/1280/1440, and R40 revoke dialog fit at 320/390/1280. See [targeted log](targeted-e2e-current-20261006.log).
- `npm run verify`: generator 11 outputs/283 schemas/210 operations/54 routes; source check 66 files/220 operation refs/54 routes and fixtures 3/3; boundaries 451 imports/10 negative fixtures; ESLint; TypeScript; domain/network 88/88; Vitest 88/88; production build 2,056 modules; layout checker fixtures 9/9. The command exits 1 at its final strict spacing scan because **169 findings remain in the not-yet-migrated W21–W25 owners**. Notifications has zero. This is not a full `verify` PASS.

No FE ledger or full-product tracker was changed, and no generated plan/source was edited. No claim is made for OS Push permission, real Telegram/provider delivery, Backend, hosted CI, staging, production runtime, screen-reader speech, or owner acceptance.
