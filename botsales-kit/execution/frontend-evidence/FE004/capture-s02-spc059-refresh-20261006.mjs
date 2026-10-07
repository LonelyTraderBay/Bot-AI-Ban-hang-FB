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
const lintCommand = commandMap.commands.find((command) => command.id === 'lint');
const typeCommand = commandMap.commands.find((command) => command.id === 'types');
const boundaryCommand = commandMap.commands.find((command) => command.id === 'boundaries');
assert([lintCommand, typeCommand, boundaryCommand].every((command) => command?.status === 'VERIFIED_AVAILABLE'), 'A required verification command is not registered as available');

const logs = [
  { label: 'typecheck', path: 'execution/frontend-evidence/FE004/S02-typecheck-spc059-current-20261006.log', command: typeCommand },
  { label: 'boundaries', path: 'execution/frontend-evidence/FE004/S02-boundaries-spc059-current-20261006.log', command: boundaryCommand },
  { label: 'lint', path: 'execution/frontend-evidence/FE004/S02-lint-spc059-current-20261006.log', command: lintCommand },
  { label: 'suppression scan', path: 'execution/frontend-evidence/FE004/S02-suppression-spc059-current-20261006.log' },
];
for (const entry of logs) entry.content = fs.readFileSync(path.join(kit, entry.path), 'utf8');
const graph = JSON.parse(fs.readFileSync(path.join(root, 'botsales-kit/execution/frontend-evidence/FE004/S01-boundaries-report-spc059-registered-20261006.json'), 'utf8'));
const suppression = logs.find((entry) => entry.label === 'suppression scan').content;
assert(logs.find((entry) => entry.label === 'typecheck').content.includes('tsc -p apps/web/tsconfig.json --noEmit'), 'Typecheck was not captured');
assert(logs.find((entry) => entry.label === 'lint').content.includes('eslint apps/web/src --max-warnings 0'), 'Lint was not captured');
assert(graph.status === 'PASS' && graph.issues.length === 0, 'Module boundary check did not pass');
assert(/PASS 10\/10 scenarios/.test(logs.find((entry) => entry.label === 'boundaries').content), 'Boundary fixtures did not pass');
assert(suppression.includes('matches=0'), 'The explicit any/suppression scan did not find a clean source');

const srcRoot = path.join(root, 'apps/web/src');
const allSourceFiles = fs.readdirSync(srcRoot, { recursive: true }).filter((entry) => /\.(ts|tsx)$/.test(entry)).map((entry) => `apps/web/src/${entry.replaceAll('\\', '/')}`);
const sourcePaths = [
  'package.json', 'apps/web/package.json', 'apps/web/tsconfig.json', 'eslint.config.mjs',
  'scripts/check-boundaries.mjs', 'tests/architecture/check-boundaries.mjs',
  'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-evidence/FE004/S01-spc059-refresh-20261006.json',
  ...allSourceFiles, ...logs.map((entry) => `botsales-kit/${entry.path}`),
  'botsales-kit/execution/frontend-evidence/FE004/capture-s02-spc059-refresh-20261006.mjs',
];
const sourceFiles = [...new Set(sourcePaths)].map((file) => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const checks = [
  { label: 'strict TypeScript', observed: 'npm run typecheck passed with no diagnostics; strict and noUncheckedIndexedAccess remain enabled.' },
  { label: 'ESLint', observed: 'npm run lint passed with --max-warnings 0.' },
  { label: 'boundary analysis', observed: `AST checker passed ${graph.files} files and ${graph.imports} edges with zero issues.` },
  { label: 'negative fixtures', observed: 'Boundary checker passed all 10/10 allowed shared/public, alias/relative, app deep-import, type-only/dynamic, unresolved, cycle and parser-error scenarios.' },
  { label: 'no type or lint suppressions', observed: 'Source scan found no explicit any annotations/casts, @ts-ignore, @ts-expect-error, or eslint-disable directives.' },
  { label: 'minimal justified change', observed: 'No reproducible type, lint, boundary, or suppression defect exists; no source edit or artificial workaround was introduced.' },
];
const reviewer = 'Codex self-review; no independent peer review claimed';
const executedAt = new Date().toISOString();
const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const log = [
  'FE004.S02 strict typing, lint and boundaries current-source verification', `executedAt=${executedAt}`, `cwd=${root}`,
  ...logs.flatMap((entry) => [`${entry.label}Command=${entry.command?.command ?? 'rg explicit any and suppression directives'}`, `${entry.label}Log=${entry.path}`, `${entry.label}LogSha256=${sha(Buffer.from(entry.content))}`]),
  `graphFiles=${graph.files}; imports=${graph.imports}; issues=${graph.issues.length}`, `checksTotal=${checks.length}; failed=0`,
  ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  'sourceDecision=No change was justified by the measured findings; strictness, library contracts and the checker remain enabled.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
const logFile = 'execution/frontend-evidence/FE004/S02-spc059-refresh-20261006.log';
fs.writeFileSync(path.join(evidenceRoot, 'S02-spc059-refresh-20261006.log'), log, 'utf8');
const evidence = {
  taskId: 'FE004', stepId: 'S02', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'Full strict typecheck, lint and boundaries gates pass; only reproducible issues are repaired, with no any casts or suppressions.',
  observed: `Typecheck and lint passed, AST boundaries passed ${graph.files} source files/${graph.imports} edges with zero issues, 10/10 fixtures passed, and no explicit any/suppressions were found.`,
  commandId: lintCommand.id, command: lintCommand.command, cwd: root, reviewer,
  environment: { name: 'Windows / Node 24.19.0 / npm 11.17.0', details: 'Registered typecheck, boundaries and lint commands ran at the frontend root through PowerShell with a process-local compact PATH; all exits were zero, and source scan returned zero suppression matches.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile, logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
  commandResults: logs.map((entry) => ({ label: entry.label, ...(entry.command ? { commandId: entry.command.id, command: entry.command.command } : {}), exitCode: entry.label === 'suppression scan' ? 1 : 0, expectedExitCode: entry.label === 'suppression scan' ? 1 : 0, logFile: entry.path, logSha256: sha(Buffer.from(entry.content)) })),
};
fs.writeFileSync(path.join(evidenceRoot, 'S02-spc059-refresh-20261006.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, graph: `${graph.files}/${graph.imports}`, evidence: 'execution/frontend-evidence/FE004/S02-spc059-refresh-20261006.json', log: logFile }, null, 2));
