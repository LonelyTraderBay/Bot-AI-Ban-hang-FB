import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const readJson = async name => JSON.parse(await readFile(path.join(here, name), 'utf8'));
const before = await readJson('dashboard-states-chromium.json');
const after = await readJson('dashboard-states-after-chromium.json');
const provenance = await readJson('baseline-provenance.json');
const widths = [390, 768, 1279, 1280, 1440, 1920];
const expectedRoles = ['owner', 'sales', 'viewer'];
assert.deepEqual(before.widths, widths);
assert.deepEqual(after.widths, widths);
assert.equal(after.gitHead, provenance.beforeSourceCommit);
assert.equal(after.browserVersion, provenance.afterBrowserVersion);
assert.match(before.source, /actual Chrome/);
assert.match(after.source, /simulation/i);
assert.equal(provenance.beforeSourceFiles['apps/web/src/modules/dashboard/index.tsx'].sha256, '690ab38c5282bb5d8368a16ea4efbd8791ff9ba2e4107cf7ff1f7e737705baca');
assert.ok(provenance.afterSourceFiles['apps/web/src/modules/dashboard/index.tsx']);
assert.notEqual(provenance.beforeSourceFiles['apps/web/src/modules/dashboard/index.tsx'].sha256, provenance.afterSourceFiles['apps/web/src/modules/dashboard/index.tsx']);

function validateCommon(label, rows) {
    assert.deepEqual(rows.map(row => row.viewport), widths, `${label}: viewport coverage`);
    for (const row of rows) {
        assert.ok(row.documentScrollWidth <= row.viewport, `${label} ${row.viewport}: horizontal overflow`);
        assert.equal(row.sameRowChildren.length, 1, `${label} ${row.viewport}: unexpected same-row peer`);
        assert.equal(row.sameRowChildren[0].title, 'Dòng tiền và doanh thu');
    }
}

function validateBefore(label, rows) {
    validateCommon(label, rows);
    for (const row of rows) {
        if (row.viewport < 1280) assert.ok(row.unusedWidthAfterFinance <= 1, `${label} ${row.viewport}: expected one track below XL`);
        else assert.ok(row.unusedWidthAfterFinance > 300, `${label} ${row.viewport}: baseline second track was not measured`);
    }
}

function validateAfter(label, rows) {
    validateCommon(label, rows);
    for (const row of rows) {
        assert.ok(row.unusedWidthAfterFinance <= 1, `${label} ${row.viewport}: source still leaves unused row width`);
        assert.ok(Math.abs(row.finance.width - row.grid.width) <= 1, `${label} ${row.viewport}: Panel must fill the only source track`);
        assert.equal(row.grid.columns.split(' ').length, 1, `${label} ${row.viewport}: source must have one track`);
    }
}

const checks = [];
for (const [mode, state] of Object.entries(before.states)) {
    validateBefore(`${mode} before`, state.measurements);
    validateAfter(`${mode} DOM simulation`, state.candidateSingleColumn.measurements);
    assert.deepEqual(state.pageErrors, [], `${mode} before page errors`);
    if (mode === 'pending') assert.ok(state.statuses.includes('Đang tải số liệu tài chính…'));
    if (mode === 'error') assert.ok(state.alerts.some(alert => alert.includes('Không thể tải số liệu tài chính.')));
    if (mode === 'empty') assert.match(state.financeText, /0 ₫/);
    if (mode === 'long-money') assert.match(state.financeText, /987\.654\.321/);
    const observedAfter = after.states[mode];
    assert.ok(observedAfter, `${mode}: missing post-change browser run`);
    validateAfter(`${mode} source after`, observedAfter.measurements);
    assert.deepEqual(observedAfter.pageErrors, [], `${mode} after page errors`);
    checks.push(`${mode}: before, DOM candidate and actual source after measured at 6/6 widths; no overflow/pageerror`);
}

assert.deepEqual(before.permissionProfiles.map(profile => profile.role), expectedRoles);
assert.deepEqual(after.permissionProfiles.map(profile => profile.role), expectedRoles);
for (let index = 0; index < expectedRoles.length; index++) {
    const oldProfile = before.permissionProfiles[index];
    const newProfile = after.permissionProfiles[index];
    assert.equal(oldProfile.role, newProfile.role);
    assert.equal(oldProfile.financeRead, oldProfile.role === 'owner');
    assert.equal(newProfile.financeRead, oldProfile.role === 'owner');
    assert.equal(oldProfile.operationsRead, newProfile.operationsRead);
    assert.equal(oldProfile.ordersRead, newProfile.ordersRead);
    assert.equal(oldProfile.ordersWrite, newProfile.ordersWrite);
    validateBefore(`${oldProfile.role} before`, oldProfile.measurements);
    validateAfter(`${newProfile.role} actual source after`, newProfile.measurements);
    assert.ok(newProfile.visibleDashboardHeadings.some(heading => heading.includes('Đơn hàng gần đây')));
    assert.deepEqual(newProfile.pageErrors, [], `${newProfile.role}: after page errors`);
    checks.push(`${oldProfile.role}: same permission/content profile before and after; source geometry measured at 6/6 widths`);
}

const old1440 = before.states.ready.measurements.find(row => row.viewport === 1440);
const simulated1440 = before.states.ready.candidateSingleColumn.measurements.find(row => row.viewport === 1440);
const new1440 = after.states.ready.measurements.find(row => row.viewport === 1440);
assert.ok(Math.abs(old1440.unusedWidthAfterFinance - 452.9375) < 0.01);
assert.ok(Math.abs(simulated1440.unusedWidthAfterFinance) < 0.01);
assert.ok(Math.abs(new1440.unusedWidthAfterFinance) < 0.01);
assert.ok(Math.abs(new1440.finance.width - 1152) < 0.01);
const measurementSha256 = createHash('sha256').update(await readFile(path.join(here, 'dashboard-states-after-chromium.json'))).digest('hex');
console.log(JSON.stringify({ status: 'PASS', browser: after.browserVersion, viewports: widths, stateProfiles: Object.keys(before.states).length, permissionProfiles: expectedRoles, checks, beforeUnusedAt1440: old1440.unusedWidthAfterFinance, afterPanelWidthAt1440: new1440.finance.width, afterUnusedAt1440: new1440.unusedWidthAfterFinance, afterMeasurementSha256: measurementSha256 }, null, 2));
