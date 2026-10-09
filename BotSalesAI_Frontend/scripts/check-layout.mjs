#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
import postcss from 'postcss';
import { isScriptSource, uiSourceFiles } from './ui-source-files.mjs';
import { auditUiImportScope } from './ui-import-scope.mjs';
import { createUiBindings } from './ui-bindings.mjs';

const SPACING_KEYS = new Set([
    'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'paddingBlock', 'paddingBlockStart', 'paddingBlockEnd', 'paddingInline', 'paddingInlineStart', 'paddingInlineEnd',
    'padding-block', 'padding-block-start', 'padding-block-end', 'padding-inline', 'padding-inline-start', 'padding-inline-end',
    'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'marginBlock', 'marginBlockStart', 'marginBlockEnd', 'marginInline', 'marginInlineStart', 'marginInlineEnd',
    'margin-block', 'margin-block-start', 'margin-block-end', 'margin-inline', 'margin-inline-start', 'margin-inline-end',
    'gap', 'rowGap', 'columnGap', 'spacing', 'rowSpacing', 'columnSpacing',
]);
const CSS_SPACING_KEYS = new Set([
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-block', 'padding-block-start',
    'padding-block-end', 'padding-inline', 'padding-inline-start', 'padding-inline-end', 'margin', 'margin-top',
    'margin-right', 'margin-bottom', 'margin-left', 'margin-block', 'margin-block-start', 'margin-block-end',
    'margin-inline', 'margin-inline-start', 'margin-inline-end', 'gap', 'row-gap', 'column-gap',
]);
const MARGIN_KEYS = new Set([
    'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'marginBlock', 'marginBlockStart', 'marginBlockEnd', 'marginInline', 'marginInlineStart', 'marginInlineEnd',
    'margin-block', 'margin-block-start', 'margin-block-end', 'margin-inline', 'margin-inline-start', 'margin-inline-end',
]);
const MARGIN_SHORTHAND_KEYS = new Set(['m', 'margin', 'marginBlock', 'marginInline', 'margin-block', 'margin-inline']);
const STYLE_ATTRIBUTES = new Set(['sx', 'style', 'css', 'slotProps', 'componentsProps', 'styles']);
const PANEL_GEOMETRY_KEYS = new Set(['display', 'flexDirection', 'height', 'gridColumn']);
const OWNER_PATH = 'apps/web/src/shared/ui/layout.ts';

function parseArgs(argv) {
    const result = { root: process.cwd(), strict: true, json: false, exceptions: null };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--root') result.root = path.resolve(argv[++index] || '.');
        else if (arg === '--exceptions') result.exceptions = path.resolve(argv[++index] || '');
        else if (arg === '--report') result.strict = false;
        else if (arg === '--json') result.json = true;
        else if (arg === '--help' || arg === '-h') result.help = true;
        else throw new Error(`Unknown argument: ${arg}`);
    }
    return result;
}

function posixPath(value) {
    return value.split(path.sep).join('/');
}

function locationOf(sourceFile, node) {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return { line: position.line + 1, column: position.character + 1 };
}

function propertyName(node) {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
    if (ts.isComputedPropertyName(node) && ts.isStringLiteralLike(node.expression)) return node.expression.text;
    return null;
}

function unwrapExpression(node) {
    while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression;
    return node;
}

function objectPropertyValue(node, name) {
    const value = unwrapExpression(node);
    if (!value || !ts.isObjectLiteralExpression(value)) return null;
    const property = value.properties.find(member => ts.isPropertyAssignment(member) && propertyName(member.name) === name);
    return property ? property.initializer : null;
}

function hasSeenContext(cache, node, context) {
    let contexts = cache.get(node);
    if (!contexts) {
        contexts = new Set();
        cache.set(node, contexts);
    }
    if (contexts.has(context)) return true;
    contexts.add(context);
    return false;
}

function isZeroOrAuto(node, property) {
    if (ts.isNumericLiteral(node)) return Number(node.text) === 0;
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) return Number(node.operand.text) === 0;
    if (!ts.isStringLiteralLike(node)) return false;
    const value = node.text.trim();
    if (/^0(?:\.0+)?(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|lh|rlh)?$/i.test(value)) return true;
    if (!MARGIN_KEYS.has(property)) return false;
    const parts = value.split(/\s+/);
    const maxParts = MARGIN_SHORTHAND_KEYS.has(property) ? (property === 'm' || property === 'margin' ? 4 : 2) : 1;
    return parts.length <= maxParts && parts.every(part => /^0(?:\.0+)?(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|lh|rlh)?$/i.test(part) || part === 'auto');
}

function isCanonicalCssSpacingValue(value, property, canonicalSpacingVariables) {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    const maxParts = ['gap', 'row-gap', 'column-gap', 'padding-block', 'padding-inline', 'margin-block', 'margin-inline'].includes(property) ? 2
        : ['padding', 'margin'].includes(property) ? 4 : 1;
    if (!parts.length || parts.length > maxParts) return false;
    return parts.every(part => {
        if (/^0(?:\.0+)?(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|lh|rlh)?$/i.test(part)) return true;
        if (part === 'auto') return property.startsWith('margin');
        const match = /^var\((--space-[\w-]+)\)$/.exec(part);
        return Boolean(match && canonicalSpacingVariables.has(match[1]));
    });
}

function validateAgainstSchema(value, schema, pointer = '$') {
    const issues = [];
    const typeMatches = {
        object: candidate => Boolean(candidate) && typeof candidate === 'object' && !Array.isArray(candidate),
        array: Array.isArray,
        string: candidate => typeof candidate === 'string',
        number: candidate => typeof candidate === 'number' && Number.isFinite(candidate),
        integer: candidate => Number.isInteger(candidate),
        boolean: candidate => typeof candidate === 'boolean',
    };
    if (schema.type && !typeMatches[schema.type]?.(value)) return [`${pointer} must be ${schema.type}`];
    if ('const' in schema && value !== schema.const) issues.push(`${pointer} must equal ${JSON.stringify(schema.const)}`);
    if (schema.enum && !schema.enum.includes(value)) issues.push(`${pointer} must be one of ${schema.enum.join(', ')}`);
    if (typeof value === 'string') {
        if (schema.minLength && value.length < schema.minLength) issues.push(`${pointer} is shorter than minLength ${schema.minLength}`);
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) issues.push(`${pointer} does not match its required pattern`);
    }
    if (Array.isArray(value) && schema.items) value.forEach((item, index) => issues.push(...validateAgainstSchema(item, schema.items, `${pointer}[${index}]`)));
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const required of schema.required || []) if (!(required in value)) issues.push(`${pointer}.${required} is required`);
        const properties = schema.properties || {};
        for (const [key, item] of Object.entries(value)) {
            if (properties[key]) issues.push(...validateAgainstSchema(item, properties[key], `${pointer}.${key}`));
            else if (schema.additionalProperties === false) issues.push(`${pointer}.${key} is not allowed`);
        }
    }
    return issues;
}

function validateExceptionRegistry(registry, schema) {
    if (!schema) return ['Exception JSON Schema is missing or invalid'];
    const issues = validateAgainstSchema(registry, schema);
    if (registry && Array.isArray(registry.exceptions)) {
        const ids = new Set();
        for (const exception of registry.exceptions) {
            if (!exception || typeof exception !== 'object' || typeof exception.id !== 'string') continue;
            if (ids.has(exception.id)) issues.push(`Duplicate exception id: ${exception.id}`);
            ids.add(exception.id);
            if (typeof exception.path === 'string' && (path.isAbsolute(exception.path) || exception.path.split(/[\\/]/).includes('..'))) issues.push(`Exception ${exception.id} path must be repository relative`);
        }
    }
    return issues;
}

function componentForFile(file) {
    const segments = file.split('/');
    const appIndex = segments.indexOf('src');
    const area = appIndex >= 0 ? segments[appIndex + 1] : null;
    if (area === 'modules' && segments[appIndex + 2]) return `module:${segments[appIndex + 2]}`;
    if (area === 'shared' && segments[appIndex + 2] === 'ui') return 'shared-ui';
    if (area === 'shared' && segments[appIndex + 2]) return `shared:${segments[appIndex + 2]}`;
    if (area === 'app') return 'app-shell';
    if (area) return area;
    return segments.slice(0, 4).join('/') || '(root)';
}

function summarizeFindings(findings, keyOf) {
    const groups = new Map();
    for (const finding of findings) {
        const key = keyOf(finding);
        let summary = groups.get(key);
        if (!summary) {
            summary = { key, findings: 0, counts: {} };
            groups.set(key, summary);
        }
        summary.findings += 1;
        summary.counts[finding.code] = (summary.counts[finding.code] || 0) + 1;
    }
    return [...groups.values()].sort((left, right) => right.findings - left.findings || left.key.localeCompare(right.key));
}

function scan(root, registryPath = null) {
    const appRoot = path.join(root, 'apps/web/src');
    const importScope = auditUiImportScope(root, uiSourceFiles(root));
    const sourceFiles = importScope.files;
    const exceptionFile = registryPath || path.join(root, 'scripts/layout-exceptions.json');
    const report = { schemaVersion: 1, status: 'PASS', root, files: 0, scannedFiles: [], findings: [], exceptionsUsed: [], exceptionsUnused: [], counts: {} };
    const canonicalSpacingVariables = new Set();
    const addFinding = (file, location, property, value, code, message) => {
        report.findings.push({ file: posixPath(path.relative(root, file)), ...location, property, value, code, message });
    };
    const htmlEntry = path.join(root, 'apps/web/index.html');
    if (fs.existsSync(htmlEntry)) {
        report.files += 1;
        report.scannedFiles.push(posixPath(path.relative(root, htmlEntry)));
        const html = fs.readFileSync(htmlEntry, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
        if (/<style\b/i.test(html)) addFinding(htmlEntry, { line: 1, column: 1 }, 'style', '', 'INLINE_STYLE_TAG_SOURCE', 'Keep UI CSS in imported stylesheets or the shared styling owners; inline HTML style tags bypass source ownership');
        if (/<[a-z][^>]*\sstyle\s*=/i.test(html)) addFinding(htmlEntry, { line: 1, column: 1 }, 'style', '', 'INLINE_STYLE_ATTRIBUTE_SOURCE', 'HTML entry style attributes bypass the shared layout and visual owners');
    } else addFinding(htmlEntry, { line: 1, column: 1 }, 'html-entry', '', 'UI_SOURCE_SCOPE', 'Expected apps/web/index.html entry is missing');
    report.importScope = { assets: importScope.assets.map(file => posixPath(path.relative(root, file))), libraries: importScope.libraries };
    for (const issue of importScope.issues) addFinding(path.resolve(root, issue.file), { line: 1, column: 1 }, 'source', '', 'UI_IMPORT_SCOPE', issue.message);
    let bindings = null;
    try { bindings = createUiBindings(root, sourceFiles.filter(isScriptSource)); }
    catch (error) { addFinding(path.join(root, 'apps/web/tsconfig.json'), { line: 1, column: 1 }, 'bindings', '', 'UI_BINDINGS_UNAVAILABLE', error.message); }
    let responsiveBreakpoints = null;
    const themeSource = bindings?.source(path.join(appRoot, 'shared/ui/theme.ts'));
    if (themeSource) {
        const resolveSymbol = symbol => {
            const seen = new Set();
            while (symbol && symbol.flags & ts.SymbolFlags.Alias && !seen.has(symbol)) {
                seen.add(symbol);
                symbol = bindings.checker.getAliasedSymbol(symbol);
            }
            return symbol;
        };
        const themeFactories = new Set();
        for (const statement of themeSource.statements) {
            if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== '@mui/material/styles' || !statement.importClause?.namedBindings || !ts.isNamedImports(statement.importClause.namedBindings)) continue;
            for (const specifier of statement.importClause.namedBindings.elements) {
                if ((specifier.propertyName?.text || specifier.name.text) === 'createTheme' && bindings.reference(specifier.name)?.owner === 'mui') {
                    const symbol = bindings.checker.getSymbolAtLocation(specifier.name);
                    if (symbol) themeFactories.add(resolveSymbol(symbol));
                }
            }
        }
        let createThemeCount = 0;
        const inspectTheme = node => {
            const callSymbol = ts.isCallExpression(node) ? bindings.checker.getSymbolAtLocation(node.expression) : null;
            if (callSymbol && themeFactories.has(resolveSymbol(callSymbol)) && bindings.reference(node.expression)?.owner === 'mui') {
                createThemeCount += 1;
                const values = objectPropertyValue(objectPropertyValue(node.arguments[0], 'breakpoints'), 'values');
                const object = unwrapExpression(values);
                if (object && ts.isObjectLiteralExpression(object) && object.properties.every(member => ts.isPropertyAssignment(member) && propertyName(member.name))) {
                    responsiveBreakpoints = new Set(object.properties.map(member => propertyName(member.name)));
                }
            }
            ts.forEachChild(node, inspectTheme);
        };
        inspectTheme(themeSource);
        if (createThemeCount !== 1) responsiveBreakpoints = null;
    }

    let registry;
    let exceptionSchema;
    try {
        registry = JSON.parse(fs.readFileSync(exceptionFile, 'utf8'));
    } catch (error) {
        addFinding(exceptionFile, { line: 1, column: 1 }, 'exceptions', '', 'EXCEPTION_REGISTRY_INVALID', `Cannot read exception registry: ${error.message}`);
        registry = { version: 1, exceptions: [] };
    }
    try {
        exceptionSchema = JSON.parse(fs.readFileSync(path.join(root, 'scripts/layout-exceptions.schema.json'), 'utf8'));
    } catch (error) {
        addFinding(path.join(root, 'scripts/layout-exceptions.schema.json'), { line: 1, column: 1 }, 'schema', '', 'EXCEPTION_SCHEMA_INVALID', `Cannot read exception JSON Schema: ${error.message}`);
    }
    for (const issue of validateExceptionRegistry(registry, exceptionSchema)) addFinding(exceptionFile, { line: 1, column: 1 }, 'exceptions', '', 'EXCEPTION_REGISTRY_INVALID', issue);

    const exceptions = registry.exceptions || [];
    const usedExceptionIds = new Set();
    const findException = (file, selector, property, value) => {
        const relative = posixPath(path.relative(root, file));
        const scoped = exceptions.filter(item => item.path === relative && item.property === property);
        if (!scoped.length) return null;
        const exact = scoped.find(item => item.selector === selector && item.value === value);
        if (!exact) {
            for (const item of scoped) addFinding(file, { line: 1, column: 1 }, property, value, 'EXCEPTION_SCOPE_MISMATCH', `Exception ${item.id} does not match selector/value exactly`);
            return null;
        }
        usedExceptionIds.add(exact.id);
        report.exceptionsUsed.push(exact.id);
        return exact;
    };

    const tokenCss = path.join(appRoot, 'app/tokens.css');
    if (fs.existsSync(tokenCss)) {
        try {
            postcss.parse(fs.readFileSync(tokenCss, 'utf8'), { from: tokenCss }).walkDecls(declaration => {
                if (/^--space-[\w-]+$/.test(declaration.prop)) canonicalSpacingVariables.add(declaration.prop);
            });
        } catch (error) {
            addFinding(tokenCss, { line: error.line || 1, column: error.column || 1 }, 'tokens.css', '', 'PARSE_ERROR', error.reason || error.message);
        }
    }

    const parameterInputs = new Map();
    const literalKey = expression => {
        const node = unwrapExpression(expression);
        if (!node) return null;
        if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
        const type = bindings.checker.getTypeAtLocation(node);
        return type.flags & (ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral) ? String(type.value) : null;
    };
    const bindingKey = name => ts.isComputedPropertyName(name) ? literalKey(name.expression) : ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name) ? name.text : null;
    const assignedValues = new Map();
    const destructuredParameterInputs = new Map();
    const restParameterInputs = new Map();
    const opaqueParameterInputs = new Set();
    const expandArrayArguments = (expression, seen = new Set()) => {
        const node = unwrapExpression(expression);
        if (!node || seen.has(node)) return null;
        seen.add(node);
        if (!ts.isArrayLiteralExpression(node)) {
            const initializer = bindings.initializer(node);
            return initializer ? expandArrayArguments(initializer, seen) : null;
        }
        const values = [];
        for (const element of node.elements) {
            if (!ts.isSpreadElement(element)) values.push(element);
            else {
                const expanded = expandArrayArguments(element.expression, new Set(seen));
                if (!expanded) return null;
                values.push(...expanded);
            }
        }
        return values;
    };
    if (bindings) for (const file of sourceFiles.filter(isScriptSource)) {
        const source = bindings.source(file);
        if (!source) continue;
        const collectCalls = node => {
            if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) {
                const symbol = bindings.checker.getSymbolAtLocation(node.left);
                if (symbol) assignedValues.set(symbol, [...(assignedValues.get(symbol) ?? []), node.right]);
            }
            if (ts.isCallExpression(node)) {
                const declaration = bindings.checker.getResolvedSignature(node)?.declaration;
                const callArguments = node.arguments.flatMap(argument => ts.isSpreadElement(argument) ? expandArrayArguments(argument.expression) ?? [argument] : [argument]);
                const opaqueIndex = callArguments.findIndex(ts.isSpreadElement);
                for (const [index, parameter] of (declaration?.parameters ?? []).entries()) {
                    const argument = callArguments[index];
                    if (opaqueIndex >= 0 && (index >= opaqueIndex || parameter.dotDotDotToken)) {
                        const markBinding = name => {
                            if (ts.isIdentifier(name)) {
                                const symbol = bindings.checker.getSymbolAtLocation(name);
                                if (symbol) opaqueParameterInputs.add(symbol);
                            } else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
                                for (const element of name.elements) if (ts.isBindingElement(element)) markBinding(element.name);
                            }
                        };
                        markBinding(parameter.name);
                    }
                    if (parameter.dotDotDotToken && ts.isIdentifier(parameter.name)) {
                        const symbol = bindings.checker.getSymbolAtLocation(parameter.name);
                        if (symbol) restParameterInputs.set(symbol, [...(restParameterInputs.get(symbol) ?? []), callArguments.slice(index)]);
                    }
                    if ((ts.isObjectBindingPattern(parameter.name) || ts.isArrayBindingPattern(parameter.name)) && argument && !ts.isSpreadElement(argument)) {
                        const collectBindings = (pattern, keys) => {
                            for (const element of pattern.elements) {
                                if (!ts.isBindingElement(element) || element.dotDotDotToken) continue;
                                const key = ts.isArrayBindingPattern(pattern) ? String(pattern.elements.indexOf(element)) : bindingKey(element.propertyName ?? element.name);
                                if (key === null) continue;
                                const path = [...keys, key];
                                if (ts.isObjectBindingPattern(element.name) || ts.isArrayBindingPattern(element.name)) collectBindings(element.name, path);
                                else if (ts.isIdentifier(element.name)) {
                                    const symbol = bindings.checker.getSymbolAtLocation(element.name);
                                    if (symbol) destructuredParameterInputs.set(symbol, [...(destructuredParameterInputs.get(symbol) ?? []), { argument, path }]);
                                }
                            }
                        };
                        collectBindings(parameter.name, []);
                    }
                    if (!ts.isIdentifier(parameter.name) || parameter.dotDotDotToken || !argument || ts.isSpreadElement(argument)) continue;
                    const symbol = bindings.checker.getSymbolAtLocation(parameter.name);
                    if (symbol) parameterInputs.set(symbol, [...(parameterInputs.get(symbol) ?? []), argument]);
                }
            }
            ts.forEachChild(node, collectCalls);
        };
        collectCalls(source);
    }
    for (const file of sourceFiles) {
        const extension = path.extname(file).toLowerCase();
        const relative = posixPath(path.relative(root, file));
        if (extension === '.css') {
            if (relative.endsWith('/app/tokens.css')) continue;
            report.files += 1;
            report.scannedFiles.push(relative);
            const text = fs.readFileSync(file, 'utf8');
            let rootNode;
            try {
                rootNode = postcss.parse(text, { from: file });
            } catch (error) {
                addFinding(file, { line: error.line || 1, column: error.column || 1 }, 'css', '', 'PARSE_ERROR', error.reason || error.message);
                continue;
            }
            rootNode.walkDecls(declaration => {
                const property = declaration.prop.toLowerCase();
                if (!CSS_SPACING_KEYS.has(property)) return;
                const value = declaration.value.trim();
                if (isCanonicalCssSpacingValue(value, property, canonicalSpacingVariables)) return;
                if (findException(file, declaration.parent.selector || '*', property, value)) return;
                const position = { line: declaration.source.start.line, column: declaration.source.start.column };
                addFinding(file, position, property, value, 'CSS_SPACING_LITERAL', 'CSS spacing must use a canonical spacing variable or an exact-scope documented exception');
            });
            continue;
        }
        if (!isScriptSource(file)) continue;
        report.files += 1;
        report.scannedFiles.push(relative);
        const source = fs.readFileSync(file, 'utf8');
        const sourceFile = bindings?.source(file) ?? ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
        const parseDiagnostics = sourceFile.parseDiagnostics || [];
        for (const diagnostic of parseDiagnostics) {
            const start = diagnostic.start ?? 0;
            const position = sourceFile.getLineAndCharacterOfPosition(start);
            addFinding(file, { line: position.line + 1, column: position.character + 1 }, 'typescript', '', 'PARSE_ERROR', ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
        if (parseDiagnostics.length) continue;
        if (!bindings) continue; // Preserve parse diagnostics, never fall back to lexical acceptance.

        const ownerMode = relative === OWNER_PATH;
        const scannedObjects = new WeakMap();
        const scannedFunctions = new WeakMap();
        const activeFunctions = new WeakSet();
        const activeStyleAliases = new Set();
        const seenAliases = new Set();
        let canonicalTokenImport = false;
        for (const statement of sourceFile.statements) {
            if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
                const named = statement.importClause?.namedBindings;
                if (named && ts.isNamedImports(named)) canonicalTokenImport ||= named.elements.some(element => {
                    const resolved = bindings.reference(element.name);
                    return element.name.text === 'tokens' && resolved?.owner === 'tokens' && resolved.exportName === 'tokens';
                });
            }
        }
        const ownerDeclaration = name => sourceFile.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations]).find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === name);
        const functionDeclarationFor = node => bindings.checker.getSymbolAtLocation(node)?.declarations?.find(item => ts.isFunctionDeclaration(item));
        const exprLabel = node => source.slice(node.getStart(sourceFile), node.getEnd()).replace(/\s+/g, ' ').slice(0, 120);

        const expectedFactors = {
            zero: '0',
            xs: 'tokens.space.xs/tokens.space.sm',
            sm: 'tokens.space.sm/tokens.space.sm',
            md: 'tokens.space.md/tokens.space.sm',
            lg: 'tokens.space.lg/tokens.space.sm',
            xl: 'tokens.space.xl/tokens.space.sm',
            xxl: 'tokens.space.xxl/tokens.space.sm',
            xxxl: 'tokens.space.xxxl/tokens.space.sm',
        };
        const factorDeclaration = ownerDeclaration('factor');
        const factorSymbol = factorDeclaration && bindings.checker.getSymbolAtLocation(factorDeclaration.name);
        const factorInitializer = unwrapExpression(factorDeclaration?.initializer);
        const factorEntries = new Map(factorInitializer && ts.isObjectLiteralExpression(factorInitializer) ? factorInitializer.properties
            .filter(ts.isPropertyAssignment)
            .map(entry => [propertyName(entry.name), entry.initializer.getText(sourceFile).replace(/\s+/g, '')]) : []);
        const ownerFactorMapValid = ownerMode && canonicalTokenImport && Object.keys(expectedFactors).every(key => factorEntries.get(key) === expectedFactors[key]) && factorEntries.size === Object.keys(expectedFactors).length;
        if (ownerMode && !ownerFactorMapValid) addFinding(file, { line: 1, column: 1 }, 'factor', '', 'BRIDGE_FACTOR_MAP_INVALID', 'Bridge factors must be the closed 0/4/8/12/16/24/32/48 scale derived from canonical tokens.space and base 8');
        if (ownerMode) {
            const tokenSpaceRef = node => {
                const resolved = bindings.reference(node);
                return resolved?.owner === 'tokens' && resolved.exportName === 'tokens' && resolved.path.length === 2 && resolved.path[0] === 'space' && /^(xs|sm|md|lg|xl|xxl|xxxl)$/.test(resolved.path[1]);
            };
            const pixelDeclaration = ownerDeclaration('cssPixel');
            const pixelSymbol = pixelDeclaration && bindings.checker.getSymbolAtLocation(pixelDeclaration.name);
            const cssPixelCall = node => ts.isCallExpression(node) && ts.isIdentifier(node.expression) && bindings.checker.getSymbolAtLocation(node.expression) === pixelSymbol && node.arguments.length === 1 && tokenSpaceRef(node.arguments[0]);
            const cssValues = unwrapExpression(ownerDeclaration('layoutCss')?.initializer);
            const verifyCssValue = (node, key = 'layoutCss') => {
                if (ts.isObjectLiteralExpression(node)) {
                    for (const member of node.properties) {
                        if (ts.isPropertyAssignment(member)) verifyCssValue(member.initializer, propertyName(member.name) || key);
                        else addFinding(file, locationOf(sourceFile, member), key, member.getText(sourceFile), 'BRIDGE_CSS_TOKEN_INVALID', 'CSS layout roles must remain explicit properties derived from canonical spacing tokens');
                    }
                    return;
                }
                if (ts.isTemplateExpression(node)) {
                    const validText = !node.head.text.trim() && node.templateSpans.every(span => !span.literal.text.trim() && cssPixelCall(span.expression));
                    if (!validText) addFinding(file, locationOf(sourceFile, node), key, exprLabel(node), 'BRIDGE_CSS_TOKEN_INVALID', 'Raw CSS layout values must be composed only from cssPixel(tokens.space.<scale>) references');
                    return;
                }
                if (cssPixelCall(node)) return;
                addFinding(file, locationOf(sourceFile, node), key, exprLabel(node), 'BRIDGE_CSS_TOKEN_INVALID', 'Raw CSS layout values must be composed only from cssPixel(tokens.space.<scale>) references');
            };
            if (!cssValues || !ts.isObjectLiteralExpression(cssValues)) addFinding(file, { line: 1, column: 1 }, 'layoutCss', '', 'BRIDGE_CSS_TOKEN_INVALID', 'Bridge must export a structured layoutCss role map');
            else verifyCssValue(cssValues);
        }

        const semanticReference = node => {
            const resolved = bindings.reference(node);
            return resolved?.owner === 'layout' && ['layoutSx', 'layoutCss'].includes(resolved.exportName) ? { importedName: resolved.exportName, path: resolved.path } : null;
        };
        const identifierIsSemantic = node => Boolean(semanticReference(node));

        const semanticMismatch = (node, property, styleContext) => {
            const reference = semanticReference(node);
            if (!reference) return null;
            const terminal = reference.path.at(-1);
            if (reference.importedName === 'layoutCss') {
                if (reference.path.join('.') === 'form.labelAfterGap' && property === 'marginBottom') return null;
                if (!['padding'].includes(property) || terminal !== 'cellInset') return `CSS role ${terminal || '(map)'} does not match spacing property ${property}`;
                return null;
            }
            if (styleContext === 'style') return 'MUI factor roles cannot be used as raw inline CSS px values; use a layoutCss role';
            const equivalent = {
                p: ['p', 'padding'], padding: ['p', 'padding'],
                px: ['px', 'paddingInline', 'padding-inline'], paddingInline: ['px', 'paddingInline', 'padding-inline'], 'padding-inline': ['px', 'paddingInline', 'padding-inline'],
                py: ['py', 'paddingBlock', 'padding-block'], paddingBlock: ['py', 'paddingBlock', 'padding-block'], 'padding-block': ['py', 'paddingBlock', 'padding-block'],
                pt: ['pt', 'paddingTop', 'padding-top'], paddingTop: ['pt', 'paddingTop', 'padding-top'], 'padding-top': ['pt', 'paddingTop', 'padding-top'],
                pr: ['pr', 'paddingRight', 'padding-right'], paddingRight: ['pr', 'paddingRight', 'padding-right'], 'padding-right': ['pr', 'paddingRight', 'padding-right'],
                pb: ['pb', 'paddingBottom', 'padding-bottom'], paddingBottom: ['pb', 'paddingBottom', 'padding-bottom'], 'padding-bottom': ['pb', 'paddingBottom', 'padding-bottom'],
                pl: ['pl', 'paddingLeft', 'padding-left'], paddingLeft: ['pl', 'paddingLeft', 'padding-left'], 'padding-left': ['pl', 'paddingLeft', 'padding-left'],
                m: ['m', 'margin'], margin: ['m', 'margin'],
                mx: ['mx', 'marginInline', 'margin-inline'], marginInline: ['mx', 'marginInline', 'margin-inline'], 'margin-inline': ['mx', 'marginInline', 'margin-inline'],
                my: ['my', 'marginBlock', 'margin-block'], marginBlock: ['my', 'marginBlock', 'margin-block'], 'margin-block': ['my', 'marginBlock', 'margin-block'],
                mt: ['mt', 'marginTop', 'margin-top'], marginTop: ['mt', 'marginTop', 'margin-top'], 'margin-top': ['mt', 'marginTop', 'margin-top'],
                mr: ['mr', 'marginRight', 'margin-right'], marginRight: ['mr', 'marginRight', 'margin-right'], 'margin-right': ['mr', 'marginRight', 'margin-right'],
                mb: ['mb', 'marginBottom', 'margin-bottom'], marginBottom: ['mb', 'marginBottom', 'margin-bottom'], 'margin-bottom': ['mb', 'marginBottom', 'margin-bottom'],
                ml: ['ml', 'marginLeft', 'margin-left'], marginLeft: ['ml', 'marginLeft', 'margin-left'], 'margin-left': ['ml', 'marginLeft', 'margin-left'],
                gap: ['gap'], rowGap: ['rowGap', 'row-gap'], 'row-gap': ['rowGap', 'row-gap'], columnGap: ['columnGap', 'column-gap'], 'column-gap': ['columnGap', 'column-gap'],
                spacing: ['spacing'], rowSpacing: ['rowSpacing'], columnSpacing: ['columnSpacing'],
            };
            if (!terminal || !SPACING_KEYS.has(property)) return `Reference ${reference.path.join('.')} is a role object, not a spacing value for ${property}`;
            if (!(equivalent[property] || []).includes(terminal)) return `Semantic value ${terminal} does not match consumer spacing property ${property}`;
            return null;
        };

        const isFactorReference = node => {
            if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return isFactorReference(node.expression);
            if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && bindings.checker.getSymbolAtLocation(node.expression) === factorSymbol) return ownerFactorMapValid;
            if (ts.isIdentifier(node)) {
                const initializer = bindings.initializer(node);
                return Boolean(initializer && initializer !== node && isFactorReference(initializer));
            }
            return false;
        };

        const checkValue = (node, property, styleContext, ownerValue = false, aliasStack = new Set()) => {
            if (!node) return;
            if (isZeroOrAuto(node, property)) return;
            if (identifierIsSemantic(node)) {
                const mismatch = semanticMismatch(node, property, styleContext);
                if (mismatch) addFinding(file, locationOf(sourceFile, node), property, exprLabel(node), 'SEMANTIC_ROLE_MISMATCH', mismatch);
                return;
            }
            if (ownerValue && isFactorReference(node)) return;
            if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) {
                checkValue(node.expression, property, styleContext, ownerValue, aliasStack);
                return;
            }
            if (ts.isObjectLiteralExpression(node)) {
                for (const member of node.properties) {
                    const breakpoint = ts.isPropertyAssignment(member) || ts.isShorthandPropertyAssignment(member) ? propertyName(member.name) : null;
                    if (!responsiveBreakpoints?.size) {
                        addFinding(file, locationOf(sourceFile, member), property, member.name?.getText(sourceFile) || member.getText(sourceFile), 'UNKNOWN_BREAKPOINT_SOURCE', 'Responsive spacing cannot be checked because the canonical MUI theme breakpoint map is unresolved');
                    } else if (!breakpoint || !responsiveBreakpoints.has(breakpoint)) {
                        addFinding(file, locationOf(sourceFile, member), property, member.name?.getText(sourceFile) || member.getText(sourceFile), 'UNKNOWN_BREAKPOINT_KEY', 'Responsive spacing keys must match the finite breakpoint names configured by the shared MUI theme');
                    }
                    if (ts.isPropertyAssignment(member) || ts.isShorthandPropertyAssignment(member)) {
                        const valueNode = ts.isPropertyAssignment(member) ? member.initializer : member.name;
                        checkValue(valueNode, property, styleContext, ownerValue, aliasStack);
                    } else if (ts.isSpreadAssignment(member)) {
                        const spread = member.expression;
                        if (identifierIsSemantic(spread) || (ownerValue && isFactorReference(spread))) continue;
                        checkValue(spread, property, styleContext, ownerValue, aliasStack);
                    }
                }
                return;
            }
            if (ts.isArrayLiteralExpression(node)) {
                if (responsiveBreakpoints?.size && node.elements.length > responsiveBreakpoints.size) addFinding(file, locationOf(sourceFile, node), property, exprLabel(node), 'UNKNOWN_BREAKPOINT_ARRAY', `Responsive spacing arrays cannot exceed the ${responsiveBreakpoints.size} breakpoints configured by the shared MUI theme`);
                else if (!responsiveBreakpoints?.size) addFinding(file, locationOf(sourceFile, node), property, exprLabel(node), 'UNKNOWN_BREAKPOINT_SOURCE', 'Responsive spacing cannot be checked because the canonical MUI theme breakpoint map is unresolved');
                for (const element of node.elements) checkValue(element, property, styleContext, ownerValue, aliasStack);
                return;
            }
            if (ts.isConditionalExpression(node)) {
                checkValue(node.whenTrue, property, styleContext, ownerValue, aliasStack);
                checkValue(node.whenFalse, property, styleContext, ownerValue, aliasStack);
                return;
            }
            if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(node.operatorToken.kind)) {
                checkValue(node.left, property, styleContext, ownerValue, aliasStack);
                checkValue(node.right, property, styleContext, ownerValue, aliasStack);
                return;
            }
            if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
                const body = node.body;
                if (ts.isBlock(body)) {
                    const returned = body.statements.filter(ts.isReturnStatement).map(statement => statement.expression).filter(Boolean);
                    for (const returnedNode of returned) checkValue(returnedNode, property, styleContext, ownerValue, aliasStack);
                } else checkValue(body, property, styleContext, ownerValue, aliasStack);
                return;
            }
            if (ts.isIdentifier(node)) {
                if (aliasStack.has(node.text)) {
                    addFinding(file, locationOf(sourceFile, node), property, node.text, 'ALIAS_CYCLE', 'Spacing alias has a cyclic definition');
                    return;
                }
                const initializer = bindings.initializer(node);
                if (initializer) {
                    if (ts.isNumericLiteral(initializer) || ts.isStringLiteralLike(initializer) || ts.isPrefixUnaryExpression(initializer)) {
                        if (!seenAliases.has(`${file}:${initializer.pos}:${initializer.end}:${property}`)) {
                            seenAliases.add(`${file}:${initializer.pos}:${initializer.end}:${property}`);
                            const code = ownerValue ? 'BRIDGE_RAW_VALUE' : 'SPACING_ALIAS_LITERAL';
                            addFinding(file, locationOf(sourceFile, initializer), property, exprLabel(initializer), code, 'Move spacing values to the shared semantic layout owner instead of a local alias');
                        }
                        return;
                    }
                    aliasStack.add(node.text);
                    checkValue(initializer, property, styleContext, ownerValue, aliasStack);
                    aliasStack.delete(node.text);
                    return;
                }
                addFinding(file, locationOf(sourceFile, node), property, node.text, 'UNKNOWN_SPACING_VALUE', 'Spacing value cannot be resolved to a shared semantic role or a permitted reset');
                return;
            }
            if (ts.isNumericLiteral(node) || ts.isPrefixUnaryExpression(node) || ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
                const code = ownerValue ? 'BRIDGE_RAW_VALUE' : 'SPACING_LITERAL';
                addFinding(file, locationOf(sourceFile, node), property, exprLabel(node), code, ownerValue ? 'Bridge spacing must be derived from the canonical private factor map' : 'Consumer spacing must reference a shared semantic layout role; scale-conforming literals are also prohibited');
                return;
            }
            if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
                const label = exprLabel(node);
                const code = /\btokens\.space\b/.test(label) ? 'UNIT_MISMATCH' : 'UNKNOWN_SPACING_VALUE';
                addFinding(file, locationOf(sourceFile, node), property, label, code, code === 'UNIT_MISMATCH' ? 'Canonical token px values cannot be passed as MUI spacing factors or inline spacing; use the typed bridge role' : 'Spacing expression is not a resolvable shared semantic role');
                return;
            }
            if (ts.isCallExpression(node)) {
                const callName = node.expression.getText(sourceFile);
                const code = callName.includes('spacing') ? 'UNKNOWN_SPACING_VALUE' : 'UNKNOWN_SPACING_VALUE';
                addFinding(file, locationOf(sourceFile, node), property, exprLabel(node), code, 'Computed spacing must resolve to a shared semantic role; helper calls are not an exemption');
                return;
            }
            addFinding(file, locationOf(sourceFile, node), property, exprLabel(node), 'UNKNOWN_SPACING_VALUE', 'Spacing expression could not be resolved; unresolved style paths are not PASS');
        };

        const scanStyleObject = (node, styleContext, ownerValue = false) => {
            if (!node) return;
            if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) return scanStyleObject(node.expression, styleContext, ownerValue);
            if (identifierIsSemantic(node)) return;
            if (ts.isIdentifier(node)) {
                const initializer = bindings.initializer(node);
                const functionDeclaration = functionDeclarationFor(node);
                const marker = `${node.text}:${styleContext}:${ownerValue}`;
                if (initializer && initializer !== node) {
                    if (activeStyleAliases.has(marker)) {
                        addFinding(file, locationOf(sourceFile, node), styleContext, node.text, 'ALIAS_CYCLE', 'Style alias has a cyclic definition');
                        return;
                    }
                    activeStyleAliases.add(marker);
                    scanStyleObject(initializer, styleContext, ownerValue);
                    activeStyleAliases.delete(marker);
                    return;
                }
                if (functionDeclaration) return scanStyleObject(functionDeclaration, styleContext, ownerValue);
                addFinding(file, locationOf(sourceFile, node), styleContext, node.text, 'UNKNOWN_STYLE_SOURCE', 'Style source cannot be resolved; unknown style helpers are not silently skipped');
                return;
            }
            if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
                if (activeFunctions.has(node)) {
                    addFinding(file, locationOf(sourceFile, node), styleContext, exprLabel(node), 'STYLE_HELPER_CYCLE', 'Recursive style helper cannot be resolved to a finite shared role object');
                    return;
                }
                if (hasSeenContext(scannedFunctions, node, `${styleContext}:${ownerValue}`)) return;
                if (['sx', 'styled', 'style', 'css', 'styleOverrides', 'bridge'].includes(styleContext)) {
                    activeFunctions.add(node);
                    scanStyleObject(node.body, styleContext, ownerValue);
                    activeFunctions.delete(node);
                }
                return;
            }
            if (ts.isFunctionDeclaration(node)) {
                if (activeFunctions.has(node)) {
                    addFinding(file, locationOf(sourceFile, node), styleContext, node.name?.text || '', 'STYLE_HELPER_CYCLE', 'Recursive style helper cannot be resolved to a finite shared role object');
                    return;
                }
                if (hasSeenContext(scannedFunctions, node, `${styleContext}:${ownerValue}`)) return;
                if (node.body && ['sx', 'styled', 'style', 'css', 'styleOverrides', 'bridge'].includes(styleContext)) {
                    activeFunctions.add(node);
                    scanStyleObject(node.body, styleContext, ownerValue);
                    activeFunctions.delete(node);
                }
                return;
            }
            if (ts.isBlock(node)) {
                for (const statement of node.statements) {
                    if (ts.isReturnStatement(statement) && statement.expression) scanStyleObject(statement.expression, styleContext, ownerValue);
                    else ts.forEachChild(statement, child => scanStyleObject(child, styleContext, ownerValue));
                }
                return;
            }
            if (ts.isConditionalExpression(node)) {
                scanStyleObject(node.whenTrue, styleContext, ownerValue);
                scanStyleObject(node.whenFalse, styleContext, ownerValue);
                return;
            }
            if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
                scanStyleObject(node.right, styleContext, ownerValue);
                return;
            }
            if (ts.isCallExpression(node)) {
                const styleFactory = bindings.reference(node.expression);
                if (styleFactory?.owner === 'emotion' && styleFactory.exportName === 'css') {
                    for (const argument of node.arguments) scanStyleObject(argument, 'style', false);
                    return;
                }
                const functionTarget = ts.isIdentifier(node.expression) && (functionDeclarationFor(node.expression) || bindings.initializer(node.expression));
                if (functionTarget && (ts.isFunctionDeclaration(functionTarget) || ts.isArrowFunction(functionTarget) || ts.isFunctionExpression(functionTarget))) scanStyleObject(functionTarget, styleContext, ownerValue);
                else {
                    for (const argument of node.arguments) scanStyleObject(argument, styleContext, ownerValue);
                    addFinding(file, locationOf(sourceFile, node), styleContext, exprLabel(node), 'UNKNOWN_STYLE_SOURCE', /\.spacing\s*$/.test(node.expression.getText(sourceFile)) ? 'Theme spacing helpers bypass the shared semantic role bridge' : 'Style helper call cannot be resolved to a statically inspectable shared role object');
                }
                return;
            }
            if (!ts.isObjectLiteralExpression(node)) {
                if (ts.isArrayLiteralExpression(node)) for (const element of node.elements) scanStyleObject(element, styleContext, ownerValue);
                else if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node) && !ts.isBlock(node)) addFinding(file, locationOf(sourceFile, node), styleContext, exprLabel(node), 'UNKNOWN_STYLE_SOURCE', 'Style expression cannot be statically resolved to a shared role object');
                return;
            }
            if (hasSeenContext(scannedObjects, node, `${styleContext}:${ownerValue}`)) return;
            const hasSemanticSpread = node.properties.some(member => ts.isSpreadAssignment(member) && identifierIsSemantic(member.expression));
            for (const member of node.properties) {
                if (ts.isSpreadAssignment(member)) {
                    if (!identifierIsSemantic(member.expression)) scanStyleObject(member.expression, styleContext, ownerValue);
                    continue;
                }
                if ((ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) && SPACING_KEYS.has(propertyName(member.name))) {
                    addFinding(file, locationOf(sourceFile, member), propertyName(member.name), member.getText(sourceFile), 'UNKNOWN_SPACING_VALUE', 'Computed spacing accessors cannot be statically resolved');
                    continue;
                }
                if (!ts.isPropertyAssignment(member) && !ts.isShorthandPropertyAssignment(member)) continue;
                if (ts.isPropertyAssignment(member) && ts.isComputedPropertyName(member.name) && !propertyName(member.name)) {
                    addFinding(file, locationOf(sourceFile, member), styleContext, member.name.getText(sourceFile), 'UNKNOWN_STYLE_KEY', 'Computed style property names must be statically resolvable');
                }
                const keyNode = member.name;
                const key = ts.isShorthandPropertyAssignment(member) ? keyNode.text : propertyName(keyNode);
                const valueNode = ts.isPropertyAssignment(member) ? member.initializer : keyNode;
                if (key && SPACING_KEYS.has(key)) {
                    if (hasSemanticSpread && !isZeroOrAuto(valueNode, key)) addFinding(file, locationOf(sourceFile, member), key, exprLabel(valueNode), 'SEMANTIC_ROLE_OVERRIDE', 'Do not spread a semantic preset and override its spacing role locally');
                    checkValue(valueNode, key, styleContext, ownerValue);
                }
                const nestedStyleObject = ts.isObjectLiteralExpression(valueNode) || ts.isArrayLiteralExpression(valueNode) || ts.isArrowFunction(valueNode) || ts.isFunctionExpression(valueNode);
                const namedStyleSource = ['sx', 'style', 'css', 'styles', 'slotProps', 'componentsProps', 'styleOverrides'].includes(key || '');
                const nestedAlias = ts.isIdentifier(valueNode) && bindings.initializer(valueNode) && ['slotProps', 'componentsProps', 'styleOverrides'].includes(styleContext);
                const nestedContext = ['css', 'styles'].includes(key || '') ? 'style' : key;
                if (nestedStyleObject || namedStyleSource || nestedAlias) scanStyleObject(valueNode, namedStyleSource ? nestedContext : styleContext, ownerValue);
            }
        };

        const scanPanelGeometry = node => {
            const expression = unwrapExpression(node);
            if (!ts.isObjectLiteralExpression(expression)) {
                addFinding(file, locationOf(sourceFile, expression), 'Panel.geometry', exprLabel(expression), 'PANEL_GEOMETRY_SOURCE_UNKNOWN', 'Panel geometry must be an inspectable object containing geometry only');
                return;
            }
            for (const member of expression.properties) {
                if (!ts.isPropertyAssignment(member)) {
                    addFinding(file, locationOf(sourceFile, member), 'Panel.geometry', member.getText(sourceFile), 'PANEL_GEOMETRY_SOURCE_UNKNOWN', 'Panel geometry cannot use spreads or computed accessors');
                    continue;
                }
                const key = propertyName(member.name);
                if (!key || !PANEL_GEOMETRY_KEYS.has(key)) {
                    addFinding(file, locationOf(sourceFile, member), key || 'Panel.geometry', member.initializer.getText(sourceFile), 'PANEL_GEOMETRY_SPACING_FORBIDDEN', 'Panel.geometry is restricted to display, flexDirection, height, and gridColumn; use semantic spacing props for gaps and insets');
                }
            }
        };

        const isControllerFieldSpread = attribute => {
            if (!ts.isIdentifier(attribute.expression)) return false;
            const spreadSymbol = bindings.checker.getSymbolAtLocation(attribute.expression);
            let arrow = attribute.parent;
            while (arrow && !ts.isArrowFunction(arrow) && !ts.isFunctionExpression(arrow)) arrow = arrow.parent;
            if (!arrow) return false;
            const controlledField = arrow.parameters.some(parameter => ts.isObjectBindingPattern(parameter.name) && parameter.name.elements.some(element => bindings.checker.getSymbolAtLocation(element.name) === spreadSymbol && (element.propertyName || element.name).getText(sourceFile) === 'field'));
            if (!controlledField) return false;
            const expression = arrow.parent;
            const renderAttribute = expression && ts.isJsxExpression(expression) ? expression.parent : null;
            if (!renderAttribute || !ts.isJsxAttribute(renderAttribute) || renderAttribute.name.getText(sourceFile) !== 'render') return false;
            const attributes = renderAttribute.parent;
            const owner = attributes?.parent;
            const resolved = owner && (ts.isJsxOpeningElement(owner) || ts.isJsxSelfClosingElement(owner)) ? bindings.reference(owner.tagName) : null;
            return resolved?.owner === 'form' && resolved.exportName === 'Controller';
        };
        const reactElementTarget = (input, seen = new Set()) => {
            const node = unwrapExpression(input);
            if (!node || seen.has(node)) return null;
            seen.add(node);
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
                const tag = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
                if (ts.isStringLiteralLike(tag)) return { owner: 'native', exportName: tag.text };
                return bindings.reference(tag);
            }
            if (ts.isStringLiteralLike(node)) return { owner: 'native', exportName: node.text };
            const directBinding = bindings.reference(node);
            if (directBinding) return directBinding;
            if (ts.isConditionalExpression(node)) {
                const left = reactElementTarget(node.whenTrue, new Set(seen));
                const right = reactElementTarget(node.whenFalse, new Set(seen));
                return left?.owner === right?.owner && left?.exportName === right?.exportName ? left : null;
            }
            if (ts.isCallExpression(node)) {
                const factory = ts.isCallExpression(node.expression) ? node.expression.expression : node.expression;
                const resolved = bindings.reference(factory);
                if (resolved?.owner === 'react' && ['createElement', 'jsx', 'jsxs', 'jsxDEV', 'cloneElement'].includes(resolved.exportName)) return reactElementTarget(node.arguments[0], seen);
            }
            if (ts.isIdentifier(node)) {
                const initializer = bindings.initializer(node);
                if (initializer) return reactElementTarget(initializer, seen);
            }
            return null;
        };
        const hasPossibleMuiSpacingProps = (input, seen = new Set()) => {
            const node = unwrapExpression(input);
            if (!node || seen.has(node)) return true;
            seen.add(node);
            if (ts.isObjectLiteralExpression(node)) return node.properties.some(member => {
                if (ts.isSpreadAssignment(member)) return hasPossibleMuiSpacingProps(member.expression, seen);
                if (!ts.isPropertyAssignment(member) && !ts.isShorthandPropertyAssignment(member)) return false;
                const name = ts.isShorthandPropertyAssignment(member) ? member.name.text : propertyName(member.name);
                return Boolean(name && SPACING_KEYS.has(name));
            });
            if (ts.isConditionalExpression(node)) return hasPossibleMuiSpacingProps(node.whenTrue, new Set(seen)) || hasPossibleMuiSpacingProps(node.whenFalse, new Set(seen));
            if (ts.isIdentifier(node)) {
                const initializer = bindings.initializer(node);
                return initializer ? hasPossibleMuiSpacingProps(initializer, seen) : true;
            }
            return true;
        };
        const typeName = input => bindings.checker.getTypeAtLocation(input).aliasSymbol?.name || bindings.checker.getTypeAtLocation(input).getSymbol()?.name;
        const isCssStyleDeclaration = input => typeName(input) === 'CSSStyleDeclaration';
        const hasTypeMember = (input, member) => Boolean(bindings.checker.getTypeAtLocation(input).getProperty(member));
        const hasCssStyleAttribute = input => {
            const type = bindings.checker.getTypeAtLocation(input);
            const property = type.getProperty('style');
            const propertyType = property && bindings.checker.getTypeOfSymbolAtLocation(property, input);
            return Boolean(propertyType && (propertyType.aliasSymbol?.name || propertyType.getSymbol()?.name) === 'CSSStyleDeclaration');
        };
        const cssPropertyName = input => {
            const key = ts.isPropertyAccessExpression(input) ? input.name.text : ts.isElementAccessExpression(input) ? propertyName(input.argumentExpression) : null;
            return key ? key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()).toLowerCase() : null;
        };
        const globalMutator = (expression, seen = new Set()) => {
            const node = unwrapExpression(expression);
            if (!node || seen.has(node)) return false;
            seen.add(node);
            const initializer = bindings.initializer(node);
            if (initializer) return globalMutator(initializer, seen);
            const name = ts.isPropertyAccessExpression(node) ? node.name : ts.isElementAccessExpression(node) ? node.argumentExpression : node;
            let symbol = bindings.checker.getSymbolAtLocation(name);
            if (ts.isIdentifier(node)) {
                const declaration = symbol?.declarations?.find(item => ts.isBindingElement(item) && !item.dotDotDotToken && ts.isObjectBindingPattern(item.parent));
                const variable = declaration?.parent.parent;
                const key = declaration?.propertyName ?? declaration?.name;
                if (variable && ts.isVariableDeclaration(variable) && variable.initializer && variable.parent.flags & ts.NodeFlags.Const && key && (ts.isIdentifier(key) || ts.isStringLiteralLike(key))) symbol = bindings.checker.getTypeAtLocation(variable.initializer).getProperty(key.text);
            }
            return symbol?.declarations?.some(declaration => {
                if (!bindings.program.isSourceFileDefaultLibrary(declaration.getSourceFile())) return false;
                const container = declaration.parent;
                const owner = ts.isInterfaceDeclaration(container) ? container.name.text : ts.isModuleBlock(container) && ts.isModuleDeclaration(container.parent) ? container.parent.name.text : null;
                const method = symbol.name;
                return owner === 'ObjectConstructor' && ['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf'].includes(method) || owner === 'Reflect' && ['set', 'defineProperty', 'deleteProperty', 'setPrototypeOf'].includes(method);
            }) ? symbol.name : null;
        };
        const canonicalTarget = expression => {
                const target = bindings.reference(expression);
                return target && ((target.owner === 'layout' && ['layoutSx', 'layoutCss'].includes(target.exportName)) || (target.owner === 'visual' && target.exportName === 'visualSx') || (target.owner === 'tokens' && ['tokens', 'colors'].includes(target.exportName)));
        };
        const literalArray = (expression, seen = new Set()) => {
            const node = unwrapExpression(expression);
            if (!node || seen.has(node)) return null;
            seen.add(node);
            if (ts.isArrayLiteralExpression(node)) return node;
            const initializer = bindings.initializer(node);
            return initializer ? literalArray(initializer, seen) : null;
        };
        const possiblyCanonical = (expression, seen = new Set()) => {
            const node = unwrapExpression(expression);
            if (!node || seen.has(node)) return false;
            seen.add(node);
            if (canonicalTarget(node)) return true;
            if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
                const key = ts.isPropertyAccessExpression(node) ? node.name.text : literalKey(node.argumentExpression);
                if (key === null && ts.isElementAccessExpression(node)) {
                    const keyType = bindings.checker.getTypeAtLocation(node.argumentExpression);
                    const candidates = keyType.isUnion() && keyType.types.every(type => type.flags & (ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral)) ? new Set(keyType.types.map(type => String(type.value))) : null;
                    for (const member of bindings.checker.getTypeAtLocation(node.expression).getProperties()) {
                        if (candidates && !candidates.has(member.name)) continue;
                        const property = member.flags & ts.SymbolFlags.Alias ? bindings.checker.getAliasedSymbol(member) : member;
                        const values = property.declarations?.flatMap(declaration => ts.isPropertyAssignment(declaration) || ts.isVariableDeclaration(declaration) ? declaration.initializer ? [declaration.initializer] : [] : ts.isShorthandPropertyAssignment(declaration) ? [declaration.name] : []) ?? [];
                        if ([...values, ...(assignedValues.get(property) ?? [])].some(value => possiblyCanonical(value, new Set(seen)))) return true;
                        const base = unwrapExpression(node.expression);
                        let object = base;
                        const visited = new Set();
                        while (object && !ts.isCallExpression(object) && !ts.isObjectLiteralExpression(object) && !visited.has(object)) {
                            visited.add(object);
                            object = unwrapExpression(bindings.initializer(object));
                        }
                        if (object && ts.isCallExpression(object) && globalMutator(object.expression) === 'assign') {
                            for (const source of [...object.arguments].reverse()) {
                                const selected = bindings.checker.getTypeAtLocation(source).getProperty(member.name);
                                if (!selected) continue;
                                if (possiblyCanonical(source, new Set(seen)) && bindings.checker.getTypeOfSymbolAtLocation(selected, source).flags & ts.TypeFlags.Object) return true;
                                const declaration = selected.declarations?.find(item => ts.isPropertyAssignment(item) || ts.isShorthandPropertyAssignment(item));
                                if (declaration && possiblyCanonical(ts.isPropertyAssignment(declaration) ? declaration.initializer : declaration.name, new Set(seen))) return true;
                            }
                        }
                    }
                }
                const property = key !== null ? bindings.checker.getTypeAtLocation(node.expression).getProperty(key) : null;
                if (property) {
                    const exported = property.flags & ts.SymbolFlags.Alias ? bindings.checker.getAliasedSymbol(property) : property;
                    const values = exported.declarations?.filter(ts.isVariableDeclaration).map(declaration => declaration.initializer).filter(Boolean) ?? [];
                    if ([...values, ...(assignedValues.get(exported) ?? [])].some(value => possiblyCanonical(value, seen))) return true;
                }
                const array = literalArray(node.expression);
                const base = unwrapExpression(node.expression);
                if (key !== null && property) {
                    let object = base;
                    const visited = new Set();
                    while (object && !ts.isObjectLiteralExpression(object) && !ts.isCallExpression(object) && !visited.has(object)) {
                        visited.add(object);
                        object = unwrapExpression(bindings.initializer(object));
                    }
                    if (object && ts.isObjectLiteralExpression(object)) {
                        for (const member of [...object.properties].reverse()) {
                            if (ts.isPropertyAssignment(member) && bindingKey(member.name) === key) return possiblyCanonical(member.initializer, seen);
                            if (ts.isShorthandPropertyAssignment(member) && member.name.text === key) return possiblyCanonical(member.name, seen);
                            if (ts.isSpreadAssignment(member) && possiblyCanonical(member.expression, seen) && bindings.checker.getTypeAtLocation(member.expression).getProperty(key) && bindings.checker.getTypeOfSymbolAtLocation(property, node).flags & ts.TypeFlags.Object) return true;
                        }
                    }
                    if (object && ts.isCallExpression(object) && globalMutator(object.expression) === 'assign') {
                        for (const source of [...object.arguments].reverse()) {
                            const selected = bindings.checker.getTypeAtLocation(source).getProperty(key);
                            if (!selected) continue;
                            if (possiblyCanonical(source, new Set(seen)) && bindings.checker.getTypeOfSymbolAtLocation(selected, source).flags & ts.TypeFlags.Object) return true;
                            const member = selected.declarations?.find(declaration => ts.isPropertyAssignment(declaration) || ts.isShorthandPropertyAssignment(declaration));
                            if (member) return possiblyCanonical(ts.isPropertyAssignment(member) ? member.initializer : member.name, seen);
                        }
                    }
                }
                if (ts.isIdentifier(base) && property) {
                    const symbol = bindings.checker.getSymbolAtLocation(base);
                    const restBinding = symbol?.declarations?.find(declaration => ts.isBindingElement(declaration) && declaration.dotDotDotToken && ts.isObjectBindingPattern(declaration.parent));
                    const variable = restBinding?.parent.parent;
                    const propertyType = bindings.checker.getTypeOfSymbolAtLocation(property, node);
                    if (variable && ts.isVariableDeclaration(variable) && variable.initializer && canonicalTarget(variable.initializer) && propertyType.flags & ts.TypeFlags.Object) return true;
                }
                const restInputs = ts.isIdentifier(base) ? restParameterInputs.get(bindings.checker.getSymbolAtLocation(base)) : null;
                if (restInputs && (key === null || /^(0|[1-9]\d*)$/.test(key))) {
                    if (restInputs.some(values => {
                        if (values.some(ts.isSpreadElement)) return values.some(value => {
                            if (!ts.isSpreadElement(value)) return possiblyCanonical(value, seen);
                            const nested = literalArray(value.expression);
                            return nested ? arrayMayContainCanonical(nested, seen) : possiblyCanonical(value.expression, seen);
                        });
                        return key === null ? values.some(value => possiblyCanonical(value, seen)) : possiblyCanonical(values[Number(key)], seen);
                    })) return true;
                }
                if (array && key !== null && /^(0|[1-9]\d*)$/.test(key) && !array.elements.some(ts.isSpreadElement)) return possiblyCanonical(array.elements[Number(key)], seen);
                if (array && (key === null || /^(0|[1-9]\d*)$/.test(key))) return arrayMayContainCanonical(array, seen);
                if (property?.declarations?.some(declaration => ts.isPropertyAssignment(declaration) && possiblyCanonical(declaration.initializer, seen) || ts.isShorthandPropertyAssignment(declaration) && possiblyCanonical(declaration.name, seen))) return true;
                return possiblyCanonical(node.expression, seen);
            }
            if (ts.isConditionalExpression(node)) return possiblyCanonical(node.whenTrue, seen) || possiblyCanonical(node.whenFalse, seen);
            if (ts.isCallExpression(node)) {
                const body = bindings.checker.getResolvedSignature(node)?.declaration?.body;
                if (!body) return false;
                if (!ts.isBlock(body)) return possiblyCanonical(body, seen);
                let possible = false;
                const inspectReturns = child => {
                    if (possible || ts.isFunctionLike(child)) return;
                    if (ts.isReturnStatement(child) && child.expression && possiblyCanonical(child.expression, seen)) possible = true;
                    else ts.forEachChild(child, inspectReturns);
                };
                inspectReturns(body);
                return possible;
            }
            if (!ts.isIdentifier(node)) return false;
            let symbol = bindings.checker.getSymbolAtLocation(node);
            if (symbol?.flags & ts.SymbolFlags.Alias) symbol = bindings.checker.getAliasedSymbol(symbol);
            if (opaqueParameterInputs.has(symbol)) return true;
            for (const input of destructuredParameterInputs.get(symbol) ?? []) {
                if (canonicalTarget(input.argument)) return true;
                let selected = input.argument;
                for (const key of input.path) {
                    if (!selected) break;
                    const elements = /^(0|[1-9]\d*)$/.test(key) ? expandArrayArguments(selected) : null;
                    if (elements) selected = elements[Number(key)];
                    else {
                        const member = bindings.checker.getTypeAtLocation(selected).getProperty(key)?.declarations?.find(declaration => ts.isPropertyAssignment(declaration) || ts.isShorthandPropertyAssignment(declaration));
                        selected = member && (ts.isPropertyAssignment(member) ? member.initializer : member.name);
                    }
                }
                if (selected && possiblyCanonical(selected, seen)) return true;
                let type = bindings.checker.getTypeAtLocation(input.argument);
                let property;
                for (const key of input.path) {
                    property = type.getProperty(key);
                    if (!property) break;
                    type = bindings.checker.getTypeOfSymbolAtLocation(property, input.argument);
                }
                if (property?.declarations?.some(member => ts.isPropertyAssignment(member) && possiblyCanonical(member.initializer, seen) || ts.isShorthandPropertyAssignment(member) && possiblyCanonical(member.name, seen))) return true;
            }
            for (const declaration of symbol?.declarations ?? []) {
                if (ts.isBindingElement(declaration) && ts.isArrayBindingPattern(declaration.parent)) {
                    const variable = declaration.parent.parent;
                    const array = ts.isVariableDeclaration(variable) && variable.initializer ? literalArray(variable.initializer) : null;
                    if (array) {
                        const index = declaration.parent.elements.indexOf(declaration);
                        if (array.elements.some(ts.isSpreadElement) || declaration.dotDotDotToken) {
                            if (arrayMayContainCanonical(array, seen)) return true;
                        } else if (possiblyCanonical(array.elements[index], seen)) return true;
                    }
                }
                if (!ts.isBindingElement(declaration) || declaration.dotDotDotToken || !ts.isObjectBindingPattern(declaration.parent)) continue;
                const key = bindingKey(declaration.propertyName ?? declaration.name);
                if (key === null) continue;
                const property = bindings.checker.getTypeAtLocation(declaration.parent).getProperty(key);
                if (property?.declarations?.some(member => ts.isPropertyAssignment(member) && possiblyCanonical(member.initializer, seen) || ts.isShorthandPropertyAssignment(member) && possiblyCanonical(member.name, seen))) return true;
            }
            const initializers = symbol?.declarations?.filter(declaration => ts.isVariableDeclaration(declaration) || ts.isParameter(declaration) || ts.isBindingElement(declaration)).map(declaration => declaration.initializer).filter(Boolean) ?? [];
            return [...initializers, ...(assignedValues.get(symbol) ?? []), ...(parameterInputs.get(symbol) ?? [])].some(value => possiblyCanonical(value, seen));
        };
        const arrayMayContainCanonical = (array, seen) => array.elements.some(element => {
            if (!ts.isSpreadElement(element)) return possiblyCanonical(element, seen);
            const nested = literalArray(element.expression);
            if (nested && !seen.has(nested)) {
                seen.add(nested);
                return arrayMayContainCanonical(nested, seen);
            }
            return possiblyCanonical(element.expression, seen);
        });
        const assignmentLeaves = expression => {
            const node = unwrapExpression(expression);
            if (!node) return [];
            if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(assignmentLeaves);
            if (ts.isObjectLiteralExpression(node)) return node.properties.flatMap(property => {
                if (ts.isPropertyAssignment(property)) return assignmentLeaves(property.initializer);
                if (ts.isShorthandPropertyAssignment(property)) return [property.name];
                if (ts.isSpreadAssignment(property)) return assignmentLeaves(property.expression);
                return [];
            });
            if (ts.isSpreadElement(node)) return assignmentLeaves(node.expression);
            if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) return assignmentLeaves(node.left);
            return ts.isOmittedExpression(node) ? [] : [node];
        };
        const visit = node => {
            // Possible mutable references are UNKNOWN, never accepted as canonical style provenance.
            let opaqueMutation = false;
            let writeTarget;
            if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) writeTarget = node.left;
            if (ts.isDeleteExpression(node)) writeTarget = node.expression;
            if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) writeTarget = node.operand;
            if (ts.isCallExpression(node) && globalMutator(node.expression)) writeTarget = node.arguments[0];
            if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && globalMutator(node.expression.expression)) {
                if (node.expression.name.text === 'call') writeTarget = node.arguments[1];
                if (node.expression.name.text === 'apply') {
                    let argumentsArray = unwrapExpression(node.arguments[1]);
                    const initializer = argumentsArray && bindings.initializer(argumentsArray);
                    if (initializer) argumentsArray = unwrapExpression(initializer);
                    if (argumentsArray && ts.isArrayLiteralExpression(argumentsArray)) writeTarget = argumentsArray.elements[0];
                    else opaqueMutation = true;
                }
            }
            const writeTargets = writeTarget && ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken ? assignmentLeaves(writeTarget) : [writeTarget];
            for (const destination of writeTargets) {
                const target = unwrapExpression(destination);
                const mutatedObject = target && (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) && !ts.isCallExpression(node) ? target.expression : destination;
                if (destination && canonicalTarget(destination)) {
                    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                    addFinding(file, { line: position.line + 1, column: position.character + 1 }, 'canonical-write', node.getText(sourceFile), 'CANONICAL_UI_MUTATION', 'Consumers must not mutate canonical UI objects, including through casts or aliases');
                } else if (opaqueMutation || destination && (ts.isCallExpression(node) || !ts.isIdentifier(target)) && possiblyCanonical(mutatedObject)) {
                    addFinding(file, locationOf(sourceFile, node), 'canonical-write', node.getText(sourceFile), 'UNKNOWN_CANONICAL_UI_MUTATION', 'Mutation destination may refer to canonical data or cannot be resolved; use an explicit fresh destination');
                }
            }
            if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
                const left = unwrapExpression(node.left);
                const assignedProperty = ts.isPropertyAccessExpression(left) ? left.name.text : ts.isElementAccessExpression(left) ? propertyName(left.argumentExpression) : null;
                if ((ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) && ['innerHTML', 'outerHTML'].includes(assignedProperty || '') && hasTypeMember(left.expression, 'insertAdjacentHTML')) {
                    addFinding(file, locationOf(sourceFile, node), 'html', exprLabel(node), 'DYNAMIC_HTML_STYLE_SOURCE', 'HTML parser assignment can introduce unchecked inline styles or style elements');
                } else if ((ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) && isCssStyleDeclaration(left.expression)) {
                    const property = cssPropertyName(left);
                    if (property && CSS_SPACING_KEYS.has(property)) checkValue(node.right, property, 'style', false);
                    else if (!property) addFinding(file, locationOf(sourceFile, left), 'style', exprLabel(left), 'UNKNOWN_STYLE_KEY', 'Dynamic CSSStyleDeclaration properties cannot be verified');
                    else if (property === 'css-text') addFinding(file, locationOf(sourceFile, node), property, exprLabel(node.right), 'INLINE_STYLE_TEXT_MUTATION', 'Set individual values through a shared styling owner instead of replacing cssText');
                    else if (property.startsWith('--space-')) addFinding(file, locationOf(sourceFile, node), property, exprLabel(node.right), 'SPACING_TOKEN_OVERRIDE', 'Consumers cannot redefine canonical spacing variables inline');
                } else if ((ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) && ['innerHTML', 'outerHTML', 'textContent'].includes(propertyName(ts.isPropertyAccessExpression(left) ? left.name : left.argumentExpression) || '') && typeName(left.expression) === 'HTMLStyleElement') {
                    addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'INLINE_STYLE_TEXT_MUTATION', 'Dynamic CSS text on an HTMLStyleElement bypasses source ownership');
                }
            }
            if (ts.isPropertyAccessExpression(node) && node.name.text === 'adoptedStyleSheets' && ['Document', 'ShadowRoot'].includes(typeName(node.expression))) {
                addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'DYNAMIC_STYLE_SOURCE', 'Adopted stylesheets must be imported and checked through the shared style source');
            }
            if (ts.isPropertyAccessExpression(node) && typeName(node.expression) === 'CSSStyleSheet' && ['addRule', 'deleteRule', 'insertRule', 'removeRule', 'replace', 'replaceSync'].includes(node.name.text)) {
                addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'DYNAMIC_STYLE_SOURCE', 'Runtime stylesheet mutation bypasses imported CSS ownership');
            }
            if (ts.isPropertyAccessExpression(node) && typeName(node.expression) === 'HTMLStyleElement' && ['append', 'appendChild', 'after', 'before', 'insertAdjacentElement', 'insertAdjacentHTML', 'insertAdjacentText', 'prepend', 'replaceChildren', 'replaceWith'].includes(node.name.text)) {
                addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'DYNAMIC_STYLE_SOURCE', 'Runtime style element mutation bypasses imported CSS ownership');
            }
            if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
                const tag = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
                if (ts.isIdentifier(tag) && tag.text === 'style') addFinding(file, locationOf(sourceFile, node), 'style', '', 'INLINE_STYLE_TAG_SOURCE', 'Use an imported stylesheet or shared style owner instead of a JSX style tag');
            }
            if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'layoutSx' && ownerMode && node.initializer) scanStyleObject(node.initializer, 'bridge', true);
            if (ts.isJsxAttribute(node) && node.initializer) {
                const attrName = node.name.getText(sourceFile);
                const opening = node.parent?.parent;
                const tag = opening && (ts.isJsxOpeningElement(opening) || ts.isJsxSelfClosingElement(opening)) ? bindings.reference(opening.tagName) : null;
                if (attrName === 'dangerouslySetInnerHTML') addFinding(file, locationOf(sourceFile, node), 'html', attrName, 'DYNAMIC_HTML_STYLE_SOURCE', 'Do not inject parsed HTML; keep styles in imported, statically checked stylesheets');
                const globalCss = attrName === 'styles' && (tag?.owner === 'mui' && tag.exportName === 'GlobalStyles' || tag?.owner === 'emotion' && tag.exportName === 'Global');
                if (STYLE_ATTRIBUTES.has(attrName)) scanStyleObject(ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer, ['style', 'css'].includes(attrName) || globalCss ? 'style' : attrName, false);
            }
            if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
                const tagBinding = bindings.reference(node.tagName);
                if (!tagBinding && bindings.origin(node.tagName)) addFinding(file, locationOf(sourceFile, node), 'component', node.tagName.getText(sourceFile), 'UNKNOWN_UI_BINDING', 'Component access to a known owner cannot be resolved; an opaque alias is not exempt from source checks');
                const muiTag = tagBinding?.owner === 'mui';
                for (const attribute of node.attributes.properties) {
                    if (tagBinding?.owner === 'components' && tagBinding.exportName === 'Panel' && ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'geometry' && attribute.initializer) {
                        scanPanelGeometry(ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : attribute.initializer);
                    }
                    if (ts.isJsxSpreadAttribute(attribute)) {
                        if (muiTag) {
                            const registerSpread = bindings.isFormRegistration(attribute.expression);
                            if (!registerSpread && !isControllerFieldSpread(attribute)) scanStyleObject(attribute.expression, 'mui-props', false);
                        }
                        continue;
                    }
                    if (!ts.isJsxAttribute(attribute) || !attribute.initializer) continue;
                    const key = attribute.name.getText(sourceFile);
                    if (!SPACING_KEYS.has(key) || !muiTag) continue;
                    const expression = ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : attribute.initializer;
                    if (expression && !(ts.isStringLiteralLike(expression) && !/^-?\d/.test(expression.text.trim()))) checkValue(expression, key, 'mui-prop', false);
                }
            }
            const templateFactory = ts.isTaggedTemplateExpression(node) ? ts.isCallExpression(node.tag) ? node.tag.expression : node.tag : null;
            const templateBinding = templateFactory && bindings.reference(templateFactory);
            if (ts.isTaggedTemplateExpression(node) && templateBinding && ['mui', 'emotion'].includes(templateBinding.owner) && ['styled', 'css'].includes(templateBinding.exportName)) {
                const template = node.template;
                const dynamicMarker = 'var(--codex-unknown-spacing-expression)';
                let cssText = '';
                if (ts.isNoSubstitutionTemplateLiteral(template)) cssText = template.text;
                else {
                    cssText = template.head.text;
                    for (const span of template.templateSpans) cssText += `${dynamicMarker}${span.literal.text}`;
                }
                try {
                    const parsed = postcss.parse(`.codex-layout-template { ${cssText} }`, { from: file });
                    parsed.walkDecls(declaration => {
                        const property = declaration.prop.toLowerCase();
                        if (!CSS_SPACING_KEYS.has(property)) return;
                        const value = declaration.value.trim();
                        if (isCanonicalCssSpacingValue(value, property, canonicalSpacingVariables)) return;
                        const code = value.includes('codex-unknown-spacing-expression') ? 'UNKNOWN_SPACING_VALUE' : 'STYLED_CSS_SPACING_LITERAL';
                        addFinding(file, locationOf(sourceFile, node), property, value, code, 'Tagged CSS layout styles must use canonical spacing variables; dynamic spacing remains UNKNOWN');
                    });
                } catch (error) {
                    addFinding(file, locationOf(sourceFile, node), 'styled-template', '', 'PARSE_ERROR', error.reason || error.message);
                }
            }
            if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'dangerouslySetInnerHTML') addFinding(file, locationOf(sourceFile, node), 'html', 'dangerouslySetInnerHTML', 'DYNAMIC_HTML_STYLE_SOURCE', 'Do not inject parsed HTML; keep styles in imported, statically checked stylesheets');
            if (ts.isPropertyAssignment(node) && node.name && ['sx', 'style', 'styleOverrides'].includes(propertyName(node.name))) scanStyleObject(node.initializer, propertyName(node.name), ownerMode && relative === OWNER_PATH);
            if (ts.isCallExpression(node)) {
                const factory = ts.isCallExpression(node.expression) ? node.expression.expression : node.expression;
                const resolved = bindings.reference(factory);
                const receiverType = ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'createElement' ? bindings.checker.getTypeAtLocation(node.expression.expression) : null;
                const isDocumentFactory = receiverType?.getSymbol()?.name === 'Document';
                const createdType = bindings.checker.getTypeAtLocation(node);
                const createdTypeName = createdType.aliasSymbol?.name || createdType.getSymbol()?.name;
                const htmlTag = node.arguments[0] && ts.isStringLiteralLike(unwrapExpression(node.arguments[0])) ? unwrapExpression(node.arguments[0]).text.toLowerCase() : null;
                if (isDocumentFactory && (htmlTag === 'style' || createdTypeName === 'HTMLStyleElement')) addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'INLINE_STYLE_TAG_SOURCE', 'Dynamic HTML style elements bypass the shared style owners');
                else if (isDocumentFactory && node.arguments[0] && htmlTag === null && bindings.checker.getTypeAtLocation(node.arguments[0]).flags & ts.TypeFlags.StringLike) addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'UNKNOWN_STYLE_TAG_SOURCE', 'Dynamic HTML element names must be statically resolved before style ownership can be verified');
                if (ts.isPropertyAccessExpression(node.expression)) {
                    const method = node.expression.name.text;
                    const receiver = node.expression.expression;
                    if (method === 'insertAdjacentHTML' && hasTypeMember(receiver, 'insertAdjacentHTML')) addFinding(file, locationOf(sourceFile, node), 'html', exprLabel(node), 'DYNAMIC_HTML_STYLE_SOURCE', 'HTML parser insertion can introduce unchecked inline styles or style elements');
                    if (['write', 'writeln'].includes(method) && typeName(receiver) === 'Document') addFinding(file, locationOf(sourceFile, node), 'html', exprLabel(node), 'DYNAMIC_HTML_STYLE_SOURCE', 'Document HTML writes can introduce unchecked inline styles or style elements');
                    if (isCssStyleDeclaration(receiver) && method === 'setProperty') {
                        const rawProperty = node.arguments[0] && ts.isStringLiteralLike(unwrapExpression(node.arguments[0])) ? unwrapExpression(node.arguments[0]).text.toLowerCase() : null;
                        const property = rawProperty ? rawProperty.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()) : null;
                        if (property && CSS_SPACING_KEYS.has(property) && node.arguments[1]) checkValue(node.arguments[1], property, 'style', false);
                        else if (property && CSS_SPACING_KEYS.has(property)) addFinding(file, locationOf(sourceFile, node), property, '', 'UNKNOWN_SPACING_VALUE', 'CSSStyleDeclaration.setProperty requires a statically verifiable spacing value');
                        else if (property?.startsWith('--space-')) addFinding(file, locationOf(sourceFile, node), property, exprLabel(node.arguments[1]), 'SPACING_TOKEN_OVERRIDE', 'Consumers cannot redefine canonical spacing variables inline');
                        else if (!property) addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'UNKNOWN_STYLE_KEY', 'Dynamic CSSStyleDeclaration.setProperty names cannot be verified');
                    }
                    if (method === 'setAttribute' && hasCssStyleAttribute(receiver)) {
                        const name = node.arguments[0] && ts.isStringLiteralLike(unwrapExpression(node.arguments[0])) ? unwrapExpression(node.arguments[0]).text.toLowerCase() : null;
                        if (name === 'style') addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'INLINE_STYLE_TEXT_MUTATION', 'Set individual values through shared style owners instead of creating a raw style attribute');
                        else if (!name) addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'UNKNOWN_STYLE_KEY', 'Dynamic DOM attribute names cannot be verified as style-free');
                    }
                }
                if (!resolved && bindings.origin(factory)) addFinding(file, locationOf(sourceFile, node), 'factory', factory.getText(sourceFile), 'UNKNOWN_UI_BINDING', 'Call to a known UI owner is unresolved; an opaque factory cannot bypass style checks');
                if (resolved?.owner === 'react' && ['createElement', 'jsx', 'jsxs', 'jsxDEV'].includes(resolved.exportName)) {
                    const tag = node.arguments[0];
                    const elementTarget = tag ? reactElementTarget(tag) : null;
                    const tagBinding = tag ? bindings.reference(tag) : null;
                    if (elementTarget?.owner === 'native' && elementTarget.exportName === 'style') addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'INLINE_STYLE_TAG_SOURCE', 'Use an imported stylesheet or shared style owner instead of a React style element');
                    if (tagBinding?.owner === 'mui' && node.arguments[1]) scanStyleObject(node.arguments[1], 'mui-props', false);
                    else if (tag && ts.isStringLiteralLike(tag) && tag.text && node.arguments[1]) scanStyleObject(node.arguments[1], 'native-props', false);
                    else if (tag && !tagBinding && bindings.origin(tag)) addFinding(file, locationOf(sourceFile, node), 'factory', tag.getText(sourceFile), 'UNKNOWN_UI_BINDING', 'React element type from a known UI owner cannot be resolved');
                }
                if (resolved?.owner === 'react' && resolved.exportName === 'cloneElement' && node.arguments[1]) {
                    const target = reactElementTarget(node.arguments[0]);
                    if (target?.owner === 'native' && target.exportName === 'style') addFinding(file, locationOf(sourceFile, node), 'style', exprLabel(node), 'INLINE_STYLE_TAG_SOURCE', 'Do not clone or mutate an inline React style element');
                    else if (target?.owner === 'mui') scanStyleObject(node.arguments[1], 'mui-props', false);
                    else {
                        scanStyleObject(node.arguments[1], 'react-props', false);
                        if (!target && hasPossibleMuiSpacingProps(node.arguments[1])) addFinding(file, locationOf(sourceFile, node), 'cloneElement', exprLabel(node.arguments[0]), 'UNKNOWN_UI_BINDING', 'Cloned element type cannot be resolved while style-like props are supplied');
                    }
                }
                if (['mui', 'emotion'].includes(resolved?.owner) && resolved.exportName === 'styled' && ts.isCallExpression(node.expression)) {
                    for (const argument of node.arguments) scanStyleObject(argument, resolved.owner === 'emotion' ? 'style' : 'styled', false);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }

    for (const exception of exceptions) {
        if (!usedExceptionIds.has(exception.id)) {
            report.exceptionsUnused.push(exception.id);
            addFinding(path.join(root, exception.path || 'scripts/layout-exceptions.json'), { line: 1, column: 1 }, exception.property || 'exception', exception.value || '', 'EXCEPTION_UNUSED', `Exception ${exception.id || '(missing id)'} did not match a current finding`);
        }
    }
    report.findings.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line || left.column - right.column || left.code.localeCompare(right.code));
    report.counts = Object.fromEntries([...new Set(report.findings.map(finding => finding.code))].sort().map(code => [code, report.findings.filter(finding => finding.code === code).length]));
    report.migrationDebt = {
        byComponent: summarizeFindings(report.findings, finding => componentForFile(finding.file)),
        byFile: summarizeFindings(report.findings, finding => finding.file),
    };
    report.status = report.findings.length ? 'FAIL' : 'PASS';
    return report;
}

function printHelp() {
    process.stdout.write('Usage: node scripts/check-layout.mjs [--root <directory>] [--exceptions <file>] [--report] [--json]\n');
    process.stdout.write('Default mode is strict: any violation, UNKNOWN value, parse error, or exception mismatch exits 1. --report prints migration debt without failing.\n');
}

try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        process.exit(0);
    }
    const report = scan(options.root, options.exceptions);
    if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else {
        process.stdout.write(`layout-check ${report.status}: ${report.files} source files, ${report.findings.length} finding(s), ${report.exceptionsUsed.length} exception(s) used\n`);
        for (const [code, count] of Object.entries(report.counts)) process.stdout.write(`  ${code}: ${count}\n`);
        if (report.findings.length) {
            process.stdout.write('Migration debt by component:\n');
            for (const component of report.migrationDebt.byComponent) process.stdout.write(`  ${component.key}: ${component.findings} finding(s)\n`);
            process.stdout.write('Most affected files:\n');
            for (const file of report.migrationDebt.byFile.slice(0, 15)) process.stdout.write(`  ${file.key}: ${file.findings} finding(s)\n`);
        }
        for (const finding of report.findings.slice(0, 40)) process.stdout.write(`  ${finding.file}:${finding.line}:${finding.column} ${finding.code} ${finding.property}=${finding.value}\n`);
        if (report.findings.length > 40) process.stdout.write(`  ... ${report.findings.length - 40} additional finding(s); use --json for the complete inventory\n`);
    }
    process.exit(report.findings.length && options.strict ? 1 : 0);
} catch (error) {
    process.stderr.write(`check-layout failed: ${error.stack || error.message}\n`);
    process.exit(2);
}
