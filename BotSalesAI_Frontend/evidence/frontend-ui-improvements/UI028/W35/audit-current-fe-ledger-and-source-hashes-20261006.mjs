import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const ledgerPath = path.join(root, 'botsales-kit/execution/frontend-progress.json');
const planPath = path.join(root, 'botsales-kit/execution/frontend-plan.json');
const progressScript = path.join(root, 'botsales-kit/scripts/progress.mjs');
const outputPath = path.join(root, 'evidence/frontend-ui-improvements/UI028/W35/fe-evidence-dependency-audit-spc060-final-current-20261006.json');
const hashFile = absolute => createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const checkpoints = [];
const changedSources = new Map();
let missingEvidenceFiles = 0;
let evidenceHashMismatches = 0;
let invalidEvidence = 0;
let sourceReferences = 0;
let changedSourceReferences = 0;
let missingSourceReferences = 0;

for (const task of plan.tasks) {
  const taskRecord = ledger.tasks[task.id];
  for (const step of task.implementationSteps) {
    const checkpoint = taskRecord?.steps?.[step.id];
    const relativeEvidence = checkpoint?.evidence?.path;
    if (!relativeEvidence) {
      invalidEvidence += 1;
      checkpoints.push({ taskId: task.id, stepId: step.id, result: 'MISSING_LEDGER_POINTER' });
      continue;
    }
    const absoluteEvidence = path.join(root, 'botsales-kit', relativeEvidence);
    if (!fs.existsSync(absoluteEvidence)) {
      missingEvidenceFiles += 1;
      checkpoints.push({ taskId: task.id, stepId: step.id, evidence: relativeEvidence, result: 'MISSING_EVIDENCE' });
      continue;
    }
    const evidence = JSON.parse(fs.readFileSync(absoluteEvidence, 'utf8'));
    const evidenceHashMatches = hashFile(absoluteEvidence) === checkpoint.evidence.sha256;
    if (!evidenceHashMatches) evidenceHashMismatches += 1;
    if (evidence.taskId !== task.id || evidence.stepId !== step.id || evidence.result !== 'PASS' || checkpoint.status !== 'VERIFIED') invalidEvidence += 1;
    const mismatches = [];
    for (const source of evidence.sourceFiles ?? []) {
      sourceReferences += 1;
      const absoluteSource = path.resolve(root, source.path);
      if (!fs.existsSync(absoluteSource)) {
        missingSourceReferences += 1;
        changedSourceReferences += 1;
        mismatches.push({ path: source.path, result: 'MISSING_SOURCE' });
        changedSources.set(source.path, { path: source.path, reason: 'MISSING_SOURCE' });
        continue;
      }
      const currentSha256 = hashFile(absoluteSource);
      if (currentSha256 !== source.sha256) {
        changedSourceReferences += 1;
        mismatches.push({ path: source.path, result: 'HASH_MISMATCH', currentSha256 });
        changedSources.set(source.path, { path: source.path, reason: 'HASH_MISMATCH', currentSha256 });
      }
    }
    checkpoints.push({
      taskId: task.id,
      stepId: step.id,
      status: checkpoint.status,
      evidence: relativeEvidence,
      evidenceHashMatches,
      sourceReferences: (evidence.sourceFiles ?? []).length,
      changedSourceReferences: mismatches.length,
      result: mismatches.length === 0 && evidenceHashMatches ? 'CURRENT' : 'STALE',
      ...(mismatches.length ? { mismatches } : {}),
    });
  }
}

const trackerRun = spawnSync(process.execPath, [progressScript, 'status'], { cwd: root, encoding: 'utf8', windowsHide: true });
const tracker = trackerRun.status === 0 ? JSON.parse(trackerRun.stdout) : null;
const currentCheckpoints = checkpoints.filter(checkpoint => checkpoint.result === 'CURRENT').length;
const expected = plan.tasks.reduce((count, task) => count + task.implementationSteps.length, 0);
const pass = trackerRun.status === 0
  && tracker?.verifiedSteps === expected
  && tracker?.totalSteps === expected
  && tracker.stale.length === 0
  && tracker.blocked.length === 0
  && currentCheckpoints === expected
  && missingEvidenceFiles === 0
  && evidenceHashMismatches === 0
  && invalidEvidence === 0
  && changedSourceReferences === 0;
const record = {
  schemaVersion: 1,
  task: 'UI028.W35',
  recordType: 'canonical_fe_checkpoint_and_live_source_hash_audit',
  recordedAt: new Date().toISOString(),
  result: pass ? 'PASS' : 'REVALIDATION_REQUIRED',
  scope: 'Frontend-only; read-only audit of the evidence currently referenced by the canonical FE ledger and each evidence source hash',
  method: {
    command: 'node evidence/frontend-ui-improvements/UI028/W35/audit-current-fe-ledger-and-source-hashes-20261006.mjs',
    acceptance: 'The canonical FE status is 140/140 with no stale/blocked tasks; all 140 ledger evidence blobs match; evidence identities/results/statuses are valid; every recorded source reference exists and matches its current SHA-256.',
    trackerCommand: 'node botsales-kit/scripts/progress.mjs status',
  },
  tracker: tracker ? {
    verifiedSteps: tracker.verifiedSteps,
    totalSteps: tracker.totalSteps,
    overallPercent: tracker.overallPercent,
    stale: tracker.stale,
    blocked: tracker.blocked,
    next: tracker.next,
  } : { exitCode: trackerRun.status, stderr: trackerRun.stderr },
  audit: {
    expectedCheckpoints: expected,
    evidenceFilesChecked: checkpoints.length,
    currentCheckpoints,
    missingEvidenceFiles,
    evidenceHashMismatches,
    invalidEvidence,
    sourceReferences,
    changedSourceReferences,
    missingSourceReferences,
    uniqueChangedSources: changedSources.size,
  },
  changedSources: [...changedSources.values()],
  checkpoints,
  inputs: [ledgerPath, planPath, progressScript].map(absolute => ({
    path: path.relative(root, absolute).replaceAll(path.sep, '/'),
    sha256: hashFile(absolute),
  })),
  noProgressLedgerWrites: true,
};
fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: record.result, tracker: record.tracker, audit: record.audit, output: path.relative(root, outputPath) }, null, 2));
if (!pass) process.exitCode = 1;
