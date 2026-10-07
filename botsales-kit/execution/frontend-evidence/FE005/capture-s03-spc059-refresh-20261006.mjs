import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const dir = 'botsales-kit/execution/frontend-evidence/FE005';
const helper = `${dir}/capture-s03-spc059-refresh-20261006.mjs`;
const unitLogPath = `${dir}/S03-unit-spc059-current-20261006.log`;
const focusedLogPath = `${dir}/S03-api-focused-spc059-current-20261006.log`;
const evidencePath = `${dir}/S03-spc059-refresh-20261006.json`;
const finalLogPath = `${dir}/S03-spc059-refresh-20261006.log`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const bytes = file => fs.readFileSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);

const commandMap = JSON.parse(read('botsales-kit/execution/frontend-command-map.json'));
const unitCommand = commandMap.commands.find(command => command.id === 'unit');
assert(unitCommand?.status === 'VERIFIED_AVAILABLE', 'Registered unit command is unavailable');
const unitLog = read(unitLogPath);
const focusedLog = read(focusedLogPath);
assert(unitLog.includes(`command=${unitCommand.command}`) && /^exitCode=0$/m.test(unitLog), 'Registered full unit suite did not exit 0');
assert(/Test Files\s+10 passed \(10\)/.test(unitLog) && /Tests\s+93 passed \(93\)/.test(unitLog), 'Full unit suite did not pass 93/93');
assert(/Test Files\s+1 passed \(1\)/.test(focusedLog) && /Tests\s+23 passed \(23\)/.test(focusedLog) && /^exitCode=0$/m.test(focusedLog), 'Focused API transport suite did not pass 23/23');

const client = read('apps/web/src/shared/api/client.ts');
const validation = read('apps/web/src/shared/api/validation.ts');
const apiTests = read('apps/web/tests/api-client.test.tsx');
const operations = JSON.parse(read('packages/contracts/src/operations.json'));
const requiredTestTitles = [
  'adds CSRF and idempotency headers', 'sets If-Match from the required typed version option',
  'fails closed when a contract-required version or CSRF token is missing', 'rejects invalid CSRF and idempotency values',
  'validates path and query values against generated operation parameter schemas', 'does not send a caller-aborted request',
  'aborts an in-flight read when the caller AbortSignal fires', 'classifies a mutation timeout as an unknown result',
  'marks a successful HTTP response with an invalid DTO as unknown for mutations',
  'waits for command completion after HTTP 202 before resolving useCommand',
];
for (const title of requiredTestTitles) assert(apiTests.includes(title), `API transport regression is missing: ${title}`);
for (const invariant of ["credentials: 'same-origin'", "cache: 'no-store'", "'X-CSRF-Token'", "'Idempotency-Key'", "'If-Match'", 'AbortSignal', 'assertSchema<ResponseOf<K>>']) {
  assert(client.includes(invariant), `API client invariant missing: ${invariant}`);
}
assert(validation.includes('schemaCatalog') && validation.includes('assertParameterSchema'), 'Runtime validators are not backed by generated contract schemas');
const operationMetadata = Object.values(operations);
assert(operationMetadata.length === 210 && operationMetadata.every(operation => Array.isArray(operation.pathParameters) && Array.isArray(operation.queryParameters) && Array.isArray(operation.headers)), 'Generated operation metadata is missing contract parameter/header schemas');

const sourceRoot = path.join(root, 'apps/web/src');
const sourcePaths = fs.readdirSync(sourceRoot, { recursive: true }).filter(file => /\.(ts|tsx)$/.test(file)).map(file => `apps/web/src/${file.replaceAll('\\', '/')}`);
const directFetchFiles = sourcePaths.filter(file => /(?<![A-Za-z])fetch\s*\(/.test(read(file)));
assert(directFetchFiles.length === 1 && directFetchFiles[0] === 'apps/web/src/shared/api/client.ts', `Fetch escaped the shared transport boundary: ${directFetchFiles.join(', ')}`);
assert(sourcePaths.filter(file => /apps\/web\/src\/modules\//.test(file)).every(file => !/['"`]\/api\/v2(?:\/|['"`])/.test(read(file))), 'A feature module hardcodes the API base path');

const sourceFiles = [...new Set([...sourcePaths,
  'package.json', 'apps/web/package.json', 'apps/web/vitest.config.ts', 'apps/web/tests/setup.ts',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/validation.ts', 'apps/web/tests/api-client.test.tsx',
  'packages/contracts/src/operations.json', 'scripts/generate.mjs', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-plan.json',
  unitLogPath, focusedLogPath, helper,
])].sort().map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';
const checks = [
  { label: 'registered frontend unit tests', observed: 'npm test passed 93/93 tests across 10 files.' },
  { label: 'focused API transport tests', observed: 'The API client test file passed all 23 tests.' },
  { label: 'credential and mutation headers', observed: 'CSRF and idempotency values are checked against generated header schemas; required If-Match versions are positive safe integers.' },
  { label: 'request and response contract validation', observed: 'Path/query parameters, request bodies and response DTOs are validated from generated schemas before being trusted.' },
  { label: 'cancellation and mutation uncertainty', observed: 'Caller abort and scope cancellation propagate; ambiguous mutation outcomes are stored as unknown and are not retried blindly.' },
  { label: 'transport boundary', observed: `The only direct fetch call is in ${directFetchFiles[0]}; modules contain no hardcoded /api/v2 base path.` },
];
const log = [
  'FE005.S03 typed API transport lifecycle verification', `executedAt=${executedAt}`, `cwd=${root}`,
  `REGISTERED COMMAND unit: ${unitCommand.command}`, `UNIT LOG ${unitLogPath}; sha256=${sha(Buffer.from(unitLog))}`,
  `FOCUSED SUPPLEMENT node.exe node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts apps/web/tests/api-client.test.tsx`, `FOCUSED LOG ${focusedLogPath}; sha256=${sha(Buffer.from(focusedLog))}`,
  `unit=93/93; focusedApi=23/23; generatedOperations=${operationMetadata.length}; directFetchFiles=${directFetchFiles.join(',')}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap(check => [`CHECK ${check.label}: PASS`, check.observed]),
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local transport tests do not prove server behavior or a live integration.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`), `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, finalLogPath), log, 'utf8');
const evidence = {
  taskId: 'FE005', stepId: 'S03', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} plus current frontend working tree`,
  expected: 'The typed client uses generated contract metadata for credentials, CSRF/version/idempotency, cancellation, Problem parsing, and request/response validation; no module bypasses transport.',
  observed: `Registered unit command passed 93/93; focused API client tests passed 23/23. Contract metadata covers ${operationMetadata.length} operations and the sole fetch call is in the shared API client.`,
  commandId: unitCommand.id, command: unitCommand.command, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / local frontend test toolchain`, details: 'Registered full frontend unit suite passed. A focused Vitest invocation was recorded as supplemental transport evidence; all API responses were synthetic test fixtures.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, logFile: finalLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  commandResults: [
    { commandId: unitCommand.id, command: unitCommand.command, exitCode: 0, logFile: unitLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(unitLog)) },
    { command: 'node.exe node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts apps/web/tests/api-client.test.tsx', exitCode: 0, logFile: focusedLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(focusedLog)) },
  ],
  transportReview: { generatedOperationCount: operationMetadata.length, focusedApiTests: 23, fullUnitTests: 93, directFetchFiles, hardcodedApiBaseInModules: false, credentials: 'same-origin', mutationUnknownOutcomeReconciliation: true },
};
fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', fullUnit: '93/93', focusedApi: '23/23', operations: operationMetadata.length, directFetchFiles, evidence: evidencePath }, null, 2));
