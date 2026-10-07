import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root = process.cwd();
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d,e.name)) : [path.join(d,e.name)]);
const files = walk('apps/web/src').filter(f => /\.tsx?$/.test(f));
const calls = [], components = [], longLines = [];
for (const file of files) {
  const source = fs.readFileSync(file,'utf8');
  const tree = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const line = n => tree.getLineAndCharacterOfPosition(n.getStart(tree)).line+1;
  source.split(/\r?\n/).forEach((v,i) => { if(v.length>1500) longLines.push({file,line:i+1,characters:v.length}); });
  function visit(n) {
    if(ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['useApi','usePagedApi','useCommand','request','dateTime','useTranslation','useForm','useFieldArray'].includes(n.expression.text)) {
      calls.push({file,line:line(n),name:n.expression.text,args:n.arguments.map(a=>a.getText(tree)),text:n.getText(tree)});
    }
    if(ts.isFunctionDeclaration(n) && n.name && n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)) {
      const text=n.getText(tree);
      components.push({file,line:line(n),name:n.name.text,characters:text.length,apiCalls:[...text.matchAll(/use(?:Api|PagedApi|Command)\('([^']+)'/g)].map(m=>m[1]),pager:/<Pager\b/.test(text),listQuery:/useListQuery\(/.test(text)});
    }
    ts.forEachChild(n,visit);
  }
  visit(tree);
}
const api=JSON.parse(fs.readFileSync('botsales-kit/contracts/openapi.json','utf8'));
const operations={};
const dereference = p => p.$ref ? p.$ref.slice(2).split('/').reduce((v,k)=>v[k],api) : p;
for(const [apiPath,item] of Object.entries(api.paths))for(const [method,op] of Object.entries(item))if(op?.operationId)operations[op.operationId]={path:apiPath,method,params:[...(item.parameters||[]),...(op.parameters||[])].map(p=>dereference(p).name)};
const output={
  sourceFiles:files.length,
  dateTimeCalls:calls.filter(c=>c.name==='dateTime').map(({file,line,args})=>({file,line,args})),
  lookupLimits:calls.filter(c=>c.file.includes('modules')&&/limit:\s*100/.test(c.text)).map(({file,line,text})=>({file,line,text})),
  listComponentsWithoutPager:components.filter(c=>c.listQuery&&!c.pager),
  paginatedOperationsWithoutPager:components.filter(c=>!c.pager&&c.apiCalls.some(o=>operations[o]?.params.includes('cursor'))).map(c=>({...c,paginatedReads:c.apiCalls.filter(o=>operations[o]?.params.includes('cursor'))})),
  moduleComponents:components.filter(c=>c.file.includes('modules')).map(({file,line,name,characters,apiCalls,pager})=>({file,line,name,characters,apiCalls,pager})),
  longLines:longLines.sort((a,b)=>b.characters-a.characters),
  hookUseCounts:Object.fromEntries(['useApi','usePagedApi','useCommand','useTranslation','useForm','useFieldArray'].map(n=>[n,calls.filter(c=>c.name===n).length])),
};
fs.writeFileSync('evidence/frontend-ui-reaudit-20261002/source-inventory.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({sourceFiles:output.sourceFiles,dateTimeCalls:output.dateTimeCalls.length,dateTimeWithoutTimezone:output.dateTimeCalls.filter(c=>c.args.length===1),lookupLimitsCount:output.lookupLimits.length,listComponentsWithoutPager:output.listComponentsWithoutPager,paginatedOperationsWithoutPager:output.paginatedOperationsWithoutPager.map(({file,line,name,paginatedReads})=>({file,line,name,paginatedReads})),hookUseCounts:output.hookUseCounts,longLinesAbove1500:output.longLines.length},null,2));
