import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const readText = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('FE015 finance routes, capabilities, operations and DTOs follow canonical contracts', async () => {
    const [manifest, openapi, operations, plan, ui, mock, hooks, routeMap] = await Promise.all([
        readJson('../../botsales-kit/contracts/route-manifest.json'),
        readJson('../../botsales-kit/contracts/openapi.json'),
        readJson('../packages/contracts/src/operations.json'),
        readJson('../../botsales-kit/execution/frontend-plan.json'),
        readText('../apps/web/src/modules/finance/index.tsx'),
        readText('../apps/web/src/mocks/finance.ts'),
        readText('../apps/web/src/shared/api/hooks.ts'),
        readText('../../botsales-kit/execution/frontend-evidence/FE015/S01-route-operation-map.md'),
    ]);
    const currentUi = await readText('../apps/web/src/modules/finance/entry-editor.tsx') + await readText('../apps/web/src/modules/finance/statement-import.tsx') + ui + await readText('../apps/web/src/modules/finance/journal-editor.tsx') + await readText('../apps/web/src/modules/finance/accounts.tsx');
    const checks = [];
    const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks.push(label); };
    const ok = (condition, label) => { assert.ok(condition, label); checks.push(label); };
    const match = (source, pattern, label) => { assert.match(source, pattern, label); checks.push(label); };
    const routes = new Map(manifest.routes.map(route => [route.id, route]));
    const expected = [
        ['R20', '/s/:shopId/finance', ['getCashflow'], 'finance.read'],
        ['R21', '/s/:shopId/finance/entries', ['listFinanceEntries', 'getFinanceEntry', 'getCommand'], 'finance.read'],
        ['R22', '/s/:shopId/finance/profit-loss', ['getProfitLoss'], 'finance.read'],
        ['R48', '/s/:shopId/finance/journals', ['listJournals', 'getJournal'], 'finance.read'],
        ['R49', '/s/:shopId/finance/reconciliation', ['listReconciliationCases', 'listBankTransactions', 'listCODSettlements', 'listStatementFormats'], 'finance.read'],
        ['R50', '/s/:shopId/finance/debts-periods', ['listDebtItems', 'listAccountingPeriods'], 'finance.read'],
    ];
    for (const [id, path, reads, permission] of expected) {
        const route = routes.get(id);
        eq([route.path, route.module, route.readPermission, ...route.readOperations], [path, 'finance', permission, ...reads], `${id} route and read permission`);
        ok(routeMap.includes(`${id} \`${path}\``), `${id} is documented`);
        for (const op of route.readOperations) {
            ok(operations[op], `${op} exists in generated operation registry`);
            if (op === 'getCommand') match(hooks, /request\('getCommand'/, `${op} recovery lookup uses shared request client`);
            else match(currentUi, new RegExp(`use(?:Api|PagedApi)\\('${op}'`), `${op} is called through shared API hook`);
        }
    }
    const mutationOwners = new Map([
        ['createFinanceEntry', 'finance.post'], ['updateFinanceEntry', 'finance.post'], ['postFinanceEntry', 'finance.post'], ['reverseFinanceEntry', 'finance.post'],
        ['createJournal', 'finance.post'], ['postJournal', 'finance.post'], ['reverseJournal', 'finance.post'],
        ['importBankStatement', 'finance.reconcile'], ['importCODStatement', 'finance.reconcile'], ['matchSettlement', 'finance.reconcile'], ['matchCODSettlement', 'finance.reconcile'],
        ['closeAccountingPeriod', 'finance.close'], ['reopenAccountingPeriod', 'finance.close'],
    ]);
    for (const [op, permission] of mutationOwners) {
        ok(operations[op], `${op} is a canonical operation`);
        const canonical = Object.values(openapi.paths).flatMap(item => Object.values(item)).find(item => item.operationId === op);
        ok(canonical, `${op} exists in canonical OpenAPI`);
        eq(canonical['x-permission'], permission, `${op} permission matches OpenAPI`);
        match(currentUi, new RegExp(`useCommand\\('${op}'`), `${op} is dispatched via command hook`);
    }
    eq(plan.tasks.find(task => task.id === 'FE015').routeIds, expected.map(([id]) => id), 'task route list matches mapped routes');
    eq(plan.tasks.find(task => task.id === 'FE015').operationIds.slice().sort(), [
        ...expected.flatMap(([, , reads]) => reads), ...mutationOwners.keys(),
    ].filter((id, index, ids) => id !== 'listStatementFormats' && ids.indexOf(id) === index).sort(), 'original API 2.0 task operation list matches its original read/write map; current statement formats are checked independently above');
    for (const id of plan.tasks.find(task => task.id === 'FE015').operationIds)
        ok(operations[id] || id === 'getCommand', `${id} resolves to canonical operation`);

    for (const op of ['getCashflow', 'getProfitLoss']) {
        const canonical = Object.values(openapi.paths).flatMap(item => Object.values(item)).find(item => item.operationId === op);
        eq(canonical.parameters.filter(param => param.$ref).map(param => param.$ref.split('/').at(-1)), ['From', 'To', 'Timezone'], `${op} requires exact report window and timezone`);
    }
    match(routeMap, /đã thêm chọn khoảng ngày theo timezone shop/, 'route map explains closing the report window gap');
    match(routeMap, /Journal cho nhập ID tài khoản/, 'route map records manual account-id constraint');
    match(routeMap, /decimal chính xác/, 'route map records exact decimal boundary');
    ok(plan.tasks.find(task => task.id === 'FE015').acceptanceCases.some(item => item.includes('locked period')), 'task includes locked-period acceptance');
    match(ui, /useApi\('getCashflow', \{ query: report\.query \}/, 'cashflow sends from/to/timezone');
    match(ui, /useApi\('getProfitLoss', \{ query: report\.query \}/, 'P&L sends from/to/timezone');
    match(ui, /function decimalUnits[\s\S]*BigInt/, 'journal balance validation uses exact integer decimal units');
    match(currentUi, /useApi\('listAccountingPeriods'\)/, 'journal editor reads accounting periods through shared transport');
    match(currentUi, /if\(period\?\.state!=='open'\)\{form\.setError/ , 'journal editor enforces the current open period before submission');
    match(ui, /useApi\('getFinanceEntry'/, 'entry detail loads the canonical resource before edit/post/reverse');
    match(currentUi, /usePagedApi\('listAccounts',\{query:\{status:'active'\}\}\)/, 'journal editor uses the current canonical active account catalog');
    eq(operations.listAccounts.permission, 'finance.read', 'account catalog retains separate canonical read permission');
    match(mock, /input\.query\.get\('from'\)/, 'reports validate query parameters in mock service');
    match(mock, /case 'getCashflow': return cashflow\(shopId, reportWindow\(input\)\)/, 'cashflow mock receives query window');
    match(mock, /case 'getProfitLoss': return profitLoss\(shopId, reportWindow\(input\)\)/, 'P&L mock receives query window');
    match(await readText('../apps/web/src/mocks/accounting.ts'), /journalInstant\(shopId,j\)>=window\.start&&journalInstant\(shopId,j\)<window\.end/, 'mock enforces half-open report period');
    assert.ok(checks.length >= 70, `expected broad contract/source map; got ${checks.length}`);
    console.log(`FE015 source map: ${checks.length} contract/source assertions passed`);
});
