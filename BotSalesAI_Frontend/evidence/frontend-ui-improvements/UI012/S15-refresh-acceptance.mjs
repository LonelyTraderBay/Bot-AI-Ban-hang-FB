import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const acceptancePath = path.join(here, 'S08-acceptance-20261003.json');
const acceptance = JSON.parse(await readFile(acceptancePath, 'utf8'));
const zoom = JSON.parse(await readFile(path.join(here, 'S14-actual-browser-tab-zoom-20261003.json'), 'utf8'));
const textFlow = JSON.parse(await readFile(path.join(here, 'S17-zoom-text-clipping-20261003.json'), 'utf8'));
const screenshotScale = JSON.parse(await readFile(path.join(here, 'S21-zoom-screenshot-scale-20261003.json'), 'utf8'));

if (zoom.status !== 'PROBE_COMPLETE' || zoom.zoom400RouteSummary?.layoutAssertionStatus !== 'PASS') {
  throw new Error('S14 actual browser zoom/layout assertions must pass before acceptance refresh.');
}
if (textFlow.status !== 'PROBE_COMPLETE'
  || textFlow.zoom400RouteSummary?.layoutAssertionStatus !== 'PASS'
  || textFlow.zoom400RouteSummary?.scrollAwareTextClipAssertionStatus !== 'PASS'
  || textFlow.zoom400RouteSummary?.unresolvedTextClipCount !== 0) {
  throw new Error('S17 zoom text-flow/layout assertions must pass before acceptance refresh.');
}
if (screenshotScale.status !== 'PROBE_COMPLETE'
  || screenshotScale.routes.length !== 2
  || screenshotScale.routes.some((route) => route.metrics.measuredZoom !== 4
    || route.metrics.innerWidth !== 320
    || route.screenshots.find((shot) => shot.scale === 'device')?.width !== 320
    || route.screenshots.find((shot) => shot.scale === 'cdp-device-surface')?.width !== 1280)) {
  throw new Error('S21 must confirm the 320 CSS-pixel vs 1280 device-surface screenshot scale at 400% zoom.');
}

acceptance.status = 'IN_PROGRESS';
acceptance.checkpoints.C04 =
  'PARTIAL (S09 assessed 2,144 visible text nodes; S10 measured default-state target boxes; S11 sampled representative interaction/error contrast; S12 found 24x24 squares in 745 rounded targets. S14 verified actual Chromium tab zoom at 100/200/400% and fixed R31 Reports grid overflow. S17 audited text flow/clipping across 17 routes at 400%, found and fixed an unbreakable BotConfig policy token clipped on R26, then measured zero unresolved text clips. S18 keyboard/text-flow browser regressions pass 5/5. Screen-reader speech/transcript and full human review of interaction/error/icon states remain open.)';
acceptance.verification.actualBrowserZoomMatrix =
  `S14: Chrome Tabs API measured 100/200/400% on R04 at innerWidth 1280/640/320 CSS px and DPR 1/2/4, then reset zoom to 100%. At 400%, ${zoom.zoom400RouteSummary.routes}/${zoom.zoom400RouteSummary.routes} routes were at 320 CSS px, ${zoom.zoom400RouteSummary.noDocumentHorizontalOverflow}/${zoom.zoom400RouteSummary.routes} had no document horizontal overflow, and ${zoom.zoom400RouteSummary.noPageErrors}/${zoom.zoom400RouteSummary.routes} had no page errors. Automated isolated Chromium evidence, not manual device/assistive-technology signoff.`;
acceptance.verification.reports400PercentRegression =
  'S14 reproduced R31 Reports at 400% before the fix: document scroll width 618 px at 320 px available. The xs grid track was computed as 602 px from the 1fr automatic minimum. After changing the Reports grid to minmax(0, 1fr), current R31 measured document width/scroll width 320/320; the 17-route 400% layout assertion passed. Data tables retain their own 600 px minimum-width keyboard-scrollable region.';
acceptance.verification.frontendChecksAfterBotAlertFix =
  'S19 direct checks PASS after the R26 text-wrap fix: generator 11 outputs/283 schemas/210 operations/54 routes; source 64 files/220 operation refs/54 routes; source checker 3/3; boundaries 427 imports/0 issue/8 negative fixtures; ESLint; TypeScript; domain/MSW 88/88; Vitest 85/85; production/demo Vite builds. Production artifact: 32 files, manifest SHA-256 EA5B3CF170EFA60665FFDEF244DAC2E808DA9ECE5B59A9FFAF9B502CA68305DC, no worker asset or MSW markers; demo: 37 files, manifest SHA-256 B5B225F602E90EC6A263A8ED0E39F180CBB9728EDFC98937DC37EB444679418C. Production retains the configured >500 kB raw chunk advisory. `npm.cmd run verify` and `npm.cmd run generate:check` wrapper invocations exit 1 because their child shell cannot resolve npm/node; direct entrypoints have their own PASS results, so the composite npm verify is not reported PASS.';
acceptance.verification.latestCurrentFullE2E =
  'S20 reran the complete Playwright suite against the post-R26 BotConfig alert-wrap source and current synthetic-MSW demo: 188/188 PASS in 10.6 minutes. It includes the new 320 CSS-pixel text-wrap regression, built-demo preview/pagination, production artifact isolation, route-role 357/357, empty 11/11, route-error 51/51, axe and the vertical journeys. The runner snapshotted 13 pre-existing user evidence files, restored all 13, and verified every restored SHA-256 byte-for-byte. S16 remains the previous 187/187 snapshot.';
acceptance.verification.targetedKeyboardAndTextFlow =
  'S18 targeted UI012 Chromium tests pass 5/5: four existing keyboard workflows plus the R26 BotConfig policy-literal wrapping regression at 320 CSS px. The regression confirms the alert message has no horizontal scroll overflow, no text range beyond its message box and no document horizontal overflow.';
acceptance.verification.zoom400TextFlow =
  `S17 after the R26 source fix: actual Chromium tab zoom remained 4x at 320 CSS px; ${textFlow.zoom400RouteSummary.routes}/${textFlow.zoom400RouteSummary.routes} routes had no document horizontal overflow or page errors. ${textFlow.zoom400RouteSummary.textFlowElementsAudited} text-flow elements were checked; ${textFlow.zoom400RouteSummary.unresolvedTextClipCount} unresolved clip rectangles remained after accounting for reachable labelled horizontal-scroll regions. This is automated evidence, not human visual or screen-reader signoff.`;
acceptance.verification.zoomScreenshotScale =
  `S21 compared screenshot surfaces at actual 400% Chrome tab zoom on R31 and R26. Playwright CSS/device PNGs each rasterize at 320 px wide despite DPR 4; CDP device-surface captures are 1280 px wide and retain the full page. Use the CDP captures for visual review. R31 heading/text fit within the 320 CSS-px viewport; R26 policy alert wraps within its panel. This corrects image presentation only; S17 remains the quantitative 17-route/325-text-flow assertion. Local Chromium + synthetic MSW, not human signoff.`;
acceptance.verification.readiness =
  'Current-source full FE-G04/FE-G08 evidence is fresh after S20/S19. FE-G05 remains partial: S14/S17 automated zoom/layout/text-flow evidence is current, but screen-reader speech/transcript and complete human review of interaction/error/icon states remain open; FE-G09 owner acceptance remains open. Current measured readiness remains 7/9 by the project gate rubric.';

for (const evidence of [
  'S14-actual-browser-tab-zoom-probe.mjs',
  'S14-actual-browser-tab-zoom-20261003.json',
  'S14-dashboard-400-20261003.png',
  'S14-reports-400-20261003.png',
  'S15-capture-direct-frontend-gates-20261003.ps1',
  'S15-current-frontend-gates-20261003.log',
  'S15-check-built-artifacts.mjs',
  'S15-built-artifacts-20261003.json',
  'S15-refresh-acceptance.mjs',
  'S16-run-current-full-e2e-20261003.mjs',
  'S16-current-full-e2e-20261003.log',
  'S17-zoom-text-clipping-probe-20261003.mjs',
  'S17-zoom-text-clipping-20261003.json',
  'S17-zoom-text-clipping-20261003.log',
  'S17-dashboard-400-20261003.png',
  'S17-reports-400-20261003.png',
  'S17-bot-400-20261003.png',
  'S18-run-targeted-ui012-20261003.mjs',
  'S18-targeted-ui012-regressions-20261003.log',
  'S19-capture-post-bot-alert-frontend-gates-20261003.ps1',
  'S19-current-frontend-gates-20261003.log',
  'S19-check-built-artifacts-20261003.mjs',
  'S19-built-artifacts-20261003.json',
  'S20-run-post-bot-alert-full-e2e-20261003.mjs',
  'S20-current-full-e2e-20261003.log',
  'S21-zoom-screenshot-scale-probe-20261003.mjs',
  'S21-zoom-screenshot-scale-20261003.json',
  'S21-zoom-screenshot-scale-20261003.log',
  'S21-R31-400-css-20261003.png',
  'S21-R31-400-device-20261003.png',
  'S21-R31-400-cdp-device-surface-20261003.png',
  'S21-R31-400-cdp-scale4-20261003.png',
  'S21-R26-400-css-20261003.png',
  'S21-R26-400-device-20261003.png',
  'S21-R26-400-cdp-device-surface-20261003.png',
  'S21-R26-400-cdp-scale4-20261003.png',
]) {
  if (!acceptance.evidence.includes(evidence)) acceptance.evidence.push(evidence);
}

acceptance.note =
  'SHA-256 fingerprints cover the current UI012 source/evidence bundle, S17 zoom text-flow probe, S18 targeted browser regression, S19 direct frontend gates, S20 full current-source E2E, plan and project status documents. S14/S17 use isolated Chromium profiles/extensions and local synthetic-MSW; they do not supply manual screen-reader or complete interaction-state acceptance. S19 preserves the distinction between direct checks and composite npm wrapper failure. S20 restores all pre-existing test-written user artifacts and verifies their hashes. This acceptance JSON is excluded from its own hash set.';
acceptance.fingerprintRefreshNote =
  'S17/S18/S19/S20 refreshed evidence after detecting and fixing R26 BotConfig policy-literal clipping at 400% zoom. S21 corrects screenshot review scale: Playwright raster is 320 px; CDP device surface is 1280 px at DPR 4, with full R31/R26 captures. Text-flow probe: 17/17 route layout, 0 unresolved clips; targeted UI012 5/5; direct frontend gates PASS; full Chromium E2E 188/188 with 13 prior evidence files restored and hash-verified. C04 stays PARTIAL for missing screen-reader/manual review; UI012 remains 4/5 and no FE/product ledger was changed.';

const additionalPaths = [
  'apps/web/src/modules/reports/index.tsx',
  'apps/web/src/modules/bot/index.tsx',
  'tests/ui012-keyboard.spec.ts',
  'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/KNOWN_GAPS.md',
  'evidence/REPORT.md',
  'evidence/frontend-ui-improvements/UI012/S07-manual-a11y-limitations-20261003.md',
  'evidence/frontend-ui-improvements/UI012/S14-actual-browser-tab-zoom-probe.mjs',
  'evidence/frontend-ui-improvements/UI012/S14-actual-browser-tab-zoom-20261003.json',
  'evidence/frontend-ui-improvements/UI012/S14-dashboard-400-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S14-reports-400-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S15-capture-direct-frontend-gates-20261003.ps1',
  'evidence/frontend-ui-improvements/UI012/S15-current-frontend-gates-20261003.log',
  'evidence/frontend-ui-improvements/UI012/S15-check-built-artifacts.mjs',
  'evidence/frontend-ui-improvements/UI012/S15-built-artifacts-20261003.json',
  'evidence/frontend-ui-improvements/UI012/S15-refresh-acceptance.mjs',
  'evidence/frontend-ui-improvements/UI012/S16-run-current-full-e2e-20261003.mjs',
  'evidence/frontend-ui-improvements/UI012/S16-current-full-e2e-20261003.log',
  'evidence/frontend-ui-improvements/UI012/S17-zoom-text-clipping-probe-20261003.mjs',
  'evidence/frontend-ui-improvements/UI012/S17-zoom-text-clipping-20261003.json',
  'evidence/frontend-ui-improvements/UI012/S17-zoom-text-clipping-20261003.log',
  'evidence/frontend-ui-improvements/UI012/S17-dashboard-400-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S17-reports-400-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S17-bot-400-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S18-run-targeted-ui012-20261003.mjs',
  'evidence/frontend-ui-improvements/UI012/S18-targeted-ui012-regressions-20261003.log',
  'evidence/frontend-ui-improvements/UI012/S19-capture-post-bot-alert-frontend-gates-20261003.ps1',
  'evidence/frontend-ui-improvements/UI012/S19-current-frontend-gates-20261003.log',
  'evidence/frontend-ui-improvements/UI012/S19-check-built-artifacts-20261003.mjs',
  'evidence/frontend-ui-improvements/UI012/S19-built-artifacts-20261003.json',
  'evidence/frontend-ui-improvements/UI012/S20-run-post-bot-alert-full-e2e-20261003.mjs',
  'evidence/frontend-ui-improvements/UI012/S20-current-full-e2e-20261003.log',
  'evidence/frontend-ui-improvements/UI012/S21-zoom-screenshot-scale-probe-20261003.mjs',
  'evidence/frontend-ui-improvements/UI012/S21-zoom-screenshot-scale-20261003.json',
  'evidence/frontend-ui-improvements/UI012/S21-zoom-screenshot-scale-20261003.log',
  'evidence/frontend-ui-improvements/UI012/S21-R31-400-css-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S21-R31-400-device-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S21-R31-400-cdp-device-surface-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S21-R31-400-cdp-scale4-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S21-R26-400-css-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S21-R26-400-device-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S21-R26-400-cdp-device-surface-20261003.png',
  'evidence/frontend-ui-improvements/UI012/S21-R26-400-cdp-scale4-20261003.png',
];

const fingerprintPaths = new Set([...Object.keys(acceptance.fingerprints), ...additionalPaths]);
for (const relativePath of fingerprintPaths) {
  const bytes = await readFile(path.join(root, relativePath));
  acceptance.fingerprints[relativePath] = createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

await writeFile(acceptancePath, `${JSON.stringify(acceptance, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: acceptance.status,
  checkpoints: acceptance.checkpoints,
  evidence: acceptance.evidence.length,
  fingerprints: Object.keys(acceptance.fingerprints).length,
  zoomRoutes: zoom.zoom400RouteSummary.routes,
  zoomLayout: zoom.zoom400RouteSummary.layoutAssertionStatus,
}, null, 2));
