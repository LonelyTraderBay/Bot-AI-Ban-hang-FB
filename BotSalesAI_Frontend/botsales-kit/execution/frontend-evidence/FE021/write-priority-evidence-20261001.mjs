import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(directory, '../../../..', 'botsales-kit');
const repoRoot = path.resolve(kitRoot, '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const digestFile = relative => digest(fs.readFileSync(path.join(repoRoot, relative)));
const logs = {
    e2e: 'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log',
    unit: 'botsales-kit/execution/frontend-evidence/FE007/unit-rerun-current-20261001.log',
    source: 'botsales-kit/execution/frontend-evidence/FE009/source-rerun-current-20261001.log',
    generate: 'botsales-kit/execution/frontend-evidence/FE009/S05-generate-rerun-current-20261001.log',
    boundaries: 'botsales-kit/execution/frontend-evidence/FE009/boundaries-rerun-current-20261001.log',
    typecheck: 'botsales-kit/execution/frontend-evidence/FE009/S05-typecheck-rerun-current-20261001.log',
    lint: 'botsales-kit/execution/frontend-evidence/FE009/S05-lint-rerun-current-20261001.log',
    domain: 'botsales-kit/execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log',
    schemas: 'botsales-kit/execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log',
    production: 'botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
    demo: 'botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
};
const sourcePaths = [
    'apps/web/package.json',
    'apps/web/src/app/Shell.tsx',
    'apps/web/src/mocks/database.ts',
    'apps/web/src/mocks/files.ts',
    'apps/web/src/mocks/marketing-fixture.ts',
    'apps/web/src/mocks/service.ts',
    'apps/web/src/modules/dashboard/index.tsx',
    'apps/web/src/modules/reports/index.tsx',
    'apps/web/src/modules/reports/report-utils.ts',
    'apps/web/src/shared/api/client.ts',
    'apps/web/src/shared/api/hooks.ts',
    'apps/web/src/shared/model/format.ts',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/tests/components.test.tsx',
    'apps/web/tests/fe021-source-map.test.ts',
    'apps/web/tests/report-utils.test.ts',
    'apps/web/vite.config.ts',
    'tests/fe015.spec.ts',
    'tests/fe021.spec.ts',
    'tests/session/demo-server.mjs',
    'playwright.config.ts',
    'package.json',
    'packages/contracts/src/generated.ts',
    'packages/contracts/src/operations.json',
    'packages/contracts/src/schemas.json',
    'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-plan.json',
    'botsales-kit/execution/frontend-evidence/FE021/handoff.md',
    'botsales-kit/execution/frontend-evidence/FE021/write-priority-evidence-20261001.mjs',
    'docs/KNOWN_GAPS.md',
].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: digestFile(file) }));
const sourceSnapshotSha256 = digest(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const bytes = Object.fromEntries(Object.entries(logs).map(([key, file]) => [key, fs.readFileSync(path.join(repoRoot, file))]));
const e2eOutput = bytes.e2e.toString('utf8');
const totalE2e = Number(e2eOutput.match(/(\d+) passed\b/)?.[1]);
const fe021Cases = (e2eOutput.match(/tests\\fe021\.spec\.ts:/g) ?? []).length;
if (totalE2e !== 123 || fe021Cases !== 8 || !e2eOutput.includes('FE021.E08 report explanation is mock-only')) {
    throw new Error(`Expected current full E2E 123/123, eight FE021 browser cases and the report explanation; got ${totalE2e}/${fe021Cases}.`);
}
const assertions = {
    source: /"files": 58[\s\S]*"operationCalls": 224[\s\S]*"routes": 54[\s\S]*"status": "PASS"/,
    generate: /"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54/,
    boundaries: /"imports": 402[\s\S]*negativeFixtures[\s\S]*8\/8[\s\S]*"status": "PASS"/,
    typecheck: /EXIT_CODE=0/,
    lint: /EXIT_CODE=0/,
    unit: /66 passed \(66\)[\s\S]*EXIT_CODE=0/,
    domain: /"passed":88[\s\S]*EXIT_CODE=0/,
    schemas: /"status": "PASS", "checks": 356[\s\S]*EXIT_CODE=0/,
    production: /✓ built[\s\S]*EXIT_CODE=0/,
    demo: /✓ built[\s\S]*EXIT_CODE=0/,
};
for (const [key, pattern] of Object.entries(assertions)) if (!pattern.test(bytes[key].toString('utf8'))) throw new Error(`Current ${key} gate log does not prove a pass.`);
const commandMap = JSON.parse(fs.readFileSync(path.join(kitRoot, 'execution/frontend-command-map.json'), 'utf8'));
const commandFor = id => {
    const command = commandMap.commands.find(item => item.id === id);
    if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command is not verified: ${id}`);
    return command;
};
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const supporting = keys => keys.map(key => ({
    file: logs[key].slice('botsales-kit/'.length),
    sha256: digest(bytes[key]),
}));
const steps = [
    {
        stepId: 'S02', commandId: 'e2e', log: 'e2e', checksTotal: 8, dataSource: 'synthetic-msw',
        expected: 'Dashboard, marketing fixture chart/table, report export, shop timezone conversion, job pagination and download behavior use canonical API responses and synthetic fixtures.',
        observed: 'All eight FE021 Chromium cases passed in the current 123/123 suite. They verify API-backed dashboard state, matching marketing chart/table fixture values, null actual spend, inclusive local-date export boundaries, safe CSV, source permission and cursor pagination. Contract limits for marketing dates and report series remain visible.',
        support: ['domain', 'generate', 'typecheck'],
    },
    {
        stepId: 'S03', commandId: 'e2e', log: 'e2e', checksTotal: 8, dataSource: 'synthetic-msw',
        expected: 'Empty/redacted/invalid-timezone/source-permission/stale/unknown/export error states preserve selected inputs and never expose false KPI or download success.',
        observed: 'All eight FE021 Chromium cases passed. Empty shop and report states are explicit; finance fields stay hidden without permission; invalid timezone creates no job; missing source permission is denied; 412 and ambiguous 503 retain dates and show no download. API gaps for time-series and marketing-date filters are not fabricated.',
        support: ['domain', 'schemas', 'unit'],
    },
    {
        stepId: 'S04', commandId: 'unit', log: 'unit', checksTotal: 66, dataSource: 'synthetic-msw',
        expected: 'Current FE021 helper/component/network behavior and shared generation, source, boundary, type, lint, unit, domain/schema, and production/demo build checks pass.',
        observed: 'Current Vitest passed 66/66; E2E 123/123 with eight FE021 cases; domain/MSW 88/88; schemas 356/356; generate 11 outputs/283 schemas/210 operations/54 routes; source 58/224/54; boundaries 402 imports and 8/8 negative fixtures; typecheck/lint and both builds exit 0. Builds retain the >500 kB chunk warning.',
        support: ['e2e', 'source', 'generate', 'boundaries', 'typecheck', 'lint', 'domain', 'schemas', 'production', 'demo'],
    },
    {
        stepId: 'S05', commandId: 'e2e', log: 'e2e', checksTotal: 8, dataSource: 'synthetic-msw',
        expected: 'Current React Chromium acceptance covers dashboard/report/marketing routes, roles, error/data states and export behavior using synthetic HTTP.',
        observed: 'The serialized Chromium suite passed 123/123 with all eight FE021 task cases; one additional report-explanation case is shared by FE015. Tests cover chart/table consistency, hidden finance fields, empty payloads, safe export, pagination, invalid timezone, permission denial, stale 412 and unknown export outcome. This does not establish CI, live API/provider, staging or user acceptance.',
        support: ['unit', 'domain', 'schemas'],
    },
];

for (const check of steps) {
    const command = commandFor(check.commandId);
    const logBytes = bytes[check.log];
    const evidence = {
        taskId: 'FE021', stepId: check.stepId, kind: 'test_run', result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
        sourceRevision: `HEAD ${revision} plus current dirty working tree; dashboard/report source files and current handoff are hashed below.`,
        expected: check.expected, observed: check.observed,
        command: command.command, commandId: command.id, cwd: repoRoot,
        reviewer: 'Codex self-review; no independent peer review',
        environment: { name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium`, details: 'React frontend acceptance against local synthetic MSW; no live services.', dataSource: check.dataSource },
        checksTotal: check.checksTotal, failed: 0, exitCode: 0,
        logFile: logs[check.log].slice('botsales-kit/'.length), logSha256: digest(logBytes),
        sourceFiles, sourceSnapshotSha256,
        supportingLogs: supporting(check.support),
    };
    fs.writeFileSync(path.join(directory, `${check.stepId}-priority-refresh-20261001.json`), `${JSON.stringify(evidence, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify({ taskId: 'FE021', refreshedSteps: steps.map(step => step.stepId), totalE2e, fe021Cases, sourceFiles: sourceFiles.length, sourceSnapshotSha256 })}\n`);
