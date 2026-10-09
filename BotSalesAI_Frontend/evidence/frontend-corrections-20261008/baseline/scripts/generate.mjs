import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const generatorFile = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(generatorFile), '..');
const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const json = value => JSON.stringify(value);

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function resolvePointer(document, reference) {
    if (!reference.startsWith('#/')) return undefined;
    return reference.slice(2).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~')).reduce((value, part) => value?.[part], document);
}

function getServerBasePath(api) {
    const serverUrl = api?.servers?.[0]?.url;
    if (typeof serverUrl !== 'string' || !serverUrl.startsWith('/') || serverUrl.startsWith('//') || /[?#{}]/.test(serverUrl)) return null;
    try {
        const parsed = new URL(serverUrl, 'https://botsales.invalid');
        if (parsed.origin !== 'https://botsales.invalid' || parsed.pathname !== serverUrl) return null;
        return parsed.pathname.replace(/\/$/, '');
    }
    catch {
        return null;
    }
}

export function validateContractBundle(bundle) {
    const issues = [];
    const { api, routes, tokens, permissions, events, openapiYaml, operationIndex } = bundle;
    const issue = message => issues.push(message);

    if (!isRecord(api) || typeof api.openapi !== 'string' || !api.openapi.startsWith('3.1.')) issue('OpenAPI must declare version 3.1.x.');
    if (!isRecord(api?.info) || typeof api.info.version !== 'string' || !api.info.version.trim()) issue('OpenAPI info.version is required.');
    if (openapiYaml !== undefined && !isDeepStrictEqual(openapiYaml, api)) issue('openapi.yaml drifted from canonical openapi.json.');
    if (!getServerBasePath(api)) issue('OpenAPI needs a same-origin absolute-path server URL without query, hash or variables.');
    if (!isRecord(api?.paths) || !isRecord(api?.components?.schemas) || Object.keys(api.components.schemas).length === 0) issue('OpenAPI paths and component schemas are required.');

    const permissionIds = new Set();
    if (!isRecord(permissions) || !Array.isArray(permissions.permissions) || permissions.permissions.length === 0) issue('Permission catalog needs a non-empty permissions array.');
    else {
        for (const permission of permissions.permissions) {
            if (!isRecord(permission) || typeof permission.id !== 'string' || !permission.id.trim()) issue('Each permission needs an id.');
            else if (permissionIds.has(permission.id)) issue(`Duplicate permission ${permission.id}.`);
            else permissionIds.add(permission.id);
        }
    }

    function validateReferences(document, label) {
        function visit(value, location) {
            if (Array.isArray(value)) {
                value.forEach((item, index) => visit(item, `${location}[${index}]`));
                return;
            }
            if (!isRecord(value)) return;
            if (typeof value.$ref === 'string' && resolvePointer(document, value.$ref) === undefined) issue(`${label} has unresolved reference ${value.$ref} at ${location}.`);
            for (const [key, child] of Object.entries(value)) visit(child, `${location}.${key}`);
        }
        visit(document, label);
    }

    if (isRecord(api)) validateReferences(api, 'OpenAPI');
    if (isRecord(events)) validateReferences(events, 'Event schema');

    const operationIds = new Set();
    const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);
    const knownOperations = new Set();
    if (isRecord(api?.paths)) {
        for (const [routePath, pathItem] of Object.entries(api.paths)) {
            if (!isRecord(pathItem)) {
                issue(`OpenAPI path ${routePath} must be an object.`);
                continue;
            }
            const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
            for (const [method, operation] of Object.entries(pathItem)) {
                if (!methods.has(method.toLowerCase())) continue;
                if (!isRecord(operation) || typeof operation.operationId !== 'string' || !operation.operationId.trim()) {
                    issue(`OpenAPI ${method.toUpperCase()} ${routePath} needs an operationId.`);
                    continue;
                }
                const operationId = operation.operationId;
                if (operationIds.has(operationId)) issue(`Duplicate operationId ${operationId}.`);
                operationIds.add(operationId);
                knownOperations.add(operationId);
                const parameters = [...pathParameters, ...(Array.isArray(operation.parameters) ? operation.parameters : [])]
                    .map(parameter => typeof parameter?.$ref === 'string' ? resolvePointer(api, parameter.$ref) : parameter)
                    .filter(isRecord);
                const declaredPathParameters = new Set(parameters.filter(parameter => parameter.in === 'path').map(parameter => parameter.name));
                for (const [, parameterName] of routePath.matchAll(/\{([^}]+)\}/g)) {
                    if (!declaredPathParameters.has(parameterName)) issue(`${operationId} is missing path parameter ${parameterName}.`);
                }
                if (operation['x-permission'] != null && !permissionIds.has(operation['x-permission'])) issue(`${operationId} uses unknown permission ${operation['x-permission']}.`);
                const successResponses = Object.entries(operation.responses || {}).filter(([status]) => status.startsWith('2'));
                const redirectResponses = Object.entries(operation.responses || {}).filter(([status]) => status.startsWith('3'));
                if (successResponses.length === 0 && redirectResponses.length === 0) issue(`${operationId} needs at least one successful or redirect response.`);
                for (const [status, response] of successResponses) {
                    for (const [contentType, content] of Object.entries(response?.content || {})) {
                        if (contentType === 'application/json' && !content?.schema) issue(`${operationId} ${status} JSON response is missing a schema.`);
                    }
                }
                const requestContent = operation.requestBody?.content;
                if (operation.requestBody?.required && !isRecord(requestContent)) issue(`${operationId} requires a request body but declares no content.`);
                if (requestContent && !requestContent['application/json'] && !requestContent['multipart/form-data']) issue(`${operationId} has unsupported request content; generator supports JSON and multipart form data.`);
                if (requestContent?.['application/json'] && !requestContent['application/json'].schema) issue(`${operationId} JSON request is missing a schema.`);
            }
        }
    }

    if (isRecord(operationIndex)) {
        const [major, minor] = String(api?.info?.version || '').split('.');
        if (operationIndex.version !== `${major}.${minor}`) issue('operation-index version must match the major/minor version of canonical openapi.json.');
        if (!Array.isArray(operationIndex.operations)) issue('operation-index.json needs an operations array.');
        else {
            const indexedIds = new Set();
            const expected = [];
            for (const [routePath, pathItem] of Object.entries(api.paths || {})) {
                for (const [method, operation] of Object.entries(pathItem || {})) {
                    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase()) || !operation?.operationId) continue;
                    expected.push({
                        operationId: operation.operationId,
                        method: method.toUpperCase(),
                        path: routePath,
                        permission: operation['x-permission'] || null,
                        module: operation.tags?.[0] || null,
                    });
                }
            }
            if (expected.length !== operationIndex.operations.length) issue('operation-index.json operation count differs from canonical openapi.json.');
            for (const indexed of operationIndex.operations) {
                if (!isRecord(indexed) || typeof indexed.operationId !== 'string') {
                    issue('operation-index.json contains an invalid operation entry.');
                    continue;
                }
                if (indexedIds.has(indexed.operationId)) issue(`operation-index.json contains duplicate operation ${indexed.operationId}.`);
                indexedIds.add(indexed.operationId);
                const source = expected.find(item => item.operationId === indexed.operationId);
                if (!source || ['method', 'path', 'permission', 'module'].some(key => indexed[key] !== source[key])) {
                    issue(`operation-index.json drifted from canonical OpenAPI operation ${indexed.operationId}.`);
                }
            }
        }
    }

    if (!isRecord(routes) || !Array.isArray(routes.routes) || routes.routes.length === 0) issue('Route manifest needs a non-empty routes array.');
    else {
        const routeIds = new Set();
        for (const route of routes.routes) {
            if (!isRecord(route) || typeof route.id !== 'string' || typeof route.path !== 'string') {
                issue('Each route manifest item needs id and path.');
                continue;
            }
            if (routeIds.has(route.id)) issue(`Duplicate route id ${route.id}.`);
            routeIds.add(route.id);
            for (const operationId of [...(route.readOperations || []), ...(route.actions || []).map(action => action?.operationId).filter(Boolean)]) {
                if (!knownOperations.has(operationId)) issue(`${route.id} references unknown operation ${operationId}.`);
            }
            for (const permission of [route.readPermission, ...(route.actions || []).map(action => action?.permission)].filter(value => value != null)) {
                if (!permissionIds.has(permission)) issue(`${route.id} uses unknown permission ${permission}.`);
            }
        }
        for (const operationId of routes.globalOperations || []) {
            if (!knownOperations.has(operationId)) issue(`Route manifest references unknown global operation ${operationId}.`);
        }
    }

    if (!isRecord(tokens?.colors) || Object.keys(tokens.colors).length === 0 || Object.values(tokens.colors).some(color => typeof color !== 'string' || !color.trim())) issue('Design tokens need a non-empty color map of strings.');
    if (!isRecord(events?.properties) || !Array.isArray(events.properties.type?.enum) || events.properties.type.enum.length === 0) issue('Event schema needs a non-empty event type enum.');
    if (events?.properties?.schemaVersion?.const !== 2) issue('Event schema version must remain 2.');

    return issues;
}

export function renderGenerated({ api, routes, tokens, permissions }) {
    const outputs = {};
    const add = (file, text) => { outputs[file] = text; };
    const q = json;
    const apiBasePath = getServerBasePath(api);

    function ts(schema = {}) {
        if (schema.$ref) return schema.$ref.split('/').at(-1);
        if (schema.const !== undefined) return q(schema.const);
        if (schema.enum) return schema.enum.map(q).join(' | ');
        if (schema.anyOf || schema.oneOf) return `(${(schema.anyOf || schema.oneOf).map(ts).join(' | ')})`;
        if (schema.allOf) return `(${schema.allOf.map(ts).join(' & ')})`;
        if (Array.isArray(schema.type)) return schema.type.map(type => ts({ ...schema, type })).join(' | ');
        if (schema.type === 'array') return `Array<${ts(schema.items)}>`;
        if (schema.type === 'object' || schema.properties) {
            const required = new Set(schema.required || []);
            const properties = Object.entries(schema.properties || {}).map(([key, value]) => `${q(key)}${required.has(key) ? '' : '?'}: ${ts(value)};`);
            if (schema.additionalProperties === true) properties.push('[key: string]: unknown;');
            else if (typeof schema.additionalProperties === 'object') properties.push(`[key: string]: ${ts(schema.additionalProperties)};`);
            return `{ ${properties.join(' ')} }`;
        }
        return ({ string: 'string', integer: 'number', number: 'number', boolean: 'boolean', null: 'null' })[schema.type] || 'unknown';
    }

    const schemas = Object.entries(api.components.schemas).map(([name, schema]) => `export type ${name} = ${ts(schema)};`).join('\n');
    const registry = {};
    const operationTypes = [];
    for (const [routePath, methods] of Object.entries(api.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
            if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
            const parameters = [...(methods.parameters || []), ...(operation.parameters || [])].map(parameter => parameter.$ref ? api.components.parameters[parameter.$ref.split('/').at(-1)] : parameter);
            const request = operation.requestBody?.content?.['application/json']?.schema;
            const response = Object.entries(operation.responses).find(([status]) => status.startsWith('2'));
            const responseSchema = response?.[1]?.content?.['application/json']?.schema;
            const pathParameters = parameters.filter(parameter => parameter.in === 'path');
            const queryParameters = parameters.filter(parameter => parameter.in === 'query');
            const versionRequired = parameters.some(parameter => parameter.in === 'header' && parameter.name === 'If-Match' && parameter.required);
            registry[operation.operationId] = {
                method: method.toUpperCase(),
                path: routePath,
                permission: operation['x-permission'] || null,
                versionRequired,
                requestSchema: request?.$ref?.split('/').at(-1) || null,
                responseSchema: responseSchema?.$ref?.split('/').at(-1) || null,
                status: Number(response?.[0] || 204),
                pathParameters: pathParameters.map(parameter => ({ name: parameter.name, required: !!parameter.required, schema: parameter.schema })),
                headers: parameters.filter(parameter => parameter.in === 'header').map(parameter => ({ name: parameter.name, required: !!parameter.required, schema: parameter.schema })),
                queryParameters: queryParameters.map(parameter => ({ name: parameter.name, required: !!parameter.required, schema: parameter.schema })),
                bodyType: operation.requestBody?.content?.['multipart/form-data'] ? 'multipart' : 'json',
            };
            operationTypes.push(`${q(operation.operationId)}: { method: ${q(method.toUpperCase())}; versionRequired: ${versionRequired}; request: ${request ? ts(request) : operation.requestBody?.content?.['multipart/form-data'] ? 'FormData' : 'undefined'}; response: ${responseSchema ? ts(responseSchema) : 'undefined'}; path: { ${pathParameters.map(parameter => `${q(parameter.name)}: ${ts(parameter.schema)}`).join('; ')} }; query: { ${queryParameters.map(parameter => `${q(parameter.name)}${parameter.required ? '' : '?'}: ${ts(parameter.schema)}`).join('; ')} } }`);
        }
    }

    const preamble = '// GENERATED by scripts/generate.mjs from kit 2.1.1. Do not edit.\n';
    add('packages/contracts/src/generated.ts', `${preamble}export const API_BASE_PATH = ${q(apiBasePath)} as const;\n${schemas}\nexport interface Operations {\n${operationTypes.join(';\n')} ;\n}\nexport type OperationId = keyof Operations;\nexport type RequestOf<K extends OperationId> = Operations[K]["request"];\nexport type ResponseOf<K extends OperationId> = Operations[K]["response"];\nexport type DataOf<K extends OperationId> = ResponseOf<K> extends {data: infer D} ? D : undefined;\n`);
    add('packages/contracts/src/operations.json', `${JSON.stringify(registry, null, 2)}\n`);
    add('packages/contracts/src/schemas.json', `${JSON.stringify({ components: { schemas: api.components.schemas } }, null, 2)}\n`);
    add('packages/contracts/src/routes.json', `${JSON.stringify(routes, null, 2)}\n`);
    add('packages/contracts/src/permissions.json', `${JSON.stringify(permissions, null, 2)}\n`);
    add('packages/contracts/src/index.ts', `${preamble}export type * from './generated';\nexport { API_BASE_PATH } from './generated';\nexport { default as operations } from './operations.json';\nexport { default as routeManifest } from './routes.json';\nexport { default as permissionCatalog } from './permissions.json';\nexport { default as schemaCatalog } from './schemas.json';\n`);
    add('packages/design-tokens/src/tokens.json', `${JSON.stringify(tokens, null, 2)}\n`);
    add('packages/design-tokens/src/index.ts', `${preamble}import tokenData from './tokens.json';\ntype DeepReadonly<T> = { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K] };\nexport const tokens: DeepReadonly<typeof tokenData> = tokenData;\nexport const colors = tokens.colors;\n`);
    const colorVariables = Object.entries(tokens.colors).map(([key, value]) => `--color-${key.replace(/[A-Z]/g, character => '-' + character.toLowerCase())}:${value};`).join('\n');
    const spaceVariables = Object.entries(tokens.space).map(([key, value]) => `--space-${key}:${value}px;`).join('\n');
    const kebab = key => key.replace(/[A-Z]/g, character => '-' + character.toLowerCase());
    const pxVariables = (namespace, values) => Object.entries(values || {}).map(([key, value]) => `--${namespace}-${kebab(key)}:${value}px;`).join('\n');
    const unitlessVariables = (namespace, values) => Object.entries(values || {}).map(([key, value]) => `--${namespace}-${kebab(key)}:${value};`).join('\n');
    const designVariables = [
        `--font-family:${tokens.fontFamily};`,
        pxVariables('font-size', tokens.fontSizes),
        unitlessVariables('font-weight', tokens.fontWeights),
        unitlessVariables('line-height', tokens.lineHeights),
        pxVariables('letter-spacing', tokens.letterSpacing),
        pxVariables('icon-size', tokens.iconSizes),
        pxVariables('radius', tokens.radius),
        pxVariables('focus-ring', { width: tokens.focusRing.width, globalOffset: tokens.focusRing.globalOffset, controlOffset: tokens.focusRing.controlOffset }),
        pxVariables('breakpoint', tokens.breakpoints),
        unitlessVariables('elevation', tokens.elevation),
    ].filter(Boolean).join('\n');
    const css = `/* GENERATED from approved design/tokens.json. */\n:root{color-scheme:dark;\n${colorVariables}\n${spaceVariables}\n${designVariables}\n}\n`;
    add('apps/web/src/app/tokens.css', css);
    add('apps/web/public/manifest.webmanifest', `${JSON.stringify({ name: 'BotSales AI', short_name: 'BotSales', lang: 'vi', start_url: '/', scope: '/', display: 'standalone', background_color: tokens.colors.canvas, theme_color: tokens.colors.canvas, icons: [{ src: '/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] }, null, 2)}\n`);
    add('apps/web/public/app-icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="44" fill="${tokens.colors.canvas}"/><rect x="38" y="56" width="116" height="88" rx="24" fill="${tokens.colors.accent}"/><circle cx="72" cy="94" r="9" fill="${tokens.colors.onAccent}"/><circle cx="120" cy="94" r="9" fill="${tokens.colors.onAccent}"/><path d="M72 123h48M96 36v20" stroke="${tokens.colors.onAccent}" stroke-width="9" stroke-linecap="round"/></svg>\n`);
    return outputs;
}

export function findGeneratedDrift(outputs, root, fileSystem = fs) {
    return Object.entries(outputs).filter(([file, expected]) => {
        const destination = path.join(root, file);
        return !fileSystem.existsSync(destination) || fileSystem.readFileSync(destination, 'utf8') !== expected;
    }).map(([file]) => file);
}

export function loadContractBundle(root = defaultRoot) {
    const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    const openapiYaml = yaml.load(fs.readFileSync(path.join(root, '../botsales-kit/contracts/openapi.yaml'), 'utf8'));
    return {
        api: read('../botsales-kit/contracts/openapi.json'),
        openapiYaml,
        operationIndex: read('../botsales-kit/contracts/operation-index.json'),
        routes: read('../botsales-kit/contracts/route-manifest.json'),
        tokens: read('../botsales-kit/design/tokens.json'),
        permissions: read('../botsales-kit/contracts/permission-catalog.json'),
        events: read('../botsales-kit/contracts/events.schema.json'),
    };
}

export function generate({ root = defaultRoot, check = false } = {}) {
    const bundle = loadContractBundle(root);
    const issues = validateContractBundle(bundle);
    if (issues.length) throw new Error(`Contract validation failed:\n${issues.map(item => `- ${item}`).join('\n')}`);
    const outputs = renderGenerated(bundle);
    const drift = findGeneratedDrift(outputs, root);
    if (check) {
        if (drift.length) throw new Error(`Generated output stale: ${drift.join(', ')}`);
    }
    else {
        for (const file of Object.keys(outputs)) {
            const destination = path.join(root, file);
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.writeFileSync(destination, outputs[file]);
        }
    }
    return { status: 'PASS', outputs: Object.keys(outputs).length, schemas: Object.keys(bundle.api.components.schemas).length, operations: Object.keys(bundle.api.paths).reduce((count, routePath) => count + Object.keys(bundle.api.paths[routePath]).filter(method => ['get', 'post', 'put', 'patch', 'delete'].includes(method)).length, 0), routes: bundle.routes.routes.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === generatorFile) {
    try {
        const result = generate({ check: process.argv.includes('--check') });
        console.log(JSON.stringify(result));
    }
    catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}
