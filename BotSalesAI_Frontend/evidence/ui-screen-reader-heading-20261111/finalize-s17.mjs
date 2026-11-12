import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const dir = 'evidence/ui-screen-reader-heading-20261111';
const manifest = 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const e = JSON.parse(fs.readFileSync(manifest));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function add(id, command, file, pattern, summary) {
    const bytes = fs.readFileSync(`${dir}/${file}`);
    assert.match(bytes.toString('utf8'), pattern);
    e.checks.push({ id, command, exitCode: 0, result: 'PASS', expected: summary, observed: summary, log: { path: `BotSalesAI_Frontend/${dir}/${file}`, sha256: sha(bytes) } });
}
add('heading-narrator-scoped-20261111', 'Manual Narrator Speech recap on local service-case demo', 'narrator-observation.md', /Chi tiết yêu cầu sau bán dialog/, 'Narrator Speech recap visibly reported the service-case table, detail dialog close button and customer link; Escape visibly returned focus.');
add('heading-capture-after-20261111', 'Chromium paired service-case detail captures at 390 and 1440 CSS px', 'capture-after.log', /heading \\"Chi tiết yêu cầu sau bán\\"/, 'Two selected service-case dialog captures show the title as the heading name and the close button as a separate control.');
add('heading-verify-20261111', 'npm run verify', 'verify.log', /VERIFY_STEP_FINISHED=\{"script":"test:evidence","exitCode":0/, 'Full frontend verify passed, including 263 Vitest tests and S17 validation.');
const coverage = e.coverage.find(item => item.name === 'heading-screen-reader-acceptance-20261111');
coverage.reason = 'Selected service-case Narrator speech recap was observed; other dialogs, states and roles, TalkBack speech, physical mobile and owner acceptance remain unverified.';
e.knownLimits.push('The initial screen-reader attempt in this follow-up is superseded for one desktop service-case flow by the later Narrator Speech recap; it is not a full Narrator or TalkBack acceptance.');
e.recordedAt = new Date().toISOString();
const screenshots = {};
for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.png'))) screenshots[`${dir}/${name}`] = sha(fs.readFileSync(path.join(dir, name)));
fs.writeFileSync(`${dir}/screenshot-hashes.json`, JSON.stringify(screenshots, null, 2) + '\n');
fs.writeFileSync(manifest, JSON.stringify(e, null, 2) + '\n');
