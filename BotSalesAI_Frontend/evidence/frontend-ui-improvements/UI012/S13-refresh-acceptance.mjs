import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const acceptancePath = path.join(here, 'S08-acceptance-20261003.json');
const acceptance = JSON.parse(await readFile(acceptancePath, 'utf8'));

acceptance.checkpoints.C04 =
  'PARTIAL (S09 assessed 2,144 visible text nodes; S10 measured 133 default-state target boxes; S11 sampled representative interaction/error contrast; S12 found a 24x24 square in 745 rounded targets across all routes and one dialog. S13 tried page-level zoom shortcuts in headless Chromium, but browser metrics did not change; native UI runtimes failed before app enumeration. Actual 200%/400% browser zoom, screen-reader speech/transcript and full manual interaction/error/icon review remain open.)';
acceptance.verification.headlessZoomCapabilityProbe =
  'S13: Chromium headless at 1280x800; Control+Shift+= and Control+0 left inner/outer width 1280, DPR 1, visualViewport scale 1, client width 1280, root font 16px and main width 1040 unchanged. This did not control Chrome browser chrome and is not actual zoom evidence.';
acceptance.verification.nativeUiAutomation =
  'S13: node_repl and cua_repl initialization/retry failed with kernel-assets path error before app/window enumeration; no native browser action or setting change occurred.';
acceptance.verification.latestCurrentFullE2E =
  '187/187 PASS in UI024/S01 on the exact current source/test/config fingerprint recorded by UI024/S02; local Chromium + synthetic MSW, not CI or owner UAT.';

for (const evidence of [
  'S13-zoom-automation-capability-probe-20261003.json',
  'S13-refresh-acceptance.mjs',
  '../UI024/S01-current-full-rebuilt-demo-e2e-20261003.log',
]) {
  if (!acceptance.evidence.includes(evidence)) acceptance.evidence.push(evidence);
}

acceptance.note =
  'Hashes cover the current UI012 source, tests, plan, project context, known gaps, report, accessibility matrices, audit artifacts and current UI024 evidence. S13 records the unsuccessful headless/native zoom capability probe; it does not verify actual browser zoom or close UI012. This JSON is excluded from its own hash set.';
acceptance.fingerprintRefreshNote =
  'S13 documents the failed automation capability probe after S12 geometry evidence. No checkpoint advanced; current shared-document and UI012 evidence fingerprints were refreshed.';

const fingerprintPaths = [
  'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/KNOWN_GAPS.md',
  'evidence/REPORT.md',
  'evidence/frontend-ui-improvements/UI012/S02-interaction-matrix.md',
  'evidence/frontend-ui-improvements/UI012/S07-manual-a11y-limitations-20261003.md',
  'evidence/frontend-ui-improvements/UI012/S13-zoom-automation-capability-probe-20261003.json',
  'evidence/frontend-ui-improvements/UI012/S13-refresh-acceptance.mjs',
  'evidence/frontend-ui-improvements/UI024/S01-current-full-rebuilt-demo-e2e-20261003.log',
  'evidence/frontend-ui-improvements/UI024/S02-current-worktree-and-artifact-fingerprint.json',
];

for (const relativePath of fingerprintPaths) {
  const absolutePath = path.join(root, relativePath);
  const bytes = await readFile(absolutePath);
  acceptance.fingerprints[relativePath] = createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

await writeFile(acceptancePath, `${JSON.stringify(acceptance, null, 2)}\n`, 'utf8');
console.log(
  `UI012 acceptance refreshed: ${acceptance.evidence.length} evidence items, ${Object.keys(acceptance.fingerprints).length} fingerprints; 4/5, C04 PARTIAL`,
);
