import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('..');
const dir = 'evidence/ui-accessibility-20261111';
const manifest = 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const evidence = JSON.parse(fs.readFileSync(manifest));
const baseline = JSON.parse(fs.readFileSync(`${dir}/baseline-input-hashes.json`));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const allowed = 'BotSalesAI_Frontend/apps/web/src/modules/customers/index.tsx';
for (const [file, expected] of Object.entries(baseline)) {
    const current = hash(fs.readFileSync(path.join(root, file)));
    if (current !== expected) assert.equal(file, allowed, `Unexpected changed input: ${file}`);
    evidence.sourceFingerprints[file] = current;
}
for (const file of ['tests/ui-service-cases-accessibility.spec.ts', `${dir}/service-cases-capture.mjs`, `${dir}/service-case-chrome-zoom.mjs`]) {
    evidence.sourceFingerprints[`BotSalesAI_Frontend/${file}`] = hash(fs.readFileSync(file));
}
const add = (id, command, file, expected, result = 'PASS', observed = expected, exitCode = 0) => {
    const bytes = fs.readFileSync(`${dir}/${file}`);
    const record = { id, command, exitCode, result, expected, observed, log: { path: `BotSalesAI_Frontend/${dir}/${file}`, sha256: hash(bytes) } };
    assert(!evidence.checks.some(check => check.id === id));
    evidence.checks.push(record);
};
assert.match(fs.readFileSync(`${dir}/service-case-test-final.log`, 'utf8'), /8 passed/);
for (const file of ['chrome-zoom-final.log', 'firefox-text-final.log', 'service-case-chrome-zoom-final.log']) assert.match(fs.readFileSync(`${dir}/${file}`, 'utf8'), /"result": "PASS"/);
add('accessibility-service-cases-20261111', 'Playwright: ui-service-cases-accessibility and ui-customers-layout on Chromium and Firefox', 'service-case-test-final.log', '8 cases passed; includes 320/390/1440 CSS px, keyboard entry, customer ID fallback and existing dialog layouts.');
add('accessibility-chrome-zoom-20261111', 'Native Chrome page zoom 200%; W30 five synthetic scenarios', 'chrome-zoom-final.log', '5 of 5 selected W30 scenarios passed with native Chrome page zoom 200%.');
add('accessibility-firefox-text-20261111', 'Native Firefox text-only zoom 200%; W30 five synthetic scenarios', 'firefox-text-final.log', '5 of 5 selected W30 scenarios passed with native Firefox text-only zoom 200%.');
add('accessibility-service-case-zoom-20261111', 'Native Chrome 200% page zoom: service case details and processing', 'service-case-chrome-zoom-final.log', 'Native Chrome 200% at 640 by 360 CSS px: service-case dialog geometry and detail-to-processing flow passed.');
add('accessibility-screen-reader-attempt-20261111', 'Attempt Narrator speech recap and mobile screen reader', 'screen-reader-attempt.md', 'Observe actual screen-reader speech on desktop and mobile.', 'NOT_RUN', 'Narrator window was inaccessible at higher integrity; no speech captured. TalkBack and physical mobile were not tested.', 1);
const reason = 'Selected native zoom/text-only and synthetic browser tests do not cover every route, permission or state. Firefox text-only was not tested on the changed service-case detail. Narrator speech, TalkBack, physical mobile, hosted and owner acceptance remain unverified. The pre-edit dialog screenshots were captured during its opening transition and are not paired visual acceptance.';
evidence.coverage.push({ name: 'accessibility-followup-acceptance-20261111', expected: 1, observed: 0, missing: 1, result: 'OPEN', reason });
evidence.knownLimits.push(reason);
evidence.status = 'IN_PROGRESS';
evidence.recordedAt = new Date().toISOString();
evidence.scope += ' Accessibility follow-up 20261111 records selected native zoom, text resize and service-case results; screen-reader and physical mobile acceptance remain open.';
fs.writeFileSync(manifest, JSON.stringify(evidence, null, 2) + '\n');
console.log('S17 updated; acceptance remains IN_PROGRESS.');
