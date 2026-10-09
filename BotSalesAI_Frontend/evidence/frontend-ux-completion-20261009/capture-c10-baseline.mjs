import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const evidenceDir = resolve(import.meta.dirname);
const frontendRoot = resolve(evidenceDir, '../..');
const repoRoot = resolve(frontendRoot, '..');
const owners = [
    'BotSalesAI_Frontend/apps/web/src/modules/bot/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/catalog/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/finance/management.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/fulfillment/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/inventory/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/inventory/warehouses.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/operations/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/orders/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/procurement/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/reports/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/shared/model/format.ts',
    'BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx',
    'BotSalesAI_Frontend/apps/web/src/mocks/marketing-fixture.ts',
    'BotSalesAI_Frontend/apps/web/src/mocks/service.ts',
    'BotSalesAI_Frontend/apps/web/tests/components.test.tsx',
    'BotSalesAI_Frontend/apps/web/tests/format.test.ts',
    'BotSalesAI_Frontend/apps/web/tests/fe021-source-map.test.ts',
    'BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
    'BotSalesAI_Frontend/evidence/frontend-ux-review-20261009/FINDINGS.md',
    'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/openapi.yaml',
    'botsales-kit/contracts/operation-index.json',
    'botsales-kit/contracts/migration-map.json',
    'botsales-kit/contracts/feature-catalog.json',
    'botsales-kit/fixtures/acceptance-scenarios.json',
    'BotSalesAI_Frontend/packages/contracts/src/generated.ts',
    'BotSalesAI_Frontend/packages/contracts/src/operations.json',
    'BotSalesAI_Frontend/packages/contracts/src/schemas.json',
];
const files = owners.map(path => ({
    path,
    sha256: createHash('sha256').update(readFileSync(resolve(repoRoot, path))).digest('hex'),
}));
const aggregateSha256 = createHash('sha256').update(files.map(file => `${file.path}\0${file.sha256}`).join('\n')).digest('hex');
const openapi = JSON.parse(readFileSync(resolve(repoRoot, 'botsales-kit/contracts/openapi.json'), 'utf8'));
const plan = readFileSync(resolve(frontendRoot, 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md'), 'utf8');
const status = execFileSync('git', ['status', '--short', '--', ...owners], { cwd: repoRoot, encoding: 'utf8' });
const record = {
    capturedAt: new Date().toISOString(),
    scope: 'C10 Marketing + UX08/09/11/12/13/14 pre-source baseline; preserves all pre-existing source changes',
    gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
    apiVersion: openapi.info.version,
    planStatus: plan.match(/^\| UX\.C10[^\n]*/m)?.[0] ?? null,
    preExistingDirtyOwners: status.trim().split(/\r?\n/u).filter(Boolean),
    aggregateSha256,
    files,
    measuredPriorEvidence: {
        ux08: 'FINDINGS.md: R38 approval table y637 and R42 shipment table y775 at 1280x720; explanatory sample panels precede primary queues.',
        marketing: 'Current source calls getMarketingSummary without query; UI says date filtering cannot be done in frontend; fixture returns fixed aggregate payload.',
        ux11: 'Shared Pager exposes only Đầu danh sách and Trang tiếp; no visited-cursor history.',
        ux12: 'Audit identifies early validation in notification settings, free-text timezone, locale ambiguity and blank all-values filters.',
        ux13: 'Audit identifies missing action-specific confirmed-save feedback in category and member editors.',
        ux14: 'DataTable generic empty defaults and task-specific missing-job/list first-use states lack actionable distinctions.',
    },
};
const output = resolve(evidenceDir, 'C10-before-source-20261009.json');
writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ output: relative(repoRoot, output), fileCount: files.length, aggregateSha256, gitHead: record.gitHead, apiVersion: record.apiVersion, planStatus: record.planStatus, dirtyOwnerCount: record.preExistingDirtyOwners.length }, null, 2));
