import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const directory = path.dirname(fileURLToPath(import.meta.url));
const before = JSON.parse(fs.readFileSync(path.join(directory, 'S03-before.json'), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(directory, 'inventory.json'), 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const protectedFiles = before.protectedFiles.map(row => ({ ...row, currentSha256: hash(row.file), unchanged: hash(row.file) === row.sha256 }));
const indexFingerprint = createHash('sha256').update(execFileSync('git', ['ls-files', '-s', '-z'], { maxBuffer: 16e6 })).digest('hex');
const changedOwners = ['scripts/tools.mjs', 'scripts/ui-source-files.mjs', 'scripts/ui-import-scope.mjs', 'scripts/ui-entry-scope.mjs', 'scripts/check-layout.mjs', 'scripts/check-visual-tokens.mjs', 'scripts/check-ui-composition.mjs', 'tests/tools.test.mjs', 'tests/ui-source-scope.test.mjs', 'tests/ui-import-scope.test.mjs', 'tests/ui-entry-scope.test.mjs', 'tests/fixtures/ui-source-project.mjs', 'tests/layout-checker.test.mjs', 'tests/visual-token-checker.test.mjs'];
const scopeComplete = inventory.unknownFiles.length === 0 && inventory.runtimeUnresolvedOwnImports.length === 0 && inventory.unresolvedOwnImports.every(row => row.resolutionClassification && row.sourceExists);
const report = {
    checkedAt: new Date().toISOString(), mode: 'IMPLEMENTATION', objective: 'Full S03–S20 scope remains active; this capture covers intake and initial scope guard only.',
    protectedFiles, indexUnchanged: indexFingerprint === before.indexFingerprint, scopeComplete,
    inventory: inventory.summary, changedOwnerHashes: changedOwners.map(file => ({ file, sha256: hash(file) })),
    priorChecks: [
        { command: 'node --test tests/tools.test.mjs', exit: 0, passed: 8, log: 'S03-compiler-after.log' },
        { command: 'node scripts/check-source.mjs', exit: 0, files: 68, routes: 54, log: 'S03-source-after.log' },
        { command: 'node scripts/check-boundaries.mjs', exit: 0, imports: 504, fixtures: 10, log: 'S03-boundaries-after.log' },
        { command: 'node scripts/test-domain.mjs', exit: 0, passed: 88, log: 'S03-domain.log' },
        { command: 'node node_modules/typescript/lib/tsc.js -p apps/web/tsconfig.json --noEmit', exit: 0, log: 'S03-typecheck.log' },
        { command: 'node scripts/generate.mjs --check', exit: 0, outputs: 11, schemas: 283, operations: 210, routes: 54 },
        { command: 'node --test tests/tools.test.mjs tests/ui-source-scope.test.mjs tests/layout-checker.test.mjs tests/visual-token-checker.test.mjs tests/ui-composition-checker.test.mjs', exit: 0, passed: 44, log: 'S04-fixtures-final.log' },
        ...['layout','visual','composition'].map(gate => ({ gate, exit: 0, log: `S04-${gate}.log` })),
    ],
    checks: [
        { command: 'node --test tests/ui-entry-scope.test.mjs tests/ui-import-scope.test.mjs tests/ui-source-scope.test.mjs tests/layout-checker.test.mjs tests/visual-token-checker.test.mjs tests/ui-composition-checker.test.mjs', exit: 0, passed: 77, log: 'S04-coverage-fixtures-final.log' },
        ...['check-layout', 'check-visual-tokens', 'check-ui-composition'].map(gate => {
            const artifact = `S04-coverage-${gate}.json`;
            const result = JSON.parse(fs.readFileSync(path.join(directory, artifact), 'utf8').replace(/^\uFEFF/, ''));
            return { gate, exit: 0, artifact, files: result.files, status: result.status, findings: (result.findings || result.issues).length, artifactSha256: hash(path.join(directory, artifact)) };
        }),
    ],
    checksProvenance: 'Exits recorded from actual tool command results. priorChecks belong to the preceding S03/initial-S04 batch; this capture does not re-execute or independently authenticate tests.',
    progress: { S03: 'DONE_INTAKE', S04: 'DONE_DISCOVERY_SCOPED', S05_S20: 'OPEN' },
    S04Coverage: 'S04-coverage.json; discovery only, unsupported paths fail closed; binding/style semantics and final regression remain mandatory',
    missingS04: [],
    notRun: ['production/demo build', 'browser readiness/geometry/reflow/native resize/zoom', 'full E2E', 'hosted CI', 'owner acceptance', 'screen-reader speech'],
};
fs.writeFileSync(path.join(directory, 'status.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ scopeComplete, protectedUnchanged: protectedFiles.every(row => row.unchanged), indexUnchanged: report.indexUnchanged, progress: report.progress }));
if (!scopeComplete || !protectedFiles.every(row => row.unchanged) || !report.indexUnchanged) process.exitCode = 1;
