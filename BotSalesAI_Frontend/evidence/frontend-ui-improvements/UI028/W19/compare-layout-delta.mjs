import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W19');
const owner = 'apps/web/src/modules/integrations/index.tsx';
const beforePath = path.join(root, 'evidence/frontend-ui-improvements/UI028/W18/layout-after-spacing-current-20261006.json');
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
const badDialogs = allCaptures.filter(capture => {
    if (!capture.dialogBounds) return false;
    const { x, y, width, height } = capture.dialogBounds;
    return x < 0 || y < 0 || x + width > capture.viewport.width + 1 || y + height > capture.viewport.height + 1;
});
const badWrites = [...beforeRender.setupWrites, ...afterRender.setupWrites];
const delta = {
    schemaVersion: 1,
    task: 'UI028.W19',
    date: '2026-10-06',
    metric: 'strict spacing source findings',
    identity: 'file|property|value|code',
    multiplicityAware: true,
    before: { report: path.relative(root, beforePath), sha256: hash(beforePath), total: before.findings.length, integrationsOwner: ownerFindings(before) },
    after: { report: path.basename(afterPath), sha256: hash(afterPath), total: after.findings.length, integrationsOwner: ownerFindings(after) },
    delta: {
        removedOccurrences: removed.reduce((sum, item) => sum + item.count, 0),
        removedIdentities: removed.length,
        addedOccurrences: added.reduce((sum, item) => sum + item.count, 0),
        addedIdentities: added.length,
        nonOwnerIdentityChanges,
        removed,
        added,
    },
    source: { path: owner, beforeSha256: beforeRender.source.sha256, afterSha256: sourceAfterSha256 },
    render: {
        observationsBefore: beforeRender.captures.length,
        observationsAfter: afterRender.captures.length,
        viewports: ['390x844', '1280x900'],
        writesBefore: beforeRender.setupWrites.length,
        writesAfter: afterRender.setupWrites.length,
        pageErrors: beforeRender.pageErrors.length + afterRender.pageErrors.length,
        horizontalOverflowObservations: overflows.length,
        outOfViewportDialogs: badDialogs.length,
    },
    interpretation: 'All 13 Integrations owner findings were removed, with no new finding or identity/count changes outside Integrations. Paired states use only synthetic, read-only local mock data. Workspace strict spacing remains red for W20-W25 migration debt.',
};
if (delta.before.total !== 207 || delta.after.total !== 194 || delta.before.integrationsOwner !== 13 || delta.after.integrationsOwner !== 0) {
    throw new Error(`Unexpected strict counts: ${JSON.stringify({ before: delta.before, after: delta.after })}`);
}
if (delta.delta.removedOccurrences !== 13 || delta.delta.addedOccurrences !== 0 || delta.delta.nonOwnerIdentityChanges !== 0) {
    throw new Error(`Unexpected owner delta: ${JSON.stringify(delta.delta)}`);
}
if (beforeRender.captures.length !== 12 || afterRender.captures.length !== 12 || beforeRender.setupWrites.length || afterRender.setupWrites.length
    || beforeRender.pageErrors.length || afterRender.pageErrors.length || overflows.length || badDialogs.length) {
    throw new Error(`Unexpected paired render: ${JSON.stringify(delta.render)}`);
}
const states = render => render.captures.map(({ route, state, viewport }) => [route, state, viewport.width, viewport.height]);
if (JSON.stringify(states(beforeRender)) !== JSON.stringify(states(afterRender))) throw new Error('Before/after observations do not match.');
if (beforeRender.source.sha256 !== 'de8a8c8407b80792e2b8c3b25d5a31dc8239a99654f3df254f2685e9a4d2f44b'
    || afterRender.source.sha256 !== sourceAfterSha256) throw new Error('Render source hashes do not match the W19 baseline/current source.');
if (fs.existsSync(path.join(dir, 'layout-delta-current-20261006.json'))) throw new Error('Refusing to overwrite W19 delta.');
fs.writeFileSync(path.join(dir, 'layout-delta-current-20261006.json'), `${JSON.stringify(delta, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ before: delta.before.total, after: delta.after.total, removed: delta.delta.removedOccurrences, added: delta.delta.addedOccurrences, outsideOwnerChanges: nonOwnerIdentityChanges }));
