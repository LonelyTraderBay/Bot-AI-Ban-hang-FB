import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const args = new Map(process.argv.slice(2).map((value, index, all) => [value, all[index + 1]]).filter(([key]) => key.startsWith('--')));
const unitLogPath = args.get('--unit-log');
const browserLogPath = args.get('--browser-log');
const roleLogPath = args.get('--role-log');
if (!unitLogPath || !browserLogPath)
    throw new Error('Usage: node tests/states/generate-route-state-roles.mjs --unit-log <path> --browser-log <path> [--role-log <path>]');

const routeManifest = JSON.parse(fs.readFileSync(path.join(root, 'botsales-kit/contracts/route-manifest.json'), 'utf8'));
const permissionCatalog = JSON.parse(fs.readFileSync(path.join(root, 'botsales-kit/contracts/permission-catalog.json'), 'utf8'));
const operationIndex = JSON.parse(fs.readFileSync(path.join(root, 'packages/contracts/src/operations.json'), 'utf8'));
const unitLog = fs.readFileSync(path.resolve(root, unitLogPath), 'utf8');
const browserLog = fs.readFileSync(path.resolve(root, browserLogPath), 'utf8');
const roleLog = roleLogPath ? fs.readFileSync(path.resolve(root, roleLogPath), 'utf8') : '';
const hash = content => crypto.createHash('sha256').update(content).digest('hex');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const shopRoutes = routeManifest.routes.filter(route => route.path.startsWith('/s/'));
const roleMatrixMatch = roleLog.match(/ROUTE_ROLE_MATRIX_CASES=(\d+) ROLES=(\d+) PRIVATE_ROUTES=(\d+) RESULT=PASS/);
const roleMatrixExpected = shopRoutes.length * Object.keys(permissionCatalog.rolePresets).length;
const roleMatrixPassed = Boolean(roleMatrixMatch && Number(roleMatrixMatch[1]) === roleMatrixExpected && Number(roleMatrixMatch[2]) === Object.keys(permissionCatalog.rolePresets).length && Number(roleMatrixMatch[3]) === shopRoutes.length);
const deniedRoleRouteIds = shopRoutes.filter(route => route.readPermission && Object.values(permissionCatalog.rolePresets).some(permissions => !permissions.includes(route.readPermission))).map(route => route.id);
const emptyTableRouteIds = ['R07', 'R09', 'R12', 'R17', 'R21', 'R39', 'R44', 'R48', 'R50'];
const testCases = [
    { id: 'loading', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'renders a bounded loading state and does not show success content before data arrives', states: ['loading'] },
    { id: 'empty', source: 'apps/web/tests/components.test.tsx', title: 'keeps status and empty states understandable without relying on color', states: ['empty'] },
    { id: 'error-retry', source: 'apps/web/tests/components.test.tsx', title: 'shows a reserved loading state and a retryable error state', states: ['error'] },
    { id: 'forbidden', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'shows forbidden as an access state without offering a meaningless retry', states: ['forbidden'] },
    { id: 'stale-refetch', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'keeps the loaded data visible after a failed refetch and identifies it as potentially stale', states: ['stale_or_offline'] },
    { id: 'unknown-result', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'keeps an unknown mutation outcome distinct and includes the reconciliation command ID', states: ['command_unknown'] },
    { id: 'capability-unavailable', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'exposes partial data and unavailable capability as explicit, accessible states', states: ['capability_unavailable'] },
    { id: 'partial-data', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'exposes partial data and unavailable capability as explicit, accessible states', states: ['partial'] },
    { id: 'validation-422', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'maps 422 errors to a field, focuses it, and preserves the user input', states: ['field_validation_422'] },
    { id: 'conflict-412', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'presents HTTP 412 with an actionable Vietnamese state', states: ['conflict_412'] },
    { id: 'missing-version-428', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'presents HTTP 428 with an actionable Vietnamese state', states: ['missing_version_428'] },
    { id: 'not-found-404', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'presents HTTP 404 with an actionable Vietnamese state', states: ['not_found'] },
    { id: 'translation-keys', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'has a complete Vietnamese translation for every registered common and feature UI key', states: ['translation_keys'] },
    { id: 'dialog-draft-guard', source: 'tests/states/fe023.spec.ts', title: 'a dirty dialog keeps the form value until the user confirms discard', states: ['dialog_dirty_draft'] },
    { id: 'delayed-and-retry', source: 'tests/states/fe023.spec.ts', title: 'delayed requests show loading and failed refresh keeps a retry path', states: ['loading', 'error'], routeSpecific: true, routeIds: ['R09', 'R40'], routeStates: { loading: ['R09'], error: ['R40'] } },
    { id: 'all-route-smoke', source: 'tests/frontend.spec.ts', title: 'all canonical routes render inside the real React demo application', states: ['success'], routeSpecific: true },
    { id: 'route-error-composition', source: 'tests/states/route-error-composition.spec.ts', title: 'every shop route composes the shared API error state with its page content', states: ['error'], routeSpecific: true, routeIds: shopRoutes.filter(route => route.id !== 'R33').map(route => route.id) },
    { id: 'route-forbidden-composition', source: 'tests/route-role-matrix.spec.ts', title: 'route read access matches canonical permissions for every demo role', states: ['forbidden'], routeSpecific: true, routeIds: deniedRoleRouteIds },
    { id: 'empty-list-composition', source: 'tests/states/route-empty-composition.spec.ts', title: 'empty collection responses render accessible empty states on canonical list routes', states: ['empty'], routeSpecific: true, routeIds: emptyTableRouteIds },
    { id: 'viewer-forbidden-route', source: 'tests/frontend.spec.ts', title: 'role changes remove restricted navigation and the route guard explains denied access', states: [] },
];

const results = testCases.map(test => {
    const output = test.source.startsWith('apps/web/tests/states/') || test.source.startsWith('apps/web/tests/components.') ? unitLog : browserLog;
    const suiteFailed = output === unitLog ? /Test Files\s+\d+ failed|Tests\s+\d+ failed/.test(output) : /\b\d+ failed\b/i.test(output);
    return { ...test, result: output.includes(test.title) && !suiteFailed ? 'PASS' : 'NOT_OBSERVED' };
});
const missingRequired = results.filter(test => ['loading', 'empty', 'error-retry', 'forbidden', 'stale-refetch', 'unknown-result', 'capability-unavailable', 'validation-422', 'conflict-412', 'missing-version-428', 'not-found-404', 'translation-keys', 'dialog-draft-guard', 'delayed-and-retry', 'all-route-smoke', 'route-error-composition', 'route-forbidden-composition', 'empty-list-composition'].includes(test.id) && test.result !== 'PASS');
if (missingRequired.length)
    throw new Error(`Required test result not found: ${missingRequired.map(test => test.id).join(', ')}`);

const roles = Object.keys(permissionCatalog.rolePresets);
const routeRoles = routeManifest.routes.map(route => {
    const access = Object.fromEntries(roles.map(role => [role, route.readPermission === null ? 'PUBLIC' : permissionCatalog.rolePresets[role].includes(route.readPermission) ? 'ALLOWED_BY_CATALOG' : 'DENIED_BY_CATALOG']));
    const roleEvidence = Object.fromEntries(roles.map(role => [role, 'NOT_TESTED_FOR_THIS_ROUTE']));
    if (route.path !== '/login' && results.find(test => test.id === 'all-route-smoke')?.result === 'PASS')
        roleEvidence.owner = 'ROUTE_MOUNT_SMOKE_ONLY';
    if (route.path === '/s/:shopId/finance/profit-loss' && results.find(test => test.id === 'viewer-forbidden-route')?.result === 'PASS')
        roleEvidence.viewer = 'FORBIDDEN_ROUTE_GUARD_TESTED';
    if (roleMatrixPassed && route.path.startsWith('/s/'))
        for (const role of roles) roleEvidence[role] = 'ROUTE_READ_PERMISSION_BROWSER_MATRIX_TESTED';
    const stateCoverage = Object.fromEntries(route.states.map(state => {
        const readOperations = route.readOperations.filter(operation => !['getSession', 'getCsrfToken'].includes(operation));
        const returnsList = route.readOperations.some(operation => operationIndex[operation]?.responseSchema?.endsWith('ListResponse'));
        const hasCommandAction = route.actions.some(action => operationIndex[action.operationId]?.responseSchema === 'CommandResponse');
        const notApplicableReason = state === 'forbidden' && !deniedRoleRouteIds.includes(route.id)
            ? 'Canonical permission catalog grants every demo role route-read access.'
            : state === 'error' && route.id === 'R33'
                ? 'Shop settings uses the shop snapshot already owned and cached by the shared Shell.'
                : state === 'empty' && !returnsList
                    ? 'This route has no collection response to render as an empty list.'
                    : state === 'loading' && !readOperations.length
                        ? 'This route has no route-owned read operation to delay.'
                        : state === 'stale_or_offline' && !readOperations.length
                            ? 'This route has no route-owned server data to retain as stale.'
                            : state === 'command_unknown' && !hasCommandAction
                                ? 'This route has no command response that can become unknown.'
                                : state === 'capability_unavailable' && !route.actions.length
                                    ? 'This route exposes no write/action capability.'
                                    : undefined;
        if (notApplicableReason)
            return [state, { result: 'NOT_APPLICABLE', evidence: [notApplicableReason], routeSpecificBehavior: 'NOT_APPLICABLE_BY_ROUTE_CONTRACT' }];
        const matching = results.filter(test => test.result === 'PASS' && test.states.includes(state) && (!test.routeIds || test.routeIds.includes(route.id)) && (!test.routeStates?.[state] || test.routeStates[state].includes(route.id)));
        const routeSpecific = matching.filter(test => test.routeSpecific);
        const shared = matching.filter(test => !test.routeSpecific);
        const evidence = [...routeSpecific, ...shared].map(test => `${test.source}#${test.id}`);
        const result = routeSpecific.length ? 'ROUTE_SPECIFIC_TESTED' : shared.length ? 'SHARED_UI_TESTED' : 'NOT_TESTED';
        return [state, { result, evidence, routeSpecificBehavior: routeSpecific.length ? 'ASSERTED' : 'NOT_CLAIMED' }];
    }));
    return { id: route.id, path: route.path, title: route.title, readPermission: route.readPermission, access, roleEvidence, states: stateCoverage };
});
const routeSuccessCount = routeRoles.filter(route => route.states.success?.result === 'ROUTE_SPECIFIC_TESTED').length;
const routeEmptyCount = routeRoles.filter(route => route.states.empty?.result === 'ROUTE_SPECIFIC_TESTED').length;
const routeSpecificStateCells = routeRoles.reduce((count, route) => count + Object.values(route.states).filter(state => state.result === 'ROUTE_SPECIFIC_TESTED').length, 0);
const globalStates = results.filter(test => test.states.length).map(test => ({ id: test.id, source: test.source, title: test.title, states: test.states, result: test.result }));
const output = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    sourceOfTruth: ['botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/permission-catalog.json'],
    inputs: [
        { path: relative(path.resolve(root, unitLogPath)), sha256: hash(unitLog) },
        { path: relative(path.resolve(root, browserLogPath)), sha256: hash(browserLog) },
        ...(roleLogPath ? [{ path: relative(path.resolve(root, roleLogPath)), sha256: hash(roleLog) }] : []),
    ],
    summary: {
        routes: routeRoles.length,
        roles: roles.length,
        canonicalRouteStates: [...new Set(routeManifest.routes.flatMap(route => route.states))],
        passingGlobalStateCases: globalStates.filter(test => test.result === 'PASS').length,
        routeMountSmoke: results.find(test => test.id === 'all-route-smoke')?.result || 'NOT_OBSERVED',
        routeSuccessComposition: results.find(test => test.id === 'all-route-smoke')?.result || 'NOT_OBSERVED',
        routeSpecificSuccessRoutes: routeSuccessCount,
        routeEmptyComposition: results.find(test => test.id === 'empty-list-composition')?.result || 'NOT_OBSERVED',
        routeSpecificEmptyRoutes: routeEmptyCount,
        routeSpecificStateCells,
        observedDeniedRouteRoleCase: results.find(test => test.id === 'viewer-forbidden-route')?.result === 'PASS' ? 'viewer@R22' : 'NONE',
        routeRoleBrowserMatrix: roleMatrixPassed ? 'PASS' : 'INCOMPLETE',
        passedRouteRoleCases: roleMatrixPassed ? Number(roleMatrixMatch[1]) : 0,
    },
    globalStateCases: globalStates,
    routes: routeRoles,
    limits: [
        'SHARED_UI_TESTED validates the common state component; it does not prove every route composes the state correctly.',
        'Role access expectations come from the canonical permission catalog; roleEvidence names browser observations when route-role matrix evidence is supplied.',
        'Route mount smoke verifies rendering/navigation shell only; backend authorization and provider behavior are outside this synthetic frontend scope.',
    ],
};
const outputPath = path.join(root, 'docs/route-state-role-matrix.json');
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${relative(outputPath)} — ${routeRoles.length} routes × ${roles.length} roles; ${globalStates.filter(test => test.result === 'PASS').length} shared state cases evidenced.`);
