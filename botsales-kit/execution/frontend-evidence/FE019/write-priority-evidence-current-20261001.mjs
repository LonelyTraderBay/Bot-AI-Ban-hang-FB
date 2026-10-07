import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(evidenceDirectory, '../../../..', 'botsales-kit');
const repoRoot = path.resolve(kitRoot, '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const hashFile = relative => hash(fs.readFileSync(path.join(repoRoot, relative)));
const relativeToKit = relative => relative.slice('botsales-kit/'.length);
const commandMap = JSON.parse(fs.readFileSync(path.join(kitRoot, 'execution/frontend-command-map.json'), 'utf8'));
const commands = new Map(commandMap.commands.map(command => [command.id, command]));
const registeredCommand = id => {
    const command = commands.get(id);
    if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command is not verified: ${id}`);
    return command.command;
};

const logs = {
    e2e: 'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log',
    unit: 'botsales-kit/execution/frontend-evidence/FE007/unit-rerun-current-20261001.log',
    domain: 'botsales-kit/execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log',
    schemas: 'botsales-kit/execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log',
    generate: 'botsales-kit/execution/frontend-evidence/FE009/S05-generate-rerun-current-20261001.log',
    typecheck: 'botsales-kit/execution/frontend-evidence/FE009/S05-typecheck-rerun-current-20261001.log',
    lint: 'botsales-kit/execution/frontend-evidence/FE009/S05-lint-rerun-current-20261001.log',
    source: 'botsales-kit/execution/frontend-evidence/FE009/source-rerun-current-20261001.log',
    boundaries: 'botsales-kit/execution/frontend-evidence/FE009/boundaries-rerun-current-20261001.log',
    productionBuild: 'botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
    demoBuild: 'botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
    bundleScan: 'botsales-kit/execution/frontend-evidence/FE019/S04-production-bundle-secret-scan-20261001.log',
};

const sourcePaths = [
    'apps/web/package.json',
    'apps/web/public/app-icon.svg',
    'apps/web/public/manifest.webmanifest',
    'apps/web/src/main.tsx',
    'apps/web/src/mocks/auxiliary.ts',
    'apps/web/src/mocks/browser.ts',
    'apps/web/src/mocks/handlers.ts',
    'apps/web/src/mocks/seed.json',
    'apps/web/src/mocks/service.ts',
    'apps/web/src/modules/integrations/index.tsx',
    'apps/web/src/modules/notifications/index.tsx',
    'apps/web/src/modules/notifications/push-capabilities.ts',
    'apps/web/src/shared/api/client.ts',
    'apps/web/src/shared/api/hooks.ts',
    'apps/web/src/shared/model/labels.ts',
    'apps/web/tests/push-capabilities.test.ts',
    'apps/web/tests/setup.ts',
    'apps/web/vite.config.ts',
    'apps/web/tsconfig.json',
    'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-plan.json',
    'botsales-kit/execution/frontend-evidence/FE019/handoff.md',
    'botsales-kit/execution/frontend-evidence/FE019/write-priority-evidence-current-20261001.mjs',
    'packages/contracts/src/generated.ts',
    'packages/contracts/src/index.ts',
    'packages/contracts/src/operations.json',
    'packages/contracts/src/permissions.json',
    'packages/contracts/src/routes.json',
    'packages/contracts/src/schemas.json',
    'playwright.config.ts',
    'tests/fe019.spec.ts',
    'tests/session/demo-server.mjs',
].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: hashFile(file) }));
const sourceSnapshotSha256 = hash(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));

const e2eLog = fs.readFileSync(path.join(repoRoot, logs.e2e), 'utf8');
const e2eChecksTotal = Number(e2eLog.match(/(\d+) passed\b/)?.[1]);
const fe019Cases = (e2eLog.match(/tests\\fe019\.spec\.ts:/g) ?? []).length;
if (e2eChecksTotal !== 123 || fe019Cases !== 7) {
    throw new Error(`Unexpected current Chromium evidence: ${e2eChecksTotal} total, ${fe019Cases} FE019 cases.`);
}
for (const [key, phrase] of [
    ['unit', '66 passed'],
    ['domain', '"passed":88'],
    ['schemas', '"checks": 356'],
    ['generate', '"outputs":11'],
    ['source', '"status": "PASS"'],
    ['boundaries', '"issues": []'],
    ['bundleScan', 'contains no demo-fe019-synthetic-credential'],
]) {
    if (!fs.readFileSync(path.join(repoRoot, logs[key]), 'utf8').includes(phrase)) {
        throw new Error(`Expected current passing result not found in ${logs[key]}`);
    }
}

const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const expectations = {
    S01: {
        expected: 'R29/R30/R39/R40, their canonical operations and permissions, credential/policy/device schemas, and current React source map without adding contract fields or endpoints.',
        observed: 'The current full Chromium run passed 123/123, including the FE019 route/source-map case. It maps all four routes and actions to OpenAPI/permission catalog and verifies write-only credentials, policy bounds, device status, mock-only integration behavior and push guards.',
    },
    S02: {
        expected: 'The React demo supports synthetic integration configuration, notification policy/history, device registration and Telegram pairing using canonical request/response DTOs.',
        observed: 'All seven FE019 browser cases passed. Credential writes return no secret and clear the form; device and pairing payloads stay synthetic; policy values are sent through the canonical operation and rendered from mock responses; order links preserve shop scope.',
    },
    S03: {
        expected: 'Denied consent, unsupported browser capability, invalid credentials, failed OAuth/reconnect and missing active Telegram device never produce false connected/delivered state.',
        observed: 'FE019 browser tests passed with OAuth/reconnect returning MOCK_ONLY and unchanged channel data, zero external host requests, no OS permission prompt in demo, pending/revoked device states, and Telegram disabled without an active device. Unit tests reject denied/default Push permission.',
    },
    S04: {
        expected: 'Current FE019 browser behavior and the related unit, mock-domain/schema, generation, source, type, lint, boundary and build gates pass on the hashed working-tree source.',
        observed: 'Chromium 123/123 (seven FE019 cases), Vitest 66/66, domain/MSW 88/88, schema 356/356, generate 11 outputs/283 schemas/210 operations/54 routes, source 58 files/224 operation references/54 routes, boundaries 402 imports/0 issues/8 negative fixtures, typecheck/lint and production/demo builds all passed. The synthetic test credential is absent from all 30 assets in the current production bundle; the bundle-size warning remains.',
    },
    S05: {
        expected: 'All FE019 routes and mock acceptance execute in the React Chromium demo with accessible labels, responsive device UI and no live-provider dependency.',
        observed: 'The full current Chromium suite passed 123/123, including all seven FE019 browser scenarios. The 375px device screen does not overflow; manifest/icon load; mock traffic stays local. No backend, provider, CI, UAT or staging result is claimed.',
    },
};

const supportConfiguration = [
    ['unit', 'unit', 66],
    ['domain', 'domain', 88],
    ['schemas', 'schemas', 356],
    ['generate-check-windows', 'generate', 11],
    ['types', 'typecheck', 1],
    ['lint', 'lint', 1],
    ['source', 'source', 3],
    ['boundaries', 'boundaries', 8],
    ['build', 'productionBuild', 1],
    ['build-demo', 'demoBuild', 1],
];

function supplementary(commandId, logKey, checksTotal) {
    return {
        commandId,
        command: registeredCommand(commandId),
        logFile: relativeToKit(logs[logKey]),
        logSha256: hashFile(logs[logKey]),
        checksTotal,
        failed: 0,
        exitCode: 0,
        sourceFiles,
        sourceSnapshotSha256,
    };
}

const executedAt = fs.statSync(path.join(repoRoot, logs.e2e)).mtime.toISOString();
for (const stepId of ['S01', 'S02', 'S03', 'S04', 'S05']) {
    const checksByStep = { S01: 1, S02: 7, S03: 7, S04: 7, S05: 7 };
    const evidence = {
        taskId: 'FE019',
        stepId,
        kind: 'test_run',
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt,
        sourceRevision: `HEAD ${revision} plus current dirty working tree; FE019 source, contract, tests and handoff are hashed below.`,
        expected: expectations[stepId].expected,
        observed: expectations[stepId].observed,
        command: registeredCommand('e2e'),
        commandId: 'e2e',
        cwd: repoRoot,
        reviewer: 'Codex self-review; no independent peer review',
        environment: {
            name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium Playwright',
            details: 'React demo with synthetic MSW data; browser requests and provider interactions are mock-only.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: checksByStep[stepId],
        failed: 0,
        exitCode: 0,
        logFile: relativeToKit(logs.e2e),
        logSha256: hashFile(logs.e2e),
        sourceFiles,
        sourceSnapshotSha256,
        ...(stepId === 'S04' || stepId === 'S05'
            ? {
                supplementaryEvidence: supportConfiguration.map(([id, key, count]) => supplementary(id, key, count)),
                supportingLogs: [...supportConfiguration.map(([, key]) => ({ file: relativeToKit(logs[key]), sha256: hashFile(logs[key]) })), { file: relativeToKit(logs.bundleScan), sha256: hashFile(logs.bundleScan) }],
            }
            : {}),
    };
    fs.writeFileSync(path.join(evidenceDirectory, `${stepId}-priority-refresh-20261001.json`), `${JSON.stringify(evidence, null, 2)}\n`);
}

process.stdout.write(`${JSON.stringify({ taskId: 'FE019', steps: 5, e2eChecksTotal, fe019Cases, sourceFiles: sourceFiles.length, sourceSnapshotSha256 })}\n`);
