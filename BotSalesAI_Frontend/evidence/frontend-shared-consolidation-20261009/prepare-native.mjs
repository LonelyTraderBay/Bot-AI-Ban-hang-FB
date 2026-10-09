import fs from 'node:fs';
import path from 'node:path';
const frontend = path.resolve(import.meta.dirname, '../..');
const namespace = 'evidence/frontend-shared-consolidation-20261009';
const sources = ['apps/web/src/shared/ui/components.tsx', 'apps/web/src/shared/ui/composition.tsx', 'apps/web/src/shared/ui/theme.ts', 'apps/web/src/shared/ui/layout.ts', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/tokens.css', 'apps/web/src/modules/inbox/index.tsx', 'apps/web/src/modules/dashboard/index.tsx', '../botsales-kit/contracts/route-manifest.json', 'tests/ui-toolbar-layout.spec.ts', 'tests/ui-dashboard-layout.spec.ts'];
const scenarios = [
    { id: 'inbox-list', route: '/s/shop-demo/inbox', targets: ['main form button[type="submit"]', '[aria-label="Bộ lọc hội thoại"]'], focus: 'main input[placeholder]' },
    { id: 'inbox-detail', route: '/s/shop-demo/inbox/cv1', targets: ['#inbox-thread-placeholder'], focus: 'main textarea' },
    { id: 'dashboard', route: '/s/shop-demo/overview', targets: ['main a[href="/s/shop-demo/operations"]', 'main a[href="/s/shop-demo/orders/new"]'], focus: 'main a[href="/s/shop-demo/operations"]' },
];
scenarios[1].targets = ['[data-testid="inbox-thread"]'];
for (const method of ['browser', 'text']) {
    const filename = `capture-shared-${method}-zoom.mjs`;
    const target = path.join(import.meta.dirname, filename);
    if (fs.existsSync(target)) throw new Error('Inspect existing native runner before replacing: ' + target);
    let code = fs.readFileSync(path.join(frontend, `evidence/frontend-toolbar-20261008/capture-toolbar-${method}-zoom.mjs`), 'utf8');
    code = code.replaceAll('evidence/frontend-toolbar-20261008', namespace).replaceAll('S16.Toolbar', 'S16.SharedConsolidation');
    code = code.replace(/^const sourceInputs = .*;$/m, 'const sourceInputs = ' + JSON.stringify([...sources, `${namespace}/${filename}`]) + ';');
    const rows = method === 'browser'
        ? scenarios.map(row => ({ ...row, path: row.route }))
        : scenarios.map(row => ({ ...row, viewport: { width: 390, height: 800 } })).concat({ ...scenarios[0], id: 'inbox-list-desktop', viewport: { width: 1280, height: 800 } });
    code = code.replace(/^const scenarios = .*;$/m, 'const scenarios = ' + JSON.stringify(rows) + ';');
    if (method === 'browser') {
        code = code.replace("await page.locator('main form button[type=\"submit\"]').waitFor({ state: 'visible' });", "await page.locator(scenario.focus).first().waitFor({ state: 'visible' });");
        code = code.replace("return { targets: ['main form button[type=\"submit\"]'], focusTarget: 'main input[placeholder]' };", 'return { targets: scenario.targets, focusTarget: scenario.focus };');
    } else {
        code = code.replace("const target = document.querySelector('main form button[type=\"submit\"]');", 'const target = document.querySelector(${JSON.stringify(scenario.focus)});');
    }
    code = code.replace(/if \(!measurements\.toolbarGeometry \|\|/g, "if (scenario.id.startsWith('inbox-list') && (!measurements.toolbarGeometry ||");
    code = code.replace("measurements.toolbarGeometry.naturalHeight + 1) issues", "measurements.toolbarGeometry.naturalHeight + 1)) issues");
    code = code.replace("if (!measurements.toolbarGeometry?.centerHitsButton)", "if (scenario.id.startsWith('inbox-list') && !measurements.toolbarGeometry?.centerHitsButton)");
    code = code.replace(/if \(!after\.toolbarGeometry \|\|/g, "if (scenario.id.startsWith('inbox-list') && (!after.toolbarGeometry ||");
    code = code.replace("after.toolbarGeometry.naturalHeight + 1) issues", "after.toolbarGeometry.naturalHeight + 1)) issues");
    code = code.replace("if (!after.toolbarGeometry?.centerHitsButton)", "if (scenario.id.startsWith('inbox-list') && !after.toolbarGeometry?.centerHitsButton)");
    fs.writeFileSync(target, code);
}
console.log('Created affected-route native runners from existing method owners; no historical file modified.');
