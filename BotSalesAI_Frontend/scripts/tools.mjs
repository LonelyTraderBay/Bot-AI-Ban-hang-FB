import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
export const require=createRequire(join(root,'package.json'));
export function typescript(){try{return {ts:require('typescript'),path:require.resolve('typescript/lib/tsc.js'),source:require.resolve('typescript').startsWith(join(root,'node_modules'))?'project dependency':'environment compiler (not installed project version)'};}catch{const global=execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8',shell:process.platform==='win32'}).trim();return {ts:require(join(global,'typescript')),path:join(global,'typescript/lib/tsc.js'),source:'available global compiler (not project version validation)'};}}
