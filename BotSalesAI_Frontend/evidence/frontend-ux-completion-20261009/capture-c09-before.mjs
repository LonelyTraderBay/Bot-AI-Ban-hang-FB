import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const workspace = resolve(root, '..');
const evidence = resolve(root, 'evidence/frontend-ux-completion-20261009');
const paths = [
  'botsales-kit/contracts/openapi.json',
  'BotSalesAI_Frontend/packages/contracts/src/generated.ts',
  'BotSalesAI_Frontend/packages/contracts/src/operations.json',
  'BotSalesAI_Frontend/apps/web/src/mocks/files.ts',
  'BotSalesAI_Frontend/apps/web/src/mocks/service.ts',
  'BotSalesAI_Frontend/apps/web/src/mocks/auxiliary.ts',
  'BotSalesAI_Frontend/apps/web/src/mocks/seed.json',
  'BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx',
  'BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx',
  'BotSalesAI_Frontend/tests/fe016.spec.ts',
  'BotSalesAI_Frontend/tests/fe016-source-map.test.mjs',
  'BotSalesAI_Frontend/tests/vertical-slices/generate-route-implementation.mjs',
  'BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
];
const files = paths.map(path => {
  const content = readFileSync(resolve(workspace, path));
  return { path, sha256: createHash('sha256').update(content).digest('hex') };
});
const aggregate = createHash('sha256').update(files.map(file => `${file.path}\0${file.sha256}`).join('\n')).digest('hex');
const openapi = JSON.parse(readFileSync(resolve(workspace, paths[0]), 'utf8'));
const plan = readFileSync(resolve(root, 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md'), 'utf8');
const record = {
  capturedAt: new Date().toISOString(),
  gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspace, encoding: 'utf8' }).trim(),
  apiVersion: openapi.info.version,
  planStatus: plan.match(/\| UX\.C09[^\n]+/)?.[0] ?? null,
  aggregateSha256: aggregate,
  files,
};
const output = resolve(evidence, 'C09-before-source-20261009.json');
writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ output: relative(workspace, output), ...record }, null, 2));
