import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const repoRoot = path.resolve(frontendRoot, '..');
const evidenceRoot = path.resolve(frontendRoot, 'evidence/frontend-ui-consistency-20261017/UIC11');
const sourceInventoryPath = path.resolve(frontendRoot, 'evidence/frontend-ui-consistency-20261017/UIC01/inventory.json');
const inventory = JSON.parse(fs.readFileSync(sourceInventoryPath, 'utf8'));
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const finalHead = git('rev-parse', process.argv[2] ?? 'HEAD');
const treeAt = (revision) => {
    const raw = execFileSync('git', ['ls-tree', '-r', '-z', revision], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
    const tree = new Map();
    for (const record of raw.toString('utf8').split('\0').filter(Boolean)) {
        const tab = record.indexOf('\t');
        const [mode, type, oid] = record.slice(0, tab).split(' ');
        if (type === 'blob') tree.set(record.slice(tab + 1), { mode, oid });
    }
    return tree;
};
const contentHashes = (objectIds) => {
    const ids = [...new Set(objectIds)];
    if (!ids.length) return new Map();
    const raw = execFileSync('git', ['cat-file', '--batch'], {
        cwd: repoRoot,
        input: `${ids.join('\n')}\n`,
        maxBuffer: 512 * 1024 * 1024,
    });
    const hashes = new Map();
    let offset = 0;
    for (const requestedOid of ids) {
        const headerEnd = raw.indexOf(0x0a, offset);
        if (headerEnd < 0) throw new Error('git cat-file returned a truncated object header.');
        const [oid, type, sizeText] = raw.subarray(offset, headerEnd).toString('utf8').split(' ');
        const size = Number(sizeText);
        if (oid !== requestedOid || type !== 'blob' || !Number.isSafeInteger(size)) throw new Error(`Unexpected git cat-file response for ${requestedOid}.`);
        const contentStart = headerEnd + 1;
        const contentEnd = contentStart + size;
        if (raw[contentEnd] !== 0x0a) throw new Error(`Truncated git cat-file content for ${requestedOid}.`);
        hashes.set(oid, sha256(raw.subarray(contentStart, contentEnd)));
        offset = contentEnd + 1;
    }
    if (offset !== raw.length) throw new Error('git cat-file returned trailing unparsed bytes.');
    return hashes;
};

const baseline = inventory.repository.head;
const changesRaw = execFileSync('git', ['diff', '--name-status', '--find-renames', '-z', baseline, finalHead, '--'], { cwd: repoRoot, encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 }).toString('utf8');
const fields = changesRaw.split('\0').filter(Boolean);
const changes = [];
for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (status.startsWith('R') || status.startsWith('C')) {
        changes.push({ status, oldPath: fields[index++], path: fields[index++] });
    } else {
        changes.push({ status, path: fields[index++] });
    }
}
const commitLog = git('log', '--name-only', '--format=@@%H%x09%s', `${baseline}..${finalHead}`);
const latestCommitByPath = new Map();
let activeCommit = null;
for (const line of commitLog.split(/\r?\n/)) {
    if (line.startsWith('@@')) {
        const [sha, ...subject] = line.slice(2).split('\t');
        activeCommit = { sha, subject: subject.join('\t') };
    } else if (line && activeCommit && !latestCommitByPath.has(line)) {
        latestCommitByPath.set(line, activeCommit);
    }
}
const inventoryByPath = new Map(inventory.files.map((file) => [file.path, file]));
if (inventory.files.length !== 329 || inventory.files.some((file) => !file.treatment || !file.owner || !file.reason)) {
    throw new Error('UIC01 input inventory is missing a treatment, owner, reason, or expected file count.');
}

const baselineTree = treeAt(baseline);
const finalTree = treeAt(finalHead);
const objectIds = [
    ...inventory.files.map((file) => baselineTree.get(file.path)?.oid).filter(Boolean),
    ...inventory.files.map((file) => finalTree.get(file.path)?.oid).filter(Boolean),
    ...changes.map((change) => finalTree.get(change.path)?.oid).filter(Boolean),
];
const gitBlobHashes = contentHashes(objectIds);
const currentFiles = new Set(finalTree.keys());
const inputs = inventory.files.map((file) => {
    const existsAtFinal = currentFiles.has(file.path);
    const baselineGitHash = gitBlobHashes.get(baselineTree.get(file.path)?.oid);
    const finalHash = existsAtFinal ? gitBlobHashes.get(finalTree.get(file.path)?.oid) : null;
    if (!baselineGitHash) throw new Error(`Missing baseline Git blob for ${file.path}`);
    return {
        path: file.path,
        treatment: file.treatment,
        owner: file.owner,
        reason: file.reason,
        baselineInventorySha256: file.sha256,
        baselineGitSha256: baselineGitHash,
        baselineInventoryMatchesGit: baselineGitHash === file.sha256,
        finalSha256: finalHash,
        finalStatus: !existsAtFinal ? 'REMOVED' : finalHash === baselineGitHash ? 'UNCHANGED_FROM_BASELINE_HEAD' : 'CHANGED_FROM_BASELINE_HEAD',
    };
});

const overrides = new Map([
    ['BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md', { disposition: 'DOCUMENTATION_UPDATE', owner: 'UIC11', reason: 'UIC11 yêu cầu cập nhật đường tiếp tục theo trạng thái và SHA cuối; đây là ghi chú task được phép sửa, không phải nguồn runtime.' }],
    ['BotSalesAI_Frontend/playwright.config.ts', { disposition: 'TEST_OR_TOOLING', owner: 'UIC09', reason: 'Cấu hình Playwright được sửa để cố định nhận dạng browser/harness và ngăn evidence ghi đè; đã chạy verify và full browser suite tương ứng.' }],
    ['BotSalesAI_Frontend/playwright.built-demo.config.ts', { disposition: 'TEST_OR_TOOLING', owner: 'UIC10', reason: 'Cấu hình browser của built-demo thuộc harness kiểm thử; đã chạy built-demo Chromium và Firefox.' }],
]);
const classifyNewPath = (filePath) => {
    if (filePath.startsWith('BotSalesAI_Frontend/evidence/')) return 'NEW_EVIDENCE';
    if (filePath.startsWith('BotSalesAI_Frontend/docs/') || filePath === 'BotSalesAI_Frontend/README.md') return 'DOCUMENTATION';
    if (filePath.startsWith('BotSalesAI_Frontend/apps/web/src/')) return 'FRONTEND_SOURCE';
    if (filePath.startsWith('BotSalesAI_Frontend/tests/') || filePath.startsWith('BotSalesAI_Frontend/scripts/') || filePath.includes('playwright')) return 'TEST_OR_TOOLING';
    if (filePath.startsWith('botsales-kit/') || filePath.startsWith('.github/')) return 'CANONICAL_KIT_OR_WORKFLOW';
    return 'OTHER_TRACKED_CHANGE';
};

const changedFiles = changes.map((change) => {
    const oldEntry = change.oldPath ? inventoryByPath.get(change.oldPath) : undefined;
    const entry = inventoryByPath.get(change.path) ?? oldEntry;
    const override = overrides.get(change.path) ?? (change.oldPath ? overrides.get(change.oldPath) : undefined);
    const lastCommit = latestCommitByPath.get(change.path) ?? (change.oldPath ? latestCommitByPath.get(change.oldPath) : undefined);
    const present = change.status !== 'D' && currentFiles.has(change.path);
    const finalHash = present ? gitBlobHashes.get(finalTree.get(change.path)?.oid) : null;
    const taskMatch = `${change.path} ${change.oldPath ?? ''} ${lastCommit?.subject ?? ''}`.match(/(?:UIC|UI)\s*0?(\d{1,2})/i);
    const dispositionOwner = override?.owner ?? entry?.owner ?? (taskMatch ? `UIC${taskMatch[1].padStart(2, '0')}` : lastCommit ? `Commit ${lastCommit.sha.slice(0, 8)}` : 'No commit owner found');
    return {
        ...change,
        inventoryTreatment: entry?.treatment ?? null,
        disposition: override?.disposition ?? entry?.treatment ?? classifyNewPath(change.path),
        owner: dispositionOwner,
        reason: override?.reason ?? entry?.reason ?? `Phát sinh sau baseline UIC01; phân loại theo phạm vi path ${classifyNewPath(change.path)}.`,
        task: taskMatch ? `UIC${taskMatch[1]}` : null,
        lastCommit: lastCommit?.sha ?? null,
        commitSubject: lastCommit?.subject ?? null,
        finalSha256: finalHash,
    };
});

const treatmentSummary = Object.fromEntries([...new Set(inputs.map((file) => file.treatment))].sort().map((treatment) => {
    const files = inputs.filter((file) => file.treatment === treatment);
    return [treatment, {
        total: files.length,
        unchanged: files.filter((file) => file.finalStatus === 'UNCHANGED_FROM_BASELINE_HEAD').length,
        changed: files.filter((file) => file.finalStatus === 'CHANGED_FROM_BASELINE_HEAD').length,
        removed: files.filter((file) => file.finalStatus === 'REMOVED').length,
    }];
}));
const changeSummary = Object.fromEntries([...new Set(changes.map((change) => change.status[0]))].sort().map((kind) => [kind, changes.filter((change) => change.status.startsWith(kind)).length]));
const categorySummary = Object.fromEntries([...new Set(changedFiles.map((file) => file.disposition))].sort().map((category) => [category, changedFiles.filter((file) => file.disposition === category).length]));
const report = {
    schemaVersion: '1.0',
    task: 'UIC11',
    capturedAt: new Date().toISOString(),
    repository: { baseline, finalHead, branch: git('branch', '--show-current'), snapshotMode: 'immutable Git commit tree; independent of working-tree edits' },
    sourceInventory: { path: path.relative(repoRoot, sourceInventoryPath).replaceAll(path.sep, '/'), sha256: sha256(fs.readFileSync(sourceInventoryPath)), entries: inventory.files.length, allHaveOneTreatmentOwnerReason: true },
    summary: {
        baselineFiles: inputs.length,
        baselineUnchanged: inputs.filter((file) => file.finalStatus === 'UNCHANGED_FROM_BASELINE_HEAD').length,
        baselineChanged: inputs.filter((file) => file.finalStatus === 'CHANGED_FROM_BASELINE_HEAD').length,
        baselineRemoved: inputs.filter((file) => file.finalStatus === 'REMOVED').length,
        baselineInventoryHashMismatches: inputs.filter((file) => !file.baselineInventoryMatchesGit).length,
        diffPaths: changes.length,
        diffKinds: changeSummary,
        dispositions: categorySummary,
        treatmentDispositions: treatmentSummary,
        changedPathCountMissingDisposition: changedFiles.filter((file) => !file.disposition).length,
        changedPathCountMissingCommitOwner: changedFiles.filter((file) => !file.owner || file.owner === 'No commit owner found').length,
    },
    inputs,
    changedFiles,
    validation: {
        baselineInventoryHashesMatchClaimedGitHead: inputs.every((file) => file.baselineInventoryMatchesGit),
        baselineGitHashesRecomputed: inputs.every((file) => Boolean(file.baselineGitSha256)),
        everyBaselineInputHasTreatmentOwnerReason: inputs.every((file) => Boolean(file.treatment && file.owner && file.reason)),
        everyChangedPathHasDisposition: changedFiles.every((file) => Boolean(file.disposition)),
        everyChangedPathHasCommitOwner: changedFiles.every((file) => Boolean(file.owner) && file.owner !== 'No commit owner found'),
        finalFilesAreFingerprinted: changedFiles.every((file) => file.status === 'D' || Boolean(file.finalSha256)),
    },
};

fs.mkdirSync(evidenceRoot, { recursive: true });
fs.writeFileSync(path.join(evidenceRoot, 'final-inventory-reconciliation.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ repository: report.repository, summary: report.summary, validation: report.validation }, null, 2));
if (Object.values(report.validation).some((value) => value !== true)) process.exitCode = 1;
