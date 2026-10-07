import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const evidenceDir = path.join(repo, 'botsales-kit/execution/frontend-evidence/FE026');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-fe026-clean-build-'));
const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const lockPath = path.join(repo, 'package-lock.json');
const lockSha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const originalLockSha256 = lockSha256(fs.readFileSync(lockPath));
const excludedNames = new Set(['.git', 'node_modules', 'dist', 'dist-demo', 'coverage', 'test-results', 'playwright-report', '.vite', '.cache']);
const copyFilter = source => {
  const relative = path.relative(repo, source).split(path.sep).filter(Boolean);
  if (relative.some(segment => excludedNames.has(segment))) return false;
  if (relative.slice(0, 3).join('/') === 'botsales-kit/execution/frontend-evidence') return false;
  return true;
};
fs.cpSync(repo, tempRoot, { recursive: true, filter: copyFilter, force: true, errorOnExist: false });
const copiedLock = path.join(tempRoot, 'package-lock.json');
if (lockSha256(fs.readFileSync(copiedLock)) !== originalLockSha256) throw new Error('Isolated workspace lockfile does not match the current source lock.');

const pathEntries = [
  path.join(tempRoot, 'node_modules/.bin'),
  path.dirname(process.execPath),
  'C:\\Windows\\System32',
  'C:\\Windows\\System32\\WindowsPowerShell\\v1.0',
  process.env.PATH ?? '',
];
const env = { ...process.env, PATH: pathEntries.join(path.delimiter) };
const runs = [];
for (const [name, args] of [
  ['clean-install', ['--script-shell=cmd.exe', 'ci']],
  ['setup', ['--script-shell=cmd.exe', 'run', 'setup']],
  ['verify', ['--script-shell=cmd.exe', 'run', 'verify']],
  ['build-demo', ['--script-shell=cmd.exe', 'run', 'build:demo']],
]) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: tempRoot, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  const entry = { name, command: `node ${npmCli} ${args.join(' ')}`, cwd: tempRoot, exitCode: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
  runs.push(entry);
  if (entry.exitCode !== 0) break;
}
const outputs = {};
const treeHash = directory => {
  const files = [];
  const visit = current => {
    for (const item of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, item.name);
      if (item.isDirectory()) visit(full);
      else {
        const relative = path.relative(tempRoot, full).replaceAll('\\', '/');
        const bytes = fs.readFileSync(full);
        files.push({ path: relative, bytes: bytes.length, sha256: lockSha256(bytes) });
      }
    }
  };
  visit(directory);
  const treeSha256 = lockSha256(Buffer.from(files.map(file => `${file.path}:${file.bytes}:${file.sha256}`).join('\n')));
  return { fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), treeSha256, workerIncluded: files.some(file => file.path.endsWith('/mockServiceWorker.js')) };
};
if (!runs.some(run => run.exitCode !== 0)) {
  outputs.production = treeHash(path.join(tempRoot, 'apps/web/dist'));
  outputs.demo = treeHash(path.join(tempRoot, 'apps/web/dist-demo'));
  if (outputs.production.workerIncluded || !outputs.demo.workerIncluded) throw new Error('Clean production/demo worker isolation failed.');
}
const summary = {
  status: runs.length === 4 && runs.every(run => run.exitCode === 0) ? 'PASS' : 'FAIL',
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  tempWorkspace: tempRoot,
  originalLockSha256,
  copiedLockSha256: lockSha256(fs.readFileSync(copiedLock)),
  runs: runs.map(({ name, command, cwd, exitCode }) => ({ name, command, cwd, exitCode })),
  cleanArtifacts: outputs,
};
const log = [
  'FE026 clean install and artifact reproduction on isolated current-source copy',
  `executedAt=${new Date().toISOString()}`, `status=${summary.status}`, `tempWorkspace=${tempRoot}`,
  `lockSha256.original=${originalLockSha256}`, `lockSha256.copy=${summary.copiedLockSha256}`,
  ...runs.flatMap(run => [`\n## ${run.name}`, `command=${run.command}`, `cwd=${run.cwd}`, `exitCode=${run.exitCode}`, run.output.trimEnd()]),
  `\ncleanArtifacts=${JSON.stringify(outputs)}`,
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no backend, hosted CI, deployment, or live provider claim.',
].join('\n') + '\n';
const logFile = path.join(evidenceDir, 'clean-build-post-update-current-20261004.log');
fs.writeFileSync(logFile, log, 'utf8');
console.log(JSON.stringify({ ...summary, logFile: path.relative(repo, logFile).replaceAll('\\', '/') }, null, 2));
if (summary.status !== 'PASS') process.exitCode = 1;
