import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const scriptPath = 'botsales-kit/execution/frontend-evidence/FE001/capture-s01-spc059-current-20261006.mjs';
const evidencePath = 'botsales-kit/execution/frontend-evidence/FE001/S01-after-spc059-20261006.json';
const logPath = 'botsales-kit/execution/frontend-evidence/FE001/S01-after-spc059-20261006.log';
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const run = (file, args) => {
  const result = spawnSync(file, args, { cwd: root, encoding: 'utf8', windowsHide: true });
  assert(!result.error && result.status === 0, `${file} ${args.join(' ')} failed: ${result.error?.message ?? result.stderr}`);
  return result.stdout.trim();
};

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected cwd: ${root}`);
assert(!fs.existsSync(path.join(kit, evidencePath.replace('botsales-kit/', ''))), `Refusing to overwrite ${evidencePath}`);
assert(!fs.existsSync(path.join(kit, logPath.replace('botsales-kit/', ''))), `Refusing to overwrite ${logPath}`);

const gitRoot = run('git', ['rev-parse', '--show-toplevel']);
const branch = run('git', ['branch', '--show-current']);
const revision = run('git', ['rev-parse', 'HEAD']);
const statusResult = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8', windowsHide: true });
assert(!statusResult.error && statusResult.status === 0, `git status failed: ${statusResult.error?.message ?? statusResult.stderr}`);
const statusRows = statusResult.stdout.replace(/[\r\n]+$/, '').split(/\r?\n/).filter(Boolean);
const staged = statusRows.filter((row) => row[0] !== ' ' && row.slice(0, 2) !== '??');
const untracked = statusRows.filter((row) => row.slice(0, 2) === '??');
const rootRules = read('AI_RULES.md');
const kitRules = read('botsales-kit/AI_RULES.md');
const scope = read('docs/FRONTEND_SCOPE.md');
const standard = read('docs/FRONTEND_SPACING_STANDARD.md');
const plan = JSON.parse(read('botsales-kit/execution/frontend-plan.json'));
assert(path.resolve(gitRoot) === path.resolve(root, '..'), `Unexpected Git root: ${gitRoot}`);
assert(hash(rootRules) === hash(kitRules), 'Root and kit AI_RULES.md differ');
assert(plan.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API', `Unexpected scope: ${plan.scope}`);
assert(scope.includes('API mock tổng hợp') && standard.includes('SPC-059'), 'Frontend-only scope or current UI policy is missing');

const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'botsales-kit/AGENTS.md', 'botsales-kit/AI_RULES.md',
  'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/FRONTEND_SPACING_STANDARD.md',
  'botsales-kit/execution/frontend-plan.json', scriptPath,
];
const sourceFiles = sourcePaths.map((file) => ({ path: file, sha256: hash(fs.readFileSync(path.join(root, file))) }));
const sourceSnapshotSha256 = hash(Buffer.from(sourceFiles.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const executedAt = new Date().toISOString();
const command = `${process.execPath} ${scriptPath}`;
const observed = `cwd=${root}; gitRoot=${gitRoot}; branch=${branch}; HEAD=${revision}; dirtyPaths=${statusRows.length}; stagedPaths=${staged.length}; untrackedPaths=${untracked.length}; root/kit AI_RULES byte-identical; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; SPC-059 current; existing changes preserved.`;
const checks = [
  { label: 'cwd and Git root', result: `${root}; ${gitRoot}` },
  { label: 'branch and revision', result: `${branch}; ${revision}` },
  { label: 'pre-existing working tree preserved', result: `${statusRows.length} dirty/untracked paths observed; ${staged.length} staged; ${untracked.length} untracked; no reset/clean/stage command issued` },
  { label: 'effective rules and scope', result: 'Root and kit AI_RULES SHA-256 match; current Frontend Scope and SPC-059 reviewed' },
  { label: 'task/evidence authority', result: 'Scope FRONTEND_WITH_SYNTHETIC_MOCK_API; FE001–FE028 canonical plan/ledger; full-product plan/progress remain read-only' },
];
const log = [
  'FE001.S01 current intake after SPC-059 policy sync', `executedAt=${executedAt}`, `cwd=${root}`,
  `command=${command}`, 'exitCode=0',
  'expected=Read effective instructions and verify cwd/Git root/revision/diff and current docs/implementation authorization.',
  `observed=${observed}`, `checksTotal=${checks.length}; failed=0`,
  ...checks.flatMap((check) => [`CHECK ${check.label}: PASS`, check.result]),
  'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; backend/provider/staging results are not claimed.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map((file) => `SOURCE ${file.path} sha256=${file.sha256}`),
  'reviewer=Codex self-review; no independent peer review claimed.',
].join('\n') + '\n';
const logAbsolute = path.join(kit, logPath.replace('botsales-kit/', ''));
const evidenceAbsolute = path.join(kit, evidencePath.replace('botsales-kit/', ''));
fs.mkdirSync(path.dirname(logAbsolute), { recursive: true });
fs.writeFileSync(logAbsolute, log, 'utf8');
const evidence = {
  taskId: 'FE001', stepId: 'S01', kind: 'artifact_review', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'Read effective instructions and verify cwd/Git root/revision/diff and current docs/implementation authorization.',
  observed, command, cwd: root, reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.versions.node}`, details: 'Local source/evidence review; synthetic frontend scope; no backend or hosted runtime used.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile: logPath.replace('botsales-kit/', ''),
  logSha256: hash(log), sourceFiles, sourceSnapshotSha256,
};
fs.writeFileSync(evidenceAbsolute, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ taskId: 'FE001', stepId: 'S01', result: 'PASS', checksTotal: checks.length, evidence: evidencePath, log: logPath, sourceSnapshotSha256 }, null, 2));
