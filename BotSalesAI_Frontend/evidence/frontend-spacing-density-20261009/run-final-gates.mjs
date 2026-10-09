import {spawn} from 'node:child_process'; import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..'), prefix='evidence/frontend-spacing-density-20261009/';
const steps=[
 ['run-checks.mjs','contracts'],['run-checks.mjs','unit'],['run-checks.mjs','layout'],['run-checks.mjs','evidence-validator'],['refresh-s17.mjs'],
 ['run-final-verify.mjs'],['run-checks.mjs','source-maps'],['run-checks.mjs','e2e'],['run-checks.mjs','build-demo'],['run-checks.mjs','built-demo'],
 ['publish-current-proofs.mjs','check-browser'],['publish-current-proofs.mjs'],['review-built-shared.mjs'],
 ['capture-shared-browser-zoom.mjs'],['capture-shared-text-zoom.mjs'],['record-native.mjs'],['environment-check.mjs'],['run-clean-build.mjs'],
];
for(const [name,...args]of steps){
 console.log('DENSITY_STAGE_START '+[name,...args].join(' '));
 const child=spawn(process.execPath,[prefix+name,...args],{cwd:root,windowsHide:true,stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 if(code!==0){console.error('DENSITY_STAGE_FAILED '+name+' '+args.join(' '));process.exitCode=code||1;break;}
 console.log('DENSITY_STAGE_PASS '+[name,...args].join(' '));
}
