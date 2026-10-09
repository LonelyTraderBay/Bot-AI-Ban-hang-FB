import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const output = import.meta.dirname, repository = path.resolve(output, '../../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const target = path.join(repository, 'botsales-kit/execution/frontend-command-map.json');
const original = fs.readFileSync(target), map = JSON.parse(original);
const archive = path.join(output, 'command-map-before-width.json');
if (!fs.existsSync(archive)) fs.writeFileSync(archive, original);
const command = record => record.command || '"' + record.executable + '" ' + record.args.map(value => /\s/.test(value) ? '"' + value + '"' : value).join(' ');
const entries = [];
for (const stage of ['verify', 'e2e', 'unit', 'source-maps', 'built-demo']) {
    const record = read(path.join(repository, read(path.join(output, stage + '-latest.json')).record));
    if (record.exitCode || record.sourceDrift.length || hash(path.join(repository, record.log.path)) !== record.log.sha256) throw new Error('Failed/changed execution: ' + stage);
    for (const [source, digest] of Object.entries(record.sourceFingerprints)) if (hash(path.join(repository, source)) !== digest) throw new Error('Stale executed source: ' + stage + ':' + source);
    const log = fs.readFileSync(path.join(repository, record.log.path), 'utf8');
    if (stage === 'e2e' && (!/\b\d+ passed \(/.test(log) || /\b\d+ failed\b/.test(log))) throw new Error('Register only one complete passing full-discovered execution');
    entries.push({id: 'shared-' + stage, command: command(record), cwd: record.cwd, log: record.log});
}
const environment = read(path.join(output, 'environment-current.json'));
if (environment.drift.length || environment.runs.length !== 6) throw new Error('Environment evidence incomplete');
for (const [id, index] of [['dependencies', 1], ['setup', 3]]) {
    const run = environment.runs[index];
    if (run.exitCode || hash(path.join(repository, run.log.path)) !== run.log.sha256) throw new Error('Invalid environment execution: ' + id);
    entries.push({id: 'shared-' + id, command: command(run), cwd: run.cwd, log: run.log});
}
const cold = read(path.join(output, 'clean-artifacts-width-20261009.json'));
const install = cold.commandRuns.find(item => item.name === 'clean-install');
if (cold.status !== 'PASS' || cold.commandRuns.length !== 10 || cold.commandRuns.some(item => item.exitCode) || !install) throw new Error('Actual isolated npm ci is required');
entries.push({id: 'shared-clean-install', command: command(install), cwd: install.cwd, log: {path: 'BotSalesAI_Frontend/evidence/frontend-shared-consolidation-20261009/clean-build-width-20261009.log', sha256: hash(path.join(output, 'clean-build-width-20261009.log'))}});
for (const entry of entries) {
    const value = {id: entry.id, command: entry.command, cwd: entry.cwd, status: 'VERIFIED_AVAILABLE', observedOn: 'Actual Windows direct Node/npm CLI execution; argv/cwd and immutable raw log ' + entry.log.path + ' SHA256=' + entry.log.sha256 + '. Dependencies means npm ls --all; installation is the separately recorded isolated npm ci. Local synthetic Frontend scope; no hosted CI or cleanup claim.'};
    const index = map.commands.findIndex(item => item.id === entry.id);
    if (index < 0) map.commands.push(value); else map.commands[index] = value;
}
fs.writeFileSync(target, JSON.stringify(map, null, 2) + '\n');
console.log('Registered eight exact successful SHARED commands; original map archived.');
