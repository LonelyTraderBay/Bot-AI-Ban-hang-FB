import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePaths = {
    openapi: 'contracts/openapi.json',
    index: 'contracts/operation-index.json',
    routes: 'contracts/route-manifest.json',
    features: 'contracts/feature-catalog.json',
    permissions: 'contracts/permission-catalog.json',
    events: 'contracts/events.schema.json',
    migration: 'contracts/migration-map.json',
    coreCases: 'fixtures/core-acceptance-scenarios.json',
    featureCases: 'fixtures/acceptance-scenarios.json',
};
const httpMethods = new Set(['get', 'head', 'post', 'put', 'delete', 'patch', 'options', 'trace']);
const inline = cell => [...cell.matchAll(/\x60([^\x60]+)\x60/g)].map(match => match[1]);
const first = cell => inline(cell)[0];
const beId = cell => /\[(BE-\d{2})\]/.exec(cell)?.[1];
const routeId = cell => cell.split(' ')[0];

function section(plan, heading) {
    const lines = plan.split(/\r?\n/);
    const start = lines.indexOf(heading);
    if (start < 0) throw new Error('Missing plan section: ' + heading);
    const level = heading.indexOf(' ');
    const next = lines.findIndex((line, index) => index > start && /^#{1,6} /.test(line) && line.indexOf(' ') <= level);
    return lines.slice(start + 1, next < 0 ? undefined : next).join('\n');
}

function table(plan, heading, rowPattern) {
    return section(plan, heading).split('\n').filter(line => rowPattern.test(line))
        .map(line => line.trim().slice(2, -2).split(/(?<!\\) \| /));
}

export function readInputs(repository) {
    const hashes = {};
    const sources = {};
    for (const [name, path] of Object.entries(sourcePaths)) {
        const bytes = readFileSync(resolve(repository, 'botsales-kit', path));
        hashes[path] = createHash('sha256').update(bytes).digest('hex');
        sources[name] = JSON.parse(bytes);
    }
    return { sources, hashes, plan: readFileSync(resolve(repository, 'BotSalesAI_Backend/BACKEND_PLAN.md'), 'utf8') };
}

export function checkSource({ sources, hashes, plan }) {
    const issues = [];
    const knownGaps = [];
    const check = (condition, message) => { if (!condition) issues.push(message); };
    const same = (actual, expected, label) =>
        check(JSON.stringify(actual) === JSON.stringify(expected), label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));

    function indexed(rows, idOf, label) {
        const result = new Map();
        for (const row of rows) {
            const id = idOf(row);
            if (result.has(id)) issues.push(label + ': duplicate ' + id);
            result.set(id, row);
        }
        return result;
    }

    function compareIds(actual, expected, label) {
        for (const id of expected.keys()) if (!actual.has(id)) issues.push(label + ': missing ' + id);
        for (const id of actual.keys()) if (!expected.has(id)) issues.push(label + ': unexpected ' + id);
    }

    const baseline = /Ghim baseline tại commit \x60([0-9a-f]{40})\x60\./.exec(plan)?.[1] ?? null;
    check(baseline !== null, 'Missing exact contract baseline SHA in the plan');
    const fingerprintRows = table(plan, '### Dấu vân tay nguồn', /^\| \[/);
    const fingerprints = indexed(fingerprintRows, row => /\(\.\.\/botsales-kit\/([^)]+)\)/.exec(row[0])?.[1], 'source fingerprints');
    const expectedHashes = new Map(Object.values(sourcePaths).map(file => [file, hashes[file]]));
    compareIds(fingerprints, expectedHashes, 'source fingerprints');
    for (const [file, digest] of expectedHashes) {
        const row = fingerprints.get(file);
        if (row) same(first(row[2] ?? ''), digest, 'SHA-256 ' + file);
    }

    const taskRows = table(plan, '## Bảng theo dõi', /^\| \[BE-/);
    const tasks = indexed(taskRows, row => beId(row[0]), 'plan tasks');
    const seen = new Set();
    let priority = 'P0';
    for (const [cell, tier, dependencies] of taskRows) {
        const id = beId(cell);
        check(/^P[0-3]$/.test(tier) && tier >= priority, id + ': invalid priority order');
        priority = tier;
        for (const dependency of dependencies.match(/BE-\d{2}/g) ?? []) {
            check(seen.has(dependency), id + ': unknown or later dependency ' + dependency);
        }
        seen.add(id);
    }
    same([...plan.matchAll(/^### (BE-\d{2})\r?$/gm)].map(match => match[1]), [...tasks.keys()], 'task sections and order');
    const hasOwner = (cell, label) => check(tasks.has(beId(cell)), label + ': unknown BE owner ' + cell);

    const canonicalOps = [...Object.entries(sources.openapi.paths)].flatMap(([path, item]) =>
        Object.entries(item).filter(([method]) => httpMethods.has(method)).map(([method, op]) => ({
            id: op.operationId, path, method: method.toUpperCase(), permission: op['x-permission'] ?? null, module: op.tags?.[0], op,
        })));
    const operations = indexed(canonicalOps, item => item.id, 'OpenAPI operations');
    check(canonicalOps.every(op => typeof op.id === 'string' && op.id), 'OpenAPI has an HTTP operation without operationId');
    const index = indexed(sources.index.operations, item => item.operationId, 'operation index');
    compareIds(index, operations, 'operation index');

    const canonicalRoutes = indexed(sources.routes.routes, route => route.id, 'route manifest');
    const routes = indexed(table(plan, '### Toàn bộ màn hình', /^\| R\d{2} /), row => routeId(row[0]), 'screen matrix');
    compareIds(routes, canonicalRoutes, 'screen matrix');
    const canonicalModules = new Set(sources.routes.routes.map(route => route.module));
    const modules = indexed(table(plan, '## Kiểm chứng theo module', /^\| \x60/), row => first(row[0]), 'module matrix');
    compareIds(modules, new Map([...canonicalModules].map(name => [name, null])), 'module matrix');

    const cases = indexed([...sources.coreCases.scenarios, ...sources.featureCases.scenarios], row => row.id, 'acceptance scenarios');
    const canonicalPermissions = indexed(sources.permissions.permissions, item => item.id, 'permission catalog');
    const consumers = new Map();
    const globalOperations = new Set(sources.routes.globalOperations);
    for (const id of globalOperations) check(operations.has(id), 'global operation is unknown: ' + id);
    const unknownScenarios = [];
    for (const [id, route] of canonicalRoutes) {
        const row = routes.get(id);
        if (!row) continue;
        const [, module, owner, reads, writes, extra, scenarios] = row;
        hasOwner(owner, id);
        same(inline(module), [route.module], id + ' module');
        same(inline(reads), route.readOperations, id + ' bootstrap reads');
        same(inline(writes), route.actions.map(action => action.operationId).filter(Boolean), id + ' actions');
        same(inline(scenarios), route.acceptanceScenarioIds, id + ' scenario IDs');
        check(!route.readPermission || canonicalPermissions.has(route.readPermission), id + ': unknown screen permission ' + route.readPermission);
        for (const action of route.actions) {
            check(!action.permission || canonicalPermissions.has(action.permission), id + ': unknown action permission ' + action.permission);
        }
        for (const scenarioId of route.acceptanceScenarioIds) if (!cases.has(scenarioId)) unknownScenarios.push(id + '/' + scenarioId);
        for (const op of new Set([...inline(reads), ...inline(writes), ...inline(extra)])) {
            check(operations.has(op), id + ': unknown operation ' + op);
            const refs = consumers.get(op) ?? [];
            refs.push(id);
            consumers.set(op, refs);
        }
        if (id === 'R19' && route.behavior.includes('listPromotions')) {
            check(inline(extra).includes('listPromotions') && !inline(reads).includes('listPromotions'),
                'R19: listPromotions is a conditional lookup when opening the edit form');
        }
    }
    for (const gap of unknownScenarios) issues.push('Untracked acceptance gap: ' + gap);

    const features = indexed(sources.features.features, item => item.id, 'feature catalog');
    const featureRows = indexed(table(plan, '### Toàn bộ tính năng', /^\| [A-H]\d{2} /), row => routeId(row[0]), 'feature matrix');
    compareIds(featureRows, features, 'feature matrix');
    const featureCases = new Map();
    for (const [id, feature] of features) {
        const row = featureRows.get(id);
        if (!row) continue;
        const [, owner, linkedRoutes, scenario, result] = row;
        hasOwner(owner, id);
        check(Boolean(result), id + ': missing acceptance criterion');
        same(linkedRoutes.split(', '), [...new Set(feature.routeIds)], id + ' routes');
        same(inline(scenario), [feature.scenarioId], id + ' feature scenario');
        check(cases.has(feature.scenarioId), id + ': missing canonical scenario ' + feature.scenarioId);
        featureCases.set(feature.scenarioId, true);
    }
    const supplements = indexed(table(plan, '### Ca kiểm bổ sung theo hợp đồng', /^\| \x60SC2-/), row => first(row[0]), 'supplemental scenarios');
    for (const [id, row] of supplements) {
        hasOwner(row[1], id);
        check(!featureCases.has(id), 'Scenario is directly mapped and supplemental: ' + id);
        featureCases.set(id, true);
    }
    compareIds(featureCases, new Map(sources.featureCases.scenarios.map(item => [item.id, item])), 'feature scenario coverage');

    const apiRows = indexed(table(plan, '### Toàn bộ thao tác API', /^\| \x60/), row => first(row[0]), 'API matrix');
    compareIds(apiRows, operations, 'API matrix');
    for (const [id, op] of operations) {
        const indexRow = index.get(id);
        if (indexRow) same([indexRow.method, indexRow.path, indexRow.permission, indexRow.module],
            [op.method, op.path, op.permission, op.module], id + ' index method/path, permission and module');
        const row = apiRows.get(id);
        if (!row) continue;
        const [, http, owner, permission, headers, status, usedBy] = row;
        hasOwner(owner, id);
        check(op.permission === null || canonicalPermissions.has(op.permission), id + ': unknown OpenAPI permission');
        same(inline(http), [op.method + ' ' + op.path], id + ' method/path');
        same(inline(permission), op.permission ? [op.permission] : [], id + ' permission');
        const requiredHeaders = [['CSRF', 'CSRF'], ['Idempotency', 'IK'], ['IfMatch', 'Ver']]
            .filter(([name]) => op.op.parameters?.some(item => item.$ref === '#/components/parameters/' + name
                && sources.openapi.components.parameters[name].required)).map(([, label]) => label);
        same(headers, requiredHeaders.join(', ') || '—', id + ' required headers');
        same(status, Object.keys(op.op.responses).filter(code => /^[23]\d\d$/.test(code)).join(', '), id + ' success status');
        const expectedConsumers = [...(consumers.get(id) ?? []), ...(globalOperations.has(id) ? ['Global'] : [])];
        same(usedBy, expectedConsumers.join(', ') || '—', id + ' consumers');
    }

    const permissions = indexed(table(plan, '### Danh mục quyền', /^\| \x60/), row => first(row[0]), 'permission matrix');
    compareIds(permissions, canonicalPermissions, 'permission matrix');
    for (const [id, row] of permissions) {
        for (const [column, catalog] of [[1, sources.permissions.rolePresets], [2, sources.permissions.agentRoles]]) {
            same(inline(row[column]), Object.keys(catalog).filter(key => catalog[key].includes(id)), id + ' permission presets');
        }
    }

    const eventTypes = sources.events.properties.type.enum;
    const events = indexed(table(plan, '### Danh mục sự kiện', /^\| \x60/), row => first(row[0]), 'event matrix');
    compareIds(events, new Map(eventTypes.map(name => [name, null])), 'event matrix');
    for (const [id, row] of events) hasOwner(row[1], id);
    for (const duplicate of eventTypes.filter((id, index) => eventTypes.indexOf(id) !== index)) {
        if (duplicate === 'journal.updated' && eventTypes.filter(id => id === duplicate).length === 2
            && plan.split(/\r?\n/).some(line => line.includes('| BE-10,') && line.includes('Enum nguồn có \x60journal.updated\x60 lặp'))) {
            knownGaps.push({ id: duplicate, owner: 'BE-10', detail: 'The canonical enum declares this event twice' });
        } else issues.push('Untracked duplicate event: ' + duplicate);
    }

    return {
        baseline,
        openapiSha256: hashes[sourcePaths.openapi],
        apiBase: sources.openapi.servers[0].url,
        operations,
        taskIds: new Set(tasks.keys()),
        caseIds: new Set([...cases.keys(), ...[...plan.matchAll(/^\| (P0-\d{2}) \|/gm)].map(match => match[1])]),
        knownGaps,
        issues,
        counts: {
            sourceFingerprints: expectedHashes.size, tasks: tasks.size, modules: canonicalModules.size, screens: canonicalRoutes.size,
            operations: operations.size, schemas: Object.keys(sources.openapi.components.schemas).length, features: features.size,
            scenarios: cases.size, permissions: permissions.size, events: events.size,
        },
    };
}
