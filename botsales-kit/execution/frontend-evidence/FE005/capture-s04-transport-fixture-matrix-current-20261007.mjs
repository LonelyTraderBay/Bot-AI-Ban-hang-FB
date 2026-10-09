import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const fe = process.cwd();
const repo = path.resolve(fe, '..');
const kit = path.join(repo, 'botsales-kit');
const out = path.join(kit, 'execution/frontend-evidence/FE005');
const helper = path.join(out, 'capture-s04-transport-fixture-matrix-current-20261007.mjs');
const receiptPath = path.join(out, 'S04-transport-fixture-matrix-current-20261007.json');
const logPath = path.join(out, 'S04-transport-fixture-matrix-current-20261007.log');
const focusedLogPath = path.join(out, 'S04-api-client-focused-current-20261007.log');
const browserLogPath = path.join(out, 'S04-fe017-validation-chromium-current-20261007.log');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const rel = file => path.relative(fe, file).startsWith('..')
  ? `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`
  : path.relative(fe, file).replaceAll('\\', '/');
const read = file => fs.readFileSync(path.join(fe, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(path.basename(fe) === 'BotSalesAI_Frontend', `Unexpected cwd: ${fe}`);

const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const unit = commandMap.commands.find(command => command.id === 'unit');
assert(unit?.status === 'VERIFIED_AVAILABLE' && unit.cwd === 'BotSalesAI_Frontend', 'Registered unit command unavailable');
const apiReceiptPath = path.join(out, 'S03-api-client-current-20261007.receipt.json');
const apiReceipt = JSON.parse(fs.readFileSync(apiReceiptPath, 'utf8'));
const apiUnitLogPath = path.join(out, 'S03-unit-current-20261007.log');
const apiUnitLog = fs.readFileSync(apiUnitLogPath, 'utf8');
assert(apiReceipt.taskId === 'FE005' && apiReceipt.stepId === 'S03' && apiReceipt.result === 'PASS', 'Current S03 evidence missing');
assert(/Tests\s+138 passed \(138\)/.test(apiUnitLog), 'Current full unit run is not 138/138');

const env = { ...process.env };
const systemRoot = env.SystemRoot || 'C:\\Windows';
env.PATH = ['C:\\Program Files\\nodejs', path.join(systemRoot, 'System32'), path.join(systemRoot, 'System32/WindowsPowerShell/v1.0'), systemRoot].join(';');
const run = (command, logFile) => {
  const result = spawnSync('cmd.exe', ['/d', '/c', command], { cwd: fe, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const output = `Command: ${command}\nCWD: ${fe}\nExit: ${result.status}\n${result.error ? `Error: ${result.error.message}\n` : ''}\n${result.stdout || ''}${result.stderr ? `\n[stderr]\n${result.stderr}` : ''}`;
  fs.writeFileSync(logFile, output, 'utf8');
  assert(!result.error && result.status === 0, `${command} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return { command, exitCode: result.status, logFile, logSha256: sha(Buffer.from(output)), output };
};

const focusedCommand = `${unit.command} -- --run apps/web/tests/api-client.test.tsx`;
const focused = run(focusedCommand, focusedLogPath);
const focusedCount = [...focused.output.matchAll(/Tests\s+(\d+)\s+passed/g)].map(match => Number(match[1])).at(-1) ?? 0;
assert(focusedCount > 0, 'Focused API client suite did not report passing tests');
const browserCommand = 'node.exe node_modules/@playwright/test/cli.js test --config=playwright.config.ts tests/fe017-validation.spec.ts --project=chromium --reporter=line --timeout=45000';
const browser = run(browserCommand, browserLogPath);
assert(/1 passed/.test(browser.output), 'Synthetic 422 Chromium scenario did not report 1 passed');

const apiTests = read('apps/web/tests/api-client.test.tsx');
const validationSpec = read('tests/fe017-validation.spec.ts');
for (const marker of [
  'preserves contract nulls, adds CSRF and idempotency headers',
  'rejects a successful HTTP status that differs from the operation contract',
  'marks a successful HTTP response with an invalid DTO as unknown for mutations',
  'preserves structured Problem data for HTTP %i',
  'classifies a mutation timeout as an unknown result and a read timeout as retryable transport failure',
  'waits for command completion after HTTP 202 before resolving useCommand',
  'keeps an accepted command unresolved when command status polling fails',
]) assert(apiTests.includes(marker), `Transport fixture is missing: ${marker}`);
assert(/it\.each\(\[409, 412, 422, 428, 429\]\)/.test(apiTests), 'Problem status matrix is incomplete');
assert(validationSpec.includes('FE017 synthetic 422 keeps the knowledge draft fields and shows field errors'), 'Synthetic 422 browser regression missing');
assert(validationSpec.includes("getByRole('alert')") && validationSpec.includes('Hãy rà soát nội dung nguồn.'), '422 UI case does not assert visible field error');

const fixtureMatrix = ['200 success', '202 accepted/polling', '204 declared no-content', '409', '412', '422', '428', '429', 'timeout', 'invalid schema/DTO', 'optional/null'];
const checks = [
  `current full unit suite passed 138/138 and strict typecheck passed in FE005.S03`,
  `focused API client suite passed ${focusedCount} tests`,
  'HTTP 202 is polled to a terminal command state before resolving',
  '409/412/422/428/429 Problem responses retain field error and retry metadata',
  'timeouts, invalid DTOs, and unsupported response statuses do not report mutation success',
  'Chromium synthetic 422 preserves title/content and renders a field-specific alert',
  'all requests and browser responses use local fixtures; no backend/provider was invoked',
];
const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const files = [
  path.join(fe, 'package.json'), path.join(fe, 'package-lock.json'), path.join(fe, 'apps/web/package.json'),
  path.join(fe, 'apps/web/vitest.config.ts'), path.join(fe, 'apps/web/src/shared/api/client.ts'),
  path.join(fe, 'apps/web/src/shared/api/validation.ts'), path.join(fe, 'apps/web/tests/api-client.test.tsx'),
  path.join(fe, 'tests/fe017-validation.spec.ts'), path.join(fe, 'tests/session/demo-server.mjs'),
  path.join(fe, 'packages/contracts/src/operations.json'), path.join(kit, 'contracts/openapi.json'),
  path.join(kit, 'execution/frontend-command-map.json'), apiReceiptPath, apiUnitLogPath,
  focusedLogPath, browserLogPath, helper,
];
const sourceFiles = [...new Set(files)].map(file => ({ path: rel(file), sha256: sha(fs.readFileSync(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const executionLog = [
  'FE005.S04 current transport fixture matrix and validation-form browser regression',
  `revision=HEAD ${revision} plus current working tree; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; cwd=${fe}`,
  `S03 full unit/type receipt=${rel(apiReceiptPath)}; unit=138/138; typecheck=exit 0`,
  `fixtureMatrix=${fixtureMatrix.join(',')}`,
  `focused=${focused.command}; exit=${focused.exitCode}; passingTests=${focusedCount}; log=${rel(focusedLogPath)}; sha256=${focused.logSha256}`,
  `browser=${browser.command}; exit=${browser.exitCode}; result=1 passed; log=${rel(browserLogPath)}; sha256=${browser.logSha256}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.map(check => `CHECK PASS: ${check}`),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  'No live API/backend/provider was used; browser test intercepts a synthetic 422.',
].join('\n') + '\n';
fs.writeFileSync(logPath, executionLog, 'utf8');
const evidence = {
  taskId: 'FE005', stepId: 'S04', kind: 'test_run', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${revision} plus current frontend working tree`,
  expected: 'Test synthetic transport success/status/schema/error fixtures for 200/202/204, 409/412/422/428/429, timeout, and optional/null data; verify 422 form retention in Chromium.',
  observed: `FE005.S03 full unit/type gates remain current at 138/138 and exit 0; focused API client suite passed ${focusedCount}; Chromium synthetic 422 passed 1/1. Tests cover polling accepted commands, exact status handling, structured Problems, field errors, timeouts, invalid DTOs, and optional/null fields. No live API/backend/provider was invoked.`,
  commandId: unit.id, command: unit.command, cwd: fe, reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: 'Windows Node/npm frontend unit and Chromium verification', details: `Node ${process.versions.node}; current Git HEAD ${revision}; registered unit command plus Chromium Playwright; synthetic fixtures only.`, dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, fixtureMatrix, sourceFiles, sourceSnapshotSha256,
  commands: [
    { command: focused.command, exitCode: focused.exitCode, passedTests: focusedCount, logFile: path.relative(kit, focusedLogPath).replaceAll('\\', '/'), logSha256: focused.logSha256 },
    { command: browser.command, exitCode: browser.exitCode, passed: 1, logFile: path.relative(kit, browserLogPath).replaceAll('\\', '/'), logSha256: browser.logSha256 },
  ],
  logFile: path.relative(kit, logPath).replaceAll('\\', '/'), logSha256: sha(Buffer.from(executionLog)),
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', fixtureMatrix, focusedTests: focusedCount, browser: '1/1', receipt: rel(receiptPath), logSha256: evidence.logSha256 }, null, 2));
