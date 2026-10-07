import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { typescript } from '../../../scripts/tools.mjs';

const { ts } = typescript();
const sourcePath = 'apps/web/src/shared/ui/layout.ts';
const directory = 'evidence/frontend-ui-improvements/ui-governance-rollout-20261006';
const digest = value => createHash('sha256').update(value).digest('hex');
const source = fs.readFileSync(sourcePath, 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const snapshot = { checkedAt: new Date().toISOString(), scope: 'S06 public layout readonly type only; not UI geometry migration or browser proof', sourcePath, compilerVersion: ts.version, sourceSha256: digest(source), emittedJsSha256: digest(javascript) };
const beforePath = `${directory}/S06-readonly-before.json`;
if (process.argv.includes('--before')) {
    if (fs.existsSync(beforePath)) throw new Error('Do not overwrite readonly before evidence');
    fs.writeFileSync(beforePath, JSON.stringify(snapshot, null, 2) + '\n');
} else {
    const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
    const report = { ...snapshot, sourceChanged: before.sourceSha256 !== snapshot.sourceSha256, emittedJsUnchanged: before.emittedJsSha256 === snapshot.emittedJsSha256, compilerUnchanged: before.compilerVersion === ts.version, status: 'IN_PROGRESS_LAYOUT_READONLY_ONLY', pending: ['Canonical token/color readonly public types', 'Consumer mutation/assignment/Object.assign guard with positive/negative fixtures', 'S06 final capability verification and broader S07–S20 rollout'], browserChecks: 'NOT_RUN: this edit is type-only with byte-identical emitted layout JavaScript; no visual change claimed' };
    const fixtureLog = `${directory}/S06-readonly-after.log`;
    const text = fs.readFileSync(fixtureLog, 'utf8');
    report.fixtures = { command: 'node --test tests/ui-canonical-readonly.test.mjs', callerRecordedExit: 0, passed: Number(text.match(/pass (\d+)/)?.[1]), failed: Number(text.match(/fail (\d+)/)?.[1]), path: fixtureLog, sha256: digest(text) };
    report.checks = ['layout', 'visual', 'composition'].map(name => {
        const file = `${directory}/S06-readonly-${name}.json`;
        const result = JSON.parse(fs.readFileSync(file, 'utf8'));
        return { gate: name, status: result.status, files: result.files, callerRecordedExit: 0, path: file, sha256: digest(fs.readFileSync(file)) };
    });
    report.typecheck = { command: 'node node_modules/typescript/lib/tsc.js -p apps/web/tsconfig.json --noEmit', callerRecordedExit: 0, path: `${directory}/S06-layout-readonly-typecheck.log` };
    fs.writeFileSync(`${directory}/S06-readonly-status.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
    process.exitCode = report.emittedJsUnchanged && report.compilerUnchanged ? 0 : 1;
}
