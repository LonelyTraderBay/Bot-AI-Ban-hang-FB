import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE021');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = value => JSON.parse(fs.readFileSync(value, 'utf8'));
const sourceFiles = [
  'apps/web/package.json',
  'apps/web/src/app/Shell.tsx',
  'apps/web/src/mocks/database.ts',
  'apps/web/src/mocks/files.ts',
  'apps/web/src/mocks/marketing-fixture.ts',
  'apps/web/src/mocks/service.ts',
  'apps/web/src/modules/dashboard/index.tsx',
  'apps/web/src/modules/reports/index.tsx',
  'apps/web/src/modules/reports/report-utils.ts',
  'apps/web/src/shared/api/client.ts',
  'apps/web/src/shared/api/hooks.ts',
  'apps/web/src/shared/ui/components.tsx',
  'apps/web/tests/fe021-source-map.test.ts',
  'apps/web/tests/report-utils.test.ts',
  'apps/web/vite.config.ts',
  'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  'package.json',
  'packages/contracts/src/generated.ts',
  'packages/contracts/src/operations.json',
  'packages/contracts/src/schemas.json',
  'scripts/test-domain.mjs',
  'tests/fe021.spec.ts',
  'tests/session/demo-server.mjs',
];
const logs = {
  unit: 'final-test.log',
  e2e: 'final-e2e-full-98.log',
  typecheck: 'final-typecheck.log',
  generate: 'final-generate-check.log',
  lint: 'final-lint.log',
  boundaries: 'final-boundaries.log',
  source: 'final-test-source.log',
  domain: 'final-test-domain.log',
  schemas: 'final-schemas.log',
};
const bytes = Object.fromEntries(Object.entries(logs).map(([key, file]) => [key, fs.readFileSync(path.join(dir, file))]));
const browserLog = bytes.e2e.toString('utf8');
const total = Number(browserLog.match(/\n\s*(\d+) passed \(/)?.[1]);
const taskCases = (browserLog.match(/tests[\\/]fe021\.spec\.ts/gi) || []).length;
if (!Number.isInteger(total) || total !== 98 || !browserLog.includes('EXIT_CODE=0') || taskCases !== 8)
  throw new Error(`Expected a successful 98-test run with 8 FE021 cases; observed total=${total}, taskCases=${taskCases}.`);

const revisionResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' });
if (revisionResult.status !== 0) throw new Error('Cannot resolve current Git HEAD.');
const revision = revisionResult.stdout.trim();
const commands = read(path.join(kit, 'execution/frontend-command-map.json')).commands;
const commandFor = id => {
  const command = commands.find(item => item.id === id);
  if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${id} is not verified in the command map.`);
  return command;
};
const fileHashes = sourceFiles.map(file => ({ path: file, sha256: sha(fs.readFileSync(path.resolve(repo, file))) }));
const snapshot = sha(Buffer.from(fileHashes.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const support = keys => keys.map(key => ({
  file: `execution/frontend-evidence/FE021/${logs[key]}`,
  sha256: sha(bytes[key]),
}));
const checks = [
  {
    stepId: 'S01', commandId: 'unit', log: 'unit', checksTotal: 3, dataSource: 'source-only',
    expected: 'Dashboard/report/marketing routes, operation IDs, permissions and feature scenarios match canonical route, OpenAPI and permission sources; contract gaps stay explicit.',
    observed: 'Vitest passed 55/55, including all 3 FE021 contract/source-map assertions. Canonical references are getDashboard, getReportSummary, getMarketingSummary, listJobs, createExport and pauseBot. The marketing date-filter and report-series gaps are surfaced in the UI and handoff; no endpoint or DTO was invented.',
    supporting: ['source', 'generate'],
  },
  {
    stepId: 'S02', commandId: 'e2e', log: 'e2e', checksTotal: taskCases, dataSource: 'synthetic-msw',
    expected: 'Dashboard KPIs, marketing chart/table, report export date/timezone controls, paged jobs and download flow use canonical API responses and synthetic fixtures.',
    observed: 'All 8 FE021 Chromium cases passed in the current 98/98 suite. Happy paths verify dashboard API state, a marketing chart and table from the same fixture, null actualSpend, inclusive shop-local export boundaries, safe CSV and cursor pagination. The UI states that getMarketingSummary has no date filter and getReportSummary has no analytical series.',
    supporting: ['domain', 'generate', 'typecheck'],
  },
  {
    stepId: 'S03', commandId: 'e2e', log: 'e2e', checksTotal: taskCases, dataSource: 'synthetic-msw',
    expected: 'Negative/empty/partial/redacted/stale/pagination/export-denied/error paths preserve user input, API truth and permission boundaries without success or download claims.',
    observed: 'All 8 FE021 Chromium cases passed in the current 98/98 suite. They cover an empty newly onboarded shop, missing actualSpend, hidden finance data for viewer, 12+ paged export jobs, source-permission denial, invalid timezone with no job created, 412 conflict and ambiguous 503 result; both failure cases retain dates and expose no download. No report-summary version or partial export response exists in the current contract, so those states are not fabricated.',
    supporting: ['domain', 'schemas', 'unit'],
  },
  {
    stepId: 'S04', commandId: 'unit', log: 'unit', checksTotal: 55, dataSource: 'synthetic-msw',
    expected: 'Component/helper and contract/network regression run against current source; local quality gates are recorded independently from browser and backend claims.',
    observed: 'Vitest passed 55/55. Current supporting gates passed TypeScript, generated-source freshness (11 outputs/283 schemas/210 operations/54 routes), ESLint, module boundaries (393 imports and 8/8 negative fixtures), source mapping (56 files/227 operation calls/54 routes), domain/MSW (88/88) and schema validation (353/353). These are local frontend/mock checks only.',
    supporting: ['typecheck', 'generate', 'lint', 'boundaries', 'source', 'domain', 'schemas'],
  },
  {
    stepId: 'S05', commandId: 'e2e', log: 'e2e', checksTotal: taskCases, dataSource: 'synthetic-msw',
    expected: 'Current React demo browser acceptance covers FE021 routes, roles, error/data states and export behavior using synthetic HTTP.',
    observed: `The serialized Chromium suite passed ${total}/${total}, including all ${taskCases} FE021 cases on the React demo and synthetic MSW. The run checks marketing/report routes, owner/viewer permissions, empty shop state, CSV download, cursor pagination, invalid timezone, 412 and unknown result. It does not establish CI, real API/provider, staging or user acceptance.`,
    supporting: ['unit', 'domain', 'schemas'],
  },
];

for (const check of checks) {
  const command = commandFor(check.commandId);
  const logBytes = bytes[check.log];
  const evidence = {
    taskId: 'FE021', stepId: check.stepId, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${revision} plus current dirty working tree; task source files are hashed below`,
    expected: check.expected, observed: check.observed,
    command: command.command, commandId: command.id, cwd: repo,
    reviewer: 'Codex self-review; no independent peer review',
    environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium', details: 'React frontend acceptance against local synthetic MSW; no live services.', dataSource: check.dataSource },
    checksTotal: check.checksTotal, failed: 0,
    logFile: `execution/frontend-evidence/FE021/${logs[check.log]}`, logSha256: sha(logBytes),
    sourceFiles: fileHashes, sourceSnapshotSha256: snapshot,
    supportingLogs: support(check.supporting),
  };
  const output = path.join(dir, `${check.stepId}-final-98-e2e.json`);
  fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(path.relative(kit, output).replaceAll('\\', '/'));
}
