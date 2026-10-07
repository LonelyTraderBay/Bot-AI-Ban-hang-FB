import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const routes = readJson('../botsales-kit/contracts/route-manifest.json').routes;
const openapi = readJson('../botsales-kit/contracts/openapi.json');
const operations = Object.fromEntries(Object.values(openapi.paths).flatMap(methods => Object.values(methods))
    .filter(operation => operation.operationId)
    .map(operation => [operation.operationId, operation]));
const bot = readText('apps/web/src/modules/bot/index.tsx');
const mock = readText('apps/web/src/mocks/auxiliary.ts');
const service = readText('apps/web/src/mocks/service.ts');
const shell = readText('apps/web/src/app/Shell.tsx');
const permissions = readJson('packages/contracts/src/permissions.json');

test('FE018 R26/R27/R28/R51 actions use canonical routes, operation IDs, and permissions', () => {
    const expected = {
        R26: ['getBotConfig', 'listAIConnections', 'listBotRevisions', 'updateBotDraft', 'publishBotConfig', 'pauseBot', 'restoreBotRevision'],
        R27: ['getBotConfig', 'runPlayground'],
        R28: ['listEvaluations', 'getBotConfig', 'createEvaluation'],
        R51: ['listAgentRoles', 'listBudgetPolicies', 'updateAgentRole', 'controlAutomation'],
    };
    for (const [routeId, operationIds] of Object.entries(expected)) {
        const route = routes.find(candidate => candidate.id === routeId);
        assert.ok(route, `${routeId} is registered`);
        assert.equal(route.module, 'bot');
        for (const operationId of operationIds) {
            assert.ok(operations[operationId], `${operationId} exists in OpenAPI`);
            assert.match(bot, new RegExp(`use(?:Api|Command)\\('${operationId}'`), `${operationId} is wired in the bot module`);
        }
        for (const action of route.actions) {
            assert.ok(operations[action.operationId], `${action.operationId} exists in OpenAPI`);
            assert.equal(operations[action.operationId]['x-permission'], action.permission, `${action.operationId} permission matches OpenAPI`);
        }
    }
    assert.equal(operations.updateBudgetPolicy['x-permission'], 'operations.manage');
    assert.match(bot, /useCommand\('updateBudgetPolicy'/, 'budget edits use the canonical operation even though R51 does not list it among route actions');
    assert.match(bot, /MutationButton permission="operations\.manage"/);
});

test('FE018 capability, tool permissions, human confirmation, and evaluation labels stay within declared schemas', () => {
    const schemas = openapi.components.schemas;
    assert.ok(schemas.AIConnection.properties.capabilities, 'provider capability comes from the connection contract');
    assert.ok(schemas.AgentRole.properties.allowedToolIds, 'agent tools come from the agent role contract');
    assert.equal(schemas.AgentRoleWrite.properties.allowedToolIds, undefined, 'role updates cannot grant tools');
    assert.deepEqual(permissions.agentRoles.sales_admin, ['catalog.read', 'customers.read', 'conversations.read', 'orders.read', 'orders.write', 'orders.confirm']);
    assert.equal(schemas.BotConfigWritePatch.properties.requireHumanOrderConfirmation.const, true, 'the legacy write flag cannot disable customer confirmation');
    assert.equal(schemas.BotConfigWritePatch.properties.allowedActions, undefined, 'do not add an uncontracted BotConfig field');
    assert.equal(schemas.Evaluation.properties.mockOnly, undefined, 'synthetic quality metadata is not misrepresented as an API DTO field');
    assert.match(bot, /Chế độ mô phỏng chỉ kiểm quy trình, không đánh giá chất lượng mô hình AI thật/);
    assert.match(bot, /không sửa quyền qua prompt/);
    assert.match(mock, /mockOnly: true/);
    assert.match(mock, /Mô phỏng, không gọi AI/);
    assert.match(mock, /body\.scope === 'shop' && body\.action === 'pause'/);
    assert.match(service, /BUDGET_EXCEEDED/);
    assert.match(service, /TOOL_NOT_ALLOWED/);
    assert.match(shell, /Hết hạn mức AI mô phỏng/);
    assert.match(shell, /Công cụ bị từ chối/);
});

console.log(JSON.stringify({ taskId: 'FE018', scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', routes: ['R26', 'R27', 'R28', 'R51'], operations: 18, checks: 2, knownRouteMappingGap: 'R51 omits updateBudgetPolicy; UI uses canonical operation permission operations.manage' }));
