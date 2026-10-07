import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const [, , runLogRelative, cwd] = process.argv;
const helperRelative = 'botsales-kit/execution/frontend-evidence/FE002/record-s05-test-run-post-fix-current-20261006.mjs';
const cleanRunnerRelative = 'botsales-kit/execution/frontend-evidence/FE002/run-clean-install-post-fix-current-20261006.mjs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Run from frontend root, got ${root}`);
assert(runLogRelative && cwd, 'Usage: node record-s05-test-run-post-fix-current-20261006.mjs run-log clean-workspace');

const plan = json('botsales-kit/execution/frontend-plan.json');
const step = plan.tasks.find(item => item.id === 'FE002')?.implementationSteps.find(item => item.id === 'S05');
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const registered = commandMap.commands.find(entry => entry.id === 'clean-install');
const runLog = read(runLogRelative);
const before = runLog.match(/^tempLockBefore=([a-f0-9]{64})$/m)?.[1];
const after = runLog.match(/^tempLockAfter=([a-f0-9]{64})$/m)?.[1];
const workspace = runLog.match(/^cleanWorkspace=(.+)$/m)?.[1];
const currentLockHash = sha(fs.readFileSync(path.join(root, 'package-lock.json')));

assert(step?.requiredEvidenceKind === 'test_run', 'FE002.S05 is not a test_run step');
assert(registered?.status === 'VERIFIED_AVAILABLE' && runLog.includes(`command=${registered.command}`), 'Registered clean-install command was not used');
assert(/^exitCode=0$/m.test(runLog), 'Clean npm ci did not exit successfully');
assert(before && before === after && before === currentLockHash, 'Temporary lockfile differs from current project lock or changed during install');
assert(workspace === cwd && path.resolve(workspace) !== path.resolve(root) && !path.resolve(workspace).startsWith(`${path.resolve(root)}${path.sep}`), 'Clean install did not use a separate temporary workspace');
assert(/added \d+ packages, and audited \d+ packages/.test(runLog) || /up to date, audited \d+ packages/.test(runLog), 'npm ci output lacks installed package counts');
assert(runLog.includes('typescript-eslint@8.71.0') && runLog.includes('@mui/material@7.3.1'), 'Clean dependency tree omits pinned frontend packages');
assert(!/invalid:|UNMET PEER DEPENDENCY|ELSPROBLEMS/i.test(runLog), 'Clean dependency tree contains peer/resolution errors');
assert(runLog.includes('ESBUILD_IMPORT=PASS') && runLog.includes('MSW_BROWSER_IMPORT=PASS'), 'Clean optional frontend runtime imports failed');

const sourcePaths = [
  'package.json', 'apps/web/package.json', 'package-lock.json',
  'botsales-kit/execution/frontend-command-map.json', cleanRunnerRelative, helperRelative,
];
const sourceFiles = sourcePaths.map(relative => ({ path: relative, sha256: sha(fs.readFileSync(path.join(root, relative))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const logRelative = 'execution/frontend-evidence/FE002/S05-post-fix-current-20261006.log';
const evidenceRelative = 'execution/frontend-evidence/FE002/S05-post-fix-current-20261006.json';
const observed = `Registered npm ci exited 0 in isolated temp workspace ${workspace}; copied lock SHA-256 ${before} remained unchanged; installed dependency tree and esbuild/MSW imports resolved; user checkout was not used as install cwd.`;
const evidenceLog = [
  'FE002.S05 current clean-install evidence', `executedAt=${executedAt}`, `cwd=${cwd}`,
  `command=${registered.command}`, 'exitCode=0', `expected=${step.action}`, `observed=${observed}`,
  'checksTotal=5; failed=0',
  `CHECK isolated npm ci: PASS ${registered.command}; exit 0 in ${workspace}`,
  `CHECK manifest/lock provenance: PASS current root and app manifests plus lock copied; temp lock ${before} unchanged`,
  'CHECK dependency tree: PASS npm ls --depth=0 resolves pinned TypeScript ESLint and MUI with no invalid/unmet peer entries',
  'CHECK runtime imports: PASS esbuild and msw/browser both imported in the clean workspace',
  'CHECK checkout side effects: PASS npm ci ran only in the isolated temp directory; project .env.local and source tree were not used as install target',
  `runLog=${runLogRelative}; runLogSha256=${sha(fs.readFileSync(path.join(root, runLogRelative)))}`,
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no Backend/provider/staging result is claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  'reviewer=Codex self-review; no independent peer review claimed.',
].join('\n') + '\n';
const evidence = {
  taskId: 'FE002', stepId: 'S05', kind: step.requiredEvidenceKind, result: 'PASS', commandId: 'clean-install',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: step.action, observed, command: registered.command, cwd,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.versions.node} / npm 11.17.0`, details: 'npm ci in an isolated temporary frontend workspace; no backend/API service required.', dataSource: 'source-only' },
  checksTotal: 5, failed: 0, logFile: logRelative, logSha256: sha(evidenceLog), sourceFiles, sourceSnapshotSha256,
};
fs.writeFileSync(path.join(root, 'botsales-kit', logRelative), evidenceLog, 'utf8');
fs.writeFileSync(path.join(root, 'botsales-kit', evidenceRelative), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ step: 'S05', result: 'PASS', checks: 5, evidence: evidenceRelative, log: logRelative, sourceSnapshotSha256 }, null, 2));
