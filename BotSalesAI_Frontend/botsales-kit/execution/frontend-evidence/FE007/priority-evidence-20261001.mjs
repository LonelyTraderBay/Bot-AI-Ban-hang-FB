import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE007');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = file => sha256(fs.readFileSync(path.join(repo, file)));
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = id => {
  const entry = commandMap.commands.find(item => item.id === id);
  if (!entry || entry.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${id} is not registered as VERIFIED_AVAILABLE`);
  return entry.command;
};
const revisionResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' });
if (revisionResult.status !== 0) throw new Error('Cannot resolve current Git HEAD');
const revision = revisionResult.stdout.trim();
const e2ePath = 'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log';
const unitPath = 'botsales-kit/execution/frontend-evidence/FE007/unit-rerun-current-20261001.log';
const helperPath = 'botsales-kit/execution/frontend-evidence/FE007/dirty-draft-rerun-current-20261001.log';
const e2eText = fs.readFileSync(path.join(repo, e2ePath), 'utf8');
const unitText = fs.readFileSync(path.join(repo, unitPath), 'utf8');
const helperText = fs.readFileSync(path.join(repo, helperPath), 'utf8');
const e2eTotal = Number(e2eText.match(/\n\s*(\d+) passed \(/)?.[1]);
const unitTotal = Number(unitText.match(/Tests\s+(\d+) passed/)?.[1]);
const helperPass = Number(helperText.match(/ℹ pass (\d+)/)?.[1]);
const helperFail = Number(helperText.match(/ℹ fail (\d+)/)?.[1]);
if (e2eTotal !== 123 || unitTotal !== 66 || helperPass !== 4 || helperFail !== 0) {
  throw new Error(`Expected current test totals 123/66/4; observed ${e2eTotal}/${unitTotal}/${helperPass} with helper failures ${helperFail}`);
}
const productionBuildPath = 'botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log';
const demoBuildPath = 'botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log';
const artifactAuditPath = 'botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-rerun-current-20261001.log';
for (const file of [productionBuildPath, demoBuildPath]) {
  const text = fs.readFileSync(path.join(repo, file), 'utf8');
  if (!text.includes('✓ built in') || !text.includes('EXIT_CODE=0')) throw new Error(`Build evidence is not a current successful run: ${file}`);
}
const artifactAudit = fs.readFileSync(path.join(repo, artifactAuditPath), 'utf8');
if (!artifactAudit.includes('"status": "PASS"') || (artifactAudit.match(/"result": "PASS"/g) ?? []).length !== 9 || !artifactAudit.includes('EXIT_CODE=0')) {
  throw new Error('The current production/demo artifact isolation audit did not pass all nine checks.');
}
const sources = [
  'apps/web/index.html',
  'apps/web/package.json',
  'apps/web/src/main.tsx',
  'apps/web/src/app/CommandRecovery.tsx',
  'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/app/ScopeEvents.tsx',
  'apps/web/src/app/Shell.tsx',
  'apps/web/src/app/dirty-drafts.ts',
  'apps/web/src/app/navigation.ts',
  'apps/web/src/app/router.tsx',
  'apps/web/src/shared/api/client.ts',
  'apps/web/src/shared/api/errors.ts',
  'apps/web/src/shared/api/hooks.ts',
  'apps/web/src/shared/api/intents.ts',
  'apps/web/src/shared/model/auth.ts',
  'apps/web/src/shared/model/dirty-drafts.ts',
  'apps/web/src/shared/model/filters.ts',
  'apps/web/src/shared/model/scope.tsx',
  'apps/web/src/shared/ui/components.tsx',
  'apps/web/src/mocks/browser.ts',
  'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts',
  'apps/web/tests/components.test.tsx',
  'apps/web/tests/states/fe023-state.test.tsx',
  'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/docs/02_ARCHITECTURE.md',
  'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md',
  'botsales-kit/docs/09_STATE_AND_DATA_ACCESS.md',
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE007/handoff.md',
  'botsales-kit/execution/frontend-evidence/FE007/dirty-draft-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE007/unit-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/S05-priority-refresh-20261001.json',
  productionBuildPath,
  demoBuildPath,
  'botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-priority-20261001.mjs',
  artifactAuditPath,
  'tests/frontend.spec.ts',
  'tests/fe009.spec.ts',
  'tests/fe010.spec.ts',
  'tests/fe012.spec.ts',
  'tests/session/dirty-drafts.check.mjs',
  'tests/vertical-slices/fe022-flows.spec.ts',
  'tests/states/fe023.spec.ts',
  'package.json',
  'package-lock.json',
].sort();
const sharedSteps = {
  S01: {
    checksTotal: 5,
    expected: 'Canonical routes connect to the public module entries and session/scope states map loading, authentication, forbidden access and deep links.',
    observed: `The current serialized Chromium run passed ${e2eTotal}/${e2eTotal} on the React demo and synthetic MSW. It includes canonical route/feature coverage, role-specific navigation and forbidden-route messaging, deep-link refresh, session startup/error states and explicit live-mode-unavailable behavior. Router and navigation source are bound to the canonical route and permission manifests.`,
  },
  S02: {
    checksTotal: 6,
    expected: 'One router/query/theme shell scopes navigation, cache and auth mock behavior to the current principal/shop/permissions; auth errors do not masquerade as empty success.',
    observed: `The current serialized Chromium run passed ${e2eTotal}/${e2eTotal}. Role changes update visible navigation and direct-route guards; the scoped API/query hooks use principal/shop/permission-version identity; unavailable session/live mode remains an explicit error without mock fallback. All auth evidence is frontend simulation only, not OIDC or server authorization.`,
  },
  S03: {
    checksTotal: 7,
    expected: 'Shop changes, logout/revoke and route/dialog exits cancel or discard only after an explicit choice; old-scope results and credentials do not leak.',
    observed: `The current browser run passed ${e2eTotal}/${e2eTotal}, including a delayed old-shop response being discarded, logout failure retaining the session/draft, and dirty dialog/navigation state requiring an explicit decision. The current dirty-draft helper passed ${helperPass}/${helperPass}; it now tests native forms and the EditDialog dirty marker contract. Session credentials are not persisted in localStorage by the inspected source.`,
  },
  S04: {
    checksTotal: 6,
    expected: 'Shop-switch races, late responses, role denial, deep-link refresh/logout, chunk recovery and mobile navigation are exercised against mock network.',
    observed: `The current serialized Chromium run passed ${e2eTotal}/${e2eTotal}; named cases cover shop-switch cancellation, role guard, deep links after refresh, logout/draft handling, mobile menu without overflow, route chunk recovery, and live-mode-unavailable. Requests were served by synthetic MSW/local demo only.`,
  },
  S05: {
    checksTotal: 9,
    expected: 'React shell, session helper/component checks and production/demo artifact separation pass; demo is labeled synthetic and live startup does not enable mocks.',
    observed: `The current React Chromium suite passed ${e2eTotal}/${e2eTotal}; Vitest passed ${unitTotal}/${unitTotal}; dirty-draft helper passed ${helperPass}/${helperPass}. FE008 recorded current production/demo builds and a 9/9 artifact audit: production excludes the mock worker/browser runtime and demo includes them with synthetic-data labeling. The browser live-mode case reports unavailable without fallback. Build chunk-size warnings remain; no CI, backend, staging or deployment is claimed.`,
  },
};

for (const [stepId, config] of Object.entries(sharedSteps)) {
  const sourceFiles = sources.map(file => ({ path: file, sha256: hashFile(file) }));
  const logFile = 'execution/frontend-evidence/FE003/S03-e2e-current-20261001.log';
  const evidence = {
    taskId: 'FE007', stepId, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${revision} plus current dirty working tree; task sources and supporting artifacts are hashed below`,
    expected: config.expected, observed: config.observed,
    command: command('e2e'), commandId: 'e2e', cwd: repo,
    reviewer: 'Codex self-review; no independent peer review',
    environment: {
      name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`,
      details: 'Serialized full React demo browser suite with deterministic synthetic MSW; dirty-draft helper runs directly against the pure shared model. FE008 production/demo artifacts are local builds only; no live service was contacted.',
      dataSource: 'synthetic-msw',
    },
    checksTotal: config.checksTotal, failed: 0, logFile,
    logSha256: hashFile(`botsales-kit/${logFile}`), sourceFiles,
    sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
  };
  evidence.supplementaryEvidence = [
    { command: command('unit'), commandId: 'unit', logFile: 'execution/frontend-evidence/FE007/unit-rerun-current-20261001.log', logSha256: hashFile(unitPath), checksTotal: unitTotal, failed: 0 },
    { command: command('draft-helper'), commandId: 'draft-helper', logFile: 'execution/frontend-evidence/FE007/dirty-draft-rerun-current-20261001.log', logSha256: hashFile(helperPath), checksTotal: helperPass, failed: helperFail },
  ];
  if (stepId === 'S05') evidence.supplementaryEvidence.push(
    { command: command('build'), commandId: 'build', logFile: 'execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log', logSha256: hashFile(productionBuildPath), checksTotal: 1, failed: 0 },
    { command: command('build-demo'), commandId: 'build-demo', logFile: 'execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log', logSha256: hashFile(demoBuildPath), checksTotal: 1, failed: 0 },
    { command: 'node botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-priority-20261001.mjs', logFile: 'execution/frontend-evidence/FE008/S05-artifact-isolation-rerun-current-20261001.log', logSha256: hashFile(artifactAuditPath), checksTotal: 9, failed: 0 },
  );
  const output = path.join(dir, `${stepId}-priority-refresh-20261001.json`);
  fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ stepId, checksTotal: config.checksTotal, sourceFiles: sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256, logFile }, null, 2));
}
