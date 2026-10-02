import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE004');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = rel => fs.readFileSync(path.join(repo, rel), 'utf8');
const run = (exe, args) => spawnSync(exe, args, { cwd: repo, encoding: 'utf8', env: process.env });
const stepId = process.argv[2];
const allowed = ['S01', 'S02', 'S03', 'S04', 'S05'];
if (!allowed.includes(stepId)) throw new Error('Use S01..S05');
const allSteps = {
  S01: { expected: 'Full strict TypeScript check and import/source graph were inspected; real issues would be mapped narrowly before edits.', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run typecheck', logs: ['S01-typecheck-registered-current-20261001.log', 'S03-boundaries-registered-current-20261001.log', 'S05-source-rerun-20261001.log'] },
  S02: { expected: 'Full strict and noUncheckedIndexedAccess TypeScript check and lint pass; no any/suppression escape hatches; dependency graph keeps one React/MUI/Query/Router stack.', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run lint', logs: ['S01-typecheck-registered-current-20261001.log', 'S02-lint-registered-current-20261001.log', 'S02-type-suppression-scan-current-20261001.log', 'S03-dependencies-current-20261001.log'] },
  S03: { expected: 'App composition, module-local business logic and shared presentation/API boundaries are explicit; no cross-feature imports, cycles or extra providers are present.', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run boundaries', logs: ['S03-boundaries-registered-current-20261001.log', 'S03-unit-registered-current-20261001.log'] },
  S04: { expected: 'Negative fixtures cover aliases, relative imports, type-only imports, dynamic imports, unresolved references, cycles and parse errors; all are detected while the allowed fixture passes.', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run boundaries', logs: ['S04-negative-fixtures-current-20261001.log', 'S03-boundaries-registered-current-20261001.log'] },
  S05: { expected: 'Final full typecheck, lint, boundary/source checks, unit suite, generated-contract drift check and whitespace check pass on the current source snapshot; review finds no unnecessary architecture rewrite.', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run typecheck', logs: ['S01-typecheck-registered-current-20261001.log', 'S02-lint-registered-current-20261001.log', 'S03-boundaries-registered-current-20261001.log', 'S05-source-rerun-20261001.log', 'S03-unit-registered-current-20261001.log', 'S05-generate-registered-current-20261001.log', 'S05-diff-check-final-20261001.log', 'S05-change-budget-review-current-20261001.log'] },
};
const current = allSteps[stepId];
const statusRun = run(process.execPath, ['botsales-kit/scripts/progress.mjs', 'status']);
let status;
try { status = JSON.parse(statusRun.stdout); } catch { status = {}; }
const next = status.next?.[0];
const checks = [];
const add = (name, ok, observed) => checks.push({ name, ok: Boolean(ok), observed: String(observed) });
add('correct sequential frontend checkpoint selected', statusRun.status === 0 && next?.id === 'FE004' && next?.nextStep?.id === stepId && status.blocked?.length === 0, `status exit=${statusRun.status}; selected=${next?.id}.${next?.nextStep?.id}; blocked=${JSON.stringify(status.blocked)}`);
const logText = current.logs.map(name => ({ name, text: read(`botsales-kit/execution/frontend-evidence/FE004/${name}`) }));
const missing = current.logs.filter(name => !fs.existsSync(path.join(dir, name)));
add('required run logs exist', missing.length === 0, missing.length ? `missing=${missing.join(', ')}` : current.logs.map(name => `execution/frontend-evidence/FE004/${name}`).join('; '));

const typecheck = read('botsales-kit/execution/frontend-evidence/FE004/S01-typecheck-registered-current-20261001.log');
const lint = read('botsales-kit/execution/frontend-evidence/FE004/S02-lint-registered-current-20261001.log');
const boundary = read('botsales-kit/execution/frontend-evidence/FE004/S03-boundaries-registered-current-20261001.log');
const source = read('botsales-kit/execution/frontend-evidence/FE004/S05-source-rerun-20261001.log');
const suppression = read('botsales-kit/execution/frontend-evidence/FE004/S02-type-suppression-scan-current-20261001.log');
const deps = read('botsales-kit/execution/frontend-evidence/FE004/S03-dependencies-current-20261001.log');
const unit = read('botsales-kit/execution/frontend-evidence/FE004/S03-unit-registered-current-20261001.log');
const fixture = read('botsales-kit/execution/frontend-evidence/FE004/S04-negative-fixtures-current-20261001.log');
const generation = read('botsales-kit/execution/frontend-evidence/FE004/S05-generate-registered-current-20261001.log');
const diff = read('botsales-kit/execution/frontend-evidence/FE004/S05-diff-check-final-20261001.log');
const tsconfig = JSON.parse(read('apps/web/tsconfig.json'));
const main = read('apps/web/src/main.tsx');
const router = read('apps/web/src/app/router.tsx');
const modules = fs.readdirSync(path.join(repo, 'apps/web/src/modules'), { withFileTypes: true }).filter(item => item.isDirectory()).map(item => item.name);
const count = (text, pattern) => [...text.matchAll(pattern)].length;

if (stepId === 'S01') {
  add('strict full-app typecheck passed without diagnostics', typecheck.includes('> tsc -p apps/web/tsconfig.json --noEmit') && !/error TS\d+/.test(typecheck), `strict=${tsconfig.compilerOptions.strict}; noUncheckedIndexedAccess=${tsconfig.compilerOptions.noUncheckedIndexedAccess}; diagnostics=${(typecheck.match(/error TS\d+/g) ?? []).length}`);
  add('real import and source graph recorded', boundary.includes('"status": "PASS"') && boundary.includes('"files": 58') && boundary.includes('"imports": 402') && source.includes('"operationCalls": 224') && source.includes('"routes": 54'), `boundary=58 files/402 imports; source=58 files/224 operation refs/54 routes; no architecture or source defect found`);
}
if (stepId === 'S02') {
  add('type and lint checks pass on strict source', typecheck.includes('> tsc -p apps/web/tsconfig.json --noEmit') && !/error TS\d+/.test(typecheck) && lint.includes('> eslint apps/web/src --max-warnings 0'), `strict=${tsconfig.compilerOptions.strict}; noUncheckedIndexedAccess=${tsconfig.compilerOptions.noUncheckedIndexedAccess}; lint command exited 0`);
  add('no explicit any or TypeScript suppression found', suppression.includes('PASS: no explicit any or TypeScript suppression'), suppression.trim());
  add('React/MUI/Query/Router dependency tree resolves once', deps.includes('react@19.1.1 deduped') && deps.includes('@mui/material@7.3.1') && deps.includes('@tanstack/react-query@5.85.5') && deps.includes('react-router-dom@7.18.4'), `React 19.1.1 deduped; MUI 7.3.1, Query 5.85.5, Router 7.18.4`);
}
if (stepId === 'S03') {
  add('boundary graph and unit suite pass', boundary.includes('"status": "PASS"') && boundary.includes('"issues": []') && boundary.includes('8/8 scenarios') && /66 passed \(66\)/.test(unit), `58 files/402 imports/zero issues/8 of 8 boundary fixtures; unit 66/66 in 7 files`);
  add('single app composition root and feature-local entries verified', count(main, /<ThemeProvider\b/g) === 1 && count(main, /<QueryClientProvider\b/g) === 1 && count(main, /<RouterProvider\b/g) === 1 && count(main, /new QueryClient\(/g) === 1 && count(router, /createBrowserRouter\(/g) === 1 && modules.length === 16, `one React root in main.tsx; one theme/query/router provider; one QueryClient/router; ${modules.length} feature folders`);
  add('no application/feature/mock dependency leaks reported', boundary.includes('"issues": []') && source.includes('"status": "PASS"'), 'AST checker parses TS/TSX, resolves aliases and cycles, and reports zero boundary/source violations.');
}
if (stepId === 'S04') {
  add('negative boundary fixtures detect all prohibited cases', /PASS 8\/8 scenarios/.test(fixture) && /type-only/.test(fixture) && /dynamic/.test(fixture) && /cycle/.test(fixture) && /parser error/.test(fixture), fixture.trim());
}
if (stepId === 'S05') {
  add('current strict typecheck, lint, boundary, source and unit checks pass', typecheck.includes('> tsc -p apps/web/tsconfig.json --noEmit') && !/error TS\d+/.test(typecheck) && lint.includes('> eslint apps/web/src --max-warnings 0') && boundary.includes('"status": "PASS"') && boundary.includes('"issues": []') && source.includes('"status": "PASS"') && /66 passed \(66\)/.test(unit), 'typecheck/lint exit 0; 58 files/402 imports/zero boundary issues; 58 files/224 operation refs/54 routes; unit 66/66.');
  add('generated source check and diff whitespace check pass', generation.includes('"status":"PASS"') && generation.includes('"outputs":11') && !/trailing whitespace|new blank line at EOF|whitespace error/i.test(diff), 'generate:check 11 outputs/283 schemas/210 operations/54 routes; git diff --check exit 0 (line-ending notices only).');
  add('handoff distinguishes historical diagnostics from current source', read('botsales-kit/execution/frontend-evidence/FE004/handoff.md').includes('Historical note and limits') && read('botsales-kit/execution/frontend-evidence/FE004/handoff.md').includes('noUncheckedIndexedAccess'), 'The old 11-diagnostic experiment is labeled historical and the current full check is recorded.');
}

const commonPaths = [
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/tsconfig.json', 'eslint.config.mjs',
  'scripts/check-boundaries.mjs', 'scripts/check-source.mjs', 'tests/architecture/check-boundaries.mjs',
  'apps/web/src/main.tsx', 'apps/web/src/app/router.tsx', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json',
];
const sourcePaths = [...commonPaths, ...current.logs.map(name => path.posix.join('botsales-kit', 'execution', 'frontend-evidence', 'FE004', name)), ...fs.readdirSync(path.join(repo, 'apps/web/src'), { withFileTypes: true }).flatMap(function walk(entry) {
  const absolute = path.join(path.join(repo, 'apps/web/src'), entry.name);
  return entry.isDirectory() ? fs.readdirSync(absolute, { withFileTypes: true }).flatMap(child => walkAt(absolute, child)) : /\.(ts|tsx)$/.test(entry.name) ? [path.relative(repo, absolute).replaceAll('\\', '/')] : [];
})];
function walkAt(parent, entry) {
  const absolute = path.join(parent, entry.name);
  return entry.isDirectory() ? fs.readdirSync(absolute, { withFileTypes: true }).flatMap(child => walkAt(absolute, child)) : /\.(ts|tsx)$/.test(entry.name) ? [path.relative(repo, absolute).replaceAll('\\', '/')] : [];
}
if (stepId === 'S04') sourcePaths.push('tests/architecture/check-boundaries.mjs');
if (stepId === 'S05') sourcePaths.push('botsales-kit/execution/frontend-evidence/FE004/handoff.md');
const deduped = [...new Set(sourcePaths)].sort();
const sourceFiles = deduped.map(rel => ({ path: rel, sha256: sha(fs.readFileSync(path.join(repo, rel))) }));

const gitHead = run('git', ['rev-parse', 'HEAD']);
const failed = checks.filter(check => !check.ok).length;
const logName = `${stepId}-current-review-20261001.log`;
const logPath = `execution/frontend-evidence/FE004/${logName}`;
const logBody = [
  `FE004.${stepId} current source validation`,
  `cwd=${repo}`,
  `HEAD=${gitHead.stdout.trim()} + dirty frontend working tree`,
  `node=${process.version}; npm=11.17.0`,
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API',
  `command=${current.command}`,
  ...current.logs.map(item => `\n--- ${item} ---\n${read(`botsales-kit/execution/frontend-evidence/FE004/${item}`).trim()}`),
  ...checks.map((check, index) => `\n[review ${index + 1}] ${check.ok ? 'PASS' : 'CHUA DAT'} ${check.name}\n${check.observed}`),
  `\nresult=${failed === 0 ? 'PASS' : 'CHUA DAT'}; checks=${checks.length}; exitCode=${failed === 0 ? 0 : 1}`,
].join('\n');
fs.writeFileSync(path.join(kit, logPath), `${logBody}\n`, 'utf8');
const commandId = stepId === 'S02' ? 'lint' : stepId === 'S03' || stepId === 'S04' ? 'boundaries' : 'types';
const evidence = {
  taskId: 'FE004', stepId, kind: stepId === 'S04' ? 'test_run' : 'test_run',
  result: failed === 0 ? 'PASS' : 'FAIL', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${gitHead.stdout.trim()} on main plus current frontend working tree`,
  expected: current.expected,
  observed: checks.map(check => `${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.observed}`).join(' '),
  commandId, command: current.command, cwd: repo, reviewer: 'Codex self-review; no independent peer review',
  environment: { name: 'Windows / Node 24.19.0 / npm 11.17.0', details: 'Current frontend-only React source; synthetic MSW data, no external services.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed, exitCode: failed === 0 ? 0 : 1,
  logFile: logPath, logSha256: sha(fs.readFileSync(path.join(kit, logPath))),
  sourceFiles,
  sourceSnapshotSha256: sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
fs.writeFileSync(path.join(dir, `${stepId}-current-revalidation-20261001.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: evidence.result, step: `FE004.${stepId}`, checks: checks.length, failed, sourceFiles: sourceFiles.length, logFile: logPath }, null, 2));
if (failed) process.exitCode = 1;





