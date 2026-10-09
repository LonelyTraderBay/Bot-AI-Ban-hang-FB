import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const frontend = path.resolve(import.meta.dirname, '../..');
const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const bounded = [path.dirname(process.execPath),path.join(frontend,'node_modules/.bin'),'C:/Windows/System32','C:/Windows','C:/Program Files/Git/cmd'].join(path.delimiter);
const runs = [];
for (const [name, env] of [['inherited',process.env],['bounded',{...process.env,PATH:bounded}]]) {
    const startedAt = new Date().toISOString();
    const result = spawnSync(process.execPath,[npm,'run','typecheck'],{cwd:frontend,env,encoding:'utf8',windowsHide:true});
    const file = path.join(import.meta.dirname,'wrapper-' + name + '.log');
    fs.writeFileSync(file,(result.stdout || '') + (result.stderr || ''));
    runs.push({ name, startedAt, finishedAt:new Date().toISOString(), executable:process.execPath,args:[npm,'run','typecheck'],cwd:frontend,pathLength:(env.PATH || env.Path || '').length,exitCode:result.status ?? 1,log:{path:path.relative(path.dirname(frontend),file).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')} });
}
const inherited = fs.readFileSync(path.join(import.meta.dirname,'wrapper-inherited.log'),'utf8');
const result = { measuredAt:new Date().toISOString(),runs, CLIExists:fs.existsSync(path.join(frontend,'node_modules/.bin/tsc.cmd')), explanation:runs[0].exitCode && !runs[1].exitCode && /not recognized|không|cannot find/i.test(inherited) ? 'Same pinned npm/tsc/source: inherited PATH fails CLI lookup; bounded PATH resolves it. The long inherited environment causes command lookup failure, not a missing compiler or type error. No execution policy or dependency change.' : 'The paired executions are recorded as observed; do not infer a lookup failure if it did not recur.' };
fs.writeFileSync(path.join(import.meta.dirname,'wrapper-diagnosis-current.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
if(runs[1].exitCode) process.exitCode=1;
