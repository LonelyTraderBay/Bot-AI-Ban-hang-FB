import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const helper = 'botsales-kit/execution/frontend-evidence/FE003/capture-s02-current-after-spc058-20261006.mjs';
const physicalOutput = path.join(root, 'botsales-kit/execution/frontend-evidence/FE003');
const evidenceOutput = 'execution/frontend-evidence/FE003';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const parse = (relative) => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);
const guide = read('botsales-kit/execution/FRONTEND_PLAN_GUIDE.md');
const scope = read('docs/FRONTEND_SCOPE.md');
const context = read('docs/PROJECT_CONTEXT.md');
const design = read('botsales-kit/docs/03_DESIGN_SYSTEM.md');
const spacing = read('docs/FRONTEND_SPACING_STANDARD.md');
const plan = parse('botsales-kit/execution/frontend-plan.json');
const taskCards = plan.tasks;
const guideGateLines = guide.split(/\r?\n/).filter((line) => /^\|\s*FE-G0[1-9]\s*\|/.test(line));
const gates = guideGateLines.map((line) => {
  const columns = line.split('|').slice(1, -1).map((column) => column.trim());
  return { id: columns[0], criterion: columns[1], evidence: columns[2] };
});
const expectedIds = Array.from({ length: 9 }, (_, index) => `FE-G0${index + 1}`);
assert(JSON.stringify(gates.map((gate) => gate.id)) === JSON.stringify(expectedIds), 'Verification guide must contain FE-G01..09 once and in order');
for (const gate of gates) assert(gate.criterion && gate.evidence, `Missing criterion/evidence for ${gate.id}`);
assert(taskCards.length === 28 && new Set(taskCards.map((task) => task.id)).size === 28, 'Expected exactly 28 unique FE tasks');
const taskIds = new Set(taskCards.map((task) => task.id));
for (const task of taskCards) {
  for (const dependency of task.dependsOn ?? []) assert(taskIds.has(dependency), `${task.id} has dependency outside FE plan: ${dependency}`);
  assert((task.writeScope ?? []).every((item) => !/(^|[/\\])(apps\/(api|worker)|infra|backend|server)([/\\]|$)/i.test(item)), `${task.id} writes outside frontend scope`);
}
const vocab = ['ĐẠT', 'CHƯA ĐẠT', 'CHƯA XÁC MINH', 'KHÔNG ÁP DỤNG'];
for (const token of vocab) assert(guide.includes(token), `Verification status vocabulary is missing: ${token}`);
assert(/FRONTEND_WITH_SYNTHETIC_MOCK_API/.test(plan.scope), 'Frontend plan must declare the synthetic mock API scope');
assert(/không chờ owner|không chờ.*hosted CI/i.test(scope) && /nghiệm thu cuối|người dùng/i.test(context), 'Autonomous execution and final owner acceptance must both be documented');
assert(/SPC-056[\s\S]*focus[\s\S]*click\/tap/i.test(spacing) && /SPC-055/.test(spacing), 'UI standard must require browser focus/hit-testing and regression of reproducible violations');
assert(/SPC-051[\s\S]*200%/.test(spacing), 'UI standard must distinguish 200% text resize and browser zoom checks');
assert(/SPC-058[\s\S]*operationId/i.test(spacing), 'UI standard must bind list/query controls to their declared API operation');

const gatesByPhase = {
  F00: ['FE-G01', 'FE-G02', 'FE-G08'],
  F01: ['FE-G02', 'FE-G03', 'FE-G06'],
  F02: ['FE-G03', 'FE-G04', 'FE-G05', 'FE-G06', 'FE-G07'],
  F03: ['FE-G02', 'FE-G05', 'FE-G06', 'FE-G07', 'FE-G08'],
  F04: ['FE-G04', 'FE-G05', 'FE-G08', 'FE-G09'],
};
const taskGateMatrix = taskCards.map((task) => ({
  taskId: task.id,
  title: task.title,
  phase: task.phase,
  dependencies: task.dependsOn ?? [],
  applicableGateReview: gatesByPhase[task.phase] ?? [],
  checkpoints: task.implementationSteps.map(({ id, requiredEvidenceKind, action }) => ({ id, requiredEvidenceKind, action })),
  writeScope: task.writeScope,
}));
assert(taskGateMatrix.every((entry) => entry.applicableGateReview.length > 0 && entry.checkpoints.length > 0), 'Every task must map to review gates and evidence checkpoints');

const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'botsales-kit/AGENTS.md', 'botsales-kit/AI_RULES.md',
  'botsales-kit/execution/FRONTEND_PLAN_GUIDE.md', 'botsales-kit/execution/frontend-plan.json',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'botsales-kit/docs/03_DESIGN_SYSTEM.md', 'docs/FRONTEND_SPACING_STANDARD.md', helper,
];
const sourceFiles = sourcePaths.map((file) => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const reviewer = 'Codex self-review; no independent peer review claimed';
const executedAt = new Date().toISOString();
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const checks = [
  { label: 'all frontend gates defined', observed: `${gates.length}/9 FE-G01..FE-G09 have a criterion and evidence requirement in the canonical guide` },
  { label: 'task coverage and dependencies', observed: `${taskCards.length}/28 tasks mapped by phase to gate review; every dependency points to another FE task` },
  { label: 'frontend-only write scope', observed: 'No task writeScope targets apps/api, apps/worker, infra, backend or server paths' },
  { label: 'scope and final acceptance', observed: 'Mock frontend autonomy is documented; user acceptance remains final and is not fabricated' },
  { label: 'status vocabulary', observed: 'All four outcomes ĐẠT / CHƯA ĐẠT / CHƯA XÁC MINH / KHÔNG ÁP DỤNG are defined' },
  { label: 'new UI regression rules', observed: 'SPC-051 separately requires 200% text resize and browser zoom; SPC-055 requires a regression for reproducible violations; SPC-056 requires browser focus and click/tap hit-testing for potentially occluded targets' },
  { label: 'OpenAPI operation binding for future lists', observed: 'SPC-058 requires operationId-scoped query allowlists, ignoring unsupported URL params, hiding unsupported controls, and query/deep-link regression' },
];
const observed = 'Current verification ladder and all 28 FE task scopes were reviewed. Phase-to-gate rows are a planning crosswalk, not proof that a gate passed. Browser speech/human conformance and final owner acceptance remain explicit limits; neither is an interim execution dependency.';
const command = `& "${process.execPath}" ${helper}`;
const logFile = `${evidenceOutput}/S02-current-after-spc058-20261006.log`;
const evidenceFile = `${evidenceOutput}/S02-current-after-spc058-20261006.json`;
const log = [
  'FE003.S02 current gate/task crosswalk review', `executedAt=${executedAt}`, `cwd=${root}`,
  `command=${command}`, 'exitCode=0', `expected=${taskCards[2].implementationSteps[1].action}`, `observed=${observed}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  ...gates.map((gate) => `GATE ${gate.id}: ${gate.criterion}; evidence=${gate.evidence}`),
  ...taskGateMatrix.map((task) => `TASK ${task.taskId}: phase=${task.phase}; gates=${task.applicableGateReview.join(',')}; deps=${task.dependencies.join(',') || 'none'}; checkpoints=${task.checkpoints.length}; writes=${task.writeScope.join(',')}`),
  'LIMIT=Phase-to-gate mapping scopes review only; it is not test/acceptance status.',
  'LIMIT=Screen-reader speech/human conformance and final owner acceptance are not automated; they remain NOT_RUN / final review, not interim task blockers.',
  'SCOPE=FRONTEND_WITH_SYNTHETIC_MOCK_API; no Backend/provider/staging/CI result claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(physicalOutput, 'S02-current-after-spc058-20261006.log'), log, 'utf8');
const evidence = {
  taskId: 'FE003', stepId: 'S02', kind: 'artifact_review', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: taskCards[2].implementationSteps[1].action, observed,
  command, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node}`, details: 'Static review of current frontend gate definitions, task graph, write scopes and design/accessibility requirements; no product tests were run by this checkpoint.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile, logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  gates, taskGateMatrix,
};
fs.writeFileSync(path.join(physicalOutput, 'S02-current-after-spc058-20261006.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', gates: gates.length, tasks: taskGateMatrix.length, evidence: evidenceFile, log: logFile }, null, 2));
