import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Documentation/evidence verification only; never mutates app source or ledgers.
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const checks = [];
const check = (name, passed, detail) => checks.push({ name, status: passed ? 'PASS' : 'FAIL', detail });
const initialInventory = JSON.parse(read('evidence/frontend-spacing-audit-20261005/source-inventory.json'));
const baselineRuntime = initialInventory.inputHashes.filter(row => row.file.startsWith('apps/web/src/') || row.file.startsWith('botsales-kit/contracts/') || row.file === 'botsales-kit/design/tokens.json');
const runtimeChanges = baselineRuntime.filter(row => hash(row.file) !== row.sha256);
check('application-and-canonical-inputs-match-captured-baseline', runtimeChanges.length === 0, { checked: baselineRuntime.length, changed: runtimeChanges });
const protectedPaths = [...new Set([
    ...baselineRuntime.map(row => row.file),
    'AI_RULES.md', 'botsales-kit/AI_RULES.md', 'package.json', 'package-lock.json',
    'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-progress.json',
    'botsales-kit/execution/plan.json', 'botsales-kit/execution/progress.json',
])];
const before = protectedPaths.map(file => ({ file, sha256: hash(file) }));
function command(name, args, log) {
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? `\n${result.error.message}\n` : ''}`;
    fs.writeFileSync(path.join(directory, log), output);
    check(name, result.status === 0, { executable: process.execPath, args, exitCode: result.status, log });
    return output;
}
command('spacing-source-inventory-capture', ['evidence/frontend-spacing-audit-20261005/capture-spacing.mjs'], 'capture.log');
command('generate-check-direct-node-equivalent', ['scripts/generate.mjs', '--check'], 'generate-check.log');
const trackerText = command('canonical-fe-status-read-only', ['botsales-kit/scripts/progress.mjs', 'status'], 'fe-status.log');
let feStatus;
try { feStatus = JSON.parse(trackerText); } catch { check('canonical-fe-status-json', false, 'See fe-status.log'); }
const inventory = JSON.parse(read('evidence/frontend-spacing-audit-20261005/source-inventory.json'));
check('inventory-input-and-route-integrity', inventory.status === 'CAPTURED_NOT_CONFORMANCE_PASS' && inventory.summary.matchedRoutes === 54 && inventory.summary.parserDiagnostics === 0, inventory.summary);
const live = JSON.parse(read('evidence/frontend-spacing-audit-20261005/live-imports.json'));
check('live-evidence-json-syntax', Boolean(live && typeof live === 'object'), 'JSON parses; this is not a new browser verification.');

const policy = read('docs/FRONTEND_SPACING_STANDARD.md');
const numberedRules = [...policy.matchAll(/\*\*SPC-(\d{3})\s/g)].map(match => Number(match[1]));
check('32-unique-sequential-rules', numberedRules.length === 32 && numberedRules.every((number, index) => number === index + 1), numberedRules);
const plan = read('docs/FRONTEND_UI_IMPROVEMENT_PLAN.md');
const rows = plan.split(/\r?\n/).filter(line => /^\| UI\d{3} \| P[012] \| (BC|TU) \|/.test(line)).map(line => {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    const checkpoint = cells[6].split('/').map(Number);
    return { id: cells[0], type: cells[2], status: cells[5], completed: checkpoint[0], total: checkpoint[1] };
});
const completed = rows.reduce((sum, row) => sum + row.completed, 0);
const total = rows.reduce((sum, row) => sum + row.total, 0);
const done = rows.filter(row => row.status === 'DONE').length;
const ui028 = rows.find(row => row.id === 'UI028');
check('ui-ledger-arithmetic-and-current-phase', rows.length === 28 && new Set(rows.map(row => row.id)).size === 28 && completed === 137 && total === 140 && done === 27 && ui028?.status === 'IN_PROGRESS' && ui028.completed === 2 && ui028.total === 5 && rows.filter(row => row.type === 'BC').length === 16 && rows.filter(row => row.type === 'TU').length === 12 && rows.every(row => row.status !== 'BLOCKED'), { tasks: rows.length, done, completed, total, ui028 });
check('plan-current-summary-matches-table', plan.includes('**137/140**') && plan.includes('27/28 DONE') && plan.includes('11/12 DONE'), 'Version 8.0 summary matches the supplementary UI table.');

// Resolve file and heading links in the new specification/audit and current control sections.
const sections = [
    ['docs/FRONTEND_SPACING_STANDARD.md', policy],
    ['evidence/frontend-spacing-audit-20261005/REPORT.md', read('evidence/frontend-spacing-audit-20261005/REPORT.md')],
    ['docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', plan.slice(plan.indexOf('## 14. UI028'))],
    ['docs/PROJECT_CONTEXT.md', read('docs/PROJECT_CONTEXT.md')],
    ['docs/CONTINUE_FRONTEND.md', read('docs/CONTINUE_FRONTEND.md')],
    ['docs/FRONTEND_SCOPE.md', read('docs/FRONTEND_SCOPE.md')],
    ['DESIGN.md', read('DESIGN.md')],
    ['UX-CONTRACT.md', read('UX-CONTRACT.md')],
    ['AGENTS.md', read('AGENTS.md')],
    ['evidence/REPORT.md', read('evidence/REPORT.md').split('\n---')[0]],
];
const headingIds = content => content.split(/\r?\n/).filter(line => /^#{1,6} /.test(line)).map(line => line.replace(/^#{1,6} /, '').toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replace(/ /g, '-'));
const broken = [];
let linkCount = 0;
for (const [file, content] of sections) {
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1].replace(/^<|>$/g, '');
        if (/^(https?:|app:|plugin:|mailto:)/.test(target)) continue;
        const [fileTarget, fragment] = target.split('#');
        const absolute = fileTarget ? path.resolve(root, path.dirname(file), decodeURIComponent(fileTarget)) : path.join(root, file);
        linkCount++;
        // verification.json is emitted at the end of this run.
        if (absolute === path.join(directory, 'verification.json')) continue;
        if (!fs.existsSync(absolute)) broken.push({ file, target, reason: 'FILE_MISSING' });
        else if (fragment && absolute.endsWith('.md') && !headingIds(fs.readFileSync(absolute, 'utf8')).includes(decodeURIComponent(fragment))) broken.push({ file, target, reason: 'HEADING_MISSING' });
    }
}
check('local-document-links', broken.length === 0, { checked: linkCount, broken });
const editedPaths = ['AGENTS.md', 'DESIGN.md', 'UX-CONTRACT.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/FRONTEND_SCOPE.md', 'evidence/REPORT.md'];
const diff = spawnSync('git', ['diff', '--check', '--', ...editedPaths], { cwd: root, encoding: 'utf8' });
fs.writeFileSync(path.join(directory, 'diff-check.log'), `${diff.stdout || ''}${diff.stderr || ''}${diff.error ? diff.error.message : ''}`);
check('scoped-document-diff-check', diff.status === 0, { exitCode: diff.status, log: 'diff-check.log' });
const newPaths = ['docs/FRONTEND_SPACING_STANDARD.md', ...['REPORT.md', 'capture-spacing.mjs', 'verify-docs.mjs', 'live-imports.json'].map(file => `evidence/frontend-spacing-audit-20261005/${file}`)];
const trailingWhitespace = newPaths.flatMap(file => read(file).split(/\r?\n/).flatMap((line, index) => /[\t ]+$/.test(line) ? [{ file, line: index + 1 }] : []));
check('new-document-and-collector-whitespace', trailingWhitespace.length === 0, trailingWhitespace);
const changed = before.filter(row => hash(row.file) !== row.sha256);
check('verification-did-not-mutate-protected-inputs-or-ledgers', changed.length === 0, { checked: before.length, changed });
const result = {
    capturedAt: new Date().toISOString(), scope: 'UI028_SPECIFICATION_AND_DOCUMENTATION_ONLY',
    status: checks.every(row => row.status === 'PASS') ? 'PASS_DOCS_ONLY' : 'FAIL_DOCS_CHECK',
    checks, feStatus, protectedInputHashes: before,
    runtimeTests: 'NOT_RUN_THIS_TURN_NO_RUNTIME_CHANGES',
    implementation: 'UI028_C01_C02_SPECIFIED_C03_C04_C05_PENDING',
    limitations: ['Document checks and generator freshness do not certify runtime spacing conformance.', 'Read-only FE status may report stale checkpoints after control-document changes; no ledger revalidation is fabricated.', 'No Backend/hosted CI/screen-reader/owner acceptance is claimed.'],
};
fs.writeFileSync(path.join(directory, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, checks, feStatus }, null, 2));
if (result.status !== 'PASS_DOCS_ONLY') process.exitCode = 1;
