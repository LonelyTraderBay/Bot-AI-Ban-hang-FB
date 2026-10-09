import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '../..'), repository = path.dirname(root);
const stage = process.argv[2];
const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const commands = {
    generate: [npmCli, 'run', 'generate:check'], verify: [npmCli, 'run', 'verify'],
    e2e: [npmCli, 'run', 'test:e2e'], unit: [npmCli, 'test', '--', '--reporter=verbose'],
    regression: ['node_modules/@playwright/test/cli.js', 'test', 'tests/frontend-corrections.spec.ts', '--reporter=line'],
    'fulfillment-regression': ['node_modules/@playwright/test/cli.js', 'test', 'tests/fe013.spec.ts', '--reporter=line'],
    'legacy-regression': ['node_modules/@playwright/test/cli.js', 'test', 'tests/fe009.spec.ts', 'tests/fe010.spec.ts', 'tests/fe012.spec.ts', '--grep', 'stale version|412 conflict|category lookup|stale-version 412', '--reporter=line'],
    'recovery-regression': ['node_modules/@playwright/test/cli.js', 'test', 'tests/fe015.spec.ts', 'tests/fe016.spec.ts', '--grep', 'unknown journal|unknown send', '--reporter=line'],
    'startup-regression': ['node_modules/@playwright/test/cli.js', 'test', 'tests/accessibility/routes.spec.ts', 'tests/frontend-corrections.spec.ts', '--grep', 'all canonical routes|F06 guards added', '--reporter=line'],
    'built-demo': ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.built-demo.config.ts'],
    'build-demo': [npmCli, 'run', 'build:demo'],
    contracts: ['--test', 'tests/ui-composition-checker.test.mjs', 'tests/ui-composition-ancestry.test.mjs', 'tests/ui-shared-api-contract.test.mjs'],
    'source-maps': ['--test', ...fs.readdirSync(path.join(root, 'tests')).filter(file => /-source-map\.test\.mjs$/.test(file)).sort().map(file => 'tests/' + file)],
    layout: [npmCli, 'run', 'test:layout'], 'evidence-validator': ['--test', 'tests/ui-evidence-validator.test.mjs'],
};
if (!commands[stage]) throw new Error('Unknown stage ' + stage);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isSymbolicLink() || entry.name === 'node_modules' ? [] : entry.isDirectory() ? walk(file) : [file];
});
const inputs = ['apps/web/src', 'apps/web/tests', 'packages', 'scripts', 'tests'].flatMap(directory => walk(path.join(root, directory)))
    .concat(['package.json', 'package-lock.json', 'playwright.config.ts', 'playwright.built-demo.config.ts', 'apps/web/vite.config.ts', 'apps/web/tsconfig.json', 'apps/web/vitest.config.ts'].map(file => path.join(root, file)))
    .filter(file => !/[/\\](?:dist|dist-demo|\.vite)[/\\]/.test(file));
const fingerprints = () => Object.fromEntries(inputs.map(file => [path.relative(repository, file).replaceAll('\\', '/'), hash(file)]));
const before = fingerprints();
const runId = `corrections-${Date.now()}-${process.pid}`, output = path.join(import.meta.dirname, 'runs', runId);
fs.mkdirSync(output, { recursive: true });
const preserve = ['e2e', 'built-demo', 'regression', 'fulfillment-regression', 'legacy-regression', 'recovery-regression', 'startup-regression'].includes(stage);
const temporary = preserve ? fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-corrections-preserve-')) : null;
const saved = preserve ? ['evidence', '../botsales-kit/execution/frontend-evidence'].flatMap(directory => walk(path.resolve(root, directory)))
    .filter(file => !file.startsWith(import.meta.dirname + path.sep)).map((file, index) => {
        const backup = path.join(temporary, String(index)); fs.copyFileSync(file, backup); return { file, backup, sha256: hash(file) };
    }) : [];
const env = { ...process.env, PATH: [path.dirname(process.execPath), path.join(root, 'node_modules/.bin'), 'C:/Program Files/Git/cmd', process.env.SystemRoot, path.join(process.env.SystemRoot, 'System32')].join(path.delimiter), BOTSALES_EVIDENCE_RUN_ID: runId };
const logFile = path.join(output, stage + '.log'), log = fs.createWriteStream(logFile), startedAt = new Date().toISOString();
const child = spawn(process.execPath, commands[stage], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => { log.write(bytes); process.stdout.write(bytes); });
let spawnError; child.on('error', error => { spawnError = String(error); });
const exitCode = await new Promise(resolve => child.on('close', code => resolve(code ?? 1)));
await new Promise(resolve => log.end(resolve));
const historicalChanges = [];
for (const entry of saved) {
    if (!fs.existsSync(entry.file) || hash(entry.file) !== entry.sha256) {
        const captured = path.join(output, 'browser-artifacts', path.relative(repository, entry.file));
        if (fs.existsSync(entry.file)) { fs.mkdirSync(path.dirname(captured), { recursive: true }); fs.copyFileSync(entry.file, captured); historicalChanges.push({ path: path.relative(repository, entry.file).replaceAll('\\', '/'), captured: path.relative(repository, captured).replaceAll('\\', '/'), sha256: hash(captured) }); }
        fs.copyFileSync(entry.backup, entry.file);
    }
}
const sourceDrift = Object.entries(before).filter(([file, digest]) => !fs.existsSync(path.join(repository, file)) || hash(path.join(repository, file)) !== digest).map(([file]) => file);
const record = { stage, runId, startedAt, finishedAt: new Date().toISOString(), cwd: root, executable: process.execPath, args: commands[stage], environment: { PATH: env.PATH }, exitCode, spawnError, HEAD: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(), sourceFingerprints: before, sourceDrift, historicalChanges, preserved: saved.length, log: { path: path.relative(repository, logFile).replaceAll('\\', '/'), sha256: hash(logFile) } };
const recordPath = path.join(output, stage + '-record.json'); fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
fs.writeFileSync(path.join(import.meta.dirname, stage + '-latest.json'), JSON.stringify({ record: path.relative(repository, recordPath).replaceAll('\\', '/') }, null, 2) + '\n');
console.log(JSON.stringify({ stage, exitCode, sourceDrift, record: recordPath }));
process.exitCode = exitCode || (sourceDrift.length ? 1 : 0);
