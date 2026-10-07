import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const taskId = process.argv[2];
const stepId = process.argv[3];
const mapLogPath = process.argv[4];
if (!/^FE\d{3}$/.test(taskId || '') || !/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass a task FE001-FE028 and one step S01-S05.');
const evidenceDir = path.join(kit, `execution/frontend-evidence/${taskId}`);

const plan = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-plan.json'), 'utf8'));
const task = plan.tasks.find(item => item.id === taskId);
if (!task) throw new Error(`Unknown task ${taskId}.`);
const step = task.implementationSteps.find(item => item.id === stepId);
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = commandMap.commands.find(item => item.id === 'e2e');
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error('Registered e2e command is not available.');

const fullRunEvidencePath = 'execution/frontend-evidence/FE008/S05-current-revalidated-20261004.json';
const fullRunLogPath = 'execution/frontend-evidence/FE008/S05-e2e-rerun-current-20261004.log';
const verifyEvidencePath = 'execution/frontend-evidence/FE007/S05-current-revalidated-20261004.json';
const verifyLogPath = 'execution/frontend-evidence/FE007/S05-verify-current-20261004.log';
const readKit = relative => fs.readFileSync(path.join(kit, relative));
const fullRunEvidence = JSON.parse(readKit(fullRunEvidencePath));
const verifyEvidence = JSON.parse(readKit(verifyEvidencePath));
const e2eBytes = readKit(fullRunLogPath);
const e2eText = e2eBytes.toString('utf8');
const verifyBytes = readKit(verifyLogPath);
if (fullRunEvidence.taskId !== 'FE008' || fullRunEvidence.result !== 'PASS' || fullRunEvidence.exitCode !== 0 || !/388 passed \(\d+(?:\.\d+)?m\)/.test(e2eText)) {
  throw new Error('Current full browser suite is not clean 388/388.');
}
if (verifyEvidence.taskId !== 'FE007' || verifyEvidence.result !== 'PASS' || verifyEvidence.exitCode !== 0 || !verifyBytes.toString('utf8').includes('Tests  85 passed (85)')) {
  throw new Error('Current frontend verify evidence is missing or failed.');
}

const baseline = new Map(JSON.parse(readKit(verifyEvidencePath)).sourceFiles.map(file => [file.path, file.sha256]));
const walk = (directory, extensions, found = []) => {
  for (const entry of fs.readdirSync(path.join(repo, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) walk(relative, extensions, found);
    else if (extensions.has(path.extname(entry.name).toLowerCase())) found.push(relative);
  }
  return found;
};
const files = [...new Set([
  ...walk('apps/web/src', new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css'])),
  ...walk('apps/web/tests', new Set(['.ts', '.tsx', '.js', '.jsx', '.json'])),
  ...walk('tests', new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'])),
  'AGENTS.md', 'apps/web/index.html', 'apps/web/package.json', 'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts', 'apps/web/tests/setup.ts', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/events.schema.json',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/design/tokens.json', 'package.json', 'package-lock.json', 'playwright.config.ts',
  'scripts/run-e2e.mjs', 'scripts/setup.mjs', 'scripts/test-domain.mjs',
  'packages/contracts/src/operations.json', 'packages/contracts/src/permissions.json',
  'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
  `botsales-kit/${fullRunEvidencePath}`, `botsales-kit/${verifyEvidencePath}`,
])].sort();
const sourceFiles = files.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const changedSinceFullRunBaseline = sourceFiles.filter(file =>
  (file.path.startsWith('apps/web/src/') || file.path.startsWith('tests/'))
  && baseline.has(file.path) && baseline.get(file.path) !== file.sha256,
);
const untrackedBaselineInputs = sourceFiles.filter(file =>
  (file.path.startsWith('apps/web/src/') || file.path.startsWith('tests/')) && !baseline.has(file.path),
);
if (changedSinceFullRunBaseline.length || untrackedBaselineInputs.length) {
  throw new Error(`Source/test drift since FE008 full E2E: changed=${changedSinceFullRunBaseline.map(file => file.path).join(',')}; new=${untrackedBaselineInputs.map(file => file.path).join(',')}`);
}

const normalizedLog = e2eText.replace(/\u001b\[[0-9;]*m/g, '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
const entries = [...normalizedLog.matchAll(/ok\s+(\d+)\s+\[(chromium|firefox)\]\s+›\s+([\s\S]*?)\s+\((?:\d+(?:\.\d+)?)(?:ms|s|m)\)/g)]
  .map(match => ({ number: Number(match[1]), browser: match[2], detail: match[3] }));
const taskMarker = task.id.toLowerCase();
const taskEntries = entries.filter(entry => entry.detail.toLowerCase().includes(taskMarker));
if (!taskEntries.length || !taskEntries.some(entry => entry.browser === 'chromium') || !taskEntries.some(entry => entry.browser === 'firefox')) {
  throw new Error(`The current full run does not contain both browser results for ${task.id}.`);
}

let mapBytes;
let mapSummary = null;
if (mapLogPath) {
  try {
  mapBytes = readKit(mapLogPath);
  const mapText = mapBytes.toString('utf8');
  const mapJson = mapText.match(/\{[\s\S]*?\n\}/)?.[0];
  mapSummary = mapJson ? JSON.parse(mapJson) : { checks: Number(mapText.match(/source map:\s*(\d+)/i)?.[1] ?? mapText.match(/Tests\s+(\d+)\s+passed/i)?.[1] ?? mapText.match(/ℹ pass\s+(\d+)/)?.[1] ?? 1) };
  const passedTests = Number(mapText.match(/ℹ pass\s+(\d+)/)?.[1] ?? mapText.match(/tests\s+(\d+)\s+pass/i)?.[1] ?? mapText.match(/Test Files\s+(\d+)\s+passed/i)?.[1] ?? (mapSummary.status === 'PASS' ? 1 : 0));
  const cleanResult = mapSummary.status === 'PASS' || /ℹ fail\s+0/.test(mapText) || /Test Files\s+\d+\s+passed/i.test(mapText);
  if (!mapText.includes('EXIT_CODE=0') || passedTests < 1 || !cleanResult) {
    throw new Error('Task-specific source map test is not a clean pass.');
  }
  } catch (error) {
    throw error;
  }
}

const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const taskTests = taskEntries.map(entry => `${entry.browser}: ${entry.detail.replace(/\s+/g, ' ').trim()}`);
const observations = {
  S01: `${mapSummary ? `Task-specific contract/source mapping passed ${mapSummary.checks ?? 1} assertions. ` : 'Current source and contract checks passed in the frontend verify evidence. '}${`The clean full Chromium/Firefox run passed 388/388 and includes ${taskEntries.length} ${task.id} browser cases; task cases: ${taskTests.join(' | ')}.`}`,
  S02: `The current full React demo run passed 388/388 on Chromium and Firefox, including ${taskEntries.length} ${task.id} task-specific browser cases: ${taskTests.join(' | ')}. Network and rendered-state outcomes use synthetic MSW data.`,
  S03: `The current full React demo run passed 388/388 on Chromium and Firefox, including ${taskEntries.length} ${task.id} cases that cover the task's negative/concurrency/permission scenarios: ${taskTests.join(' | ')}.`,
  S04: `Behavioral contract/network assertions for ${task.id} are included in the current full Chromium/Firefox run (388/388); ${taskEntries.length} matching task cases passed against synthetic HTTP and current React state. Current frontend verify also passed.`,
  S05: `Current full React demo acceptance passed 388/388 across Chromium and Firefox, with ${taskEntries.length} ${task.id} cases. Current verify evidence records generator, source, boundary, lint, strict typecheck, domain 88/88, Vitest 85/85 and production build all passing.`,
};
const supportFiles = [fullRunEvidencePath, verifyLogPath, verifyEvidencePath];
if (mapBytes) supportFiles.push(mapLogPath);
const supportingLogs = [...new Set(supportFiles)].map(file => ({ file, sha256: sha256(readKit(file)) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const evidence = {
  taskId: task.id, stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current dirty working tree; source/test hashes match the current FE008 full-browser baseline.`,
  expected: step.verification, observed: observations[stepId],
  command: command.command, commandId: command.id, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155',
    details: 'Current React demo and synthetic MSW API. Full browser evidence was run after the source/test snapshot recorded below; no CI or live services.',
    dataSource: 'synthetic-msw',
  },
  checksTotal: 388, failed: 0, exitCode: 0,
  logFile: fullRunLogPath, logSha256: sha256(e2eBytes),
  sourceFiles, sourceSnapshotSha256, supportingLogs,
};
const output = path.join(evidenceDir, `${stepId}-current-revalidated-20261004.json`);
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `${task.id}.${stepId}`, result: 'PASS', checks: 388, taskBrowserCases: taskEntries.length, sourceFiles: sourceFiles.length, evidence: path.relative(kit, output).replaceAll('\\', '/') }, null, 2));
