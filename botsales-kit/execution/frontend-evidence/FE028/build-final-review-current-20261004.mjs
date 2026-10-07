import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const outDir = path.join(kit, 'execution/frontend-evidence/FE028');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(repo, relative));
const text = relative => read(relative).toString('utf8');
const json = relative => JSON.parse(text(relative));
const plan = json('botsales-kit/execution/frontend-plan.json');
const tracker = JSON.parse(execFileSync(process.execPath, [path.join(kit, 'scripts/progress.mjs'), 'status'], { cwd: repo, encoding: 'utf8' }));
const verifyPath = 'botsales-kit/execution/frontend-evidence/FE024/npm-verify-after-security-update-current-20261004.log';
const securityPath = 'botsales-kit/execution/frontend-evidence/FE024/S05-current-security-review-20261004.log';
const securityAuditPath = 'botsales-kit/execution/frontend-evidence/FE024/npm-audit-post-update-current-20261004.log';
const coldPath = 'botsales-kit/execution/frontend-evidence/FE026/clean-build-post-update-current-20261004.log';
const artifactPath = 'botsales-kit/execution/frontend-evidence/FE026/artifact-manifest-current-20261004.json';
const uatPath = 'botsales-kit/execution/frontend-evidence/FE027/uat-matrix-current-20261004.json';
const uatLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S05-e2e-rerun-current-20261004.log';
const responsivePath = 'botsales-kit/execution/frontend-evidence/FE025/S03-current-revalidated-20261004.json';
const a11yPath = 'evidence/frontend-ui-improvements/UI012/S47-technical-accessibility-acceptance-20261004.md';
const workflowPath = 'botsales-kit/execution/frontend-evidence/FE026/frontend-workflow-config-current-20261004.yml';
const inputs = [
  verifyPath, securityPath, securityAuditPath, coldPath, artifactPath, uatPath, uatLogPath,
  responsivePath, a11yPath, workflowPath, 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-progress.json', 'botsales-kit/execution/FRONTEND_PLAN_GUIDE.md',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/design/tokens.json',
];
const verifyLog = text(verifyPath);
const securityLog = text(securityPath);
const coldLog = text(coldPath);
const artifactManifest = json(artifactPath);
const uat = json(uatPath);
const responsive = json(responsivePath);
const a11y = text(a11yPath);
const workflow = text(workflowPath);
const cleanAuditText = text(securityAuditPath);
const auditExitMarker = cleanAuditText.lastIndexOf('\nEXIT_CODE=');
if (auditExitMarker < 0) throw new Error('Current npm audit log has no exit marker.');
const cleanAudit = JSON.parse(cleanAuditText.slice(0, auditExitMarker));
const totalSteps = plan.tasks.reduce((total, task) => total + task.implementationSteps.length, 0);
const dependencyIds = plan.tasks.flatMap(task => task.dependsOn);
const nextStep = tracker.next[0]?.nextStep;
if (tracker.verifiedSteps !== 139 || tracker.totalSteps !== 140 || tracker.blocked.length || tracker.stale.length !== 1 || tracker.stale[0] !== 'FE028' || tracker.next.length !== 1 || tracker.next[0].id !== 'FE028' || nextStep?.id !== 'S05') throw new Error('The final-review matrix must be built with only FE028.S05 remaining, no active blockers, and the expected FE028 evidence refresh.');
if (plan.scope !== 'FRONTEND_WITH_SYNTHETIC_MOCK_API' || plan.tasks.length !== 28 || totalSteps !== 140 || dependencyIds.length !== 50 || dependencyIds.some(id => !/^FE\d{3}$/.test(id))) throw new Error('Frontend plan graph or scope invariants failed.');
if (!verifyLog.includes('Tests  85 passed (85)') || !verifyLog.includes('Boundary fixtures: PASS 10/10') || !verifyLog.includes('✓ built in')) throw new Error('Current frontend verify evidence is incomplete.');
if (!securityLog.includes('npmAudit={"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}') || cleanAudit.metadata?.vulnerabilities?.total !== 0 || !cleanAuditText.includes('EXIT_CODE=0')) throw new Error('Current dependency audit is not clean.');
if (!/388 passed \(\d+(?:\.\d+)?m\)/.test(text(uatLogPath))) throw new Error('Current full Chromium/Firefox browser evidence is missing.');
if (uat.summary.routes !== 54 || uat.summary.features !== 64 || uat.summary.featureRouteInteractionRows !== 65 || uat.summary.primaryJourneys !== 22 || uat.summary.passingRouteRoleCases !== 357 || uat.summary.untestedApplicableStateCells !== 0) throw new Error('Current UAT matrix is incomplete.');
if (responsive.taskId !== 'FE025' || responsive.result !== 'PASS') throw new Error('Current FE025 responsive/performance review is incomplete.');
if (!/Narrator speech\/transcript was \*\*NOT_RUN\*\*/.test(a11y) || !/no broad human conformance review was performed/i.test(a11y)) throw new Error('Accessibility limits are not explicit.');
if (!/permissions:\r?\n  contents: read/.test(workflow) || !workflow.includes('npm ci') || !workflow.includes('npm run test:e2e')) throw new Error('Frontend CI workflow snapshot is incomplete.');
if (!artifactManifest.artifacts.find(item => item.directory === 'apps/web/dist' && !item.mswWorkerIncluded) || !artifactManifest.artifacts.find(item => item.directory === 'apps/web/dist-demo' && item.mswWorkerIncluded)) throw new Error('Production/demo mock isolation is not recorded.');
if (!coldLog.includes('status=PASS') || !coldLog.includes('lockSha256.original=') || !coldLog.includes('lockSha256.copy=') || !coldLog.includes('treeSha256')) throw new Error('Clean build/hash-reproduction evidence is incomplete.');

const evidence = Object.fromEntries(inputs.map(file => [file, { sha256: hash(read(file)) }]));
const gateRows = [
  { id: 'FE-G01', title: 'Môi trường tái lập', status: 'ĐẠT_TRONG_SCOPE', basis: 'Isolated clean npm ci, setup, verify and demo build exit 0; original/copy lock hashes match; clean production/demo output tree hashes match the current manifest.', evidence: [coldPath, artifactPath], limits: ['npm install logs retain esbuild/MSW allowScripts warnings; scripts are not auto-approved.'] },
  { id: 'FE-G02', title: 'Code và kiến trúc', status: 'ĐẠT', basis: 'Generator freshness 11/283/210/54; source 65/220/54; boundaries 430 imports, zero issue/cycle, negative fixtures 10/10; lint and strict typecheck pass.', evidence: [verifyPath], limits: ['Review is self-review with automated boundary evidence; no independent peer review is claimed.'] },
  { id: 'FE-G03', title: 'Contract và mocks', status: 'ĐẠT_TRONG_SCOPE', basis: 'Canonical schema/source checks, domain/MSW 88/88 and Vitest 85/85 pass; demo uses synthetic data.', evidence: [verifyPath, uatPath], limits: ['Does not establish a live API or backend transaction result.'] },
  { id: 'FE-G04', title: 'Phủ chức năng', status: 'ĐẠT_TRONG_SCOPE', basis: '54 route smoke, 64 features, 65 interactions, 22 journeys, role 357/357, empty 11/11, errors 51/51 and zero untested applicable state cells.', evidence: [uatPath, uatLogPath], limits: ['Permission claims apply to UI behavior under synthetic session/fixtures, not server authorization.'] },
  { id: 'FE-G05', title: 'UI/UX', status: 'CHƯA_ĐẠT_ĐẦY_ĐỦ', basis: 'Keyboard, axe, contrast, 400% zoom on 17 sampled routes, text-flow and target geometry have current browser evidence.', evidence: [a11yPath], limits: ['Narrator speech/transcript is NOT_RUN; broad human conformance review is not performed; full WCAG conformance is not claimed.'] },
  { id: 'FE-G06', title: 'An toàn Frontend', status: 'ĐẠT_TRONG_SCOPE', basis: 'npm audit reports zero vulnerabilities; current security browser cases pass; raw HTML sink scan is zero; unknown/conflict/retry behavior has browser tests.', evidence: [securityLog, securityAuditPath, uatLogPath], limits: ['Does not prove server-side authorization, tenant enforcement, or live PII handling.'] },
  { id: 'FE-G07', title: 'Hiệu năng Frontend', status: 'ĐẠT_VỚI_ADVISORY', basis: 'Current demo budgets and 1000-row paginated dataset pass on Chromium/Firefox; 54-route 320px reflow has zero overflow/error.', evidence: [responsivePath, uatPath], limits: ['Production largest chunk remains 738.39 kB raw with the Vite >500 kB advisory; local profile is not a device/CDN/backend SLO.'] },
  { id: 'FE-G08', title: 'Artifact', status: 'ĐẠT_LOCAL_EQUIVALENT', basis: 'Production/demo artifacts are isolated and hash-reproducible; built demo preview test runs in Chromium and Firefox; local clean checks satisfy the plan alternative.', evidence: [artifactPath, coldPath, workflowPath], limits: ['Workflow is configured and inspected; hosted GitHub Actions run is NOT_RUN. No deployment was made.'] },
  { id: 'FE-G09', title: 'UAT và bàn giao', status: 'CHỜ_NGHIỆM_THU_NGƯỜI_DÙNG', basis: 'Technical UAT, matrix, artifact hashes, limits, run instructions and handoff are complete and reviewable.', evidence: [uatPath, 'botsales-kit/execution/frontend-evidence/FE028/handoff.md'], limits: ['The user has not yet recorded final acceptance; no owner approval is self-recorded.'] },
];
const gateMatrix = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: plan.scope,
  sourceRevision: `HEAD ${execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()} plus current dirty working tree; artifacts and source snapshots are linked in their evidence records.`,
  plan: { id: plan.planId, tasks: plan.tasks.length, checkpoints: totalSteps, dependencies: dependencyIds.length, externalDependencies: 0 },
  tracker: { overallPercent: tracker.overallPercent, verifiedSteps: tracker.verifiedSteps, totalSteps: tracker.totalSteps, doneTasksBeforeFinalCheckpoint: plan.tasks.length - 1, blocked: tracker.blocked, stale: tracker.stale, next: tracker.next, snapshotMeaning: 'Captured immediately before FE028.S05 handoff checkpoint. FE028 is the only stale task because its old final-step snapshot is queued for replacement; this is not BLOCKED. Successful S05 evidence is expected to move the canonical tracker to 140/140.' },
  rubric: { passed: gateRows.filter(gate => gate.status.startsWith('ĐẠT')).length, total: gateRows.length, ratio: '7/9', claim: 'Evidence-gated readiness; not code or architecture percentage.' },
  gates: gateRows,
  productionClaimGate: {
    status: 'READY_FOR_ACCEPTANCE',
    approvedScopedStatement: 'Frontend đã kiểm chứng với API mock tổng hợp; đáp ứng các gate kiến trúc/chất lượng Frontend được liệt kê trên artifact/revision này.',
    prohibitedClaim: 'Không chứng nhận Backend, provider, persistence, server authorization, staging, production runtime, toàn sản phẩm hoặc 9/9 gate.',
    artifactManifest: artifactPath,
    evidenceIndex: evidence,
    userAcceptanceRecorded: false,
    hostedCiRunRecorded: false,
    deploymentRecorded: false,
  },
  definitionOfDone: { status: 'PASS_FOR_AI_ASSIGNED_SCOPE', criteria: ['Current-source tests and frontend verify passed.', 'Source/test/contract/artifact hashes are recorded.', 'Current-scope documents and handoff were reconciled.', 'Known warnings and NOT_RUN limits remain explicit.', 'Only frontend progress ledger was updated through its canonical script.'] },
};
const matrixBytes = Buffer.from(`${JSON.stringify(gateMatrix, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'quality-gate-matrix-current-20261004.json'), matrixBytes);

const architectureReview = `# FE028 — Architecture review — 04/10/2026\n\n**Scope:** \`${plan.scope}\`. Reviewer: Codex self-review; no independent peer review. Source boundary: React/TypeScript app at \`apps/web\`; synthetic API in demo/test; no backend runtime in this checkout.\n\n## Evidence-backed findings\n\n- The application composition remains one React app with one MUI theme/provider, one Router and one query cache; the plan and current package/source do not introduce a second frontend framework or microfrontend. There are 16 business modules and 54 canonical routes.\n- Module ownership is guarded by the current boundary checker: 430 import edges, zero unresolved/cycle/boundary issues, and 10/10 positive/negative boundary fixtures. Generated freshness and strict TypeScript/lint pass.\n- Canonical API schemas, route/permission catalogs and design tokens remain the integration source. Current generator check reports 283 schemas, 210 operations and 54 routes. Generated package files are not hand-edited.\n- UI code calls the shared transport; MSW is restricted to the selected demo/test mode. The production artifact excludes the MSW worker and mock fixtures; the demo artifact includes the worker and synthetic data. Live mode does not silently fall back to mock on API failure.\n- Route/feature/state/role coverage ties UI behavior to the current React implementation: 54 route smoke, 65 feature-route interaction rows, 22 journeys and 357 private-route role assertions. This is UI permission behavior and contract traceability, not server security proof.\n- Source and runtime quality gates pass: domain/MSW 88/88, Vitest 85/85 and Chromium/Firefox 388/388. The FE027 UAT matrix is linked to current source/contract/log hashes.\n\n## Residual architecture and quality limits\n\n- No numeric architecture-only score is defined by the project rubric; a standalone percentage would be invented. The measured gate rubric is 7/9.\n- Production bundle keeps Vite's >500 kB raw-chunk advisory (largest current chunk 738.39 kB raw / 186.88 kB gzip). Local preview transfer budgets pass; this evidence does not establish mobile/CDN or product SLOs.\n- npm audit is clean, while npm install still prints allowScripts notices for esbuild/MSW. The install/build/test path works; those scripts were not silently approved.\n- FE-G05 remains incomplete for Narrator speech/transcript and broad human conformance. FE-G09 awaits the user's final acceptance. Hosted CI, backend/provider, persistence, staging and production are not established here.\n\n**Conclusion:** architecture and runtime checks meet the documented Frontend-with-mock criteria for this source/artifact. Handoff is \`READY_FOR_ACCEPTANCE\`; do not certify the whole system as Production-Ready/Enterprise-Grade.\n`;
fs.writeFileSync(path.join(outDir, 'architecture-review-current-20261004.md'), architectureReview);
const log = [
  'FE028 current final gate/architecture review generated from plan, effective tracker and linked evidence.',
  `executedAt=${gateMatrix.generatedAt}`, `cwd=${repo}`,
  'command=node botsales-kit/execution/frontend-evidence/FE028/build-final-review-current-20261004.mjs',
  'exitCode=0', `planTasks=${plan.tasks.length}; checkpoints=${totalSteps}; dependencies=${dependencyIds.length}; externalDependencies=0`,
  `tracker=${tracker.verifiedSteps}/${tracker.totalSteps}; blocked=${tracker.blocked.length}; stale=${tracker.stale.length}; next=${tracker.next.length}:${tracker.next[0].id}.${nextStep.id}`,
  'gateStatus=7/9 PASS; FE-G05 PARTIAL/NOT_RUN; FE-G09 PENDING_USER_ACCEPTANCE; no gate is labeled BLOCKED',
  `qualityGateMatrixSha256=${hash(matrixBytes)}`,
  ...inputs.map(file => `EVIDENCE ${file} sha256=${evidence[file].sha256}`),
  'claim=READY_FOR_ACCEPTANCE; ownerAcceptance=false; hostedCI=NOT_RUN; deployment=false',
].join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'final-review-current-20261004.log'), log);
console.log(log);
