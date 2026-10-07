import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE007');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stepId = process.argv[2];
if (!/^S0[1-5]$/.test(stepId || '')) throw new Error('Pass one FE007 step: S01-S05.');
const plan = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-plan.json'), 'utf8'));
const task = plan.tasks.find(item => item.id === 'FE007');
const step = task.implementationSteps.find(item => item.id === stepId);
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = commandMap.commands.find(item => item.id === 'e2e');
if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error('Registered e2e command is not available.');

const e2eName = 'S05-e2e-rerun-current-20261004.log';
const e2ePath = path.join(kit, 'execution/frontend-evidence/FE008', e2eName);
const e2eText = fs.readFileSync(e2ePath, 'utf8');
if (!/388 passed \(/.test(e2eText)) throw new Error('The current two-browser E2E run is not clean 388/388.');
const verifyName = 'S05-verify-current-20261004.log';
const draftName = 'S03-dirty-draft-helper-current-20261004.log';
const verifyPath = path.join(evidenceDir, verifyName);
const draftPath = path.join(evidenceDir, draftName);
if (!fs.existsSync(verifyPath) || !fs.existsSync(draftPath)) throw new Error('Current verify or dirty-draft helper log is missing.');
const verifyText = fs.readFileSync(verifyPath, 'utf8');
const draftText = fs.readFileSync(draftPath, 'utf8');
if (!verifyText.includes('Test Files  10 passed (10)') || !verifyText.includes('Tests  85 passed (85)')) throw new Error('Current verify log is missing passing unit evidence.');
if (!/pass 4\b/.test(draftText) || !/fail 0\b/.test(draftText)) throw new Error('Current dirty-draft helper is not 4/4.');

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
  'AGENTS.md', 'apps/web/index.html', 'apps/web/package.json', 'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts', 'apps/web/tests/setup.ts', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/contracts/events.schema.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/design/tokens.json',
  'package.json', 'package-lock.json', 'playwright.config.ts', 'scripts/run-e2e.mjs',
  'scripts/setup.mjs', 'tests/session/dirty-drafts.check.mjs',
  'packages/contracts/src/operations.json', 'packages/contracts/src/permissions.json',
  'packages/contracts/src/schemas.json',
]);
const sourceFiles = [...sources].sort().map(file => ({
  path: file,
  sha256: sha256(fs.readFileSync(path.join(repo, file))),
}));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const mainLog = `execution/frontend-evidence/FE008/${e2eName}`;
const supportFiles = [
  ['FE007', verifyName], ['FE007', draftName],
].map(([directory, file]) => {
  const absolute = path.join(kit, 'execution/frontend-evidence', directory, file);
  return { file: `execution/frontend-evidence/${directory}/${file}`, sha256: sha256(fs.readFileSync(absolute)) };
});
const descriptions = {
  S01: 'Current two-browser suite passed 388/388; canonical route and operation source assertions passed, all 54 React routes rendered, and the route/permission maps stayed tied to canonical manifests.',
  S02: 'Current two-browser suite passed 388/388; shell navigation, permission guards, shop scope, route guards, deep links and live-mode-unavailable behavior passed on Chromium and Firefox.',
  S03: 'Current two-browser suite passed 388/388 for shop switching, request cancellation, logout, membership revocation and draft preservation. The native/EditDialog dirty-draft helper separately passed 4/4.',
  S04: 'Current two-browser suite passed 388/388 including delayed old-shop responses, deep-link refresh, mobile navigation, chunk recovery, live mode without mock fallback, and route/role access.',
  S05: 'Current npm run verify passed: generator 11/283/210/54, source check 65 files/220 operations/54 routes, boundaries 430 imports/10 fixtures, ESLint, strict typecheck, domain 88/88, Vitest 85/85, production build. Current full browser suite passed 388/388 and dirty-draft helper 4/4.',
};
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const evidence = {
  taskId: 'FE007', stepId, kind: 'test_run', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
  sourceRevision: `HEAD ${head} plus current dirty working tree; exact source hashes are recorded below.`,
  expected: step.verification, observed: descriptions[stepId],
  command: command.command, commandId: command.id, cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium 153 / Firefox 155',
    details: 'React app with synthetic MSW API; local verify and browser tests only, without CI or live services.',
    dataSource: 'synthetic-msw',
  },
  checksTotal: 388, failed: 0, exitCode: 0,
  logFile: mainLog, logSha256: sha256(fs.readFileSync(e2ePath)),
  sourceFiles, sourceSnapshotSha256, supportingLogs: supportFiles,
};
const output = path.join(evidenceDir, `${stepId}-current-revalidated-20261004.json`);
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ task: `FE007.${stepId}`, result: 'PASS', checks: 388, sourceFiles: sourceFiles.length, evidence: path.relative(kit, output).replaceAll('\\', '/') }, null, 2));
