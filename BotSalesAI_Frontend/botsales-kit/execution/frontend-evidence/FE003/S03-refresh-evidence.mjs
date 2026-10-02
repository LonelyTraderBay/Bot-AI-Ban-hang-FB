import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE003');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const paths = [
  'package.json',
  'apps/web/package.json',
  'apps/web/src/main.tsx',
  'apps/web/src/mocks/browser.ts',
  'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts',
  'apps/web/tests/setup.ts',
  'apps/web/tests/components.test.tsx',
  'apps/web/src/modules/orders/index.tsx',
  'apps/web/src/mocks/fulfillment.ts',
  'apps/web/src/mocks/seed.json',
  'apps/web/tests/api-client.test.tsx',
  'apps/web/src/modules/catalog/index.tsx',
  'apps/web/src/modules/customers/index.tsx',
  'playwright.config.ts',
  'tests/fe009.spec.ts',
  'tests/fe010.spec.ts',
  'tests/frontend.spec.ts',
  'tests/session/demo-server.mjs',
  'tests/session/dirty-drafts.check.mjs',
  'tests/design/run-browser-audit.mjs',
  'tests/design/browser-audit.mjs',
  'tests/fe012.spec.ts',
  'botsales-kit/execution/frontend-evidence/FE006/S04-browser-audit.json',
  'botsales-kit/execution/frontend-evidence/FE003/S03-unit-refresh.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-refresh.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-fe009-focused.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-full-rerun.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-draft-helper-refresh.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-refresh-evidence.mjs',
];
const sourceFiles = paths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const logFile = 'execution/frontend-evidence/FE003/S03-e2e-full-rerun.log';
const evidence = {
  taskId: 'FE003',
  stepId: 'S03',
  kind: 'artifact_review',
  result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: 'Current dirty working tree; runners and frontend suites rerun on Windows',
  expected: 'Vitest, Playwright, dirty-draft helper and the responsive browser/axe test execute with current source; no suite is disabled and MSW is gated to demo mode.',
  observed: 'Current Vitest passed 45/45 across 3 files; the dirty-draft helper passed 4/4; full serialized Playwright passed 41/41 Chromium tests, including 10 FE012 cases. The responsive real-app browser audit ran at 320/390/768/1440 CSS px and passed configured axe assertions; color-contrast remains excluded/incomplete, so this is partial accessibility evidence. The component test reads a marked JSON report from stdout; ordinary tests no longer overwrite FE006 durable screenshot evidence, while explicit evidence runs write only when BOTSALES_DESIGN_EVIDENCE_DIR is set. Vitest config is jsdom with RTL setup; Playwright uses one worker and runs the actual Vite app. __MOCK__ gates MSW; live startup unregisters the prior mock worker. The run is synthetic frontend verification, not backend/provider or full assistive-technology validation.',
  command: 'npm.cmd --script-shell=cmd.exe test; npm.cmd --script-shell=cmd.exe run test:e2e; node --test tests/session/dirty-drafts.check.mjs; inspect runner and mock configs',
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: `Windows / Node ${process.version} / npm 11.17.0 / Playwright Chromium`,
    details: 'Root frontend workspace; current tests ran with one Playwright worker. Initial overlapping run is separately preserved as a failure diagnostic.',
    dataSource: 'synthetic-msw',
  },
  checksTotal: 6,
  failed: 0,
  logFile,
  logSha256: sha256(fs.readFileSync(path.join(kit, logFile))),
  sourceFiles,
  sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
fs.writeFileSync(path.join(evidenceDir, 'S03-refresh.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidence: 'S03-refresh.json', tests: '45 unit + 41 full E2E + 4 helper', sourceFiles: sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }, null, 2));
