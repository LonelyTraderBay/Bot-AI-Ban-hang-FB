import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'evidence/frontend-ui-improvements/UI028/W23');
const owner = 'apps/web/src/modules/dashboard/index.tsx';
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
const writes = [...beforeRender.productRouteWrites, ...afterRender.productRouteWrites];
const pageErrors = [...beforeRender.pageErrors, ...afterRender.pageErrors];
const states = render => render.captures.map(({ route, path: routePath, heading, state, viewport }) => [route, routePath, heading, state, viewport.width, viewport.height]);
const noRouteMismatch = JSON.stringify(states(beforeRender)) === JSON.stringify(states(afterRender));
const immutableInputs = ['routeManifest', 'openapi', 'uxContract', 'tokens', 'components'];
const unchangedInputs = immutableInputs.every(name => beforeRender.sourceHashes[name] === afterRender.sourceHashes[name]);
const exceptionsUnchanged = JSON.stringify(before.exceptionsUsed) === JSON.stringify(after.exceptionsUsed)
    && JSON.stringify(before.exceptionsUnused) === JSON.stringify(after.exceptionsUnused);
const delta = {
    schemaVersion: 1,
    task: 'UI028.W23',
    date: '2026-10-06',
    scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    owner,
    route: { id: 'R04', path: '/s/:shopId/overview', capturedPath: '/s/shop-demo/overview' },
    identity: 'file|property|value|code',
    multiplicityAware: true,
    before: { report: path.basename(beforePath), sha256: hash(beforePath), total: before.findings.length, ownerFindings: ownerFindings(before) },
    after: { report: path.basename(afterPath), sha256: hash(afterPath), total: after.findings.length, ownerFindings: ownerFindings(after) },
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
        beforeSha256: beforeRender.sourceHashes.dashboard,
        afterSha256: sourceAfterSha256,
        sharedLayoutBeforeSha256: beforeRender.sourceHashes.layout,
        sharedLayoutAfterSha256: afterRender.sourceHashes.layout,
        canonicalInputsUnchanged: unchangedInputs,
        spacingStandardBeforeSha256: beforeRender.sourceHashes.spacingStandard,
        spacingStandardAfterSha256: afterRender.sourceHashes.spacingStandard,
        spacingStandardUpdatedForNewDashboardRoles: beforeRender.sourceHashes.spacingStandard !== afterRender.sourceHashes.spacingStandard,
        exceptionsUnchanged,
    },
    render: {
        browser: 'Chromium',
        mode: 'local demo / synthetic mock API',
        observationsBefore: beforeRender.captures.length,
        observationsAfter: afterRender.captures.length,
        sameRoutesStatesAndViewports: noRouteMismatch,
        rolesAndViewports: ['owner@390x844', 'owner@1280x900', 'viewer-no-finance@390x844', 'viewer-no-finance@1280x900'],
        productRouteWrites: writes.length,
        pageErrors: pageErrors.length,
        horizontalOverflowObservations: overflows.length,
    },
    interpretation: 'All 36 dashboard-owner spacing findings were removed; no finding was added and no identity/count changed outside Dashboard. The 66 remaining findings belong to W24 Inbox and W25 Reports. Paired browser captures use the local synthetic demo only.',
};

if (delta.before.total !== 102 || delta.after.total !== 66 || delta.before.ownerFindings !== 36 || delta.after.ownerFindings !== 0) {
    throw new Error(`Unexpected strict counts: ${JSON.stringify({ before: delta.before, after: delta.after })}`);
}
if (delta.delta.removedOccurrences !== 36 || delta.delta.addedOccurrences !== 0 || nonOwnerIdentityChanges !== 0 || !exceptionsUnchanged) {
    throw new Error(`Unexpected owner delta: ${JSON.stringify(delta.delta)}`);
}
if (beforeRender.captures.length !== 4 || afterRender.captures.length !== 4 || writes.length || pageErrors.length || overflows.length || !noRouteMismatch || !unchangedInputs) {
    throw new Error(`Unexpected paired render or canonical input change: ${JSON.stringify(delta.render)}`);
}
if (beforeRender.sourceHashes.dashboard !== '138c3893afa1d347cdc95cfb0823dd4f110e1224308a6b24e7daa84c4180d688'
    || afterRender.sourceHashes.dashboard !== sourceAfterSha256) throw new Error('Render source hashes do not match the W23 baseline/current source.');

const output = path.join(dir, 'layout-delta-current-20261006.json');
if (fs.existsSync(output)) throw new Error('Refusing to overwrite the W23 layout delta.');
fs.writeFileSync(output, `${JSON.stringify(delta, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ before: delta.before.total, after: delta.after.total, removed: delta.delta.removedOccurrences, added: delta.delta.addedOccurrences, outsideOwnerChanges: nonOwnerIdentityChanges, captures: delta.render.observationsAfter }));
