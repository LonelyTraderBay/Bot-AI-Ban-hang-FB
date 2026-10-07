import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE006');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const files = [
  'apps/web/index.html',
  'apps/web/package.json',
  'apps/web/src/app/bootstrap.css',
  'apps/web/src/app/tokens.css',
  'apps/web/src/main.tsx',
  'apps/web/src/shared/ui/components.tsx',
  'apps/web/src/shared/ui/theme.ts',
  'apps/web/tests/components.test.tsx',
  'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts',
  'botsales-kit/design/IMPLEMENTATION_NOTES.md',
  'botsales-kit/design/decision.json',
  'botsales-kit/design/tokens.json',
  'botsales-kit/docs/03_DESIGN_SYSTEM.md',
  'botsales-kit/docs/19_DARK_ONLY_POLICY.md',
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE006/S03-accessibility-priority-20261001.log',
  'package-lock.json',
  'package.json',
  'packages/design-tokens/src/index.ts',
  'packages/design-tokens/src/tokens.json',
  'tests/design/browser-audit.mjs',
  'tests/design/palette-guard.mjs',
  'tests/design/run-browser-audit.mjs',
].sort();
const sourceFiles = files.map(file => ({
  path: file,
  sha256: sha256(fs.readFileSync(path.join(repo, file))),
}));
const logFile = 'execution/frontend-evidence/FE006/S03-accessibility-priority-20261001.log';
const logSha256 = sha256(fs.readFileSync(path.join(kit, logFile)));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const evidence = {
  taskId: 'FE006',
  stepId: 'S03',
  kind: 'test_run',
  result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: 'current HEAD plus dirty working tree; hashes below identify the tested files',
  expected: 'Visible field labels/errors, focus return, canonical touch target, keyboard operation, reduced-motion, forced-colors and narrow reflow remain usable.',
  observed: 'Fresh Vitest run passed 66/66 across 7 files, including 17 shared UI tests. RTL verifies visible label/error association, 44px token touch target, keyboard search/cursor behavior, dialog Escape and focus return. Embedded Chromium audit passed forced-colors/reduced-motion emulation, visible focus outline, and narrow reflow with no page overflow at 320 CSS px (the 400% reflow width for a 1280 CSS px reference viewport); axe found zero app/main violations, while color-contrast remains incomplete. This does not claim a full screen-reader audit or product-wide 200% text-resize UAT.',
  command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test',
  commandId: 'unit',
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`,
    details: 'Root frontend workspace; React demo and browser audit use deterministic synthetic mock data; no backend/provider connection.',
    dataSource: 'synthetic-msw',
  },
  checksTotal: 7,
  failed: 0,
  logFile,
  logSha256,
  sourceFiles,
  sourceSnapshotSha256,
};
const evidencePath = path.join(evidenceDir, 'S03-priority-refresh-20261001.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidencePath: path.relative(repo, evidencePath), sourceFiles: sourceFiles.length, sourceSnapshotSha256, logSha256 }, null, 2));
