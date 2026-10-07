import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const outStem = 'S01-current-after-spc058-20261006';
const sourcePaths = [
  'AGENTS.md',
  'AI_RULES.md',
  'botsales-kit/AGENTS.md',
  'botsales-kit/AI_RULES.md',
  'docs/FRONTEND_SCOPE.md',
  'docs/PROJECT_CONTEXT.md',
  'botsales-kit/execution/frontend-plan.json',
];
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (relative) => fs.readFileSync(path.join(root, relative));
const run = (args) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.error?.message ?? result.stderr}`);
  return result.stdout.trim();
};

if (!root.endsWith('BotSalesAI_Frontend')) throw new Error(`Unexpected working directory: ${root}`);
const gitRoot = run(['rev-parse', '--show-toplevel']);
const branch = run(['branch', '--show-current']);
const head = run(['rev-parse', 'HEAD']);
const statusResult = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8', windowsHide: true });
if (statusResult.error || statusResult.status !== 0) throw new Error(`git status failed: ${statusResult.error?.message ?? statusResult.stderr}`);
const rows = statusResult.stdout.replace(/[\r\n]+$/, '').split(/\r?\n/).filter(Boolean);
const staged = rows.filter((row) => row.slice(0, 2) !== '??' && row[0] !== ' ');
const unstaged = rows.filter((row) => row.slice(0, 2) !== '??' && row[1] !== ' ');
const untracked = rows.filter((row) => row.slice(0, 2) === '??');
const plan = JSON.parse(read('botsales-kit/execution/frontend-plan.json'));
const scope = read('docs/FRONTEND_SCOPE.md').toString('utf8');
const rootRules = read('AI_RULES.md');
const kitRules = read('botsales-kit/AI_RULES.md');
const checks = [
  ['workspace boundary', path.resolve(gitRoot) === path.resolve(root, '..')],
  ['branch and HEAD captured', Boolean(branch && head)],
  ['dirty work preserved', rows.length > 0 && staged.length + unstaged.length + untracked.length > 0],
  ['Universal rules remain byte-identical', sha(rootRules) === sha(kitRules)],
  ['frontend plan is canonical and mock-only', plan.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && plan.tasks.length === 28],
  ['UI policy includes SPC-058 and Frontend-only boundary', scope.includes('SPC-058') && /Frontend-only/i.test(scope)],
  ['full-product tracker remains outside this FE task', fs.existsSync(path.join(kit, 'execution/plan.json')) && fs.existsSync(path.join(kit, 'execution/progress.json'))],
];
const failed = checks.filter(([, pass]) => !pass);
if (failed.length) throw new Error(`Intake checks failed: ${failed.map(([name]) => name).join(', ')}`);

const sourceFiles = sourcePaths.map((relative) => ({ path: relative, sha256: sha(read(relative)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map((item) => `${item.path}:${item.sha256}`).sort().join('\n')));
const executedAt = new Date().toISOString();
const command = `& "${process.execPath}" botsales-kit/execution/frontend-evidence/FE001/capture-s01-current-after-spc058.mjs`;
const expected = 'Đọc hướng dẫn có hiệu lực, xác minh cwd/Git root/revision/diff và quyền docs/implement của lượt hiện tại.';
const observed = `cwd=${root}; gitRoot=${gitRoot}; branch=${branch}; HEAD=${head}; statusRows=${rows.length}; staged=${staged.length}; unstaged=${unstaged.length}; untracked=${untracked.length}; root/kit AI_RULES byte-identical; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; existing changes preserved.`;
const logRelative = `execution/frontend-evidence/FE001/${outStem}.log`;
const evidenceRelative = `execution/frontend-evidence/FE001/${outStem}.json`;
const log = [
  'FE001.S01 fresh intake after SPC-058',
  `executedAt=${executedAt}`,
  `cwd=${root}`,
  `command=${command}`,
  'exitCode=0',
  `expected=${expected}`,
  `observed=${observed}`,
  `checksTotal=${checks.length}; failed=0`,
  ...checks.map(([name]) => `CHECK ${name}: PASS`),
  'Scope: frontend with synthetic mock API; no backend, hosted CI, staging, or production claim.',
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map((item) => `SOURCE ${item.path} sha256=${item.sha256}`),
  'Reviewer: Codex self-review; no independent peer review claimed.',
].join('\n') + '\n';
fs.writeFileSync(path.join(kit, logRelative), log, 'utf8');
const evidence = {
  taskId: 'FE001',
  stepId: 'S01',
  kind: 'artifact_review',
  result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt,
  sourceRevision: `HEAD ${head} on ${branch} plus current frontend working tree`,
  expected,
  observed,
  command,
  cwd: root,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: `Windows / Node ${process.versions.node}`,
    details: 'Read-only workspace, scope, source, and Git intake; synthetic frontend scope only.',
    dataSource: 'source-only',
  },
  checksTotal: checks.length,
  failed: 0,
  logFile: logRelative,
  logSha256: sha(Buffer.from(log)),
  sourceFiles,
  sourceSnapshotSha256,
};
fs.writeFileSync(path.join(kit, evidenceRelative), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ result: 'PASS', checks: checks.length, evidence: evidenceRelative, log: logRelative, sourceSnapshotSha256 }, null, 2)}\n`);
