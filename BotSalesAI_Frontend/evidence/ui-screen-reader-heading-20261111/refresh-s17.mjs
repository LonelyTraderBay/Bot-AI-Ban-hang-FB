import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const dir = 'evidence/ui-screen-reader-heading-20261111';
const manifest = 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const e = JSON.parse(fs.readFileSync(manifest));
const baseline = JSON.parse(fs.readFileSync(`${dir}/baseline-input-hashes.json`));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [file, before] of Object.entries(baseline)) {
    const after = hash(fs.readFileSync(path.join('..', file)));
    if (before !== after) assert.equal(file, 'BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx', `Unexpected source change: ${file}`);
    e.sourceFingerprints[file] = after;
}
for (const file of ['tests/ui-dialog-heading-accessibility.spec.ts', `${dir}/capture.mjs`]) e.sourceFingerprints[`BotSalesAI_Frontend/${file}`] = hash(fs.readFileSync(file));
function add(id, command, file, pattern, expected, result = 'PASS', observed = expected, exitCode = 0) {
    const bytes = fs.readFileSync(`${dir}/${file}`);
    assert.match(bytes.toString('utf8'), pattern);
    assert(!e.checks.some(item => item.id === id));
    e.checks.push({ id, command, exitCode, result, expected, observed, log: { path: `BotSalesAI_Frontend/${dir}/${file}`, sha256: hash(bytes) } });
}
add('heading-a11y-before-20261111', 'Playwright dialog heading negative test before shared fix', 'test-before.log', /1 failed/, 'Heading has the title alone as its accessible name.', 'FAIL', 'The heading accessible name included the separately named close button before the fix.', 1);
add('heading-a11y-after-20261111', 'Playwright dialog headings on Chromium and Firefox', 'test-final.log', /2 passed/, 'Two browser cases passed for two dialogs at 390 and 1440 CSS px, including separate close name and focus restoration.');
add('heading-dialog-regression-20261111', 'Playwright service-case detail regression on Chromium and Firefox', 'dialog-regression.log', /8 passed/, 'Eight service-case detail cases passed, including loading and error states on both browsers.');
add('heading-native-chrome-20261111', 'Chrome native 200% page zoom five W30 scenarios', 'chrome-zoom.log', /"result": "PASS"/, 'Five selected native Chrome 200% page-zoom scenarios passed after the shared change.');
add('heading-native-firefox-20261111', 'Firefox native 200% text-only zoom five W30 scenarios', 'firefox-text.log', /"result": "PASS"/, 'Five selected native Firefox 200% text-only scenarios passed after the shared change.');
add('heading-screen-reader-session-20261111', 'Attempt Narrator and TalkBack speech on resumed session', 'screen-reader-session.md', /No TalkBack speech/, 'Observe Narrator and TalkBack speech on the local demo.', 'NOT_RUN', 'Earlier windows were absent; the restarted emulator had TalkBack off and Narrator remained above helper integrity. No speech was observed.', 1);
const reason = 'The shared heading semantics are checked on selected dialogs; other dialogs, states and roles are not fully covered. Narrator and TalkBack speech have not been observed in the current session, and physical mobile and owner acceptance remain open.';
e.coverage.push({ name: 'heading-screen-reader-acceptance-20261111', expected: 1, observed: 0, missing: 1, result: 'OPEN', reason });
e.knownLimits.push(reason);
e.scope += ' Shared dialog heading follow-up 20261111 fixes its accessible name; browser semantics and selected reflow checks are not a screen-reader speech verdict.';
e.recordedAt = new Date().toISOString();
e.status = 'IN_PROGRESS';
fs.writeFileSync(manifest, JSON.stringify(e, null, 2) + '\n');
