import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repo = path.resolve('..');
const frontend = process.cwd();
const dest = path.join(frontend, 'evidence/ui-zoom-capture-20261112/historical-source-recheck');
assert(!fs.existsSync(dest), 'Refusing to overwrite previous evidence');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-historical-recheck-'));
const snapshot = path.join(temp, 'snapshot');
fs.mkdirSync(snapshot);
const archive = path.join(temp, 'source.tar');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
assert.equal(head, '10c2505f4d32f04ffa8eb078616c14c450ff132c');
execFileSync('git', ['archive', '--format=tar', `--output=${archive}`, head, 'BotSalesAI_Frontend/apps/web', 'BotSalesAI_Frontend/packages', 'BotSalesAI_Frontend/scripts', 'BotSalesAI_Frontend/tests/session', 'BotSalesAI_Frontend/package.json', 'BotSalesAI_Frontend/package-lock.json', 'botsales-kit/contracts', 'botsales-kit/design', 'botsales-kit/fixtures'], { cwd: repo });
execFileSync('tar', ['-xf', archive, '-C', snapshot]);
const snapFE = path.join(snapshot, 'BotSalesAI_Frontend');
fs.symlinkSync(path.join(frontend, 'node_modules'), path.join(snapFE, 'node_modules'), 'junction');
const worker = 'apps/web/public/mockServiceWorker.js';
fs.copyFileSync(path.join(frontend, worker), path.join(snapFE, worker));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(path.join(frontend, file), 'utf8'));
const early = readJson('evidence/ui-accessibility-20261111/baseline-input-hashes.json');
const heading = readJson('evidence/ui-screen-reader-heading-20261111/baseline-input-hashes.json');
const customer = 'BotSalesAI_Frontend/apps/web/src/modules/customers/index.tsx';
const inbox = 'BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx';
const component = 'BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx';
const readme = 'BotSalesAI_Frontend/apps/web/src/shared/ui/README.md';
const customerHash = '5fbd1d4b05a3fa8394657a36aebcada43221e375ca92eb2c1a003b78076a4ac7';
const headingHash = 'f98ab9853913f06a28ce003dc33ae4414412229aab1c950fd5f4ef5304d9f8f1';
const source = file => fs.readFileSync(path.join(repo, file));
assert.equal(hash(source(customer)), customerHash);
assert.equal(hash(source(inbox)), heading[inbox]);
const oldComponent = fs.readFileSync(path.join(snapshot, component), 'utf8');
const needle = '<DialogTitle id={`${titleId}-heading`} sx=';
assert.equal(oldComponent.split(needle).length, 2);
const newComponent = Buffer.from(oldComponent.replace(needle, '<DialogTitle id={`${titleId}-heading`} aria-labelledby={titleId} sx='));
assert.equal(hash(newComponent), headingHash, 'Reconstructed heading source differs from later recorded hash');
const isInput = file => file.startsWith('BotSalesAI_Frontend/apps/web/src/') || file.startsWith('BotSalesAI_Frontend/packages/') || file.startsWith('botsales-kit/contracts/') || file.startsWith('botsales-kit/design/') || ['BotSalesAI_Frontend/package.json', 'BotSalesAI_Frontend/package-lock.json', 'BotSalesAI_Frontend/apps/web/vite.config.ts', 'BotSalesAI_Frontend/scripts/vite-cache.mjs', 'BotSalesAI_Frontend/tests/session/demo-server.mjs'].includes(file);
const scenarios = [
    { id: 'baseline', expected: early, changes: [] },
    { id: 'final', expected: { ...early, [customer]: customerHash }, changes: [customer] },
    { id: 'post-inbox', expected: heading, changes: [customer, inbox] },
    { id: 'screen-heading', expected: { ...heading, [component]: headingHash }, changes: [customer, inbox, component] },
];
fs.mkdirSync(dest, { recursive: true });
const all = [];
for (const scenario of scenarios) {
    for (const file of [customer, inbox, component]) {
        const target = path.join(snapshot, file);
        const bytes = scenario.changes.includes(file) ? (file === component ? newComponent : source(file)) : execFileSync('git', ['show', `${head}:${file}`], { cwd: repo });
        fs.writeFileSync(target, bytes);
    }
    const selected = Object.entries(scenario.expected).filter(([file]) => isInput(file) && file !== readme);
    const mismatches = selected.filter(([file, expected]) => !fs.existsSync(path.join(snapshot, file)) || hash(fs.readFileSync(path.join(snapshot, file))) !== expected).map(([file]) => file);
    assert.deepEqual(mismatches, [], `${scenario.id} fingerprint mismatch`);
    const scriptDir = path.join(snapFE, 'evidence/ui-zoom-capture-20261112');
    fs.mkdirSync(scriptDir, { recursive: true });
    const original = fs.readFileSync(path.join(frontend, 'evidence/ui-zoom-capture-20261112/diagnose-capture.mjs'), 'utf8');
    const script = original.replace("evidence/ui-zoom-capture-20261112/recapture-v5", `evidence/ui-zoom-capture-20261112/recheck-${scenario.id}`);
    assert.notEqual(script, original);
    fs.writeFileSync(path.join(scriptDir, 'diagnose-capture.mjs'), script);
    const run = spawnSync(process.execPath, ['evidence/ui-zoom-capture-20261112/diagnose-capture.mjs'], { cwd: snapFE, encoding: 'utf8', timeout: 150000, env: { ...process.env, BOTSALES_E2E_RUNTIME: 'dev' } });
    const resultDir = path.join(dest, scenario.id);
    fs.mkdirSync(resultDir);
    fs.writeFileSync(path.join(resultDir, 'run.log'), `exit=${run.status}\n${run.stdout || ''}\n${run.stderr || ''}\n${run.error || ''}`);
    const produced = path.join(scriptDir, `recheck-${scenario.id}`);
    if (fs.existsSync(produced)) for (const name of fs.readdirSync(produced)) fs.copyFileSync(path.join(produced, name), path.join(resultDir, name));
    const record = { id: scenario.id, matchedInputCount: selected.length, matchedInputs: Object.fromEntries(selected), exit: run.status, workerSha256: hash(source(`BotSalesAI_Frontend/${worker}`)), note: 'Recheck performed now with current installed dependencies and Chrome, not an original historical capture. Fingerprints cover listed inputs only.', temporarySnapshot: snapshot };
    all.push(record);
    fs.writeFileSync(path.join(dest, 'source-reconciliation.json'), `${JSON.stringify({ head, runs: all }, null, 2)}\n`);
    if (run.status !== 0) throw new Error(`${scenario.id} failed; see run.log`);
    console.log(`${scenario.id}: ${selected.length} inputs matched; capture exit ${run.status}`);
}
