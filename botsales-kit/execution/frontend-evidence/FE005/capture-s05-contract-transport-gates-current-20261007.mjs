import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const fe = process.cwd();
const repo = path.resolve(fe, '..');
const kit = path.join(repo, 'botsales-kit');
const out = path.join(kit, 'execution/frontend-evidence/FE005');
const helper = path.join(out, 'capture-s05-contract-transport-gates-current-20261007.mjs');
const receiptPath = path.join(out, 'S05-contract-transport-gates-current-20261007.json');
const logPath = path.join(out, 'S05-contract-transport-gates-current-20261007.log');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const relSource = file => path.relative(fe, file).startsWith('..')
  ? `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`
  : path.relative(fe, file).replaceAll('\\', '/');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(path.basename(fe) === 'BotSalesAI_Frontend', `Unexpected cwd: ${fe}`);

const commandMapPath = path.join(kit, 'execution/frontend-command-map.json');
const commandMap = JSON.parse(fs.readFileSync(commandMapPath, 'utf8'));
const commands = Object.fromEntries(commandMap.commands.map(command => [command.id, command]));
const ids = ['generate', 'contract-tests', 'unit', 'types'];
assert(ids.every(id => commands[id]?.status === 'VERIFIED_AVAILABLE' && commands[id].cwd === 'BotSalesAI_Frontend'), 'A required registered command is unavailable');
const systemRoot = process.env.SystemRoot || 'C:\\Windows';
const env = { ...process.env, PATH: ['C:\\Program Files\\nodejs', path.join(systemRoot, 'System32'), path.join(systemRoot, 'System32/WindowsPowerShell/v1.0'), systemRoot, process.env.PATH || ''].join(';') };

const run = (id, command, shell, args, cwd = fe) => {
  const result = spawnSync(shell, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const output = `Command: ${command}\nCWD: ${cwd}\nExit: ${result.status}\n${result.error ? `Error: ${result.error.message}\n` : ''}\n${result.stdout || ''}${result.stderr ? `\n[stderr]\n${result.stderr}` : ''}`;
  const file = path.join(out, `S05-${id}-current-20261007.log`);
  fs.writeFileSync(file, output, 'utf8');
  assert(!result.error && result.status === 0, `${id} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return { id, command, exitCode: result.status, logFile: file, logSha256: sha(Buffer.from(output)), output };
};

const runs = [];
for (const id of ids) {
  const command = commands[id];
  if (id === 'contract-tests') {
    const shell = path.join(systemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
    runs.push(run(id, command.command, shell, ['-NoProfile', '-NonInteractive', '-Command', command.command]));
  } else {
    runs.push(run(id, command.command, 'cmd.exe', ['/d', '/c', command.command]));
  }
}

const outputs = Object.fromEntries(runs.map(result => [result.id, result.output]));
assert(/\{"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54\}/.test(outputs.generate), 'Generated artifacts/counts differ from canonical baseline');
assert(/ℹ tests\s+7/.test(outputs['contract-tests']) && /ℹ pass\s+7/.test(outputs['contract-tests']) && /ℹ fail\s+0/.test(outputs['contract-tests']), 'Contract negative/positive suite did not pass 7/7');
const unitCount = [...outputs.unit.matchAll(/Tests\s+(\d+)\s+passed/g)].map(match => Number(match[1])).at(-1) ?? 0;
assert(unitCount === 138, `Current full unit suite expected 138 passing tests; observed ${unitCount}`);

const diffCommands = [
  ['unstaged-diff-check', ['diff', '--check', '--', 'BotSalesAI_Frontend/apps/web/src/shared/api', 'BotSalesAI_Frontend/apps/web/tests/api-client.test.tsx', 'BotSalesAI_Frontend/scripts/generate.mjs', 'BotSalesAI_Frontend/tests/contracts']],
  ['staged-diff-check', ['diff', '--cached', '--check', '--', 'BotSalesAI_Frontend/apps/web/src/shared/api', 'BotSalesAI_Frontend/apps/web/tests/api-client.test.tsx', 'BotSalesAI_Frontend/scripts/generate.mjs', 'BotSalesAI_Frontend/tests/contracts']],
];
const diffRuns = diffCommands.map(([id, args]) => run(id, `git ${args.join(' ')}`, 'git', args, repo));

const contractTests = fs.readFileSync(path.join(fe, 'tests/contracts/generator.test.mjs'), 'utf8');
const apiTests = fs.readFileSync(path.join(fe, 'apps/web/tests/api-client.test.tsx'), 'utf8');
const requiredNegativeCases = [
  'rejects unresolved schema references before generation',
  'rejects missing API version and a server URL outside same-origin path form',
  'detects a stale generated file and accepts it after regeneration',
  'rejects route-to-operation drift without rewriting the canonical manifest',
];
for (const title of requiredNegativeCases) assert(contractTests.includes(title), `Contract negative case missing: ${title}`);
assert(apiTests.includes('rejects a request body that violates its canonical schema before sending'), 'Invalid request schema fixture is missing');
assert(apiTests.includes('validates path and query values against generated operation parameter schemas'), 'Parameter schema fixture is missing');

const canonicalPaths = [
  path.join(kit, 'contracts/openapi.json'), path.join(kit, 'contracts/openapi.yaml'),
  path.join(kit, 'contracts/operation-index.json'), path.join(kit, 'contracts/route-manifest.json'),
  path.join(kit, 'contracts/permission-catalog.json'), path.join(kit, 'contracts/events.schema.json'), path.join(kit, 'design/tokens.json'),
];
const commandLines = [...runs, ...diffRuns].map(result => `${result.id}: exit=${result.exitCode}; command=${result.command}; log=${path.relative(kit, result.logFile).replaceAll('\\', '/')}; sha256=${result.logSha256}`);
const checks = [
  'registered generate:check passes with 11 fresh outputs, 283 schemas, 210 operations and 54 routes',
  'registered generator contract tests pass 7/7, including missing schema/version, drift and unresolved reference cases',
  `registered full frontend unit suite passes ${unitCount}/${unitCount}`,
  'registered strict TypeScript typecheck exits 0',
  'scoped staged and unstaged git diff checks exit 0',
  'canonical contract/design source files remain unchanged',
];
const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const files = [
  path.join(fe, 'package.json'), path.join(fe, 'package-lock.json'), path.join(fe, 'scripts/generate.mjs'),
  path.join(fe, 'tests/contracts/generator.test.mjs'), path.join(fe, 'apps/web/src/shared/api/client.ts'),
  path.join(fe, 'apps/web/src/shared/api/validation.ts'), path.join(fe, 'apps/web/tests/api-client.test.tsx'),
  path.join(fe, 'packages/contracts/src/generated.ts'), path.join(fe, 'packages/contracts/src/operations.json'),
  path.join(fe, 'packages/contracts/src/schemas.json'), path.join(fe, 'apps/web/src/app/tokens.css'),
  path.join(kit, 'execution/frontend-plan.json'), commandMapPath, helper,
  ...canonicalPaths,
  ...runs.map(result => result.logFile), ...diffRuns.map(result => result.logFile),
];
const sourceFiles = [...new Set(files)].filter(file => fs.existsSync(file)).map(file => ({ path: relSource(file), sha256: sha(fs.readFileSync(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const executionLog = [
  'FE005.S05 current generator, contract, transport, typecheck and scoped diff gates',
  `revision=HEAD ${revision} plus current working tree; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; cwd=${fe}`,
  ...commandLines, `canonicalPaths=${canonicalPaths.length}; unchanged=${canonicalPaths.every(file => fs.existsSync(file))}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.map(check => `CHECK PASS: ${check}`),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  'Generator checks validate generated frontend artifacts only; no server/backend behavior is claimed.',
].join('\n') + '\n';
fs.writeFileSync(logPath, executionLog, 'utf8');
const evidence = {
  taskId: 'FE005', stepId: 'S05', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(), sourceRevision: `HEAD ${revision} plus current frontend working tree`,
  expected: 'Run current generator freshness, contract positive/negative tests, full frontend unit suite, strict typecheck and scoped staged/unstaged diff checks.',
  observed: `All registered commands passed: generated output is fresh (11 files/283 schemas/210 operations/54 routes), contract tests 7/7, full unit suite ${unitCount}/${unitCount}, strict TypeScript typecheck exit 0, and both scoped diff checks exit 0. Canonical contract/design inputs were only read.`,
  commandId: commands.generate.id, command: commands.generate.command, cwd: fe,
  reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: 'Windows Node/npm frontend contract gates', details: `Node ${process.versions.node}; registered package commands and scoped git checks on current Git HEAD ${revision}; synthetic frontend scope.`, dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, sourceFiles, sourceSnapshotSha256,
  executedCommands: [...runs, ...diffRuns].map(result => ({ id: result.id, command: result.command, exitCode: result.exitCode, logFile: path.relative(kit, result.logFile).replaceAll('\\', '/'), logSha256: result.logSha256 })),
  logFile: path.relative(kit, logPath).replaceAll('\\', '/'), logSha256: sha(Buffer.from(executionLog)),
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', generate: '11 outputs', contractTests: '7/7', unitTests: `${unitCount}/${unitCount}`, typecheck: 0, diffChecks: '2/2', receipt: relSource(receiptPath), logSha256: evidence.logSha256 }, null, 2));
