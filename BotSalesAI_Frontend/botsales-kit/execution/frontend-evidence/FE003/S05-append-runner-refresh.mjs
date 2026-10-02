import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const updates = [
  {
    file: 'botsales-kit/execution/frontend-evidence/FE003/handoff.md',
    marker: '## FE003 runner refresh after FE006 shared UI — 30/09/2026',
    body: `## FE003 runner refresh after FE006 shared UI — 30/09/2026

After the shared MUI theme/token changes, the current unit suite passed 45/45 across 3 files; the dirty-draft helper passed 4/4; and the serialized full Playwright run passed 23/23 on Chromium. The component suite also reran the real-app browser audit at 320/390/768/1440 CSS px. A preceding 44/45 run exposed a test regex boundary error; the assertion was fixed and the final run passed 45/45. The earlier overlapping 22/23 E2E failure remains diagnostic only; no root cause is inferred.

For reproducibility, use the recorded PowerShell PATH override and commands above. FE006 typecheck, lint and generate:check are current and pass in its evidence folder. No CI run is claimed. Production/demo build after the current theme change, full keyboard/screen-reader UAT, performance, backend/provider and staging remain unverified. Axe color-contrast is incomplete; do not claim full accessibility or production readiness.`,
  },
  {
    file: 'docs/CONTINUE_FRONTEND.md',
    marker: '## FE003 runner refresh after FE006 shared UI — 30/09/2026',
    body: `## FE003 runner refresh after FE006 shared UI — 30/09/2026

Current source: ` + '`npm test`' + ` PASS 45/45 on 3 files, dirty-draft helper 4/4, and serialized ` + '`npm run test:e2e`' + ` PASS 23/23 Chromium. The test suite invokes the React browser audit at 320/390/768/1440 CSS px; axe reports zero app/main violations, with color-contrast still incomplete. A 44/45 diagnostic due to a test regex was fixed before the final pass. The earlier overlapped 22/23 E2E diagnostic remains in FE003/S03-e2e-refresh.log; its cause is not established.

FE006's current generate:check (11 outputs/283 schemas/210 operations/54 routes), typecheck and lint also pass. CI, production/demo build after the theme update, UAT, performance, live backend/provider and staging remain unverified. Follow the frontend ledger and preserve the FRONTEND_WITH_SYNTHETIC_MOCK_API scope.`,
  },
  {
    file: 'evidence/REPORT.md',
    marker: '## FE003 runner refresh after FE006 shared UI — 30/09/2026',
    body: `## FE003 runner refresh after FE006 shared UI — 30/09/2026

The current working tree passed Vitest 45/45 across 3 files, dirty-draft helper 4/4 and serialized Playwright 23/23 on Chromium after the FE006 shared theme/token update. The component suite executed the real React dashboard audit at 320/390/768/1440 CSS px. Axe reports zero violations for app and main, while color-contrast remains incomplete; no full keyboard/screen-reader audit is claimed. A 44/45 test diagnostic was caused by an assertion regex and fixed before the final pass. The older overlapping E2E run remains recorded as a failure diagnostic, and its root cause is unknown.

FE006 current logs also show generate:check, full typecheck and lint passing. These are local checks against synthetic mock data. CI, production/demo build after the theme change, live backend/provider, staging and UAT are not verified.`,
  },
  {
    file: 'botsales-kit/execution/frontend-evidence/FE003/handoff.md',
    marker: '## Runner and FE010 refresh — 30/09/2026',
    body: `## Runner and FE010 refresh — 30/09/2026

The current frontend command registry was re-audited after the Windows PATH adaptation: 17 root scripts, 5 workspace scripts and 21 registry entries; 19 commands are verified and 2 remain declared-only. The FE003.S01 audit and refreshed source hashes are S01-map-refresh-audit.log and S01-map-refresh.json. FE003.S04 rejected current-hash REAL_BACKEND evidence and valid-scope evidence with a missing log; the frontend ledger SHA256 was unchanged. See S04-refresh-current.log and S04-refresh.json.

Current runner results on this source snapshot: npm test 43/43 across 3 files (S03-unit-refresh.log); dirty-draft helper 4/4 (S03-draft-helper-refresh.log); isolated FE009 E2E 5/5 (S03-e2e-fe009-focused.log); and full serialized Playwright 23/23 Chromium (S03-e2e-full-rerun.log). The first full E2E run overlapped unit tests and recorded 22/23 because the customers route rendered its error boundary; retain that diagnostic at S03-e2e-refresh.log. The same FE009 file passed in isolation and the serialized full rerun passed; no root cause for the first error is claimed. The component suite invokes the real browser audit at 320/390/768/1440 CSS px and passes its configured axe assertions; color contrast is excluded/incomplete, so this is partial accessibility evidence. FE010 focused browser tests passed 8/8 at ../FE010/S02-focused-e2e-pass.log.

Run from the repository root in PowerShell, using the PATH override only for this process:

PowerShell commands:
$env:PATH = 'C:\\Program Files\\nodejs;C:\\Windows\\System32'
npm.cmd --script-shell=cmd.exe test
npm.cmd --script-shell=cmd.exe run test:e2e
node --test tests/session/dirty-drafts.check.mjs
node botsales-kit/scripts/progress.mjs validate
node botsales-kit/scripts/progress.mjs status
node botsales-kit/scripts/progress.mjs next

The PATH override avoids the IDE child-shell vitest is not recognized failure observed on this machine; it does not modify global configuration. No CI run is claimed. Current-source production/demo builds, domain/schema reruns after the catalog mock change, full keyboard/screen-reader UAT, performance measurements and live backend/provider/staging remain unverified. The tracker, not this handoff, determines the next ready task and whether older checkpoints are stale.`,
  },
  {
    file: 'docs/CONTINUE_FRONTEND.md',
    marker: '## Current execution refresh — 30/09/2026',
    body: `## Current execution refresh — 30/09/2026

Runner checks on the working tree after FE010: npm test 43/43 on 3 files; dirty-draft helper 4/4; full serialized Playwright 23/23 on Chromium; isolated FE009 E2E 5/5; FE010 focused E2E 8/8 in botsales-kit/execution/frontend-evidence/FE010/S02-focused-e2e-pass.log. One full run overlapped Vitest and E2E and recorded 22/23 when the customers route reached ErrorBoundary. Preserve FE003/S03-e2e-refresh.log; the FE009 isolated run and serial full rerun passed, and no root cause for the first error is claimed.

FE003.S01–S04 have refreshed evidence. Read node botsales-kit/scripts/progress.mjs status and next before choosing work; the tracker determines whether old evidence remains current. For Windows npm runs, use PowerShell with $env:PATH = 'C:\\Program Files\\nodejs;C:\\Windows\\System32' and npm.cmd --script-shell=cmd.exe; do not change machine-wide PATH. S05 documents local reproducibility only and does not claim CI.

FE010 covers positive product prices, image-only draft protection, category filters and pagination, If-Match/412 retention, and CSV sample import behavior; its focused browser suite passed 8/8. Generation, source/boundary, type/lint, domain/schema and production/demo build checks must be rerun after final catalog/mock edits before their relevant checkpoints. Production/demo build, performance, UAT, CI and live services remain unverified. Do not claim Production-Ready/Enterprise-Grade until FE-G01..09 have current evidence.`,
  },
  {
    file: 'evidence/REPORT.md',
    marker: '## FE003 current runner refresh — 30/09/2026',
    body: `## FE003 current runner refresh — 30/09/2026

Current runner/config evidence after FE010 changes: Vitest passed 43/43 across 3 files; the dirty-draft helper passed 4/4; the isolated FE009 browser suite passed 5/5; the focused FE010 browser suite passed 8/8; and a serialized full Playwright rerun passed 23/23 on Chromium. Logs are under botsales-kit/execution/frontend-evidence/FE003/ and FE010/. A preceding full E2E run overlapped Vitest and recorded 22/23 because the customers route rendered its error boundary; that diagnostic remains at FE003/S03-e2e-refresh.log. The same FE009 file passed in isolation and the serial full rerun passed; the cause of the first failure is not established.

The current component suite invokes the real React browser audit at 320/390/768/1440 CSS px; the configured assertions passed. Shared axe checks disable color contrast, which remains incomplete, and no full keyboard/screen-reader audit is claimed. FE003.S04's current tracker probes reject wrong-scope and missing-log evidence without changing the frontend ledger. No CI run is claimed. Production/demo build, domain/schema checks after the catalog mock change, performance, UAT, backend/provider and staging remain unverified. This report covers frontend code with synthetic mock data only and does not certify production readiness.`,
  },
];

for (const update of updates) {
  const file = path.join(repo, update.file);
  const current = fs.readFileSync(file, 'utf8');
  if (current.includes(update.marker)) continue;
  fs.appendFileSync(file, `\n\n${update.body}\n`, 'utf8');
  console.log(`appended ${update.marker}`);
}
