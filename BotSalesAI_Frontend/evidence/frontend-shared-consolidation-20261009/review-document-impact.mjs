import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const output=import.meta.dirname,frontend=path.resolve(output,'../..'),repository=path.dirname(frontend),kit=path.join(repository,'botsales-kit');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const progress=read(path.join(kit,'execution/frontend-progress.json'));
const allowed=new Set(['docs/PROJECT_CONTEXT.md','docs/CONTINUE_FRONTEND.md','docs/KNOWN_GAPS.md','docs/FRONTEND_UI_IMPROVEMENT_PLAN.md','evidence/REPORT.md','evidence/frontend-shared-consolidation-20261009/REPORT.md']);
const impacts=[];
for(const [taskId,task]of Object.entries(progress.tasks))for(const [stepId,step]of Object.entries(task.steps)){
 const receipt=read(path.join(kit,step.evidence.path));
 const drift=receipt.sourceFiles.filter(item=>hash(path.join(item.path.startsWith('botsales-kit/')?kit:frontend,item.path.replace(/^botsales-kit\//,'')))!==item.sha256).map(item=>item.path);
 if(drift.length)impacts.push({taskId,stepId,kind:receipt.kind,receipt:step.evidence.path,drift});
}
const unexpected=impacts.filter(item=>item.kind!=='artifact_review'||item.drift.some(file=>!allowed.has(file)));
const tasks=[...new Set(impacts.map(item=>item.taskId))];
const value={status:impacts.length&&!unexpected.length?'PASS':'FAIL',reviewedAt:new Date().toISOString(),scope:'Actual source hash impact of final handoff document publication. Dependency eligibility is measured separately by the canonical CLI; unchanged runtime/test receipts are retained.',checkpoints:impacts.length,tasks,impacts,unexpected};
fs.writeFileSync(path.join(output,'final-document-checkpoint-impact.json'),JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify({status:value.status,checkpoints:impacts.length,tasks,unexpected}));if(value.status!=='PASS')process.exitCode=1;
