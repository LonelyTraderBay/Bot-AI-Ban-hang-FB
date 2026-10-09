import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Keep the current domain proof already referenced by canonical receipts.
// Capture the newly produced report separately and retain the actual exit code.
const output = import.meta.dirname, frontend = path.resolve(output, '../..'), repository = path.dirname(frontend);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative = file => path.relative(repository, file).replaceAll('\\', '/');
const domainFile = path.join(frontend, 'evidence/domain-tests.json');
const original = fs.readFileSync(domainFile);
const run = path.join(output, 'runs', 'final-verify-preserve-' + Date.now()); fs.mkdirSync(run);
const before = path.join(run, 'domain-before.json'), after = path.join(run, 'domain-produced.json');
fs.writeFileSync(before, original);
const startedAt = new Date().toISOString(), args = ['evidence/frontend-toolbar-20261008/run-checks.mjs', 'verify'];
let result;
try {
    result = spawnSync(process.execPath, args, { cwd: frontend, windowsHide: true, stdio: 'inherit' });
    fs.copyFileSync(domainFile, after);
} finally {
    fs.writeFileSync(domainFile, original);
}
const pointer = read(path.join(output, 'verify-latest.json')), verification = read(path.join(repository, pointer.record));
const produced = read(after), freshExecution = Date.parse(verification.startedAt) >= Date.parse(startedAt);
const record = {
    scope: 'Actual final verify plus byte preservation of an existing current domain proof; no result substitution.',
    startedAt, finishedAt: new Date().toISOString(), executable: process.execPath, args, cwd: frontend,
    exitCode: result?.status ?? 1, spawnError: result?.error?.message, freshExecution,
    verificationRecord: pointer.record, sourceDrift: verification.sourceDrift,
    original: { path: relative(before), sha256: hash(before) }, produced: { path: relative(after), sha256: hash(after) },
    originalRestored: hash(domainFile) === hash(before),
    producedResult: { status: produced.status, simulator: produced.checks.length, network: produced.network.checks.length },
    limits: 'The preserved artifact is a prior successful execution on the same runtime source. The new report and final raw log are retained in full, including any failure. This wrapper never converts a failing verify into PASS.',
};
fs.writeFileSync(path.join(run, 'preservation-record.json'), JSON.stringify(record, null, 2) + '\n');
fs.writeFileSync(path.join(output, 'final-verify-preservation.json'), JSON.stringify(record, null, 2) + '\n');
const success = record.exitCode === 0 && freshExecution && verification.exitCode === 0 && !record.sourceDrift.length && record.originalRestored && produced.status === 'PASS' && produced.network.status === 'PASS' && produced.checks.length === 75 && produced.network.checks.length === 13 && [...produced.checks, ...produced.network.checks].every(item => item.status === 'PASS');
console.log(JSON.stringify({ finalVerify: verification.exitCode, originalDomainProofRestored: record.originalRestored, producedDomain: record.producedResult, result: success ? 'PASS' : 'FAIL' }));
process.exitCode = success ? 0 : 1;
