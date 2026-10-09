import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const kit = path.join(root, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE023');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const unitLogFile = '../botsales-kit/execution/frontend-evidence/FE023/unit-verbose-current-20261001.log';
const browserLogFile = '../botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log';
const matrixLogFile = '../botsales-kit/execution/frontend-evidence/FE023/route-state-role-matrix-current-20261001.log';
const unitLog = read(unitLogFile);
const browserLog = read(browserLogFile);
const matrixLog = read(matrixLogFile);
const matrix = JSON.parse(read('docs/route-state-role-matrix.json'));
const i18nSource = read('apps/web/src/app/i18n.ts');
const translationSection = i18nSource.match(/export const requiredVietnameseKeys = \[([\s\S]*?)\] as const/)?.[1] ?? '';
const requiredTranslationKeys = translationSection.match(/'[^']+'/g)?.length ?? 0;
const plan = JSON.parse(read('../botsales-kit/execution/frontend-plan.json'));
const commandMap = JSON.parse(read('../botsales-kit/execution/frontend-command-map.json'));
const unitCommand = commandMap.commands.find((command) => command.id === 'unit');
const e2eCommand = commandMap.commands.find((command) => command.id === 'e2e');
if (unitCommand?.status !== 'VERIFIED_AVAILABLE' || e2eCommand?.status !== 'VERIFIED_AVAILABLE')
  throw new Error('Required registered commands are not verified available.');
const unitTotal = Number(unitLog.match(/Tests\s+(\d+) passed/)?.[1]);
const browserTotal = Number(browserLog.match(/^\s*(\d+) passed \([^)]+\)\s*$/m)?.[1]);
if (unitTotal !== 66 || !unitLog.includes('EXIT_CODE=0')) throw new Error(`Expected current 66-test verbose Vitest run; found ${unitTotal}.`);
if (browserTotal !== 123 || !browserLog.includes('all canonical routes render inside the real React demo application')) throw new Error(`Expected current 123-test Chromium run with canonical route smoke; found ${browserTotal}.`);
if (matrix.summary.routes !== 54 || matrix.routes.length !== 54 || matrix.routes[0].access == null ||
    matrix.summary.passingGlobalStateCases !== 15 || matrix.globalStateCases.length !== 15 ||
    matrix.globalStateCases.some((test) => test.result !== 'PASS'))
  throw new Error('Current route-state-role matrix is incomplete or has unverified required shared states.');
const routeStateCells = matrix.routes.reduce((sum, route) => sum + Object.keys(route.states).length, 0);
const testedRouteStateCells = matrix.routes.reduce((sum, route) => sum + Object.values(route.states).filter((state) => state.result === 'SHARED_UI_TESTED').length, 0);
const untestedRouteStateCells = routeStateCells - testedRouteStateCells;
const fe023BrowserTitles = [
  'a dirty dialog keeps the form value until the user confirms discard',
  'a customer lookup loads the next cursor page without dropping earlier choices',
  'delayed requests show loading and failed refresh keeps a retry path',
  'unsaved shop settings are preserved when navigation switches shop scope',
  'a saved shop form resets its dirty baseline and reports success',
];
if (fe023BrowserTitles.some((title) => !browserLog.includes(title))) throw new Error('The current browser suite is missing an FE023 state/form regression.');
const currentStateUnitTitles = [
  'renders a bounded loading state and does not show success content before data arrives',
  'keeps status and empty states understandable without relying on color',
  'shows a reserved loading state and a retryable error state',
  'shows forbidden as an access state without offering a meaningless retry',
  'keeps the loaded data visible after a failed refetch and identifies it as potentially stale',
  'keeps an unknown mutation outcome distinct and includes the reconciliation command ID',
  'exposes partial data and unavailable capability as explicit, accessible states',
  'maps 422 errors to a field, focuses it, and preserves the user input',
  'presents HTTP 412 with an actionable Vietnamese state',
  'presents HTTP 428 with an actionable Vietnamese state',
  'presents HTTP 404 with an actionable Vietnamese state',
  'has a complete Vietnamese translation for every registered common UI key',
];
if (currentStateUnitTitles.some((title) => !unitLog.includes(title))) throw new Error('The current verbose unit run is missing a required shared UI state test.');
if (requiredTranslationKeys < 1) throw new Error('The registered Vietnamese UI key list is empty or could not be read.');

const sourceFiles = [
  'apps/web/package.json', 'apps/web/src/app/i18n.ts', 'apps/web/src/app/dirty-drafts.ts',
  'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/shared/model/dirty-drafts.ts', 'apps/web/src/shared/ui/components.tsx',
  'apps/web/tests/components.test.tsx', 'apps/web/tests/states/fe023-state.test.tsx',
  'tests/states/fe023.spec.ts', 'tests/states/generate-route-state-roles.mjs', 'tests/states/generate-fe023-evidence.mjs',
  'tests/frontend.spec.ts', '../botsales-kit/contracts/route-manifest.json',
  '../botsales-kit/contracts/permission-catalog.json', '../botsales-kit/execution/frontend-command-map.json',
  '../botsales-kit/execution/frontend-plan.json', 'docs/route-state-role-matrix.json',
  unitLogFile, browserLogFile, matrixLogFile, '../botsales-kit/execution/frontend-evidence/FE023/handoff.md',
];
const sourcePaths = [...new Set(sourceFiles)].sort();
const sources = sourcePaths.map((file) => ({ path: file, sha256: hash(fs.readFileSync(path.join(root, file))) }));
const snapshot = hash(Buffer.from(sources.map((file) => `${file.path}:${file.sha256}`).sort().join('\n')));
const git = requireGitRevision();
const statesPass = matrix.summary.passingGlobalStateCases;
const details = {
  S01: {
    command: unitCommand, mainLog: unitLogFile, checks: 54 + 7 + statesPass,
    expected: 'Build a route × role × state inventory from canonical routes/permissions and current browser/component results; list untested combinations explicitly.',
    observed: `Generated a 54-route × 7-role matrix with ${statesPass}/15 shared state cases evidenced. It records ${routeStateCells} route-state cells (${testedRouteStateCells} covered by shared UI tests, ${untestedRouteStateCells} marked NOT_TESTED), owner route-mount evidence and one viewer forbidden-route case. Role outcomes are derived from the permission catalog; route-specific behavior is not inferred.`,
    main: unitLogFile, support: [matrixLogFile, browserLogFile],
  },
  S02: {
    command: e2eCommand, checks: 13 + fe023BrowserTitles.length,
    expected: 'Shared UI presents loading, empty, partial, error, forbidden, not-found, stale, unknown, conflict, missing-version and unavailable-capability states with retry/error semantics where valid.',
    observed: `Vitest passed ${unitTotal}/66 with the named common-state and recovery tests; Chromium passed ${browserTotal}/123 and includes delayed loading plus a retryable request failure. The generated matrix marks route-specific state composition separately from shared-component tests.`,
    main: browserLogFile, support: [unitLogFile, matrixLogFile],
  },
  S03: {
    command: e2eCommand, checks: 5,
    expected: 'Field validation, version conflicts, cursor lookup pagination and unsaved draft guards preserve user input and provide a deliberate recovery action.',
    observed: `Current unit/browser results verify 422 focus and retained input, 412/428 actions, paginated customer lookup preserving earlier choices, dirty dialog/shop guards, successful save baseline reset, and URL filter pagination. The browser checks use synthetic MSW; there is no claim of server persistence.`,
    main: browserLogFile, support: [unitLogFile],
  },
  S04: {
    command: e2eCommand, checks: 13 + fe023BrowserTitles.length,
    expected: 'Component and Chromium tests cover state rendering, focus, refetch/retry, dirty forms, pagination and required Vietnamese keys on the actual React app.',
    observed: `Vitest passed ${unitTotal}/66 and Chromium passed ${browserTotal}/123. All five FE023 browser scenarios and the named shared-state unit cases appear in those logs; common UI text resolves in Vietnamese. Actual screen-reader user testing is not represented by these checks.`,
    main: browserLogFile, support: [unitLogFile, matrixLogFile],
  },
  S05: {
    command: e2eCommand, checks: 54 + statesPass,
    expected: 'Coverage is generated from current test output; translation and route/state exceptions are visible rather than silently counted as complete.',
    observed: `The regenerated matrix contains 54 routes, seven catalog roles and ${statesPass} passing shared-state cases. It records ${untestedRouteStateCells} route-state combinations as NOT_TESTED and limits each role observation to its named browser evidence. The translation test confirms all ${requiredTranslationKeys} registered common Vietnamese keys; only Vietnamese is configured.`,
    main: browserLogFile, support: [unitLogFile, matrixLogFile],
  },
};

for (const [stepId, value] of Object.entries(details)) {
  const logFile = value.mainLog ?? value.main;
  const evidence = {
    taskId: 'FE023', stepId, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${git} plus current dirty frontend working tree`,
    expected: value.expected, observed: value.observed,
    command: value.command.command, commandId: value.command.id, cwd: root,
    reviewer: 'Codex self-review; no independent peer review',
    environment: { name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium`, details: 'Vitest/Chromium against the React app and synthetic MSW fixtures.', dataSource: 'synthetic-msw' },
    checksTotal: value.checks, failed: 0, exitCode: 0,
    logFile: logFile.replace('../botsales-kit/', ''),
    logSha256: hash(fs.readFileSync(path.join(root, logFile))),
    sourceFiles: sources, sourceSnapshotSha256: snapshot,
    supportingLogs: value.support.map((file) => ({ file: file.replace('../botsales-kit/', ''), sha256: hash(fs.readFileSync(path.join(root, file))) })),
    actualInvocation: stepId === 'S01' ? 'npm.cmd --script-shell=cmd.exe test -- --reporter=verbose; node tests/states/generate-route-state-roles.mjs' : 'npm.cmd --script-shell=cmd.exe run test:e2e',
  };
  fs.writeFileSync(path.join(evidenceDir, `${stepId}-current-20261001.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify({ status: 'PASS', steps: Object.keys(details).length, unit: unitTotal, browser: browserTotal, routes: matrix.summary.routes, roles: matrix.routes[0].access ? Object.keys(matrix.routes[0].access).length : 0, sharedStates: statesPass, testedRouteStateCells, untestedRouteStateCells, sources: sources.length }, null, 2));

function requireGitRevision() {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : 'HEAD-unavailable';
}
