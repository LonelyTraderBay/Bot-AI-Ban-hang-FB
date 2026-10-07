import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();
const kit = path.join(repo, 'botsales-kit');
const ledgerPath = path.join(kit, 'execution/frontend-progress.json');
const planPath = path.join(kit, 'execution/frontend-plan.json');
const unitLogRoot = 'botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-20261005.log';
const unitLogLedger = 'execution/frontend-evidence/FE006/S05-unit-current-20261005.log';
const verifyLogRoot = 'evidence/frontend-ui-improvements/UI027/S04-verify-20261005.log';
const e2eLogRoot = 'evidence/frontend-ui-improvements/UI027/S04-e2e-full-20261005.log';
const profileRoot = 'evidence/frontend-ui-improvements/UI027/S05-paired-performance-20261005.md';
const runnerPath = 'evidence/frontend-ui-improvements/UI027/revalidate-ledger-20261005.mjs';
const allowedChangedSources = new Set([
  'apps/web/vite.config.ts',
  'evidence/frontend-ui-improvements/UI027/revalidate-ledger-20261005.mjs',
  'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
  'docs/FRONTEND_SCOPE.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/CONTINUE_FRONTEND.md',
  'docs/KNOWN_GAPS.md',
  'README.md',
  'evidence/REPORT.md',
  'botsales-kit/execution/SESSION_HANDOFF.md',
  'evidence/boundaries.json',
  'evidence/source-check.json',
]);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8'));
const hashFile = file => sha256(fs.readFileSync(path.join(repo, file)));
const progress = args => {
  const result = spawnSync(process.execPath, ['botsales-kit/scripts/progress.mjs', ...args], {
    cwd: repo, encoding: 'utf8', windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`progress.mjs ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(repo.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${repo}`);
const plan = readJson('botsales-kit/execution/frontend-plan.json');
const initialLedger = readJson('botsales-kit/execution/frontend-progress.json');
const commandMap = readJson('botsales-kit/execution/frontend-command-map.json');
const unitCommand = commandMap.commands.find(item => item.id === 'unit' && item.status === 'VERIFIED_AVAILABLE');
assert(unitCommand, 'Registered current unit command is not verified available.');
const unitText = fs.readFileSync(path.join(repo, unitLogRoot), 'utf8');
const verifyText = fs.readFileSync(path.join(repo, verifyLogRoot), 'utf8');
const e2eText = fs.readFileSync(path.join(repo, e2eLogRoot), 'utf8');
assert(/Tests\s+85 passed \(85\)/.test(unitText), 'Current unit evidence is not 85/85.');
assert(/Tests\s+85 passed \(85\)/.test(verifyText) && /Test Files\s+10 passed \(10\)/.test(verifyText)
  && verifyText.includes('"status":"PASS"') && verifyText.includes('✓ built in'), 'Current verify/build is incomplete.');
assert(e2eText.includes('388 passed (24.2m)'), 'Current built-demo E2E is not 388/388.');
const initialStatus = JSON.parse(progress(['status']));
assert(initialStatus.blocked.length === 0, 'Refusing revalidation while an active FE task is BLOCKED.');
const originalStale = [...initialStatus.stale];
const originalEvidence = new Map();
for (const id of originalStale) {
  const stateTask = initialLedger.tasks[id];
  assert(stateTask && Object.values(stateTask.steps).every(step => step.evidence?.path), `Missing prior evidence for ${id}.`);
  for (const [stepId, stateStep] of Object.entries(stateTask.steps)) {
    const relative = `botsales-kit/${stateStep.evidence.path}`;
    const evidence = readJson(relative);
    assert(evidence.sourceFiles?.length, `Missing previous source snapshot for ${id}.${stepId}.`);
    const changed = [];
    for (const source of evidence.sourceFiles) {
      const normalized = source.path.replaceAll('\\', '/');
      assert(fs.existsSync(path.join(repo, normalized)), `Missing prior source ${normalized} in ${id}.${stepId}.`);
      if (hashFile(normalized) !== source.sha256) changed.push(normalized);
    }
    const unexpected = changed.filter(file => !allowedChangedSources.has(file));
    assert(unexpected.length === 0, `Unreviewed source drift in ${id}.${stepId}: ${unexpected.join(', ')}`);
    originalEvidence.set(`${id}.${stepId}`, { relative, evidence, changed });
  }
}

const extraEvidenceSources = [unitLogRoot, verifyLogRoot, e2eLogRoot, profileRoot, runnerPath];
const currentRunEvidence = [
  { command: unitCommand.command, commandId: 'unit', logFile: unitLogLedger, logSha256: hashFile(unitLogRoot), checksTotal: 85, failed: 0 },
  { command: 'UI027 post-change npm verify and production build', logFile: verifyLogRoot,
    logSha256: hashFile(verifyLogRoot), checksTotal: 8, failed: 0 },
  { command: 'UI027 post-change full browser E2E on the built demo', logFile: e2eLogRoot,
    logSha256: hashFile(e2eLogRoot), checksTotal: 388, failed: 0 },
  { report: profileRoot, sha256: hashFile(profileRoot), note: 'paired baseline/current chunk and Chromium performance profile' },
];
const revalidated = [];

function nextReadyStaleTask(live) {
  const candidates = live.stale.filter(id => id !== 'FE028').map(id => plan.tasks.find(task => task.id === id))
    .filter(Boolean)
    .filter(task => task.dependsOn.every(dependency => !live.stale.includes(dependency)))
    .sort((a, b) => a.priority - b.priority);
  return candidates[0] || null;
}

function createEvidence(task, step) {
  const prior = originalEvidence.get(`${task.id}.${step.id}`);
  assert(prior, `No preserved evidence input for ${task.id}.${step.id}.`);
  const old = prior.evidence;
  const rootLog = step.requiredEvidenceKind === 'test_run'
    ? unitLogRoot
    : `botsales-kit/execution/frontend-evidence/${task.id}/${step.id}-post-doc-sync-final-20261005.log`;
  const ledgerLog = step.requiredEvidenceKind === 'test_run'
    ? unitLogLedger
    : `execution/frontend-evidence/${task.id}/${step.id}-post-doc-sync-final-20261005.log`;
  if (ledgerLog !== unitLogLedger) {
    const logPath = path.join(kit, ledgerLog);
    if (fs.existsSync(logPath)) throw new Error(`Refusing to overwrite ${logPath}`);
    const logBody = [
      `${task.id}.${step.id} post-document-sync revalidation`, `executedAt=${new Date().toISOString()}`,
      `requiredEvidenceKind=${step.requiredEvidenceKind}`, `priorEvidence=${prior.relative}`,
      `changedSources=${prior.changed.join(', ') || 'none'}`,
      'currentUnit=PASS 85/85; currentVerifyAndProductionBuild=PASS; currentBuiltDemoE2E=PASS 388/388',
      `primaryLog=${rootLog}`, 'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no Backend/provider/staging/hosted CI claim',
    ].join('\n') + '\n';
    fs.writeFileSync(logPath, logBody, { encoding: 'utf8', flag: 'wx' });
  }
  const sourcePaths = new Set(old.sourceFiles.map(file => file.path.replaceAll('\\', '/')));
  sourcePaths.add(prior.relative);
  for (const file of extraEvidenceSources) sourcePaths.add(file);
  const sourceFiles = [...sourcePaths].sort().map(file => ({ path: file, sha256: hashFile(file) }));
  const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles
    .map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
  const changedText = prior.changed.length ? prior.changed.join(', ') : 'no source mismatches';
  const observed = `Retained the prior checkpoint-specific evidence at ${prior.relative} and refreshed every recorded source hash. The only changed sources are ${changedText}. After the UI027 Vite chunk-only change, current unit tests pass 85/85, full verify/source/boundary/type/lint/domain/build checks pass, and the built-demo browser regression passes 388/388 across Chromium and Firefox. UI modules, route behavior, contracts and CSS were not changed by UI027.`;
  const evidence = {
    taskId: task.id, stepId: step.id, kind: step.requiredEvidenceKind, result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim()} plus current frontend working tree`,
    expected: old.expected || step.verification, observed,
    command: step.requiredEvidenceKind === 'test_run' ? unitCommand.command : `Read prior checkpoint and current UI027 verify/E2E/performance evidence for ${task.id}.${step.id}`,
    ...(step.requiredEvidenceKind === 'test_run' ? { commandId: 'unit' } : {}),
    cwd: repo, reviewer: 'Codex self-review; no independent peer review',
    environment: {
      name: 'Windows / Node 24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155',
      details: 'Local Frontend React app, deterministic synthetic MSW; no live Backend/provider. Current Vite chunk change has a fresh full verify and browser regression run.',
      dataSource: 'synthetic-msw',
    },
    checksTotal: step.requiredEvidenceKind === 'test_run' ? 85 : Math.max(1, old.checksTotal || 1),
    failed: 0, logFile: ledgerLog, logSha256: hashFile(rootLog), sourceFiles, sourceSnapshotSha256,
    priorEvidence: { path: prior.relative, sha256: hashFile(prior.relative), executedAt: old.executedAt,
      observed: old.observed, logFile: old.logFile, logSha256: old.logSha256 },
    supplementaryEvidence: currentRunEvidence,
  };
  return { evidence, rootLog, ledgerLog, sourceSnapshotSha256, changed: prior.changed };
}

let live = initialStatus;
while (live.stale.some(id => id !== 'FE028')) {
  assert(live.blocked.length === 0, `Active FE task became blocked: ${JSON.stringify(live.blocked)}`);
  const task = nextReadyStaleTask(live);
  assert(task, `No dependency-ready stale task; remaining=${live.stale.join(',')}`);
  const nextTask = live.next.find(item => item.id === task.id);
  const firstPending = nextTask?.nextStep?.id;
  assert(firstPending, `Tracker did not select a pending step for ${task.id}.`);
  const stateTask = readJson('botsales-kit/execution/frontend-progress.json').tasks[task.id];
  if (stateTask.status !== 'IN_PROGRESS') {
    progress(['start', task.id, 'Codex', '--defer-reports']);
  }
  const startIndex = task.implementationSteps.findIndex(step => step.id === firstPending);
  assert(startIndex >= 0, `Unknown selected step ${task.id}.${firstPending}.`);
  const firstChangedStep = task.implementationSteps.find(step => originalEvidence.get(`${task.id}.${step.id}`)?.changed.length > 0);
  assert(firstChangedStep?.id === firstPending,
    `Tracker next step ${task.id}.${firstPending} does not match first changed source checkpoint ${firstChangedStep?.id || 'none'}.`);
  for (const step of task.implementationSteps.slice(startIndex)) {
    const priorForStep = originalEvidence.get(`${task.id}.${step.id}`);
    assert(priorForStep, `No previous evidence record for ${task.id}.${step.id}.`);
    if (priorForStep.changed.length === 0) continue;
    const { evidence } = createEvidence(task, step);
    const outputName = `${step.id}-post-doc-sync-final-20261005.json`;
    const outputPath = path.join(kit, 'execution/frontend-evidence', task.id, outputName);
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    const relativeEvidence = `execution/frontend-evidence/${task.id}/${outputName}`;
    progress(['checkpoint', task.id, step.id, relativeEvidence, '--defer-reports']);
    revalidated.push(`${task.id}.${step.id}`);
  }
  live = JSON.parse(progress(['status']));
}

const validation = JSON.parse(progress(['validate']));
progress(['report']);
const finalStatus = JSON.parse(progress(['status']));
assert(finalStatus.blocked.length === 0, `Unexpected FE blocker after revalidation: ${JSON.stringify(finalStatus.blocked)}`);
assert(finalStatus.stale.every(id => id === 'FE028'), `Unexpected stale task outside deferred final document review: ${finalStatus.stale.join(', ')}`);
const result = {
  before: { verifiedSteps: initialStatus.verifiedSteps, totalSteps: initialStatus.totalSteps,
    stale: originalStale, blocked: initialStatus.blocked },
  revalidated,
  validate: validation,
  after: { verifiedSteps: finalStatus.verifiedSteps, totalSteps: finalStatus.totalSteps,
    overallPercent: finalStatus.overallPercent, stale: finalStatus.stale, blocked: finalStatus.blocked, next: finalStatus.next },
  evidenceBasis: { unitLog: unitLogRoot, verifyLog: verifyLogRoot, e2eLog: e2eLogRoot, pairedPerformance: profileRoot },
};
console.log(JSON.stringify(result, null, 2));
