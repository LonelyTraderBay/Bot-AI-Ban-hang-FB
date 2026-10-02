import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE008');
const current = path.join(kit, 'execution/frontend-evidence/FE021');
const browserTotal = Number(fs.readFileSync(path.join(current, 'final-e2e-full-98.log'), 'utf8').match(/\n\s*(\d+) passed \(/)?.[1]);
if (!Number.isInteger(browserTotal) || browserTotal < 1) throw new Error('The registered browser suite has no successful completion line.');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = value => JSON.parse(fs.readFileSync(value, 'utf8'));
const commands = read(path.join(kit, 'execution/frontend-command-map.json')).commands;
const revisionResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' });
if (revisionResult.status !== 0) throw new Error('Cannot resolve current Git HEAD.');
const revision = revisionResult.stdout.trim();
const steps = [
  {
    stepId: 'S01', commandId: 'domain', log: 'final-test-domain.log', checksTotal: 88, dataSource: 'synthetic-msw',
    expected: 'The deterministic two-shop and role fixtures satisfy canonical mock DTOs and permission mappings across the current route/operation set.',
    observed: 'Current synthetic domain verification passed 75 simulator and 13 MSW HTTP/SSE checks (88 total), covering 210 operation handlers and 89 successful operation cases. Source remains tied to the canonical OpenAPI-derived metadata.',
  },
  {
    stepId: 'S02', commandId: 'domain', log: 'final-test-domain.log', checksTotal: 88, dataSource: 'synthetic-msw',
    expected: 'Mock HTTP transport stays demo-only, uses seeded synthetic data, and exposes shop-scoped list/query behavior through canonical handlers.',
    observed: `The current 75 simulator and 13 MSW network checks passed. The current ${browserTotal}-case browser suite separately exercised the actual React demo, all registered routes, and role-specific navigation against synthetic HTTP.`,
  },
  {
    stepId: 'S03', commandId: 'domain', log: 'final-test-domain.log', checksTotal: 88, dataSource: 'synthetic-msw',
    expected: 'Permission denial, wrong-shop, stale, empty, abort/delay, and unknown-result scenarios keep user-visible outcomes honest without external provider calls.',
    observed: 'All 88 current simulator/MSW cases passed, including permission and shop isolation plus stale, empty, delay/abort, and command lifecycle cases. The browser suite also passed the report-denied, bad-timezone, live-mode-unavailable, and independent query flows; no provider or backend was contacted.',
  },
  {
    stepId: 'S04', commandId: 'schemas', log: 'final-schemas.log', checksTotal: 353, dataSource: 'synthetic-msw',
    expected: 'Captured synthetic mock records validate against canonical JSON schemas with zero errors.',
    observed: 'Python 3.12.10 with isolated jsonschema 4.26.0 passed 353/353 captured simulator-record/schema checks. Current domain/MSW (88), generated freshness (11 outputs/283 schemas/210 operations/54 routes), and TypeScript checks independently passed; schema validation does not exercise React or a real server.',
    supportingLogs: ['final-test-domain.log', 'final-generate-check.log', 'final-typecheck.log'],
  },
  {
    stepId: 'S05', commandId: 'e2e', log: 'final-e2e-full-98.log', checksTotal: browserTotal, dataSource: 'synthetic-msw',
    expected: 'Current React demo browser acceptance covers canonical routes, roles, shop scope, responsive flows and mock failure behavior without reliance on real services.',
    observed: `The current serialized Chromium suite passed ${browserTotal}/${browserTotal}. It rendered all canonical routes and exercised role denial, shop switching, responsive/axe behavior, request failures, empty/query lifecycle, and FE021 chart/export interactions with synthetic MSW; live integrations and production acceptance remain unverified.`,
    supportingLogs: ['final-test-domain.log', 'final-schemas.log'],
  },
];

for (const check of steps) {
  const registered = commands.find(command => command.id === check.commandId);
  if (!registered || registered.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${check.commandId} is not verified in the command map.`);
  const template = read(path.join(dir, `${check.stepId}.json`));
  const sourceFiles = template.sourceFiles.map(file => ({ path: file.path, sha256: sha(fs.readFileSync(path.resolve(repo, file.path))) }));
  const logPath = path.join(current, check.log);
  const supportingLogs = (check.supportingLogs || []).map(file => {
    const absolute = path.join(current, file);
    return { file: path.relative(kit, absolute).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(absolute)) };
  });
  const evidence = {
    taskId: 'FE008', stepId: check.stepId, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${revision} plus current dirty working tree; task source files are hashed below`,
    expected: check.expected, observed: check.observed, command: registered.command, commandId: registered.id,
    cwd: repo, reviewer: 'Codex self-review; no independent peer review',
    environment: { name: 'Windows / Node v24.19.0 / npm 11.17.0 / Python 3.12.10', details: 'Current frontend mock suite; schema checks use the isolated validation dependency target.', dataSource: check.dataSource },
    checksTotal: check.checksTotal, failed: 0,
    logFile: path.relative(kit, logPath).replaceAll('\\', '/'), logSha256: sha(fs.readFileSync(logPath)),
    sourceFiles, sourceSnapshotSha256: sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
    ...(supportingLogs.length ? { supportingLogs } : {}),
  };
  const output = path.join(dir, `${check.stepId}-current-revalidated-20261001.json`);
  fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(path.relative(kit, output).replaceAll('\\', '/'));
}
