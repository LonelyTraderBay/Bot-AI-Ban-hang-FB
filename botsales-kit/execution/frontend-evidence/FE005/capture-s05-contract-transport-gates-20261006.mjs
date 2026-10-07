import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const dir = 'botsales-kit/execution/frontend-evidence/FE005';
const helper = `${dir}/capture-s05-contract-transport-gates-20261006.mjs`;
const logPaths = {
  generate: `${dir}/S05-generate-check-registered-post-api-contract-20261006.log`,
  types: `${dir}/S05-typecheck-registered-post-api-contract-20261006.log`,
  unit: `${dir}/S05-unit-registered-post-api-contract-20261006.log`,
  contractTests: `${dir}/S05-contract-tests-registered-post-api-contract-20261006.log`,
  diff: `${dir}/S05-diff-check-scoped-post-api-contract-20261006.log`,
};
const evidencePath = `${dir}/S05-contract-transport-gates-20261006.json`;
const finalLogPath = `${dir}/S05-contract-transport-gates-20261006.log`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const bytes = file => fs.readFileSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);

const commandMap = JSON.parse(read('botsales-kit/execution/frontend-command-map.json'));
const commandFor = id => {
  const command = commandMap.commands.find(entry => entry.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return command;
};
const commands = { generate: commandFor('generate'), types: commandFor('types'), unit: commandFor('unit'), contractTests: commandFor('contract-tests') };
const logs = Object.entries(logPaths).map(([label, path]) => ({ label, path, content: read(path) }));
const log = label => logs.find(entry => entry.label === label).content;
assert(log('generate').includes(`command=${commands.generate.command}`) && /^exitCode=0$/m.test(log('generate')), 'Registered generator check did not exit 0');
assert(/\{"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54\}/.test(log('generate')), 'Generator outputs/counts differ from canonical baseline');
assert(log('types').includes(`command=${commands.types.command}`) && /^exitCode=0$/m.test(log('types')), 'Registered typecheck did not exit 0');
assert(log('unit').includes(`command=${commands.unit.command}`) && /Tests\s+91 passed \(91\)/.test(log('unit')) && /^exitCode=0$/m.test(log('unit')), 'Registered unit suite did not pass 91/91');
assert(log('contractTests').includes(`command=${commands.contractTests.command}`) && /ℹ tests\s+7/.test(log('contractTests')) && /ℹ pass\s+7/.test(log('contractTests')) && /ℹ fail\s+0/.test(log('contractTests')) && /^exitCode=0$/m.test(log('contractTests')), 'Registered contract regression suite did not pass 7/7');
assert(/^unstagedExitCode=0$/m.test(log('diff')) && /^stagedExitCode=0$/m.test(log('diff')), 'Scoped generator/transport diff check failed');

const contractTests = read('tests/contracts/generator.test.mjs');
const apiTests = read('apps/web/tests/api-client.test.tsx');
for (const title of [
  'rejects drift in OpenAPI YAML and operation index projections',
  'generated operation registry preserves required and optional query parameter metadata',
  'rejects unresolved schema references before generation',
  'rejects missing API version and a server URL outside same-origin path form',
  'rejects route-to-operation drift without rewriting the canonical manifest',
  'detects a stale generated file and accepts it after regeneration',
]) assert(contractTests.includes(title), `Contract/generator negative case is missing: ${title}`);
assert(apiTests.includes('rejects a request body that violates its canonical schema before sending'), 'Transport has no invalid-request-schema fixture');
assert(apiTests.includes('validates path and query values against generated operation parameter schemas'), 'Transport has no request-parameter-schema fixture');

const outputPaths = [
  'packages/contracts/src/generated.ts', 'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json',
  'packages/contracts/src/routes.json', 'packages/contracts/src/permissions.json', 'packages/contracts/src/index.ts',
  'packages/design-tokens/src/tokens.json', 'packages/design-tokens/src/index.ts', 'apps/web/src/app/tokens.css',
  'apps/web/public/manifest.webmanifest', 'apps/web/public/app-icon.svg',
];
for (const file of outputPaths) assert(fs.existsSync(path.join(root, file)), `Generated output is missing: ${file}`);
const sourcePaths = [...new Set([
  'package.json', 'package-lock.json', 'scripts/generate.mjs', 'tests/contracts/generator.test.mjs',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/validation.ts', 'apps/web/tests/api-client.test.tsx',
  'packages/contracts/src/operations.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/openapi.yaml', 'botsales-kit/contracts/operation-index.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/events.schema.json',
  'botsales-kit/design/tokens.json', ...outputPaths, ...Object.values(logPaths), helper,
])].sort().map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourcePaths.map(file => `${file.path}:${file.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';
const checks = [
  { label: 'fresh generator outputs', observed: `generate:check passed ${outputPaths.length} outputs, 283 schemas, 210 operations and 54 routes without writing generated output.` },
  { label: 'canonical projection guards', observed: 'Negative tests reject YAML/index drift from canonical OpenAPI and verify generated operation parameter metadata.' },
  { label: 'contract drift/schema/version fixtures', observed: 'Contract test suite passed 7/7, including unresolved schema, missing API version, route drift and stale generated output.' },
  { label: 'runtime type safety', observed: 'Registered strict TypeScript check exited 0; request body/parameter schema rejection cases are present and covered by the 91/91 unit suite.' },
  { label: 'scoped change review', observed: 'Staged/unstaged diff checks on generator, contract tests and transport sources exited 0.' },
];
const finalLog = [
  'FE005.S05 final generator, contract, helper and type gates', `executedAt=${executedAt}`, `cwd=${root}`,
  ...logs.map(entry => `COMMAND ${entry.label}: ${entry.label === 'diff' ? 'scoped git diff --check' : (entry.label === 'contractTests' ? commands.contractTests.command : entry.label === 'generate' ? commands.generate.command : entry.label === 'types' ? commands.types.command : commands.unit.command)}`),
  ...logs.map(entry => `LOG ${entry.path}; sha256=${sha(Buffer.from(entry.content))}`),
  `generate=11 outputs/283 schemas/210 operations/54 routes; contracts=7/7; units=91/91`,
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; generated outputs checked only; no live backend execution.',
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap(check => [`CHECK ${check.label}: PASS`, check.observed]),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourcePaths.map(file => `SOURCE ${file.path} sha256=${file.sha256}`), `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, finalLogPath), finalLog, 'utf8');
const evidence = {
  taskId: 'FE005', stepId: 'S05', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} plus current frontend working tree`,
  expected: 'Generator, contract negative fixtures, helper tests and typecheck pass; missing schema/version and drift are rejected; generated output remains fresh.',
  observed: `Registered generator, typecheck, unit and contract commands passed: 11/283/210/54, typecheck exit 0, unit 91/91, contract tests 7/7. Scoped diff checks passed.`,
  commandId: commands.generate.id, command: commands.generate.command, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / local frontend toolchain`, details: 'Registered commands ran with a process-local compact PATH. Generator check compared outputs without rewriting them; unit and contract tests used local synthetic fixtures only.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, logFile: finalLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(finalLog)), sourceFiles: sourcePaths, sourceSnapshotSha256,
  commandResults: [
    { commandId: commands.generate.id, command: commands.generate.command, exitCode: 0, logFile: logPaths.generate.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log('generate'))) },
    { commandId: commands.types.id, command: commands.types.command, exitCode: 0, logFile: logPaths.types.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log('types'))) },
    { commandId: commands.unit.id, command: commands.unit.command, exitCode: 0, logFile: logPaths.unit.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log('unit'))) },
    { commandId: commands.contractTests.id, command: commands.contractTests.command, exitCode: 0, logFile: logPaths.contractTests.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log('contractTests'))) },
  ],
  generatedOutputs: { count: outputPaths.length, schemas: 283, operations: 210, routes: 54, fresh: true, manuallyEdited: false },
  negativeCases: { yamlProjectionDrift: true, operationIndexDrift: true, unresolvedSchema: true, missingVersion: true, routeDrift: true, staleGeneratedOutput: true, invalidRequestSchema: true },
};
fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', generator: '11/283/210/54', contracts: '7/7', unit: '91/91', evidence: evidencePath }, null, 2));
