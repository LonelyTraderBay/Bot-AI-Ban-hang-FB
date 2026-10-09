import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const frontend = path.resolve(import.meta.dirname, '../..'), repository = path.dirname(frontend);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const executed = {};
for (const stage of ['verify','e2e','unit','source-maps','built-demo']) {
    const record = read(path.join(repository, read(path.join(import.meta.dirname, stage + '-latest.json')).record));
    assert(record.exitCode === 0 && !record.sourceDrift.length && hash(path.join(repository, record.log.path)) === record.log.sha256, 'Incomplete run: ' + stage);
    for (const [file, digest] of Object.entries(record.sourceFingerprints)) assert(hash(path.join(repository, file)) === digest, 'Stale source: ' + stage + ':' + file);
    executed[stage] = record;
}
const browser = fs.readFileSync(path.join(repository, executed.e2e.log.path), 'utf8');
assert(/\b566 passed \(/.test(browser) && !/\b\d+ failed\b/.test(browser), 'A single passing full run is required');
for (const marker of ['ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS','ROUTE_EMPTY_COMPOSITION=11/11 RESULT=PASS','ROUTE_ERROR_COMPOSITION=51/51 RESULT=PASS'])
    assert(browser.split(marker).length - 1 === 2, 'Both browser engines must prove: ' + marker);
const canonical = read(path.join(repository, 'botsales-kit/contracts/route-manifest.json'));
const routes = read(path.join(frontend, 'docs/route-implementation.json'));
const states = read(path.join(frontend, 'docs/route-state-role-matrix.json'));
const cold = read(path.join(import.meta.dirname, 'clean-artifacts-toolbar-20261008.json'));
assert(cold.status === 'PASS' && cold.commandRuns.length === 10 && cold.commandRuns.every(item => !item.exitCode), 'Cold execution incomplete');
assert(cold.artifacts.productionMarkerMatches.length === 0 && !cold.artifacts.productionRepeat.workerIncluded && cold.artifacts.demoRepeat.workerIncluded, 'Artifact isolation missing');
for (const [target, name] of [['dist','productionRepeat'],['dist-demo','demoRepeat']])
    for (const file of cold.artifacts[name].files) assert(hash(path.join(frontend, 'apps/web', target, file.path)) === file.sha256, 'Current artifact differs from cold artifact: ' + target + '/' + file.path);
assert(canonical.routes.length === 54 && routes.length === 54 && states.routes.length === 54 && states.summary.routeRoleBrowserMatrix === 'PASS', 'Incomplete canonical matrix');
const featureRows = routes.flatMap(route => route.featureCoverage.map(row => ({ routeId: route.routeId, ...row })));
assert(featureRows.length === 65 && new Set(featureRows.map(row => row.featureId)).size === 64 && featureRows.every(row => row.evidenceCases.every(item => item.result === 'PASS')), 'Feature interaction coverage missing');
const cells = Object.values(states.routes.flatMap(route => Object.values(route.states)).reduce((result, cell) => {
    result[cell.result] = (result[cell.result] || 0) + 1; return result;
}, {})).reduce((sum, n) => sum + n, 0);
assert(cells === 432 && states.routes.every(route => Object.values(route.states).every(cell => !cell.result.includes('NOT_TESTED'))), 'Untested applicable state cells');
const at = new Date().toISOString();
const write = (file, value) => fs.writeFileSync(path.join(import.meta.dirname, file), JSON.stringify(value, null, 2) + '\n');
const matrix = {
    generatedAt: at, scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', ownerAcceptance: 'PENDING',
    artifact: { path: 'apps/web/dist-demo', treeSha256: cold.artifacts.demoRepeat.treeSha256 },
    summary: { routes: 54, features: 64, featureRouteRows: 65, journeys: routes.reduce((n, route) => n + route.journeys.length, 0), stateCells: cells, privateRouteRoleCases: 357, roles: 7, privateRoutes: 51, routeEmptyCases: 11, routeErrorCases: 51, fullBrowserCases: 566, perEngine: 283, builtDemoCases: 6 },
    routes: routes.map(route => ({ id: route.routeId, source: route.source, component: route.component, routeEvidence: route.routeEvidence, features: route.featureCoverage, journeys: route.journeys, states: states.routes.find(item => item.id === route.routeId)?.states })),
    executionRecords: Object.fromEntries(Object.entries(executed).map(([stage, record]) => [stage, { startedAt: record.startedAt, finishedAt: record.finishedAt, log: record.log }])),
    limits: ['Automated mock UAT only; the user has not accepted.', 'Shared state proof, route-specific proof and justified N/A remain separate.', 'Canonical feature/operation gaps remain disclosed; no live Backend/provider/hosted claim.'],
};
write('uat-matrix-toolbar-20261008.json', matrix);
const old = read(path.join(repository, 'botsales-kit/execution/frontend-evidence/FE028/quality-gate-matrix-current-20261008.json'));
const evidence = {
    'FE-G01': ['clean-artifacts-toolbar-20261008.json','environment-current.json'],
    'FE-G02': [executed.verify.log.path,'ANALOGOUS_PATTERNS.md'],
    'FE-G03': [executed.verify.log.path,'S01-contract-crosswalk-current-20261008.json'],
    'FE-G04': [executed.e2e.log.path, 'uat-matrix-toolbar-20261008.json'],
    'FE-G05': ['actual-browser-zoom-200-current-toolbar-native-stable-20261008.json','native-text-only-200-current-toolbar-native-stable-20261008.json',executed.e2e.log.path],
    'FE-G06': [executed.e2e.log.path, 'environment-current.json'],
    'FE-G07': [executed.e2e.log.path, executed['built-demo'].log.path],
    'FE-G08': ['clean-artifacts-toolbar-20261008.json','../../../.github/workflows/frontend.yml',executed['built-demo'].log.path],
    'FE-G09': ['ACCEPTANCE_GUIDE.md'],
};
const gates = old.gates.map(gate => ({
    id: gate.id, title: gate.title, status: ['FE-G05','FE-G09'].includes(gate.id) ? (gate.id === 'FE-G05' ? 'PARTIAL_OBSERVED' : 'PENDING_USER') : 'PASS_LOCAL_SCOPE',
    evidence: evidence[gate.id],
    basis: gate.id === 'FE-G05' ? 'Actual keyboard/axe/reflow and native zoom observed; screen-reader speech and broad human conformance NOT_RUN.' : gate.id === 'FE-G09' ? 'Technical cases and artifact are prepared; no user acceptance recorded.' : 'Current executed raw records, current source fingerprints, owner cases and reproduced artifacts linked above. Local synthetic scope only.',
}));
write('quality-gate-matrix-toolbar-20261008.json', { recordedAt: at, scope: matrix.scope, gates, rubric: { passed: 7, total: 9, reason: 'Readiness rubric with two external evidence limits; not a code completion percentage.' }, hostedCI: 'NOT_RUN', ownerAcceptance: 'PENDING' });
write('production-claim-review-toolbar-20261008.json', {
    reviewedAt: at, reviewer: 'Codex self-review', rule: 'AI_RULES.md §19.6', scope: matrix.scope,
    artifact: { production: cold.artifacts.productionRepeat.treeSha256, demo: cold.artifacts.demoRepeat.treeSha256 },
    evidence: { fullBrowser: 566, unit: 174, domainNetwork: 88, builtDemo: 6, isolatedStages: 10, uatMatrix: 'uat-matrix-toolbar-20261008.json', gates: 'quality-gate-matrix-toolbar-20261008.json' },
    authority: 'User explicitly requested root-cause Toolbar correction and regression; existing F01–F09 work is preserved and reverified.',
    exceptions: ['Screen-reader speech NOT_RUN', 'Broad human conformance NOT_RUN', 'Hosted CI/branch protection NOT_RUN', 'User acceptance PENDING', 'Backend/provider/staging/production runtime OUTSIDE_SCOPE'],
    decision: 'READY_FOR_TECHNICAL_LOCAL_HANDOFF; no unconditional production or WCAG claim.',
});
console.log(JSON.stringify({ uat: matrix.summary, gates: gates.map(gate => [gate.id, gate.status]), demo: matrix.artifact }));
