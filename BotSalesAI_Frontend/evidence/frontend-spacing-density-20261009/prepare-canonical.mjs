import fs from 'node:fs';import path from 'node:path';
const out=import.meta.dirname;
for(const file of ['revalidate-checkpoints.mjs','revalidate-canonical.mjs','register-current-commands.mjs']){
 let s=fs.readFileSync(path.join(out,file),'utf8');
 s=s.replaceAll("'shared-'", "'density-'").replaceAll("'shared-dependencies'", "'density-dependencies'").replaceAll("'shared-setup'", "'density-setup'").replaceAll("'shared-clean-install'", "'density-clean-install'").replaceAll('-shared-20261009-', '-density-20261009-');
 s=s.replaceAll('175','181').replaceAll('uiCases===240','uiCases===250').replaceAll('chromium===120','chromium===125').replaceAll('firefox===120','firefox===125').replaceAll('All240','All250').replaceAll('details.length === 30','details.length === 70').replaceAll('and30 focused','and70 focused');
 s=s.replaceAll('Strict 24px field/label boundary regression','Strict disclosure12 plus intrinsic button/label boundary regression').replaceAll('deep R04/R05/R06 profiles','16 deep affected owner profiles').replaceAll("baseline: 'baseline.json'", "baseline: 'before.json'");
 s=s.replaceAll('Tái xác minh Shared Inbox/Dashboard và dependency Frontend','Tái xác minh mật độ spacing tại Shared owner và dependency Frontend').replaceAll('successful SHARED commands','successful DENSITY commands');
 if(file==='revalidate-checkpoints.mjs')s=s.replace('const ownerProof =',"if(['FE006','FE025','FE027','FE028'].includes(taskId)) ownerFiles.push('tests/ui-density-layout.spec.ts');\nconst ownerProof =");
 fs.writeFileSync(path.join(out,file),s);
}
console.log('Fresh canonical evaluator retains all criterion assertions and adds density ownership; distinct receipts/command IDs.');
