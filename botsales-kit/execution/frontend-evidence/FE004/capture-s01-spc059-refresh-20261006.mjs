import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const evidenceDir = 'botsales-kit/execution/frontend-evidence/FE004';
const helperPath = `${evidenceDir}/capture-s01-spc059-refresh-20261006.mjs`;
const typecheckLogPath = `${evidenceDir}/S01-typecheck-spc059-registered-20261006.log`;
const boundaryLogPath = `${evidenceDir}/S01-boundaries-spc059-registered-20261006.log`;
const boundaryReportPath = `${evidenceDir}/S01-boundaries-report-spc059-registered-20261006.json`;
const evidencePath = `${evidenceDir}/S01-spc059-refresh-20261006.json`;
const finalLogPath = `${evidenceDir}/S01-spc059-refresh-20261006.log`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const bytes = file => fs.readFileSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);
const typecheckLog = read(typecheckLogPath);
const boundaryLog = read(boundaryLogPath);
const boundaryReport = JSON.parse(read(boundaryReportPath));
const commandMap = JSON.parse(read('botsales-kit/execution/frontend-command-map.json'));
const typecheckEntry = commandMap.commands.find(command => command.id === 'types');
const boundaryEntry = commandMap.commands.find(command => command.id === 'boundaries');
assert(typecheckEntry?.status === 'VERIFIED_AVAILABLE' && boundaryEntry?.status === 'VERIFIED_AVAILABLE', 'Registered command map entries are not verified available');
assert(typecheckLog.includes('exitCode=0'), 'Registered npm typecheck did not exit 0');
assert(boundaryLog.includes('exitCode=0'), 'Registered npm boundaries command did not exit 0');
assert(boundaryReport.status === 'PASS' && boundaryReport.issues.length === 0, 'Boundary graph has issues');
assert(boundaryReport.files === 67 && boundaryReport.imports === 479, 'Unexpected graph size');
assert(/PASS 10\/10 scenarios/.test(boundaryReport.negativeFixtures), 'Negative boundary fixtures did not pass 10/10');

const tsconfig = JSON.parse(read('apps/web/tsconfig.json'));
assert(tsconfig.compilerOptions?.strict === true && tsconfig.compilerOptions?.noUncheckedIndexedAccess === true, 'Strict compiler options are not enabled');
const routeManifest = JSON.parse(read('botsales-kit/contracts/route-manifest.json'));
const router = read('apps/web/src/app/router.tsx');
const moduleRoot = path.join(root, 'apps/web/src/modules');
const moduleNames = fs.readdirSync(moduleRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const featureEntries = moduleNames.map(name => {
  const file = `apps/web/src/modules/${name}/index.tsx`;
  const content = read(file);
  const exports = [...content.matchAll(/^export\s+(?:function|const|class|type|interface)\s+([A-Za-z_$][\w$]*)/gm)].map(match => match[1]);
  const lazy = router.includes(`../modules/${name}`);
  return { name, file, namedExports: [...new Set(exports)], lazyLoadedFromRouter: lazy };
});
const routeIds = routeManifest.routes.map(route => route.id);
const routeIdMap = [...router.matchAll(/^\s+(R\d+):\s+[A-Za-z_$][\w$]*,/gm)].map(match => match[1]);
assert(featureEntries.every(entry => entry.namedExports.length > 0 && entry.lazyLoadedFromRouter), 'A feature entry is missing named exports or router composition');
assert(routeIds.length === 54 && routeIds.every(id => routeIdMap.includes(id)), 'Canonical route map is incomplete');

const sourceFiles = [...new Set([
  'package.json', 'apps/web/package.json', 'apps/web/tsconfig.json', 'apps/web/src/app/router.tsx',
  'scripts/check-boundaries.mjs', 'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', boundaryReportPath, typecheckLogPath, boundaryLogPath,
  ...fs.readdirSync(path.join(root, 'apps/web/src'), { recursive: true })
    .filter(file => /\.(ts|tsx)$/.test(file)).map(file => `apps/web/src/${file.replaceAll('\\', '/')}`),
  ...fs.readdirSync(path.join(root, 'tests/architecture'), { recursive: true })
    .filter(file => /\.(mjs|js|ts|tsx)$/.test(file)).map(file => `tests/architecture/${file.replaceAll('\\', '/')}`),
  helperPath,
])].sort().map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const checks = [
  { label: 'strict TypeScript', observed: 'Registered npm run typecheck exited 0; strict and noUncheckedIndexedAccess are enabled.' },
  { label: 'AST source graph', observed: `Boundary checker parsed ${boundaryReport.files} TypeScript/TSX files and ${boundaryReport.imports} edges.` },
  { label: 'module boundaries and cycles', observed: 'The current graph has zero unresolved imports, forbidden cross-module/app/mock imports, parse errors, or cycles.' },
  { label: 'negative fixtures', observed: boundaryReport.negativeFixtures },
  { label: 'public module and route map', observed: `${featureEntries.length} module public entries have named exports and router composition; all ${routeIds.length} canonical route IDs are mapped.` },
];
const reviewer = 'Codex self-review; no independent peer review claimed';
const log = [
  'FE004.S01 current TypeScript and module-boundary baseline', `executedAt=${executedAt}`, `cwd=${root}`,
  'Registered npm run typecheck exited 0 under cmd.exe with the process-local Node PATH.',
  `typecheckExitCode=0; logSha256=${sha(Buffer.from(typecheckLog))}`,
  'Registered npm run boundaries exited 0 under cmd.exe with the process-local Node PATH.', `boundariesExitCode=0; logSha256=${sha(Buffer.from(boundaryLog))}`,
  `files=${boundaryReport.files}; imports=${boundaryReport.imports}; issues=${boundaryReport.issues.length}; negativeFixtures=10/10`,
  `routes=${routeIds.length}; mappedRouteIds=${routeIdMap.length}; moduleEntries=${featureEntries.length}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap(check => [`CHECK ${check.label}: PASS`, check.observed]),
  'SCOPE=FRONTEND_WITH_SYNTHETIC_MOCK_API; source-only local verification; no backend/staging/hosted CI claim.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`), `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, finalLogPath), log, 'utf8');
const evidence = {
  taskId: 'FE004', stepId: 'S01', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} plus current frontend working tree`,
  expected: 'Current strict TypeScript and AST boundary graph are inspected; any repair is tied to an observed issue and the module/public-entry map is recorded.',
  observed: `Registered npm typecheck and boundaries commands passed with the current source graph. The current AST graph has ${boundaryReport.files} files/${boundaryReport.imports} edges, zero issues, and 10/10 negative fixtures; ${routeIds.length} routes and ${featureEntries.length} module entries are mapped.`,
  commandId: typecheckEntry.id, command: typecheckEntry.command, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / local frontend toolchain`, details: 'The registered npm scripts ran under cmd.exe with a process-local Node PATH; no machine PATH setting was changed.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile: finalLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  graph: { files: boundaryReport.files, imports: boundaryReport.imports, issues: boundaryReport.issues, negativeFixtures: 10 },
  architectureMap: { featureEntries, routeCount: routeIds.length, mappedRouteCount: routeIdMap.length },
  commands: [
    { commandId: typecheckEntry.id, command: typecheckEntry.command, exitCode: 0, logFile: typecheckLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(typecheckLog)) },
    { commandId: boundaryEntry.id, command: boundaryEntry.command, exitCode: 0, logFile: boundaryLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(boundaryLog)) },
  ],
};
fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, files: boundaryReport.files, imports: boundaryReport.imports, routes: routeIds.length, modules: featureEntries.length, evidence: evidencePath }, null, 2));
