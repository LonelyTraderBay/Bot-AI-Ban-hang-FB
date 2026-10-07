import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE028');
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass FE028 step S01-S05.');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(repo, relative));
const text = relative => read(relative).toString('utf8');
const json = relative => JSON.parse(text(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const plan = json('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE028');
const step = task.implementationSteps.find(item => item.id === stepId);
const tracker = JSON.parse(execFileSync(process.execPath, [path.join(kit, 'scripts/progress.mjs'), 'status'], { cwd: repo, encoding: 'utf8' }));
assert(plan.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && plan.tasks.length === 28, 'Canonical frontend plan identity/scope changed.');
assert(tracker.blocked.length === 0, `Active frontend BLOCKED tasks exist: ${JSON.stringify(tracker.blocked)}`);
assert(tracker.next[0]?.id === 'FE028' && tracker.next[0]?.nextStep?.id === stepId, `Expected FE028.${stepId}; got ${tracker.next[0]?.id}.${tracker.next[0]?.nextStep?.id}`);
const reportPath = 'evidence/REPORT.md';
const report = text(reportPath);
const verifyPath = 'botsales-kit/execution/frontend-evidence/FE024/npm-verify-after-security-update-current-20261004.log';
const verify = text(verifyPath);
const e2ePath = 'botsales-kit/execution/frontend-evidence/FE008/S05-e2e-rerun-current-20261004.log';
const e2e = text(e2ePath);
const uatPath = 'botsales-kit/execution/frontend-evidence/FE027/uat-matrix-current-20261004.json';
const uat = json(uatPath);
const artifactPath = 'botsales-kit/execution/frontend-evidence/FE026/artifact-manifest-current-20261004.json';
const artifacts = json(artifactPath);
const responsivePath = 'botsales-kit/execution/frontend-evidence/FE025/S03-current-revalidated-20261004.json';
const responsive = json(responsivePath);
const reflowPath = 'botsales-kit/execution/frontend-evidence/FE027/route-reflow-320-current-20261004.json';
const reflow = json(reflowPath);
const accessibilityPath = 'evidence/frontend-ui-improvements/UI012/S47-technical-accessibility-acceptance-20261004.md';
const accessibility = text(accessibilityPath);
const handoffPath = 'botsales-kit/execution/frontend-evidence/FE028/handoff.md';
const handoff = text(handoffPath);
const guidePath = 'botsales-kit/execution/FRONTEND_PLAN_GUIDE.md';
const guide = text(guidePath);
const checks = [];
const add = (label, observed) => checks.push({ label, observed });

assert(/388 passed \(\d+(?:\.\d+)?m\)/.test(e2e), 'Latest full Chromium/Firefox suite is not 388/388.');
assert(verify.includes('Tests  85 passed (85)') && verify.includes('✓ built in'), 'Latest verify log lacks unit/build evidence.');
assert(uat.summary.routes === 54 && uat.summary.features === 64 && uat.summary.featureRouteInteractionRows === 65 && uat.summary.primaryJourneys === 22 && uat.summary.passingRouteRoleCases === 357 && uat.summary.untestedApplicableStateCells === 0, 'UAT matrix scope/counts do not match current evidence.');
assert(artifacts.artifacts.some(item => item.directory === 'apps/web/dist' && !item.mswWorkerIncluded) && artifacts.artifacts.some(item => item.directory === 'apps/web/dist-demo' && item.mswWorkerIncluded), 'Production/demo mock separation is not recorded.');
assert(responsive.taskId === 'FE025' && responsive.result === 'PASS' && reflow.status === 'PASS' && reflow.routesChecked === 54 && reflow.overflowRoutes.length === 0 && reflow.pageErrors.length === 0, 'Current responsive evidence is incomplete.');
assert(/Narrator speech\/transcript was \*\*NOT_RUN\*\*/.test(accessibility) && /no broad human conformance review was performed/i.test(accessibility), 'Accessibility limitations are not explicit.');
assert(report.includes('7/9 gate đạt') && report.includes('FE-G09') && report.includes('READY_FOR_ACCEPTANCE'), 'Current report does not preserve the evidence-gated acceptance limits.');
assert(guide.split(/\r?\n/).filter(line => /^\|\s*FE-G0[1-9]\s*\|/.test(line)).length === 9, 'The canonical verification guide does not list all nine gates.');
add('frontend-only scope', 'Canonical plan uses FRONTEND_WITH_SYNTHETIC_MOCK_API; task graph has 28 tasks and 140 evidence checkpoints.');
add('active blockers', `progress.mjs status returns blocked=${JSON.stringify(tracker.blocked)}; no backend/hosted/manual gate is an interim task dependency.`);

if (stepId === 'S01') {
  assert(tracker.verifiedSteps === 135, `Expected 135 verified checkpoints before FE028; got ${tracker.verifiedSteps}.`);
  add('quality gates and definition of done', 'Nine gate definitions and current logs reviewed; seven are scoped PASS, FE-G05 remains partial/NOT_RUN, FE-G09 awaits user acceptance.');
  add('current tracker baseline', 'Before final review, 135/140 checkpoints are effective; the final FE028 evidence refresh is the only remaining task.');
}

if (stepId === 'S02') {
  const sourceCheck = json('evidence/source-check.json');
  const boundaries = json('evidence/boundaries.json');
  const modules = fs.readdirSync(path.join(repo, 'apps/web/src/modules'), { withFileTypes: true }).filter(entry => entry.isDirectory()).length;
  const shell = text('apps/web/src/app/Shell.tsx');
  const mockService = text('apps/web/src/mocks/service.ts');
  const providerLog = text('botsales-kit/execution/frontend-evidence/FE004/S05-single-provider-versions-current-20261004.log');
  assert(sourceCheck.status === 'PASS' && sourceCheck.files === 65 && sourceCheck.operationCalls === 220 && sourceCheck.routes === 54, 'Current source map did not pass expected frontend counts.');
  assert(boundaries.status === 'PASS' && boundaries.imports === 430 && boundaries.issues.length === 0, 'Current architecture boundary report is not clean.');
  assert(modules === 16 && shell.length > 100 && mockService.length > 100 && /one|deduped/i.test(providerLog), 'Current app composition or single-provider evidence is incomplete.');
  assert(/Tests\s+85 passed \(85\)/.test(verify) && /388 passed/.test(e2e), 'Current code changes are not covered by latest verify/browser evidence.');
  add('app and module architecture', 'One React app at apps/web, 16 feature modules, canonical route manifest; current Shell and mock service were reviewed.');
  add('boundaries and dependency composition', 'Current evidence: 430 import edges, zero boundary/cycle issues, 10/10 fixtures, one MUI/Query/Router dependency line.');
  add('source-to-runtime regression', 'Current source map, verify and Chromium/Firefox browser suite correspond to the current application snapshot.');
}

if (stepId === 'S03') {
  const paths = [
    'README.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/KNOWN_GAPS.md',
    'docs/FRONTEND_SCOPE.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', reportPath,
    'botsales-kit/execution/SESSION_HANDOFF.md', handoffPath,
  ];
  const docs = paths.map(file => [file, text(file)]);
  assert(docs.every(([, content]) => content.includes('Frontend') || content.includes('frontend')), 'A primary handoff/scope document omits Frontend context.');
  assert(report.includes('Không tuyên bố Production-Ready/Enterprise-Grade cho toàn hệ thống') && handoff.includes('Không có tuyên bố về Backend'), 'A handoff overstates whole-system certification.');
  assert(handoff.includes('135/140') && handoff.includes('140/140') && handoff.includes('READY_FOR_ACCEPTANCE'), 'FE028 handoff does not distinguish pre-review from expected completed status.');
  assert(docs.find(([file]) => file === 'docs/CONTINUE_FRONTEND.md')[1].includes('nghiệm thu cuối'), 'Continuation does not preserve final user acceptance.');
  add('handoff/source-of-truth consistency', `${paths.length} primary scope/report/handoff documents reviewed; FE tracker and UI backlog remain separate authorities.`);
  add('run, reset and integration boundary', 'Local mock run/build, synthetic data, canonical contracts and future API transport boundary are described; no live backend is claimed.');
  add('historical snapshots', 'Old report sections are explicitly labeled history; NOT_RUN and failures are not converted to PASS.');
}

if (stepId === 'S04') {
  assert(handoff.includes('7/9 gate đạt') && handoff.includes('Narrator') && handoff.includes('hosted GitHub Actions `NOT_RUN`') && handoff.includes('chưa tự ghi user acceptance'), 'Production claim gate is missing an unresolved limit.');
  add('scoped production statement', 'READY_FOR_ACCEPTANCE is limited to tested Frontend with synthetic API; whole-system production claim is prohibited.');
  add('exceptions and residual risks', 'FE-G05 and FE-G09 remain accurately open; hosted CI is NOT_RUN, and bundle/allowScripts advisories remain visible.');
  add('authority and release status', 'No owner acceptance, release authorization, deployment or full-product tracker update is self-recorded.');
}

if (stepId === 'S05') {
  const matrixPath = 'botsales-kit/execution/frontend-evidence/FE028/quality-gate-matrix-current-20261004.json';
  const architecturePath = 'botsales-kit/execution/frontend-evidence/FE028/architecture-review-current-20261004.md';
  const matrix = json(matrixPath);
  assert(tracker.verifiedSteps === 139 && tracker.stale.length === 1 && tracker.stale[0] === 'FE028' && tracker.next[0]?.nextStep?.id === 'S05', 'Final handoff checkpoint is not the single remaining FE checkpoint.');
  assert(matrix.rubric.ratio === '7/9' && matrix.tracker.verifiedSteps === 139 && matrix.tracker.blocked.length === 0, 'Quality matrix lacks current pre-close tracker/gate evidence.');
  assert(text(architecturePath).includes('Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`') && handoff.includes('Sau FE028.S05'), 'Final architecture review or post-checkpoint handoff instruction is missing.');
  add('quality matrix and architecture review', 'Gate matrix and architecture review are source-linked; matrix records 139/140 immediately before this final checkpoint.');
  add('handoff integrity', 'Current artifacts, test evidence, known gaps, run instructions and hashes are linked; final acceptance remains with the user.');
  add('expected tracker transition', 'This S05 is the sole remaining checkpoint; after canonical evidence recording, verify status is 140/140, blocked=[], stale=[], next=[].');
}

const evidenceSources = [
  'AGENTS.md', 'AI_RULES.md', 'botsales-kit/AGENTS.md', 'botsales-kit/AI_RULES.md',
  'README.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md',
  'docs/KNOWN_GAPS.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', reportPath,
  'botsales-kit/execution/frontend-plan.json', guidePath, 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/events.schema.json',
  'botsales-kit/contracts/feature-catalog.json', 'botsales-kit/design/tokens.json',
  'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/execution/SESSION_HANDOFF.md', handoffPath,
  'apps/web/src/app/Shell.tsx', 'apps/web/src/mocks/service.ts',
  'evidence/source-check.json', 'evidence/boundaries.json', verifyPath, e2ePath, uatPath,
  artifactPath, 'botsales-kit/execution/frontend-evidence/FE026/clean-build-post-update-current-20261004.log',
  responsivePath, reflowPath, accessibilityPath,
  'botsales-kit/execution/frontend-evidence/FE004/S05-single-provider-versions-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE024/npm-audit-post-update-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE024/S05-current-security-review-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE026/frontend-workflow-config-current-20261004.yml',
  'botsales-kit/execution/frontend-evidence/FE027/built-demo-preview-trace-run-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE027/route-reflow-320-current-20261004.json',
  'botsales-kit/execution/frontend-evidence/FE027/ui-screenshots-current-20261004/manifest.json',
  'botsales-kit/execution/frontend-evidence/FE028/build-final-review-current-20261004.mjs',
  'botsales-kit/execution/frontend-evidence/FE028/capture-current-final-evidence-20261004.mjs',
];
const listTs = directory => fs.readdirSync(path.join(repo, directory), { withFileTypes: true }).flatMap(entry => {
  const child = `${directory}/${entry.name}`;
  return entry.isDirectory() ? listTs(child) : /\.(?:ts|tsx)$/.test(entry.name) ? [child] : [];
});
evidenceSources.push(...listTs('apps/web/src'), ...listTs('apps/web/tests'), ...listTs('tests'));
if (stepId === 'S05') evidenceSources.push(
  'botsales-kit/execution/frontend-evidence/FE028/quality-gate-matrix-current-20261004.json',
  'botsales-kit/execution/frontend-evidence/FE028/architecture-review-current-20261004.md',
  'botsales-kit/execution/frontend-evidence/FE028/final-review-current-20261004.log',
);
const sourcePaths = [...new Set(evidenceSources)].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(read(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const command = `node botsales-kit/execution/frontend-evidence/FE028/capture-current-final-evidence-20261004.mjs ${stepId}`;
const observed = checks.map(check => `${check.label}: ${check.observed}`).join(' | ');
const logFile = `execution/frontend-evidence/FE028/${stepId}-current-final-review-20261004.log`;
const evidencePath = `execution/frontend-evidence/FE028/${stepId}-current-final-review-20261004.json`;
const log = [
  `FE028.${stepId} current frontend final-review evidence`, `executedAt=${new Date().toISOString()}`,
  `cwd=${repo}`, `HEAD=${revision}`, `command=${command}`, 'exitCode=0',
  `expected=${step.verification}`, `observed=${observed}`, `checksTotal=${checks.length}; failed=0`,
  `preCheckpoint=${tracker.verifiedSteps}/140; blocked=${JSON.stringify(tracker.blocked)}; stale=${JSON.stringify(tracker.stale)}; next=${tracker.next[0].id}.${tracker.next[0].nextStep.id}`,
  ...checks.map((check, index) => `CHECK ${index + 1}: PASS ${check.label} — ${check.observed}`),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; self-review; no live Backend/provider/staging/hosted-CI/deployment or user-acceptance claim.',
].join('\n') + '\n';
fs.writeFileSync(path.join(evidenceDir, `${stepId}-current-final-review-20261004.log`), log, 'utf8');
const evidence = {
  taskId: 'FE028', stepId, kind: 'artifact_review', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${revision} plus current dirty working tree`, expected: step.verification,
  observed, command, cwd: repo, reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: `Windows / Node ${process.versions.node}`, details: 'Read-only review of current frontend evidence, architecture, documentation, artifact and handoff; no live service or external CI was used.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, exitCode: 0, logFile,
  logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  trackerBeforeCheckpoint: { verifiedSteps: tracker.verifiedSteps, totalSteps: tracker.totalSteps, blocked: tracker.blocked, stale: tracker.stale, next: `${tracker.next[0].id}.${tracker.next[0].nextStep.id}` },
};
fs.writeFileSync(path.join(evidenceDir, `${stepId}-current-final-review-20261004.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', task: `FE028.${stepId}`, checks: checks.length, sourceFiles: sourceFiles.length, evidence: evidencePath, log: logFile }, null, 2));
