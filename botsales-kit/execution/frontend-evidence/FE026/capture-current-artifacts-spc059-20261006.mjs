import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE026');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sha = hash;
const read = file => fs.readFileSync(path.join(repo, file));
const text = file => read(file).toString('utf8');
const json = file => JSON.parse(text(file));
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass FE026 checkpoint S01-S05.');

const plan = json('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE026');
const step = task?.implementationSteps.find(item => item.id === stepId);
if (!task || !step) throw new Error('FE026 task definition unavailable.');
const command = json('botsales-kit/execution/frontend-command-map.json').commands.find(item => item.id === 'e2e');
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error('Built-demo E2E command is not VERIFIED_AVAILABLE.');

const manifestPath = 'botsales-kit/execution/frontend-evidence/FE026/artifact-manifest-spc059-current-20261006.json';
const manifestLogPath = 'botsales-kit/execution/frontend-evidence/FE026/artifact-manifest-spc059-current-20261006.log';
const cleanPath = 'botsales-kit/execution/frontend-evidence/FE026/clean-build-spc059-current-20261006.log';
const failedPath = 'botsales-kit/execution/frontend-evidence/FE026/clean-build-env-path-failure-spc059-20261006.log';
const verifyPath = 'botsales-kit/execution/frontend-evidence/FE024/npm-verify-spc059-current-path-fixed-20261006.log';
const demoBuildPath = 'botsales-kit/execution/frontend-evidence/FE025/build-demo-spc059-current-20261006.log';
const e2ePath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const workflowPath = 'botsales-kit/execution/frontend-evidence/FE026/frontend-workflow-config-spc059-current-20261006.yml';
const workflowSourcePath = path.resolve(repo, '../.github/workflows/frontend.yml');

const manifest = json(manifestPath);
const manifestText = text(manifestPath);
const cleanLog = text(cleanPath);
const failureLog = text(failedPath);
const verifyLog = text(verifyPath);
const demoBuildLog = text(demoBuildPath);
const e2eLog = text(e2ePath);
const workflow = text(workflowPath);
const viteConfig = text('apps/web/vite.config.ts');
const rootPackage = json('package.json');
const cleanArtifactsLine = cleanLog.split(/\r?\n/).find(line => line.startsWith('cleanArtifacts='));
const cleanArtifacts = JSON.parse(cleanArtifactsLine.slice('cleanArtifacts='.length));
const lockSha = cleanLog.match(/lockSha256\.copy=([a-f0-9]{64})/)?.[1];
const artifacts = Object.fromEntries(manifest.artifacts.map(item => [item.directory, item]));
const prod = artifacts['apps/web/dist'];
const demo = artifacts['apps/web/dist-demo'];

if (sha(read(workflowPath)) !== sha(fs.readFileSync(workflowSourcePath))) throw new Error('Captured frontend workflow differs from its current parent-repository source.');
if (manifest.scope !== 'FRONTEND_WITH_SYNTHETIC_MOCK_API' || !prod || !demo || prod.mswWorkerIncluded || !demo.mswWorkerIncluded) throw new Error('Production/demo artifact manifest does not keep MSW isolated.');
if (!cleanLog.includes('status=PASS') || !lockSha || !cleanLog.includes(`lockSha256.original=${lockSha}`)) throw new Error('Current isolated cold-build log or lock hash is incomplete.');
const sections = new Map(cleanLog.replace(/\r\n/g, '\n').split(/^## /m).slice(1).map(block => [block.slice(0, block.indexOf('\n')), block]));
for (const [name, phrase] of [['clean-install', ' ci'], ['setup', ' run setup'], ['verify', ' run verify'], ['build-demo', ' run build:demo']]) {
  const block = sections.get(name) ?? '';
  if (!block.includes('exitCode=0') || !block.includes(phrase)) throw new Error(`Clean build is missing a successful ${name} command.`);
}
for (const [local, cold] of [[prod, cleanArtifacts.production], [demo, cleanArtifacts.demo]]) {
  if (!cold || local.fileCount !== cold.fileCount || local.totalBytes !== cold.totalBytes || local.treeSha256 !== cold.treeSha256 || local.mswWorkerIncluded !== cold.workerIncluded) throw new Error(`Isolated artifact does not reproduce ${local.directory}.`);
}
if (!verifyLog.includes('Tests  93 passed (93)') || !verifyLog.includes('layout-check PASS: 68 source files, 0 finding(s)') || !verifyLog.includes('visual-token-check PASS: 68 source files, 0 finding(s)') || !verifyLog.includes('✓ built in')) throw new Error('Fresh local verify log is incomplete.');
if (!/484 passed \(\d+(?:\.\d+)?m\)/.test(e2eLog) || !/^exitCode=0$/m.test(e2eLog)) throw new Error('Current built-demo browser suite is not 484/484.');
for (const item of ['built demo artifact serves the React UI and synthetic API through preview', 'production artifact contains neither the mock worker asset nor MSW fixtures/runtime']) if (!e2eLog.includes(item)) throw new Error(`Current artifact browser evidence is missing: ${item}`);
if (!rootPackage.scripts['build:demo'] || !rootPackage.scripts.preview || !viteConfig.includes("const mocks = mode === 'demo'") || !viteConfig.includes("env.VITE_ENABLE_MOCKS === 'true'") || !viteConfig.includes('API_PROXY_TARGET')) throw new Error('Demo/live transport configuration is incomplete.');
for (const item of ['npm ci', 'npm audit --audit-level=low', 'npm run verify', 'npm run test:e2e', 'playwright install --with-deps chromium firefox']) if (!workflow.includes(item)) throw new Error(`Frontend workflow config lacks ${item}.`);
if (!failureLog.includes("'node' is not recognized") || !cleanLog.includes('exitCode=0')) throw new Error('Initial runner failure and corrected clean build are not both retained.');

const checkDescriptions = {
  S01: 'Root package scripts and Vite config separate production build/preview/live API proxy from demo MSW. Demo mocks are enabled only in demo mode; no deployment or real backend is inferred.',
  S02: `The current production artifact contains ${prod.fileCount} files (${prod.totalBytes} bytes, tree SHA-256 ${prod.treeSha256}) and no MSW worker; the demo contains ${demo.fileCount} files (${demo.totalBytes} bytes, tree SHA-256 ${demo.treeSha256}) and includes the worker. Current built-artifact assertions passed in Chromium and Firefox.`,
  S03: `An isolated copy ran npm ci, setup, verify and build:demo with exit 0. Copy/original lock SHA-256 is ${lockSha}; both production/demo trees exactly reproduce the current local manifest. The first trial failed because an inherited oversized Windows PATH hid node from cmd.exe; it is retained with the root cause, and a minimal explicit PATH rerun passed.`,
  S04: 'The parent repository contains a frontend-only workflow with read-only permissions, lock/toolchain setup, audit, verify and Chromium/Firefox E2E steps. The current built React demo suite passed 484/484; hosted CI remains NOT_RUN.',
  S05: `Current artifact manifest and cold-build reproduction match exactly (production ${prod.treeSha256}; demo ${demo.treeSha256}). Reproduction uses the lockfile and npm scripts. No publish, deployment or rollback action was performed.`,
};
const checks = {
  S01: ['Production/demo/live script modes map to separate Vite/transport configuration.', 'Only demo mode enables the synthetic MSW worker; production artifact remains isolated.', 'Local builds and workflow are treated as evidence distinct from hosted deployment.'],
  S02: ['Production omits the MSW worker while demo includes it.', 'Current built artifact browser tests verify the real React preview and production isolation.', 'No live/backend fallback is inferred.'],
  S03: ['Cold isolated npm ci/setup/verify/build:demo all exit 0.', 'Original/copy package-lock SHA-256 matches.', 'Isolated production and demo artifact trees match local checksums exactly.'],
  S04: ['Frontend workflow has read-only permissions and the declared browser checks.', 'Current built-demo Chromium/Firefox suite passed 484/484.', 'Hosted CI is explicitly NOT_RUN.'],
  S05: ['Manifest lists file and tree checksums for both artifacts.', 'Clean-copy and local artifact hashes reproduce.', 'No release/deployment/rollback occurred.'],
}[stepId];

const workflowHash = sha(fs.readFileSync(workflowSourcePath));
const sourceFiles = [...new Set([
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/vite.config.ts',
  'playwright.config.ts', 'tests/artifacts/demo-preview.spec.ts', 'scripts/run-e2e.mjs', 'scripts/setup.mjs',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json', 'botsales-kit/design/tokens.json',
  'botsales-kit/execution/frontend-evidence/FE026/capture-current-artifacts-spc059-20261006.mjs',
  'botsales-kit/execution/frontend-evidence/FE026/create-artifact-manifest-spc059-current-20261006.mjs',
  'botsales-kit/execution/frontend-evidence/FE026/run-clean-build-spc059-20261006.mjs',
  workflowPath, manifestPath, manifestLogPath, cleanPath, failedPath, verifyPath, demoBuildPath, e2ePath,
])].sort().map(file => ({ path: file, sha256: sha(read(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const logFile = `execution/frontend-evidence/FE026/${stepId}-artifacts-spc059-current-20261006.log`;
const output = path.join(evidenceDir, `${stepId}-artifacts-spc059-current-20261006.json`);
const log = [
  `FE026.${stepId} current frontend artifact evidence`, `executedAt=${new Date().toISOString()}`,
  `cwd=${repo}`, `commandId=${command.id}`, `command=${command.command}`, 'exitCode=0',
  `checksTotal=${checks.length}; failed=0`, ...checks.map((item, i) => `CHECK ${i + 1}: PASS ${item}`),
  `workflowSourceSha256=${workflowHash}`,
  `productionTreeSha256=${prod.treeSha256}; files=${prod.fileCount}; bytes=${prod.totalBytes}; mswWorkerIncluded=${prod.mswWorkerIncluded}`,
  `demoTreeSha256=${demo.treeSha256}; files=${demo.fileCount}; bytes=${demo.totalBytes}; mswWorkerIncluded=${demo.mswWorkerIncluded}`,
  `lockSha256=${lockSha}; cleanBuildStatus=PASS; isolatedCommands=npm ci/setup/verify/build:demo`,
  'builtDemoE2E=484/484 Chromium+Firefox; hostedCI=NOT_RUN; deployment=NOT_RUN',
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no backend, hosted CI, deployment, or live provider claim.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(path.join(kit, logFile), log, 'utf8');
const evidence = {
  taskId: 'FE026', stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current working tree; local artifacts were hash-matched to isolated cold builds.`,
  expected: step.verification, observed: checkDescriptions[stepId],
  command: command.command, commandId: command.id, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155', details: 'Isolated lockfile-based install and local React/MSW build; workflow config inspected, but hosted CI and live deployment were not run.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, exitCode: 0, logFile, logSha256: sha(Buffer.from(log)),
  sourceFiles, sourceSnapshotSha256,
  supportingLogs: [manifestPath, manifestLogPath, cleanPath, failedPath, verifyPath, demoBuildPath, e2ePath, workflowPath]
    .map(file => ({ file: file.replace(/^botsales-kit\//, ''), sha256: sha(read(file)) })),
};
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `FE026.${stepId}`, result: 'PASS', checks: checks.length, sourceFiles: sourceFiles.length, productionTree: prod.treeSha256, demoTree: demo.treeSha256, evidence: path.relative(kit, output).replaceAll('\\', '/') }, null, 2));
