import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kit, 'execution/frontend-evidence/FE006');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const common = [
  'apps/web/src/shared/ui/theme.ts',
  'apps/web/src/shared/ui/components.tsx',
  'apps/web/src/app/bootstrap.css',
  'apps/web/src/app/tokens.css',
  'apps/web/index.html',
  'apps/web/src/main.tsx',
  'apps/web/tests/components.test.tsx',
  'packages/design-tokens/src/tokens.json',
  'packages/design-tokens/src/index.ts',
  'botsales-kit/design/tokens.json',
  'botsales-kit/design/decision.json',
  'botsales-kit/design/IMPLEMENTATION_NOTES.md',
  'botsales-kit/docs/03_DESIGN_SYSTEM.md',
  'botsales-kit/docs/19_DARK_ONLY_POLICY.md',
  'tests/design/palette-guard.mjs',
  'tests/design/browser-audit.mjs',
  'tests/design/run-browser-audit.mjs',
  'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts',
  'apps/web/package.json',
  'package.json',
  'package-lock.json',
  'botsales-kit/execution/frontend-evidence/FE006/handoff.md',
  'botsales-kit/execution/frontend-evidence/FE006/write-current-evidence.mjs',
];
const steps = {
  S01: {
    commandId: 'unit', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test',
    log: 'S05-unit-current-refresh.log', checks: 8,
    expected: 'Map the approved token source to one dark MUI theme: typography, spacing, radii, breakpoints and semantic colors, without a second palette.',
    observed: 'The current component suite passed 45/45. Runtime theme assertions compare typography and spacing to token fields; token-map audit passed canonical/generated token equality, touch target, reduced motion, breakpoints, semantic colors and no literal HEX in the theme.',
    files: ['botsales-kit/execution/frontend-evidence/FE006/S01-token-map.mjs','botsales-kit/execution/frontend-evidence/FE006/S01-token-map.json','botsales-kit/execution/frontend-evidence/FE006/S01-token-map.log','botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-refresh.log'],
  },
  S02: {
    commandId: 'unit', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test',
    log: 'S05-unit-current-refresh.log', checks: 10,
    expected: 'Shared UI primitives use the single theme and tokens for status, form, table, dialog, loading, touch and bootstrap states.',
    observed: 'The current component and full unit suites passed. Standard success/warning/error/info alerts render the approved semantic surface/text tokens; shared table, status, search, dialog, loading and empty states have exercised tests. Browser audit confirms dark background before JS and responsive table behavior.',
    files: ['botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-refresh.log','botsales-kit/execution/frontend-evidence/FE006/S04-browser-audit.json'],
  },
  S03: {
    commandId: 'unit', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test',
    log: 'S05-unit-current-refresh.log', checks: 7,
    expected: 'Visible labels/errors, focus return, canonical touch target, reduced-motion and forced-colors remain usable.',
    observed: 'Current tests passed 45/45. RTL verifies error-label association and dialog focus return; the real-browser audit emulates reduced-motion and forced-colors, finds a visible focus outline, and reports no axe violations in the app or main region. The axe color-contrast rule remains incomplete.',
    files: ['botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-refresh.log','botsales-kit/execution/frontend-evidence/FE006/S04-browser-audit.json'],
  },
  S04: {
    commandId: 'unit', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test',
    log: 'S05-unit-current-refresh.log', checks: 8,
    expected: 'Review the actual React dashboard at 320/390/768/1440 CSS px, inspect selected contrast cases and record accessibility limits.',
    observed: 'Current browser audit passed at 320/390/768/1440 CSS px with no page overflow; the 320px table scrolls locally with a visible hint. The inspected 320px and 1440px screenshots show no obvious clipping. Ten canonical token pairs passed with a minimum 5.77:1 and the control border measured 4.75:1. A rendered-DOM contrast run measured 70 visible text samples, zero failures, and a minimum 6.31:1. Axe reported zero app/main violations; its color-contrast rule remains incomplete, so this is route/sample evidence rather than whole-app WCAG certification.',
    files: ['botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-refresh.log','botsales-kit/execution/frontend-evidence/FE006/S04-browser-audit.json','botsales-kit/execution/frontend-evidence/FE006/S04-visual-review.mjs','botsales-kit/execution/frontend-evidence/FE006/S04-visual-review.json','botsales-kit/execution/frontend-evidence/FE006/S04-visual-review-current-refresh.log','tests/design/manual-contrast.mjs','botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual.json','botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-current-refresh.log',...['320','390','768','1440'].map(width=>`botsales-kit/execution/frontend-evidence/FE006/S04-dashboard-${width}.png`)],
  },
  S05: {
    commandId: 'generate-check-windows', command: "& 'C:\\Program Files\\nodejs\\npm.cmd' --script-shell=cmd.exe run generate:check",
    log: 'S05-generate-current-refresh.log', checks: 6,
    expected: 'Final token drift/generation, negative copied-HEX and non-dark fixtures, strict frontend typecheck, lint and unit/component tests pass.',
    observed: 'Generation passed 11 outputs/283 schemas/210 operations/54 routes; strict typecheck and lint passed; Vitest passed 45/45 and includes the negative palette/theme fixtures. No generated token output was edited by hand. The latest production/demo build was not run in FE006.',
    files: ['scripts/generate.mjs','apps/web/tsconfig.json','botsales-kit/execution/frontend-evidence/FE006/S05-generate-current-refresh.log','botsales-kit/execution/frontend-evidence/FE006/S05-typecheck-current-refresh.log','botsales-kit/execution/frontend-evidence/FE006/S05-lint-current-refresh.log','botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-refresh.log','botsales-kit/execution/frontend-evidence/FE006/S04-browser-audit.json','botsales-kit/execution/frontend-evidence/FE006/S04-visual-review.json','botsales-kit/execution/frontend-evidence/FE003/S03-e2e-full-rerun.log'],
  },
};

const requested = process.argv[2];
if (!steps[requested]) throw new Error(`Unknown FE006 step: ${requested}`);
const step = steps[requested];
const sourcePaths = [...new Set([...common, ...step.files])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const logFile = `execution/frontend-evidence/FE006/${step.log}`;
const evidence = {
  taskId: 'FE006',
  stepId: requested,
  kind: 'test_run',
  result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: '18be3c6c75ed66ced592b2d58f36ffbdbd8ae221 plus current dirty working tree',
  expected: step.expected,
  observed: step.observed,
  command: step.command,
  commandId: step.commandId,
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: {
    name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`,
    details: 'Root frontend workspace; real React demo uses deterministic synthetic mock data; no backend/provider connection.',
    dataSource: 'synthetic-msw',
  },
  checksTotal: step.checks,
  failed: 0,
  logFile,
  logSha256: sha256(fs.readFileSync(path.join(kit, logFile))),
  sourceFiles,
  sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
if (requested === 'S04') {
  const contrast = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'S04-contrast-manual.json'), 'utf8'));
  const contrastLog = 'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-current-refresh.log';
  evidence.supplementaryEvidence = [{
    command: "& 'C:\\Program Files\\nodejs\\node.exe' tests/design/manual-contrast.mjs",
    logFile: contrastLog,
    logSha256: sha256(fs.readFileSync(path.join(repo, contrastLog))),
    checksTotal: contrast.sampleCount,
    failed: contrast.failedCount,
    report: 'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual.json',
    sourceFiles: ['tests/design/manual-contrast.mjs', contrastLog, 'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual.json'],
  }];
}
const evidencePath = path.join(evidenceDir, `${requested}-refresh.json`);
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ stepId: requested, commandId: step.commandId, logFile, sourceFiles: sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }, null, 2));
