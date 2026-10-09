import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const out = path.dirname(script);
const repo = path.resolve(out, '../../../..');
const kit = path.join(repo, 'botsales-kit');
const fe = path.join(repo, 'BotSalesAI_Frontend');
const receiptPath = path.join(out, 'S04-contrast-current-20261007.json');
const logPath = path.join(out, 'S04-contrast-current-20261007.log');
const unitLogPath = path.join(out, 'S04-unit-current-20261007.log');
const contrastLogPath = path.join(out, 'S04-route-contrast-run-current-20261007.log');
const contrastReportPath = path.join(out, 'S04-route-contrast-current-20261007.json');
const browserOut = path.join(out, 'S03-browser-evidence-20261007');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const map = JSON.parse(read(path.join(kit, 'execution/frontend-command-map.json')));
const unit = map.commands.find(command => command.id === 'unit');
assert(unit?.status === 'VERIFIED_AVAILABLE' && unit.cwd === 'BotSalesAI_Frontend', 'Registered full frontend unit command unavailable');

function runCommand(executable, args, cwd, extraEnv = {}) {
  const result = spawnSync(executable, args, {
    cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000,
    env: { ...process.env, ...extraEnv },
  });
  return { result, output: `${result.stdout || ''}${result.stderr ? `\n[stderr]\n${result.stderr}` : ''}` };
}

const unitRun = runCommand('cmd.exe', ['/d', '/c', unit.command], fe);
const unitLog = `Command: ${unit.command}\nCWD: ${fe}\nExit: ${unitRun.result.status}\n\n${unitRun.output}`;
fs.writeFileSync(unitLogPath, unitLog, 'utf8');
assert(!unitRun.result.error && unitRun.result.status === 0, `Registered unit suite failed: ${unitRun.result.error?.message || unitRun.output}`);
const testCount = [...unitRun.output.matchAll(/Tests\s+(\d+)\s+passed/g)].map(match => Number(match[1])).at(-1) ?? 0;
assert(testCount === 138, `Expected current full unit count 138; observed ${testCount}`);

const contrastCommand = 'node tests/design/ui012-route-contrast-audit.mjs';
const contrastRun = runCommand(process.execPath, ['tests/design/ui012-route-contrast-audit.mjs'], fe, {
  BOTSALES_UI012_CONTRAST_OUTPUT: '../botsales-kit/execution/frontend-evidence/FE006/S04-route-contrast-current-20261007.json',
});
const contrastLog = `Command: ${contrastCommand}\nCWD: ${fe}\nExit: ${contrastRun.result.status}\n\n${contrastRun.output}`;
fs.writeFileSync(contrastLogPath, contrastLog, 'utf8');
assert(!contrastRun.result.error && contrastRun.result.status === 0, `Rendered all-route contrast audit failed: ${contrastRun.result.error?.message || contrastRun.output}`);
const contrast = JSON.parse(read(contrastReportPath));
const browser = JSON.parse(read(path.join(browserOut, 'S04-browser-audit.json')));
const componentsTests = read(path.join(fe, 'apps/web/tests/components.test.tsx'));
const catalog = read(path.join(fe, 'apps/web/src/shared/ui/README.md'));
const contrastTotals = contrast.nonText?.totals ?? {};
const screenshots = [320, 1440].map(width => path.join(browserOut, `S04-dashboard-${width}.png`));
const checks = [
  ['full frontend unit suite passed 138/138', testCount === 138],
  ['rendered contrast scan covered all 54 canonical routes with assessable text', contrast.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && contrast.routeCount === 54 && contrast.totals?.routesWithText === 54 && contrast.totals?.assessableTextNodes === contrast.totals?.textNodes && contrast.totals?.unsupportedTextBackgrounds === 0],
  ['no visible text contrast failure or browser page error', contrast.totals?.failedTextNodes === 0 && contrast.pageErrors?.length === 0],
  ['all measured status-chip, input-border, chart-mark, and keyboard focus checks pass', contrastTotals.failedStatusChipText === 0 && contrastTotals.failedInputBorders === 0 && contrastTotals.failedChartMarks === 0 && contrast.nonText?.focusIndicator?.passes === true && contrast.nonText?.focusInputBorder?.passes === true],
  ['contrast coverage includes rendered status, input, and chart states', contrastTotals.statusChips === 122 && contrastTotals.inputBorders === 77 && contrastTotals.chartMarks === 3],
  ['minimum measured text contrast is above standard body threshold', contrast.totals?.minimumRatio >= 4.5 && contrast.totals?.minimumGradientTextRatio >= 4.5],
  ['shared component direct tests include a real component group, accessible states, and axe', componentsTests.includes('has no axe violations in the shared table, status, and search states') && componentsTests.includes('associates form errors with the visible label and returns focus after dialog close') && /27 API|27 shared/.test(catalog)],
  ['current real React browser audit reports zero axe violations', [...(browser.axe?.appViolations ?? []), ...(browser.axe?.mainViolations ?? [])].length === 0],
  ['real React dashboard screenshots exist at 320 and 1440 CSS px for visual inspection', screenshots.every(file => fs.existsSync(file) && fs.statSync(file).size > 0)],
];
assert(checks.every(([, passed]) => passed), `Component/contrast review failed: ${checks.filter(([, passed]) => !passed).map(([name]) => name).join(', ')}`);

const relative = file => {
  const fromFe = path.relative(fe, file);
  if (!fromFe.startsWith('..')) return fromFe.replaceAll('\\', '/');
  return `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`;
};
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const files = [
  path.join(fe, 'AGENTS.md'), path.join(fe, 'AI_RULES.md'), path.join(kit, 'docs/03_DESIGN_SYSTEM.md'),
  path.join(kit, 'design/decision.json'), path.join(kit, 'design/tokens.json'), path.join(kit, 'contracts/route-manifest.json'),
  path.join(fe, 'apps/web/src/shared/ui/README.md'), path.join(fe, 'apps/web/src/shared/ui/theme.ts'),
  path.join(fe, 'apps/web/src/shared/ui/layout.ts'), path.join(fe, 'apps/web/src/shared/ui/visual.ts'),
  path.join(fe, 'apps/web/src/shared/ui/components.tsx'), path.join(fe, 'apps/web/src/shared/ui/composition.tsx'),
  path.join(fe, 'apps/web/src/app/bootstrap.css'), path.join(fe, 'apps/web/tests/components.test.tsx'),
  path.join(fe, 'tests/design/ui012-route-contrast-audit.mjs'), path.join(fe, 'tests/design/browser-audit.mjs'),
  path.join(kit, 'execution/frontend-command-map.json'), path.join(kit, 'execution/frontend-plan.json'),
  unitLogPath, contrastLogPath, contrastReportPath, path.join(browserOut, 'S04-browser-audit.json'), ...screenshots, script,
];
const sourceFiles = [...new Set(files)].map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) })).sort((a,b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const screenshotHashes = screenshots.map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) }));
const visualReview = {
  reviewer: 'Codex visual inspection of the captured React render',
  observations: [
    '320 CSS px: dashboard sections stack vertically, primary controls remain in the viewport, and the table is contained in its local scroll region with the hint visible.',
    '1440 CSS px: desktop navigation and dashboard hierarchy render without obvious clipping; text and status labels remain legible at the captured scale.',
  ],
  limitations: ['Manual screenshot inspection covered the real overview route at 320 and 1440 CSS px, not every route/state.', 'The route manifest and workspace source contain no dedicated gallery route or Storybook; shared components were checked through direct render tests and their actual route consumers.'],
  screenshots: screenshotHashes,
};
const summary = `Current React unit suite passed ${testCount}/${testCount}. Rendered contrast audit passed on 54/54 canonical routes: ${contrast.totals.textNodes} visible text samples, 0 failures, minimum ${contrast.totals.minimumRatio}:1; 122 status chips, 77 input borders, 3 chart marks, and keyboard focus indicator all passed. Axe violations 0. Screenshot visual review was performed for overview at 320 and 1440 CSS px. No dedicated gallery/Storybook route exists in source.`;
const log = [
  'FE006.S04 current shared UI, route contrast, and screenshot review', `HEAD=${head} plus current frontend working tree; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API`,
  `Registered command=${unit.command}; CWD=${fe}; exit=${unitRun.result.status}; tests=${testCount}/${testCount}; log=${relative(unitLogPath)}; sha256=${sha(Buffer.from(unitLog))}`,
  `Supplemental command=${contrastCommand}; CWD=${fe}; exit=${contrastRun.result.status}; log=${relative(contrastLogPath)}; sha256=${sha(Buffer.from(contrastLog))}`,
  ...checks.map(([name]) => `CHECK PASS: ${name}`), summary,
  `VISUAL REVIEW: ${visualReview.observations.join(' ')}`, `LIMITATIONS: ${visualReview.limitations.join(' ')}`,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(logPath, log, 'utf8');
const evidence = {
  taskId: 'FE006', stepId: 'S04', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(), sourceRevision: `HEAD ${head} plus current frontend working tree`,
  expected: 'Check real React shared UI consumers on documented viewports, rendered text/non-text contrast, focus, axe, and inspect actual browser screenshots.',
  observed: summary, commandId: unit.id, command: unit.command, cwd: fe,
  reviewer: 'Codex self-review; automated route contrast/axe and manual review of 320/1440 overview screenshots; no independent peer review claimed',
  environment: { name: `Windows Node ${process.versions.node}, Vitest, Playwright Chromium`, details: 'Fresh local React demo and synthetic MSW; 54 canonical routes; no live backend/provider.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, sourceFiles, sourceSnapshotSha256,
  unit: { testsPassed: testCount, logFile: path.relative(kit, unitLogPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(unitLog)) },
  renderedContrast: { command: contrastCommand, exitCode: contrastRun.result.status, logFile: path.relative(kit, contrastLogPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(contrastLog)), report: path.relative(kit, contrastReportPath).replaceAll('\\','/'), routes: contrast.routeCount, textSamples: contrast.totals.textNodes, failedTextSamples: contrast.totals.failedTextNodes, minimumRatio: contrast.totals.minimumRatio, nonText: contrast.nonText.totals },
  axe: { appViolations: browser.axe?.appViolations?.length ?? null, mainViolations: browser.axe?.mainViolations?.length ?? null, report: path.relative(kit, path.join(browserOut, 'S04-browser-audit.json')).replaceAll('\\','/') },
  visualReview,
  limitations: visualReview.limitations,
  logFile: path.relative(kit, logPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(log)),
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, routes: contrast.routeCount, textSamples: contrast.totals.textNodes, minimumContrast: contrast.totals.minimumRatio, statusChips: contrastTotals.statusChips, inputBorders: contrastTotals.inputBorders, chartMarks: contrastTotals.chartMarks, receipt: path.relative(repo, receiptPath).replaceAll('\\','/'), logSha256: evidence.logSha256 }, null, 2));
