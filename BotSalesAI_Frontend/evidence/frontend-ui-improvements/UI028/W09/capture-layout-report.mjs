import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputName = process.argv[2];
if (!outputName || !/^[a-z0-9-]+\.json$/i.test(outputName)) throw new Error('Pass one evidence JSON filename.');
const reportText = execFileSync(process.execPath, ['scripts/check-layout.mjs', '--report', '--json'], { cwd: root, encoding: 'utf8' });
const report = JSON.parse(reportText);
const fingerprintFiles = [
    'scripts/check-layout.mjs', 'scripts/layout-exceptions.json', 'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/app/Shell.tsx', 'apps/web/src/app/router.tsx', 'apps/web/src/app/ScopeEvents.tsx',
    'apps/web/src/app/CommandRecovery.tsx', 'apps/web/src/app/feedback.tsx',
];
report.capture = {
    capturedAt: new Date().toISOString(),
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    checkerSha256: createHash('sha256').update(fs.readFileSync(path.join(root, 'scripts/check-layout.mjs'))).digest('hex'),
    sourceSha256: Object.fromEntries(fingerprintFiles.map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') ])),
};
const output = path.join(root, 'evidence/frontend-ui-improvements/UI028/W09', outputName);
if (fs.existsSync(output)) throw new Error(`Refusing to overwrite evidence: ${outputName}`);
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: path.basename(output), findings: report.findings.length, counts: report.counts, unknown: report.findings.filter(finding => finding.code.startsWith('UNKNOWN')).length }));
