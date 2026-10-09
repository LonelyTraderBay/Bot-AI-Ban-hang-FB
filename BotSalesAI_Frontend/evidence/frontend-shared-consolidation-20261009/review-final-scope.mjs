import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const output=import.meta.dirname,frontend=path.resolve(output,'../..'),repository=path.dirname(frontend);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const baseline=read(path.join(output,'baseline.json'));
const allowed=new Set([
 'apps/web/src/shared/ui/components.tsx','apps/web/src/shared/ui/layout.ts','apps/web/src/shared/ui/theme.ts','apps/web/src/app/Shell.tsx',
 'apps/web/vite.config.ts','tests/session/demo-worker-startup.spec.ts',
 'scripts/check-layout.mjs','tests/layout-checker.test.mjs','apps/web/src/modules/catalog/index.tsx','tests/ui-component-layout.spec.ts',
 'apps/web/src/modules/inbox/conversation-components.tsx','apps/web/src/modules/inbox/index.tsx','apps/web/src/modules/dashboard/index.tsx','apps/web/src/shared/ui/README.md',
 'tests/ui-catalog-layout.spec.ts','tests/ui-shell-layout.spec.ts','tests/ui-toolbar-layout.spec.ts','tests/fe016.spec.ts','tests/ui-dashboard-layout.spec.ts','tests/ui-shared-api-contract.test.mjs',
 'docs/FRONTEND_SPACING_STANDARD.md','docs/FRONTEND_UI_IMPROVEMENT_PLAN.md','docs/PROJECT_CONTEXT.md','docs/CONTINUE_FRONTEND.md','docs/KNOWN_GAPS.md',
 'docs/route-implementation.json','docs/route-state-role-matrix.json'
].map(file=>'BotSalesAI_Frontend/'+file));
const changed=Object.entries(baseline.sourceFingerprints).filter(([file,digest])=>!fs.existsSync(path.join(repository,file))||hash(path.join(repository,file))!==digest).map(([file])=>file);
const unexpected=changed.filter(file=>!allowed.has(file));
const protectedDrift=Object.entries(baseline.protectedFingerprints).filter(([file,digest])=>hash(path.join(repository,file))!==digest).map(([file])=>file);
const missingOriginalPaths=baseline.originalPaths.filter(file=>!fs.existsSync(path.join(repository,file)));
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path.join(dir,item.name)):[path.join(dir,item.name)]);
const beforeCopies=walk(path.join(output,'before')).map(file=>{const original='BotSalesAI_Frontend/'+path.relative(path.join(output,'before'),file).replaceAll('\\','/');return{original,copy:path.relative(repository,file).replaceAll('\\','/'),sha256:hash(file),matchesBaseline:hash(file)===baseline.sourceFingerprints[original]};});
const check=spawnSync('git',['diff','--check','--',...changed,'BotSalesAI_Frontend/README.md','BotSalesAI_Frontend/evidence/REPORT.md'],{cwd:repository,encoding:'utf8',windowsHide:true});
const diffs=[];
for(const item of beforeCopies){const after=path.join(repository,item.original);const result=spawnSync('git',['diff','--no-index','--',path.join(repository,item.copy),after],{cwd:repository,encoding:'utf8',windowsHide:true,maxBuffer:3e6});if(![0,1].includes(result.status))throw Error(result.stderr);diffs.push({file:item.original,diff:result.stdout});}
const diffFile=path.join(output,'batch-diff-from-baseline.patch');fs.writeFileSync(diffFile,diffs.map(item=>item.diff).join(''));
const report={status:!unexpected.length&&!protectedDrift.length&&!missingOriginalPaths.length&&beforeCopies.length===22&&beforeCopies.every(item=>item.matchesBaseline)&&check.status===0?'PASS':'FAIL',checkedAt:new Date().toISOString(),baselineHash:hash(path.join(output,'baseline.json')),changed,unexpected,protectedDrift,originalPaths:baseline.originalPaths.length,missingOriginalPaths,beforeCopies,newSourceFiles:['tests/design/shared-consolidation-fixture.ts','tests/design/owned-label-geometry.mjs'],gitDiffCheck:{exitCode:check.status,output:(check.stdout||'')+(check.stderr||'')},diff:{path:path.relative(repository,diffFile).replaceAll('\\','/'),sha256:hash(diffFile)},limits:'Comparison uses the preserved dirty baseline, not HEAD. Existing unrelated changes are retained. Generated FE artifacts and owned current evidence are audited separately; this is Codex self-review.'};
fs.writeFileSync(path.join(output,'final-scope-review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,changed,unexpected,protectedDrift,missingOriginalPaths,beforeCopies:beforeCopies.length,gitDiffCheck:check.status}));if(report.status!=='PASS')process.exitCode=1;
