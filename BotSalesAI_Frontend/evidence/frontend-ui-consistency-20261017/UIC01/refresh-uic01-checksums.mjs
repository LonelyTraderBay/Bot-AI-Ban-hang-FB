import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(root, 'SHA256SUMS.json');
const files = [];

async function walk(directory) {
    if (directory !== root && path.basename(directory).startsWith('ci-run-')) return;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(absolutePath);
        else if (entry.isFile() && absolutePath !== manifestPath) files.push(absolutePath);
    }
}

await walk(root);
files.sort((left, right) => left.localeCompare(right, 'en'));

const manifest = {
    task: 'UIC01',
    algorithm: 'SHA-256',
    files: await Promise.all(files.map(async absolutePath => {
        const content = await readFile(absolutePath);
        const info = await stat(absolutePath);
        return {
            path: path.relative(root, absolutePath).split(path.sep).join('/'),
            sha256: createHash('sha256').update(content).digest('hex'),
            bytes: info.size,
        };
    })),
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ files: manifest.files.length, manifest: 'SHA256SUMS.json' }, null, 2));
