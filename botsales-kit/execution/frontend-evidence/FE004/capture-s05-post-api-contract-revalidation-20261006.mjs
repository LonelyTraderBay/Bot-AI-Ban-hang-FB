import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const out = path.join(kit, 'execution/frontend-evidence/FE004');
const outRelative = 'execution/frontend-evidence/FE004';
const helperRelative = 'botsales-kit/execution/frontend-evidence/FE004/capture-s05-post-api-contract-revalidation-20261006.mjs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Run from frontend root, got ${root}`);
const plan = json('botsales-kit/execution/frontend-plan.json');
const step = plan.tasks.find(task => task.id === 'FE004')?.implementationSteps.find(item => item.id === 'S05');
const commandMap = json('botsales-kit/execution/frontend-command-map.json');
const commandFor = id => {
  const command = commandMap.commands.find(entry => entry.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `${id} is not registered VERIFIED_AVAILABLE`);
  return command;
};
const commands = {
  typecheck: commandFor('types'),
  lint: commandFor('lint'),
  boundaries: commandFor('boundaries'),
  source: commandFor('source'),
};
const logs = [
  { label: 'typecheck', relative: 'botsales-kit/execution/frontend-evidence/FE004/S05-typecheck-exact-registered-post-api-contract-20261006.log', command: commands.typecheck },
  { label: 'lint', relative: 'botsales-kit/execution/frontend-evidence/FE004/S05-lint-exact-registered-post-api-contract-20261006.log', command: commands.lint },
  { label: 'boundaries', relative: 'botsales-kit/execution/frontend-evidence/FE004/S05-boundaries-exact-registered-post-api-contract-20261006.log', command: commands.boundaries },
  { label: 'source checker and fixtures', relative: 'botsales-kit/execution/frontend-evidence/FE004/S05-source-check-exact-registered-post-api-contract-20261006.log', command: commands.source },
  { label: 'scoped diff review', relative: 'botsales-kit/execution/frontend-evidence/FE004/S05-diff-check-scoped-api-files-post-api-contract-20261006.log' },
].map(item => ({ ...item, content: read(item.relative) }));
const logByLabel = label => logs.find(item => item.label === label).content;
const graph = json('botsales-kit/execution/frontend-evidence/FE004/S05-boundaries-report-exact-registered-post-api-contract-20261006.json');
const sourceReport = json('botsales-kit/execution/frontend-evidence/FE004/S05-source-check-generated-exact-registered-post-api-contract-20261006.json');
const diffLog = logByLabel('scoped diff review');
const workspaceDiffLogPath = 'botsales-kit/execution/frontend-evidence/FE004/S05-diff-check-post-api-contract-20261006.log';
const workspaceDiffLog = read(workspaceDiffLogPath);

assert(step?.requiredEvidenceKind === 'test_run', 'FE004.S05 is not a test_run step');
for (const item of logs.slice(0, 3)) {
  assert(item.content.includes(`command=${item.command.command}`), `${item.label} did not run its exact registered command`);
  assert(/^exitCode=0$/m.test(item.content), `${item.label} did not exit 0`);
}
assert(logByLabel('source checker and fixtures').includes(`command=${commands.source.command}`), 'source checker did not run its registered command');
assert(/^sourceCommandExitCode=0$/m.test(logByLabel('source checker and fixtures')), 'source checker did not exit 0');
assert(graph.status === 'PASS' && graph.files === 67 && graph.imports === 475 && graph.issues.length === 0, 'Full-source boundary report is not clean');
assert(/PASS 10\/10 scenarios/.test(logByLabel('boundaries')), 'Boundary negative/allowed fixtures did not pass');
assert(sourceReport.status === 'PASS' && sourceReport.files === 67 && sourceReport.operationCalls === 220 && sourceReport.routes === 54 && sourceReport.issues.length === 0, 'Full-source checker report is not clean');
assert(/ℹ tests\s+3/.test(logByLabel('source checker and fixtures')) && /ℹ pass\s+3/.test(logByLabel('source checker and fixtures')) && /ℹ fail\s+0/.test(logByLabel('source checker and fixtures')), 'Source-checker fixtures did not pass 3/3');
assert(/^unstagedExitCode=0$/m.test(diffLog) && /^stagedExitCode=0$/m.test(diffLog) && !/trailing whitespace|space before tab/i.test(diffLog), 'Scoped staged/unstaged diff check reported whitespace errors');
assert(/^unstagedExitCode=0$/m.test(workspaceDiffLog) && /^stagedExitCode=2$/m.test(workspaceDiffLog) && /trailing whitespace/i.test(workspaceDiffLog), 'Workspace-wide diff diagnostic did not preserve the actual existing staged finding');
assert(/sourceReportRestored=True/i.test(logByLabel('source checker and fixtures')), 'Existing source-check report was not restored after its write-producing check');

const srcRoot = path.join(root, 'apps/web/src');
const sourceFilesInApp = fs.readdirSync(srcRoot, { recursive: true })
  .filter(file => /\.(ts|tsx)$/.test(file))
  .map(file => `apps/web/src/${file.replaceAll('\\', '/')}`);
const priorSteps = [
  'botsales-kit/execution/frontend-evidence/FE004/S01-post-api-contract-revalidation-20261006.json',
  'botsales-kit/execution/frontend-evidence/FE004/S02-post-api-contract-revalidation-20261006.json',
  'botsales-kit/execution/frontend-evidence/FE004/S03-post-api-contract-revalidation-20261006.json',
  'botsales-kit/execution/frontend-evidence/FE004/S04-post-api-contract-revalidation-20261006.json',
];
const sourcePaths = [
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/tsconfig.json', 'eslint.config.mjs',
  'scripts/check-boundaries.mjs', 'scripts/check-source.mjs', 'scripts/source-policy.mjs',
  'tests/architecture/check-boundaries.mjs', 'tests/source-checker.test.mjs',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
  ...sourceFilesInApp, ...priorSteps,
  'botsales-kit/execution/frontend-evidence/FE004/S05-boundaries-report-exact-registered-post-api-contract-20261006.json',
  'botsales-kit/execution/frontend-evidence/FE004/S05-source-check-generated-exact-registered-post-api-contract-20261006.json',
  ...logs.map(item => item.relative), workspaceDiffLogPath, helperRelative,
];
const uniquePaths = [...new Set(sourcePaths)];
const sourceFiles = uniquePaths.map(relative => ({ path: relative, sha256: sha(fs.readFileSync(path.join(root, relative))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const executedAt = new Date().toISOString();
const observed = `Registered typecheck, lint, boundaries and source checker passed on the full frontend source. AST graph: ${graph.files} files/${graph.imports} imports/0 issues/10 of 10 fixtures; source contract scan: ${sourceReport.files} files/${sourceReport.operationCalls} operation calls/${sourceReport.routes} routes/0 issues; source checker tests 3/3. Scoped API transport-file staged and unstaged diff checks are clean. Workspace-wide staged diff check separately exited 2 on trailing whitespace in unrelated existing staged evidence/docs; those files were left untouched. No product-source edits were required by this FE004 revalidation.`;
const checks = [
  { label: 'strict typecheck', observed: 'Registered npm run typecheck exited 0 on the full React/TypeScript app.' },
  { label: 'lint', observed: 'Registered npm run lint exited 0 with --max-warnings 0.' },
  { label: 'AST boundaries', observed: `${graph.files} TS/TSX files, ${graph.imports} import edges, 0 issues; public-entry and module-boundary fixtures 10/10.` },
  { label: 'source contract checker', observed: `${sourceReport.files} files, ${sourceReport.operationCalls} operation calls, ${sourceReport.routes} routes, 0 issues; test:source fixtures 3/3.` },
  { label: 'change budget', observed: 'No type/lint/boundary/source defect was reproduced; no artificial refactor or suppression was added. Existing staged/unstaged UI work was preserved; no FE004 product source was edited in this revalidation.' },
  { label: 'scoped diff whitespace', observed: 'Scoped staged and unstaged checks on the API client/validation/test files exited 0. A separate workspace-wide staged check exited 2 for trailing whitespace in unrelated existing staged evidence/docs, left untouched.' },
  { label: 'evidence side-effect protection', observed: 'The registered source checker wrote its report; the current result was copied to FE004 evidence, then the pre-existing evidence/source-check.json was restored byte-for-byte.' },
];
const logRelative = `${outRelative}/S05-post-api-contract-revalidation-20261006.log`;
const evidenceRelative = `${outRelative}/S05-post-api-contract-revalidation-20261006.json`;
const evidenceLog = [
  'FE004.S05 final full-source type/lint/boundary/source verification and change-budget review', `executedAt=${executedAt}`, `cwd=${root}`,
  ...logs.flatMap(item => [`COMMAND ${item.label}: ${item.command?.command ?? 'git diff --check and git diff --cached --check over FE004 write scope'}`, `LOG ${item.relative}; sha256=${sha(fs.readFileSync(path.join(root, item.relative)))}`]),
  `boundaries=${graph.files} files/${graph.imports} imports/${graph.issues.length} issues/10 of 10 fixtures`,
  `source=${sourceReport.files} files/${sourceReport.operationCalls} operation calls/${sourceReport.routes} routes/${sourceReport.issues.length} issues; source-checker tests=3/3`,
  `workspaceWideDiffLog=${workspaceDiffLogPath}; unstagedExitCode=0; stagedExitCode=2; unrelated trailing-whitespace findings preserved`,
  'scope=FE004 writeScope and full Frontend source gates; no Backend/provider/staging/hosted-CI claim.',
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap(check => [`CHECK ${check.label}: PASS`, check.observed]),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(out, 'S05-post-api-contract-revalidation-20261006.log'), evidenceLog, 'utf8');
const evidence = {
  taskId: 'FE004', stepId: 'S05', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.action, observed,
  commandId: commands.typecheck.id, command: commands.typecheck.command, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / npm 11.17.0`, details: 'Registered Frontend quality scripts ran locally. The source checker output artifact was preserved separately and the existing tracked report restored. No backend or hosted CI involved.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile: logRelative, logSha256: sha(Buffer.from(evidenceLog)), sourceFiles, sourceSnapshotSha256,
  commandResults: logs.slice(0, 4).map(item => ({ commandId: item.command.id, command: item.command.command, exitCode: 0, logFile: item.relative.replace(/^botsales-kit\//, ''), logSha256: sha(fs.readFileSync(path.join(root, item.relative))) })),
  sourceReport: { files: sourceReport.files, operationCalls: sourceReport.operationCalls, routes: sourceReport.routes, issues: sourceReport.issues, reportPath: 'execution/frontend-evidence/FE004/S05-source-check-generated-exact-registered-post-api-contract-20261006.json' },
  boundaryReport: { files: graph.files, imports: graph.imports, issues: graph.issues, fixtures: graph.negativeFixtures },
  diffReview: { scope: 'apps/web/src/shared/api/client.ts, apps/web/src/shared/api/validation.ts, apps/web/tests/api-client.test.tsx', unstagedExitCode: 0, stagedExitCode: 0, workspaceWideUnstagedExitCode: 0, workspaceWideStagedExitCode: 2, workspaceWideStagedTrailingWhitespaceInUnrelatedFiles: true, workspaceWideLogFile: workspaceDiffLogPath.replace(/^botsales-kit\//, ''), productSourceChangesMadeInThisRevalidation: 0 },
};
fs.writeFileSync(path.join(out, 'S05-post-api-contract-revalidation-20261006.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, source: `${sourceReport.files}/${sourceReport.operationCalls}/${sourceReport.routes}`, boundaries: `${graph.files}/${graph.imports}`, evidence: evidenceRelative, log: logRelative }, null, 2));
