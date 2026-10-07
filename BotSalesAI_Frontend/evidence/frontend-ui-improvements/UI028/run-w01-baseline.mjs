import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceDir, '../../..');
const node = process.execPath;
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const commands = [];
function run(name, executable, args, cwd = root) {
    const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? `\n${result.error.message}` : ''}`;
    commands.push({ name, executable, args, cwd, exitCode: result.status, output });
    return { exitCode: result.status, output };
}

const status = run('git-status-porcelain', 'git', ['status', '--short', '--untracked-files=all']);
const cached = run('git-index-numstat', 'git', ['diff', '--cached', '--numstat']);
const working = run('git-working-tree-numstat', 'git', ['diff', '--numstat']);
const revision = run('git-head', 'git', ['rev-parse', 'HEAD']);
const branch = run('git-branch', 'git', ['branch', '--show-current']);
const gitDir = path.join(evidenceDir, 'W01');
fs.mkdirSync(gitDir, { recursive: true });
fs.writeFileSync(path.join(gitDir, 'git-status-current.txt'), status.output);
fs.writeFileSync(path.join(gitDir, 'git-index-numstat-current.txt'), cached.output);
fs.writeFileSync(path.join(gitDir, 'git-working-tree-numstat-current.txt'), working.output);

const baseline = readJson('evidence/frontend-spacing-audit-20261005/source-inventory.json');
const current = readJson('evidence/frontend-ui-improvements/UI028/W01/source-inventory.json');
const priorHashes = new Map(baseline.inputHashes.map(row => [row.file, row.sha256]));
const hashChanges = current.inputHashes.filter(row => priorHashes.has(row.file) && priorHashes.get(row.file) !== row.sha256).map(row => ({ file: row.file, previous: priorHashes.get(row.file), current: row.sha256 }));
const sourceHashChanges = hashChanges.filter(row => /^apps\/web\/src\//.test(row.file));
const statusLines = status.output.trim().split(/\r?\n/).filter(Boolean);
const planPaths = statusLines.filter(line => /(?:FRONTEND_UI_IMPROVEMENT_PLAN|FRONTEND_SPACING_STANDARD|UI028)/.test(line)).length;
const appPaths = statusLines.filter(line => /apps\/web\/(?:src|tests)/.test(line)).length;
const FE = run('canonical-fe-status-read-only', node, ['botsales-kit/scripts/progress.mjs', 'status']);
let feStatus = null;
try { feStatus = JSON.parse(FE.output); } catch { /* recorded as a failed check below */ }

const checks = [];
const check = (name, passed, observed) => checks.push({ name, status: passed ? 'PASS' : 'FAIL', observed });
check('git-source-and-dirty-scope-captured', status.exitCode === 0 && revision.exitCode === 0 && branch.exitCode === 0 && statusLines.length > 0, { revision: revision.output.trim(), branch: branch.output.trim(), changedPaths: statusLines.length, appSourceOrTestPaths: appPaths, ui028OrPlanPaths: planPaths, stagedNumstatEntries: cached.output.trim().split(/\r?\n/).filter(Boolean).length, unstagedNumstatEntries: working.output.trim().split(/\r?\n/).filter(Boolean).length });
check('fresh-spacingscan-covers-current-app-and-routes', current.status === 'CAPTURED_NOT_CONFORMANCE_PASS' && current.summary.typescriptFiles === 65 && current.summary.cssFiles === 2 && current.summary.modules === 16 && current.summary.routes === 54 && current.summary.matchedRoutes === 54 && current.summary.parserDiagnostics === 0, current.summary);
check('fresh-hashes-compared-to-prior-capture', current.inputHashes.length >= 70 && sourceHashChanges.length === 0, { currentInputs: current.inputHashes.length, sharedInputsWithPrior: current.inputHashes.filter(row => priorHashes.has(row.file)).length, changedAppSourceFilesSincePriorCapture: sourceHashChanges, changedSharedInputCount: hashChanges.length, otherChangedInputs: hashChanges.filter(row => !/^apps\/web\/src\//.test(row.file)).map(row => row.file) });
check('canonical-fe-status-captured-without-ledger-mutation', FE.exitCode === 0 && Boolean(feStatus) && feStatus.blocked.length === 0, feStatus ? { verified: feStatus.verifiedSteps, total: feStatus.totalSteps, stale: feStatus.stale.length, blocked: feStatus.blocked } : FE.output);

const baselineCommands = [
    ['generate-check', node, ['scripts/generate.mjs', '--check'], root],
    ['source-policy-checker', node, ['scripts/check-source.mjs'], root],
    ['source-policy-fixtures', node, ['--test', 'tests/source-checker.test.mjs'], root],
    ['module-boundaries', node, ['scripts/check-boundaries.mjs'], root],
    ['frontend-lint', node, ['node_modules/eslint/bin/eslint.js', 'apps/web/src', '--max-warnings', '0'], root],
    ['frontend-typecheck', node, ['node_modules/typescript/bin/tsc', '-p', 'apps/web/tsconfig.json', '--noEmit'], root],
    ['domain-and-msw-contracts', node, ['scripts/test-domain.mjs'], root],
    ['vitest', node, ['node_modules/vitest/vitest.mjs', 'run', '--config', 'apps/web/vitest.config.ts'], root],
    ['production-build', node, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'production'], path.join(root, 'apps/web')],
];
for (const [name, executable, args, cwd] of baselineCommands) {
    const result = run(name, executable, args, cwd);
    check(name, result.exitCode === 0, { exitCode: result.exitCode, commandIndex: commands.length - 1 });
}

const afterHashes = current.inputHashes.filter(row => hash(row.file) !== row.sha256).map(row => row.file);
check('baseline-runs-did-not-change-captured-frontend-or-canonical-inputs', afterHashes.length === 0, afterHashes);
const result = {
    capturedAt: new Date().toISOString(), scope: 'UI028_W01_FRONTEND_INTAKE_AND_BASELINE',
    status: checks.every(row => row.status === 'PASS') ? 'PASS_W01_INTAKE_BASELINE' : 'BASELINE_HAS_FINDINGS',
    revision: revision.output.trim(), branch: branch.output.trim(), runtime: { node: process.version, platform: process.platform, arch: process.arch },
    git: { changedPaths: statusLines.length, appSourceOrTestPaths: appPaths, ui028OrPlanPaths: planPaths, statusFile: 'W01/git-status-current.txt', stagedDiffFile: 'W01/git-index-numstat-current.txt', workingDiffFile: 'W01/git-working-tree-numstat-current.txt' },
    scan: { file: 'W01/source-inventory.json', summary: current.summary, hashChangesComparedToEarlierSameDayCapture: hashChanges },
    feStatus: feStatus ? { verified: feStatus.verifiedSteps, total: feStatus.totalSteps, stale: feStatus.stale, blocked: feStatus.blocked, next: feStatus.next } : null,
    oldCaptureHashChanges: hashChanges, unresolvedBaseline: [], checks, commands: commands.map(({ name, executable, args, cwd, exitCode }) => ({ name, executable, args, cwd, exitCode })),
    commandLog: 'W01/run-w01-baseline-20261005.log',
    limitations: ['The spacing scan is an AST inventory, not a conformance checker or rendered browser audit.', 'No spacing changes have been applied by this intake.', 'Frontend plan/tracker stale status reflects current dependency fingerprints; the read-only FE ledger is not refreshed here.', 'No Backend, hosted CI, screen-reader or owner acceptance is claimed.'],
};
fs.writeFileSync(path.join(evidenceDir, 'W01', 'run-w01-baseline-20261005.log'), commands.map(command => JSON.stringify(command, null, 2)).join('\n\n') + '\n');
fs.writeFileSync(path.join(evidenceDir, 'W01', 'intake-baseline-20261005.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, checks: checks.map(({ name, status, observed }) => ({ name, status, observed: typeof observed === 'object' && observed !== null ? (observed.exitCode !== undefined ? observed.exitCode : undefined) : observed })), changedPaths: statusLines.length, scans: current.summary, FE: result.feStatus ? { verified: result.feStatus.verified, stale: result.feStatus.stale.length, blocked: result.feStatus.blocked.length } : null }, null, 2));
if (result.status !== 'PASS_W01_INTAKE_BASELINE') process.exitCode = 1;
