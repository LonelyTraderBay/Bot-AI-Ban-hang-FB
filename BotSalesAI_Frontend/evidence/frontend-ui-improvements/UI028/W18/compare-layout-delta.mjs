import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W18');
const owner = 'apps/web/src/modules/bot/index.tsx';
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
const sourceAfterSha256 = createHash('sha256').update(fs.readFileSync(path.join(root, owner))).digest('hex');
const beforeWrites = beforeRender.setupWrites || [];
const afterWrites = afterRender.setupWrites || [];
const allCaptures = [...beforeRender.captures, ...afterRender.captures];
const badDialog = allCaptures.filter(capture => {
    if (!capture.dialogBounds) return false;
    const { x, y, width, height } = capture.dialogBounds;
    return x < 0 || y < 0 || x + width > capture.viewport.width + 1 || y + height > capture.viewport.height + 1;
});
const overflows = allCaptures.filter(capture => capture.scrollWidth > capture.clientWidth + 1);
const badSetupWrites = [...beforeWrites, ...afterWrites].filter(write => !write.path.endsWith('/bot/playground'));
const delta = {
    schemaVersion: 1,
    task: 'UI028.W18',
    date: '2026-10-06',
    metric: 'strict spacing source findings',
    identity: 'file|property|value|code',
    multiplicityAware: true,
    before: {
        report: path.basename(beforePath),
        sha256: createHash('sha256').update(fs.readFileSync(beforePath)).digest('hex'),
        total: before.findings.length,
        botOwner: ownerFindings(before),
    },
    after: {
        report: path.basename(afterPath),
        sha256: createHash('sha256').update(fs.readFileSync(afterPath)).digest('hex'),
        total: after.findings.length,
        botOwner: ownerFindings(after),
    },
    delta: {
        removedOccurrences: removed.reduce((sum, item) => sum + item.count, 0),
        removedIdentities: removed.length,
        addedOccurrences: added.reduce((sum, item) => sum + item.count, 0),
        addedIdentities: added.length,
        nonBotIdentityChanges: nonOwnerIdentityChanges,
        removed,
        added,
    },
    source: {
        path: owner,
        beforeSha256: beforeRender.source.sha256,
        afterSha256: sourceAfterSha256,
    },
    render: {
        before: path.basename(path.join(dir, 'render-before-spacing-current-20261006.json')),
        after: path.basename(path.join(dir, 'render-after-spacing-current-20261006.json')),
        observationsBefore: beforeRender.captures.length,
        observationsAfter: afterRender.captures.length,
        viewports: ['390x844', '1280x900'],
        syntheticPlaygroundSetupWrites: { before: beforeWrites.length, after: afterWrites.length },
        unexpectedWrites: badSetupWrites.length,
        pageErrors: beforeRender.pageErrors.length + afterRender.pageErrors.length,
        horizontalOverflowObservations: overflows.length,
        outOfViewportDialogs: badDialog.length,
    },
    interpretation: 'All 25 Bot owner findings were removed, with no new findings or identity/count changes outside Bot. Captured writes are two local synthetic R27 playground result fixtures per run; no provider or customer message is involved. Global strict spacing remains red for W19-W25 debt.',
};
if (delta.before.total !== 232 || delta.after.total !== 207 || delta.before.botOwner !== 25 || delta.after.botOwner !== 0) {
    throw new Error(`Unexpected strict counts: ${JSON.stringify({ before: delta.before, after: delta.after })}`);
}
if (delta.delta.removedOccurrences !== 25 || delta.delta.addedOccurrences !== 0 || delta.delta.nonBotIdentityChanges !== 0) {
    throw new Error(`Unexpected owner delta: ${JSON.stringify(delta.delta)}`);
}
if (beforeRender.captures.length !== 18 || afterRender.captures.length !== 18 || delta.render.pageErrors !== 0
    || delta.render.unexpectedWrites !== 0 || delta.render.horizontalOverflowObservations !== 0 || delta.render.outOfViewportDialogs !== 0) {
    throw new Error(`Unexpected paired render: ${JSON.stringify(delta.render)}`);
}
if (JSON.stringify(beforeRender.captures.map(({ route, state, viewport }) => [route, state, viewport.width, viewport.height]))
    !== JSON.stringify(afterRender.captures.map(({ route, state, viewport }) => [route, state, viewport.width, viewport.height]))) {
    throw new Error('Before and after observations do not match by route/state/viewport.');
}
const output = path.join(dir, 'layout-delta-current-20261006.json');
if (fs.existsSync(output)) throw new Error(`Refusing to overwrite W18 delta: ${output}`);
fs.writeFileSync(output, `${JSON.stringify(delta, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({
    output: path.basename(output),
    before: delta.before.total,
    after: delta.after.total,
    ownerRemoved: delta.delta.removedOccurrences,
    ownerAfter: delta.after.botOwner,
    added: delta.delta.addedOccurrences,
    outsideOwnerChanges: delta.delta.nonBotIdentityChanges,
}));
