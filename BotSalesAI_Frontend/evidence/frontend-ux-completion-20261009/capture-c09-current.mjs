import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const evidenceDir = resolve(import.meta.dirname);
const frontendRoot = resolve(evidenceDir, '../..');
const repoRoot = resolve(frontendRoot, '..');
const paths = [
    'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/openapi.yaml',
    'botsales-kit/contracts/operation-index.json',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/migration-map.json',
    'botsales-kit/contracts/feature-catalog.json',
    'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/release.json',
    'botsales-kit/fixtures/acceptance-scenarios.json',
    'botsales-kit/docs/04_SCREENS_AND_FLOWS.md',
    'botsales-kit/docs/17_TRACEABILITY.md',
    'BotSalesAI_Frontend/packages/contracts/src/generated.ts',
    'BotSalesAI_Frontend/packages/contracts/src/operations.json',
    'BotSalesAI_Frontend/packages/contracts/src/schemas.json',
    'BotSalesAI_Frontend/packages/contracts/src/routes.json',
    'BotSalesAI_Frontend/apps/web/src/mocks/files.ts',
    'BotSalesAI_Frontend/apps/web/src/mocks/service.ts',
    'BotSalesAI_Frontend/apps/web/src/mocks/auxiliary.ts',
    'BotSalesAI_Frontend/apps/web/src/mocks/seed.json',
    'BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx',
    'BotSalesAI_Frontend/apps/web/tests/media-inbox.test.ts',
    'BotSalesAI_Frontend/tests/fe016.spec.ts',
    'BotSalesAI_Frontend/tests/fe016-source-map.test.mjs',
    'BotSalesAI_Frontend/tests/vertical-slices/generate-route-implementation.mjs',
    'BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-CONTRACT.md',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-generate-check-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-typecheck-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-lint-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-source-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-boundaries-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-unit-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-source-map-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-contracts-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-kit-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-diff-check-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/C09-e2e-final.log',
    'BotSalesAI_Frontend/evidence/frontend-ux-completion-20261009/capture-c09-current.mjs',
];
const files = paths.map(path => ({
    path,
    sha256: createHash('sha256').update(readFileSync(resolve(repoRoot, path))).digest('hex'),
}));
const aggregateSha256 = createHash('sha256').update(files.map(file => `${file.path}\0${file.sha256}`).join('\n')).digest('hex');
const openapi = JSON.parse(readFileSync(resolve(repoRoot, 'botsales-kit/contracts/openapi.json'), 'utf8'));
const plan = readFileSync(resolve(frontendRoot, 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md'), 'utf8');
const gates = paths.filter(path => path.endsWith('.log')).map(path => {
    const content = readFileSync(resolve(repoRoot, path), 'utf8');
    const exit = content.match(/EXIT_CODE=(\d+)/)?.[1];
    return { path, exitCode: exit === undefined ? null : Number(exit) };
});
const record = {
    capturedAt: new Date().toISOString(),
    scope: 'C09 Media Inbox contract, generated API, MSW, React composer, regression and scoped evidence; full-project state remains dirty and preserved',
    gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
    apiVersion: openapi.info.version,
    planStatus: plan.match(/^\| UX\.C09[^\n]*/m)?.[0] ?? null,
    gates,
    aggregateSha256,
    files,
};
const output = resolve(evidenceDir, 'C09-current-source-20261009.json');
writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ output: relative(repoRoot, output), fileCount: files.length, ...record }, null, 2));
