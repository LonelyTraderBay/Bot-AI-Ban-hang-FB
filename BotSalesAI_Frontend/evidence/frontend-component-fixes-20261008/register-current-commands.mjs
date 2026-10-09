import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const repository = path.resolve(import.meta.dirname, '../../..'), kit = path.join(repository, 'botsales-kit');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const file = path.join(kit, 'execution/frontend-command-map.json'), original = fs.readFileSync(file), map = JSON.parse(original);
const archive = path.join(import.meta.dirname, 'command-map-before-corrections.json');
if (!fs.existsSync(archive)) fs.writeFileSync(archive, original);
const entries = [];
const command = record => record.command || '"' + record.executable + '" ' + record.args.map(value => /\s/.test(value) ? '"' + value + '"' : value).join(' ');
for (const stage of ['verify','e2e','unit','source-maps','built-demo']) {
    const record = read(path.join(repository, read(path.join(import.meta.dirname, stage + '-latest.json')).record));
    if (record.exitCode || record.sourceDrift.length || digest(path.join(repository, record.log.path)) !== record.log.sha256) throw new Error('Cannot register failed/stale run: ' + stage);
    for (const [source, hash] of Object.entries(record.sourceFingerprints)) if (digest(path.join(repository, source)) !== hash) throw new Error('Cannot register changed source: ' + stage + ':' + source);
    entries.push({ id: 'components-' + stage, command: command(record), cwd: record.cwd, record: record.log.path });
}
const environment = read(path.join(import.meta.dirname, 'environment-current.json'));
for (const [id, index] of [['install',1],['setup',3]]) {
    const run = environment.runs[index];
    if (run.exitCode || digest(path.join(repository,run.log.path)) !== run.log.sha256) throw new Error('Invalid environment record: ' + id);
    entries.push({ id: 'components-' + id, command: command(run), cwd: run.cwd, record: run.log.path });
}
const cold = read(path.join(import.meta.dirname, 'clean-artifacts-components-20261008.json'));
const install = cold.commandRuns.find(item => item.name === 'clean-install');
if (cold.status !== 'PASS' || install.exitCode) throw new Error('Cold install did not pass');
entries.push({ id: 'components-clean-install', command: command(install), cwd: install.cwd, record: 'BotSalesAI_Frontend/evidence/frontend-component-fixes-20261008/clean-build-components-20261008.log' });
for (const entry of entries) {
    const value = { id: entry.id, command: entry.command, cwd: entry.cwd, status: 'VERIFIED_AVAILABLE', observedOn: 'Actual Windows Node v24.19.0/npm 11.17.0 direct CLI execution; argv/cwd/source/log hashes at ' + entry.record + '; synthetic Frontend scope only. Isolated cold workspace retention is recorded by the cold manifest; no cleanup claim.' };
    const existing = map.commands.findIndex(item => item.id === entry.id);
    if (existing < 0) map.commands.push(value); else map.commands[existing] = value;
}
fs.writeFileSync(file, JSON.stringify(map, null, 2) + '\n');
console.log('Registered eight exact successful commands; original map archived.');
