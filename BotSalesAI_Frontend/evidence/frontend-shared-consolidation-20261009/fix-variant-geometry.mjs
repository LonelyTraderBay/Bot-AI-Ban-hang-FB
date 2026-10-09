import fs from 'node:fs';
import path from 'node:path';
const output=import.meta.dirname,root=path.resolve(output,'../..');
fs.copyFileSync(path.join(output,'variant-regression-latest.json'),path.join(output,'variant-before.json'));
const file=path.join(root,'apps/web/src/modules/catalog/index.tsx');
const source=fs.readFileSync(file,'utf8');
const before=source.split(/\r?\n/).find(line=>line.includes('<Panel title="Biến thể và giá"'));
if(!before?.includes('sx={{ flex: 1 }}'))throw Error('Unexpected variant owner');
const geometry="sx={{ width: { xs: '100%', md: 'auto' }, minWidth: 'min(100%, 12em)', maxWidth: '100%', flex: { xs: '0 1 auto', md: '1 1 12em' } }}";
const after=before.replace('alignItems="start"','alignItems={{ xs: \'stretch\', md: \'start\' }} flexWrap="wrap"')
    .replace('disabled={!canWrite}/><TextField label="Tên / màu / kích cỡ"',`disabled={!canWrite} ${geometry}/><TextField label="Tên / màu / kích cỡ"`)
    .replace('sx={{ flex: 1 }}',geometry)
    .replace('disabled={!canWrite}/><FormControlLabel',`disabled={!canWrite} ${geometry}/><FormControlLabel`);
if(after===before||(after.match(/1 1 12em/g)||[]).length!==3)throw Error('Incomplete owner edit');
fs.writeFileSync(file,source.replace(before,after));
