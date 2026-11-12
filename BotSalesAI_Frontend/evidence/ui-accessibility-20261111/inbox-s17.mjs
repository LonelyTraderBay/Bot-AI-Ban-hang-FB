import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
const dir = 'evidence/ui-accessibility-20261111';
const manifest = 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const evidence = JSON.parse(fs.readFileSync(manifest));
const sha = data => createHash('sha256').update(data).digest('hex');
for (const file of ['apps/web/src/modules/inbox/index.tsx', 'tests/ui-inbox-text-resize.spec.ts', `${dir}/inbox-capture.mjs`, 'evidence/frontend-ui-improvements/UI028/W30/capture-native-text-only-desktop-a11y-20261111.mjs']) evidence.sourceFingerprints[`BotSalesAI_Frontend/${file}`] = sha(fs.readFileSync(file));
function record(id, command, file, pattern, summary, result = 'PASS', observed = summary, exitCode = 0) {
    const bytes = fs.readFileSync(`${dir}/${file}`);
    assert.match(bytes.toString('utf8'), pattern);
    evidence.checks.push({ id, command, exitCode, result, expected: summary, observed, log: { path: `BotSalesAI_Frontend/${dir}/${file}`, sha256: sha(bytes) } });
}
record('accessibility-desktop-text-before-20261111', 'Firefox native text-only 200%, desktop 1280x900 before inbox fix', 'firefox-text-desktop.log', /"result": "FAIL"/, 'Three desktop text-only scenarios pass without clipped text.', 'FAIL', 'One scenario passed; two detected eight clipped conversation names/previews before the inbox fix.', 1);
record('accessibility-desktop-text-after-20261111', 'Firefox native text-only 200%, desktop 1280x900 after inbox fix', 'firefox-text-desktop-final.log', /"result": "PASS"/, 'Three selected desktop Firefox text-only scenarios passed after the inbox fix.');
record('accessibility-inbox-wrap-20261111', 'Playwright inbox text wrap, Chromium and Firefox', 'inbox-test-final.log', /2 passed/, 'Two browser cases passed at 390 and 1440 CSS px with enlarged conversation names and previews.');
record('accessibility-post-inbox-chrome-20261111', 'Native Chrome page zoom 200%; W30 scenarios after inbox fix', 'chrome-zoom-post-inbox.log', /"result": "PASS"/, 'Five selected Chrome native 200% page-zoom scenarios passed on the final UI source.');
record('accessibility-post-inbox-firefox-attempt-20261111', 'Native Firefox text-only 200%; first post-fix attempt', 'firefox-text-post-inbox.log', /Beforeunload prompt was rejected/, 'Five selected Firefox native text-only scenarios complete.', 'FAIL', 'Four scenarios passed; the next navigation was rejected by a beforeunload prompt. The full five-scenario retry is recorded separately.', 1);
record('accessibility-post-inbox-firefox-20261111', 'Native Firefox text-only 200%; W30 retry after inbox fix', 'firefox-text-post-inbox-retry.log', /"result": "PASS"/, 'Five selected Firefox native 200% text-only scenarios passed on the final UI source.');
evidence.scope += ' Inbox follow-up: desktop native text-only initially found clipped conversation list text; final runs retest after wrapping.';
evidence.knownLimits.push('The 1280px Firefox native text-only run covers three scenarios, not every desktop screen; mobile-width Firefox runs are desktop browser viewports, not TalkBack or a physical phone. The service-case route itself was not tested with native Firefox text-only resize.');
evidence.recordedAt = new Date().toISOString();
fs.writeFileSync(manifest, JSON.stringify(evidence, null, 2) + '\n');
