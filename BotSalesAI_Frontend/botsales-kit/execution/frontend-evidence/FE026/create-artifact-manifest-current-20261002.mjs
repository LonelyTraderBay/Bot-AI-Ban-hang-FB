import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const trees = ['apps/web/dist', 'apps/web/dist-demo'].map(directory => {
    const absolute = path.join(root, directory);
    if (!fs.existsSync(absolute)) throw new Error(`Missing built artifact: ${directory}`);
    const files = [];
    const visit = current => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const file = path.join(current, entry.name);
            if (entry.isDirectory()) visit(file);
            else {
                const bytes = fs.readFileSync(file);
                files.push({ path: path.relative(root, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: hash(bytes) });
            }
        }
    };
    visit(absolute);
    const hasWorker = files.some(file => file.path.endsWith('/mockServiceWorker.js'));
    if (directory.endsWith('/dist') && hasWorker) throw new Error('Production artifact unexpectedly includes the MSW worker.');
    if (directory.endsWith('/dist-demo') && !hasWorker) throw new Error('Demo artifact is missing the MSW worker.');
    return {
        directory,
        fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
        treeSha256: hash(Buffer.from(files.map(file => `${file.path}:${file.bytes}:${file.sha256}`).join('\n'))),
        mswWorkerIncluded: hasWorker,
        files,
    };
});

const manifest = {
    scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    createdAt: new Date().toISOString(),
    node: process.version,
    npm: '11.17.0',
    source: 'current local production/demo build outputs; cold-build reproduction logged separately',
    artifacts: trees,
};
const output = 'botsales-kit/execution/frontend-evidence/FE026/artifact-manifest-current-20261002.json';
fs.writeFileSync(path.join(root, output), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: 'PASS', output, artifacts: trees.map(({ directory, fileCount, totalBytes, treeSha256, mswWorkerIncluded }) => ({ directory, fileCount, totalBytes, treeSha256, mswWorkerIncluded })) }, null, 2));
