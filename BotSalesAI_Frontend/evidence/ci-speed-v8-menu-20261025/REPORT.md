# CI v8: await applied fault before the stale-version write

Before edit: main85496206e135a8b56003b3f241c2e8a6ad30ba4f, frontend40189550472/attempt1, Firefox5/9 failed fe009 stale-version assertion: expected412, actual200. All25 jobs completed; this failed attempt is excluded from successful performance. PR16 had25/25 SUCCESS in548s; final main acceptance remains pending.

Root cause contract: Shell MockTools.change awaits dynamic import and setMockControl before rendering the applied status; its select label updates immediately. Trace artifact12596688669 SHA2569c3ab4676eb7b9b8ac5d10daff2a64d82b964c0ba89884213a001bad003ca669 passes size/digest/ZIP CRC. Snapshot12197.087 confirms the selected label is already conflict; subsequent snapshots through12726.59 have no applied status, then PATCH at12838.299 returns200. The helper returned after option click without waiting for asynchronous fault setup. The earlier compositor hypothesis is superseded by this selected-label evidence; the exact delayed loader scheduling is not measured.

Scoped fix: after choosing the fault, await its existing public applied-status signal with the unchanged assertion timeout, following fe021/fe012 patterns. Keep original412, exact PATCH count, If-Match, preserved draft, recovery, tenant assertions, test IDs,2workers/9partitions,full per-PR/main gates. No application, contract, dependencies or timeout/retry change.

Required verification: all10 original fe009 cases on both engines in preview and private dev, full verify, S17 input ownership, full25-job PR and exact-main CI,19 native/build ZIPs, original1128 IDs, role scopes1246/968/566,finance widths/PNG CRC and full protection comparison. All hosted results remain separate from local proof.

Local focused proof:20/20 preview executions PASS in39.276s and20/20 private-dev executions PASS in46.372s, two workers. Counts are measured from the full file, including onboarding, customers, after-sale, memberships and privacy; the initial two-case read was incomplete and does not define inventory. Source code differs by only the setup status wait and its comment.

Full current runtime-code npm run verify PASS in263.5s. Final S17 refresh binds this full log and both focused logs; a fresh evidence validator follows the refresh. Historical v8 scheduling proofs remain preserved; final hosted PR/main/native/protection acceptance remains separate.
