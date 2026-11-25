import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const core = ['stock_positions', 'stock_movements', 'finance_journals', 'finance_lines', 'file_objects', 'file_blobs', 'outbox',
    'consents', 'customer_tombstones', 'migration_checksums', 'commands/unknown', 'jobs/awaiting_confirmation'];
const outside = ['messenger_receipts', 'messenger_dispatches', 'ai_approvals', 'ai_inbound_runs', 'ai_daily_usage',
    'purchase_dispatches', 'purchase_evidence', 'notification_deliveries', 'notification_devices', 'telegram_pairings', 'carrier_events'];

test('restore comparison pins evidence and catches changed provider state with unchanged row counts', t => {
    const folder = mkdtempSync(join(tmpdir(), 'botsales-restore-evidence-'));
    const sourceFile = join(folder, 'source.json');
    const targetFile = join(folder, 'target.json');
    t.after(() => {
        for (const file of [sourceFile, targetFile]) unlinkSync(file);
        rmdirSync(folder);
    });
    const source = { format: 2, databaseFingerprint: 'a'.repeat(64), stockBalanceMismatches: 0, unbalancedJournals: 0, fileIntegrityMismatches: 0,
        observations: core.map(component => ({ component, records: 1, snapshot: 'a'.repeat(32) })),
        externalEffects: outside.map(component => ({ component: 'external/' + component, records: 1, snapshot: 'b'.repeat(64) })) };
    const bytes = JSON.stringify(source);
    const digest = createHash('sha256').update(bytes).digest('hex');
    writeFileSync(sourceFile, bytes);
    const target = { ...source, databaseFingerprint: 'e'.repeat(64) };
    const compare = (target, expected = digest) => {
        writeFileSync(targetFile, JSON.stringify(target));
        const run = spawnSync(process.execPath, ['infra/backup/check-restore-evidence.mjs', sourceFile, targetFile, expected],
            { encoding: 'utf8', timeout: 8000 });
        assert.ifError(run.error);
        assert.equal(run.stderr, '');
        return { code: run.status, report: JSON.parse(run.stdout) };
    };

    const matched = compare({ ...target, observations: source.observations.toReversed() });
    assert.deepEqual([matched.code, matched.report.status, matched.report.checkedComponents], [0, 'SNAPSHOT_MATCHED', 23]);
    assert.deepEqual(matched.report.mismatches, []);

    const modified = structuredClone(target);
    modified.externalEffects.find(row => row.component === 'external/ai_inbound_runs').snapshot = 'c'.repeat(64);
    modified.unbalancedJournals = 1;
    const drift = compare(modified);
    assert.deepEqual([drift.code, drift.report.status], [2, 'ATTENTION']);
    assert.deepEqual(drift.report.mismatches, ['external/ai_inbound_runs']);
    assert.deepEqual(drift.report.restoredIntegrityIssues, ['unbalancedJournals']);

    assert.equal(compare(source).code, 1);
    assert.equal(compare(target, '0'.repeat(64)).code, 1);
    assert.equal(compare({ ...target, format: 1 }).code, 1);
    assert.equal(compare({ ...target, externalEffects: source.externalEffects.slice(1) }).code, 1);
    assert.equal(compare({ ...target, externalEffects: [...source.externalEffects, source.externalEffects[0]] }).code, 1);

    const tenantState = ['shops', 'memberships', 'products', 'variants', 'customers', 'sales_orders', 'audit_entries'];
    const current = { ...source, format: 3, observations: [
        ...source.observations, ...tenantState.map(component => ({ component, records: 2, snapshot: 'a'.repeat(32) })),
    ] };
    const currentBytes = JSON.stringify(current);
    const currentHash = createHash('sha256').update(currentBytes).digest('hex');
    writeFileSync(sourceFile, currentBytes);
    const restored = { ...current, databaseFingerprint: target.databaseFingerprint };
    assert.equal(compare(restored, currentHash).report.checkedComponents, 30);
    assert.equal(compare(target, currentHash).code, 1);
    assert.equal(compare({ ...restored, observations: restored.observations.slice(0, -1) }, currentHash).code, 1);
    const changed = structuredClone(restored);
    changed.observations.find(row => row.component === 'memberships').snapshot = 'c'.repeat(32);
    const scopeDrift = compare(changed, currentHash);
    assert.equal(scopeDrift.code, 2);
    assert.deepEqual(scopeDrift.report.mismatches, ['memberships']);

    const withOrderLines = {
        ...current, format: 4,
        observations: [...current.observations, { component: 'order_lines', records: 2, snapshot: 'a'.repeat(32) }],
    };
    const orderLineBytes = JSON.stringify(withOrderLines);
    const orderLineHash = createHash('sha256').update(orderLineBytes).digest('hex');
    writeFileSync(sourceFile, orderLineBytes);
    const restoredWithOrderLines = { ...withOrderLines, databaseFingerprint: target.databaseFingerprint };
    const matchedOrderLines = compare(restoredWithOrderLines, orderLineHash);
    assert.deepEqual([matchedOrderLines.code, matchedOrderLines.report.checkedComponents], [0, 31]);
    assert.equal(compare(restored, orderLineHash).code, 1);
    assert.equal(compare({ ...restoredWithOrderLines, observations: restored.observations }, orderLineHash).code, 1);
    const changedOrderLines = structuredClone(restoredWithOrderLines);
    changedOrderLines.observations.find(row => row.component === 'order_lines').snapshot = 'c'.repeat(32);
    const orderLineDrift = compare(changedOrderLines, orderLineHash);
    assert.deepEqual([orderLineDrift.code, orderLineDrift.report.mismatches], [2, ['order_lines']]);

    const withShipments = {
        ...withOrderLines, format: 5, observations: [
            ...withOrderLines.observations,
            { component: 'shipments', records: 2, snapshot: 'a'.repeat(32) },
            { component: 'shipment_lines', records: 3, snapshot: 'b'.repeat(32) },
        ],
    };
    const shipmentBytes = JSON.stringify(withShipments);
    const shipmentHash = createHash('sha256').update(shipmentBytes).digest('hex');
    writeFileSync(sourceFile, shipmentBytes);
    const restoredShipments = { ...withShipments, databaseFingerprint: target.databaseFingerprint };
    const matchedShipments = compare(restoredShipments, shipmentHash);
    assert.deepEqual([matchedShipments.code, matchedShipments.report.checkedComponents], [0, 33]);
    assert.equal(compare(restoredWithOrderLines, shipmentHash).code, 1);
    const changedShipments = structuredClone(restoredShipments);
    changedShipments.observations.find(row => row.component === 'shipment_lines').snapshot = 'd'.repeat(32);
    const shipmentDrift = compare(changedShipments, shipmentHash);
    assert.deepEqual([shipmentDrift.code, shipmentDrift.report.mismatches], [2, ['shipment_lines']]);
    assert.equal(compare({ ...restoredShipments, observations: restoredShipments.observations.slice(0, -1) }, shipmentHash).code, 1);

    const operations = ['work_items', 'work_notification_schedules', 'service_cases', 'evaluations', 'advertising_estimates'];
    const withOperations = { ...withShipments, format: 6, observations: [
        ...withShipments.observations,
        ...operations.map(component => ({ component, records: 2, snapshot: 'a'.repeat(32) })),
    ] };
    const operationBytes = JSON.stringify(withOperations);
    const operationHash = createHash('sha256').update(operationBytes).digest('hex');
    writeFileSync(sourceFile, operationBytes);
    const restoredOperations = { ...withOperations, databaseFingerprint: target.databaseFingerprint };
    const matchedOperations = compare(restoredOperations, operationHash);
    assert.deepEqual([matchedOperations.code, matchedOperations.report.checkedComponents], [0, 38]);
    assert.equal(compare(restoredShipments, operationHash).code, 1);
    for (const component of operations) {
        const changed = structuredClone(restoredOperations);
        changed.observations.find(row => row.component === component).snapshot = 'f'.repeat(32);
        const drift = compare(changed, operationHash);
        assert.deepEqual([drift.code, drift.report.mismatches], [2, [component]]);
        const missing = restoredOperations.observations.filter(row => row.component !== component);
        assert.equal(compare({ ...restoredOperations, observations: missing }, operationHash).code, 1);
    }
});
