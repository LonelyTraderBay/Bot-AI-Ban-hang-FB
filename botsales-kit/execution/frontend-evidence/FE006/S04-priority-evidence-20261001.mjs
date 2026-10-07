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
  'botsales-kit/execution/frontend-evidence/FE006/S04-browser-audit.json',
  'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-priority-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual.json',
  'botsales-kit/execution/frontend-evidence/FE006/S04-dashboard-1440.png',
  'botsales-kit/execution/frontend-evidence/FE006/S04-dashboard-320.png',
  'botsales-kit/execution/frontend-evidence/FE006/S04-dashboard-390.png',
  'botsales-kit/execution/frontend-evidence/FE006/S04-dashboard-768.png',
  'botsales-kit/execution/frontend-evidence/FE006/S04-priority-browser-components-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE006/S04-visual-review-priority-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE006/S04-visual-review.json',
  'botsales-kit/execution/frontend-evidence/FE006/S04-visual-review.mjs',
  'package-lock.json',
  'package.json',
  'packages/design-tokens/src/index.ts',
  'packages/design-tokens/src/tokens.json',
  'tests/design/browser-audit.mjs',
  'tests/design/manual-contrast.mjs',
  'tests/design/palette-guard.mjs',
  'tests/design/run-browser-audit.mjs',
].sort();
const sourceFiles = files.map(file => ({
  path: file,
  sha256: sha256(fs.readFileSync(path.join(repo, file))),
}));
const logFile = 'execution/frontend-evidence/FE006/S04-priority-browser-components-20261001.log';
const logSha256 = sha256(fs.readFileSync(path.join(kit, logFile)));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const contrastReportPath = path.join(evidenceDir, 'S04-contrast-manual.json');
const contrastReport = JSON.parse(fs.readFileSync(contrastReportPath, 'utf8'));
const contrastLogFile = 'execution/frontend-evidence/FE006/S04-contrast-manual-priority-20261001.log';
const evidence = {
  taskId: 'FE006',
  stepId: 'S04',
  kind: 'test_run',
  result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: 'current HEAD plus dirty working tree; hashes below identify the tested files and rendered artifacts',
  expected: 'Review the actual React dashboard at 320/390/768/1440 CSS px, inspect selected contrast cases and preserve current screenshots and accessibility limits.',
  observed: 'Fresh Vitest passed 66/66 across 7 files; its embedded Chromium audit rendered the React demo and wrote current 320/390/768/1440px screenshots and browser report. All viewport widths remained within the page; the 320px table scrolls in its named region. Focus/forced-colors/reduced-motion assertions passed; axe reported zero violations in app/main while color-contrast remains incomplete. Rendered-DOM contrast measured 76 visible text samples with zero failures and a 6.31:1 minimum; ten canonical token pairs had a 5.77:1 minimum and the control border measured 4.75:1. Codex visually inspected the current 320px and 1440px screenshots and found no obvious clipping. This is one dashboard route and selected contrast evidence, not whole-app WCAG certification or full keyboard/screen-reader UAT.',
  command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test',
  commandId: 'unit',
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`,
    details: 'Root frontend workspace; BOTSALES_DESIGN_EVIDENCE_DIR targeted current screenshots/reports; React demo and contrast audit use deterministic synthetic mock data; no backend/provider connection.',
    dataSource: 'synthetic-msw',
  },
  checksTotal: 8,
  failed: 0,
  logFile,
  logSha256,
  sourceFiles,
  sourceSnapshotSha256,
  supplementaryEvidence: [{
    command: "& 'C:\\Program Files\\nodejs\\node.exe' tests/design/manual-contrast.mjs",
    logFile: contrastLogFile,
    logSha256: sha256(fs.readFileSync(path.join(kit, contrastLogFile))),
    checksTotal: contrastReport.sampleCount,
    failed: contrastReport.failedCount,
    report: 'execution/frontend-evidence/FE006/S04-contrast-manual.json',
  }],
};
const evidencePath = path.join(evidenceDir, 'S04-priority-refresh-20261001.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidencePath: path.relative(repo, evidencePath), sourceFiles: sourceFiles.length, sourceSnapshotSha256, logSha256, contrastSamples: contrastReport.sampleCount, contrastFailures: contrastReport.failedCount }, null, 2));
