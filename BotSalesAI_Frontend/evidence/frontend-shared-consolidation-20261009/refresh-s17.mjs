import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const frontend = path.resolve(import.meta.dirname, '../..'), repository = path.dirname(frontend);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const target = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const previous = read(target), archive = path.join(import.meta.dirname, 'S17-before-shared.json');
const previousSha256 = hash(target);
if (!fs.existsSync(archive)) fs.copyFileSync(target, archive);
const checks = [], coverage = [], fingerprints = {};
for (const stage of ['contracts', 'layout', 'evidence-validator']) {
    const pointer = read(path.join(import.meta.dirname, stage + '-latest.json'));
    const record = read(path.join(repository, pointer.record));
    if (record.exitCode || record.sourceDrift.length || hash(path.join(repository, record.log.path)) !== record.log.sha256) throw new Error('Invalid execution: ' + stage);
    for (const [file, digest] of Object.entries(record.sourceFingerprints)) if (hash(path.join(repository, file)) !== digest) throw new Error('Stale execution: ' + file);
    const log = fs.readFileSync(path.join(repository, record.log.path), 'utf8');
    const passed = Number(log.match(/(?:#|ℹ)\s+pass (\d+)/)?.[1]);
    const total = Number(log.match(/(?:#|ℹ)\s+tests (\d+)/)?.[1]);
    if (!passed || passed !== total || !/(?:#|ℹ)\s+fail 0\b/.test(log)) throw new Error('Incomplete fixtures: ' + stage);
    const observed = `${passed}/${total} fixtures PASS`;
    checks.push({ id: stage, command: record.executable + ' ' + record.args.join(' '), exitCode: 0, result: 'PASS', expected: observed, observed, log: record.log });
    coverage.push({ name: stage, expected: total, observed: passed, missing: 0, result: 'COMPLETE' });
    Object.assign(fingerprints, record.sourceFingerprints);
}
fs.writeFileSync(target, JSON.stringify({ ...previous, recordedAt: new Date().toISOString(), checks, coverage, sourceFingerprints: fingerprints }, null, 2) + '\n');
fs.writeFileSync(path.join(import.meta.dirname, 'S17-publication-current.json'), JSON.stringify({
    publishedAt: new Date().toISOString(), target: path.relative(repository, target).replaceAll('\\', '/'),
    previousSha256, currentSha256: hash(target), checks,
    reason: 'Intentional current S17 publication from actual fresh contract/layout/evidence-validator executions after scoped browser wrappers close, before final verify/full. Exact browser byte preservation is checked after the final full and built-demo wrappers close.'
}, null, 2) + '\n');
console.log('Refreshed scoped S17 from actual current source and fixture runs; prior manifest archived.');
