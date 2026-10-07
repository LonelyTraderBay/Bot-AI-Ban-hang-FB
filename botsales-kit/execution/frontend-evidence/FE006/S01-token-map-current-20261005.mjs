import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const canonical = JSON.parse(read('botsales-kit/design/tokens.json'));
const generated = JSON.parse(read('packages/design-tokens/src/tokens.json'));
const theme = read('apps/web/src/shared/ui/theme.ts');
const components = read('apps/web/src/shared/ui/components.tsx');
const bootstrap = read('apps/web/src/app/bootstrap.css');
const checks = [
  ['dark-only palette', canonical.theme === 'dark-only' && /mode:\s*'dark'/.test(theme)],
  ['canonical token package', JSON.stringify(canonical) === JSON.stringify(generated)],
  ['font scale mapped from tokens', ['body','bodyComfortable','meta','pageTitle','sectionTitle'].every(name => theme.includes(`tokens.fontSizes.${name}`))],
  ['spacing mapped from tokens', theme.includes('spacing: tokens.space.sm') && ['space.md','space.lg'].every(name => theme.includes(`tokens.${name}`))],
  ['shared UI radius mapped from tokens', ['radius.control','radius.dialog'].every(name => theme.includes(`tokens.${name}`)) && components.includes('tokens.radius.card')],
  ['primary touch targets mapped from tokens', theme.includes('tokens.layout.touchTarget') && components.includes('tokens.layout.touchTarget')],
  ['breakpoints mapped from tokens', ['mobileMaxExclusive','tabletMin','desktopMin'].every(name => theme.includes(`tokens.breakpoints.${name}`))],
  ['reduced motion follows approved token', theme.includes('tokens.motion.reducedMotionMs') && bootstrap.includes(`${canonical.motion.reducedMotionMs}ms!important`)],
  ['semantic palette maps approved colors', ['canvas','surface','accent','accentHover','accentPressed','onAccent','textPrimary','textSecondary','success','warning','danger','info'].every(name => theme.includes(`colors.${name}`))],
  ['no literal HEX in MUI theme', !/#[\da-f]{3,4}(?:[\da-f]{2}){0,2}\b/i.test(theme)],
];
const report = {
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  status: checks.every(([, passed]) => passed) ? 'PASS' : 'FAIL',
  palette: { identity: 'Graphite Gold', version: canonical.version, theme: canonical.theme, decision: 'ADR-VIS-021 APPROVED' },
  mappings: {
    typography: { body: canonical.fontSizes.body, bodyComfortable: canonical.fontSizes.bodyComfortable, meta: canonical.fontSizes.meta, sectionTitle: canonical.fontSizes.sectionTitle, pageTitle: canonical.fontSizes.pageTitle },
    spacing: canonical.space,
    radius: canonical.radius,
    breakpoints: canonical.breakpoints,
    colors: { canvas: canonical.colors.canvas, surface: canonical.colors.surface, raised: canonical.colors.raised, input: canonical.colors.input, accent: canonical.colors.accent, onAccent: canonical.colors.onAccent, textPrimary: canonical.colors.textPrimary, textSecondary: canonical.colors.textSecondary, success: canonical.colors.success, warning: canonical.colors.warning, danger: canonical.colors.danger, info: canonical.colors.info },
  },
  sourceHashes: {
    canonicalTokens: crypto.createHash('sha256').update(read('botsales-kit/design/tokens.json')).digest('hex'),
    generatedTokens: crypto.createHash('sha256').update(read('packages/design-tokens/src/tokens.json')).digest('hex'),
  },
  checks: checks.map(([name, passed]) => ({ name, result: passed ? 'PASS' : 'FAIL' })),
};
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'S01-token-map-current-20261005.json'), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status !== 'PASS') process.exitCode = 1;
