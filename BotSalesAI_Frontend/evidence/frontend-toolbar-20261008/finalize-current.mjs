import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const output = import.meta.dirname, frontend = path.resolve(output, '../..'), repository = path.dirname(frontend);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel = file => path.relative(repository, file).replaceAll('\\', '/');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const checks = [], fingerprints = {}, records = {};
const stages = [
    ['generate', '11 outputs / 283 schemas / 210 operations / 54 routes', /"outputs":11,"schemas":283,"operations":210,"routes":54/],
    ['verify', 'Full verify including 174 unit cases, 88 domain/network checks and strict source/build/UI gates', /Tests\s+174 passed \(174\)/],
    ['e2e', 'One complete run: 566/566 Chromium and Firefox cases', /\b566 passed \(/],
    ['unit', '174/174 unit cases', /Tests\s+174 passed \(174\)/],
    ['contracts', '38/38 shared contract/composition/ancestry cases', /pass 38\s/],
    ['layout', '82/82 cases; 79 source files, zero findings, one declared exception', /layout-check PASS: 79 source files, 0 finding\(s\), 1 exception\(s\) used/],
    ['evidence-validator', '11/11 evidence provenance cases', /pass 11\s/],
    ['source-maps', '16/16 feature source-map cases', /pass 16\s/],
    ['built-demo', '6/6 dedicated built-demo cases', /\b6 passed \(/],
];
for (const [stage, expected, pattern] of stages) {
    const record = read(path.join(repository, read(path.join(output, stage + '-latest.json')).record));
    assert(record.exitCode === 0 && !record.sourceDrift.length, 'Failed or changed execution: ' + stage);
    assert(hash(path.join(repository, record.log.path)) === record.log.sha256, 'Changed raw log: ' + stage);
    const log = fs.readFileSync(path.join(repository, record.log.path), 'utf8');
    assert(pattern.test(log), 'Required actual result missing: ' + stage);
    if (stage === 'e2e') {
        assert(!/\b\d+ failed\b/.test(log), 'Failed full runs cannot be combined with targeted retests');
        for (const marker of ['ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS', 'ROUTE_EMPTY_COMPOSITION=11/11 RESULT=PASS', 'ROUTE_ERROR_COMPOSITION=51/51 RESULT=PASS'])
            assert(log.split(marker).length - 1 === 2, 'Missing engine coverage: ' + marker);
        for (const browser of ['chromium', 'firefox']) {
            const cases = log.split('\n').filter(line => /^\s*ok\s+\d+/.test(line) && line.includes('[' + browser + ']') && line.includes('tests\\ui-toolbar-layout.spec.ts:'));
            assert(cases.length === 6, 'Missing final Toolbar owner cases: ' + browser);
        }
    }
    if (stage === 'verify') assert(log.includes('"passed":88') && log.includes('Boundary fixtures: PASS 10/10'), 'Strict domain/boundary proof missing');
    for (const [file, sha] of Object.entries(record.sourceFingerprints)) assert(hash(path.join(repository, file)) === sha, 'Stale executed source: ' + stage + ':' + file);
    Object.assign(fingerprints, record.sourceFingerprints); records[stage] = record;
    checks.push({ id: stage, command: '"' + record.executable + '" ' + record.args.join(' '), exitCode: 0, result: 'PASS', expected, observed: expected, log: record.log });
}
function proof(id, file, expected, validate, command) {
    const absolute = path.resolve(frontend, file), value = read(absolute);
    validate(value); fingerprints[rel(absolute)] = hash(absolute);
    checks.push({ id, command, exitCode: 0, result: 'PASS', expected, observed: expected, log: { path: rel(absolute), sha256: hash(absolute) } });
    return value;
}
const cold = proof('cold-artifacts', 'evidence/frontend-toolbar-20261008/clean-artifacts-toolbar-20261008.json', '10/10 isolated stages; identical repeated production/demo artifacts', value => {
    assert(value.status === 'PASS' && value.commandRuns.length === 10 && value.commandRuns.every(run => run.exitCode === 0), 'Cold stages incomplete');
    assert(value.sourceLockSha256 === hash(path.join(frontend, 'package-lock.json')) && !value.userEnvLocalCopied, 'Cold scope or lock changed');
    assert(value.artifacts.productionMarkerMatches.length === 0 && !value.artifacts.productionRepeat.workerIncluded && value.artifacts.demoRepeat.workerIncluded, 'Mock isolation failed');
    for (const [target, name] of [['dist', 'productionRepeat'], ['dist-demo', 'demoRepeat']]) for (const file of value.artifacts[name].files)
        assert(hash(path.join(frontend, 'apps/web', target, file.path)) === file.sha256, 'Current/cold artifact mismatch: ' + target + '/' + file.path);
}, 'node evidence/frontend-toolbar-20261008/run-clean-build.mjs');
proof('environment', 'evidence/frontend-toolbar-20261008/environment-current.json', 'Six actual toolchain/install/tree/setup/doctor/audit stages pass with protected hashes unchanged', value => {
    assert(value.runs.length === 6 && value.runs.every(run => !run.exitCode) && !value.drift.length, 'Environment incomplete');
    assert(Date.parse(value.runs[0].startedAt) > Date.parse(read(path.join(output, 'baseline.json')).finishedAt), 'This batch requires fresh environment executions');
    for (const [file, sha] of Object.entries(value.before)) assert(hash(path.join(frontend, file)) === sha, 'Protected environment changed: ' + file);
    for (const run of value.runs) assert(hash(path.join(repository, run.log.path)) === run.log.sha256, 'Environment log changed');
}, 'node evidence/frontend-toolbar-20261008/environment-check.mjs');
const nativeFiles = {
    'evidence/frontend-toolbar-20261008/actual-browser-zoom-200-current-toolbar-native-stable-20261008.json': 3,
    'evidence/frontend-toolbar-20261008/native-text-only-200-current-toolbar-native-stable-20261008.json': 4,
    'evidence/frontend-corrections-20261008/actual-browser-zoom-200-current-toolbar-inherited-native-20261008.json': 1,
    'evidence/frontend-corrections-20261008/native-text-only-200-current-toolbar-inherited-native-20261008.json': 1,
    'evidence/frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-toolbar-inherited-native-20261008.json': 5,
    'evidence/frontend-ui-improvements/UI028/W30/native-text-only-200-current-toolbar-inherited-native-20261008.json': 5,
};
for (const [file, count] of Object.entries(nativeFiles)) proof('native-' + file.replaceAll('/', '__'), file, count + '/' + count + ' native scenarios PASS', value => {
    assert(value.result === 'PASS' && value.scenarios.length === count && value.scenarios.every(item => item.result === 'PASS'), 'Native scenarios incomplete: ' + file);
    for (const [source, sha] of Object.entries(value.sourceSha256)) { assert(hash(path.resolve(frontend, source)) === sha, 'Native source changed: ' + source); fingerprints[rel(path.resolve(frontend, source))] = sha; }
}, 'Actual native browser or text zoom; execution/readback recorded in artifact');
proof('compiled-review', 'evidence/frontend-toolbar-20261008/built-comparison-review-current.json', 'Chromium/Firefox compiled Toolbar 320/1440 and draft-conflict behavior PASS', value => {
    assert(value.status === 'PASS' && value.execution.exitCode === 0 && value.observations.length === 2, 'Compiled observations incomplete');
    for (const observation of value.observations) {
        assert(observation.result === 'PASS' && observation.toolbar.length === 2, 'Missing built Toolbar observations');
        for (const item of observation.toolbar) { assert(item.geometry.buttonHeight === 44 && item.geometry.documentWidth === item.width, 'Compiled geometry failed'); assert(hash(path.join(repository, item.screenshot.path)) === item.screenshot.sha256, 'Compiled screenshot changed'); }
    }
    for (const file of value.artifactFiles) assert(hash(path.join(frontend, file.path)) === file.sha256, 'Compiled artifact changed');
    for (const [source, sha] of Object.entries(value.sourceFingerprints)) assert(hash(path.join(frontend, source)) === sha, 'Compiled review helper changed');
}, 'node evidence/frontend-toolbar-20261008/review-built-comparison.mjs');
const inventory = read(path.join(output, 'inventory-current.json')), apis = read(path.join(output, 'shared-api-current.json')).apis;
assert(inventory.summary.allRelevantAssigned && !inventory.unknownFiles.length && !inventory.runtimeUnresolvedOwnImports.length && !inventory.summary.routeMappingsMissing, 'Unreconciled inventory');
for (const file of inventory.files) assert(hash(path.resolve(frontend, file.path)) === file.sha256, 'Stale inventory: ' + file.path);
assert(apis.length === 28 && inventory.summary.modules === 16 && inventory.summary.routes === 54, 'Owner inventory changed');
const documents = read(path.join(output, 'documents-current.json'));
assert(!documents.problems.length, 'Documentation reference verification failed');
for (const [file, sha] of Object.entries(documents.sourceFingerprints)) { assert(hash(path.join(repository, file)) === sha, 'Stale document review: ' + file); fingerprints[file] = sha; }
const diff = read(path.join(output, 'diff-review-current.json'));
assert(!diff.unexpectedChanges.length && !diff.originalPathsMissing.length && !diff.beforeProtectedDirty.length && !diff.gitDiffCheck.exitCode && !diff.fullProductGitCheck.exitCode, 'Unreviewed diff or original/protected work changed');
proof('final-verify-preservation', 'evidence/frontend-toolbar-20261008/final-verify-preservation.json', 'Fresh final verify PASS; 75 simulator and 13 network cases, prior canonical domain bytes preserved', value => {
    assert(!value.exitCode && value.freshExecution && value.originalRestored && !value.sourceDrift.length && value.verificationRecord === read(path.join(output, 'verify-latest.json')).record, 'Final verify provenance or preservation failed');
    assert(value.producedResult.status === 'PASS' && value.producedResult.simulator === 75 && value.producedResult.network === 13, 'Produced domain result incomplete');
    for (const artifact of [value.original, value.produced]) { assert(hash(path.join(repository, artifact.path)) === artifact.sha256, 'Changed preserved/produced domain proof'); fingerprints[artifact.path] = artifact.sha256; }
    assert(hash(path.join(frontend, 'evidence/domain-tests.json')) === value.original.sha256, 'Canonical domain proof changed after revalidation');
}, 'node evidence/frontend-toolbar-20261008/run-final-verify.mjs');
const canonicalPointer = read(path.join(output, 'canonical-revalidation-latest.json'));
const canonical = read(path.join(output, canonicalPointer.record));
assert(!canonical.fullProductDrift.length, 'Full product references changed');
const status = JSON.parse(execFileSync(process.execPath, ['scripts/progress.mjs', 'status'], { cwd: path.join(repository, 'botsales-kit'), encoding: 'utf8' }));
assert(status.verifiedSteps === 140 && status.totalSteps === 140 && !status.stale.length && !status.blocked.length, 'Canonical FE evidence is not fresh');
const baseline = read(path.join(output, 'baseline.json')), provenance = read(path.join(output, 'implementation-provenance.json'));
assert(Date.parse(baseline.finishedAt) < Date.parse(provenance.implementationStartedAt) && baseline.observations.length === 46 && baseline.observedDefect.button.height > 100, 'Unproven paired baseline');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const baselineFiles = ['baseline.json', 'shell-before.json', 'implementation-provenance.json', 'regression-before.log', 'products-before-320.png', 'products-before-1440.png'].map(file => path.join(output, file)).concat(walk(path.join(output, 'source-before')));
for (const file of ['inventory-current.json', 'shared-api-current.json', 'documents-current.json', 'diff-review-current.json', 'canonical-revalidation-latest.json', canonicalPointer.record, 'REPORT.md', 'CONTRACT.md', 'ANALOGOUS_PATTERNS.md', 'ACCEPTANCE_GUIDE.md', 'S01-contract-crosswalk-current-20261008.json', 'uat-matrix-toolbar-20261008.json', 'quality-gate-matrix-toolbar-20261008.json', 'production-claim-review-toolbar-20261008.json', 'finalize-current.mjs']) fingerprints[rel(path.join(output, file))] = hash(path.join(output, file));
const matrix = read(path.join(frontend, 'docs/route-state-role-matrix.json'));
assert(matrix.summary.routeRoleBrowserMatrix === 'PASS' && matrix.summary.routeMountSmoke === 'PASS' && matrix.routes.length === 54, 'Missing route/state matrix');
const coverage = (name, count, reason) => ({ name, expected: count, observed: count, missing: 0, result: 'COMPLETE', reason });
const manifest = {
    schemaVersion: 1, step: 'S19', scope: 'Toolbar shared owner, 23 mapped consumers and confirmed Products/Inventory/Shell defects; full inherited runtime regression on the same final source. React/MSW local only.',
    recordedAt: new Date().toISOString(), status: 'COMPLETE', checks,
    coverage: [coverage('source-files', inventory.summary.sourceFiles, 'Hash-bound runtime inventory and source/build gates; not a UI completion percentage.'), coverage('shared-api-exports', apis.length, 'Shared API/type/render/catalog contracts.'), coverage('route-mappings', 54, 'Canonical route to actual component owner.'), coverage('rendered-routes', 54, 'All-route browser smoke/axe and geometry on both engines.'), coverage('slots', apis.length, 'Existing public APIs plus Toolbar filters and no-q branches.'), coverage('states', 432, 'Canonical 54 by eight cells; shared, route-specific and justified N/A remain distinct.'), coverage('baseline-records', 46, '23 Toolbar routes at 320/1440 measured before source edit; separate Shell repro retained.'), coverage('toolbar-routes', 23, 'Six owner cases per engine include dynamic 23-route impact and natural action height.'), coverage('modules-inventory', 16, 'Runtime/source inventory; no claim every business branch was manually reviewed.')],
    baseline: { status: 'CAPTURED', capturedAt: baseline.finishedAt, implementationStartedAt: provenance.implementationStartedAt, artifacts: baselineFiles.map(file => ({ path: rel(file), sha256: hash(file) })), sourceFingerprints: Object.fromEntries(Object.entries(baseline.sourceFingerprints).map(([file, sha]) => ['BotSalesAI_Frontend/' + file, sha])), reason: 'Before-render/source snapshots predate actual first Toolbar mutation from local tool history. Regression detects the old stretch; preserved source includes the later Shell owner.' },
    sourceFingerprints: fingerprints,
    knownLimits: ['Local React/MSW synthetic evidence only; Backend/provider/production runtime outside scope.', 'Screen-reader speech and broad human conformance NOT_RUN; hosted CI NOT_RUN; owner acceptance PENDING.', 'Failed and interrupted attempts remain historical and are not combined into a passing full run.', 'Cold temporary workspace retention is recorded accurately; no automatic cleanup claim.', 'Regression protects measured invariants; it does not guarantee every future UI change is bug-free.'],
};
fs.writeFileSync(path.join(output, 'S19-current-evidence.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ sourceFingerprints: Object.keys(fingerprints).length, checks: checks.length, coverage: manifest.coverage.length, fullBrowser: 566, FE: status.verifiedSteps + '/140', coldDemo: cold.artifacts.demoRepeat.treeSha256 }));
