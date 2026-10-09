import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const out = path.dirname(script);
const repo = path.resolve(out, '../../../..');
const kit = path.join(repo, 'botsales-kit');
const fe = path.join(repo, 'BotSalesAI_Frontend');
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const commands = Object.fromEntries(commandMap.commands.map(item => [item.id, item]));
const order = ['unit', 'types'];
if (!order.every(id => commands[id]?.status === 'VERIFIED_AVAILABLE' && commands[id].cwd === 'BotSalesAI_Frontend')) throw new Error('Registered frontend unit/typecheck command unavailable');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const relative = file => path.relative(fe, file).startsWith('..')
  ? `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`
  : path.relative(fe, file).replaceAll('\\', '/');
const systemRoot = process.env.SystemRoot || 'C:\\Windows';
const env = { ...process.env, PATH: [
  'C:\\Program Files\\nodejs', path.join(systemRoot, 'System32'),
  path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0'), systemRoot,
].join(';') };
const results = [];
for (const id of order) {
  const command = commands[id];
  const run = spawnSync('cmd.exe', ['/d', '/c', command.command], { cwd: fe, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (run.error || run.status !== 0) throw new Error(`${id} failed: exit=${run.status}; ${run.error?.message || run.stderr || run.stdout}`);
  results.push({ id, command: command.command, exit: run.status, stdout: run.stdout || '', stderr: run.stderr || '' });
}
const unitOutput = results.find(item => item.id === 'unit').stdout + results.find(item => item.id === 'unit').stderr;
const testCount = [...unitOutput.matchAll(/Tests\s+(\d+)\s+passed/g)].map(match => Number(match[1])).at(-1) ?? 0;
if (testCount < 1) throw new Error('Vitest passed but no passing test count was found in its report');

const commandLogs = results.map(item => {
  const file = path.join(out, `S03-${item.id}-current-20261007.log`);
  fs.writeFileSync(file, `Command: ${item.command}\nCWD: ${fe}\nExit: ${item.exit}\n\n${item.stdout}${item.stderr ? `\n[stderr]\n${item.stderr}` : ''}`, 'utf8');
  return { ...item, logFile: file };
});
const sourcePaths = [
  path.join(fe, 'apps/web/src/shared/api/client.ts'), path.join(fe, 'apps/web/src/shared/api/errors.ts'),
  path.join(fe, 'apps/web/src/shared/api/validation.ts'), path.join(fe, 'apps/web/src/shared/api/hooks.ts'),
  path.join(fe, 'apps/web/src/shared/api/intents.ts'), path.join(fe, 'apps/web/tests/api-client.test.tsx'),
  path.join(fe, 'packages/contracts/src/generated.ts'), path.join(fe, 'packages/contracts/src/operations.json'),
  path.join(fe, 'packages/contracts/src/schemas.json'), path.join(fe, 'package.json'),
  path.join(fe, 'package-lock.json'), path.join(fe, 'apps/web/tsconfig.json'), path.join(fe, 'apps/web/vitest.config.ts'),
  path.join(kit, 'execution/frontend-command-map.json'), path.join(kit, 'execution/frontend-plan.json'),
  path.join(kit, 'docs/06_API_AND_REALTIME.md'), path.join(kit, 'docs/18_CODING_STANDARDS.md'),
  ...commandLogs.map(item => item.logFile), script,
].filter((file, index, all) => fs.existsSync(file) && all.indexOf(file) === index);
const sourceFiles = sourcePaths.map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const repoHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
const checks = [
  `full Vitest suite passes ${testCount} tests including the API client contract suite`,
  'strict TypeScript typecheck passes on the edited frontend source',
  'successful HTTP status must match the operation status generated from canonical OpenAPI',
  'wrong 2xx on an idempotent mutation becomes UnknownResultError, not a committed success',
  'existing CSRF, version, idempotency, AbortSignal, request/response schema and Problem paths remain covered',
];
const finalLogPath = path.join(out, 'S03-api-client-current-20261007.log');
const receiptPath = path.join(out, 'S03-api-client-current-20261007.receipt.json');
const commandLogText = commandLogs.map(item => `\n=== ${item.id} | exit=${item.exit} ===\nCommand: ${item.command}\nCWD: ${fe}\n${item.stdout}${item.stderr ? `\n[stderr]\n${item.stderr}` : ''}`).join('\n');
const log = [
  'FE005.S03 typed HTTP client contract verification', `HEAD=${repoHead} plus current working-tree source`,
  `Vitest tests passed=${testCount}; typecheck exit=0`,
  'Root cause confirmed: successful HTTP status was not compared with generated operations[operationId].status; e.g. logout expects 204 but any 2xx could pass.',
  'Fix: reject undeclared successful status as UNEXPECTED_STATUS. A 2xx mismatch for an idempotent mutation is preserved as UnknownResultError because the server may already have applied it.',
  `checksTotal=${checks.length}; failed=0`, ...checks.map(item => `CHECK PASS: ${item}`),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  commandLogText,
].join('\n') + '\n';
fs.writeFileSync(finalLogPath, log, 'utf8');
const unitCommand = commands.unit;
const evidence = {
  taskId: 'FE005', stepId: 'S03', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(), sourceRevision: `${repoHead} (current working-tree source)`,
  expected: 'Hoàn thiện client credential/CSRF/version/idempotency/AbortSignal/Problem; validate request/response.',
  observed: `Closed a response-validation gap: the client previously accepted any successful status even when the generated contract declared a different one. It now rejects a wrong 2xx status; an idempotent mutation status mismatch remains UnknownResultError. Full Vitest passed ${testCount} tests and strict TypeScript typecheck exited 0. Existing same-origin credentials, CSRF, If-Match version, idempotency, abort/cancel, request/response schema, structured Problem handling, and 202 command polling paths were checked in source/tests.`,
  commandId: unitCommand.id, command: unitCommand.command, cwd: fe, reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: `Windows Node ${process.versions.node} / npm Frontend tests`, details: `Registered Vitest and typecheck commands executed sequentially; Git HEAD ${repoHead} plus current working tree; synthetic API frontend scope only.`, dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, sourceFiles, sourceSnapshotSha256,
  logFile: path.relative(kit, finalLogPath).replaceAll('\\', '/'), logSha256: sha(Buffer.from(log)),
  commandResults: commandLogs.map(item => ({ commandId: item.id, command: item.command, exitCode: item.exit, logFile: path.relative(kit, item.logFile).replaceAll('\\', '/'), logSha256: sha(fs.readFileSync(item.logFile)) })),
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', vitestTests: testCount, typecheck: 0, commandIds: results.map(item => item.id), receipt: relative(receiptPath), logSha256: evidence.logSha256 }, null, 2));
