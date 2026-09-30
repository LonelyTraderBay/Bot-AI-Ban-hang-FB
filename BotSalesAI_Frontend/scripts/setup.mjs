import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {root,require} from './tools.mjs';
if(Number(process.versions.node.split('.')[0])!==24){console.error('Ứng dụng yêu cầu Node.js 24 theo bộ chuẩn. Không tự bỏ engine check.');process.exit(1);}
function run(args,cwd=root){const r=spawnSync(process.execPath,args,{cwd,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
run(['scripts/generate.mjs']);
let metadata;try{metadata=require.resolve('msw/package.json');}catch{console.error('Chưa cài dependencies. Chạy npm install trước.');process.exit(1);}
const pkg=JSON.parse(fs.readFileSync(metadata,'utf8'));const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin.msw;
run([path.resolve(path.dirname(metadata),bin),'init','public','--save'],path.join(root,'apps/web'));
if(!fs.existsSync(path.join(root,'.env.local')))fs.copyFileSync(path.join(root,'.env.example'),path.join(root,'.env.local'));
console.log('Thiết lập xong. npm run dev chạy frontend mô phỏng; không kết nối khách hàng hoặc provider thật.');
