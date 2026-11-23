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
});
