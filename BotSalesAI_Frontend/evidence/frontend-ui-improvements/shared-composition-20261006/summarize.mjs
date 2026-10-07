import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { auditComposition } from '../../../scripts/check-ui-composition.mjs';

const directory = 'evidence/frontend-ui-improvements/shared-composition-20261006';
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const current = auditComposition(process.cwd());
const manifest = JSON.parse(fs.readFileSync('botsales-kit/contracts/route-manifest.json', 'utf8'));
const migrations = [...read('migration-manifest.json'), ...read('supplemental-migration-manifest.json')].map(row => ({ ...row, file: row.file.split(path.win32.sep).join('/') }));
const sourceFiles = current.sourceHashes.map(item => item.file);
const sourceSet = new Set(sourceFiles);
const resolve = (from, specifier) => {
    const base = specifier.startsWith('@/') ? `apps/web/src/${specifier.slice(2)}` : specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier)) : undefined;
    return base && [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find(candidate => sourceSet.has(candidate));
};
const graph = sourceFiles.map(file => {
    const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const edges = [];
    const visit = node => {
        const specifier = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0]) ? node.arguments[0].text : undefined;
        const target = specifier && resolve(file, specifier);
        if (target) edges.push({ target, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 });
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return { file, edges };
});
const graphMap = new Map(graph.map(row => [row.file, row.edges]));
function closure(roots, module) {
    const reached = new Set();
    function visit(file) {
        if (reached.has(file)) return;
        if (file.includes('/modules/') && !file.startsWith(`apps/web/src/modules/${module}/`)) return;
        reached.add(file);
        for (const edge of graphMap.get(file) || []) visit(edge.target);
    }
    roots.forEach(visit);
    return [...reached].sort();
}
const comparison = [], issues = [], baselineGaps = [];
for (const browser of ['chromium', 'firefox']) {
    const before = read(`before-${browser}.json`), after = read(`after-${browser}.json`);
    if (JSON.stringify(after.sourceSnapshot.sourceHashes) !== JSON.stringify(current.sourceHashes)) issues.push(`${browser}: final source hash mismatch`);
    for (let index = 0; index < before.observations.length; index++) {
        const b = before.observations[index], a = after.observations[index];
        const stableChanges = [], boundaryChanges = [];
        const baselineMissing = b.geometry.length === 0 && a.geometry.length > 0;
        if (baselineMissing) baselineGaps.push({ browser, routeId:a.routeId, viewport:a.viewport, beforeGroupCount:0, afterGroupCount:a.geometry.length, reason:'Baseline recorded no measurable flow/grid groups. The original readiness wait could resolve against the desktop sidebar heading while main still displayed a LinearProgress loader. These records cannot prove route-content geometry. Baseline is preserved without backfill or paired PASS.' });
        if (b.routeId !== a.routeId || b.viewport.width !== a.viewport.width || (!baselineMissing && b.geometry.length !== a.geometry.length)) stableChanges.push({ identity: [b.routeId, a.routeId], groupCounts: [b.geometry.length, a.geometry.length] });
        for (let group = 0; group < Math.min(b.geometry.length, a.geometry.length); group++) {
            for (const property of ['tag', 'display', 'direction', 'wrap', 'gap', 'padding', 'align', 'justify', 'width', 'left', 'children']) if (b.geometry[group][property] !== a.geometry[group][property]) stableChanges.push({ group, property, before: b.geometry[group][property], after: a.geometry[group][property] });
            for (const property of ['margin', 'height', 'top']) if (b.geometry[group][property] !== a.geometry[group][property]) boundaryChanges.push({ group, composition: a.geometry[group].composition, property, before: b.geometry[group][property], after: a.geometry[group][property] });
        }
        if (stableChanges.length) issues.push(`${browser} ${a.routeId} ${a.viewport.width}: stable layout changed`);
        comparison.push({ browser, routeId: a.routeId, path: a.path, viewport: a.viewport, stableChanges, boundaryChanges, mainBlockInset: a.mainBlockInset, documentWidth: a.documentWidth, status: stableChanges.length ? 'FAIL' : baselineMissing ? 'BASELINE_NOT_COMPARABLE' : 'PASS', currentRenderStatus:after.issues.length?'FAIL':'PASS' });
    }
    issues.push(...after.issues.map(issue => `${browser}: ${issue}`));
}
const profile = route => route.id === 'R01' ? 'auth' : route.id === 'R02' ? 'workspace-selection' : route.id === 'R03' ? 'onboarding-form' : route.id === 'R04' ? 'dashboard' : route.module === 'inbox' ? 'inbox-panes' : route.module === 'reports' ? 'report' : /\/new$|\/imports$|\/settings\//.test(route.path) ? 'form-or-settings' : /:(?!shopId)[A-Za-z]+/.test(route.path) ? 'detail-or-job' : 'collection-or-workflow';
const matrix = manifest.routes.map(route => {
    const roots = [`apps/web/src/modules/${route.module}/index.tsx`, 'apps/web/src/app/router.tsx'];
    if (route.path.startsWith('/s/')) roots.push('apps/web/src/app/Shell.tsx');
    const reachableFiles = closure(roots, route.module);
    return { routeId: route.id, path: route.path, title: route.title, module: route.module, profile: profile(route), readOperations: route.readOperations, actionOperations: route.actions.map(action => action.operationId), state: 'default synthetic-MSW; full regression states remain defined by each E2E case', mappingBasis: 'Conservative AST import closure at module level plus app router/Shell; does not infer every export renders on every route.', reachableFiles, directCompositionConsumerFiles: reachableFiles.filter(file => migrations.some(row => row.file.replaceAll('\\', '/') === file)), sharedOwners: reachableFiles.filter(file => ['apps/web/src/shared/ui/composition.tsx', 'apps/web/src/shared/ui/layout.ts', 'apps/web/src/shared/ui/components.tsx'].includes(file)), renderedShellInset: route.path.startsWith('/s/'), observations: comparison.filter(row => row.routeId === route.id).map(({browser,viewport,status,currentRenderStatus}) => ({browser,viewport,pairedComparison:status,currentRenderStatus})), status: comparison.some(row => row.routeId === route.id && row.currentRenderStatus !== 'PASS') ? 'FAIL' : 'PASS' };
});
const moduleMigration = [...new Set(migrations.map(row => row.file.replaceAll('\\', '/').split('/')[4] || 'app'))].map(module => ({ module, files: migrations.filter(row => row.file.replaceAll('\\', '/').includes(`/modules/${module}/`)), count: migrations.filter(row => row.file.replaceAll('\\', '/').includes(`/modules/${module}/`)).reduce((sum,row) => sum + row.count, 0) })).filter(row => row.count);
const extraFiles = ['apps/web/src/app/bootstrap.css', 'botsales-kit/design/tokens.json', 'package.json', 'scripts/check-ui-composition.mjs', 'tests/ui-composition-checker.test.mjs', 'apps/web/tests/composition.test.tsx', 'tests/ui-shell-layout.spec.ts', 'tests/ui-composition-layout.spec.ts', `${directory}/capture.mjs`, `${directory}/summarize.mjs`, `${directory}/screenshots.mjs`, `${directory}/capture-browser-zoom.mjs`, `${directory}/capture-text-resize.mjs`, 'tests/artifacts/demo-preview.spec.ts', 'playwright.config.ts', 'scripts/run-e2e.mjs'];
const freeze = [...current.sourceHashes, ...extraFiles.filter(file => !sourceSet.has(file)).map(file => ({file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}))];
fs.writeFileSync(path.join(directory, 'final-source-audit.json'), JSON.stringify(current, null, 2)+'\n');
fs.writeFileSync(path.join(directory, 'import-graph.json'), JSON.stringify(graph, null, 2)+'\n');
fs.writeFileSync(path.join(directory, 'consumer-impact-matrix.json'), JSON.stringify({ scope:'Frontend-only', mapping:'Conservative module-level closure, all route consumers rendered; states not covered by default capture are verified only by named regression tests.', routes:matrix }, null, 2)+'\n');
fs.writeFileSync(path.join(directory, 'layout-comparison.json'), JSON.stringify({ status:issues.length?'FAIL':baselineGaps.length?'PARTIAL_BASELINE':'PASS', pairedComparable:comparison.filter(row=>row.status==='PASS').length, baselineGaps, invariant:'Where comparable, tag/display/direction/wrap/gap/padding/align/justify/width/left/children unchanged. Vertical top/height/margin deltas are recorded separately for the intended Shell inset and child-boundary normalization; not pixel-identical claims.', observations:comparison, issues }, null, 2)+'\n');
fs.writeFileSync(path.join(directory, 'final-source-hashes.json'), JSON.stringify(freeze,null,2)+'\n');
console.log(JSON.stringify({ status:issues.length?'FAIL':'PASS', source:current.files, modules:current.moduleFolders, migrations:migrations.reduce((sum,row)=>sum+row.count,0), consumerFiles:new Set(migrations.map(row=>row.file.replaceAll('\\', '/'))).size, routes:matrix.length, observations:comparison.length, layoutIssues:issues, boundaryDeltaObservations:comparison.filter(row=>row.boundaryChanges.length).length, moduleMigration:moduleMigration.map(({module,count})=>({module,count})), counts:Object.fromEntries(['FormFields','FieldGroup','SurfaceContent','ActionGroup','PageSections','SectionGrid'].map(name=>[name,current.tagCounts[name]])) }));
if(issues.length) process.exitCode=1;
