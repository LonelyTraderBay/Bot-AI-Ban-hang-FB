import fs from 'node:fs';import path from 'node:path';import {root,require} from './tools.mjs';
const checks=[];function check(name,pass,detail){checks.push({name,status:pass?'PASS':'BLOCKED',detail});}
check('Node.js 24',Number(process.versions.node.split('.')[0])===24,process.version);
for(const pkg of ['typescript','vite','react','@mui/material','@tanstack/react-query','msw']){try{check(pkg,require.resolve(pkg).startsWith(path.join(root,'node_modules')),require.resolve(pkg));}catch{check(pkg,false,'Chạy npm install trong thư mục gốc có Internet.');}}
check('MSW browser worker',fs.existsSync(path.join(root,'apps/web/public/mockServiceWorker.js')),'Chạy npm run setup sau khi cài thư viện.');
check('Lockfile',fs.existsSync(path.join(root,'package-lock.json')),'Tạo bằng npm install; không có lockfile giả trong bản nguồn.');
console.table(checks);if(checks.some(c=>c.status!=='PASS'))process.exitCode=1;
