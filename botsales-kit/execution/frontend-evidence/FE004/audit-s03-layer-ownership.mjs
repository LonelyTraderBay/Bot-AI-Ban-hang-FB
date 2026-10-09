import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const frontendRoot = process.cwd();
const require = createRequire(path.join(frontendRoot, 'package.json'));
const ts = require('typescript');
const repositoryRoot = path.resolve(frontendRoot, '..');
const kitRoot = path.join(repositoryRoot, 'botsales-kit');
const sourceRoot = path.join(frontendRoot, 'apps/web/src');
const configPath = path.join(frontendRoot, 'apps/web/tsconfig.json');
const configRead = ts.readConfigFile(configPath, ts.sys.readFile);
if (configRead.error) throw new Error(ts.flattenDiagnosticMessageText(configRead.error.messageText, '\n'));
const config = ts.parseJsonConfigFileContent(configRead.config, ts.sys, path.dirname(configPath));
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(entry.name)) files.push(file);
  }
}
walk(sourceRoot);
files.sort();
const fileSet = new Set(files.map(file => path.resolve(file)));
const relative = file => path.relative(frontendRoot, file).replaceAll('\\', '/');
function owner(file) {
  const rel = path.relative(sourceRoot, file).replaceAll('\\', '/');
  if (rel.startsWith('app/')) return { kind: 'app', name: 'app' };
  if (rel.startsWith('modules/')) return { kind: 'module', name: rel.split('/')[1] };
  if (rel.startsWith('shared/')) return { kind: 'shared', name: rel.split('/')[1] };
  if (rel.startsWith('mocks/')) return { kind: 'mock', name: 'mocks' };
  return { kind: 'entry', name: 'entry' };
}
const edges = new Map(files.map(file => [path.resolve(file), []]));
const imports = [];
const parseErrors = [];
for (const file of files) {
  const absolute = path.resolve(file);
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  for (const diagnostic of source.parseDiagnostics) parseErrors.push({ file: relative(file), message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n') });
  function add(specifier, syntax) {
    const resolved = ts.resolveModuleName(specifier, file, config.options, ts.sys).resolvedModule?.resolvedFileName;
    const target = resolved ? path.resolve(resolved) : null;
    const localAlias = specifier.startsWith('@/') || specifier.startsWith('@botsales/') || specifier.startsWith('.') || specifier.startsWith('..');
    // CSS is consumed by Vite's asset pipeline, not TypeScript's module resolver.
    const buildTimeAsset = localAlias && /\.(?:css|scss|sass|less)(?:\?.*)?$/.test(specifier);
    const record = {
      from: relative(file),
      fromOwner: owner(file),
      specifier,
      syntax,
      to: target && fileSet.has(target) ? relative(target) : null,
      toOwner: target && fileSet.has(target) ? owner(target) : null,
      workspacePackage: target?.startsWith(path.join(frontendRoot, 'packages') + path.sep) || false,
      buildTimeAsset,
      unresolvedLocal: localAlias && !target && !buildTimeAsset,
    };
    imports.push(record);
    if (target && fileSet.has(target)) edges.get(absolute).push(target);
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) add(node.moduleSpecifier.text, ts.isImportDeclaration(node) ? 'import' : 'export');
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) add(node.arguments[0].text, 'dynamic-import');
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const violations = [];
for (const item of imports) {
  if (item.unresolvedLocal) violations.push(`unresolved local import ${item.from} -> ${item.specifier}`);
  if (!item.toOwner) continue;
  if (item.fromOwner.kind === 'module' && item.toOwner.kind === 'module' && item.fromOwner.name !== item.toOwner.name) violations.push(`cross-feature import ${item.from} -> ${item.to}`);
  if (item.fromOwner.kind === 'module' && ['app', 'mock'].includes(item.toOwner.kind)) violations.push(`feature imports app/mock ${item.from} -> ${item.to}`);
  if (item.fromOwner.kind === 'shared' && ['app', 'module', 'mock'].includes(item.toOwner.kind)) violations.push(`shared imports business/app/mock ${item.from} -> ${item.to}`);
  if (item.fromOwner.kind === 'app' && item.toOwner.kind === 'module' && !new RegExp(`^apps/web/src/modules/${item.toOwner.name}/index\\.(?:ts|tsx)$`).test(item.to)) violations.push(`app bypasses public module entry ${item.from} -> ${item.to}`);
}

const visited = new Set();
const active = new Set();
const cycles = [];
function visitGraph(file, trail = []) {
  if (active.has(file)) {
    cycles.push([...trail, file].map(relative));
    return;
  }
  if (visited.has(file)) return;
  visited.add(file);
  active.add(file);
  for (const target of edges.get(file) ?? []) visitGraph(target, [...trail, file]);
  active.delete(file);
}
for (const file of edges.keys()) visitGraph(file);

const layerCounts = {};
for (const item of imports) {
  const from = item.fromOwner.kind === 'module' ? `module:${item.fromOwner.name}` : item.fromOwner.kind;
  const to = item.toOwner ? (item.toOwner.kind === 'module' ? `module:${item.toOwner.name}` : item.toOwner.kind) : item.workspacePackage ? 'workspace-package' : 'external-package';
  const key = `${from} -> ${to}`;
  layerCounts[key] = (layerCounts[key] ?? 0) + 1;
}

const modulesRoot = path.join(sourceRoot, 'modules');
const modules = fs.readdirSync(modulesRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const publicEntries = modules.map(name => path.join(modulesRoot, name, 'index.tsx'));
const missingPublicEntries = publicEntries.filter(file => !fs.existsSync(file)).map(relative);
const routerPath = path.join(sourceRoot, 'app/router.tsx');
const routerText = fs.readFileSync(routerPath, 'utf8');
const lazyModuleNames = [...new Set([...routerText.matchAll(/import\(['"]\.\.\/modules\/([^'"/]+)['"]\)/g)].map(match => match[1]))].sort();
const routeManifest = JSON.parse(fs.readFileSync(path.join(kitRoot, 'contracts/route-manifest.json'), 'utf8'));
const routerRouteIds = [...new Set([...routerText.matchAll(/^\s+(R\d+):\s+[A-Za-z_$][\w$]*,/gm)].map(match => match[1]))].sort();
const canonicalRouteIds = routeManifest.routes.map(route => route.id).sort();
const appFiles = files.filter(file => owner(file).kind === 'app');
const sharedAreas = [...new Set(files.filter(file => owner(file).kind === 'shared').map(file => owner(file).name))].sort();
const textByFile = new Map(files.map(file => [relative(file), fs.readFileSync(file, 'utf8')]));
const providerOwners = {};
for (const [provider, matcher] of Object.entries({
  queryClientCreation: /\bnew\s+QueryClient\s*\(/g,
  routerCreation: /\bcreateBrowserRouter\s*\(/g,
  queryProvider: /<QueryClientProvider\b/g,
  routerProvider: /<RouterProvider\b/g,
  themeProvider: /<ThemeProvider\b/g,
})) {
  providerOwners[provider] = [];
  for (const [file, text] of textByFile) for (const match of text.matchAll(matcher)) providerOwners[provider].push({ file, line: text.slice(0, match.index).split('\n').length });
}

const lock = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'package-lock.json'), 'utf8'));
const dependencyVersions = {};
for (const name of ['react-router-dom', '@mui/material', '@tanstack/react-query']) {
  dependencyVersions[name] = Object.entries(lock.packages).filter(([entry]) => entry === `node_modules/${name}` || entry.endsWith(`/node_modules/${name}`)).map(([entry, value]) => ({ path: entry, version: value.version }));
}

const result = {
  status: 'PASS',
  sourceFiles: files.length,
  parseErrors,
  imports: imports.length,
  localEdges: [...edges.values()].reduce((total, value) => total + value.length, 0),
  layerCounts,
  violations,
  cycles,
  appCompositionFiles: appFiles.map(relative),
  moduleCount: modules.length,
  modulePublicEntries: publicEntries.map(relative),
  missingPublicEntries,
  modulesLoadedThroughRouter: lazyModuleNames,
  routerMissingModules: modules.filter(name => !lazyModuleNames.includes(name)),
  routerExtraModules: lazyModuleNames.filter(name => !modules.includes(name)),
  sharedAreas,
  apiOwners: [...new Set(imports.filter(item => item.fromOwner.kind === 'module' && item.specifier.startsWith('@/shared/api/')).map(item => item.fromOwner.name))].sort(),
  canonicalRoutes: canonicalRouteIds.length,
  routerRoutes: routerRouteIds.length,
  routeCoverageMissing: canonicalRouteIds.filter(id => !routerRouteIds.includes(id)),
  routeCoverageExtra: routerRouteIds.filter(id => !canonicalRouteIds.includes(id)),
  providerOwners,
  dependencyVersions,
};
if (parseErrors.length || violations.length || cycles.length || missingPublicEntries.length || result.routerMissingModules.length || result.routerExtraModules.length || result.routeCoverageMissing.length || result.routeCoverageExtra.length) result.status = 'FAIL';
for (const name of Object.keys(dependencyVersions)) if (dependencyVersions[name].length !== 1) result.status = 'FAIL';
for (const name of ['queryClientCreation', 'routerCreation', 'queryProvider', 'routerProvider', 'themeProvider']) if (providerOwners[name].length !== 1) result.status = 'FAIL';
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
