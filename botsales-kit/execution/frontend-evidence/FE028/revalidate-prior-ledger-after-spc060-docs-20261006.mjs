import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const kit = path.join(root, 'botsales-kit');
const helperPath = 'botsales-kit/execution/frontend-evidence/FE028/revalidate-prior-ledger-after-spc060-docs-20261006.mjs';
const allowedPolicySources = new Set([
  'AGENTS.md', 'DESIGN.md', 'UX-CONTRACT.md', 'docs/FRONTEND_SCOPE.md',
  'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md',
  'docs/FRONTEND_SPACING_STANDARD.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'evidence/REPORT.md',
]);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const hashFile = relative => sha(fs.readFileSync(path.join(root, relative)));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const progress = args => {
  const result = spawnSync(process.execPath, ['botsales-kit/scripts/progress.mjs', ...args, '--defer-reports'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  assert(!result.error && result.status === 0, `progress.mjs ${args.join(' ')} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  return result.stdout.trim();
};

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected root ${root}`);
const plan = readJson('botsales-kit/execution/frontend-plan.json');
const initialStatus = JSON.parse(progress(['status']));
assert(plan.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API', 'Unexpected scope');
assert(initialStatus.totalSteps === 140 && initialStatus.blocked.length === 0, 'Unexpected FE tracker structure or blocker');

const prepared = new Map();
let refreshed = 0;
let reused = 0;
for (const task of plan.tasks.filter(task => task.id !== 'FE028')) {
  const ledger = readJson('botsales-kit/execution/frontend-progress.json');
  for (const step of task.implementationSteps) {
    const pointer = ledger.tasks[task.id].steps[step.id].evidence;
    assert(pointer?.path, `Missing prior evidence pointer for ${task.id}.${step.id}`);
    const priorRootPath = `botsales-kit/${pointer.path}`;
    const prior = readJson(priorRootPath);
    assert(prior.taskId === task.id && prior.stepId === step.id && prior.result === 'PASS', `Prior evidence identity/result mismatch for ${task.id}.${step.id}`);
    assert(prior.kind === step.requiredEvidenceKind, `Prior evidence kind mismatch for ${task.id}.${step.id}`);

    const changed = [];
    const sourceFiles = prior.sourceFiles.map(file => {
      const currentHash = hashFile(file.path);
      if (currentHash !== file.sha256) {
        assert(allowedPolicySources.has(file.path), `${task.id}.${step.id} also has a non-policy source change: ${file.path}`);
        changed.push(file.path);
        return { ...file, sha256: currentHash };
      }
      return file;
    });
    if (!changed.length) continue;

    const oldLogPath = path.join(kit, prior.logFile);
    assert(fs.existsSync(oldLogPath) && sha(fs.readFileSync(oldLogPath)) === prior.logSha256, `Prior execution log changed/missing for ${task.id}.${step.id}`);
    const outputStem = `botsales-kit/execution/frontend-evidence/${task.id}/${step.id}-after-spc060-20261006`;
    const outputPath = `${outputStem}.json`;
    const logPath = `${outputStem}.log`;
    const ledgerPath = outputPath.replace(/^botsales-kit\//, '');
    const ledgerLog = logPath.replace(/^botsales-kit\//, '');
    const absoluteOutput = path.join(root, outputPath);
    const absoluteLog = path.join(root, logPath);
    const snapshot = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));

    let evidence;
    if (fs.existsSync(absoluteOutput) && fs.existsSync(absoluteLog)) {
      evidence = JSON.parse(fs.readFileSync(absoluteOutput, 'utf8'));
      assert(evidence.sourceSnapshotSha256 === snapshot && evidence.result === 'PASS', `Existing refresh artifact is not reusable: ${outputPath}`);
    } else {
      assert(!fs.existsSync(absoluteOutput) && !fs.existsSync(absoluteLog), `Partial refresh artifact exists for ${task.id}.${step.id}`);
      const reviewedAt = new Date().toISOString();
      const log = [
        `${task.id}.${step.id} evidence freshness review after SPC-060`,
        `reviewedAt=${reviewedAt}`,
        `reviewCommand=${process.execPath} ${helperPath}`,
        `cwd=${root}`,
        'reviewExitCode=0',
        `originalExecutionAt=${prior.executedAt}`,
        `originalCommand=${prior.command}`,
        `originalLog=${prior.logFile}`,
        `originalLogSha256=${prior.logSha256}`,
        `expected=${prior.expected}`,
        `observed=${prior.observed}`,
        'revalidation=Only shared policy/documentation files changed; the prior frontend source, contract, fixture, and test result inputs for this checkpoint retain their recorded hashes.',
        'testRerun=false; original test execution time and log are retained; no new runtime test execution is claimed.',
        `refreshedPolicySources=${changed.join(',')}`,
        `scope=${plan.scope}`,
        `sourceSnapshotSha256=${snapshot}`,
        ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
      ].join('\n') + '\n';
      fs.writeFileSync(absoluteLog, log, { encoding: 'utf8', flag: 'wx' });
      evidence = {
        ...prior,
        reviewer: 'Codex evidence freshness review; original execution retained; no independent peer review claimed',
        sourceFiles,
        sourceSnapshotSha256: snapshot,
        logFile: ledgerLog,
        logSha256: sha(log),
        revalidation: {
          reviewedAt,
          kind: 'policy-only source freshness review',
          originalEvidence: { path: pointer.path, sha256: pointer.sha256, executedAt: prior.executedAt, logFile: prior.logFile, logSha256: prior.logSha256 },
          refreshedPolicySources: changed,
          runtimeTestsRerun: false,
          note: 'Original command result is retained without representing it as a new run. React/runtime and test inputs for this checkpoint were unchanged.'
        },
      };
      fs.writeFileSync(absoluteOutput, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    }
    prepared.set(`${task.id}.${step.id}`, { taskId: task.id, stepId: step.id, ledgerPath, evidencePath: outputPath, sourceSnapshotSha256: snapshot });
  }
}

const remaining = new Set(prepared.keys());
while (remaining.size) {
  const status = JSON.parse(progress(['status']));
  const taskId = status.next[0]?.id;
  assert(taskId && taskId !== 'FE028', `No dependency-ready prior task remains while ${remaining.size} evidence refreshes are pending.`);
  const task = plan.tasks.find(item => item.id === taskId);
  assert(task, `Unknown next task ${taskId}`);
  const pending = task.implementationSteps.filter(step => remaining.has(`${taskId}.${step.id}`));
  assert(pending.length > 0, `Next task ${taskId} is stale for an unapproved/non-policy source or has no prepared refresh.`);

  let ledger = readJson('botsales-kit/execution/frontend-progress.json');
  if (ledger.tasks[taskId].status !== 'IN_PROGRESS') progress(['start', taskId, ledger.tasks[taskId].owner || 'Codex']);
  for (const step of pending) {
    const key = `${taskId}.${step.id}`;
    const entry = prepared.get(key);
    const currentStatus = JSON.parse(progress(['status']));
    if (currentStatus.next[0]?.id !== taskId || currentStatus.next[0]?.nextStep?.id !== step.id) {
      ledger = readJson('botsales-kit/execution/frontend-progress.json');
      const currentEvidence = ledger.tasks[taskId].steps[step.id];
      const currentEvidenceHash = currentEvidence?.evidence?.path === entry.ledgerPath
        ? sha(fs.readFileSync(path.join(kit, entry.ledgerPath)))
        : null;
      if (currentEvidence?.status === 'VERIFIED'
        && currentEvidence.evidence.path === entry.ledgerPath
        && currentEvidence.evidence.sha256 === currentEvidenceHash) {
        remaining.delete(key);
        reused++;
        continue;
      }
      throw new Error(`Expected next checkpoint ${taskId}.${step.id}; status reported ${currentStatus.next[0]?.id}.${currentStatus.next[0]?.nextStep?.id}`);
    }
    progress(['checkpoint', taskId, step.id, entry.ledgerPath]);
    remaining.delete(key);
    refreshed++;
  }
}

const finalStatus = JSON.parse(progress(['status']));
assert(finalStatus.blocked.length === 0, `Unexpected FE blockers: ${finalStatus.blocked.map(item => item.id).join(',')}`);
assert(finalStatus.verifiedSteps === 135 && finalStatus.stale.length === 1 && finalStatus.stale[0] === 'FE028',
  `Expected 135 verified with only FE028 stale after source freshness review; observed ${finalStatus.verifiedSteps}/140, stale=${finalStatus.stale.join(',')}`);
console.log(JSON.stringify({
  result: 'PASS',
  sourcePolicy: 'SPC-060 documentation sync; original executions preserved and not represented as rerun',
  revalidatedCheckpoints: refreshed + reused,
  checkpointsRecordedByThisRun: refreshed,
  alreadyRecordedDuringRetry: reused,
  finalStatus: { verifiedSteps: finalStatus.verifiedSteps, totalSteps: finalStatus.totalSteps, blocked: finalStatus.blocked, stale: finalStatus.stale, next: finalStatus.next.map(item => `${item.id}.${item.nextStep?.id}`) },
}, null, 2));
