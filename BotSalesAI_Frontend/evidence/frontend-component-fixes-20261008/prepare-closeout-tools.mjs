import fs from 'node:fs';
import path from 'node:path';
const owner = path.resolve(import.meta.dirname, '../frontend-toolbar-20261008');
for (const file of ['run-clean-build.mjs', 'capture-contract-crosswalk.mjs', 'inventory-current.mjs', 'review-built-comparison.mjs', 'register-current-commands.mjs', 'revalidate-checkpoints.mjs', 'revalidate-canonical.mjs', 'build-handoff.mjs', 'verify-documents.mjs', 'run-final-verify.mjs']) {
  const target = path.join(import.meta.dirname, file);
  if (fs.existsSync(target)) throw new Error('Refusing to replace an existing helper: ' + file);
  let source = fs.readFileSync(path.join(owner, file), 'utf8')
    .replaceAll('frontend-toolbar-20261008/', 'frontend-component-fixes-20261008/')
    .replaceAll('-toolbar-20261008', '-components-20261008')
    .replaceAll("'toolbar-'", "'components-'")
    .replaceAll("'toolbar-install'", "'components-install'")
    .replaceAll("'toolbar-setup'", "'components-setup'")
    .replaceAll("'toolbar-clean-install'", "'components-clean-install'")
    .replaceAll('botsales-toolbar-clean', 'botsales-components-clean');
  if (['revalidate-checkpoints.mjs', 'build-handoff.mjs'].includes(file)) source = source.replaceAll('566', '580');
  if (file === 'build-handoff.mjs') source = source.replace('perEngine: 283', 'perEngine: 290');
  if (file === 'revalidate-canonical.mjs') source = source.replace('Tái xác minh Toolbar/Shell', 'Tái xác minh A01–A07 và dependency Frontend');
  fs.writeFileSync(target, source);
}
console.log('Task-owned copies prepared; original evidence helpers remain unchanged.');
