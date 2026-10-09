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

const commandMap = json(path.join(kit, 'execution/frontend-command-map.json'));
const unit = commandMap.commands.find(item => item.id === 'unit');
assert(unit?.status === 'VERIFIED_AVAILABLE', 'Registered unit command is unavailable.');
const unitRun = run('cmd.exe', ['/d', '/c', unit.command], { cwd: fe, env: process.env, timeout: 600000 });
const unitOutput = `${unitRun.stdout || ''}${unitRun.stderr || ''}`;
assert(unitRun.status === 0 && /Tests\s+\d+ passed/.test(unitOutput), `Registered unit tests failed (exit=${unitRun.status}):\n${unitOutput.slice(-12000)}`);

const draftCommand = 'node --test tests/session/dirty-drafts.check.mjs';
const draftRun = run(process.execPath, ['--test', 'tests/session/dirty-drafts.check.mjs'], { cwd: fe, env: process.env, timeout: 120000 });
const draftOutput = `${draftRun.stdout || ''}${draftRun.stderr || ''}`;
assert(draftRun.status === 0 && /(?:#|ℹ) pass 4/.test(draftOutput), `Dirty-draft guard unit tests failed (exit=${draftRun.status}):\n${draftOutput}`);

const browserCommand = 'node node_modules/@playwright/test/cli.js test tests/frontend.spec.ts tests/session/session-revocation.spec.ts tests/ui009-scope-regression.spec.ts tests/session/demo-server-cache-isolation.spec.ts --grep "switching shops cancels a delayed request|deep links survive browser refresh|logout asks before discarding|session.revoked SSE|UI009 delayed customer orders from the previous shop|concurrent demo servers use isolated Vite caches" --reporter=line';
const playwrightCli = path.join(fe, 'node_modules/@playwright/test/cli.js');
const browserRun = run(process.execPath, [playwrightCli, 'test', 'tests/frontend.spec.ts', 'tests/session/session-revocation.spec.ts', 'tests/ui009-scope-regression.spec.ts', 'tests/session/demo-server-cache-isolation.spec.ts', '--grep', 'switching shops cancels a delayed request|deep links survive browser refresh|logout asks before discarding|session.revoked SSE|UI009 delayed customer orders from the previous shop|concurrent demo servers use isolated Vite caches', '--reporter=line'], { cwd: fe, env: process.env, timeout: 600000 });
const browserOutput = `${browserRun.stdout || ''}${browserRun.stderr || ''}`;
const browserLogPath = path.join(out, 'S03-scope-lifecycle-browser-current-20261007.log');
fs.writeFileSync(browserLogPath, browserOutput, 'utf8');
assert(browserRun.status === 0 && /12 passed/.test(browserOutput), `Scope/lifecycle browser scenarios failed (exit=${browserRun.status}):\n${browserOutput.slice(-16000)}`);

const draftLogPath = path.join(out, 'S03-dirty-drafts-current-20261007.log');
fs.writeFileSync(draftLogPath, draftOutput, 'utf8');
const unitLogPath = path.join(out, 'S03-unit-current-20261007.log');
fs.writeFileSync(unitLogPath, unitOutput, 'utf8');

const client = read(path.join(fe, 'apps/web/src/shared/api/client.ts'));
const shell = read(path.join(fe, 'apps/web/src/app/Shell.tsx'));
const session = read(path.join(fe, 'apps/web/src/app/SessionProvider.tsx'));
const events = read(path.join(fe, 'apps/web/src/app/ScopeEvents.tsx'));
const drafts = read(path.join(fe, 'apps/web/src/shared/model/dirty-drafts.ts'));
const sourceWithoutCopy = [client, shell, session, events, drafts].join('\n');
const webStorageCalls = /\b(?:window\.)?(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem|clear)\s*\(/.test(sourceWithoutCopy);
assert(!webStorageCalls, 'Session data or credentials are persisted through browser web-storage APIs.');
assert(client.includes('scopeEpoch += 1') && client.includes('for (const controller of activeRequests)') && client.includes('controller.abort()'), 'Shop/session changes do not abort active API requests.');
assert(shell.includes("cache.cancelQueries({ queryKey: ['scope'] })") && shell.includes("cache.removeQueries({ queryKey: ['scope'] })"), 'Shop cleanup does not cancel and remove old scope queries.');
assert(events.includes("if (payload.type === 'session.revoked')") && events.includes('stream.close()') && events.includes('return () => { live = false; stream.close(); }'), 'Revoked-session or effect cleanup does not close the live event stream.');
assert(session.includes('await request(\'logout\')') && session.includes('cache.clear();') && session.indexOf('await request(\'logout\')') < session.indexOf('cache.clear();'), 'Logout clears the session cache before the logout request is confirmed.');
assert(shell.includes('hasUnsavedFormDraft()') && shell.includes('blocker.state === \'blocked\' || logoutPending') && shell.includes('Chưa xác minh được đăng xuất'), 'Shop navigation/logout does not retain and guard unsaved drafts.');
assert(drafts.includes('captureDraftBaseline') && drafts.includes('markDraftClean') && drafts.includes('setDraftDirty'), 'Dirty-draft baseline or controlled-dialog marker is missing.');

const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md',
  'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx', 'apps/web/src/app/ScopeEvents.tsx', 'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/model/dirty-drafts.ts', 'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/api/hooks.ts',
  'tests/frontend.spec.ts', 'tests/session/session-revocation.spec.ts', 'tests/session/demo-server.mjs', 'tests/session/dirty-drafts.check.mjs', 'tests/ui009-scope-regression.spec.ts', 'tests/session/demo-server-cache-isolation.spec.ts',
];
const kitSources = [
  'execution/frontend-plan.json', 'execution/frontend-command-map.json',
  'execution/frontend-evidence/FE008/S05-isolation-current-20261007.json',
  'execution/frontend-evidence/FE008/S05-isolation-current-20261007.log',
  'execution/frontend-evidence/FE007/capture-s03-scope-lifecycle-current-20261007.mjs',
  'execution/frontend-evidence/FE007/S03-unit-current-20261007.log',
  'execution/frontend-evidence/FE007/S03-dirty-drafts-current-20261007.log',
  'execution/frontend-evidence/FE007/S03-scope-lifecycle-browser-current-20261007.log',
];
const sourceFiles = [...sourcePaths.map(item => path.join(fe, item)), ...kitSources.map(item => path.join(kit, item))]
  .map(file => ({ path: relSource(file), sha256: sha(fs.readFileSync(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const git = args => { const result = run('git', args, { cwd: repo }); return result.status === 0 ? result.stdout.trim() : 'unavailable'; };
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';
const checks = [
  'registered current unit tests pass',
  'dirty-draft guard unit tests pass 4/4',
  'shop switch cancels delayed old-shop request and prevents stale-shop data in both browsers',
  'deep link survives refresh and successful logout clears the mock session in both browsers',
  'logout draft confirmation preserves input; failed logout retains current session and input in both browsers',
  'session.revoked SSE refreshes to 401, navigates to login and closes the stream in both browsers',
  'scope cleanup closes prior-shop event streams and concurrent demo servers remain isolated in both browsers',
  'request cancellation increments scope epoch and aborts outstanding API controllers',
  'no localStorage/sessionStorage API calls persist credentials or session state',
];
const auditPath = path.join(out, 'S03-scope-lifecycle-audit-current-20261007.json');
const audit = {
  executedAt,
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  outcomes: { registeredUnit: 'PASS', dirtyDraftUnit: '4/4 PASS', targetedBrowser: '12/12 PASS across Chromium and Firefox', supportingFE008Isolation: '4/4 PASS across Chromium and Firefox' },
  lifecycle: {
    shopChange: 'Shell cleanup aborts all active API controllers, increments scope epoch, cancels/removes scope queries, and uses user/shop/permissionVersion query identity.',
    stream: 'ScopeEvents closes EventSource on session.revoked and on effect cleanup; browser test confirmed revoked SSE triggers session refresh and login redirect. React StrictMode can start up to two initial dev connections, and the test bounds that replay.',
    logout: 'Successful logout waits for API confirmation before clearing cache; failed logout leaves session and typed draft visible.',
    drafts: 'Dirty forms/dialogs block navigation and logout until the user decides; successful submission rebases the baseline.',
    credentials: { browserStorageApiCalls: false, csrfToken: 'Held in module memory; cleared on logout/session failure.' },
  },
  diagnostics: 'Initial SSE test fixture returned 401 on a background session refresh before the event was delivered. The fixture was corrected to keep the synthetic session valid until the gated session.revoked event, then return 401; both browser runs passed. No product code change was needed for this fixture-order issue.',
  limits: 'Session, membership, shops, API and event responses are synthetic/local. Backend session revocation delivery, server-side authorization, OIDC, and production behavior remain unverified.',
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

const logPath = path.join(out, 'S03-scope-lifecycle-current-20261007.log');
const logText = [
  'FE007.S03 shop/session/logout/revocation lifecycle evidence',
  `executedAt=${executedAt}`,
  `cwd=${fe}`,
  `registered commandId=${unit.id}; command=${unit.command}; exitCode=${unitRun.status}`,
  unitOutput.trimEnd(),
  `dirty draft command=${draftCommand}; exitCode=${draftRun.status}; pass=4`,
  `browser command=${browserCommand}; exitCode=${browserRun.status}; pass=12 across Chromium/Firefox`,
  'Cases: delayed old-shop request cannot leak; page deep-link survives reload; logout clears session after success; failed logout preserves typed draft/session; session.revoked SSE closes stream and sends app to login; concurrent demo servers have separate caches.',
  'Code inspection: cancelScopeRequests increments epoch and aborts controllers; Shell cancels/removes scope queries; ScopeEvents closes prior stream; no localStorage/sessionStorage API calls found for credentials.',
  audit.diagnostics,
  'Data is synthetic/local frontend evidence; no backend/provider/production integration claim.',
  `checks=${checks.length}; failed=0`,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
  reviewer,
].join('\n') + '\n';
fs.writeFileSync(logPath, logText, 'utf8');

const evidencePath = path.join(out, 'S03-scope-lifecycle-current-20261007.json');
const evidence = {
  taskId: 'FE007', stepId: 'S03', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt, sourceRevision: `HEAD ${git(['rev-parse', '--short', 'HEAD'])} on ${git(['branch', '--show-current'])} plus current frontend working tree`,
  expected: 'Shop switch, logout and revoked sessions cancel stale requests/streams; no prior-shop data crosses scope; logout and navigation preserve dirty drafts until confirmed; credentials are not stored in web storage.',
  observed: 'Registered unit suite and four dirty-draft unit cases passed. Twelve targeted Chromium/Firefox cases passed, covering shop switch races, old-shop response isolation, deep-link reload, logout success/failure with dirty draft preservation, and session.revoked SSE with stream closure and login redirect. Current code increments the request-scope epoch, aborts outstanding requests, removes scoped cache, and closes EventSource on scope change.',
  commandId: unit.id, command: unit.command, cwd: fe, reviewer,
  environment: { name: `Windows Node ${process.versions.node} / npm / Playwright Chromium+Firefox`, details: 'Registered Vitest ran in the frontend workspace. Playwright used local Vite servers with synthetic session/shop/event responses and MSW demo fixtures; current target test files are fingerprinted. No external service was contacted.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, checks, sourceFiles, sourceSnapshotSha256,
  logFile: relKit(logPath), logSha256: sha(Buffer.from(logText)),
  commandResults: [
    { commandId: unit.id, command: unit.command, exitCode: 0, logFile: relKit(unitLogPath), logSha256: sha(fs.readFileSync(unitLogPath)) },
    { commandId: 'supplemental-dirty-draft-unit', command: draftCommand, exitCode: 0, testsPassed: 4, logFile: relKit(draftLogPath), logSha256: sha(fs.readFileSync(draftLogPath)) },
    { commandId: 'supplemental-current-app-scope-lifecycle', command: browserCommand, exitCode: 0, testsPassed: 12, projects: ['chromium', 'firefox'], logFile: relKit(browserLogPath), logSha256: sha(fs.readFileSync(browserLogPath)) },
  ],
  audit,
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ result: 'PASS', evidence: relKit(evidencePath), unitSummary: unitOutput.split(/\r?\n/).filter(line => /Tests\s+\d+ passed/.test(line)).at(-1), dirtyDraftTests: 4, browserTests: 12, browserProjects: 2, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));
