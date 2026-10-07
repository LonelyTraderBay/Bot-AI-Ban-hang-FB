import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { isScriptSource, uiSourceFiles } from './ui-source-files.mjs';
import { auditUiImportScope } from './ui-import-scope.mjs';
import { createUiBindings } from './ui-bindings.mjs';

export const compositionOwners = {
    'form.fieldGap': 'FormFields',
    'form.inlineGap': 'FieldGroup',
    'surface.contentGap': 'SurfaceContent',
    'actions.inlineGap': 'ActionGroup',
    'actions.relatedLinksGap': 'ActionGroup',
    'page.sectionGap': 'PageSections',
    'grid.gutter': 'SectionGrid',
};
export const bodyModes = {
    Panel: new Set(['flush', 'inset']),
    FormFields: new Set(['flush', 'inset', 'outlined']),
    FieldGroup: new Set(['flush', 'toolbar']),
    SurfaceContent: new Set(['flush', 'inset', 'insetDivider', 'compactOutlined', 'compactControlOutlined']),
    ActionGroup: new Set(['flush', 'header']),
};
export const finiteProps = {
    Panel: { beforeGap: new Set(['section', 'surface']), afterGap: new Set(['section']) },
    FormFields: { beforeGap: new Set(['surface']), afterGap: new Set(['section']) },
    SurfaceContent: { beforeGap: new Set(['surface']), afterGap: new Set(['notice']) },
    ActionGroup: { density: new Set(['compact', 'comfortable']), beforeGap: new Set(['form', 'surface', 'detail']), afterGap: new Set(['section', 'notice']) },
    PageSections: { beforeGap: new Set(['section']) },
    SectionGrid: { rhythm: new Set(['section', 'content']) },
};
export const insetModes = {
    Panel: new Set(['inset']),
    FormFields: new Set(['inset', 'outlined']),
    FieldGroup: new Set(['toolbar']),
    SurfaceContent: new Set(['inset', 'insetDivider', 'compactOutlined', 'compactControlOutlined']),
    ActionGroup: new Set(['header']),
};
export const independentSurfaceModes = {
    FormFields: new Set(['outlined']),
    SurfaceContent: new Set(['compactOutlined', 'compactControlOutlined']),
};
const spacingProps = new Set(['sx', 'style', 'className', 'spacing', 'gap', 'rowGap', 'columnGap', 'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py', 'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']);
export const geometryKeys = new Set(['width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'flex', 'gridColumn']);
export const flowKeys = ['children', 'key', 'direction', 'alignItems', 'justifyContent', 'flexWrap', 'id', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby', 'data-testid', 'data-draft-clean', 'geometry'];
export const publicProps = {
    FormFields: new Set([...flowKeys, 'bodyMode', 'beforeGap', 'afterGap', 'component', 'noValidate', 'onSubmit', 'ref']),
    FieldGroup: new Set([...flowKeys, 'bodyMode']),
    SurfaceContent: new Set([...flowKeys, 'bodyMode', 'beforeGap', 'afterGap']),
    ActionGroup: new Set([...flowKeys, 'bodyMode', 'density', 'beforeGap', 'afterGap']),
    PageSections: new Set([...flowKeys, 'beforeGap', 'shrinkChildren']),
    SectionGrid: new Set(['children', 'key', 'id', 'role', 'aria-label', 'alignItems', 'data-testid', 'data-draft-clean', 'geometry', 'columns', 'shrinkChildren', 'rhythm']),
};
const posix = value => value.split(path.sep).join('/');

// Without bindings this is a syntax-only fixture inspection, not the production audit.
export function inspectComposition(source, file = 'apps/web/src/modules/example/index.tsx', bindings, sourcePath) {
    const sf = bindings ? bindings.source(sourcePath) : ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    if (!sf) throw new Error(`Missing TypeScript Program source: ${file}`);
    const mui = new Map(), layouts = new Set(), namespaces = new Set(), composed = new Map(), compositionNamespaces = new Set(), shared = new Map(), variables = new Map();
    const issues = [], usages = [], tags = [];
    const location = node => ({ file: posix(file), line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 });
    const addIssue = (node, rule, message) => issues.push({ ...location(node), rule, message });
    for (const diagnostic of sf.parseDiagnostics) issues.push({ file: posix(file), line: sf.getLineAndCharacterOfPosition(diagnostic.start || 0).line + 1, rule: 'composition.parse', message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ') });
    if (bindings === null) return { issues, usages, tags }; // Resolver failure: parse only; never name-based acceptance.
    function declarations(node) {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const module = node.moduleSpecifier.text;
            if (module.startsWith('@mui/material/') && node.importClause?.name) mui.set(node.importClause.name.text, module.split('/').at(-1));
            const bindings = node.importClause?.namedBindings;
            if (bindings && ts.isNamedImports(bindings)) for (const item of bindings.elements) {
                const original = (item.propertyName || item.name).text;
                if (module === '@mui/material') mui.set(item.name.text, original);
                if (module.endsWith('/layout') && original === 'layoutSx') layouts.add(item.name.text);
                if (module.endsWith('/composition')) composed.set(item.name.text, original);
                if (module.endsWith('/components')) shared.set(item.name.text, original);
            }
            if (bindings && ts.isNamespaceImport(bindings)) {
                if (module.endsWith('/layout')) namespaces.add(bindings.name.text);
                if (module.endsWith('/composition')) compositionNamespaces.add(bindings.name.text);
                if (module === '@mui/material') mui.set(bindings.name.text, '*');
            }
        }
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) variables.set(node.name.text, node.initializer);
        ts.forEachChild(node, declarations);
    }
    declarations(sf);
    function literalValues(node, seen = new Set()) {
        while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node))) node = node.expression;
        if (!node || seen.has(node)) return null;
        if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return new Set([node.text]);
        if (node.kind === ts.SyntaxKind.TrueKeyword) return new Set([true]);
        if (node.kind === ts.SyntaxKind.FalseKeyword) return new Set([false]);
        if (ts.isConditionalExpression(node)) {
            const yes = literalValues(node.whenTrue, new Set(seen));
            const no = literalValues(node.whenFalse, new Set(seen));
            return yes && no ? new Set([...yes, ...no]) : null;
        }
        if (ts.isIdentifier(node)) {
            const initializer = bindings ? bindings.initializer(node) : variables.get(node.text);
            return initializer ? literalValues(initializer, new Set([...seen, node])) : null;
        }
        return null;
    }
    const constantValue = node => { const values = literalValues(node); return values?.size === 1 ? values.values().next().value : undefined; };
    const memberPath = node => {
        if (ts.isIdentifier(node)) return [node.text];
        if (ts.isPropertyAccessExpression(node)) return [...memberPath(node.expression), node.name.text];
        if (ts.isElementAccessExpression(node)) {
            const key = constantValue(node.argumentExpression);
            return key === undefined ? [] : [...memberPath(node.expression), String(key)];
        }
        return [];
    };
    function rolesIn(expression, seen = new Set()) {
        const found = new Set();
        function visit(node) {
            const names = memberPath(node);
            const resolved = bindings?.reference(node);
            if (bindings) {
                if (resolved?.owner === 'layout' && resolved.exportName === 'layoutSx' && resolved.path.length === 2) found.add(resolved.path.join('.'));
            } else {
                if (names.length === 3 && layouts.has(names[0])) found.add(names.slice(1).join('.'));
                if (names.length === 4 && namespaces.has(names[0]) && names[1] === 'layoutSx') found.add(names.slice(2).join('.'));
            }
            const initializer = bindings ? bindings.initializer(node) : ts.isIdentifier(node) ? variables.get(node.text) : null;
            if (initializer && !seen.has(initializer)) {
                const next = new Set(seen); next.add(initializer);
                for (const role of rolesIn(initializer, next)) found.add(role);
            }
            ts.forEachChild(node, visit);
        }
        if (expression) visit(expression);
        return [...found];
    }
    function gridStyle(expression, seen = new Set()) {
        let found = false;
        function visit(node) {
            if (ts.isPropertyAssignment(node) && node.name.getText(sf).replace(/['"]/g, '') === 'display' && ts.isStringLiteral(node.initializer) && node.initializer.text === 'grid') found = true;
            const initializer = bindings ? bindings.initializer(node) : ts.isIdentifier(node) ? variables.get(node.text) : null;
            if (initializer && !seen.has(initializer)) { const next = new Set(seen); next.add(initializer); found ||= gridStyle(initializer, next); }
            ts.forEachChild(node, visit);
        }
        if (expression) visit(expression);
        return found;
    }
    function hasExplicitSurfaceBorder(expression, seen = new Set()) {
        while (expression && (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression))) expression = expression.expression;
        if (!expression || seen.has(expression)) return false;
        if (ts.isIdentifier(expression)) {
            const initializer = bindings ? bindings.initializer(expression) : variables.get(expression.text);
            return initializer ? hasExplicitSurfaceBorder(initializer, new Set([...seen, expression])) : false;
        }
        if (ts.isArrayLiteralExpression(expression)) return expression.elements.some(item => hasExplicitSurfaceBorder(item, seen));
        if (!ts.isObjectLiteralExpression(expression)) return false;
        for (const property of expression.properties) {
            if (ts.isSpreadAssignment(property)) {
                if (hasExplicitSurfaceBorder(property.expression, seen)) return true;
                continue;
            }
            if (!ts.isPropertyAssignment(property)) continue;
            const key = String(constantValue(property.name) ?? property.name.getText(sf).replace(/[\'"]/g, ''));
            if (key === 'border') {
                const values = literalValues(property.initializer);
                if (values && [...values].some(value => value !== false && value !== 0 && value !== '0' && value !== 'none' && value !== '0px')) return true;
            } else if (['xs', 'sm', 'md', 'lg', 'xl'].includes(key) && hasExplicitSurfaceBorder(property.initializer, seen)) return true;
        }
        return false;
    }
    const attribute = (opening, name) => opening.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(sf) === name);
    const attributeExpression = item => item?.initializer && ts.isJsxExpression(item.initializer) ? item.initializer.expression : item?.initializer;
    const describeJsx = opening => {
        const reference = bindings?.reference(opening.tagName);
        const local = opening.tagName.getText(sf);
        const names = memberPath(opening.tagName);
        const tag = reference?.exportName || mui.get(local) || (names.length === 2 && mui.get(names[0]) === '*' ? names[1] : local);
        const isPanel = reference ? reference.owner === 'components' && tag === 'Panel' : (shared.get(tag) || tag) === 'Panel';
        const composition = reference ? reference.owner === 'composition' ? tag : undefined : composed.get(local) || (names.length === 2 && compositionNamespaces.has(names[0]) ? names[1] : undefined);
        const portalBoundary = reference
            ? reference.owner === 'components' && ['EditDialog', 'ConfirmDialog'].includes(tag) || reference.owner === 'mui' && ['Dialog', 'Modal', 'Popover', 'Menu', 'Portal'].includes(tag)
            : ['EditDialog', 'ConfirmDialog', 'Dialog', 'Modal', 'Popover', 'Menu', 'Portal'].includes(tag);
        const transparent = reference?.owner === 'components' && tag === 'QueryState' || reference?.owner === 'react' && tag === 'Fragment';
        const modeOwner = isPanel ? 'Panel' : composition;
        const modeAttribute = attribute(opening, 'bodyMode');
        const modes = modeAttribute ? literalValues(attributeExpression(modeAttribute)) : new Set(['flush']);
        const modeUnknown = Boolean(modeAttribute && (!modes || !bodyModes[modeOwner] || [...modes].some(mode => !bodyModes[modeOwner].has(mode))));
        const sx = attributeExpression(attribute(opening, 'sx'));
        const hasInsetRole = rolesIn(sx).includes('surface.inset');
        const variant = literalValues(attributeExpression(attribute(opening, 'variant')));
        const paperSurface = reference?.owner === 'mui' && tag === 'Paper' && variant?.has('outlined');
        const borderedInset = reference?.owner === 'mui' && hasInsetRole && hasExplicitSurfaceBorder(sx);
        const independentModeSurface = Boolean(modeOwner && modes && independentSurfaceModes[modeOwner] && [...modes].every(mode => independentSurfaceModes[modeOwner].has(mode)));
        const ownsInset = Boolean(modeOwner && modes && [...modes].some(mode => insetModes[modeOwner]?.has(mode))) || reference?.owner === 'mui' && hasInsetRole;
        const intrinsic = /^[a-z]/.test(tag);
        const domBoundary = reference?.owner === 'mui' || intrinsic || reference?.owner === 'components' && !transparent || Boolean(composition);
        const opaqueBoundary = !domBoundary && !transparent && !portalBoundary && !isPanel && !composition && (!reference || !['react'].includes(reference.owner));
        return { owner: reference?.owner, exportName: tag, composition, isPanel, portalBoundary, transparent, domBoundary, opaqueBoundary, modes, modeUnknown, surfaceBoundary: isPanel || paperSurface || borderedInset || independentModeSurface, ownsInset };
    };
    function jsx(node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            const localName = node.tagName.getText(sf);
            const names = memberPath(node.tagName);
            const resolved = bindings?.reference(node.tagName);
            if (bindings && !resolved && bindings.origin(node.tagName)) addIssue(node, 'composition.binding-unknown', 'Component access to a known owner is unresolved; opaque aliases cannot bypass API or ownership checks.');
            const tag = bindings ? resolved?.exportName || localName : mui.get(localName) || (names.length === 2 && mui.get(names[0]) === '*' ? names[1] : localName);
            const composition = bindings ? resolved?.owner === 'composition' ? resolved.exportName : undefined : composed.get(localName) || (names.length === 2 && compositionNamespaces.has(names[0]) ? names[1] : undefined);
            tags.push({ ...location(node), tag: bindings ? tag : shared.get(localName) || composed.get(localName) || tag });
            const attributes = node.attributes.properties;
            const modeAttribute = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(sf) === 'bodyMode');
            const modeOwner = resolved?.owner === 'components' && resolved.exportName === 'Panel' ? 'Panel' : composition;
            const currentModes = modeAttribute ? literalValues(attributeExpression(modeAttribute)) : new Set(['flush']);
            if (modeOwner && modeAttribute && (!currentModes || !bodyModes[modeOwner] || [...currentModes].some(mode => !bodyModes[modeOwner].has(mode)))) addIssue(modeAttribute, 'composition.ownership-unknown', 'bodyMode must resolve only to supported literals; unresolved ownership cannot pass.');
            const finiteOwner = modeOwner || composition;
            for (const attribute of attributes) {
                if (!ts.isJsxAttribute(attribute)) continue;
                const name = attribute.name.getText(sf);
                const allowed = finiteProps[finiteOwner]?.[name];
                if (!allowed) continue;
                const values = literalValues(attributeExpression(attribute));
                if (!values || [...values].some(value => !allowed.has(value))) addIssue(attribute, 'composition.value-unknown', `${finiteOwner}.${name} must use a supported literal value or finite branch.`);
            }
            const sx = attributes.find(item => ts.isJsxAttribute(item) && item.name.getText(sf) === 'sx');
            const roles = rolesIn(sx?.initializer && ts.isJsxExpression(sx.initializer) ? sx.initializer.expression : undefined);
            for (const role of roles) usages.push({ ...location(node), tag, role });
            if (posix(file) !== 'apps/web/src/shared/ui/composition.tsx') for (const role of roles) {
                const owner = compositionOwners[role];
                const eligible = !bindings || resolved?.owner === 'mui';
                const expectedOwner = role === 'grid.gutter' && tag === 'Stack' ? 'PageSections' : role === 'surface.contentGap' && gridStyle(sx?.initializer?.expression) ? 'SectionGrid rhythm="content"' : owner;
                if (owner && eligible) addIssue(node, 'composition.shared-owner', `${tag} using ${role} must use ${expectedOwner}; spacing ownership belongs to the shared component. Flex section flows use PageSections; column grids use SectionGrid.`);
            }
            if (composition) for (const attribute of attributes) {
                if (ts.isJsxSpreadAttribute(attribute)) addIssue(attribute, 'composition.unknown-spread', 'Spread props on a semantic composition need explicit, inspectable props.');
                else if (spacingProps.has(attribute.name.getText(sf))) addIssue(attribute, 'composition.override', `Cannot override the shared spacing owner with ${attribute.name.getText(sf)}.`);
                else if (publicProps[composition] && !publicProps[composition].has(attribute.name.getText(sf))) addIssue(attribute, 'composition.unknown-prop', `Prop ${attribute.name.getText(sf)} is outside the closed ${composition} API; extend the owner explicitly rather than silently dropping it.`);
                else if (attribute.name.getText(sf) === 'geometry' && attribute.initializer && ts.isJsxExpression(attribute.initializer)) {
                    const inspectGeometry = (item, depth = 0, seen = new Set()) => {
                        if (ts.isIdentifier(item)) {
                            const initializer = bindings ? bindings.initializer(item) : variables.get(item.text);
                            if (initializer && !seen.has(initializer)) { const next = new Set(seen); next.add(initializer); inspectGeometry(initializer, depth, next); }
                            else addIssue(item, 'composition.geometry-unknown', 'Geometry must resolve to a closed object.');
                            return;
                        }
                        if (depth === 0 && !ts.isObjectLiteralExpression(item)) { addIssue(item, 'composition.geometry-unknown', 'Geometry must resolve to a closed object.'); return; }
                        if (ts.isSpreadAssignment(item)) addIssue(item, 'composition.geometry-spread', 'Geometry must use explicit closed geometric properties.');
                        if (ts.isObjectLiteralExpression(item)) for (const property of item.properties) {
                            if (ts.isSpreadAssignment(property)) { addIssue(property, 'composition.geometry-spread', 'Geometry must use explicit closed geometric properties.'); continue; }
                            if (!ts.isPropertyAssignment(property)) { addIssue(property, 'composition.geometry-unknown', 'Geometry properties must be explicit.'); continue; }
                            const key = property.name.getText(sf).replace(/['"]/g, '');
                            if (spacingProps.has(key)) addIssue(property, 'composition.geometry-spacing', 'Geometry cannot contain spacing or style overrides.');
                            else if (depth === 0 && !geometryKeys.has(key)) addIssue(property, 'composition.geometry-property', `Not a geometric property: ${key}`);
                            if (ts.isObjectLiteralExpression(property.initializer)) inspectGeometry(property.initializer, depth + 1, seen);
                        }
                    };
                    if (attribute.initializer.expression) inspectGeometry(attribute.initializer.expression);
                }
            }
            let parent = ts.isJsxOpeningElement(node) ? node.parent?.parent : node.parent;
            const ancestors = [];
            let crossesPortal = false;
            while (parent) {
                if (ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent)) {
                    const opening = ts.isJsxElement(parent) ? parent.openingElement : parent;
                    const owner = describeJsx(opening);
                    if (owner.portalBoundary) { crossesPortal = true; break; }
                    ancestors.push(owner);
                } else if (ts.isCallExpression(parent)) {
                    const factory = bindings?.reference(parent.expression);
                    if (factory?.owner === 'react-dom' && factory.exportName === 'createPortal') { crossesPortal = true; break; }
                }
                parent = parent.parent;
            }
            let semanticParent = false, unknownGapParent = false;
            for (const owner of ancestors) {
                if (owner.composition) { semanticParent = true; break; }
                if (owner.domBoundary || owner.surfaceBoundary || owner.isPanel) break;
                if (owner.opaqueBoundary) { unknownGapParent = true; break; }
            }
            let insetOwner = null, unknownInsetParent = false;
            for (const owner of ancestors) {
                if (owner.modeUnknown) { insetOwner = owner; break; }
                if (owner.ownsInset) { insetOwner = owner; break; }
                if (owner.isPanel || owner.surfaceBoundary) break;
                if (owner.opaqueBoundary) { unknownInsetParent = true; break; }
            }
            if (!crossesPortal && semanticParent && attributes.some(item => ts.isJsxAttribute(item) && ['beforeGap', 'afterGap'].includes(item.name.getText(sf)))) addIssue(node, 'composition.double-boundary', 'A child cannot add a second gap owned by its semantic parent.');
            if (!crossesPortal && insetOwner && composition) {
                const hasNestedInset = currentModes && [...currentModes].some(mode => insetModes[composition]?.has(mode) && !independentSurfaceModes[composition]?.has(mode));
                if (insetOwner.modeUnknown) addIssue(node, 'composition.ownership-unknown', 'The nearest inset owner cannot be resolved; ownership cannot pass.');
                else if (hasNestedInset) addIssue(node, 'composition.double-inset', 'A child cannot add a second inset inside the same surface boundary.');
            }
            const currentHasInset = Boolean(composition && currentModes && [...currentModes].some(mode => insetModes[composition]?.has(mode) && !independentSurfaceModes[composition]?.has(mode)));
            if (!crossesPortal && unknownGapParent && attributes.some(item => ts.isJsxAttribute(item) && ['beforeGap', 'afterGap'].includes(item.name.getText(sf))) || !crossesPortal && unknownInsetParent && currentHasInset) addIssue(node, 'composition.ownership-unknown', 'A custom wrapper interrupts ownership resolution; expose a known surface/composition boundary or use an explicit owner.');
        }
        ts.forEachChild(node, jsx);
    }
    jsx(sf);
    function nativeProps(input, seen = new Set()) {
        if (!input || input.kind === ts.SyntaxKind.NullKeyword) return { entries: [], unknown: false };
        let value = input;
        while (ts.isParenthesizedExpression(value) || ts.isAsExpression(value) || ts.isSatisfiesExpression(value) || ts.isNonNullExpression(value)) value = value.expression;
        if (ts.isIdentifier(value)) {
            if (seen.has(value)) return { entries: [], unknown: true };
            const initializer = bindings.initializer(value);
            return initializer ? nativeProps(initializer, new Set([...seen, value])) : { entries: [], unknown: true };
        }
        if (!ts.isObjectLiteralExpression(value)) return { entries: [], unknown: true };
        const entries = [];
        for (const property of value.properties) {
            if (ts.isSpreadAssignment(property)) entries.push({ node: property, spread: true, expression: property.expression });
            else if (ts.isPropertyAssignment(property)) entries.push({ node: property, name: String(constantValue(property.name) ?? property.name.getText(sf).replace(/[\'"]/g, '')), expression: property.initializer });
            else if (ts.isShorthandPropertyAssignment(property)) entries.push({ node: property, name: property.name.text, expression: property.name });
            else entries.push({ node: property, unknown: true });
        }
        return { entries, unknown: false };
    }
    const nativeElementFactory = call => {
        const factory = bindings.reference(call.expression);
        return factory?.owner === 'react' && ['createElement', 'jsx', 'jsxs', 'jsxDEV'].includes(factory.exportName);
    };
    const nativeDescriptor = (typeNode, props) => {
        const component = bindings.reference(typeNode);
        const modeEntry = props.entries.find(entry => entry.name === 'bodyMode');
        const modeOwner = component?.owner === 'components' && component.exportName === 'Panel' ? 'Panel' : component?.owner === 'composition' ? component.exportName : undefined;
        const modes = modeEntry ? literalValues(modeEntry.expression) : new Set(['flush']);
        const modeUnknown = Boolean(modeEntry && (!modes || !bodyModes[modeOwner] || [...modes].some(mode => !bodyModes[modeOwner].has(mode))));
        const variantEntry = props.entries.find(entry => entry.name === 'variant');
        const sxEntry = props.entries.find(entry => entry.name === 'sx');
        const paperSurface = component?.owner === 'mui' && component.exportName === 'Paper' && literalValues(variantEntry?.expression)?.has('outlined');
        const hasInsetRole = component?.owner === 'mui' && rolesIn(sxEntry?.expression).includes('surface.inset');
        const borderedInset = hasInsetRole && hasExplicitSurfaceBorder(sxEntry?.expression);
        const independentModeSurface = Boolean(modeOwner && modes && independentSurfaceModes[modeOwner] && [...modes].every(mode => independentSurfaceModes[modeOwner].has(mode)));
        const transparent = component?.owner === 'components' && component.exportName === 'QueryState'
            || component?.owner === 'react' && component.exportName === 'Fragment'
            || ts.isStringLiteralLike(typeNode) && typeNode.text === 'Fragment';
        const intrinsic = ts.isStringLiteralLike(typeNode) && /^[a-z]/.test(typeNode.text);
        const domBoundary = component?.owner === 'mui' || intrinsic || component?.owner === 'components' && !transparent || Boolean(component?.owner === 'composition');
        const opaqueBoundary = !domBoundary && !transparent && !component && !intrinsic;
        return {
            owner: component?.owner,
            exportName: component?.exportName,
            composition: component?.owner === 'composition' ? component.exportName : undefined,
            isPanel: component?.owner === 'components' && component.exportName === 'Panel',
            portalBoundary: component?.owner === 'components' && ['EditDialog', 'ConfirmDialog'].includes(component.exportName)
                || component?.owner === 'mui' && ['Dialog', 'Modal', 'Popover', 'Menu', 'Portal'].includes(component.exportName),
            transparent,
            domBoundary,
            opaqueBoundary,
            modes,
            modeUnknown,
            surfaceBoundary: component?.owner === 'components' && component.exportName === 'Panel' || paperSurface || borderedInset || independentModeSurface,
            ownsInset: Boolean(modeOwner && modes && [...modes].some(mode => insetModes[modeOwner]?.has(mode))) || hasInsetRole,
            modeEntry,
            props,
            node: typeNode,
        };
    };
    function nativeAncestors(node) {
        let parent = node.parent;
        const ancestors = [];
        while (parent) {
            if (ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent)) {
                const opening = ts.isJsxElement(parent) ? parent.openingElement : parent;
                const owner = describeJsx(opening);
                if (owner.portalBoundary) break;
                ancestors.push(owner);
            } else if (ts.isCallExpression(parent)) {
                const factory = bindings.reference(parent.expression);
                if (factory?.owner === 'react-dom' && factory.exportName === 'createPortal') break;
                if (nativeElementFactory(parent) && parent.arguments[0]) {
                    const owner = nativeDescriptor(parent.arguments[0], nativeProps(parent.arguments[1]));
                    if (owner.portalBoundary) break;
                    ancestors.push(owner);
                }
            }
            parent = parent.parent;
        }
        return ancestors;
    }
    function nativeElements(node) {
        if (ts.isCallExpression(node) && bindings && nativeElementFactory(node) && node.arguments[0]) {
            const props = nativeProps(node.arguments[1]);
            const info = nativeDescriptor(node.arguments[0], props);
            const ancestors = nativeAncestors(node);
            if (bindings.origin(node.arguments[0]) && !bindings.reference(node.arguments[0])) addIssue(node, 'composition.binding-unknown', 'Native element type from a known owner is unresolved; ownership cannot pass.');
            if (info.owner === 'mui') for (const role of rolesIn(props.entries.find(entry => entry.name === 'sx')?.expression)) {
                if (compositionOwners[role]) addIssue(node, 'composition.shared-owner', `${info.exportName} using ${role} must use ${compositionOwners[role]}; spacing ownership belongs to the shared component.`);
            }
            if (info.composition) {
                if (props.unknown || props.entries.some(entry => entry.spread || entry.unknown)) addIssue(node, 'composition.unknown-spread', 'Native props on a semantic composition must resolve to a closed object.');
                for (const entry of props.entries) {
                    if (spacingProps.has(entry.name)) addIssue(entry.node, 'composition.override', `Cannot override the shared spacing owner with ${entry.name}.`);
                    else if (entry.name && publicProps[info.composition] && !publicProps[info.composition].has(entry.name)) addIssue(entry.node, 'composition.unknown-prop', `Prop ${entry.name} is outside the closed ${info.composition} API.`);
                }
            }
            const modeOwner = info.isPanel ? 'Panel' : info.composition;
            if (modeOwner && info.modeEntry && info.modeUnknown) addIssue(info.modeEntry.node, 'composition.ownership-unknown', 'bodyMode must resolve only to supported literals; unresolved ownership cannot pass.');
            const finiteOwner = modeOwner || info.composition;
            for (const entry of props.entries) {
                const allowed = finiteProps[finiteOwner]?.[entry.name];
                if (!allowed) continue;
                const values = literalValues(entry.expression);
                if (!values || [...values].some(value => !allowed.has(value))) addIssue(entry.node, 'composition.value-unknown', `${finiteOwner}.${entry.name} must use a supported literal value or finite branch.`);
            }
            const boundary = info.props.entries.find(entry => entry.name === 'beforeGap' || entry.name === 'afterGap');
            let parentComposition = null, unknownGapParent = false;
            for (const owner of ancestors) {
                if (owner.composition) { parentComposition = owner; break; }
                if (owner.domBoundary || owner.surfaceBoundary || owner.isPanel) break;
                if (owner.opaqueBoundary) { unknownGapParent = true; break; }
            }
            if (boundary && parentComposition) addIssue(node, 'composition.double-boundary', 'A child cannot add a second gap owned by its semantic parent.');
            let insetOwner = null, unknownInsetParent = false;
            for (const owner of ancestors) {
                if (owner.modeUnknown || owner.ownsInset) { insetOwner = owner; break; }
                if (owner.isPanel || owner.surfaceBoundary) break;
                if (owner.opaqueBoundary) { unknownInsetParent = true; break; }
            }
            const hasNestedInset = info.composition && info.modes && [...info.modes].some(mode => insetModes[info.composition]?.has(mode) && !independentSurfaceModes[info.composition]?.has(mode));
            if (info.composition && insetOwner?.modeUnknown) addIssue(node, 'composition.ownership-unknown', 'The nearest inset owner cannot be resolved; ownership cannot pass.');
            else if (hasNestedInset && insetOwner?.ownsInset) addIssue(node, 'composition.double-inset', 'A child cannot add a second inset inside the same surface boundary.');
            if (unknownGapParent && boundary || unknownInsetParent && hasNestedInset) addIssue(node, 'composition.ownership-unknown', 'A custom wrapper interrupts ownership resolution; expose a known surface/composition boundary or use an explicit owner.');
        }
        ts.forEachChild(node, nativeElements);
    }
    nativeElements(sf);
    return { issues, usages, tags };
}

export function auditComposition(root) {
    const sourceRoot = path.join(root, 'apps/web/src');
    const importScope = auditUiImportScope(root, uiSourceFiles(root));
    const files = importScope.files.filter(isScriptSource);
    let bindings = null;
    let bindingIssue;
    try { bindings = createUiBindings(root, files); }
    catch (error) { bindingIssue = { file: 'apps/web/tsconfig.json', line: 1, rule: 'composition.bindings', message: error.message }; }
    const results = files.map(file => {
        const source = fs.readFileSync(file, 'utf8');
        return { file: posix(path.relative(root, file)), sha256: createHash('sha256').update(source).digest('hex'), ...inspectComposition(source, posix(path.relative(root, file)), bindings, file) };
    });
    const issues = [...importScope.issues.map(issue => ({ file: issue.file, line: 1, rule: 'composition.import-scope', message: issue.message })), ...results.flatMap(result => result.issues)];
    if (bindingIssue) issues.push(bindingIssue);
    const counts = new Map();
    for (const row of results.flatMap(result => result.tags)) counts.set(row.tag, (counts.get(row.tag) || 0) + 1);
    return { checkedAt: new Date().toISOString(), scope: 'Frontend source composition ownership only; does not certify browser behavior or production readiness.', files: files.length, tsxFiles: files.filter(file => file.endsWith('.tsx')).length, moduleFolders: fs.readdirSync(path.join(sourceRoot, 'modules'), { withFileTypes: true }).filter(entry => entry.isDirectory()).length, sourceHashes: results.map(({ file, sha256 }) => ({ file, sha256 })), tagCounts: Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])), usages: results.flatMap(result => result.usages), issues, status: issues.length ? 'FAIL' : 'PASS' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--report', '--json'].includes(arg))) throw new Error('Supported options: --report, --json');
    const result = auditComposition(process.cwd());
    console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : `ui-composition ${result.status}: ${result.files} source files, ${result.issues.length} finding(s)\n${result.issues.map(item => `${item.file}:${item.line} ${item.rule} ${item.message}`).join('\n')}`);
    if (result.issues.length && !args.includes('--report')) process.exitCode = 1;
}
