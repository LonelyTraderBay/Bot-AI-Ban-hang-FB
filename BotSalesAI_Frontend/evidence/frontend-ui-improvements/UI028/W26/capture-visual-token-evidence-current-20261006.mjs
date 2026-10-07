import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { auditAppDesignSource } from '../../../../scripts/check-visual-tokens.mjs';

const root = path.resolve(import.meta.dirname, '../../../../');
const output = import.meta.dirname;
const digest = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const report = auditAppDesignSource({ root });
const sourceHashes = report.scannedFiles.map(file => ({ path: file, sha256: digest(file) }));
const governedFiles = [
    'botsales-kit/design/tokens.json',
    'scripts/check-visual-tokens.mjs',
    'tests/visual-token-checker.test.mjs',
    'package.json',
    'apps/web/src/shared/ui/visual.ts',
    'apps/web/src/shared/ui/theme.ts',
    'apps/web/src/app/bootstrap.css',
];
const hashManifest = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    scope: 'Current React/TypeScript Frontend visual-token audit; generated tokens.css is excluded because it is derived from botsales-kit/design/tokens.json.',
    sourceRoot: report.sourceRoot,
    scannedFiles: report.files,
    findings: report.counts.total,
    sourceHashes,
    governedFiles: governedFiles.map(file => ({ path: file, sha256: digest(file) })),
};
fs.writeFileSync(path.join(output, 'visual-token-inventory-current-20261006.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(output, 'visual-source-hashes-current-20261006.json'), `${JSON.stringify(hashManifest, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, scannedFiles: report.files, findings: report.counts.total, hashedSources: sourceHashes.length, governedFiles: governedFiles.length }));
if (report.status !== 'PASS') process.exitCode = 1;
