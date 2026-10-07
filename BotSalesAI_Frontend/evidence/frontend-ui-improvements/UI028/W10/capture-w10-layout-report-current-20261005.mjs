import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const directory = path.join(root, 'evidence/frontend-ui-improvements/UI028/W10');
const name = process.argv[2];
if (!name || !/^[a-z0-9-]+\.json$/i.test(name)) throw new Error('Pass an evidence JSON filename.');
const outputPath = path.join(directory, name);
if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite evidence: ${name}`);
const text = execFileSync(process.execPath, ['scripts/check-layout.mjs', '--report', '--json'], { cwd: root, encoding: 'utf8' });
const report = JSON.parse(text);
const files = [
    'scripts/check-layout.mjs',
    'scripts/layout-exceptions.json',
    'apps/web/src/modules/catalog/index.tsx',
    'apps/web/src/modules/catalog/imports.tsx',
    'apps/web/src/modules/catalog/import-file.ts',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/src/shared/ui/theme.ts',
    'botsales-kit/design/tokens.json',
    'botsales-kit/contracts/route-manifest.json',
];
report.capture = {
    capturedAt: new Date().toISOString(),
    task: 'UI028.W10',
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    checkerSha256: createHash('sha256').update(fs.readFileSync(path.join(root, 'scripts/check-layout.mjs'))).digest('hex'),
    sourceSha256: Object.fromEntries(files.slice(2).map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])),
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const catalogFindings = report.findings.filter(finding => finding.file.startsWith('apps/web/src/modules/catalog/'));
console.log(JSON.stringify({ output: name, total: report.findings.length, counts: report.counts, catalog: catalogFindings.length, byFile: Object.fromEntries([...new Set(catalogFindings.map(f => f.file))].map(file => [file, catalogFindings.filter(f => f.file === file).length])) }));
