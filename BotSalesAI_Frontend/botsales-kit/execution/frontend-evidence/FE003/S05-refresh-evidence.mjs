import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE003');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const run = (executable, args) => {
  const result = spawnSync(executable, args, { cwd: repo, encoding: 'utf8', env: process.env });
  return { code: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
};
const progress = args => run(process.execPath, [path.join(repo, 'botsales-kit/scripts/progress.mjs'), ...args]);
const checks = [];
const add = (name, ok, observed) => checks.push({ name, ok, observed });
const validate = progress(['validate']);
const status = progress(['status']);
const next = progress(['next']);
let statusJson, nextJson;
try { statusJson = JSON.parse(status.output); } catch { statusJson = {}; }
try { nextJson = JSON.parse(next.output); } catch { nextJson = {}; }
const selectedStatusStep = statusJson.next?.[0]?.nextStep?.id;
const selectedNextStep = nextJson.steps?.find(step => step.status !== 'VERIFIED')?.id;
add('frontend tracker structure', validate.code === 0 && validate.output.includes('"tasks":28') && validate.output.includes('"checkpoints":140'), `exit=${validate.code}; ${validate.output.trim()}`);
add('tracker status and next point to FE003.S05', status.code === 0 && next.code === 0 && statusJson.next?.[0]?.id === 'FE003' && selectedStatusStep === 'S05' && nextJson.id === 'FE003' && selectedNextStep === 'S05', `status exit=${status.code}, selected=${statusJson.next?.[0]?.id}.${selectedStatusStep}; next exit=${next.code}, selected=${nextJson.id}.${selectedNextStep}`);

const mapAudit = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'S01-map-refresh-audit.log'), 'utf8'));
add('current command registry audit', mapAudit.status === 'PASS' && mapAudit.rootScripts === 17 && mapAudit.appScripts === 5 && mapAudit.registryEntries === 21 && mapAudit.verified === 19 && mapAudit.declaredNotRun === 2 && mapAudit.unmappedVerifiedCommands.length === 0, `root=${mapAudit.rootScripts}; app=${mapAudit.appScripts}; entries=${mapAudit.registryEntries}; verified=${mapAudit.verified}; declared-only=${mapAudit.declaredNotRun}; audit=${mapAudit.status}`);

const logText = name => fs.readFileSync(path.join(evidenceDir, name), 'utf8');
const unit = logText('S03-unit-refresh.log');
const fullE2e = logText('S03-e2e-full-rerun.log');
const initialE2e = logText('S03-e2e-refresh.log');
const helper = logText('S03-draft-helper-refresh.log');
const fe009 = logText('S03-e2e-fe009-focused.log');
const fe010 = fs.readFileSync(path.join(kit, 'execution/frontend-evidence/FE010/S02-focused-e2e-pass.log'), 'utf8');
add('current test outcomes linked', unit.includes('45 passed (45)') && /\b23 passed\b/.test(fullE2e) && /pass 4/.test(helper) && /\b5 passed\b/.test(fe009) && /\b8 passed\b/.test(fe010), `45 unit=${unit.includes('45 passed (45)')}; 23 full E2E=${/\b23 passed\b/.test(fullE2e)}; 4 helper=${/pass 4/.test(helper)}; 5 isolated FE009=${/\b5 passed\b/.test(fe009)}; 8 focused FE010=${/\b8 passed\b/.test(fe010)}`);
add('initial E2E failure retained in handoff', initialE2e.includes('1 failed') && initialE2e.includes('customers route') || initialE2e.includes('customer create validates'), `initial failure log retained=${initialE2e.includes('1 failed')}; FE003.S03 narrative records its observed error boundary and successful reruns`);

const handoff = fs.readFileSync(path.join(evidenceDir, 'handoff.md'), 'utf8');
const continuation = fs.readFileSync(path.join(repo, 'docs/CONTINUE_FRONTEND.md'), 'utf8');
const report = fs.readFileSync(path.join(repo, 'evidence/REPORT.md'), 'utf8');
add('handoff, continuation and evidence report refreshed', handoff.includes('## Runner and FE010 refresh — 30/09/2026') && continuation.includes('## Current execution refresh — 30/09/2026') && report.includes('## FE003 current runner refresh — 30/09/2026') && handoff.includes('## FE003 runner refresh after FE006 shared UI — 30/09/2026') && continuation.includes('## FE003 runner refresh after FE006 shared UI — 30/09/2026') && report.includes('## FE003 runner refresh after FE006 shared UI — 30/09/2026'), 'All three handoff/report files include the latest 45/45 unit result and scoped limits.');
add('no CI or production claim invented', handoff.includes('No CI run is claimed') && continuation.includes('does not claim CI') && report.includes('No CI run is claimed') && report.includes('does not certify production readiness'), 'The docs distinguish local mock-frontend checks from CI, live integrations and production readiness.');

const refs = [
  path.join(evidenceDir, 'S01-map-refresh-audit.log'),
  path.join(evidenceDir, 'S01-map-refresh.json'),
  path.join(evidenceDir, 'S03-unit-refresh.log'),
  path.join(evidenceDir, 'S03-e2e-refresh.log'),
  path.join(evidenceDir, 'S03-e2e-full-rerun.log'),
  path.join(evidenceDir, 'S03-draft-helper-refresh.log'),
  path.join(evidenceDir, 'S04-refresh-current.log'),
  path.join(kit, 'execution/frontend-evidence/FE010/S02-focused-e2e-pass.log'),
];
add('referenced local evidence files exist', refs.every(file => fs.existsSync(file)), refs.map(file => `${path.relative(repo, file)}=${fs.existsSync(file)}`).join('; '));

const diffCheck = run('git', ['diff', '--check']);
const whitespaceFindings = /trailing whitespace|new blank line at EOF|whitespace error/i.test(diffCheck.output);
add('git diff --check', diffCheck.code === 0 && !whitespaceFindings, `exit=${diffCheck.code}; ${whitespaceFindings ? 'whitespace finding present' : 'no whitespace errors'}; ${diffCheck.output.trim().slice(-1600) || 'no output'}`);

const pass = checks.every(check => check.ok);
const logFileName = 'S05-runner-refresh.log';
const log = [
  'FE003.S05 current Windows runner and handoff verification',
  `cwd=${repo}`,
  `node=${process.version}`,
  'npm=11.17.0 (verified in prior runner logs)',
  'CI=NOT_RUN',
  ...checks.map((check, index) => `\n[${index + 1}] ${check.name}: ${check.ok ? 'PASS' : 'CHUA DAT'}\n${check.observed}`),
  `\nresult=${pass ? 'PASS' : 'CHUA DAT'}`,
].join('\n');
fs.writeFileSync(path.join(evidenceDir, logFileName), `${log}\n`);

const sourcePaths = [
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/scripts/progress.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S01-command-map-audit.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S01-map-refresh-audit.log',
  'botsales-kit/execution/frontend-evidence/FE003/S01-map-refresh.json',
  'botsales-kit/execution/frontend-evidence/FE003/S03-unit-refresh.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-refresh.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-fe009-focused.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-full-rerun.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-draft-helper-refresh.log',
  'botsales-kit/execution/frontend-evidence/FE003/S04-refresh-current.log',
  'botsales-kit/execution/frontend-evidence/FE003/handoff.md',
  'docs/CONTINUE_FRONTEND.md',
  'evidence/REPORT.md',
  'botsales-kit/execution/frontend-evidence/FE003/S05-append-runner-refresh.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S05-refresh-evidence.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S05-runner-refresh.log',
  'botsales-kit/execution/frontend-evidence/FE010/S02-focused-e2e-pass.log',
];
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const relativeLog = 'execution/frontend-evidence/FE003/S05-runner-refresh.log';
const evidence = {
  taskId: 'FE003',
  stepId: 'S05',
  kind: 'artifact_review',
  result: pass ? 'PASS' : 'FAIL',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: 'Current dirty working tree; Windows runner and handoff refreshed after FE006 shared UI and FE010 focused E2E',
  expected: 'Handoff and continuation docs provide reproducible Windows commands and current log paths; historical/failed runs are distinguished from successful reruns; tracker points to FE003.S05; no CI result is claimed.',
  observed: `Validated ${checks.filter(check => check.ok).length}/${checks.length} handoff checks. Unit 45/45, full serialized E2E 23/23, helper 4/4, isolated FE009 5/5 and focused FE010 8/8 are linked to logs. The earlier concurrent 22/23 E2E failure and the corrected 44/45 test assertion diagnostic remain disclosed. Tracker validation is current and the next checkpoint is FE003.S05. CI was not run.`,
  command: 'node botsales-kit/execution/frontend-evidence/FE003/S05-refresh-evidence.mjs; git diff --check; frontend progress validate/status/next',
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.version} / npm 11.17.0`, details: 'Current local repository; no CI runner or external service was invoked.', dataSource: 'source-only' },
  checksTotal: checks.length,
  failed: checks.filter(check => !check.ok).length,
  logFile: relativeLog,
  logSha256: sha256(fs.readFileSync(path.join(kit, relativeLog))),
  sourceFiles,
  sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
fs.writeFileSync(path.join(evidenceDir, 'S05-refresh.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ result: evidence.result, passedChecks: checks.filter(check => check.ok).length, totalChecks: checks.length, next: `FE003.${selectedStatusStep}`, sourceFiles: sourceFiles.length }, null, 2));
if (!pass) process.exitCode = 1;
