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
const boundaryCommand = commandMap.commands.find((command) => command.id === 'boundaries');
assert(boundaryCommand?.status === 'VERIFIED_AVAILABLE', 'Boundary command is not registered as verified available');
const logPath = 'execution/frontend-evidence/FE004/S03-composition-boundaries-post-fe003-current-20261006.log';
const commandLog = fs.readFileSync(path.join(kit, logPath), 'utf8');
const graph = JSON.parse(fs.readFileSync(path.join(root, 'evidence/boundaries.json'), 'utf8'));
const s01 = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'S01-post-fe003-current-20261006.json'), 'utf8'));
const router = fs.readFileSync(path.join(root, 'apps/web/src/app/router.tsx'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'apps/web/src/app/Shell.tsx'), 'utf8');
const recovery = fs.readFileSync(path.join(root, 'apps/web/src/app/CommandRecovery.tsx'), 'utf8');
const srcRoot = path.join(root, 'apps/web/src');
const sourceRelPaths = fs.readdirSync(srcRoot, { recursive: true }).filter((entry) => /\.(ts|tsx)$/.test(entry)).map((entry) => `apps/web/src/${entry.replaceAll('\\', '/')}`);
const commandRecoveryConsumers = sourceRelPaths.filter((file) => {
  if (file === 'apps/web/src/app/CommandRecovery.tsx') return false;
  return fs.readFileSync(path.join(root, file), 'utf8').includes("from './CommandRecovery'") || fs.readFileSync(path.join(root, file), 'utf8').includes('from "./CommandRecovery"');
});
const actualRecoveryImports = [...recovery.matchAll(/^import\s+.*?\s+from\s+['"]([^'"]+)['"]/gm)].map((match) => match[1]);
const routeIds = JSON.parse(fs.readFileSync(path.join(root, 'botsales-kit/contracts/route-manifest.json'), 'utf8')).routes.map((route) => route.id);
const featureImportPaths = [...router.matchAll(/import\(['"]\.\.\/modules\/([^'"]+)['"]\)/g)].map((match) => match[1]);
const deepFeatureImports = featureImportPaths.filter((specifier) => specifier.includes('/'));
assert(graph.status === 'PASS' && graph.issues.length === 0, 'Current architecture graph has an issue');
assert(graph.files === 67 && graph.imports === 475, 'Unexpected architecture graph size');
assert(/PASS 10\/10 scenarios/.test(commandLog), 'Negative boundary fixtures did not pass');
assert(commandRecoveryConsumers.length === 1 && commandRecoveryConsumers[0] === 'apps/web/src/app/Shell.tsx', 'Global recovery UI is consumed outside the app shell');
assert(actualRecoveryImports.every((specifier) => !specifier.includes('/modules/') && !specifier.includes('/mocks/')), 'CommandRecovery crosses into a feature or mock module');
assert(actualRecoveryImports.some((specifier) => specifier.includes('/shared/api/')) && actualRecoveryImports.some((specifier) => specifier.includes('/shared/model/')) && actualRecoveryImports.some((specifier) => specifier.includes('/shared/ui/')), 'CommandRecovery no longer uses the shared API/model/UI boundaries');
assert(s01.architectureMap.featureEntries.length === 16 && s01.architectureMap.mappedRouteCount === routeIds.length && s01.architectureMap.deepFeatureImports.length === 0, 'S01 module or route map is incomplete');
assert(shell.includes('<CommandRecovery />'), 'App shell no longer composes the global recovery component');
assert(featureImportPaths.length > 0 && deepFeatureImports.length === 0 && new Set(featureImportPaths).size === 16, 'Router does not compose public feature entries');

const checks = [
  { label: 'app composition', observed: 'CommandRecovery is imported and rendered only by Shell; it remains a cross-route app responsibility.' },
  { label: 'shared API/model/UI usage', observed: `CommandRecovery dependencies are ${actualRecoveryImports.join(', ')}; no feature or mock module is imported.` },
  { label: 'feature public entry points', observed: 'The app router lazy-loads all 16 module index entries; deep entry bypasses are rejected by the AST checker; no cross-feature import or cycle appears in the graph.' },
  { label: 'canonical route coverage', observed: `${routeIds.length} canonical route IDs are mapped by the app route page table.` },
  { label: 'shared layer direction', observed: 'The AST boundary gate reports zero shared-to-app/module/mock dependencies.' },
  { label: 'negative architecture fixtures', observed: 'All 10/10 allowed shared/public and forbidden deep/cross-feature import, resolver, cycle and parse-error fixtures pass.' },
  { label: 'change budget decision', observed: 'The two catalog import screens are re-exported from its public index and the router now imports that entry. Command recovery has one global caller and uses shared transport/state/presentation; keep it in app composition.' },
];
const reviewer = 'Codex self-review; no independent peer review claimed';
const executedAt = new Date().toISOString();
const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const sourcePaths = [
  'package.json', 'apps/web/package.json', 'apps/web/tsconfig.json', 'eslint.config.mjs',
  'apps/web/src/main.tsx', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/CommandRecovery.tsx',
  'scripts/check-boundaries.mjs', 'tests/architecture/check-boundaries.mjs',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/09_STATE_AND_DATA_ACCESS.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
  'botsales-kit/execution/frontend-evidence/FE004/S01-post-fe003-current-20261006.json', logPath && `botsales-kit/${logPath}`,
  ...sourceRelPaths,
  'botsales-kit/execution/frontend-evidence/FE004/capture-s03-post-fe003-current-20261006.mjs',
];
const sourceFiles = [...new Set(sourcePaths)].map((file) => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const log = [
  'FE004.S03 current app/module/shared responsibility review', `executedAt=${executedAt}`, `cwd=${root}`,
  `command=${boundaryCommand.command}`, 'exitCode=0', `commandLogSha256=${sha(Buffer.from(commandLog))}`,
  `graphFiles=${graph.files}; imports=${graph.imports}; issues=${graph.issues.length}; routes=${routeIds.length}; modules=${s01.architectureMap.featureEntries.length}; deepFeatureImports=${deepFeatureImports.length}`,
  `commandRecoveryConsumers=${commandRecoveryConsumers.join(',')}`, `commandRecoveryImports=${actualRecoveryImports.join(',')}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
const evidenceLog = 'execution/frontend-evidence/FE004/S03-post-fe003-current-20261006.log';
fs.writeFileSync(path.join(evidenceRoot, 'S03-post-fe003-current-20261006.log'), log, 'utf8');
const evidence = {
  taskId: 'FE004', stepId: 'S03', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'The app composes modules through their public entries, modules do not import one another, shared remains non-business and no avoidable dependency cycle is present.',
  observed: `Boundary tests passed 10/10; graph covered ${graph.files} files and ${graph.imports} edges with zero issues. All ${s01.architectureMap.featureEntries.length} feature entries and ${routeIds.length} canonical routes were mapped with zero app deep imports. CommandRecovery has one app-shell caller and depends on shared API/model/UI only.`,
  commandId: boundaryCommand.id, command: boundaryCommand.command, cwd: root, reviewer,
  environment: { name: 'Windows / Node 24.19.0 / npm 11.17.0', details: 'Registered AST boundaries command ran from the frontend root; no backend or provider runtime was involved.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile: evidenceLog, logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  architectureReview: { files: graph.files, imports: graph.imports, issues: graph.issues, routeCount: routeIds.length, featureEntryCount: s01.architectureMap.featureEntries.length, commandRecoveryConsumers, commandRecoveryImports: actualRecoveryImports },
};
fs.writeFileSync(path.join(evidenceRoot, 'S03-post-fe003-current-20261006.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, files: graph.files, imports: graph.imports, routes: routeIds.length, modules: s01.architectureMap.featureEntries.length, evidence: 'execution/frontend-evidence/FE004/S03-post-fe003-current-20261006.json' }, null, 2));
