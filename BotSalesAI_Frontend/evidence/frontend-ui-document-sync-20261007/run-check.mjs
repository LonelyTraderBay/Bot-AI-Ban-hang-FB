import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, '../..');
const repository = path.dirname(root);
const stage = process.argv[2];
if (!['verify', 'e2e', 'built-demo', 'finance', 'unit', 'contracts', 'layout', 'evidence-validator'].includes(stage)) throw new Error('Unknown check stage');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative = file => path.relative(repository, file).replaceAll('\\', '/');
function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isSymbolicLink() ? [] : entry.isDirectory() ? walk(file) : [file];
    });
}
const runtimeFiles = walk(path.join(root, 'apps/web/src')).concat(walk(path.join(root, 'packages')))
    .filter(file => !/[/\\](node_modules|dist)[/\\]/.test(file));
const before = Object.fromEntries(runtimeFiles.map(file => [relative(file), hash(file)]));
const verificationFiles = walk(path.join(root, 'tests')).concat(walk(path.join(root, 'scripts')))
    .filter(file => /\.(?:[cm]?js|tsx?|json)$/.test(file))
    .concat(['package.json', 'package-lock.json', 'playwright.config.ts', 'playwright.built-demo.config.ts', 'apps/web/tsconfig.json', 'apps/web/vite.config.ts'].map(file => path.join(root, file)));
const verificationBefore = Object.fromEntries(verificationFiles.map(file => [relative(file), hash(file)]));
const backup = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-evidence-preserve-'));
const preserved = ['e2e', 'built-demo'].includes(stage) ? [
    path.join(root, 'evidence'),
    path.join(repository, 'botsales-kit/execution/frontend-evidence'),
].flatMap(walk).filter(file => !file.startsWith(output + path.sep)).map((file, index) => {
    const saved = path.join(backup, String(index));
    fs.copyFileSync(file, saved);
    return { file, saved, sha256: hash(file) };
}) : [];
const nodeDirectory = path.dirname(process.execPath);
const npmCli = path.join(nodeDirectory, 'node_modules/npm/bin/npm-cli.js');
if (!fs.existsSync(npmCli)) throw new Error(`Locked-host npm CLI not found: ${npmCli}`);
const args = stage === 'built-demo'
    ? [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', '--config', 'playwright.built-demo.config.ts']
    : stage === 'finance'
    ? [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', 'tests/ui-finance-layout.spec.ts']
    : stage === 'unit' ? [npmCli, 'test', '--', '--reporter=verbose']
    : stage === 'contracts'
    ? ['--test', 'tests/ui-composition-checker.test.mjs', 'tests/ui-composition-ancestry.test.mjs', 'tests/ui-shared-api-contract.test.mjs']
    : stage === 'evidence-validator' ? ['--test', 'tests/ui-evidence-validator.test.mjs']
        : [npmCli, 'run', stage === 'e2e' ? 'test:e2e' : stage === 'layout' ? 'test:layout' : 'verify'];
const runId = `doc-sync-${Date.now()}-${process.pid}`;
const logFile = path.join(output, `${stage}.log`);
const log = fs.createWriteStream(logFile);
const startedAt = new Date().toISOString();
const gitExecutable = process.platform === 'win32'
    ? execFileSync(path.join(process.env.SystemRoot, 'System32/where.exe'), ['git.exe'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0]
    : undefined;
const env = { ...process.env, PATH: [nodeDirectory, path.join(root, 'node_modules/.bin'),
    ...(gitExecutable ? [path.dirname(gitExecutable)] : []), process.env.SystemRoot,
    ...(process.env.SystemRoot ? [path.join(process.env.SystemRoot, 'System32')] : [])].filter(Boolean).join(path.delimiter), BOTSALES_EVIDENCE_RUN_ID: runId };
const child = spawn(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => { log.write(bytes); process.stdout.write(bytes); });
let spawnError;
child.on('error', error => { spawnError = String(error); });
const exitCode = await new Promise(resolve => child.on('close', code => resolve(code ?? 1)));
await new Promise(resolve => log.end(resolve));
const changedHistorical = [];
for (const entry of preserved) {
    if (!fs.existsSync(entry.file) || hash(entry.file) !== entry.sha256) {
        if (fs.existsSync(entry.file)) {
            const captured = path.join(output, 'browser-artifacts', relative(entry.file));
            fs.mkdirSync(path.dirname(captured), { recursive: true });
            fs.copyFileSync(entry.file, captured);
            changedHistorical.push({ path: relative(entry.file), captured: relative(captured), sha256: hash(captured) });
        }
        fs.copyFileSync(entry.saved, entry.file);
    }
}
const runtimeDrift = Object.keys(before).filter(file => !fs.existsSync(path.join(repository, file)) || hash(path.join(repository, file)) !== before[file]);
const verificationDrift = Object.keys(verificationBefore).filter(file => !fs.existsSync(path.join(repository, file)) || hash(path.join(repository, file)) !== verificationBefore[file]);
const restorationFailures = preserved.filter(entry => !fs.existsSync(entry.file) || hash(entry.file) !== entry.sha256).map(entry => relative(entry.file));
const record = { stage, runId, startedAt, finishedAt: new Date().toISOString(), executable: process.execPath, args, cwd: root, exitCode, spawnError, sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(), runtimeSourceFingerprints: before, runtimeDrift, verificationSourceFingerprints: verificationBefore, verificationDrift, historicalFilesPreserved: preserved.length, changedHistorical, restorationFailures, temporaryBackup: backup, log: { path: relative(logFile), sha256: hash(logFile) } };
record.environment = { PATH: env.PATH, gitExecutable };
fs.writeFileSync(path.join(output, `${stage}-record.json`), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ stage, exitCode, runtimeDrift, changedHistorical: changedHistorical.length, restorationFailures }));
process.exitCode = exitCode || (runtimeDrift.length || verificationDrift.length || restorationFailures.length ? 1 : 0);
