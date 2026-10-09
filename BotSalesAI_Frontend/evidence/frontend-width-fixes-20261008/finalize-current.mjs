import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const output = import.meta.dirname, frontend = path.resolve(output, '../..'), repository = path.dirname(frontend);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel = file => path.relative(repository, file).replaceAll('\\', '/');
const assert = (value, message) => {if (!value) throw new Error(message);};
const fingerprints = {}, checks = [], records = {};
const stages = [
    ['generate', '11 outputs / 283 schemas / 210 operations / 54 routes', /"outputs":11,"schemas":283,"operations":210,"routes":54/],
    ['verify', 'Full verify with 175 unit / 88 domain-network / strict source, build and UI gates', /Tests\s+175 passed \(175\)/],
    ['e2e', 'One complete passing Chromium/Firefox full run: 600/600', /\b600 passed \(/],
    ['unit', '175/175 current unit cases', /Tests\s+175 passed \(175\)/],
    ['regression', '20/20 WIDTH browser cases on final source', /\b20 passed \(/],
    ['finance-boundary', '2/2 Finance boundary cases with atomic DetailLine and unchanged spacing assertions', /\b2 passed \(/],
    ['contracts', '39/39 composition, ancestry and catalog fixtures', /pass 39\s/],
    ['layout', '82/82 fixtures; 79 scanned files, zero findings, one declared exception', /layout-check PASS: 79 source files, 0 finding\(s\), 1 exception\(s\) used/],
    ['evidence-validator', '11/11 provenance fixtures', /pass 11\s/],
    ['source-maps', '16/16 owner source-map cases', /pass 16\s/],
    ['built-demo', '6/6 compiled artifact cases', /\b6 passed \(/],
];
for (const [stage, expected, pattern] of stages) {
    const record = read(path.join(repository, read(path.join(output, stage + '-latest.json')).record));
    assert(!record.exitCode && !record.sourceDrift.length, 'Failed/changed run: ' + stage);
    assert(hash(path.join(repository, record.log.path)) === record.log.sha256, 'Changed log: ' + stage);
    const log = fs.readFileSync(path.join(repository, record.log.path), 'utf8');
    assert(pattern.test(log), 'Incomplete actual result: ' + stage);
    if (stage === 'verify') assert(log.includes('"passed":88') && log.includes('Boundary fixtures: PASS 10/10'), 'Missing domain/negative-boundary proof');
    if (stage === 'e2e') {
        assert(!/\b\d+ failed\b/.test(log), 'A failed full run cannot be closed using targeted passes');
        for (const engine of ['chromium', 'firefox']) assert(log.split('\n').filter(line => /^\s*ok\s+\d+/.test(line) && line.includes('[' + engine + ']')).length === 300, 'Missing complete engine: ' + engine);
        for (const marker of ['ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS', 'ROUTE_EMPTY_COMPOSITION=11/11 RESULT=PASS', 'ROUTE_ERROR_COMPOSITION=51/51 RESULT=PASS']) assert(log.split(marker).length - 1 === 2, 'Missing both-engine proof: ' + marker);
    }
    for (const [file, digest] of Object.entries(record.sourceFingerprints)) assert(hash(path.join(repository, file)) === digest, 'Stale run source: ' + stage + ':' + file);
    Object.assign(fingerprints, record.sourceFingerprints); records[stage] = record;
    checks.push({id: stage, command: record.executable + ' ' + record.args.join(' '), exitCode: 0, result: 'PASS', expected, observed: expected, log: record.log});
}
function proof(id, file, expected, validate) {
    const absolute = path.resolve(frontend, file), value = read(absolute); validate(value);
    fingerprints[rel(absolute)] = hash(absolute);
    checks.push({id, command: 'Actual execution/reviewer recorded in ' + file, exitCode: 0, result: 'PASS', expected, observed: expected, log: {path: rel(absolute), sha256: hash(absolute)}});
    return value;
}
const cold = proof('cold-build', 'evidence/frontend-width-fixes-20261008/clean-artifacts-width-20261008.json', 'Ten actual isolated npm/install/build stages; repeated production/demo byte-identical', value => {
    assert(value.status === 'PASS' && value.commandRuns.length === 10 && value.commandRuns.every(run => !run.exitCode) && !value.userEnvLocalCopied, 'Cold execution incomplete');
    assert(value.sourceLockSha256 === hash(path.join(frontend, 'package-lock.json')), 'Cold lock changed');
    assert(!value.artifacts.productionRepeat.workerIncluded && value.artifacts.demoRepeat.workerIncluded && !value.artifacts.productionMarkerMatches.length, 'Mock isolation failed');
    for (const [directory, name] of [['dist', 'productionRepeat'], ['dist-demo', 'demoRepeat']]) for (const file of value.artifacts[name].files) assert(hash(path.join(frontend, 'apps/web', directory, file.path)) === file.sha256, 'Main/cold artifact differs: ' + file.path);
});
proof('environment', 'evidence/frontend-width-fixes-20261008/environment-current.json', 'Six actual version/dependency-tree/setup/doctor/audit executions; protected files unchanged', value => {
    assert(value.runs.length === 6 && value.runs.every(run => !run.exitCode) && !value.drift.length, 'Environment incomplete');
    for (const [file, digest] of Object.entries(value.before)) assert(hash(path.join(frontend, file)) === digest, 'Protected environment file changed');
    for (const run of value.runs) assert(hash(path.join(repository, run.log.path)) === run.log.sha256, 'Environment log changed');
});
proof('compiled-width-review', 'evidence/frontend-width-fixes-20261008/built-width-review.json', '216 route observations and 50 focused geometry/axe/keyboard cases on compiled demo', value => {
    assert(value.status === 'PASS' && value.observations.length === 216 && value.details.length === 50 && !value.sourceDrift.length && !value.artifactDrift.length && !value.pageErrors.length, 'Compiled review incomplete');
    for (const file of value.artifacts) assert(hash(path.join(repository, file.path)) === file.sha256, 'Compiled artifact changed');
    for (const [file, digest] of Object.entries(value.sourceFingerprints)) {assert(hash(path.join(repository, file)) === digest, 'Compiled reviewer source stale'); fingerprints[file] = digest;}
    for (const detail of value.details) if (detail.screenshot) {assert(hash(path.join(repository, detail.screenshot.path)) === detail.screenshot.sha256, 'Compiled screenshot changed'); fingerprints[detail.screenshot.path] = detail.screenshot.sha256;}
});
proof('user-preview-demo', 'evidence/frontend-width-fixes-20261008/handoff-demo-current.json', 'Current compiled demo HTML at4173; AI card1632px fills its collection; clean screenshot', value => {
    assert(value.status === 'PASS' && value.expectedHtml === value.servedHtml && value.expectedHtml === hash(path.join(frontend, 'apps/web/dist-demo/index.html')) && !value.pageErrors.length && value.geometry.width === 1632 && value.geometry.cards.length === 1 && value.geometry.cards[0].width === 1632, 'User preview proof incomplete');
    assert(hash(path.join(repository, value.screenshot.path)) === value.screenshot.sha256, 'User preview screenshot changed');
    fingerprints[value.screenshot.path] = value.screenshot.sha256;
});
proof('preview-final-http', 'evidence/frontend-width-fixes-20261008/demo-availability-final.json', 'Final user demo HTTP200 serves the exact current compiled HTML', value => {
    assert(value.status === 'PASS' && value.statusCode === 200 && value.servedHtmlSha256 === value.expectedHtmlSha256 && value.expectedHtmlSha256 === hash(path.join(frontend, 'apps/web/dist-demo/index.html')), 'Final user demo unavailable or stale');
});
const nativeFiles = {
    'evidence/frontend-component-fixes-20261008/actual-browser-zoom-200-current-width-inherited-current-20261008.json': 7,
    'evidence/frontend-component-fixes-20261008/native-text-only-200-current-width-inherited-current-20261008.json': 7,
    'evidence/frontend-corrections-20261008/actual-browser-zoom-200-current-width-inherited-current-20261008.json': 1,
    'evidence/frontend-corrections-20261008/native-text-only-200-current-width-inherited-current-20261008.json': 1,
    'evidence/frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-width-inherited-current-20261008.json': 5,
    'evidence/frontend-width-fixes-20261008/native-text-only-200-current-width-inherited-r2-20261008.json': 5,
    'evidence/frontend-toolbar-20261008/actual-browser-zoom-200-current-width-inherited-r2-20261008.json': 3,
    'evidence/frontend-toolbar-20261008/native-text-only-200-current-width-inherited-r2-20261008.json': 4,
    'evidence/frontend-width-fixes-20261008/actual-browser-zoom-200-current-width-native-r3-20261008.json': 7,
    'evidence/frontend-width-fixes-20261008/native-text-only-200-current-width-native-r3-20261008.json': 7,
};
for (const [file, count] of Object.entries(nativeFiles)) proof('native-' + path.basename(file) + '-' + count, file, count + '/' + count + ' actual native scenarios PASS', value => {
    assert(value.result === 'PASS' && value.scenarios.length === count && value.scenarios.every(item => item.result === 'PASS'), 'Incomplete native method: ' + file);
    for (const [source, digest] of Object.entries(value.sourceSha256)) {const absolute = path.resolve(frontend, source); assert(hash(absolute) === digest, 'Native source stale: ' + source); fingerprints[rel(absolute)] = digest;}
    function captureImages(item) {
        if (Array.isArray(item)) return item.forEach(captureImages);
        if (item && typeof item === 'object') return Object.values(item).forEach(captureImages);
        if (typeof item === 'string' && item.endsWith('.png')) {const absolute = path.resolve(frontend, item); assert(absolute.startsWith(repository + path.sep) && fs.existsSync(absolute), 'Missing/outside native capture: ' + item); fingerprints[rel(absolute)] = hash(absolute);}
    }
    captureImages(value.scenarios);
});
proof('verify-domain-provenance', 'evidence/frontend-width-fixes-20261008/final-verify-preservation.json', 'Latest verify PASS with fresh 75+13 domain output and preserved canonical proof', value => {
    assert(!value.exitCode && value.freshExecution && value.originalRestored && !value.sourceDrift.length && value.verificationRecord === read(path.join(output, 'verify-latest.json')).record, 'Verify preservation invalid');
    assert(value.producedResult.status === 'PASS' && value.producedResult.simulator === 75 && value.producedResult.network === 13, 'Domain produced report incomplete');
    for (const artifact of [value.original, value.produced]) {assert(hash(path.join(repository, artifact.path)) === artifact.sha256, 'Domain evidence changed'); fingerprints[artifact.path] = artifact.sha256;}
    assert(hash(path.join(frontend, 'evidence/domain-tests.json')) === value.original.sha256, 'Canonical domain report changed');
});
proof('browser-preservation', 'evidence/frontend-width-fixes-20261008/browser-preservation-current.json', 'Separate final built-demo run after full wrapper closes; 11051 historical evidence paths restored byte-exactly', value => {
    assert(value.status === 'PASS' && value.preservedPaths === 11051 && !value.mismatches.length && Date.parse(value.built.startedAt) > Date.parse(value.full.finishedAt), 'Browser preservation sequence incomplete');
    for (const artifact of [value.full, value.built, value.before]) {
        const file = path.join(repository, artifact.record || artifact.path);
        assert(hash(file) === artifact.sha256, 'Preservation record changed'); fingerprints[rel(file)] = artifact.sha256;
    }
    assert(value.full.record === read(path.join(output, 'e2e-latest.json')).record && value.built.record === read(path.join(output, 'built-demo-latest.json')).record, 'Preservation does not bind latest browser runs');
});
proof('domain-publication', 'evidence/frontend-width-fixes-20261008/domain-publication-current.json', 'Actual produced domain bytes published after separate browser wrappers complete; early timing claim archived and corrected', value => {
    const preservation = read(path.join(output, 'browser-preservation-current.json'));
    assert(value.status === 'PASS' && Date.parse(value.publishedAt) > Date.parse(preservation.built.finishedAt), 'Publication occurred before browser preservation completed');
    for (const artifact of [value.original, value.produced, value.target]) {
        assert(hash(path.join(repository, artifact.path)) === artifact.sha256, 'Publication artifact changed'); fingerprints[artifact.path] = artifact.sha256;
    }
    const actual = read(path.join(repository, value.verifyRecord));
    assert(!actual.exitCode && !actual.sourceDrift.length && value.target.sha256 === value.produced.sha256, 'Published output has no successful execution');
    for (const [file, digest] of Object.entries(actual.sourceFingerprints)) assert(hash(path.join(repository, file)) === digest, 'Published domain source stale');
    for (const name of ['timing-audit.json', 'domain-publication-current.json', 'domain-before-current-publication.json']) {
        const file = path.join(output, 'historical-overlap-publication', name); fingerprints[rel(file)] = hash(file);
    }
});
proof('route-matrices', 'evidence/frontend-width-fixes-20261008/route-matrices-refresh-current.json', 'Two canonical generators; current unit/full-browser logs and unchanged route/feature/state semantics', value => {
    assert(value.status === 'PASS' && !value.semanticDrift.length && value.runs.length === 2 && value.runs.every(run => !run.exitCode), 'Matrix refresh incomplete');
    for (const artifact of [...value.inputs, ...value.outputs]) assert(hash(path.join(repository, artifact.path)) === artifact.sha256, 'Matrix evidence changed');
    for (const [file, digest] of Object.entries(value.sourceFingerprints)) {assert(hash(path.join(repository, file)) === digest, 'Matrix owner changed'); fingerprints[file] = digest;}
});
const inventory = read(path.join(output, 'inventory-current.json')), apis = read(path.join(output, 'shared-api-current.json')).apis;
assert(inventory.summary.allRelevantAssigned && !inventory.unknownFiles.length && !inventory.runtimeUnresolvedOwnImports.length && !inventory.summary.routeMappingsMissing && inventory.summary.modules === 16 && inventory.summary.sourceFiles === 76 && apis.length === 28, 'Incomplete current inventory/catalog');
for (const file of inventory.files) {const absolute = path.resolve(frontend, file.path); assert(hash(absolute) === file.sha256, 'Inventory stale: ' + file.path); fingerprints[rel(absolute)] = file.sha256;}
const documents = read(path.join(output, 'documents-current.json'));
assert(!documents.problems.length, 'Documentation problems');
for (const [file, digest] of Object.entries(documents.sourceFingerprints)) {assert(hash(path.join(repository, file)) === digest, 'Document review stale: ' + file); fingerprints[file] = digest;}
const diff = read(path.join(output, 'diff-review-current.json'));
assert(!diff.unexpectedChanges.length && !diff.originalPathsMissing.length && !diff.protectedDrift.length && !diff.gitDiffCheck.exitCode && !diff.fullProductGitCheck.exitCode, 'Unreviewed delta or existing work changed');
const canonicalPointer = read(path.join(output, 'canonical-revalidation-latest.json')), canonical = read(path.join(output, canonicalPointer.record));
const status = JSON.parse(execFileSync(process.execPath, ['scripts/progress.mjs', 'status'], {cwd: path.join(repository, 'botsales-kit'), encoding: 'utf8'}));
assert(!canonical.fullProductDrift.length && status.verifiedSteps === 140 && status.totalSteps === 140 && !status.stale.length && !status.blocked.length, 'Canonical FE not current');
const baseline = read(path.join(output, 'baseline.json')), provenance = read(path.join(output, 'implementation-provenance-current.json'));
assert(Date.parse(baseline.capturedAt) < Date.parse(provenance.implementationStartedAt) && provenance.runtimeFingerprintsCompared === 84 && !provenance.mismatches.length, 'Before-source pairing invalid');
const beforeCopies = read(path.join(output, 'before-snapshot-integrity-current.json'));
assert(beforeCopies.status === 'PASS' && beforeCopies.copies.length === 11 && !beforeCopies.mismatches.length, 'Original owner/test snapshots not preserved');
for (const copy of beforeCopies.copies) assert(hash(path.join(repository, copy.artifact)) === copy.expected && copy.expected === baseline.sourceFingerprints[copy.source], 'Before copy changed: ' + copy.artifact);
const diagnosisFile = path.resolve(output, '../frontend-width-root-cause-20261008/measurements.json'), diagnosis = read(diagnosisFile);
assert(diagnosis.status === 'DIAGNOSTIC_COMPLETE' && diagnosis.observations.length === 108 && diagnosis.aiStates.length === 18 && diagnosis.counterfactual.length === 2 && !diagnosis.sourceDrift.length, 'Diagnostic baseline incomplete');
for (const source of diagnosis.sources) if (baseline.sourceFingerprints[source.path]) assert(baseline.sourceFingerprints[source.path] === source.sha256, 'Diagnostic source does not match before snapshot');
for (const [name, expected] of [['redBrowser', 10], ['redAtomic', 1]]) {
    const record = read(path.join(output, provenance[name].record)), log = fs.readFileSync(path.join(repository, record.log.path), 'utf8');
    assert(record.exitCode === 1 && !record.sourceDrift.length && hash(path.join(repository, record.log.path)) === record.log.sha256, 'Before-red execution invalid');
    assert(name === 'redBrowser' ? /\b10 failed\b/.test(log) : /Tests\s+1 failed/.test(log), 'Before-red count changed: ' + expected);
}
const preservedFailure = read(path.join(output, 'runs/width-1791470510326-91776/e2e-record.json'));
assert(preservedFailure.exitCode !== 0 && !preservedFailure.sourceDrift.length, 'Interrupted first full run must remain failed');
for (const file of ['inventory-current.json', 'shared-api-current.json', 'documents-current.json', 'diff-review-current.json', 'canonical-revalidation-latest.json', canonicalPointer.record, 'REPORT.md', 'CONTRACT.md', 'ANALOGOUS_PATTERNS.md', 'ACCEPTANCE_GUIDE.md', 'S01-contract-crosswalk-current-20261008.json', 'uat-matrix-width-20261008.json', 'quality-gate-matrix-width-20261008.json', 'production-claim-review-width-20261008.json', 'finalize-current.mjs', 'inventory-current.mjs', 'capture-shared-api.mjs', 'register-current-commands.mjs', 'revalidate-canonical.mjs', 'write-current-docs.mjs', 'build-handoff.mjs', 'canonical-revalidation-r1-failed.json', 'canonical-revalidation-r1.log', 'canonical-rename-temporary-artifacts.json', 'final-document-checkpoint-impact.json', 'canonical-revalidation-r2.json', 'canonical-revalidation-r2.log']) fingerprints[rel(path.join(output, file))] = hash(path.join(output, file));
for (const artifact of read(path.join(output, 'canonical-rename-temporary-artifacts.json')).artifacts) {
    assert(hash(path.join(repository, artifact.archive.path)) === artifact.archive.sha256 && artifact.archive.sha256 === artifact.original.sha256, 'Failed atomic temporary output changed');
    fingerprints[artifact.archive.path] = artifact.archive.sha256;
}
const matrix = read(path.join(frontend, 'docs/route-state-role-matrix.json'));
assert(matrix.routes.length === 54 && matrix.summary.routeRoleBrowserMatrix === 'PASS' && matrix.summary.routeMountSmoke === 'PASS', 'Route/state proof incomplete');
const coverage = (name, count, reason) => ({name, expected: count, observed: count, missing: 0, result: 'COMPLETE', reason});
const redRecords = Object.values(provenance).filter(value => value && typeof value === 'object' && value.record).map(value => path.join(output, value.record));
const baselineFiles = [path.join(output, 'baseline.json'), path.join(output, 'implementation-provenance-current.json'), path.join(output, 'before-snapshot-integrity-current.json'), ...beforeCopies.copies.map(copy => path.join(repository, copy.artifact)), diagnosisFile,
    ...['provenance.json', 'source-inventory.json', 'inspect-width.mjs', ...fs.readdirSync(path.dirname(diagnosisFile)).filter(file => /^R\d+-.*\.png$/.test(file))].map(file => path.join(path.dirname(diagnosisFile), file)),
    ...redRecords, ...redRecords.map(file => path.join(repository, read(file).log.path))];
const evidence = {
    schemaVersion: 1, step: 'S19', scope: 'W01–W04 plus confirmed analogous consumers; inherited full React/MSW local regression on final source.',
    recordedAt: new Date().toISOString(), status: 'COMPLETE', checks,
    sourceIdentity: {HEAD: records.e2e.HEAD, runtimeAndTestInputCount: Object.keys(records.e2e.sourceFingerprints).length, sourceSnapshotSha256: crypto.createHash('sha256').update(Object.entries(records.e2e.sourceFingerprints).map(([file, digest]) => file + ':' + digest).sort().join('\n')).digest('hex'), meaning: 'Actual full E2E runtime/test/tool inputs in the dirty working tree; HEAD alone does not identify the patch.'},
    coverage: [coverage('source-files', 76, 'Current runtime/import/owner inventory and strict source gates.'), coverage('shared-api-exports', 28, 'Actual symbols/catalog and direct render contracts.'), coverage('route-mappings', 54, 'Canonical route/source/component bindings.'), coverage('rendered-routes', 54, '216 compiled small/large observations plus full both-engine route/role smoke; not every business branch.'), coverage('slots', 28, 'All public APIs have direct rendered contracts; atomic DetailLine and affected collection/form/notice slots have dedicated regression.'), coverage('states', 432, 'Canonical applicable/shared/route-specific/N/A dispositions remain distinct.'), coverage('baseline-records', 128, '108 route, 18 AI state and 2 temporary counterfactual diagnostics; paired before-red runs separately retained.'), coverage('native-scenarios', 47, '14 WIDTH plus 33 inherited actual native browser/text-only cases; separate methods.'), coverage('reviewed-input-changes', diff.changedInputs.length, 'Owner source, strengthened tests and docs/generator changes versus preserved dirty checkout.')],
    baseline: {status: 'CAPTURED', capturedAt: baseline.capturedAt, implementationStartedAt: provenance.implementationStartedAt, artifacts: baselineFiles.map(file => ({path: rel(file), sha256: hash(file)})), sourceFingerprints: baseline.sourceFingerprints, reason: 'Before snapshot matches 84 runtime/package inputs in actual failing red runs. implementationStartedAt is a conservative lower boundary after red execution, not an invented exact patch timestamp. Diagnostic results are not acceptance passes.'},
    sourceFingerprints: fingerprints,
    historicalFailure: {record: rel(path.join(output, 'runs/width-1791470510326-91776/e2e-record.json')), exitCode: preservedFailure.exitCode, reason: 'Old Finance DOM oracle; interrupted full run retained. New complete full600 run is independently required.'},
    knownLimits: ['Frontend synthetic local scope only; Backend/provider/staging/production runtime outside scope.', 'Screen-reader speech, broad human conformance and hosted CI NOT_RUN; user acceptance PENDING.', 'Failed/interrupted tool and browser attempts are retained; targeted passes never close failed full execution.', 'Cold workspaces retained explicitly; no cleanup claim.', 'Regression protects measured invariants, not all possible future UI defects.'],
};
fs.writeFileSync(path.join(output, 'S19-current-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({checks: checks.length, coverage: evidence.coverage.length, sourceFingerprints: Object.keys(fingerprints).length, FE: status.verifiedSteps + '/140', fullBrowser: 600, native: 47, demoTree: cold.artifacts.demoRepeat.treeSha256}));
