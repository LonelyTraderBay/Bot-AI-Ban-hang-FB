# UI028.W21 Operations — visual and source review

Date: 2026-10-06  
Scope: React/TypeScript Frontend, synthetic MSW, routes R37/R38/R52.  
Owner: `apps/web/src/modules/operations/index.tsx`.

## Change and invariant review

The 30 pre-edit strict spacing findings in Operations were replaced with existing semantic `layoutSx` roles and `Panel bodyMode="inset"`. The post-edit report has 139 findings overall and zero in Operations. A multiplicity-aware comparison found 30 removals, zero additions, and zero finding identity/count changes outside this module. No exception or shared role was added. The source hash changed from `f228f311285d9361ea9ba5a0117b8d03a6d02e00edf1baffddeba647ec4a59ba` to `adcc18195d09a583e2a0f660198838cd03dbd95eebf2dc5c2a62cd4c799b8406`.

The first post-edit scan exposed one remaining literal on the R52 digest grid; it was replaced with `layoutSx.grid.gutter` by an exact-hash follow-up recorded in [fix-remaining-grid-role.mjs](fix-remaining-grid-role.mjs). The final scan is zero for Operations. `layout.ts` and shared components stayed byte-identical. Source review found no changes to routes, operations, permissions, approval intent/version/reason handling, local draft state, work-item action gates, or the explicit unknown/readiness states.

## Paired render review

The six before and six after captures cover the same R37 work/exception list, R38 approval queue/delegation preview, and R52 digest/health/readiness screens at 390×844 and 1280×900. See [before render](render-before-spacing-current-20261006.json), [after render](render-after-spacing-current-20261006.json), screenshots, and the [delta report](layout-delta-current-20261006.json).

R37 retains the summary cards, exception filter, work-item table, current-page status, and existing action visibility. R38 retains its local-only delegation preview and approval queue; decision reasons and versioned approval content are unchanged. R52 keeps digest history, dependency checks, restore/readiness criteria, and role-control states distinct. Panel insets and inner groups now share semantic roles; desktop columns stay separate and mobile pages scroll vertically. The table's own horizontal-scroll hint remains as designed. No clipped text or action was observed in the inspected captures.

Across paired renders there were zero API writes, page errors, or document horizontal-overflow observations. Dialog layout was verified separately at 320×844, 390×844, and 1280×900 without submitting the action. Screens and tests use synthetic local data only; they do not establish live worker/provider health, durable jobs, backup restore, CI, or production readiness.

## Verification

- Targeted E2E: **20/20**, Chromium 10/10 and Firefox 10/10. Includes FE020 approval stale-resource, allowed-action, role-control, exception-filter, delegation-preview, digest/health and readiness behavior; empty composition 11/11 per browser; route widths 320/390/768/1280/1440; R52 dialog bounds at 320/390/1280. See [completed run](targeted-e2e-current-20261006.log). An earlier attempt used an unavailable R37 update action contrary to the FE020 capability contract; that attempt was interrupted and retained at [first attempt](targeted-e2e-first-attempt-interrupted-current-20261006.log), then the layout test was corrected to inspect the existing R52 dialog without submitting it.
- `npm run verify`: generator 11 outputs/283 schemas/210 operations/54 routes; source 66 files/220 operation references/54 routes and fixtures 3/3; boundaries 452 imports/10 negative fixtures; ESLint; TypeScript; domain/network 88/88; Vitest 88/88; production build 2,056 modules; layout checker fixtures 9/9. The command exits 1 at the final strict spacing scan because **139 findings remain in W22–W25 owners**. Operations has zero findings. This is not a full `verify` PASS.

No FE ledger or full-product tracker was changed, and no generated plan/source was edited. No claim is made for Backend, live providers/workers, staging, production, hosted CI, screen-reader speech, or owner acceptance.
