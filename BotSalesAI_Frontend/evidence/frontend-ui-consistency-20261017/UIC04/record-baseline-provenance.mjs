import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const baselineCommit = '7bd319c7761cc61120edc4ecca1c3fa42939db29';
const sourceFiles = ['apps/web/src/modules/dashboard/index.tsx', 'tests/ui-dashboard-layout.spec.ts'];
const digest = value => createHash('sha256').update(value).digest('hex');
const baselineFiles = {};
for (const relativePath of sourceFiles) {
    const bytes = execFileSync('git', ['show', `${baselineCommit}:BotSalesAI_Frontend/${relativePath}`], { cwd: frontendRoot, encoding: null });
    baselineFiles[relativePath] = { sha256: digest(bytes), bytes: bytes.length };
}
const beforePath = path.join(here, 'dashboard-states-chromium.json');
const geometryPath = path.join(here, 'dashboard-geometry-chromium.json');
const afterPath = path.join(here, 'dashboard-states-after-chromium.json');
const after = JSON.parse(await readFile(afterPath, 'utf8'));
const provenance = {
    recordedAt: new Date().toISOString(),
    beforeMeasurement: { path: path.relative(frontendRoot, beforePath).replaceAll(path.sep, '/'), sha256: digest(await readFile(beforePath)) },
    beforeGeometryCrossCheck: { path: path.relative(frontendRoot, geometryPath).replaceAll(path.sep, '/'), sha256: digest(await readFile(geometryPath)) },
    beforeSourceCommit: baselineCommit,
    beforeSourceFiles: baselineFiles,
    afterGitHead: after.gitHead,
    afterSourceFiles: after.sourceFingerprints,
    afterBrowserVersion: after.browserVersion,
    afterRecordedAt: after.recordedAt,
};
await writeFile(path.join(here, 'baseline-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(provenance, null, 2));
