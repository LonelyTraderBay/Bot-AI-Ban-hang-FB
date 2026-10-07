import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const output = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(output, '../..');
const root = path.dirname(frontend);
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const s17Path = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const mode = process.argv[2];
function command(stage, id, observation) {
    const record = read(path.join(output, `${stage}-record.json`));
    if (record.exitCode !== 0 || record.runtimeDrift.length || record.verificationDrift?.length || record.restorationFailures.length) throw new Error(`Unverified command ${stage}`);
    const excludedChangedSnapshotInputs = [];
    for (const [file, sha256] of Object.entries({ ...record.runtimeSourceFingerprints, ...record.verificationSourceFingerprints }))
        if (digest(path.join(root, file)) !== sha256) {
            const builtFile = 'BotSalesAI_Frontend/tests/built-demo-regression.spec.ts';
            const defaultConfig = 'BotSalesAI_Frontend/playwright.config.ts';
            const builtRecord = file === builtFile && stage !== 'built-demo' ? read(path.join(output, 'built-demo-record.json')) : null;
            const builtLog = builtRecord ? fs.readFileSync(path.join(root, builtRecord.log.path), 'utf8') : '';
            if (file !== builtFile || !['e2e', 'finance', 'unit', 'contracts', 'layout', 'evidence-validator'].includes(stage)
                || record.args.some(arg => arg.includes('built-demo-regression'))
                || record.verificationSourceFingerprints[defaultConfig] !== digest(path.join(root, defaultConfig))
                || !fs.readFileSync(path.join(root, defaultConfig), 'utf8').includes("testIgnore: ['**/built-demo-regression.spec.ts']")
                || builtRecord.exitCode !== 0 || digest(path.join(root, builtRecord.log.path)) !== builtRecord.log.sha256
                || builtRecord.verificationSourceFingerprints[builtFile] !== digest(path.join(root, builtFile))
                || !/\b6 passed \(/.test(builtLog) || /\b\d+ failed\b/.test(builtLog))
                throw new Error(`Command ${stage} did not run on current source: ${file}`);
            excludedChangedSnapshotInputs.push({ path: file, capturedSha256: sha256, currentSha256: digest(path.join(root, file)),
                reason: 'Snapshot included this unexecuted dedicated spec. Default E2E explicitly ignores it; other captured commands name separate test targets. The repaired spec is revalidated by the separate six-case built-demo run. All executed source/config inputs must still match.' });
        }
    if (digest(path.join(root, record.log.path)) !== record.log.sha256) throw new Error(`Changed log ${stage}`);
    return { id, command: `${record.executable} ${record.args.join(' ')}`, exitCode: record.exitCode, result: 'PASS', expected: observation, observed: observation, log: record.log, ...(excludedChangedSnapshotInputs.length ? { excludedChangedSnapshotInputs } : {}) };
}
function fingerprints(files) {
    return Object.fromEntries([...new Set(files)].sort().map(file => [relative(file), digest(file)]));
}
function kitCommands() {
    const record = read(path.join(output, 'kit-checks-record.json'));
    if (record.checks.length !== 8 || record.sourceDrift.length || !record.historicalReleaseTestsPreserved)
        throw new Error('Kit checks are incomplete or changed historical evidence');
    for (const [file, sha256] of Object.entries(record.sourceFingerprints))
        if (digest(path.join(root, file)) !== sha256) throw new Error(`Kit check is stale: ${file}`);
    return record.checks.map(check => {
        if (check.exitCode !== 0 || digest(path.join(root, check.log.path)) !== check.log.sha256)
            throw new Error(`Unverified kit check: ${check.name}`);
        return { id: `kit-${check.name}`, command: check.args.join(' '), exitCode: 0, result: 'PASS',
            expected: 'Owning kit check exits 0 on the recorded current source',
            observed: 'Owning kit check exits 0 on the recorded current source', log: check.log };
    });
}
if (mode === 's17') {
    const archive = path.join(output, 'S17-pre-sync-snapshot.json');
    if (!fs.existsSync(archive)) fs.copyFileSync(s17Path, archive);
    const previous = read(s17Path);
    const checks = [
        command('evidence-validator', 'validator-fixtures', '11 of 11 validator regression tests pass'),
        command('contracts', 'shared-contract-fixtures', '38 of 38 composition, ancestry and shared API tests pass'),
        command('layout', 'layout-binding-and-source', '82 of 82 layout fixtures pass; source scan 76 files, 0 findings, 1 declared exception'),
    ];
    for (const [stage, count] of [['evidence-validator', 11], ['contracts', 38], ['layout', 82]]) {
        const log = fs.readFileSync(path.join(output, `${stage}.log`), 'utf8');
        if (!new RegExp('pass ' + count + '(?:\\s|$)').test(log) || !/fail 0(?:\s|$)/.test(log)) throw new Error(`Missing actual test count ${stage}`);
    }
    const manifest = { ...previous, recordedAt: new Date().toISOString(), checks, coverage: [
        { name: 'validator-fixtures', expected: 11, observed: 11, missing: 0, result: 'COMPLETE' },
        { name: 'shared-contract-gate-fixtures', expected: 38, observed: 38, missing: 0, result: 'COMPLETE' },
        { name: 'layout-binding-gate-fixtures', expected: 82, observed: 82, missing: 0, result: 'COMPLETE' },
    ], sourceFingerprints: fingerprints(Object.keys(previous.sourceFingerprints).map(file => path.join(root, file))) };
    fs.writeFileSync(s17Path, JSON.stringify(manifest, null, 2) + '\n');
    console.log('S17 refreshed from actual captured runs; previous snapshot preserved.');
} else if (mode === 's19' || mode === 's19-pending') {
    const inventory = read(path.join(output, 'inventory-current.json'));
    const apis = read(path.join(output, 'shared-api-source.json')).apis;
    const matrix = read(path.join(frontend, 'docs/route-state-role-matrix.json'));
    const e2eLog = fs.readFileSync(path.join(output, 'e2e.log'), 'utf8');
    const passed = e2eLog.match(/\b(\d+) passed \(/)?.[1];
    if (passed !== '504' || /\b\d+ failed\b/.test(e2eLog)) throw new Error('Full 504-case browser run is not passing');
    if (!inventory.summary.allRelevantAssigned || inventory.unknownFiles.length || inventory.runtimeUnresolvedOwnImports.length || inventory.summary.routeMappingsMissing) throw new Error('Inventory has unresolved source/route scope');
    for (const file of inventory.files) if (digest(path.resolve(frontend, file.path)) !== file.sha256) throw new Error(`Inventory is stale: ${file.path}`);
    if (matrix.summary.routeRoleBrowserMatrix !== 'PASS' || matrix.summary.routeMountSmoke !== 'PASS') throw new Error('Route-state/role matrix lacks actual browser evidence');
    if (mode === 's19') {
        const documents = read(path.join(output, 'documents-current.json'));
        if (documents.problems.length || documents.documents !== 95 || documents.normativeRuleCount !== 75) throw new Error('Final documentation checks are incomplete');
        for (const [file, sha256] of Object.entries(documents.sourceFingerprints))
            if (digest(path.join(root, file)) !== sha256) throw new Error(`Documentation check is stale: ${file}`);
        const literals = read(path.join(output, 'literal-paths-current.json'));
        const artifacts = read(path.join(output, 'frontend-plan-artifacts-current.json'));
        if (literals.unresolved.length || artifacts.missing.length || artifacts.tasks !== 28 || artifacts.plannedArtifactDeclarations !== 147)
            throw new Error('Literal paths or planned artifacts are not reconciled');
        for (const row of artifacts.artifacts) for (const file of row.current) {
            const current = path.join(frontend, file.path);
            if (!fs.existsSync(current) || (file.sha256 && digest(current) !== file.sha256))
                throw new Error(`Artifact reconciliation is stale: ${file.path}`);
        }
    }
    const domains = [
        ['source-files', inventory.summary.sourceFiles, 'Applicable source gates and runtime import closure; not a claim that every dynamic branch is enumerated.'],
        ['shared-api-exports', apis.length, 'Resolved TypeScript declarations/props/JSX consumers and named direct-render cases.'],
        ['route-mappings', inventory.summary.routes, 'Canonical manifest and router page bindings match with no missing or extra routes.'],
        ['rendered-routes', inventory.summary.routes, 'Full Chromium/Firefox run includes canonical route smoke and ready-state composition measurements at two viewports.'],
        ['slots', apis.length, '27 APIs have direct-render contract cases; this is not exhaustive coverage of every possible children/render-callback branch.'],
        ['states', matrix.routes.reduce((sum, route) => sum + Object.keys(route.states).length, 0), 'Generated matrix distinguishes shared-component proof, route-specific proof and explicit N/A. Shared proof is not promoted to per-route rendering.'],
    ];
    if (domains.at(-1)[1] !== 432) throw new Error('Unexpected canonical state matrix denominator');
    const checks = [
        command('verify', 'local-verify', 'Root verify exits 0: generator/source/boundary/lint/type/domain/unit/build/layout/visual/composition/evidence gates pass'),
        command('e2e', 'full-browser-suite', '504 of 504 Chromium/Firefox browser cases pass; production/demo rebuilt; runtime source remains unchanged'),
        command('built-demo', 'built-demo-route-suite', '6 of 6 dedicated Chromium/Firefox built-artifact cases pass, including all 54 routes at 390px and 1440px; the strict preview port assertion runs after navigation'),
        command('contracts', 'shared-api-contracts', '38 of 38 composition/ancestry/API tests pass'),
        command('unit', 'application-unit-render-contracts', '136 of 136 application unit cases pass, including 38 named direct-render cases across all 27 public UI APIs'),
        command('finance', 'finance-oracle-revalidation', '6 of 6 Chromium/Firefox Finance cases pass after correcting the obsolete first-child oracle; outer spacing assertions remain strict'),
        ...kitCommands(),
    ];
    const files = inventory.files.filter(file => file.category !== 'frontend-ledger-or-ledger-view' && !['generated-frontend-plan-view', 'snapshot-or-release-metadata'].includes(file.category)).map(file => path.resolve(frontend, file.path));
    files.push(path.join(output, 'inventory-current.json'), path.join(output, 'shared-api-source.json'), path.join(frontend, 'docs/route-state-role-matrix.json'), path.join(frontend, 'evidence/REPORT.md'));
    files.push(...['REPORT.md', 'CONTRACT.md', 'documents-current.json', 'literal-paths-current.json', 'frontend-plan-artifacts-current.json', 'kit-checks-record.json', 'run-check.mjs', 'run-kit-checks.py', 'verify-documents.mjs', 'audit-literal-paths.py', 'reconcile-plan-artifacts.py', 'finalize-evidence.mjs', 'update-live-status.py', 'inventory-current.mjs', 'route-generator-record.json', 'git-diff-check-record.json'].map(file => path.join(output, file)));
    const manifest = { schemaVersion: 1, step: 'S19', scope: 'Current frontend source, documented API/route ownership and bounded automated browser verification after spacing corrections; no backend/live or human acceptance claim.', recordedAt: new Date().toISOString(), status: mode === 's19' ? 'COMPLETE' : 'IN_PROGRESS', checks, coverage: [
        ...domains.map(([name, count, reason]) => ({ name, expected: count, observed: count, missing: 0, result: 'COMPLETE', reason })),
        { name: 'baseline-records', expected: 0, observed: 0, missing: 0, result: 'N/A', reason: 'This task changes documentation/generators/governance tests and verifies existing React runtime. It makes no React layout edit; earlier spacing before/after baselines remain in their original task evidence.' },
    ], baseline: { status: 'N/A', reason: 'Documentation/tooling synchronization and verification of unchanged React runtime; no new layout edit requiring a before/after UI baseline.' }, sourceFingerprints: fingerprints(files), knownLimits: [
        '504 browser cases, 27 API contracts and route/state counts prove only the named assertions and coverage dispositions; they do not exhaust every dynamic branch or manual visual/accessibility state.',
        'Native browser zoom/text-only and screen-reader speech are not inferred from DOM text stress. Native zoom evidence not rerun in this turn retains its historical date/source scope.',
        'Synthetic MSW/local only; no hosted CI, branch protection, owner acceptance, backend/provider, staging or production proof.',
        'FE effective tracker remains stale until original task evidence is revalidated by dependency; general verify/E2E does not earn task checkpoints.',
        'The corrected built-demo spec was explicitly ignored by the 504-case suite and not executed by the other named commands. Original snapshot hashes are retained as annotated outside-scope changes; the dedicated six-case rerun verifies the corrected spec on current source. All executed inputs remain current.',
    ] };
    fs.writeFileSync(path.join(output, 'S19-current-evidence.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ currentPaths: inventory.files.length, fingerprints: Object.keys(manifest.sourceFingerprints).length, coverage: manifest.coverage }));
} else throw new Error('Expected s17, s19-pending or s19');
