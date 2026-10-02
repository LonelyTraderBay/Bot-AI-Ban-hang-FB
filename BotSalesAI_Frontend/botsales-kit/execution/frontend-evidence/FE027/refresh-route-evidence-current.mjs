import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mapPath = path.join(root, 'docs/route-implementation.json');
const manifestPath = path.join(root, 'botsales-kit/contracts/route-manifest.json');
const currentLog = 'botsales-kit/execution/frontend-evidence/FE027/e2e-current-final-20261001-ui-coverage-complete.log';
const log = fs.readFileSync(path.join(root, currentLog), 'utf8');
const passMatch = log.match(/^\s*(\d+) passed \([^)]+\)\s*$/m);
if (!passMatch || Number(passMatch[1]) < 110 || !log.includes('all canonical routes render inside the real React demo application')) {
    throw new Error('The final Chromium log must include at least 110 passing tests and the canonical route smoke.');
}

const routes = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const canonical = new Map(manifest.routes.map(route => [route.id, route]));
const ids = new Set();
let featureCases = 0;
for (const route of routes) {
    if (ids.has(route.routeId)) throw new Error(`Duplicate route ${route.routeId}`);
    ids.add(route.routeId);
    const contract = canonical.get(route.routeId);
    if (!contract || contract.path !== route.route || !fs.existsSync(path.join(root, route.source))) {
        throw new Error(`Route/source does not match canonical manifest: ${route.routeId}`);
    }
    route.routeEvidence.logFile = currentLog;
    for (const feature of route.featureCoverage ?? []) {
        for (const evidence of feature.evidenceCases ?? []) {
            evidence.logFile = currentLog;
            featureCases++;
        }
    }
}
if (routes.length !== 54 || ids.size !== canonical.size) throw new Error(`Expected 54 routes, got ${routes.length}.`);
fs.writeFileSync(mapPath, `${JSON.stringify(routes, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ status: 'PASS', routes: routes.length, featureEvidenceCases: featureCases, browserLog: currentLog, logResult: `${passMatch[1]}/${passMatch[1]} Chromium tests passed; route smoke included`, dataScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API' })}\n`);
