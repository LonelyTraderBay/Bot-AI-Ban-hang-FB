# Pinned Zod update after fresh dependency audit — 24/10/2026

PR6 e20ae576/run40018483434 attempt2 fails before application verification: npm audit reports GHSA-mrhx-c7xc-m3w5, high, for pinned zod4.1.3. Attempt1 source verify previously passed; advisory metadata was updated23/10. The new audit result supersedes earlier zero-vulnerability observations. Preserve local zod-audit-before exit1 and decoded CI log; do not disable audit or use forced bulk dependency updates.

Official source: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 identifies versions below4.6.6 as affected and4.6.6 as patched. npm registry confirms exact4.6.6 tarball/integrity. Upgrade only direct @botsales/web zod pin, its lock entry, and STACK_LOCK row. Zod is used by existing RHF form resolvers across customer/product/finance/inventory modules; public major remains4, but compatibility must be tested. Backend is an empty placeholder; this task makes no claim about server-side exploit reachability.

Verification plan: inspect exact lock diff, installed version and registry integrity; fresh audit0; existing form-validation scenarios in Chromium/Firefox; build demo and its six regressions/244route opens; full verify and final evidence. Refresh only owned fingerprints with current input-bound logs. New bundle gets a new standalone artifact manifest, preserving earlier a206 artifact as historical. Final PR/main CI still must pass on new revisions before any branch cleanup. Current status: pre-change baseline recorded; tests pending.

## Verified local results

- Exact parsed lock comparison: only apps/web Zod pin and node_modules/zod version/tarball/integrity differ; every other package and metadata field remains equal. Registry integrity matches the generated lock.
- Installed Zod4.6.6; fresh npm audit level low returns0 vulnerabilities (zod-audit.log).
- TypeScript/demo build PASS; customer create, product validation/draft, CSV validation and timezone/privacy checks Chromium/Firefox8/8 (zod-build-demo.log, zod-form-target.log).
- Built demo6/6, all244route opens,0issues/page errors across390/1440px and both engines (zod-built-demo.log). Artifact38files/contentSHA3041bc77c29fbd4f43747b38e0985666e72dcd5f4ddf36b632fccf1dec48808a. Local ZIP readback38/38; outside task outputs/final-zod-validated-demo.zip/manifest, four generated route records archived with journal.
- Full verify PASS, including256Vitest and source/domain/build/layout/composition gates (zod-verify.log). Final evidence87records/82coverage/312fingerprints, COMPLETE.
- Six failed-attempt records retained byte-exact in zod-ci-failed-attempts.zip with matching hash/CRC/member manifest. Old audit0 and old a206 bundle are dated checkpoints, superseded by the current observations.

PR and actual closing-main CI on the new revision remain required; no branch cleanup has run. No backend/production/owner acceptance is asserted.
