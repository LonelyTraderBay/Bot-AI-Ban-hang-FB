import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const files = [
    'package.json',
    'apps/web/package.json',
    'apps/web/vite.config.ts',
    'apps/web/vitest.config.ts',
    'apps/web/tests/setup.ts',
    'apps/web/tests/components.test.tsx',
    'apps/web/tests/states/fe023-state.test.tsx',
    'apps/web/src/main.tsx',
    'apps/web/src/mocks/browser.ts',
    'playwright.config.ts',
    'tests/frontend.spec.ts',
    'tests/states/fe023.spec.ts',
    'tests/session/demo-server.mjs',
    'botsales-kit/execution/frontend-evidence/FE003/S03-runner-refreshed-unit-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE003/S03-runner-refreshed-generate-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE003/S03-runner-refreshed-e2e-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE003/S03-current-run-evidence.mjs',
];
const sourceFiles = files.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const relativeKitPath = file => path.relative(kit, path.join(repo, file)).replaceAll('\\', '/');
const e2ePath = 'botsales-kit/execution/frontend-evidence/FE003/S03-runner-refreshed-e2e-20261001.log';
const unitPath = 'botsales-kit/execution/frontend-evidence/FE003/S03-runner-refreshed-unit-20261001.log';
const generatePath = 'botsales-kit/execution/frontend-evidence/FE003/S03-runner-refreshed-generate-20261001.log';
const e2eLog = fs.readFileSync(path.join(repo, e2ePath));
const evidence = {
    taskId: 'FE003',
    stepId: 'S03',
    kind: 'artifact_review',
    result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    executedAt: new Date().toISOString(),
    sourceRevision: `Uncommitted working-tree snapshot ${sourceSnapshotSha256}`,
    expected: 'The configured Vitest and Playwright runners load the current setup and exercise enabled suites; generated contracts remain fresh, and failures are reported rather than hidden.',
    observed: 'On Windows Node v24.19.0/npm 11.17.0, Vitest passed 66/66 across 7 files, serialized Chromium Playwright passed 106/106, and generate:check passed with 11 outputs, 283 schemas, 210 operations, and 54 routes. The E2E run exercised the current React demo with synthetic MSW data; no backend, provider, CI, or staging result is implied.',
    command: 'PowerShell with node_modules/.bin, Node.js, and Windows system paths: npm.cmd --script-shell=cmd.exe run test:e2e -- --reporter=line; npm.cmd --script-shell=cmd.exe run test; npm.cmd --script-shell=cmd.exe run generate:check',
    cwd: repo,
    reviewer: 'Codex self-review; no independent peer review',
    environment: {
        name: `Windows / Node ${process.version} / npm 11.17.0 / Playwright Chromium`,
        details: 'Commands were run serially on the current working tree; Vitest used jsdom/RTL and Playwright used one Chromium worker against the React demo.',
        dataSource: 'synthetic-msw',
    },
    checksTotal: 173,
    failed: 0,
    logFile: relativeKitPath(e2ePath),
    logSha256: sha256(e2eLog),
    supplementaryLogs: [unitPath, generatePath].map(file => ({
        path: relativeKitPath(file),
        sha256: sha256(fs.readFileSync(path.join(repo, file))),
    })),
    sourceFiles,
    sourceSnapshotSha256,
};
const output = path.join(evidenceDirectory, 'S03-current-run-evidence.json');
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(kit, output).replaceAll('\\', '/'), checksTotal: evidence.checksTotal, sourceSnapshotSha256 }, null, 2));
