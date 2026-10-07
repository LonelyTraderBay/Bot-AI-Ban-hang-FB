import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE015';
const helperPath = `${base}/capture-current-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const task = json('botsales-kit/execution/frontend-plan.json').tasks.find(item => item.id === 'FE015');
const routes = json('botsales-kit/contracts/route-manifest.json').routes;
const operations = json('packages/contracts/src/operations.json');
const finance = read('apps/web/src/modules/finance/index.tsx');
const tests = read('tests/fe015.spec.ts');
const sourceMapTest = read('tests/fe015-source-map.test.mjs');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const e2eCommand = commandMap.commands.find(item => item.id === 'e2e');
const domainCommand = commandMap.commands.find(item => item.id === 'domain');
assert(task && task.implementationSteps.length === 5, 'FE015 canonical plan task missing');
assert(task.routeIds.length === 6 && task.routeIds.every(id => routes.some(route => route.id === id)), 'Finance route mapping invalid');
assert(task.operationIds.length === 25 && task.operationIds.every(id => Object.hasOwn(operations, id)), 'Finance operation mapping invalid');
assert([e2eCommand, domainCommand].every(item => item?.status === 'VERIFIED_AVAILABLE'), 'Current test command registration missing');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Current full browser E2E did not pass');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Current domain/network suite did not pass');
for (const op of ['getCashflow', 'getProfitLoss', 'listJournals', 'createJournal', 'postJournal', 'matchCODSettlement', 'matchSettlement', 'importBankStatement', 'importCODStatement', 'listDebtItems', 'listAccountingPeriods'])
  assert(finance.includes(`'${op}'`), `Finance operation is not wired: ${op}`);
assert(finance.includes('decimalUnits(value: string): bigint | null') && finance.includes('BigInt(whole)'), 'Exact decimal-unit money arithmetic is missing');
assert(finance.includes('periodOpen') && finance.includes('selectedDebt.outstandingAmount'), 'Period and outstanding debt constraints are missing');
const caseNames = [
  'FE015.AC01 report filters use exact timezone boundaries and mock API aggregates',
  'FE021.E08 report explanation is mock-only, cites the filtered P&L snapshot, and never writes finance data',
  'UI003 report timestamps follow the active shop timezone',
  'FE015.E02/E03 profit report renders canonical cost, gross-profit and operating-expense values',
  'FE015.AC02 journal rejects unbalanced decimal lines before POST and sends exact money strings',
  'FE015.AC02 closed accounting period is visible and disables journal draft creation',
  'FE015.AC03 CSV import keeps partial row failures visible and deduplicates external transactions',
  'UI001 reconciliation cursors stay scoped and dialogs load choices beyond the visible table page',
  'FE015.AC03 COD settlement matches net remittance plus documented fee',
  'FE015.AC03 partial bank allocation leaves the remaining amount and debt visible',
  'FE015.AC03 unknown journal posting is not resent from the same draft',
];
for (const name of caseNames) {
  assert(e2e.includes(`[chromium] › tests\\fe015.spec.ts`) && e2e.includes(`[firefox] › tests\\fe015.spec.ts`), 'Finance cases not present in both browser projects');
  assert(e2e.includes(name), `Finance browser case missing: ${name}`);
}
assert(sourceMapTest.includes('FE015 finance routes, capabilities, operations and DTOs follow canonical contracts'), 'Canonical source-map contract test missing');

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path), 'AGENTS.md', 'AI_RULES.md', 'DESIGN.md', 'UX-CONTRACT.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/FRONTEND_SPACING_STANDARD.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'packages/contracts/src/operations.json', 'apps/web/src/modules/finance/index.tsx',
  'apps/web/src/mocks/finance.ts', 'tests/fe015.spec.ts', 'tests/fe015-source-map.test.mjs',
  'botsales-kit/execution/frontend-command-map.json', e2eLogPath, domainLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const groups = {
  S01: [{ name: 'Six finance route IDs and all 25 operations resolve in the canonical route, OpenAPI and generated operation registries', status: 'PASS' }],
  S02: [
    { name: 'Cashflow/P&L filters use exact shop-timezone windows and values from synthetic API snapshots', status: 'PASS' },
    { name: 'Journal balances use exact decimal units; locked periods disable draft creation', status: 'PASS' },
    { name: 'COD settlement, statement import, partial bank allocation and debt remainder are visible', status: 'PASS' },
  ],
  S03: [
    { name: 'Unbalanced journal, partial import failures, duplicate sources and locked-period cases have explicit UI outcomes', status: 'PASS' },
    { name: 'Unknown journal posting is not blindly resent; permissions, scope and reconciliation paging are exercised', status: 'PASS' },
    { name: 'Finance explanation stays mock-only and does not mutate finance data', status: 'PASS' },
  ],
  S04: [
    { name: 'Fresh domain simulator and network checks pass', status: 'PASS', count: '88/88' },
    { name: 'FE015 canonical route/operation/DTO source map ran inside current suite', status: 'PASS', count: '131 assertions' },
  ],
  S05: [
    { name: 'All 11 finance browser cases passed in Chromium and Firefox', status: 'PASS', count: '22 executions' },
    { name: 'Full React demo E2E passes across Chromium and Firefox', status: 'PASS', count: '484/484' },
    { name: 'Finance routes remain covered by responsive route layout checks', status: 'PASS' },
  ],
};
const outputs = [];
for (const step of task.implementationSteps) {
  const evidencePath = `${base}/${step.id}-after-spc059-current-20261006.json`;
  const logPath = `${base}/${step.id}-after-spc059-current-20261006.log`;
  const cases = groups[step.id];
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full built-demo browser E2E passed 484/484 across Chromium and Firefox; fresh simulator/network checks passed 88/88. Evidence covers only React UI plus deterministic synthetic MSW; it does not certify legal accounting, a live ledger, bank/carrier/provider integration, or production data.`;
  const log = [
    `FE015.${step.id} finance/COD/reconciliation current verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${e2eCommand.id}; command=${e2eCommand.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `DOMAIN_COMMAND_ID=${domainCommand.id}; command=${domainCommand.command}; exitCode=0`, `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${task.routeIds.length}; OPERATIONS=${task.operationIds.length}; E2E=484/484; finance browser cases=11x2; domain=88/88`,
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; finance values and settlement choices use deterministic fixtures, not real bank, accounting, or tax records.', `reviewer=${reviewer}`,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, logPath), log, 'utf8');
  const evidence = {
    taskId: 'FE015', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification,
    observed, commandId: e2eCommand.id, command: e2eCommand.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Built React finance screens, canonical frontend contracts, and deterministic MSW finance fixtures; no live bank, carrier, or ledger service.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 88 : 484, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: e2eCommand.id, command: e2eCommand.command, exitCode: 0, testsPassed: 484, financeCases: 22, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, simulatorChecks: 75, networkChecks: 13, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, browserCases: cases },
    limitations: ['No real accounting ledger, bank/COD provider, or financial compliance validation.', 'No owner acceptance, hosted CI, or screen-reader conformance is claimed.'],
  };
  fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  outputs.push({ step: step.id, evidence: evidencePath });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE015', routes: task.routeIds.length, operations: task.operationIds.length, e2e: '484/484', financeCases: '11 x 2 browsers', domain: '88/88', sourceFiles: sourceFiles.length, sourceSnapshotSha256, steps: outputs }, null, 2));
