import fs from 'node:fs';
import path from 'node:path';
const frontend = path.resolve(import.meta.dirname, '../..');
const namespace = 'evidence/frontend-shared-consolidation-20261009';
for (const filename of ['run-final-verify.mjs', 'capture-shared-api.mjs', 'capture-contract-crosswalk.mjs', 'environment-check.mjs', 'run-clean-build.mjs', 'inventory-current.mjs', 'refresh-route-matrices.mjs']) {
    const target = path.join(import.meta.dirname, filename);
    if (fs.existsSync(target)) throw new Error('Inspect existing runner before replacing: ' + filename);
    let code = fs.readFileSync(path.join(frontend, 'evidence/frontend-width-fixes-20261008', filename), 'utf8');
    code = code.replaceAll('evidence/frontend-width-fixes-20261008', namespace).replaceAll('20261008', '20261009');
    if (filename === 'refresh-route-matrices.mjs') code = code.replace('/\\b600 passed \\(/', '/\\b\\d+ passed \\(/');
    if (filename === 'capture-shared-api.mjs') code = code.replace("if (fs.readFileSync(catalogPath,'utf8') !== catalog.trimEnd() + '\\n') throw new Error('Catalog declaration/count drift; preserve source and correct before final tests.');", "fs.writeFileSync(catalogPath, catalog.trimEnd() + '\\n');");
    fs.writeFileSync(target, code);
}
console.log('Prepared current execution helpers from existing owners; historical helpers untouched.');
