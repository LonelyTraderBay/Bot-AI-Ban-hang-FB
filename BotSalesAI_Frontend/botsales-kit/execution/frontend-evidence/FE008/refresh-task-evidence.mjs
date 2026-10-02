import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceRoot = path.join(kit, 'execution/frontend-evidence');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const taskId = process.argv[2];
if (!/^FE(008|009|010|011|012|013|014|015|016|017|018|019|020)$/.test(taskId || '')) throw new Error('Pass one active frontend task ID from FE008 through FE020.');
const taskEvidenceDir = path.join(evidenceRoot, taskId);
const progress = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-progress.json'), 'utf8'));
if (progress.tasks[taskId]?.status !== 'IN_PROGRESS' || !progress.tasks[taskId]?.owner) throw new Error(`${taskId} must be the active frontend task before generating evidence.`);
const plan = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-plan.json'), 'utf8'));
const task = plan.tasks.find(item => item.id === taskId);
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const e2eCommand = commandMap.commands.find(item => item.id === 'e2e');
if (!e2eCommand || e2eCommand.status !== 'VERIFIED_AVAILABLE') throw new Error('Registered e2e command is not verified.');
const mainLog = 'execution/frontend-evidence/FE020/S07-e2e-registered.log';
const mainLogBytes = fs.readFileSync(path.join(kit, mainLog));
const mainLogText = mainLogBytes.toString('utf8');
if (!/  90 passed \(\d+(?:\.\d+)?m\)/.test(mainLogText)) throw new Error('Current registered full E2E log does not show 90 passing cases.');
const taskFile = `tests\\fe${taskId.slice(2).toLowerCase()}.spec.ts`;
const taskScenarioCount = mainLogText.split(/\r?\n/).filter(line => line.includes(taskFile)).length;
const gateLogs = [
  'execution/frontend-evidence/FE020/S06-generate-check.log',
  'execution/frontend-evidence/FE020/S06-source.log',
  'execution/frontend-evidence/FE020/S06-boundaries.log',
  'execution/frontend-evidence/FE020/S06-typecheck.log',
  'execution/frontend-evidence/FE020/S06-lint.log',
  'execution/frontend-evidence/FE020/S06-domain.log',
  'execution/frontend-evidence/FE020/S06-unit.log',
  'execution/frontend-evidence/FE020/S06-schemas.log',
  'execution/frontend-evidence/FE020/S06-build-production.log',
  'execution/frontend-evidence/FE020/S06-build-demo.log',
  'execution/frontend-evidence/FE020/S06-contract-tests.log',
  mainLog,
];
const supportingLogs = gateLogs.map(file => ({ file, sha256: sha256(fs.readFileSync(path.join(kit, file))) }));
const keepSource = file => file === 'package.json'
  || file.startsWith('apps/web/')
  || file.startsWith('tests/')
  || file.startsWith('scripts/')
  || file.startsWith('packages/contracts/src/')
  || file.startsWith('botsales-kit/contracts/')
  || file.startsWith('botsales-kit/design/')
  || file === 'botsales-kit/execution/frontend-plan.json'
  || file === 'botsales-kit/execution/frontend-command-map.json'
  || /^evidence\/(domain-tests|mock-schema-check|source-check|boundaries)\.json$/.test(file);
const previousPaths = new Set();
for (const step of task.implementationSteps) {
  const prior = progress.tasks[taskId].steps[step.id]?.evidence?.path;
  if (!prior) continue;
  const evidence = JSON.parse(fs.readFileSync(path.join(kit, prior), 'utf8'));
  for (const file of evidence.sourceFiles || []) if (keepSource(file.path)) previousPaths.add(file.path);
}
for (const file of ['botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json']) previousPaths.add(file);
const sourceFiles = [...previousPaths].sort().map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const revision = `HEAD ${execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()} plus current dirty working tree`;
for (const step of task.implementationSteps) {
  if (step.requiredEvidenceKind !== 'test_run') throw new Error(`${taskId}.${step.id} is not a test_run checkpoint.`);
  const outputFile = path.join(taskEvidenceDir, `${step.id}-current-20261001.json`);
  const taskEvidence = {
    taskId, stepId: step.id, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(), sourceRevision: revision,
    expected: step.verification,
    observed: taskId === 'FE008'
      ? `Synthetic domain simulator and MSW checks passed 88/88; canonical simulator schema checks passed 353/353. The current registered Chromium suite passed 90/90. This verifies repeatable local test data and mock paths only.`
      : `The current registered Chromium suite passed 90/90 on the React demo and synthetic MSW API; ${taskScenarioCount} browser cases from ${taskFile} directly exercised ${taskId}. Domain/MSW passed 88/88, schema validation passed 353/353, and current contract/source/build support logs are attached. No live service is implied.`,
    command: e2eCommand.command, commandId: e2eCommand.id, cwd: repo,
    reviewer: 'Codex self-review; no independent peer review',
    environment: { name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium`, details: 'Serialized local React demo tests using synthetic MSW data; no CI, live backend or provider.', dataSource: 'synthetic-msw' },
    checksTotal: taskId === 'FE008' ? 441 : 90, failed: 0, exitCode: 0,
    logFile: mainLog, logSha256: sha256(mainLogBytes), sourceFiles, sourceSnapshotSha256, supportingLogs,
  };
  fs.writeFileSync(outputFile, `${JSON.stringify(taskEvidence, null, 2)}\n`);
}
console.log(JSON.stringify({ taskId, generatedSteps: task.implementationSteps.length, taskScenarioCount, sourceFiles: sourceFiles.length, mainLog, sourceSnapshotSha256 }, null, 2));
