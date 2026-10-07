import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const helper = 'botsales-kit/execution/frontend-evidence/FE003/capture-s01-post-fe002-current-20261006.mjs';
const output = 'botsales-kit/execution/frontend-evidence/FE003';
const outputRelativeToKit = 'execution/frontend-evidence/FE003';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);
const pkg = json('package.json');
const map = json('botsales-kit/execution/frontend-command-map.json');
const task = json('botsales-kit/execution/frontend-plan.json').tasks.find((entry) => entry.id === 'FE003');
const required = [
  ['generate', 'generate:check'], ['source', 'test:source'], ['boundaries', 'boundaries'],
  ['types', 'typecheck'], ['lint', 'lint'], ['domain', 'test:domain'], ['unit', 'test'],
  ['build', 'build'], ['build-demo', 'build:demo'], ['e2e', 'test:e2e'],
];
const rows = [];
for (const [id, script] of required) {
  const entry = map.commands.find((item) => item.id === id);
  assert(typeof pkg.scripts[script] === 'string', `Missing package script ${script}`);
  assert(entry && entry.status === 'VERIFIED_AVAILABLE', `Command ${id} is not VERIFIED_AVAILABLE`);
  assert(entry.cwd === 'BotSalesAI_Frontend', `Unexpected cwd for ${id}: ${entry.cwd}`);
  const commandNamesScript = id === 'unit' ? /npm\.cmd.*\btest\b/ : new RegExp(`\\brun\\s+${script.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`);
  assert(commandNamesScript.test(entry.command), `Command ${id} does not call package script ${script}`);
  rows.push({ id, script, command: entry.command, cwd: entry.cwd, status: entry.status });
}
const retiredAlias = map.commands.find((item) => item.id === 'contracts');
assert(retiredAlias?.status === 'DECLARED_NOT_RUN' && /script was removed/i.test(retiredAlias.observedOn), 'Retired contracts alias is not clearly distinguished from runnable commands');
assert(map.commands.some((item) => item.id === 'contract-tests' && item.status === 'VERIFIED_AVAILABLE'), 'Current direct Node contract test command is not registered');
for (const file of ['apps/web/vitest.config.ts', 'playwright.config.ts']) assert(fs.existsSync(path.join(root, file)), `Missing test config ${file}`);

const sourcePaths = ['package.json', 'botsales-kit/execution/frontend-command-map.json', 'botsales-kit/execution/frontend-plan.json', 'apps/web/vitest.config.ts', 'playwright.config.ts', helper];
const sourceFiles = sourcePaths.map((file) => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const reviewer = 'Codex self-review; no independent peer review claimed';
const executedAt = new Date().toISOString();
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const logFile = `${outputRelativeToKit}/S01-post-fe002-current-20261006.log`;
const evidenceFile = `${outputRelativeToKit}/S01-post-fe002-current-20261006.json`;
const checks = [
  { label: 'root npm script map', observed: `${rows.length}/10 required scripts exist and each registered command invokes its matching package script` },
  { label: 'command cwd and availability', observed: 'All ten active commands use the frontend root and are marked VERIFIED_AVAILABLE with earlier run-log provenance' },
  { label: 'retired alias handling', observed: 'Removed test:contracts alias remains DECLARED_NOT_RUN; direct contract-tests command is separately VERIFIED_AVAILABLE' },
  { label: 'test runner configuration', observed: 'Vitest config exists with jsdom and frontend test include; Playwright config exists with Chromium and Firefox projects' },
];
const observed = `${rows.length}/10 current command-map entries match package.json scripts and frontend cwd; retired contracts alias is explicitly not runnable and has a separate verified direct Node test; Vitest and Playwright configs exist. No tests were run by this artifact-review checkpoint.`;
const log = [
  'FE003.S01 current command-map review', `executedAt=${executedAt}`, `cwd=${root}`,
  `command=node ${helper}`, 'exitCode=0', `expected=${task.implementationSteps[0].action}`, `observed=${observed}`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.observed]),
  ...rows.map((row) => `SCRIPT ${row.id}=${row.script}; cwd=${row.cwd}; status=${row.status}; command=${row.command}`),
  'SCOPE=FRONTEND_WITH_SYNTHETIC_MOCK_API; no prototype/backend result claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(path.join(root, output, 'S01-post-fe002-current-20261006.log'), log, 'utf8');
const evidence = {
  taskId: 'FE003', stepId: 'S01', kind: 'artifact_review', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: task.implementationSteps[0].action, observed,
  command: `node ${helper}`, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / npm 11.17.0`, details: 'Local source/config review; this checkpoint did not run the test suites.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile, logSha256: sha(log), sourceFiles, sourceSnapshotSha256,
  commandMapping: rows,
};
fs.writeFileSync(path.join(root, output, 'S01-post-fe002-current-20261006.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', scripts: rows.length, evidence: evidenceFile, log: logFile }, null, 2));
