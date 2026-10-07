import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Validates the rollout document, not the implementation or spacing conformance.
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const checks = [];
const check = (name, passed, observed) => checks.push({ name, status: passed ? 'PASS' : 'FAIL', observed });
const logName = 'S02-detailed-rollout-plan-20261005.log';
const resultName = 'S02-detailed-rollout-plan-20261005.json';
const previous = JSON.parse(read('evidence/frontend-spacing-audit-20261005/verification.json'));
const protectedHashes = previous.protectedInputHashes;
const changesBefore = protectedHashes.filter(row => sha(row.file) !== row.sha256);
check('source-canonical-inputs-package-rules-ledgers-unchanged-from-baseline', changesBefore.length === 0, { files: protectedHashes.length, changes: changesBefore });
const plan = read('docs/FRONTEND_UI_IMPROVEMENT_PLAN.md');
const standard = read('docs/FRONTEND_SPACING_STANDARD.md');
const work = plan.split(/\r?\n/).filter(line => /^\| UI028\.W\d{2} \|/.test(line)).map(line => {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    return { id: cells[0], checkpoint: cells[1], dependencies: cells[2], scope: cells[3], acceptance: cells[4], status: cells[5] };
});
check('36-unique-sequential-work-items-not-implemented', work.length === 36 && work.every((row, index) => row.id === `UI028.W${String(index + 1).padStart(2, '0')}` && row.status === 'TODO' && row.scope && row.acceptance), { count: work.length, done: work.filter(row => row.status === 'DONE').length, statuses: [...new Set(work.map(row => row.status))] });
const checkpointCounts = Object.fromEntries(['C03', 'C04', 'C05'].map(id => [id, work.filter(row => row.checkpoint === id).length]));
check('work-items-map-to-existing-checkpoints', checkpointCounts.C03 === 25 && checkpointCounts.C04 === 7 && checkpointCounts.C05 === 4 && work.every(row => ['C03', 'C04', 'C05'].includes(row.checkpoint)), checkpointCounts);
const dependencyIssues = [];
let edges = 0;
for (let index = 0; index < work.length; index++) {
    const row = work[index];
    for (const match of row.dependencies.matchAll(/W(\d{2})(?:[–-]W(\d{2}))?/g)) {
        const start = Number(match[1]), end = Number(match[2] || match[1]);
        for (let number = start; number <= end; number++) {
            edges++;
            if (number < 1 || number >= index + 1) dependencyIssues.push({ id: row.id, dependency: number, reason: 'MISSING_OR_NOT_PREDECESSOR' });
        }
    }
}
check('work-dependencies-exist-and-are-acyclic-predecessors', dependencyIssues.length === 0, { edges, issues: dependencyIssues });
const routes = JSON.parse(read('botsales-kit/contracts/route-manifest.json')).routes;
const routeMap = JSON.parse(read('docs/route-implementation.json'));
const featureWork = work.slice(9, 25);
const coverage = featureWork.map(row => {
    const module = row.scope.match(/^([a-z]+):/)?.[1];
    const ids = [];
    for (const match of row.scope.matchAll(/R(\d{2})(?:[–-]R(\d{2}))?/g)) {
        for (let number = Number(match[1]); number <= Number(match[2] || match[1]); number++) ids.push(`R${String(number).padStart(2, '0')}`);
    }
    const canonicalIds = routes.filter(route => route.module === module).map(route => route.id).sort();
    const sources = [...new Set(ids.map(id => routeMap.find(item => item.routeId === id)?.source))];
    return { id: row.id, module, routes: ids, canonicalIds, matched: JSON.stringify([...ids].sort()) === JSON.stringify(canonicalIds), sources, sourceExists: sources.every(file => file && fs.existsSync(path.join(root, file))) };
});
const allIds = coverage.flatMap(row => row.routes);
check('all-16-modules-and-54-routes-have-exact-feature-work-owners', coverage.length === 16 && new Set(coverage.map(row => row.module)).size === 16 && allIds.length === 54 && new Set(allIds).size === 54 && coverage.every(row => row.matched && row.sourceExists), coverage);
const rules = [...standard.matchAll(/\*\*SPC-(\d{3})\s/g)].map(match => Number(match[1]));
check('standard-keeps-32-rules-and-adds-central-ownership', rules.length === 32 && rules.every((number, index) => number === index + 1) && standard.includes('**Phiên bản:** 1.1') && standard.includes('kể cả đúng scale') && standard.includes('apps/web/src/shared/ui/layout.ts'), { ruleCount: rules.length, version: '1.1', consumerLiterals: 'FORBIDDEN_TARGET_NOT_YET_ENFORCED' });
const uiRows = plan.split(/\r?\n/).filter(line => /^\| UI\d{3} \| P[012] \| (BC|TU) \|/.test(line)).map(line => {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    const [done, total] = cells[6].split('/').map(Number);
    return { id: cells[0], status: cells[5], done, total };
});
const ui028 = uiRows.find(row => row.id === 'UI028');
check('planning-does-not-inflate-ui-progress-or-create-new-parent-items', uiRows.length === 28 && uiRows.filter(row => row.status === 'DONE').length === 27 && uiRows.reduce((sum, row) => sum + row.done, 0) === 137 && uiRows.reduce((sum, row) => sum + row.total, 0) === 140 && ui028?.status === 'IN_PROGRESS' && ui028?.done === 2 && ui028?.total === 5, { tasks: uiRows.length, ui028, completed: 137, total: 140 });
const proposedFiles = ['apps/web/src/shared/ui/layout.ts', 'scripts/check-layout.mjs', 'scripts/layout-exceptions.json', 'tests/layout-checker.test.mjs', 'apps/web/tests/layout-components.test.tsx', 'tests/layout-spacing.spec.ts', 'playwright.built-demo.config.ts'];
const proposed = proposedFiles.map(file => ({ file, exists: fs.existsSync(path.join(root, file)), status: 'PLANNED_NEW_IMPLEMENTATION_OUTPUT' }));
check('new-runtime-checker-test-outputs-are-clearly-proposed', proposed.every(row => !row.exists) && plan.includes('mới dự kiến') && plan.includes('chưa tồn tại/chưa chạy'), proposed);
const currentBrowserConfig = read('playwright.config.ts');
check('built-demo-plan-distinguishes-current-dev-server-from-proposed-artifact-server', currentBrowserConfig.includes('--mode demo --host 127.0.0.1') && currentBrowserConfig.includes('reuseExistingServer') && plan.includes('config mặc định chạy Vite dev') && plan.includes('--config playwright.built-demo.config.ts') && plan.includes('xác minh `dist-demo` hash'), 'Current default dev server is identified; artifact config remains proposed, not implemented.');

const documents = ['docs/FRONTEND_SPACING_STANDARD.md', 'docs/CONTINUE_FRONTEND.md', 'docs/PROJECT_CONTEXT.md', 'evidence/REPORT.md'];
const sections = [['docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', plan.slice(plan.indexOf('## 14. UI028'))], ...documents.map(file => [file, file === 'evidence/REPORT.md' ? read(file).split('\n---')[0] : read(file)])];
const headings = content => content.split(/\r?\n/).filter(line => /^#{1,6} /.test(line)).map(line => line.replace(/^#{1,6} /, '').toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replace(/ /g, '-'));
let checkedLinks = 0;
const broken = [];
for (const [file, content] of sections) {
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1].replace(/^<|>$/g, '');
        if (/^(https?:|mailto:|app:|plugin:)/.test(target)) continue;
        const [local, fragment] = target.split('#');
        const absolute = local ? path.resolve(root, path.dirname(file), decodeURIComponent(local)) : path.join(root, file);
        checkedLinks++;
        if (absolute === path.join(directory, resultName)) continue;
        if (!fs.existsSync(absolute)) broken.push({ file, target, reason: 'FILE_MISSING' });
        else if (fragment && absolute.endsWith('.md') && !headings(fs.readFileSync(absolute, 'utf8')).includes(decodeURIComponent(fragment))) broken.push({ file, target, reason: 'ANCHOR_MISSING' });
    }
}
check('new-plan-and-control-document-local-links', broken.length === 0, { checkedLinks, broken });
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
run('scoped-plan-document-diff-check', 'git', ['diff', '--check', '--', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', ...documents]);
const changesAfter = protectedHashes.filter(row => sha(row.file) !== row.sha256);
check('verification-left-app-canonical-rules-ledgers-packages-unchanged', changesAfter.length === 0, { files: protectedHashes.length, changes: changesAfter });
const inputFiles = ['docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', ...documents, 'botsales-kit/contracts/route-manifest.json', 'docs/route-implementation.json', 'package.json', 'scripts/run-e2e.mjs', 'playwright.config.ts', path.relative(root, fileURLToPath(import.meta.url)).replaceAll('\\', '/')];
const result = {
    capturedAt: new Date().toISOString(), scope: 'UI028_DETAILED_IMPLEMENTATION_PLAN_ONLY',
    status: checks.every(row => row.status === 'PASS') ? 'PASS_PLAN_DOCUMENT_CHECKS' : 'FAIL_PLAN_DOCUMENT_CHECKS',
    owner: 'Codex', checkpoints: { C01: 'DONE_BASELINE', C02: 'DONE_SPECIFICATION_AND_DETAILED_PLAN', C03: 'TODO_IMPLEMENTATION', C04: 'NOT_RUN_VERIFICATION', C05: 'TODO_HANDOFF' },
    implementationWorkDone: 0, implementationWorkTotal: 36, checks, workItemCoverage: coverage, proposedFiles: proposed,
    inputHashes: inputFiles.map(file => ({ file, sha256: sha(file) })), protectedInputHashes: protectedHashes,
    feStatus, commandLog: logName,
    runtimeTests: 'NOT_RUN_DOCS_ONLY_NO_REACT_IMPLEMENTATION_CHANGES',
    limitations: ['Plan validation does not implement layout.ts, test:layout or checker/browser tests.', 'Generator freshness is checked via the existing Node script; no production build or E2E is claimed.', 'FE freshness remains a canonical read-only status; no FE/full-product ledger is mutated.', 'No Backend, hosted CI, screen-reader or owner acceptance is claimed.'],
};
fs.writeFileSync(path.join(directory, logName), commands.map(command => JSON.stringify(command, null, 2)).join('\n\n') + '\n');
fs.writeFileSync(path.join(directory, resultName), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, checks: checks.map(({ name, status }) => ({ name, status })), workItems: work.length, checkpointCounts, modules: coverage.length, routes: allIds.length, feStatus: feStatus ? { verified: feStatus.verifiedSteps, stale: feStatus.stale.length, blocked: feStatus.blocked.length } : null }, null, 2));
if (result.status !== 'PASS_PLAN_DOCUMENT_CHECKS') process.exitCode = 1;
