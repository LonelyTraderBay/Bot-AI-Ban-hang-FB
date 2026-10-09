import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const kitRoot = path.join(repoRoot, 'botsales-kit');
const planFile = path.join(kitRoot, 'execution/frontend-plan.json');
const progressFile = path.join(kitRoot, 'execution/frontend-progress.json');
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const ledger = () => JSON.parse(fs.readFileSync(progressFile, 'utf8'));
const frontendRoot = path.resolve(kitRoot, ledger().sourceRootRelative);
const approvedDocSources = new Set([
  'README.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/CONTINUE_FRONTEND.md',
  'docs/KNOWN_GAPS.md',
  'evidence/REPORT.md',
]);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const filePath = relative => relative.startsWith('botsales-kit/')
  ? path.join(repoRoot, relative)
  : path.join(frontendRoot, relative);
const currentHash = relative => sha(fs.readFileSync(filePath(relative)));
const readKitJson = relative => JSON.parse(fs.readFileSync(path.join(kitRoot, relative), 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const progress = args => {
  const run = spawnSync(process.execPath, [path.join(kitRoot, 'scripts/progress.mjs'), ...args, '--defer-reports'], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  assert(!run.error && run.status === 0, `progress.mjs ${args.join(' ')} failed: ${run.error?.message ?? run.stderr ?? run.stdout}`);
  return run.stdout.trim();
};
const sourceSnapshot = files => sha(Buffer.from(files.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));

assert(plan.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API', 'Unexpected FE evidence scope.');
assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Unexpected source root ${frontendRoot}`);

let refreshedDocReceipts = 0;
let reusedCurrentReceipts = 0;
let checkpointedFE026 = 0;
let iterations = 0;
while (iterations++ < 220) {
  const status = JSON.parse(progress(['status']));
  const next = status.next[0];
  if (!next) {
    const current = ledger();
    const priorTasksDone = Object.entries(current.tasks).every(([id, task]) => id === 'FE028' || task.status === 'DONE');
    if (current.tasks.FE028.status === 'BLOCKED' && priorTasksDone) {
      progress(['resume', 'FE028']);
      continue;
    }
    throw new Error('Tracker returned no next checkpoint while prior tasks were not all complete.');
  }
  if (next.id === 'FE028') break;

  const taskId = next.id;
  const stepId = next.nextStep?.id;
  const task = plan.tasks.find(item => item.id === taskId);
  const step = task?.implementationSteps.find(item => item.id === stepId);
  assert(task && step, `Unknown current checkpoint ${taskId}.${stepId}`);
  const currentLedger = ledger();
  const pointer = currentLedger.tasks[taskId]?.steps[stepId]?.evidence;
  assert(pointer?.path, `Missing original evidence pointer for ${taskId}.${stepId}`);

  let evidencePath;
  if (taskId === 'FE026') {
    evidencePath = `execution/frontend-evidence/FE026/${stepId}-current-artifacts-20261008.json`;
    const evidence = readKitJson(evidencePath);
    assert(evidence.taskId === taskId && evidence.stepId === stepId && evidence.result === 'PASS', `FE026 capture missing for ${stepId}`);
    assert(evidence.kind === step.requiredEvidenceKind, `FE026 kind mismatch for ${stepId}`);
    assert(evidence.sourceFiles.every(file => currentHash(file.path) === file.sha256), `FE026 source fingerprint is stale for ${stepId}`);
    assert(sha(fs.readFileSync(path.join(kitRoot, evidence.logFile))) === evidence.logSha256, `FE026 capture log mismatch for ${stepId}`);
  } else {
    const priorBytes = fs.readFileSync(path.join(kitRoot, pointer.path));
    assert(sha(priorBytes) === pointer.sha256, `Original receipt hash mismatch for ${taskId}.${stepId}`);
    const prior = JSON.parse(priorBytes.toString('utf8'));
    assert(prior.taskId === taskId && prior.stepId === stepId && prior.result === 'PASS', `Original evidence identity/result mismatch for ${taskId}.${stepId}`);
    assert(prior.kind === step.requiredEvidenceKind, `Original evidence kind mismatch for ${taskId}.${stepId}`);

    const changed = [];
    const sourceFiles = prior.sourceFiles.map(file => {
      const current = currentHash(file.path);
      if (current !== file.sha256) {
        assert(approvedDocSources.has(file.path), `${taskId}.${stepId} has a non-approved source change: ${file.path}`);
        changed.push(file.path);
        return { ...file, sha256: current };
      }
      return file;
    });
    const originalLog = path.join(kitRoot, prior.logFile);
    assert(fs.existsSync(originalLog) && sha(fs.readFileSync(originalLog)) === prior.logSha256, `Original test/review log changed for ${taskId}.${stepId}`);

    const snapshot = sourceSnapshot(sourceFiles);
    if (changed.length === 0) {
      assert(prior.sourceSnapshotSha256 === snapshot, `Unchanged-source receipt has a mismatched source snapshot for ${taskId}.${stepId}`);
      evidencePath = pointer.path;
      reusedCurrentReceipts++;
    } else {
      const stem = `${stepId}-docs-refresh-v3-current-20261008`;
      const ledgerPath = `execution/frontend-evidence/${taskId}/${stem}.json`;
      const ledgerLog = `execution/frontend-evidence/${taskId}/${stem}.log`;
      const absoluteEvidence = path.join(kitRoot, ledgerPath);
      const absoluteLog = path.join(kitRoot, ledgerLog);
      if (fs.existsSync(absoluteEvidence) || fs.existsSync(absoluteLog)) {
        assert(fs.existsSync(absoluteEvidence) && fs.existsSync(absoluteLog), `Partial freshness receipt exists for ${taskId}.${stepId}`);
        evidencePath = ledgerPath;
        const existing = readKitJson(evidencePath);
        assert(existing.sourceSnapshotSha256 === snapshot && existing.result === 'PASS', `Existing freshness receipt is stale: ${ledgerPath}`);
        assert(existing.revalidation?.originalEvidence?.sha256 === pointer.sha256, `Existing freshness receipt has a different parent: ${ledgerPath}`);
        assert(sha(fs.readFileSync(absoluteLog)) === existing.logSha256, `Existing freshness log hash mismatch: ${ledgerLog}`);
      } else {
        const reviewedAt = new Date().toISOString();
        const logText = [
          `${taskId}.${stepId} documentation-only source freshness review`,
          `reviewedAt=${reviewedAt}`,
          `reviewCommand=node botsales-kit/execution/frontend-evidence/FE028/refresh-doc-only-receipts-current-20261008.mjs (documentation snapshot v3)`,
          `cwd=${repoRoot}`,
          'reviewExitCode=0',
          `originalEvidence=${pointer.path}`,
          `originalEvidenceSha256=${pointer.sha256}`,
          `originalExecutionAt=${prior.executedAt}`,
          `originalCommand=${prior.command}`,
          `originalLog=${prior.logFile}`,
          `originalLogSha256=${prior.logSha256}`,
          `changedDocumentationSources=${changed.join(',')}`,
          'runtimeTestsRerun=false; original execution result and log are preserved. Only approved documentation/source hashes were refreshed.',
          `scope=${plan.scope}`,
          `sourceSnapshotSha256=${snapshot}`,
          ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
        ].join('\n') + '\n';
        const evidence = {
          ...prior,
          reviewer: 'Codex documentation-only evidence freshness review; original run retained; no independent peer review claimed',
          sourceRevision: `${prior.sourceRevision}; documentation-only source fingerprints refreshed on 2026-10-08; original command was not rerun by this review.`,
          sourceFiles,
          sourceSnapshotSha256: snapshot,
          logFile: ledgerLog,
          logSha256: sha(Buffer.from(logText)),
          revalidation: {
            reviewedAt,
            kind: 'documentation-only source freshness review',
            originalEvidence: { path: pointer.path, sha256: pointer.sha256, executedAt: prior.executedAt, logFile: prior.logFile, logSha256: prior.logSha256 },
            changedDocumentationSources: changed,
            runtimeTestsRerun: false,
            note: 'No product source, test, contract, configuration, generated output, or command-map input changed in this refresh. Original execution logs remain preserved and are not represented as rerun.',
          },
        };
        fs.writeFileSync(absoluteLog, logText, { encoding: 'utf8', flag: 'wx' });
        fs.writeFileSync(absoluteEvidence, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
        evidencePath = ledgerPath;
      }
      refreshedDocReceipts++;
    }
  }

  const currentTask = ledger().tasks[taskId];
  if (currentTask.status !== 'IN_PROGRESS') progress(['start', taskId, currentTask.owner || 'Codex']);
  progress(['checkpoint', taskId, stepId, evidencePath]);
  if (taskId === 'FE026') checkpointedFE026++;
}

assert(iterations <= 220, 'Exceeded bounded prior-evidence freshness review loop.');
if (ledger().tasks.FE028.status === 'BLOCKED') progress(['resume', 'FE028']);
const finalStatus = JSON.parse(progress(['status']));
assert(finalStatus.blocked.length === 0, `Unexpected blocked tasks: ${finalStatus.blocked.map(item => item.id).join(',')}`);
assert(finalStatus.verifiedSteps === 135 && finalStatus.stale.length === 1 && finalStatus.stale[0] === 'FE028',
  `Expected FE028 alone stale after refresh; got ${finalStatus.verifiedSteps}/${finalStatus.totalSteps}, stale=${finalStatus.stale.join(',')}`);
console.log(JSON.stringify({
  result: 'PASS',
  docsOnlyReceiptRefreshes: refreshedDocReceipts,
  unchangedCurrentReceiptsReused: reusedCurrentReceipts,
  FE026CurrentCaptureCheckpoints: checkpointedFE026,
  finalStatus: {
    verifiedSteps: finalStatus.verifiedSteps,
    totalSteps: finalStatus.totalSteps,
    blocked: finalStatus.blocked,
    stale: finalStatus.stale,
    next: finalStatus.next.map(item => `${item.id}.${item.nextStep?.id}`),
  },
}, null, 2));
