import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const output = import.meta.dirname, frontend = path.resolve(output, '../..'), repository = path.dirname(frontend);
const baseline = JSON.parse(fs.readFileSync(path.join(output, 'baseline.json'), 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const allowed = ['apps/web/src/app/Shell.tsx', 'apps/web/src/modules/catalog/index.tsx', 'apps/web/src/modules/inventory/index.tsx', 'apps/web/src/shared/ui/components.tsx', 'apps/web/src/shared/ui/README.md', 'apps/web/tests/shared-ui-render-contract.test.tsx', 'tests/ui-shell-layout.spec.ts'];
const changedInputs = Object.entries(baseline.sourceFingerprints).filter(([file, hash]) => !fs.existsSync(path.join(frontend, file)) || sha(path.join(frontend, file)) !== hash).map(([file]) => file);
const unexpectedChanges = changedInputs.filter(file => !allowed.includes(file));
const originalPaths = baseline.gitStatus.trimEnd().split('\n').map(line => {
    const value = line.slice(3).split(' -> ').at(-1);
    return value.startsWith('"') ? JSON.parse(value) : value;
});
const missing = originalPaths.filter(file => !fs.existsSync(path.join(repository, file)));
const protectedPaths = ['botsales-kit/execution/plan.json', 'botsales-kit/execution/progress.json', 'botsales-kit/execution/tasks'];
function git(args) {
    const result = spawnSync('git', args, { cwd: repository, encoding: 'utf8', windowsHide: true });
    return { args, exitCode: result.status ?? 1, output: (result.stdout || '') + (result.stderr || '') };
}
const gitDiffCheck = git(['diff', '--check']);
const fullProductGitCheck = git(['diff', '--quiet', 'HEAD', '--', ...protectedPaths]);
const beforeProtectedDirty = originalPaths.filter(file => protectedPaths.some(prefix => file === prefix || file.startsWith(prefix + '/')));
const currentStatus = git(['status', '--porcelain']);
const baselineCopies = ['apps/web/src/app/Shell.tsx', 'apps/web/src/modules/catalog/index.tsx', 'apps/web/src/modules/inventory/index.tsx', 'apps/web/src/shared/ui/components.tsx', 'apps/web/src/shared/ui/README.md'];
for (const file of baselineCopies) {
    if (sha(path.join(output, 'source-before', file)) !== baseline.sourceFingerprints[file]) throw new Error('Changed source-before copy: ' + file);
}
const record = { checkedAt: new Date().toISOString(), scope: 'New Toolbar/Shell hunks against the preserved working tree; original staged/unstaged/untracked work is not replaced.',
    baselineHead: baseline.HEAD, baselineInputCount: Object.keys(baseline.sourceFingerprints).length,
    changedInputs, allowed, unexpectedChanges, originalTrackedChanges: baseline.gitStatus.split('\n').filter(line => line && !line.startsWith('??')).length,
    originalPaths: originalPaths.length, originalPathsMissing: missing, beforeProtectedDirty,
    gitDiffCheck, fullProductGitCheck, currentStatus: { exitCode: currentStatus.exitCode, entries: currentStatus.output.trimEnd().split('\n').length },
    baselineCopies: baselineCopies.map(file => ({ path: file, sha256: sha(path.join(output, 'source-before', file)) })),
    limits: 'Does not claim unrelated pre-existing changes are authored by this batch; no commit, staging, reset, clean or push was performed.' };
fs.writeFileSync(path.join(output, 'diff-review-current.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record));
if (unexpectedChanges.length || missing.length || beforeProtectedDirty.length || gitDiffCheck.exitCode || fullProductGitCheck.exitCode || currentStatus.exitCode) process.exitCode = 1;
