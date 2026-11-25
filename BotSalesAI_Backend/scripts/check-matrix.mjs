import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../apps/api/dist/app.js';
import { API_PREFIX, registeredRoutes } from '../apps/api/dist/http/operations.js';
import { checkSource, readInputs } from './matrix-source.mjs';
import { checkRegistration } from './matrix-runtime.mjs';
import { backendArtifacts } from './artifact-paths.mjs';

const workspace = fileURLToPath(new URL('..', import.meta.url));
const repository = resolve(workspace, '..');
const reportFile = resolve(backendArtifacts(workspace), 'matrix.json');
const result = { status: 'FAIL', issues: [] };
try {
    const git = args => execFileSync('git', args, { cwd: repository, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim();
    result.commit = git(['rev-parse', 'HEAD']);
    result.dirty = Boolean(git(['status', '--porcelain=v1', '--untracked-files=all']));
    const source = checkSource(readInputs(repository));
    const scope = JSON.parse(readFileSync(resolve(workspace, 'api-scope.json'), 'utf8'));
    const app = await createApp({ quiet: true });
    try {
        await app.init();
        const routes = registeredRoutes(app);
        result.baseline = source.baseline;
        result.openapiSha256 = source.openapiSha256;
        result.scope = scope;
        result.counts = { ...source.counts, registeredRoutes: routes.length, enabledOperations: scope.operations?.length };
        result.knownGaps = source.knownGaps;
        result.routes = routes.map(route => ({ ...route, path: API_PREFIX + route.path }));
        result.issues.push(...source.issues, ...checkRegistration(source, scope, routes, workspace));
        if (source.apiBase !== API_PREFIX) result.issues.push('API prefix differs from OpenAPI: ' + source.apiBase + ' vs ' + API_PREFIX);
        if (!result.issues.length) result.status = 'PASS';
    } finally {
        await app.close();
    }
} catch (error) {
    result.status = 'FAIL';
    result.issues.push(error.message);
}
mkdirSync(dirname(reportFile), { recursive: true });
writeFileSync(reportFile, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (result.status === 'FAIL') process.exitCode = 1;
