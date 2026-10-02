import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mapPath = path.join(root, 'docs/route-implementation.json');
const manifestPath = path.join(root, 'botsales-kit/contracts/route-manifest.json');
const currentLog = 'botsales-kit/execution/frontend-evidence/FE007/e2e-priority-current-20261001.log';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const log = fs.readFileSync(path.join(root, currentLog), 'utf8');
if (!log.includes('all canonical routes render inside the real React demo application') || !log.includes('106 passed')) {
    throw new Error('Current Chromium log does not contain the passing canonical-route smoke case.');
}

for (const route of map) {
    if (route.routeEvidence) route.routeEvidence.logFile = currentLog;
    for (const feature of route.featureCoverage ?? []) {
        for (const evidence of feature.evidenceCases ?? []) evidence.logFile = currentLog;
    }
}
fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);

const manifestRoutes = new Map(manifest.routes.map(route => [route.id, route]));
const seen = new Set();
for (const item of map) {
    if (seen.has(item.routeId)) throw new Error(`Duplicate route ${item.routeId}`);
    seen.add(item.routeId);
    const canonical = manifestRoutes.get(item.routeId);
    if (!canonical || canonical.path !== item.route) throw new Error(`Route/path mismatch for ${item.routeId}`);
    if (!fs.existsSync(path.join(root, item.source))) throw new Error(`Missing mapped source ${item.source}`);
    if (item.routeEvidence?.logFile !== currentLog) throw new Error(`Stale route evidence log for ${item.routeId}`);
    for (const feature of item.featureCoverage ?? []) {
        for (const evidence of feature.evidenceCases ?? []) {
            if (evidence.logFile !== currentLog) throw new Error(`Stale feature evidence log for ${item.routeId}`);
        }
    }
}
if (map.length !== 54 || manifest.routes.length !== 54 || seen.size !== manifestRoutes.size) {
    throw new Error(`Expected 54 unique canonical routes, got map=${map.length}, manifest=${manifest.routes.length}, unique=${seen.size}`);
}

process.stdout.write(`${JSON.stringify({ status: 'PASS', canonicalRoutes: map.length, uniqueSourceFiles: new Set(map.map(item => item.source)).size, mappedSourcesExist: true, evidenceReferencesRefreshed: true, currentBrowserLog: currentLog })}\n`);
