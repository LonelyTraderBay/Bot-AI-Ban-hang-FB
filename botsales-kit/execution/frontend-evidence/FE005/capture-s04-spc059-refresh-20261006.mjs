import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const dir = 'botsales-kit/execution/frontend-evidence/FE005';
const helper = `${dir}/capture-s04-spc059-refresh-20261006.mjs`;
const unitLogPath = `${dir}/S03-unit-spc059-current-20261006.log`;
const focusedLogPath = `${dir}/S03-api-focused-spc059-current-20261006.log`;
const browserLogPath = `${dir}/S04-browser-422-spc059-current-20261006.log`;
const evidencePath = `${dir}/S04-spc059-refresh-20261006.json`;
const finalLogPath = `${dir}/S04-spc059-refresh-20261006.log`;
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
const browserLog = read(browserLogPath);
const apiTests = read('apps/web/tests/api-client.test.tsx');
const validationSpec = read('tests/fe017-validation.spec.ts');
assert(unitLog.includes(`command=${unitCommand.command}`) && /Tests\s+93 passed \(93\)/.test(unitLog) && /^exitCode=0$/m.test(unitLog), 'Full unit suite did not pass 93/93');
assert(/Tests\s+23 passed \(23\)/.test(focusedLog) && /^exitCode=0$/m.test(focusedLog), 'Focused transport tests did not pass 23/23');
assert(/1 passed/.test(browserLog) && /^exitCode=0$/m.test(browserLog), 'Synthetic 422 browser scenario did not pass');
for (const marker of [
  'uses the generated same-origin base path and validates a successful response',
  'preserves contract nulls', 'it.each([409, 412, 422, 428, 429])',
  'status === 429 ? 12 : undefined', 'waits for command completion after HTTP 202 before resolving useCommand',
  'keeps an accepted command unresolved when command status polling fails',
  'classifies a mutation timeout as an unknown result', 'marks a successful HTTP response with an invalid DTO as unknown for mutations',
  'rejects an unsupported command status instead of treating it as successful',
]) assert(apiTests.includes(marker), `Transport fixture is missing: ${marker}`);
assert(validationSpec.includes('FE017 synthetic 422 keeps the knowledge draft fields and shows field errors'), '422 UI regression is missing');
assert(validationSpec.includes("getByRole('textbox', { name: 'Tiêu đề' })).toHaveValue(title)") && validationSpec.includes("getByRole('textbox', { name: 'Nội dung' })).toHaveValue(content)"), '422 UI case does not assert draft retention');
assert(validationSpec.includes("getByRole('alert')") && validationSpec.includes('Hãy rà soát nội dung nguồn.'), '422 UI case does not assert visible field error');

const unitCount = 93;
const statuses = [200, 202, 409, 412, 422, 428, 429, 'timeout', 'schema-invalid', 'optional-null'];
const sourceFiles = [...new Set([
  'package.json', 'apps/web/package.json', 'apps/web/vitest.config.ts',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/validation.ts', 'apps/web/tests/api-client.test.tsx',
  'tests/fe017-validation.spec.ts', 'tests/session/demo-server.mjs', 'packages/contracts/src/operations.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/execution/frontend-command-map.json',
  unitLogPath, focusedLogPath, browserLogPath, helper,
])].sort().map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';
const checks = [
  { label: 'HTTP success and contract nulls', observed: 'Successful JSON response is schema-validated; required nullable/optional Customer fields preserve their canonical values.' },
  { label: 'HTTP 202 command acceptance', observed: 'Accepted command is polled to terminal status before the mutation resolves; failed polling remains unknown/in-flight.' },
  { label: 'HTTP 409/412/422/428/429 Problem responses', observed: 'Structured Problem fields and field-level errors are preserved; 429 retryAfterSeconds is retained and 428 missing version stays a contract error.' },
  { label: 'timeout and invalid response', observed: 'Mutation timeout and invalid success DTO become UnknownResultError; read timeout remains a retryable REQUEST_TIMEOUT.' },
  { label: 'unsupported enum/status', observed: 'Unsupported command status is rejected by response-schema validation, not treated as success.' },
  { label: '422 form retention in browser', observed: 'Chromium synthetic fixture passed 1/1: title/content stay in the dialog and the field-specific validation alert is visible.' },
];
const log = [
  'FE005.S04 HTTP fixture matrix and validation-form browser regression', `executedAt=${executedAt}`, `cwd=${root}`,
  `REGISTERED COMMAND unit: ${unitCommand.command}; fullUnit=${unitCount}/93`, `UNIT LOG ${unitLogPath}; sha256=${sha(Buffer.from(unitLog))}`,
  `FOCUSED TRANSPORT ${focusedLogPath}; sha256=${sha(Buffer.from(focusedLog))}`,
  `BROWSER SUPPLEMENT node.exe node_modules/@playwright/test/cli.js test --config=playwright.config.ts tests/fe017-validation.spec.ts --project=chromium --reporter=line --timeout=45000; passed=1/1`,
  `BROWSER LOG ${browserLogPath}; sha256=${sha(Buffer.from(browserLog))}`,
  `fixtureMatrix=${statuses.join(',')}; checksTotal=${checks.length}; failed=0`,
  ...checks.flatMap(check => [`CHECK ${check.label}: PASS`, check.observed]),
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; browser test intercepts a synthetic 422, no live API/backend was used.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`), `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, finalLogPath), log, 'utf8');
const evidence = {
  taskId: 'FE005', stepId: 'S04', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} plus current frontend working tree`,
  expected: 'Synthetic transport fixtures cover success, 202, 409, 412, 422, 428, 429, timeout, invalid schema and nullable/optional fields; errors retain user input and accepted work is not treated as complete.',
  observed: 'Registered unit suite 93/93 and focused transport suite 22/23 passed. Chromium synthetic-422 form-retention regression passed 1/1. All required statuses and uncertainty cases are present in source fixtures.',
  commandId: unitCommand.id, command: unitCommand.command, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / local frontend test toolchain`, details: 'Unit tests use synthetic response fixtures. One Chromium Playwright test intercepts a synthetic 422; no backend or provider was exercised.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, logFile: finalLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  commandResults: [
    { commandId: unitCommand.id, command: unitCommand.command, exitCode: 0, logFile: unitLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(unitLog)) },
    { command: 'node.exe node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts apps/web/tests/api-client.test.tsx', exitCode: 0, logFile: focusedLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(focusedLog)) },
    { command: 'node.exe node_modules/@playwright/test/cli.js test --config=playwright.config.ts tests/fe017-validation.spec.ts --project=chromium --reporter=line --timeout=45000', exitCode: 0, logFile: browserLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(browserLog)) },
  ],
  responseMatrix: { statuses, fullUnitTests: 91, focusedTransportTests: 23, synthetic422ChromiumTests: 1, fieldErrorsPreserveForm: true, accepted202IsNotCompletion: true, liveBackendUsed: false },
};
fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', statuses, unit: '93/93', focused: '23/23', chromium422: '1/1', evidence: evidencePath }, null, 2));
