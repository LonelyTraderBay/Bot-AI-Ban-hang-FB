import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const hashes = { core: /^[a-f0-9]{32}$/, external: /^[a-f0-9]{64}$/ };
const core = ['stock_positions', 'stock_movements', 'finance_journals', 'finance_lines', 'file_objects', 'file_blobs', 'outbox',
    'consents', 'customer_tombstones', 'migration_checksums'];
const tenantState = ['shops', 'memberships', 'products', 'variants', 'customers', 'sales_orders', 'audit_entries'];
const orderState = [...core, ...tenantState, 'order_lines'];
const fulfillmentState = [...orderState, 'shipments', 'shipment_lines'];
const requiredByFormat = new Map([
    [2, core],
    [3, [...core, ...tenantState]],
    [4, orderState],
    [5, fulfillmentState],
    [6, [...fulfillmentState, 'work_items', 'work_notification_schedules', 'service_cases', 'evaluations', 'advertising_estimates']],
]);
const external = ['messenger_receipts', 'messenger_dispatches', 'ai_approvals', 'ai_inbound_runs', 'ai_daily_usage',
    'purchase_dispatches', 'purchase_evidence', 'notification_deliveries', 'notification_devices', 'telegram_pairings', 'carrier_events']
    .map(component => 'external/' + component);
const integrity = ['stockBalanceMismatches', 'unbalancedJournals', 'fileIntegrityMismatches'];
const ledgerStatus = /^(commands|jobs)\/(accepted|running|unknown|succeeded|failed|queued|awaiting_confirmation|partial|cancelled)$/;
const count = value => Number.isSafeInteger(value) && value >= 0;

function observations(rows, required, hash, optional = () => false) {
    if (!Array.isArray(rows)) throw new Error();
    const seen = new Map();
    for (const row of rows) {
        const { component, snapshot, records } = row;
        if (typeof component !== 'string' || !(required.includes(component) || optional(component)) || seen.has(component) ||
            typeof snapshot !== 'string' || !hash.test(snapshot) || !count(records)) throw new Error();
        seen.set(component, { snapshot, records });
    }
    if (!required.every(component => seen.has(component))) throw new Error();
    return seen;
}

function parse(bytes) {
    if (bytes.length > 65536) throw new Error();
    const report = JSON.parse(bytes.toString('utf8'));
    const required = requiredByFormat.get(report?.format);
    if (!required || typeof report.databaseFingerprint !== 'string' || !hashes.external.test(report.databaseFingerprint) ||
        !integrity.every(key => count(report[key]))) throw new Error();
    const rows = new Map([
        ...observations(report.observations, required, hashes.core, component => ledgerStatus.test(component)),
        ...observations(report.externalEffects, external, hashes.external),
    ]);
    return { format: report.format, databaseFingerprint: report.databaseFingerprint, rows, integrity: integrity.filter(key => report[key] !== 0) };
}

try {
    const [sourceFile, restoredFile, expected, extra] = process.argv.slice(2);
    if (!sourceFile || !restoredFile || !hashes.external.test(expected ?? '') || extra !== undefined) throw new Error();
    const sourceBytes = readFileSync(sourceFile);
    if (sha256(sourceBytes) !== expected) throw new Error();
    const restoredBytes = readFileSync(restoredFile);
    const source = parse(sourceBytes);
    const restored = parse(restoredBytes);
    if (source.format !== restored.format || source.databaseFingerprint === restored.databaseFingerprint) throw new Error();
    const components = new Set([...source.rows.keys(), ...restored.rows.keys()]);
    const mismatches = [...components].filter(component => {
        const before = source.rows.get(component);
        const after = restored.rows.get(component);
        return before?.records !== after?.records || before?.snapshot !== after?.snapshot;
    }).sort();
    const attention = mismatches.length > 0 || source.integrity.length > 0 || restored.integrity.length > 0;
    console.log(JSON.stringify({ status: attention ? 'ATTENTION' : 'SNAPSHOT_MATCHED', sourceReportSha256: expected,
        restoredReportSha256: sha256(restoredBytes), sourceDatabaseFingerprint: source.databaseFingerprint,
        restoredDatabaseFingerprint: restored.databaseFingerprint, checkedComponents: components.size, mismatches,
        sourceIntegrityIssues: source.integrity, restoredIntegrityIssues: restored.integrity }));
    if (attention) process.exitCode = 2;
} catch {
    console.log(JSON.stringify({ status: 'UNAVAILABLE', reason: 'Provide two reports of the same supported format (2 through 6) from separate database instances and the verified source report SHA-256.' }));
    process.exitCode = 1;
}
