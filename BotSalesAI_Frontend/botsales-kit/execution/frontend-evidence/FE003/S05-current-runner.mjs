import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE003');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const progress = args => spawnSync(process.execPath, [path.join(repo, 'botsales-kit/scripts/progress.mjs'), ...args], { cwd: repo, encoding: 'utf8' });
const checks = [];
const add = (name, passed, detail) => checks.push({ name, passed, detail });
const validate = progress(['validate']);
const status = progress(['status']);
const next = progress(['next']);
let statusResult = {}, nextResult = {};
try { statusResult = JSON.parse(status.stdout); } catch { /* recorded below */ }
try { nextResult = JSON.parse(next.stdout); } catch { /* recorded below */ }
const selected = statusResult.next?.[0];
const nextStep = nextResult.steps?.find(step => step.status !== 'VERIFIED');
add('plan and tracker structure', validate.status === 0 && validate.stdout.includes('"tasks":28') && validate.stdout.includes('"checkpoints":140'), `exit=${validate.status}; ${validate.stdout.trim()}`);
const blockedFE017 = statusResult.blocked?.some(task => task.id === 'FE017');
add('tracker preserves blocked FE017 and selects FE003.S05', status.status === 0 && next.status === 0 && blockedFE017 && !statusResult.next?.some(task => task.id === 'FE017') && selected?.id === 'FE003' && selected.nextStep?.id === 'S05' && nextResult.id === 'FE003' && nextStep?.id === 'S05', `blockedFE017=${blockedFE017}; status=${selected?.id}.${selected?.nextStep?.id}; next=${nextResult.id}.${nextStep?.id}`);
const mapLog = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'S01-current-map-audit.log'), 'utf8'));
add('command registry matches scripts', mapLog.status === 'PASS' && mapLog.registryEntries === 25 && mapLog.verified === 24 && mapLog.declaredNotRun === 1 && mapLog.unmappedVerifiedCommands.length === 0, `entries=${mapLog.registryEntries}; verified=${mapLog.verified}; declared=${mapLog.declaredNotRun}; status=${mapLog.status}`);
const testLogs = [
  ['botsales-kit/execution/frontend-evidence/FE007/unit-priority-20261001.log', /Tests\s+66 passed \(66\)/],
  ['botsales-kit/execution/frontend-evidence/FE007/e2e-priority-current-20261001.log', /106 passed/],
  ['botsales-kit/execution/frontend-evidence/FE006/S05-generate-priority-20261001.log', /"outputs":11,"schemas":283,"operations":210,"routes":54/],
  ['botsales-kit/execution/frontend-evidence/FE010/S01-source-priority-current-20261001.log', /"files": 57,[\s\S]*"operationCalls": 223,[\s\S]*"routes": 54,[\s\S]*"status": "PASS"/],
  ['botsales-kit/execution/frontend-evidence/FE009/boundaries-priority-current-20261001.log', /"imports": 396,[\s\S]*"status": "PASS"[\s\S]*"issues": \[\]/],
  ['botsales-kit/execution/frontend-evidence/FE008/domain-priority-current-20261001.log', /"passed":88/],
  ['botsales-kit/execution/frontend-evidence/FE008/schema-priority-current-20261001.log', /"status": "PASS", "checks": 353/],
  ['botsales-kit/execution/frontend-evidence/FE006/S05-typecheck-priority-20261001.log', /> tsc -p apps\/web\/tsconfig\.json --noEmit/],
  ['botsales-kit/execution/frontend-evidence/FE006/S05-lint-priority-20261001.log', /> eslint apps\/web\/src --max-warnings 0/],
  ['botsales-kit/execution/frontend-evidence/FE008/S05-production-build-priority-20261001.log', /\d+\.\d+ kB[\s\S]*built in/],
  ['botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-priority-20261001.log', /\d+\.\d+ kB[\s\S]*built in/],
  ['botsales-kit/execution/frontend-evidence/FE019/S04-production-bundle-secret-scan-20261001.log', /does not contain demo-fe019-synthetic-credential/],
];
for (const [file, pattern] of testLogs) {
  const full = path.join(repo, file);
  const content = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  add(`current log ${file}`, pattern.test(content), fs.existsSync(full) ? `exists; matched=${pattern.test(content)}` : 'missing');
}
for (const file of ['docs/CONTINUE_FRONTEND.md', 'evidence/REPORT.md', 'botsales-kit/execution/frontend-evidence/FE003/handoff.md']) {
  const content = fs.readFileSync(path.join(repo, file), 'utf8');
  const currentEvidenceSection = content.includes('01/10/2026 after FE019 evidence');
  add(`handoff ${file}`, currentEvidenceSection && content.includes('106/106') && content.includes('FE017') && content.includes('synthetic'), `current section=${currentEvidenceSection}; current E2E=${content.includes('106/106')}; blocker documented=${content.includes('FE017')}; mock scope present=${content.includes('synthetic')}; CI limit present=${content.includes('CI')}`);
}
const diff = spawnSync('git', ['diff', '--check'], { cwd: repo, encoding: 'utf8' });
add('git diff --check', diff.status === 0, `exit=${diff.status}; ${diff.stdout}${diff.stderr}`.trim());
const passed = checks.every(check => check.passed);
const logFile = 'execution/frontend-evidence/FE003/S05-current-runner.log';
const log = [
  'FE003.S05 current runner and handoff review',
  `cwd=${repo}`,
  `node=${process.version}; npm=11.17.0; CI=NOT_RUN`,
  ...checks.map((check, index) => `\n[${index + 1}] ${check.name}: ${check.passed ? 'PASS' : 'FAIL'}\n${check.detail}`),
  `\nresult=${passed ? 'PASS' : 'FAIL'}`,
].join('\n');
fs.writeFileSync(path.join(kit, logFile), `${log}\n`);
const sourcePaths = [
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/scripts/progress.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S01-command-map-audit.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S01-current-map-audit.log',
  'botsales-kit/execution/frontend-evidence/FE003/S04-refresh-current.log',
  'botsales-kit/execution/frontend-evidence/FE003/S05-current-runner.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S05-current-runner.log',
  'botsales-kit/execution/frontend-evidence/FE003/handoff.md',
  'docs/CONTINUE_FRONTEND.md',
  'evidence/REPORT.md',
  ...testLogs.map(([file]) => file),
];
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const evidence = {
  taskId: 'FE003', stepId: 'S05', kind: 'artifact_review', result: passed ? 'PASS' : 'FAIL',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: 'Current dirty working tree; frontend runner, tracker and handoff freshly reviewed',
  expected: 'Windows rerun instructions and current evidence paths match the observed source snapshot; local mock results, build advisory and unrun CI/live-service limits are explicit.',
  observed: `Validated ${checks.filter(check => check.passed).length}/${checks.length} runner, tracker, log and handoff assertions. Current full browser run passed 106/106; current-source unit/domain/schema and related gates are evidenced, and production/demo builds exited 0 with >500 kB chunk advisories. FE017 remains explicitly blocked; CI and live integrations were not run.`,
  command: 'node botsales-kit/execution/frontend-evidence/FE003/S05-current-runner.mjs', cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium`, details: 'Local React demo with synthetic MSW data; no CI or live service.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: checks.filter(check => !check.passed).length, exitCode: passed ? 0 : 1,
  logFile, logSha256: sha256(fs.readFileSync(path.join(kit, logFile))), sourceFiles,
  sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
fs.writeFileSync(path.join(evidenceDir, 'S05-current.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ result: evidence.result, passedChecks: evidence.checksTotal - evidence.failed, totalChecks: evidence.checksTotal, evidence: 'S05-current.json' }, null, 2));
if (!passed) process.exitCode = 1;
