import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd(), output = import.meta.dirname;
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const inputs = walk(path.join(root, 'apps/web/src')).map(file => path.relative(root, file).replaceAll('\\', '/')).concat(['tests/ui-component-layout.spec.ts', 'tests/design/component-layout-fixture.tsx', '../botsales-kit/contracts/route-manifest.json', '../botsales-kit/design/tokens.json']);
const routes = [['order', 'orders/new'], ['product', 'products/new'], ['import', 'imports'], ['money', 'products'], ['status', 'products'], ['empty', 'products'], ['address', 'orders']];
const moduleUrl = '/@fs/' + path.join(root, 'tests/design/component-layout-fixture.tsx').replaceAll('\\', '/');
const tokens = JSON.parse(fs.readFileSync(path.resolve(root, '../botsales-kit/design/tokens.json')));
const rgb = 'rgb(' + tokens.colors.accent.slice(1).match(/../g).map(value => parseInt(value, 16)).join(', ') + ')';
for (const mode of ['browser', 'text']) {
    const name = `capture-component-${mode}-zoom.mjs`;
    let source = fs.readFileSync(path.join(root, `evidence/frontend-toolbar-20261008/capture-toolbar-${mode}-zoom.mjs`), 'utf8').replaceAll('evidence/frontend-toolbar-20261008', 'evidence/frontend-component-fixes-20261008');
    const scenarios = routes.map(([id, route]) => mode === 'browser' ? { id, path: '/s/shop-demo/' + route } : { id, route: '/s/shop-demo/' + route, viewport: { width: 390, height: 800 }, targets: ['[data-native-target="true"]'], focus: '[data-native-focus="true"]' });
    source = source.replace(/^const sourceInputs = .*;$/m, 'const sourceInputs = ' + JSON.stringify([...inputs, `evidence/frontend-component-fixes-20261008/${name}`]) + ';').replace(/^const scenarios = .*;$/m, 'const scenarios = ' + JSON.stringify(scenarios) + ';');
    const expression = `async () => { const fixture = await import(${JSON.stringify(moduleUrl)}); return fixture.prepareNativeScenario(${mode === 'browser' ? 'caseId' : '${JSON.stringify(scenario.id)}'}); }`;
    if (mode === 'browser') {
        const start = source.indexOf('async function prepare('), end = source.indexOf('async function measure(', start);
        source = source.slice(0, start) + `async function prepare(page, scenario) {
    await page.waitForFunction(() => !!document.querySelector('main h1') && !document.querySelector('main .MuiCircularProgress-root, main .MuiLinearProgress-root'));
    await page.evaluate(async ({ moduleUrl, caseId }) => (await import(moduleUrl)).prepareNativeScenario(caseId), { moduleUrl: ${JSON.stringify(moduleUrl)}, caseId: scenario.id });
    return { targets: ['[data-native-target="true"]'], focusTarget: '[data-native-focus="true"]' };
}

` + source.slice(end);
        source = source.replace("const pageErrors = [];", "page.on('dialog', dialog => { void dialog.accept(); });\n    const pageErrors = [];");
    } else {
        const start = source.indexOf('async function prepareScenario('), end = source.indexOf('async function measure(', start);
        source = source.slice(0, start) + `async function prepareScenario(send, context, scenario) {
    return evaluateString(send, context, \`(${expression})()\`, 20000);
}

` + source.slice(end);
    }
    source = source.replaceAll('main form button[type="submit"]', '[data-native-target="true"]').replaceAll('Toolbar action stretched beyond its intrinsic height', 'Component action stretched beyond its intrinsic height').replaceAll('Search action center is not hit-testable', 'Component action center is not hit-testable');
    source = source.replace(/width: innerWidth,/g, 'url: location.href, width: innerWidth,');
    const naturalStart = source.indexOf('    const naturalHeight = Math.max('), naturalEnd = source.indexOf('\n', naturalStart);
    if (naturalStart < 0) throw new Error('Native intrinsic oracle missing');
    source = source.slice(0, naturalStart) + `    const clone = button.cloneNode(true);
    Object.assign(clone.style, { height: 'auto', width: rect.width + 'px', position: 'fixed', visibility: 'hidden', alignSelf: 'start' });
    button.parentElement.append(clone); const naturalHeight = clone.getBoundingClientRect().height; clone.remove();` + source.slice(naturalEnd);
    if (mode === 'text') {
        const probeSource = fs.readFileSync(path.join(output, 'native-menu-before.mjs'), 'utf8');
        const start = probeSource.indexOf('        const menuProbe = JSON.parse('), end = probeSource.indexOf("        console.log('NATIVE_MENU_BASELINE=", start);
        const probe = probeSource.slice(start, end).replace('const menuProbe', 'const readableMenus');
        if (start < 0 || end < 0) throw new Error('Native menu proof source missing');
        source = source.replace('        const issues = [];', probe + '        after.readableMenus = readableMenus;\n        const unexpectedClips = after.textClips.filter(clip => !readableMenus.some(menu => menu.controlId === clip.id && menu.selected === menu.option && menu.fullLabelVisible));\n        const issues = [];');
        source = source.replace('role: element.getAttribute(\'role\'), text:', 'id: element.id, role: element.getAttribute(\'role\'), text:');
        source = source.replace("if (after.textClips.length) issues.push(`Potential clipped text elements: ${after.textClips.length}.`);", "if (unexpectedClips.length) issues.push(`Potential clipped text elements: ${unexpectedClips.length}.`);");
    }
    source = source.replace('outlineStyle: activeStyle.outlineStyle,', `paintedOwner: (() => {
              const owner = active.closest('.MuiOutlinedInput-root.Mui-focused')?.querySelector('fieldset');
              if (!owner) return null;
              const style = getComputedStyle(owner), bounds = owner.getBoundingClientRect();
              return { tag: owner.tagName, borderWidth: style.borderTopWidth, borderColor: style.borderTopColor, borderStyle: style.borderTopStyle, bounds: bounds.toJSON(), valid: bounds.width > 0 && bounds.height > 0 && style.borderTopStyle === 'solid' && parseFloat(style.borderTopWidth) >= ${tokens.focusRing.width} && style.borderTopColor === ${JSON.stringify(rgb)} };
            })(), outlineStyle: activeStyle.outlineStyle,`);
    const focusObject = mode === 'browser' ? 'measurements' : 'after';
    source = source.replace(`${focusObject}.activeFocus.boxShadow === 'none'))`, `${focusObject}.activeFocus.boxShadow === 'none' && !${focusObject}.activeFocus.paintedOwner?.valid))`);
    const cleanup = mode === 'browser'
        ? "if (scenario.id === 'order') await page.locator('button[aria-label=\"Bỏ dòng 2\"]').click();"
        : "if (scenario.id === 'order') await evaluateString(send, context, `new Promise((resolve, reject) => { const button = document.querySelector('button[aria-label=\"Bỏ dòng 2\"]'); if (!button) return reject(new Error('Missing added order line')); button.click(); const started = performance.now(); const check = () => { if (document.querySelector('main form[data-draft-clean=\"true\"]')) resolve('restored-initial-business-draft'); else if (performance.now() - started > 5000) reject(new Error('Order draft did not return to clean')); else setTimeout(check, 50); }; check(); })`);";
    const boundary = mode === 'browser' ? '    }\n    const failed = evidence.scenarios.filter' : '    }\n    evidence.result = evidence.scenarios.every';
    source = source.replace(boundary, `        ${cleanup}\n${boundary}`);
    if (!source.includes('prepareNativeScenario') || source.includes('const scenarios = [{"id":"products-mobile"')) throw new Error('Native template adaptation failed');
    fs.writeFileSync(path.join(output, name), source);
}
console.log('Prepared seven real-component scenarios for each separate native method.');
