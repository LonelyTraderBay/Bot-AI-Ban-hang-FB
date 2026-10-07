import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDirectory = path.join(kit, 'execution/frontend-evidence/FE011');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const hashFile = relative => hash(fs.readFileSync(path.join(repo, relative)));
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const commands = new Map(commandMap.commands.map(entry => [entry.id, entry]));

const logs = {
    sourceMap: 'execution/frontend-evidence/FE011/S01-source-map-rerun-current-20261001.log',
    source: 'execution/frontend-evidence/FE009/source-rerun-current-20261001.log',
    e2e: 'execution/frontend-evidence/FE003/S03-e2e-current-20261001.log',
    unit: 'execution/frontend-evidence/FE007/unit-rerun-current-20261001.log',
    domain: 'execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log',
    schemas: 'execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log',
    generate: 'execution/frontend-evidence/FE009/S05-generate-rerun-current-20261001.log',
    typecheck: 'execution/frontend-evidence/FE009/S05-typecheck-rerun-current-20261001.log',
    lint: 'execution/frontend-evidence/FE009/S05-lint-rerun-current-20261001.log',
    boundaries: 'execution/frontend-evidence/FE009/boundaries-rerun-current-20261001.log',
    productionBuild: 'execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
    demoBuild: 'execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
};

const currentLogs = Object.fromEntries(Object.entries(logs).map(([key, file]) => [key, fs.readFileSync(path.join(kit, file), 'utf8')]));
const e2eTotal = Number(currentLogs.e2e.match(/\n\s*(\d+) passed \(/)?.[1]);
const unitTotal = Number(currentLogs.unit.match(/Tests\s+(\d+) passed/)?.[1]);
const domainSummary = JSON.parse(currentLogs.domain.split(/\r?\n/).find(line => line.startsWith('{"status"')) ?? '{}');
const schemaSummary = JSON.parse(currentLogs.schemas.match(/\{.*"checkedAt".*\}/)?.[0] ?? '{}');
const sourceSummary = JSON.parse(currentLogs.source.match(/\{[\s\S]*?\n\}/)?.[0] ?? '{}');
const boundarySummary = JSON.parse(currentLogs.boundaries.match(/\{[\s\S]*?\n\}/)?.[0] ?? '{}');
if (e2eTotal !== 123 || unitTotal !== 66 || domainSummary.passed !== 88 || schemaSummary.checks !== 356 || sourceSummary.files !== 58 || sourceSummary.operationCalls !== 224 || boundarySummary.imports !== 402 || !currentLogs.sourceMap.includes('"checks": 17') || !currentLogs.sourceMap.includes('EXIT_CODE=0')) {
    throw new Error(`Current FE011 evidence differs: e2e=${e2eTotal}; unit=${unitTotal}; domain=${domainSummary.passed}; schema=${schemaSummary.checks}; source=${sourceSummary.files}/${sourceSummary.operationCalls}; boundaries=${boundarySummary.imports}`);
}
for (const key of ['source','generate','typecheck','lint','boundaries','productionBuild','demoBuild']) {
    if (!currentLogs[key].includes('EXIT_CODE=0')) throw new Error(`Current ${key} command lacks an exit-code 0 marker.`);
}
if (!currentLogs.generate.includes('"status":"PASS"') || !currentLogs.productionBuild.includes('✓ built in') || !currentLogs.demoBuild.includes('✓ built in') || !currentLogs.boundaries.includes('PASS 8/8')) {
    throw new Error('A current generator, build, or boundary result is not passing.');
}

const coreSources = [
    'apps/web/package.json',
    'apps/web/src/app/Shell.tsx',
    'apps/web/src/app/bootstrap.css',
    'apps/web/src/modules/inventory/index.tsx',
    'apps/web/src/shared/api/client.ts',
    'apps/web/src/shared/api/hooks.ts',
    'apps/web/src/shared/model/filters.ts',
    'apps/web/src/shared/model/format.ts',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/src/shared/ui/theme.ts',
    'apps/web/src/mocks/catalog.ts',
    'apps/web/src/mocks/handlers.ts',
    'apps/web/src/mocks/service.ts',
    'apps/web/src/mocks/database.ts',
    'apps/web/src/mocks/seed.json',
    'apps/web/src/mocks/collections.json',
    'tests/fe011.spec.ts',
    'tests/fe011-source-map.test.mjs',
    'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/design/tokens.json',
    'packages/contracts/src/operations.json',
    'packages/contracts/src/schemas.json',
    'botsales-kit/execution/frontend-evidence/FE011/S01-route-operation-map.md',
];

const configurations = {
    S01: {
        commandId: 'fe011-source-map',
        log: 'sourceMap',
        checks: 17,
        dataSource: 'source-only',
        expected: 'R15/R16, operation IDs, read/action/cost/link permission boundaries, DTOs, and 202 command semantics map to canonical contracts and current React source.',
        observed: 'The current FE011 source-map test passed with 17 contract/source checks: R15/R16 paths and permissions, stock snapshot/movement/adjustment/getShop operations, request/response DTOs, command headers/status, and permission-gated links. Current Shell.tsx is included in the source snapshot.',
        sources: [...coreSources, 'botsales-kit/execution/frontend-evidence/FE011/S01-route-operation-map.md'],
    },
    S02: {
        commandId: 'e2e',
        log: 'e2e',
        checks: 8,
        dataSource: 'synthetic-msw',
        expected: 'Stock snapshots, adjustment, filters, and movement history use typed operations and show the resulting synthetic API state.',
        observed: 'The current full React Chromium suite passed 123/123, including all eight FE011 cases. Snapshot totals come from the API; a confirmed adjustment emits one command and one movement record; movement filters are URL-backed and source links are permission-gated.',
        sources: coreSources,
    },
    S03: {
        commandId: 'e2e',
        log: 'e2e',
        checks: 8,
        dataSource: 'synthetic-msw',
        expected: 'Conflict, insufficient stock, forbidden action, unknown command, and foreign-shop cases retain drafts or block duplicate requests without optimistic stock changes or false success.',
        observed: 'All eight FE011 browser cases passed inside the current 123/123 Chromium run. The assertions cover 412, insufficient stock, forbidden permissions, pending/unknown command recovery, duplicate prevention, and unknown-shop isolation; no stock decrement is applied optimistically.',
        sources: coreSources,
    },
    S04: {
        commandId: 'e2e',
        log: 'e2e',
        checks: 8,
        dataSource: 'synthetic-msw',
        expected: 'Behavioral browser/network checks inspect adjustment payload, expected version, CSRF/idempotency headers, command completion, movement history, permission errors, shop scope, responsive layout, axe, and keyboard focus.',
        observed: 'The full current suite passed 123/123 and includes eight FE011 network/browser scenarios covering the operation/body/headers and resulting inventory state, all negative paths, responsive widths 320/390/768/1440, focused axe checks, and dialog focus restoration. Supporting current domain/MSW checks passed 88, schemas 356/356, and unit tests 66/66.',
        sources: coreSources,
    },
    S05: {
        commandId: 'e2e',
        log: 'e2e',
        checks: 8,
        dataSource: 'synthetic-msw',
        expected: 'All FE011 browser acceptance cases pass on the real React demo, with current source, type, lint, boundary, mock/schema, generated-contract, and build gates linked.',
        observed: 'Chromium passed 123/123 overall and all eight FE011 cases. Current unit 66/66, domain/MSW 88, schema 356/356, source map 58/224/54, generate 11/283/210/54, typecheck, lint, boundaries 402 imports with 8/8 negative fixtures, and production/demo builds passed locally. Build output retains the >500 kB chunk warning. Only synthetic API behavior is claimed.',
        sources: [...coreSources, 'botsales-kit/execution/frontend-evidence/FE011/handoff.md'],
    },
};

function getCommand(id) {
    const entry = commands.get(id);
    if (!entry || entry.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command is not verified: ${id}`);
    return entry.command;
}

function snapshotFiles(files) {
    return [...new Set(files)]
        .sort()
        .map(file => ({ path: file, sha256: hashFile(file) }));
}

function snapshotHash(files) {
    return hash(Buffer.from(files.map(file => `${file.path}:${file.sha256}`).join('\n')));
}

function supplementary(commandId, logKey, checks) {
    const logFile = logs[logKey];
    const sourceFiles = snapshotFiles([
        ...coreSources,
        'package.json',
        'apps/web/tsconfig.json',
        'playwright.config.ts',
        'scripts/check-source.mjs',
        'scripts/check-boundaries.mjs',
        'scripts/generate.mjs',
        'scripts/test-domain.mjs',
        'scripts/validate-mock-schemas.py',
        'tests/architecture/check-boundaries.mjs',
        'botsales-kit/execution/frontend-command-map.json',
        'botsales-kit/execution/frontend-plan.json',
    ]);
    return {
        commandId,
        command: getCommand(commandId),
        logFile,
        logSha256: hashFile(`botsales-kit/${logFile}`),
        checksTotal: checks,
        failed: 0,
        exitCode: 0,
        sourceFiles,
        sourceSnapshotSha256: snapshotHash(sourceFiles),
    };
}

const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim();

for (const [stepId, config] of Object.entries(configurations)) {
    const logFile = logs[config.log];
    const sourceFiles = snapshotFiles([
        ...config.sources,
        'botsales-kit/execution/frontend-command-map.json',
        'botsales-kit/execution/frontend-plan.json',
        'botsales-kit/execution/frontend-evidence/FE011/write-test-evidence-final.mjs',
    ]);
    const evidence = {
        taskId: 'FE011',
        stepId,
        kind: 'test_run',
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt: new Date().toISOString(),
        sourceRevision: `HEAD ${revision} plus current dirty working tree; FE011 source, shell, contracts and fixtures are hash-recorded`,
        expected: config.expected,
        observed: config.observed,
        command: getCommand(config.commandId),
        commandId: config.commandId,
        cwd: repo,
        reviewer: 'Codex self-review; no independent peer review',
        environment: {
            name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`,
            details: 'React demo, browser, shops, inventory state and API responses use synthetic fixtures; no live backend.',
            dataSource: config.dataSource,
        },
        checksTotal: config.checks,
        failed: 0,
        exitCode: 0,
        logFile,
        logSha256: hashFile(`botsales-kit/${logFile}`),
        sourceFiles,
        sourceSnapshotSha256: snapshotHash(sourceFiles),
    };

    if (stepId === 'S04') {
        evidence.supplementaryEvidence = [
            supplementary('domain', 'domain', 88),
            supplementary('schemas', 'schemas', 356),
            supplementary('unit', 'unit', 66),
        ];
    }
    if (stepId === 'S05') {
        evidence.supplementaryEvidence = [
            supplementary('unit', 'unit', 66),
            supplementary('domain', 'domain', 88),
            supplementary('schemas', 'schemas', 356),
            supplementary('generate-check-windows', 'generate', 11),
            supplementary('types', 'typecheck', 1),
            supplementary('lint', 'lint', 1),
            supplementary('source', 'source', 3),
            supplementary('boundaries', 'boundaries', 8),
            supplementary('build', 'productionBuild', 1),
            supplementary('build-demo', 'demoBuild', 1),
        ];
    }

    const output = path.join(evidenceDirectory, `${stepId}-priority-refresh-20261001.json`);
    fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ stepId, commandId: config.commandId, checks: config.checks, sources: sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 })}\n`);
}
