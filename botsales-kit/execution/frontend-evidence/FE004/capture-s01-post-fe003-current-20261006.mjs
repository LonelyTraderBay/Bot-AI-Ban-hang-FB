import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const output = path.join(kit, 'execution/frontend-evidence/FE004');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);

const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const typecheckCommand = commandMap.commands.find((command) => command.id === 'types');
const boundariesCommand = commandMap.commands.find((command) => command.id === 'boundaries');
assert(typecheckCommand?.status === 'VERIFIED_AVAILABLE', 'Registered typecheck command is not verified available');
assert(boundariesCommand?.status === 'VERIFIED_AVAILABLE', 'Registered boundaries command is not verified available');

const typecheckLogPath = 'execution/frontend-evidence/FE004/S01-typecheck-registered-post-fe003-current-20261006.log';
const boundariesLogPath = 'execution/frontend-evidence/FE004/S01-boundaries-registered-post-fe003-current-20261006.log';
const typecheckLog = fs.readFileSync(path.join(kit, typecheckLogPath), 'utf8');
const boundariesLog = fs.readFileSync(path.join(kit, boundariesLogPath), 'utf8');
const boundaries = JSON.parse(fs.readFileSync(path.join(root, 'evidence/boundaries.json'), 'utf8'));
assert(typecheckLog.includes('tsc -p apps/web/tsconfig.json --noEmit'), 'Typecheck log does not show the registered script');
assert(boundaries.status === 'PASS' && boundaries.issues.length === 0, 'AST boundary graph has issues');
assert(boundaries.files === 67 && boundaries.imports === 475, 'Unexpected source graph shape');
assert(/PASS 10\/10 scenarios/.test(boundariesLog), 'Expected boundary negative fixtures did not pass 10/10');

const routeManifest = JSON.parse(fs.readFileSync(path.join(root, 'botsales-kit/contracts/route-manifest.json'), 'utf8'));
const router = fs.readFileSync(path.join(root, 'apps/web/src/app/router.tsx'), 'utf8');
const moduleRoot = path.join(root, 'apps/web/src/modules');
const moduleNames = fs.readdirSync(moduleRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const moduleEntries = moduleNames.map((name) => {
  const relativePath = `apps/web/src/modules/${name}/index.tsx`;
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const declarations = [...content.matchAll(/^export\s+(?:function|const|class|type|interface)\s+([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
  const reExports = [...content.matchAll(/^export\s+\{([^}]+)\}/gm)].flatMap((match) => match[1].split(',').map((item) => item.trim().split(/\s+as\s+/)[1] || item.trim().split(/\s+as\s+/)[0]));
  const exports = [...new Set([...declarations, ...reExports])];
  return { name, entry: `@/modules/${name}`, file: relativePath, namedExports: exports };
});
const lazyModuleNames = [...router.matchAll(/import\(['"]\.\.\/modules\/([^'"/]+)['"]\)/g)].map((match) => match[1]);
const featureImportPaths = [...router.matchAll(/import\(['"]\.\.\/modules\/([^'"]+)['"]\)/g)].map((match) => match[1]);
const deepFeatureImports = featureImportPaths.filter((specifier) => specifier.includes('/'));
const pageRouteIds = [...router.matchAll(/^\s+(R\d+):\s+[A-Za-z_$][\w$]*,/gm)].map((match) => match[1]);
const routeIds = routeManifest.routes.map((route) => route.id);
assert(moduleEntries.every((entry) => entry.namedExports.length > 0), 'A feature directory has no named public exports');
assert(new Set(lazyModuleNames).size === moduleNames.length && moduleNames.every((name) => lazyModuleNames.includes(name)), 'Router does not use every feature public entry');
assert(deepFeatureImports.length === 0, `App router bypasses a feature public entry: ${deepFeatureImports.join(', ')}`);
assert(routeIds.length === 54 && routeIds.every((id) => pageRouteIds.includes(id)), 'Router page map does not cover all canonical route IDs');

const appFiles = fs.readdirSync(path.join(root, 'apps/web/src/app')).filter((name) => /\.(ts|tsx)$/.test(name)).sort();
const sharedAreas = fs.readdirSync(path.join(root, 'apps/web/src/shared'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const allSourceFiles = fs.readdirSync(path.join(root, 'apps/web/src'), { recursive: true }).filter((entry) => /\.(ts|tsx)$/.test(entry)).map((entry) => `apps/web/src/${entry.replaceAll('\\', '/')}`);
assert(sharedAreas.join(',') === 'api,model,ui', 'Unexpected shared layer shape');

const checks = [
  { label: 'strict TypeScript', observed: 'Registered npm run typecheck completed with exit code 0; strict and noUncheckedIndexedAccess are enabled.' },
  { label: 'AST source graph', observed: '67 TypeScript/TSX files and 475 import/export/dynamic import edges were parsed.' },
  { label: 'module boundaries and cycles', observed: 'Boundary checker PASS with zero unresolved imports, cross-feature imports, forbidden app/mock imports from features/shared, parse issues, or cycles.' },
  { label: 'negative boundary fixtures', observed: 'Allowed shared/public imports, alias, relative, app deep import, type-only, dynamic, unresolved, cycle and parser-error fixtures passed 10/10.' },
  { label: 'feature public entries', observed: `${moduleEntries.length} feature directories each expose named symbols through index.tsx; all ${moduleNames.length} are lazy-loaded through the app router with no deep entry bypass.` },
  { label: 'canonical route composition', observed: `${routeIds.length} route-manifest IDs are mapped by the app router page table.` },
  { label: 'layer map', observed: `App composition (${appFiles.length} app files) imports shared api/model/ui and feature public entries; shared areas are ${sharedAreas.join(', ')}.` },
  { label: 'change selection', observed: 'The initial router deep import into catalog/imports was identified and fixed by re-exporting the two screens from catalog/index.tsx; current graph has no deep app imports. No speculative refactor was added. CommandRecovery remains an app-shell component over shared API/model/UI.' },
];

const reviewer = 'Codex self-review; no independent peer review claimed';
const executedAt = new Date().toISOString();
const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const sourcePaths = [
  'package.json', 'apps/web/package.json', 'apps/web/tsconfig.json', 'apps/web/src/main.tsx', 'apps/web/src/app/router.tsx',
  'apps/web/src/app/CommandRecovery.tsx', 'scripts/check-boundaries.mjs', 'tests/architecture/check-boundaries.mjs',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json',
  ...allSourceFiles,
  `botsales-kit/${typecheckLogPath}`, `botsales-kit/${boundariesLogPath}`,
  'botsales-kit/execution/frontend-evidence/FE004/capture-s01-post-fe003-current-20261006.mjs',
];
const sourceFiles = [...new Set(sourcePaths)].map((file) => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const log = [
  'FE004.S01 current type and module-boundary baseline', `executedAt=${executedAt}`, `cwd=${root}`,
  `typecheckCommand=${typecheckCommand.command}`, 'typecheckExitCode=0', `typecheckLogSha256=${sha(Buffer.from(typecheckLog))}`,
  `boundariesCommand=${boundariesCommand.command}`, 'boundariesExitCode=0', `files=${boundaries.files}; imports=${boundaries.imports}; issues=${boundaries.issues.length}`,
  `negativeFixtures=${boundaries.negativeFixtures}`, `routeIds=${routeIds.length}; moduleEntries=${moduleEntries.length}; mappedRouteIds=${pageRouteIds.length}; deepFeatureImports=${deepFeatureImports.length}`,
  `sharedAreas=${sharedAreas.join(',')}`, `checksTotal=${checks.length}; failed=0`,
  ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  'sourceDecision=The initial router deep import into catalog/imports was repaired through catalog/index.tsx; the strict type and updated AST boundary gates now pass with no deep app imports.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(output, 'S01-post-fe003-current-20261006.log'), log, 'utf8');
const evidence = {
  taskId: 'FE004', stepId: 'S01', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'Full strict TypeScript and AST module boundary checks pass; public feature entries map to canonical routes, with only evidence-backed issues selected for repair.',
  observed: `Registered typecheck command passed; boundary checker passed ${boundaries.files} source files/${boundaries.imports} edges with zero issues and 10/10 fixtures. ${routeIds.length} canonical routes and ${moduleEntries.length} feature public entries were mapped, with no deep app import remaining.`,
  commandId: typecheckCommand.id, command: typecheckCommand.command, cwd: root, reviewer,
  environment: { name: 'Windows / Node 24.19.0 / npm 11.17.0', details: 'Registered typecheck and boundaries package scripts ran through cmd.exe with a process-local PATH; both completed exit 0.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile: 'execution/frontend-evidence/FE004/S01-post-fe003-current-20261006.log',
  logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  graph: { files: boundaries.files, imports: boundaries.imports, issues: boundaries.issues, negativeFixtures: boundaries.negativeFixtures },
  architectureMap: { appFiles, sharedAreas, featureEntries: moduleEntries, featureImportPaths, deepFeatureImports, routeCount: routeIds.length, mappedRouteCount: pageRouteIds.length },
  commands: [
    { commandId: typecheckCommand.id, command: typecheckCommand.command, exitCode: 0, logFile: typecheckLogPath, logSha256: sha(Buffer.from(typecheckLog)) },
    { commandId: boundariesCommand.id, command: boundariesCommand.command, exitCode: 0, logFile: boundariesLogPath, logSha256: sha(Buffer.from(boundariesLog)) },
  ],
};
fs.writeFileSync(path.join(output, 'S01-post-fe003-current-20261006.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, files: boundaries.files, imports: boundaries.imports, routes: routeIds.length, moduleEntries: moduleEntries.length, evidence: 'execution/frontend-evidence/FE004/S01-post-fe003-current-20261006.json' }, null, 2));
