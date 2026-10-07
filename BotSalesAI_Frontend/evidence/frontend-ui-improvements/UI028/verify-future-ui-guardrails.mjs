import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Document verification only. This is not the proposed runtime layout checker.
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const checks = [];
const check = (name, passed, observed) => checks.push({ name, status: passed ? 'PASS' : 'FAIL', observed });
const logName = 'S02-future-ui-guardrails-20261005.log';
const resultName = 'S02-future-ui-guardrails-20261005.json';
const baselineFile = 'evidence/frontend-spacing-audit-20261005/verification.json';
const baseline = JSON.parse(read(baselineFile)).protectedInputHashes;
const protectedHashes = baseline.filter(row => row.file !== 'AGENTS.md');
const changedProtected = protectedHashes.filter(row => sha(row.file) !== row.sha256);
check('app-canonical-packages-original-rules-and-ledgers-preserved', changedProtected.length === 0, { files: protectedHashes.length, changes: changedProtected });
const initialHashes = baseline.map(({ file }) => ({ file, sha256: sha(file) }));
const agentsChange = { file: 'AGENTS.md', before: baseline.find(row => row.file === 'AGENTS.md')?.sha256, after: sha('AGENTS.md'), reason: 'Authorized documentation change: future UI policy and closing evidence requirements.' };
const documents = ['AGENTS.md', 'DESIGN.md', 'UX-CONTRACT.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/FRONTEND_SPACING_STANDARD.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'evidence/REPORT.md'];
const standard = read('docs/FRONTEND_SPACING_STANDARD.md');
const plan = read('docs/FRONTEND_UI_IMPROVEMENT_PLAN.md');
const rules = [...standard.matchAll(/\*\*SPC-(\d{3})\s/g)].map(match => Number(match[1]));
check('40-unique-sequential-rules-and-current-versions', rules.length === 40 && rules.every((id, index) => id === index + 1) && standard.includes('**Phiên bản:** 1.2') && plan.includes('**Phiên bản:** 8.2'), { ruleCount: rules.length, standardVersion: '1.2', planVersion: '8.2' });
const prevention = standard.slice(standard.indexOf('## 13. Quy trình'));
const closingChecklist = prevention.slice(prevention.indexOf('### 13.2.'));
check('future-ui-runbook-role-record-and-10-point-closing-checklist', prevention.includes('### 13.1.') && prevention.includes('### 13.2.') && prevention.includes('| Consumers / impact |') && (closingChecklist.match(/^- \[ \]/gm) || []).length === 10, { newRules: rules.filter(id => id >= 33), closingItems: (closingChecklist.match(/^- \[ \]/gm) || []).length });
const requiredReferences = ['AGENTS.md', 'DESIGN.md', 'UX-CONTRACT.md', 'docs/FRONTEND_SCOPE.md', 'docs/CONTINUE_FRONTEND.md', 'evidence/REPORT.md'];
const staleReferences = requiredReferences.filter(file => !read(file).includes('SPC-001–040'));
check('entry-guidance-uses-the-current-40-rule-policy', staleReferences.length === 0 && ['AGENTS.md', 'DESIGN.md', 'UX-CONTRACT.md'].every(file => read(file).includes('#13-quy-trình-phòng-ngừa-tái-phạm-cho-ui-mới')), { files: requiredReferences, missingCurrentRange: staleReferences });
const tableRows = text => text.split(/\r?\n/).filter(line => /^\| UI028\.W\d{2} \|/.test(line)).map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
const work = tableRows(plan);
const checkpointCounts = Object.fromEntries(['C03', 'C04', 'C05'].map(id => [id, work.filter(row => row[1] === id).length]));
check('36-existing-work-items-remain-todo-in-the-same-checkpoints', work.length === 36 && work.every((row, index) => row[0] === `UI028.W${String(index + 1).padStart(2, '0')}` && row[5] === 'TODO') && checkpointCounts.C03 === 25 && checkpointCounts.C04 === 7 && checkpointCounts.C05 === 4, { count: work.length, done: work.filter(row => row[5] === 'DONE').length, checkpointCounts });
const guardMap = plan.slice(plan.indexOf('### 14.11.'));
check('all-eight-new-rules-map-to-existing-rollout-work', Array.from({ length: 8 }, (_, i) => 33 + i).every(id => new RegExp(`^\\| SPC-0${id}:.*W\\d{2}`, 'm').test(guardMap)), { section: '14.11', rules: 'SPC-033–040', addedWorkItems: 0 });
const ui = plan.split(/\r?\n/).filter(line => /^\| UI\d{3} \| P[012] \| (BC|TU) \|/.test(line)).map(line => {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    const [done, total] = cells[6].split('/').map(Number);
    return { id: cells[0], status: cells[5], done, total };
});
const ui028 = ui.find(row => row.id === 'UI028');
check('policy-does-not-inflate-ui-progress', ui.length === 28 && ui.filter(row => row.status === 'DONE').length === 27 && ui.reduce((sum, row) => sum + row.done, 0) === 137 && ui.reduce((sum, row) => sum + row.total, 0) === 140 && ui028?.status === 'IN_PROGRESS' && ui028.done === 2 && ui028.total === 5, { tasks: ui.length, completedTasks: ui.filter(row => row.status === 'DONE').length, completedCheckpoints: 137, totalCheckpoints: 140, ui028 });
const proposedFiles = ['apps/web/src/shared/ui/layout.ts', 'scripts/check-layout.mjs', 'scripts/layout-exceptions.json', 'tests/layout-checker.test.mjs', 'apps/web/tests/layout-components.test.tsx', 'tests/layout-spacing.spec.ts', 'playwright.built-demo.config.ts'];
const proposed = proposedFiles.map(file => ({ file, exists: fs.existsSync(path.join(root, file)), status: 'NOT_IMPLEMENTED' }));
check('runtime-enforcement-is-explicitly-not-implemented', proposed.every(row => !row.exists) && prevention.includes('NOT_IMPLEMENTED/NOT_RUN') && guardMap.includes('NOT_IMPLEMENTED'), proposed);
const historicalFiles = ['evidence/frontend-spacing-audit-20261005/verify-docs.mjs', 'evidence/frontend-ui-improvements/UI028/verify-detailed-plan.mjs', 'evidence/frontend-ui-improvements/UI028/S02-detailed-rollout-plan-20261005.json', 'evidence/frontend-ui-improvements/UI028/S02-detailed-rollout-plan-20261005.log'];
const historyBefore = historicalFiles.map(file => ({ file, sha256: sha(file) }));
const previous = JSON.parse(read(historicalFiles[2]));
const historyInputIssues = previous.inputHashes.filter(row => historicalFiles.includes(row.file) && sha(row.file) !== row.sha256);
check('previous-32-rule-verifier-keeps-its-pinned-snapshot', historyInputIssues.length === 0 && read(historicalFiles[1]).includes('rules.length === 32') && guardMap.includes('snapshot'), { preservedVerifierHash: previous.inputHashes.find(row => row.file === historicalFiles[1])?.sha256, issues: historyInputIssues });

const headings = content => content.split(/\r?\n/).filter(line => /^#{1,6} /.test(line)).map(line => line.replace(/^#{1,6} /, '').toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replace(/ /g, '-'));
const brokenLinks = [];
let checkedLinks = 0;
for (const file of documents) {
    let content = read(file);
    if (file === 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md') content = content.slice(content.indexOf('## 14. UI028'));
    if (file === 'evidence/REPORT.md') content = content.split('\n---')[0];
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1].replace(/^<|>$/g, '');
        if (/^(https?:|mailto:|app:|plugin:)/.test(target)) continue;
        const [local, fragment] = target.split('#');
        const absolute = local ? path.resolve(root, path.dirname(file), decodeURIComponent(local)) : path.join(root, file);
        checkedLinks++;
        if (absolute === path.join(directory, resultName)) continue;
        if (!fs.existsSync(absolute)) brokenLinks.push({ file, target, reason: 'FILE_MISSING' });
        else if (fragment && absolute.endsWith('.md') && !headings(fs.readFileSync(absolute, 'utf8')).includes(decodeURIComponent(fragment))) brokenLinks.push({ file, target, reason: 'ANCHOR_MISSING' });
    }
}
check('current-policy-plan-and-guidance-local-links', brokenLinks.length === 0, { checkedLinks, brokenLinks });
const whitespaceIssues = documents.flatMap(file => read(file).split(/\r?\n/).flatMap((line, index) => /[\t ]+$/.test(line) ? [{ file, line: index + 1 }] : []));
check('updated-documents-have-no-trailing-whitespace', whitespaceIssues.length === 0, whitespaceIssues);
const commands = [];
function run(name, executable, args) {
    const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? result.error.message : ''}`;
    commands.push({ name, executable, args, cwd: root, exitCode: result.status, output });
    check(name, result.status === 0, { exitCode: result.status, commandIndex: commands.length - 1 });
    return output;
}
run('generate-check-direct-node-equivalent', process.execPath, ['scripts/generate.mjs', '--check']);
const feText = run('canonical-fe-status-read-only', process.execPath, ['botsales-kit/scripts/progress.mjs', 'status']);
let feStatus;
try { feStatus = JSON.parse(feText); } catch { check('fe-status-json', false, 'See command log'); }
run('scoped-document-diff-check', 'git', ['diff', '--check', '--', ...documents]);
const changesAfter = initialHashes.filter(row => sha(row.file) !== row.sha256);
const historicalChanges = historyBefore.filter(row => sha(row.file) !== row.sha256);
check('verification-does-not-mutate-source-ledgers-guidance-or-old-evidence', changesAfter.length === 0 && historicalChanges.length === 0, { protectedFiles: initialHashes.length, historicalFiles: historyBefore.length, changesAfter, historicalChanges });
const self = path.relative(root, fileURLToPath(import.meta.url)).replaceAll('\\', '/');
const result = {
    capturedAt: new Date().toISOString(), scope: 'DOCS_ONLY_FUTURE_UI_GUARDRAILS',
    status: checks.every(row => row.status === 'PASS') ? 'PASS_DOCS_NOT_ENFORCEMENT' : 'FAIL_DOCS_CHECKS',
    specification: { version: '1.2', ruleCount: 40, addedRules: 'SPC-033–040', planVersion: '8.2' },
    implementation: { ui028, workDone: 0, workTotal: 36, checkpointCounts, layoutEnforcement: 'NOT_IMPLEMENTED' },
    checks, proposedFiles: proposed, authorizedGuidanceChange: agentsChange,
    inputHashes: [...documents, self, baselineFile].map(file => ({ file, sha256: sha(file) })),
    protectedInputHashes: initialHashes, historicalInputHashes: historyBefore, feStatus, commandLog: logName,
    runtimeTests: 'NOT_RUN_DOCS_ONLY_NO_REACT_IMPLEMENTATION_CHANGES',
    limitations: ['This script verifies documents and freshness, not runtime spacing compliance.', 'The automatic layout checker, shared bridge and layout/browser tests remain proposed UI028 outputs.', 'Canonical FE status is read-only; stale evidence is not a runtime failure or an implementation percentage.', 'No Backend, hosted CI, screen-reader speech or owner acceptance is claimed.'],
};
fs.writeFileSync(path.join(directory, logName), commands.map(command => JSON.stringify(command, null, 2)).join('\n\n') + '\n');
fs.writeFileSync(path.join(directory, resultName), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, checks: checks.map(({ name, status }) => ({ name, status })), ruleCount: rules.length, ui028, workItems: work.length, feStatus: feStatus ? { verified: feStatus.verifiedSteps, stale: feStatus.stale.length, blocked: feStatus.blocked.length } : null }, null, 2));
if (result.status !== 'PASS_DOCS_NOT_ENFORCEMENT') process.exitCode = 1;
