import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const previous = JSON.parse(fs.readFileSync(path.join(evidenceDirectory, 'S01-current-revalidated-20261001.json'), 'utf8'));
const logFile = 'execution/frontend-evidence/FE005/S01-source-priority-refresh-20261001.log';
const fullBrowserLog = 'execution/frontend-evidence/FE003/S03-runner-refreshed-e2e-20261001.log';
const output = fs.readFileSync(path.join(kit, logFile), 'utf8');
const browser = fs.readFileSync(path.join(kit, fullBrowserLog), 'utf8');
if (!/"files": 57,[\s\S]*"operationCalls": 223,[\s\S]*"routes": 54,[\s\S]*"issues": \[\],[\s\S]*"status": "PASS"/.test(output))
    throw new Error('The current source/route audit did not pass with the expected mapping counts.');
if (!browser.includes('✔ rejects unresolved schema references before generation') || !browser.includes('✔ rejects route-to-operation drift without rewriting the canonical manifest'))
    throw new Error('The full browser log does not contain current canonical contract negative checks.');
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = commandMap.commands.find(item => item.id === 'source');
if (!command || command.status !== 'VERIFIED_AVAILABLE')
    throw new Error('The registered source-audit command is unavailable.');
const sourcePaths = [...new Set([
    ...previous.sourceFiles.map(file => file.path),
    'botsales-kit/execution/frontend-evidence/FE005/S01-source-priority-refresh-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE003/S03-runner-refreshed-e2e-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE005/S01-source-evidence-20261001.mjs',
])];
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const sourceRevision = `HEAD ${execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()} plus working-tree snapshot ${sourceSnapshotSha256}`;
const logBytes = fs.readFileSync(path.join(kit, logFile));
const browserBytes = fs.readFileSync(path.join(kit, fullBrowserLog));
const evidence = {
    taskId: 'FE005',
    stepId: 'S01',
    kind: 'test_run',
    result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    executedAt: new Date().toISOString(),
    sourceRevision,
    expected: 'Current React/TypeScript operation references and route bindings resolve against canonical OpenAPI, route, permission, and event contracts; contract-owned DTOs and gaps remain explicit.',
    observed: 'The current source audit passed 57 frontend files, 223 operation calls, and all 54 routes with zero issues. The full Chromium log also contains the current contract-generator checks for unresolved schema references and route-to-operation drift. This verifies frontend source mapping only, not backend behavior.',
    command: command.command,
    commandId: command.id,
    cwd: repo,
    reviewer: 'Codex self-review; no independent peer review',
    environment: {
        name: `Windows / Node ${process.version} / npm 11.17.0`,
        details: 'Canonical OpenAPI-derived metadata and current React source audit; browser and API fixtures are synthetic.',
        dataSource: 'source-only',
    },
    checksTotal: 3,
    failed: 0,
    exitCode: 0,
    logFile,
    logSha256: sha256(logBytes),
    supportingLogs: [{ file: fullBrowserLog, sha256: sha256(browserBytes) }],
    sourceFiles,
    sourceSnapshotSha256,
};
const evidencePath = path.join(evidenceDirectory, 'S01-source-priority-refresh-20261001.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidence: path.relative(kit, evidencePath).replaceAll('\\', '/'), checksTotal: evidence.checksTotal, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));
