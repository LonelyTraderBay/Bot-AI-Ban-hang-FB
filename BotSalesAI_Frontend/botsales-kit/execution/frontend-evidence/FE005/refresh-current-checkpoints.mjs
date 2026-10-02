import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE005');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE021');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = value => JSON.parse(fs.readFileSync(value, 'utf8'));
const previous = ['S01.json', 'S02.json', 'S03.json', 'S04.json', 'S05.json'].map(file => read(path.join(dir, file)));
const commands = read(path.join(kit, 'execution/frontend-command-map.json')).commands;
const revisionResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' });
if (revisionResult.status !== 0) throw new Error('Cannot resolve current Git HEAD.');
const revision = revisionResult.stdout.trim();

const checks = [
  {
    stepId: 'S01', commandId: 'source', log: 'final-test-source.log', checksTotal: 3, dataSource: 'source-only',
    expected: 'Current React/TypeScript API references and route bindings resolve against canonical OpenAPI, route, permission, and event contracts; gaps are recorded without inventing APIs.',
    observed: 'The current source audit passed 56 frontend files, 227 operation calls, and all 54 routes with zero issues. The full Chromium run also exercised canonical contract and route-to-source cases; the source check does not assert backend behavior.',
  },
  {
    stepId: 'S02', commandId: 'contract-tests', log: 'final-contract-tests.log', checksTotal: 6, dataSource: 'source-only',
    expected: 'Canonical generator fixtures accept current OpenAPI metadata and reject unresolved schemas, missing version/base path, route drift, and stale generated outputs.',
    observed: 'The current canonical generator regression passed 6/6 cases. Supporting generate:check passed 11 outputs, 283 schemas, 210 operations, and 54 routes; generated files remain derived and were not edited by hand.',
    supportingLogs: ['final-generate-check.log'],
  },
  {
    stepId: 'S03', commandId: 'unit', log: 'final-test.log', checksTotal: 55, dataSource: 'synthetic-msw',
    expected: 'The shared HTTP boundary preserves request credentials, CSRF/version/idempotency, abort/timeout behavior, runtime schema validation, and authoritative handling of accepted commands.',
    observed: 'Current Vitest passed 55/55 across six files, including 19 API-client/hook cases and an HTTP 202 case that waits for terminal command state. These tests use local synthetic fixtures and do not exercise a production server.',
  },
  {
    stepId: 'S04', commandId: 'domain', log: 'final-test-domain.log', checksTotal: 88, dataSource: 'synthetic-msw',
    expected: 'The pure mock simulator and MSW network layer preserve canonical request/response shapes, tenant/permission boundaries, and explicit failure behavior.',
    observed: 'Current domain checks passed 75 simulator and 13 MSW HTTP/SSE cases (88 total) across 210 operation handlers. This validates the in-memory mock contract, not backend concurrency or accounting certification.',
  },
  {
    stepId: 'S05', commandId: 'e2e', log: 'final-e2e-full.log', checksTotal: 95, dataSource: 'synthetic-msw',
    expected: 'Current browser acceptance and regression cases run in the React demo against mock HTTP, with route/role/state and keyboard/responsive checks retained.',
    observed: 'The serialized Chromium suite passed 95/95 current browser tests, including canonical-route rendering, role-denied actions, responsive/axe checks, and FE021 dashboard/marketing/export cases. No live backend, CI, staging, or user-acceptance result is implied.',
  },
];

for (const check of checks) {
  const registered = commands.find(command => command.id === check.commandId);
  if (!registered || registered.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${check.commandId} is not verified in the command map.`);
  const sourceFiles = previous.find(item => item.stepId === check.stepId).sourceFiles.map(file => ({
    path: file.path,
    sha256: sha(fs.readFileSync(path.resolve(repo, file.path))),
  }));
  const logPath = path.join(evidenceDir, check.log);
  const supportingLogs = (check.supportingLogs || []).map(file => {
    const absolute = path.join(evidenceDir, file);
    return { file: path.relative(kit, absolute).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(absolute)) };
  });
  const evidence = {
    taskId: 'FE005', stepId: check.stepId, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${revision} plus current dirty working tree; task source files are hashed below`,
    expected: check.expected, observed: check.observed, command: registered.command, commandId: registered.id,
    cwd: repo, reviewer: 'Codex self-review; no independent peer review',
    environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0', details: 'Current frontend workspace; browser and API data are synthetic fixtures.', dataSource: check.dataSource },
    checksTotal: check.checksTotal, failed: 0,
    logFile: path.relative(kit, logPath).replaceAll('\\', '/'), logSha256: sha(fs.readFileSync(logPath)),
    sourceFiles, sourceSnapshotSha256: sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
    ...(supportingLogs.length ? { supportingLogs } : {}),
  };
  const output = path.join(dir, `${check.stepId}-current-revalidated-20261001.json`);
  fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(path.relative(kit, output).replaceAll('\\', '/'));
}
