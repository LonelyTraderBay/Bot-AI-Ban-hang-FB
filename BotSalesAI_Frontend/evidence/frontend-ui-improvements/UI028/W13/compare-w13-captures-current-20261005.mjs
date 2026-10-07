import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(directory, 'layout-report-delta-v2-current-20261005.json');
if (existsSync(output)) throw new Error(`Refusing to overwrite evidence: ${output}`);
const read = name => JSON.parse(readFileSync(path.join(directory, name), 'utf8'));
const baseline = read('render-before-source-edit-current-20261005.json');
const after = read('render-after-source-edit-v2-current-20261005.json');
if (baseline.status !== 'BASELINE_CAPTURED' || after.status !== 'AFTER_STATE_CAPTURED') throw new Error('Unexpected render capture status.');
if (baseline.browser.name !== after.browser.name || baseline.browser.version !== after.browser.version) throw new Error('Before/after browser identity differs.');

const normalize = value => String(value).trim().replace(/\s+/g, ' ');
const identity = finding => JSON.stringify([finding.file, finding.property, normalize(finding.value), finding.code]);
const tally = findings => {
    const counts = new Map();
    for (const finding of findings) counts.set(identity(finding), (counts.get(identity(finding)) || 0) + 1);
    return counts;
};
const beforeCounts = tally(baseline.layout.procurementFindings);
const afterCounts = tally(after.layout.procurementFindings);
const resolved = [];
const newFindings = [];
for (const [key, count] of beforeCounts) {
    const remaining = afterCounts.get(key) || 0;
    if (count > remaining) {
        const finding = baseline.layout.procurementFindings.find(item => identity(item) === key);
        resolved.push({ file: finding.file, property: finding.property, value: finding.value, code: finding.code, count: count - remaining });
    }
}
for (const [key, count] of afterCounts) {
    const added = count - (beforeCounts.get(key) || 0);
    if (added > 0) {
        const finding = after.layout.procurementFindings.find(item => identity(item) === key);
        newFindings.push({ file: finding.file, property: finding.property, value: finding.value, code: finding.code, count: added });
    }
}

const sha256 = file => createHash('sha256').update(readFileSync(path.join(directory, file))).digest('hex');
const pairs = baseline.observations.map(before => {
    const next = after.observations.find(item => item.routeId === before.routeId && item.state === before.state
        && item.viewport.width === before.viewport.width && item.viewport.height === before.viewport.height);
    if (!next) throw new Error(`Missing paired observation for ${before.routeId}/${before.state}/${before.viewport.width}`);
    const bounds = item => item.metrics.dialog && Object.fromEntries(['x', 'y', 'width', 'height']
        .map(key => [key, Math.round(item.metrics.dialog[key] * 10) / 10]));
    const image = item => ({ path: item.screenshot, sha256: sha256(item.screenshot) });
    return {
        routeId: before.routeId,
        state: before.state,
        viewport: before.viewport,
        documentWidth: {
            before: { client: before.metrics.document.clientWidth, scroll: before.metrics.document.scrollWidth },
            after: { client: next.metrics.document.clientWidth, scroll: next.metrics.document.scrollWidth },
        },
        mainPadding: { before: before.metrics.main.padding, after: next.metrics.main.padding },
        dialog: { before: bounds(before), after: bounds(next) },
        screenshots: { before: image(before), after: image(next) },
    };
});

const globalDelta = after.layout.totalFindings - baseline.layout.totalFindings;
const moduleBefore = baseline.layout.procurementFindings.length;
const moduleAfter = after.layout.procurementFindings.length;
const visualBoundsValid = pairs.every(pair => !pair.dialog.after || (pair.dialog.after.x >= 0 && pair.dialog.after.y >= 0
    && pair.dialog.after.x + pair.dialog.after.width <= pair.viewport.width
    && pair.dialog.after.y + pair.dialog.after.height <= pair.viewport.height));
const checks = {
    allRouteStateViewportPairsPresent: pairs.length === 22 && pairs.length === baseline.observations.length && pairs.length === after.observations.length,
    allPagesHaveNoHorizontalOverflow: pairs.every(pair => pair.documentWidth.before.client === pair.documentWidth.before.scroll
        && pair.documentWidth.after.client === pair.documentWidth.after.scroll),
    mainGutterUnchanged: pairs.every(pair => pair.mainPadding.before === pair.mainPadding.after),
    allAfterDialogsFitViewport: visualBoundsValid,
    noPageErrorsOrWrites: baseline.pageErrors.length === 0 && after.pageErrors.length === 0
        && baseline.requestWrites.length === 0 && after.requestWrites.length === 0,
    noNewProcurementSpacingFindings: newFindings.length === 0,
    procurementModuleCleanAfter: moduleAfter === 0,
    globalDeltaMatchesResolvedModuleFindings: globalDelta === -resolved.reduce((sum, finding) => sum + finding.count, 0),
    nonProcurementSourceInputsUnchanged: Object.keys(baseline.sourceSha256).filter(file => file !== 'apps/web/src/modules/procurement/index.tsx')
        .every(file => baseline.sourceSha256[file] === after.sourceSha256[file]),
};
const status = Object.values(checks).every(Boolean) ? 'PASS_LOCAL_PAIRED_RENDER_AND_MODULE_SPACING_DELTA' : 'FAIL';
const result = {
    schemaVersion: 1,
    task: 'UI028.W13',
    status,
    comparison: 'finding multiset keyed by file/property/normalized value/code; screenshots paired by route/state/viewport',
    browser: baseline.browser,
    captures: {
        baseline: 'render-before-source-edit-current-20261005.json',
        after: 'render-after-source-edit-v2-current-20261005.json',
        seedMode: baseline.seedMode,
    },
    spacing: {
        checker: 'scripts/check-layout.mjs',
        globalBefore: baseline.layout.totalFindings,
        globalAfter: after.layout.totalFindings,
        globalDelta,
        procurementBefore: moduleBefore,
        procurementAfter: moduleAfter,
        resolved,
        newFindings,
        remainingGlobalGate: after.layout.status,
    },
    pageErrors: { before: baseline.pageErrors.length, after: after.pageErrors.length },
    writeRequests: { before: baseline.requestWrites.length, after: after.requestWrites.length },
    pairedObservations: pairs,
    checks,
    limitation: 'Local synthetic UI only. Route/state screenshots cover 390x844 and 1280x900; responsive Playwright tests cover 320/390/768/1280/1440 in Chromium and Firefox. Global strict spacing remains failing on unrelated modules. SPC-046 visual-token automation is still pending W26-W27.',
};
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ status, globalBefore: result.spacing.globalBefore, globalAfter: result.spacing.globalAfter,
    procurementBefore: moduleBefore, procurementAfter: moduleAfter, pairs: pairs.length, checks }, null, 2));
if (status !== 'PASS_LOCAL_PAIRED_RENDER_AND_MODULE_SPACING_DELTA') process.exitCode = 1;
