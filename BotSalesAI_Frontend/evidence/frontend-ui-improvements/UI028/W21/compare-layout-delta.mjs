import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W21');
const owner = 'apps/web/src/modules/operations/index.tsx';
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
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceAfterSha256 = hash(path.join(root, owner));
const allCaptures = [...beforeRender.captures, ...afterRender.captures];
const overflows = allCaptures.filter(capture => capture.scrollWidth > capture.clientWidth + 1);
const writes = [...beforeRender.setupWrites, ...afterRender.setupWrites];
const delta = {
    schemaVersion: 1,
    task: 'UI028.W21',
    date: '2026-10-06',
    metric: 'strict spacing source findings',
    identity: 'file|property|value|code',
    multiplicityAware: true,
    before: { report: path.basename(beforePath), sha256: hash(beforePath), total: before.findings.length, operationsOwner: ownerFindings(before) },
    after: { report: path.basename(afterPath), sha256: hash(afterPath), total: after.findings.length, operationsOwner: ownerFindings(after) },
    delta: {
        removedOccurrences: removed.reduce((sum, item) => sum + item.count, 0),
        removedIdentities: removed.length,
        addedOccurrences: added.reduce((sum, item) => sum + item.count, 0),
        addedIdentities: added.length,
        nonOwnerIdentityChanges,
        removed,
        added,
    },
    source: { path: owner, beforeSha256: beforeRender.sourceHashes.operations, afterSha256: sourceAfterSha256 },
    render: {
        observationsBefore: beforeRender.captures.length,
        observationsAfter: afterRender.captures.length,
        viewports: ['390x844', '1280x900'],
        writes: writes.length,
        pageErrors: beforeRender.pageErrors.length + afterRender.pageErrors.length,
        horizontalOverflowObservations: overflows.length,
    },
    interpretation: 'All 30 Operations owner findings were removed, with no new finding or identity/count changes outside Operations. Paired route renders use only synthetic, read-only local mock data. Whole-source strict spacing remains red for W22-W25 migration debt.',
};
if (delta.before.total !== 169 || delta.after.total !== 139 || delta.before.operationsOwner !== 30 || delta.after.operationsOwner !== 0) {
    throw new Error(`Unexpected strict counts: ${JSON.stringify({ before: delta.before, after: delta.after })}`);
}
if (delta.delta.removedOccurrences !== 30 || delta.delta.addedOccurrences !== 0 || delta.delta.nonOwnerIdentityChanges !== 0) {
    throw new Error(`Unexpected owner delta: ${JSON.stringify(delta.delta)}`);
}
if (beforeRender.captures.length !== 6 || afterRender.captures.length !== 6 || writes.length || beforeRender.pageErrors.length || afterRender.pageErrors.length || overflows.length) {
    throw new Error(`Unexpected paired render: ${JSON.stringify(delta.render)}`);
}
const states = render => render.captures.map(({ route, state, viewport }) => [route, state, viewport.width, viewport.height]);
if (JSON.stringify(states(beforeRender)) !== JSON.stringify(states(afterRender))) throw new Error('Before/after observations do not match.');
if (beforeRender.sourceHashes.operations !== 'f228f311285d9361ea9ba5a0117b8d03a6d02e00edf1baffddeba647ec4a59ba'
    || afterRender.sourceHashes.operations !== sourceAfterSha256) throw new Error('Render source hashes do not match the W21 baseline/current source.');
for (const key of ['layout', 'components']) {
    if (beforeRender.sourceHashes[key] !== afterRender.sourceHashes[key]) throw new Error(`${key} shared source changed during a module-only migration.`);
}
if (fs.existsSync(path.join(dir, 'layout-delta-current-20261006.json'))) throw new Error('Refusing to overwrite the W21 delta.');
fs.writeFileSync(path.join(dir, 'layout-delta-current-20261006.json'), `${JSON.stringify(delta, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ before: delta.before.total, after: delta.after.total, removed: delta.delta.removedOccurrences, added: delta.delta.addedOccurrences, outsideOwnerChanges: nonOwnerIdentityChanges }));
