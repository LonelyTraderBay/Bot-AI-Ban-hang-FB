import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { typescript, require } from './tools.mjs';
import { isScriptSource } from './ui-source-files.mjs';
import { auditUiEntryScope, resolveUiAsset } from './ui-entry-scope.mjs';

const { ts } = typescript();
const posix = value => value.split(path.sep).join('/');
export function auditUiImportScope(root, initialFiles) {
    const files = new Set(initialFiles), assets = new Set(), libraries = new Set(), issues = [];
    const add = (file, message) => issues.push({ file: posix(path.relative(root, file)), message });
    const configPath = posix(path.resolve(root, 'apps/web/tsconfig.json'));
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    if (config.error) {
        add(configPath, ts.flattenDiagnosticMessageText(config.error.messageText, ' '));
        return { files: [...files], assets: [], libraries: [], issues };
    }
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath), undefined, configPath);
    for (const error of parsed.errors) add(configPath, ts.flattenDiagnosticMessageText(error.messageText, ' '));
    const entry = auditUiEntryScope(root, parsed.options);
    issues.push(...entry.issues);
    for (const file of entry.files) files.add(file);
    for (const asset of entry.assets) assets.add(asset);
    const own = file => { const relative = path.relative(root, fs.realpathSync(file)); return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); };
    const configured = new Set(parsed.fileNames.map(file => path.resolve(file)));
    for (const file of initialFiles) if (isScriptSource(file) && !configured.has(path.resolve(file))) add(file, 'Discovered script source is excluded from the TypeScript config');
    for (const file of configured) {
        if (!own(file)) add(file, 'Configured first-party source escapes project ownership');
        else files.add(file);
    }
    const local = specifier => specifier.startsWith('.') || specifier.startsWith('/') || Object.keys(parsed.options.paths || {}).some(key => key.includes('*') ? specifier.startsWith(key.split('*')[0]) : key === specifier);
    function workerSource(value, owner) {
        const { target, error } = resolveUiAsset(root, value);
        if (error) { add(owner, error); return; }
        if (!target || !isScriptSource(target)) { add(owner, 'Worker URL must resolve to an explicit local script'); return; }
        if (path.basename(target) === 'mockServiceWorker.js') {
            const installed = path.join(path.dirname(require.resolve('msw/package.json')), 'lib/mockServiceWorker.js');
            if (!fs.readFileSync(target).equals(fs.readFileSync(installed))) add(owner, 'MSW worker differs from the installed vendor source');
            assets.add(target); // Pinned vendor owner; do not rewrite it as app UI.
        } else files.add(target);
    }
    function resolve(specifier, importer) {
        const resolved = ts.resolveModuleName(specifier, importer, parsed.options, ts.sys).resolvedModule;
        let target = resolved?.resolvedFileName;
        if (!target && specifier.startsWith('.')) {
            const asset = path.resolve(path.dirname(importer), specifier);
            if (fs.existsSync(asset) && fs.statSync(asset).isFile()) target = asset;
        }
        if (!local(specifier)) {
            if (target || (() => { try { require.resolve(specifier); return true; } catch { return false; } })()) libraries.add(specifier);
            else add(importer, `Unresolved library import: ${specifier}`);
            return;
        }
        if (!target) { add(importer, `Unresolved first-party import: ${specifier}`); return; }
        if (!own(target)) { add(importer, `First-party import escapes project ownership: ${specifier}`); return; }
        if (/\.(?:scss|sass|less|styl)$/i.test(target)) { add(importer, `Unsupported stylesheet source requires an explicit parser: ${specifier}`); return; }
        if (isScriptSource(target) || /\.css$/i.test(target)) files.add(path.resolve(target));
        else assets.add(path.resolve(target));
    }
    for (const file of files) {
        if (isScriptSource(file)) {
            const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
            // Syntax diagnostics remain the owning gate's responsibility.
            const visit = node => {
                if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) resolve(node.moduleSpecifier.text, file);
                if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
                    const specifier = node.moduleReference.expression;
                    if (specifier && ts.isStringLiteralLike(specifier)) resolve(specifier.text, file);
                    else add(file, 'Opaque import-equals source requires finite mapping');
                }
                if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
                    if (node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) resolve(node.arguments[0].text, file);
                    else add(file, 'Nonliteral require source requires finite mapping');
                }
                if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
                    if (node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) resolve(node.arguments[0].text, file);
                    else add(file, 'Nonliteral dynamic import requires a finite source mapping');
                }
                if (ts.isCallExpression(node) && node.expression.getText(tree) === 'navigator.serviceWorker.register') {
                    if (node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) workerSource(node.arguments[0].text, file);
                    else add(file, 'Dynamic service worker URL requires finite source mapping');
                }
                if (ts.isPropertyAssignment(node) && node.name.getText(tree).replace(/['"]/g, '') === 'serviceWorker' && ts.isObjectLiteralExpression(node.initializer)) {
                    const url = node.initializer.properties.find(item => ts.isPropertyAssignment(item) && item.name.getText(tree).replace(/['"]/g, '') === 'url');
                    if (url && ts.isStringLiteralLike(url.initializer)) workerSource(url.initializer.text, file);
                    else add(file, 'Opaque service worker options require source mapping');
                }
                if (ts.isJsxAttribute(node) && ['src', 'href', 'poster'].includes(node.name.getText(tree))) {
                    let value = ts.isStringLiteralLike(node.initializer) ? node.initializer.text : null;
                    const expression = ts.isJsxExpression(node.initializer) ? node.initializer.expression : null;
                    if (expression && ts.isStringLiteralLike(expression)) value = expression.text;
                    if (expression && ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken && expression.left.getText(tree) === 'import.meta.env.BASE_URL' && ts.isStringLiteralLike(expression.right)) value = `/${expression.right.text}`;
                    if (value && /\.(?:csv|svg|png|jpe?g|gif|webp|avif|ico|woff2?|css|js|webmanifest)(?:[?#]|$)/i.test(value)) {
                        const { target, error } = resolveUiAsset(root, value, path.dirname(file));
                        if (error) add(file, error);
                        if (target) assets.add(target);
                    }
                }
                ts.forEachChild(node, visit);
            };
            visit(tree);
        } else {
            try {
                const stylesheet = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
                stylesheet.walkAtRules('import', rule => {
                    const match = rule.params.match(/^(?:url\(\s*)?["']([^"']+)["']/i);
                    if (!match) add(file, `Unsupported CSS import: ${rule.params}`);
                    else if (/^(?:https?:|\/\/)/i.test(match[1])) add(file, 'Remote CSS import has no local source ownership');
                    else resolve(match[1].startsWith('.') ? match[1] : `./${match[1]}`, file);
                });
                stylesheet.walkDecls(declaration => {
                    const urls = /\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi;
                    for (const match of declaration.value.matchAll(urls)) {
                        const value = match[1] ?? match[2] ?? match[3];
                        if (value.includes('\\')) { add(file, 'Escaped CSS asset URL requires explicit source mapping'); continue; }
                        const { target, error } = resolveUiAsset(root, value, path.dirname(file));
                        if (error) add(file, error);
                        if (target) assets.add(target);
                    }
                    if (/\burl\s*\(/i.test(declaration.value.replace(urls, ''))) add(file, 'Unsupported CSS asset URL syntax');
                });
            } catch (error) { add(file, `CSS parse error: ${error.reason || error.message}`); }
        }
    }
    return { files: [...files].sort(), assets: [...assets].sort(), libraries: [...libraries].sort(), issues };
}
