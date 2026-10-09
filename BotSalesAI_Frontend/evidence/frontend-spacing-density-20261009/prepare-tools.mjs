import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..'), old='evidence/frontend-shared-consolidation-20261009', current='evidence/frontend-spacing-density-20261009';
for(const name of ['run-checks.mjs','run-final-verify.mjs','refresh-s17.mjs','environment-check.mjs','run-clean-build.mjs','inventory-current.mjs','capture-shared-api.mjs','refresh-route-matrices.mjs','revalidate-canonical.mjs','revalidate-checkpoints.mjs','register-current-commands.mjs']){
 const target=path.join(import.meta.dirname,name);if(fs.existsSync(target))throw Error('Already prepared '+name);
 let code=fs.readFileSync(path.join(root,old,name),'utf8').replaceAll(old,current);
 if(name==='run-checks.mjs'){
  code=code.replace('`shared-${Date.now()}-${process.pid}`','`density-${Date.now()}-${process.pid}`');
  code=code.replace("const commands = {", "const commands = {\n    density: ['node_modules/@playwright/test/cli.js', 'test', 'tests/ui-density-layout.spec.ts', '--reporter=line'],\n    'owner-regression': ['node_modules/@playwright/test/cli.js', 'test', 'tests/ui-finance-layout.spec.ts', 'tests/ui-shell-layout.spec.ts', 'tests/ui-component-layout.spec.ts', 'tests/ui-toolbar-layout.spec.ts', '--reporter=line'],");
  code=code.replace("const preserve = [", "const preserve = ['density','owner-regression',");
 }
 fs.writeFileSync(target,code);
}
console.log('Prepared existing owning runners in isolated density evidence namespace.');
