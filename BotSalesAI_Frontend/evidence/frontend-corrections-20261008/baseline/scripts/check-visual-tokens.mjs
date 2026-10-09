#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import postcss from 'postcss';
import { uiSourceFiles } from './ui-source-files.mjs';
import { auditUiImportScope } from './ui-import-scope.mjs';
import { createUiBindings } from './ui-bindings.mjs';

const STYLE_CONTAINERS = new Set(['sx', 'style', 'styleOverrides']);
const VISUAL_PROPERTIES = new Map([
    ['color', 'palette'], ['bgcolor', 'palette'], ['background', 'palette'], ['backgroundColor', 'palette'],
    ['borderColor', 'palette'], ['outlineColor', 'palette'], ['textDecorationColor', 'palette'], ['caretColor', 'palette'],
    ['fill', 'palette'], ['stroke', 'palette'],
    ['fontFamily', 'typography'], ['fontSize', 'typography'], ['fontWeight', 'typography'], ['lineHeight', 'typography'],
    ['letterSpacing', 'typography'], ['textShadow', 'elevation'],
    ['borderRadius', 'radius'], ['borderTopLeftRadius', 'radius'], ['borderTopRightRadius', 'radius'],
    ['borderBottomLeftRadius', 'radius'], ['borderBottomRightRadius', 'radius'],
    ['boxShadow', 'elevation'], ['shadow', 'elevation'], ['elevation', 'elevation'],
    ['outline', 'focus'], ['outlineWidth', 'focus'], ['outlineOffset', 'focus'],
    ['outlineStyle', 'focus'], ['focusRing', 'focus'],
]);
const CSS_PROPERTIES = new Map([
    ['color', 'palette'], ['background', 'palette'], ['background-color', 'palette'], ['border-color', 'palette'],
    ['outline-color', 'palette'], ['text-decoration-color', 'palette'], ['caret-color', 'palette'], ['fill', 'palette'], ['stroke', 'palette'],
    ['font-family', 'typography'], ['font-size', 'typography'], ['font-weight', 'typography'], ['line-height', 'typography'], ['letter-spacing', 'typography'],
    ['border-radius', 'radius'], ['border-top-left-radius', 'radius'], ['border-top-right-radius', 'radius'],
    ['border-bottom-left-radius', 'radius'], ['border-bottom-right-radius', 'radius'],
    ['box-shadow', 'elevation'], ['text-shadow', 'elevation'],
    ['outline', 'focus'], ['outline-width', 'focus'], ['outline-offset', 'focus'], ['outline-style', 'focus'],
]);
const CANONICAL_NAMES = new Set(['tokens', 'colors', 'theme', 'layoutSx', 'layoutCss', 'visualSx', 'visualCss']);
const CSS_SYSTEM_COLORS = new Set(['canvas', 'canvastext', 'linktext', 'visitedtext', 'activetext', 'buttonface', 'buttontext', 'field', 'fieldtext', 'highlight', 'highlighttext', 'mark', 'marktext', 'graytext', 'selecteditem', 'selecteditemtext', 'accentcolor', 'accentcolortext']);
const SEMANTIC_VALUES = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'currentcolor', 'transparent', 'none', 'normal', 'auto', 'small', 'medium', 'large', 'default', 'primary', 'secondary', 'error', 'warning', 'success', 'info', 'text.primary', 'text.secondary', 'background.default', 'background.paper', 'divider', 'action.hover', 'action.selected', 'action.disabled', 'primary.main', 'primary.light', 'primary.dark', 'secondary.main', 'error.main', 'warning.main', 'success.main', 'info.main']);
const COLOR_PATTERN = /#[\da-f]{3,4}(?:[\da-f]{2}){0,2}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/i;
const DIMENSION_PATTERN = /(?:^|[\s(,:])(?:-?\d*\.)?\d+(?:px|em|rem|ch|ex|vw|vh|vmin|vmax|%)\b/i;
const WIDTH_QUERY_PATTERN = /(?:min|max)-width\s*:\s*\d+(?:\.\d+)?(?:px|em|rem)/i;
const COLOR_KEYWORDS = new Set(['currentcolor', 'transparent', 'inherit', 'initial', 'unset', ...CSS_SYSTEM_COLORS]);
const ZERO = /^(?:0(?:\.0+)?|0(?:px|em|rem|%)|none|normal|inherit|initial|unset)$/i;

function posix(value) { return value.split(path.sep).join('/'); }
function keyName(node) {
    if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
    if (ts.isComputedPropertyName(node) && ts.isStringLiteralLike(node.expression)) return node.expression.text;
    return null;
}
function unwrap(node) {
    while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node))) node = node.expression;
    return node;
}
function rootIdentifier(node) {
    node = unwrap(node);
    while (node && (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))) node = node.expression;
    return node && ts.isIdentifier(node) ? node.text : null;
}
function lineColumn(sourceFile, nodeOrPosition) {
    const offset = typeof nodeOrPosition === 'number' ? nodeOrPosition : typeof nodeOrPosition?.getStart === 'function' ? nodeOrPosition.getStart(sourceFile) : 0;
    const location = sourceFile.getLineAndCharacterOfPosition(offset);
    return { line: location.line + 1, column: location.character + 1 };
}
function normalizeProp(value) { return value.replaceAll('-', '').toLowerCase(); }
function semanticValue(category, value) {
    const v = value.trim().replace(/\s*!important\s*$/i, '').toLowerCase();
    if (category === 'palette') return COLOR_KEYWORDS.has(v) || SEMANTIC_VALUES.has(v) || /^var\(--(?:color|palette)-[\w-]+\)$/.test(v);
    if (category === 'typography') return ['inherit', 'initial', 'unset', 'revert', 'normal', 'small', 'medium', 'large', 'default'].includes(v) || /^var\(--(?:font|type)-[\w-]+\)$/.test(v);
    if (category === 'radius') return ZERO.test(v) || /^var\(--(?:radius|shape)-[\w-]+\)$/.test(v);
    if (category === 'elevation') return ['none', 'inherit', 'initial', 'unset'].includes(v) || /^var\(--(?:shadow|elevation)-[\w-]+\)$/.test(v);
    if (category === 'focus') return ZERO.test(v) || /^var\(--(?:focus|color|palette)-[\w-]+\)$/.test(v) || COLOR_KEYWORDS.has(v);
    return false;
}
function cssValueIsCanonical(category, value) {
    const v = value.trim();
    if (semanticValue(category, v)) return true;
    if (category === 'palette') return /var\(--(?:color|palette)-[\w-]+\)/i.test(v) && !COLOR_PATTERN.test(v);
    if (category === 'focus') return /var\(--focus-ring-[\w-]+\)/i.test(v) && /var\(--(?:color|palette)-[\w-]+\)/i.test(v);
    return false;
}

function inspectTypeScript(source, file, root, findings, bindings) {
    const extension = path.extname(file).toLowerCase();
    const kind = extension === '.tsx' || extension === '.jsx' ? ts.ScriptKind.TSX : extension === '.js' ? ts.ScriptKind.JS : ts.ScriptKind.TS;
    const sourceFile = bindings ? bindings.source(file) : ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
    if (!sourceFile) throw new Error(`Missing TypeScript Program source: ${file}`);
    const rel = posix(path.relative(root, file));
    for (const diagnostic of sourceFile.parseDiagnostics || []) findings.push({ code: 'PARSE_ERROR', category: 'parse', file: rel, ...lineColumn(sourceFile, diagnostic.start ?? 0), message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n') });
    if (sourceFile.parseDiagnostics?.length) return;
    if (bindings === null) return; // Resolver failure is reported by audit; no lexical fallback acceptance.

    const declarations = new Map();
    const importedCanonical = new Set(bindings ? [] : CANONICAL_NAMES);
    const callbackThemes = new Set();
    const semanticPropRefs = new Set();
    const semanticParameterProps = new Map();
    const visitImports = node => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const specifier = node.moduleSpecifier.text;
            const canonicalModule = specifier === '@botsales/tokens' || specifier.includes('design-tokens') || specifier.includes('/shared/ui/theme') || specifier.includes('/shared/ui/layout') || specifier.endsWith('/visual') || specifier.endsWith('/layout') || specifier === './layout' || specifier === './theme';
            const namedBindings = node.importClause?.namedBindings;
            if (!bindings && canonicalModule && namedBindings && ts.isNamedImports(namedBindings)) for (const item of namedBindings.elements) importedCanonical.add(item.name.text);
            if (!bindings && namedBindings && ts.isNamespaceImport(namedBindings) && canonicalModule) importedCanonical.add(namedBindings.name.text);
        }
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) declarations.set(node.name.text, node.initializer);
        if (ts.isParameter(node) && node.type && ts.isTypeLiteralNode(node.type)) {
            const parameterNames = ts.isIdentifier(node.name)
                ? [node.name.text]
                : ts.isObjectBindingPattern(node.name)
                    ? node.name.elements.filter(item => item.dotDotDotToken && ts.isIdentifier(item.name)).map(item => item.name.text)
                    : [];
            for (const member of node.type.members) {
                if (!ts.isPropertySignature(member) || !member.type) continue;
                const name = keyName(member.name);
                const category = VISUAL_PROPERTIES.get(name);
                if (!category || !ts.isUnionTypeNode(member.type)) continue;
                const values = member.type.types;
                const resolved = values.length && values.every(item => ts.isLiteralTypeNode(item) && ts.isStringLiteralLike(item.literal) && semanticValue(category, item.literal.text));
                if (resolved) {
                    if (bindings) {
                        const names = ts.isIdentifier(node.name) ? [node.name] : ts.isObjectBindingPattern(node.name) ? node.name.elements.filter(item => item.dotDotDotToken && ts.isIdentifier(item.name)).map(item => item.name) : [];
                        for (const identifier of names) {
                            const symbol = bindings.checker.getSymbolAtLocation(identifier);
                            if (!symbol) continue;
                            if (!semanticParameterProps.has(symbol)) semanticParameterProps.set(symbol, new Set());
                            semanticParameterProps.get(symbol).add(name);
                        }
                    } else for (const parameterName of parameterNames) semanticPropRefs.add(`${parameterName}.${name}`);
                }
            }
        }
        ts.forEachChild(node, visitImports);
    };
    visitImports(sourceFile);
    const add = (code, category, node, value, message) => findings.push({ code, category, file: rel, ...lineColumn(sourceFile, node), property: category, value: String(value).slice(0, 180), message });
    const isCanonicalExpression = (node, seen = new Set()) => {
        node = unwrap(node);
        if (!node) return false;
        const rootName = rootIdentifier(node);
        if (bindings) {
            const resolved = bindings.reference(node);
            if (resolved && ['tokens', 'layout', 'visual', 'theme'].includes(resolved.owner)) return true;
            let base = node;
            while (ts.isPropertyAccessExpression(base) || ts.isElementAccessExpression(base)) base = unwrap(base.expression);
            if (ts.isIdentifier(base) && callbackThemes.has(bindings.checker.getSymbolAtLocation(base))) return true;
            const initializer = bindings.initializer(node);
            if (initializer && !seen.has(initializer)) {
                const next = new Set(seen); next.add(initializer);
                return isCanonicalExpression(initializer, next);
            }
            if (ts.isConditionalExpression(node)) return isCanonicalExpression(node.whenTrue, new Set(seen)) && isCanonicalExpression(node.whenFalse, new Set(seen));
            if (ts.isArrayLiteralExpression(node)) return node.elements.length > 0 && node.elements.every(item => isCanonicalExpression(item, new Set(seen)));
            if (ts.isElementAccessExpression(node)) {
                const base = unwrap(node.expression);
                const initializer = ts.isArrayLiteralExpression(base) || ts.isConditionalExpression(base) ? base : bindings.initializer(base);
                if (initializer && !seen.has(initializer)) {
                    const next = new Set(seen); next.add(initializer);
                    return isCanonicalExpression(initializer, next);
                }
            }
            return false;
        }
        if (rootName && importedCanonical.has(rootName)) return true;
        if (rootName && declarations.has(rootName) && !seen.has(rootName)) {
            seen.add(rootName);
            return isCanonicalExpression(declarations.get(rootName), seen);
        }
        if (ts.isConditionalExpression(node)) return isCanonicalExpression(node.whenTrue, new Set(seen)) && isCanonicalExpression(node.whenFalse, new Set(seen));
        if (ts.isArrayLiteralExpression(node)) return node.elements.length > 0 && node.elements.every(item => isCanonicalExpression(item, new Set(seen)));
        if (ts.isBinaryExpression(node)) return isCanonicalExpression(node.left, new Set(seen)) && isCanonicalExpression(node.right, new Set(seen));
        if (ts.isElementAccessExpression(node)) {
            const base = unwrap(node.expression);
            if (isCanonicalExpression(base, new Set(seen))) return true;
            if (ts.isIdentifier(base) && declarations.has(base.text)) {
                const initializer = unwrap(declarations.get(base.text));
                if (ts.isArrayLiteralExpression(initializer)) return initializer.elements.length > 0 && initializer.elements.every(item => isCanonicalExpression(item, new Set(seen)));
                if (ts.isConditionalExpression(initializer)) return isCanonicalExpression(initializer, new Set(seen));
            }
        }
        if (rootName && callbackThemes.has(rootName)) return true;
        return false;
    };
    const inspectValue = (node, category, property, depth = 0) => {
        node = unwrap(node);
        if (!node || depth > 12) { add('UNKNOWN_VISUAL_SOURCE', category, node || sourceFile, '(depth)', 'Visual value cannot be resolved to a canonical theme/token source'); return; }
        if (isCanonicalExpression(node)) return;
        if (ts.isConditionalExpression(node)) { inspectValue(node.whenTrue, category, property, depth + 1); inspectValue(node.whenFalse, category, property, depth + 1); return; }
        if (ts.isBinaryExpression(node)) {
            const leftCanonical = isCanonicalExpression(node.left) || ts.isNumericLiteral(unwrap(node.left));
            const rightCanonical = isCanonicalExpression(node.right) || ts.isNumericLiteral(unwrap(node.right));
            if (leftCanonical && rightCanonical) return;
            inspectValue(node.left, category, property, depth + 1);
            inspectValue(node.right, category, property, depth + 1);
            return;
        }
        if (ts.isObjectLiteralExpression(node)) {
            for (const item of node.properties) {
                if (ts.isPropertyAssignment(item)) inspectValue(item.initializer, category, property, depth + 1);
                else if (ts.isSpreadAssignment(item)) scanStyle(item.expression, depth + 1);
                else add('UNKNOWN_VISUAL_SOURCE', category, item, 'object-method', 'Dynamic method in responsive visual value cannot be resolved');
            }
            return;
        }
        if (ts.isArrayLiteralExpression(node)) { for (const item of node.elements) inspectValue(item, category, property, depth + 1); return; }
        if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) { scanStyle(node, depth + 1); return; }
        if (ts.isIdentifier(node) && ['undefined', 'null'].includes(node.text)) return;
        if (ts.isPropertyAccessExpression(node) && (bindings ? ts.isIdentifier(node.expression) && semanticParameterProps.get(bindings.checker.getSymbolAtLocation(node.expression))?.has(node.name.text) : semanticPropRefs.has(`${rootIdentifier(node)}.${node.name.text}`))) return;
        const initializer = bindings ? bindings.initializer(node) : ts.isIdentifier(node) ? declarations.get(node.text) : null;
        if (initializer) { inspectValue(initializer, category, property, depth + 1); return; }
        if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            const value = node.text;
            if (semanticValue(category, value)) return;
            if (category === 'palette' && COLOR_PATTERN.test(value)) { add('RAW_VISUAL_LITERAL', category, node, value, 'Raw color value must reference a canonical palette token or semantic theme role'); return; }
            if (category === 'palette' && SEMANTIC_VALUES.has(value.toLowerCase())) return;
            if (category === 'palette' && /^var\(--(?:color|palette)-[\w-]+\)$/.test(value.trim())) return;
            if (category === 'palette' && /^[a-z][\w.-]*$/i.test(value) && !['red','blue','green','black','white','gray','grey','orange','purple','gold','yellow','pink','brown'].includes(value.toLowerCase())) return;
            add('RAW_VISUAL_LITERAL', category, node, value, `Raw ${category} value must reference a canonical token or semantic theme role`); return;
        }
        if (ts.isNumericLiteral(node) || ts.isPrefixUnaryExpression(node) || ts.isTemplateExpression(node)) {
            const text = node.getText(sourceFile);
            if (ts.isTemplateExpression(node)) {
                const chunks = [node.head.text, ...node.templateSpans.map(span => span.literal.text)].join(' ');
                const hasRaw = category === 'palette' ? COLOR_PATTERN.test(chunks) : category === 'focus' ? DIMENSION_PATTERN.test(chunks) || COLOR_PATTERN.test(chunks) : DIMENSION_PATTERN.test(chunks) || /(?:^|\s)-?\d+(?:\.\d+)?(?:\s|$)/.test(chunks);
                if (!hasRaw && node.templateSpans.every(span => isCanonicalExpression(span.expression))) return;
            }
            add('RAW_VISUAL_LITERAL', category, node, text, `Raw ${category} value must reference a canonical token or semantic theme role`); return;
        }
        add('UNKNOWN_VISUAL_SOURCE', category, node, node.getText(sourceFile), 'Dynamic visual value cannot be resolved to a canonical theme/token source');
    };
    const scanStyle = (node, depth = 0) => {
        node = unwrap(node);
        if (!node || depth > 20) { add('UNKNOWN_VISUAL_SOURCE', 'style', node || sourceFile, '(depth)', 'Style object cannot be statically resolved'); return; }
        if (node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.NullKeyword) return;
        if (ts.isConditionalExpression(node)) { scanStyle(node.whenTrue, depth + 1); scanStyle(node.whenFalse, depth + 1); return; }
        if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind)) { scanStyle(node.right, depth + 1); return; }
        if (ts.isArrayLiteralExpression(node)) { node.elements.forEach(item => scanStyle(item, depth + 1)); return; }
        if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
            node.parameters.forEach(parameter => { if (ts.isIdentifier(parameter.name)) callbackThemes.add(bindings ? bindings.checker.getSymbolAtLocation(parameter.name) : parameter.name.text); });
            if (ts.isBlock(node.body)) {
                let foundReturn = false;
                const search = child => { if (ts.isReturnStatement(child) && child.expression) { foundReturn = true; scanStyle(child.expression, depth + 1); } else ts.forEachChild(child, search); };
                search(node.body);
                if (!foundReturn) add('UNKNOWN_VISUAL_SOURCE', 'style', node, '(function body)', 'Style callback has no statically inspectable return value');
            } else scanStyle(node.body, depth + 1);
            return;
        }
        if (ts.isIdentifier(node)) {
            const initializer = bindings ? bindings.initializer(node) : declarations.get(node.text);
            if (initializer) { scanStyle(initializer, depth + 1); return; }
            if (bindings ? isCanonicalExpression(node) : importedCanonical.has(node.text)) return;
            add('UNKNOWN_VISUAL_SOURCE', 'style', node, node.text, 'Style alias is not a local static object or canonical shared role'); return;
        }
        if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
            if (isCanonicalExpression(node)) return;
            const rootName = rootIdentifier(node);
            if (!bindings && rootName && declarations.has(rootName)) { scanStyle(declarations.get(rootName), depth + 1); return; }
            add('UNKNOWN_VISUAL_SOURCE', 'style', node, node.getText(sourceFile), 'Style reference is not a known theme/token/shared-role source'); return;
        }
        if (!ts.isObjectLiteralExpression(node)) { add('UNKNOWN_VISUAL_SOURCE', 'style', node, node.getText(sourceFile), 'Style source must be a static object, array, callback or shared semantic role'); return; }
        for (const item of node.properties) {
            if (ts.isSpreadAssignment(item)) { scanStyle(item.expression, depth + 1); continue; }
            if (!ts.isPropertyAssignment(item)) { add('UNKNOWN_VISUAL_SOURCE', 'style', item, 'object-method', 'Style object method is unresolved'); continue; }
            const key = keyName(item.name);
            const category = VISUAL_PROPERTIES.get(key);
            if (category) { inspectValue(item.initializer, category, key); continue; }
            if (key && /^@media/i.test(key) && WIDTH_QUERY_PATTERN.test(key)) add('BREAKPOINT_LITERAL', 'breakpoint', item.name, key, 'Media width must use a canonical named breakpoint');
            const initializer = unwrap(item.initializer);
            if (STYLE_CONTAINERS.has(key)) scanStyle(initializer, depth + 1);
            else if (ts.isObjectLiteralExpression(initializer) || ts.isArrayLiteralExpression(initializer) || ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) scanStyle(initializer, depth + 1);
        }
    };
    const scanSlotProps = (node, depth = 0) => {
        node = unwrap(node);
        if (!node || depth > 20) { add('UNKNOWN_VISUAL_SOURCE', 'style', node || sourceFile, '(slotProps depth)', 'slotProps style source cannot be statically resolved'); return; }
        if (ts.isIdentifier(node)) {
            const initializer = bindings ? bindings.initializer(node) : declarations.get(node.text);
            if (initializer) { scanSlotProps(initializer, depth + 1); return; }
            if (importedCanonical.has(node.text)) return;
            add('UNKNOWN_VISUAL_SOURCE', 'style', node, node.text, 'slotProps source is not a local object or known shared role');
            return;
        }
        if (ts.isConditionalExpression(node)) { scanSlotProps(node.whenTrue, depth + 1); scanSlotProps(node.whenFalse, depth + 1); return; }
        if (ts.isArrayLiteralExpression(node)) { node.elements.forEach(item => scanSlotProps(item, depth + 1)); return; }
        if (!ts.isObjectLiteralExpression(node)) { add('UNKNOWN_VISUAL_SOURCE', 'style', node, node.getText(sourceFile), 'slotProps source must be statically inspectable'); return; }
        for (const item of node.properties) {
            if (ts.isSpreadAssignment(item)) { scanSlotProps(item.expression, depth + 1); continue; }
            if (!ts.isPropertyAssignment(item)) { add('UNKNOWN_VISUAL_SOURCE', 'style', item, 'slotProps method', 'slotProps method source is unresolved'); continue; }
            const key = keyName(item.name);
            if (key === 'sx' || key === 'style') scanStyle(item.initializer, depth + 1);
            else {
                const value = unwrap(item.initializer);
                if (ts.isObjectLiteralExpression(value) || ts.isArrayLiteralExpression(value)) scanSlotProps(value, depth + 1);
            }
        }
    };

    const walk = node => {
            if (ts.isJsxAttribute(node) && node.initializer) {
            const name = ts.isIdentifier(node.name) ? node.name.text : null;
            if (STYLE_CONTAINERS.has(name)) scanStyle(ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer);
            else if (name === 'slotProps' || name === 'componentsProps') scanSlotProps(ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer);
            else if (name && VISUAL_PROPERTIES.has(name)) {
                const expression = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
                if (expression) inspectValue(expression, VISUAL_PROPERTIES.get(name), name);
            }
        }
        if (ts.isPropertyAssignment(node)) {
            const name = keyName(node.name);
            if (name === 'sx' || name === 'styleOverrides') scanStyle(node.initializer);
        }
        if (ts.isCallExpression(node)) {
            const callee = node.expression.getText(sourceFile);
            const resolved = bindings?.reference(node.expression);
            const factory = ts.isCallExpression(node.expression) ? node.expression.expression : node.expression;
            if (bindings && !bindings.reference(factory) && bindings.origin(factory)) add('UNKNOWN_VISUAL_SOURCE', 'style', node, factory.getText(sourceFile), 'Call to a known UI owner is unresolved; an opaque factory cannot bypass visual checks');
            if (bindings ? resolved?.owner === 'mui' && ['createTheme', 'createStyledTheme'].includes(resolved.exportName) : /^(?:createTheme|createStyledTheme)$/.test(callee)) node.arguments.forEach(scanStyle);
            if (bindings ? ['mui', 'emotion'].includes(resolved?.owner) && resolved.exportName === 'styled' : /^(?:styled|muiStyled|.*\.styled)$/.test(callee)) {
                const parent = node.parent;
                if (ts.isCallExpression(parent) && parent.expression === node) parent.arguments.forEach(scanStyle);
                else if (callee !== 'styled' && callee !== 'muiStyled') node.arguments.forEach(scanStyle);
            }
            if (/(?:useMediaQuery|matchMedia)$/.test(callee)) {
                for (const argument of node.arguments) {
                    const value = ts.isStringLiteralLike(argument) ? argument.text : ts.isNoSubstitutionTemplateLiteral(argument) ? argument.text : null;
                    if (value && WIDTH_QUERY_PATTERN.test(value)) add('BREAKPOINT_LITERAL', 'breakpoint', argument, value, 'Media width must use a canonical named breakpoint');
                    else if (argument && !value && !isCanonicalExpression(argument)) add('UNKNOWN_VISUAL_SOURCE', 'breakpoint', argument, argument.getText(sourceFile), 'Dynamic media query cannot be resolved to a canonical breakpoint');
                }
            }
        }
        if (ts.isStringLiteralLike(node) && WIDTH_QUERY_PATTERN.test(node.text) && ts.isCallExpression(node.parent) && /(?:useMediaQuery|matchMedia)$/.test(node.parent.expression.getText(sourceFile))) {
            // The call-level branch records the location once.
        }
        ts.forEachChild(node, walk);
    };
    walk(sourceFile);
}

function inspectCss(source, file, root, findings) {
    const rel = posix(path.relative(root, file));
    try {
        const ast = postcss.parse(source, { from: file });
        ast.walkDecls(declaration => {
            const category = CSS_PROPERTIES.get(declaration.prop.toLowerCase());
            if (!category) {
                if (['border', 'outline', 'background-image'].includes(declaration.prop.toLowerCase()) && COLOR_PATTERN.test(declaration.value)) {
                    findings.push({ code: 'RAW_VISUAL_LITERAL', category: 'palette', file: rel, line: declaration.source.start.line, column: declaration.source.start.column, property: declaration.prop, value: declaration.value, message: 'Raw color value must reference a canonical CSS token' });
                }
                return;
            }
            if (cssValueIsCanonical(category, declaration.value)) return;
            findings.push({ code: 'RAW_VISUAL_LITERAL', category, file: rel, line: declaration.source.start.line, column: declaration.source.start.column, property: declaration.prop, value: declaration.value, message: `Raw ${category} value must reference a canonical CSS token or semantic role` });
        });
        ast.walkAtRules('media', atRule => {
            if (WIDTH_QUERY_PATTERN.test(atRule.params)) findings.push({ code: 'BREAKPOINT_LITERAL', category: 'breakpoint', file: rel, line: atRule.source.start.line, column: atRule.source.start.column, property: '@media', value: atRule.params, message: 'Media width must use a canonical named breakpoint token' });
        });
    } catch (error) {
        findings.push({ code: 'PARSE_ERROR', category: 'parse', file: rel, line: error.line || 1, column: error.column || 1, property: 'css', value: '', message: error.reason || error.message });
    }
}

export function auditAppDesignSource({ root = process.cwd(), fixtures = [] } = {}) {
    const sourceRoot = path.join(root, 'apps/web/src');
    const importScope = auditUiImportScope(root, uiSourceFiles(root));
    const allFiles = importScope.files;
    const findings = importScope.issues.map(issue => ({ file: issue.file, line: 1, column: 1, category: 'scope', code: 'UI_IMPORT_SCOPE', message: issue.message, value: '' }));
    let bindings = null;
    try { bindings = createUiBindings(root, allFiles.filter(file => !file.endsWith('.css'))); }
    catch (error) { findings.push({ file: 'apps/web/tsconfig.json', line: 1, column: 1, category: 'scope', code: 'UI_BINDINGS_UNAVAILABLE', message: error.message, value: '' }); }
    const scanned = [];
    for (const file of allFiles) {
        const relative = posix(path.relative(root, file));
        if (relative === 'apps/web/src/app/tokens.css') continue; // generated from canonical design/tokens.json
        scanned.push(relative);
        const source = fs.readFileSync(file, 'utf8');
        if (path.extname(file).toLowerCase() === '.css') inspectCss(source, file, root, findings);
        else inspectTypeScript(source, file, root, findings, bindings);
    }
    for (const fixture of fixtures) {
        const file = path.resolve(root, fixture.path);
        const source = fixture.content;
        if (path.extname(file).toLowerCase() === '.css') inspectCss(source, file, root, findings);
        // Virtual fixtures are legacy syntax diagnostics; production files always use bindings.
        else inspectTypeScript(source, file, root, findings);
    }
    const byCategory = {};
    const byCode = {};
    for (const finding of findings) {
        byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
        byCode[finding.code] = (byCode[finding.code] || 0) + 1;
    }
    const unique = new Map();
    for (const finding of findings) unique.set([finding.code, finding.file, finding.line, finding.column, finding.category, finding.value].join('|'), finding);
    const deduplicated = [...unique.values()];
    const finalByCategory = {};
    const finalByCode = {};
    for (const finding of deduplicated) {
        finalByCategory[finding.category] = (finalByCategory[finding.category] || 0) + 1;
        finalByCode[finding.code] = (finalByCode[finding.code] || 0) + 1;
    }
    return { schemaVersion: 1, status: deduplicated.length ? 'FAIL' : 'PASS', root, sourceRoot: 'apps/web/src plus first-party import closure', files: scanned.length, scannedFiles: scanned.sort(), importScope: { assets: importScope.assets.map(file => posix(path.relative(root, file))), libraries: importScope.libraries }, generatedExcluded: ['apps/web/src/app/tokens.css'], findings: deduplicated, counts: { total: deduplicated.length, byCategory: finalByCategory, byCode: finalByCode } };
}

function parseArgs(argv) {
    const result = { root: process.cwd(), strict: true, json: false };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--root') result.root = path.resolve(argv[++i] || '.');
        else if (argv[i] === '--report') result.strict = false;
        else if (argv[i] === '--json') result.json = true;
        else if (argv[i] === '--help' || argv[i] === '-h') result.help = true;
        else throw new Error(`Unknown argument: ${argv[i]}`);
    }
    return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
    try {
        const options = parseArgs(process.argv.slice(2));
        if (options.help) {
            process.stdout.write('Usage: node scripts/check-visual-tokens.mjs [--root <path>] [--report] [--json]\n');
            process.exit(0);
        }
        const report = auditAppDesignSource({ root: options.root });
        if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        else process.stdout.write(`visual-token-check ${report.status}: ${report.files} source files, ${report.counts.total} finding(s)\n`);
        process.exit(report.findings.length && options.strict ? 1 : 0);
    } catch (error) {
        process.stderr.write(`${error.stack || error.message}\n`);
        process.exit(2);
    }
}
