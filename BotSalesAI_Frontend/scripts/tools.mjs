import {createRequire} from 'node:module';
import {readFileSync,realpathSync} from 'node:fs';
import {isAbsolute,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
export const require=createRequire(join(root,'package.json'));
export function typescript(){
    try {
        const expected=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).devDependencies.typescript;
        if(!/^\d+\.\d+\.\d+$/.test(expected)) throw new Error('TypeScript must have an exact project version');
        const dependencyRoot=realpathSync(join(root,'node_modules'));
        const paths=['typescript/package.json','typescript','typescript/lib/tsc.js'].map(name=>realpathSync(require.resolve(name)));
        for(const file of paths){
            const location=relative(dependencyRoot,file);
            if(location==='..'||location.startsWith(`..${sep}`)||isAbsolute(location)) throw new Error(`Compiler resolved outside project dependencies: ${file}`);
        }
        const installed=JSON.parse(readFileSync(paths[0],'utf8')).version;
        const ts=require('typescript');
        if(installed!==expected||ts.version!==expected) throw new Error(`Expected TypeScript ${expected}; manifest ${installed}, module ${ts.version}`);
        return {ts,path:paths[2],source:'project dependency'};
    } catch(cause) {
        const error=new Error('Cannot validate the pinned project TypeScript compiler. Install the locked local dependencies before running checks.',{cause});
        error.code='ERR_PROJECT_TYPESCRIPT';
        throw error;
    }
}
