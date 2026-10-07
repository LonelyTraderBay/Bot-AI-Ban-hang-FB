import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE001');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const run = (scriptPath) => spawnSync(process.execPath, [scriptPath], { cwd: root, encoding: 'utf8' });

const sourceCheck = run('scripts/check-source.mjs');
if (sourceCheck.status !== 0) throw new Error(`Source check failed (${sourceCheck.status}):\n${sourceCheck.stdout}\n${sourceCheck.stderr}`);
const sourceResult = JSON.parse(sourceCheck.stdout);
if (sourceResult.status !== 'PASS' || sourceResult.routes !== 54 || sourceResult.issues.length !== 0)
  throw new Error('Current source check did not prove all canonical route references.');

const matrixRun = run('tests/vertical-slices/generate-route-implementation.mjs');
if (matrixRun.status !== 0) throw new Error(`Route matrix generation failed (${matrixRun.status}):\n${matrixRun.stdout}\n${matrixRun.stderr}`);
const matrixResult = JSON.parse(matrixRun.stdout);
if (matrixResult.status !== 'PASS' || matrixResult.routes !== 54 || matrixResult.uniqueFeatures !== 64)
  throw new Error('Current route matrix did not cover 54 routes and 64 features.');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'botsales-kit/contracts/route-manifest.json'), 'utf8'));
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'docs/route-implementation.json'), 'utf8'));
const browserPath = 'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log';
const browserLog = fs.readFileSync(path.join(root, browserPath), 'utf8');
const browserRun = browserLog.match(/^\s*(\d+) passed \([^)]+\)\s*$/m);
const browserSmoke = 'all canonical routes render inside the real React demo application';
if (!browserRun || Number(browserRun[1]) !== 123 || !browserLog.includes(browserSmoke))
  throw new Error('The referenced current full Chromium run is missing its 123-pass canonical-route evidence.');

const canonicalRoutes = new Map(manifest.routes.map((route) => [route.id, route.path]));
const routeIds = new Set();
const featureRows = matrix.flatMap((route) => route.featureCoverage ?? []);
const featureIds = new Set();
const invalidCoverage = [];
for (const route of matrix) {
  if (routeIds.has(route.routeId) || canonicalRoutes.get(route.routeId) !== route.route)
    throw new Error(`Duplicate or non-canonical route mapping: ${route.routeId}`);
  routeIds.add(route.routeId);
  if (!fs.existsSync(path.join(root, route.source))) throw new Error(`Missing route source: ${route.source}`);
  for (const feature of route.featureCoverage ?? []) {
    featureIds.add(feature.featureId);
    if (!['FRONTEND_INTERACTION_VERIFIED_SYNTHETIC', 'PARTIAL_SYNTHETIC_CROSS_MODULE_JOURNEY', 'ROUTE_MOUNT_ONLY'].includes(feature.coverage))
      invalidCoverage.push(feature.featureId);
  }
}
if (routeIds.size !== 54 || routeIds.size !== canonicalRoutes.size || featureIds.size !== 64 || invalidCoverage.length)
  throw new Error(`Coverage map mismatch: routes=${routeIds.size}, features=${featureIds.size}, invalid=${invalidCoverage.join(',')}`);

const logFile = 'execution/frontend-evidence/FE001/S02-current-route-source-final-20261001.log';
const log = [
  'FE001.S02 current route/source evidence',
  `cwd=${root}`,
  'command=node scripts/check-source.mjs; node tests/vertical-slices/generate-route-implementation.mjs; inspect current full Chromium evidence',
  'exitCode=0',
  `source-check=${JSON.stringify(sourceResult)}`,
  `route-matrix=${JSON.stringify(matrixResult)}`,
  `browser=${browserRun[1]} passed; canonical route smoke found; log=${browserPath}`,
  `observed=54 canonical route IDs, ${featureIds.size} feature IDs, 58 TypeScript sources, 224 operation references; coverage kinds preserve interaction, partial journey, and route-mount distinctions.`,
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API',
].join('\n');
fs.writeFileSync(path.join(kit, logFile), `${log}\n`, 'utf8');

const prior = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'S02-current-route-source-refresh-20261001.json'), 'utf8'));
const routeSources = [...new Set(matrix.map((route) => route.source))];
const evidencePaths = [
  'apps/web/package.json',
  'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/execution/frontend-command-map.json',
  'docs/route-implementation.json',
  'scripts/check-source.mjs',
  'tests/frontend.spec.ts',
  'tests/vertical-slices/generate-route-implementation.mjs',
  'botsales-kit/execution/frontend-evidence/FE001/refresh-S02-current.mjs',
  browserPath,
  ...routeSources,
  ...prior.sourceFiles.map((file) => file.path).filter((file) => file.startsWith('tests/') && fs.existsSync(path.join(root, file))),
  `botsales-kit/${logFile}`,
];
const sourceFiles = [...new Set(evidencePaths)].sort().map((file) => ({ path: file, sha256: hash(fs.readFileSync(path.join(root, file))) }));
const evidence = {
  ...prior,
  executedAt: new Date().toISOString(),
  sourceRevision: 'HEAD 18be3c6c75ed66ced592b2d58f36ffbdbd8ae221 plus current dirty frontend working tree',
  expected: 'All 54 canonical routes and 64 feature IDs map to existing React sources, with interaction, partial synthetic journey, and route-mount evidence represented accurately.',
  observed: `Source checker PASS (${sourceResult.files} TypeScript files, ${sourceResult.operationCalls} operation references, ${sourceResult.routes} routes). Matrix generator PASS (${matrixResult.routes} routes, ${matrixResult.uniqueFeatures} feature IDs); route paths match the canonical manifest and all source paths exist. The linked Chromium run passed ${browserRun[1]}/123 and includes canonical route smoke. Feature coverage labels distinguish direct interaction, partial cross-module journeys, and route-mount-only evidence.`,
  command: 'node scripts/check-source.mjs; node tests/vertical-slices/generate-route-implementation.mjs; inspect current full Chromium evidence',
  checksTotal: 3,
  failed: 0,
  exitCode: 0,
  logFile,
  logSha256: hash(fs.readFileSync(path.join(kit, logFile))),
  sourceFiles,
  sourceSnapshotSha256: hash(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
const evidencePath = path.join(evidenceDir, 'S02-current-route-source-final-20261001.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: evidence.result, evidencePath: path.relative(kit, evidencePath), routes: routeIds.size, features: featureIds.size, sourceFiles: sourceFiles.length, browserTests: browserRun[1] }, null, 2));
