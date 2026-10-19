import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
const [dir,gitBin]=process.argv.slice(2);const baseline=JSON.parse(fs.readFileSync(path.join(dir,'baseline.json'),'utf8'));const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const git=args=>{const r=spawnSync(gitBin,args,{cwd:baseline.repo,encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});if(r.status!==0)throw new Error(r.error?.message||r.stderr);return r.stdout;};
const changed=[],missing=[];for(const [file,expected]of Object.entries(baseline.hashes)){const f=path.join(baseline.repo,file);if(!fs.existsSync(f))missing.push(file);else if(hash(f)!==expected)changed.push(file);}
const untracked=git(['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean).sort();
const sourceWorker=path.join(baseline.repo,'BotSalesAI_Frontend/apps/web/public/mockServiceWorker.js'),copyWorker=path.join(baseline.snapshot,'BotSalesAI_Frontend/apps/web/public/mockServiceWorker.js');
const integrity={head:git(['rev-parse','HEAD']).trim(),baselineHead:baseline.head,checkedFiles:baseline.fileCount,changed,missing,gitStatusUnchanged:git(['status','--porcelain=v1','-z'])===baseline.gitStatus,untrackedCount:untracked.length,untrackedPathsUnchanged:createHash('sha256').update(untracked.join('\0')).digest('hex')===baseline.untrackedPathHash,workerSourceSha256:hash(sourceWorker),workerCopySha256:hash(copyWorker)};
integrity.status=changed.length||missing.length||!integrity.gitStatusUnchanged||!integrity.untrackedPathsUnchanged||integrity.head!==baseline.head||integrity.workerSourceSha256!==integrity.workerCopySha256?'FAIL':'PASS';fs.writeFileSync(path.join(dir,'source-preservation.json'),JSON.stringify(integrity,null,2)+'\n');
function testsFrom(suites,all=[]){for(const suite of suites??[]){for(const spec of suite.specs??[])for(const t of spec.tests??[])all.push({...t,title:spec.title,file:spec.file});testsFrom(suite.suites,all);}return all;}
const runs={},matrices=[];
for(const [key,file]of [['bundled','playwright.json'],['chromeInitial','chrome-playwright.json'],['chromeRecheck','chrome-recheck.json']]){
 const doc=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));const tests=testsFrom(doc.suites);const perProject={};
 for(const t of tests){const p=perProject[t.projectName]??={passed:0,failed:0,skipped:0,interrupted:0};const status=t.results.at(-1)?.status??'skipped';p[status]=(p[status]??0)+1;
 for(const result of t.results)for(const a of result.attachments??[]){if(a.name?.startsWith('composition-route-matrix-')&&a.body){const cells=JSON.parse(Buffer.from(a.body,'base64').toString());matrices.push({run:key,project:t.projectName,attachment:a.name,count:cells.length,routeIds:cells.map(c=>c.route),width:cells[0]?.viewport?.width,bodySha256:createHash('sha256').update(Buffer.from(a.body,'base64')).digest('hex')});}}
 }
 runs[key]={stats:doc.stats,perProject,failures:tests.filter(t=>t.results.at(-1)?.status==='failed').map(t=>({project:t.projectName,file:t.file,title:t.title,error:t.results.at(-1)?.error?.message?.replace(/\x1b\[[0-9;]*m/g,'')}))};
}
const gates={};for(const name of['generate','layout-current','visual-current','composition-current','lint-typecheck','ui-guard-tests','shared-unit','build-production','build-demo','kit-theme-check','backdrop-parity'])gates[name]=Number(fs.readFileSync(path.join(dir,name+'.exit'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(baseline.snapshot,'botsales-kit/contracts/route-manifest.json'),'utf8'));
const coverage={canonicalRoutes:manifest.routes.map(r=>({id:r.id,path:r.path})),routeCount:manifest.routes.length,matrices};
fs.writeFileSync(path.join(dir,'route-coverage.json'),JSON.stringify(coverage,null,2)+'\n');
const summary={head:baseline.head,gates,runs,sourcePreservation:integrity,routeCount:manifest.routes.length,matrices:matrices.map(({routeIds,...r})=>r)};
fs.writeFileSync(path.join(dir,'audit-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({head:summary.head,gates,runStats:Object.fromEntries(Object.entries(runs).map(([k,v])=>[k,v.perProject])),routeCount:coverage.routeCount,matrices:summary.matrices,sourceIntegrity:integrity.status,changed:changed.length,untrackedCount:untracked.length},null,2));
