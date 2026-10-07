import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(directory, 'layout-report-delta-current-20261005.json');
if (existsSync(output)) throw new Error(`Refusing to overwrite evidence: ${output}`);

const read = name => JSON.parse(readFileSync(path.join(directory, name), 'utf8'));
const baseline = read('render-before-source-edit-current-20261005.json');
const after = read('render-after-source-edit-current-20261005.json');
if (baseline.status !== 'BASELINE_CAPTURED' || after.status !== 'AFTER_STATE_CAPTURED') {
    throw new Error('Unexpected baseline or after capture status');
}
if (baseline.browser.name !== after.browser.name || baseline.browser.version !== after.browser.version) {
    throw new Error('The before/after browser identity differs');
}

const identity = finding => [finding.file, finding.property, finding.value, finding.code].join('|');
const counts = findings => {
    const result = new Map();
    for (const finding of findings) result.set(identity(finding), (result.get(identity(finding)) ?? 0) + 1);
    return result;
};
const beforeCounts = counts(baseline.layout.inventoryFindings);
const afterCounts = counts(after.layout.inventoryFindings);
const resolved = [];
const newFindings = [];
for (const [key, count] of beforeCounts) {
    const remaining = afterCounts.get(key) ?? 0;
    if (count > remaining) {
        const sample = baseline.layout.inventoryFindings.find(finding => identity(finding) === key);
        resolved.push({ file: sample.file, property: sample.property, value: sample.value, code: sample.code, count: count - remaining });
    }
}
for (const [key, count] of afterCounts) {
    const added = count - (beforeCounts.get(key) ?? 0);
    if (added > 0) {
        const sample = after.layout.inventoryFindings.find(finding => identity(finding) === key);
        newFindings.push({ file: sample.file, property: sample.property, value: sample.value, code: sample.code, count: added });
    }
}

const sha256 = file => createHash('sha256').update(readFileSync(path.join(directory, file))).digest('hex');
const pairs = baseline.observations.map(before => {
    const afterObservation = after.observations.find(item => item.routeId === before.routeId
        && item.state === before.state && item.viewport.width === before.viewport.width
        && item.viewport.height === before.viewport.height);
    if (!afterObservation) throw new Error(`Missing paired capture for ${before.routeId}/${before.state}/${before.viewport.width}`);
    const screenshot = item => ({ path: item.screenshot, sha256: sha256(item.screenshot) });
    const dialog = item => item.metrics.dialog && Object.fromEntries(['x', 'y', 'width', 'height']
        .map(key => [key, Math.round(item.metrics.dialog[key] * 10) / 10]));
    return {
        routeId: before.routeId,
        state: before.state,
        viewport: before.viewport,
        documentWidth: {
            before: { client: before.metrics.document.clientWidth, scroll: before.metrics.document.scrollWidth },
            after: { client: afterObservation.metrics.document.clientWidth, scroll: afterObservation.metrics.document.scrollWidth },
        },
        mainPadding: { before: before.metrics.main.padding, after: afterObservation.metrics.main.padding },
        dialog: { before: dialog(before), after: dialog(afterObservation) },
        screenshots: { before: screenshot(before), after: screenshot(afterObservation) },
    };
});

const globalDelta = after.layout.totalFindings - baseline.layout.totalFindings;
const checks = {
    pairedObservations: pairs.length === baseline.observations.length && pairs.length === after.observations.length,
    allPagesHaveNoHorizontalOverflow: pairs.every(pair => pair.documentWidth.before.client === pair.documentWidth.before.scroll
        && pair.documentWidth.after.client === pair.documentWidth.after.scroll),
    noBrowserPageErrors: baseline.pageErrors.length === 0 && after.pageErrors.length === 0,
    noNewInventorySpacingFindings: newFindings.length === 0,
    inventoryModuleCleanAfter: after.layout.inventoryFindings.length === 0,
    globalDeltaMatchesInventoryDelta: globalDelta === -resolved.reduce((sum, finding) => sum + finding.count, 0),
    nonInventorySourceInputsUnchanged: Object.keys(baseline.sourceSha256)
        .filter(file => file !== 'apps/web/src/modules/inventory/index.tsx')
        .every(file => baseline.sourceSha256[file] === after.sourceSha256[file]),
};
const status = Object.values(checks).every(Boolean) ? 'PASS_LOCAL_PAIRED_RENDER_AND_SPACING_DELTA' : 'FAIL';
const result = {
    schemaVersion: 1,
    task: 'UI028.W12',
    status,
    browser: { name: baseline.browser.name, version: baseline.browser.version },
    captures: {
        baseline: 'render-before-source-edit-current-20261005.json',
        after: 'render-after-source-edit-current-20261005.json',
        seedMode: baseline.seedMode,
    },
    spacing: {
        checker: 'scripts/check-layout.mjs',
        globalBefore: baseline.layout.totalFindings,
        globalAfter: after.layout.totalFindings,
        globalDelta,
        inventoryBefore: baseline.layout.inventoryFindings.length,
        inventoryAfter: after.layout.inventoryFindings.length,
        resolved,
        newFindings,
        remainingGlobalGate: after.layout.status,
    },
    pageErrors: { before: baseline.pageErrors.length, after: after.pageErrors.length },
    pairedObservations: pairs,
    checks,
    limitation: 'Paired screenshots cover 390x844 and 1280x900. Responsive 320-1440 coverage is separately recorded by the Chromium/Firefox Playwright logs. SPC-046 design-system source enforcement is not yet implemented; see the separate VISUAL_SOURCE_REVIEW evidence.',
};
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, globalBefore: result.spacing.globalBefore,
    globalAfter: result.spacing.globalAfter, inventoryBefore: result.spacing.inventoryBefore,
    inventoryAfter: result.spacing.inventoryAfter, pairs: pairs.length, checks }, null, 2));
if (status !== 'PASS_LOCAL_PAIRED_RENDER_AND_SPACING_DELTA') process.exitCode = 1;
