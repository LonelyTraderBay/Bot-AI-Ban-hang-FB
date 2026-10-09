import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const repositoryRoot = path.resolve(frontendRoot, '..');
const kitRoot = path.join(repositoryRoot, 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE001');
const rawStatusPath = path.join(evidenceDir, 'S01-git-status-raw-current-20261008.txt');
const logPath = path.join(evidenceDir, 'S01-intake-current-20261008.log');
const evidencePath = path.join(evidenceDir, 'S01-current-20261008.json');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative));
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative));
const jsonKit = relative => JSON.parse(readKit(relative));

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE001');
const step = task?.implementationSteps?.find(item => item.id === 'S01');
assert(step, 'Canonical FE001.S01 plan was not found');
fs.mkdirSync(evidenceDir, { recursive: true });
// Create these before status capture so the raw short-status output records the capture artifacts too.
fs.writeFileSync(rawStatusPath, '', 'utf8');
fs.writeFileSync(logPath, '', 'utf8');
const rawStatus = execFileSync('git', ['status', '--short', '--untracked-files=all'], { cwd: repositoryRoot, encoding: 'utf8' });
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
const statusLines = rawStatus.split(/\r?\n/).filter(Boolean);
assert(statusLines.length > 0, 'Expected a dirty working tree snapshot; preserve and review its path list');
assert(statusLines.every(line => /^(?:[ MADRCU?!]{2}) /.test(line)), 'Git status output lost its raw two-column XY status prefix');
fs.writeFileSync(rawStatusPath, rawStatus, 'utf8');

const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
  'docs/route-implementation.json', 'evidence/REPORT.md', 'package.json', 'package-lock.json', 'playwright.config.ts',
  'botsales-kit/AGENTS.md', 'botsales-kit/START_HERE.md', 'botsales-kit/AI_RULES_PROJECT.md',
  'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE001/capture-intake-baseline-current-20261008.mjs',
  'botsales-kit/execution/frontend-evidence/FE001/S01-git-status-raw-current-20261008.txt',
].sort();
const sourceFiles = sourcePaths.map(relative => {
  const file = relative.startsWith('botsales-kit/')
    ? path.join(kitRoot, relative.slice('botsales-kit/'.length))
    : path.join(frontendRoot, relative);
  assert(fs.existsSync(file), `Missing intake source: ${relative}`);
  return { path: relative, sha256: sha(fs.readFileSync(file)) };
});
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const executedAt = new Date().toISOString();
const rawStatusSha256 = sha(Buffer.from(rawStatus));
const log = [
  'FE001.S01 frontend intake and Git baseline.', `executedAt=${executedAt}`,
  `command=git status --short --untracked-files=all; cwd=${repositoryRoot}; exitCode=0`,
  `command=git rev-parse HEAD; cwd=${repositoryRoot}; exitCode=0; HEAD=${head}`,
  `command=git branch --show-current; cwd=${repositoryRoot}; exitCode=0; branch=${branch || '(detached)'}`,
  `rawStatusFile=botsales-kit/execution/frontend-evidence/FE001/S01-git-status-raw-current-20261008.txt`,
  `rawStatusSha256=${rawStatusSha256}; pathCount=${statusLines.length}; xyColumnsPreserved=true`,
  'Scope=React/TypeScript Frontend with synthetic MSW API; Backend remains an empty placeholder and is not described as implemented.',
].join('\n') + '\n';
fs.writeFileSync(logPath, log, 'utf8');

const evidence = {
  taskId: 'FE001', stepId: 'S01', kind: 'artifact_review', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${head}; branch ${branch || '(detached)'}; working tree dirty with ${statusLines.length} status rows`,
  expected: step.verification,
  observed: `Repository root is ${repositoryRoot}; frontend workspace is ${frontendRoot}; HEAD ${head}; branch ${branch || '(detached)'}. Captured ${statusLines.length} current Git paths with their original two-column XY status prefixes in ${path.relative(repositoryRoot, rawStatusPath).replaceAll('\\', '/')}. Read and hashed the applicable Frontend/kit instructions, scope, architecture/API/coding docs, evidence report, known gaps, canonical route matrix, npm configuration, and frontend plan/command map. No staged/reset/clean action was taken.`,
  command: 'git status --short --untracked-files=all', cwd: repositoryRoot,
  reviewer: 'Codex',
  environment: { name: 'Local Windows checkout', details: 'PowerShell workspace, Git CLI and Node 24.19.0; source/artifact review only.', dataSource: 'source-only' },
  checksTotal: 6, failed: 0,
  sourceFiles, sourceSnapshotSha256,
  logFile: 'execution/frontend-evidence/FE001/S01-intake-current-20261008.log',
  logSha256: sha(Buffer.from(log)),
  audit: { head, branch: branch || null, statusRows: statusLines.length, rawStatusFile: 'execution/frontend-evidence/FE001/S01-git-status-raw-current-20261008.txt', rawStatusSha256, xyColumnsPreserved: true },
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: 'PASS', taskId: 'FE001', stepId: 'S01', head, branch: branch || null, statusRows: statusLines.length, xyColumnsPreserved: true, sourceFiles: sourceFiles.length, sourceSnapshotSha256, evidence: 'execution/frontend-evidence/FE001/S01-current-20261008.json' }, null, 2));
