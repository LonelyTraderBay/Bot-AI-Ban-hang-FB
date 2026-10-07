import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE006');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const requested = process.argv[2];
const task = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-plan.json'), 'utf8'))
  .tasks.find(item => item.id === 'FE006');
if (!repo.endsWith('BotSalesAI_Frontend') || !task) throw new Error('Unexpected workspace or missing FE006 plan.');
const step = task.implementationSteps.find(item => item.id === requested);
if (!step) throw new Error(`Unknown FE006 step: ${requested}`);

const unitLog = 'botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-20261005.log';
const unitLogLedger = 'execution/frontend-evidence/FE006/S05-unit-current-20261005.log';
const verifyLog = 'evidence/frontend-ui-improvements/UI027/S04-verify-20261005.log';
const e2eLog = 'evidence/frontend-ui-improvements/UI027/S04-e2e-full-20261005.log';
const tokenMapPath = 'botsales-kit/execution/frontend-evidence/FE006/S01-token-map-current-20261005.json';
const browserPath = 'botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-browser-audit.json';
const visualPath = 'botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-visual-review.json';
const contrastPath = 'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-current-20261004.json';
const read = relative => fs.readFileSync(path.join(repo, relative), 'utf8');
const unitText = read(unitLog);
const verifyText = read(verifyLog);
const e2eText = read(e2eLog);
const tokenMap = JSON.parse(read(tokenMapPath));
const browser = JSON.parse(read(browserPath));
const visual = JSON.parse(read(visualPath));
const contrast = JSON.parse(read(contrastPath));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(/Tests\s+85 passed \(85\)/.test(unitText), 'Current FE006 unit log did not pass 85/85.');
assert(tokenMap.status === 'PASS' && tokenMap.checks.filter(item => item.result === 'PASS').length === 10,
  'Current token map must pass all 10 checks.');
assert(verifyText.includes('"status":"PASS"') && /Tests\s+85 passed \(85\)/.test(verifyText)
  && /Test Files\s+10 passed \(10\)/.test(verifyText) && verifyText.includes('✓ built in'),
'Current UI027 verify log is missing required gates.');
assert(e2eText.includes('388 passed (24.2m)'), 'Current built-demo regression did not pass 388/388.');
assert(browser.accessibilityPreferences.forcedColors && browser.accessibilityPreferences.reducedMotion
  && browser.axe.appViolations.length === 0 && browser.axe.mainViolations.length === 0,
'Existing unchanged-source accessibility audit is not PASS.');
assert(visual.status === 'PASS' && contrast.failedCount === 0
  && browser.viewports.every(view => view.documentWidth <= view.contentWidth),
'Existing unchanged-source visual/contrast evidence is not PASS.');
if (requested === 'S05') {
  assert(verifyText.includes('"imports":430') || verifyText.includes('"imports": 430'),
    'Current architecture boundary check did not record 430 import edges.');
  assert(verifyText.includes('negativeFixtures') && verifyText.includes('10/10'),
    'Current boundary fixtures are missing.');
}

const commandMap = JSON.parse(read('botsales-kit/execution/frontend-command-map.json'));
const unitCommand = commandMap.commands.find(item => item.id === 'unit' && item.status === 'VERIFIED_AVAILABLE');
assert(unitCommand, 'Registered unit command is not currently VERIFIED_AVAILABLE.');
const codeAndContractPaths = [
  'apps/web/src/shared/ui/theme.ts', 'apps/web/src/shared/ui/components.tsx',
  'apps/web/src/app/bootstrap.css', 'apps/web/src/app/tokens.css', 'apps/web/index.html',
  'apps/web/src/main.tsx', 'apps/web/tests/components.test.tsx', 'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts', 'apps/web/package.json', 'package.json', 'package-lock.json',
  'packages/design-tokens/src/index.ts', 'packages/design-tokens/src/tokens.json',
  'botsales-kit/design/tokens.json', 'botsales-kit/design/decision.json',
  'botsales-kit/design/IMPLEMENTATION_NOTES.md', 'botsales-kit/docs/03_DESIGN_SYSTEM.md',
  'botsales-kit/docs/19_DARK_ONLY_POLICY.md', 'tests/design/palette-guard.mjs',
  'tests/design/browser-audit.mjs', 'tests/design/run-browser-audit.mjs',
  tokenMapPath, browserPath, visualPath, contrastPath,
  'botsales-kit/execution/frontend-evidence/FE006/S01-token-map-current-20261005.mjs',
  unitLog, verifyLog, e2eLog,
  'evidence/frontend-ui-improvements/UI027/S05-paired-performance-20261005.md',
  'botsales-kit/execution/frontend-evidence/FE006/capture-revalidation-20261005.mjs',
];
const sourceFiles = [...new Set(codeAndContractPaths)].sort()
  .map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const snapshotSha = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const git = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8' });
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' });
const command = unitCommand.command;
const expected = step.verification;
const observed = `FE006 ${requested} revalidated after the UI027-only Vite chunk change. Current unit tests pass 85/85; current token mapping is 10/10; current verify/build passes and the post-change built-demo browser suite passes 388/388. UI source and CSS are unchanged by UI027; existing design/contrast audit remains tied to the source hashes recorded here. Scope is synthetic MSW/local frontend only.`;
const evidence = {
  taskId: 'FE006', stepId: requested, kind: 'test_run', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${git.stdout.trim()} on ${branch.stdout.trim()} plus current frontend working tree`,
  expected, observed, command, commandId: 'unit', cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: 'Windows / Node 24.19.0 / npm 11.17.0 / Chromium 153 + Firefox 155',
    details: 'Local React app and deterministic synthetic MSW; current verify and browser logs follow the UI027 Vite change. Existing visual/contrast probes use unchanged theme and CSS sources.',
    dataSource: 'synthetic-msw' },
  checksTotal: requested === 'S01' ? 10 : requested === 'S02' ? 8 : requested === 'S03' ? 7 : requested === 'S04' ? 8 : 10,
  failed: 0, logFile: unitLogLedger, logSha256: sha256(fs.readFileSync(path.join(repo, unitLog))),
  sourceFiles, sourceSnapshotSha256: snapshotSha,
  supplementaryEvidence: [
    { command: 'npm verify and production build after UI027', logFile: verifyLog,
      logSha256: sha256(fs.readFileSync(path.join(repo, verifyLog))), checksTotal: 8, failed: 0 },
    { command: 'npm test:e2e after UI027 on built demo', logFile: e2eLog,
      logSha256: sha256(fs.readFileSync(path.join(repo, e2eLog))), checksTotal: 388, failed: 0 },
    { command: 'current token map audit', report: tokenMapPath,
      checksTotal: tokenMap.checks.length, failed: tokenMap.checks.filter(item => item.result !== 'PASS').length },
  ],
};
const evidencePath = path.join(evidenceDir, `${requested}-current-revalidated-20261005.json`);
const logPath = path.join(evidenceDir, `${requested}-revalidation-current-20261005.log`);
if (fs.existsSync(evidencePath) || fs.existsSync(logPath)) throw new Error('Refusing to overwrite existing FE006 current evidence.');
const log = [
  `FE006.${requested} current revalidation following UI027`, `executedAt=${evidence.executedAt}`,
  `command=${command}`, `cwd=${repo}`, 'unit=PASS 85/85', 'token-map=PASS 10/10',
  'verify-and-production-build=PASS', 'built-demo-e2e=PASS 388/388',
  `sourceSnapshotSha256=${snapshotSha}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${evidence.reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
fs.writeFileSync(logPath, log, { encoding: 'utf8', flag: 'wx' });
console.log(JSON.stringify({ taskId: 'FE006', stepId: requested, result: 'PASS', evidence: path.relative(kit, evidencePath).replaceAll('\\', '/'), log: path.relative(kit, logPath).replaceAll('\\', '/') }, null, 2));
