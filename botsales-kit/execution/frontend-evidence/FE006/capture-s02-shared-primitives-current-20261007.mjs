import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const out = path.dirname(script);
const repo = path.resolve(out, '../../../..');
const kit = path.join(repo, 'botsales-kit');
const fe = path.join(repo, 'BotSalesAI_Frontend');
const require = createRequire(import.meta.url);
const ts = require(path.join(fe, 'node_modules/typescript'));
const receiptPath = path.join(out, 'S02-shared-primitives-current-20261007.json');
const logPath = path.join(out, 'S02-shared-primitives-current-20261007.log');
const unitLogPath = path.join(out, 'S02-unit-current-20261007.log');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const map = JSON.parse(read(path.join(kit, 'execution/frontend-command-map.json')));
const unit = map.commands.find(command => command.id === 'unit');
assert(unit?.status === 'VERIFIED_AVAILABLE' && unit.cwd === 'BotSalesAI_Frontend', 'Registered full frontend unit command unavailable');

const run = spawnSync('cmd.exe', ['/d', '/c', unit.command], { cwd: fe, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const output = `${run.stdout || ''}${run.stderr ? `\n[stderr]\n${run.stderr}` : ''}`;
const unitLog = `Command: ${unit.command}\nCWD: ${fe}\nExit: ${run.status}\n\n${output}`;
fs.writeFileSync(unitLogPath, unitLog, 'utf8');
assert(!run.error && run.status === 0, `Registered unit suite failed: ${run.error?.message || output}`);
const testCount = [...output.matchAll(/Tests\s+(\d+)\s+passed/g)].map(match => Number(match[1])).at(-1) ?? 0;
assert(testCount === 138, `Expected current full unit count 138; observed ${testCount}`);

const components = read(path.join(fe, 'apps/web/src/shared/ui/components.tsx'));
const composition = read(path.join(fe, 'apps/web/src/shared/ui/composition.tsx'));
const testSource = read(path.join(fe, 'apps/web/tests/components.test.tsx'));
const catalog = read(path.join(fe, 'apps/web/src/shared/ui/README.md'));
const index = read(path.join(fe, 'apps/web/index.html'));
const tsconfigPath = path.join(fe, 'apps/web/tsconfig.json');
const tsconfig = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
assert(!tsconfig.error, `Could not read app tsconfig: ${ts.flattenDiagnosticMessageText(tsconfig.error?.messageText ?? '', '\n')}`);
const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig.config, ts.sys, path.dirname(tsconfigPath), { noEmit: true }, tsconfigPath);
assert(parsedTsconfig.errors.length === 0, `Could not parse app tsconfig: ${parsedTsconfig.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('; ')}`);
const program = ts.createProgram(parsedTsconfig.fileNames, parsedTsconfig.options);
const checker = program.getTypeChecker();
const sharedUiPaths = new Set([
  path.join(fe, 'apps/web/src/shared/ui/components.tsx'),
  path.join(fe, 'apps/web/src/shared/ui/composition.tsx'),
].map(file => path.resolve(file)));
const publicStyleProps = [];
for (const sourceFile of program.getSourceFiles()) {
  if (!sharedUiPaths.has(path.resolve(sourceFile.fileName))) continue;
  for (const statement of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(statement) || !statement.name || !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    const parameter = statement.parameters[0];
    if (!parameter) continue;
    const propsType = checker.getTypeAtLocation(parameter);
    for (const property of checker.getPropertiesOfType(propsType)) {
      if (['sx', 'style', 'className'].includes(property.name)) publicStyleProps.push(`${statement.name.text}.${property.name}`);
    }
  }
}
const primitiveExports = ['PageHeader','Panel','Stat','Stats','Amount','CopyableCode','Status','DataTable','Empty','QueryState','ErrorNotice','Toolbar','Pager','LookupLoadMore','RouteLink','MutationButton','EditDialog','PartialDataNotice','CapabilityUnavailable','ConfirmDialog','DetailLine'];
const compositionExports = ['FormFields','FieldGroup','SurfaceContent','ActionGroup','PageSections','SectionGrid'];
const testCases = [
  'renders semantic status text and a keyboard-navigable, named table region',
  'keeps status and empty states understandable without relying on color',
  'shows a reserved loading state and a retryable error state',
  'uses semantic layout roles for empty, loading, and notice states',
  'sets dialog insets and action gap explicitly instead of inheriting button margins',
  'associates form errors with the visible label and returns focus after dialog close',
  'has no axe violations in the shared table, status, and search states',
  'reflows the real mock application from 320px to 1440px and passes browser axe',
];
const checks = [
  ['named shared primitive API exists', primitiveExports.every(name => new RegExp(`export (?:function|interface) ${name}\\b`).test(components))],
  ['six semantic compositions exist', compositionExports.every(name => new RegExp(`export function ${name}\\b`).test(composition))],
  ['shared public API remains finite and does not expose generic style props', /không mở generic sx\/style\/className/i.test(catalog) && publicStyleProps.length === 0],
  ['pre-JavaScript dark shell is loaded before the app bundle', index.indexOf('/src/app/tokens.css') < index.indexOf('/src/app/bootstrap.css') && index.indexOf('/src/app/bootstrap.css') < index.indexOf('/src/main.tsx')],
  ['table, status, loading, retryable error, and empty states have direct regressions', testCases.slice(0,4).every(title => testSource.includes(title))],
  ['dialog/form errors, focus return, and shared-state axe have direct regressions', testCases.slice(4,7).every(title => testSource.includes(title))],
  ['responsive real-app/browser axe test covers 320–1440 CSS px', testSource.includes(testCases[7])],
  [`full unit suite passed ${testCount}/${testCount}`, true],
];
assert(checks.every(([, passed]) => passed), `Shared UI review failed: ${checks.filter(([, passed]) => !passed).map(([name]) => name).join(', ')}`);

const relative = file => {
  const fromFe = path.relative(fe, file);
  if (!fromFe.startsWith('..')) return fromFe.replaceAll('\\', '/');
  return `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`;
};
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const files = [
  path.join(fe, 'AGENTS.md'), path.join(fe, 'AI_RULES.md'), path.join(fe, 'apps/web/src/shared/ui/README.md'),
  path.join(fe, 'apps/web/src/shared/ui/components.tsx'), path.join(fe, 'apps/web/src/shared/ui/composition.tsx'),
  path.join(fe, 'apps/web/src/shared/ui/theme.ts'), path.join(fe, 'apps/web/src/shared/ui/layout.ts'),
  path.join(fe, 'apps/web/src/app/bootstrap.css'), path.join(fe, 'apps/web/index.html'),
  path.join(fe, 'apps/web/src/main.tsx'), path.join(fe, 'apps/web/tests/components.test.tsx'),
  path.join(kit, 'design/tokens.json'), path.join(kit, 'execution/frontend-command-map.json'),
  path.join(kit, 'execution/frontend-plan.json'), unitLogPath, script,
];
const sourceFiles = [...new Set(files)].map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) })).sort((a,b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const summary = `Shared UI exports ${primitiveExports.length} typed component functions plus six composition functions. Current full unit suite passed ${testCount}/${testCount}; direct tests cover semantic table/status, loading/error/empty, form error labels, dialog focus return, axe shared states, and the real responsive app at 320/390/768/1440 CSS px. TypeScript public signatures expose no generic sx/style/className props; MUI slot sx remains internal to owned components.`;
const log = [
  'FE006.S02 current shared primitive/composition behavior audit', `HEAD=${head} plus current working tree; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API`,
  `Registered command=${unit.command}; CWD=${fe}; exit=${run.status}; tests=${testCount}/${testCount}; unitLog=${relative(unitLogPath)}; unitLogSha256=${sha(Buffer.from(unitLog))}`,
  ...checks.map(([name]) => `CHECK PASS: ${name}`), summary,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(logPath, log, 'utf8');
const evidence = {
  taskId: 'FE006', stepId: 'S02', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(), sourceRevision: `HEAD ${head} plus current frontend working tree`,
  expected: 'Verify shared form/error/table/dialog/loading/status primitives and composition ownership, including accessible behavior and pre-JavaScript background.',
  observed: summary, commandId: unit.id, command: unit.command, cwd: fe,
  reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: `Windows Node ${process.versions.node} Frontend unit run`, details: 'Registered full frontend Vitest suite and current React shared UI sources; no live backend/provider.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, sourceFiles, sourceSnapshotSha256,
  unit: { testsPassed: testCount, logFile: path.relative(kit, unitLogPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(unitLog)) },
  publicApi: { primitiveFunctions: primitiveExports.length, compositionFunctions: compositionExports.length, genericStyleProps: false },
  logFile: path.relative(kit, logPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(log)),
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, unitTests: `${testCount}/${testCount}`, primitives: primitiveExports.length, compositions: compositionExports.length, receipt: path.relative(repo, receiptPath).replaceAll('\\','/'), logSha256: evidence.logSha256 }, null, 2));
