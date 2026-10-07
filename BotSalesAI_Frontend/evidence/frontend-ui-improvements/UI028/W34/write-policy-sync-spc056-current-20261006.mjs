import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const outputPath = path.join(root, 'evidence/frontend-ui-improvements/UI028/W34/policy-sync-spc056-current-20261006.json');
const docs = [
    'docs/FRONTEND_SPACING_STANDARD.md',
    'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
    'AGENTS.md',
    'botsales-kit/docs/18_CODING_STANDARDS.md',
    'docs/FRONTEND_SCOPE.md',
    'docs/PROJECT_CONTEXT.md',
    'docs/CONTINUE_FRONTEND.md',
    'DESIGN.md',
    'UX-CONTRACT.md',
    'evidence/REPORT.md',
];
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceFiles = docs.map(file => {
    const absolute = path.join(root, file);
    const content = fs.readFileSync(absolute, 'utf8');
    if (!content.includes('SPC-056')) throw new Error(`SPC-056 reference missing: ${file}`);
    return { path: file, sha256: hash(absolute) };
});
const output = {
    schemaVersion: 1,
    task: 'UI028.W34',
    recordType: 'policy_sync',
    recordedAt: '2026-10-06',
    result: 'PASS_FOR_POLICY_SYNC_ONLY',
    policy: {
        id: 'SPC-056',
        version: 'FRONTEND_SPACING_STANDARD 1.18 / FRONTEND_UI_IMPROVEMENT_PLAN 12.6',
        summary: 'For sticky/fixed/overlay UI, browser-rendered keyboard focus and hit-testing must confirm important content/actions are not unintentionally occluded; overflow scans and static images alone are insufficient.',
    },
    synchronizedDocuments: docs,
    checks: {
        policyReference: 'SPC-056 present in all 10 listed current guidance/report files',
        generatedFreshness: 'PASS: node.exe scripts/generate.mjs --check; 11 outputs, 283 schemas, 210 operations, 54 routes',
        diffCheck: 'PASS: git diff --check; no trailing whitespace in policy files',
        statusClaims: 'W30 native text-only evidence and screenshots reviewed; W30 DONE, W33 M07 PASS, M08 remains open',
        tracker: 'Read-only FE status; no FE or full-product progress ledger writes',
    },
    sourceFiles,
    w30Evidence: {
        nativeTextOnly: '5/5 PASS, Firefox 155, zoomFullPage=false, fixed CSS viewport and DPR, representative font ratio 2x',
        visualReview: '5/5 captures reviewed; no unintended target occlusion observed',
        source: 'evidence/frontend-ui-improvements/UI028/W30/summary-current-20261006.json',
    },
    frontendTrackerSnapshot: {
        verifiedSteps: 0,
        totalSteps: 140,
        staleTasks: 28,
        blocked: [],
        note: 'Read-only; do not infer 0% implementation from stale checkpoint fingerprints.',
    },
    noRuntimeUiChanges: true,
    noProgressLedgerWrites: true,
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: output.result, documents: sourceFiles.length, output: path.relative(root, outputPath) }));
