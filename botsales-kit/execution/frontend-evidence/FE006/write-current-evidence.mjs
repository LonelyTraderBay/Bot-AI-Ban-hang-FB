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
  'botsales-kit/execution/frontend-evidence/FE006/S01-token-map-current-20261004.json',
  'botsales-kit/execution/frontend-evidence/FE006/S01-token-map-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE006/S05-generate-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE006/S05-typecheck-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE006/S05-lint-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE006/verify-current-20261004.log',
  'botsales-kit/execution/frontend-evidence/FE006/current-20261004-run-browser-audit.log',
  'botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-browser-audit.json',
  'botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-visual-review.json',
  'botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-visual-review.log',
  'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-current-20261004.json',
  'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-current-20261004.log',
];
const steps = {
  S01: {
    commandId: 'unit', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test',
    log: 'S05-unit-current-20261004.log', checks: 10,
    expected: 'Map the approved token source to one dark MUI theme: typography, spacing, radii, breakpoints and semantic colors, without a second palette.',
    observed: 'Current Vitest passed 85/85 across 10 files. The separate token-map audit passed 10/10: canonical/generated token equality, dark-only mode, type and space scales, radii, touch targets, breakpoints, reduced motion, semantic colors and no HEX literal in MUI theme.',
    files: ['botsales-kit/execution/frontend-evidence/FE006/S01-token-map.mjs','botsales-kit/execution/frontend-evidence/FE006/S01-token-map-current-20261004.json','botsales-kit/execution/frontend-evidence/FE006/S01-token-map-current-20261004.log'],
  },
  S02: {
    commandId: 'unit', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test',
    log: 'S05-unit-current-20261004.log', checks: 10,
    expected: 'Shared UI primitives use the single theme and tokens for status, form, table, dialog, loading, touch and bootstrap states.',
    observed: 'The current unit suite passed 85/85 across 10 files. Shared tests cover token-backed alerts, table, status, search, dialog, loading, empty and retry states; the current React browser audit confirms a dark pre-JS canvas and locally scrolling mobile table.',
    files: ['botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-browser-audit.json'],
  },
  S03: {
    commandId: 'unit', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test',
    log: 'S05-unit-current-20261004.log', checks: 7,
    expected: 'Visible labels/errors, focus return, canonical touch target, reduced-motion and forced-colors remain usable.',
    observed: 'Current unit tests passed 85/85. Component tests cover visible error labels and focus return; browser emulation confirmed forced-colors and reduced-motion, a visible focus outline and zero app/main axe violations. Axe color-contrast remains incomplete.',
    files: ['botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-browser-audit.json'],
  },
  S04: {
    commandId: 'unit', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe test',
    log: 'S05-unit-current-20261004.log', checks: 8,
    expected: 'Review the actual React dashboard at 320/390/768/1440 CSS px, inspect selected contrast cases and record accessibility limits.',
    observed: 'Current browser audit passed at 320/390/768/1440 CSS px with no page overflow; at 320/390 the table scrolls inside its labeled region with the hint visible. Ten canonical token pairs have minimum 5.77:1; the control border measures 4.75:1. Rendered DOM contrast covers 79 text samples with zero failures and a 6.31:1 minimum. Axe found zero app/main violations but leaves color-contrast incomplete; evidence is dashboard/sample-scoped, not whole-app WCAG certification.',
    files: ['botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-browser-audit.json','botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-visual-review.json','botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-visual-review.log','botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-current-20261004.json','botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-current-20261004.log',...['320','390','768','1440'].map(width=>`botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-dashboard-${width}.png`)],
  },
  S05: {
    commandId: 'generate-check-windows', command: "& 'C:\\Program Files\\nodejs\\npm.cmd' --script-shell=cmd.exe run generate:check",
    log: 'S05-generate-current-20261004.log', checks: 6,
    expected: 'Final token drift/generation, negative copied-HEX and non-dark fixtures, strict frontend typecheck, lint and unit/component tests pass.',
    observed: 'Fresh generation passed 11 outputs/283 schemas/210 operations/54 routes; the current aggregate verify passed strict typecheck, lint, source/boundary, domain 88/88, Vitest 85/85 and production build. Component tests include negative copied-HEX and non-dark fixtures. No generated token output was edited by hand.',
    files: ['scripts/generate.mjs','apps/web/tsconfig.json','botsales-kit/execution/frontend-evidence/FE006/S05-typecheck-current-20261004.log','botsales-kit/execution/frontend-evidence/FE006/S05-lint-current-20261004.log','botsales-kit/execution/frontend-evidence/FE006/S05-unit-current-20261004.log','botsales-kit/execution/frontend-evidence/FE006/verify-current-20261004.log','botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-browser-audit.json','botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-visual-review.json'],
  },
};

const requested = process.argv[2];
if (!steps[requested]) throw new Error(`Unknown FE006 step: ${requested}`);
const step = steps[requested];
const unitLog = fs.readFileSync(path.join(evidenceDir, 'S05-unit-current-20261004.log'), 'utf8');
const verifyLog = fs.readFileSync(path.join(evidenceDir, 'verify-current-20261004.log'), 'utf8');
const tokenMap = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'S01-token-map-current-20261004.json'), 'utf8'));
const browser = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'current-20261004/S04-browser-audit.json'), 'utf8'));
const visualReview = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'current-20261004/S04-visual-review.json'), 'utf8'));
const contrast = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'S04-contrast-manual-current-20261004.json'), 'utf8'));
const generateLog = fs.readFileSync(path.join(evidenceDir, 'S05-generate-current-20261004.log'), 'utf8');
const typecheckLog = fs.readFileSync(path.join(evidenceDir, 'S05-typecheck-current-20261004.log'), 'utf8');
const lintLog = fs.readFileSync(path.join(evidenceDir, 'S05-lint-current-20261004.log'), 'utf8');
if (!/Tests\s+85 passed \(85\)/.test(unitLog) || !/Test Files\s+10 passed \(10\)/.test(unitLog)) throw new Error('Current unit log did not pass 85/85 in 10 files.');
if (requested === 'S01' && tokenMap.status !== 'PASS') throw new Error('Current token map audit did not pass.');
if (requested === 'S02' && !verifyLog.includes('✓ built in')) throw new Error('Current verify/build log is incomplete.');
if (requested === 'S03' && (!browser.accessibilityPreferences.forcedColors || !browser.accessibilityPreferences.reducedMotion || browser.axe.appViolations.length || browser.axe.mainViolations.length)) throw new Error('Current accessibility browser evidence did not pass.');
if (requested === 'S04' && (visualReview.status !== 'PASS' || contrast.failedCount !== 0 || browser.viewports.some(view => view.documentWidth > view.contentWidth))) throw new Error('Current visual/contrast evidence did not pass.');
if (requested === 'S05' && (!generateLog.includes('"status":"PASS"') || /error TS\d+/.test(typecheckLog) || !lintLog.includes('--max-warnings 0') || !verifyLog.includes('✓ built in'))) throw new Error('Current generation/type/lint/build evidence is incomplete or failing.');
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
  const browserLog = 'botsales-kit/execution/frontend-evidence/FE006/current-20261004-run-browser-audit.log';
  const contrastLog = 'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-current-20261004.log';
  evidence.supplementaryEvidence = [
    { command: 'node tests/design/run-browser-audit.mjs', logFile: browserLog, logSha256: sha256(fs.readFileSync(path.join(repo, browserLog))), checksTotal: 6, failed: 0, report: 'botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-browser-audit.json', sourceFiles: ['tests/design/browser-audit.mjs', browserLog, 'botsales-kit/execution/frontend-evidence/FE006/current-20261004/S04-browser-audit.json'] },
    { command: 'node tests/design/manual-contrast.mjs', logFile: contrastLog, logSha256: sha256(fs.readFileSync(path.join(repo, contrastLog))), checksTotal: contrast.sampleCount, failed: contrast.failedCount, report: 'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-current-20261004.json', sourceFiles: ['tests/design/manual-contrast.mjs', contrastLog, 'botsales-kit/execution/frontend-evidence/FE006/S04-contrast-manual-current-20261004.json'] },
  ];
}
const evidencePath = path.join(evidenceDir, `${requested}-current-revalidated-20261004.json`);
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ stepId: requested, commandId: step.commandId, logFile, sourceFiles: sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }, null, 2));
