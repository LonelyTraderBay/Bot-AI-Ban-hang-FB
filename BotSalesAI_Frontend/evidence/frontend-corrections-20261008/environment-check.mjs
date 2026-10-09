import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const frontend = path.resolve(import.meta.dirname, '../..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(frontend, file))).digest('hex');
const protectedFiles = ['package.json', 'package-lock.json', 'apps/web/package.json', '.node-version', '.npmrc', '.env.local', 'apps/web/public/mockServiceWorker.js'];
const before = Object.fromEntries(protectedFiles.filter(file => fs.existsSync(path.join(frontend, file))).map(file => [file, hash(file)]));
const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const env = { ...process.env, PATH: [path.dirname(process.execPath), path.join(frontend, 'node_modules/.bin'), 'C:/Windows/System32', 'C:/Windows', 'C:/Program Files/Git/cmd'].join(path.delimiter) };
const runs = [];
for (const args of [['--version'], ['--script-shell=cmd.exe', 'install'], ['ls', '--depth=0'], ['run', 'setup'], ['run', 'doctor'], ['audit', '--audit-level=low']]) {
    const startedAt = new Date().toISOString();
    const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: frontend, env, encoding: 'utf8', windowsHide: true });
    const log = path.join(import.meta.dirname, `environment-${runs.length + 1}.log`);
    fs.writeFileSync(log, (result.stdout || '') + (result.stderr || ''));
    const exitCode = result.status ?? 1;
    runs.push({ executable: process.execPath, args: [npmCli, ...args], cwd: frontend, startedAt, finishedAt: new Date().toISOString(), exitCode, log: { path: path.relative(path.dirname(frontend), log).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(log)).digest('hex') } });
    if (exitCode) throw new Error(`Environment check failed: ${args.join(' ')}; see ${log}`);
}
const drift = Object.keys(before).filter(file => before[file] !== hash(file));
fs.writeFileSync(path.join(import.meta.dirname, 'environment-current.json'), JSON.stringify({ node: process.version, npm: fs.readFileSync(path.join(import.meta.dirname, 'environment-1.log'), 'utf8').trim(), before, runs, drift }, null, 2) + '\n');
if (drift.length) throw new Error('Unexpected environment source drift: ' + drift.join(', '));
console.log('Install, dependency tree, setup, doctor and audit passed; manifests, lock, existing environment and worker unchanged.');
