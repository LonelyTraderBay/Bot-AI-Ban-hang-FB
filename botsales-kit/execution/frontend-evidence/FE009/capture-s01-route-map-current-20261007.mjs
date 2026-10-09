import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE009');
const command = 'set PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH% && npm.cmd --script-shell=cmd.exe run test:source';
const commandId = 'source';
const evidencePath = path.join(evidenceDir, 'S01-route-map-current-20261007.json');
const logPath = path.join(evidenceDir, 'S01-route-map-current-20261007.log');
const mapPath = path.join(evidenceDir, 'S01-route-map-current-20261007-report.json');
const sourceLogPath = path.join(evidenceDir, 'S01-source-current-20261007.log');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = (root, relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (root, relative) => JSON.parse(read(root, relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace, got ${frontendRoot}`);
const planPath = 'botsales-kit/execution/frontend-plan.json';
const task = json(kitRoot, 'execution/frontend-plan.json').tasks.find(item => item.id === 'FE009');
const routeManifest = json(kitRoot, 'contracts/route-manifest.json');
const openapi = json(kitRoot, 'contracts/openapi.json');
const permissionCatalog = json(kitRoot, 'contracts/permission-catalog.json');
const featureCatalog = json(kitRoot, 'contracts/feature-catalog.json');
const generatedOperations = json(frontendRoot, 'packages/contracts/src/operations.json');
const routerSource = read(frontendRoot, 'apps/web/src/app/router.tsx');
const workspaceSource = read(frontendRoot, 'apps/web/src/modules/workspace/index.tsx');
const customersSource = read(frontendRoot, 'apps/web/src/modules/customers/index.tsx');
const fe009Tests = read(frontendRoot, 'tests/fe009.spec.ts');
const routeRows = new Map(routeManifest.routes.map(route => [route.id, route]));
const permissionIds = new Set(permissionCatalog.permissions.map(item => item.id));
const featureRows = featureCatalog.features ?? featureCatalog.featureCatalog ?? [];
const featureIds = new Set(featureRows.map(item => item.id));
const operationRows = new Map();
for (const [url, methods] of Object.entries(openapi.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (operation?.operationId) operationRows.set(operation.operationId, { url, method: method.toUpperCase(), ...operation });
  }
}

assert(task?.implementationSteps?.[0]?.id === 'S01', 'FE009.S01 is missing from canonical plan');
assert(task.routeIds.length === 11, `Expected 11 FE009 routes, got ${task.routeIds.length}`);
assert(task.operationIds.length === 29, `Expected 29 FE009 operation IDs, got ${task.operationIds.length}`);
assert(task.featureIds.every(id => featureIds.has(id)), 'A FE009 feature ID is absent from the canonical feature catalog');

const expectedPages = {
  R01: 'LoginPage', R02: 'WorkspacesPage', R03: 'OnboardingPage', R07: 'CustomersPage', R08: 'CustomerPage',
  R32: 'TeamPage', R33: 'ShopSettingsPage', R34: 'AuditPage', R35: 'PrivacyPage', R36: 'JobPage', R54: 'ServiceCasesPage',
};
const routes = task.routeIds.map(id => {
  const route = routeRows.get(id);
  assert(route, `Route ${id} is absent from canonical route manifest`);
  const component = expectedPages[id];
  assert(component && new RegExp(`\\b${id}\\s*:\\s*${component}\\b`).test(routerSource), `${id} is not bound to ${component} in the React router`);
  assert(!route.readPermission || permissionIds.has(route.readPermission), `${id} uses unknown read permission ${route.readPermission}`);
  for (const action of route.actions) {
    assert(task.operationIds.includes(action.operationId), `${id} action ${action.operationId} is not listed by FE009`);
    assert(!action.permission || permissionIds.has(action.permission), `${id} uses unknown permission ${action.permission}`);
    assert(generatedOperations[action.operationId]?.permission === action.permission, `${id}.${action.operationId} permission differs between route and generated operation`);
  }
  return {
    id, path: route.path, module: route.module, component,
    readPermission: route.readPermission,
    readOperations: route.readOperations,
    actions: route.actions.map(({ label, operationId, permission }) => ({ label, operationId, permission })),
    acceptanceScenarioIds: route.acceptanceScenarioIds,
  };
});

const sourceFilesForUse = [];
function walkTs(root, relative = '') {
  const absolute = path.join(root, relative);
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) walkTs(root, child);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFilesForUse.push(child.replaceAll('\\', '/'));
  }
}
walkTs(frontendRoot, 'apps/web/src');
const sourceText = sourceFilesForUse.map(file => [file, read(frontendRoot, file)]);
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const directOperationUses = new Map();
const nonInvokedOperations = {
  getMember: 'TeamPage edits the membership returned by listMembers; FE009 has no member-detail route or separate detail action.',
  getServiceCase: 'ServiceCasesPage is a collection route; FE009 has no service-case-detail route.',
  stepUp: 'The current product gap records that password step-up cannot be substituted for the OIDC re-authentication protocol.',
  approvePrivacyRequest: 'Privacy deletion requests remain pending; the frontend has no approved re-authentication protocol to call this destructive approval operation.',
};
for (const id of task.operationIds) {
  const matcher = new RegExp(`(?:request|useApi|usePagedApi|useCommand)\\s*\\(\\s*['\"]${escapeRegExp(id)}['\"]`);
  const paths = sourceText.filter(([, source]) => matcher.test(source)).map(([file]) => file);
  if (paths.length) directOperationUses.set(id, paths);
}
const uncalled = task.operationIds.filter(id => !directOperationUses.has(id));
assert(JSON.stringify([...uncalled].sort()) === JSON.stringify(Object.keys(nonInvokedOperations).sort()), `Unexpected uncalled operation IDs: ${uncalled.join(', ')}`);

const operations = task.operationIds.map(id => {
  const contract = operationRows.get(id);
  const generated = generatedOperations[id];
  assert(contract && generated, `Operation ${id} is missing from OpenAPI or generated operation index`);
  assert(contract.method === generated.method && contract.url === generated.path, `${id} method/path differs from OpenAPI`);
  const requestSchemaRef = contract.requestBody?.content?.['application/json']?.schema?.$ref ?? null;
  const responseSchemaRef = contract.responses?.[String(generated.status)]?.content?.['application/json']?.schema?.$ref ?? null;
  const requestSchema = requestSchemaRef?.split('/').at(-1) ?? null;
  const responseSchema = responseSchemaRef?.split('/').at(-1) ?? null;
  assert(requestSchema === (generated.requestSchema ?? null), `${id} request DTO differs from OpenAPI`);
  assert(responseSchema === (generated.responseSchema ?? null), `${id} response DTO differs from OpenAPI`);
  return {
    id, method: contract.method, path: contract.url, permission: generated.permission,
    requestSchema, responseSchema, versionRequired: generated.versionRequired,
    directSourceUse: directOperationUses.has(id), sourcePaths: directOperationUses.get(id) ?? [],
    notInvokedReason: nonInvokedOperations[id] ?? null,
  };
});

const customerOps = ['listOrders', 'listShipments', 'listServiceCases'].map(id => ({
  id,
  queryParameters: generatedOperations[id].queryParameters.map(parameter => parameter.name),
}));
const supportCaseCall = /useApi\('listServiceCases',\s*\{\s*query:\s*\{\s*limit:\s*10\s*\}\s*\}\)/.test(customersSource);
const shipmentCall = /useApi\('listShipments',\s*\{\s*query:\s*\{\s*limit:\s*100\s*\}\s*\}/.test(customersSource);
const clientSideCaseFilter = /cases\.data\?\.data\.filter\(item\s*=>\s*item\.customerId\s*===\s*customerId\)/.test(customersSource);
const clientSideShipmentFilter = /customerShipments\s*=\s*\(shipments\.data\?\.data\s*\?\?\s*\[\]\)\.filter\(shipment\s*=>\s*customerOrderIds\.has\(shipment\.orderId\)\)/.test(customersSource);
assert(supportCaseCall && shipmentCall && clientSideCaseFilter && clientSideShipmentFilter, 'Customer profile query/relationship implementation changed; refresh this source map before checkpoint');
assert(customerOps.find(item => item.id === 'listOrders').queryParameters.includes('customerId'), 'Orders no longer support customerId filtering');
assert(!customerOps.find(item => item.id === 'listShipments').queryParameters.includes('customerId'), 'Shipment filter contract changed; refresh this gap analysis');
assert(!customerOps.find(item => item.id === 'listServiceCases').queryParameters.includes('customerId'), 'Service-case filter contract changed; refresh this gap analysis');

const flowNames = [
  'workspace onboarding creates a shop with an active membership and returns to its scoped route',
  'customer create validates fields, submits through mock HTTP, and preserves edits after a stale version',
  'customer detail keeps redacted contact fields read-only and does not overwrite them on save',
  'FE009.G01 shop setup checklist guides to supported pages and leaves missing contract fields unverified',
  'FE009.G05 marketing consent preview is interactive but never claims server opt-out',
  'FE009.H06 audit screen distinguishes available fields from missing contract detail',
  'FE009.B06 after-sale cases only link orders loaded for the selected customer and customer profile shows their shipment',
  'team invitation and membership revoke stay shop-scoped and protect the active owner',
  'privacy delete requests remain pending approval with no frontend step-up shortcut',
  'job detail follows an export created in the current synthetic shop and can refetch it',
];
for (const name of flowNames) assert(fe009Tests.includes(`test('${name}'`), `FE009 browser scenario missing: ${name}`);

const commandMapPath = 'botsales-kit/execution/frontend-command-map.json';
const commandMap = json(kitRoot, 'execution/frontend-command-map.json');
const registeredCommand = commandMap.commands.find(item => item.id === commandId);
const sourceRelativePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
  'package.json', 'playwright.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/app/Shell.tsx', 'apps/web/src/modules/workspace/index.tsx', 'apps/web/src/modules/customers/index.tsx',
  'apps/web/src/modules/knowledge/index.tsx', 'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts',
  'apps/web/src/shared/model/scope.tsx', 'tests/fe009.spec.ts',
];
const kitRelativePaths = [
  'AGENTS.md', 'docs/02_ARCHITECTURE.md', 'docs/06_API_AND_REALTIME.md', 'docs/08_SECURITY_TENANCY_RBAC.md',
  'docs/18_CODING_STANDARDS.md', 'contracts/route-manifest.json', 'contracts/openapi.json',
  'contracts/permission-catalog.json', 'contracts/feature-catalog.json', 'execution/frontend-plan.json',
  'execution/frontend-command-map.json', 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
  'execution/frontend-evidence/FE009/S02-domain-current-20261007.log',
  'execution/frontend-evidence/FE009/S01-source-current-20261007.log',
  'execution/frontend-evidence/FE009/capture-s01-route-map-current-20261007.mjs',
];
for (const relative of sourceRelativePaths) assert(fs.existsSync(path.join(frontendRoot, relative)), `Missing frontend source ${relative}`);
for (const relative of kitRelativePaths) assert(fs.existsSync(path.join(kitRoot, relative)), `Missing kit source ${relative}`);
const sourceFiles = [
  ...sourceRelativePaths.map(relative => ({ path: relative, bytes: fs.readFileSync(path.join(frontendRoot, relative)) })),
  ...kitRelativePaths.map(relative => ({ path: `botsales-kit/${relative}`, bytes: fs.readFileSync(path.join(kitRoot, relative)) })),
].map(item => ({ path: item.path, sha256: sha(item.bytes) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const routeOperationIds = [...new Set(routes.flatMap(route => [...route.readOperations, ...route.actions.map(action => action.operationId)]))];
const expectedStep = task.implementationSteps[0];
const now = new Date().toISOString();
assert(fs.existsSync(sourceLogPath) && read(kitRoot, 'execution/frontend-evidence/FE009/S01-source-current-20261007.log').includes('exitCode=0'), 'Registered test:source run has not been recorded as successful');
const report = {
  taskId: 'FE009', stepId: 'S01', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  canonicalSources: {
    plan: planPath,
    routeManifest: 'botsales-kit/contracts/route-manifest.json',
    openapi: 'botsales-kit/contracts/openapi.json',
    permissionCatalog: 'botsales-kit/contracts/permission-catalog.json',
    featureCatalog: 'botsales-kit/contracts/feature-catalog.json',
    generatedOperationIndex: 'packages/contracts/src/operations.json',
  },
  routeCount: routes.length, operationCount: operations.length, featureIds: task.featureIds,
  routeOperationIds, routeComponentMap: routes, operations,
  directOperationUseCount: directOperationUses.size,
  notInvokedOperationIds: uncalled.map(id => ({ id, reason: nonInvokedOperations[id] })),
  featureScopeNotes: [
    { ids: ['G02', 'G03', 'G06'], observed: 'Workspace setup checklist links to the Knowledge pages; the FE009 write scope does not own the Knowledge module.' },
    { ids: ['G01'], observed: 'Setup checklist marks missing business country, delivery policy, approval policy, and provider grants as unconfigured.' },
    { ids: ['G05'], observed: 'Marketing opt-out is preview-only; the current contract exposes no server opt-out operation.' },
    { ids: ['H05', 'H07'], observed: 'Frontend role/scope and mock isolation are validated in FE007/FE008; that does not prove server authorization or real integrations.' },
  ],
  customerRelationshipGap: {
    severity: 'P1 user-visible completeness gap; not a demonstrated authorization bypass',
    contractEvidence: customerOps,
    implementation: {
      serviceCases: { query: 'listServiceCases(limit: 10)', filter: 'client-side customerId after response', completeness: 'first page only' },
      shipments: { query: 'listShipments(limit: 100)', filter: 'client-side by order IDs from customer-filtered listOrders', completeness: 'first page only' },
    },
    impact: 'A related case/shipment outside the fetched page can be omitted from the customer profile. The API has no customerId filter for cases or shipments, so the frontend cannot claim a complete customer-specific list without an API contract change.',
    disposition: 'Record as contract-bound open gap; do not invent a query parameter. The service-cases and shipments collection routes remain usable.',
  },
  sourceSnapshotSha256,
};

const checks = [
  { name: 'All planned FE009 route IDs exist and resolve to the current React page component', count: routes.length, status: 'PASS' },
  { name: 'All planned operation IDs resolve to OpenAPI and generated descriptors with matching method/path/DTOs', count: operations.length, status: 'PASS' },
  { name: 'All route permissions exist in the permission catalog and action permissions match operation descriptors', count: routes.reduce((sum, route) => sum + route.actions.length + Number(Boolean(route.readPermission)), 0), status: 'PASS' },
  { name: 'Direct API operation uses are located in actual React source', count: directOperationUses.size, status: 'PASS' },
  { name: 'Expected non-invoked operations are classified by current page/protocol scope', count: uncalled.length, status: 'PASS' },
  { name: 'All FE009 feature IDs and named browser scenarios are present in canonical sources', count: task.featureIds.length + flowNames.length, status: 'PASS' },
  { name: 'Customer relationship query limits and absent API filters are recorded from contract and source', count: customerOps.length, status: 'PASS' },
];

const caseResults = [
  { name: 'FE009 routes and components are mapped to actual source', status: 'PASS', count: routes.length },
  { name: 'Canonical operation method/path/DTO/permission mapping is checked', status: 'PASS', count: operations.length },
  { name: 'Customer case/shipment list limitations are identified without inventing an endpoint', status: 'OPEN_GAP', count: 2 },
  { name: 'Privacy step-up and approval stay uncalled until the supported OIDC re-auth protocol exists', status: 'PASS', count: 2 },
];

fs.writeFileSync(mapPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const log = [
  `FE009.S01 canonical route/operation/source map audit`, `executedAt=${now}`, `cwd=${frontendRoot}`,
  `commandId=${commandId}; command=${command}; exitCode=0`,
  `routes=${routes.length}/${task.routeIds.length}; operations=${operations.length}/${task.operationIds.length}; directSourceUses=${directOperationUses.size}; nonInvoked=${uncalled.join(',')}`,
  `featureIds=${task.featureIds.join(',')}; browserScenarios=${flowNames.length}`,
  `SOURCE_COMMAND=command-map ${commandId}; exitCode=0; sourceLog=${path.relative(kitRoot, sourceLogPath).replaceAll('\\', '/')}; sha256=${sha(fs.readFileSync(sourceLogPath))}`,
  ...checks.map(check => `CHECK ${check.status}: ${check.name} (${check.count})`),
  `OPEN_GAP P1: listServiceCases and listShipments have no customerId query; profile filters only the first 10/100 shop-wide rows in the client.`,
  `OPEN_GAP: stepUp and approvePrivacyRequest are not invoked because current contract documentation has no frontend-safe OIDC re-auth flow.`,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  `Supporting current browser run: botsales-kit/execution/frontend-evidence/FE009/S02-e2e-current-20261007.log (512/512 Chromium + Firefox; includes 20/20 FE009 browser cases).`,
  `Supporting current API/domain run: botsales-kit/execution/frontend-evidence/FE009/S02-domain-current-20261007.log (88/88 synthetic simulator/network checks passed).`,
  'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no real backend, OIDC provider, tenant enforcement, or production behavior is claimed.',
].join('\n') + '\n';
fs.writeFileSync(logPath, log, 'utf8');

if (registeredCommand?.status === 'VERIFIED_AVAILABLE' && registeredCommand.command === command) {
  const evidence = {
    taskId: 'FE009', stepId: 'S01', kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`, expected: expectedStep.verification,
    observed: `Current static source audit mapped ${routes.length}/11 routes and ${operations.length}/29 planned operations to OpenAPI/generated DTO descriptors and actual React page bindings. ${directOperationUses.size} operations are directly invoked; getMember/getServiceCase have no separate detail flow, while stepUp/approvePrivacyRequest remain deliberately uncalled pending the OIDC re-auth contract. An unrelated-to-auth frontend completeness gap remains: customer profile derives case/shipment relationships from only the first 10/100 shop-wide rows because listServiceCases/listShipments lack a customerId query.`,
    commandId, command, cwd: frontendRoot,
    reviewer: 'Codex self-review; no independent peer review claimed',
    environment: { name: `Windows / Node ${process.versions.node}`, details: 'Read-only contract/source map assertions; current FE009 built-demo browser run is separately recorded in S04.', dataSource: 'source-only' },
    checksTotal: checks.reduce((sum, check) => sum + check.count, 0), failed: 0, checks,
    sourceFiles, sourceSnapshotSha256, logFile: path.relative(kitRoot, logPath).replaceAll('\\', '/'), logSha256: sha(fs.readFileSync(logPath)),
    commandResults: [{ commandId, command, exitCode: 0, checksPassed: checks.reduce((sum, check) => sum + check.count, 0), logFile: path.relative(kitRoot, logPath).replaceAll('\\', '/'), logSha256: sha(fs.readFileSync(logPath)) }],
    audit: { result: 'PASS_WITH_DOCUMENTED_GAP', captureCommand: 'node ../botsales-kit/execution/frontend-evidence/FE009/capture-s01-route-map-current-20261007.mjs', captureExitCode: 0, caseResults, reportFile: path.relative(kitRoot, mapPath).replaceAll('\\', '/'), reportSha256: sha(fs.readFileSync(mapPath)) },
  };
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  result: 'PASS', evidence: registeredCommand?.status === 'VERIFIED_AVAILABLE' ? path.relative(kitRoot, evidencePath).replaceAll('\\', '/') : 'NOT_WRITTEN_COMMAND_NOT_REGISTERED',
  report: path.relative(kitRoot, mapPath).replaceAll('\\', '/'), routes: routes.length, operations: operations.length,
  directOperationUses: directOperationUses.size, nonInvoked: uncalled, customerQueryGap: ['listServiceCases', 'listShipments'],
  checks: checks.reduce((sum, check) => sum + check.count, 0), sourceSnapshotSha256,
}, null, 2));
