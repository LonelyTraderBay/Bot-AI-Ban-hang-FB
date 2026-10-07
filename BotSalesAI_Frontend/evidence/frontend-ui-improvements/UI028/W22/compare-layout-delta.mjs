import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W22');
const owner = 'apps/web/src/modules/workspace/index.tsx';
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
const captures = [...beforeRender.captures, ...afterRender.captures];
const overflows = captures.filter(capture => capture.scrollWidth > capture.clientWidth + 1);
const writes = [...beforeRender.apiWrites, ...afterRender.apiWrites];
const pageErrors = [...beforeRender.pageErrors, ...afterRender.pageErrors];
const states = render => render.captures.map(({ route, path: routePath, heading, state, viewport }) => [route, routePath, heading, state, viewport.width, viewport.height]);
const noRouteMismatch = JSON.stringify(states(beforeRender)) === JSON.stringify(states(afterRender));
const immutableHashes = ['routeManifest', 'openapi', 'uxContract', 'tokens', 'components'];
const unchangedInputs = immutableHashes.every(name => beforeRender.sourceHashes[name] === afterRender.sourceHashes[name]);
const exceptionsUnchanged = JSON.stringify(before.exceptionsUsed) === JSON.stringify(after.exceptionsUsed)
    && JSON.stringify(before.exceptionsUnused) === JSON.stringify(after.exceptionsUnused);
const delta = {
    schemaVersion: 1,
    task: 'UI028.W22',
    date: '2026-10-06',
    metric: 'strict spacing source findings',
    identity: 'file|property|value|code',
    multiplicityAware: true,
    before: { report: path.basename(beforePath), sha256: hash(beforePath), total: before.findings.length, workspaceOwner: ownerFindings(before) },
    after: { report: path.basename(afterPath), sha256: hash(afterPath), total: after.findings.length, workspaceOwner: ownerFindings(after) },
    delta: {
        removedOccurrences: removed.reduce((sum, item) => sum + item.count, 0),
        removedIdentities: removed.length,
        addedOccurrences: added.reduce((sum, item) => sum + item.count, 0),
        addedIdentities: added.length,
        nonOwnerIdentityChanges,
        removed,
        added,
    },
    source: {
        path: owner,
        beforeSha256: beforeRender.sourceHashes.workspace,
        afterSha256: sourceAfterSha256,
        sharedLayoutBeforeSha256: beforeRender.sourceHashes.layout,
        sharedLayoutAfterSha256: afterRender.sourceHashes.layout,
        immutableInputsUnchanged: unchangedInputs,
        exceptionsUnchanged,
    },
    render: {
        observationsBefore: beforeRender.captures.length,
        observationsAfter: afterRender.captures.length,
        matchedRoutesAndStates: noRouteMismatch,
        viewports: ['390x844', '1280x900'],
        apiWrites: writes.length,
        pageErrors: pageErrors.length,
        documentHorizontalOverflowObservations: overflows.length,
    },
    interpretation: 'All 37 workspace-owner findings were removed with no additions and no findings changed outside the owner. Paired local Chromium renders cover the same eight routes and states at both viewports; all behavior uses the synthetic mock API. The global strict scan remains red for 102 findings owned by W23-W25.',
};

if (delta.before.total !== 139 || delta.after.total !== 102 || delta.before.workspaceOwner !== 37 || delta.after.workspaceOwner !== 0) {
    throw new Error(`Unexpected strict counts: ${JSON.stringify({ before: delta.before, after: delta.after })}`);
}
if (delta.delta.removedOccurrences !== 37 || delta.delta.addedOccurrences !== 0 || nonOwnerIdentityChanges !== 0 || !exceptionsUnchanged) {
    throw new Error(`Unexpected owner delta: ${JSON.stringify(delta.delta)}`);
}
if (beforeRender.captures.length !== 16 || afterRender.captures.length !== 16 || writes.length || pageErrors.length || overflows.length || !noRouteMismatch || !unchangedInputs) {
    throw new Error(`Unexpected paired render or canonical input change: ${JSON.stringify(delta.render)}`);
}
if (beforeRender.sourceHashes.workspace !== 'a59f54d27b4973fd8e015b129e1756748ba325cf85e99a35c636623f773cd43d'
    || afterRender.sourceHashes.workspace !== sourceAfterSha256) throw new Error('Render source hashes do not match the W22 baseline/current source.');
const output = path.join(dir, 'layout-delta-current-20261006.json');
if (fs.existsSync(output)) throw new Error('Refusing to overwrite the W22 layout delta.');
fs.writeFileSync(output, `${JSON.stringify(delta, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ before: delta.before.total, after: delta.after.total, removed: delta.delta.removedOccurrences, added: delta.delta.addedOccurrences, outsideOwnerChanges: nonOwnerIdentityChanges, captures: delta.render.observationsAfter }));
