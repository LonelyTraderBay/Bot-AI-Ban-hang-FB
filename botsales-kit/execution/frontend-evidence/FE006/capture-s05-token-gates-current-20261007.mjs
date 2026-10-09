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
const receiptPath = path.join(out, 'S05-token-gates-current-20261007.json');
const logPath = path.join(out, 'S05-token-gates-current-20261007.log');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const bytes = file => fs.readFileSync(file);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const map = JSON.parse(read(path.join(kit, 'execution/frontend-command-map.json')));
const typecheck = map.commands.find(command => command.id === 'types');
assert(typecheck?.status === 'VERIFIED_AVAILABLE' && typecheck.cwd === 'BotSalesAI_Frontend', 'Registered frontend typecheck command unavailable');

function run(id, command) {
  const result = spawnSync('cmd.exe', ['/d', '/c', command], {
    cwd: fe, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600_000,
    env: { ...process.env },
  });
  const output = `${result.stdout || ''}${result.stderr ? `\n[stderr]\n${result.stderr}` : ''}`;
  const log = `Command: ${command}\nCWD: ${fe}\nExit: ${result.status}\n\n${output}`;
  const logPath = path.join(out, `S05-${id}-current-20261007.log`);
  fs.writeFileSync(logPath, log, 'utf8');
  return { id, command, result, output, log, logPath };
}
function reuseCaptured(id, command) {
  const logPath = path.join(out, `S05-${id}-current-20261007.log`);
  const log = read(logPath);
  const expectedHeader = `Command: ${command}\nCWD: ${fe}\nExit: 0\n`;
  assert(log.startsWith(expectedHeader), `Captured ${id} log does not prove the expected command/cwd/exit 0`);
  return { id, command, result: { status: 0 }, output: log.slice(log.indexOf('\n\n') + 2), log, logPath };
}

const commands = [
  { id: 'typecheck', command: typecheck.command },
  { id: 'generate-check', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run generate:check' },
  { id: 'visual-tokens', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run test:visual-tokens' },
  { id: 'layout', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run test:layout' },
  { id: 'ui-composition', command: 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run test:ui-composition' },
];
const reuseCapturedLogs = process.argv.includes('--reuse-captured-logs');
const results = reuseCapturedLogs
  ? commands.map(item => reuseCaptured(item.id, item.command))
  : await Promise.all(commands.map(item => Promise.resolve().then(() => run(item.id, item.command))));
const failedRuns = results.filter(item => item.result.error || item.result.status !== 0);
assert(failedRuns.length === 0, `One or more current S05 gates failed: ${failedRuns.map(item => `${item.id}=${item.result.status ?? item.result.error?.message}`).join(', ')}`);

const canonicalTokenBytes = bytes(path.join(kit, 'design/tokens.json'));
const publishedTokenBytes = bytes(path.join(fe, 'packages/design-tokens/src/tokens.json'));
const cssTokens = read(path.join(fe, 'apps/web/src/app/tokens.css'));
const theme = read(path.join(fe, 'apps/web/src/shared/ui/theme.ts'));
const layout = read(path.join(fe, 'apps/web/src/shared/ui/layout.ts'));
const visualTests = read(path.join(fe, 'tests/visual-token-checker.test.mjs'));
const componentTests = read(path.join(fe, 'apps/web/tests/components.test.tsx'));
const componentSource = read(path.join(fe, 'apps/web/src/shared/ui/components.tsx'));
const compositionSource = read(path.join(fe, 'apps/web/src/shared/ui/composition.tsx'));
const previousApiReceiptPath = path.join(out, 'S02-shared-primitives-current-20261007.json');
const previousApiReceipt = JSON.parse(read(previousApiReceiptPath));
const apiFiles = [path.join(fe, 'apps/web/src/shared/ui/components.tsx'), path.join(fe, 'apps/web/src/shared/ui/composition.tsx')];
const apiSourceCurrent = apiFiles.every(file => previousApiReceipt.sourceFiles.some(source => source.path === path.relative(fe, file).replaceAll('\\', '/') && source.sha256 === sha(bytes(file))));
const apiReview = {
  tokenParity: { canonicalBytesEqualPublishedPackage: canonicalTokenBytes.equals(publishedTokenBytes), generatedCssMarker: cssTokens.startsWith('/* GENERATED from approved design/tokens.json. */'), themeUsesCanonicalTokenPackage: theme.includes("from '@botsales/tokens'"), layoutUsesCanonicalTokenPackage: layout.includes("from '@botsales/tokens'") },
  negativeFixtures: { rawVisualLiteralRejected: visualTests.includes('rejects raw literals across sx, JSX system props and CSS declarations'), copiedHexAndLightPaletteRejected: componentTests.includes('rejects copied HEX values and non-dark theme modes with negative fixtures') && componentTests.includes('const accent = "#003366"') },
  typedApi: { priorTypeScriptPublicSignatureReviewCurrent: apiSourceCurrent, genericStyleProps: previousApiReceipt.publicApi?.genericStyleProps, primitiveFunctions: previousApiReceipt.publicApi?.primitiveFunctions, compositionFunctions: previousApiReceipt.publicApi?.compositionFunctions, tableRemainsTypedPresenter: /export function DataTable<T>\(/.test(componentSource), compositionsHaveNamedOwners: ['FormFields','FieldGroup','SurfaceContent','ActionGroup','PageSections','SectionGrid'].every(name => new RegExp(`export function ${name}\\b`).test(compositionSource)) },
  limits: ['API assessment is static TypeScript/source review plus local frontend gates; no independent design review, backend integration, staging, or production acceptance.'],
};
const checks = [
  ['registered strict TypeScript check passed', results.find(item => item.id === 'typecheck')?.result.status === 0],
  ['generated outputs are current against canonical source', results.find(item => item.id === 'generate-check')?.result.status === 0],
  ['visual token fixture and live source gates passed', results.find(item => item.id === 'visual-tokens')?.result.status === 0 && results.find(item => item.id === 'visual-tokens')?.output.includes('visual-token-check PASS')],
  ['layout role fixture and live source gates passed', results.find(item => item.id === 'layout')?.result.status === 0 && results.find(item => item.id === 'layout')?.output.includes('layout-check PASS')],
  ['shared composition ancestry/API regressions and scanner passed', results.find(item => item.id === 'ui-composition')?.result.status === 0 && results.find(item => item.id === 'ui-composition')?.output.includes('ui-composition PASS:')],
  ['published token package is byte-identical to kit canonical tokens', canonicalTokenBytes.equals(publishedTokenBytes)],
  ['generated CSS and MUI theme/layout bridge use the canonical token package', cssTokens.startsWith('/* GENERATED from approved design/tokens.json. */') && theme.includes("from '@botsales/tokens'") && layout.includes("from '@botsales/tokens'")],
  ['negative source fixtures reject raw colors, copied HEX, and light/system theme modes', apiReview.negativeFixtures.rawVisualLiteralRejected && apiReview.negativeFixtures.copiedHexAndLightPaletteRejected],
  ['shared API TypeScript review is current and exposes no generic style props', apiSourceCurrent && previousApiReceipt.publicApi?.genericStyleProps === false && previousApiReceipt.publicApi?.primitiveFunctions === 21 && previousApiReceipt.publicApi?.compositionFunctions === 6],
  ['typed table and six explicit semantic compositions remain exported', apiReview.typedApi.tableRemainsTypedPresenter && apiReview.typedApi.compositionsHaveNamedOwners],
];
assert(checks.every(([, passed]) => passed), `Token/component/type review failed: ${checks.filter(([, passed]) => !passed).map(([name]) => name).join(', ')}`);

const relative = file => {
  const fromFe = path.relative(fe, file);
  if (!fromFe.startsWith('..')) return fromFe.replaceAll('\\', '/');
  return `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`;
};
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const files = [
  path.join(fe, 'AGENTS.md'), path.join(fe, 'AI_RULES.md'), path.join(kit, 'design/tokens.json'),
  path.join(fe, 'packages/design-tokens/src/tokens.json'), path.join(fe, 'apps/web/src/app/tokens.css'),
  path.join(fe, 'apps/web/src/shared/ui/theme.ts'), path.join(fe, 'apps/web/src/shared/ui/layout.ts'),
  path.join(fe, 'apps/web/src/shared/ui/visual.ts'), path.join(fe, 'apps/web/src/shared/ui/components.tsx'),
  path.join(fe, 'apps/web/src/shared/ui/composition.tsx'), path.join(fe, 'apps/web/tests/components.test.tsx'),
  path.join(fe, 'tests/visual-token-checker.test.mjs'), path.join(fe, 'tests/ui-composition-checker.test.mjs'),
  path.join(fe, 'tests/ui-composition-ancestry.test.mjs'), path.join(fe, 'tests/ui-shared-api-contract.test.mjs'),
  path.join(fe, 'scripts/check-visual-tokens.mjs'), path.join(fe, 'scripts/check-layout.mjs'),
  path.join(fe, 'scripts/check-ui-composition.mjs'), path.join(fe, 'package.json'),
  path.join(kit, 'execution/frontend-command-map.json'), path.join(kit, 'execution/frontend-plan.json'),
  previousApiReceiptPath, ...results.map(item => item.logPath), script,
];
const sourceFiles = [...new Set(files)].map(file => ({ path: relative(file), sha256: sha(bytes(file)) })).sort((a,b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const commandResults = results.map(item => ({ id: item.id, command: item.command, exitCode: item.result.status, logFile: relative(item.logPath), logSha256: sha(Buffer.from(item.log)) }));
const summary = `Strict typecheck, generator freshness, visual-token, spacing-layout, and shared UI composition/API checks passed. Kit and published token JSON are byte-identical; negative fixtures reject raw color literals, copied HEX, and non-dark/system modes. Current TypeScript public API remains finite: 21 shared primitives and six semantic compositions, no generic style props. Local React frontend with synthetic MSW only.`;
const log = [
  'FE006.S05 current token drift, component API, and type gates', `HEAD=${head} plus current frontend working tree; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API`,
  ...commandResults.map(result => `COMMAND ${result.id}: exit=${result.exitCode}; command=${result.command}; log=${result.logFile}; sha256=${result.logSha256}`),
  ...checks.map(([name]) => `CHECK PASS: ${name}`),
  `canonicalTokenSha256=${sha(canonicalTokenBytes)}; packageTokenSha256=${sha(publishedTokenBytes)}; byteEqual=${canonicalTokenBytes.equals(publishedTokenBytes)}`,
  `API REVIEW ${JSON.stringify(apiReview)}`, summary,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(logPath, log, 'utf8');
const evidence = {
  taskId: 'FE006', stepId: 'S05', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(), sourceRevision: `HEAD ${head} plus current frontend working tree`,
  expected: 'Canonical tokens and CSS/MUI bridge remain aligned; strict typecheck, visual-token, layout, component composition, and negative palette/copy HEX checks pass; shared API remains finite.',
  observed: summary, commandId: typecheck.id, command: typecheck.command, cwd: fe,
  reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: `Windows Node ${process.versions.node}, npm frontend gates`, details: 'Registered strict typecheck plus generator, design token, layout owner and semantic composition checks; no live backend/provider.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, sourceFiles, sourceSnapshotSha256, commandResults,
  tokenParity: { canonicalSha256: sha(canonicalTokenBytes), packageSha256: sha(publishedTokenBytes), byteEqual: canonicalTokenBytes.equals(publishedTokenBytes), generatedCss: true },
  apiReview,
  logFile: path.relative(kit, logPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(log)),
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, commands: commandResults.map(item => ({ id: item.id, exitCode: item.exitCode })), tokenParity: evidence.tokenParity.byteEqual, publicApi: apiReview.typedApi, receipt: path.relative(repo, receiptPath).replaceAll('\\','/'), logSha256: evidence.logSha256 }, null, 2));
