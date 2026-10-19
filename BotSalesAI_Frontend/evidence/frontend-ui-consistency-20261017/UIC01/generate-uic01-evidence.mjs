import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(outputDir, '../../../../');
const frontendRoot = path.join(repoRoot, 'BotSalesAI_Frontend');
const auditHead = '1fd4530609f4e69193a27b0d5a4959181e3f8fc9';
const currentTaskEvidencePrefix = 'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC01/';
const routeManifestPath = 'botsales-kit/contracts/route-manifest.json';
const permissionCatalogPath = 'botsales-kit/contracts/permission-catalog.json';
const tokensPath = 'botsales-kit/design/tokens.json';
const sourceScope = [
  'BotSalesAI_Frontend/apps',
  'BotSalesAI_Frontend/packages',
  'BotSalesAI_Frontend/tests',
  'BotSalesAI_Frontend/scripts',
  'BotSalesAI_Frontend/.env.example',
  'BotSalesAI_Frontend/.gitignore',
  'BotSalesAI_Frontend/.node-version',
  'BotSalesAI_Frontend/.npmrc',
  'BotSalesAI_Frontend/.nvmrc',
  'BotSalesAI_Frontend/eslint.config.mjs',
  'BotSalesAI_Frontend/playwright.config.ts',
  'BotSalesAI_Frontend/playwright.built-demo.config.ts',
  'BotSalesAI_Frontend/package.json',
  'BotSalesAI_Frontend/package-lock.json',
  '.github/workflows/frontend.yml',
  'BotSalesAI_Frontend/docs/route-implementation.json',
  'BotSalesAI_Frontend/docs/route-state-role-matrix.json',
  'BotSalesAI_Frontend/docs/route-source-map.json',
  routeManifestPath,
  permissionCatalogPath,
  tokensPath,
];
const requiredInputs = [
  '.github/workflows/frontend.yml',
  'AGENTS.md',
  'BotSalesAI_Frontend/AGENTS.md',
  'BotSalesAI_Frontend/AI_RULES.md',
  'BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md',
  'BotSalesAI_Frontend/docs/PROJECT_CONTEXT.md',
  'BotSalesAI_Frontend/docs/FRONTEND_SPACING_STANDARD.md',
  'BotSalesAI_Frontend/docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
  'BotSalesAI_Frontend/docs/CONTINUE_FRONTEND.md',
  'BotSalesAI_Frontend/apps/web/src/shared/ui/README.md',
  'BotSalesAI_Frontend/apps/web/src/app/router.tsx',
  'BotSalesAI_Frontend/apps/web/src/shared/ui/theme.ts',
  'BotSalesAI_Frontend/apps/web/src/mocks/browser.ts',
  'BotSalesAI_Frontend/apps/web/src/modules/dashboard/index.tsx',
  'BotSalesAI_Frontend/docs/route-implementation.json',
  'BotSalesAI_Frontend/docs/route-state-role-matrix.json',
  'botsales-kit/contracts/openapi.json',
  routeManifestPath,
  permissionCatalogPath,
  tokensPath,
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-progress.json',
  'botsales-kit/docs/02_ARCHITECTURE.md',
  'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md',
];

function git(args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function readJson(repoPath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, repoPath), 'utf8'));
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function treatmentFor(repoPath) {
  const fePath = repoPath.startsWith('BotSalesAI_Frontend/')
    ? repoPath.slice('BotSalesAI_Frontend/'.length)
    : repoPath;
  let treatment = 'REFERENCE_READONLY';
  let reason = 'Tài liệu hoặc nguồn chuẩn được đọc để giữ scope; không phải module runtime của giao diện.';
  let owner = 'docs/scope';

  if (fePath === 'apps/web/src/shared/ui/theme.ts') {
    return { treatment: 'EDIT_VERIFY', owner: 'shared/ui/theme.ts', reason: 'UI-CONS-01 đã xác nhận backdrop hiển thị lệch token; chỉ sửa sau baseline paired của UIC02.' };
  }
  if (fePath === 'apps/web/src/mocks/browser.ts') {
    return { treatment: 'EDIT_VERIFY', owner: 'mocks/browser.ts', reason: 'UI-CONS-02 có một pageerror worker-update cần điều tra; nguyên nhân chưa xác minh nên chưa được sửa.' };
  }
  if (fePath === 'apps/web/src/modules/dashboard/index.tsx') {
    return { treatment: 'KEEP_VERIFY', owner: 'modules/dashboard/index.tsx', reason: 'UI-CONS-03 là candidate cần xác minh ý đồ; chưa kết luận lỗi hoặc thay bố cục.' };
  }
  if (fePath === 'docs/route-implementation.json' || fePath === 'docs/route-state-role-matrix.json'
    || fePath === 'docs/route-source-map.json') {
    return { treatment: 'GENERATE_VERIFY', owner: 'owning Frontend evidence generator', reason: 'Generated route evidence; preserve its historical results and regenerate only through the owning command.' };
  }
  if (fePath === 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md') {
    return { treatment: 'EDIT_VERIFY', owner: 'UIC task/status plan', reason: 'Single task/status source; update only after its own proof and delivery state are observed.' };
  }
  if (fePath === 'apps/web/src/app/tokens.css' || /(^|\/)generated(?:\/|\.)/.test(fePath)) {
    return { treatment: 'GENERATE_VERIFY', owner: 'botsales-kit canonical input + scripts/generate.mjs', reason: 'Output sinh; đối chiếu input và freshness, không sửa tay.' };
  }
  if (fePath === 'apps/web/public/mockServiceWorker.js') {
    return { treatment: 'GENERATE_VERIFY', owner: 'MSW pinned CLI', reason: 'Worker do dependency CLI sinh; không sửa vendor output bằng tay.' };
  }
  if (fePath.startsWith('apps/web/public/') || fePath.startsWith('apps/web/samples/') || fePath.startsWith('samples/') || fePath === 'apps/web/index.html') {
    return { treatment: 'ASSET_VERIFY', owner: 'apps/web public/sample assets', reason: 'Asset first-party; kiểm link/import, kích thước và semantics khi consumer bị ảnh hưởng.' };
  }
  if (fePath.startsWith('apps/web/src/')) {
    return { treatment: 'KEEP_VERIFY', owner: fePath.split('/').slice(0, 5).join('/'), reason: 'Source runtime; rà theo import closure, route, role, state và consumer.' };
  }
  if (fePath.startsWith('apps/web/tests/') || fePath.startsWith('tests/') || fePath.startsWith('scripts/')
    || fePath.startsWith('apps/web/') || fePath.startsWith('packages/')) {
    const generated = /(^|\/)(generated|dist)(\/|\.)/.test(fePath);
    return {
      treatment: generated ? 'GENERATE_VERIFY' : 'TOOLING_VERIFY',
      owner: generated ? 'owning generator' : 'frontend build/test/config',
      reason: generated ? 'Generated contract/report; verify input and generator freshness.' : 'Test, checker, script, workflow, package or build configuration affecting Frontend verification.',
    };
  }
  if (repoPath.startsWith('botsales-kit/')) {
    if ([routeManifestPath, permissionCatalogPath, tokensPath, 'botsales-kit/contracts/openapi.json'].includes(repoPath)) {
      return { treatment: 'KEEP_VERIFY', owner: 'botsales-kit canonical contract', reason: 'Canonical Frontend input; inspect and fingerprint, do not edit in UIC01.' };
    }
    if (repoPath.startsWith('botsales-kit/execution/frontend-')) {
      return { treatment: 'REFERENCE_READONLY', owner: 'botsales-kit Frontend CLI', reason: 'Read-only guardrail; UI consistency work does not modify the FE or full-product ledger.' };
    }
    return { treatment: 'REFERENCE_READONLY', owner: 'botsales-kit specification', reason: 'Full-product specification or evidence outside React source ownership; read-only for this Frontend UI task.' };
  }
  if (repoPath === '.github/workflows/frontend.yml') {
    return { treatment: 'TOOLING_VERIFY', owner: '.github/workflows/frontend.yml', reason: 'Hosted Frontend verification workflow and path filters.' };
  }
  if (repoPath === 'AGENTS.md' || fePath === 'AGENTS.md' || fePath === 'AI_RULES.md') {
    return { treatment: 'REFERENCE_READONLY', owner: 'repository instructions', reason: 'Repository/component constraints; read-only input.' };
  }
  return { treatment, owner, reason };
}

const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean).filter((item) => !item.startsWith(currentTaskEvidencePrefix));
const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
const trackedSet = new Set(tracked);
const missingInputs = requiredInputs.filter((item) => !trackedSet.has(item) || !fs.existsSync(path.join(repoRoot, item)));
if (missingInputs.length) throw new Error(`Missing expected tracked inputs: ${missingInputs.join(', ')}`);

const frontendTracked = tracked.filter((item) => item.startsWith('BotSalesAI_Frontend/'));
const frontendEvidence = frontendTracked.filter((item) => item.startsWith('BotSalesAI_Frontend/evidence/'));
const frontendCodeInventory = frontendTracked.filter((item) => !item.startsWith('BotSalesAI_Frontend/evidence/'));
const relevantInputs = [...new Set([
  ...frontendCodeInventory,
  ...requiredInputs,
  ...sourceScope.filter((item) => trackedSet.has(item)),
])].sort();
const inventory = relevantInputs.map((repoPath) => {
  const filePath = path.join(repoRoot, repoPath);
  const treatment = treatmentFor(repoPath);
  const stat = fs.statSync(filePath);
  return { path: repoPath, bytes: stat.size, sha256: sha256(filePath), ...treatment };
});

const audit = readJson('BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/audit-summary.json');
const routeData = readJson(routeManifestPath);
const generatedRoutes = readJson('BotSalesAI_Frontend/packages/contracts/src/routes.json');
const routeImpl = readJson('BotSalesAI_Frontend/docs/route-implementation.json');
const roleStateMatrix = readJson('BotSalesAI_Frontend/docs/route-state-role-matrix.json');
const permissionCatalog = readJson(permissionCatalogPath);
const packageLock = readJson('BotSalesAI_Frontend/package-lock.json');
const lockedVersions = Object.fromEntries(['react', '@mui/material', 'vite', 'typescript', 'vitest', '@playwright/test', 'msw']
  .map((name) => [name, packageLock.packages[`node_modules/${name}`]?.version ?? null]));
const routerPath = path.join(frontendRoot, 'apps/web/src/app/router.tsx');
const routerText = fs.readFileSync(routerPath, 'utf8');
const pageBody = routerText.match(/export const pages:\s*Record<string, ComponentType>\s*=\s*\{([\s\S]*?)\n\};/);
if (!pageBody) throw new Error('Could not parse explicit pages map from router.tsx.');
const pageBindings = new Map([...pageBody[1].matchAll(/^\s*(R\d+)\s*:\s*(\w+)\s*,?\s*$/gm)].map((match) => [match[1], match[2]]));
const lazyBindings = new Map([...routerText.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)\.then\(m\s*=>\s*\(\{\s*default:\s*m\.(\w+)\s*\}\)\)\);/g)]
  .map((match) => [match[1], { specifier: match[2], exportName: match[3] }]));
const implById = new Map(routeImpl.map((entry) => [entry.routeId, entry]));
const generatedRouteRows = generatedRoutes.routes ?? generatedRoutes;
const canonicalRoutes = routeData.routes;
const canonicalIds = canonicalRoutes.map((route) => route.id);
const generatedIds = generatedRouteRows.map((route) => route.id);
const duplicateCanonicalIds = canonicalIds.filter((id, index) => canonicalIds.indexOf(id) !== index);
let routeSetMatches = canonicalIds.length === generatedIds.length
  && canonicalRoutes.every((route, index) => generatedRouteRows[index]?.id === route.id && generatedRouteRows[index]?.path === route.path)
  && canonicalIds.length === pageBindings.size
  && canonicalRoutes.every((route) => pageBindings.has(route.id))
  && canonicalRoutes.length === routeImpl.length
  && canonicalRoutes.every((route) => {
    const implementation = implById.get(route.id);
    return implementation?.route === route.path && fs.existsSync(path.join(frontendRoot, implementation.source));
  })
  && duplicateCanonicalIds.length === 0;

const requireFromFrontend = createRequire(path.join(frontendRoot, 'package.json'));
const ts = requireFromFrontend('typescript');
const tsconfigPath = path.join(frontendRoot, 'apps/web/tsconfig.json');
const config = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(tsconfigPath), undefined, tsconfigPath);
if (parsed.errors.length) throw new Error(parsed.errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const normalizedFrontend = path.resolve(frontendRoot).toLowerCase();
function isFrontendFile(filePath) {
  const normalized = path.resolve(filePath).toLowerCase();
  return normalized.startsWith(`${normalizedFrontend}${path.sep}`) && !normalized.includes(`${path.sep}node_modules${path.sep}`);
}
function resolveFirstParty(specifier, containingFile) {
  const resolved = ts.resolveModuleName(specifier, containingFile, parsed.options, ts.sys).resolvedModule?.resolvedFileName;
  return resolved && isFrontendFile(resolved) ? path.resolve(resolved) : null;
}
const graph = new Map();
const unresolvedLocalImports = [];
const externalPackages = new Set();
for (const sourceFile of program.getSourceFiles().filter((item) => isFrontendFile(item.fileName))) {
  const edges = new Set();
  function visit(node) {
    let specifier = null;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifier = node.moduleSpecifier.text;
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      specifier = node.arguments[0].text;
    }
    if (specifier) {
      const directPath = path.resolve(path.dirname(sourceFile.fileName), specifier);
      const resolved = resolveFirstParty(specifier, sourceFile.fileName)
        ?? (fs.existsSync(directPath) && isFrontendFile(directPath) ? directPath : null);
      if (resolved) edges.add(resolved);
      else if (specifier.startsWith('.') || specifier.startsWith('@/') || specifier.startsWith('@botsales/')) {
        const anyResolved = ts.resolveModuleName(specifier, sourceFile.fileName, parsed.options, ts.sys).resolvedModule?.resolvedFileName;
        if (!anyResolved) unresolvedLocalImports.push({ importer: relative(sourceFile.fileName), specifier });
      } else externalPackages.add(specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/'));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  graph.set(path.resolve(sourceFile.fileName), [...edges]);
}

function closureFrom(startFiles) {
  const visited = new Set();
  const pending = startFiles.map((file) => path.resolve(file));
  while (pending.length) {
    const current = pending.pop();
    if (!current || visited.has(current) || !isFrontendFile(current)) continue;
    visited.add(current);
    pending.push(...(graph.get(current) ?? []));
  }
  return [...visited].map(relative).sort();
}

function componentDeclarationSource(repoRelativeSource, exportName) {
  const filePath = path.resolve(frontendRoot, repoRelativeSource);
  const sourceFile = program.getSourceFile(filePath);
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return null;
  const exported = checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.getName() === exportName);
  if (!exported) return null;
  const resolvedSymbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
  const declaration = resolvedSymbol.valueDeclaration ?? resolvedSymbol.declarations?.[0];
  return declaration ? relative(declaration.getSourceFile().fileName) : null;
}

const roles = Object.keys(permissionCatalog.rolePresets ?? {});
const routeRows = canonicalRoutes.map((route) => {
  const implementation = implById.get(route.id);
  const alias = pageBindings.get(route.id);
  const binding = lazyBindings.get(alias);
  const ownerFile = implementation ? path.resolve(frontendRoot, implementation.source) : null;
  const exportFile = implementation ? componentDeclarationSource(implementation.source, implementation.component) : null;
  const requiredPermissions = [...new Set([
    ...(route.readPermission ? [route.readPermission] : []),
    ...(route.writePermissions ?? []),
    ...(route.actions ?? []).map((action) => action.permission).filter(Boolean),
  ])];
  const roleAccess = Object.fromEntries(roles.map((role) => {
    const permission = route.readPermission;
    const canRead = !permission || permissionCatalog.rolePresets[role]?.includes(permission) === true;
    return [role, {
      expectedUiGate: canRead ? 'RENDER' : 'SHOW_PERMISSION_WARNING',
      reason: permission ? `Route readPermission ${permission} ${canRead ? 'is' : 'is not'} in canonical demo role preset.` : 'Route has no readPermission; the source PermissionGate allows the rendered page.',
    }];
  }));
  const states = route.states ?? [];
  const stateRoles = roles.flatMap((role) => states.map((state) => ({
    role,
    state,
    expectedUiGate: roleAccess[role].expectedUiGate,
    verification: 'NOT_REVALIDATED_BY_UIC01',
  })));
  const starts = [ownerFile, path.join(frontendRoot, 'apps/web/src/main.tsx'), path.join(frontendRoot, 'apps/web/src/app/router.tsx')];
  const scoped = route.path.startsWith('/s/');
  if (scoped) starts.push(path.join(frontendRoot, 'apps/web/src/app/Shell.tsx'));
  else if (!['R01', 'R61'].includes(route.id)) starts.push(path.join(frontendRoot, 'apps/web/src/app/SessionProvider.tsx'));
  const importClosure = closureFrom(starts.filter(Boolean));
  const routerResolvedPageFile = binding ? resolveFirstParty(binding.specifier, routerPath) : null;
  const routerResolvedExportFile = binding && routerResolvedPageFile
    ? componentDeclarationSource(path.relative(frontendRoot, routerResolvedPageFile).split(path.sep).join('/'), binding.exportName)
    : null;
  const wrapper = alias === 'OrderPage';
  return {
    routeId: route.id,
    path: route.path,
    title: route.title,
    module: route.module,
    routerPageBinding: alias ?? null,
    routerLazyImport: binding?.specifier ?? null,
    routerLazyExport: binding?.exportName ?? (wrapper ? 'OrderDetailPage via OrderPage wrapper' : null),
    routerWrapper: wrapper,
    routeImplementation: implementation ? { source: implementation.source, component: implementation.component } : null,
    resolvedOwnerExportSource: exportFile,
    routerResolvedExportSource: routerResolvedExportFile,
    visualProfiles: [390, 1440],
    routingGuard: route.path.startsWith('/s/')
      ? { shell: 'Shell', gate: 'PermissionGate', permission: route.readPermission ?? null }
      : { shell: null, gate: ['R01', 'R61'].includes(route.id) ? 'PUBLIC_ROUTE' : 'GlobalGate', permission: null },
    readPermission: route.readPermission ?? null,
    writePermissions: route.writePermissions ?? [],
    actionCount: (route.actions ?? []).length,
    actionPermissions: (route.actions ?? []).map((action) => ({ label: action.label, operationId: action.operationId, permission: action.permission ?? null })),
    canonicalStates: states,
    acceptanceScenarioIds: route.acceptanceScenarioIds ?? [],
    roleAccess,
    roleStateCases: stateRoles,
    importClosure,
    closureCount: importClosure.length,
  };
});

const sharedUiFiles = [
  'apps/web/src/shared/ui/components.tsx',
  'apps/web/src/shared/ui/composition.tsx',
  'apps/web/src/shared/ui/draft-conflict.tsx',
  'apps/web/src/shared/ui/layout.ts',
  'apps/web/src/shared/ui/visual.ts',
  'apps/web/src/shared/ui/theme.ts',
];
function sharedExports(file) {
  const fullPath = path.join(frontendRoot, file);
  const sourceFile = program.getSourceFile(fullPath);
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return [];
  return checker.getExportsOfModule(moduleSymbol).map((symbol) => ({
    name: symbol.getName(),
    kind: symbol.flags & ts.SymbolFlags.Type ? 'type' : 'value',
  })).sort((a, b) => a.name.localeCompare(b.name));
}
const componentImports = new Map();
const sharedUiConsumers = [];
for (const sourceFile of program.getSourceFiles().filter((item) => isFrontendFile(item.fileName) && relative(item.fileName).startsWith('BotSalesAI_Frontend/apps/web/src/'))) {
  function visit(node) {
    if (ts.isImportDeclaration(node) && node.importClause && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const resolved = resolveFirstParty(node.moduleSpecifier.text, sourceFile.fileName);
      if (resolved && sharedUiFiles.some((file) => path.resolve(frontendRoot, file).toLowerCase() === resolved.toLowerCase())
        && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const element of node.importClause.namedBindings.elements) {
          const key = path.relative(frontendRoot, resolved).split(path.sep).join('/');
          const symbol = element.propertyName?.text ?? element.name.text;
          const rows = componentImports.get(`${key}#${symbol}`) ?? [];
          rows.push(relative(sourceFile.fileName));
          componentImports.set(`${key}#${symbol}`, rows);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
for (const file of sharedUiFiles) {
  for (const symbol of sharedExports(file)) {
    const consumers = componentImports.get(`${file}#${symbol.name}`) ?? [];
    sharedUiConsumers.push({ file, ...symbol, consumers: [...new Set(consumers)].sort(), consumerCount: new Set(consumers).size });
  }
}

const portalNames = new Set(['Autocomplete', 'Backdrop', 'Dialog', 'Drawer', 'Menu', 'Modal', 'Popover', 'Popper', 'Select', 'Snackbar', 'Tooltip']);
const portalConsumers = [];
for (const sourceFile of program.getSourceFiles().filter((item) => isFrontendFile(item.fileName) && relative(item.fileName).startsWith('BotSalesAI_Frontend/apps/web/src/'))) {
  function visit(node) {
    if (ts.isImportDeclaration(node) && node.importClause && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
      && (node.moduleSpecifier.text === '@mui/material' || node.moduleSpecifier.text.startsWith('@mui/material/'))) {
      if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const element of node.importClause.namedBindings.elements) {
          const name = element.propertyName?.text ?? element.name.text;
          if (portalNames.has(name)) portalConsumers.push({ source: relative(sourceFile.fileName), symbol: name, import: node.moduleSpecifier.text });
        }
      }
      if (node.moduleSpecifier.text !== '@mui/material' && node.importClause.name) {
        const name = node.moduleSpecifier.text.split('/').at(-1);
        if (portalNames.has(name)) portalConsumers.push({ source: relative(sourceFile.fileName), symbol: name, import: node.moduleSpecifier.text });
      }
    }
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && node.tagName.getText(sourceFile) === 'TextField'
      && node.attributes.properties.some((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'select')) {
      portalConsumers.push({ source: relative(sourceFile.fileName), symbol: 'TextField(select→Menu)', import: '@mui/material/TextField' });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
const portalConsumerInventory = [...portalConsumers.reduce((groups, consumer) => {
  const key = `${consumer.source}#${consumer.symbol}#${consumer.import}`;
  const group = groups.get(key) ?? { ...consumer, occurrences: 0 };
  group.occurrences++;
  groups.set(key, group);
  return groups;
}, new Map()).values()].sort((a, b) => a.source.localeCompare(b.source) || a.symbol.localeCompare(b.symbol));

const routeOwnerMappingVerified = routeRows.every((route) => route.resolvedOwnerExportSource
  && (route.routerWrapper || route.routerResolvedExportSource));
routeSetMatches = routeSetMatches && routeOwnerMappingVerified;
const routeSetParity = {
  canonicalRouteManifest: { path: routeManifestPath, version: routeData.version, status: routeData.status, routes: canonicalRoutes.length },
  generatedFrontendContract: { path: 'BotSalesAI_Frontend/packages/contracts/src/routes.json', routes: generatedRouteRows.length },
  routerPageBindings: pageBindings.size,
  routeImplementationRows: routeImpl.length,
  exactIdsAndPathsMatch: routeSetMatches,
  allOwnerAndRouterSymbolsResolve: routeOwnerMappingVerified,
  duplicateCanonicalIds,
  missingRouterBindings: canonicalRoutes.filter((route) => !pageBindings.has(route.id)).map((route) => route.id),
  routeRowsMissingImplementation: canonicalRoutes.filter((route) => !implById.has(route.id)).map((route) => route.id),
  implementationPathOrRouteMismatch: canonicalRoutes.filter((route) => {
    const implementation = implById.get(route.id);
    return !implementation || implementation.route !== route.path || !fs.existsSync(path.join(frontendRoot, implementation.source));
  }).map((route) => route.id),
  rolePresetCount: roles.length,
  roleNames: roles,
  routeStateRoleCaseCount: routeRows.reduce((sum, route) => sum + route.roleStateCases.length, 0),
  stateInventorySource: { path: routeManifestPath, stateSet: [...new Set(canonicalRoutes.flatMap((route) => route.states ?? []))].sort() },
  currentRoleStateEvidenceDocument: {
    path: 'BotSalesAI_Frontend/docs/route-state-role-matrix.json',
    generatedAt: roleStateMatrix.generatedAt,
    routeCount: roleStateMatrix.summary.routes,
    roles: roleStateMatrix.summary.roles,
    stateCasesPreviouslyReported: roleStateMatrix.summary.passedRouteRoleCases,
    use: 'Historical inventory/reference only; not current runtime proof for UIC01 or later source revisions.',
  },
};
const priorRoleMatrixById = new Map((roleStateMatrix.routes ?? []).map((route) => [route.id, route]));
const roleMatrixComparisons = routeRows.flatMap((route) => roles.map((role) => {
  const expected = route.roleAccess[role].expectedUiGate;
  const recorded = priorRoleMatrixById.get(route.routeId)?.access?.[role];
  const expectedDocumentValue = route.readPermission
    ? (expected === 'RENDER' ? 'ALLOWED_BY_CATALOG' : 'DENIED_BY_CATALOG')
    : (route.path.startsWith('/s/') ? 'ALLOWED_BY_CATALOG' : 'PUBLIC');
  return { routeId: route.routeId, role, expected: expectedDocumentValue, recorded: recorded ?? null, matches: recorded === expectedDocumentValue };
}));
routeSetParity.roleExpectationReconciliation = {
  comparedCases: roleMatrixComparisons.length,
  matches: roleMatrixComparisons.filter((row) => row.matches).length,
  mismatches: roleMatrixComparisons.filter((row) => !row.matches),
  verdict: roleMatrixComparisons.every((row) => row.matches) ? 'PASS_SOURCE_EXPECTATION_PARITY_ONLY' : 'FAIL',
  limitation: 'The older matrix is used only to compare access expectations from rolePresets and PermissionGate; it is not browser proof or backend authorization evidence.',
};
for (const route of routeRows) {
  for (const cell of route.roleStateCases) {
    cell.priorRoleMatrixAccess = priorRoleMatrixById.get(route.routeId)?.access?.[cell.role] ?? null;
  }
}
routeSetMatches = routeSetMatches && roleMatrixComparisons.every((row) => row.matches);
routeSetParity.exactIdsAndPathsMatch = routeSetMatches;

const sourceDiffSinceAudit = git(['diff', '--name-only', `${auditHead}..HEAD`, ...sourceScope]).trim().split(/\r?\n/).filter(Boolean);
const frontendUntrackedBeforeTask = untracked.filter((item) => item.startsWith('BotSalesAI_Frontend/')
  && !item.startsWith('BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC01/'));
const repositoryUntrackedBeforeTask = untracked.filter((item) => !item.startsWith('BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC01/'));
const untrackedCandidates = frontendUntrackedBeforeTask.filter((item) => !item.startsWith('BotSalesAI_Frontend/evidence/')
  && !/(^|\/)(dist|node_modules|playwright-report|test-results)(\/|$)/.test(item));
const outsideEvidence = tracked.filter((item) => item.startsWith('BotSalesAI_Frontend/evidence/'));
const excludedEvidenceByPrefix = {};
for (const item of outsideEvidence) {
  const segments = item.split('/');
  const prefix = segments.length > 3 ? segments.slice(0, 3).join('/') : 'BotSalesAI_Frontend/evidence/<root-files>';
  excludedEvidenceByPrefix[prefix] = (excludedEvidenceByPrefix[prefix] ?? 0) + 1;
}
const kitTracked = tracked.filter((item) => item.startsWith('botsales-kit/'));
const sourceHashProofs = [
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/REPORT.md',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/audit-summary.json',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/route-coverage.json',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/source-preservation.json',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/BUNDLE_MANIFEST.json',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/backdrop-parity.json',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/sw-failure-analysis.json',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/dashboard-occupancy.json',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/chrome-dialog-390.png',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/firefox-dialog-390.png',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/chromium-dialog-1440.png',
  'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261016/chrome-dashboard-1440.png',
].map((repoPath) => ({ path: repoPath, sha256: sha256(path.join(repoRoot, repoPath)) }));

const inventoryDoc = {
  schemaVersion: '1.0',
  task: 'UIC01',
  capturedAt: new Date().toISOString(),
  repository: {
    head: git(['rev-parse', 'HEAD']).trim(),
    branch: git(['branch', '--show-current']).trim(),
    upstream: git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).trim(),
    trackedPathCount: tracked.length,
    frontendTrackedPathCount: frontendTracked.length,
    frontendRuntimeAndProjectPathCount: frontendCodeInventory.length,
    frontendEvidenceReferencePathCount: frontendEvidence.length,
    botsalesKitTrackedPathCount: kitTracked.length,
    rootAndWorkflowTrackedPathCount: tracked.length - frontendTracked.length - kitTracked.length,
    untrackedPathCountBeforeUIC01Artifacts: repositoryUntrackedBeforeTask.length,
    frontendUntrackedPathCountBeforeUIC01Artifacts: frontendUntrackedBeforeTask.length,
    preexistingNonEvidenceFrontendCandidates: untrackedCandidates.map((repoPath) => ({
      path: repoPath,
      disposition: 'PRESERVE_REFERENCE_ONLY',
      reason: 'Không nằm trong app source/public/tests/config; tên không có extension import được. Không đọc, sửa hoặc xóa nội dung.'
    })),
    untrackedPathSetSha256: sha256Text(repositoryUntrackedBeforeTask.slice().sort().join('\0')),
    scopeDiffSinceAuditHead: { base: auditHead, changedPaths: sourceDiffSinceAudit, sourceInputsUnchanged: sourceDiffSinceAudit.length === 0 },
  },
  treatmentCounts: inventory.reduce((counts, item) => {
    counts[item.treatment] = (counts[item.treatment] ?? 0) + 1;
    return counts;
  }, {}),
  files: inventory,
  exclusions: {
    evidence: {
      trackedPathCount: frontendEvidence.length,
      prefixes: excludedEvidenceByPrefix,
      disposition: 'REFERENCE_READONLY',
      reason: 'Audit bundles, CI outputs, screenshots, generated matrices and prior acceptance snapshots are evidence/reference material, not application imports. Relevant UIC00 proof is individually hashed in sourceProofs; no historical result is upgraded to current PASS.'
    },
    untrackedCandidateCount: untrackedCandidates.length,
    ignoredDependencies: {
      path: 'BotSalesAI_Frontend/node_modules',
      exists: fs.existsSync(path.join(frontendRoot, 'node_modules')),
      disposition: 'THIRD_PARTY_VERIFY',
      reason: 'Installed dependency tree is excluded from Git inventory; exact package versions come from package-lock.json and runtime commands, package internals are not treated as first-party source.'
    },
    backend: { trackedPathCount: tracked.filter((item) => item.startsWith('BotSalesAI_Backend/')).length, disposition: 'OUT_OF_SCOPE', reason: 'Backend directory is a local placeholder; this work verifies React with synthetic MSW data only.' },
    fullProductKit: { trackedPathCount: kitTracked.length, includedCanonicalInputCount: requiredInputs.filter((item) => item.startsWith('botsales-kit/')).length, disposition: 'REFERENCE_READONLY', reason: 'Only canonical UI/route/permission/API inputs and Frontend CLI guards are fingerprinted; full-product implementation and evidence remain outside this task.' },
  },
};

const routeDoc = {
  schemaVersion: '1.0',
  task: 'UIC01',
  capturedAt: inventoryDoc.capturedAt,
  routeSetParity,
  routes: routeRows,
  sharedUiPublicExports: sharedUiConsumers,
  portalConsumers: portalConsumerInventory,
  importGraph: { unresolvedLocalImports, externalPackageCount: externalPackages.size, externalPackages: [...externalPackages].sort() },
  conditionalUiOwners: [
    { owner: 'router.tsx:GlobalGate', condition: 'Session loading or missing session; excluded for R01/R61 and applied to other non-shop routes.', disposition: 'Inventory now; route/role rendering UIC07.' },
    { owner: 'router.tsx:PermissionGate', condition: 'Shop route with readPermission absent from membership.permissions; renders warning and workspace link.', disposition: 'Expected permission source mapped per route; render check UIC07.' },
    { owner: 'router.tsx:Suspense/Loading', condition: 'Lazy page module is pending; shop route uses inset fallback.', disposition: 'Fallback is in route import closure; state/action proof UIC07.' },
    { owner: 'router.tsx:RouteError', condition: 'Route loader/render error; shop and non-shop shells differ.', disposition: 'Error boundary source mapped; recovery proof UIC07.' },
    { owner: 'router.tsx:NotFound', condition: 'No canonical route matches.', disposition: 'Fallback source mapped; direct unknown-route proof UIC07.' },
    { owner: 'app/DraftNavigationGuard.tsx', condition: 'Dirty draft blocks navigation and offers discard/continue choices.', disposition: 'Visible dialog/backdrop owner; baseline refreshed before UIC02.' },
    { owner: 'MUI portal components', condition: 'Dialog, Drawer, Menu, Popover, Popper, Select, Autocomplete, Snackbar, Tooltip, Modal or Backdrop consumer.', disposition: 'Consumers discovered in portalConsumers; runtime behavior assigned to UIC02/UIC05/UIC08.' },
    { owner: 'apps/web/src/app/tokens.css', condition: 'Generated semantic CSS tokens loaded by app bootstrap.', disposition: 'GENERATE_VERIFY; source is botsales-kit/design/tokens.json and generator freshness checked.' },
    { owner: 'apps/web/public/mockServiceWorker.js', condition: 'MSW worker asset used only by synthetic demo mode.', disposition: 'GENERATE_VERIFY; lifecycle investigation remains open in UIC03.' },
  ],
  verificationBoundary: {
    roleExpectations: 'Computed only from canonical rolePresets + route readPermission + observed PermissionGate condition; proves intended UI gate expectation, not server authorization.',
    routeStateRoleCases: routeSetParity.routeStateRoleCaseCount,
    casesStatus: 'INVENTORIED_NOT_REVALIDATED',
    visualBaseline: 'UIC00 Playwright Firefox 155 and installed Chrome 155 match the configured browser projects and source inputs are byte-identical. The separate system Firefox 157 is reserved for native-method checks; do not substitute it for Playwright proof.',
    routeMatrix: 'UIC00 rendered 61 canonical routes at 390/1440 CSS px on its recorded browser versions; this UIC01 map reconciles the current route set and does not claim current route-state-role behavior PASS.',
  },
};

const baselineDoc = {
  schemaVersion: '1.0',
  task: 'UIC01',
  capturedAt: inventoryDoc.capturedAt,
  status: 'PASS_SCOPED',
  sourceCommit: inventoryDoc.repository.head,
  priorAuditSourceCommit: auditHead,
  sourceIdentity: {
    verdict: sourceDiffSinceAudit.length === 0 ? 'PASS' : 'FAIL',
    changedSourcePathsSinceAudit: sourceDiffSinceAudit,
    explanation: sourceDiffSinceAudit.length === 0
      ? 'Git diff confirms application, package, tests, scripts, lockfile, workflow and canonical token/route/permission inputs have not changed since the measured UIC00 baseline.'
      : 'At least one source/config input changed; prior rendered observations are stale for that owner and must be recaptured.',
  },
  browserToolchain: {
    node: process.version,
    npm: '11.17.0',
    npmProbe: 'Observed with npm.cmd --version from BotSalesAI_Frontend; direct Node child-process spawning of .cmd is not supported on Windows.',
    playwright: requireFromFrontend('@playwright/test/package.json').version,
    recordedUic00: { chrome: '155.0.8059.40', firefox: '155', chromium: '153' },
    currentlyInstalled: { chrome: '155.0.8059.40', firefox: '157.0.1' },
    lockedFrontendPackages: lockedVersions,
    browserProbe: {
      observedAt: '2026-10-17',
      method: 'PowerShell read of executable ProductVersion at registered App Paths.',
      executables: {
        chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        firefox: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      },
    },
    playwrightManaged: {
      version: '1.63.0',
      firefoxRevision: '1543',
      firefoxProductVersion: '155.0',
      firefoxExecutable: 'C:\\Users\\Joker-PC\\AppData\\Local\\ms-playwright\\firefox-1543\\firefox\\firefox.exe',
      chromiumRevision: '1243',
      chromiumProductVersion: '153.0.8010.12',
      chromiumExecutable: 'C:\\Users\\Joker-PC\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
      verifiedBy: 'node node_modules/@playwright/test/cli.js install --list; Get-Item VersionInfo.ProductVersion on each reported executable path.',
    },
    supported: { chromeMinimum: '154', firefoxMinimum: '155' },
    currentChromiumBundledVersion: 'NOT_REMEASURED_IN_UIC01',
  },
  ownerBaselines: [
    {
      owner: 'apps/web/src/shared/ui/theme.ts', task: 'UIC02', finding: 'UI-CONS-01',
      before: 'VISIBLE_BACKDROP 6/6 cells were rgba(0,0,0,0.5); canonical token #090C12CC is rgba(9,12,18,0.8).',
      evidence: ['backdrop-parity.json', 'chrome-dialog-390.png', 'firefox-dialog-390.png', 'chromium-dialog-1440.png'],
      verdict: 'REUSABLE_FOR_CHROME155_AND_PLAYWRIGHT_FIREFOX155; supplemental Chromium153 stays outside supported-browser acceptance.',
    },
    {
      owner: 'apps/web/src/mocks/browser.ts', task: 'UIC03', finding: 'UI-CONS-02',
      before: 'Chrome155 full run 30 passed/1 failed on ServiceWorker update pageerror; targeted recheck 4/4 passed. Worker request returned HTTP 200; root cause remains unverified.',
      evidence: ['audit-summary.json', 'sw-failure-analysis.json', 'chrome-playwright.log', 'chrome-recheck.log'],
      verdict: 'KEEP_BOTH_RUNS; investigate lifecycle with actual Chrome155 and current Firefox157; no fixed claim.',
    },
    {
      owner: 'apps/web/src/modules/dashboard/index.tsx', task: 'UIC04', finding: 'UI-CONS-03',
      before: '1440px measured row 1152px, financial panel 699.06px, remaining track 452.94px.',
      evidence: ['dashboard-occupancy.json', 'chrome-dashboard-1440.png'],
      verdict: 'CANDIDATE_ONLY; purpose/intent unverified; use matched Playwright Chrome155/Firefox155 and seed before any edit if source change is proposed.',
    },
  ],
  proofHashes: sourceHashProofs,
  reusedEvidenceLimits: [
    'UIC00 baseline source commit differs from current HEAD only in documentation/evidence; source inputs are byte-identical by Git path diff.',
    'Firefox binary updated from 155 in UIC00 to installed 157.0.1; its old screenshot/measurement is a historical observation and cannot serve as paired current-runtime baseline.',
    'UIC00 Chrome full run retained 30/31 first attempt and 4/4 targeted recheck separately; neither is rewritten or averaged.',
    'UIC00 role/state matrix document was generated 2026-10-13 and is inventory/reference, not current proof for these sources.',
    'No current browser UI action or human review was performed during UIC01; baseline images are referenced only under the explicit source/browser conditions above.',
  ],
};

const outputFiles = {
  'inventory.json': inventoryDoc,
  'route-closure.json': routeDoc,
  'baseline.json': baselineDoc,
};
for (const [name, value] of Object.entries(outputFiles)) {
  fs.writeFileSync(path.join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
const hashes = [
  'generate-uic01-evidence.mjs',
  ...Object.keys(outputFiles),
  ...(fs.existsSync(path.join(outputDir, 'REPORT.md')) ? ['REPORT.md'] : []),
].map((name) => ({ path: name, sha256: sha256(path.join(outputDir, name)), bytes: fs.statSync(path.join(outputDir, name)).size }));
fs.writeFileSync(path.join(outputDir, 'SHA256SUMS.json'), `${JSON.stringify({ task: 'UIC01', algorithm: 'SHA-256', files: hashes }, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  task: 'UIC01',
  head: inventoryDoc.repository.head,
  branch: inventoryDoc.repository.branch,
  tracked: inventoryDoc.repository.trackedPathCount,
  frontendInventoryFiles: inventory.length,
  frontendEvidenceExcluded: frontendEvidence.length,
  untrackedPreserved: repositoryUntrackedBeforeTask.length,
  untrackedCandidateCount: untrackedCandidates.length,
  appSourceFiles: frontendTracked.filter((item) => item.startsWith('BotSalesAI_Frontend/apps/web/src/')).length,
  routes: canonicalRoutes.length,
  routeSetMatches,
  routeStateRoleCases: routeSetParity.routeStateRoleCaseCount,
  unresolvedLocalImports: unresolvedLocalImports.length,
  sharedPublicExports: sharedUiConsumers.length,
  portalConsumers: portalConsumerInventory.length,
  unresolvedLocalImports,
  sourceInputsUnchangedSinceAudit: sourceDiffSinceAudit.length === 0,
  status: routeSetMatches && unresolvedLocalImports.length === 0 && sourceDiffSinceAudit.length === 0 ? 'PASS' : 'FAIL',
}, null, 2));
if (!routeSetMatches || unresolvedLocalImports.length || sourceDiffSinceAudit.length) process.exitCode = 1;
