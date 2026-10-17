import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const inventoryPath = path.join(here, 'gate-inventory-current.json');
const digest = value => createHash('sha256').update(value).digest('hex');
const raw = await readFile(inventoryPath, 'utf8');
const inventory = JSON.parse(raw);
assert.equal(inventory.task, 'UIC09');
assert.equal(inventory.files.length, 36, 'The measured UIC09 inventory must retain all 36 declared files.');

const changed = [];
for (const entry of inventory.files) {
    const absolute = path.resolve(repositoryRoot, entry.path);
    const content = await readFile(absolute);
    const current = digest(content);
    if (current !== entry.sha256) changed.push(entry.path);
    entry.sha256 = current;
}
assert.deepEqual(changed, [], 'The committed UIC09 inventory must already match every file in the current UIC08 base.');

const checkedRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
const uic07Revision = execFileSync('git', ['log', '-1', '--format=%H', '--grep=Ổn định luồng FE022 Task: UIC07', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
assert.match(uic07Revision, /^[0-9a-f]{40}$/, 'Could not resolve the corrective UIC07 commit from current history.');
const uic07Message = execFileSync('git', ['show', '-s', '--format=%s', uic07Revision], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
assert.match(uic07Message, /Ổn định luồng FE022/);
inventory.testedRevision = checkedRevision;
inventory.uic07CorrectiveRevision = uic07Revision;
inventory.recordedAtUtc = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2).replaceAll('\n', newline)}${newline}`, 'utf8');

const refreshed = JSON.parse(await readFile(inventoryPath, 'utf8'));
for (const entry of refreshed.files) {
    assert.equal(digest(await readFile(path.resolve(repositoryRoot, entry.path))), entry.sha256, `Inventory fingerprint is stale: ${entry.path}`);
}
console.log(JSON.stringify({ inventory: path.relative(repositoryRoot, inventoryPath).replaceAll(path.sep, '/'), files: refreshed.files.length, refreshedPaths: changed, testedRevision: refreshed.testedRevision, uic07CorrectiveRevision: refreshed.uic07CorrectiveRevision, status: 'PASS', recordedAtUtc: refreshed.recordedAtUtc }, null, 2));
