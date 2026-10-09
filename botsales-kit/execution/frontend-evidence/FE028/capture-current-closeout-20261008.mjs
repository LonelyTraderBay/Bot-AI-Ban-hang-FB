import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptFile = fileURLToPath(import.meta.url);
const kitRoot = path.resolve(path.dirname(scriptFile), '../../../..', 'botsales-kit');
const repoRoot = path.dirname(kitRoot);
const progressFile = path.join(kitRoot, 'execution/frontend-progress.json');
const progressState = () => JSON.parse(fs.readFileSync(progressFile, 'utf8'));
const frontendRoot = path.resolve(kitRoot, progressState().sourceRootRelative);
const outputDir = 'execution/frontend-evidence/FE028';
const stepIds = ['S01', 'S02', 'S03', 'S04', 'S05'];
const stepId = process.argv[2];
const plan = JSON.parse(fs.readFileSync(path.join(kitRoot, 'execution/frontend-plan.json'), 'utf8'));
const task = plan.tasks.find(item => item.id === 'FE028');
const step = task?.implementationSteps.find(item => item.id === stepId);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const fileSha = relative => sha(fs.readFileSync(resolveSource(relative)));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const resolveSource = relative => relative.startsWith('botsales-kit/')
  ? path.join(kitRoot, relative.slice('botsales-kit/'.length))
  : path.join(frontendRoot, relative);
const readSource = relative => fs.readFileSync(resolveSource(relative), 'utf8');
const readJson = relative => JSON.parse(readSource(relative));
const sourceSnapshot = files => sha(Buffer.from(files.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8', windowsHide: true });
  assert(!result.error && result.status === 0, `${command} ${args.join(' ')} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  return result.stdout.trim();
};
const progress = args => JSON.parse(run(process.execPath, [path.join(kitRoot, 'scripts/progress.mjs'), ...args, '--defer-reports']));
const existsRepoPath = relative => fs.existsSync(path.join(repoRoot, relative));

assert(plan.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && task, 'Canonical Frontend task or scope mismatch.');
assert(frontendRoot.endsWith(`${path.sep}BotSalesAI_Frontend`), `Unexpected source root: ${frontendRoot}`);
assert(stepIds.includes(stepId) && step, 'Pass one checkpoint: S01, S02, S03, S04 or S05.');

const index = stepIds.indexOf(stepId);
const beforeValidation = progress(['validate']);
const before = progress(['status']);
assert(beforeValidation.valid && beforeValidation.tasks === 28 && beforeValidation.checkpoints === 140,
  'Canonical FE plan structure validation failed.');
assert(before.blocked.length === 0, `Unexpected blocked tasks: ${JSON.stringify(before.blocked)}`);
assert(before.verifiedSteps === 135 + index && before.totalSteps === 140,
  `Expected ${135 + index}/140 before FE028.${stepId}; got ${before.verifiedSteps}/${before.totalSteps}.`);
assert(before.stale.length === 1 && before.stale[0] === 'FE028',
  `Expected FE028 alone stale; got ${JSON.stringify(before.stale)}.`);
assert(before.next[0]?.id === 'FE028' && before.next[0]?.nextStep?.id === stepId,
  `Canonical next checkpoint does not match FE028.${stepId}.`);

const matrixPath = 'botsales-kit/execution/frontend-evidence/FE028/quality-gate-matrix-current-20261008.json';
const architecturePath = 'botsales-kit/execution/frontend-evidence/FE028/architecture-review-current-20261008.md';
const claimPath = 'botsales-kit/execution/frontend-evidence/FE028/production-claim-review-current-20261008.json';
const detailedHandoffPath = 'botsales-kit/execution/frontend-evidence/FE028/handoff-current-20261008.md';
const matrix = readJson(matrixPath);
const claim = readJson(claimPath);
const architecture = readSource(architecturePath);
const detailedHandoff = readSource(detailedHandoffPath);
const handoff = readSource('botsales-kit/execution/frontend-evidence/FE028/handoff.md');
const report = readSource('evidence/REPORT.md');
const planUI = readSource('docs/FRONTEND_UI_IMPROVEMENT_PLAN.md');
const packageJson = readJson('apps/web/package.json');
const envExample = readSource('.env.example');
const vite = readSource('apps/web/vite.config.ts');
const main = readSource('apps/web/src/main.tsx');
const shell = readSource('apps/web/src/app/Shell.tsx');
const control = readSource('apps/web/src/mocks/control.ts');
const service = readSource('apps/web/src/mocks/service.ts');
const database = readSource('apps/web/src/mocks/database.ts');
const apiClient = readSource('apps/web/src/shared/api/client.ts');
const contractGenerated = readSource('packages/contracts/src/generated.ts');
const routeManifest = readJson('botsales-kit/contracts/route-manifest.json');
const moduleDirs = fs.readdirSync(path.join(frontendRoot, 'apps/web/src/modules'), { withFileTypes: true }).filter(item => item.isDirectory());
let fullProductHashBefore = null;

assert(matrix.scope === plan.scope && matrix.gates.length === 9 && matrix.rubric.passed === 7 && matrix.rubric.total === 9,
  'Gate matrix has unexpected scope or count.');
assert(matrix.trackerBeforeFE028Closeout.verifiedSteps === 135 && matrix.trackerBeforeFE028Closeout.totalSteps === 140
  && matrix.trackerBeforeFE028Closeout.stale.includes('FE028'), 'Matrix does not identify its pre-review tracker snapshot.');
assert(matrix.gates.map(gate => gate.id).join(',') === 'FE-G01,FE-G02,FE-G03,FE-G04,FE-G05,FE-G06,FE-G07,FE-G08,FE-G09',
  'Matrix is missing or reorders a mandatory gate.');
assert(matrix.gates.find(gate => gate.id === 'FE-G05')?.status === 'CHƯA ĐẠT'
  && matrix.gates.find(gate => gate.id === 'FE-G09')?.status === 'CHƯA XÁC MINH', 'Open gate statuses were promoted.');
assert(matrix.definitionOfDone.technicalPackageStatus === 'ĐẠT'
  && matrix.definitionOfDone.acceptanceStatus === 'CHƯA XÁC MINH'
  && matrix.definitionOfDone.status === 'CHƯA ĐẠT ĐẦY ĐỦ', 'Definition-of-Done status overstates acceptance.');
assert(claim.rule.includes('19.6') && claim.decision.productionReadyOrEnterpriseGradeClaim === 'NOT_MADE'
  && claim.authority.notAuthorizedOrNotClaimed.includes('Record user acceptance'), 'Production claim/authority boundary is invalid.');

const localLinks = [
  ['botsales-kit/execution/frontend-evidence/FE028/handoff.md', handoff],
  [detailedHandoffPath, detailedHandoff],
  [architecturePath, architecture],
  ['README.md', readSource('README.md')],
  ['docs/PROJECT_CONTEXT.md', readSource('docs/PROJECT_CONTEXT.md')],
  ['docs/CONTINUE_FRONTEND.md', readSource('docs/CONTINUE_FRONTEND.md')],
  ['docs/KNOWN_GAPS.md', readSource('docs/KNOWN_GAPS.md')],
  ['evidence/REPORT.md', report],
];
let checkedLinks = 0;
for (const [markdownPath, contents] of localLinks) {
  const base = markdownPath.startsWith('botsales-kit/')
    ? path.resolve(kitRoot, path.dirname(markdownPath.slice('botsales-kit/'.length)))
    : path.resolve(frontendRoot, path.dirname(markdownPath));
  for (const match of contents.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, '').replace(/\s+".*$/, '');
    if (/^(https?:|mailto:|#)/i.test(target)) continue;
    target = target.split('#')[0];
    if (!target) continue;
    const absolute = path.resolve(base, target);
    assert(fs.existsSync(absolute), `Broken Markdown link in ${markdownPath}: ${match[1]}`);
    checkedLinks++;
  }
}

const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'DESIGN.md', 'UX-CONTRACT.md', 'README.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/KNOWN_GAPS.md',
  'docs/FRONTEND_SPACING_STANDARD.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
  'apps/web/package.json', 'package.json', 'package-lock.json', '.env.example',
  'apps/web/vite.config.ts', 'apps/web/src/main.tsx', 'apps/web/src/app/router.tsx',
  'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/client.type-contracts.ts',
  'apps/web/src/shared/api/validation.ts', 'apps/web/src/shared/ui/README.md',
  'apps/web/src/mocks/control.ts', 'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts',
  'apps/web/src/mocks/handlers.ts', 'apps/web/src/mocks/seed.json', 'packages/contracts/src/generated.ts',
  'evidence/REPORT.md', 'evidence/frontend-ui-document-sync-20261007/REPORT.md',
  'evidence/frontend-ui-document-sync-20261007/S19-current-evidence.json',
  'botsales-kit/AGENTS.md', 'botsales-kit/AI_RULES_PROJECT.md', 'botsales-kit/docs/02_ARCHITECTURE.md',
  'botsales-kit/docs/06_API_AND_REALTIME.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
  'botsales-kit/execution/FRONTEND_PLAN_GUIDE.md', 'botsales-kit/execution/SESSION_HANDOFF.md',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/design/tokens.json',
  'botsales-kit/scripts/progress.mjs',
  matrixPath, architecturePath, claimPath, detailedHandoffPath,
  'botsales-kit/execution/frontend-evidence/FE028/handoff.md',
  'botsales-kit/execution/frontend-evidence/FE028/capture-current-closeout-20261008.mjs',
  'botsales-kit/execution/frontend-evidence/FE026/clean-build-current-20261008-attempt03.log',
  'botsales-kit/execution/frontend-evidence/FE026/clean-artifacts-current-20261008-attempt03.json',
  'botsales-kit/execution/frontend-evidence/FE026/registered-verify-current-20261008.log',
  'botsales-kit/execution/frontend-evidence/FE027/uat-matrix-current-20261008.json',
  'botsales-kit/execution/frontend-evidence/FE027/ui-screenshots-current-20261008/manifest.json',
  'botsales-kit/execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
  'botsales-kit/execution/frontend-evidence/FE025/S04-current-responsive-performance-20261008.json',
  'botsales-kit/execution/frontend-evidence/FE025/keyboard-only-current-20261008.log',
  'botsales-kit/execution/frontend-evidence/FE025/actual-browser-zoom-current-20261008.log',
  'botsales-kit/execution/frontend-evidence/FE025/native-text-only-current-20261008.log',
];
const uniqueSourcePaths = [...new Set(sourcePaths)];
const sourceFiles = uniqueSourcePaths.map(file => {
  const absolute = resolveSource(file);
  assert(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `Missing reviewed source/evidence: ${file}`);
  return { path: file, sha256: sha(fs.readFileSync(absolute)) };
});

const checks = [];
const check = (condition, label) => { assert(condition, `${stepId} failed: ${label}`); checks.push(label); };
if (stepId === 'S01') {
  check(matrix.gates.length === 9, 'nine FE-G01..09 gates represented');
  check(matrix.rubric.passed === 7 && matrix.rubric.total === 9, '7/9 rubric count explicitly not a completion percentage');
  check(matrix.gates.some(gate => gate.id === 'FE-G05' && gate.status === 'CHƯA ĐẠT'), 'FE-G05 human evidence remains open');
  check(matrix.gates.some(gate => gate.id === 'FE-G09' && gate.status === 'CHƯA XÁC MINH'), 'FE-G09 owner decision remains open');
  check(matrix.openEvidence.some(item => item.id === 'hosted-ci' && item.status === 'CHƯA XÁC MINH'), 'hosted CI remains unclaimed');
  check(matrix.openEvidence.some(item => item.id === 'live-services' && item.status.includes('NGOÀI_PHẠM_VI')), 'live systems remain outside this proof');
  check(matrix.definitionOfDone.status === 'CHƯA ĐẠT ĐẦY ĐỦ', 'DoD does not overstate final acceptance');
  check(sourceFiles.length >= 45, 'review source/evidence snapshots captured');
  check(checkedLinks >= 50, 'current handoff and navigation links resolve');
  check(matrix.gates.flatMap(gate => gate.evidence || []).every(existsRepoPath), 'all FE gate evidence links exist');
  check(matrix.definitionOfDone.criteria.flatMap(item => item.evidence || []).every(existsRepoPath), 'all DoD evidence links exist');
} else if (stepId === 'S02') {
  check((main.match(/createRoot\(/g) || []).length === 1, 'single React root');
  check(main.includes('ThemeProvider') && main.includes('QueryClientProvider') && main.includes('SessionProvider') && main.includes('RouterProvider'), 'one provider/router composition at public entry');
  check(moduleDirs.length === 16, '16 actual module directories');
  check(routeManifest.routes?.length === 54, '54 canonical route contract entries');
  check(apiClient.includes('API_BASE_PATH') && contractGenerated.includes('API_BASE_PATH = "/api/v2"'), 'same-origin generated API base contract');
  check(main.includes('if (__MOCK__)') && main.includes("import('./mocks/browser')"), 'mock worker starts only in mock build mode');
  check(architecture.includes('Không phát hiện provider/state/router trùng') && architecture.includes('synthetic'), 'architecture review states inspected scope/limits');
  check(readSource('apps/web/src/shared/api/client.type-contracts.ts').length > 0, 'contract-typed API client source exists');
} else if (stepId === 'S03') {
  check(packageJson.scripts.dev?.includes('--mode demo') && packageJson.scripts['dev:live']?.includes('--mode development'), 'demo/live commands match package scripts');
  check(packageJson.scripts.build?.includes('--mode production') && packageJson.scripts['build:demo']?.includes('--mode demo'), 'production/demo build commands match package scripts');
  check(envExample.includes('API_PROXY_TARGET=') && !envExample.includes('VITE_API_BASE_URL'), 'env documents proxy, with no invented VITE API base');
  check(vite.includes('env.API_PROXY_TARGET') && vite.includes("'/api'"), 'live proxy uses API_PROXY_TARGET for /api');
  check(shell.includes('Dataset mô phỏng') && shell.includes('Dataset mặc định') && shell.includes('setMockControl'), 'demo toolbar exposes default dataset selector');
  check(control.includes("value === 'seed'") && control.includes('resetService()'), 'default dataset selection resets service');
  check(service.includes('resetDb()') && database.includes('structuredClone(seed)'), 'reset recreates in-memory seed fixture');
  check(detailedHandoff.includes('Không có reset HTTP endpoint/CLI') && detailedHandoff.includes('same-origin `/api/v2`'), 'handoff states actual reset/API boundary');
  check(!report.includes('resetService() chỉ là helper test'), 'report does not incorrectly call user-facing reset test-only');
} else if (stepId === 'S04') {
  check(readSource('AI_RULES.md').includes('19.6'), 'canonical Frontend Production Claim Gate source is present');
  check(claim.rule.includes('19.6') && claim.criteria.mandatoryFrontendGates.includes('FE-G01'), 'claim review binds its governing rule and mandatory gates');
  check(claim.subject.claimScope.toLowerCase().includes('local') && claim.subject.claimScope.includes('no Backend'), 'claim is explicitly local/frontend scoped');
  check(claim.decision.productionReadyOrEnterpriseGradeClaim === 'NOT_MADE', 'no whole-system production claim');
  check(claim.exceptionsAndOpenEvidence.some(item => item.id === 'FE-G05'), 'accessibility exception remains visible');
  check(claim.exceptionsAndOpenEvidence.some(item => item.id === 'FE-G09'), 'owner acceptance remains visible');
  check(claim.authority.notAuthorizedOrNotClaimed.includes('Record user acceptance'), 'assistant does not self-certify acceptance');
  check(matrix.definitionOfDone.acceptanceStatus === 'CHƯA XÁC MINH', 'acceptance remains unverified');
  check(matrix.openEvidence.some(item => item.id === 'live-services'), 'backend/provider/staging gaps remain scoped');
} else {
  const uiSection = planUI.split('### 16.6.')[1]?.split('\n### 16.7.')[0] ?? '';
  const uiRows = [...uiSection.matchAll(/^\| S(\d{2}) \|([^\n]+)$/gm)];
  const fullProductProgress = path.join(kitRoot, 'execution/progress.json');
  fullProductHashBefore = fs.existsSync(fullProductProgress) ? sha(fs.readFileSync(fullProductProgress)) : null;
  check(uiRows.length === 20, 'UI rollout plan S01–S20 rows are present separately from FE ledger');
  check(!/\| S\d{2} \|[^\n]*(?:TODO|IN_PROGRESS|BLOCKED|CHƯA TRIỂN KHAI)/i.test(uiSection), 'UI rollout has no listed open implementation step');
  check(uiSection.includes('READY_FOR_ACCEPTANCE_LOCAL_SCOPE'), 'UI S20 is handed off for scoped user review');
  check(handoff.includes('FE-G05') && handoff.includes('FE-G09') && detailedHandoff.includes('Narrator speech/transcript'), 'remaining human/owner acceptance limits are handed off');
  check(claim.decision.releaseAuthority.includes('user'), 'final acceptance authority is retained by the user');
  check(sourceFiles.some(file => file.path === 'evidence/REPORT.md'), 'final report is bound into source snapshot');
  check(before.verifiedSteps === 139, 'four FE028 checkpoints have current evidence before S05');
  check(fullProductHashBefore !== null, 'full-product ledger exists for read-only boundary check');
}

const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8', windowsHide: true });
assert(git.status === 0, 'Cannot inspect current Git revision.');
const now = new Date().toISOString();
const stem = `${stepId}-current-closeout-v3-20261008`;
const evidencePath = `${outputDir}/${stem}.json`;
const logPath = `${outputDir}/${stem}.log`;
const absoluteEvidence = path.join(kitRoot, evidencePath);
const absoluteLog = path.join(kitRoot, logPath);
assert(!fs.existsSync(absoluteEvidence) && !fs.existsSync(absoluteLog), `Refusing to overwrite existing FE028.${stepId} evidence.`);
const snapshot = sourceSnapshot(sourceFiles);
const observations = {
  S01: 'PASS — Reconciled all nine frontend gates and Definition of Done against the current gate matrix, linked FE026/FE027/FE001/FE025 evidence, actual repository files, and exact open exceptions. The 7/9 rubric is not a code-completion percentage; FE-G05 remains incomplete and FE-G09 remains for the user.',
  S02: 'PASS — Inspected actual React entry/provider composition, 16 modules, 54 canonical routes, generated API base/typed client, mock startup boundary, and architecture review. This is a self-review with local synthetic evidence; no live backend behavior is certified.',
  S03: 'PASS — Matched run/build commands, .env example, API proxy configuration, same-origin generated base, demo dataset selector, reset helper/database behavior, and current handoff against source. The demo toolbar and reload reset in-memory fixtures; no reset HTTP endpoint or CLI exists.',
  S04: 'PASS — Applied canonical Production Claim Gate §19.6 to artifact, working-tree scope, criteria, evidence, exceptions, and authority. Recommendation remains local/frontend review only. No owner acceptance, hosted CI, Backend, staging, production, WCAG-wide or enterprise claim was recorded.',
  S05: 'PASS — Linked current source/evidence/checksums, reproduction steps, separate UI rollout state, FE gate exceptions, risks, and next owner action. UI §16.6 has S01–S20 dispositions and S20 is ready for scoped user review; human accessibility evidence and user acceptance remain open. Full-product ledger remains read-only.',
}[stepId];
const logText = [
  `FE028.${stepId} current local frontend closeout review`,
  `reviewedAt=${now}`,
  `command=node botsales-kit/execution/frontend-evidence/FE028/capture-current-closeout-20261008.mjs ${stepId}`,
  `cwd=${repoRoot}`,
  'reviewExitCode=0',
  `expected=${step.verification}`,
  `checksTotal=${checks.length}; failed=0`,
  `observed=${observations}`,
  `preCheckpointStatus=${before.verifiedSteps}/${before.totalSteps}; blocked=${JSON.stringify(before.blocked)}; stale=${JSON.stringify(before.stale)}; next=FE028.${stepId}`,
  'Runtime test suites were not rerun by this artifact review; their original commands, exit codes and dated logs remain separately linked and hash-checked.',
  'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live Backend/provider, hosted CI, staging, production or owner acceptance is claimed.',
  `localMarkdownLinksChecked=${checkedLinks}`,
  `sourceSnapshotSha256=${snapshot}`,
  ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
const evidence = {
  taskId: 'FE028', stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: plan.scope, executedAt: now,
  sourceRevision: `HEAD ${git.stdout.trim()} plus measured current working tree; source hashes are listed in this receipt.`,
  expected: step.verification, observed: observations,
  command: `node botsales-kit/execution/frontend-evidence/FE028/capture-current-closeout-20261008.mjs ${stepId}`,
  cwd: repoRoot,
  reviewer: 'Codex self-review against current source and hashed prior evidence; no independent peer review claimed.',
  environment: {
    name: 'Windows local source/evidence review; Node.js process; React app uses synthetic MSW in demo/test mode.',
    details: `Checked ${checks.length} named criteria, ${checkedLinks} local Markdown links and ${sourceFiles.length} source/evidence fingerprints. Test results are preserved in their original dated logs and were not rerun here.`,
    dataSource: 'source-only',
  },
  checksTotal: checks.length, failed: 0, exitCode: 0,
  logFile: logPath, logSha256: sha(Buffer.from(logText)),
  sourceFiles, sourceSnapshotSha256: snapshot,
  supplementaryEvidence: [
    ...[matrixPath, architecturePath, claimPath, detailedHandoffPath, 'botsales-kit/execution/frontend-evidence/FE028/handoff.md'].map(file => ({ path: file, sha256: fileSha(file) })),
    ...matrix.gates.flatMap(gate => gate.evidence || []).map(file => ({ path: file, sha256: sha(fs.readFileSync(path.join(repoRoot, file))) })),
  ],
  runtimeTestsRerunByThisReview: false,
};

fs.writeFileSync(absoluteLog, logText, { encoding: 'utf8', flag: 'wx' });
fs.writeFileSync(absoluteEvidence, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
const current = progressState();
if (current.tasks.FE028.status !== 'IN_PROGRESS') run(process.execPath, [path.join(kitRoot, 'scripts/progress.mjs'), 'start', 'FE028', current.tasks.FE028.owner || 'Codex', '--defer-reports']);
run(process.execPath, [path.join(kitRoot, 'scripts/progress.mjs'), 'checkpoint', 'FE028', stepId, evidencePath, '--defer-reports']);

let after = progress(['status']);
let structuralValidation = null;
if (stepId === 'S05') {
  structuralValidation = progress(['validate']);
  assert(structuralValidation.valid && structuralValidation.tasks === 28 && structuralValidation.checkpoints === 140,
    'Final canonical FE ledger validation failed.');
  run(process.execPath, [path.join(kitRoot, 'scripts/progress.mjs'), 'report', '--defer-reports']);
  after = progress(['status']);
  assert(after.verifiedSteps === 140 && after.totalSteps === 140 && after.blocked.length === 0 && after.stale.length === 0,
    `Final FE ledger is not current and complete: ${JSON.stringify(after)}`);
  const fullProductAfter = sha(fs.readFileSync(path.join(kitRoot, 'execution/progress.json')));
  assert(fullProductHashBefore !== null && fullProductAfter === fullProductHashBefore, 'Full-product tracker changed during Frontend closeout.');
}

console.log(JSON.stringify({
  result: 'PASS', checkpoint: `FE028.${stepId}`, evidence: `botsales-kit/${evidencePath}`, log: `botsales-kit/${logPath}`,
  checks: checks.length, sourceFiles: sourceFiles.length, localMarkdownLinks: checkedLinks,
  before: { verified: before.verifiedSteps, total: before.totalSteps, stale: before.stale, blocked: before.blocked },
  after: { verified: after.verifiedSteps, total: after.totalSteps, stale: after.stale, blocked: after.blocked, next: after.next.map(item => `FE${item.id.slice(2)}.${item.nextStep?.id}`) },
  validation: structuralValidation,
}, null, 2));
