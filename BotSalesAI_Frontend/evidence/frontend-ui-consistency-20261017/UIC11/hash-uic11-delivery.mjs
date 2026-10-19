import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const repoRoot = path.resolve(frontendRoot, '..');
const evidenceRoot = path.resolve(frontendRoot, 'evidence/frontend-ui-consistency-20261017/UIC11');
const manifestPath = path.join(evidenceRoot, 'final-document-hashes.json');
const manifestRelative = path.relative(repoRoot, manifestPath).replaceAll(path.sep, '/');
const sourceHead = '3e49d9424075b1bd28e7e26a16cb702505ffedf9';
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const splitPaths = output => output.split(/\r?\n/).filter(Boolean).map(file => file.replaceAll('\\', '/'));
const evidencePrefix = 'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC11/';
const downstreamDeliveryPrefixes = [
    'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC12/',
    'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC13/',
];
const hashReceiptPattern = /^BotSalesAI_Frontend\/evidence\/frontend-ui-consistency-20261017\/UIC11\/hash-manifest-.*\.log(?:\.exit)?$/;

function expectedTrackedPaths() {
    return [
        'BotSalesAI_Frontend/docs/FRONTEND_SPACING_STANDARD.md',
        'BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
        'BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md',
        'BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md',
        'botsales-kit/IMPLEMENTATION_PLAN.md',
        'botsales-kit/execution/FRONTEND_PROGRESS.md',
        'botsales-kit/execution/frontend-progress-report.json',
        ...Array.from({ length: 28 }, (_, index) => 'botsales-kit/execution/frontend-tasks/FE' + String(index + 1).padStart(3, '0') + '.md'),
    ].sort();
}

function currentWorkItems() {
    const trackedAll = splitPaths(git('diff', '--name-only', sourceHead, '--')).sort();
    const expected = expectedTrackedPaths();
    const trackedOutsideEvidence = trackedAll.filter(file => !file.startsWith('BotSalesAI_Frontend/evidence/'));
    if (JSON.stringify(trackedOutsideEvidence) !== JSON.stringify(expected)) {
        throw new Error('Tracked paths differ from UIC11 scope relative to source baseline. Observed: ' + trackedOutsideEvidence.join(', '));
    }
    const untrackedAll = splitPaths(git('ls-files', '--others', '--exclude-standard', '-z').replaceAll('\0', '\n')).sort();
    const outside = untrackedAll.filter(file =>
        !file.startsWith(evidencePrefix) && !downstreamDeliveryPrefixes.some(prefix => file.startsWith(prefix)));
    if (outside.length) throw new Error('Unexpected untracked path outside UIC11 evidence: ' + outside.join(', '));
    return [...new Set([...trackedAll, ...untrackedAll, manifestRelative])]
        .filter(file => !downstreamDeliveryPrefixes.some(prefix => file.startsWith(prefix)))
        .filter(file => !hashReceiptPattern.test(file))
        .sort();
}

const verifyOnly = process.argv.includes('--verify');
let manifest;
if (verifyOnly) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const errors = [];
    for (const file of manifest.files) {
        const fullPath = path.resolve(repoRoot, file.path);
        if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
            errors.push('missing: ' + file.path);
            continue;
        }
        const bytes = fs.readFileSync(fullPath);
        if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) errors.push('content mismatch: ' + file.path);
    }
    console.log(JSON.stringify({ checked: manifest.files.length, errors }, null, 2));
    if (errors.length) process.exitCode = 1;
} else {
    const currentHead = git('rev-parse', 'HEAD');
    const files = currentWorkItems()
        .filter(file => file !== manifestRelative)
        .map(file => {
            const bytes = fs.readFileSync(path.resolve(repoRoot, file));
            return { path: file, bytes: bytes.length, sha256: sha256(bytes) };
        });
    manifest = {
        schemaVersion: '1.0',
        task: 'UIC11',
        capturedAt: new Date().toISOString(),
        sourceHead,
        capturedFromHead: currentHead,
        scope: 'UIC11 changed documents, S17 owner evidence, owner-generated FE reports, and UIC11 evidence relative to immutable final-source baseline; manifest excludes itself, hash-manifest command receipts, and downstream UIC12/UIC13 delivery reports to avoid circular freshness.',
        fileCount: files.length,
        files,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify({ sourceHead, capturedFromHead: currentHead, fileCount: files.length }, null, 2));
}
