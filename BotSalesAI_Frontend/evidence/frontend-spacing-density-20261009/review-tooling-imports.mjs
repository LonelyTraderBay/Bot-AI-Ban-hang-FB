import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';
const output=import.meta.dirname,frontend=path.resolve(output,'../..'),repository=path.dirname(frontend);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const assert=(value,message)=>{if(!value)throw Error(message);};
const inventory=read(path.join(output,'inventory-current.json'));
const record=stage=>{const value=read(path.join(repository,read(path.join(output,stage+'-latest.json')).record));assert(!value.exitCode&&!value.sourceDrift.length&&hash(path.join(repository,value.log.path))===value.log.sha256,'Invalid '+stage);for(const [file,digest]of Object.entries(value.sourceFingerprints))assert(hash(path.join(repository,file))===digest,'Stale '+stage+':'+file);return value;};
const browserRecord=record('e2e'),verifyRecord=record('verify'),browserLog=fs.readFileSync(path.join(repository,browserRecord.log.path),'utf8'),verifyLog=fs.readFileSync(path.join(repository,verifyRecord.log.path),'utf8');
assert(/\b\d+ passed \(/.test(browserLog)&&!/\b\d+ failed\b/.test(browserLog),'Full browser pass required');assert(verifyLog.includes('"passed":88'),'Actual domain executions required');
const toolsRun=spawnSync(process.execPath,['--test','tests/tools.test.mjs'],{cwd:frontend,encoding:'utf8',windowsHide:true}),toolsLog=path.join(output,'tooling-compiler-fixtures-current.log');fs.writeFileSync(toolsLog,(toolsRun.stdout||'')+(toolsRun.stderr||''));assert(toolsRun.status===0&&/pass 8\s/.test(fs.readFileSync(toolsLog,'utf8')),'Compiler fixture failure');
const owners=new Map();
for(const item of inventory.unresolvedOwnImports.filter(item=>item.file.endsWith('.spec.ts'))){
 if(owners.has(item.file))continue;const source=fs.readFileSync(path.join(frontend,item.file),'utf8'),ast=ts.createSourceFile(item.file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),titles=[];
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='test'&&ts.isStringLiteral(node.arguments[0]))titles.push(node.arguments[0].text);ts.forEachChild(node,visit);}visit(ast);
 assert(titles.length,'No named owner cases');for(const title of titles)for(const engine of ['chromium','firefox'])assert(browserLog.split('\n').some(line=>/^\s*ok\s+\d+/.test(line)&&line.includes('['+engine+']')&&line.includes(title)),'Owner not executed '+engine+':'+title);
 owners.set(item.file,{sourceSha256:hash(path.join(frontend,item.file)),titles,engines:['chromium','firefox'],executionLog:browserRecord.log});
}
const observations=inventory.unresolvedOwnImports.map(item=>{
 assert(item.resolutionClassification&&item.mappedCanonicalSource&&item.sourceExists,'Unclassified mapping '+item.file+':'+item.line);
 const source=path.join(frontend,item.file),target=path.join(frontend,item.mappedCanonicalSource);assert(fs.existsSync(target),'Mapped source missing');
 return{...item,sourceSha256:hash(source),targetSha256:hash(target),execution:item.file==='scripts/test-domain.mjs'?{kind:'ACTUAL_COMPILE_AND_DOMAIN_EXECUTION',log:verifyRecord.log}:item.file==='tests/tools.test.mjs'?{kind:'EIGHT_SYNTHETIC_COMPILER_CONTRACT_FIXTURES',executable:process.execPath,args:['--test','tests/tools.test.mjs'],cwd:frontend,exitCode:toolsRun.status,log:{path:path.relative(repository,toolsLog).replaceAll('\\','/'),sha256:hash(toolsLog)}}:{kind:'BOUNDED_TEST_ONLY_BROWSER_FIXTURE',...owners.get(item.file)},limits:'Finite source construction and completed owner suite checked; not an arbitrary JavaScript dynamic-import resolver or production import.'};
});
assert(!inventory.runtimeUnresolvedOwnImports.length,'Runtime closure has unresolved imports');
const result={status:'PASS',reviewedAt:new Date().toISOString(),inventorySha256:hash(path.join(output,'inventory-current.json')),count:observations.length,runtimeUnresolved:0,unknownToolingMappings:0,observations,limits:'The inventory keeps syntactically nonliteral imports explicit. All current finite tooling constructions are classified; production closure and real build are separate gates.'};fs.writeFileSync(path.join(output,'tooling-import-resolution-current.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,count:result.count,runtimeUnresolved:0,compilerFixtureCases:8}));
