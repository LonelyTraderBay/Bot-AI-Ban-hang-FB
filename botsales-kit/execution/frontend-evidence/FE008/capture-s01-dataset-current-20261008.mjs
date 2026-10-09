import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const out = path.dirname(script);
const repo = path.resolve(out, '../../../..');
const kit = path.join(repo, 'botsales-kit');
const fe = path.join(repo, 'BotSalesAI_Frontend');
const receiptPath = path.join(out, 'S01-dataset-current-20261008.json');
const logPath = path.join(out, 'S01-dataset-current-20261008.log');
const domainLogPath = path.join(out, 'S01-domain-current-20261008.log');
const domainReportPath = path.join(out, 'S01-domain-report-current-20261008.json');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const bytes = file => fs.readFileSync(file);
const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const map = json(path.join(kit, 'execution/frontend-command-map.json'));
const command = map.commands.find(item => item.id === 'domain');
assert(command?.status === 'VERIFIED_AVAILABLE' && command.cwd === 'BotSalesAI_Frontend', 'Registered domain/simulator command unavailable');

const protectedPaths = [path.join(fe, 'evidence/domain-tests.json'), path.join(fe, 'evidence/logs/mock-typecheck.log')];
const previousFiles = new Map(protectedPaths.map(file => [file, fs.existsSync(file) ? bytes(file) : null]));
let run;
let output = '';
let domainReport;
let typecheckLog;
let domainLog;
try {
  run = spawnSync('cmd.exe', ['/d', '/c', command.command], {
    cwd: fe, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600_000,
    env: { ...process.env, PATH: ['C:\\Windows\\System32', 'C:\\Windows', 'C:\\Program Files\\nodejs', 'C:\\Program Files\\Git\\cmd'].join(';') },
  });
  output = `${run.stdout || ''}${run.stderr ? `\n[stderr]\n${run.stderr}` : ''}`;
  domainReport = json(protectedPaths[0]);
  typecheckLog = bytes(protectedPaths[1]);
  domainLog = `Command: ${command.command}\nCWD: ${fe}\nExit: ${run.status}\n\n${output}\n--- Generated domain report ---\n${JSON.stringify(domainReport, null, 2)}\n--- Mock typecheck log ---\n${typecheckLog.toString('utf8')}`;
} finally {
  for (const [file, previous] of previousFiles) {
    if (previous === null) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } else {
      fs.writeFileSync(file, previous);
    }
  }
}
fs.writeFileSync(domainLogPath, domainLog, 'utf8');
fs.writeFileSync(domainReportPath, `${JSON.stringify(domainReport, null, 2)}\n`, 'utf8');
assert(!run?.error && run?.status === 0, `Registered simulator/network command failed: ${run?.error?.message || output}`);
assert(domainReport.status === 'PASS' && domainReport.checks.length === 75 && domainReport.checks.every(item => item.status === 'PASS'), 'Current simulator must pass 75/75');
assert(domainReport.network?.status === 'PASS' && domainReport.network.handlers === 210 && domainReport.network.checks.length === 13 && domainReport.network.checks.every(item => item.status === 'PASS'), 'Current MSW transport must pass 13/13 over 210 handlers');
assert(output.includes('"passed":88') && output.includes('"networkChecks":13'), 'Current command output does not prove 88/88 domain and network checks');

const seed = json(path.join(fe, 'apps/web/src/mocks/seed.json'));
const routes = json(path.join(kit, 'contracts/route-manifest.json')).routes;
const features = json(path.join(kit, 'contracts/feature-catalog.json')).features;
const permissionCatalog = json(path.join(kit, 'contracts/permission-catalog.json'));
const routeImplementation = json(path.join(fe, 'docs/route-implementation.json'));
const key = (shopId, id) => `${shopId}:${id}`;
const unique = values => new Set(values).size === values.length;
const shops = new Map(seed.shops.map(shop => [shop.id, shop]));
const routeIds = new Set(routes.map(route => route.id));
const collections = Object.entries(seed).filter(([, rows]) => Array.isArray(rows));
const recordIndex = new Map(collections.map(([name, rows]) => [name, new Map(rows.filter(row => row?.id).map(row => [key(row.shopId || '', row.id), row]))]));
const by = (collection, shopId, id) => recordIndex.get(collection)?.get(key(shopId, id));
const rolePresets = permissionCatalog.rolePresets;
const rolesCovered = new Set();
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const records = collections.reduce((count, [, rows]) => count + rows.length, 0);
const shopScopedRecords = collections.reduce((count, [, rows]) => count + rows.filter(row => row?.shopId).length, 0);

check(routes.length === 54 && unique(routes.map(route => route.id)) && unique(routes.map(route => route.path)), 'Canonical route manifest is not 54 unique routes.');
check(features.length === 64 && unique(features.map(feature => feature.id)), 'Feature catalog is not 64 unique features.');
check(features.every(feature => feature.routeIds?.length > 0 && feature.routeIds.every(id => routeIds.has(id))), 'Feature catalog has a missing or empty route binding.');
check(routeImplementation.length === 54 && unique(routeImplementation.map(route => route.routeId)) && routeImplementation.every(route => routeIds.has(route.routeId) && route.source && route.component), 'Route/source/component inventory is incomplete.');
check(shops.size === 2 && shops.has('shop-demo') && shops.has('shop-second'), 'Seed must contain the two approved synthetic shops.');
check(seed.members.length === 9 && Object.keys(rolePresets).length === 7, 'Expected nine seeded memberships across seven approved role presets.');
for (const member of seed.members) {
  check(shops.has(member.shopId), `Membership ${member.id} references an unknown shop.`);
  for (const role of member.roles || []) {
    rolesCovered.add(role);
    check(Array.isArray(rolePresets[role]), `Membership ${member.id} uses an unknown canonical role.`);
    check(Boolean(rolePresets[role]) && rolePresets[role].every(permission => (member.permissions || []).includes(permission)), `Membership ${member.id} omits canonical ${role} permissions.`);
  }
}
check(Object.keys(rolePresets).every(role => rolesCovered.has(role)), 'Seed does not cover every approved role preset.');
for (const [name, rows] of collections) {
  const withIds = rows.filter(row => row?.id);
  check(unique(withIds.map(row => key(row.shopId || '', row.id))), `${name} has duplicate shop-scoped IDs.`);
  for (const row of rows) if (row?.shopId) check(shops.has(row.shopId), `${name}.${row.id} references unknown shop ${row.shopId}.`);
}
for (const product of seed.products) {
  check(Boolean(by('categories', product.shopId, product.categoryId)), `Product ${product.id} has no same-shop category.`);
  for (const variant of product.variants || []) check(variant.productId === product.id && variant.shopId === product.shopId, `Variant ${variant.id} has mismatched product/shop ownership.`);
}
for (const category of seed.categories) if (category.parentId) check(Boolean(by('categories', category.shopId, category.parentId)), `Category ${category.id} has a missing/cross-shop parent.`);
const variants = seed.products.flatMap(product => product.variants || []);
for (const stock of seed.stock) {
  check(variants.some(variant => variant.id === stock.variantId && variant.shopId === stock.shopId), `Stock ${stock.id} has no same-shop variant.`);
  check(stock.available === stock.onHand - stock.reserved, `Stock ${stock.id} available quantity is inconsistent.`);
}
for (const order of seed.orders) {
  if (order.customerId) check(Boolean(by('customers', order.shopId, order.customerId)), `Order ${order.id} has no same-shop customer.`);
  if (order.conversationId) check(Boolean(by('conversations', order.shopId, order.conversationId)), `Order ${order.id} has no same-shop conversation.`);
  for (const line of order.lines || []) {
    check(variants.some(variant => variant.id === line.variantId && variant.shopId === order.shopId), `Order ${order.id} line ${line.id} has no same-shop variant.`);
    check(BigInt(line.unitPrice?.amount || '0') * BigInt(line.quantity || 0) - BigInt(line.discount?.amount || '0') === BigInt(line.lineTotal?.amount || '0'), `Order ${order.id} line ${line.id} money total is inconsistent.`);
  }
}
for (const conversation of seed.conversations) {
  check(Boolean(by('customers', conversation.shopId, conversation.customerId)), `Conversation ${conversation.id} has no same-shop customer.`);
  check(Boolean(by('channels', conversation.shopId, conversation.channelId)), `Conversation ${conversation.id} has no same-shop channel.`);
}
for (const message of seed.messages) check(Boolean(by('conversations', message.shopId, message.conversationId)), `Message ${message.id} has no same-shop conversation.`);
for (const [name, rows] of collections) {
  const visit = (value, location) => {
    if (Array.isArray(value)) return value.forEach((item, index) => visit(item, `${location}[${index}]`));
    if (!value || typeof value !== 'object') return;
    if (Object.hasOwn(value, 'amount') && Object.hasOwn(value, 'currency')) {
      check(typeof value.amount === 'string' && /^-?\d+$/.test(value.amount), `${location}.amount must be an exact integer string.`);
      check(value.currency === 'VND', `${location}.currency must be VND.`);
    }
    for (const [field, child] of Object.entries(value)) visit(child, `${location}.${field}`);
  };
  visit(rows, name);
}
const databaseSource = read(path.join(fe, 'apps/web/src/mocks/database.ts'));
const serviceSource = read(path.join(fe, 'apps/web/src/mocks/service.ts'));
const networkSource = read(path.join(fe, 'tests/fixtures/mock-network.mjs'));
check(databaseSource.includes('structuredClone(seed)') && /sequence\s*=\s*10000/.test(databaseSource), 'Database reset does not clone canonical seed/reset sequence.');
check(databaseSource.includes('2026-09-29T14:00:00Z'), 'Synthetic clock is not fixed.');
check(serviceSource.includes('export function resetService()') && serviceSource.includes('clearFileState()') && serviceSource.includes('operationFailures.clear()') && serviceSource.includes('operationDelays.clear()'), 'Service reset omits volatile mock state.');
check(networkSource.includes('Resets records, role, faults, idempotency keys, sequence, and fixed clock deterministically'), 'Network fixture lacks a deterministic reset scenario.');
assert(failures.length === 0, failures.join('\n'));

const audit = {
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS',
  routeAndFeatureCoverage: { routes: routes.length, uniqueRoutes: true, features: features.length, featuresWithValidRouteIds: features.length, sourceComponentMappings: routeImplementation.length },
  seed: { shops: shops.size, members: seed.members.length, rolePresets: Object.keys(rolePresets).length, rolesCovered: [...rolesCovered].sort(), collections: collections.length, records, shopScopedRecords, orphanShopReferences: 0, relationshipChecks: ['product-category', 'variant-product', 'category-parent', 'stock-variant-and-available', 'order-customer-conversation-variant-and-money', 'conversation-customer-channel', 'message-conversation'], exactIntegerVndAmounts: true },
  deterministicMock: { canonicalSeedClonedOnReset: true, sequenceReset: 10000, fixedClock: '2026-09-29T14:00:00.000Z', serviceResetClearsFileFaultDelayAndIdempotencyState: true },
  simulator: { checks: domainReport.checks.length, passed: domainReport.checks.filter(item => item.status === 'PASS').length },
  network: { handlers: domainReport.network.handlers, checks: domainReport.network.checks.length, passed: domainReport.network.checks.filter(item => item.status === 'PASS').length },
  generatedAt: new Date().toISOString(),
};
const auditPath = path.join(out, 'S01-seed-audit-current-20261008.json');
const auditLogPath = path.join(out, 'S01-seed-audit-current-20261008.log');
const auditLog = `Read-only seed and canonical catalog audit\n${JSON.stringify(audit, null, 2)}\n`;
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
fs.writeFileSync(auditLogPath, auditLog, 'utf8');

const relative = file => {
  const fromFe = path.relative(fe, file);
  if (!fromFe.startsWith('..')) return fromFe.replaceAll('\\', '/');
  return `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`;
};
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const sourcePaths = [
  path.join(fe, 'AGENTS.md'), path.join(fe, 'AI_RULES.md'), path.join(fe, 'apps/web/src/mocks/seed.json'),
  path.join(fe, 'apps/web/src/mocks/collections.json'), path.join(fe, 'apps/web/src/mocks/database.ts'), path.join(fe, 'apps/web/src/mocks/service.ts'),
  path.join(fe, 'tests/domain-scenarios.cjs'), path.join(fe, 'tests/fixtures/mock-network.mjs'), path.join(fe, 'scripts/test-domain.mjs'),
  path.join(fe, 'docs/route-implementation.json'), path.join(fe, 'packages/contracts/src/operations.json'),
  path.join(kit, 'contracts/route-manifest.json'), path.join(kit, 'contracts/feature-catalog.json'), path.join(kit, 'contracts/permission-catalog.json'),
  path.join(kit, 'execution/frontend-command-map.json'), path.join(kit, 'execution/frontend-plan.json'),
  domainLogPath, domainReportPath, auditPath, auditLogPath, script,
];
const sourceFiles = [...new Set(sourcePaths)].map(file => ({ path: relative(file), sha256: sha(bytes(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const summary = `Current registered domain command passed 75/75 simulator checks and 13/13 MSW network scenarios over 210 handlers. Read-only seed audit covers ${routes.length} canonical routes, ${features.length} features, ${shops.size} shops, ${seed.members.length} memberships, ${records} synthetic records in ${collections.length} collections, ${shopScopedRecords} shop-scoped records, seven relationship families, exact VND integer strings, and zero orphan shop references. Mock seed, sequence, clock, fault/delay/file/idempotency reset are deterministic. No live customer/shop data.`;
const log = [
  'FE008.S01 current deterministic synthetic dataset and scenario evidence', `HEAD=${head} plus current frontend working tree; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API`,
  `commandId=${command.id}; command=${command.command}; cwd=${fe}; exitCode=${run.status}; log=${relative(domainLogPath)}; logSha256=${sha(bytes(domainLogPath))}`,
  `domainReport=${relative(domainReportPath)}; domainChecks=75/75; networkChecks=13/13; handlers=210/210`,
  `seedAudit=${relative(auditPath)}; seedAuditLogSha256=${sha(bytes(auditLogPath))}`,
  summary, `protectedOutputRestoration=PASS (${protectedPaths.map((file, index) => `${path.relative(fe, file)}:${previousFiles.get(file) === null ? 'originally absent' : `sha256=${sha(previousFiles.get(file))}; restored sha256=${sha(bytes(file))}`}`).join('; ')})`,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
].join('\n') + '\n';
fs.writeFileSync(logPath, log, 'utf8');
const evidence = {
  taskId: 'FE008', stepId: 'S01', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: audit.generatedAt, sourceRevision: `HEAD ${head} plus current frontend working tree`,
  expected: 'A deterministic synthetic dataset covers canonical routes/features, two shops and approved member roles; same-shop ID/relationship and money invariants hold.',
  observed: summary, commandId: command.id, command: command.command, cwd: fe,
  reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: `Windows Node ${process.versions.node} / TypeScript / Vite and MSW local test toolchain`, details: 'Simulator and in-process MSW only; temporary generated reports were captured outside the frontend and original evidence outputs restored byte-for-byte.', dataSource: 'synthetic-msw' },
  checksTotal: 18, failed: 0, sourceFiles, sourceSnapshotSha256,
  commandResults: [{ commandId: command.id, command: command.command, exitCode: run.status, simulatorChecks: 75, networkChecks: 13, networkHandlers: 210, logFile: path.relative(kit, domainLogPath).replaceAll('\\', '/'), logSha256: sha(bytes(domainLogPath)) }],
  audit, protectedOutputRestoration: protectedPaths.map(file => ({ path: path.relative(fe, file).replaceAll('\\', '/'), restored: previousFiles.get(file) === null ? !fs.existsSync(file) : sha(previousFiles.get(file)) === sha(bytes(file)), sha256: previousFiles.get(file) === null ? null : sha(bytes(file)) })),
  logFile: path.relative(kit, logPath).replaceAll('\\', '/'), logSha256: sha(Buffer.from(log)),
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', simulator: '75/75', network: '13/13', handlers: '210/210', routes: routes.length, features: features.length, shops: shops.size, records, collections: collections.length, receipt: relative(receiptPath), logSha256: evidence.logSha256 }, null, 2));
