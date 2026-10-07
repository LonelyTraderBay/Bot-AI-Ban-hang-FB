import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE006');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sources = [
  'apps/web/index.html',
  'apps/web/package.json',
  'apps/web/src/app/bootstrap.css',
  'apps/web/src/app/tokens.css',
  'apps/web/src/main.tsx',
  'apps/web/src/shared/ui/components.tsx',
  'apps/web/src/shared/ui/theme.ts',
  'apps/web/tests/components.test.tsx',
  'apps/web/tsconfig.json',
  'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts',
  'botsales-kit/design/decision.json',
  'botsales-kit/design/tokens.json',
  'botsales-kit/docs/03_DESIGN_SYSTEM.md',
  'botsales-kit/docs/19_DARK_ONLY_POLICY.md',
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE006/S04-browser-audit.json',
  'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual.json',
  'botsales-kit/execution/frontend-evidence/FE006/S05-generate-priority-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE006/S05-lint-priority-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE006/S05-typecheck-priority-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE006/S05-unit-priority-20261001.log',
  'scripts/generate.mjs',
  'package-lock.json',
  'package.json',
  'packages/design-tokens/src/index.ts',
  'packages/design-tokens/src/tokens.json',
  'tests/design/palette-guard.mjs',
  'tests/design/browser-audit.mjs',
  'tests/design/manual-contrast.mjs',
  'tests/design/run-browser-audit.mjs',
].sort();
const sourceFiles = sources.map(file => ({
  path: file,
  sha256: sha256(fs.readFileSync(path.join(repo, file))),
}));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const logFile = 'execution/frontend-evidence/FE006/S05-generate-priority-20261001.log';
const supplementary = [
  { commandId: 'types', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run typecheck', file: 'S05-typecheck-priority-20261001.log', checksTotal: 1 },
  { commandId: 'lint', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run lint', file: 'S05-lint-priority-20261001.log', checksTotal: 1 },
  { commandId: 'unit', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test', file: 'S05-unit-priority-20261001.log', checksTotal: 66 },
].map(item => ({
  commandId: item.commandId,
  command: item.command,
  logFile: `execution/frontend-evidence/FE006/${item.file}`,
  logSha256: sha256(fs.readFileSync(path.join(evidenceDir, item.file))),
  checksTotal: item.checksTotal,
  failed: 0,
}));
const evidence = {
  taskId: 'FE006',
  stepId: 'S05',
  kind: 'test_run',
  result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: 'current HEAD plus dirty working tree; hashes below identify the checked files',
  expected: 'Token drift/generation, negative copied-HEX and non-dark fixtures, strict frontend typecheck, lint and unit/component tests pass.',
  observed: 'Fresh generate:check passed 11 outputs, 283 schemas, 210 operations and 54 routes; strict TypeScript passed; ESLint passed with --max-warnings 0; Vitest passed 66/66 across 7 files. The shared UI suite includes negative fixtures rejecting copied HEX and non-dark theme modes. No generated output was edited by hand. S04 retains current React screenshots, route audit and measured contrast evidence; its known limits remain route/sample-scoped color review and incomplete axe color-contrast. No production/demo build was part of this checkpoint.',
  command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run generate:check',
  commandId: 'generate',
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`,
    details: 'Root frontend workspace; token generation and frontend unit/component checks use local source plus deterministic synthetic mock data; no backend/provider connection.',
    dataSource: 'synthetic-msw',
  },
  checksTotal: 6,
  failed: 0,
  logFile,
  logSha256: sha256(fs.readFileSync(path.join(kit, logFile))),
  sourceFiles,
  sourceSnapshotSha256,
  supplementaryEvidence: supplementary,
};
const evidencePath = path.join(evidenceDir, 'S05-priority-refresh-20261001.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidencePath: path.relative(repo, evidencePath), sourceFiles: sourceFiles.length, sourceSnapshotSha256, logSha256: evidence.logSha256, supplementary: supplementary.map(item => item.commandId) }, null, 2));
