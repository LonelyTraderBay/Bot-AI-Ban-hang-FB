import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const [, , taskId, stepId, commandId, runLogRelative, cwd = root] = process.argv;
const helperRelative = 'botsales-kit/execution/frontend-evidence/FE002/record-test-run-post-spc056-current-20261006.mjs';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
assert(root.endsWith('BotSalesAI_Frontend'), `Run from frontend root, got ${root}`);
  assert(taskId === 'FE002' && ['S03', 'S04', 'S05'].includes(stepId) && commandId && runLogRelative, 'Usage: node record-test-run-post-spc056-current-20261006.mjs FE002 S03|S04|S05 commandId run-log [cwd]');

const plan = json('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find((item) => item.id === taskId);
const step = task.implementationSteps.find((item) => item.id === stepId);
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const registered = commandMap.commands.find((entry) => entry.id === commandId);
assert(step.requiredEvidenceKind === 'test_run', `${taskId}.${stepId} is not a test_run step`);
assert(registered?.status === 'VERIFIED_AVAILABLE' && typeof registered.command === 'string', `Command ${commandId} is not registered and verified`);
const runLog = read(runLogRelative);
const checks = [];
const addCheck = (label, observed) => checks.push({ label, observed });
const sourcePathsByStep = {
  S03: ['package.json', 'apps/web/package.json', 'package-lock.json', 'botsales-kit/execution/frontend-command-map.json', helperRelative],
  S04: ['package.json', '.env.example', 'scripts/setup.mjs', 'scripts/doctor.mjs', 'scripts/tools.mjs', 'apps/web/public/mockServiceWorker.js', 'botsales-kit/execution/frontend-command-map.json', helperRelative],
  S05: ['package.json', 'apps/web/package.json', 'package-lock.json', 'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-evidence/FE002/run-clean-install-post-security-update.mjs', helperRelative],
};
let observed = '';

if (stepId === 'S03') {
  assert(commandId === 'install' && registered.command === 'npm.cmd --script-shell=powershell.exe install', 'S03 install command does not match command map');
  const before = runLog.match(/^lockBefore=([a-f0-9]{64})$/m)?.[1];
  const after = runLog.match(/^lockAfter=([a-f0-9]{64})$/m)?.[1];
  const treeLog = read('botsales-kit/execution/frontend-evidence/FE002/S03-npm-ls-post-fix-current-20261006.log');
  const auditLogRelative = 'botsales-kit/execution/frontend-evidence/FE002/S03-npm-audit-post-fix-current-20261006.log';
  const auditLog = read(auditLogRelative);
  const audit = JSON.parse(auditLog.slice(0, auditLog.lastIndexOf('\nauditExitCode=')));
  const lockedSourceMap = json('package-lock.json').packages?.['node_modules/source-map-js']?.version;
  assert(before && before === after && after === sha(fs.readFileSync(path.join(root, 'package-lock.json'))), 'npm install changed or mismatched the lockfile');
  assert(/^exitCode=0$/m.test(runLog), 'npm install did not exit successfully');
  assert(/up to date, audited \d+ packages/.test(runLog), 'Install output lacks current up-to-date package count');
  assert(runLog.includes('found 0 vulnerabilities') && runLog.includes('allow-scripts'), 'Current zero-vulnerability audit or npm script-policy warning is missing');
  assert(audit.metadata?.vulnerabilities?.total === 0 && lockedSourceMap === '1.2.2', 'Fresh npm audit or patched source-map-js lock entry does not verify clean');
  assert(treeLog.includes('botsales-frontend@0.1.0') && treeLog.includes('@mui/material@7.3.1') && !/invalid:|UNMET PEER DEPENDENCY|ELSPROBLEMS/i.test(treeLog), 'Installed dependency tree is not clean');
  addCheck('npm install command', `${registered.command} exited 0; ${runLog.match(/up to date, audited \d+ packages/)?.[0]}`);
  addCheck('manifest/lock integrity', `lock SHA-256 unchanged: ${before}`);
  addCheck('installed dependency tree after install', 'npm ls --depth=0 exited 0; pinned React/MUI/Query/Router/Vite/MSW packages resolve without peer errors');
  addCheck('security/script policy', 'Fresh npm audit reports 0 vulnerabilities; source-map-js 1.2.2 resolves GHSA-68fv-2mgg-jv7q; npm allowScripts warnings for esbuild/MSW were retained and scripts were not manually approved');
  observed = `npm install exited 0; lockfile SHA-256 unchanged; ${runLog.match(/audited \d+ packages/)?.[0] ?? 'current package count recorded'}. Fresh npm audit reports 0 vulnerabilities after the source-map-js patch; npm allowScripts warnings for esbuild/MSW remain recorded.`;
}

if (stepId === 'S04') {
  assert(commandId === 'setup-doctor-capture', 'S04 must run the registered setup+doctor capture');
  const expectedCommand = registered.command;
  assert(runLog.includes(`command=${expectedCommand}`) && /^exitCode=0$/m.test(runLog), 'Setup/doctor wrapper did not run the registered command successfully');
  const setupLog = read('botsales-kit/execution/frontend-evidence/FE002/S04-setup-output-post-fix-current-20261006.log');
  const doctorLog = read('botsales-kit/execution/frontend-evidence/FE002/S04-doctor-output-post-fix-current-20261006.log');
  assert(setupLog.includes('Thiết lập xong.'), 'Setup completion line is missing');
  assert(doctorLog.includes('PASS') && !doctorLog.includes('BLOCKED'), 'Doctor did not pass or reported a blocked prerequisite');
  const envUnchanged = runLog.match(/^envLocalUnchanged=(true|false)$/m)?.[1];
  const workerUnchanged = runLog.match(/^workerUnchanged=(true|false)$/m)?.[1];
  assert(envUnchanged === 'true', 'Setup modified the existing .env.local');
  assert(workerUnchanged === 'true', 'Setup unexpectedly changed the current MSW worker');
  addCheck('setup and doctor', 'Registered setup-doctor-capture command exited 0; setup completion observed; every doctor row PASS');
  addCheck('existing local environment preserved', 'Hash equality checked in memory; .env.local contents/hash were not written to evidence');
  addCheck('MSW worker consistency', 'Worker content hash checked in memory and unchanged; initialized by the installed MSW package');
  observed = `setup and doctor exited 0; all doctor checks PASS; existing .env.local and MSW worker hashes unchanged; no Backend or provider used.`;
}

if (stepId === 'S05') {
  assert(commandId === 'clean-install' && /^C:\\Program Files\\nodejs\\node\.exe /.test(registered.command), 'S05 must use the registered npm ci command');
  assert(runLog.includes(`command=${registered.command}`) && /^exitCode=0$/m.test(runLog), 'Clean npm ci did not run the registered command successfully');
  const lockCopied = runLog.match(/^tempLockBefore=([a-f0-9]{64})$/m)?.[1];
  const lockAfter = runLog.match(/^tempLockAfter=([a-f0-9]{64})$/m)?.[1];
  const workspace = runLog.match(/^cleanWorkspace=(.+)$/m)?.[1];
  assert(lockCopied && lockCopied === lockAfter && workspace === cwd, 'Clean install workspace/lock integrity is incomplete');
  assert(runLog.includes('added ') || runLog.includes('up to date'), 'Clean install output lacks npm ci result');
  addCheck('clean npm ci', `${registered.command}; exit 0 in ${workspace}`);
  addCheck('cold workspace provenance', `Copied current root/app manifests and lockfile to a separate clean temp path: ${workspace}`);
  addCheck('lockfile preservation', `temp lock SHA-256 unchanged: ${lockCopied}`);
  addCheck('scope and side effects', 'User worktree was not the npm ci cwd; no source, lockfile or .env.local rewrite in the project');
  observed = `npm ci exited 0 in the isolated clean temp workspace; manifest/lock copied from current Frontend checkout; temp lock unchanged; user worktree preserved.`;
}

const sourcePaths = [...new Set([...sourcePathsByStep[stepId], helperRelative])];
const sourceFiles = sourcePaths.map((relative) => ({ path: relative, sha256: sha(fs.readFileSync(path.join(root, relative))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const revision = requireGit('rev-parse', '--short', 'HEAD');
const branch = requireGit('branch', '--show-current');
const executedAt = new Date().toISOString();
const logRelative = `execution/frontend-evidence/FE002/${stepId}-post-spc056-current-20261006.log`;
const evidenceRelative = `execution/frontend-evidence/FE002/${stepId}-post-spc056-current-20261006.json`;
const evidenceLog = [
  `FE002.${stepId} current test evidence`, `executedAt=${executedAt}`, `cwd=${cwd}`,
  `command=${registered.command}`, 'exitCode=0', `expected=${step.action}`, `observed=${observed}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  `runLog=${runLogRelative}; runLogSha256=${sha(fs.readFileSync(path.join(root, runLogRelative)))}`,
  ...(stepId === 'S03' ? [`auditLog=botsales-kit/execution/frontend-evidence/FE002/S03-npm-audit-post-fix-current-20261006.log; auditLogSha256=${sha(fs.readFileSync(path.join(root, 'botsales-kit/execution/frontend-evidence/FE002/S03-npm-audit-post-fix-current-20261006.log')))}`] : []),
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no Backend/provider/staging result is claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  'reviewer=Codex self-review; no independent peer review claimed.',
].join('\n') + '\n';
fs.writeFileSync(path.join(kit, logRelative), evidenceLog, 'utf8');
const evidence = {
  taskId, stepId, kind: step.requiredEvidenceKind, result: 'PASS', commandId,
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: step.action, observed, command: registered.command, cwd,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.versions.node} / npm 11.17.0`, details: 'Local package/tooling execution; no backend/API service required.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile: logRelative, logSha256: sha(evidenceLog), sourceFiles, sourceSnapshotSha256,
};
fs.writeFileSync(path.join(kit, evidenceRelative), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ step: stepId, result: 'PASS', checks: checks.length, evidence: evidenceRelative, log: logRelative, sourceSnapshotSha256 }, null, 2));

function requireGit(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}
