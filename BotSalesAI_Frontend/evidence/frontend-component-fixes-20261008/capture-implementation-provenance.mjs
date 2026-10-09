import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import crypto from 'node:crypto';
const output = import.meta.dirname, frontend = path.resolve(output, '../..');
const read = file => JSON.parse(fs.readFileSync(file,'utf8'));
const baseline = read(path.join(output,'baseline.json'));
const session = 'C:/Users/Joker-PC/.codex/sessions/2026/10/07/rollout-2026-10-07T08-44-33-01a11408-a5e4-7b11-b368-7047a7ae690b.jsonl';
const input = fs.createReadStream(session), lines = readline.createInterface({input,crlfDelay:Infinity});
let firstMutation;
for await (const line of lines) {
 const event = JSON.parse(line);
 if(event.type!=='response_item' || Date.parse(event.timestamp)<=Date.parse(baseline.capturedAt)) continue;
 const payload=event.payload, code=payload?.arguments || payload?.input || '';
 if(!['function_call','custom_tool_call'].includes(payload?.type) || !String(code).includes('apply_patch') || !String(code).includes('*** Update File:') || !/apps[\\/]web[\\/]src/.test(String(code))) continue;
 firstMutation={timestamp:event.timestamp,callId:payload.call_id,tool:payload.name,inputSha256:crypto.createHash('sha256').update(String(code)).digest('hex'),runtimePaths:[...String(code).matchAll(/\*\*\* Update File: ([^\r\n]+)/g)].map(match=>match[1]).filter(file=>/apps[\\/]web[\\/]src/.test(file))};
 break;
}
lines.close();input.destroy();
if(!firstMutation || Date.parse(baseline.capturedAt)>=Date.parse(firstMutation.timestamp)) throw new Error('Actual first runtime patch event not resolved');
const before=read(path.join(output,'runs/components-1791457648969-87668/regression-record.json'));
const mismatches=Object.entries(baseline.source).filter(([file,hash])=>before.sourceFingerprints['BotSalesAI_Frontend/'+file]!==hash).map(([file])=>file);
if(mismatches.length || before.sourceDrift.length || before.exitCode!==1 || Date.parse(before.finishedAt)>Date.parse(firstMutation.timestamp)) throw new Error('Before-source/runtime evidence not paired');
const record={baselineCapturedAt:baseline.capturedAt,implementationStartedAt:firstMutation.timestamp,source:'Actual response_item tool call in this task local session; not inferred from file mtime or a passing test.',sessionPath:session,firstMutation,beforeRegression:{path:'runs/components-1791457648969-87668/regression-record.json',exitCode:before.exitCode,sourceDrift:before.sourceDrift,log:before.log},runtimeFingerprintsCompared:Object.keys(baseline.source).length,mismatches};
const target=path.join(output,'implementation-provenance.json');
if(fs.existsSync(target)) throw new Error('Never overwrite implementation provenance');
fs.writeFileSync(target,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
