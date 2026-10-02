import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE008');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = file => sha256(fs.readFileSync(path.join(repo, file)));
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = id => {
  const item = commandMap.commands.find(candidate => candidate.id === id);
  if (!item || item.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${id} is not registered as VERIFIED_AVAILABLE`);
  return item.command;
};
const revisionResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' });
if (revisionResult.status !== 0) throw new Error('Cannot resolve current Git HEAD');
const revision = revisionResult.stdout.trim();
const walk = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(folder, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const toRepoRelative = file => path.relative(repo, file).replaceAll('\\', '/');

const currentFiles = [
  'apps/web/src/mocks/seed.json',
  'apps/web/src/mocks/collections.json',
  'apps/web/src/mocks/database.ts',
  'apps/web/src/mocks/service.ts',
  'apps/web/src/mocks/handlers.ts',
  'apps/web/src/mocks/catalog.ts',
  'apps/web/src/mocks/fulfillment.ts',
  'apps/web/src/mocks/browser.ts',
  'apps/web/vite.config.ts',
  'apps/web/package.json',
  'apps/web/src/main.tsx',
  'apps/web/src/app/Shell.tsx',
  'tests/domain-scenarios.cjs',
  'tests/fixtures/mock-network.mjs',
  'tests/frontend.spec.ts',
  'tests/fe009.spec.ts',
  'tests/fe010.spec.ts',
  'tests/fe012.spec.ts',
  'tests/states/fe023.spec.ts',
  'tests/vertical-slices/fe022-flows.spec.ts',
  'scripts/test-domain.mjs',
  'scripts/validate-mock-schemas.py',
  'samples/MOCK_DATA.md',
  'package.json',
  'package-lock.json',
  'packages/contracts/src/operations.json',
  'packages/contracts/src/schemas.json',
  'packages/contracts/src/permissions.json',
  'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/contracts/events.schema.json',
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE008/handoff.md',
  'botsales-kit/execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/priority-evidence-20261001.mjs',
  'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log',
  'evidence/domain-tests.json',
];
const stepConfigs = {
  S01: {
    commandId: 'domain', log: 'domain-priority-rerun-current-20261001.log', checksTotal: 88,
    expected: 'Deterministic synthetic data and simulator scenarios cover the canonical routes, two shops, real permission presets, and valid relationships, money and state transitions.',
    observed: 'Fresh test:domain passed 88/88 checks (75 simulator, 13 MSW HTTP/SSE), reported 210 operation handlers and 89 operation cases. The current seed and MOCK_DATA handoff describe two isolated shops and seven canonical role presets; network tests exercise cross-shop reads, role denial and reproducible reset/clock/sequence. Schema-captured data is separately checked in S04.',
    additions: [],
  },
  S02: {
    commandId: 'domain', log: 'domain-priority-rerun-current-20261001.log', checksTotal: 88,
    expected: 'MSW HTTP handlers and mock service follow canonical operation IDs, cursor/filter/version/allowedActions and asynchronous command lifecycle through the same frontend transport.',
    observed: 'Fresh test:domain passed 88/88 with 210 registered MSW handlers. Current source snapshots include canonical operation metadata, the shared API client, MSW handlers, Vite demo-only activation and Shell transport selection. Network cases exercise cursor pagination, invalid cursor 422, version 428/412, idempotency and unknown-command 202 lifecycle; live mode has no mock fallback.',
    additions: ['apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/errors.ts'],
  },
  S03: {
    commandId: 'domain', log: 'domain-priority-rerun-current-20261001.log', checksTotal: 88,
    expected: 'Named happy/unhappy synthetic scenarios cover data volume, empty/partial, permission denial, stale/422/unknown, delayed/aborted requests and shop-isolated SSE without external calls.',
    observed: 'Fresh test:domain passed 88/88 across simulator and network scenarios. Current tests exercise 133-product pagination, empty and delayed/aborted reads, 403/404/412/422/428 outcomes, idempotent unknown 202, and authorized shop-only SSE; the current 106-case Chromium suite separately passed user-visible failure/retry and route behavior. All records are synthetic; no provider/backend was contacted.',
    additions: ['evidence/REPORT.md'],
  },
  S04: {
    commandId: 'schemas', log: 'schema-priority-rerun-current-20261001.log', checksTotal: 356,
    expected: 'Captured simulator requests, responses and collection rows validate against canonical JSON schemas; invalid fixtures are reported as failures.',
    observed: 'Fresh Python 3.12.10 validator with isolated jsonschema 4.26.0 passed 356/356 checks against the current evidence/domain-tests.json transcript/database and canonical schemas, with zero schema errors. This checks captured synthetic records only; it does not exercise React, a live HTTP server, or backend behavior.',
    additions: ['evidence/domain-tests.json', 'evidence/mock-schema-check.json', 'packages/contracts/src/schemas.json', 'botsales-kit/scripts/requirements-validation.txt'],
  },
  S05: {
    commandId: 'domain', log: 'domain-priority-rerun-current-20261001.log', checksTotal: 10,
    expected: 'Reset, shop isolation and demo/test-only activation are repeatable; production artifacts exclude mock runtime while demo artifacts include it and disclose synthetic data.',
    observed: 'Fresh reset/isolation domain checks passed 88/88 and the current serialized Chromium suite passed 123/123, including all 54 canonical routes, shop switching, denial, logout/recovery and live-mode-unavailable. Production and demo builds exited 0; the post-build artifact audit passed 9/9: production has no mock worker/MSW browser runtime (one unregister-cleanup reference), while demo emits mockServiceWorker.js, includes MSW runtime and labels synthetic data. Production largest chunk is 730.13 kB raw (184.23 KiB gzip), demo largest 733.16 kB raw (185.19 KiB gzip); Vite warns above 500 kB. This local frontend/mock evidence does not establish deployment or service readiness.',
    additions: [
      'botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-priority-20261001.mjs',
      'botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-rerun-current-20261001.log',
      'botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
      'botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
      'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log',
    ],
  },
};

const readText = file => fs.readFileSync(path.join(repo, file), 'utf8');
const verificationInputs = [
  ['domain suite', 'botsales-kit/execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log', text => text.includes('"status":"PASS"') && text.includes('"passed":88') && text.includes('EXIT_CODE=0')],
  ['schema validation', 'botsales-kit/execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log', text => text.includes('"status": "PASS"') && text.includes('"checks": 356') && text.includes('EXIT_CODE=0')],
  ['current Chromium suite', 'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log', text => text.includes('123 passed (')],
  ['production build', 'botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log', text => text.includes('✓ built in') && text.includes('EXIT_CODE=0')],
  ['demo build', 'botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log', text => text.includes('✓ built in') && text.includes('EXIT_CODE=0')],
  ['artifact isolation', 'botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-rerun-current-20261001.log', text => text.includes('"status": "PASS"') && (text.match(/"result": "PASS"/g) ?? []).length === 9 && text.includes('EXIT_CODE=0')],
];
for (const [label, file, isPassing] of verificationInputs) {
  if (!isPassing(readText(file))) throw new Error(`${label} is not a passing current log: ${file}`);
}

const output = [];
for (const [stepId, config] of Object.entries(stepConfigs)) {
  const sourcePaths = new Set([...currentFiles, ...config.additions]);
  if (stepId === 'S04') sourcePaths.add('botsales-kit/execution/frontend-evidence/FE008/schema-priority-current-20261001.log');
  if (stepId === 'S05') {
    sourcePaths.add('botsales-kit/execution/frontend-evidence/FE008/S05-production-build-priority-20261001.log');
    sourcePaths.add('botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-priority-20261001.log');
    const production = walk(path.join(repo, 'apps/web/dist'));
    const demo = walk(path.join(repo, 'apps/web/dist-demo'));
    for (const artifact of [...production, ...demo]) sourcePaths.add(toRepoRelative(artifact));
  }
  const sourceFiles = [...sourcePaths].sort().map(file => ({ path: file, sha256: hashFile(file) }));
  const logFile = `execution/frontend-evidence/FE008/${config.log}`;
  const evidence = {
    taskId: 'FE008', stepId, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${revision} plus dirty working tree; source and artifact hashes below identify the checked snapshot`,
    expected: config.expected, observed: config.observed,
    command: command(config.commandId), commandId: config.commandId, cwd: repo,
    reviewer: 'Codex self-review; no independent peer review',
    environment: {
      name: 'Windows / Node v24.19.0 / npm 11.17.0 / Python 3.12.10 / Chromium Playwright',
      details: 'Root frontend workspace with deterministic two-shop mock data. S04 uses the isolated TEMP jsonschema target via PYTHONPATH; S05 builds are local bundles only. No backend/provider connection.',
      dataSource: 'synthetic-msw',
    },
    checksTotal: config.checksTotal, failed: 0, logFile,
    logSha256: hashFile(`botsales-kit/${logFile}`), sourceFiles,
    sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
  };
  if (stepId === 'S04') evidence.supplementaryEvidence = [{
    command: command('domain'), commandId: 'domain', logFile: 'execution/frontend-evidence/FE008/domain-priority-current-20261001.log',
    logSha256: hashFile('botsales-kit/execution/frontend-evidence/FE008/domain-priority-current-20261001.log'),
    checksTotal: 88, failed: 0,
  }];
  if (stepId === 'S05') evidence.supplementaryEvidence = [
    { command: command('e2e'), commandId: 'e2e', logFile: 'execution/frontend-evidence/FE003/S03-e2e-current-20261001.log', logSha256: hashFile('botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log'), checksTotal: 123, failed: 0 },
    { command: command('build'), commandId: 'build', logFile: 'execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log', logSha256: hashFile('botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log'), checksTotal: 1, failed: 0 },
    { command: command('build-demo'), commandId: 'build-demo', logFile: 'execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log', logSha256: hashFile('botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log'), checksTotal: 1, failed: 0 },
    { command: 'node botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-priority-20261001.mjs', logFile: 'execution/frontend-evidence/FE008/S05-artifact-isolation-rerun-current-20261001.log', logSha256: hashFile('botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-rerun-current-20261001.log'), checksTotal: 9, failed: 0 },
  ];
  const file = path.join(dir, `${stepId}-priority-refresh-20261001.json`);
  fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
  output.push({ stepId, commandId: config.commandId, sourceFiles: sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256, logFile });
}
console.log(JSON.stringify(output, null, 2));
