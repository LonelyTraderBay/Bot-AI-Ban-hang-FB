import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { auditComposition, inspectComposition, compositionOwners } from '../../../scripts/check-ui-composition.mjs';

// A bounded evidence collector, not a new application gate or progress ledger.
const out = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(out, '../../..');
const posix = value => value.replaceAll('\\', '/');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
});
const sources = walk(path.join(root, 'apps/web/src'));
const composition = auditComposition(root);
const compositionNames = new Set(Object.values(compositionOwners));
const jsxTags = sources.filter(file => file.endsWith('.tsx')).flatMap(file => inspectComposition(fs.readFileSync(file, 'utf8'), posix(path.relative(root, file))).tags);
const components = ['apps/web/src/shared/ui/components.tsx', 'apps/web/src/shared/ui/composition.tsx'].flatMap(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    return sf.statements.filter(node => ts.isFunctionDeclaration(node) && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)).map(node => {
        const name = node.name.text;
        const consumerFiles = [...new Set(jsxTags.filter(item => item.tag === name && item.file !== file).map(item => item.file))];
        return { name, file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, jsxOccurrences: composition.tagCounts[name] || 0, consumerFiles };
    });
});
const command = (name, args) => {
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(path.join(out, `${name}.log`), `${process.execPath} ${args.join(' ')}\nexit=${result.status}\n${result.stdout || ''}${result.stderr || ''}${result.error || ''}`);
    let report;
    if (args.includes('--json') && result.status === 0) report = JSON.parse(result.stdout);
    return { name, args, exitCode: result.status, error: result.error?.message, report };
};
const checks = [
    command('layout-current', ['scripts/check-layout.mjs', '--json']),
    command('visual-current', ['scripts/check-visual-tokens.mjs', '--json']),
    command('composition-current', ['scripts/check-ui-composition.mjs', '--json']),
    command('checker-fixtures-current', ['--test', 'tests/layout-checker.test.mjs', 'tests/visual-token-checker.test.mjs', 'tests/ui-composition-checker.test.mjs']),
    command('generate-current', ['scripts/generate.mjs', '--check']),
    command('frontend-status-before-policy', ['botsales-kit/scripts/progress.mjs', 'status']),
];
const immutable = [...sources, ...[
    'package.json', 'package-lock.json', 'scripts/check-layout.mjs', 'scripts/check-visual-tokens.mjs', 'scripts/check-ui-composition.mjs',
    'AI_RULES.md', 'botsales-kit/AI_RULES.md', 'botsales-kit/design/tokens.json', 'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-progress.json', 'botsales-kit/execution/plan.json', 'botsales-kit/execution/progress.json',
].map(file => path.join(root, file))];
const result = {
    schemaVersion: 1, collectedAt: new Date().toISOString(), scope: 'Frontend audit and policy/plan only; runtime implementation unchanged',
    node: process.version, sourceCounts: { ts: composition.files, tsx: composition.tsxFiles, moduleFolders: composition.moduleFolders, css: sources.filter(file => file.endsWith('.css')).length },
    sharedComponents: components, sharedExportCount: components.length, compositionOccurrences: jsxTags.filter(item => compositionNames.has(item.tag)).length,
    compositionConsumers: [...new Set(jsxTags.filter(item => compositionNames.has(item.tag) && item.file !== 'apps/web/src/shared/ui/composition.tsx').map(item => item.file))].sort(), tagCounts: composition.tagCounts,
    sourceHashes: immutable.filter(fs.existsSync).map(file => ({ file: posix(path.relative(root, file)), sha256: hash(file) })),
    checks: checks.map(check => ({ ...check, report: check.report && { status: check.report.status, files: check.report.files, findings: check.report.findings?.length ?? check.report.issues?.length, exceptions: check.report.exceptionsUsed?.length } })),
    limitations: ['Current source gates and their fixtures do not establish complete enforcement; see adversarial probes.', 'No build, full E2E, native zoom, speech review, hosted CI or owner acceptance run in this docs-only request.', 'No architecture readiness percentage inferred from component counts.'],
};
fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ sourceCounts: result.sourceCounts, shared: components.length, compositions: result.compositionOccurrences, checks: result.checks }, null, 2));
if (checks.some(check => check.exitCode !== 0)) process.exitCode = 1;
