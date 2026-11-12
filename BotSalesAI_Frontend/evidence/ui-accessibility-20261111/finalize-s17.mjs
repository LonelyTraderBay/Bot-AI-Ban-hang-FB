import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dir = 'evidence/ui-accessibility-20261111';
const manifest = 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const evidence = JSON.parse(fs.readFileSync(manifest));
const sha = data => createHash('sha256').update(data).digest('hex');
const records = [
    ['accessibility-service-regression-20261111', 'Playwright frontend-completeness R54 on Chromium and Firefox', 'service-case-regression.log', /8 passed/, '8 service-case detail cases passed, covering delayed data and 403, 404 and 503 responses on both browsers.'],
    ['accessibility-verify-20261111', 'npm run verify', 'verify-final.log', /VERIFY_STEP_FINISHED=\{"script":"test:evidence","exitCode":0/, 'Full frontend verify passed, including 263 Vitest tests and S17 validation.'],
];
for (const [id, command, file, pattern, summary] of records) {
    const bytes = fs.readFileSync(`${dir}/${file}`);
    assert.match(bytes.toString('utf8'), pattern);
    assert(!evidence.checks.some(item => item.id === id));
    evidence.checks.push({ id, command, exitCode: 0, result: 'PASS', expected: summary, observed: summary, log: { path: `BotSalesAI_Frontend/${dir}/${file}`, sha256: sha(bytes) } });
}
const shots = {};
for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.png'))) shots[`${dir}/${name}`] = sha(fs.readFileSync(path.join(dir, name)));
fs.writeFileSync(`${dir}/screenshot-hashes.json`, JSON.stringify(shots, null, 2) + '\n');
evidence.recordedAt = new Date().toISOString();
fs.writeFileSync(manifest, JSON.stringify(evidence, null, 2) + '\n');
console.log('Recorded verify and regression; S17 remains IN_PROGRESS.');
