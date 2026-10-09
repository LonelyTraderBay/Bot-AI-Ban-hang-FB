import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const output = import.meta.dirname, repository = path.resolve(output, '../../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const baseline = read(path.join(output, 'baseline.json'));
const allowed = [
    'apps/web/src/modules/integrations/index.tsx', 'apps/web/src/modules/workspace/index.tsx',
    'apps/web/src/modules/catalog/imports.tsx', 'apps/web/src/modules/fulfillment/index.tsx',
    'apps/web/src/modules/notifications/index.tsx', 'apps/web/src/shared/ui/components.tsx',
    'apps/web/src/shared/ui/README.md', 'apps/web/tests/shared-ui-render-contract.test.tsx',
    'tests/ui-finance-layout.spec.ts', 'docs/FRONTEND_SPACING_STANDARD.md',
    'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'docs/PROJECT_CONTEXT.md',
    'docs/CONTINUE_FRONTEND.md', 'docs/KNOWN_GAPS.md',
    'docs/route-implementation.json', 'docs/route-state-role-matrix.json',
].map(file => 'BotSalesAI_Frontend/' + file);
const changedInputs = Object.entries(baseline.sourceFingerprints).filter(([file, digest]) => !fs.existsSync(path.join(repository, file)) || hash(path.join(repository, file)) !== digest).map(([file]) => file);
const unexpectedChanges = changedInputs.filter(file => !allowed.includes(file));
const originalPathsMissing = baseline.originalPaths.filter(file => !fs.existsSync(path.join(repository, file)));
const protectedDrift = Object.entries(baseline.protectedFingerprints).filter(([file, digest]) => !fs.existsSync(path.join(repository, file)) || hash(path.join(repository, file)) !== digest).map(([file]) => file);
const git = args => { const result = spawnSync('git', args, {cwd: repository, encoding: 'utf8', windowsHide: true}); return {args, exitCode: result.status ?? 1, output: (result.stdout || '') + (result.stderr || '')}; };
const gitDiffCheck = git(['diff', '--check']);
const fullProductGitCheck = git(['diff', '--quiet', 'HEAD', '--', 'botsales-kit/execution/plan.json', 'botsales-kit/execution/progress.json', 'botsales-kit/execution/tasks']);
const record = {
    checkedAt: new Date().toISOString(), baselineHead: baseline.HEAD,
    scope: 'WIDTH task delta versus the preserved dirty checkout; prior F01–F09/Toolbar/A01–A07 changes are not replaced or claimed as new.',
    changedInputs, allowed, unexpectedChanges, originalPaths: baseline.originalPaths.length,
    originalPathsMissing, protectedDrift, gitDiffCheck, fullProductGitCheck,
    newRegression: 'BotSalesAI_Frontend/tests/ui-width-layout.spec.ts',
    testCorrection: 'Finance assertions now measure the atomic DetailLine wrapper and its inner row separately; header16px/row12px/body16–24px/divider count remain asserted.',
    additionalOwnerOutputs: ['Frontend README/current evidence entrypoint', 'S17 manifest from actual gate logs', 'canonical FE command/ledger/generated reports', 'current route/state log references'],
    limits: 'No reset, clean, stage, commit, push or deletion. Owner outputs are generated from actual records, not completion percentages entered by hand. Historical artifacts modified by full runners are captured separately and original bytes restored.',
};
fs.writeFileSync(path.join(output, 'diff-review-current.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({changedInputs, unexpectedChanges, originalPaths: record.originalPaths, originalPathsMissing, protectedDrift, gitDiffCheck: gitDiffCheck.exitCode, fullProductGitCheck: fullProductGitCheck.exitCode}));
if (unexpectedChanges.length || originalPathsMissing.length || protectedDrift.length || gitDiffCheck.exitCode || fullProductGitCheck.exitCode) process.exitCode = 1;
