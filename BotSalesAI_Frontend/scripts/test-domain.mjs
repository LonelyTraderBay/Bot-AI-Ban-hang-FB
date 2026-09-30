import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {root,typescript,require} from './tools.mjs';
const compiler=typescript();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'botsales-domain-'));
fs.mkdirSync(path.join(root,'evidence/logs'),{recursive:true});
try{
 const args=[compiler.path,'apps/web/src/mocks/service.ts','--module','commonjs','--moduleResolution','node','--esModuleInterop','--resolveJsonModule','--target','ES2022','--lib','ES2023,DOM,DOM.Iterable','--strict','--skipLibCheck','--noUnusedLocals','--noUnusedParameters','--rootDir','.', '--outDir',dir,'--pretty','false'];
 const build=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
 fs.writeFileSync(path.join(root,'evidence/logs/mock-typecheck.log'),`${process.version}\nTypeScript ${compiler.ts.version} (${compiler.source})\n${build.stdout||''}${build.stderr||''}\nExit: ${build.status}\n`);
 if(build.status!==0)throw new Error(`Pure mock typecheck failed:\n${build.stdout}${build.stderr}`);
 const service=require(path.join(dir,'apps/web/src/mocks/service.js'));const database=require(path.join(dir,'apps/web/src/mocks/database.js'));const fileModule=require(path.join(dir,'apps/web/src/mocks/files.js'));const operations=JSON.parse(fs.readFileSync(path.join(root,'packages/contracts/src/operations.json'),'utf8'));
 const {run}=require(path.join(root,'tests/domain-scenarios.cjs'));const result=await run({service,database,fileModule,operations});
 const report={checkedAt:new Date().toISOString(),node:process.version,typescript:compiler.ts.version,compilerSource:compiler.source,scope:'Pure TypeScript in-memory API simulator. NOT React build, MSW transport, backend, real concurrency, finance certification or browser execution.',...result};
 fs.writeFileSync(path.join(root,'evidence/domain-tests.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,passed:report.checks.filter(x=>x.status==='PASS').length,operations:report.transcript.length,node:process.version,typescript:compiler.ts.version}));
 if(report.status!=='PASS')process.exitCode=1;
}finally{fs.rmSync(dir,{recursive:true,force:true});}
