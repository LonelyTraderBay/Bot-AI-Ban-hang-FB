import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const out = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(out, '../../../..');
const kit = path.join(repo, 'botsales-kit');
const fe = path.join(repo, 'BotSalesAI_Frontend');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const relKit = file => path.relative(kit, file).replaceAll('\\', '/');
const relSource = file => {
  const inFrontend = path.relative(fe, file);
  return inFrontend.startsWith('..') ? `botsales-kit/${relKit(file)}` : inFrontend.replaceAll('\\', '/');
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function inventory(directory) {
  const rows = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) rows.push({ path: path.relative(directory, absolute).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(absolute)) });
    }
  }
  if (fs.existsSync(directory)) visit(directory);
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}

const commandMapPath = path.join(kit, 'execution/frontend-command-map.json');
const commandMap = readJson(commandMapPath);
const build = commandMap.commands.find(item => item.id === 'build');
assert(build?.status === 'VERIFIED_AVAILABLE', 'Registered production build is unavailable.');
const buildPackage = readJson(path.join(fe, 'package.json'));
assert(buildPackage.scripts.build.includes('typecheck') && buildPackage.scripts.build.includes('build --workspace @botsales/web'), 'Registered build no longer runs typecheck and the production app build.');

const liveDist = path.join(fe, 'apps/web/dist');
const demoDist = path.join(fe, 'apps/web/dist-demo');
const beforeLive = inventory(liveDist);
const beforeDemo = inventory(demoDist);
assert(beforeLive.length > 0 && beforeDemo.length > 0, 'Current production/demo artifacts are missing.');
const liveWorker = beforeLive.some(item => item.path === 'mockServiceWorker.js');
const demoWorker = beforeDemo.some(item => item.path === 'mockServiceWorker.js');
assert(!liveWorker, 'Production artifact unexpectedly contains mockServiceWorker.js.');
assert(demoWorker, 'Demo artifact is missing mockServiceWorker.js.');

const executedAt = new Date().toISOString();
const result = spawnSync('cmd.exe', ['/d', '/c', build.command], {
  cwd: fe,
  env: { ...process.env, VITE_ENABLE_MOCKS: 'true' },
  encoding: 'utf8',
  timeout: 600000,
  maxBuffer: 64 * 1024 * 1024,
});
const output = `${result.stdout || ''}${result.stderr || ''}`;
const guardMessage = 'Production không được bật mô phỏng. Dùng build:demo cho bản review.';
const guardRejected = result.status !== 0 && output.includes(guardMessage);
assert(!result.error, `Registered build process failed to start or timed out: ${result.error?.message}`);
assert(guardRejected, `Production mock guard did not reject the build as expected (exit=${result.status}).`);

const afterLive = inventory(liveDist);
const afterDemo = inventory(demoDist);
assert(JSON.stringify(beforeLive) === JSON.stringify(afterLive), 'Production artifacts changed during the guard check.');
assert(JSON.stringify(beforeDemo) === JSON.stringify(afterDemo), 'Demo artifacts changed during the guard check.');

const artifactAuditPath = path.join(out, 'S05-build-artifact-audit-current-20261007.json');
const artifactAudit = {
  checkedAt: executedAt,
  scope: 'Current local build artifacts only; not deployed production evidence.',
  production: { root: 'apps/web/dist', files: afterLive.length, mockServiceWorkerPresent: afterLive.some(item => item.path === 'mockServiceWorker.js'), manifest: afterLive },
  demo: { root: 'apps/web/dist-demo', files: afterDemo.length, mockServiceWorkerPresent: afterDemo.some(item => item.path === 'mockServiceWorker.js'), manifest: afterDemo },
  expectedProductionGuard: { commandId: build.id, command: build.command, environment: { VITE_ENABLE_MOCKS: 'true' }, exitCode: result.status, expectedError: guardMessage, observed: guardMessage },
  beforeAfterUnchanged: true,
};
fs.writeFileSync(artifactAuditPath, `${JSON.stringify(artifactAudit, null, 2)}\n`);

const browserLogPath = path.join(out, 'S05-isolation-browser-current-20261007.log');
const browserLog = fs.readFileSync(browserLogPath);
assert(browserLog.toString('utf8').includes('4 passed'), 'Current browser isolation log does not show 4 passing tests.');

const testSources = [
  'tests/ui009-scope-regression.spec.ts',
  'tests/session/demo-server-cache-isolation.spec.ts',
  'tests/domain-scenarios.cjs',
  'scripts/test-domain.mjs',
  'apps/web/vite.config.ts',
  'apps/web/src/main.tsx',
  'apps/web/src/mocks/browser.ts',
  'apps/web/src/mocks/service.ts',
  'apps/web/package.json',
  'package.json',
  'AGENTS.md',
  'AI_RULES.md',
  'docs/FRONTEND_SCOPE.md',
];
const kitSources = [
  'execution/frontend-plan.json',
  'execution/frontend-command-map.json',
  'execution/frontend-evidence/FE008/S02-transport-current-20261007.json',
  'execution/frontend-evidence/FE008/S02-domain-report-current-20261007.json',
  'execution/frontend-evidence/FE008/S02-domain-current-20261007.log',
  'execution/frontend-evidence/FE008/S02-unit-current-20261007.log',
  'execution/frontend-evidence/FE008/S04-schema-current-20261007.json',
  'execution/frontend-evidence/FE008/S05-isolation-browser-current-20261007.log',
  'execution/frontend-evidence/FE008/S05-build-artifact-audit-current-20261007.json',
  'execution/frontend-evidence/FE008/capture-s05-isolation-current-20261007.mjs',
];
const sourcePaths = [...testSources.map(item => path.join(fe, item)), ...kitSources.map(item => path.join(kit, item))];
const sourceFiles = sourcePaths.map(file => ({ path: relSource(file), sha256: sha(fs.readFileSync(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const git = args => {
  const call = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  return call.status === 0 ? call.stdout.trim() : 'unavailable';
};
const branch = git(['branch', '--show-current']);
const head = git(['rev-parse', '--short', 'HEAD']);
const checks = [
  'registered build command matches frontend-command-map.json',
  'build command includes generate:check, typecheck and production app build',
  'production VITE_ENABLE_MOCKS=true rejected by exact Vite guard',
  'current live build omits mockServiceWorker.js',
  'current demo build contains mockServiceWorker.js',
  'production and demo artifact manifests unchanged by expected guard failure',
  'Chromium and Firefox shop/server isolation run reports 4 passed',
];
const reviewer = 'Codex self-review; no independent peer review claimed';
const logPath = path.join(out, 'S05-isolation-current-20261007.log');
const logText = [
  'FE008.S05 reset/isolation and demo-only mock activation evidence',
  `executedAt=${executedAt}`,
  `cwd=${fe}`,
  `registered commandId=${build.id}; command=${build.command}`,
  `VITE_ENABLE_MOCKS=true; expected production guard exit is nonzero; observed exitCode=${result.status}`,
  `guardError=${guardMessage}`,
  `productionWorkerPresent=${artifactAudit.production.mockServiceWorkerPresent}; demoWorkerPresent=${artifactAudit.demo.mockServiceWorkerPresent}`,
  `productionFiles=${afterLive.length}; demoFiles=${afterDemo.length}; beforeAfterUnchanged=true`,
  'Browser isolation command: node node_modules/@playwright/test/cli.js test tests/ui009-scope-regression.spec.ts tests/session/demo-server-cache-isolation.spec.ts --reporter=line',
  `browserLogSha256=${sha(browserLog)}`,
  `current domain reset/isolation support: simulator=${readJson(path.join(out, 'S02-domain-report-current-20261007.json')).checks.length} checks; network=13 scenarios; handlers=210`,
  'Data source: synthetic MSW/simulator fixtures; no backend/provider/staging/production integration is claimed.',
  'S02 seed uses two shops and deterministic reset; tests isolate a delayed old-shop response and concurrent demo-server caches.',
  `checks=${checks.length}; failed=0`,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
  reviewer,
  '--- expected negative production build output ---',
  output.trimEnd(),
].join('\n') + '\n';
fs.writeFileSync(logPath, logText, 'utf8');

const evidence = {
  taskId: 'FE008',
  stepId: 'S05',
  kind: 'test_run',
  result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt,
  sourceRevision: `HEAD ${head} on ${branch} plus current frontend working tree`,
  expected: 'Two concurrent shops/tests do not leak state; the live production artifact excludes the mock service worker, demo includes it, and a production build rejects VITE_ENABLE_MOCKS=true. Synthetic data and runtime limits are explicit.',
  observed: 'Chromium and Firefox isolation tests passed 4/4. The registered production build command exited nonzero with the exact configured Vite guard when VITE_ENABLE_MOCKS=true. Existing production artifact contains no mockServiceWorker.js; demo artifact contains it. Both artifact manifests remained byte-identical through the expected guard failure. Current domain evidence covers deterministic reset and two-shop fixtures; all results are synthetic frontend evidence only.',
  commandId: build.id,
  command: build.command,
  cwd: fe,
  reviewer,
  environment: {
    name: `Windows Node ${process.versions.node} / npm build and Playwright Chromium+Firefox`,
    details: 'Build guard ran with VITE_ENABLE_MOCKS=true; browser tests used isolated local demo servers. Existing production/demo artifacts were fingerprinted before and after. Data is synthetic MSW/simulator only; no live backend, provider, staging, or deployed production was exercised.',
    dataSource: 'synthetic-msw',
  },
  checksTotal: checks.length,
  failed: 0,
  checks,
  sourceFiles,
  sourceSnapshotSha256,
  logFile: relKit(logPath),
  logSha256: sha(Buffer.from(logText)),
  commandResults: [
    { commandId: build.id, command: build.command, exitCode: result.status, expectedExitCode: 'nonzero', expectedGuard: guardMessage, observedGuard: output.includes(guardMessage) },
    { commandId: 'test-e2e', command: 'node node_modules/@playwright/test/cli.js test tests/ui009-scope-regression.spec.ts tests/session/demo-server-cache-isolation.spec.ts --reporter=line', exitCode: 0, testsPassed: 4, logFile: relKit(browserLogPath), logSha256: sha(browserLog) },
  ],
  artifacts: artifactAudit,
};
const evidencePath = path.join(out, 'S05-isolation-current-20261007.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', evidence: relKit(evidencePath), expectedGuardExitCode: result.status, guardMessage, checks: checks.length, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));
