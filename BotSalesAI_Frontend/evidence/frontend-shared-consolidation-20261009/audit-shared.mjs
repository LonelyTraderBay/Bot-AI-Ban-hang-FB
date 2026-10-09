import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {createUiBindings} from '../../scripts/ui-bindings.mjs';

const root = path.resolve(import.meta.dirname, '../..'), repo = path.dirname(root), output = import.meta.dirname;
const rel = file => path.relative(root, file).replaceAll('\\', '/');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isSymbolicLink() ? [] : e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const files = walk(path.join(root,'apps/web/src')).filter(f => /\.[cm]?[jt]sx?$/.test(f));
const bindings = createUiBindings(root, files), {program, checker} = bindings;
const unalias = input => {let s=input; const seen=new Set(); while(s?.flags & ts.SymbolFlags.Alias){if(seen.has(s))return null;seen.add(s);s=checker.getAliasedSymbol(s);}return s;};
const loc = node => {const position=node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());return {file:rel(node.getSourceFile().fileName),line:position.line+1,column:position.character+1};};
const functions = [], functionBySymbol = new Map();
function hasJsx(node) {if(ts.isJsxElement(node)||ts.isJsxSelfClosingElement(node)||ts.isJsxFragment(node))return true;return Boolean(ts.forEachChild(node,hasJsx));}
for(const file of files){const sf=program.getSourceFile(file); if(!sf)throw Error('Missing source '+file); for(const statement of sf.statements){
 let fn, name;
 if(ts.isFunctionDeclaration(statement)&&statement.name&&statement.body){fn=statement;name=statement.name;}
 else if(ts.isVariableStatement(statement)) for(const d of statement.declarationList.declarations){if(ts.isIdentifier(d.name)&&d.initializer&&(ts.isArrowFunction(d.initializer)||ts.isFunctionExpression(d.initializer))&&hasJsx(d.initializer)){const symbol=unalias(checker.getSymbolAtLocation(d.name));const item={node:d.initializer,name:d.name.text,...loc(d),symbol,exported:statement.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)||false};functions.push(item);functionBySymbol.set(symbol,item);}}
 if(fn&&hasJsx(fn.body)){const symbol=unalias(checker.getSymbolAtLocation(name));const item={node:fn,name:name.text,...loc(fn),symbol,exported:fn.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)||false};functions.push(item);functionBySymbol.set(symbol,item);}
}}
const ownerFiles = new Set(['apps/web/src/shared/ui/components.tsx','apps/web/src/shared/ui/composition.tsx','apps/web/src/shared/ui/draft-conflict.tsx']);
const publicApis=functions.filter(f=>ownerFiles.has(f.file)&&f.exported);
if(publicApis.length!==28)throw Error('Discover current API changes rather than forcing historical count: '+publicApis.length);
const apiSymbols=new Map(publicApis.map(f=>[f.symbol,f]));
const routeMap=JSON.parse(fs.readFileSync(path.join(root,'docs/route-implementation.json')));
const manifest=JSON.parse(fs.readFileSync(path.join(repo,'botsales-kit/contracts/route-manifest.json'))).routes;
const routeEntries=routeMap.map(r=>{const f=functions.find(f=>f.file===r.source&&f.name===r.component);if(!f)throw Error('Missing route function '+r.routeId); const m=manifest.find(m=>m.id===r.routeId);return {metadata:m,entry:f};});
if(routeEntries.length!==54)throw Error('Unexpected canonical route count');
const routerSource=program.getSourceFile(path.join(root,'apps/web/src/app/router.tsx'));
const registryDeclaration=routerSource.statements.filter(ts.isVariableStatement).flatMap(s=>[...s.declarationList.declarations]).find(d=>d.name.getText()==='pages');
if(!registryDeclaration?.initializer||!ts.isObjectLiteralExpression(registryDeclaration.initializer))throw Error('Router registry needs manual resolution');
const registrySlots=registryDeclaration.initializer.properties.map(p=>{if(!ts.isPropertyAssignment(p)||!ts.isIdentifier(p.initializer))throw Error('Unknown registry slot');return {id:p.name.getText().replaceAll("'",'').replaceAll('"',''),component:p.initializer.text,...loc(p)};});
if(registrySlots.length!==manifest.length||new Set(registrySlots.map(r=>r.id)).size!==manifest.length)throw Error('Router registry cardinality mismatch');
for(const {metadata,entry} of routeEntries){const slot=registrySlots.find(s=>s.id===metadata.id);if(!slot||slot.component!==(metadata.id==='R19'?'OrderPage':entry.name))throw Error('Router/documented entry mismatch '+metadata.id);}
const routesByFunction = new Map();for(const {metadata,entry} of routeEntries){const list=routesByFunction.get(entry)||[];list.push(metadata.id);routesByFunction.set(entry,list);}
const importsByFile=new Map();
for(const file of files){const sf=program.getSourceFile(file),imports=new Map();for(const s of sf.statements){if(!ts.isImportDeclaration(s)||!ts.isStringLiteral(s.moduleSpecifier)||!s.importClause)continue;const module=s.moduleSpecifier.text;if(s.importClause.name)imports.set(s.importClause.name.text,{module,imported:'default'});const named=s.importClause.namedBindings;if(named&&ts.isNamedImports(named))for(const e of named.elements)imports.set(e.name.text,{module,imported:e.propertyName?.text||e.name.text});}importsByFile.set(rel(file),imports);}
function classify(tag){
 const node=ts.isPropertyAccessExpression(tag)?tag.name:tag,symbol=unalias(checker.getSymbolAtLocation(node)),api=apiSymbols.get(symbol),local=functionBySymbol.get(symbol),reference=bindings.reference(tag),name=tag.getText();
 if(api)return {category:'PROJECT_SHARED',name:api.name,target:api};
 if(local)return {category:local.file.startsWith('apps/web/src/shared/')?'PROJECT_SHARED_OTHER':local.file.startsWith('apps/web/src/app/')?'APP_OWNER':'FEATURE_LOCAL',name:local.name,target:local};
 if(ts.isIdentifier(tag)&&/^[a-z]/.test(name))return {category:'NATIVE',name};
 const imp=importsByFile.get(rel(tag.getSourceFile().fileName))?.get(name);
 if(imp?.module.startsWith('@mui/icons-material'))return {category:'MUI_ICON',name};
 if(imp?.module==='recharts')return {category:'CHART_LIBRARY',name};
 if(imp?.module.startsWith('@mui/material')||imp?.module.startsWith('@mui/system'))return {category:'MUI_PRIMITIVE',name:imp.imported==='default'?imp.module.split('/').at(-1):imp.imported};
 if(reference?.owner==='mui')return {category:'MUI_PRIMITIVE',name:reference.exportName};
 if(imp)return {category:'EXTERNAL_OR_PROVIDER',name,module:imp.module};
 const declarations=symbol?.declarations||[],source=declarations[0]?.getSourceFile().fileName;
 const sourceFile=rel(tag.getSourceFile().fileName);
 if(sourceFile==='apps/web/src/app/router.tsx'&&name==='OrderDetailPage'&&source){const variable=declarations.find(ts.isVariableDeclaration);if(variable?.initializer&&variable.initializer.getText().includes("import('../modules/orders')")&&variable.initializer.getText().includes('m.OrderDetailPage'))return {category:'LAZY_ROUTE_ENTRY',name,source:rel(source)};}
 if(sourceFile==='apps/web/src/app/router.tsx'&&name==='Page'&&source){const variable=declarations.find(ts.isVariableDeclaration),init=variable?.initializer;if(init&&ts.isElementAccessExpression(init)&&init.expression.getText()==='pages'&&init.argumentExpression.getText()==='r.id')return {category:'CANONICAL_ROUTE_REGISTRY_SLOT',name,source:rel(source)};}
 return {category:source?.includes('node_modules')?'EXTERNAL_OR_PROVIDER':'UNRESOLVED_CUSTOM',name,source:source?rel(source):null};
}
function describe(fn){
 const tags=[],calls=[],roles=[],styles=[],nativeFactories=[];
 function visit(n){
  if(n!==fn.node&&ts.isFunctionDeclaration(n))return;
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){
   const c=classify(n.tagName), attrs=n.attributes.properties.filter(ts.isJsxAttribute).map(a=>({name:a.name.getText(),value:a.initializer?.getText()||'true'}));
   tags.push({category:c.category,name:c.name,module:c.module,...loc(n),target:c.target?{name:c.target.name,file:c.target.file,line:c.target.line}:undefined,attrs});
   for(const a of n.attributes.properties)if(ts.isJsxAttribute(a)&&['sx','style','geometry'].includes(a.name.getText()))styles.push({tag:c.name,attribute:a.name.getText(),expression:a.initializer?.getText(),...loc(a)});
  }
  if(ts.isPropertyAccessExpression(n)&&/^layoutSx\.|^visualSx\.|^tokens\.|^colors\./.test(n.getText())&&!ts.isPropertyAccessExpression(n.parent))roles.push({expression:n.getText(),...loc(n)});
  if(ts.isCallExpression(n)){const symbol=unalias(checker.getSymbolAtLocation(ts.isPropertyAccessExpression(n.expression)?n.expression.name:n.expression)),target=functionBySymbol.get(symbol);if(target&&target!==fn)calls.push(target);if(/(?:createElement|jsx|jsxs|jsxDEV|cloneElement)$/.test(n.expression.getText()))nativeFactories.push({...loc(n),expression:n.expression.getText()});}
  ts.forEachChild(n,visit);
 }
 visit(fn.node);
 return {name:fn.name,file:fn.file,line:fn.line,exported:fn.exported,tags,calls:[...new Set(calls)],roles,styles,nativeFactories};
}
const details=new Map(functions.map(f=>[f,describe(f)]));
const publicUseCounts=Object.fromEntries(publicApis.map(f=>[f.name,{sites:0,files:new Set(),locations:[]}])) ;
for(const [fn,d] of details)for(const tag of d.tags)if(tag.category==='PROJECT_SHARED'){const row=publicUseCounts[tag.name];row.sites++;row.files.add(fn.file);row.locations.push({file:tag.file,line:tag.line,consumer:fn.name});}
function trace(entry){const seen=new Set(),tagMap=new Map(),local=[];function follow(fn){if(seen.has(fn))return;seen.add(fn);const d=details.get(fn);if(!d)return;for(const tag of d.tags){tagMap.set(tag.file+':'+tag.line+':'+tag.column+':'+tag.name,tag);const target=tag.target&&functions.find(f=>f.file===tag.target.file&&f.name===tag.target.name);if(target&&!apiSymbols.has(target.symbol))follow(target);}for(const child of d.calls)if(!apiSymbols.has(child.symbol))follow(child);if(fn!==entry)local.push({name:fn.name,file:fn.file,line:fn.line,scope:fn.file.startsWith('apps/web/src/shared/')?'SHARED_MODEL_OR_PRESENTATION':fn.file.startsWith('apps/web/src/app/')?'APP_OWNER':'FEATURE_LOCAL'});}follow(entry);const tags=[...tagMap.values()];const by=category=>[...new Set(tags.filter(t=>t.category===category).map(t=>t.name))].sort();return {functions:[...seen].map(f=>({name:f.name,file:f.file,line:f.line})),helpers:local,tags,shared:by('PROJECT_SHARED'),mui:by('MUI_PRIMITIVE'),native:by('NATIVE'),icons:by('MUI_ICON'),charts:by('CHART_LIBRARY'),unresolved:tags.filter(t=>t.category==='UNRESOLVED_CUSTOM')};}
const routes=routeEntries.map(({metadata:m,entry})=>({id:m.id,title:m.title,path:m.path,module:m.module,registrySlot:registrySlots.find(s=>s.id===m.id),entry:{name:entry.name,file:entry.file,line:entry.line},...trace(entry)}));
const localComponents=functions.filter(f=>!routesByFunction.has(f)&&!ownerFiles.has(f.file)).map(f=>{const d=details.get(f);return {name:f.name,file:f.file,line:f.line,kind:/^[A-Z]/.test(f.name)?'COMPONENT':'RENDER_OR_STARTUP_HELPER',scope:f.file.startsWith('apps/web/src/modules/')?'FEATURE_LOCAL':f.file.startsWith('apps/web/src/app/')?'APP_OWNER':f.file==='apps/web/src/main.tsx'?'STARTUP_OWNER':'SHARED_OTHER',routes:routes.filter(r=>r.functions.some(x=>x.name===f.name&&x.file===f.file)).map(r=>r.id),shared:[...new Set(d.tags.filter(t=>t.category==='PROJECT_SHARED').map(t=>t.name))].sort(),mui:[...new Set(d.tags.filter(t=>t.category==='MUI_PRIMITIVE').map(t=>t.name))].sort(),native:[...new Set(d.tags.filter(t=>t.category==='NATIVE').map(t=>t.name))].sort(),roles:d.roles,styles:d.styles,nativeFactories:d.nativeFactories};});
const allTags=files.flatMap(file=>{const sf=program.getSourceFile(file),tags=[];function visit(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){const c=classify(n.tagName);tags.push({category:c.category,name:c.name,...loc(n)});}ts.forEachChild(n,visit);}visit(sf);return tags;});
const categoryCounts=Object.fromEntries([...new Set(allTags.map(t=>t.category))].sort().map(category=>[category,allTags.filter(t=>t.category===category).length]));
const scopeCounts=Object.fromEntries(['FEATURE','APP','SHARED','STARTUP'].map(scope=>{const tags=allTags.filter(t=>scope==='FEATURE'?t.file.includes('/modules/'):scope==='APP'?t.file.includes('/app/'):scope==='SHARED'?t.file.includes('/shared/'):t.file==='apps/web/src/main.tsx');return [scope,Object.fromEntries([...new Set(tags.map(t=>t.category))].sort().map(category=>[category,tags.filter(t=>t.category===category).length]))];}));
const snapshots=[...files,path.join(root,'apps/web/src/shared/ui/README.md'),path.join(root,'docs/FRONTEND_SPACING_STANDARD.md'),path.join(root,'docs/route-implementation.json'),path.join(repo,'botsales-kit/contracts/route-manifest.json'),import.meta.filename,'scripts/ui-bindings.mjs'].map(f=>path.isAbsolute(f)?f:path.join(root,f));
const fingerprints=Object.fromEntries([...new Set(snapshots)].map(file=>[path.relative(repo,file).replaceAll('\\','/'),sha(file)]));
const report={checkedAt:new Date().toISOString(),HEAD:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),method:'TypeScript Program resolves aliases to actual exported symbols. Route entry functions follow custom JSX components and direct calls to named JSX-producing helpers; public Shared UI is a boundary, its internal MUI is not counted as feature-owned. Conditional branches are a static union; this is not a new browser run.',summary:{sourceScriptFiles:files.length,routes:routes.length,uniqueRouteFunctions:routesByFunction.size,modules:new Set(routes.map(r=>r.module)).size,publicApis:publicApis.length,routesWithShared:routes.filter(r=>r.shared.length).length,localFeatureComponents:localComponents.filter(f=>f.scope==='FEATURE_LOCAL'&&f.kind==='COMPONENT').length,localFeatureRenderHelpers:localComponents.filter(f=>f.scope==='FEATURE_LOCAL'&&f.kind!=='COMPONENT').length,appOwnerComponents:localComponents.filter(f=>f.scope==='APP_OWNER').length,unresolvedRouteTags:routes.flatMap(r=>r.unresolved).length,unresolvedAllTags:allTags.filter(t=>t.category==='UNRESOLVED_CUSTOM').length,categoryCounts,scopeCounts},publicApis:publicApis.map(f=>({...loc(f.node),name:f.name,directSites:allTags.filter(t=>t.category==='PROJECT_SHARED'&&t.name===f.name).length,consumerFiles:[...new Set(allTags.filter(t=>t.category==='PROJECT_SHARED'&&t.name===f.name).map(t=>t.file))].sort(),routes:routes.filter(r=>r.shared.includes(f.name)).map(r=>r.id)})),routes,localComponents,allJsxTags:allTags,sourceFingerprints:fingerprints,limits:['Only named top-level JSX-producing functions are counted as local components/helpers. Inline route fields, columns, actions and data-driven render callbacks remain feature-owned and are listed separately.','Slots passed as JSX/render callbacks are inventoried at their creating source; arbitrary data-driven component factories need manual review.','Route R05/R06 and R10/R11 share entry functions: union inventory is not branch-specific evidence.','App shell/session/router/fallback ownership is audited separately, not multiplied into each route.','MUI primitives/icons/charts/native elements are allowed by project standard; use counts do not measure visual quality or feature completion.']};
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'adoption-current.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary));console.log(JSON.stringify(localComponents.map(({name,file,line,scope,routes,shared})=>({name,file,line,scope,routes,shared})),null,2));
