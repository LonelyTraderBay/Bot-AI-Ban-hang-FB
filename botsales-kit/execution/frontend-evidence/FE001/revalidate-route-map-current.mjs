import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeMap = JSON.parse(fs.readFileSync(path.join(root, 'docs/route-implementation.json'), 'utf8'));
const routeManifest = JSON.parse(fs.readFileSync(path.join(root, 'botsales-kit/contracts/route-manifest.json'), 'utf8'));
const browserLogPath = 'botsales-kit/execution/frontend-evidence/FE027/e2e-current-final-20261001-ui-coverage-complete.log';
const browserLog = fs.readFileSync(path.join(root, browserLogPath), 'utf8');
const canonical = new Map(routeManifest.routes.map(route => [route.id, route]));
const seen = new Set();
const missing = [];
let routeMountEvidence = 0;
const features = routeMap.flatMap(route => route.featureCoverage ?? []);

for (const route of routeMap) {
    if (seen.has(route.routeId)) missing.push(`duplicate route ${route.routeId}`);
    seen.add(route.routeId);
    const expected = canonical.get(route.routeId);
    if (!expected || expected.path !== route.route) missing.push(`non-canonical route ${route.routeId}`);
    const sourcePath = path.join(root, route.source);
    if (!fs.existsSync(sourcePath)) {
        missing.push(`missing source ${route.source}`);
        continue;
    }
    const source = fs.readFileSync(sourcePath, 'utf8');
    if (!source.includes(`function ${route.component}(`)) missing.push(`missing component ${route.component}`);
    if (route.routeEvidence?.result !== 'PASS' || !browserLog.includes(route.routeEvidence.testTitle))
        missing.push(`missing browser route case ${route.routeId}`);
    else routeMountEvidence++;
}

for (const feature of features) {
    if (feature.coverage !== 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC') missing.push(`feature not interaction-verified ${feature.featureId}`);
    const cases = feature.evidenceCases ?? [];
    if (!cases.length) missing.push(`no evidence case ${feature.featureId}`);
    for (const evidence of cases) {
        const testPath = path.join(root, evidence.file);
        if (!fs.existsSync(testPath)) {
            missing.push(`missing test ${evidence.file}`);
            continue;
        }
        const testSource = fs.readFileSync(testPath, 'utf8');
        if (!testSource.includes(evidence.title) || !browserLog.includes(evidence.title))
            missing.push(`test/log mismatch ${feature.featureId}: ${evidence.title}`);
    }
}

const passMatch = browserLog.match(/^\s*(\d+) passed \([^)]+\)\s*$/m);
if (!passMatch || Number(passMatch[1]) !== 123) missing.push('expected current full browser run with 123 passing tests');
if (!browserLog.includes('all canonical routes render inside the real React demo application'))
    missing.push('canonical route smoke is absent from the current browser run');
if (routeMap.length !== 54 || seen.size !== 54 || seen.size !== canonical.size)
    missing.push(`expected 54 canonical routes; map=${routeMap.length}, unique=${seen.size}, manifest=${canonical.size}`);

const result = {
    status: missing.length ? 'FAIL' : 'PASS',
    scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    canonicalRoutes: routeMap.length,
    mappedSources: new Set(routeMap.map(route => route.source)).size,
    sourceModuleDirectories: fs.readdirSync(path.join(root, 'apps/web/src/modules'), { withFileTypes: true }).filter(entry => entry.isDirectory()).length,
    routesWithCurrentBrowserEvidence: routeMountEvidence,
    featureRouteEntries: features.length,
    uniqueFeatureIds: new Set(features.map(feature => feature.featureId)).size,
    featureEntriesWithNamedCurrentBrowserInteraction: features.filter(feature =>
        (feature.evidenceCases ?? []).some(evidence => browserLog.includes(evidence.title))).length,
    browserRun: `${passMatch?.[1] ?? 'missing'} passed`,
    browserLog: browserLogPath,
    missing,
};
console.log(JSON.stringify(result, null, 2));
if (missing.length) process.exitCode = 1;
