import fs from 'node:fs';
import path from 'node:path';
const output = import.meta.dirname, previous = path.resolve(output, '../frontend-corrections-20261008');
const inputs = ['apps/web/src/shared/ui/components.tsx', 'apps/web/src/shared/ui/composition.tsx', 'apps/web/src/shared/ui/theme.ts', 'apps/web/src/shared/ui/layout.ts', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/tokens.css', 'apps/web/src/modules/catalog/index.tsx', 'apps/web/src/modules/inventory/index.tsx', '../botsales-kit/contracts/route-manifest.json', 'tests/ui-toolbar-layout.spec.ts'];
const cases = [
    { id: 'products-mobile', route: '/s/shop-demo/products', viewport: { width: 390, height: 800 } },
    { id: 'products-desktop', route: '/s/shop-demo/products', viewport: { width: 1280, height: 800 } },
    { id: 'inventory', route: '/s/shop-demo/inventory', viewport: { width: 390, height: 800 } },
    { id: 'movements', route: '/s/shop-demo/inventory/movements', viewport: { width: 390, height: 800 } },
];
const geometry = `(() => {
    const button = document.querySelector('main form button[type="submit"]');
    if (!button) return null;
    const rect = button.getBoundingClientRect(), style = getComputedStyle(button), range = document.createRange();
    range.selectNodeContents(button);
    const naturalHeight = Math.max(parseFloat(style.minHeight), range.getBoundingClientRect().height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth));
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { buttonHeight: rect.height, naturalHeight, centerHitsButton: !!hit && button.contains(hit) };
})()`;
let source = fs.readFileSync(path.join(previous, 'capture-comparison-text-zoom.mjs'), 'utf8').replaceAll('evidence/frontend-corrections-20261008', 'evidence/frontend-toolbar-20261008');
source = source.replace(/const sourceInputs = \[[\s\S]*?\];/, `const sourceInputs = ${JSON.stringify([...inputs, 'evidence/frontend-toolbar-20261008/capture-toolbar-text-zoom.mjs'])};`);
source = source.replace(/const scenarios = \[[^\n]*\];/, `const scenarios = ${JSON.stringify(cases.map(row => ({ ...row, targets: ['main form button[type="submit"]'], focus: 'main input[placeholder]' })))};`);
const start = source.indexOf('async function prepareScenario('), end = source.indexOf('async function measure(', start);
if (start < 0 || end < 0) throw new Error('Missing text zoom adapter boundary');
source = source.slice(0, start) + `async function prepareScenario(send, context, scenario) {
    return evaluateString(send, context, \`new Promise((resolve, reject) => {
      const started = Date.now(); const check = () => {
        const target = document.querySelector('main form button[type="submit"]');
        if (target?.getClientRects().length && !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root')) resolve('loaded-real-toolbar');
        else if (Date.now() - started > 15000) reject(new Error('Toolbar did not become ready'));
        else setTimeout(check, 50);
      }; check();
    })\`);
}

` + source.slice(end);
source = source.replace(/        const titleOverlap = [^\n]*\n        if \(titleOverlap[^\n]*\n/, '');
source = source.replace(/after.writeRequests.length !== 1 \|\| after.writeRequests\[0\]\?\.method !== 'PATCH' \|\| !after.writeRequests\[0\]\?\.url.endsWith\('\/customers\/c1'\)/, 'after.writeRequests.length !== 0');
source = source.replace("task: 'UI028.W30'", "task: 'S16.Toolbar'");
source = source.replace('        viewport: {', '        toolbarGeometry: ' + geometry + ',\n        viewport: {');
source = source.replace('        const issues = [];', `        const issues = [];
        if (!after.toolbarGeometry || after.toolbarGeometry.buttonHeight > after.toolbarGeometry.naturalHeight + 1) issues.push('Toolbar action stretched beyond its intrinsic height');
        if (!after.toolbarGeometry?.centerHitsButton) issues.push('Search action center is not hit-testable');`);
fs.writeFileSync(path.join(output, 'capture-toolbar-text-zoom.mjs'), source);

source = fs.readFileSync(path.join(previous, 'capture-comparison-browser-zoom.mjs'), 'utf8').replaceAll('evidence/frontend-corrections-20261008', 'evidence/frontend-toolbar-20261008');
source = source.replace(/const sourceInputs = \[[\s\S]*?\];/, `const sourceInputs = ${JSON.stringify([...inputs, 'evidence/frontend-toolbar-20261008/capture-toolbar-browser-zoom.mjs'])};`);
source = source.replace(/const scenarios = \[[^\n]*\];/, `const scenarios = ${JSON.stringify(cases.slice(1).map(row => ({ id: row.id, path: row.route })))};`);
const begin = source.indexOf('async function prepare('), finish = source.indexOf('async function measure(', begin);
if (begin < 0 || finish < 0) throw new Error('Missing browser zoom adapter boundary');
source = source.slice(0, begin) + `async function prepare(page, scenario) {
    await page.locator('main form button[type="submit"]').waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
    return { targets: ['main form button[type="submit"]'], focusTarget: 'main input[placeholder]' };
}

` + source.slice(finish);
source = source.replace(/        const titleLayout = [\s\S]*?        if \(titleLayout.overlap[^\n]*\n/, '');
source = source.replace(/scenarioWrites.length !== 1 \|\| scenarioWrites\[0\]\?\.method !== 'PATCH' \|\| !scenarioWrites\[0\]\?\.url.endsWith\('\/customers\/c1'\)/, 'scenarioWrites.length !== 0');
if (source.includes("url.endsWith('/customers/c1')")) throw new Error('Unadapted customer write predicate in Toolbar browser capture');
source = source.replace("task: 'UI028.W30'", "task: 'S16.Toolbar'");
source = source.replace('            viewport: {', '            toolbarGeometry: ' + geometry + ',\n            viewport: {');
source = source.replace('        const issues = [];', `        const issues = [];
        if (!measurements.toolbarGeometry || measurements.toolbarGeometry.buttonHeight > measurements.toolbarGeometry.naturalHeight + 1) issues.push('Toolbar action stretched beyond its intrinsic height');
        if (!measurements.toolbarGeometry?.centerHitsButton) issues.push('Search action center is not hit-testable');`);
fs.writeFileSync(path.join(output, 'capture-toolbar-browser-zoom.mjs'), source);
console.log('Native toolbar adapters use the existing isolated zoom mechanisms; scenario-specific predicates only.');
