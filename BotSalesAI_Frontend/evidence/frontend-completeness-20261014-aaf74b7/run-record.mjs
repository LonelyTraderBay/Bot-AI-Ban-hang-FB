import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';

const output = import.meta.dirname;
const frontend = path.resolve(output, '../..');
const repository = path.dirname(frontend);
const [stage, ...args] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(stage || '') || !args.length) throw new Error('Usage: run-record.mjs <unique-stage> <Node arguments>');
const logFile = path.join(output, stage + '.log');
const recordFile = path.join(output, stage + '.record.json');
if (fs.existsSync(logFile) || fs.existsSync(recordFile)) throw new Error('Preserve prior execution; use a fresh stage name.');
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const filesUnder = directory => fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', 'dist', 'dist-demo', '.cache'].includes(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
}) : [];
const sources = [...new Set([
    ...['apps/web/src', 'apps/web/tests', 'apps/web/public', 'packages', 'scripts', 'tests'].flatMap(directory => filesUnder(path.join(frontend, directory))),
    ...['contracts', 'design'].flatMap(directory => filesUnder(path.join(repository, 'botsales-kit', directory))),
    ...['package.json', 'package-lock.json', '.npmrc', 'eslint.config.mjs', 'playwright.config.ts', 'playwright.built-demo.config.ts', 'apps/web/package.json', 'apps/web/tsconfig.json', 'apps/web/vite.config.ts', 'apps/web/vitest.config.ts', 'apps/web/index.html'].map(file => path.join(frontend, file)).filter(fs.existsSync),
    import.meta.filename,
    ...args.map(arg => path.resolve(frontend, arg)).filter(file => file.startsWith(output + path.sep) && /\.(?:mjs|js|ts)$/.test(file) && fs.existsSync(file)),
])].sort();
const sourceFingerprints = Object.fromEntries(sources.map(file => [path.relative(repository, file).replaceAll('\\', '/'), digest(file)]));
const git = execFileSync('where.exe', ['git'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
const env = { ...process.env, PATH: [path.dirname(process.execPath), path.dirname(git), 'C:\\Windows\\System32', 'C:\\Windows', path.join(frontend, 'node_modules/.bin')].join(path.delimiter) };
for (const key of Object.keys(env)) if (key !== 'PATH' && key.toUpperCase() === 'PATH') delete env[key];
if (stage.includes('e2e') || stage.includes('built-demo') || stage.includes('detail-browser')) env.PLAYWRIGHT_JSON_OUTPUT_NAME = path.join(output, stage + '.results.json');
const startedAt = new Date().toISOString();
const stream = fs.createWriteStream(logFile, { flags: 'wx' });
const child = spawn(process.execPath, args, { cwd: frontend, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
for (const channel of [child.stdout, child.stderr]) channel.on('data', data => { stream.write(data); process.stdout.write(data); });
const exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', code => resolve(code ?? 1)); });
await new Promise(resolve => stream.end(resolve));
const sourceDrift = Object.entries(sourceFingerprints).filter(([file, hash]) => !fs.existsSync(path.join(repository, file)) || digest(path.join(repository, file)) !== hash).map(([file]) => file);
const record = { stage, startedAt, finishedAt: new Date().toISOString(), executable: process.execPath, args, command: `"${process.execPath}" ` + args.map(arg => /\s/.test(arg) ? `"${arg}"` : arg).join(' '), cwd: frontend, exitCode, log: { path: path.relative(repository, logFile).replaceAll('\\', '/'), sha256: digest(logFile) }, sourceFingerprints, sourceDrift };
fs.writeFileSync(recordFile, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ stage, exitCode, sourceDrift, record: path.relative(frontend, recordFile) }));
process.exitCode = exitCode || (sourceDrift.length ? 1 : 0);
