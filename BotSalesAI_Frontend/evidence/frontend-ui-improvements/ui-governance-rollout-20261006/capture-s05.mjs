import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../..');
const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(root, file))).digest('hex');
const before = JSON.parse(fs.readFileSync(path.join(dir, 'S03-before.json'), 'utf8'));
const previous = process.argv.includes('--metadata-only') ? JSON.parse(fs.readFileSync(path.join(dir, 'S05-status.json'), 'utf8')) : null;
if (previous) for (const file of ['scripts/ui-bindings.mjs', 'scripts/check-layout.mjs', 'scripts/check-ui-composition.mjs', 'scripts/check-visual-tokens.mjs']) {
    if (previous.changedOwnerHashes.find(row => row.file === file)?.sha256 !== hash(file)) throw new Error(`Source changed since checks: ${file}; rerun capture without --metadata-only`);
}
const commands = [
    { args: ['scripts/check-layout.mjs', '--json'], output: 'S05-current-layout.json' },
    { args: ['scripts/check-ui-composition.mjs', '--json'], output: 'S05-current-composition.json' },
    { args: ['scripts/check-visual-tokens.mjs', '--json'], output: 'S05-current-visual.json' },
    { args: ['node_modules/typescript/lib/tsc.js', '-p', 'apps/web/tsconfig.json', '--noEmit'], output: 'S05-typecheck.log' },
    { args: ['scripts/check-boundaries.mjs'], output: 'S05-boundaries.log' },
    { args: ['scripts/generate.mjs', '--check'], output: 'S05-generator.log' },
];
const checks = commands.map(command => {
    if (previous) {
        const recorded = previous.checks.find(check => check.output === command.output);
        if (!recorded || recorded.outputSha256 !== hash(path.relative(root, path.join(dir, command.output)))) throw new Error(`Recorded check artifact changed: ${command.output}`);
        return { ...recorded, recordedAt: recorded.recordedAt ?? previous.checkedAt, reusedWithoutRerun: true };
    }
    const result = spawnSync(process.execPath, command.args, { cwd: root, encoding: 'utf8', maxBuffer: 16e6 });
    fs.writeFileSync(path.join(dir, command.output), result.stdout ?? '');
    if (result.stderr) fs.writeFileSync(path.join(dir, command.output + '.stderr.log'), result.stderr);
    return { command: `node ${command.args.join(' ')}`, exit: result.status, error: result.error?.message, output: command.output, outputSha256: hash(path.relative(root, path.join(dir, command.output))) };
});
const changedFiles = ['scripts/ui-bindings.mjs', 'scripts/check-layout.mjs', 'scripts/check-ui-composition.mjs', 'scripts/check-visual-tokens.mjs', 'tests/ui-bindings.test.mjs', 'tests/ui-binding-gates.test.mjs', 'tests/ui-layout-binding-gates.test.mjs', 'tests/layout-checker.test.mjs'];
const fixtureLog = 'S05-binding-acceptance-fixtures.log';
const fixtures = fs.readFileSync(path.join(dir, fixtureLog), 'utf8');
const protectedFiles = before.protectedFiles.map(row => ({ ...row, currentSha256: hash(row.file), unchanged: hash(row.file) === row.sha256 }));
const indexFingerprint = createHash('sha256').update(execFileSync('git', ['ls-files', '-s', '-z'], { cwd: root, maxBuffer: 16e6 })).digest('hex');
const baselineGateFiles = {
    'S05-current-layout.json': JSON.parse(fs.readFileSync(path.join(dir, 'S04-coverage-check-layout.json'), 'utf8')).scannedFiles,
    'S05-current-visual.json': JSON.parse(fs.readFileSync(path.join(dir, 'S04-coverage-check-visual-tokens.json'), 'utf8')).scannedFiles,
    'S05-current-composition.json': JSON.parse(fs.readFileSync(path.join(dir, 'S04-coverage-check-ui-composition.json'), 'utf8')).sourceHashes.map(row => row.file),
};
const coverage = Object.entries(baselineGateFiles).map(([file, expected]) => {
    const result = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const actual = result.scannedFiles ?? result.sourceHashes.map(row => row.file);
    return { file, expected: expected.length, actual: actual.length, missing: expected.filter(item => !actual.includes(item)), extra: actual.filter(item => !expected.includes(item)), status: result.status };
});
const ready = checks.every(check => check.exit === 0) && Number(fixtures.match(/fail (\d+)/)?.[1]) === 0 && coverage.every(row => row.status === 'PASS' && !row.missing.length && !row.extra.length) && protectedFiles.every(row => row.unchanged) && indexFingerprint === before.indexFingerprint;
const report = {
    checkedAt: new Date().toISOString(), step: 'S05', status: ready ? 'DONE_BINDING_CAPABILITY_SCOPED' : 'IN_PROGRESS_BINDING_GATES_CONNECTED', coverage,
    checks, fixtureEvidence: { log: fixtureLog, sha256: hash(path.relative(root, path.join(dir, fixtureLog))), passed: Number(fixtures.match(/pass (\d+)/)?.[1]), failed: Number(fixtures.match(/fail (\d+)/)?.[1]), exitRecordedByCaller: 0 },
    changedOwnerHashes: changedFiles.map(file => ({ file, sha256: hash(file) })), protectedFiles, indexUnchanged: indexFingerprint === before.indexFingerprint,
    runtimeSourceChangesSinceS03: before.files.filter(row => /^(apps\/web\/src\/(?!shared\/ui\/README\.md)|packages\/)/.test(row.path) && fs.existsSync(path.resolve(root, row.path)) && hash(row.path) !== row.sha256).map(row => row.path),
    pending: ['Readonly/mutation/style/value/slot/ancestry hardening S06–S10', 'UI owner/consumer migration and full acceptance S11–S20'],
    limits: ['Legacy virtual/syntax fixtures are not production resolver proof', 'Controlled MUI declarations in unit fixtures are not real MUI typecheck proof', 'No shared/feature UI edits or browser verification in this batch', 'No full conformance, owner acceptance or Enterprise certification'],
};
fs.writeFileSync(path.join(dir, 'S05-status.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, checks: checks.map(({ command, exit }) => ({ command, exit })), fixtures: report.fixtureEvidence, protectedUnchanged: protectedFiles.every(row => row.unchanged), indexUnchanged: report.indexUnchanged }));
process.exitCode = checks.some(check => check.exit !== 0) || !protectedFiles.every(row => row.unchanged) || !report.indexUnchanged ? 1 : 0;
