import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const frontend = path.resolve(import.meta.dirname, '../..'), repository = path.dirname(frontend), kit = path.join(repository,'botsales-kit');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const plan = JSON.parse(fs.readFileSync(path.join(kit,'execution/frontend-plan.json'),'utf8'));
const round = process.argv[2] || 'r1', selected = process.argv[3]?.split(',');
if (!/^r\d+$/.test(round)) throw new Error('Invalid evidence round');
const candidates = plan.tasks.filter(task => !selected || selected.includes(task.id));
if(selected && candidates.length !== selected.length) throw new Error('Unknown/duplicate task selection');
const taskMap = new Map(candidates.map(task => [task.id, task])), visiting = new Set(), visited = new Set(), tasks = [];
function visit(task) {
    if (visiting.has(task.id)) throw new Error('Dependency cycle: ' + task.id);
    if (visited.has(task.id)) return;
    visiting.add(task.id);
    for (const dependency of task.dependsOn) if (taskMap.has(dependency)) visit(taskMap.get(dependency));
    visiting.delete(task.id); visited.add(task.id); tasks.push(task);
}
for (const task of candidates) visit(task);
const before = path.join(import.meta.dirname,'frontend-progress-before-corrections.json');
if(!fs.existsSync(before)) fs.copyFileSync(path.join(kit,'execution/frontend-progress.json'),before);
const protectedFiles = ['execution/plan.json','execution/progress.json',...fs.readdirSync(path.join(kit,'execution/tasks')).filter(file => /^T\d+\.md$/.test(file)).map(file => 'execution/tasks/' + file)];
const protectedHashes = Object.fromEntries(protectedFiles.map(file => [file,sha(path.join(kit,file))]));
fs.writeFileSync(path.join(import.meta.dirname,'canonical-revalidation-' + round + '-before.json'),JSON.stringify({round,capturedAt:new Date().toISOString(),tasks:tasks.map(task=>task.id),protectedHashes},null,2)+'\n');
const logFile = path.join(import.meta.dirname,'canonical-revalidation-' + round + '.log'), log = [];
function run(args,cwd=kit) {
    const startedAt = new Date().toISOString();
    const result = spawnSync(process.execPath,args,{cwd,encoding:'utf8',windowsHide:true,maxBuffer:12e6});
    const entry = { startedAt,finishedAt:new Date().toISOString(),executable:process.execPath,args,cwd,exitCode:result.status ?? 1,output:(result.stdout || '')+(result.stderr || '') };
    log.push(entry); fs.writeFileSync(logFile,log.map(item => JSON.stringify(item)).join('\n')+'\n');
    if(entry.exitCode) throw new Error(entry.output);
    return entry.output;
}
// All criterion/source/log checks run before the canonical ledger is changed.
for(const task of tasks) for(const step of task.implementationSteps)
    run(['evidence/frontend-corrections-20261008/revalidate-checkpoints.mjs',task.id,step.id,round],frontend);
console.log('All selected checkpoint evidence preflighted: ' + tasks.length*5);
for(const task of tasks) {
    run(['scripts/progress.mjs','invalidate',task.id,'Tái xác minh F01–F09 trên source cuối, test sở hữu và hash thực; giữ mẫu số FE 140.','--defer-reports']);
    run(['scripts/progress.mjs','start',task.id,'Codex','--defer-reports']);
    for(const step of task.implementationSteps)
        run(['scripts/progress.mjs','checkpoint',task.id,step.id,`execution/frontend-evidence/${task.id}/${step.id}-corrections-20261008-${round}.json`,'--defer-reports']);
    console.log('Canonical checkpoints recorded: ' + task.id + ' 5/5');
}
run(['scripts/progress.mjs','report']);
const status = JSON.parse(run(['scripts/progress.mjs','status']));
const drift = Object.keys(protectedHashes).filter(file => sha(path.join(kit,file))!==protectedHashes[file]);
fs.writeFileSync(path.join(import.meta.dirname,'canonical-revalidation-' + round + '.json'),JSON.stringify({round,tasks:tasks.map(task=>task.id),commands:log.length,status,protectedHashes,fullProductDrift:drift,log:{path:path.relative(repository,logFile).replaceAll('\\','/'),sha256:sha(logFile)}},null,2)+'\n');
if(drift.length || status.verifiedSteps!==140 || status.stale.length || status.blocked.length) throw new Error('Canonical refresh incomplete or protected full-product source changed');
fs.writeFileSync(path.join(import.meta.dirname,'canonical-revalidation-latest.json'),JSON.stringify({round,record:'canonical-revalidation-' + round + '.json'},null,2)+'\n');
console.log(JSON.stringify({ verified:status.verifiedSteps,total:status.totalSteps,stale:status.stale,blocked:status.blocked,fullProductDrift:drift }));
