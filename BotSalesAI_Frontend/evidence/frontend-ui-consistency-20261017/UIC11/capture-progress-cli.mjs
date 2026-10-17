import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const frontendRoot = process.cwd();
const evidenceRoot = path.resolve(frontendRoot, 'evidence/frontend-ui-consistency-20261017/UIC11');
const progressCli = path.resolve(frontendRoot, '../botsales-kit/scripts/progress.mjs');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const git = (...args) => {
    const result = spawnSync('git', args, { cwd: frontendRoot, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} exited ${result.status}`);
    return result.stdout.trim();
};

fs.mkdirSync(evidenceRoot, { recursive: true });
const commands = [];
for (const name of ['validate', 'status']) {
    const result = spawnSync(process.execPath, [progressCli, name], { cwd: frontendRoot, encoding: 'utf8' });
    const logPath = `${name}.log`;
    fs.writeFileSync(path.join(evidenceRoot, logPath), result.stdout, 'utf8');
    fs.writeFileSync(path.join(evidenceRoot, `${logPath}.exit`), `${result.status ?? 1}\n`, 'utf8');
    commands.push({
        command: `node ../botsales-kit/scripts/progress.mjs ${name}`,
        cwd: frontendRoot,
        exitCode: result.status ?? 1,
        log: logPath,
        logSha256: sha256(result.stdout),
        stderr: result.stderr || '',
    });
}

const statusText = fs.readFileSync(path.join(evidenceRoot, 'status.log'), 'utf8');
const status = JSON.parse(statusText);
const kitRoot = path.resolve(frontendRoot, '../botsales-kit');
const files = ['execution/frontend-plan.json', 'execution/frontend-progress.json'];
const sourceHashes = Object.fromEntries(files.map((relative) => {
    const fullPath = path.join(kitRoot, relative);
    return [relative, sha256(fs.readFileSync(fullPath))];
}));
const generatedPaths = [
    'IMPLEMENTATION_PLAN.md',
    'execution/FRONTEND_PROGRESS.md',
    'execution/frontend-progress-report.json',
    ...Array.from({ length: 28 }, (_, index) => `execution/frontend-tasks/FE${String(index + 1).padStart(3, '0')}.md`),
];
const generatedOutputs = generatedPaths.map((relative) => {
    const fullPath = path.join(kitRoot, relative);
    if (!fs.existsSync(fullPath)) throw new Error(`Owner CLI generated report is missing: ${relative}`);
    const bytes = fs.readFileSync(fullPath);
    return { path: `botsales-kit/${relative.replaceAll(path.sep, '/')}`, bytes: bytes.length, sha256: sha256(bytes) };
});
const reportLogName = process.env.UIC11_REPORT_LOG || 'owner-report-generator.log';
if (path.basename(reportLogName) !== reportLogName) throw new Error('UIC11_REPORT_LOG must be a file name in the evidence directory.');
const reportLogPath = path.join(evidenceRoot, reportLogName);
const reportExitPath = `${reportLogPath}.exit`;
const reportLog = fs.existsSync(reportLogPath) ? fs.readFileSync(reportLogPath) : Buffer.alloc(0);
const reportExitCode = fs.existsSync(reportExitPath) ? Number(fs.readFileSync(reportExitPath, 'utf8').trim()) : null;
const receipt = {
    capturedAt: new Date().toISOString(),
    repository: git('rev-parse', 'HEAD'),
    branch: git('branch', '--show-current'),
    cwd: frontendRoot,
    scope: 'Frontend progress owner CLI; read-only validate/status; không sửa frontend-progress.json hoặc full-product progress.json.',
    ownerInputs: sourceHashes,
    reportGenerator: {
        command: 'node ../botsales-kit/scripts/progress.mjs report',
        exitCode: reportExitCode,
        log: reportLogName,
        logSha256: sha256(reportLog),
        generatedOutputCount: generatedOutputs.length,
        outputs: generatedOutputs,
    },
    commands,
    observed: {
        valid: status.valid,
        totalTasks: status.tasks,
        overallPercent: status.overallPercent,
        verifiedSteps: status.verifiedSteps,
        totalSteps: status.totalSteps,
        staleTasks: status.stale,
        blockedTasks: status.blocked,
        next: status.next,
    },
};
fs.writeFileSync(path.join(evidenceRoot, 'progress-cli-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ validateExit: commands[0].exitCode, statusExit: commands[1].exitCode, ...receipt.observed }, null, 2));
if (commands.some((command) => command.exitCode !== 0) || reportExitCode !== 0) process.exitCode = 1;
