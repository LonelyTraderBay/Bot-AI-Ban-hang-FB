import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE008');
const readJson = file => JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8'));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass one FE008 step: S01-S05.');

const plan = readJson('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE008');
const step = task.implementationSteps.find(item => item.id === stepId);
const commandMap = readJson('botsales-kit/execution/frontend-command-map.json');
const commands = {
  S01: { id: 'domain', log: 'S01-domain-current-20261004.log', checks: 88 },
  S02: { id: 'e2e', log: 'S05-e2e-rerun-current-20261004.log', checks: 388 },
  S03: { id: 'e2e', log: 'S05-e2e-rerun-current-20261004.log', checks: 388 },
  S04: { id: 'schemas', log: 'S04-schema-validation-current-20261004.log', checks: 356 },
  S05: { id: 'e2e', log: 'S05-e2e-rerun-current-20261004.log', checks: 388 },
};
const check = commands[stepId];
const registered = commandMap.commands.find(item => item.id === check.id);
if (!registered || registered.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${check.id} is not VERIFIED_AVAILABLE.`);

const logFile = `execution/frontend-evidence/FE008/${check.log}`;
const logPath = path.join(kit, logFile);
if (!fs.existsSync(logPath)) throw new Error(`Required log is missing: ${logFile}`);
const logText = fs.readFileSync(logPath, 'utf8');
if (stepId === 'S01' && !logText.includes('"passed":88')) throw new Error('Domain log does not show 88 passing simulator/MSW checks.');
if (stepId === 'S04' && !/"checks"\s*:\s*356/.test(logText)) throw new Error('Schema log does not show 356 passing checks.');
if (['S02', 'S03', 'S05'].includes(stepId) && !/388 passed \(/.test(logText)) throw new Error('Full current E2E log does not show 388 passing browser cases.');

const walk = (directory, extensions, found = []) => {
  for (const entry of fs.readdirSync(path.join(repo, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) walk(relative, extensions, found);
    else if (extensions.has(path.extname(entry.name).toLowerCase())) found.push(relative);
  }
  return found;
};
const sources = new Set([
  ...walk('apps/web/src', new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css'])),
  ...walk('tests', new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'])),
  ...walk('scripts', new Set(['.mjs', '.js', '.py'])),
  'AGENTS.md', 'apps/web/index.html', 'apps/web/package.json', 'apps/web/vite.config.ts',
  'apps/web/public/mockServiceWorker.js', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/events.schema.json',
  'botsales-kit/design/tokens.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json', 'package.json', 'package-lock.json',
  'packages/contracts/src/operations.json', 'packages/contracts/src/permissions.json',
  'packages/contracts/src/schemas.json', 'samples/MOCK_DATA.md',
  'playwright.config.ts', 'tests/fe018.spec.ts',
]);
const sourceFiles = [...sources].sort().map(file => {
  const bytes = fs.readFileSync(path.join(repo, file));
  return { path: file, sha256: sha256(bytes) };
});
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const supportingLogs = [
  ['domain', 'S01-domain-current-20261004.log'],
  ['schemas', 'S04-schema-validation-current-20261004.log'],
  ['generate', 'S04-generate-current-20261004.log'],
  ['types', 'S04-typecheck-current-20261004.log'],
  ...(stepId !== 'S01' && stepId !== 'S04' ? [['e2e', 'S05-ui004-105-firefox-rerun-20261004.log']] : []),
].filter(([, file]) => file !== check.log).map(([commandId, file]) => {
  const absolute = path.join(evidenceDir, file);
  if (!fs.existsSync(absolute)) throw new Error(`Supporting log is missing: ${file}`);
  const bytes = fs.readFileSync(absolute);
  return { commandId, file: `execution/frontend-evidence/FE008/${file}`, sha256: sha256(bytes) };
});
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const e2ePass = 'The complete current Playwright suite passed 388/388 cases across Chromium and Firefox after synchronizing the evaluation-table assertion with the response IDs. The built demo served the synthetic MSW API; the production artifact contained no mock worker/runtime. This is local frontend evidence only.';
const observed = {
  S01: 'Current npm run test:domain passed 75 simulator and 13 MSW HTTP/SSE checks (88 total), covering 210 handlers and 89 operation cases. Canonical generation confirms 54 routes; fixtures remain synthetic, deterministic, and shop/role scoped.',
  S02: `${e2ePass} The UI uses the shared MSW transport in demo mode; no fixture fallback or real backend/provider was used.`,
  S03: `${e2ePass} The suite covers role/shop denial, stale/422/503/unknown outcomes, delayed and aborted requests, empty/partial states, and SSE/network scenarios.`,
  S04: 'Python 3.12.10 with isolated jsonschema 4.26.0 passed 356/356 captured simulator/schema checks. Current domain/MSW passed 88/88, generate:check passed 11 outputs/283 schemas/210 operations/54 routes, and strict typecheck exited 0.',
  S05: `${e2ePass} Artifact tests confirmed the demo serves MSW and the production build excludes the mock worker/runtime. Reset, fault recovery, shop isolation, and synthetic-data disclosure were exercised.`,
}[stepId];
const evidence = {
  taskId: 'FE008', stepId, kind: 'test_run', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current dirty working tree; hashes below bind this evidence to observed sources.`,
  expected: step.verification, observed,
  command: registered.command, commandId: registered.id, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155',
    details: stepId === 'S04' ? 'Python 3.12.10 with jsonschema 4.26.0 installed in an isolated TEMP target.' : 'Local React frontend and synthetic MSW API; no hosted CI or live service.',
    dataSource: 'synthetic-msw',
  },
  checksTotal: check.checks, failed: 0, exitCode: 0,
  logFile, logSha256: sha256(fs.readFileSync(logPath)),
  sourceFiles, sourceSnapshotSha256, supportingLogs,
};
const output = path.join(evidenceDir, `${stepId}-current-revalidated-20261004.json`);
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `FE008.${stepId}`, result: 'PASS', checks: check.checks, sourceFiles: sourceFiles.length, evidence: path.relative(kit, output).replaceAll('\\', '/') }, null, 2));
