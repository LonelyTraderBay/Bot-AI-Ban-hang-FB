import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(here, '../../..');
const frontend = path.join(repository, 'BotSalesAI_Frontend');
const manifest = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePaths = [
    'apps/web/src/modules/dashboard/index.tsx', 'apps/web/src/shared/ui/components.tsx',
    'apps/web/src/shared/ui/composition.tsx', 'apps/web/src/shared/ui/README.md',
    'docs/FRONTEND_SPACING_STANDARD.md', 'scripts/check-ui-composition.mjs',
    'tests/ui-dashboard-layout.spec.ts', 'tests/ui-composition-checker.test.mjs', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'evidence/REPORT.md',
    'evidence/overview-consistency-20261019/refresh-s17.mjs',
];
const current = Object.fromEntries(await Promise.all(sourcePaths.map(async file => [
    `BotSalesAI_Frontend/${file}`, hash(await readFile(path.join(frontend, file))),
])));
const raw = await readFile(manifest, 'utf8');
const evidence = JSON.parse(raw);
for (const [file, expected] of Object.entries(evidence.sourceFingerprints)) {
    if (!Object.hasOwn(current, file))
        assert.equal(hash(await readFile(path.join(repository, file))), expected, `Unrelated stale fingerprint: ${file}`);
}
const clean = text => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
async function record(id, file, expected, patterns, inputs) {
    const bytes = await readFile(path.join(here, file));
    const log = clean(bytes.toString('utf8'));
    assert.equal((await readFile(path.join(here, `${file}.exit`), 'utf8')).trim(), '0', file);
    const header = log.split(/\r?\n/).find(line => line.startsWith('OVERVIEW_SOURCES_SHA256='));
    assert.ok(header, `${file} must identify its source.`);
    const captured = JSON.parse(header.slice('OVERVIEW_SOURCES_SHA256='.length));
    for (const input of inputs)
        assert.equal(captured[input], current[`BotSalesAI_Frontend/${input}`], `${file} has stale ${input}`);
    for (const pattern of patterns) assert.match(log, pattern, file);
    const check = { id, command: log.split(/\r?\n/).filter(line => line.startsWith('COMMAND=')).join('\n'),
        exitCode: 0, result: 'PASS', expected, observed: expected,
        log: { path: `BotSalesAI_Frontend/evidence/overview-consistency-20261019/${file}`, sha256: hash(bytes) } };
    const old = evidence.checks.find(item => item.id === id);
    if (old) Object.assign(old, check); else evidence.checks.push(check);
    const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const previous = evidence.coverage.find(item => item.name === id);
    if (previous) Object.assign(previous, coverage); else evidence.coverage.push(coverage);
}
const runtime = sourcePaths.slice(0, 3);
await record('overview-20261019-source', 'source.log',
    'TypeScript, 42 Node shared API/composition regressions and strict layout/visual/composition audits pass.',
    [/tests 42/, /pass 42/, /fail 0/, /layout-check PASS/, /visual-token-check PASS/, /ui-composition PASS/],
    [...runtime, 'apps/web/src/shared/ui/README.md', 'docs/FRONTEND_SPACING_STANDARD.md', 'scripts/check-ui-composition.mjs', 'tests/ui-composition-checker.test.mjs']);
await record('overview-20261019-dashboard', 'dashboard.log',
    '14 Chromium/Firefox cases pass: five breakpoint surface geometry, copy success/rejection/navigation, permission tuples and seven affected standalone metric routes at two widths.',
    [/14 passed/, /COMMAND_EXIT=0/], [...runtime, 'tests/ui-dashboard-layout.spec.ts']);
await record('overview-20261019-shared', 'shared.log',
    '26 Chromium/Firefox existing shared component, finance layout and draft/dialog regression cases pass.',
    [/26 passed/, /COMMAND_EXIT=0/], runtime.slice(1));
if (process.argv.includes('--finalize')) await record('overview-20261019-verify', 'verify.log',
    'Full local npm run verify passes, including 252 Vitest cases, generated contracts, source/type/build, UI policy and S17 evidence validation.',
    [/252 passed/, /ui-evidence PASS: S17;/, /status=COMPLETE/], runtime);
Object.assign(evidence.sourceFingerprints, current);
evidence.recordedAt = new Date().toISOString();
const clause = 'Overview consistency 20261019: local MSW evidence covers nested KPI insets, canonical card/control radii, aligned metric slots, responsive finance content and single order IDs with clipboard success/rejection; source and targeted Chromium/Firefox regressions cover affected shared consumers. Native browser zoom/text-only resizing and screen-reader runs were NOT_RUN; backend/provider/production and human acceptance are not claimed.';
const earlierClause = clause.replace('Native browser zoom/text-only resizing and screen-reader runs were NOT_RUN;', 'Native zoom/speech were NOT_RUN;');
evidence.scope = evidence.scope.replace(earlierClause, '').trim();
if (!evidence.scope.includes(clause)) evidence.scope += ' ' + clause;
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(manifest, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline, 'utf8');
console.log(JSON.stringify({ phase: process.argv.includes('--finalize') ? 'finalize' : 'preverify',
    checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }, null, 2));
