import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const operationalRoutes = new Set(['GET /health/live', 'GET /health/ready']);

export function checkRegistration(source, scope, registrations, workspace) {
    const issues = [];
    const declared = new Set();
    const enabled = scope.operations ?? [];
    if (!source.taskIds.has(scope.milestone)) issues.push('Unknown milestone: ' + scope.milestone);
    if (!Array.isArray(scope.operations)) return ['Enabled operations must be an array'];

    for (const { id, cases } of enabled) {
        if (declared.has(id)) issues.push('Duplicate enabled operation: ' + id);
        declared.add(id);
        if (!source.operations.has(id)) issues.push('Enabled operation missing from OpenAPI: ' + id);
        if (!Array.isArray(cases) || !cases.length) {
            issues.push('Enabled operation has no executable case: ' + id);
            continue;
        }
        for (const entry of cases) {
            if (!source.caseIds.has(entry.id)) issues.push(id + ': unknown verification case ' + entry.id);
            if (!/^tests\/[a-zA-Z0-9._-]+\.test\.mjs$/.test(entry.file) || !existsSync(resolve(workspace, entry.file))) {
                issues.push(id + ': missing test file for ' + entry.id);
            }
        }
    }

    const routes = new Set();
    const operations = new Set();
    for (const { method, path, operationId, handler } of registrations) {
        const route = method + ' ' + path;
        if (routes.has(route)) issues.push('Duplicate HTTP registration: ' + route);
        routes.add(route);
        if (!operationId) {
            if (!operationalRoutes.has(route)) issues.push(handler + ': missing ContractOperation on ' + route);
            continue;
        }
        if (operations.has(operationId)) issues.push('Duplicate operation registration: ' + operationId);
        operations.add(operationId);
        if (!declared.has(operationId)) issues.push('Registered operation outside enabled scope: ' + operationId);
        const op = source.operations.get(operationId);
        if (!op) issues.push('Registered operation missing from OpenAPI: ' + operationId);
        else if (op.method !== method || op.path !== path) {
            issues.push(operationId + ': expected ' + op.method + ' ' + op.path + ', got ' + route);
        }
    }
    for (const route of operationalRoutes) {
        if (!registrations.some(r => !r.operationId && r.method + ' ' + r.path === route)) {
            issues.push('Missing operational route: ' + route);
        }
    }
    for (const operation of declared) if (!operations.has(operation)) issues.push('Missing HTTP registration: ' + operation);
    return issues;
}
