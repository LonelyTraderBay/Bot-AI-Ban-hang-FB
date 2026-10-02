import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(scriptDir, '../../../..');
const tokens = JSON.parse(fs.readFileSync(path.join(repo, 'botsales-kit/design/tokens.json'), 'utf8'));
const browser = JSON.parse(fs.readFileSync(path.join(scriptDir, 'S04-browser-audit.json'), 'utf8'));
const pairs = [
  ['primary text / canvas', tokens.colors.textPrimary, tokens.colors.canvas],
  ['primary text / surface', tokens.colors.textPrimary, tokens.colors.surface],
  ['secondary text / surface', tokens.colors.textSecondary, tokens.colors.surface],
  ['muted text / input', tokens.colors.textMuted, tokens.colors.input],
  ['accent / canvas', tokens.colors.accent, tokens.colors.canvas],
  ['on-accent / accent', tokens.colors.onAccent, tokens.colors.accent],
  ['success / success surface', tokens.colors.success, tokens.colors.successSurface],
  ['warning / warning surface', tokens.colors.warning, tokens.colors.warningSurface],
  ['danger / danger surface', tokens.colors.danger, tokens.colors.dangerSurface],
  ['info / info surface', tokens.colors.info, tokens.colors.infoSurface],
];
function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map(channel => parseInt(channel, 16) / 255);
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(foreground, background) {
  const a = luminance(foreground), b = luminance(background);
  return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
}
const contrastPairs = pairs.map(([name, foreground, background]) => ({ name, foreground, background, ratio: contrast(foreground, background), minimum: 4.5 }));
const borderContrast = { name: 'control border / input', foreground: tokens.colors.borderControl, background: tokens.colors.input, ratio: contrast(tokens.colors.borderControl, tokens.colors.input), minimum: 3 };
const viewportsPass = browser.viewports.every(view => view.documentWidth <= view.contentWidth);
const status = contrastPairs.every(pair => pair.ratio >= pair.minimum)
  && borderContrast.ratio >= borderContrast.minimum
  && viewportsPass
  && browser.preJavaScript.colorScheme === 'dark'
  && browser.axe.appViolations.length === 0
  && browser.axe.mainViolations.length === 0;
const report = {
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  status: status ? 'PASS' : 'FAIL',
  route: browser.route,
  viewportWidths: browser.viewports.map(view => view.width),
  checks: {
    canonicalTextContrast: contrastPairs,
    controlBorderContrast: borderContrast,
    pageOverflow: viewportsPass ? 'PASS' : 'FAIL',
    preJavaScriptDark: browser.preJavaScript,
    axe: { violations: 0, incompleteRules: browser.axe.incomplete, note: 'axe color-contrast is incomplete; the contrast ratios above cover the named canonical token pairs only.' },
  },
  selfReview: {
    reviewer: 'Codex self-review; no independent peer review',
    inspectedScreenshots: ['S04-dashboard-320.png', 'S04-dashboard-1440.png'],
    observations: [
      'At 320 CSS px, the page remains within the viewport and the table scrolls inside its labeled region with the hint visible.',
      'At 1440 CSS px, dashboard hierarchy, semantic status labels and dark Graphite Gold surfaces remain visually distinct; no obvious clipping or contrast defect was seen in the inspected view.',
    ],
    limits: ['This review covers the dashboard route and listed token pairs only.', 'No full keyboard, screen-reader, color-contrast axe completion, or product UAT is claimed.'],
  },
};
fs.writeFileSync(path.join(scriptDir, 'S04-visual-review.json'), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, tokenPairs: contrastPairs.length, minimumTextRatio: Math.min(...contrastPairs.map(pair => pair.ratio)), controlBorderRatio: borderContrast.ratio, viewportsPass }, null, 2)}\n`);
if (!status) process.exitCode = 1;
