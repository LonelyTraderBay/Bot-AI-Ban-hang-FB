import fs from 'node:fs';
import path from 'node:path';
import { require, typescript } from './tools.mjs';
import { isScriptSource } from './ui-source-files.mjs';

// JSDOM is already a pinned workspace test dependency. No scripts/resources run.
const { JSDOM } = require('jsdom');
const { ts } = typescript();
export function resolveUiAsset(root, value, relativeBase = path.join(root, 'apps/web')) {
    if (!value || value.startsWith('#') || value.startsWith('data:')) return { target: null };
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(value)) return { error: `Remote/opaque UI asset requires explicit ownership: ${value}` };
    let decoded;
    try { decoded = decodeURIComponent(value.split(/[?#]/)[0]); } catch { return { error: `Invalid asset URL: ${value}` }; }
    const web = path.join(root, 'apps/web');
    const target = decoded.startsWith('/src/') ? path.join(web, decoded.slice(1)) : decoded.startsWith('/') ? path.join(web, 'public', decoded.slice(1)) : path.resolve(relativeBase, decoded);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return { error: `Missing UI asset: ${value}` };
    const relative = path.relative(root, fs.realpathSync(target));
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return { error: `UI asset escapes project: ${value}` };
    return { target };
}
export function auditUiEntryScope(root, options) {
    const files = new Set(), assets = new Set(), issues = [];
    const add = (file, message) => issues.push({ file: path.relative(root, file).split(path.sep).join('/'), message });
    const web = path.join(root, 'apps/web');
    const html = path.join(web, 'index.html');
    function reference(value, owner, relativeBase = web) {
        const { target, error } = resolveUiAsset(root, value, relativeBase);
        if (error) add(owner, error);
        if (!target) return null;
        if (isScriptSource(target) || /\.css$/i.test(target)) files.add(target);
        else assets.add(target);
        return target;
    }
    if (!fs.existsSync(html)) add(html, 'Missing HTML UI entry');
    else {
        const dom = new JSDOM(fs.readFileSync(html, 'utf8'));
        let moduleEntries = 0;
        for (const node of dom.window.document.querySelectorAll('*')) {
            for (const attribute of node.attributes) if (attribute.name === 'style' || /^on/i.test(attribute.name)) add(html, `Unsupported inline HTML style/event source: ${attribute.name}`);
            if (node.localName === 'style') add(html, 'Inline HTML stylesheet requires style-gate source mapping');
            if (node.localName === 'script') {
                if (node.getAttribute('src')) {
                    const target = reference(node.getAttribute('src'), html);
                    if (!target || !isScriptSource(target)) add(html, 'HTML script source must resolve to a first-party script file');
                    else if (node.getAttribute('type') === 'module') moduleEntries++;
                } else if (node.textContent.trim()) add(html, 'Inline HTML script requires source-gate mapping');
            }
            if (node.localName === 'link' && /(?:stylesheet|manifest|icon|preload|modulepreload)/i.test(node.getAttribute('rel') || '')) reference(node.getAttribute('href'), html);
            if (['img', 'source', 'video', 'audio', 'iframe', 'embed', 'input'].includes(node.localName)) {
                reference(node.getAttribute('src'), html);
                reference(node.getAttribute('poster'), html);
                if (node.hasAttribute('srcset')) add(html, 'HTML srcset requires finite asset mapping');
            }
        }
        if (!moduleEntries) add(html, 'HTML entry has no module script source');
        dom.window.close();
    }
    for (const asset of assets) if (asset.endsWith('.webmanifest')) {
        try {
            const manifest = JSON.parse(fs.readFileSync(asset, 'utf8'));
            if (!Array.isArray(manifest.icons)) add(asset, 'Manifest icons must be an explicit array');
            else for (const icon of manifest.icons) {
                if (typeof icon.src !== 'string') add(asset, 'Manifest icon has no explicit source');
                else reference(icon.src, asset, path.dirname(asset));
            }
        } catch (error) { add(asset, `Manifest parse error: ${error.message}`); }
    }
    const vite = path.join(web, 'vite.config.ts');
    if (!fs.existsSync(vite)) add(vite, 'Missing Vite config for UI entry reconciliation');
    else {
        files.add(vite); // First-party build inputs can create or transform UI.
        const tree = ts.createSourceFile(vite, fs.readFileSync(vite, 'utf8'), ts.ScriptTarget.Latest, true);
        for (const error of tree.parseDiagnostics) add(vite, `Vite config parse error: ${ts.flattenDiagnosticMessageText(error.messageText, ' ')}`);
        const inspectHooks = node => {
            if ((ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node)) && node.name.getText(tree).replace(/['"]/g, '') === 'transformIndexHtml') add(vite, 'HTML-transforming Vite hook requires explicit generated source mapping');
            ts.forEachChild(node, inspectHooks);
        };
        inspectHooks(tree);
        const maps = [];
        function returnedObjects(expression) {
            while (expression && ts.isParenthesizedExpression(expression)) expression = expression.expression;
            if (expression && ts.isObjectLiteralExpression(expression)) return [expression];
            if (expression && ts.isCallExpression(expression) && expression.arguments.length === 1) {
                const factory = expression.arguments[0];
                if (ts.isArrowFunction(factory) || ts.isFunctionExpression(factory)) return ts.isBlock(factory.body)
                    ? factory.body.statements.filter(ts.isReturnStatement).flatMap(statement => returnedObjects(statement.expression))
                    : returnedObjects(factory.body);
            }
            return [];
        }
        for (const exported of tree.statements.filter(ts.isExportAssignment)) for (const object of returnedObjects(exported.expression)) {
            if (object.properties.some(ts.isSpreadAssignment)) add(vite, 'Opaque spread in exported Vite config');
            const resolve = object.properties.find(item => ts.isPropertyAssignment(item) && item.name.getText(tree).replace(/['"]/g, '') === 'resolve');
            if (!resolve || !ts.isObjectLiteralExpression(resolve.initializer)) continue;
            const alias = resolve.initializer.properties.find(item => ts.isPropertyAssignment(item) && item.name.getText(tree).replace(/['"]/g, '') === 'alias');
            if (alias && ts.isObjectLiteralExpression(alias.initializer)) maps.push(alias.initializer);
        }
        if (maps.length !== 1) add(vite, 'Vite alias map must have one explicit object owner');
        else {
            const actual = new Map();
            for (const item of maps[0].properties) {
                if (!ts.isPropertyAssignment(item)) { add(vite, 'Opaque Vite alias entry'); continue; }
                const key = item.name.getText(tree).replace(/['"]/g, '');
                const value = item.initializer;
                const url = ts.isCallExpression(value) && value.expression.getText(tree) === 'fileURLToPath' && value.arguments.length === 1 ? value.arguments[0] : null;
                if (url && ts.isNewExpression(url) && url.expression.getText(tree) === 'URL' && url.arguments?.length === 2 && ts.isStringLiteralLike(url.arguments[0]) && url.arguments[1].getText(tree) === 'import.meta.url') actual.set(key, path.resolve(web, url.arguments[0].text));
                else add(vite, `Unresolved Vite alias value: ${key}`);
            }
            for (const [name, targets] of Object.entries(options.paths || {})) {
                const key = name.replace(/\/\*$/, '');
                if (targets.length !== 1 || actual.get(key) !== path.resolve(options.baseUrl || web, targets[0].replace(/\/\*$/, ''))) add(vite, `Vite/TypeScript alias mismatch: ${name}`);
                actual.delete(key);
            }
            for (const key of actual.keys()) add(vite, `Vite alias absent from TypeScript config: ${key}`);
        }
    }
    return { files: [...files], assets: [...assets], issues };
}
