import fs from 'node:fs';
import path from 'node:path';
import {root,typescript} from './tools.mjs';
const {ts,source}=typescript();const issues=[];let files=0,calls=0;
const ops=JSON.parse(fs.readFileSync(path.join(root,'packages/contracts/src/operations.json'),'utf8'));
const permissions=new Set(JSON.parse(fs.readFileSync(path.join(root,'packages/contracts/src/permissions.json'),'utf8')).permissions.map(p=>p.id));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(path.join(root,'apps/web/src')).filter(f=>/\.(tsx?|jsx?)$/.test(f))){const text=fs.readFileSync(file,'utf8');const tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);files++;
 for(const d of tree.parseDiagnostics)issues.push(`${path.relative(root,file)}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);
 function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&['useApi','useCommand','request'].includes(node.expression.text)&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){calls++;if(!ops[node.arguments[0].text])issues.push(`Unknown operation ${node.arguments[0].text} in ${file}`);}
 if(ts.isJsxAttribute(node)&&node.name.text==='permission'&&node.initializer&&ts.isStringLiteral(node.initializer)&&!permissions.has(node.initializer.text))issues.push(`Unknown permission ${node.initializer.text} in ${file}`);
 if(ts.isAsExpression(node)&&node.type.kind===ts.SyntaxKind.AnyKeyword)issues.push(`Unsafe as any in ${file}`);
 ts.forEachChild(node,visit);
 }visit(tree);
 if(/@ts-(ignore|nocheck)/.test(text))issues.push(`Type suppression in ${file}`);
 if(file.includes('/modules/')&&/#[0-9a-fA-F]{6}(?![0-9a-fA-F])/.test(text))issues.push(`Literal color outside source tokens in ${file}`);
}
const routes=JSON.parse(fs.readFileSync(path.join(root,'packages/contracts/src/routes.json'),'utf8')).routes;
const matrix=JSON.parse(fs.readFileSync(path.join(root,'docs/route-implementation.json'),'utf8'));
for(const route of routes){const match=matrix.find(r=>r.routeId===route.id);if(!match||match.route!==route.path||!fs.existsSync(path.join(root,match.source)))issues.push(`Missing source ${route.id}`);else if(!fs.readFileSync(path.join(root,match.source),'utf8').includes(`function ${match.component}(`))issues.push(`Missing exported component ${match.component}`);}
const tokens=JSON.parse(fs.readFileSync(path.join(root,'packages/design-tokens/src/tokens.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'apps/web/public/manifest.webmanifest'),'utf8'));
if(manifest.background_color!==tokens.colors.canvas||manifest.theme_color!==tokens.colors.canvas)issues.push('Manifest palette drift');
const report={checkedAt:new Date().toISOString(),scope:'Syntax, operation identifiers, route-source mapping, permissions and token adoption. NOT React typecheck, build or browser test.',compiler:ts.version,compilerSource:source,files,operationCalls:calls,routes:routes.length,issues,status:issues.length?'FAIL':'PASS'};
fs.mkdirSync(path.join(root,'evidence'),{recursive:true});fs.writeFileSync(path.join(root,'evidence/source-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(issues.length)process.exitCode=1;
