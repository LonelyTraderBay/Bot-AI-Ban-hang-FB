import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const ledgerPath = path.join(root, 'botsales-kit/execution/frontend-progress.json');
const planPath = path.join(root, 'botsales-kit/execution/frontend-plan.json');
const outputPath = path.join(root, 'evidence/frontend-ui-improvements/UI028/W35/fe-evidence-dependency-audit-post-doc-sync-current-20261006.json');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const evidenceRecords = [];
const changedSources = new Map();
let missingEvidenceFiles = 0;
let changedEvidenceSourceReferences = 0;
let missingSourceReferences = 0;

for (const [taskId, task] of Object.entries(ledger.tasks)) {
    for (const [stepId, step] of Object.entries(task.steps ?? {})) {
        if (!step.evidence?.path) continue;
        const evidencePath = path.join(root, 'botsales-kit', step.evidence.path);
        if (!fs.existsSync(evidencePath)) {
            missingEvidenceFiles += 1;
            evidenceRecords.push({ taskId, stepId, evidence: step.evidence.path, result: 'MISSING_EVIDENCE' });
            continue;
        }
        const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
        let checkpointStale = false;
        const sourceResults = [];
        for (const source of evidence.sourceFiles ?? []) {
            const sourcePath = path.resolve(root, source.path);
            if (!fs.existsSync(sourcePath)) {
                checkpointStale = true;
                missingSourceReferences += 1;
                changedEvidenceSourceReferences += 1;
                const prior = changedSources.get(source.path) ?? { path: source.path, currentSha256: null, evidenceReferences: 0, taskIds: new Set(), reason: 'MISSING_SOURCE' };
                prior.evidenceReferences += 1;
                prior.taskIds.add(taskId);
                changedSources.set(source.path, prior);
                sourceResults.push({ path: source.path, result: 'MISSING_SOURCE' });
                continue;
            }
            const currentSha256 = hash(sourcePath);
            const same = currentSha256 === source.sha256;
            sourceResults.push({ path: source.path, result: same ? 'MATCH' : 'HASH_MISMATCH', currentSha256 });
            if (!same) {
                checkpointStale = true;
                changedEvidenceSourceReferences += 1;
                const prior = changedSources.get(source.path) ?? { path: source.path, currentSha256, evidenceReferences: 0, taskIds: new Set(), reason: 'HASH_MISMATCH' };
                prior.evidenceReferences += 1;
                prior.taskIds.add(taskId);
                changedSources.set(source.path, prior);
            }
        }
        evidenceRecords.push({
            taskId,
            stepId,
            evidence: step.evidence.path,
            storedEvidenceStatus: step.status,
            evidenceBlobHashMatchesLedger: hash(evidencePath) === step.evidence.sha256,
            sourceReferences: sourceResults.length,
            stale: checkpointStale,
            sourceResults,
        });
    }
}

const statusResult = spawnSync(process.execPath, [path.join(root, 'botsales-kit/scripts/progress.mjs'), 'status'], {
    cwd: root,
    encoding: 'utf8',
});
let trackerStatus = null;
if (statusResult.status === 0) {
    try { trackerStatus = JSON.parse(statusResult.stdout); } catch { /* Preserve raw status below. */ }
}
const staleCheckpoints = evidenceRecords.filter(record => record.stale || record.result === 'MISSING_EVIDENCE').length;
const output = {
    schemaVersion: 1,
    task: 'UI028.W35',
    recordType: 'read_only_dependency_staleness_reaudit',
    recordedAt: new Date().toISOString(),
    result: 'INCOMPLETE_REVALIDATION_REQUIRED',
    scope: 'Read-only source-hash audit of canonical FE checkpoint evidence after W30 status/document updates; no acceptance, checkpoint, or progress ledger writes',
    method: {
        command: 'node evidence/frontend-ui-improvements/UI028/W35/audit-fe-evidence-dependencies-current-20261006.mjs',
        input: 'botsales-kit/execution/frontend-progress.json evidence references and each evidence JSON sourceFiles list',
        trackerCommand: 'node botsales-kit/scripts/progress.mjs status',
        trackerStatusExitCode: statusResult.status,
        allowedConclusion: 'Hash mismatch means the saved acceptance is stale for current inputs; only re-running its required acceptance can refresh it.',
    },
    tracker: {
        effectiveVerifiedSteps: trackerStatus?.verifiedSteps ?? null,
        totalSteps: trackerStatus?.totalSteps ?? null,
        staleTasks: trackerStatus?.stale?.length ?? null,
        blocked: trackerStatus?.blocked ?? null,
        next: trackerStatus?.next?.[0] ? `${trackerStatus.next[0].id}.${trackerStatus.next[0].nextStep?.id}` : null,
        progressOverallPercent: trackerStatus?.overallPercent ?? null,
        missingEvidenceFiles,
        evidenceFilesChecked: evidenceRecords.length,
        changedEvidenceSourceReferences,
        missingSourceReferences,
        uniqueChangedSources: changedSources.size,
        staleCheckpoints,
    },
    changedSources: [...changedSources.values()]
        .map(source => ({ ...source, taskIds: [...source.taskIds].sort() }))
        .sort((a, b) => b.evidenceReferences - a.evidenceReferences || a.path.localeCompare(b.path)),
    checkpointResults: evidenceRecords,
    inputs: [
        { path: 'botsales-kit/execution/frontend-plan.json', sha256: hash(planPath) },
        { path: 'botsales-kit/execution/frontend-progress.json', sha256: hash(ledgerPath) },
        { path: 'botsales-kit/scripts/progress.mjs', sha256: hash(path.join(root, 'botsales-kit/scripts/progress.mjs')) },
    ],
    noProgressLedgerWrites: true,
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: output.result, tracker: output.tracker, changedSources: output.changedSources.slice(0, 8).map(({ path: sourcePath, evidenceReferences, reason }) => ({ path: sourcePath, evidenceReferences, reason })), output: path.relative(root, outputPath) }, null, 2));
