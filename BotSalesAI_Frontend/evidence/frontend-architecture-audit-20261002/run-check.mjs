import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const audit = path.join(process.cwd(), 'evidence/frontend-architecture-audit-20261002');
const id = process.argv[2];
const snapshot = JSON.parse(fs.readFileSync(path.join(audit, id.startsWith('cold-') ? 'snapshot-cold.json' : 'snapshot.json'), 'utf8'));
const commands = {
  setup: 'npm.cmd run setup',
  verify: 'npm.cmd run verify',
  'verify-after-setup': 'npm.cmd run verify',
  e2e: 'npm.cmd run test:e2e',
  audit: 'npm.cmd audit --json',
  schema: '"C:\\Users\\Joker-PC\\AppData\\Local\\Programs\\Python\\Python312\\python.exe" scripts/validate-mock-schemas.py',
  'schema-direct': 'C:\\Users\\Joker-PC\\AppData\\Local\\Programs\\Python\\Python312\\python.exe scripts/validate-mock-schemas.py',
  'schema-dependencies': 'python -m pip install --target .audit-python jsonschema',
  'schema-with-dependencies': 'python scripts/validate-mock-schemas.py',
  'cold-install': 'npm.cmd ci',
  'cold-build': 'npm.cmd run setup && npm.cmd run build && npm.cmd run build:demo',
  'cold-empty-regression': 'npx.cmd playwright test tests/states/route-empty-composition.spec.ts',
};
if (!commands[id]) throw new Error('Unknown check');
const command = commands[id];
const env = { ...process.env, PATH: 'C:\\Program Files\\nodejs;C:\\Windows\\System32;C:\\Windows', PATHEXT: '.COM;.EXE;.BAT;.CMD' };
if (id === 'schema') env.PATH = process.env.PATH;
if (id === 'schema-with-dependencies') env.PYTHONPATH = path.join(snapshot.copy, '.audit-python');
const startedAt = new Date().toISOString();
const logPath = path.join(audit, `${id}.log`);
const log = fs.createWriteStream(logPath);
const child = ['schema-direct','schema-dependencies','schema-with-dependencies'].includes(id)
  ? spawn('C:\\Users\\Joker-PC\\AppData\\Local\\Programs\\Python\\Python312\\python.exe', id === 'schema-dependencies' ? ['-m','pip','install','--target','.audit-python','jsonschema'] : ['scripts/validate-mock-schemas.py'], { cwd: snapshot.copy, env, windowsHide: true })
  : spawn('C:\\Windows\\System32\\cmd.exe', ['/d', '/s', '/c', command], { cwd: snapshot.copy, env, windowsHide: true });
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { log.write(data); process.stdout.write(data); });
const exitCode = await new Promise((resolve, reject) => { child.on('exit', resolve); child.on('error', reject); });
await new Promise(resolve => log.end(resolve));
const result = { id, command, cwd: snapshot.copy, startedAt, finishedAt: new Date().toISOString(), exitCode, log: path.relative(process.cwd(), logPath).replaceAll('\\', '/'), sourceFingerprint: snapshot.sourceFingerprint, scope: snapshot.scope, environment: { node: process.version, dependencySource: id.startsWith('cold-') ? 'fresh install in separate snapshot' : 'existing installation via junction; not a cold install' } };
fs.writeFileSync(path.join(audit, `${id}.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
process.exitCode = exitCode ?? 1;
