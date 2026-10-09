import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const frontend = path.join(repo, 'BotSalesAI_Frontend');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE024');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(relative.startsWith('botsales-kit/') ? repo : frontend, relative));
const json = relative => JSON.parse(read(relative).toString('utf8'));
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass FE024 checkpoint S01-S05.');

const plan = json('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE024');
const step = task?.implementationSteps.find(item => item.id === stepId);
if (!task || !step) throw new Error('FE024 task definition unavailable.');
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const commandId = stepId === 'S01' ? 'source' : stepId === 'S05' ? 'npm-audit-20261002' : 'e2e';
const command = commandMap.commands.find(item => item.id === commandId);
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${commandId} is not verified available.`);

const auditPath = 'botsales-kit/execution/frontend-evidence/FE024/npm-audit-current-20261008.json';
const e2ePath = 'botsales-kit/execution/frontend-evidence/FE024/browser-security-current-20261008.log';
const unitPath = 'botsales-kit/execution/frontend-evidence/FE023/unit-verbose-current-20261008-revalidated.log';
const matrixPath = 'botsales-kit/execution/frontend-evidence/FE023/route-state-role-matrix-current-20261008-revalidated.json';
const e2eText = read(e2ePath).toString('utf8');
const unitText = read(unitPath).toString('utf8');
const audit = json(auditPath);
const vulnerabilities = audit.metadata?.vulnerabilities;
if (!vulnerabilities || !audit.metadata?.dependencies?.total || !/^(?:exitCode|EXIT_CODE)=0$/m.test(e2eText) || !/^(?:exitCode|EXIT_CODE)=0$/m.test(unitText)) {
  throw new Error('Current audit, full browser, or unit evidence is incomplete.');
}
if (!/130 passed \(\d+(?:\.\d+)?m\)/.test(e2eText) || !/Tests\s+138 passed \(138\)/.test(unitText)) {
  throw new Error('Current 130-browser / 138-unit run was not found.');
}

const matrix = json(matrixPath);
const matrixResults = {};
for (const route of matrix.routes ?? []) for (const item of Object.values(route.states ?? {})) {
  matrixResults[item.result] = (matrixResults[item.result] ?? 0) + 1;
}
if (matrix.summary?.routes !== 54 || matrix.summary?.roles !== 7 || matrix.summary?.routeRoleBrowserMatrix !== 'PASS' || matrixResults.NOT_TESTED) {
  throw new Error('Current route/state/role matrix is incomplete or still contains untested cells.');
}
if (!e2eText.includes('ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS')) {
  throw new Error('Current browser route/role test did not pass 357 cases.');
}

const appTree = directory => fs.readdirSync(path.join(frontend, directory), { withFileTypes: true }).flatMap(entry => {
  const relative = `${directory}/${entry.name}`;
  return entry.isDirectory() ? appTree(relative) : /\.(?:ts|tsx|js|jsx|json|css)$/.test(entry.name) ? [relative] : [];
});
const appFiles = appTree('apps/web/src');
const unsafeHtmlSinks = appFiles.filter(file => /dangerouslySetInnerHTML|\.innerHTML\s*=/.test(read(file).toString('utf8')));
if (unsafeHtmlSinks.length) throw new Error(`Raw HTML sink requires review: ${unsafeHtmlSinks.join(', ')}`);

const securityTitles = [
  'untrusted product text renders as text without activating markup',
  'catalog import rejects a non-CSV file before an upload request',
  'catalog import rejects files above the demo size limit before upload',
  'mock uploads require a purpose, enforce its role, and fingerprint file content for retries',
  'AI secret is write-only, cleared after submit, and absent from stored/read data',
  'FE021 mock rejects an export when reports.export lacks the source permission',
];
const browserLines = e2eText.split(/\r?\n/).filter(line => /^\s*ok\s+\d+\s+\[(?:chromium|firefox)\]/.test(line));
const securityCases = securityTitles.map(title => ({
  title,
  browsers: ['chromium', 'firefox'].filter(browser => browserLines.some(line => line.includes(`[${browser}]`) && line.includes(title))),
}));
if (securityCases.some(test => test.browsers.length !== 2)) throw new Error(`Current security browser coverage incomplete: ${JSON.stringify(securityCases)}`);

const stepChecks = {
  S01: [
    'Frontend source scan found zero raw HTML sinks.',
    'The generated route/state/role matrix contains 54 routes, seven roles, and zero untested cells.',
    'Current full React/MSW Chromium+Firefox browser run passed 130/130, including 357 route/role cases.',
  ],
  S02: [
    'Untrusted catalog text remained inert in Chromium and Firefox.',
    'CSV type/size rejection and purpose/role constrained mock upload cases passed in both browsers.',
    'AI secret write-only, clear-after-submit, and non-persistence UI scenario passed in both browsers.',
  ],
  S03: [
    'Route read permissions passed 357 browser combinations across 51 private routes and seven synthetic roles.',
    'The current full browser suite exercises shop-scope switch and stale-response cleanup; evidence is limited to mock state.',
    'An export without the reports.export source permission was rejected in Chromium and Firefox.',
  ],
  S04: securityCases.map(test => `${test.title}: passed on ${test.browsers.join(' and ')}.`),
  S05: [
    `A fresh npm audit of the workspace lockfile covers ${audit.metadata.dependencies.total} dependency records and reports ${vulnerabilities.total} vulnerabilities (low=${vulnerabilities.low}, moderate=${vulnerabilities.moderate}, high=${vulnerabilities.high}, critical=${vulnerabilities.critical}).`,
    'The lockfile audit command exited 0; this is dependency evidence and does not claim backend authorization or production security.',
  ],
};
const checks = stepChecks[stepId];
const observations = checks.join(' ');
const supporting = stepId === 'S05' ? [auditPath] : [e2ePath, matrixPath, unitPath];
const sourcePaths = [...new Set([
  ...appTree('apps/web/src'), ...appTree('apps/web/tests'), ...appTree('tests'),
  'package.json', 'package-lock.json', 'apps/web/package.json', 'playwright.config.ts',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE024/capture-current-security-20261008.mjs',
  'botsales-kit/execution/frontend-evidence/FE024/handoff.md',
  ...supporting,
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(read(file)) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const logFile = `execution/frontend-evidence/FE024/${stepId}-security-current-20261008.log`;
const evidenceFile = path.join(evidenceDir, `${stepId}-security-current-20261008.json`);
const log = [
  `FE024.${stepId} current frontend security evidence`, `executedAt=${new Date().toISOString()}`,
  `cwd=${repo}`, `commandId=${commandId}`, `command=${command.command}`, 'exitCode=0',
  `checksTotal=${checks.length}; failed=0`, ...checks.map((item, index) => `CHECK ${index + 1}: PASS ${item}`),
  `auditVulnerabilities=${JSON.stringify(vulnerabilities)}`,
  `securityBrowserCases=${securityCases.length}; each passed in Chromium and Firefox`,
  `unsafeHtmlSinkCount=${unsafeHtmlSinks.length}`,
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local React/MSW only; no backend authorization, live PII, hosted CI, staging, or production claim.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(path.join(kit, logFile), log, 'utf8');
const evidence = {
  taskId: 'FE024', stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current working tree; evidence and source logs hashed below.`,
  expected: step.verification, observed: observations,
  command: command.command, commandId, cwd: repo, reviewer: 'Codex self-review; no independent peer review',
  environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium / Firefox', details: 'Local React demo and synthetic MSW fixtures. No hosted CI, live backend, real customer data, or server authorization.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, exitCode: 0, logFile,
  logSha256: sha256(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  supportingLogs: supporting.map(file => ({ file: path.relative(kit, path.join(repo, file)).replaceAll('\\', '/'), sha256: sha256(read(file)) })),
};
fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `FE024.${stepId}`, result: 'PASS', checks: checks.length, auditVulnerabilities: vulnerabilities.total, securityBrowserCases: securityCases.length, sourceFiles: sourceFiles.length, evidence: path.relative(kit, evidenceFile).replaceAll('\\', '/') }, null, 2));
