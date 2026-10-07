#!/usr/bin/env node
/** Local evidence-linked progress ledger, not an autonomous coding agent or a distributed lock. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cliArgs=process.argv.slice(2).filter(a=>a!=='--full-product'&&a!=='--defer-reports');
const hasFrontendPlan=fs.existsSync(path.join(ROOT,'execution/frontend-plan.json'));
const frontend=!process.argv.includes('--full-product')&&hasFrontendPlan;
const deferReports=frontend&&process.argv.includes('--defer-reports');
const prefix=frontend?'frontend-':'';
const FILE=path.join(ROOT,`execution/${prefix}progress.json`), PLANFILE=path.join(ROOT,`execution/${prefix}plan.json`);
const taskDir=frontend?'execution/frontend-tasks':'execution/tasks';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fail=m=>{throw new Error(m);};
const rel=(base,p)=>{if(typeof p!=='string'||!p||path.isAbsolute(p))fail('Expected relative file path');const dest=path.resolve(base,p);if(dest!==base&&!dest.startsWith(base+path.sep))fail('Path escapes approved root: '+p);if(!fs.existsSync(dest)||!fs.statSync(dest).isFile())fail('Missing evidence/source file: '+p);const real=fs.realpathSync(dest), realBase=fs.realpathSync(base);if(!real.startsWith(realBase+path.sep))fail('Symlink escapes approved root');return real;};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plan=read(PLANFILE), state=read(FILE), stateBefore=sha(fs.readFileSync(FILE));
const release=read(path.join(ROOT,'release.json'));
const taskMap=new Map(plan.tasks.map(t=>[t.id,t]));
let sourceRoot=path.resolve(ROOT,state.sourceRootRelative||'..');
function validateStructure({allowPlanHashMismatch=false}={}){
 if(!allowPlanHashMismatch&&state.planSha256!==sha(fs.readFileSync(PLANFILE)))fail('Plan changed. Approved plan migration/rebaseline required; do not silently change denominator.');
 if(state.planId!==plan.planId)fail('Wrong plan ID');
 if(taskMap.size!==plan.tasks.length)fail('Duplicate task ID');
 if(plan.phases.reduce((n,p)=>n+p.weightPercent,0)!==100)fail('Phase weights must sum to 100');
 const seen=new Set(), visiting=new Set();
 function visit(t){if(visiting.has(t.id))fail('Dependency cycle');if(seen.has(t.id))return;visiting.add(t.id);for(const d of t.dependsOn){if(!taskMap.has(d))fail('Unknown dependency '+d);visit(taskMap.get(d));}visiting.delete(t.id);seen.add(t.id);}
 for(const t of plan.tasks){visit(t);const ts=state.tasks[t.id];if(!ts)fail('Missing task in progress '+t.id);if(!['NOT_STARTED','IN_PROGRESS','BLOCKED','DONE'].includes(ts.status))fail('Invalid task status '+t.id);if(new Set(t.implementationSteps.map(s=>s.id)).size!==t.implementationSteps.length)fail('Duplicate step');for(const s of t.implementationSteps){if(!Number.isFinite(s.weight)||s.weight<=0)fail('Invalid step weight');const ss=ts.steps[s.id];if(!ss||!['NOT_STARTED','VERIFIED','STALE'].includes(ss.status))fail('Invalid checkpoint '+t.id+'.'+s.id);if(ss.status==='VERIFIED'&&!ss.evidence)fail('VERIFIED without evidence');}if(Object.keys(ts.steps).some(k=>!t.implementationSteps.some(s=>s.id===k)))fail('Unknown extra step');}
 if(Object.keys(state.tasks).some(k=>!taskMap.has(k)))fail('Unknown progress task');
}
function verifyEvidence(t,s,evidencePath){
 const absolute=rel(ROOT,evidencePath),e=read(absolute);
 if(e.taskId!==t.id||e.stepId!==s.id||e.result!=='PASS')fail('Wrong task/step or non-PASS evidence');
 if(e.kind!==s.requiredEvidenceKind)fail('Evidence kind mismatch: expected '+s.requiredEvidenceKind);
 for(const k of ['executedAt','sourceRevision','expected','observed','command','reviewer'])if(typeof e[k]!=='string'||e[k].trim().length<3)fail('Missing evidence '+k);
 const time=Date.parse(e.executedAt);if(!Number.isFinite(time)||time>Date.now()+300000)fail('Invalid/future evidence time');
 if(!e.environment?.name||!e.environment?.details)fail('Missing actual environment');
 if(!Number.isInteger(e.checksTotal)||e.checksTotal<1||e.failed!==0)fail('No checks or failures present');
 if(!Array.isArray(e.sourceFiles)||!e.sourceFiles.length)fail('Missing actual source hashes');
 const unique=new Set();for(const f of e.sourceFiles){if(unique.has(f.path))fail('Duplicate source path');unique.add(f.path);if(!/^[a-f0-9]{64}$/.test(f.sha256||''))fail('Invalid source hash');if(sha(fs.readFileSync(rel(sourceRoot,f.path)))!==f.sha256)fail('Changed source '+f.path);}
 const actualSnapshot=sha(Buffer.from(e.sourceFiles.map(f=>f.path+':'+f.sha256).sort().join('\n')));
 if(e.sourceSnapshotSha256!==actualSnapshot)fail('Snapshot digest mismatch');
 if(sha(fs.readFileSync(rel(ROOT,e.logFile)))!==e.logSha256)fail('Changed/missing log');
 if(frontend){
  if(e.verificationScope!=='FRONTEND_WITH_SYNTHETIC_MOCK_API')fail('Frontend evidence must declare its mock API verification scope');
  if(!['source-only','synthetic-msw'].includes(e.environment.dataSource))fail('Frontend evidence needs source-only or synthetic-msw data source');
 }
 if(e.kind==='test_run'){
  const map=read(path.join(ROOT,`execution/${prefix}command-map.json`));const c=map.commands.find(c=>c.id===e.commandId);
  if(!c||c.status!=='VERIFIED_AVAILABLE'||c.command!==e.command)fail('Test command must match a verified registered command');
  if(/^(echo|true|exit\s+0)\b/.test(e.command.trim()))fail('No-op cannot verify application');
 }
 if(['environment_verification','device_or_user_verification'].includes(e.kind)){
  if(e.environment.simulated!==false)fail('Actual environment/device evidence required, not a mock');
  if(!e.authorityRef)fail('Need actual permission/approval reference for environment/device check');
 }
 return {evidence:e,sha256:sha(fs.readFileSync(absolute))};
}
function effective(){
 const result=new Map();
 const evaluate=t=>{
  if(result.has(t.id))return result.get(t.id);
  const ts=state.tasks[t.id], depOK=t.dependsOn.every(d=>evaluate(taskMap.get(d)).done);
  let earned=0, previousOK=true;const steps=t.implementationSteps.map(s=>{const ss=ts.steps[s.id];let status=ss.status,note='';if(status==='VERIFIED'){try{const v=verifyEvidence(t,s,ss.evidence.path);if(v.sha256!==ss.evidence.sha256)fail('Evidence modified');}catch(e){status='STALE';note=e.message;}}if(status==='VERIFIED'&&!depOK){status='STALE';note='Dependency is no longer fully verified';}if(status==='VERIFIED'&&!previousOK){status='STALE';note='Previous checkpoint is not verified';}if(status==='VERIFIED')earned+=s.weight;else previousOK=false;return {...s,status,note};});
  const total=t.implementationSteps.reduce((n,s)=>n+s.weight,0),done=earned===total;
  const status=done?'DONE':ts.status==='BLOCKED'?'BLOCKED':steps.some(s=>s.status==='STALE')?'STALE':earned>0||ts.status==='IN_PROGRESS'?'IN_PROGRESS':'NOT_STARTED';
  const r={...t,status,owner:ts.owner,blockedReason:ts.blockedReason,earned,total,percent:Math.round(earned/total*10000)/100,done,dependencyReady:depOK,steps};result.set(t.id,r);return r;
 };
 plan.tasks.forEach(evaluate);return result;
}
function summary(){const items=[...effective().values()].sort((a,b)=>a.priority-b.priority);const phases=plan.phases.map(p=>{const ts=items.filter(t=>t.phase===p.id),earned=ts.reduce((n,t)=>n+t.earned,0),total=ts.reduce((n,t)=>n+t.total,0);return {...p,earned,total,percent:earned/total*100};});return {planId:plan.planId,version:plan.version,bundleVersion:release.version,paletteVersion:release.versions.palette,designDecisionRef:release.designDecisionRef,generatedAt:new Date().toISOString(),scope:plan.scope||'REAL_PROJECT_IMPLEMENTATION_ONLY',overallPercent:Math.round(phases.reduce((n,p)=>n+p.weightPercent*p.percent/100,0)*100)/100,verifiedSteps:items.reduce((n,t)=>n+t.steps.filter(s=>s.status==='VERIFIED').length,0),totalSteps:items.reduce((n,t)=>n+t.steps.length,0),phases,tasks:items,releaseAuthorized:false,note:'Progress is evidence bookkeeping, not certification. Owner release approval is a separate artifact.'};}
function nextTasks(){return summary().tasks.filter(t=>!t.done&&t.dependencyReady&&t.status!=='BLOCKED').sort((a,b)=>a.priority-b.priority);}
function atomicWrite(p,obj){const temp=p+'.'+process.pid+'.tmp';fs.writeFileSync(temp,JSON.stringify(obj,null,2)+'\n',{encoding:'utf8',flag:'wx'});fs.renameSync(temp,p);}
function mutate(fn){if(!frontend&&hasFrontendPlan)fail('Full-product ledger is read-only in this frontend-only workspace');const lock=path.join(ROOT,'execution/.progress.lock');let fd;try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:new Date().toISOString()}));if(sha(fs.readFileSync(FILE))!==stateBefore)fail('Concurrent modification: reload');fn();state.revision++;state.history.push({at:new Date().toISOString(),action:process.argv.slice(2).join(' '),revision:state.revision});atomicWrite(FILE,state);sourceRoot=path.resolve(ROOT,state.sourceRootRelative||'..');if(!deferReports)renderReports();}finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}}
const stable=value=>JSON.stringify(value);
 const planPathRewrites=[
  ['../AGENTS.md','../BotSalesAI_Frontend/AGENTS.md'],
  ['../AI_RULES.md','../BotSalesAI_Frontend/AI_RULES.md'],
  ['../README.md','../BotSalesAI_Frontend/README.md'],
  ['../docs/','../BotSalesAI_Frontend/docs/'],
  ['../evidence/','../BotSalesAI_Frontend/evidence/'],
  ['../apps/','../BotSalesAI_Frontend/apps/'],
  ['botsales-kit/','../botsales-kit/']
 ];
 function rewritePlanPathReferences(value){
  if(typeof value==='string')return planPathRewrites.reduce((text,[from,to])=>text.replaceAll(from,to),value);
  if(Array.isArray(value))return value.map(rewritePlanPathReferences);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,rewritePlanPathReferences(item)]));
  return value;
 }
function taskFromReport(task){
 const {status,owner,blockedReason,earned,total,percent,done,dependencyReady,steps,...base}=task;
 base.implementationSteps=steps.map(({status:stepStatus,note,...step})=>step);
 return base;
}
function verifyPlanMigration(migration){
 if(!frontend)fail('Plan rebaseline is available only for the frontend ledger');
 if(migration?.version!==1||migration.status!=='APPROVED_BY_USER_AUTHORIZATION')fail('Migration record must be version 1 and explicitly authorized');
 if(typeof migration.id!=='string'||!/^FEPLAN-[0-9]{3}$/.test(migration.id))fail('Invalid frontend plan migration ID');
 if(typeof migration.authorizationRef!=='string'||migration.authorizationRef.length<12)fail('Missing direct user authorization reference');
 const currentPlanSha=sha(fs.readFileSync(PLANFILE));
 if(migration.fromPlanSha256!==state.planSha256)fail('Migration previous hash does not match the frontend ledger');
 if(migration.toPlanSha256!==currentPlanSha)fail('Migration current hash does not match frontend-plan.json');
 if((state.migrations||[]).some(entry=>entry.id===migration.id))fail('Migration ID already applied');
 const reportPath=migration.baselineReport?.path;
 if(reportPath!=='execution/frontend-progress-report.json')fail('Baseline must use the generated pre-migration frontend progress report');
 const reportFile=rel(ROOT,reportPath);
 if(sha(fs.readFileSync(reportFile))!==migration.baselineReport.sha256)fail('Baseline report hash changed');
 const report=read(reportFile);
 if(report.planId!==plan.planId||report.version!==plan.version||report.scope!==plan.scope)fail('Baseline report plan identity/scope mismatch');
 const taskCount=report.tasks.length,stepCount=report.tasks.reduce((n,task)=>n+task.steps.length,0);
 if(taskCount!==28||stepCount!==140)fail('Unexpected baseline denominator');
 if(plan.tasks.length!==taskCount||plan.tasks.reduce((n,task)=>n+task.implementationSteps.length,0)!==stepCount)fail('Migration changes the task/checkpoint denominator');
 const phaseShape=phases=>phases.map(({id,title,weightPercent})=>({id,title,weightPercent}));
 if(stable(phaseShape(plan.phases))!==stable(phaseShape(report.phases)))fail('Migration changes phase identities or weights');
  const changes=migration.changes;
  const pathOnly=migration.id==='FEPLAN-003';
  if(pathOnly){
   const change=Array.isArray(changes)&&changes.length===1?changes[0]:null;
   if(!change||change.type!=='repository_path_only'||change.from!=='BotSalesAI_Frontend/botsales-kit'||change.to!=='botsales-kit'||stable(change.replacements)!==stable(planPathRewrites)||typeof change.reason!=='string'||change.reason.length<20)fail('FEPLAN-003 must contain only the approved repository path rewrite');
  }
 const policies={
  'FEPLAN-001':new Map([['FE005.writeScope','append'],['FE005.deliverables','append']]),
  'FEPLAN-002':new Map([['FE017.acceptanceCases[0]','replace']])
 };
 const policy=policies[migration.id];
  if(!pathOnly&&(!policy||!Array.isArray(changes)||changes.length!==policy.size))fail('Migration changes do not match an approved bounded plan update');
 const changeMap=new Map();
  for(const change of pathOnly?[]:changes){
  const key=`${change.taskId}.${change.field}`,mode=policy.get(key);
  if(changeMap.has(key)||!mode)fail('Undeclared task/field change in migration');
  if(typeof change.reason!=='string'||change.reason.length<20)fail('Each plan change needs its user-authorized reason');
  changeMap.set(key,{...change,mode});
 }
 const reportTasks=new Map(report.tasks.map(task=>[task.id,task]));
 if(reportTasks.size!==plan.tasks.length)fail('Baseline task IDs are not unique');
 for(const current of plan.tasks){
  const previous=reportTasks.get(current.id);
  if(!previous)fail('Task added or removed: '+current.id);
   let expected=taskFromReport(previous);
   if(pathOnly){expected=rewritePlanPathReferences(expected);}
  for(const change of changeMap.values()){
   if(change.taskId!==current.id)continue;
   if(change.mode==='append'){
    if(stable(expected[change.field])!==stable(change.before)||stable(current[change.field])!==stable(change.after))fail(`Migration does not match baseline/current ${current.id}.${change.field}`);
    const added=change.after.filter(value=>!change.before.includes(value)),removed=change.before.filter(value=>!change.after.includes(value));
    if(stable(added)!==stable(change.added)||removed.length!==0||new Set(change.after).size!==change.after.length)fail(`Invalid append-only scope delta in ${current.id}.${change.field}`);
    expected[change.field]=change.after;
    continue;
   }
   const indexed=/^([A-Za-z][A-Za-z0-9]*)\[(\d+)\]$/.exec(change.field);
   if(change.mode!=='replace'||!indexed)fail('Unsupported migration change mode');
   const [,field,indexText]=indexed,index=Number(indexText),items=expected[field],currentItems=current[field];
   if(!Array.isArray(items)||!Array.isArray(currentItems)||index>=items.length||items[index]!==change.before||currentItems[index]!==change.after||items.length!==currentItems.length)fail(`Migration does not match baseline/current ${current.id}.${change.field}`);
   items[index]=change.after;
  }
  if(pathOnly){
   const changedTaskIds=report.tasks.filter(task=>stable(taskFromReport(task))!==stable(rewritePlanPathReferences(taskFromReport(task)))).map(task=>task.id);
   if(stable(migration.invariants?.changedTaskIds)!==stable(changedTaskIds))fail('Path migration changed-task declaration is incomplete or incorrect');
  }
  if(stable(expected)!==stable(current))fail(`Undeclared plan change: ${current.id}`);
 }
 if(migration.invariants?.taskCount!==28||migration.invariants?.stepCount!==140||stable(migration.invariants?.phaseWeights)!==stable(plan.phases.map(phase=>phase.weightPercent)))fail('Migration invariant declaration is incomplete or incorrect');
 return {currentPlanSha,reportSha:migration.baselineReport.sha256,taskCount,stepCount};
}
function renderReports(){const r=summary();renderDetailedPlan(r);
 if(frontend){
  atomicWrite(path.join(ROOT,'execution/frontend-progress-report.json'),r);
  const lines=['# TIẾN ĐỘ FRONTEND VỚI MOCK API',`\nKế hoạch ${r.planId}: **${r.overallPercent}%**, ${r.verifiedSteps}/${r.totalSteps} bước được xác minh.`, '\nScope: FRONTEND_WITH_SYNTHETIC_MOCK_API. Không chứng nhận backend/staging/production hệ thống hoặc quyền phát hành.', '\nPhần trăm này đo evidence còn hiệu lực, không phải lượng code đã viết. STALE có thể trả 0% dù implementation vẫn có; chỉ tái xác minh checkpoint đúng task/dependency mới nhận điểm.', '\n| Task | Tên | Phụ thuộc | Trạng thái | Đã xác minh |','|---|---|---|---|---:|',...r.tasks.map(t=>`| ${t.id} | ${t.title} | ${t.dependsOn.join(', ')||'—'} | ${t.status} | ${t.percent}% |`)];
  fs.writeFileSync(path.join(ROOT,'execution/FRONTEND_PROGRESS.md'),lines.join('\n')+'\n');
  return r;
 }
atomicWrite(path.join(ROOT,'execution/progress-report.json'),r);const lines=['# TIẾN ĐỘ TRIỂN KHAI THỰC TẾ',`\nGói ${release.version} • Graphite Gold đã duyệt • palette ${release.versions.palette}.`,`\nKế hoạch ${r.planId}. **${r.overallPercent}%** được kiểm chứng; ${r.verifiedSteps}/${r.totalSteps} checkpoints.`, '\nKhông cộng điểm cho demo/tài liệu có sẵn. Phần thiếu hoặc source thay đổi giữ STALE. Không tự cho phép release.','\n| Giai đoạn | Trọng số | Đã xác minh |','|---|---:|---:|',...r.phases.map(p=>`| ${p.id} ${p.title} | ${p.weightPercent}% | ${p.percent.toFixed(2)}% |`),'\n| Task | Tên | Phụ thuộc | Trạng thái | Hoàn thành |','|---|---|---|---|---:|',...r.tasks.map(t=>`| ${t.id} | ${t.title} | ${t.dependsOn.join(', ')||'—'} | ${t.status} | ${t.percent}% |`)];fs.writeFileSync(path.join(ROOT,'execution/PROGRESS.md'),lines.join('\n')+'\n');
 const css=fs.readFileSync(path.join(ROOT,'design/tokens.css'),'utf8');
 const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Tiến độ BotSales AI — Graphite Gold ${safe(release.version)}</title><style>${css}*{box-sizing:border-box}body{background:var(--color-canvas);color:var(--color-text-primary);font:15px/1.6 system-ui;margin:0;padding:24px}main{max-width:1160px;margin:auto}.muted{color:var(--color-text-secondary)}h1{font-size:30px}header,details{background:var(--color-surface);border:1px solid var(--color-border-decorative);border-radius:12px;padding:18px;margin:12px 0}.big{font-size:48px;font-weight:700;color:var(--color-accent)}progress{width:100%;accent-color:var(--color-accent);height:16px}summary{cursor:pointer;font-weight:650;display:flex;gap:12px;justify-content:space-between}td,th{padding:10px;text-align:left;border-bottom:1px solid var(--color-border-decorative)}table{border-collapse:collapse;width:100%}.table{overflow:auto}code{word-break:break-word}.step{padding:10px 0;border-bottom:1px solid var(--color-border-decorative)}.tag{font-size:12px;color:var(--color-warning)}a{color:var(--color-accent)}input{background:var(--color-canvas);border:1px solid var(--color-border-control);border-radius:8px;padding:12px;color:inherit;width:100%}@media(max-width:600px){body{padding:12px}summary{display:block}}</style><main><p class="muted">BOTSALES AI • GÓI ${safe(release.version)} • GRAPHITE GOLD ĐÃ DUYỆT • KHÔNG PHẢI % DEMO</p><h1>Tiến độ triển khai thực tế</h1><header><div class="big">${r.overallPercent}%</div><progress max="100" value="${r.overallPercent}"></progress><p>${r.verifiedSteps}/${r.totalSteps} bước có bằng chứng còn hiệu lực • ${r.tasks.filter(t=>t.done).length}/${r.tasks.length} đầu việc hoàn thành</p><p class="muted">Đây là báo cáo sinh từ tracker. AI phải cập nhật bằng chứng rồi chạy <code>node scripts/progress.mjs report</code>. Không chỉnh phần trăm bằng tay; mở lại file sau khi sinh. Task BLOCKED giữ điểm bước trước còn hợp lệ nhưng chưa DONE; STALE mất điểm liên quan. Bản demo đang có không phải ứng dụng production đã hoàn thành.</p></header><label for="q">Tìm mã việc, tính năng hoặc nội dung</label><input id="q" placeholder="Ví dụ: T034, Telegram, kế toán…"><div id="tasks">${r.phases.map(p=>`<section><h2>${p.id} · ${safe(p.title)} <small>${p.percent.toFixed(1)}%</small></h2>${r.tasks.filter(t=>t.phase===p.id).map(t=>`<details data-search="${safe([t.id,t.title,...t.featureIds].join(' ').toLowerCase())}"><summary><span>${t.id} · ${safe(t.title)}</span><span class="tag">${t.status} · ${t.percent}%</span></summary><p class="muted">Phụ thuộc: ${t.dependsOn.join(', ')||'Không'} • Chủ nhiệm: ${safe(t.owner||'Chưa nhận việc')}</p>${t.blockedReason?`<p>${safe(t.blockedReason)}</p>`:''}<p>${t.featureIds.join(' · ')}</p>${t.steps.map(s=>`<div class="step"><strong>${s.id} — ${s.status}</strong><br>${safe(s.action)}${s.note?`<p class="tag">${safe(s.note)}</p>`:''}</div>`).join('')}<p>Vùng sửa: <code>${safe(t.writeScope.join('; '))}</code></p></details>`).join('')}</section>`).join('')}</div></main><script>document.querySelector('#q').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('details').forEach(d=>d.hidden=!d.dataset.search.includes(q));});</script></html>`;fs.writeFileSync(path.join(ROOT,'execution/PROGRESS.html'),html);return r;
}

function taskMarkdown(t){
 const docPath=p=>frontend?p.replace(/^(?:\.\.\/)?botsales-kit\//,''):p;
 return [ `## ${t.id} — ${t.title}`, `**Giai đoạn:** ${t.phase} · **Ưu tiên:** ${t.priority} · **Trạng thái:** ${t.status} · **Đã xác minh:** ${t.percent}%`, `\n**Phụ thuộc phải DONE:** ${t.dependsOn.join(', ')||'Không'}. **Chủ nhiệm:** ${t.owner||'Chưa nhận việc'}.`, `\n**Yêu cầu:** ${t.featureIds.join(', ')}.`, ...(frontend?[`\n**Route IDs:** ${t.routeIds.join(', ')||'Task nền tảng/xuyên ứng dụng'}. Operation IDs cụ thể nằm trong frontend-plan.json và route-manifest.json.`, `\n**Mức kiểm:** ${t.verificationLevel}. Task T tham chiếu ${t.sourceTaskIds.join(', ')||'không'} chỉ là đặc tả gốc, không phải dependency hoặc ledger đang nhận việc.`]:[]), '\n### Đọc trước khi sửa', ...t.readFirst.map(p=>'- `'+docPath(p)+'`'), '\n### Vùng được sửa / đầu ra bắt buộc', ...t.writeScope.map(p=>'- `'+docPath(p)+'`'), '\n### Thực hiện tuần tự',...t.steps.map(s=>`\n#### ${t.id}.${s.id} · ${s.weight}/10 điểm · ${s.status}\n\n${s.action}\n\n**Bằng chứng:** ${s.requiredEvidenceKind}. ${s.verification}${s.note?'\n\n**Cần kiểm lại:** '+s.note:''}`), '\n### Kiểm tra nghiệm thu của đầu việc',...t.acceptanceCases.map(c=>'- '+c), '\n### Điều kiện dừng đúng phạm vi',...t.stopConditions.map(c=>'- '+c), `\n**Bàn giao:** \`${docPath(t.handoff)}\`. ${t.commandPolicy}`, '\nKhông chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.\n' ].join('\n');
}
function renderDetailedPlan(r){
 let intro=fs.readFileSync(path.join(ROOT,frontend?'execution/FRONTEND_PLAN_GUIDE.md':'execution/PLAN_GUIDE.md'),'utf8');
 if(frontend)intro=intro.replace(/\]\(([^\s)]+)\)/g,(link,target)=>{
  if(/^[a-z][a-z0-9+.-]*:/i.test(target)||target.startsWith('/'))return link;
  const [file,anchor]=target.split('#');
  const destination=path.posix.normalize(path.posix.join('execution',file||'FRONTEND_PLAN_GUIDE.md'));
  return ']('+destination+(anchor?'#'+anchor:'')+')';
 });
 const content=[intro,`\n## Tiến độ tại lần sinh này\n\n**${r.overallPercent}% — ${r.verifiedSteps}/${r.totalSteps} bước — ${r.tasks.filter(t=>t.done).length}/${r.tasks.length} việc.** ${frontend?'Đây là tỷ lệ bằng chứng FE còn hiệu lực theo dependency và source hashes, không phải phần trăm code đã viết. STALE làm mất điểm kiểm chứng dù source vẫn tồn tại; không cộng checkpoint từ suite chung. Scope Frontend + API mock, không phải backend/toàn hệ thống.':'Đây là tiến độ sản phẩm thật, không phải % tài liệu/demo.'}\n`, '| Giai đoạn | Trọng số | Đã xác minh | Đầu việc |','|---|---:|---:|---|',...r.phases.map(p=>`| ${p.id} ${p.title} | ${p.weightPercent}% | ${p.percent.toFixed(2)}% | ${r.tasks.filter(t=>t.phase===p.id).map(t=>t.id).join('–')} |`),'\n## Mục lục đầu việc\n',...r.tasks.map(t=>`- [${t.id} — ${t.title}](${taskDir}/${t.id}.md) · ${t.status} · ${t.percent}%`),'\n---\n',...r.tasks.map(taskMarkdown)].join('\n');
 fs.writeFileSync(path.join(ROOT,frontend||!hasFrontendPlan?'IMPLEMENTATION_PLAN.md':'execution/FULL_PRODUCT_PLAN.md'),content+'\n');
 fs.mkdirSync(path.join(ROOT,taskDir),{recursive:true});
 for(const t of r.tasks)fs.writeFileSync(path.join(ROOT,taskDir,t.id+'.md'),`# Phiếu triển khai — gói ${release.version}\n\nSinh từ ${prefix}plan.json + ${prefix}progress.json; Graphite Gold đã duyệt tại design/decision.json.\n\nĐường dẫn trong phiếu tính từ thư mục gốc của bộ tài liệu; vùng code tính từ repo đã khảo sát. Không sửa tay file sinh.\n\n`+taskMarkdown(t));
}

function getTask(id){return taskMap.get(id)||fail('Unknown task '+id);}
try{
 const [cmd='status',id,arg,arg2]=cliArgs;
 if(cmd==='rebaseline'){
  validateStructure({allowPlanHashMismatch:true});
  const migrationPath=rel(ROOT,id),migration=read(migrationPath),verified=verifyPlanMigration(migration);
  mutate(()=>{state.planSha256=verified.currentPlanSha;state.migrations=[...(state.migrations||[]),{id:migration.id,path:path.relative(ROOT,migrationPath).replaceAll('\\','/'),sha256:sha(fs.readFileSync(migrationPath)),fromPlanSha256:migration.fromPlanSha256,toPlanSha256:verified.currentPlanSha,baselineReportSha256:verified.reportSha,authorizationRef:migration.authorizationRef}];});
  console.log(JSON.stringify({applied:true,migrationId:migration.id,fromPlanSha256:migration.fromPlanSha256,toPlanSha256:verified.currentPlanSha,taskCount:verified.taskCount,stepCount:verified.stepCount,phaseWeights:plan.phases.map(phase=>phase.weightPercent)},null,2));
 }else{
 validateStructure();
 if(cmd==='validate'){console.log(JSON.stringify({valid:true,tasks:plan.tasks.length,checkpoints:plan.tasks.reduce((n,t)=>n+t.implementationSteps.length,0),scope:'Structure only; does not run product tests'}));}
 else if(cmd==='status'){const r=summary();console.log(JSON.stringify({overallPercent:r.overallPercent,verifiedSteps:r.verifiedSteps,totalSteps:r.totalSteps,phases:r.phases,next:nextTasks().slice(0,3).map(t=>({id:t.id,title:t.title,nextStep:t.steps.find(s=>s.status!=='VERIFIED')})),blocked:r.tasks.filter(t=>t.status==='BLOCKED').map(t=>({id:t.id,reason:t.blockedReason})),stale:r.tasks.filter(t=>t.status==='STALE').map(t=>t.id)},null,2));}
 else if(cmd==='next'){const t=nextTasks()[0];console.log(JSON.stringify(t||{message:'No ready task. Check blockers, dependencies and release authority; do not bypass.'},null,2));}
 else if(cmd==='report'){const r=renderReports();console.log(`Generated ${frontend?'IMPLEMENTATION_PLAN.md and execution/FRONTEND_PROGRESS.md':'execution/FULL_PRODUCT_PLAN.md and PROGRESS reports'} — ${r.overallPercent}% verified.`);}
 else if(cmd==='bind'){if(!id||!fs.statSync(path.resolve(id)).isDirectory())fail('bind requires actual repo directory');mutate(()=>{if(Object.values(state.tasks).some(t=>Object.values(t.steps).some(s=>s.status==='VERIFIED')))fail('Cannot change source root after verification without approved rebaseline');state.sourceRootRelative=path.relative(ROOT,path.resolve(id));});console.log('Bound source root; no source files modified.');}
 else if(cmd==='start'){getTask(id);if(!arg?.trim())fail('start TASK OWNER');const eff=effective().get(id);if(!eff.dependencyReady||eff.done||eff.status==='BLOCKED')fail('Task not ready');mutate(()=>{const active=Object.entries(state.tasks).find(([k,t])=>k!==id&&t.status==='IN_PROGRESS'&&!effective().get(k).done);if(active)fail('Sequential mode: finish/block active task '+active[0]);if(state.tasks[id].owner&&state.tasks[id].owner!==arg)fail('Different owner requires explicit handoff');state.tasks[id].owner=arg;state.tasks[id].status='IN_PROGRESS';});console.log('Started '+id);}
 else if(cmd==='block'){getTask(id);if(!arg||arg.length<5)fail('block TASK "specific reason"');mutate(()=>{state.tasks[id].status='BLOCKED';state.tasks[id].blockedReason=arg;});console.log('Blocked '+id+'; independent ready tasks remain selectable.');}
 else if(cmd==='resume'){getTask(id);mutate(()=>{if(state.tasks[id].status!=='BLOCKED')fail('Not blocked');state.tasks[id].status='NOT_STARTED';state.tasks[id].blockedReason=null;});console.log('Blocker cleared; start task explicitly with owner.');}
 else if(cmd==='checkpoint'){const t=getTask(id),s=t.implementationSteps.find(s=>s.id===arg)||fail('Unknown step');if(!arg2)fail('checkpoint TASK STEP relative/evidence.json');const current=effective().get(id);if(state.tasks[id].status!=='IN_PROGRESS'||!state.tasks[id].owner)fail('Claim task first');if(!current.dependencyReady)fail('Dependency not verified');if(current.steps.find(s=>s.status!=='VERIFIED')?.id!==s.id)fail('Complete checkpoints in order; do not bypass');const v=verifyEvidence(t,s,arg2);mutate(()=>{state.tasks[id].steps[s.id]={status:'VERIFIED',evidence:{path:arg2,sha256:v.sha256},verifiedAt:new Date().toISOString()};state.tasks[id].status=effective().get(id).done?'DONE':'IN_PROGRESS';});if(!deferReports)renderReports();console.log('Evidence recorded '+id+'.'+s.id+'. This validates evidence structure/hashes, not truth of unobserved claims.');}
 else if(cmd==='invalidate'){getTask(id);if(!arg||arg.length<5)fail('invalidate TASK "reason"');mutate(()=>{for(const step of Object.values(state.tasks[id].steps))if(step.status==='VERIFIED')step.status='STALE';state.tasks[id].status='NOT_STARTED';state.tasks[id].blockedReason=arg;});if(!deferReports)renderReports();console.log('Invalidated; dependent evidence also loses eligibility.');}
 else fail('Usage: node scripts/progress.mjs validate|status|next|report|rebaseline MIGRATION|bind REPO|start TASK OWNER|block TASK "reason"|resume TASK|checkpoint TASK STEP EVIDENCE|invalidate TASK "reason"');
 }
}catch(e){console.error('PROGRESS_ERROR: '+e.message);process.exitCode=1;}
