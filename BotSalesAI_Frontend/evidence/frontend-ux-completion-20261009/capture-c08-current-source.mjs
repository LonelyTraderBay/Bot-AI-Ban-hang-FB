import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(evidenceDir, '../../..');
const paths = [
    'BotSalesAI_Frontend/apps/web/src/mocks/procurement.ts',
    'BotSalesAI_Frontend/apps/web/src/mocks/service.ts',
    'BotSalesAI_Frontend/apps/web/src/mocks/seed.json',
    'BotSalesAI_Frontend/apps/web/src/mocks/collections.json',
    'BotSalesAI_Frontend/apps/web/src/modules/operations/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/procurement/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/shared/api/event-invalidation.ts',
    'BotSalesAI_Frontend/apps/web/tests/purchase-delegation.test.ts',
    'BotSalesAI_Frontend/apps/web/tests/scope-events.test.tsx',
    'BotSalesAI_Frontend/tests/fe014.spec.ts',
    'BotSalesAI_Frontend/packages/contracts/src/generated.ts',
    'BotSalesAI_Frontend/packages/contracts/src/operations.json',
    'BotSalesAI_Frontend/packages/contracts/src/permissions.json',
    'BotSalesAI_Frontend/packages/contracts/src/routes.json',
    'BotSalesAI_Frontend/packages/contracts/src/schemas.json',
    'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/openapi.yaml',
    'botsales-kit/contracts/operation-index.json',
    'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/contracts/events.schema.json',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/feature-catalog.json',
    'botsales-kit/fixtures/acceptance-scenarios.json',
    'botsales-kit/docs/04_SCREENS_AND_FLOWS.md',
    'botsales-kit/docs/17_TRACEABILITY.md',
    'botsales-kit/scripts/generate-reference.py',
];
const files = paths.map(file => ({
    path: file,
    sha256: createHash('sha256').update(readFileSync(path.join(repoRoot, file))).digest('hex'),
}));
const sourceSnapshotSha256 = createHash('sha256').update(JSON.stringify(files)).digest('hex');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const report = {
    capturedAt: new Date().toISOString(),
    scope: 'C08 delegation source, generated API surface, regression tests and canonical references; dirty baseline preserved',
    head,
    files,
    sourceSnapshotSha256,
};
const output = path.join(evidenceDir, 'C08-current-source-20261009.json');
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: 'PASS', files: files.length, head, sourceSnapshotSha256, output }));
