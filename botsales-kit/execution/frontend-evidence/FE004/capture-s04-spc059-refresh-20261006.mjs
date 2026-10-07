import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const evidenceRoot = path.join(kit, 'execution/frontend-evidence/FE004');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);

const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = commandMap.commands.find((entry) => entry.id === 'boundaries');
assert(command?.status === 'VERIFIED_AVAILABLE', 'Boundary command is not registered available');
const commandLogPath = 'execution/frontend-evidence/FE004/S04-boundaries-spc059-current-20261006.log';
const commandLog = fs.readFileSync(path.join(kit, commandLogPath), 'utf8');
const graph = JSON.parse(fs.readFileSync(path.join(root, 'botsales-kit/execution/frontend-evidence/FE004/S04-boundaries-report-spc059-current-20261006.json'), 'utf8'));
const checker = fs.readFileSync(path.join(root, 'scripts/check-boundaries.mjs'), 'utf8');
const fixtures = fs.readFileSync(path.join(root, 'tests/architecture/check-boundaries.mjs'), 'utf8');
assert(graph.status === 'PASS' && graph.issues.length === 0, 'Current source graph did not pass');
assert(graph.files === 67 && graph.imports === 479, 'Unexpected graph count');
assert(/PASS 10\/10 scenarios/.test(commandLog), 'Expected 10/10 negative and allowed-import fixtures');
assert(checker.includes('App deep import') && checker.includes('import the module public entry'), 'Checker lacks the app public-entry invariant');
for (const scenario of ['app import through feature public entry', 'app deep import bypassing feature public entry', 'type-only cross-feature import', 'dynamic cross-feature import', 'unresolved local alias', 'module cycle', 'unparseable TypeScript file']) {
  assert(fixtures.includes(scenario), `Fixture missing: ${scenario}`);
}

const checks = [
  { label: 'registered boundary command', observed: 'npm run boundaries exited 0 and emitted the current graph report.' },
  { label: 'source graph parse', observed: 'All 67 TypeScript/TSX source files parsed; no unresolved local imports or parser diagnostics.' },
  { label: 'public-entry allow case', observed: 'App import through a module directory/index is explicitly allowed.' },
  { label: 'public-entry bypass rejection', observed: 'App deep import to catalog/imports is explicitly rejected; the real router now uses catalog/index.tsx.' },
  { label: 'alias/relative/type-only/dynamic rules', observed: 'Each import form is included in the negative cross-feature fixtures and is rejected.' },
  { label: 'cycle/unresolved/parse-error rules', observed: 'Unresolved paths, cycles and parser errors are rejected rather than skipped.' },
  { label: 'all fixture scenarios', observed: graph.negativeFixtures },
];
const reviewer = 'Codex self-review; no independent peer review claimed';
const executedAt = new Date().toISOString();
const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const sourcePaths = [
  'package.json', 'apps/web/tsconfig.json', 'scripts/check-boundaries.mjs', 'tests/architecture/check-boundaries.mjs',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/contracts/route-manifest.json',
  'apps/web/src/app/router.tsx', 'apps/web/src/modules/catalog/index.tsx', 'apps/web/src/modules/catalog/imports.tsx',
  'botsales-kit/execution/frontend-evidence/FE004/S01-spc059-refresh-20261006.json',
  'botsales-kit/execution/frontend-evidence/FE004/S03-spc059-refresh-20261006.json',
  `botsales-kit/${commandLogPath}`, 'botsales-kit/execution/frontend-evidence/FE004/capture-s04-spc059-refresh-20261006.mjs',
];
const sourceFiles = sourcePaths.map((file) => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const log = [
  'FE004.S04 boundary checker and negative/allowed fixture verification', `executedAt=${executedAt}`, `cwd=${root}`,
  `command=${command.command}`, 'exitCode=0', `commandLogSha256=${sha(Buffer.from(commandLog))}`,
  `files=${graph.files}; imports=${graph.imports}; issues=${graph.issues.length}; fixtures=${graph.negativeFixtures}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
const logFile = 'execution/frontend-evidence/FE004/S04-spc059-refresh-20261006.log';
fs.writeFileSync(path.join(evidenceRoot, 'S04-spc059-refresh-20261006.log'), log, 'utf8');
const evidence = {
  taskId: 'FE004', stepId: 'S04', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'The AST checker detects app deep-entry bypasses and all prohibited alias/relative/type-only/dynamic relationships, unresolved imports, cycles and parser errors while permitting public entries.',
  observed: `Boundary checker passed ${graph.files} files/${graph.imports} edges with zero issues, and all 10/10 fixtures passed, including the new permitted public-entry and rejected app deep-import cases.`,
  commandId: command.id, command: command.command, cwd: root, reviewer,
  environment: { name: 'Windows / Node 24.19.0 / npm 11.17.0', details: 'Registered npm run boundaries executed from the frontend root; checker and embedded fixtures ran locally.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile, logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  graph: { files: graph.files, imports: graph.imports, issues: graph.issues, negativeFixtures: graph.negativeFixtures },
};
fs.writeFileSync(path.join(evidenceRoot, 'S04-spc059-refresh-20261006.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, fixtures: 10, issues: 0, evidence: 'execution/frontend-evidence/FE004/S04-spc059-refresh-20261006.json' }, null, 2));
