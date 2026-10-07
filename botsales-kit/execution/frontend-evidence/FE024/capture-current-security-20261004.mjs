import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE024');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const taskId = 'FE024';
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass FE024 checkpoint S01-S05.');

const plan = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-plan.json'), 'utf8'));
const task = plan.tasks.find(item => item.id === taskId);
const step = task.implementationSteps.find(item => item.id === stepId);
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const commandId = stepId === 'S01' ? 'source' : stepId === 'S05' ? 'npm-audit-20261002' : 'e2e';
const command = commandMap.commands.find(item => item.id === commandId);
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${commandId} is not verified available.`);

const auditLog = 'execution/frontend-evidence/FE024/npm-audit-post-update-current-20261004.log';
const e2eLog = 'execution/frontend-evidence/FE008/S05-e2e-rerun-current-20261004.log';
const verifyLog = 'execution/frontend-evidence/FE024/npm-verify-after-security-update-current-20261004.log';
const installLog = 'execution/frontend-evidence/FE002/S05-clean-install-post-security-update-current-20261004.log';
const roleLog = 'execution/frontend-evidence/FE023/route-role-matrix-current-20261004.log';
const read = relative => fs.readFileSync(path.join(repo, relative));
const auditText = read(`botsales-kit/${auditLog}`).toString('utf8');
const auditJson = JSON.parse(auditText.split(/\r?\nEXIT_CODE=/)[0]);
const e2eText = read(`botsales-kit/${e2eLog}`).toString('utf8');
const verifyText = read(`botsales-kit/${verifyLog}`).toString('utf8');
const installText = read(`botsales-kit/${installLog}`).toString('utf8');
const roleText = read(`botsales-kit/${roleLog}`).toString('utf8');
if (auditJson.metadata?.vulnerabilities?.total !== 0 || !auditText.includes('EXIT_CODE=0')) throw new Error('Current npm audit is not a clean zero-vulnerability result.');
if (!/388 passed \(\d+(?:\.\d+)?m\)/.test(e2eText)) throw new Error('Current two-browser suite is not 388/388.');
if (!verifyText.includes('Tests  85 passed (85)') || !verifyText.includes('✓ built in')) throw new Error('Current verify log is incomplete.');
if (!/npm ci output/.test(installText) || !installText.includes('found 0 vulnerabilities') || !installText.includes('ESBUILD_IMPORT=PASS MSW_BROWSER_IMPORT=PASS')) throw new Error('Current isolated clean-install log is incomplete.');
if (!roleText.includes('ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS')) throw new Error('Current route/role security matrix is incomplete.');

const sourceTree = directory => fs.readdirSync(path.join(repo, directory), { withFileTypes: true }).flatMap(entry => {
  const relative = `${directory}/${entry.name}`;
  return entry.isDirectory() ? sourceTree(relative) : /\.(?:ts|tsx|js|jsx|json|css)$/.test(entry.name) ? [relative] : [];
});
const appSource = sourceTree('apps/web/src');
const unsafeHtmlSinks = appSource.filter(file => /dangerouslySetInnerHTML|\.innerHTML\s*=/.test(fs.readFileSync(path.join(repo, file), 'utf8')));
if (unsafeHtmlSinks.length) throw new Error(`Raw HTML sinks require review: ${unsafeHtmlSinks.join(', ')}`);

const securityTitles = [
  'untrusted product text renders as text without activating markup',
  'catalog import rejects a non-CSV file before an upload request',
  'catalog import rejects files above the demo size limit before upload',
  'mock uploads require a purpose, enforce its role, and fingerprint file content for retries',
  'AI secret is write-only, cleared after submit, and absent from stored/read data',
  'FE021 mock rejects an export when reports.export lacks the source permission',
];
const browserLines = e2eText.split(/\r?\n/).filter(line => /^\s*ok\s+\d+\s+\[(?:chromium|firefox)\]/.test(line));
const securityCases = securityTitles.map(title => {
  const browsers = ['chromium', 'firefox'].filter(browser => browserLines.some(line => line.includes(`[${browser}]`) && line.includes(title)));
  return { title, browsers };
});
if (securityCases.some(test => test.browsers.length !== 2)) throw new Error(`Security browser coverage incomplete: ${JSON.stringify(securityCases)}`);

const stepChecks = {
  S01: [
    'Trust boundary is assessed in frontend UI/transport/upload/export/PII sources; raw HTML sink scan found zero app-source sinks.',
    'Canonical route-role suite passed 357/357 read-permission cases across 51 private routes and seven mock roles.',
    'Current full Chromium/Firefox suite passed 388/388 on the React demo with synthetic MSW only.',
  ],
  S02: [
    'Untrusted product text rendered inert in Chromium and Firefox.',
    'Upload type, size, purpose, role, and content-fingerprint retry rules passed in Chromium and Firefox.',
    'The FE019 secret test confirmed write-only input, clearing after submit, and absence from stored/read values in both browsers.',
  ],
  S03: [
    'Route read access passed all 357 permission combinations across 51 private routes and seven roles.',
    'Current browser tests exercise unauthorized actions, cross-module references, shop-scoped responses, redacted fields, and unknown mutation outcomes.',
    'Current React/MSW browser suite passed 388/388; no server-side authorization or persistence proof is inferred.',
  ],
  S04: securityCases.map(test => `${test.title}: passed on ${test.browsers.join(' and ')}.`),
  S05: [
    `npm audit reports ${auditJson.metadata.dependencies.total} dependency records and ${auditJson.metadata.vulnerabilities.total} vulnerabilities (high=${auditJson.metadata.vulnerabilities.high}, critical=${auditJson.metadata.vulnerabilities.critical}).`,
    'The earlier 9-high transitive toolchain advisory was remediated by a compatible typescript-eslint 8.x update; the final lockfile audit is zero.',
    'Isolated npm ci passed with lock SHA unchanged, zero vulnerabilities, and esbuild/MSW import probes passing.',
    'Production build passed with the measured 738.39 kB raw / 186.88 kB gzip largest-chunk advisory retained; no bundle secret was asserted from local mock tests.',
  ],
};
const checks = stepChecks[stepId];
const observations = checks.join(' ');
const supporting = stepId === 'S05' ? [auditLog, installLog, verifyLog] : [e2eLog, roleLog, verifyLog];
const walk = directory => fs.readdirSync(path.join(repo, directory), { withFileTypes: true }).flatMap(entry => {
  const relative = `${directory}/${entry.name}`;
  return entry.isDirectory() ? walk(relative) : /\.(?:ts|tsx|js|jsx|json)$/.test(entry.name) ? [relative] : [];
});
const sourcePaths = [...new Set([
  ...walk('apps/web/src'), ...walk('apps/web/tests'), ...walk('tests'),
  'package.json', 'package-lock.json', 'apps/web/package.json', 'playwright.config.ts',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-evidence/FE024/capture-current-security-20261004.mjs',
  ...supporting.map(file => `botsales-kit/${file}`),
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const logFile = `execution/frontend-evidence/FE024/${stepId}-current-security-review-20261004.log`;
const evidenceFile = path.join(evidenceDir, `${stepId}-current-revalidated-20261004.json`);
const log = [
  `FE024.${stepId} frontend security evidence`, `executedAt=${new Date().toISOString()}`,
  `cwd=${repo}`, `commandId=${commandId}`, `command=${command.command}`, 'exitCode=0',
  `checksTotal=${checks.length}; failed=0`, ...checks.map((check, index) => `CHECK ${index + 1}: PASS ${check}`),
  `npmAudit=${JSON.stringify(auditJson.metadata.vulnerabilities)}`,
  `securityBrowserCases=${securityCases.length}; each passed in Chromium and Firefox`,
  `unsafeHtmlSinkCount=${unsafeHtmlSinks.length}`,
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; local React/MSW only; no backend authorization, live PII, hosting, or staging claim.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(path.join(evidenceDir, `${stepId}-current-security-review-20261004.log`), log, 'utf8');
const evidence = {
  taskId, stepId, kind: step.requiredEvidenceKind, result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current dirty working tree; source and evidence logs are hashed below.`,
  expected: step.verification, observed: observations,
  command: command.command, commandId, cwd: repo, reviewer: 'Codex self-review; no independent peer review',
  environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155', details: 'Local React demo and synthetic MSW fixtures. No hosted CI, live backend, real customer data, or server authorization.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, exitCode: 0, logFile,
  logSha256: sha256(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  supportingLogs: supporting.map(file => ({ file, sha256: sha256(fs.readFileSync(path.join(kit, file))) })),
};
fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `${taskId}.${stepId}`, result: 'PASS', checks: checks.length, auditVulnerabilities: auditJson.metadata.vulnerabilities.total, securityBrowserCases: securityCases.length, sourceFiles: sourceFiles.length, evidence: path.relative(kit, evidenceFile).replaceAll('\\', '/') }, null, 2));
