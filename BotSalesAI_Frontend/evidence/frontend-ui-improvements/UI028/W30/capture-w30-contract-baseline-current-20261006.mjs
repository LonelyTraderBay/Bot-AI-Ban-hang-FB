import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../../../../');
const output = import.meta.dirname;
const files = [
    'apps/web/src/app/Shell.tsx',
    'apps/web/src/modules/workspace/index.tsx',
    'apps/web/src/modules/dashboard/index.tsx',
    'apps/web/src/modules/catalog/index.tsx',
    'apps/web/src/modules/inbox/index.tsx',
    'apps/web/src/modules/inbox/conversation-components.tsx',
    'apps/web/src/modules/reports/index.tsx',
    'apps/web/src/shared/ui/layout.ts',
    'apps/web/src/shared/ui/theme.ts',
    'apps/web/src/shared/ui/visual.ts',
    'botsales-kit/design/tokens.json',
    'botsales-kit/contracts/route-manifest.json',
];
const hashes = files.map(file => ({
    path: file,
    sha256: createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'),
}));
const baseline = {
    schemaVersion: 1,
    task: 'UI028.W30',
    phase: 'PRE_SOURCE_EDIT',
    capturedAt: new Date().toISOString(),
    scope: 'Frontend source profiles inspected before stress-test addition; this work adds browser tests only unless a measured UI defect requires a scoped fix.',
    files: hashes,
};
fs.writeFileSync(path.join(output, 'source-baseline-current-20261006.json'), `${JSON.stringify(baseline, null, 2)}\n`);
console.log(JSON.stringify({ task: baseline.task, phase: baseline.phase, files: hashes.length }));
