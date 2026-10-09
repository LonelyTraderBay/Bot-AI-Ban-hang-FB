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
const receiptPath = path.join(out, 'S03-accessibility-current-20261007.json');
const logPath = path.join(out, 'S03-accessibility-current-20261007.log');
const unitLogPath = path.join(out, 'S03-unit-current-20261007.log');
const browserLogPath = path.join(out, 'S03-browser-current-20261007.log');
const zoomLogPath = path.join(out, 'S03-zoom-current-20261007.log');
const browserOut = path.join(out, 'S03-browser-evidence-20261007');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const map = JSON.parse(read(path.join(kit, 'execution/frontend-command-map.json')));
const unit = map.commands.find(command => command.id === 'unit');
assert(unit?.status === 'VERIFIED_AVAILABLE' && unit.cwd === 'BotSalesAI_Frontend', 'Registered full frontend unit command unavailable');

function run(command, cwd, extraEnv = {}) {
  const result = spawnSync('cmd.exe', ['/d', '/c', command], {
    cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000,
    env: { ...process.env, ...extraEnv, PATH: `${path.dirname(process.execPath)};${process.env.PATH || ''}` },
  });
  return {
    result,
    output: `${result.stdout || ''}${result.stderr ? `\n[stderr]\n${result.stderr}` : ''}`,
  };
}
function runNode(args, cwd, extraEnv = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000,
    env: { ...process.env, ...extraEnv },
  });
  return {
    result,
    output: `${result.stdout || ''}${result.stderr ? `\n[stderr]\n${result.stderr}` : ''}`,
  };
}

const unitRun = run(unit.command, fe);
const unitLog = `Command: ${unit.command}\nCWD: ${fe}\nExit: ${unitRun.result.status}\n\n${unitRun.output}`;
fs.writeFileSync(unitLogPath, unitLog, 'utf8');
assert(!unitRun.result.error && unitRun.result.status === 0, `Registered unit suite failed: ${unitRun.result.error?.message || unitRun.output}`);
const testCount = [...unitRun.output.matchAll(/Tests\s+(\d+)\s+passed/g)].map(match => Number(match[1])).at(-1) ?? 0;
assert(testCount === 138, `Expected current full unit count 138; observed ${testCount}`);

const browserCommand = 'node tests/design/run-browser-audit.mjs';
const browserRun = runNode(['tests/design/run-browser-audit.mjs'], fe, {
  BOTSALES_DESIGN_EVIDENCE_DIR: `../botsales-kit/execution/frontend-evidence/FE006/${path.basename(browserOut)}`,
});
const browserLog = `Command: ${browserCommand}\nCWD: ${fe}\nExit: ${browserRun.result.status}\n\n${browserRun.output}`;
fs.writeFileSync(browserLogPath, browserLog, 'utf8');
assert(!browserRun.result.error && browserRun.result.status === 0, `Real browser accessibility/reflow audit failed: ${browserRun.result.error?.message || browserRun.output}`);
const browserMatch = browserRun.output.match(/BROWSER_AUDIT_JSON\s+(\{.*\})\s*$/m);
assert(browserMatch, 'Browser audit did not emit its structured report');
const browser = JSON.parse(browserMatch[1]);

const zoomDir = path.join(fe, 'evidence/frontend-ui-improvements/UI028/W30');
const beforeZoomReports = new Set(fs.readdirSync(zoomDir).filter(name => /^actual-browser-zoom-200-current-.*\.json$/.test(name)));
const zoomCommand = 'node evidence/frontend-ui-improvements/UI028/W30/capture-actual-browser-zoom-200-current-20261006.mjs';
const zoomRun = runNode(['evidence/frontend-ui-improvements/UI028/W30/capture-actual-browser-zoom-200-current-20261006.mjs'], fe);
const zoomLog = `Command: ${zoomCommand}\nCWD: ${fe}\nExit: ${zoomRun.result.status}\n\n${zoomRun.output}`;
fs.writeFileSync(zoomLogPath, zoomLog, 'utf8');
assert(!zoomRun.result.error && zoomRun.result.status === 0, `Actual browser zoom capture failed: ${zoomRun.result.error?.message || zoomRun.output}`);
const zoomReportName = fs.readdirSync(zoomDir).find(name => /^actual-browser-zoom-200-current-.*\.json$/.test(name) && !beforeZoomReports.has(name));
assert(zoomReportName, 'Actual browser zoom command produced no new report');
const zoomReportPath = path.join(zoomDir, zoomReportName);
const zoom = JSON.parse(read(zoomReportPath));

const componentTests = read(path.join(fe, 'apps/web/tests/components.test.tsx'));
const viewportChecks = browser.viewports ?? [];
const preferences = browser.accessibilityPreferences ?? {};
const axeViolations = [...(browser.axe?.appViolations ?? []), ...(browser.axe?.mainViolations ?? [])];
const checks = [
  ['full current unit suite passed 138/138', testCount === 138],
  ['browser audit uses the React demo route with synthetic API scope', browser.scope === 'FRONTEND_WITH_SYNTHETIC_MOCK_API' && browser.route === '/s/shop-demo/overview'],
  ['viewport coverage is 320, 390, 768, and 1440 CSS px', [320, 390, 768, 1440].every(width => viewportChecks.some(viewport => viewport.width === width))],
  ['all audited viewports avoid page-level horizontal overflow', viewportChecks.length === 4 && viewportChecks.every(viewport => viewport.documentWidth <= viewport.contentWidth)],
  ['mobile table scroll stays within its named region', viewportChecks.filter(viewport => viewport.width <= 390).every(viewport => viewport.tableScrollsLocally && viewport.tableHintVisible)],
  ['pre-JavaScript shell remains dark', browser.preJavaScript?.colorScheme === 'dark' && !/255,\s*255,\s*255/.test(`${browser.preJavaScript?.html} ${browser.preJavaScript?.body} ${browser.preJavaScript?.root}`)],
  ['browser axe reports no app or main-content violations', axeViolations.length === 0],
  ['forced-colors and reduced-motion preferences are active during browser check', preferences.forcedColors === true && preferences.reducedMotion === true],
  ['keyboard focus remains on a named link with a visible outline', preferences.focusedTag === 'A' && preferences.focusOutline !== 'none'],
  ['unit regressions cover canonical touch target, forced colors, labels, and dialog focus return', componentTests.includes('uses the canonical touch target for primary controls') && read(path.join(fe, 'apps/web/src/app/bootstrap.css')).includes('@media(forced-colors:active)') && componentTests.includes('associates form errors with the visible label and returns focus after dialog close')],
  ['current Chromium browser zoom is 200 percent for all five stress scenarios', zoom.result === 'PASS' && zoom.scenarios?.length === 5 && zoom.scenarios.every(scenario => scenario.result === 'PASS' && scenario.browserZoom?.reported === 2 && scenario.issues?.length === 0 && scenario.pageErrors?.length === 0)],
];
assert(checks.every(([, passed]) => passed), `Accessibility/reflow review failed: ${checks.filter(([, passed]) => !passed).map(([name]) => name).join(', ')}`);

const relative = file => {
  const fromFe = path.relative(fe, file);
  if (!fromFe.startsWith('..')) return fromFe.replaceAll('\\', '/');
  return `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`;
};
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const files = [
  path.join(fe, 'AGENTS.md'), path.join(fe, 'AI_RULES.md'), path.join(kit, 'docs/03_DESIGN_SYSTEM.md'),
  path.join(fe, 'apps/web/src/app/bootstrap.css'), path.join(fe, 'apps/web/src/app/tokens.css'),
  path.join(fe, 'apps/web/index.html'), path.join(fe, 'apps/web/src/main.tsx'),
  path.join(fe, 'apps/web/src/shared/ui/theme.ts'), path.join(fe, 'apps/web/src/shared/ui/layout.ts'),
  path.join(fe, 'apps/web/src/shared/ui/visual.ts'), path.join(fe, 'apps/web/src/shared/ui/components.tsx'),
  path.join(fe, 'apps/web/src/shared/ui/composition.tsx'), path.join(fe, 'apps/web/tests/components.test.tsx'),
  path.join(fe, 'tests/design/browser-audit.mjs'), path.join(fe, 'tests/design/run-browser-audit.mjs'),
  path.join(fe, 'evidence/frontend-ui-improvements/UI028/W30/capture-actual-browser-zoom-200-current-20261006.mjs'),
  path.join(fe, 'tests/ui028-w30-stress.spec.ts'), path.join(fe, 'tests/evidence-run-id.mjs'),
  path.join(kit, 'design/decision.json'), path.join(kit, 'design/tokens.json'),
  path.join(kit, 'execution/frontend-command-map.json'), path.join(kit, 'execution/frontend-plan.json'),
  unitLogPath, browserLogPath, zoomLogPath, path.join(browserOut, 'S04-browser-audit.json'), zoomReportPath,
  ...[320, 390, 768, 1440].map(width => path.join(browserOut, `S04-dashboard-${width}.png`)),
  script,
];
const sourceFiles = [...new Set(files)].map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) })).sort((a,b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const summary = `Frontend accessibility evidence is current for HEAD ${head} plus working tree. Full Vitest ${testCount}/${testCount}; Chromium reflow/axe audit covers 320/390/768/1440 px with no page overflow or axe violations; dark pre-JavaScript shell, forced-colors/reduced-motion, keyboard focus, and five real browser 200% zoom stress scenarios pass. Scope remains synthetic mock API.`;
const log = [
  'FE006.S03 current accessibility, keyboard, responsive, and browser zoom audit', `HEAD=${head} plus current frontend working tree; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API`,
  `Registered command=${unit.command}; CWD=${fe}; exit=${unitRun.result.status}; tests=${testCount}/${testCount}; unitLog=${relative(unitLogPath)}; unitLogSha256=${sha(Buffer.from(unitLog))}`,
  `Supplemental command=${browserCommand}; CWD=${fe}; exit=${browserRun.result.status}; log=${relative(browserLogPath)}; logSha256=${sha(Buffer.from(browserLog))}`,
  `Supplemental command=${zoomCommand}; CWD=${fe}; exit=${zoomRun.result.status}; report=${relative(zoomReportPath)}; log=${relative(zoomLogPath)}; logSha256=${sha(Buffer.from(zoomLog))}`,
  ...checks.map(([name]) => `CHECK PASS: ${name}`), summary,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(logPath, log, 'utf8');
const evidence = {
  taskId: 'FE006', stepId: 'S03', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(), sourceRevision: `HEAD ${head} plus current frontend working tree`,
  expected: 'Verify accessible labels/errors/focus return/touch target, keyboard focus, dark shell, reduced motion, forced colors, responsive layout, and real browser zoom.',
  observed: summary, commandId: unit.id, command: unit.command, cwd: fe,
  reviewer: 'Codex self-review; automated browser/axe evidence, no independent peer review claimed',
  environment: { name: `Windows Node ${process.versions.node}, Vitest, Playwright Chromium`, details: 'Fresh Vite demo server and local synthetic MSW; actual tab zoom extension run in temporary Chromium profile; no live backend/provider.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, sourceFiles, sourceSnapshotSha256,
  unit: { testsPassed: testCount, logFile: path.relative(kit, unitLogPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(unitLog)) },
  browserAudit: { command: browserCommand, exitCode: browserRun.result.status, logFile: path.relative(kit, browserLogPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(browserLog)), report: path.relative(kit, path.join(browserOut, 'S04-browser-audit.json')).replaceAll('\\','/'), viewports: viewportChecks.map(viewport => viewport.width), axeViolations: axeViolations.length },
  actualBrowserZoom: { command: zoomCommand, exitCode: zoomRun.result.status, logFile: path.relative(kit, zoomLogPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(zoomLog)), report: relative(zoomReportPath), scenarios: zoom.scenarios.length, factor: 2 },
  logFile: path.relative(kit, logPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(log)),
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, unitTests: `${testCount}/${testCount}`, viewports: viewportChecks.map(viewport => viewport.width), axeViolations: axeViolations.length, zoomScenarios: zoom.scenarios.length, receipt: path.relative(repo, receiptPath).replaceAll('\\','/'), logSha256: evidence.logSha256 }, null, 2));
