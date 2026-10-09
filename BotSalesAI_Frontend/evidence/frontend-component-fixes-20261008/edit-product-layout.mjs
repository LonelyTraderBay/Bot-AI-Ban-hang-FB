import fs from 'node:fs';
const file = 'apps/web/src/modules/catalog/index.tsx';
let source = fs.readFileSync(file, 'utf8');
const search = '<TextField label="Tìm danh mục" size="small" value={categorySearch} onChange={event => setCategorySearch(event.target.value)} disabled={!canWrite} helperText="Tìm trên danh sách cửa hàng; có thể tải thêm khi cần."/>';
const outer = '<FieldGroup direction={{ xs: \'column\', sm: \'row\' }}  alignItems={{ xs: \'stretch\', sm: \'center\' }}><Controller name="categoryId"';
if (source.split(search).length !== 2 || source.split(outer).length !== 2) throw new Error('Product layout source has changed; inspect before editing.');
source = source.replace(search, '').replace(outer, search + '<FieldGroup direction={{ xs: \'column\', sm: \'row\' }} alignItems={{ xs: \'stretch\', sm: \'start\' }}><Controller name="categoryId"');
fs.writeFileSync(file, source);
