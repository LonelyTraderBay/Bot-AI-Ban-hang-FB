import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE003');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relKit = file => `execution/frontend-evidence/FE003/${file}`;
const progressScript = path.join(repo, 'botsales-kit/scripts/progress.mjs');
const probeSources = [
  'botsales-kit/scripts/progress.mjs',
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-command-map.json',
];
const probeSourceFiles = probeSources.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const probeSnapshot = sha256(Buffer.from(probeSourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const validLogName = 'S03-e2e-full-rerun.log';
const validLogPath = path.join(evidenceDir, validLogName);
const baseProbe = {
  taskId: 'FE003',
  stepId: 'S04',
  kind: 'artifact_review',
  result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: 'Current dirty working tree; negative evidence probes use current source hashes',
  expected: 'Current frontend tracker accepts its plan and rejects evidence outside frontend mock scope or with a missing log before changing its ledger.',
  observed: 'Purpose-built probes contain current source hashes and source snapshot digest; only the targeted scope or log condition is invalid.',
  command: 'node botsales-kit/scripts/progress.mjs checkpoint FE003 S04 <negative-fixture>',
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.version}`, details: 'Current local frontend ledger and plan.', dataSource: 'source-only' },
  checksTotal: 1,
  failed: 0,
  sourceFiles: probeSourceFiles,
  sourceSnapshotSha256: probeSnapshot,
};
const wrongScopePath = path.join(evidenceDir, 'S04-wrong-scope-after-spc059-20261006.json');
const missingLogPath = path.join(evidenceDir, 'S04-missing-log-after-spc059-20261006.json');
fs.writeFileSync(wrongScopePath, `${JSON.stringify({ ...baseProbe, verificationScope: 'REAL_BACKEND', logFile: relKit(validLogName), logSha256: sha256(fs.readFileSync(validLogPath)) }, null, 2)}\n`);
fs.writeFileSync(missingLogPath, `${JSON.stringify({ ...baseProbe, logFile: relKit('S04-intentionally-missing-probe.log'), logSha256: '0'.repeat(64) }, null, 2)}\n`);

const invoke = args => {
  const result = spawnSync(process.execPath, [progressScript, ...args], { cwd: repo, encoding: 'utf8' });
  return { code: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
};
const ledgerPath = path.join(kit, 'execution/frontend-progress.json');
const ledgerBefore = sha256(fs.readFileSync(ledgerPath));
const checks = [
  ['validate', invoke(['validate'])],
  ['status', invoke(['status'])],
  ['next', invoke(['next'])],
  ['wrong-scope rejection', invoke(['checkpoint', 'FE003', 'S04', relKit('S04-wrong-scope-after-spc059-20261006.json')])],
  ['missing-log rejection', invoke(['checkpoint', 'FE003', 'S04', relKit('S04-missing-log-after-spc059-20261006.json')])],
];
const ledgerAfter = sha256(fs.readFileSync(ledgerPath));
const next = JSON.parse(checks[2][1].output);
const nextStep = next.steps?.find(step => step.status !== 'VERIFIED');
const passed = checks[0][1].code === 0
  && checks[1][1].code === 0
  && checks[2][1].code === 0
  && next.id === 'FE003' && nextStep?.id === 'S04'
  && checks[3][1].code !== 0 && checks[3][1].output.includes('Frontend evidence must declare its mock API verification scope')
  && checks[4][1].code !== 0 && checks[4][1].output.includes('Missing evidence/source file:')
  && ledgerBefore === ledgerAfter;
const logText = [
  'FE003.S04 frontend tracker and evidence-guard refresh',
  `cwd=${repo}`,
  `ledger.sha256.before=${ledgerBefore}`,
  ...checks.flatMap(([name, result]) => [`\n## ${name} (exit ${result.code})`, result.output.trimEnd()]),
  `\nledger.sha256.after=${ledgerAfter}`,
  `result=${passed ? 'PASS' : 'FAIL'}`,
].join('\n');
const logName = 'S04-refresh-after-spc059-20261006.log';
fs.writeFileSync(path.join(evidenceDir, logName), `${logText}\n`);
const paths = [
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/scripts/progress.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S04-wrong-scope-after-spc059-20261006.json',
  'botsales-kit/execution/frontend-evidence/FE003/S04-missing-log-after-spc059-20261006.json',
  'botsales-kit/execution/frontend-evidence/FE003/S04-refresh-after-spc059-20261006.log',
  'botsales-kit/execution/frontend-evidence/FE003/S04-refresh-after-spc059-20261006.mjs',
];
const sourceFiles = paths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const logFile = relKit(logName);
const evidence = {
  taskId: 'FE003',
  stepId: 'S04',
  kind: 'artifact_review',
  result: passed ? 'PASS' : 'FAIL',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: 'Current dirty working tree; frontend tracker validation and negative probes rerun locally',
  expected: 'Frontend plan validates and selects FE003.S04 as the next checkpoint. Current-source wrong-scope and missing-log evidence are rejected, and both probes leave frontend-progress.json unchanged.',
  observed: `Tracker validation/status/next exit codes: ${checks.slice(0, 3).map(([, result]) => result.code).join('/')}; next=${next.id}.${nextStep?.id}. Negative probes returned ${checks[3][1].code} and ${checks[4][1].code} with the expected rejection messages. Ledger SHA256 before and after both probes: ${ledgerBefore} / ${ledgerAfter}. ${passed ? 'All five checks passed.' : 'One or more checks did not meet the expected result.'}`,
  command: 'node botsales-kit/scripts/progress.mjs validate/status/next; checkpoint current-hash wrong-scope and missing-log fixtures; compare frontend ledger SHA256',
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.version}`, details: 'Current local frontend repository; no full-product progress ledger mutation attempted.', dataSource: 'source-only' },
  checksTotal: checks.length,
  failed: passed ? 0 : 1,
  logFile,
  logSha256: sha256(fs.readFileSync(path.join(kit, logFile))),
  sourceFiles,
  sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
fs.writeFileSync(path.join(evidenceDir, 'S04-after-spc059-20261006.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ result: evidence.result, evidence: 'S04-after-spc059-20261006.json', next: `${next.id}.${nextStep?.id}`, ledgerUnchanged: ledgerBefore === ledgerAfter, sourceFiles: sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }, null, 2));
if (!passed) process.exitCode = 1;
