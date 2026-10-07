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
const inbox = readText('apps/web/src/modules/inbox/index.tsx');
const inboxComponents = readText('apps/web/src/modules/inbox/conversation-components.tsx');
const inboxUi = `${inbox}\n${inboxComponents}`;
const scopeEvents = readText('apps/web/src/app/ScopeEvents.tsx');
const recovery = readText('apps/web/src/app/CommandRecovery.tsx');
const mock = readText('apps/web/src/mocks/auxiliary.ts');
const mockService = readText('apps/web/src/mocks/service.ts');

test('FE016 maps R05/R06 reads and mutations to canonical permissions and current inbox source', () => {
    const r05 = routes.find(route => route.id === 'R05');
    const r06 = routes.find(route => route.id === 'R06');
    assert.ok(r05);
    assert.ok(r06);
    assert.equal(r05.path, '/s/:shopId/inbox');
    assert.equal(r06.path, '/s/:shopId/inbox/:conversationId');
    assert.equal(r05.readPermission, 'conversations.read');
    assert.equal(r06.readPermission, 'conversations.read');
    for (const operationId of ['listConversations', 'getInboxMetadata', 'getConversation', 'listMessages', 'getCommand', 'sendMessage', 'addInternalNote', 'takeoverConversation', 'releaseConversation', 'assignConversation', 'resolveConversation', 'createFeedback']) {
        assert.ok(operations[operationId], `${operationId} exists in canonical OpenAPI`);
    }
    const actions = new Map(r06.actions.map(action => [action.operationId, action.permission]));
    assert.equal(actions.get('sendMessage'), 'conversations.reply');
    assert.equal(actions.get('addInternalNote'), 'conversations.reply');
    for (const operationId of ['takeoverConversation', 'releaseConversation', 'assignConversation', 'resolveConversation'])
        assert.equal(actions.get(operationId), 'conversations.assign');
    assert.equal(actions.get('createFeedback'), 'conversations.read');
    for (const operationId of ['listConversations', 'getInboxMetadata', 'getConversation', 'listMessages', 'sendMessage', 'addInternalNote', 'takeoverConversation', 'releaseConversation', 'assignConversation', 'resolveConversation', 'createFeedback'])
        assert.match(inboxUi, new RegExp(`(?:useApi|useCommand)\\('${operationId}'`), `${operationId} is wired through typed inbox hooks`);
    assert.match(recovery, /request\('getCommand'/);
});

test('FE016 contract bounds list filters, safe message refs and versioned send payloads', () => {
    const listOperation = operations.listConversations;
    const queryNames = listOperation.parameters.map(parameter => parameter.$ref
        ? openapi.components.parameters[parameter.$ref.split('/').at(-1)]
        : parameter).filter(parameter => parameter?.in === 'query').map(parameter => parameter.name);
    for (const field of ['q', 'status', 'mode', 'channelId', 'assignedUserId', 'cursor', 'limit'])
        assert.ok(queryNames.includes(field), `listConversations supports ${field}`);
    const message = openapi.components.schemas.Message;
    assert.ok(message.properties.sourceEvidence);
    assert.equal(message.properties.media, undefined);
    assert.equal(message.properties.attachments, undefined);
    assert.deepEqual(openapi.components.schemas.ResourceRef.required, ['type', 'id']);
    const messageWrite = openapi.components.schemas.MessageWrite;
    assert.deepEqual(messageWrite.required, ['clientMessageId', 'text', 'expectedConversationVersion']);
    assert.ok(operations.sendMessage.responses['202'], 'sendMessage has its documented asynchronous response');
    assert.match(inboxComponents, /message\.text/);
    assert.doesNotMatch(inboxUi, /dangerouslySetInnerHTML/);
    assert.match(inbox, /status,\s*mode,\s*channelId,\s*assignedUserId,\s*cursor/);
    assert.match(inboxComponents, /sourceEvidence\.map/);
    assert.match(inboxComponents, /useCan\('customers\.read'\)/);
    assert.match(inboxComponents, /useCan\('orders\.write'\)/);
    assert.match(inboxComponents, /permission="conversations\.assign"/);
    assert.match(mockService, /'mode', 'channelId', 'assignedUserId'/);
    assert.match(inboxComponents, /expectedConversationVersion:\s*conversation\.version/);
    assert.match(inboxComponents, /clientMessageId:\s*crypto\.randomUUID\(\)/);
});

test('FE016 uses shell-owned resync and command recovery, and mock takeover enforces current version', () => {
    const eventSchema = readText('../botsales-kit/contracts/events.schema.json');
    assert.match(eventSchema, /resync\.required/);
    assert.match(scopeEvents, /stream\.onopen/);
    assert.match(scopeEvents, /invalidateQueries\(\{ queryKey: key \}\)/);
    assert.match(scopeEvents, /payload\.sequence <= lastSequence/);
    assert.match(recovery, /request\('getCommand'/);
    assert.match(recovery, /result\.data\.status === 'succeeded' \|\| result\.data\.status === 'failed'/);
    assert.match(mock, /checkVersion\(c, input\)/);
    assert.match(mock, /c\.generation = num\(c\.generation\) \+ 1/);
});

console.log(JSON.stringify({taskId:'FE016',scope:'FRONTEND_WITH_SYNTHETIC_MOCK_API',routes:['R05','R06'],operations:Object.keys(operations).filter(id=>/Conversation|Message|InboxMetadata|Feedback|Command/.test(id)),knownGap:'Canonical Message has no media or attachment field/operation; UI must not invent a provider endpoint.',checks:3}));
