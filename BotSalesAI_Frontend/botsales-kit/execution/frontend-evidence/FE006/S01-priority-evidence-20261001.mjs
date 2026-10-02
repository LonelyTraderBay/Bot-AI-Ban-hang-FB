import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const previous = JSON.parse(fs.readFileSync(path.join(evidenceDirectory, 'S01-refresh.json'), 'utf8'));
const unitLogFile = 'execution/frontend-evidence/FE005/S03-unit-priority-refresh-20261001.log';
const mapLogFile = 'execution/frontend-evidence/FE006/S01-token-map-priority-20261001.log';
const mapReportFile = 'botsales-kit/execution/frontend-evidence/FE006/S01-token-map.json';
const unitLog = fs.readFileSync(path.join(kit, unitLogFile));
const mapLog = fs.readFileSync(path.join(kit, mapLogFile));
const report = JSON.parse(fs.readFileSync(path.join(repo, mapReportFile), 'utf8'));
if (report.status !== 'PASS' || report.checks.length !== 10 || report.checks.some(check => check.result !== 'PASS'))
    throw new Error('The current Graphite Gold token map did not pass all 10 checks.');
if (!/Tests\s+66 passed \(66\)/.test(unitLog.toString('utf8')) || !unitLog.toString('utf8').includes('apps/web/tests/components.test.tsx (17 tests)'))
    throw new Error('The current theme/shared-component Vitest checks did not pass.');
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = commandMap.commands.find(item => item.id === 'unit');
if (!command || command.status !== 'VERIFIED_AVAILABLE')
    throw new Error('The registered unit-test command is unavailable.');
const sourcePaths = [...new Set([
    ...previous.sourceFiles.map(file => file.path),
    'botsales-kit/execution/frontend-evidence/FE005/S03-unit-priority-refresh-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE006/S01-token-map-priority-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE006/S01-priority-evidence-20261001.mjs',
])];
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const evidence = {
    taskId: 'FE006',
    stepId: 'S01',
    kind: 'test_run',
    result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()} plus working-tree snapshot ${sourceSnapshotSha256}`,
    expected: 'The approved Graphite Gold dark-only token source maps to exactly one MUI theme for typography, spacing, radii, breakpoints, touch targets, reduced motion, and semantic colors without a second palette.',
    observed: 'The current unit suite passed 66/66 across 7 files, including current runtime theme, responsive, and shared UI assertions. A fresh token map audit passed all 10 checks: canonical/generated token equality, dark-only mode, type/spacing/radius/touch-target/breakpoint/motion/color mappings, and no literal HEX in the MUI theme.',
    command: command.command,
    commandId: command.id,
    cwd: repo,
    reviewer: 'Codex self-review; no independent peer review',
    environment: {
        name: `Windows / Node ${process.version} / npm 11.17.0 / Vitest 3.2.4`,
        details: 'Current React shared UI tests use the generated Graphite Gold token package; token-map audit reads canonical design tokens and current theme source.',
        dataSource: 'synthetic-msw',
    },
    checksTotal: 76,
    failed: 0,
    exitCode: 0,
    logFile: unitLogFile,
    logSha256: sha256(unitLog),
    supportingLogs: [{ file: mapLogFile, sha256: sha256(mapLog) }],
    supportingArtifacts: [{ file: mapReportFile, sha256: sha256(fs.readFileSync(path.join(repo, mapReportFile))) }],
    sourceFiles,
    sourceSnapshotSha256,
};
const evidencePath = path.join(evidenceDirectory, 'S01-priority-refresh-20261001.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidence: path.relative(kit, evidencePath).replaceAll('\\', '/'), checksTotal: evidence.checksTotal, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));
