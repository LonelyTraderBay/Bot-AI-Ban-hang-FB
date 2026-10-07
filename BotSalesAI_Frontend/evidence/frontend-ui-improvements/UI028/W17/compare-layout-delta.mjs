import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W17');
const owner = 'apps/web/src/modules/knowledge/index.tsx';
const beforePath = path.join(dir, 'layout-before-spacing-current-20261006.json');
const afterPath = path.join(dir, 'layout-after-spacing-current-20261006.json');
const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
const after = JSON.parse(fs.readFileSync(afterPath, 'utf8'));
const beforeRender = JSON.parse(fs.readFileSync(path.join(dir, 'render-before-spacing-current-20261006.json'), 'utf8'));
const afterRender = JSON.parse(fs.readFileSync(path.join(dir, 'render-after-spacing-current-20261006.json'), 'utf8'));
const key = finding => [finding.file, finding.property, finding.value, finding.code].join('|');
const counts = findings => {
    const result = new Map();
    for (const finding of findings) result.set(key(finding), (result.get(key(finding)) || 0) + 1);
    return result;
};
const beforeCounts = counts(before.findings);
const afterCounts = counts(after.findings);
const identities = new Set([...beforeCounts.keys(), ...afterCounts.keys()]);
const removed = [];
const added = [];
let nonOwnerIdentityChanges = 0;
for (const identity of identities) {
    const previous = beforeCounts.get(identity) || 0;
    const current = afterCounts.get(identity) || 0;
    if (previous > current) removed.push({ identity, count: previous - current });
    if (current > previous) added.push({ identity, count: current - previous });
    if (!identity.startsWith(`${owner}|`) && previous !== current) nonOwnerIdentityChanges++;
}
const ownerFindings = report => report.findings.filter(finding => finding.file === owner).length;
const source = fs.readFileSync(path.join(root, owner));
const sourceAfterSha256 = createHash('sha256').update(source).digest('hex');
const sourceBeforeSha256 = 'ffce0192d394f55b1f2c98336bb1502f27c8b9be0a678fca1ba9586982773785';
const delta = {
    schemaVersion: 1,
    task: 'UI028.W17',
    date: '2026-10-06',
    metric: 'strict SPACING_LITERAL findings',
    identity: 'file|property|value|code',
    multiplicityAware: true,
    before: {
        report: path.basename(beforePath),
        sha256: createHash('sha256').update(fs.readFileSync(beforePath)).digest('hex'),
        total: before.findings.length,
        knowledgeOwner: ownerFindings(before),
    },
    after: {
        report: path.basename(afterPath),
        sha256: createHash('sha256').update(fs.readFileSync(afterPath)).digest('hex'),
        total: after.findings.length,
        knowledgeOwner: ownerFindings(after),
    },
    delta: {
        removedOccurrences: removed.reduce((sum, item) => sum + item.count, 0),
        removedIdentities: removed.length,
        addedOccurrences: added.reduce((sum, item) => sum + item.count, 0),
        addedIdentities: added.length,
        nonKnowledgeIdentityChanges: nonOwnerIdentityChanges,
        removed,
        added,
    },
    source: { path: owner, beforeSha256: sourceBeforeSha256, afterSha256: sourceAfterSha256 },
    render: {
        before: path.basename(path.join(dir, 'render-before-spacing-current-20261006.json')),
        after: path.basename(path.join(dir, 'render-after-spacing-current-20261006.json')),
        observationsBefore: beforeRender.captures.length,
        observationsAfter: afterRender.captures.length,
        viewports: ['390x844', '1280x900'],
        setupWritesBefore: beforeRender.setupWrites.length,
        setupWritesAfter: afterRender.setupWrites.length,
        captureWrites: beforeRender.captureWrites.length + afterRender.captureWrites.length,
        pageErrors: beforeRender.pageErrors.length + afterRender.pageErrors.length,
    },
    interpretation: 'Knowledge owner spacing findings are migrated. Only the two documented synthetic feedback fixture setup writes occur outside the captured route/dialog states; the paired capture states themselves are read-only. Global strict spacing remains non-passing for later W18-W25 work.',
};
if (delta.before.total !== 251 || delta.after.total !== 232 || delta.before.knowledgeOwner !== 19 || delta.after.knowledgeOwner !== 0) throw new Error(`Unexpected strict counts: ${JSON.stringify(delta)}`);
if (delta.delta.removedOccurrences !== 19 || delta.delta.addedOccurrences !== 0 || delta.delta.nonKnowledgeIdentityChanges !== 0) throw new Error(`Unexpected owner delta: ${JSON.stringify(delta.delta)}`);
if (delta.render.observationsBefore !== 12 || delta.render.observationsAfter !== 12 || delta.render.captureWrites !== 0 || delta.render.pageErrors !== 0) throw new Error(`Unexpected paired render: ${JSON.stringify(delta.render)}`);
const output = path.join(dir, 'layout-delta-current-20261006.json');
if (fs.existsSync(output)) throw new Error(`Refusing to overwrite W17 delta: ${output}`);
fs.writeFileSync(output, `${JSON.stringify(delta, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ output: path.basename(output), before: delta.before.total, after: delta.after.total, removed: delta.delta.removedOccurrences, added: delta.delta.addedOccurrences, outsideOwnerChanges: delta.delta.nonKnowledgeIdentityChanges })}\n`);
