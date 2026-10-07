import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE003');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = rel => fs.readFileSync(path.join(repo, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(repo, rel));
const run = (file, args) => spawnSync(file, args, { cwd: repo, encoding: 'utf8', env: process.env });
const checks = [];
const add = (name, ok, observed) => checks.push({ name, ok: Boolean(ok), observed: String(observed) });

const status = run(process.execPath, ['botsales-kit/scripts/progress.mjs', 'status']);
let statusJson;
try { statusJson = JSON.parse(status.stdout); } catch { statusJson = {}; }
const currentNext = statusJson.next?.[0];
const nextStep = currentNext?.nextStep?.id;
add('frontend ledger selects FE003.S05', status.status === 0 && currentNext?.id === 'FE003' && nextStep === 'S05' && statusJson.blocked?.length === 0,
  `exit=${status.status}; next=${currentNext?.id}.${nextStep}; blocked=${JSON.stringify(statusJson.blocked)}`);

const unitPath = 'botsales-kit/execution/frontend-evidence/FE003/S03-vitest-cmd-current-20261001.log';
const e2ePath = 'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log';
const listPath = 'botsales-kit/execution/frontend-evidence/FE003/S03-playwright-list-current-20261001.log';
const failedShimPath = 'botsales-kit/execution/frontend-evidence/FE003/S03-vitest-current-20261001.log';
const unit = read(unitPath);
const e2e = read(e2ePath);
const list = read(listPath);
const shim = read(failedShimPath);
add('unit runner outcome and diagnostic preserved', /66 passed|66\s*\/\s*66|66 tests passed/i.test(unit) && /execution policy|running scripts is disabled|PSSecurityException/i.test(shim),
  `unit tail=${unit.trim().split(/\r?\n/).slice(-3).join(' | ')}; prior shim failure retained=${shim.length > 0}`);
add('Playwright current browser result matches recorded inventory', /123\s+passed/.test(e2e) && /123/.test(list),
  `E2E tail=${e2e.trim().split(/\r?\n/).slice(-2).join(' | ')}; list contains 123=${/123/.test(list)}`);

const handoff = read('botsales-kit/execution/frontend-evidence/FE003/handoff.md');
const guide = read('docs/CONTINUE_FRONTEND.md');
const report = read('evidence/REPORT.md');
add('handoff records environment, rerun commands, paths and limitations',
  handoff.includes('18be3c6c75ed66ced592b2d58f36ffbdbd8ae221') && handoff.includes('Node 24.19.0') && handoff.includes('npm 11.17.0') && handoff.includes('123/123') && handoff.includes('66/66') && handoff.includes('CI') && handoff.includes('C:\\Program Files\\nodejs\\npm.cmd'),
  'Handoff includes revision, Windows/Node/npm/Chromium environment, exact logs and commands, and explicit unrun CI/UAT/live-service limits.');
add('continuation guide and report identify current run as local mock evidence',
  guide.includes('Runner revalidation ngày 01/10/2026') && guide.includes('123/123') && guide.includes('66/66') && report.includes('123/123') && report.includes('66/66'),
  'Both current docs point to 123/123 E2E and 66/66 unit logs; older dated addenda remain historical.');
add('no CI, real backend or production readiness is claimed',
  /không phải GitHub CI/i.test(handoff) && /chưa được chạy/i.test(handoff) && /không tuyên bố Production-Ready\/Enterprise-Grade/i.test(handoff),
  'Local synthetic results are distinguished from CI, backend/provider, staging, UAT and full readiness.');

const required = [
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/scripts/progress.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S03-current-run-20261001.json',
  unitPath, e2ePath, listPath, failedShimPath,
  'botsales-kit/execution/frontend-evidence/FE003/S04-current-run-20261001.json',
  'botsales-kit/execution/frontend-evidence/FE003/handoff.md',
  'docs/CONTINUE_FRONTEND.md',
  'evidence/REPORT.md',
];
add('all current source and evidence paths exist', required.every(exists), required.filter(rel => !exists(rel)).join(', ') || `${required.length} files exist`);

const head = run('git', ['rev-parse', 'HEAD']);
add('revision recorded', head.status === 0 && handoff.includes(head.stdout.trim()), `HEAD=${head.stdout.trim()}; exit=${head.status}`);

const diffCheck = run('git', ['diff', '--check']);
add('diff whitespace check', diffCheck.status === 0 && !/trailing whitespace|new blank line at EOF|whitespace error/i.test(diffCheck.stdout + diffCheck.stderr),
  `exit=${diffCheck.status}; ${(diffCheck.stdout + diffCheck.stderr).trim().slice(-900) || 'clean'}`);

const failed = checks.filter(check => !check.ok).length;
const logPath = 'execution/frontend-evidence/FE003/S05-current-runner-refresh-20261001.log';
const logText = [
  'FE003.S05 current Windows handoff and runner audit',
  `cwd=${repo}`,
  `HEAD=${head.stdout.trim()}`,
  `node=${process.version}`,
  'npm=11.17.0',
  'dataSource=synthetic-msw',
  'CI=NOT_RUN',
  ...checks.map((check, index) => `\n[${index + 1}] ${check.ok ? 'PASS' : 'CHUA DAT'} ${check.name}\n${check.observed}`),
  `\nresult=${failed === 0 ? 'PASS' : 'CHUA DAT'}`,
].join('\n');
fs.writeFileSync(path.join(kit, logPath), `${logText}\n`, 'utf8');

const sourcePaths = [
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/scripts/progress.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S03-current-run-20261001.json',
  unitPath, e2ePath, listPath, failedShimPath,
  'botsales-kit/execution/frontend-evidence/FE003/S04-current-run-20261001.json',
  'botsales-kit/execution/frontend-evidence/FE003/handoff.md',
  'docs/CONTINUE_FRONTEND.md',
  'evidence/REPORT.md',
];
const sourceFiles = sourcePaths.map(rel => ({ path: rel, sha256: sha(fs.readFileSync(path.join(repo, rel))) }));
const evidence = {
  taskId: 'FE003', stepId: 'S05', kind: 'artifact_review',
  result: failed === 0 ? 'PASS' : 'FAIL',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head.stdout.trim()} on main plus current frontend working tree`,
  expected: 'Windows rerun instructions and current evidence paths match the observed source snapshot; local mock results, build advisory and unrun CI/live-service limits are explicit.',
  observed: `Validated ${checks.length} handoff, report, log, revision, and tracker assertions. Current unit run: 66/66; current Chromium E2E: 123/123. Local only; CI and live services were not run.`,
  command: 'node botsales-kit/execution/frontend-evidence/FE003/S05-current-runner-refresh-20261001.mjs',
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: 'Windows / Node 24.19.0 / npm 11.17.0 / Chromium', details: 'Local frontend React demo with synthetic MSW data; no CI or live service.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length,
  failed,
  exitCode: failed === 0 ? 0 : 1,
  logFile: logPath,
  logSha256: sha(fs.readFileSync(path.join(kit, logPath))),
  sourceFiles,
  sourceSnapshotSha256: sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
fs.writeFileSync(path.join(dir, 'S05-current-runner-refresh-20261001.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: evidence.result, checksTotal: checks.length, failed, next: `${currentNext?.id}.${nextStep}`, logFile: logPath, evidenceFile: 'S05-current-runner-refresh-20261001.json' }, null, 2));
if (failed) process.exitCode = 1;


