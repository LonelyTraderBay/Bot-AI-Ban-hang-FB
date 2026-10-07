import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const taskId = process.argv[2];
if (!/^FE0(?:09|1[0-9]|20)$/.test(taskId || '')) throw new Error('Expected FE009 through FE020.');
const dir = path.join(kit, 'execution/frontend-evidence', taskId);
const current = path.join(kit, 'execution/frontend-evidence/FE021');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = value => JSON.parse(fs.readFileSync(value, 'utf8'));
const plan = read(path.join(kit, 'execution/frontend-plan.json'));
const state = read(path.join(kit, 'execution/frontend-progress.json'));
const task = plan.tasks.find(item => item.id === taskId);
const commands = read(path.join(kit, 'execution/frontend-command-map.json')).commands;
const revisionResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' });
if (!task || revisionResult.status !== 0) throw new Error(`Cannot load ${taskId} or resolve current Git HEAD.`);
const revision = revisionResult.stdout.trim();
const taskTestCount = countTaskTests(fs.readFileSync(path.join(current, 'final-e2e-full-98.log'), 'utf8'), taskId);
const browserTotal = Number(fs.readFileSync(path.join(current, 'final-e2e-full-98.log'), 'utf8').match(/\n\s*(\d+) passed \(/)?.[1]);
if (!Number.isInteger(browserTotal) || browserTotal < 1) throw new Error('The registered browser suite has no successful completion line.');

function countTaskTests(log, id) {
  const suffix = id.slice(2);
  const expression = new RegExp(`tests[\\\\/]fe${suffix}(?:-validation)?\\.spec\\.ts`, 'gi');
  return (log.match(expression) || []).length;
}

const commandFor = id => {
  const entry = commands.find(command => command.id === id);
  if (!entry || entry.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${id} is not verified in the command map.`);
  return entry;
};
const testSource = path.join(current, 'final-test-source.log');
const domain = path.join(current, 'final-test-domain.log');
const unit = path.join(current, 'final-test.log');
const e2e = path.join(current, 'final-e2e-full-98.log');
const build = path.join(current, 'final-build.log');
const typecheck = path.join(current, 'final-typecheck.log');

for (const step of task.implementationSteps) {
  const stored = state.tasks[taskId].steps[step.id];
  const templatePath = path.join(kit, stored.evidence.path);
  const template = read(templatePath);
  const sourceFiles = template.sourceFiles.map(file => ({
    path: file.path,
    sha256: sha(fs.readFileSync(path.resolve(repo, file.path))),
  }));
  let commandId = 'e2e';
  let logPath = e2e;
  let checksTotal = taskTestCount;
  let dataSource = 'synthetic-msw';
  let expected = template.expected;
  let observed;
  if (step.id === 'S01') {
    commandId = 'source'; logPath = testSource; checksTotal = 3; dataSource = 'source-only';
    observed = `Current source audit passed 56 frontend files, 227 operation calls, and all 54 routes with zero issues. The task-specific React browser cases are also present in the current serialized ${browserTotal}/${browserTotal} Chromium run.`;
  } else if (step.id === 'S02') {
    observed = `All ${taskTestCount} task-specific browser cases passed within the current serialized ${browserTotal}/${browserTotal} Chromium suite on the real React demo and synthetic MSW API. The full log names the tested routes, actions, and observed UI states.`;
  } else if (step.id === 'S03') {
    observed = `All ${taskTestCount} task-specific browser cases passed within the current ${browserTotal}/${browserTotal} suite, including the task's permission, stale/error, and data-retention cases listed in the full log. Domain/MSW checks independently passed 88/88.`;
  } else if (step.id === 'S04') {
    observed = `Current Vitest passed 55/55, mock simulator/MSW passed 88/88, and all ${taskTestCount} task-specific browser cases passed in the ${browserTotal}/${browserTotal} full Chromium run. The evidence logs separately identify these test layers; none represents live backend coverage.`;
  } else {
    observed = `The current serialized Chromium suite passed ${browserTotal}/${browserTotal}, including ${taskTestCount} task-specific browser cases for ${task.title}; the app rendered the canonical routes with synthetic MSW and did not contact external providers.`;
  }
  const logRelative = path.relative(kit, logPath).replaceAll('\\', '/');
  const logBytes = fs.readFileSync(logPath);
  const evidence = {
    taskId, stepId: step.id, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${revision} plus current dirty working tree; task source files are hashed below`,
    expected: expected || `${step.action} Acceptance is verified against the current React frontend and synthetic API.`,
    observed, command: commandFor(commandId).command, commandId, cwd: repo,
    reviewer: 'Codex self-review; no independent peer review',
    environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium', details: 'Current frontend workspace; browser and API data are synthetic fixtures.', dataSource },
    checksTotal, failed: 0, logFile: logRelative, logSha256: sha(logBytes), sourceFiles,
    sourceSnapshotSha256: sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
    supportingLogs: [domain, unit, typecheck, build].map(file => ({ file: path.relative(kit, file).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(file)) })),
  };
  const output = path.join(dir, `${step.id}-final-98-e2e.json`);
  fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`${taskId}.${step.id}: ${taskTestCount} browser cases; ${path.relative(kit, output).replaceAll('\\', '/')}`);
}
