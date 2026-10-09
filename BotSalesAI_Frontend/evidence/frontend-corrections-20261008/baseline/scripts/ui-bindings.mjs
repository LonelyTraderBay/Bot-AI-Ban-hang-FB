import fs from 'node:fs';
import path from 'node:path';
import { typescript } from './tools.mjs';

const { ts } = typescript();
const owners = {
    tokens: 'packages/design-tokens/src/index.ts',
    layout: 'apps/web/src/shared/ui/layout.ts',
    visual: 'apps/web/src/shared/ui/visual.ts',
    theme: 'apps/web/src/shared/ui/theme.ts',
    components: 'apps/web/src/shared/ui/components.tsx',
    composition: 'apps/web/src/shared/ui/composition.tsx',
};
const libraries = new Set(['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@mui/material', '@mui/material/styles', '@mui/system', '@emotion/react', '@emotion/styled', 'react-hook-form']);
export function unwrapUiExpression(node) {
    while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node))) node = node.expression;
    return node;
}

// Shared by source gates: identity comes from the project compiler, never a variable name.
export function createUiBindings(root, files) {
    root = fs.realpathSync(root);
    const configPath = path.join(root, 'apps/web/tsconfig.json');
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
    if (parsed.errors.length) throw new Error(parsed.errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
    const ownerPaths = Object.entries(owners).map(([owner, file]) => [owner, path.join(root, file)]).filter(([, file]) => fs.existsSync(file));
    // The discovery closure includes first-party JavaScript workers as well as React TS.
    const program = ts.createProgram([...new Set([...files, ...ownerPaths.map(([, file]) => file)])], { ...parsed.options, allowJs: true, noEmit: true });
    const checker = program.getTypeChecker();
    const identities = new Map();
    const moduleOwners = new Map();
    const unalias = symbol => {
        const seen = new Set();
        while (symbol && symbol.flags & ts.SymbolFlags.Alias) {
            if (seen.has(symbol)) return undefined;
            seen.add(symbol);
            const next = checker.getAliasedSymbol(symbol);
            if (next === symbol) return undefined;
            symbol = next;
        }
        return symbol;
    };
    function register(source, owner, defaultName) {
        const module = source && checker.getSymbolAtLocation(source);
        if (!module) return;
        moduleOwners.set(module, owner);
        for (const symbol of checker.getExportsOfModule(module)) {
            const target = unalias(symbol);
            if (target) identities.set(target, { owner, exportName: symbol.name === 'default' && defaultName ? defaultName : symbol.name, path: [] });
        }
    }
    for (const [owner, file] of ownerPaths) register(program.getSourceFile(file), owner);
    const dependencyRoot = path.join(root, 'node_modules');
    function installedModule(file, specifier) {
        if (!file || !fs.existsSync(file) || !fs.existsSync(dependencyRoot)) return false;
        const relative = path.relative(fs.realpathSync(dependencyRoot), fs.realpathSync(file));
        if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return false;
        const packageName = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
        const packageRoot = path.join(dependencyRoot, packageName);
        const manifest = path.join(packageRoot, 'package.json');
        if (!fs.existsSync(manifest) || JSON.parse(fs.readFileSync(manifest, 'utf8')).name !== packageName) return false;
        const packageRelative = path.relative(fs.realpathSync(packageRoot), fs.realpathSync(file));
        return packageRelative !== '..' && !packageRelative.startsWith(`..${path.sep}`) && !path.isAbsolute(packageRelative);
    }
    for (const source of program.getSourceFiles()) {
        const file = source.fileName;
        const relative = path.relative(root, file);
        if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || relative.split(path.sep).includes('node_modules')) continue;
        for (const node of source.statements) {
            if (!(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) || !node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier) || !(libraries.has(node.moduleSpecifier.text) || /^@mui\/(?:material|system)\//.test(node.moduleSpecifier.text))) continue;
            const resolved = ts.resolveModuleName(node.moduleSpecifier.text, file, parsed.options, ts.sys).resolvedModule;
            if (installedModule(resolved?.resolvedFileName, node.moduleSpecifier.text)) {
                const emotion = node.moduleSpecifier.text.startsWith('@emotion/');
                register(program.getSourceFile(resolved.resolvedFileName), node.moduleSpecifier.text === 'react-hook-form' ? 'form' : node.moduleSpecifier.text === 'react-dom' ? 'react-dom' : node.moduleSpecifier.text === 'react' || node.moduleSpecifier.text.startsWith('react/jsx-') ? 'react' : emotion ? 'emotion' : 'mui', node.moduleSpecifier.text.split('/').at(-1));
            }
        }
    }
    function staticKey(input, seen = new Set()) {
        const node = unwrapUiExpression(input);
        if (!node || seen.has(node)) return null;
        if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
        seen.add(node);
        const value = initializer(node);
        return value ? staticKey(value, seen) : null;
    }
    function reference(input, seen = new Set()) {
        const node = unwrapUiExpression(input);
        if (!node) return null;
        const location = ts.isPropertyAccessExpression(node) ? node.name : node;
        const symbol = unalias(checker.getSymbolAtLocation(location));
        if (symbol && identities.has(symbol)) return identities.get(symbol);
        if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
            const key = ts.isPropertyAccessExpression(node) ? node.name.text : staticKey(node.argumentExpression);
            if (key === null) return null;
            const member = unalias(checker.getTypeAtLocation(node.expression).getProperty(key));
            if (member && identities.has(member)) return identities.get(member);
            const base = reference(node.expression, new Set(seen));
            return base ? { ...base, path: [...base.path, key] } : null;
        }
        if (!symbol || seen.has(symbol) || !ts.isIdentifier(node)) return null;
        seen.add(symbol);
        for (const declaration of symbol.declarations ?? []) {
            if (ts.isVariableDeclaration(declaration) && declaration.initializer && declaration.parent.flags & ts.NodeFlags.Const) return reference(declaration.initializer, seen);
            if (ts.isBindingElement(declaration) && !declaration.dotDotDotToken && ts.isObjectBindingPattern(declaration.parent)) {
                const variable = declaration.parent.parent;
                const key = declaration.propertyName ?? declaration.name;
                if (ts.isVariableDeclaration(variable) && variable.initializer && variable.parent.flags & ts.NodeFlags.Const && (ts.isIdentifier(key) || ts.isStringLiteralLike(key))) {
                    const base = reference(variable.initializer, seen);
                    return base ? { ...base, path: [...base.path, key.text] } : null;
                }
            }
        }
        return null;
    }
    function initializer(input) {
        const node = unwrapUiExpression(input);
        if (!node || !ts.isIdentifier(node)) return null;
        const symbol = unalias(checker.getSymbolAtLocation(node));
        const declaration = symbol?.declarations?.find(item => ts.isVariableDeclaration(item) && item.parent.flags & ts.NodeFlags.Const);
        return declaration?.initializer ?? null;
    }
    function formResult(input, seen = new Set()) {
        const node = unwrapUiExpression(input);
        if (!node || seen.has(node)) return false;
        seen.add(node);
        if (ts.isCallExpression(node)) {
            const factory = reference(node.expression);
            return factory?.owner === 'form' && factory.exportName === 'useForm';
        }
        const value = initializer(node);
        return value ? formResult(value, seen) : false;
    }
    function registrationMethod(input, seen = new Set()) {
        const node = unwrapUiExpression(input);
        if (!node || seen.has(node)) return false;
        seen.add(node);
        if (ts.isPropertyAccessExpression(node)) return node.name.text === 'register' && formResult(node.expression);
        if (!ts.isIdentifier(node)) return false;
        const symbol = unalias(checker.getSymbolAtLocation(node));
        const declaration = symbol?.declarations?.find(item => ts.isBindingElement(item) && !item.dotDotDotToken && ts.isObjectBindingPattern(item.parent));
        if (declaration && (declaration.propertyName ?? declaration.name).getText() === 'register') {
            const variable = declaration.parent.parent;
            if (ts.isVariableDeclaration(variable) && variable.parent.flags & ts.NodeFlags.Const) return formResult(variable.initializer);
        }
        const value = initializer(node);
        return value ? registrationMethod(value, seen) : false;
    }
    const isFormRegistration = input => {
        const node = unwrapUiExpression(input);
        return Boolean(node && ts.isCallExpression(node) && registrationMethod(node.expression));
    };
    // This identifies unresolved access to a known owner; it never certifies a value.
    function origin(input, seen = new Set()) {
        const node = unwrapUiExpression(input);
        if (!node || seen.has(node)) return null;
        seen.add(node);
        const resolved = reference(node);
        if (resolved) return resolved.owner;
        if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return origin(node.expression, seen);
        if (!ts.isIdentifier(node)) return null;
        const symbol = unalias(checker.getSymbolAtLocation(node));
        if (moduleOwners.has(symbol)) return moduleOwners.get(symbol);
        const value = initializer(node);
        return value ? origin(value, seen) : null;
    }
    return { program, checker, source: file => program.getSourceFile(path.resolve(file)), reference, initializer, isFormRegistration, origin };
}
