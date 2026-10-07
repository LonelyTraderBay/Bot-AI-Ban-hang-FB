import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const directory = path.join(root, 'evidence/frontend-ui-improvements/UI028/W11');
const output = path.join(directory, 'layout-report-delta-current-20261005.json');
if (fs.existsSync(output)) throw new Error(`Refusing to overwrite W11 comparison evidence: ${output}`);
const before = JSON.parse(fs.readFileSync(path.join(directory, 'render-before-source-edit-stable-current-20261005.json'), 'utf8'));
const after = JSON.parse(fs.readFileSync(path.join(directory, 'render-after-source-edit-current-20261005.json'), 'utf8'));
const findingKey = finding => [finding.file, finding.property, String(finding.value).trim().toLowerCase(), finding.code].join('|');
const multiset = findings => {
    const result = new Map();
    for (const finding of findings) result.set(findingKey(finding), (result.get(findingKey(finding)) || 0) + 1);
    return result;
};
const previous = multiset(before.layout.ordersFindings);
const current = multiset(after.layout.ordersFindings);
const newFindings = [];
for (const [key, count] of current) {
    const delta = count - (previous.get(key) || 0);
    if (delta > 0) newFindings.push({ key, count: delta });
}
const resolvedFindings = [];
for (const [key, count] of previous) {
    const delta = count - (current.get(key) || 0);
    if (delta > 0) resolvedFindings.push({ key, count: delta });
}
const observationKey = item => `${item.routeId}|${item.viewport.width}|${item.state}`;
const beforeObservations = new Map(before.observations.map(item => [observationKey(item), item]));
const afterObservations = new Map(after.observations.map(item => [observationKey(item), item]));
const observationParity = [...beforeObservations.keys()].length === 18 && beforeObservations.size === afterObservations.size && [...beforeObservations.keys()].every(key => afterObservations.has(key));
const renderChecks = [...afterObservations.values()].map(item => {
    const expectedGutter = item.viewport.width >= 900 ? '24px' : '16px';
    const documentFits = item.metrics.document.clientWidth === item.viewport.width && item.metrics.document.scrollWidth <= item.viewport.width;
    const shellGutter = item.metrics.main?.paddingLeft === expectedGutter;
    const dialogFits = !item.metrics.dialog || (item.metrics.dialog.x >= 0 && item.metrics.dialog.x + item.metrics.dialog.width <= item.viewport.width);
    return { routeId: item.routeId, width: item.viewport.width, state: item.state, documentFits, shellGutter, dialogFits };
});
const sharedFiles = Object.keys(before.sourceSha256).filter(file => file !== 'apps/web/src/modules/orders/index.tsx');
const sharedSourcesUnchanged = sharedFiles.every(file => before.sourceSha256[file] === after.sourceSha256[file]);
const checks = {
    baselineIsStableSupplement: before.phase === 'baseline-stable' && before.status === 'BASELINE_CAPTURED',
    afterCaptured: after.status === 'AFTER_STATE_CAPTURED',
    sameBrowser: before.browser.name === after.browser.name && before.browser.version === after.browser.version,
    sameSyntheticSeedMode: before.seedMode === after.seedMode,
    observationParity,
    zeroPageErrors: before.pageErrors.length === 0 && after.pageErrors.length === 0,
    sameSharedFoundationHashes: sharedSourcesUnchanged,
    noNewOrdersFindings: newFindings.length === 0,
    touchedOrdersFileClean: after.layout.ordersFindings.length === 0,
    renderGeometryPass: renderChecks.every(item => item.documentFits && item.shellGutter && item.dialogFits),
    globalDebtOnlyDecreased: after.layout.totalFindings < before.layout.totalFindings,
    unknownStyleSourceZero: (after.layout.counts.UNKNOWN_STYLE_SOURCE || 0) === 0,
};
const result = {
    schemaVersion: 1,
    task: 'UI028.W11',
    capturedAt: new Date().toISOString(),
    status: Object.values(checks).every(Boolean) ? 'PASS_NO_NEW_FINDINGS_TOUCHED_FILE_CLEAN' : 'FAIL',
    findingIdentity: ['file', 'property', 'normalized value', 'code', 'multiplicity'],
    comparison: {
        baseline: { file: 'render-before-source-edit-stable-current-20261005.json', status: before.status, globalFindings: before.layout.totalFindings, ordersFindings: before.layout.ordersFindings.length },
        after: { file: 'render-after-source-edit-current-20261005.json', status: after.status, globalFindings: after.layout.totalFindings, ordersFindings: after.layout.ordersFindings.length },
        resolvedFindings,
        newFindings,
        unknownAfter: after.layout.counts.UNKNOWN_STYLE_SOURCE || 0,
    },
    checks,
    renderChecks,
    limitations: ['The strict application scan remains nonzero from pre-existing W12–W25 migration debt; this task does not claim a global PASS.', 'Synthetic in-memory mock only; no Backend, hosted CI, staging, production runtime or owner acceptance is represented.'],
};
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: result.status, checks, before: result.comparison.baseline, after: result.comparison.after, resolved: resolvedFindings.reduce((sum, item) => sum + item.count, 0), newFindings: newFindings.length, renderChecks: renderChecks.length, output }, null, 2));
if (result.status === 'FAIL') process.exitCode = 1;
