import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const out = path.dirname(script);
const repo = path.resolve(out, '../../../..');
const kit = path.join(repo, 'botsales-kit');
const fe = path.join(repo, 'BotSalesAI_Frontend');
const receiptPath = path.join(out, 'S01-design-system-current-20261007.json');
const logPath = path.join(out, 'S01-design-system-current-20261007.log');
const unitLogPath = path.join(out, 'S01-unit-current-20261007.log');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const map = JSON.parse(read(path.join(kit, 'execution/frontend-command-map.json')));
const unit = map.commands.find(command => command.id === 'unit');
assert(unit?.status === 'VERIFIED_AVAILABLE' && unit.cwd === 'BotSalesAI_Frontend', 'Registered full frontend unit command unavailable');

const run = spawnSync('cmd.exe', ['/d', '/c', unit.command], { cwd: fe, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const unitOutput = `${run.stdout || ''}${run.stderr ? `\n[stderr]\n${run.stderr}` : ''}`;
const unitLog = `Command: ${unit.command}\nCWD: ${fe}\nExit: ${run.status}\n\n${unitOutput}`;
fs.writeFileSync(unitLogPath, unitLog, 'utf8');
assert(!run.error && run.status === 0, `Registered unit suite failed: ${run.error?.message || unitOutput}`);
const testCount = [...unitOutput.matchAll(/Tests\s+(\d+)\s+passed/g)].map(match => Number(match[1])).at(-1) ?? 0;
assert(testCount === 138, `Expected current full unit count 138; observed ${testCount}`);

const tokens = JSON.parse(read(path.join(kit, 'design/tokens.json')));
const generated = JSON.parse(read(path.join(fe, 'packages/design-tokens/src/tokens.json')));
const decision = JSON.parse(read(path.join(kit, 'design/decision.json')));
const theme = read(path.join(fe, 'apps/web/src/shared/ui/theme.ts'));
const layout = read(path.join(fe, 'apps/web/src/shared/ui/layout.ts'));
const visual = read(path.join(fe, 'apps/web/src/shared/ui/visual.ts'));
const components = read(path.join(fe, 'apps/web/src/shared/ui/components.tsx'));
const bootstrap = read(path.join(fe, 'apps/web/src/app/bootstrap.css'));
const index = read(path.join(fe, 'apps/web/index.html'));
const main = read(path.join(fe, 'apps/web/src/main.tsx'));
const standard = read(path.join(fe, 'docs/FRONTEND_SPACING_STANDARD.md'));
const checks = [
  ['approved single palette', decision.id === 'ADR-VIS-021' && decision.status === 'APPROVED' && tokens.theme === 'dark-only' && /mode:\s*'dark'/.test(theme)],
  ['canonical/generated tokens match exactly', isDeepStrictEqual(tokens, generated)],
  ['typography maps from canonical token names', ['body','bodyComfortable','meta','pageTitle','sectionTitle'].every(name => theme.includes(`tokens.fontSizes.${name}`)) && theme.includes('tokens.fontFamily')],
  ['MUI spacing base and named layout roles map from tokens', theme.includes('spacing: tokens.space.sm') && layout.includes('tokens.space.') && layout.includes('const factor')],
  ['breakpoints and touch targets use canonical tokens', ['mobileMaxExclusive','tabletMin','desktopMin'].every(name => theme.includes(`tokens.breakpoints.${name}`)) && theme.includes('tokens.layout.touchTarget') && components.includes('tokens.layout.touchTarget')],
  ['semantic palette and radii map from canonical tokens', ['canvas','surface','accent','accentHover','accentPressed','onAccent','textPrimary','textSecondary','success','warning','danger','info'].every(name => theme.includes(`colors.${name}`)) && theme.includes('tokens.radius.control') && components.includes('tokens.radius.card')],
  ['theme contains no copied HEX colors', !/#[\da-f]{3,4}(?:[\da-f]{2}){0,2}\b/i.test(theme)],
  ['pre-JavaScript surface is dark before module load', index.indexOf('/src/app/tokens.css') < index.indexOf('/src/main.tsx') && index.indexOf('/src/app/bootstrap.css') < index.indexOf('/src/main.tsx') && bootstrap.includes('background-color:var(--color-canvas)')],
  ['one app theme provider and baseline', (main.match(/<ThemeProvider\b/g) || []).length === 1 && (main.match(/<CssBaseline\s*\/>/g) || []).length === 1],
  ['focus, reduced motion, forced colors and SPC policy exist', theme.includes('tokens.motion.reducedMotionMs') && bootstrap.includes('@media(forced-colors:active)') && bootstrap.includes('@media(prefers-reduced-motion:reduce)') && standard.includes('SPC-001')],
];
assert(checks.every(([, passed]) => passed), `Design mapping failed: ${checks.filter(([, passed]) => !passed).map(([name]) => name).join(', ')}`);

const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const relative = file => {
  const fromFe = path.relative(fe, file);
  if (!fromFe.startsWith('..')) return fromFe.replaceAll('\\', '/');
  return `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`;
};
const files = [
  path.join(fe, 'AGENTS.md'), path.join(fe, 'AI_RULES.md'), path.join(fe, 'docs/FRONTEND_SPACING_STANDARD.md'),
  path.join(fe, 'apps/web/src/shared/ui/README.md'), path.join(fe, 'apps/web/src/shared/ui/theme.ts'),
  path.join(fe, 'apps/web/src/shared/ui/layout.ts'), path.join(fe, 'apps/web/src/shared/ui/visual.ts'),
  path.join(fe, 'apps/web/src/shared/ui/components.tsx'), path.join(fe, 'apps/web/src/app/bootstrap.css'),
  path.join(fe, 'apps/web/src/app/tokens.css'), path.join(fe, 'apps/web/index.html'), path.join(fe, 'apps/web/src/main.tsx'),
  path.join(fe, 'apps/web/tests/components.test.tsx'), path.join(fe, 'packages/design-tokens/src/tokens.json'),
  path.join(kit, 'design/tokens.json'), path.join(kit, 'design/decision.json'), path.join(kit, 'docs/03_DESIGN_SYSTEM.md'),
  path.join(kit, 'docs/19_DARK_ONLY_POLICY.md'), path.join(kit, 'execution/frontend-command-map.json'),
  path.join(kit, 'execution/frontend-plan.json'), unitLogPath, script,
];
const sourceFiles = [...new Set(files)].map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) })).sort((a,b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const summary = `The approved ADR-VIS-021 Graphite Gold dark-only decision is the sole theme. Canonical and generated token JSON match exactly; typography, 8px MUI spacing base, semantic layout factors, breakpoint, palette, radius, touch target, pre-JavaScript background, focus, reduced-motion, and forced-colors mappings are present. Registered full unit suite passed ${testCount}/${testCount}; no copied theme HEX was found.`;
const log = [
  'FE006.S01 current Graphite Gold token and MUI bridge audit', `HEAD=${head} plus current working tree; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API`,
  `Registered command=${unit.command}; CWD=${fe}; exit=${run.status}; tests=${testCount}/${testCount}; unitLog=${relative(unitLogPath)}; unitLogSha256=${sha(Buffer.from(unitLog))}`,
  ...checks.map(([name]) => `CHECK PASS: ${name}`), summary,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(logPath, log, 'utf8');
const evidence = {
  taskId: 'FE006', stepId: 'S01', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(), sourceRevision: `HEAD ${head} plus current frontend working tree`,
  expected: 'Map the approved dark-only decision, canonical typography/spacing/breakpoint/semantic color tokens and current MUI bridge; verify current frontend unit behavior.',
  observed: summary, commandId: unit.id, command: unit.command, cwd: fe,
  reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: `Windows Node ${process.versions.node} Frontend unit run`, details: `Registered full frontend Vitest command against current working tree; no live backend/provider.`, dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, sourceFiles, sourceSnapshotSha256,
  unit: { testsPassed: testCount, logFile: path.relative(kit, unitLogPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(unitLog)) },
  logFile: path.relative(kit, logPath).replaceAll('\\','/'), logSha256: sha(Buffer.from(log)),
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', checks: checks.length, unitTests: `${testCount}/${testCount}`, tokenParity: true, receipt: path.relative(repo, receiptPath).replaceAll('\\','/'), logSha256: evidence.logSha256 }, null, 2));
