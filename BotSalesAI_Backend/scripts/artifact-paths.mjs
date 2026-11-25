import { isAbsolute, join } from 'node:path';

export function backendArtifacts(workspace) {
    const root = process.env.BOTSALES_ARTIFACT_ROOT;
    if (root && !isAbsolute(root)) throw new Error('BOTSALES_ARTIFACT_ROOT must be an absolute path');
    return join(root || join(workspace, 'test-results'), 'backend');
}
