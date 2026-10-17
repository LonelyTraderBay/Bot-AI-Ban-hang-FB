import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = new Map(process.argv.slice(2).map((value, index, all) => [value, all[index + 1]]).filter(([key]) => key.startsWith('--')));
const unitLogPaths = (args.get('--unit-logs') || args.get('--unit-log') || '').split('|').filter(Boolean);
const browserLogPaths = (args.get('--browser-logs') || args.get('--browser-log') || '').split('|').filter(Boolean);
const viewportLogPath = args.get('--viewport-log');
const roleStateLogPaths = (args.get('--role-state-logs') || args.get('--role-state-log') || '').split('|').filter(Boolean);
const commandUnknownLogPaths = (args.get('--command-unknown-logs') || args.get('--command-unknown-log') || '').split('|').filter(Boolean);
const loadingLogPaths = (args.get('--loading-logs') || args.get('--loading-log') || '').split('|').filter(Boolean);
const roleLogPath = args.get('--role-log');
const capabilityLogPath = args.get('--capability-log');
if (unitLogPaths.length === 0 || browserLogPaths.length === 0 || !viewportLogPath || roleStateLogPaths.length === 0 || commandUnknownLogPaths.length === 0 || loadingLogPaths.length === 0 || !capabilityLogPath)
    throw new Error('Usage: node tests/states/generate-route-state-roles.mjs --unit-logs <path|path> --browser-logs <path|path> --viewport-log <path> --role-state-logs <path|path> --command-unknown-logs <path|path> --loading-logs <path|path> --capability-log <path> [--role-log <path>]');

const routeManifest = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/route-manifest.json'), 'utf8'));
const permissionCatalog = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/permission-catalog.json'), 'utf8'));
const operationIndex = JSON.parse(fs.readFileSync(path.join(root, 'packages/contracts/src/operations.json'), 'utf8'));
const unitLogSources = unitLogPaths.map(file => ({ path: path.resolve(root, file), contents: fs.readFileSync(path.resolve(root, file), 'utf8') }));
const unitLog = unitLogSources.map(source => source.contents).join('\n');
const browserLogSources = browserLogPaths.map(file => ({ path: path.resolve(root, file), contents: fs.readFileSync(path.resolve(root, file), 'utf8') }));
const browserLog = browserLogSources.map(source => source.contents).join('\n');
const viewportLog = fs.readFileSync(path.resolve(root, viewportLogPath), 'utf8');
const roleStateLogSources = roleStateLogPaths.map(file => ({ path: path.resolve(root, file), contents: fs.readFileSync(path.resolve(root, file), 'utf8') }));
const roleStateLog = roleStateLogSources.map(source => source.contents).join('\n');
const commandUnknownLogSources = commandUnknownLogPaths.map(file => ({ path: path.resolve(root, file), contents: fs.readFileSync(path.resolve(root, file), 'utf8') }));
const commandUnknownLog = commandUnknownLogSources.map(source => source.contents).join('\n');
const loadingLogSources = loadingLogPaths.map(file => ({ path: path.resolve(root, file), contents: fs.readFileSync(path.resolve(root, file), 'utf8') }));
const loadingLog = loadingLogSources.map(source => source.contents).join('\n');
const roleLog = roleLogPath ? fs.readFileSync(path.resolve(root, roleLogPath), 'utf8') : '';
const capabilityLog = fs.readFileSync(path.resolve(root, capabilityLogPath), 'utf8');
const hash = content => crypto.createHash('sha256').update(content).digest('hex');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const uniqueMatchesAcrossLogs = (sources, pattern, keyCaptureIndexes, label) => {
    const records = new Map();
    const seenWithinSource = new Set();
    sources.forEach((source, sourceIndex) => {
        const sourcePattern = new RegExp(pattern.source, pattern.flags);
        for (const match of source.contents.matchAll(sourcePattern)) {
            const key = keyCaptureIndexes.map(index => match[index]).join('|');
            const sourceKey = `${sourceIndex}|${key}`;
            if (seenWithinSource.has(sourceKey)) throw new Error(`Duplicate ${label} observation in ${source.path}: ${key}`);
            seenWithinSource.add(sourceKey);
            if (!records.has(key)) records.set(key, match);
        }
    });
    return [...records.values()];
};
const exitReceiptPath = file => {
    const candidates = [`${file}.exit`, file.endsWith('.log') ? `${file.slice(0, -4)}.exit` : null].filter(Boolean);
    return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
};
const exitCode = file => {
    const receipt = exitReceiptPath(file);
    return receipt ? fs.readFileSync(receipt, 'utf8').trim() : null;
};
const hasSuccessfulExit = file => exitCode(file) === '0';
const shopRoutes = routeManifest.routes.filter(route => route.path.startsWith('/s/'));
const noSeedJobRouteIds = new Set(['R14', 'R36']);
const capabilityActionIds = new Set(['runPlayground']);
const roleMatrixExpected = shopRoutes.length * Object.keys(permissionCatalog.rolePresets).length;
const failedCount = output => Number(output.match(/\b(\d+) failed\b/i)?.[1] || 0);
const unitSuitePassed = unitLogSources.every(source => failedCount(source.contents) === 0 && hasSuccessfulExit(source.path));
const browserProjects = Object.fromEntries([...`${roleLog}\n${roleStateLog}`.matchAll(/BROWSER=(chromium|firefox) VERSION=([^\s]+)/g)].map(match => [match[1], match[2]]));
const requiredBrowserProjects = ['chromium', 'firefox'];
const browserSuitePassed = failedCount(browserLog) === 0
    && browserLogSources.every(source => /\b\d+ passed\s+\([^)]+\)/.test(source.contents)
        && hasSuccessfulExit(source.path));
const sameRouteIds = (actual, expected) => actual.length === expected.length
    && new Set(actual).size === expected.length
    && expected.every(id => actual.includes(id));
const canonicalRouteIds = routeManifest.routes.map(route => route.id);
const requiredViewports = [
    { name: 'small', width: 390, height: 844 },
    { name: 'large', width: 1440, height: 900 },
];
const geometryRecords = [...viewportLog.matchAll(/\[w28-route-geometry\]\s+(\{[^\r\n]+\})/g)].map(match => JSON.parse(match[1]));
const viewportMatches = geometryRecords.flatMap(record => {
    const reportPath = path.resolve(root, record.evidence);
    if (!fs.existsSync(reportPath)) return [];
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    return [{ browser: record.browser, width: report.viewport.width, height: report.viewport.height,
        cases: report.renderedRoutes, ids: report.observations.map(observation => observation.routeId),
        issues: report.issues, pageErrors: report.pageErrors }];
});
const routeViewportPassed = geometryRecords.length === requiredBrowserProjects.length * requiredViewports.length
    && viewportMatches.length === geometryRecords.length
    && failedCount(viewportLog) === 0
    && /\b4 passed\s+\([^)]+\)/.test(viewportLog)
    && requiredBrowserProjects.every(project => requiredViewports.every(viewport => viewportMatches.some(match => match.browser === project
        && match.width === viewport.width
        && match.height === viewport.height
        && match.cases === canonicalRouteIds.length
        && sameRouteIds(match.ids, canonicalRouteIds)
        && match.issues.length === 0
        && match.pageErrors.length === 0)));
const routeSmokeBaselinePassed = browserSuitePassed && routeViewportPassed && routeManifest.routes.some(route => route.path === '/login');
const routeSmokePassed = browserSuitePassed && routeViewportPassed;
const emptyCollectionRouteIds = shopRoutes
    .filter(route => route.readOperations.some(operation => operationIndex[operation]?.responseSchema?.endsWith('ListResponse')))
    .map(route => route.id);
const roleMatrixMatches = [...roleLog.matchAll(/ROUTE_ROLE_MATRIX_CASES=(\d+) ROLES=(\d+) PRIVATE_ROUTES=(\d+) RESULT=PASS/g)];
const roleMatrixPassed = browserSuitePassed
    && failedCount(roleLog) === 0
    && /\b\d+ passed\s+\([^)]+\)/.test(roleLog)
    && roleLogPath
    && hasSuccessfulExit(path.resolve(root, roleLogPath))
    && requiredBrowserProjects.every(project => browserProjects[project])
    && roleMatrixMatches.length === requiredBrowserProjects.length
    && roleMatrixMatches.every(match => Number(match[1]) === roleMatrixExpected
        && Number(match[2]) === Object.keys(permissionCatalog.rolePresets).length
        && Number(match[3]) === shopRoutes.length);
const roleStateExpectedPairs = { success: [], error: [], empty: [], stale_or_offline: [] };
const commandUnknownExpectedPairs = [];
const roleSuccessNotApplicablePairs = [];
const roleStaleNotApplicablePairs = [];
for (const role of Object.keys(permissionCatalog.rolePresets)) {
    for (const route of shopRoutes) {
        const canRead = route.readPermission === null || permissionCatalog.rolePresets[role].includes(route.readPermission);
        if (!canRead) continue;
        if (route.actions.some(action => (!action.permission || permissionCatalog.rolePresets[role].includes(action.permission))
            && operationIndex[action.operationId]?.responseSchema === 'CommandResponse'))
            commandUnknownExpectedPairs.push(`${role}@${route.id}`);
        if (noSeedJobRouteIds.has(route.id)) roleSuccessNotApplicablePairs.push(`${role}@${route.id}`);
        else roleStateExpectedPairs.success.push(`${role}@${route.id}`);
        if (route.id !== 'R33') roleStateExpectedPairs.error.push(`${role}@${route.id}`);
        if (emptyCollectionRouteIds.includes(route.id))
            roleStateExpectedPairs.empty.push(`${role}@${route.id}`);
        if (route.id === 'R33' || noSeedJobRouteIds.has(route.id))
            roleStaleNotApplicablePairs.push(`${role}@${route.id}`);
        else if (route.readOperations.some(operation => !['getSession', 'getCsrfToken'].includes(operation)))
            roleStateExpectedPairs.stale_or_offline.push(`${role}@${route.id}`);
    }
}
const commandUnknownMatches = uniqueMatchesAcrossLogs(commandUnknownLogSources,
    /BROWSER=(chromium|firefox) ROLE_STATE=command_unknown ROLE=([a-z_]+) ROUTE=(R\d+) OPERATION=([A-Za-z0-9_]+) RESULT=PASS/g,
    [1, 2, 3, 4], 'route-role command unknown');
const commandUnknownShellMatches = uniqueMatchesAcrossLogs(commandUnknownLogSources,
    /BROWSER=(chromium|firefox) ROLE_STATE=command_unknown_shell ROLE=([a-z_]+) ROUTE=(R\d+) OPERATION=([A-Za-z0-9_]+) RESULT=PASS/g,
    [1, 2, 3, 4], 'route-role command unknown shell');
const commandUnknownNaMatches = uniqueMatchesAcrossLogs(commandUnknownLogSources,
    /BROWSER=(chromium|firefox) ROLE_STATE_NA=command_unknown ROLE=([a-z_]+) ROUTE=(R\d+) OPERATION=([A-Za-z0-9_]+) REASON=([a-z0-9-]+) RESULT=PASS/g,
    [1, 2, 3, 4, 5], 'route-role command unknown N/A');
const validateCommandUnknownMatches = (matches, label) => {
for (const match of matches) {
    const [, browser, role, routeId, operation] = match;
    const route = shopRoutes.find(item => item.id === routeId);
    const action = route?.actions.find(item => item.operationId === operation);
    if (!requiredBrowserProjects.includes(browser) || !action || !commandUnknownExpectedPairs.includes(`${role}@${routeId}`)
        || (action.permission && !permissionCatalog.rolePresets[role]?.includes(action.permission))
        || operationIndex[operation]?.responseSchema !== 'CommandResponse')
        throw new Error(`Invalid ${label} evidence ${browser}/${role}@${routeId}/${operation}; it is not a permitted command action on this readable route.`);
}
};
validateCommandUnknownMatches(commandUnknownMatches, 'command-unknown action');
validateCommandUnknownMatches(commandUnknownShellMatches, 'command-unknown shell');
for (const match of commandUnknownNaMatches) {
    const [, browser, role, routeId, operation, reason] = match;
    const route = shopRoutes.find(item => item.id === routeId);
    const action = route?.actions.find(item => item.operationId === operation);
    if (!requiredBrowserProjects.includes(browser) || !action || !commandUnknownExpectedPairs.includes(`${role}@${routeId}`)
        || (action.permission && !permissionCatalog.rolePresets[role]?.includes(action.permission))
        || operationIndex[operation]?.responseSchema !== 'CommandResponse'
        || reason !== 'frontend-step-up-not-implemented')
        throw new Error(`Invalid route-role command-unknown N/A evidence ${browser}/${role}@${routeId}/${operation}/${reason}; the route-specific UI/security boundary is not supported by the canonical inventory.`);
}
const commandUnknownShellNaMatches = uniqueMatchesAcrossLogs(commandUnknownLogSources,
    /BROWSER=(chromium|firefox) ROLE_UNKNOWN_SHELL_NA=([a-z_]+) READABLE_ROUTES=(\d+) REASON=no-permitted-command-on-readable-routes RESULT=PASS/g,
    [1, 2], 'route-role command unknown shell N/A');
const commandUnknownNoActionRoles = Object.keys(permissionCatalog.rolePresets).filter(role =>
    !commandUnknownExpectedPairs.some(pair => pair.startsWith(`${role}@`)));
if (commandUnknownShellNaMatches.some(match => Number(match[3]) < 1
    || !commandUnknownNoActionRoles.includes(match[2])))
    throw new Error('Command-unknown shell N/A evidence does not match the canonical readable-route/action inventory.');
const commandUnknownLogSuitePassed = commandUnknownLogSources.length > 0 && commandUnknownLogSources.every(source =>
    failedCount(source.contents) === 0 && /\b\d+ passed\s+\([^)]+\)/.test(source.contents) && hasSuccessfulExit(source.path));
const commandUnknownPairPassed = pair => commandUnknownLogSuitePassed && requiredBrowserProjects.every(project =>
    commandUnknownMatches.some(match => match[1] === project && `${match[2]}@${match[3]}` === pair));
const commandUnknownNaPairPassed = pair => commandUnknownLogSuitePassed
    && !commandUnknownMatches.some(match => `${match[2]}@${match[3]}` === pair)
    && requiredBrowserProjects.every(project => commandUnknownNaMatches.filter(match => match[1] === project && `${match[2]}@${match[3]}` === pair).length === 1);
const commandUnknownTestedPairs = commandUnknownExpectedPairs.filter(commandUnknownPairPassed);
const commandUnknownNaPairs = commandUnknownExpectedPairs.filter(commandUnknownNaPairPassed);
const commandUnknownNotTestedPairs = commandUnknownExpectedPairs.filter(pair => !commandUnknownPairPassed(pair) && !commandUnknownNaPairPassed(pair));
const commandUnknownAllRequiredPassed = commandUnknownNotTestedPairs.length === 0;
const commandUnknownEvidence = pair => [...new Set(commandUnknownMatches.filter(match => `${match[2]}@${match[3]}` === pair).map(match => match[4]))];
const commandUnknownNaEvidence = pair => [...new Set(commandUnknownNaMatches.filter(match => `${match[2]}@${match[3]}` === pair).map(match => `${match[4]}:${match[5]}`))];
const commandUnknownShellPairPassed = pair => commandUnknownLogSuitePassed && requiredBrowserProjects.every(project =>
    commandUnknownShellMatches.filter(match => match[1] === project && `${match[2]}@${match[3]}` === pair).length === 1);
const commandUnknownShellTestedPairs = commandUnknownExpectedPairs.filter(commandUnknownShellPairPassed);
const commandUnknownShellNaPassed = commandUnknownLogSuitePassed
    && requiredBrowserProjects.every(project => commandUnknownNoActionRoles.every(role =>
        commandUnknownShellNaMatches.filter(match => match[1] === project && match[2] === role).length === 1))
    && commandUnknownShellNaMatches.length === commandUnknownNoActionRoles.length * requiredBrowserProjects.length;
const commandUnknownShellAllRequiredPassed = commandUnknownShellTestedPairs.length === commandUnknownExpectedPairs.length
    && commandUnknownShellNaPassed;
const commandUnknownShellEvidence = pair => [...new Set(commandUnknownShellMatches
    .filter(match => `${match[2]}@${match[3]}` === pair).map(match => match[4]))];
const roleStateMatches = uniqueMatchesAcrossLogs(roleStateLogSources, /BROWSER=(chromium|firefox) ROLE_STATE=(success|error|empty|stale_or_offline) ROLE=([a-z_]+) ROUTE=(R\d+) RESULT=PASS/g, [1, 2, 3, 4], 'route-role state');
const roleStateSuitePassed = failedCount(roleStateLog) === 0 && roleStateLogSources.every(source => /\b\d+ passed\s+\([^)]+\)/.test(source.contents)
    && hasSuccessfulExit(source.path));
const roleStatePassed = state => roleStateSuitePassed
    && roleStateMatches.filter(match => match[2] === state).length === roleStateExpectedPairs[state].length * requiredBrowserProjects.length
    && requiredBrowserProjects.every(project => roleStateExpectedPairs[state].every(pair => {
        const [role, route] = pair.split('@');
        return roleStateMatches.filter(match => match[1] === project && match[2] === state && match[3] === role && match[4] === route).length === 1;
    }));
const roleErrorStatePassed = roleStatePassed('error');
const roleEmptyStatePassed = roleStatePassed('empty');
const capabilityFaultKinds = ['budget_exceeded', 'tool_denied'];
const roleCapabilityExpectedPairs = [];
const roleCapabilityNotApplicablePairs = [];
for (const role of Object.keys(permissionCatalog.rolePresets)) {
    for (const route of shopRoutes) {
        const permissions = permissionCatalog.rolePresets[role];
        const canRead = route.readPermission === null || permissions.includes(route.readPermission);
        const canRunCapability = route.actions.some(action => capabilityActionIds.has(action.operationId)
            && (!action.permission || permissions.includes(action.permission)));
        if (canRead && canRunCapability) roleCapabilityExpectedPairs.push(`${role}@${route.id}`);
        else if (canRead) roleCapabilityNotApplicablePairs.push(`${role}@${route.id}`);
    }
}
const roleCapabilityRouteIds = [...new Set(roleCapabilityExpectedPairs.map(pair => pair.split('@')[1]))];
const roleCapabilityMatches = [...capabilityLog.matchAll(/BROWSER=(chromium|firefox) ROLE_STATE=capability_unavailable ROLE=([a-z_]+) ROUTE=(R\d+) OPERATION=([A-Za-z0-9_]+) FAULT=(budget_exceeded|tool_denied) RESULT=PASS/g)];
const roleCapabilityStatePassed = failedCount(capabilityLog) === 0
    && /\b\d+ passed\s+\([^)]+\)/.test(capabilityLog)
    && hasSuccessfulExit(path.resolve(root, capabilityLogPath))
    && roleCapabilityExpectedPairs.length > 0
    && requiredBrowserProjects.every(project => roleCapabilityExpectedPairs.every(pair => {
        const [role, route] = pair.split('@');
        return capabilityFaultKinds.every(fault => roleCapabilityMatches.filter(match => match[1] === project
            && match[2] === role && match[3] === route && match[4] === 'runPlayground' && match[5] === fault).length === 1);
    }))
    && roleCapabilityMatches.length === roleCapabilityExpectedPairs.length * requiredBrowserProjects.length * capabilityFaultKinds.length;
const roleSuccessNaMatches = uniqueMatchesAcrossLogs(roleStateLogSources, /BROWSER=(chromium|firefox) ROLE_STATE_NA=success ROLE=([a-z_]+) ROUTE=(R\d+) REASON=([a-z0-9-]+) RESULT=PASS/g, [1, 2, 3, 4], 'route-role success N/A');
const roleSuccessStatePassed = roleStatePassed('success')
    && requiredBrowserProjects.every(project => roleSuccessNotApplicablePairs.every(pair => {
        const [role, route] = pair.split('@');
        return roleSuccessNaMatches.filter(match => match[1] === project && match[2] === role && match[3] === route && match[4] === 'mock-no-resource-404').length === 1;
    }))
    && roleSuccessNaMatches.length === roleSuccessNotApplicablePairs.length * requiredBrowserProjects.length;
const roleStaleNaMatches = uniqueMatchesAcrossLogs(roleStateLogSources, /BROWSER=(chromium|firefox) ROLE_STATE_NA=stale_or_offline ROLE=([a-z_]+) ROUTE=(R\d+) REASON=([a-z0-9-]+) RESULT=PASS/g, [1, 2, 3, 4], 'route-role stale N/A');
const roleStaleStatePassed = roleStatePassed('stale_or_offline')
    && requiredBrowserProjects.every(project => roleStaleNotApplicablePairs.every(pair => {
        const [role, route] = pair.split('@');
        const expectedReason = route === 'R33' ? 'shared-shell-snapshot' : 'mock-no-resource-404';
        return roleStaleNaMatches.filter(match => match[1] === project && match[2] === role && match[3] === route && match[4] === expectedReason).length === 1;
    }))
    && roleStaleNaMatches.length === roleStaleNotApplicablePairs.length * requiredBrowserProjects.length;
const routeErrorPassed = roleErrorStatePassed;
const routeEmptyPassed = roleEmptyStatePassed;
const roleLoadingExpectedPairs = [];
const roleLoadingNotApplicablePairs = [];
for (const role of Object.keys(permissionCatalog.rolePresets)) {
    for (const route of shopRoutes) {
        const canRead = route.readPermission === null || permissionCatalog.rolePresets[role].includes(route.readPermission);
        if (!canRead) continue;
        const readOperations = route.readOperations.filter(operation => !['getSession', 'getCsrfToken'].includes(operation));
        if (route.id === 'R33') roleLoadingNotApplicablePairs.push(`${role}@${route.id}`);
        else if (readOperations.length) roleLoadingExpectedPairs.push(`${role}@${route.id}`);
    }
}
const roleLoadingSuitesBySource = loadingLogSources.map(source => new Set(
    [...source.contents.matchAll(/\bok\s+\d+\s+\[(chromium|firefox)\].*?loading state for ([a-z_]+)\s+\([^)]+\)/g)]
        .map(match => `${match[1]}@${match[2]}`),
));
const completedRoleSuites = new Set(roleLoadingSuitesBySource.flatMap(suites => [...suites]));
const roleLoadingSuitePassed = failedCount(loadingLog) === 0
    && requiredBrowserProjects.every(project => Object.keys(permissionCatalog.rolePresets).every(role => completedRoleSuites.has(`${project}@${role}`)));
const roleLoadingMatches = loadingLogSources.flatMap((source, index) => [...source.contents.matchAll(/BROWSER=(chromium|firefox) ROLE_STATE=loading ROLE=([a-z_]+) ROUTE=(R\d+)(?: OUTCOME=([A-Z0-9_]+))? RESULT=PASS/g)]
    .filter(match => roleLoadingSuitesBySource[index].has(`${match[1]}@${match[2]}`)));
const roleLoadingNaMatches = loadingLogSources.flatMap((source, index) => [...source.contents.matchAll(/BROWSER=(chromium|firefox) ROLE_STATE_NA=loading ROLE=([a-z_]+) ROUTE=(R\d+) REASON=([a-z-]+) RESULT=PASS/g)]
    .filter(match => roleLoadingSuitesBySource[index].has(`${match[1]}@${match[2]}`)));
const roleLoadingStatePassed = roleLoadingSuitePassed
    && requiredBrowserProjects.every(project => roleLoadingExpectedPairs.every(pair => {
        const [role, route] = pair.split('@');
        return roleLoadingMatches.filter(match => match[1] === project && match[2] === role && match[3] === route).length === 1;
    }))
    && roleLoadingMatches.length === roleLoadingExpectedPairs.length * requiredBrowserProjects.length
    && requiredBrowserProjects.every(project => roleLoadingNotApplicablePairs.every(pair => {
        const [role, route] = pair.split('@');
        return roleLoadingNaMatches.filter(match => match[1] === project && match[2] === role && match[3] === route && match[4] === 'shared-shell-snapshot').length === 1;
    }))
    && roleLoadingNaMatches.length === roleLoadingNotApplicablePairs.length * requiredBrowserProjects.length;
const roleLoadingRouteIds = [...new Set(roleLoadingExpectedPairs.map(pair => pair.split('@')[1]))];
const deniedRoleRouteIds = shopRoutes.filter(route => route.readPermission && Object.values(permissionCatalog.rolePresets).some(permissions => !permissions.includes(route.readPermission))).map(route => route.id);
const testCases = [
    { id: 'loading', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'renders a bounded loading state and does not show success content before data arrives', states: ['loading'] },
    { id: 'empty', source: 'apps/web/tests/components.test.tsx', title: 'keeps status and empty states understandable without relying on color', states: ['empty'] },
    { id: 'error-retry', source: 'apps/web/tests/components.test.tsx', title: 'shows a reserved loading state and a retryable error state', states: ['error'] },
    { id: 'forbidden', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'shows forbidden as an access state without offering a meaningless retry', states: ['forbidden'] },
    { id: 'stale-refetch', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'keeps the loaded data visible after a failed refetch and identifies it as potentially stale', states: ['stale_or_offline'] },
    { id: 'unknown-result', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'keeps an unknown mutation outcome distinct and includes the reconciliation command ID', states: ['command_unknown'] },
    { id: 'capability-unavailable', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'exposes partial data and unavailable capability as explicit, accessible states', states: ['capability_unavailable'] },
    { id: 'route-capability-composition', source: 'tests/states/route-role-capability-composition.spec.ts', title: 'R27 capability failure stays distinct and preserves the prompt', states: ['capability_unavailable'], routeSpecific: true, routeIds: roleCapabilityRouteIds },
    { id: 'partial-data', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'exposes partial data and unavailable capability as explicit, accessible states', states: ['partial'] },
    { id: 'validation-422', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'maps 422 errors to a field, focuses it, and preserves the user input', states: ['field_validation_422'] },
    { id: 'conflict-412', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'presents HTTP 412 with an actionable Vietnamese state', states: ['conflict_412'] },
    { id: 'missing-version-428', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'presents HTTP 428 with an actionable Vietnamese state', states: ['missing_version_428'] },
    { id: 'not-found-404', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'presents HTTP 404 with an actionable Vietnamese state', states: ['not_found'] },
    { id: 'translation-keys', source: 'apps/web/tests/states/fe023-state.test.tsx', title: 'has a complete Vietnamese translation for every registered common and feature UI key', states: ['translation_keys'] },
    { id: 'dialog-draft-guard', source: 'tests/states/fe023.spec.ts', title: 'a dirty dialog keeps the form value until the user confirms discard', states: ['dialog_dirty_draft'] },
    { id: 'delayed-and-retry', source: 'tests/states/fe023.spec.ts', title: 'delayed requests show loading and failed refresh keeps a retry path', states: ['loading', 'error'], routeSpecific: true, routeIds: ['R09', 'R40'], routeStates: { loading: ['R09'], error: ['R40'] } },
    { id: 'all-route-smoke', source: 'tests/frontend.spec.ts', title: 'all canonical routes render inside the real React demo application', states: ['success'], routeSpecific: true, routeIds: canonicalRouteIds },
    { id: 'route-role-success-composition', source: 'tests/states/route-role-ready-composition.spec.ts', title: 'ready route content renders for every role granted read access by the canonical contract', states: ['success'], routeSpecific: true, routeIds: shopRoutes.filter(route => !noSeedJobRouteIds.has(route.id)).map(route => route.id) },
    { id: 'route-error-composition', source: 'tests/states/route-role-state-composition.spec.ts', title: 'API error and empty states for', states: ['error'], routeSpecific: true, routeIds: shopRoutes.filter(route => route.id !== 'R33').map(route => route.id) },
    { id: 'route-loading-composition', source: 'tests/states/route-role-state-composition.spec.ts', title: 'route loading state appears for every readable route with route-owned data', states: ['loading'], routeSpecific: true, routeIds: roleLoadingRouteIds },
    { id: 'route-stale-composition', source: 'tests/states/route-role-ready-composition.spec.ts', title: 'ROLE_STATE=stale_or_offline', states: ['stale_or_offline'], routeSpecific: true, routeIds: [...new Set(roleStateExpectedPairs.stale_or_offline.map(pair => pair.split('@')[1]))] },
    { id: 'route-forbidden-composition', source: 'tests/route-role-matrix.spec.ts', title: 'route read access matches canonical permissions for every demo role', states: ['forbidden'], routeSpecific: true, routeIds: deniedRoleRouteIds },
    { id: 'empty-list-composition', source: 'tests/states/route-role-state-composition.spec.ts', title: 'API error and empty states for', states: ['empty'], routeSpecific: true, routeIds: emptyCollectionRouteIds },
    { id: 'viewer-forbidden-route', source: 'tests/frontend.spec.ts', title: 'role changes remove restricted navigation and the route guard explains denied access', states: [] },
];

const results = testCases.map(test => {
    const unitState = test.source.startsWith('apps/web/tests/states/') || test.source.startsWith('apps/web/tests/components.');
    const output = test.id === 'route-loading-composition' ? loadingLog
        : test.id === 'route-capability-composition' ? capabilityLog
        : ['route-role-success-composition', 'route-error-composition', 'empty-list-composition', 'route-stale-composition'].includes(test.id) ? roleStateLog
        : test.id === 'route-forbidden-composition' ? roleLog
        : test.source.startsWith('apps/web/tests/states/') || test.source.startsWith('apps/web/tests/components.') ? unitLog : browserLog;
    const exactRouteObservation = test.id === 'all-route-smoke' ? routeSmokePassed
        : test.id === 'route-role-success-composition' ? roleSuccessStatePassed
            : test.id === 'route-error-composition' ? routeErrorPassed
                : test.id === 'route-loading-composition' ? roleLoadingStatePassed
                    : test.id === 'route-stale-composition' ? roleStaleStatePassed
                        : test.id === 'route-capability-composition' ? roleCapabilityStatePassed
                            : test.id === 'route-forbidden-composition' ? roleMatrixPassed
                                : test.id === 'empty-list-composition' ? routeEmptyPassed
                                    : null;
    const observed = exactRouteObservation !== null ? exactRouteObservation : output.includes(test.title) && failedCount(output) === 0 && (!unitState || unitSuitePassed);
    const exactMatrixEvidence = test.id === 'all-route-smoke' ? routeSmokePassed
        : test.id === 'route-role-success-composition' ? roleSuccessStatePassed
        : test.id === 'route-error-composition' ? routeErrorPassed
            : test.id === 'route-loading-composition' ? roleLoadingStatePassed
            : test.id === 'route-stale-composition' ? roleStaleStatePassed
            : test.id === 'route-capability-composition' ? roleCapabilityStatePassed
            : test.id === 'route-forbidden-composition' ? roleMatrixPassed
                : test.id === 'empty-list-composition' ? routeEmptyPassed
                    : true;
    return { ...test, result: observed && exactMatrixEvidence ? 'PASS' : 'NOT_OBSERVED' };
});
const missingRequired = results.filter(test => ['loading', 'empty', 'error-retry', 'forbidden', 'stale-refetch', 'unknown-result', 'capability-unavailable', 'route-capability-composition', 'validation-422', 'conflict-412', 'missing-version-428', 'not-found-404', 'translation-keys', 'dialog-draft-guard', 'delayed-and-retry', 'all-route-smoke', 'route-role-success-composition', 'route-error-composition', 'route-loading-composition', 'route-stale-composition', 'route-forbidden-composition', 'empty-list-composition'].includes(test.id) && test.result !== 'PASS');
if (missingRequired.length)
    throw new Error(`Required test result not found: ${missingRequired.map(test => test.id).join(', ')}; roleStateSuitePassed=${roleStateSuitePassed}; stateMatches=${roleStateMatches.length}; successNA=${roleSuccessNaMatches.length}/${roleSuccessNotApplicablePairs.length * requiredBrowserProjects.length}; staleNA=${roleStaleNaMatches.length}/${roleStaleNotApplicablePairs.length * requiredBrowserProjects.length}; roleSuccessStatePassed=${roleSuccessStatePassed}; roleStaleStatePassed=${roleStaleStatePassed}`);

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
        const hasCapabilityAction = route.actions.some(action => capabilityActionIds.has(action.operationId));
        const notApplicableReason = state === 'forbidden' && !deniedRoleRouteIds.includes(route.id)
            ? 'Canonical permission catalog grants every demo role route-read access.'
            : state === 'success' && noSeedJobRouteIds.has(route.id)
                ? 'The isolated demo fixture has no job resource for this detail route; its primary getJob read returns HTTP 404.'
            : state === 'error' && route.id === 'R33'
                ? 'Shop settings uses the shop snapshot already owned and cached by the shared Shell.'
                : state === 'stale_or_offline' && route.id === 'R33'
                    ? 'Shop settings uses the shop snapshot already owned and cached by the shared Shell.'
                : state === 'stale_or_offline' && noSeedJobRouteIds.has(route.id)
                    ? 'The isolated demo fixture has no job resource for this detail route; its primary getJob read returns HTTP 404, so there is no prior result to retain as stale.'
                : state === 'empty' && !returnsList
                    ? 'This route has no collection response to render as an empty list.'
                    : state === 'loading' && !readOperations.length
                        ? 'This route has no route-owned read operation to delay.'
                        : state === 'stale_or_offline' && !readOperations.length
                            ? 'This route has no route-owned server data to retain as stale.'
                            : state === 'command_unknown' && !hasCommandAction
                                ? 'This route has no command response that can become unknown.'
                                : state === 'capability_unavailable' && !hasCapabilityAction
                                    ? 'The synthetic API defines capability-specific unavailable results only for runPlayground; this route has no such capability action.'
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
    const roleStates = Object.fromEntries(roles.map(role => [role, Object.fromEntries(route.states.map(state => {
        if (!route.path.startsWith('/s/'))
            return [state, { result: 'NOT_APPLICABLE', evidence: ['Public route access is not scoped to a shop role.'] }];
        if (access[role] === 'DENIED_BY_CATALOG')
            return state === 'forbidden'
                ? [state, { result: roleMatrixPassed ? 'ROUTE_ROLE_STATE_TESTED' : 'NOT_TESTED', evidence: roleMatrixPassed ? ['tests/route-role-matrix.spec.ts#route read access matches canonical permissions for every demo role'] : [] }]
                : [state, { result: 'NOT_APPLICABLE', evidence: ['The canonical route guard denies this role before route data or actions can render.'] }];
        if (state === 'forbidden')
            return [state, { result: 'NOT_APPLICABLE', evidence: ['The canonical permission catalog grants this role route-read access.'] }];
        if (state === 'loading' && roleLoadingStatePassed && roleLoadingNotApplicablePairs.includes(`${role}@${route.id}`))
            return [state, { result: 'NOT_APPLICABLE', evidence: ['tests/states/route-role-state-composition.spec.ts records no route-owned read because the shared Shell already fetched the shop snapshot.'], routeSpecificBehavior: 'NOT_APPLICABLE_BY_SHARED_SHELL_SNAPSHOT' }];
        if (state === 'loading' && roleLoadingStatePassed && roleLoadingExpectedPairs.includes(`${role}@${route.id}`))
            return [state, { result: 'ROUTE_ROLE_STATE_TESTED', evidence: ['tests/states/route-role-state-composition.spec.ts#loading state for every readable role-route pair'] }];
        if (state === 'success' && roleSuccessStatePassed && roleSuccessNotApplicablePairs.includes(`${role}@${route.id}`))
            return [state, { result: 'NOT_APPLICABLE', evidence: ['The demo fixture returned HTTP 404 for the route primary getJob operation; no job resource is seeded.'], routeSpecificBehavior: 'NOT_APPLICABLE_BY_MOCK_FIXTURE' }];
        if (state === 'stale_or_offline' && roleStaleStatePassed && roleStaleNotApplicablePairs.includes(`${role}@${route.id}`))
            return [state, { result: 'NOT_APPLICABLE', evidence: [route.id === 'R33' ? 'Shop settings uses the shop snapshot already owned and cached by the shared Shell.' : 'The demo fixture returned HTTP 404 for the route primary getJob operation; there is no prior job data to retain.'], routeSpecificBehavior: route.id === 'R33' ? 'NOT_APPLICABLE_BY_SHARED_SHELL_SNAPSHOT' : 'NOT_APPLICABLE_BY_MOCK_FIXTURE' }];
        if (state === 'stale_or_offline' && roleStaleStatePassed && roleStateExpectedPairs.stale_or_offline.includes(`${role}@${route.id}`))
            return [state, { result: 'ROUTE_ROLE_STATE_TESTED', evidence: ['tests/states/route-role-ready-composition.spec.ts#stale route data remains visible after a failed refetch'] }];
        if (state === 'success' && roleSuccessStatePassed && roleStateExpectedPairs.success.includes(`${role}@${route.id}`))
            return [state, { result: 'ROUTE_ROLE_STATE_TESTED', evidence: ['tests/states/route-role-ready-composition.spec.ts#ready route content for every readable role-route pair'] }];
        const roleActions = route.actions.filter(action => !action.permission || permissionCatalog.rolePresets[role].includes(action.permission));
        const roleCommandAction = roleActions.some(action => operationIndex[action.operationId]?.responseSchema === 'CommandResponse');
        const roleCapabilityAction = roleActions.some(action => capabilityActionIds.has(action.operationId));
        if (state === 'command_unknown' && !roleCommandAction)
            return [state, { result: 'NOT_APPLICABLE', evidence: ['This role has no permitted command action on the route.'] }];
        if (state === 'command_unknown' && commandUnknownNaPairPassed(`${role}@${route.id}`))
            return [state, { result: 'NOT_APPLICABLE', evidence: [`tests/states/route-role-command-unknown-master-actions.spec.ts#${commandUnknownNaEvidence(`${role}@${route.id}`).join(',')}`], routeSpecificBehavior: 'NOT_APPLICABLE_BY_FRONTEND_STEP_UP_BOUNDARY' }];
        if (state === 'command_unknown' && commandUnknownPairPassed(`${role}@${route.id}`))
            return [state, { result: 'ROUTE_ROLE_STATE_TESTED', evidence: [`tests/states/route-role-command-unknown-composition.spec.ts#${commandUnknownEvidence(`${role}@${route.id}`).join(',')}`] }];
        if (state === 'command_unknown' && commandUnknownShellPairPassed(`${role}@${route.id}`))
            return [state, { result: 'SHARED_UI_TESTED', evidence: [`tests/states/route-role-unknown-shell-composition.spec.ts#injected-unresolved-intent:${commandUnknownShellEvidence(`${role}@${route.id}`).join(',')}`], evidenceScope: 'SHARED_COMMAND_RECOVERY_SHELL_FIXTURE_NOT_API_RESULT' }];
        if (state === 'capability_unavailable' && roleCapabilityStatePassed && roleCapabilityNotApplicablePairs.includes(`${role}@${route.id}`))
            return [state, { result: 'NOT_APPLICABLE', evidence: ['The synthetic API has no capability-specific unavailable fault for this route action; its declared budget and tool faults are scoped to runPlayground.'], routeSpecificBehavior: 'NOT_APPLICABLE_BY_MOCK_CONTRACT' }];
        if (state === 'capability_unavailable' && roleCapabilityStatePassed && roleCapabilityAction && roleCapabilityExpectedPairs.includes(`${role}@${route.id}`))
            return [state, { result: 'ROUTE_ROLE_STATE_TESTED', evidence: ['tests/states/route-role-capability-composition.spec.ts#R27 capability failure stays distinct and preserves the prompt'] }];
        if (state === 'error' && route.id !== 'R33' && roleErrorStatePassed)
            return [state, { result: 'ROUTE_ROLE_STATE_TESTED', evidence: ['tests/states/route-role-state-composition.spec.ts#API error and empty states for every readable role-route pair'] }];
        if (state === 'empty' && roleEmptyStatePassed && emptyCollectionRouteIds.includes(route.id))
            return [state, { result: 'ROUTE_ROLE_STATE_TESTED', evidence: ['tests/states/route-role-state-composition.spec.ts#API error and empty states for every readable role-route pair'] }];
        const routeState = stateCoverage[state];
        if (routeState?.result === 'NOT_APPLICABLE')
            return [state, routeState];
        return [state, { result: 'NOT_TESTED_FOR_ROLE', evidence: routeState?.evidence || [], routeStateEvidenceDoesNotProveRoleComposition: true }];
    }))]));
    return { id: route.id, path: route.path, title: route.title, readPermission: route.readPermission, access, roleEvidence, states: stateCoverage, roleStates };
});
const routeSuccessCount = routeRoles.filter(route => route.states.success?.result === 'ROUTE_SPECIFIC_TESTED').length;
const routeErrorCount = routeRoles.filter(route => route.states.error?.result === 'ROUTE_SPECIFIC_TESTED').length;
const routeEmptyCount = routeRoles.filter(route => route.states.empty?.result === 'ROUTE_SPECIFIC_TESTED').length;
const routeStaleCount = routeRoles.filter(route => route.states.stale_or_offline?.result === 'ROUTE_SPECIFIC_TESTED').length;
const routeSpecificStateCells = routeRoles.reduce((count, route) => count + Object.values(route.states).filter(state => state.result === 'ROUTE_SPECIFIC_TESTED').length, 0);
const routeStateResultCounts = routeRoles.reduce((counts, route) => {
    for (const state of Object.values(route.states))
        counts[state.result] = (counts[state.result] || 0) + 1;
    return counts;
}, {});
const routeRoleStateResultCounts = routeRoles.reduce((counts, route) => {
    for (const role of roles)
        for (const state of Object.values(route.roleStates[role]))
            counts[state.result] = (counts[state.result] || 0) + 1;
    return counts;
}, {});
const inventoriedRouteRoleStateCells = routeRoles.reduce((count, route) => count + Object.keys(route.states).length * roles.length, 0);
const applicableRouteRoleStateCells = routeRoles.reduce((count, route) => count + roles.reduce((roleCount, role) => roleCount + Object.values(route.roleStates[role]).filter(state => state.result !== 'NOT_APPLICABLE').length, 0), 0);
const directlyTestedRouteRoleStateCells = routeRoles.reduce((count, route) => count + roles.reduce((roleCount, role) => roleCount + Object.values(route.roleStates[role]).filter(state => state.result === 'ROUTE_ROLE_STATE_TESTED').length, 0), 0);
const globalStates = results.filter(test => test.states.length).map(test => ({ id: test.id, source: test.source, title: test.title, states: test.states, result: test.result }));
const inputProofs = [
    ...unitLogSources.map(source => ({ path: relative(source.path), sha256: hash(source.contents), exitCode: exitCode(source.path) })),
    ...browserLogSources.map(source => ({ path: relative(source.path), sha256: hash(source.contents), exitCode: exitCode(source.path) })),
    ...(roleLogPath ? [{ path: relative(path.resolve(root, roleLogPath)), sha256: hash(roleLog), exitCode: exitCode(path.resolve(root, roleLogPath)) }] : []),
    { path: relative(path.resolve(root, viewportLogPath)), sha256: hash(viewportLog), exitCode: exitCode(path.resolve(root, viewportLogPath)) },
    ...roleStateLogSources.map(source => ({ path: relative(source.path), sha256: hash(source.contents), exitCode: exitCode(source.path) })),
    ...commandUnknownLogSources.map(source => ({ path: relative(source.path), sha256: hash(source.contents), exitCode: exitCode(source.path) })),
    ...loadingLogSources.map(source => ({ path: relative(source.path), sha256: hash(source.contents), exitCode: exitCode(source.path) })),
    { path: relative(path.resolve(root, capabilityLogPath)), sha256: hash(capabilityLog), exitCode: exitCode(path.resolve(root, capabilityLogPath)) },
];
const uniqueInputProofs = [...new Map(inputProofs.map(proof => [proof.path, proof])).values()];
const output = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    sourceOfTruth: ['../botsales-kit/contracts/route-manifest.json', '../botsales-kit/contracts/permission-catalog.json'],
    inputs: uniqueInputProofs,
    summary: {
        routes: routeRoles.length,
        roles: roles.length,
        canonicalRouteStates: [...new Set(routeManifest.routes.flatMap(route => route.states))],
        passingGlobalStateCases: globalStates.filter(test => test.result === 'PASS').length,
        browsers: browserProjects,
        routeMountSmoke: routeSmokePassed ? 'PASS' : 'INCOMPLETE',
        routeSmokeBaselineFromBroadSuite: routeSmokeBaselinePassed ? 'PASS' : 'INCOMPLETE',
        routeViewportCoverage: routeViewportPassed ? { viewports: requiredViewports, casesPerBrowser: canonicalRouteIds.length * requiredViewports.length, totalObservedCases: viewportMatches.reduce((count, match) => count + match.cases, 0) } : 'INCOMPLETE',
        routeSuccessComposition: routeSmokePassed ? 'PASS' : 'INCOMPLETE',
        routeSpecificSuccessRoutes: routeSuccessCount,
        routeErrorComposition: routeErrorPassed ? 'PASS' : 'INCOMPLETE',
        routeSpecificErrorRoutes: routeErrorCount,
        routeEmptyComposition: routeEmptyPassed ? 'PASS' : 'INCOMPLETE',
        routeSpecificEmptyRoutes: routeEmptyCount,
        routeStaleComposition: roleStaleStatePassed ? 'PASS' : 'INCOMPLETE',
        routeSpecificStaleRoutes: routeStaleCount,
        routeLoadingComposition: roleLoadingStatePassed ? 'PASS' : 'INCOMPLETE',
        roleLoadingRouteStateCells: roleLoadingStatePassed ? roleLoadingExpectedPairs.length : 0,
        roleLoadingNotApplicableSharedShellCells: roleLoadingStatePassed ? roleLoadingNotApplicablePairs.length : 0,
        routeSpecificStateCells,
        routeStateResultCounts,
        routeRoleStateCells: inventoriedRouteRoleStateCells,
        applicableRouteRoleStateCells,
        directlyTestedRouteRoleStateCells,
        routeRoleStateCoveragePercent: applicableRouteRoleStateCells ? Number((directlyTestedRouteRoleStateCells / applicableRouteRoleStateCells * 100).toFixed(2)) : 100,
        roleSuccessRouteStateCells: roleSuccessStatePassed ? roleStateExpectedPairs.success.length : 0,
        roleSuccessNotApplicableMockFixtureCells: roleSuccessStatePassed ? roleSuccessNotApplicablePairs.length : 0,
        roleCapabilityRouteStateCells: roleCapabilityStatePassed ? roleCapabilityExpectedPairs.length : 0,
        roleCapabilityNotApplicableMockContractCells: roleCapabilityStatePassed ? roleCapabilityNotApplicablePairs.length : 0,
        roleErrorRouteStateCells: roleErrorStatePassed ? roleStateExpectedPairs.error.length : 0,
        roleEmptyRouteStateCells: roleEmptyStatePassed ? roleStateExpectedPairs.empty.length : 0,
        roleStaleRouteStateCells: roleStaleStatePassed ? roleStateExpectedPairs.stale_or_offline.length : 0,
        commandUnknownRoleRouteCoverage: {
            expected: commandUnknownExpectedPairs.length,
            actualUnknownCommandResults: commandUnknownTestedPairs.length,
            notApplicableByFrontendBoundary: commandUnknownNaPairs.length,
            notTested: commandUnknownNotTestedPairs.length,
            completeOnChromiumAndFirefox: commandUnknownAllRequiredPassed,
        },
        commandUnknownSharedShellCoverage: {
            expected: commandUnknownExpectedPairs.length,
            tested: commandUnknownShellTestedPairs.length,
            notTested: commandUnknownExpectedPairs.length - commandUnknownShellTestedPairs.length,
            noCommandRoleNACases: commandUnknownNoActionRoles.length,
            completeOnChromiumAndFirefox: commandUnknownShellAllRequiredPassed,
            evidenceScope: 'INJECTED_UNRESOLVED_INTENT_RENDERED_IN_ROUTE_ROLE_SHELL; DOES_NOT_PROVE_API_COMMAND_RESULT',
        },
        routeRoleStateEvidenceCoveragePercent: applicableRouteRoleStateCells ? Number(((directlyTestedRouteRoleStateCells + (routeRoleStateResultCounts.SHARED_UI_TESTED || 0)) / applicableRouteRoleStateCells * 100).toFixed(2)) : 100,
        roleStaleNotApplicableSharedShellCells: roleStaleStatePassed ? roleStaleNotApplicablePairs.length : 0,
        roleStaleNotApplicableMockFixtureCells: roleStaleStatePassed ? roleStaleNotApplicablePairs.filter(pair => !pair.endsWith('@R33')).length : 0,
        roleStaleEvidenceScope: roleStaleStatePassed ? 'PERSISTENT_MOCK_API_FAILURE_AFTER_QUERY_STALE_TIME; NETWORK_OFFLINE_NOT_RUN' : 'INCOMPLETE',
        roleStateEvidence: {
            success: roleSuccessStatePassed ? { result: 'PASS', allowedRoleRouteCells: roleStateExpectedPairs.success.length, notApplicableMockFixtureCells: roleSuccessNotApplicablePairs.length, browserRuns: requiredBrowserProjects.length } : { result: 'INCOMPLETE' },
            capability_unavailable: roleCapabilityStatePassed ? { result: 'PASS', allowedCapabilityRoleRouteCells: roleCapabilityExpectedPairs.length, notApplicableMockContractCells: roleCapabilityNotApplicablePairs.length, browserRuns: requiredBrowserProjects.length, faultCases: capabilityFaultKinds } : { result: 'INCOMPLETE' },
            error: roleErrorStatePassed ? { result: 'PASS', allowedRoleRouteCells: roleStateExpectedPairs.error.length, browserRuns: requiredBrowserProjects.length } : { result: 'INCOMPLETE' },
            empty: roleEmptyStatePassed ? { result: 'PASS', allowedRoleRouteCells: roleStateExpectedPairs.empty.length, browserRuns: requiredBrowserProjects.length } : { result: 'INCOMPLETE' },
            stale_or_offline: roleStaleStatePassed ? { result: 'PASS', allowedRouteOwnedRoleRouteCells: roleStateExpectedPairs.stale_or_offline.length, notApplicableSharedShellCells: roleStaleNotApplicablePairs.filter(pair => pair.endsWith('@R33')).length, notApplicableMockFixtureCells: roleStaleNotApplicablePairs.filter(pair => !pair.endsWith('@R33')).length, browserRuns: requiredBrowserProjects.length, scope: 'MOCK_API_STALE_FAILURE' } : { result: 'INCOMPLETE' },
            loading: roleLoadingStatePassed ? { result: 'PASS', allowedRoleRouteCells: roleLoadingExpectedPairs.length, notApplicableSharedShellCells: roleLoadingNotApplicablePairs.length, browserRuns: requiredBrowserProjects.length } : { result: 'INCOMPLETE' },
        },
        routeRoleStateResultCounts,
        observedDeniedRouteRoleCase: results.find(test => test.id === 'viewer-forbidden-route')?.result === 'PASS' ? 'viewer@R22' : 'NONE',
        routeRoleBrowserMatrix: roleMatrixPassed ? 'PASS' : 'INCOMPLETE',
        passedRouteRoleCases: roleMatrixPassed ? roleMatrixExpected : 0,
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
