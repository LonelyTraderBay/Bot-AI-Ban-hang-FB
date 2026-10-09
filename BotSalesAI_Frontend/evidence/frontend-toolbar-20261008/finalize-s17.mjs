import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const frontend = path.resolve(import.meta.dirname, '../..'), root = path.dirname(frontend);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const target = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const previous = read(target); const archive = path.join(import.meta.dirname, 'S17-before-toolbar.json');
if (!fs.existsSync(archive)) fs.copyFileSync(target, archive);
const checks = [], fingerprints = {};
for (const [stage, count] of [['contracts',38], ['layout',82], ['evidence-validator',11]]) {
 const pointer = read(path.join(import.meta.dirname,stage+'-latest.json')), record = read(path.join(root,pointer.record));
 if (record.exitCode !== 0 || record.sourceDrift.length || hash(path.join(root,record.log.path)) !== record.log.sha256) throw new Error('Unverified '+stage);
 for (const [file, digest] of Object.entries(record.sourceFingerprints)) if (hash(path.join(root,file)) !== digest) throw new Error('Stale '+stage+':'+file);
 const text = fs.readFileSync(path.join(root,record.log.path),'utf8');
 if (!new RegExp('pass '+count+'(?:\\s|$)').test(text) || !/fail 0(?:\s|$)/.test(text)) throw new Error('Incomplete '+stage);
 const observation = `${count}/${count} fixtures PASS` + (stage === 'layout' ? '; source scan 79 files, 0 findings, 1 declared exception' : '');
 if (stage === 'layout' && !text.includes('layout-check PASS: 79 source files, 0 finding(s), 1 exception(s) used')) throw new Error('Source scope drift');
 checks.push({id:stage,command:record.executable+' '+record.args.join(' '),exitCode:0,result:'PASS',expected:observation,observed:observation,log:record.log});
 Object.assign(fingerprints,record.sourceFingerprints);
}
for (const file of Object.keys(previous.sourceFingerprints)) fingerprints[file] = hash(path.join(root,file));
const manifest = {...previous,recordedAt:new Date().toISOString(),checks,coverage:[['contracts',38],['layout',82],['evidence-validator',11]].map(([name,count])=>({name,expected:count,observed:count,missing:0,result:'COMPLETE'})),sourceFingerprints:fingerprints};
fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
console.log('S17 refreshed from current actual fixture logs; previous bytes archived.');
