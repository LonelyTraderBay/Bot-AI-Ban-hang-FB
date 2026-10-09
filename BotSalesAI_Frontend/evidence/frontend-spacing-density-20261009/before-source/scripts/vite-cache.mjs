import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

export function isolatedViteCacheDir(projectRoot, role, runId) {
    if (!/^[a-zA-Z0-9._-]+$/.test(role) || !/^[a-zA-Z0-9._-]+$/.test(runId)) {
        throw new Error('Vite cache role and run ID must contain only letters, numbers, dots, underscores, or hyphens.');
    }

    let normalizedRoot = path.resolve(projectRoot);
    if (process.platform === 'win32') normalizedRoot = normalizedRoot.toLowerCase();
    const rootId = createHash('sha256').update(normalizedRoot).digest('hex').slice(0, 20);
    return path.join(os.tmpdir(), 'botsales-vite-cache', rootId, role, runId);
}
