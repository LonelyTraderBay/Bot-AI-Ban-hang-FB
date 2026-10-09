import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE009');
const plan = JSON.parse(fs.readFileSync(path.join(kitRoot, 'execution/frontend-plan.json'), 'utf8'));
const commandMap = JSON.parse(fs.readFileSync(path.join(kitRoot, 'execution/frontend-command-map.json'), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = (root, relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = plan.tasks.find(item => item.id === 'FE009');
assert(task?.implementationSteps?.length === 5, 'Canonical FE009 S01-S05 plan not found');

const logs = {
  e2e: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
  domain: 'execution/frontend-evidence/FE009/S02-domain-current-20261007.log',
  unit: 'execution/frontend-evidence/FE009/S04-unit-passed-current-20261007.log',
};
const e2eText = read(kitRoot, logs.e2e);
const domainText = read(kitRoot, logs.domain);
const unitText = read(kitRoot, logs.unit);
assert(e2eText.includes('512 passed (49.9m)'), 'Current full browser log does not show 512 passing tests');
assert(e2eText.includes('job detail follows an export created in the current synthetic shop and can refetch it'), 'Current browser log is missing the new FE009 job flow');
assert(e2eText.includes('[chromium]') && e2eText.includes('[firefox]'), 'Current browser log does not show both browser projects');
assert(domainText.includes('"status":"PASS"') && domainText.includes('"passed":88'), 'Current domain/network log does not show all 88 passing checks');
assert(unitText.includes('Tests  138 passed (138)'), 'Current unit log does not show all 138 passing tests');

const frontendSources = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/KNOWN_GAPS.md', 'package.json', 'package-lock.json',
  'playwright.config.ts', 'apps/web/vite.config.ts', 'apps/web/vitest.config.ts',
  'apps/web/src/app/router.tsx', 'apps/web/src/app/SessionProvider.tsx', 'apps/web/src/app/Shell.tsx',
  'apps/web/src/modules/workspace/index.tsx', 'apps/web/src/modules/customers/index.tsx', 'apps/web/src/modules/reports/index.tsx',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/api/validation.ts',
  'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/model/scope.tsx',
  'apps/web/src/mocks/browser.ts', 'apps/web/src/mocks/handlers.ts', 'apps/web/src/mocks/database.ts',
  'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/seed.json',
  'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json',
  'scripts/run-e2e.mjs', 'scripts/test-domain.mjs',
  'tests/fe009.spec.ts', 'tests/route-role-matrix.spec.ts', 'tests/states/route-error-composition.spec.ts',
  'tests/ui028-w30-stress.spec.ts',
];
const kitSources = [
  'AGENTS.md', 'docs/02_ARCHITECTURE.md', 'docs/06_API_AND_REALTIME.md', 'docs/08_SECURITY_TENANCY_RBAC.md',
  'docs/18_CODING_STANDARDS.md', 'contracts/route-manifest.json', 'contracts/openapi.json',
  'contracts/permission-catalog.json', 'contracts/feature-catalog.json', 'execution/frontend-plan.json',
  'execution/frontend-command-map.json',
];
const sourceFiles = [
  ...frontendSources.map(relative => ({ path: relative, bytes: fs.readFileSync(path.join(frontendRoot, relative)) })),
  ...kitSources.map(relative => ({ path: `botsales-kit/${relative}`, bytes: fs.readFileSync(path.join(kitRoot, relative)) })),
].map(item => ({ path: item.path, sha256: sha(item.bytes) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const now = new Date().toISOString();
const frontendCwd = frontendRoot;
const commands = Object.fromEntries(['e2e', 'domain', 'unit'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is not verified available`);
  return [id, command];
}));
const logHashes = Object.fromEntries(Object.entries(logs).map(([id, relative]) => [id, sha(fs.readFileSync(path.join(kitRoot, relative)))]));

const descriptions = {
  S02: {
    expected: task.implementationSteps.find(step => step.id === 'S02').verification,
    observed: 'The current Chromium+Firefox run passed 512/512 full frontend E2E cases, including 20/20 FE009 browser executions. FE009 exercises workspace creation and scoped membership, customer form validation/create/detail/search and stale-version edit recovery, export creation followed by the returned job detail/refetch, related case/order/shipment flow, and privacy request state. The current synthetic simulator/network suite passed 88/88. Assertions inspect actual mock HTTP payloads and UI state; no live backend behavior is claimed.',
    checksTotal: 600,
    main: 'e2e',
    additional: ['domain'],
  },
  S03: {
    expected: task.implementationSteps.find(step => step.id === 'S03').verification,
    observed: 'The full current browser run passed 512/512 cases, with FE009 running in Chromium and Firefox. Its observed negative/permission cases include invalid customer email with no write, stale-version conflict preserving edits and If-Match on retry, redacted phone remaining read-only, owner revoke disabled, manager/viewer denied team access, shop switching isolating the created customer, privacy deletion remaining pending with no approval or password step-up, and audit/customer states that disclose missing contract fields. The suite also exercises canonical route error states; no server-side authorization or live OIDC behavior is inferred. Synthetic domain/network checks passed 88/88.',
    checksTotal: 600,
    main: 'e2e',
    additional: ['domain'],
  },
  S04: {
    expected: task.implementationSteps.find(step => step.id === 'S04').verification,
    observed: 'Current component/UI unit regression passed 138/138 tests across 12 files; synthetic simulator/network checks passed 88/88; the full browser regression passed 512/512 across Chromium and Firefox. The FE009 flows assert request methods, paths, JSON bodies, shop scope, If-Match headers, mock state transitions, and visible recovery/error state. The E2E command also completed generated-contract checks, typecheck, and production/demo builds successfully as recorded in its log.',
    checksTotal: 738,
    main: 'unit',
    additional: ['domain', 'e2e'],
  },
  S05: {
    expected: task.implementationSteps.find(step => step.id === 'S05').verification,
    observed: 'Current browser acceptance passed 512/512 cases in Chromium and Firefox; the ten FE009 scenarios therefore ran 20/20 browser executions. The FE009 customer detail case sets a 320px viewport and asserts no horizontal overflow; the full suite covers role/shop state, empty/error route composition, and UI028 responsive/zoom stress scenarios. Synthetic domain/network checks passed 88/88. This is local browser evidence over the mock API, not backend, staging, production, or human-user acceptance.',
    checksTotal: 600,
    main: 'e2e',
    additional: ['domain'],
  },
};

function commandResult(id) {
  const entry = commands[id];
  return {
    commandId: id, command: entry.command, exitCode: 0,
    logFile: logs[id], logSha256: logHashes[id],
    passed: id === 'e2e' ? 512 : id === 'domain' ? 88 : 138,
  };
}

for (const stepId of ['S02', 'S03', 'S04', 'S05']) {
  const info = descriptions[stepId];
  const main = commands[info.main];
  const logFile = logs[info.main];
  const evidence = {
    taskId: 'FE009', stepId, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`,
    expected: info.expected, observed: info.observed,
    commandId: info.main, command: main.command, cwd: frontendCwd,
    reviewer: 'Codex self-review; no independent peer review claimed',
    environment: {
      name: `Windows / Node ${process.versions.node} / Chromium + Firefox`,
      details: 'React demo built locally; browser and API tests use the repository MSW/in-memory synthetic shop. E2E log records the current production/demo builds and typecheck.',
      dataSource: 'synthetic-msw',
    },
    checksTotal: info.checksTotal, failed: 0,
    checks: [
      { name: 'Full browser regression on Chromium and Firefox', count: 512, status: 'PASS', logFile: logs.e2e, logSha256: logHashes.e2e },
      { name: 'Synthetic simulator and network checks', count: 88, status: 'PASS', logFile: logs.domain, logSha256: logHashes.domain },
      ...(info.additional.includes('unit') || info.main === 'unit' ? [{ name: 'Frontend component/UI unit regression', count: 138, status: 'PASS', logFile: logs.unit, logSha256: logHashes.unit }] : []),
    ],
    sourceFiles, sourceSnapshotSha256, logFile,
    logSha256: logHashes[info.main],
    commandResults: [info.main, ...info.additional].map(commandResult),
  };
  const target = path.join(evidenceDir, `${stepId}-current-20261007.json`);
  fs.writeFileSync(target, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  result: 'PASS', taskId: 'FE009', steps: ['S02', 'S03', 'S04', 'S05'],
  evidenceFiles: ['S02-current-20261007.json', 'S03-current-20261007.json', 'S04-current-20261007.json', 'S05-current-20261007.json'],
  sourceCount: sourceFiles.length, sourceSnapshotSha256,
  logs: Object.fromEntries(Object.entries(logs).map(([id, file]) => [id, { file, sha256: logHashes[id] }])),
}, null, 2));
