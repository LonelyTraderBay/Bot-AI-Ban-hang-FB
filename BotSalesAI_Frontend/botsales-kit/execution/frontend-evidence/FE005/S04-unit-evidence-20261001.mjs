import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const previous = JSON.parse(fs.readFileSync(path.join(evidenceDirectory, 'S04.json'), 'utf8'));
const logFile = 'execution/frontend-evidence/FE005/S03-unit-priority-refresh-20261001.log';
const log = fs.readFileSync(path.join(kit, logFile));
const output = log.toString('utf8');
if (!output.includes('apps/web/tests/api-client.test.tsx (19 tests)') || !/Tests\s+66 passed \(66\)/.test(output))
    throw new Error('The current API-client fixtures are missing or Vitest failed.');
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = commandMap.commands.find(item => item.id === 'unit');
if (!command || command.status !== 'VERIFIED_AVAILABLE')
    throw new Error('The registered unit-test command is unavailable.');
const sourcePaths = [...new Set([
    ...previous.sourceFiles.map(file => file.path),
    'botsales-kit/execution/frontend-evidence/FE005/S03-unit-priority-refresh-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE005/S04-unit-evidence-20261001.mjs',
])];
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const evidence = {
    taskId: 'FE005',
    stepId: 'S04',
    kind: 'test_run',
    result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()} plus working-tree snapshot ${sourceSnapshotSha256}`,
    expected: 'HTTP success/null, structured 409/412/422/428/429 problems, timeout, schema-invalid mutation results, aborted requests, and 202 command polling preserve safe UI intent.',
    observed: 'The current full Vitest run passed 66/66 and executed 19 typed API-client tests. Fixture assertions cover HTTP success and null DTOs, each structured Problem status, timeouts, invalid response schemas, unsupported command status, and accepted commands that remain unresolved until terminal polling.',
    command: command.command,
    commandId: command.id,
    cwd: repo,
    reviewer: 'Codex self-review; no independent peer review',
    environment: {
        name: `Windows / Node ${process.version} / npm 11.17.0 / Vitest 3.2.4`,
        details: 'Root workspace with jsdom, React Testing Library, generated contract DTOs, and controlled synthetic HTTP responses.',
        dataSource: 'synthetic-msw',
    },
    checksTotal: 19,
    failed: 0,
    exitCode: 0,
    logFile,
    logSha256: sha256(log),
    sourceFiles,
    sourceSnapshotSha256,
};
const evidencePath = path.join(evidenceDirectory, 'S04-unit-priority-refresh-20261001.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidence: path.relative(kit, evidencePath).replaceAll('\\', '/'), checksTotal: evidence.checksTotal, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));
