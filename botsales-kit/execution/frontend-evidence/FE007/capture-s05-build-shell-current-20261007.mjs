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
const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const relKit = file => path.relative(kit, file).replaceAll('\\', '/');
const relSource = file => {
  const inFrontend = path.relative(fe, file);
  return inFrontend.startsWith('..') ? `botsales-kit/${relKit(file)}` : inFrontend.replaceAll('\\', '/');
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const run = (file, args, options) => spawnSync(file, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options });

function inventory(directory) {
  const result = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) result.push({ path: path.relative(directory, absolute).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(absolute)) });
    }
  }
  if (fs.existsSync(directory)) walk(directory);
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

const commandMapPath = path.join(kit, 'execution/frontend-command-map.json');
const commandMap = json(commandMapPath);
const build = commandMap.commands.find(item => item.id === 'build');
const buildDemo = commandMap.commands.find(item => item.id === 'build-demo');
const unit = commandMap.commands.find(item => item.id === 'unit');
for (const item of [build, buildDemo, unit]) assert(item?.status === 'VERIFIED_AVAILABLE', `Required registered command ${item?.id || 'unknown'} is unavailable.`);
const priorLive = inventory(path.join(fe, 'apps/web/dist'));
const priorDemo = inventory(path.join(fe, 'apps/web/dist-demo'));
assert(priorLive.length && priorDemo.length, 'Expected current production and demo artifacts before the build check.');

const commandLogs = [];
for (const item of [build, buildDemo]) {
  const result = run('cmd.exe', ['/d', '/c', item.command], { cwd: fe, env: process.env, timeout: 600000 });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const logPath = path.join(out, `S05-${item.id}-build-current-20261007.log`);
  fs.writeFileSync(logPath, output, 'utf8');
  commandLogs.push({ command: item, result, output, logPath });
  assert(result.status === 0, `${item.id} failed with exit ${result.status}:\n${output.slice(-16000)}`);
}
const unitRun = run('cmd.exe', ['/d', '/c', unit.command], { cwd: fe, env: process.env, timeout: 600000 });
const unitOutput = `${unitRun.stdout || ''}${unitRun.stderr || ''}`;
const unitLogPath = path.join(out, 'S05-unit-current-20261007.log');
fs.writeFileSync(unitLogPath, unitOutput, 'utf8');
assert(unitRun.status === 0 && /Tests\s+\d+ passed/.test(unitOutput), `Registered unit suite failed (exit=${unitRun.status}):\n${unitOutput.slice(-12000)}`);

const evidenceRunId = `FE007-S05-${process.pid}`;
const browserCommand = 'node node_modules/@playwright/test/cli.js test tests/frontend.spec.ts tests/session/demo-worker-startup.spec.ts tests/artifacts/demo-preview.spec.ts --grep "live mode reports an unavailable session API without enabling mock data|demo startup explains the required setup when the browser blocks Service Workers|the built demo artifact serves the React UI and synthetic API through preview" --reporter=line';
const playwrightCli = path.join(fe, 'node_modules/@playwright/test/cli.js');
const browserRun = run(process.execPath, [playwrightCli, 'test', 'tests/frontend.spec.ts', 'tests/session/demo-worker-startup.spec.ts', 'tests/artifacts/demo-preview.spec.ts', '--grep', 'live mode reports an unavailable session API without enabling mock data|demo startup explains the required setup when the browser blocks Service Workers|the built demo artifact serves the React UI and synthetic API through preview', '--reporter=line'], { cwd: fe, env: { ...process.env, BOTSALES_EVIDENCE_RUN_ID: evidenceRunId }, timeout: 600000 });
const browserOutput = `${browserRun.stdout || ''}${browserRun.stderr || ''}`;
const browserLogPath = path.join(out, 'S05-shell-browser-current-20261007.log');
fs.writeFileSync(browserLogPath, browserOutput, 'utf8');
assert(browserRun.status === 0 && /6 passed/.test(browserOutput), `Current shell/transport/artifact browser tests failed (exit=${browserRun.status}):\n${browserOutput.slice(-18000)}`);

const generatedEvidenceDir = path.join(fe, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007');
const generatedEvidence = fs.readdirSync(generatedEvidenceDir).filter(name => name.includes(evidenceRunId)).sort();
assert(generatedEvidence.length === 4 && generatedEvidence.every(name => /S19-demo-preview-(metrics-.*\.json|overview-.*\.png)$/.test(name)), `Unexpected demo preview evidence outputs for ${evidenceRunId}: ${generatedEvidence.join(', ')}`);

const liveManifest = inventory(path.join(fe, 'apps/web/dist'));
const demoManifest = inventory(path.join(fe, 'apps/web/dist-demo'));
const liveWorker = liveManifest.some(item => item.path === 'mockServiceWorker.js');
const demoWorker = demoManifest.some(item => item.path === 'mockServiceWorker.js');
assert(!liveWorker && demoWorker, 'Production/demo worker separation is incorrect after current registered builds.');
const liveBundles = liveManifest.filter(item => item.path.endsWith('.js')).map(item => read(path.join(fe, 'apps/web/dist', item.path))).join('\n');
for (const marker of ['setupWorker(', 'DEMO-NOT-A-REAL-PAIRING', 'Joker Studio', 'shop-second']) assert(!liveBundles.includes(marker), `Production bundle unexpectedly contains mock marker ${marker}.`);
const setupScript = read(path.join(fe, 'apps/web/src/main.tsx'));
assert(setupScript.includes("if (__MOCK__) {") && setupScript.includes('await startMockWorker();') && setupScript.includes('Không thể khởi tạo ứng dụng') && setupScript.includes('Chạy npm run setup để tạo service worker mô phỏng'), 'Current demo-only startup and actionable failure message are missing.');
const shellSource = read(path.join(fe, 'apps/web/src/app/Shell.tsx'));
assert(shellSource.includes("__MOCK__ ? 'Dữ liệu mô phỏng' : 'API thật'") && shellSource.includes('không tự chuyển sang dữ liệu mô phỏng'), 'Demo/live transport labels or no-fallback message are missing.');

const executedAt = new Date().toISOString();
const allLive = path.join(fe, 'apps/web/dist');
const allDemo = path.join(fe, 'apps/web/dist-demo');
const generatedEvidencePaths = generatedEvidence.map(name => path.join(generatedEvidenceDir, name));
const auditPath = path.join(out, 'S05-shell-build-audit-current-20261007.json');
const audit = {
  executedAt,
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  commands: commandLogs.map(item => ({ commandId: item.command.id, command: item.command.command, exitCode: item.result.status, logFile: relKit(item.logPath), logSha256: sha(fs.readFileSync(item.logPath)) })),
  unit: { commandId: unit.id, command: unit.command, exitCode: unitRun.status, summary: unitOutput.split(/\r?\n/).filter(line => /Tests\s+\d+ passed/.test(line)).at(-1), logFile: relKit(unitLogPath), logSha256: sha(fs.readFileSync(unitLogPath)) },
  browser: { command: browserCommand, exitCode: browserRun.status, testsPassed: 6, projects: ['chromium', 'firefox'], runId: evidenceRunId, logFile: relKit(browserLogPath), logSha256: sha(fs.readFileSync(browserLogPath)), generatedEvidence: generatedEvidence.map(name => ({ path: `evidence/frontend-ui-improvements/ui-governance-rollout-20261007/${name}`, sha256: sha(fs.readFileSync(path.join(generatedEvidenceDir, name))) })) },
  artifacts: { production: { root: 'apps/web/dist', files: liveManifest.length, mockServiceWorkerPresent: liveWorker, manifest: liveManifest }, demo: { root: 'apps/web/dist-demo', files: demoManifest.length, mockServiceWorkerPresent: demoWorker, manifest: demoManifest }, previousProductionFiles: priorLive.length, previousDemoFiles: priorDemo.length },
  transport: { liveMissingApi: 'Shows unavailable and does not show synthetic data.', demoServiceWorkerBlocked: 'Shows startup failure and npm setup instruction without rendering mock app.', builtDemo: 'Preview answered GET /api/v2/session with synthetic 200 and showed the demo label.' },
  productionBundleMockMarkersAbsent: true,
  limits: 'Local Windows builds and demo preview only. No hosted deployment, backend, identity provider, provider integrations or server-side authorization were exercised.',
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'package.json', 'apps/web/package.json', 'apps/web/vite.config.ts',
  'apps/web/src/main.tsx', 'apps/web/src/mocks/browser.ts', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/router.tsx',
  'tests/frontend.spec.ts', 'tests/session/demo-worker-startup.spec.ts', 'tests/session/demo-server.mjs', 'tests/artifacts/demo-preview.spec.ts', 'tests/evidence-run-id.mjs',
  ...generatedEvidencePaths.map(file => path.relative(fe, file).replaceAll('\\', '/')),
];
const kitSources = [
  'execution/frontend-plan.json', 'execution/frontend-command-map.json',
  'execution/frontend-evidence/FE007/S01-router-current-20261007.json', 'execution/frontend-evidence/FE007/S02-session-current-20261007.json',
  'execution/frontend-evidence/FE007/S03-scope-lifecycle-current-20261007.json', 'execution/frontend-evidence/FE007/S04-route-regression-current-20261007.json',
  'execution/frontend-evidence/FE007/capture-s05-build-shell-current-20261007.mjs',
  ...commandLogs.map(item => relKit(item.logPath)),
  'execution/frontend-evidence/FE007/S05-unit-current-20261007.log',
  'execution/frontend-evidence/FE007/S05-shell-browser-current-20261007.log',
  'execution/frontend-evidence/FE007/S05-shell-build-audit-current-20261007.json',
];
const sourceFiles = [...sourcePaths.map(item => path.join(fe, item)), ...kitSources.map(item => path.join(kit, item))]
  .map(file => ({ path: relSource(file), sha256: sha(fs.readFileSync(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const git = args => { const result = run('git', args, { cwd: repo }); return result.status === 0 ? result.stdout.trim() : 'unavailable'; };
const reviewer = 'Codex self-review; no independent peer review claimed';
const checks = [
  'registered production build command passed generate:check, typecheck and production Vite build',
  'registered demo build command passed generate:check, typecheck and demo Vite build',
  'registered Vitest unit suite passed',
  'live missing API showed unavailable without synthetic fallback in Chromium and Firefox',
  'demo worker startup failure showed actionable setup guidance in Chromium and Firefox',
  'built demo preview served React and a synthetic session response in Chromium and Firefox',
  'UI disclosed demo data source and production bundle excluded mock worker/runtime markers',
  'evidence artifacts from demo preview were created under a fresh collision-safe run id',
];
const logPath = path.join(out, 'S05-shell-build-current-20261007.log');
const logText = [
  'FE007.S05 shell/build/transport final verification',
  `executedAt=${executedAt}`,
  `cwd=${fe}`,
  ...commandLogs.flatMap(item => [`registered commandId=${item.command.id}; command=${item.command.command}; exitCode=${item.result.status}`, item.output.trimEnd()]),
  `registered commandId=${unit.id}; command=${unit.command}; exitCode=${unitRun.status}; ${audit.unit.summary}`,
  unitOutput.trimEnd(),
  `browser command=${browserCommand}; exitCode=${browserRun.status}; 6/6 tests across Chromium+Firefox; BOTSALES_EVIDENCE_RUN_ID=${evidenceRunId}`,
  'Demo preview verified /api/v2/session status 200 and the visible synthetic-data label. Live missing API remained unavailable with no demo fallback.',
  'Blocking Service Workers in demo produced the explicit setup/startup screen instead of rendering a falsely functional app.',
  `artifact separation: production worker=${liveWorker}; demo worker=${demoWorker}; production mock marker scan=clean; productionFiles=${liveManifest.length}; demoFiles=${demoManifest.length}`,
  `generated preview evidence=${generatedEvidence.join(', ')}`,
  'Scope: local frontend source/build and synthetic preview only; no backend/provider/staging/production runtime claims.',
  `checks=${checks.length}; failed=0`,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
  reviewer,
].join('\n') + '\n';
fs.writeFileSync(logPath, logText, 'utf8');

const evidencePath = path.join(out, 'S05-shell-build-current-20261007.json');
const evidence = {
  taskId: 'FE007', stepId: 'S05', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt, sourceRevision: `HEAD ${git(['rev-parse', '--short', 'HEAD'])} on ${git(['branch', '--show-current'])} plus current frontend working tree`,
  expected: 'Current React demo shell starts and identifies synthetic data; live mode with missing API shows unavailable without fallback; a blocked demo transport shows actionable startup guidance. Production and demo builds remain separated.',
  observed: `Registered production and demo build commands and registered Vitest all passed. Six targeted browser tests passed across Chromium and Firefox, including live API-unavailable/no-fallback, explicit demo startup error when Service Workers are blocked, and built demo preview serving a synthetic 200 session response. Production bundle has no mock worker/runtime markers; dist has no mockServiceWorker.js while dist-demo does. The demo preview created four new run-id-scoped metrics/screenshot artifacts.`,
  commandId: buildDemo.id, command: buildDemo.command, cwd: fe, reviewer,
  environment: { name: `Windows Node ${process.versions.node} / npm / Vite production+demo / Playwright Chromium+Firefox`, details: 'Exact registered production and demo build commands ran in the frontend workspace; unit tests ran separately; selected local browser tests used real React/Vite and the built demo preview with synthetic MSW data. No API backend, OIDC or external providers were available or claimed.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, checks, sourceFiles, sourceSnapshotSha256,
  logFile: relKit(logPath), logSha256: sha(Buffer.from(logText)),
  commandResults: [
    ...commandLogs.map(item => ({ commandId: item.command.id, command: item.command.command, exitCode: 0, logFile: relKit(item.logPath), logSha256: sha(fs.readFileSync(item.logPath)) })),
    { commandId: unit.id, command: unit.command, exitCode: 0, logFile: relKit(unitLogPath), logSha256: sha(fs.readFileSync(unitLogPath)) },
    { commandId: 'supplemental-current-app-shell-and-artifact-preview', command: browserCommand, exitCode: 0, testsPassed: 6, projects: ['chromium', 'firefox'], runId: evidenceRunId, logFile: relKit(browserLogPath), logSha256: sha(fs.readFileSync(browserLogPath)) },
  ],
  audit,
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ result: 'PASS', evidence: relKit(evidencePath), buildCommands: commandLogs.map(item => ({ id: item.command.id, exitCode: item.result.status })), unitSummary: audit.unit.summary, browserTests: 6, browserProjects: 2, generatedEvidence, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));
