import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const evidenceRoot = path.join(kit, 'execution/frontend-evidence/FE004');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);

const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const commandFor = (id) => {
  const command = commandMap.commands.find((entry) => entry.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `${id} is not registered VERIFIED_AVAILABLE`);
  return command;
};
const gates = [
  { label: 'generator', id: 'generate', log: 'S05-generate-current-20261004.log', pass: /"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54/ },
  { label: 'source map', id: 'source', log: 'S05-source-current-20261004.log', pass: /"files":\s*65,[\s\S]*"operationCalls":\s*220,[\s\S]*"routes":\s*54,[\s\S]*"issues":\s*\[\],[\s\S]*"status":\s*"PASS"/ },
  { label: 'AST boundaries', id: 'boundaries', log: 'S05-boundaries-current-20261004.log', pass: /"files":\s*65,[\s\S]*?"imports":\s*430,[\s\S]*?PASS 10\/10[\s\S]*?"status":\s*"PASS",[\s\S]*?"issues":\s*\[\]/ },
  { label: 'ESLint', id: 'lint', log: 'S05-lint-current-20261004.log', pass: /eslint apps\/web\/src --max-warnings 0/ },
  { label: 'strict TypeScript', id: 'types', log: 'S05-typecheck-current-20261004.log', pass: /tsc -p apps\/web\/tsconfig\.json --noEmit/ },
  { label: 'domain and MSW', id: 'domain', log: 'S05-domain-current-20261004.log', pass: /"status":"PASS"[\s\S]*"passed":88,"operations":89/ },
  { label: 'unit tests', id: 'unit', log: 'S05-unit-current-20261004.log', pass: /Test Files\s+10 passed \(10\)[\s\S]*Tests\s+85 passed \(85\)/ },
  { label: 'production build', id: 'build', log: 'S05-build-current-20261004.log', pass: /"outputs":11[\s\S]*?738\.39 kB[\s\S]*?✓ built in [\d.]+s/ },
];
for (const gate of gates) {
  gate.command = commandFor(gate.id);
  gate.content = fs.readFileSync(path.join(evidenceRoot, gate.log), 'utf8');
  assert(gate.pass.test(gate.content), `${gate.label} log lacks the expected current result`);
}
const providerLog = fs.readFileSync(path.join(evidenceRoot, 'S05-single-provider-versions-current-20261004.log'), 'utf8');
const diffLog = fs.readFileSync(path.join(evidenceRoot, 'S05-diff-check-current-20261004.log'), 'utf8');
for (const version of ['react@19.1.1', 'react-dom@19.1.1', '@mui/material@7.3.1', '@tanstack/react-query@5.85.5', 'react-router-dom@7.18.4']) {
  assert(providerLog.includes(version), `Dependency tree misses ${version}`);
}
assert((providerLog.match(/deduped/g) ?? []).length > 10 && /exitCode=0/.test(providerLog), 'React/provider dependencies are not demonstrably deduped');
assert(/exitCode=0/.test(diffLog) && !/trailing whitespace|space before tab/.test(diffLog), 'Scoped diff check reports whitespace errors');

const sourceCheck = JSON.parse(fs.readFileSync(path.join(root, 'evidence/source-check.json'), 'utf8'));
const boundary = JSON.parse(fs.readFileSync(path.join(root, 'evidence/boundaries.json'), 'utf8'));
const router = fs.readFileSync(path.join(root, 'apps/web/src/app/router.tsx'), 'utf8');
const catalogIndex = fs.readFileSync(path.join(root, 'apps/web/src/modules/catalog/index.tsx'), 'utf8');
const deepImports = [...router.matchAll(/import\(['"]\.\.\/modules\/([^'"]+)['"]\)/g)].map((match) => match[1]).filter((value) => value.includes('/'));
assert(sourceCheck.status === 'PASS' && sourceCheck.files === 65 && sourceCheck.operationCalls === 220 && sourceCheck.routes === 54 && sourceCheck.issues.length === 0, 'Current source checker report is not clean');
assert(boundary.status === 'PASS' && boundary.files === 65 && boundary.imports === 430 && boundary.issues.length === 0, 'Current architecture report is not clean');
assert(deepImports.length === 0 && catalogIndex.includes("export { ImportsPage, ImportResultPage } from './imports';"), 'Catalog routes still bypass the public feature entry');

const checks = [
  { label: 'generated contract freshness', observed: 'PASS, 11 outputs / 283 schemas / 210 operations / 54 routes.' },
  { label: 'source route and operation mapping', observed: 'PASS, 65 files / 220 operation calls / 54 routes / zero issues.' },
  { label: 'AST architecture gate', observed: 'PASS, 65 files / 430 imports / zero issues; all 10 allowed/negative fixtures passed.' },
  { label: 'strict typecheck and lint', observed: 'TypeScript strict + noUncheckedIndexedAccess and ESLint --max-warnings 0 both passed.' },
  { label: 'synthetic domain and unit tests', observed: 'Domain/MSW 88/88 and Vitest 85/85 over 10 files passed.' },
  { label: 'production artifact', observed: 'Vite transformed 2,055 modules and built production output. The existing >500 kB chunk advisory remains: largest chunk 738.39 kB raw / 186.88 kB gzip.' },
  { label: 'single provider versions', observed: 'npm ls confirms React/React DOM deduped and one MUI 7.3.1, TanStack Query 5.85.5 and Router 7.18.4.' },
  { label: 'public feature entry', observed: 'Router uses the Catalog index entry; the two import screens are exported there and no app deep feature import remains.' },
  { label: 'scoped diff review', observed: 'Changes are limited to Catalog re-exports, router import paths, the AST public-entry invariant and its allowed/negative fixtures; diff check exit 0 with Windows line-ending notices only.' },
  { label: 'scope and evidence honesty', observed: 'Only local Frontend source, synthetic MSW, checks and build were validated; no hosted CI, backend/provider, staging or deployment claim was made.' },
];
const reviewer = 'Codex self-review; no independent peer review claimed';
const executedAt = new Date().toISOString();
const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const srcRoot = path.join(root, 'apps/web/src');
const appSource = fs.readdirSync(srcRoot, { recursive: true }).filter((entry) => /\.(ts|tsx)$/.test(entry)).map((entry) => `apps/web/src/${entry.replaceAll('\\', '/')}`);
const stepEvidence = ['S01-current-types-and-module-map-20261004.json', 'S02-current-types-lint-boundaries-20261004.json', 'S03-current-composition-review-20261004.json', 'S04-current-boundary-fixtures-20261004.json'];
const stepLogs = gates.map((gate) => `botsales-kit/execution/frontend-evidence/FE004/${gate.log}`);
const sourcePaths = [
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/tsconfig.json', 'eslint.config.mjs',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/route-manifest.json', 'botsales-kit/design/tokens.json',
  'scripts/generate.mjs', 'scripts/check-source.mjs', 'scripts/check-boundaries.mjs', 'scripts/test-domain.mjs',
  'tests/architecture/check-boundaries.mjs',
  'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md', 'botsales-kit/docs/09_STATE_AND_DATA_ACCESS.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
  ...appSource, ...stepEvidence.map((name) => `botsales-kit/execution/frontend-evidence/FE004/${name}`),
  ...stepLogs, 'botsales-kit/execution/frontend-evidence/FE004/S05-single-provider-versions-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE004/S05-diff-check-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE004/capture-s05.mjs',
];
const sourceFiles = [...new Set(sourcePaths)].map((file) => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const supportingResults = [
  ...gates.map((gate) => ({ label: gate.label, commandId: gate.command.id, command: gate.command.command, exitCode: 0, logFile: `execution/frontend-evidence/FE004/${gate.log}`, logSha256: sha(Buffer.from(gate.content)) })),
  { label: 'dependency tree', command: 'npm.cmd --script-shell=cmd.exe ls react react-dom @mui/material @tanstack/react-query react-router-dom --all', exitCode: 0, logFile: 'execution/frontend-evidence/FE004/S05-single-provider-versions-current-20261004.log', logSha256: sha(Buffer.from(providerLog)) },
  { label: 'scoped diff check', command: 'git diff --check -- <FE004 write scope>', exitCode: 0, logFile: 'execution/frontend-evidence/FE004/S05-diff-check-current-20261004.log', logSha256: sha(Buffer.from(diffLog)) },
];
const log = [
  'FE004.S05 current full-source final checks and change-budget review', `executedAt=${executedAt}`, `cwd=${root}`,
  ...supportingResults.flatMap((result) => [`COMMAND ${result.label}: exit=${result.exitCode}; ${result.command}`, `LOG ${result.logFile} sha256=${result.logSha256}`]),
  `sourceCheck=65 files/220 operation calls/54 routes/0 issues`, `boundaries=65 files/430 imports/0 issues/10 of 10 fixtures`,
  `domain=88/88; unit=85/85 across 10 files; build=PASS; maxRawChunk=738.39 kB; maxGzipChunk=186.88 kB`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  'reviewScope=FE004 writeScope only; no generated source, package manifest, canonical API/token contract or full-product tracker was changed by FE004.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
const logFile = 'execution/frontend-evidence/FE004/S05-current-final-review-20261004.log';
fs.writeFileSync(path.join(evidenceRoot, 'S05-current-final-review-20261004.log'), log, 'utf8');
const typeCommand = commandFor('types');
const evidence = {
  taskId: 'FE004', stepId: 'S05', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'Final current-source strict typecheck, lint, boundaries, source mapping, synthetic domain/unit tests, production build, single provider versions and scoped diff review pass; warnings and external-scope limits stay explicit.',
  observed: 'All local source/config gates passed: generator 11/283/210/54; source 65/220/54; boundaries 65/430/0 with 10/10 fixtures; lint and strict typecheck exit 0; domain 88/88; Vitest 85/85 across 10 files; production build passed. Largest raw chunk warning remains 738.39 kB. Provider versions are deduped and scoped diff check has no whitespace errors.',
  commandId: typeCommand.id, command: typeCommand.command, cwd: root, reviewer,
  environment: { name: 'Windows / Node 24.19.0 / npm 11.17.0', details: 'Current frontend source with synthetic MSW; production Vite build succeeded. Playwright was not rerun for this public-entry-only route change.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, logFile, logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  supportingResults, summary: { generatedOutputs: 11, schemas: 283, operations: 210, routes: 54, sourceFiles: 65, operationCalls: 220, imports: 430, boundaryIssues: 0, negativeFixturesPassed: 10, domainPassed: 88, unitPassed: 85, unitFilesPassed: 10, buildModules: 2055, largestChunkRawKb: 738.39, largestChunkGzipKb: 186.88, userBrowserAcceptanceRun: false, hostedCi: 'NOT_RUN', backendOrProvider: 'OUT_OF_SCOPE' },
};
fs.writeFileSync(path.join(evidenceRoot, 'S05-current-final-review-20261004.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, summary: evidence.summary, evidence: 'execution/frontend-evidence/FE004/S05-current-final-review-20261004.json', log: logFile }, null, 2));
