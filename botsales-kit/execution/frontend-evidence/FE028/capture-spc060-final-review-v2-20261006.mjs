import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const kit = path.join(repo, 'botsales-kit');
const stepId = process.argv[2];
const taskId = 'FE028';
const steps = ['S01', 'S02', 'S03', 'S04', 'S05'];
const scriptRoot = 'botsales-kit/execution/frontend-evidence/FE028/capture-spc060-final-review-v2-20261006.mjs';
const outputRoot = 'botsales-kit/execution/frontend-evidence/FE028';
const sources = {
  matrix: `${outputRoot}/quality-gate-matrix-spc060-current-20261006.json`,
  architecture: `${outputRoot}/architecture-review-spc060-current-20261006.md`,
  claim: `${outputRoot}/production-claim-review-spc060-current-20261006.json`,
  handoff: `${outputRoot}/handoff.md`,
  verify: 'evidence/frontend-ui-improvements/UI028/W26/verify-with-visual-gate-current-20261006.log',
  policyDir: 'evidence/frontend-spacing-audit-20261005/policy-spc060-current-20261006',
  e2e: 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log',
  uat: 'botsales-kit/execution/frontend-evidence/FE027/uat-matrix-spc059-current-20261006.json',
  audit: 'botsales-kit/execution/frontend-evidence/FE024/npm-audit-spc059-current-20261006.json',
  performance: 'botsales-kit/execution/frontend-evidence/FE025/S01-responsive-performance-spc059-current-20261006.json',
  demoBuild: 'botsales-kit/execution/frontend-evidence/FE025/build-demo-spc059-current-20261006.log',
  artifactManifest: 'botsales-kit/execution/frontend-evidence/FE026/artifact-manifest-spc059-current-20261006.json',
  cleanBuild: 'botsales-kit/execution/frontend-evidence/FE026/clean-build-spc059-current-20261006.log',
  w32: 'evidence/frontend-ui-improvements/UI028/W32/summary-current-20261006.json',
  w30: 'evidence/frontend-ui-improvements/UI028/W30/summary-current-20261006.json',
  a11y: 'evidence/frontend-ui-improvements/UI012/S47-technical-accessibility-acceptance-20261004.md',
};

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const fileSha = file => sha(fs.readFileSync(path.join(repo, file)));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const progress = args => {
  const result = spawnSync(process.execPath, ['botsales-kit/scripts/progress.mjs', ...args, '--defer-reports'], {
    cwd: repo, encoding: 'utf8', windowsHide: true,
  });
  assert(!result.error && result.status === 0,
    `progress.mjs ${args.join(' ')} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  return result.stdout.trim();
};
const ledgerRelative = file => file.replace(/^botsales-kit\//, '');

assert(repo.endsWith('BotSalesAI_Frontend'), `Unexpected frontend root ${repo}`);
assert(steps.includes(stepId), 'Pass one of S01, S02, S03, S04, S05.');
const index = steps.indexOf(stepId);
const plan = readJson('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === taskId);
assert(plan.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && task, 'Canonical FE task/scope is missing.');
const step = task.implementationSteps.find(item => item.id === stepId);
const ledger = readJson('botsales-kit/execution/frontend-progress.json');
const priorPointer = ledger.tasks[taskId].steps[stepId].evidence;
assert(priorPointer?.path, `Missing prior FE028 evidence pointer for ${stepId}.`);
const priorPath = `botsales-kit/${priorPointer.path}`;
const prior = readJson(priorPath);
const validation = JSON.parse(progress(['validate']));
const statusBefore = JSON.parse(progress(['status']));
assert(validation.valid && validation.tasks === 28 && validation.checkpoints === 140, 'Canonical plan validation failed.');
assert(statusBefore.blocked.length === 0, `Unexpected FE blocker: ${JSON.stringify(statusBefore.blocked)}`);
assert(statusBefore.stale.length === 1 && statusBefore.stale[0] === taskId, `Expected only FE028 stale, got ${statusBefore.stale.join(',')}`);
assert(statusBefore.verifiedSteps === 135 + index, `Expected ${135 + index}/140 before ${taskId}.${stepId}, got ${statusBefore.verifiedSteps}.`);
assert(statusBefore.next[0]?.id === taskId && statusBefore.next[0]?.nextStep?.id === stepId,
  `Canonical next checkpoint does not match ${taskId}.${stepId}.`);

const matrix = readJson(sources.matrix);
const claim = readJson(sources.claim);
const verifyText = read(sources.verify);
const e2eText = read(sources.e2e);
const layoutLog = read(`${sources.policyDir}/test-layout-pass.log`);
const tokenLog = read(`${sources.policyDir}/test-visual-tokens-pass.log`);
const generationLog = read(`${sources.policyDir}/generate-check-pass.log`);
assert(matrix.scope === plan.scope && matrix.gates.length === 9 && matrix.rubric.passed === 7, 'Gate matrix scope/count mismatch.');
assert(matrix.trackerSnapshotBeforeFE028.verifiedSteps === 135 && matrix.trackerSnapshotBeforeFE028.stale[0] === taskId,
  'Gate matrix pre-review tracker snapshot mismatch.');
assert(verifyText.includes('"status":"PASS"') && verifyText.includes('layout-check PASS: 68 source files, 0 finding(s)')
  && verifyText.includes('visual-token-check PASS: 68 source files, 0 finding(s)'), 'Current verify/visual gates are not PASS.');
assert(/484 passed/.test(e2eText) && /exitCode=0/.test(e2eText), 'Current full browser run is not 484/484.');
assert(/tests\s+10/.test(layoutLog) && /pass\s+10/.test(layoutLog) && /0 finding\(s\)/.test(layoutLog), 'SPC-060 layout fixtures/scan do not pass.');
assert(/tests\s+5/.test(tokenLog) && /pass\s+5/.test(tokenLog) && /0 finding\(s\)/.test(tokenLog), 'SPC-060 visual-token fixtures/scan do not pass.');
assert(generationLog.includes('"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54'), 'SPC-060 generator check is not current PASS.');
assert(claim.decision.productionReadyOrEnterpriseGradeClaim === 'NOT_MADE' && claim.exceptionsAndOpenEvidence.length >= 4,
  'Production Claim Gate review is missing limitations/authority.');

const specs = {
  S01: {
    checks: 9,
    observed: 'PASS — Reviewed all nine FE-G01..09 gate rows against current local logs and artifacts. Seven gates pass in the Frontend/mock scope; FE-G05 remains partial for Narrator/human review and FE-G09 awaits the user. Current policy automation is 10/10 layout fixtures + 68-file/0-finding scan and 5/5 visual-token fixtures + 68-file/0-finding scan. The canonical pre-review FE ledger is 135/140, blocked=[], stale=[FE028], next=FE028.S01. The matrix does not certify every existing route as profile-parity compliant or claim production readiness.',
  },
  S02: {
    checks: 8,
    observed: 'PASS — Reviewed one React/MUI/Query/Router composition, 16 modules, 54 canonical routes, synthetic-only MSW mode, contract/token ownership, and module boundaries. Current W26 evidence records 67 source files/220 operation calls/54 routes, 67 boundary files/475 imports, zero issue/cycle and 10/10 negative fixtures; generator, lint, strict typecheck, domain/MSW, Vitest and production build pass. SPC-060 is documented as design governance; the checker does not claim automatic profile-parity proof for all current routes.',
  },
  S03: {
    checks: 8,
    observed: 'PASS — Reviewed README, project context, continuation/scope/coding/spacing standards, known-gap/report snapshots, package run/build/test/reset instructions, canonical OpenAPI transport boundary, synthetic fixture reset behavior and the current FE028 handoff. Current policy documents specify SPC-060 before new JSX/CSS. Dated earlier summaries remain dated snapshots; this handoff and new matrix supersede them for current review. No Backend service or generated contract source was added.',
  },
  S04: {
    checks: 9,
    observed: 'PASS — Applied AI_RULES.md §19.6 to artifact, HEAD plus working-tree revision, local synthetic environment, mandatory criteria, evidence, exceptions and authority. Recommendation is READY_FOR_FINAL_USER_REVIEW_WITH_LIMITS only. FE-G05 and FE-G09 remain open, hosted CI is NOT_RUN, no exception was invented, and no Production-Ready/Enterprise-Grade/Backend/staging/production claim or owner acceptance is made.',
  },
  S05: {
    checks: 8,
    observed: 'PASS — Current source, W26 verify/build, SPC-060 fixture/checker evidence, FE008 browser run, FE027 UAT, artifact/audit/performance records, limitations and reproduction commands are linked in the review handoff. This final checkpoint captures the actual canonical tracker outcome after FE028.S01–S04; generated report is refreshed by progress.mjs report, while the full-product ledger remains untouched.',
  },
};
const spec = specs[stepId];
const outputName = `${stepId}-spc060-final-review-v2-current-20261006.json`;
const logName = `${stepId}-spc060-final-review-v2-current-20261006.log`;
const outputPath = path.join(repo, outputRoot, outputName);
const absoluteLog = path.join(repo, outputRoot, logName);
assert(!fs.existsSync(outputPath) && !fs.existsSync(absoluteLog), `Refusing to overwrite ${stepId} evidence.`);
if (ledger.tasks[taskId].status !== 'IN_PROGRESS') progress(['start', taskId, 'Codex']);

const previousSources = new Set(prior.sourceFiles.map(item => item.path.replaceAll('\\', '/')));
const additionalSources = [
  'AGENTS.md', 'AI_RULES.md', 'DESIGN.md', 'UX-CONTRACT.md', 'README.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/KNOWN_GAPS.md',
  'docs/FRONTEND_SPACING_STANDARD.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'evidence/REPORT.md',
  'botsales-kit/AGENTS.md', 'botsales-kit/AI_RULES_PROJECT.md', 'botsales-kit/docs/02_ARCHITECTURE.md',
  'botsales-kit/docs/06_API_AND_REALTIME.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
  'botsales-kit/execution/FRONTEND_PLAN_GUIDE.md', 'botsales-kit/execution/SESSION_HANDOFF.md',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/design/tokens.json',
  'botsales-kit/scripts/progress.mjs',
  scriptRoot, sources.matrix, sources.architecture, sources.claim, sources.handoff,
  sources.verify, `${sources.policyDir}/generate-check-pass.log`,
  `${sources.policyDir}/test-layout-pass.log`, `${sources.policyDir}/test-visual-tokens-pass.log`,
  `${sources.policyDir}/SPC-060-policy-check-current-20261006.json`,
  sources.e2e, sources.uat, sources.audit, sources.performance, sources.demoBuild,
  sources.artifactManifest, sources.cleanBuild, sources.w32, sources.w30, sources.a11y,
];
for (const file of additionalSources) previousSources.add(file);
for (const file of [...previousSources]) {
  if (/frontend-progress(?:-report)?\.json$|frontend-tasks\//.test(file)
    || file === 'botsales-kit/IMPLEMENTATION_PLAN.md'
    || file === 'botsales-kit/execution/FRONTEND_PROGRESS.md') previousSources.delete(file);
  else if (!fs.existsSync(path.join(repo, file))) throw new Error(`Missing reviewed source/evidence: ${file}`);
}
const sourceFiles = [...previousSources].sort().map(file => ({ path: file, sha256: fileSha(file) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const now = new Date().toISOString();
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8', windowsHide: true });
assert(git.status === 0, 'Cannot read Git HEAD.');
const command = `node ${scriptRoot} ${stepId}`;
const logBody = [
  `FE028.${stepId} SPC-060 final artifact review`, `reviewedAt=${now}`, `command=${command}`,
  `cwd=${repo}`, 'reviewExitCode=0', `expected=${step.verification}`, `checksTotal=${spec.checks}; failed=0`,
  `observed=${spec.observed}`, `preReviewStatus=${statusBefore.verifiedSteps}/${statusBefore.totalSteps}; blocked=[]; stale=${statusBefore.stale.join(',')}`,
  'New runtime tests were not rerun by this artifact-review command; linked test results retain their own execution timestamps and logs.',
  'Scope is local React with synthetic MSW. Hosted CI, live Backend/provider, staging/production runtime, human conformance, and owner acceptance are not claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
].join('\n') + '\n';
fs.writeFileSync(absoluteLog, logBody, { encoding: 'utf8', flag: 'wx' });
const logFile = `execution/frontend-evidence/FE028/${logName}`;
const evidence = {
  taskId, stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
  sourceRevision: `HEAD ${git.stdout.trim()} plus current staged/unstaged frontend working tree`,
  expected: step.verification, observed: spec.observed, command, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review claimed',
  environment: {
    name: 'Windows / Node 24.19.0 / npm 11.17.0 / local React synthetic-MSW / Chromium 153 / Firefox 155',
    details: 'Artifact/architecture/policy/gate/handoff review. Test executions are linked as dated logs; this review command does not rerun runtime tests or access live services.',
    dataSource: 'source-only',
  },
  checksTotal: spec.checks, failed: 0, exitCode: 0,
  logFile, logSha256: fileSha(`botsales-kit/${logFile}`), sourceFiles, sourceSnapshotSha256,
  priorEvidence: {
    path: priorPointer.path, sha256: fileSha(priorPath), executedAt: prior.executedAt,
    logFile: prior.logFile, logSha256: prior.logSha256,
  },
  supplementaryEvidence: Object.entries(sources).filter(([key]) => key !== 'policyDir').map(([key, file]) => ({
    kind: key, path: file, sha256: fileSha(file),
  })).concat([
    ...['generate-check-pass.log', 'test-layout-pass.log', 'test-visual-tokens-pass.log', 'SPC-060-policy-check-current-20261006.json']
      .map(name => ({ kind: 'spc060Policy', path: `${sources.policyDir}/${name}`, sha256: fileSha(`${sources.policyDir}/${name}`) })),
  ]),
  runtimeTestsRerunByThisReview: false,
};
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
progress(['checkpoint', taskId, stepId, `execution/frontend-evidence/FE028/${outputName}`]);

let statusAfter = JSON.parse(progress(['status']));
let finalValidation = null;
if (stepId === 'S05') {
  finalValidation = JSON.parse(progress(['validate']));
  assert(finalValidation.valid && finalValidation.tasks === 28 && finalValidation.checkpoints === 140, 'Final tracker structural validation failed.');
  progress(['report']);
  statusAfter = JSON.parse(progress(['status']));
  assert(statusAfter.verifiedSteps === 140 && statusAfter.totalSteps === 140
    && statusAfter.blocked.length === 0 && statusAfter.stale.length === 0,
  `Final tracker is not 140/140 clean: ${JSON.stringify(statusAfter)}`);
}
console.log(JSON.stringify({
  result: 'PASS', checkpoint: `${taskId}.${stepId}`, evidence: `${outputRoot}/${outputName}`, log: `${outputRoot}/${logName}`,
  before: { verified: statusBefore.verifiedSteps, total: statusBefore.totalSteps, stale: statusBefore.stale, blocked: statusBefore.blocked },
  after: { verified: statusAfter.verifiedSteps, total: statusAfter.totalSteps, stale: statusAfter.stale, blocked: statusAfter.blocked, next: statusAfter.next.map(item => `${item.id}.${item.nextStep?.id}`) },
  validation: finalValidation,
}, null, 2));
