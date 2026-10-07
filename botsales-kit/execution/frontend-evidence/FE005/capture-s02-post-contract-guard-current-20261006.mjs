import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync as run } from 'node:child_process';

const root = process.cwd();
const kit = 'botsales-kit';
const dir = `${kit}/execution/frontend-evidence/FE005`;
const helper = `${dir}/capture-s02-post-contract-guard-current-20261006.mjs`;
const generateLog = `${dir}/S02-generate-check-post-contract-guard-20261006.log`;
const testsLog = `${dir}/S02-contract-tests-post-guard-20261006.log`;
const diffLog = `${dir}/S02-diff-check-post-guard-20261006.log`;
const evidencePath = `${dir}/S02-post-contract-guard-current-20261006.json`;
const finalLogPath = `${dir}/S02-post-contract-guard-current-20261006.log`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(root.endsWith('BotSalesAI_Frontend'), `Expected frontend root; got ${root}`);

const map = json(`${kit}/execution/frontend-command-map.json`);
const generateCommand = map.commands.find(item => item.id === 'generate');
const testsCommand = map.commands.find(item => item.id === 'contract-tests');
assert(generateCommand?.status === 'VERIFIED_AVAILABLE' && testsCommand?.status === 'VERIFIED_AVAILABLE', 'Required registered commands are not available');
const generateText = read(generateLog);
const testsText = read(testsLog);
const diffText = read(diffLog);
assert(generateText.includes(`command=${generateCommand.command}`) && /^exitCode=0$/m.test(generateText), 'Registered generate:check did not exit 0');
assert(/\{"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54\}/.test(generateText), 'Generator result did not match current bundle counts');
assert(testsText.includes(`command=${testsCommand.command}`) && /^exitCode=0$/m.test(testsText), 'Registered contract tests did not exit 0');
assert(/ℹ tests\s+7/.test(testsText) && /ℹ pass\s+7/.test(testsText) && /ℹ fail\s+0/.test(testsText), 'Contract projection/regression tests did not pass 7/7');
assert(/^unstagedExitCode=0$/m.test(diffText) && /^stagedExitCode=0$/m.test(diffText), 'Scoped staged/unstaged whitespace check failed');

const outputPaths = [
  'packages/contracts/src/generated.ts', 'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json',
  'packages/contracts/src/routes.json', 'packages/contracts/src/permissions.json', 'packages/contracts/src/index.ts',
  'packages/design-tokens/src/tokens.json', 'packages/design-tokens/src/index.ts', 'apps/web/src/app/tokens.css',
  'apps/web/public/manifest.webmanifest', 'apps/web/public/app-icon.svg',
];
for (const file of outputPaths) assert(fs.existsSync(path.join(root, file)), `Missing generated output ${file}`);
const sourcePaths = [
  'package.json', 'package-lock.json', 'scripts/generate.mjs', 'tests/contracts/generator.test.mjs',
  `${kit}/execution/frontend-plan.json`, `${kit}/execution/frontend-command-map.json`,
  `${kit}/contracts/openapi.json`, `${kit}/contracts/openapi.yaml`, `${kit}/contracts/operation-index.json`,
  `${kit}/contracts/route-manifest.json`, `${kit}/contracts/permission-catalog.json`, `${kit}/contracts/events.schema.json`,
  `${kit}/design/tokens.json`, `${kit}/docs/06_API_AND_REALTIME.md`, `${kit}/docs/18_CODING_STANDARDS.md`,
  ...outputPaths, generateLog, testsLog, diffLog, helper,
].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const revision = run('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = run('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';
const checks = [
  { label: 'canonical generator check', observed: 'Registered npm run generate:check exited 0: 11 outputs, 283 schemas, 210 operations and 54 routes.' },
  { label: 'YAML is a projection of OpenAPI JSON', observed: 'Generator parses openapi.yaml and rejects structural drift from canonical openapi.json.' },
  { label: 'operation index is a projection of OpenAPI JSON', observed: 'Generator verifies version, operation count, unique IDs, method, path, permission and module against canonical OpenAPI operations.' },
  { label: 'generated frontend package and design outputs', observed: 'All 11 generated DTO/operation/schema/route/permission/token/CSS/manifest/icon outputs are present and matched by generate:check.' },
  { label: 'negative drift and schema fixtures', observed: 'Direct registered Node contract suite passed 7/7, including YAML drift, operation-index drift, unresolved schema, version/server, route and generated-output drift cases.' },
  { label: 'preserved working tree and whitespace', observed: 'No generated file was written by --check; staged and unstaged checks over the edited generator/test files exited 0.' },
];
const observed = 'The frontend generator now treats openapi.json as the single API source and validates YAML/index projections before comparing generated outputs. Registered generate:check passed 11/283/210/54; contract regression tests passed 7/7. No generated output was edited manually and no backend execution is claimed.';
const finalLog = [
  'FE005.S02 generator projection guard and generated-output freshness', `executedAt=${executedAt}`, `cwd=${root}`,
  `REGISTERED COMMAND ${generateCommand.id}: ${generateCommand.command}`, `COMMAND LOG ${generateLog}; sha256=${sha(bytes(generateLog))}`,
  `REGISTERED REGRESSION COMMAND ${testsCommand.id}: ${testsCommand.command}`, `TEST LOG ${testsLog}; sha256=${sha(bytes(testsLog))}`,
  `SCOPED DIFF LOG ${diffLog}; sha256=${sha(bytes(diffLog))}`,
  'canonical=openapi.json/routes/permission-catalog/tokens/events; yaml and operation-index validated as projections before generation.',
  `generator=PASS outputs=${outputPaths.length}/schemas=283/operations=210/routes=54; contractTests=7/7`,
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no backend/provider/staging/hosted-CI claim.',
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap(check => [`CHECK ${check.label}: PASS`, check.observed]),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`), `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, finalLogPath), finalLog, 'utf8');
const evidence = {
  taskId: 'FE005', stepId: 'S02', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} plus current frontend working tree`,
  expected: 'Check generator from canonical kit to frontend packages/CSS/manifest, with YAML/index/DTO projections unable to drift as parallel sources; do not hand-edit generated outputs.',
  observed, commandId: generateCommand.id, command: generateCommand.command, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / local npm and Node test runners`, details: 'Registered generate:check and registered direct Node contract fixtures ran locally. --check compares outputs without writing them; all claims are frontend build-input checks only.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile: finalLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(finalLog)), sourceFiles, sourceSnapshotSha256,
  commandResults: [
    { commandId: generateCommand.id, command: generateCommand.command, exitCode: 0, logFile: generateLog.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(generateLog)) },
    { commandId: testsCommand.id, command: testsCommand.command, exitCode: 0, logFile: testsLog.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(testsLog)) },
  ],
  generatedOutputs: { count: outputPaths.length, paths: outputPaths, schemas: 283, operations: 210, routes: 54 },
  projectionGuards: { yamlAgainstOpenapiJson: true, operationIndexAgainstOpenapiJson: true, negativeDriftFixtures: 2 },
};
fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', outputs: outputPaths.length, schemas: 283, operations: 210, routes: 54, contractTests: '7/7', evidence: evidencePath, log: finalLogPath }, null, 2));
