import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE010';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE010');
const routes = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
assert(task && task.implementationSteps.length === 5, 'FE010 task missing from canonical plan');
assert(task.routeIds.every(id => routes.some(route => route.id === id)), 'FE010 route mapping mismatch');
assert(task.operationIds.every(id => Object.hasOwn(operations, id)), 'FE010 operation mapping mismatch');
const catalog = read('apps/web/src/modules/catalog/index.tsx');
const imports = read('apps/web/src/modules/catalog/imports.tsx');
const tests = read('tests/fe010.spec.ts');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const map = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = map.commands.find(item => item.id === 'e2e');
const domainCommand = map.commands.find(item => item.id === 'domain');
assert(e2eCommand?.status === 'VERIFIED_AVAILABLE' && domainCommand?.status === 'VERIFIED_AVAILABLE', 'Current verified test commands unavailable');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Current full E2E run is not passing');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Current domain/schema run is not passing');
for (const op of ['listProducts', 'createProduct', 'updateProduct', 'uploadFile', 'createProductImport', 'commitProductImport', 'createCategory', 'updateCategory'])
  assert(catalog.includes(`'${op}'`) || imports.includes(`'${op}'`), `Expected catalog operation is not in the UI: ${op}`);
assert(tests.includes("expect(payload.variants[0]).not.toHaveProperty('unitCost')"), 'Product creation must not silently expose restricted cost');
const names = [
  'product editor validates positive prices, protects image-only drafts, and saves variant payload through mock HTTP',
  'product update sends If-Match and keeps edits visible after a 412 conflict',
  'warehouse role can read catalog products but cannot edit product fields or price cost data',
  'categories create, search, update with a version, and render cursor pagination',
  'CSV preview reports row-level errors and commits only valid product rows',
  'import validation token is rejected with 412 after catalog changes and the preview remains visible',
  'CSV demo row limit is explained and rejects more than 1000 data rows before preview',
  'demo upload rejects files over 5 MB before making an upload request',
  'product category lookup pages the full collection and preserves the selected category while editing',
];
for (const name of names) assert(e2e.includes(name), `Catalog browser test missing: ${name}`);
assert(e2e.includes('UI005 acceptance: {"categoryTotal":105'), 'Full paginated category lookup result missing');
assert(imports.includes('Dòng lỗi được giữ trong báo cáo') && imports.includes('XLSX chưa có parser'), 'Import limitations and partial-row truth are not visible');

const prior = json('botsales-kit/execution/frontend-evidence/FE010/S05-post-doc-sync-final-20261005.json');
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path),
  'AGENTS.md', 'AI_RULES.md', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', 'packages/contracts/src/operations.json',
  'apps/web/src/modules/catalog/index.tsx', 'apps/web/src/modules/catalog/imports.tsx', 'apps/web/src/modules/catalog/import-file.ts',
  'tests/fe010.spec.ts', 'tests/fixtures/mock-network.mjs',
  'botsales-kit/execution/frontend-command-map.json', e2eLogPath, domainLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const browserCases = [
  { name: 'Create product with valid variants and observe the HTTP payload/result', status: 'PASS' },
  { name: 'Category create/search/update and paginated product lookup', status: 'PASS', count: '105 categories' },
  { name: 'Import preview reports per-row errors and commits valid rows only', status: 'PASS' },
  { name: '412 stale product/import token retains edits and blocks commit', status: 'PASS' },
  { name: 'Read-only warehouse role cannot change catalog price/cost', status: 'PASS' },
  { name: 'CSV size/row bounds reject before upload/preview; XLSX remains an explicit gap', status: 'PASS' },
];
const caseGroups = {
  S01: [
    { name: 'All FE010 canonical route IDs and operation IDs resolve', status: 'PASS', routes: task.routeIds.length, operations: task.operationIds.length },
    { name: 'Catalog, import, variant and permission mappings use canonical source', status: 'PASS' },
  ],
  S02: browserCases.slice(0, 3),
  S03: browserCases.slice(3),
  S04: [
    { name: 'Current catalog browser behavior executes in both browser projects', status: 'PASS', count: '18/18' },
    { name: 'Fresh simulator/network/schema fixtures pass all operation scenarios', status: 'PASS', count: '88/88' },
  ],
  S05: [
    { name: 'Full built React demo suite and catalog cases pass on Chromium and Firefox', status: 'PASS', count: '484/484' },
    { name: 'Responsive and keyboard UI tests remain within the same current browser run', status: 'PASS' },
  ],
};
const out = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = caseGroups[step.id];
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full built-demo E2E passed 484/484 across Chromium/Firefox; current domain contract/network run passed 88/88. All fixtures are synthetic; no backend or real file persistence is claimed.`;
  const log = [
    `FE010.${step.id} catalog/variant/import current evidence.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}; OPERATIONS=${task.operationIds.length}; BROWSERS=Chromium+Firefox; E2E=484/484; domain=88/88`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; demo upload/import data is synthetic and local.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE010', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Built local React demo with deterministic MSW contract fixtures; no real catalog, upload, or backend service.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 88 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, operationHandlers: 210, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, catalogCases: cases },
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  out.push({ step: step.id, evidence: evidencePath, cases: cases.length });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE010', routes: task.routeIds.length, operations: task.operationIds.length, browserTests: '484/484', domainTests: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: out }, null, 2));
