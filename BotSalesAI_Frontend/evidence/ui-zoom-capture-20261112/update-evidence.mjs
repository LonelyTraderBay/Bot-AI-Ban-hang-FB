import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repository = path.resolve('..');
const manifest = 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const report = 'evidence/REPORT.md';
const dir = 'evidence/ui-zoom-capture-20261112';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const original = fs.readFileSync(manifest);
const e = JSON.parse(original);
const text = fs.readFileSync(report);
const marker = '## Chụp lại ảnh zoom 200% — 12/11/2026';
assert(!text.toString('utf8').includes(marker), 'Report entry already exists');
assert(!e.checks.some(check => check.id === 'zoom-image-recapture-20261112'), 'Check already exists');
for (const [file, expected] of Object.entries(e.sourceFingerprints)) {
    assert.equal(sha(fs.readFileSync(path.join(repository, file))), expected, `Existing source fingerprint changed: ${file}`);
}
const data = JSON.parse(fs.readFileSync(`${dir}/recapture-v5/diagnostic.json`));
assert.equal(data.records.length, 4);
const images = [];
for (const record of data.records) {
    assert.equal(record.zoomSetting, '2');
    assert.deepEqual([record.before.width, record.before.height, record.before.dpr], [640, 360, 2]);
    assert.deepEqual([record.after.width, record.after.height, record.after.dpr], [640, 360, 2]);
    assert.equal(record.after.scrollY, record.before.scrollY);
    const image = record.captures['cdp-clip'];
    assert.equal(sha(fs.readFileSync(image.path)), image.sha256);
    assert.deepEqual([image.width, image.height], [1280, 720]);
    images.push(image.path);
}
const logPath = `${dir}/recapture-v5-run.log`;
const log = fs.readFileSync(logPath);
assert.match(log.toString(), /Diagnostic records: 4/);
assert.match(log.toString(), /EXIT=0/);
const summary = 'Four current-source Chrome native 200% diagnostic clips were captured and checked for matching hashes, dimensions, viewport, DPR and scroll; historical screenshot captures remain unchanged.';
e.checks.push({ id: 'zoom-image-recapture-20261112', command: 'node evidence/ui-zoom-capture-20261112/diagnose-capture.mjs', exitCode: 0, result: 'PASS', expected: summary, observed: summary, log: { path: `BotSalesAI_Frontend/${logPath}`, sha256: sha(log) } });
const limit = 'Sixteen historical W30 screenshots from four previous source snapshots are blank; four new current-source clips do not recreate those historical screenshots or prove their visual baselines. Native zoom capture is scoped to Chrome DPR 2 and two scenarios.';
e.knownLimits.push(limit);
e.coverage.push({ name: 'zoom-historical-screenshot-reconciliation-20261112', expected: 16, observed: 0, missing: 16, result: 'OPEN', reason: limit });
e.recordedAt = new Date().toISOString();
const appended = `\n\n${marker}\n\nCollector W30 tái chạy 5/5 theo phép đo DOM; bốn ảnh viewport của hai tình huống vẫn trống. Bốn ảnh mới trên source hiện tại dùng native Chrome zoom 200% và CDP clip; [kết quả, ảnh và giới hạn](ui-zoom-capture-20261112/RESULT.md). 16 ảnh lịch sử giữ nguyên, không dùng ảnh hiện tại thay cho baseline cũ; S17 vẫn IN_PROGRESS.\n`;
const newReport = Buffer.concat([text, Buffer.from(appended)]);
e.sourceFingerprints['BotSalesAI_Frontend/evidence/REPORT.md'] = sha(newReport);
for (const file of [`${dir}/diagnose-capture.mjs`, `${dir}/RESULT.md`, `${dir}/recapture-v5/diagnostic.json`, 'evidence/frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-image-recapture-20261112.json', ...images]) {
    e.sourceFingerprints[`BotSalesAI_Frontend/${file}`] = sha(fs.readFileSync(file));
}
assert(fs.readFileSync(manifest).equals(original), 'Evidence manifest changed concurrently');
assert(fs.readFileSync(report).equals(text), 'Report changed concurrently');
fs.writeFileSync(report, newReport);
fs.writeFileSync(manifest, `${JSON.stringify(e, null, 2)}\n`);
console.log('Added current-source capture evidence; historical screenshot coverage remains OPEN.');
