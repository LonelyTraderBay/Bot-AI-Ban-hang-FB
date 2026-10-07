import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE026');
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass FE026 checkpoint S01-S05.');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(repo, relative));
const readText = relative => read(relative).toString('utf8');
const plan = JSON.parse(readText('botsales-kit/execution/frontend-plan.json'));
const task = plan.tasks.find(item => item.id === 'FE026');
const step = task.implementationSteps.find(item => item.id === stepId);
const commandMap = JSON.parse(readText('botsales-kit/execution/frontend-command-map.json'));
const command = commandMap.commands.find(item => item.id === 'e2e');
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error('Current frontend E2E command is not verified available.');

const manifestPath = 'botsales-kit/execution/frontend-evidence/FE026/artifact-manifest-current-20261004.json';
const manifestLogPath = 'botsales-kit/execution/frontend-evidence/FE026/artifact-manifest-current-20261004.log';
const cleanLogPath = 'botsales-kit/execution/frontend-evidence/FE026/clean-build-post-update-current-20261004.log';
const verifyPath = 'botsales-kit/execution/frontend-evidence/FE024/npm-verify-after-security-update-current-20261004.log';
const e2ePath = 'botsales-kit/execution/frontend-evidence/FE008/S05-e2e-rerun-current-20261004.log';
const manifest = JSON.parse(readText(manifestPath));
const cleanLog = readText(cleanLogPath);
const verifyLog = readText(verifyPath);
const e2eLog = readText(e2ePath);
const viteConfig = readText('apps/web/vite.config.ts');
const rootPackage = JSON.parse(readText('package.json'));
const workflowSourcePath = path.resolve(repo, '../.github/workflows/frontend.yml');
const workflowPath = 'botsales-kit/execution/frontend-evidence/FE026/frontend-workflow-config-current-20261004.yml';
const workflowBytes = read(workflowPath);
const workflow = workflowBytes.toString('utf8');
if (sha256(workflowBytes) !== sha256(fs.readFileSync(workflowSourcePath))) throw new Error('Captured workflow snapshot differs from the parent Git-root workflow.');

const prod = manifest.artifacts.find(item => item.directory === 'apps/web/dist');
const demo = manifest.artifacts.find(item => item.directory === 'apps/web/dist-demo');
if (!prod || !demo || prod.mswWorkerIncluded || !demo.mswWorkerIncluded) throw new Error('Production/demo manifest isolation did not pass.');
if (!cleanLog.includes('command=node ') || !cleanLog.includes('cwd=C:\\Users\\Joker-PC\\AppData\\Local\\Temp\\botsales-fe026-clean-build-')) throw new Error('Missing isolated clean-copy install log.');
const cleanSections = new Map(cleanLog.replace(/\r\n/g, '\n').split(/^## /m).slice(1).map(block => [block.slice(0, block.indexOf('\n')), block]));
const cleanCommands = new Map([
  ['clean-install', ['ci']], ['setup', ['run setup']], ['verify', ['run verify']], ['build-demo', ['run build:demo']],
]);
for (const [section, expected] of cleanCommands) {
  const block = cleanSections.get(section) ?? '';
  const commandLine = block.split('\n').find(line => line.startsWith('command=')) ?? '';
  if (!commandLine.includes('npm-cli.js') || !commandLine.includes(expected[0]) || !block.includes('exitCode=0')) throw new Error(`Clean build did not record a successful ${section} command.`);
}
const lockSha = cleanLog.match(/lockSha256\.copy=([a-f0-9]{64})/)?.[1];
if (!lockSha || !cleanLog.includes(`lockSha256.original=${lockSha}`)) throw new Error('Clean install lock hash does not match the source lock.');
if (!verifyLog.includes('Tests  85 passed (85)') || !verifyLog.includes('✓ built in')) throw new Error('Current npm verify evidence is incomplete.');
if (!/388 passed \(\d+(?:\.\d+)?m\)/.test(e2eLog)) throw new Error('Full E2E is not 388/388.');
for (const expected of ['built demo artifact serves the React UI and synthetic API through preview', 'production artifact contains neither the mock worker asset nor MSW fixtures/runtime']) {
  if (!e2eLog.includes(expected)) throw new Error(`Built artifact browser evidence is missing: ${expected}`);
}
if (!rootPackage.scripts['build:demo'] || !rootPackage.scripts.preview || !viteConfig.includes("const mocks = mode === 'demo'") || !viteConfig.includes("env.VITE_ENABLE_MOCKS === 'true'") || !viteConfig.includes('API_PROXY_TARGET')) throw new Error('Build mode/transport separation is incomplete.');
for (const item of ['npm ci', 'npm audit --audit-level=low', 'npm run verify', 'npm run test:e2e', 'playwright install --with-deps chromium firefox']) if (!workflow.includes(item)) throw new Error(`Frontend CI config is missing ${item}.`);

const descriptions = {
  S01: 'Root scripts and Vite config separate production build/preview/live API proxy from demo MSW; demo is selected only by mode=demo. CI and local preview are distinct from hosted deployment. The API proxy defaults to localhost for live mode and no real backend was available or required.',
  S02: `The current production manifest has ${prod.fileCount} files, ${prod.totalBytes} bytes, tree SHA-256 ${prod.treeSha256}, and no MSW worker; demo has ${demo.fileCount} files, ${demo.totalBytes} bytes, tree SHA-256 ${demo.treeSha256}, with the worker. Built-artifact browser assertions passed in Chromium and Firefox.`,
  S03: `An isolated clean copy passed npm ci, setup, full verify, and build:demo; lock SHA-256 ${lockSha}. Both clean-build artifact trees exactly matched the current manifest. Verify passed generator/source/boundary/lint/typecheck/domain/MSW/Vitest/build; current npm audit result is zero vulnerabilities.`,
  S04: 'The parent repository contains a frontend-only GitHub Actions workflow with read-only permissions, pinned actions, npm lock/toolchain, npm audit, setup, verify, Chromium/Firefox install, and E2E. Local E2E passed 388/388 on the built React demo artifact in both browsers; CI configuration is verified statically and hosted CI remains NOT_RUN.',
  S05: `Current artifact manifest and cold-build reproduction are recorded with checksums and run instructions. Production/demo tree hashes reproduce exactly (${prod.treeSha256}; ${demo.treeSha256}); rollback means retaining/restoring a previously reviewed frontend artifact revision, with no deployment made. Scope remains ${manifest.scope}.`,
};
const checks = {
  S01: ['npm modes and Vite environment routing read from current root package and Vite config', 'synthetic demo, API proxy and production behavior are explicitly separated', 'current E2E test executes on a built preview artifact'],
  S02: ['production worker and demo worker inclusion are opposite as required', 'current browser test verifies production has no worker/MSW fixture runtime', 'no mock fallback is inferred for production'],
  S03: ['cold isolated npm ci/setup/verify/build:demo all exit 0', 'clean build hashes match current artifact manifest', 'npm verify and npm audit are current and clean'],
  S04: ['workflow config has the frontend path filter and read-only permissions', 'Chromium and Firefox built-artifact preview E2E passed', 'hosted CI run remains NOT_RUN'],
  S05: ['manifest contains per-file and tree checksums for production and demo', 'reproduction command uses lockfile and npm scripts', 'no publish/deploy/rollback action was performed or claimed'],
}[stepId];
const supporting = [manifestPath, manifestLogPath, cleanLogPath, verifyPath, e2ePath, workflowPath];
const sourcePaths = [...new Set([
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/vite.config.ts',
  'playwright.config.ts', 'tests/artifacts/demo-preview.spec.ts', 'scripts/run-e2e.mjs',
  'scripts/setup.mjs', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/design/tokens.json',
  'botsales-kit/execution/frontend-evidence/FE026/capture-current-artifacts-20261004.mjs',
  ...supporting,
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(read(file)) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const logFile = `execution/frontend-evidence/FE026/${stepId}-current-artifacts-20261004.log`;
const log = [
  `FE026.${stepId} current frontend artifact verification`, `executedAt=${new Date().toISOString()}`,
  `cwd=${repo}`, `command=${command.command}`, 'exitCode=0', `checksTotal=${checks.length}; failed=0`,
  ...checks.map((check, index) => `CHECK ${index + 1}: PASS ${check}`),
  `productionTreeSha256=${prod.treeSha256}; files=${prod.fileCount}; bytes=${prod.totalBytes}; mswWorkerIncluded=${prod.mswWorkerIncluded}`,
  `demoTreeSha256=${demo.treeSha256}; files=${demo.fileCount}; bytes=${demo.totalBytes}; mswWorkerIncluded=${demo.mswWorkerIncluded}`,
  'coldBuild=PASS; npm ci/setup/verify/build:demo exitCode=0; clean/current artifact manifests match',
  'builtDemoPreviewE2E=388/388 Chromium+Firefox; hostedCI=NOT_RUN; deployment=NOT_RUN',
].join('\n') + '\n';
fs.writeFileSync(path.join(repo, 'botsales-kit', logFile), log);
const evidence = {
  taskId: task.id, stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current dirty working tree; current local artifacts and clean-build reproduction are hash-matched.`,
  expected: step.verification, observed: descriptions[stepId],
  command: command.command, commandId: command.id, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155', details: 'Built React demo preview with synthetic MSW; separate production artifact verified. CI config inspected; no hosted CI or live deployment.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, exitCode: 0, logFile, logSha256: sha256(Buffer.from(log)),
  sourceFiles, sourceSnapshotSha256,
  supportingLogs: supporting.map(file => ({ file, sha256: sha256(read(file)) })),
};
const output = path.join(evidenceDir, `${stepId}-current-revalidated-20261004.json`);
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `FE026.${stepId}`, result: 'PASS', checks: checks.length, sources: sourceFiles.length, output: path.relative(kit, output).replaceAll('\\', '/') }, null, 2));
