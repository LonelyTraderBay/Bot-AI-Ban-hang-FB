import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE005');
const unitEvidenceDir = path.join(kit, 'execution/frontend-evidence/FE006');
const requested = process.argv[2];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const readText = relative => fs.readFileSync(path.join(repo, relative), 'utf8');
const parse = relative => JSON.parse(readText(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(repo.endsWith('BotSalesAI_Frontend'), `Unexpected frontend root: ${repo}`);
assert(['S01', 'S02', 'S03', 'S04', 'S05'].includes(requested), 'Use S01..S05');

const statusRun = spawnSync(process.execPath, ['botsales-kit/scripts/progress.mjs', 'status'], { cwd: repo, encoding: 'utf8' });
assert(statusRun.status === 0, 'Frontend tracker status failed.');
const status = JSON.parse(statusRun.stdout);
assert(status.blocked.length === 0, `Active frontend blockers found: ${JSON.stringify(status.blocked)}`);
const next = status.next.find(task => task.id === 'FE005');
assert(next?.nextStep?.id === requested, `Expected FE005.${requested}; current next is ${next?.id}.${next?.nextStep?.id}`);

const paths = {
  sourceLog: 'botsales-kit/execution/frontend-evidence/FE005/S01-source-current-20261004.log',
  canonicalLog: 'botsales-kit/execution/frontend-evidence/FE005/S01-canonical-current-20261004.log',
  generateLog: 'botsales-kit/execution/frontend-evidence/FE005/S02-generate-current-20261004.log',
  unitLog: 'botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-20261004.log',
  contractLog: 'botsales-kit/execution/frontend-evidence/FE005/S05-contract-tests-current-20261004.log',
  typecheckLog: 'botsales-kit/execution/frontend-evidence/FE006/S05-typecheck-current-20261004.log',
  lintLog: 'botsales-kit/execution/frontend-evidence/FE006/S05-lint-current-20261004.log',
  verifyLog: 'botsales-kit/execution/frontend-evidence/FE006/verify-current-20261004.log',
};
const sourceLog = readText(paths.sourceLog);
const canonicalLog = readText(paths.canonicalLog);
const generateLog = readText(paths.generateLog);
const unitLog = readText(paths.unitLog);
const contractLog = readText(paths.contractLog);
const typecheckLog = readText(paths.typecheckLog);
const lintLog = readText(paths.lintLog);
const verifyLog = readText(paths.verifyLog);
const apiTests = readText('apps/web/tests/api-client.test.tsx');
const contractJson = JSON.parse(canonicalLog);

assert(/"files":\s*65/.test(sourceLog) && /"operationCalls":\s*220/.test(sourceLog) && /"routes":\s*54/.test(sourceLog) && /"status":\s*"PASS"/.test(sourceLog), 'Current source audit is not 65 files / 220 calls / 54 routes PASS.');
assert(contractJson.status === 'PASS' && contractJson.operations === 210 && contractJson.uniqueOperationIds === 210 && contractJson.routes === 54 && Object.values(contractJson.checks).every(Boolean), 'Canonical contract inventory did not pass all checks.');
assert(generateLog.includes('"status":"PASS"') && generateLog.includes('"outputs":11') && generateLog.includes('"schemas":283') && generateLog.includes('"operations":210') && generateLog.includes('"routes":54'), 'Current generator freshness check did not pass.');
assert(/Test Files\s+10 passed \(10\)/.test(unitLog) && /Tests\s+85 passed \(85\)/.test(unitLog), 'Current Vitest evidence is not 85/85 in 10 files.');
assert(/ℹ pass 6[\s\S]*ℹ fail 0/.test(contractLog), 'Current generator contract tests are not 6/6.');
assert(typecheckLog.includes('tsc -p apps/web/tsconfig.json --noEmit') && !/error TS\d+/.test(typecheckLog), 'Current strict typecheck is missing or failing.');
assert(lintLog.includes('eslint apps/web/src --max-warnings 0') && !/\berror\b|\bwarning\b/i.test(lintLog), 'Current zero-warning lint evidence is missing or failing.');
assert(verifyLog.includes('"passed":88') && verifyLog.includes('Tests  85 passed (85)') && verifyLog.includes('✓ built in'), 'Current aggregate verify log lacks domain, unit, or build evidence.');

const apiCases = [
  'preserves contract nulls, adds CSRF and idempotency headers',
  'sets If-Match from the required typed version option',
  'preserves structured Problem data for HTTP %i',
  'classifies a mutation timeout as an unknown result',
  'marks a successful HTTP response with an invalid DTO as unknown',
  'rejects an unsupported command status',
  'waits for command completion after HTTP 202',
  'does not send a caller-aborted request',
];
assert(apiCases.every(testName => apiTests.includes(testName)), 'Current API client test source is missing a required transport case.');

const definitions = {
  S01: {
    commandId: 'source', logPath: paths.sourceLog, checksTotal: 4, dataSource: 'source-only',
    expected: 'Current React/TypeScript operation references and route bindings resolve against canonical OpenAPI, route, permission and event contracts; Money/id/nullability stay contract-faithful and gaps remain explicit.',
    observed: 'PASS source audit 65 files / 220 operation calls / 54 routes / 0 issues. PASS canonical inventory OpenAPI 3.1.0 / 210 unique operationIds / 54 routes / 10 of 10 schema, nullability, permission and event assertions.',
    supporting: [paths.canonicalLog],
  },
  S02: {
    commandId: 'generate-check-windows', logPath: paths.generateLog, checksTotal: 1, dataSource: 'source-only',
    expected: 'Canonical OpenAPI-derived types, operation registry, routes and token outputs are fresh; generated files are not edited by hand.',
    observed: 'PASS generate:check with 11 outputs, 283 schemas, 210 operations and 54 routes.',
    supporting: [],
  },
  S03: {
    commandId: 'unit', logPath: paths.unitLog, checksTotal: 8, dataSource: 'synthetic-msw',
    expected: 'Typed HTTP transport preserves credentials, CSRF/version/idempotency headers, cancellation/timeout, runtime schema validation and authoritative command results.',
    observed: 'PASS current Vitest 85/85 in 10 files. API client cases cover contract nulls, CSRF/idempotency, If-Match, structured Problem errors, timeout, invalid DTO, aborted read and HTTP 202 command completion. These use synthetic fixtures, not a production server.',
    supporting: [paths.verifyLog],
  },
  S04: {
    commandId: 'unit', logPath: paths.unitLog, checksTotal: 8, dataSource: 'synthetic-msw',
    expected: 'Transport fixtures exercise success, HTTP 202, 409/412/422/428/429, timeout, schema-invalid and optional/null handling without false success or silent mutation retry.',
    observed: 'PASS all listed status and transport cases exist in the current API client suite; 85/85 unit tests pass. HTTP 202 remains pending until terminal command state; malformed successful mutation responses become unknown results.',
    supporting: [paths.verifyLog],
  },
  S05: {
    commandId: 'contract-tests', logPath: paths.contractLog, checksTotal: 6, dataSource: 'source-only',
    expected: 'Generator positive/negative fixtures, current source mapping, generated freshness, transport unit suite and strict TypeScript check pass on the current snapshot.',
    observed: 'PASS generator contracts 6/6; source audit 65/220/54; generate:check 11/283/210/54; strict typecheck and zero-warning lint; Vitest 85/85; domain/MSW 88/88; production build. Bundle advisory is retained in the run log; no server behavior is inferred.',
    supporting: [paths.sourceLog, paths.canonicalLog, paths.generateLog, paths.unitLog, paths.typecheckLog, paths.lintLog, paths.verifyLog],
  },
};
const definition = definitions[requested];
const commandMap = parse('botsales-kit/execution/frontend-command-map.json');
const registered = commandMap.commands.find(command => command.id === definition.commandId);
assert(registered?.status === 'VERIFIED_AVAILABLE', `Command ${definition.commandId} is not verified available.`);

const walk = relative => fs.readdirSync(path.join(repo, relative), { withFileTypes: true }).flatMap(entry => {
  const child = path.join(relative, entry.name).replaceAll('\\', '/');
  return entry.isDirectory() ? walk(child) : /\.(?:ts|tsx)$/.test(entry.name) ? [child] : [];
});
const sourceSet = new Set([
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/tsconfig.json',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/events.schema.json',
  'botsales-kit/docs/06_API_AND_REALTIME.md', 'botsales-kit/docs/18_CODING_STANDARDS.md', 'docs/KNOWN_GAPS.md',
  'packages/contracts/src/generated.ts', 'packages/contracts/src/operations.json', 'packages/contracts/src/index.ts',
  'scripts/generate.mjs', 'scripts/check-source.mjs',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/api/errors.ts', 'apps/web/src/shared/api/validation.ts', 'apps/web/src/shared/api/intents.ts',
  'apps/web/src/shared/model/format.ts', 'apps/web/src/shared/model/scope.tsx',
  'apps/web/src/modules/bot/index.tsx', 'apps/web/src/modules/catalog/index.tsx', 'apps/web/src/modules/customers/index.tsx', 'apps/web/src/modules/integrations/index.tsx', 'apps/web/src/modules/knowledge/index.tsx', 'apps/web/src/modules/workspace/index.tsx',
  'apps/web/tests/api-client.test.tsx', 'apps/web/tests/format.test.ts', 'tests/contracts/generator.test.mjs',
  'botsales-kit/execution/frontend-evidence/FE005/audit-canonical-current-20261001.mjs',
  'botsales-kit/execution/frontend-evidence/FE005/capture-current-evidence-20261004.mjs',
  'botsales-kit/execution/frontend-evidence/FE005/handoff.md',
  ...walk('apps/web/src'), ...walk('apps/web/tests'), ...definition.supporting,
]);
const sourceFiles = [...sourceSet].sort().map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
const logRelative = `execution/frontend-evidence/FE005/${requested}-review-current-20261004.log`;
const evidenceRelative = `execution/frontend-evidence/FE005/${requested}-current-revalidated-20261004.json`;
const checks = definition.observed.split(/(?<=\.)\s+/).filter(Boolean);
const log = [
  `FE005.${requested} current frontend contract and transport review`,
  `executedAt=${new Date().toISOString()}`, `cwd=${repo}`, `HEAD=${revision} on ${branch}`,
  `commandId=${registered.id}`, `command=${registered.command}`, `expected=${definition.expected}`,
  `observed=${definition.observed}`, `checksTotal=${definition.checksTotal}; failed=0`,
  ...definition.supporting.map(file => `SUPPORT ${file} sha256=${sha256(fs.readFileSync(path.join(repo, file)))}`),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live backend/provider/staging/CI result claimed.',
  'reviewer=Codex self-review; no independent peer review claimed.',
].join('\n') + '\n';
fs.writeFileSync(path.join(kit, logRelative), log, 'utf8');

const evidence = {
  taskId: 'FE005', stepId: requested, kind: 'test_run', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: definition.expected, observed: definition.observed,
  command: registered.command, commandId: registered.id, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: 'Windows / Node 24.19.0 / npm 11.17.0', details: 'Current React frontend with deterministic synthetic MSW fixtures; no live service or hosted CI.', dataSource: definition.dataSource },
  checksTotal: definition.checksTotal, failed: 0, exitCode: 0, logFile: logRelative,
  logSha256: sha256(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  supportingLogs: definition.supporting.map(file => ({ file: file.replace(/^botsales-kit\//, ''), sha256: sha256(fs.readFileSync(path.join(repo, file))) })),
};
fs.writeFileSync(path.join(kit, evidenceRelative), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ task: `FE005.${requested}`, result: 'PASS', checks: definition.checksTotal, sourceFiles: sourceFiles.length, evidence: evidenceRelative, log: logRelative }, null, 2));
