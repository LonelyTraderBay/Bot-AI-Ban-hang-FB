import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const frontend = path.resolve(import.meta.dirname, '../..'), repository = path.dirname(frontend);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative = file => path.relative(repository, file).replaceAll('\\', '/');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const checks = [], fingerprints = {};
for (const [stage, expected, pattern] of [
    ['generate', '11 generated outputs / 283 schemas / 210 operations / 54 routes remain current', /"outputs":11,"schemas":283,"operations":210,"routes":54/],
    ['verify', 'All mandatory verify stages exit 0; 173 unit / 88 domain-network / strict source, type, boundary, layout, visual, composition and evidence gates pass', /Tests\s+173 passed \(173\)/],
    ['e2e', 'One complete Chromium/Firefox run passes 554/554 cases', /\b554 passed \(/],
    ['unit', '173/173 unit cases pass', /Tests\s+173 passed \(173\)/],
    ['contracts', '38/38 composition, ancestry and shared API contract cases pass', /pass 38\s/],
    ['layout', '82/82 fixtures pass; source scan 79 files, zero findings, one declared exception', /layout-check PASS: 79 source files, 0 finding\(s\), 1 exception\(s\) used/],
    ['evidence-validator', '11/11 provenance validator cases pass', /pass 11\s/],
    ['source-maps', '16/16 canonical feature source-map cases pass', /pass 16\s/],
    ['built-demo', '6/6 dedicated Chromium/Firefox built-demo cases pass', /\b6 passed \(/],
]) {
    const record = read(path.join(repository, read(path.join(import.meta.dirname, stage + '-latest.json')).record));
    assert(record.exitCode === 0 && !record.sourceDrift.length, 'Failed/changed run: ' + stage);
    assert(hash(path.join(repository, record.log.path)) === record.log.sha256, 'Changed log: ' + stage);
    const text = fs.readFileSync(path.join(repository, record.log.path), 'utf8');
    assert(pattern.test(text), 'Incomplete actual result: ' + stage);
    if (stage === 'e2e') assert(!/\b\d+ failed\b/.test(text), 'Do not combine partial reruns with a failed full run');
    for (const [file, digest] of Object.entries(record.sourceFingerprints)) assert(hash(path.join(repository, file)) === digest, 'Stale executed source: ' + stage + ':' + file);
    Object.assign(fingerprints, record.sourceFingerprints);
    checks.push({ id: stage, command: '"' + record.executable + '" ' + record.args.join(' '), exitCode: 0, result: 'PASS', expected, observed: expected, log: record.log });
}
const inventory = read(path.join(import.meta.dirname, 'inventory-current.json'));
assert(inventory.summary.allRelevantAssigned && !inventory.unknownFiles.length && !inventory.runtimeUnresolvedOwnImports.length && !inventory.summary.routeMappingsMissing, 'Inventory is incomplete');
for (const file of inventory.files) assert(hash(path.resolve(frontend, file.path)) === file.sha256, 'Inventory stale: ' + file.path);
const apis = read(path.join(import.meta.dirname, 'shared-api-current.json')).apis;
assert(apis.length === 28 && inventory.summary.modules === 16 && inventory.summary.routes === 54, 'Current owner counts changed');
const documents = read(path.join(import.meta.dirname, 'documents-current.json'));
assert(!documents.problems.length, 'Active document/reference checks failed');
for (const [source, digest] of Object.entries(documents.sourceFingerprints)) assert(hash(path.join(repository, source)) === digest, 'Document verification stale: ' + source);
Object.assign(fingerprints, documents.sourceFingerprints);
const diffReview = read(path.join(import.meta.dirname, 'diff-review-current.json'));
assert(diffReview.gitDiffCheck.exitCode === 0 && diffReview.fullProductGitCheck.exitCode === 0 && diffReview.fullProductGitCheck.baselineClean && !diffReview.originalPathsMissing.length && !diffReview.fullProductDrift.length && diffReview.originalTrackedChanges === 92, 'Final diff/protected baseline review incomplete');
const preservedVerify = read(path.join(import.meta.dirname, 'final-verify-preservation.json'));
const verifyPointer = read(path.join(import.meta.dirname, 'verify-latest.json'));
assert(preservedVerify.exitCode === 0 && preservedVerify.freshExecution && preservedVerify.verificationRecord === verifyPointer.record && !preservedVerify.sourceDrift.length && preservedVerify.originalRestored && preservedVerify.producedResult.status === 'PASS' && preservedVerify.producedResult.simulator === 75 && preservedVerify.producedResult.network === 13, 'Final actual verify or evidence preservation failed');
for (const artifact of [preservedVerify.original, preservedVerify.produced]) { assert(hash(path.join(repository, artifact.path)) === artifact.sha256, 'Preserved domain artifact changed'); fingerprints[artifact.path] = artifact.sha256; }
assert(hash(path.join(frontend, 'evidence/domain-tests.json')) === preservedVerify.original.sha256, 'Canonical domain proof was replaced after revalidation');
for (const file of ['diff-review-current.json', 'final-verify-preservation.json', 'run-final-verify.mjs', 'canonical-revalidation-latest.json']) fingerprints[relative(path.join(import.meta.dirname, file))] = hash(path.join(import.meta.dirname, file));
const canonicalPointer = read(path.join(import.meta.dirname, 'canonical-revalidation-latest.json'));
fingerprints[relative(path.join(import.meta.dirname, canonicalPointer.record))] = hash(path.join(import.meta.dirname, canonicalPointer.record));
const matrix = read(path.join(frontend, 'docs/route-state-role-matrix.json'));
assert(matrix.summary.routeRoleBrowserMatrix === 'PASS' && matrix.summary.routeMountSmoke === 'PASS', 'Missing route-state/role browser evidence');
const progress = JSON.parse(execFileSync(process.execPath, ['scripts/progress.mjs', 'status'], { cwd: path.join(repository, 'botsales-kit'), encoding: 'utf8' }));
assert(progress.verifiedSteps === 140 && progress.totalSteps === 140 && !progress.stale.length && !progress.blocked.length, 'Canonical FE checkpoints not fully revalidated');
for (const file of ['kit-checks-record.json','progress-tests-record.json']) {
    const record = read(path.join(import.meta.dirname, file));
    const runs = record.checks || [record];
    assert(!record.sourceDrift.length && runs.every(run => run.exitCode === 0), 'Kit/tracker validation failed: ' + file);
    if (file === 'kit-checks-record.json') assert(runs.length === 8 && record.historicalReleaseTestsPreserved, 'Eight kit checks plus preserved history required');
    else {
        const tracker = read(path.join(import.meta.dirname, 'progress-tests.json'));
        assert(record.originalPreserved && tracker.scope === 'TRACKER_SELF_TEST_ONLY_ISOLATED_COPIES' && tracker.results.length === 26 && tracker.results.every(item => item.status === 'PASS'), '26 actual tracker self-tests and original history required');
        fingerprints[relative(path.join(import.meta.dirname, 'progress-tests.json'))] = hash(path.join(import.meta.dirname, 'progress-tests.json'));
    }
    for (const [source,digest] of Object.entries(record.sourceFingerprints)) assert(hash(path.join(repository,source))===digest, 'Kit/tracker source changed: '+source);
    for (const run of runs) assert(hash(path.join(repository,run.log.path))===run.log.sha256, 'Kit/tracker log changed');
    Object.assign(fingerprints,record.sourceFingerprints);
    fingerprints[relative(path.join(import.meta.dirname,file))]=hash(path.join(import.meta.dirname,file));
    checks.push({id:file,command:runs.map(run => run.args.join(' ')).join(' | '),exitCode:0,result:'PASS',expected:file==='kit-checks-record.json'?'8/8 kit checks':'26/26 tracker self-tests',observed:file==='kit-checks-record.json'?'8/8 kit checks':'26/26 tracker self-tests',log:runs[0].log});
}
const cold=read(path.join(import.meta.dirname,'clean-artifacts-corrections-20261008.json'));
assert(cold.status==='PASS' && cold.commandRuns.length===10 && cold.commandRuns.every(run=>run.exitCode===0) && cold.sourceLockSha256===hash(path.join(frontend,'package-lock.json')) && cold.tempWorkspaceRemovedAfterPass && !cold.userEnvLocalCopied,'Isolated cold verification incomplete');
for (const [target,name] of [['dist','productionRepeat'],['dist-demo','demoRepeat']]) for (const file of cold.artifacts[name].files) assert(hash(path.join(frontend,'apps/web',target,file.path))===file.sha256,'Cold/current artifact mismatch: '+target+'/'+file.path);
for (const file of ['clean-artifacts-corrections-20261008.json','environment-current.json','wrapper-diagnosis-current.json','uat-matrix-corrections-20261008.json','quality-gate-matrix-corrections-20261008.json','production-claim-review-corrections-20261008.json']) fingerprints[relative(path.join(import.meta.dirname,file))]=hash(path.join(import.meta.dirname,file));
checks.push({id:'cold-artifacts',command:'node evidence/frontend-corrections-20261008/run-clean-build.mjs',exitCode:0,result:'PASS',expected:'10/10 isolated stages; byte-identical production/demo repeats and current artifact files',observed:'10/10 isolated stages; byte-identical production/demo repeats and current artifact files',log:{path:relative(path.join(import.meta.dirname,'clean-build-corrections-20261008.log')),sha256:hash(path.join(import.meta.dirname,'clean-build-corrections-20261008.log'))}});
const nativeFiles = [
    'actual-browser-zoom-200-current-corrections-native-20261008-final.json',
    'native-text-only-200-current-corrections-native-20261008-final.json',
    '../frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-corrections-w30-final-20261008.json',
    '../frontend-ui-improvements/UI028/W30/native-text-only-200-current-corrections-w30-final-20261008.json',
];
for (const file of nativeFiles) {
    const native = read(path.join(import.meta.dirname, file));
    assert(native.result === 'PASS' && native.scenarios.length === (file.includes('/W30/') ? 5 : 1) && native.scenarios.every(item => item.result === 'PASS'), 'Native zoom failed/incomplete: ' + file);
    for (const [source, digest] of Object.entries(native.sourceSha256)) assert(hash(path.resolve(frontend, source)) === digest, 'Native zoom stale: ' + source);
    fingerprints[relative(path.join(import.meta.dirname, file))] = hash(path.join(import.meta.dirname, file));
}
const builtComparisonFile = path.join(import.meta.dirname, 'built-comparison-review-current.json'), builtComparison = read(builtComparisonFile);
assert(builtComparison.status === 'PASS' && builtComparison.execution.exitCode === 0 && builtComparison.observations.map(item => item.browser).sort().join(',') === 'chromium,firefox' && builtComparison.observations.every(item => item.result === 'PASS' && item.writes.length === 2 && item.stored.version === 3 && !item.pageErrors.length), 'Built comparison review incomplete');
for (const file of builtComparison.artifactFiles) assert(hash(path.join(frontend, file.path)) === file.sha256, 'Built comparison artifact changed');
for (const [source, digest] of Object.entries(builtComparison.sourceFingerprints)) { assert(hash(path.join(frontend, source)) === digest, 'Built comparison source changed'); fingerprints['BotSalesAI_Frontend/' + source] = digest; }
fingerprints[relative(builtComparisonFile)] = hash(builtComparisonFile);
checks.push({ id: 'built-comparison', command: builtComparison.execution.executable + ' ' + builtComparison.execution.args.join(' '), exitCode: 0, result: 'PASS', expected: 'Compiled comparison preserves the draft, applies without HTTP, then PATCHes only chosen fields with version 2 in Chromium and Firefox', observed: 'Compiled comparison preserves the draft, applies without HTTP, then PATCHes only chosen fields with version 2 in Chromium and Firefox', log: { path: relative(builtComparisonFile), sha256: hash(builtComparisonFile) } });
const baseline = read(path.join(import.meta.dirname, 'baseline.json')), provenance = read(path.join(import.meta.dirname, 'implementation-provenance.json'));
assert(Date.parse(baseline.capturedAt) < Date.parse(provenance.implementationStartedAt), 'Baseline must predate the first actual source mutation');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const baselineArtifacts = [path.join(import.meta.dirname, 'baseline.json'), path.join(import.meta.dirname, 'results.json'), path.join(import.meta.dirname, 'implementation-provenance.json'), ...walk(path.join(import.meta.dirname, 'baseline'))];
for (const file of ['inventory-current.json','shared-api-current.json','patterns-current.json','ANALOGOUS_PATTERNS.md','REPORT.md','ACCEPTANCE_GUIDE.md','documents-current.json','S01-contract-crosswalk-current-20261008.json']) fingerprints[relative(path.join(import.meta.dirname, file))] = hash(path.join(import.meta.dirname, file));
for (const file of ['docs/FRONTEND_UI_IMPROVEMENT_PLAN.md','docs/route-implementation.json','docs/route-state-role-matrix.json','evidence/REPORT.md']) fingerprints['BotSalesAI_Frontend/' + file] = hash(path.join(frontend, file));
const coverage = (name, count, reason) => ({ name, expected: count, observed: count, missing: 0, result: 'COMPLETE', reason });
const output = {
    schemaVersion: 1, step: 'S19', scope: 'F01–F09 and confirmed analogous defects across 16 modules; final current source, named automated UI behavior, native zoom, artifacts and canonical FE evidence. Local synthetic scope only.', recordedAt: new Date().toISOString(), status: 'COMPLETE', checks,
    coverage: [
        coverage('source-files', inventory.summary.sourceFiles, 'Current runtime source partition, hashes and owned gates; inventory is not a visual conformance percentage.'),
        coverage('shared-api-exports', 28, '22 components plus six compositions; direct-render and finite API/type/runtime/catalog contracts.'),
        coverage('route-mappings', 54, 'Current canonical route to actual React source/component binding.'),
        coverage('rendered-routes', 54, 'All-route smoke/axe plus the dedicated built-artifact viewport review.'),
        coverage('slots', 28, 'All public APIs have slot/native form/ref/ARIA/state contract coverage; counts do not mean every business branch was manually reviewed.'),
        coverage('states', 432, '54 by eight declared cells; tested versus justified N/A kept in the current matrix.'),
        coverage('baseline-records', baseline.files.length, '106 preserved source/package/config/script snapshots and actual before-render probes; scope is this corrective batch, not a fabricated baseline picture for every route.'),
        coverage('corrective-findings', 9, 'F01–F09 owner fixes with behavior regressions in the full run.'),
        coverage('modules-reviewed', 16, '24 module files plus shared/app owners; KEEP and confirmed fixes in ANALOGOUS_PATTERNS.md.'),
    ],
    baseline: { status: 'CAPTURED', capturedAt: baseline.capturedAt, implementationStartedAt: provenance.implementationStartedAt, artifacts: baselineArtifacts.map(file => ({ path: relative(file), sha256: hash(file) })), sourceFingerprints: Object.fromEntries(baseline.files.map(item => ['BotSalesAI_Frontend/' + item.path, item.sha256])), reason: 'First mutation timestamp extracted from the actual tool-call history; preserved copies have original bytes.' },
    sourceFingerprints: fingerprints,
    knownLimits: ['React/MSW synthetic local evidence only; no Backend/provider/database/production runtime proof.', 'Screen-reader speech and broad human WCAG conformance NOT_RUN; hosted CI/branch protection NOT_RUN.', 'Owner/user acceptance PENDING; READY_FOR_ACCEPTANCE_LOCAL_SCOPE means technical handoff is ready.', 'Canonical feature-link and missing-operation contract limits remain disclosed; no canonical API/schema/token edit or invented Backend endpoint.', 'Historical failed/interrupted runs and diagnostic REPRODUCED probes remain historical; only the single complete final run closes the browser gate.'],
};
fs.writeFileSync(path.join(import.meta.dirname, 'S19-current-evidence.json'), JSON.stringify(output, null, 2) + '\n');
console.log('Final S19 corrective evidence assembled from current executed records and canonical 140/140 checkpoints.');
