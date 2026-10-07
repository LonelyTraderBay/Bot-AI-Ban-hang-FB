import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
const root = process.cwd();
const require = createRequire(path.join(root, 'package.json'));
const ts = require('typescript');
const audit = path.join(root, 'evidence/frontend-architecture-audit-20261002');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
const source = path.join(root, 'apps/web/src');
const files = walk(source).filter(f => /\.(ts|tsx)$/.test(f));
const inventory = [], functions = [], calls = {}, jsx = {}, suspicious = [];
let anyTypes = 0, assertionsAny = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const layer = relative(file).slice('apps/web/src/'.length).split('/')[0];
  inventory.push({ file: relative(file), layer, lines: content.split(/\r?\n/).length, characters: content.length, bytes: Buffer.byteLength(content), longLines: content.split(/\r?\n/).filter(l => l.length > 1500).length });
  if (/@ts-(ignore|nocheck)/.test(content)) suspicious.push({ file: relative(file), kind: 'type-suppression' });
  const record = (kind, node) => suspicious.push({ file: relative(file), kind, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1 });
  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) anyTypes++;
    if (ts.isAsExpression(node) && node.type.kind === ts.SyntaxKind.AnyKeyword) assertionsAny++;
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      calls[name] = (calls[name] || 0) + 1;
      if (name === 'fetch') record('fetch-call', node);
      if (name === 'dateTime' && node.arguments?.length === 1) record('dateTime-default-timezone', node);
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(tree); jsx[name] = (jsx[name] || 0) + 1;
    }
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === 'dangerouslySetInnerHTML') record('raw-html-jsx', node);
    if (ts.isPropertyAccessExpression(node) && ['localStorage', 'sessionStorage', 'innerHTML'].includes(node.name.text)) record(node.name.text, node);
    if (ts.isIdentifier(node) && ['localStorage', 'sessionStorage'].includes(node.text)) record(node.text + '-identifier', node);
    if (ts.isNumericLiteral(node) && node.text === '100' && ts.isPropertyAssignment(node.parent) && node.parent.name.getText(tree) === 'limit') record('limit-100', node);
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      let jsxNodes = 0;
      const scan = child => { if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) jsxNodes++; ts.forEachChild(child, scan); };
      scan(node.body);
      functions.push({ file: relative(file), name: node.name.text, characters: node.end - node.getStart(tree), jsxNodes, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1 });
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
const groups = Object.fromEntries([...new Set(inventory.map(f => f.layer))].map(layer => [layer, { files: inventory.filter(f => f.layer === layer).length, lines: inventory.filter(f => f.layer === layer).reduce((n, f) => n + f.lines, 0) }]));
const modules = fs.readdirSync(path.join(source, 'modules'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => ({ name: e.name, files: inventory.filter(f => f.file.startsWith('apps/web/src/modules/' + e.name + '/')).map(f => f.file) }));
const runtime = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf8')).dependencies;
const installed = Object.fromEntries(['react','react-dom','@mui/material','@tanstack/react-query','react-router-dom','typescript','vite'].map(name => [name, require(name + '/package.json').version]));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const uniqueVersions = Object.fromEntries(Object.keys(installed).map(name => [name, [...new Set(Object.entries(lock.packages).filter(([p]) => p.endsWith('node_modules/' + name)).map(([, p]) => p.version))]]));
const router = fs.readFileSync('apps/web/src/app/router.tsx', 'utf8');
const routeManifest = JSON.parse(fs.readFileSync('botsales-kit/contracts/route-manifest.json', 'utf8'));
const mappedIds = [...router.matchAll(/^\s+(R\d{2}):/gm)].map(m => m[1]);
const report = {
  checkedAt: new Date().toISOString(), parser: ts.version, sourceFiles: files.length, groups, modules,
  routes: { canonical: routeManifest.routes.length, mapped: mappedIds.length, missing: routeManifest.routes.map(r => r.id).filter(id => !mappedIds.includes(id)), lazyDeclarations: (router.match(/= lazy\(/g) || []).length },
  foundations: { QueryClient: calls.QueryClient || 0, createBrowserRouter: calls.createBrowserRouter || 0, createTheme: calls.createTheme || 0, QueryClientProvider: jsx.QueryClientProvider || 0, ThemeProvider: jsx.ThemeProvider || 0, RouterProvider: jsx.RouterProvider || 0 },
  types: { anyTypes, assertionsAny, typeSuppressions: suspicious.filter(f => f.kind === 'type-suppression').length },
  calls: { useApi: calls.useApi || 0, usePagedApi: calls.usePagedApi || 0, useCommand: calls.useCommand || 0, useForm: calls.useForm || 0, useTranslation: calls.useTranslation || 0, dateTime: calls.dateTime || 0 },
  fetchCalls: suspicious.filter(f => f.kind === 'fetch-call'),
  rawHTMLorStorage: suspicious.filter(f => /html|Storage/.test(f.kind)),
  reviewPoints: { defaultTimezoneCalls: suspicious.filter(f => f.kind === 'dateTime-default-timezone'), limit100: suspicious.filter(f => f.kind === 'limit-100') },
  readability: { totalLines: inventory.reduce((n,f)=>n+f.lines,0), longLinesOver1500Chars: inventory.reduce((n,f)=>n+f.longLines,0), moduleLines: groups.modules.lines, moduleFiles: groups.modules.files, largestJSXFunctions: functions.filter(f=>f.jsxNodes>0).sort((a,b)=>b.characters-a.characters).slice(0,10) },
  dependencies: { declaredRuntime: Object.keys(runtime).length, installed, uniqueVersions, lockVersion: lock.lockfileVersion },
  toolingObservation: { sourceCheckerWindowsModulePredicate: path.join(root,'apps/web/src/modules/catalog/index.tsx').includes('/modules/'), expectedModule: true, note: 'check-source.mjs uses file.includes(/modules/ with forward slashes). On Windows this branch is false; literal-color check is not exercised by that branch. Not proof of a color violation.' },
  files: inventory,
};
fs.writeFileSync(path.join(audit, 'structure.json'), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sourceFiles:report.sourceFiles,groups,modules:modules.length,routes:report.routes,foundations:report.foundations,types:report.types,calls:report.calls,fetchCalls:report.fetchCalls,defaultTimezone:report.reviewPoints.defaultTimezoneCalls.length,limit100:report.reviewPoints.limit100.length,readability:{...report.readability,largestJSXFunctions:report.readability.largestJSXFunctions.slice(0,3)},installed,toolingObservation:report.toolingObservation},null,2));
