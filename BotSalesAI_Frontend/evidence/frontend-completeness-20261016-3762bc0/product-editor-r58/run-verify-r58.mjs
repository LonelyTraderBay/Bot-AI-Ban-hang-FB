import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = path.resolve(import.meta.dirname, '../../..');
const npmCli = process.env.npm_execpath;
if (!npmCli || !existsSync(npmCli)) {
    console.error('Set npm_execpath to the locked npm CLI before running this evidence wrapper.');
    process.exit(1);
}

const existingPath = process.env.PATH ?? process.env.Path ?? '';
const maxPathLength = process.platform === 'win32' ? 6_000 : 32_000;
const entries = [
    path.dirname(process.execPath),
    path.join(projectRoot, 'node_modules', '.bin'),
    path.join(projectRoot, 'apps', 'web', 'node_modules', '.bin'),
    ...existingPath.split(path.delimiter),
];
const seen = new Set();
const pathEntries = [];
for (const entry of entries) {
    if (!entry || entry.length > 2_000) continue;
    let key;
    try {
        key = path.resolve(entry);
    } catch {
        continue;
    }
    if (process.platform === 'win32') key = key.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const nextLength = pathEntries.reduce((length, item) => length + item.length, 0)
        + entry.length + (pathEntries.length ? path.delimiter.length : 0);
    if (nextLength > maxPathLength) continue;
    pathEntries.push(entry);
}
const childPath = pathEntries.join(path.delimiter);

const result = spawnSync(process.execPath, [npmCli, 'run', 'verify'], {
    cwd: projectRoot,
    env: { ...process.env, PATH: childPath },
    stdio: 'inherit',
    windowsHide: true,
});
if (result.error) {
    console.error(`Could not start npm run verify: ${result.error.message}`);
    process.exit(1);
}
process.exit(result.status ?? 1);
