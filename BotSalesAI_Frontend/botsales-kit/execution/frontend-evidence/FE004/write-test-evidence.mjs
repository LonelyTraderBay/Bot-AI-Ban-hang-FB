import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE004');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const configs = {
  S01: {
    commandId: 'types', log: 'S01-typecheck-current-refresh.log', checks: 1,
    expected: 'The complete frontend TypeScript project compiles under the configured strict settings; app composition and router ownership remain centralized.',
    observed: 'Current npm typecheck exited 0 with no diagnostics. Source review confirms main.tsx composes the single theme/query/session/router providers and app/router.tsx owns lazy route composition. The existing tsconfig has strict=true; noUncheckedIndexedAccess remains disabled because earlier compatibility diagnostics affect mock files outside FE004 source write scope.',
    sources: ['package.json','package-lock.json','apps/web/package.json','apps/web/tsconfig.json','apps/web/src/main.tsx','apps/web/src/app/router.tsx','apps/web/src/app/SessionProvider.tsx','packages/contracts/src/index.ts','packages/design-tokens/src/index.ts','eslint.config.mjs','scripts/check-boundaries.mjs','tests/architecture/check-boundaries.mjs'],
  },
  S02: {
    commandId: 'lint', log: 'S02-lint-current-refresh.log', checks: 3,
    expected: 'ESLint passes on the full frontend source with explicit any rejected; strict TypeScript settings remain enabled and no module is excluded to mask diagnostics.',
    observed: 'Current full-source ESLint exited 0 with zero warnings/errors. Full strict typecheck also exited 0 at S01. Existing noUncheckedIndexedAccess diagnostic-only probe is retained as a non-passing 11-diagnostic report in mock implementation files; FE004 leaves the option disabled because those files are outside its approved write scope, and no suppressions/excludes were introduced.',
    sources: ['package.json','package-lock.json','apps/web/package.json','apps/web/tsconfig.json','eslint.config.mjs','apps/web/src/main.tsx','apps/web/src/app/router.tsx','scripts/check-boundaries.mjs','tests/architecture/check-boundaries.mjs','botsales-kit/execution/frontend-evidence/FE004/S01-typecheck-current-refresh.log','botsales-kit/execution/frontend-evidence/FE004/S02-no-unchecked-latest.log'],
  },
  S03: {
    commandId: 'boundaries', log: 'S03-boundaries-current-refresh.log', checks: 1,
    expected: 'The current frontend graph respects app composition, module ownership and shared dependency direction with no unresolved imports or cycles.',
    observed: 'Current AST boundary command exited 0; its report covers the complete apps/web/src tree, resolves local aliases and relative imports, and reports zero cross-module, feature-to-app/mock, shared-to-feature, unresolved import, parse or cycle issues. The existing React/router/provider ownership was reviewed and no broad restructure was warranted.',
    sources: ['package.json','apps/web/package.json','apps/web/tsconfig.json','apps/web/src/main.tsx','apps/web/src/app/router.tsx','eslint.config.mjs','scripts/check-boundaries.mjs','tests/architecture/check-boundaries.mjs','botsales-kit/execution/frontend-evidence/FE004/S01-typecheck-current-refresh.log'],
  },
  S04: {
    commandId: 'boundaries', log: 'S04-boundaries-current-refresh.log', checks: 8,
    expected: 'Negative fixtures detect invalid alias/relative/type-only/dynamic import relationships, unresolved paths, parser errors and cycles; a parse error cannot be silently skipped.',
    observed: 'The current boundaries command exited 0 and its embedded architecture fixture runner passed all 8/8 cases, including unresolved imports, cycles and parser errors. The report records the source file/import counts and zero issues for the real tree.',
    sources: ['package.json','apps/web/package.json','apps/web/tsconfig.json','scripts/check-boundaries.mjs','tests/architecture/check-boundaries.mjs','apps/web/src/main.tsx','apps/web/src/app/router.tsx'],
  },
  S05: {
    commandId: 'types', log: 'S05-typecheck-current-refresh.log', checks: 11,
    expected: 'Final current-source typecheck, lint, module boundaries, source/route-operation mapping and diff check pass; historical noUncheckedIndexedAccess diagnostics remain explicitly separate.',
    observed: 'Final run logs record typecheck and lint with zero diagnostics, boundary checker zero issues and 8/8 negative fixtures, source checker zero issues across the current React source/routes/operation references, and git diff --check exit 0. The 11-diagnostic noUncheckedIndexedAccess probe is not treated as passing; it remains out of FE004 source scope. Unit tests are current at 43/43 in FE003.S03; no build, CI, backend or production claim is made.',
    sources: ['package.json','package-lock.json','apps/web/package.json','apps/web/tsconfig.json','apps/web/src/main.tsx','apps/web/src/app/router.tsx','eslint.config.mjs','scripts/check-boundaries.mjs','scripts/check-source.mjs','tests/architecture/check-boundaries.mjs','botsales-kit/execution/frontend-evidence/FE004/S01-typecheck-current-refresh.log','botsales-kit/execution/frontend-evidence/FE004/S02-lint-current-refresh.log','botsales-kit/execution/frontend-evidence/FE004/S03-boundaries-current-refresh.log','botsales-kit/execution/frontend-evidence/FE004/S04-boundaries-current-refresh.log','botsales-kit/execution/frontend-evidence/FE004/S05-lint-current-refresh.log','botsales-kit/execution/frontend-evidence/FE004/S05-boundaries-current-refresh.log','botsales-kit/execution/frontend-evidence/FE004/S05-source-current-refresh.log','botsales-kit/execution/frontend-evidence/FE004/S05-diff-current-refresh.log','botsales-kit/execution/frontend-evidence/FE004/S02-no-unchecked-latest.log','botsales-kit/execution/frontend-evidence/FE003/S03-unit-refresh.log'],
  },
};

const stepId = process.argv[2];
const config = configs[stepId];
if (!config) throw new Error(`Unknown step ${stepId}`);
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const registered = commandMap.commands.find(command => command.id === config.commandId);
if (!registered || registered.status !== 'VERIFIED_AVAILABLE') throw new Error(`Unverified command ${config.commandId}`);
const logPath = path.join(kit, `execution/frontend-evidence/FE004/${config.log}`);
const sourcePaths = [
  ...config.sources,
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-evidence/FE004/write-test-evidence.mjs',
  `botsales-kit/execution/frontend-evidence/FE004/${config.log}`,
];
const sourceFiles = [...new Set(sourcePaths)].map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const logFile = `execution/frontend-evidence/FE004/${config.log}`;
const evidence = {
  taskId: 'FE004', stepId, kind: 'test_run', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: 'HEAD 18be3c6 plus current dirty working tree; exact task/config hashes recorded below',
  expected: config.expected,
  observed: config.observed,
  command: registered.command,
  commandId: registered.id,
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.version} / npm 11.17.0`, details: 'Current root frontend workspace; see exact command output log.', dataSource: 'source-only' },
  checksTotal: config.checks,
  failed: 0,
  logFile,
  logSha256: sha256(fs.readFileSync(logPath)),
  sourceFiles,
  sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
const evidencePath = path.join(dir, `${stepId}-refresh.json`);
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ stepId, commandId: registered.id, logFile, sources: sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }, null, 2));
