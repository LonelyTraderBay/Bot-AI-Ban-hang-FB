import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {root,typescript,require} from './tools.mjs';
import {runMockNetworkScenarios} from '../tests/fixtures/mock-network.mjs';
const compiler=typescript();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'botsales-domain-'));
// Compiled mock modules use the same installed validators as the browser build.
fs.mkdirSync(path.join(dir,'node_modules/@botsales/contracts'),{recursive:true});
for(const dependency of ['ajv','ajv-formats'])fs.symlinkSync(path.join(root,'node_modules',dependency),path.join(dir,'node_modules',dependency),process.platform==='win32'?'junction':'dir');
fs.writeFileSync(path.join(dir,'node_modules/@botsales/contracts/package.json'),JSON.stringify({main:path.join(dir,'packages/contracts/src/index.js')}));
fs.mkdirSync(path.join(root,'evidence/logs'),{recursive:true});
try{
 const configPath=path.join(dir,'tsconfig.json');
 fs.writeFileSync(configPath,JSON.stringify({compilerOptions:{module:'commonjs',moduleResolution:'node',esModuleInterop:true,resolveJsonModule:true,target:'ES2022',lib:['ES2023','DOM','DOM.Iterable'],strict:true,skipLibCheck:true,noUnusedLocals:true,noUnusedParameters:true,rootDir:root,outDir:dir,baseUrl:root,paths:{'@botsales/contracts':['packages/contracts/src/index.ts'],'@botsales/tokens':['packages/design-tokens/src/index.ts']}},files:[path.join(root,'apps/web/src/mocks/service.ts')]}));
 const args=[compiler.path,'--project',configPath,'--pretty','false'];
 const build=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
 fs.writeFileSync(path.join(root,'evidence/logs/mock-typecheck.log'),`${process.version}\nTypeScript ${compiler.ts.version} (${compiler.source})\n${build.stdout||''}${build.stderr||''}\nExit: ${build.status}\n`);
 if(build.status!==0)throw new Error(`Pure mock typecheck failed:\n${build.stdout}${build.stderr}`);
 const service=require(path.join(dir,'apps/web/src/mocks/service.js'));const database=require(path.join(dir,'apps/web/src/mocks/database.js'));const fileModule=require(path.join(dir,'apps/web/src/mocks/files.js'));const operations=JSON.parse(fs.readFileSync(path.join(root,'packages/contracts/src/operations.json'),'utf8'));
 const {run}=require(path.join(root,'tests/domain-scenarios.cjs'));const result=await run({service,database,fileModule,operations});
 const network=await runMockNetworkScenarios({root});
 const report={checkedAt:new Date().toISOString(),node:process.version,typescript:compiler.ts.version,compilerSource:compiler.source,scope:'Synthetic frontend checks: pure TypeScript in-memory simulator plus MSW HTTP/SSE transport. NOT backend, real concurrency, finance certification or browser E2E.',...result,network};
 report.status=report.status==='PASS'&&network.status==='PASS'?'PASS':'FAIL';
 fs.writeFileSync(path.join(root,'evidence/domain-tests.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,simulatorChecks:report.checks.length,networkChecks:network.checks.length,networkHandlers:network.handlers,passed:report.checks.filter(x=>x.status==='PASS').length+network.checks.filter(x=>x.status==='PASS').length,operations:report.transcript.length,node:process.version,typescript:compiler.ts.version}));
 if(report.status!=='PASS')process.exitCode=1;
}finally{fs.rmSync(dir,{recursive:true,force:true});}
