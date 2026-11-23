import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fixtureShops } from '../../../apps/api/prisma/p0-fixture.mjs';
import { signMessengerFixtureEvent } from '../../../apps/api/dist/modules/inbox/messenger-fixture.js';
import { readAuthConfig } from '../../../apps/api/dist/modules/workspace/index.js';
import { appOrigin, issuer } from '../../../infra/p0/oidc/tls.mjs';
import { postgresTargets, redisTarget } from '../../../scripts/staging-data-config.mjs';
import { fixtureWriter } from '../orders/fixtures.mjs';
import { assertFixtureDatabase, fixtureSession } from '../workspace/session-fixture.mjs';

const root = appOrigin + '/api/v2';
const shopApi = id => root + '/shops/' + id;
const shopWeb = id => '/s/' + id;
const sampleAudio = Buffer.from('524946462600000057415645666d74201000000001000100401f0000803e00000200100064617461020000000000', 'hex');

export function configureLocalPilot(env) {
    assert.equal(env.P0_LOCAL_PILOT, '1', 'Seed the dedicated P0 pilot with P0_LOCAL_PILOT=1');
    assert.equal(env.OIDC_ISSUER, issuer, 'Use the local OIDC fixture');
    assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, '0', 'TLS verification must be enabled');
    assert.notEqual(env.NODE_ENV, 'production', 'The pilot uses development services');
    const { runtime, migrator } = postgresTargets(env, true);
    assertFixtureDatabase(runtime);
    assert.equal(new URL(runtime).search + new URL(migrator).search, '', 'Use direct fixture database URLs');
    assert.equal(redisTarget(env, true).host, '127.0.0.1', 'Use a dedicated Redis fixture on loopback');
    if (env.FILE_OBJECT_STORE_ENDPOINT) {
        assert.equal(new URL(env.FILE_OBJECT_STORE_ENDPOINT).hostname, '127.0.0.1', 'Use the local object store');
        assert.equal(env.OBJECT_STORE_FIXTURE_ADAPTER, '1');
    }
    const external = Object.keys(env).filter(key => env[key] &&
        /^(META_MESSENGER_|WEB_PUSH_|TELEGRAM_|BOTSALES_AI_OPENAI_|BOTSALES_AI_EVALUATION_|BOTSALES_STAGING_AI_)/.test(key));
    assert.deepEqual(external, [], 'Remove live provider configuration before running the pilot');
    Object.assign(env, { MESSENGER_FIXTURE_ADAPTER: '1', AI_FIXTURE_ADAPTER: '1',
        NOTIFICATION_FIXTURE_ADAPTER: '1', PROCUREMENT_FIXTURE_ADAPTER: '1' });
}

async function data(response, expected = 200) {
    const result = await response;
    assert.equal(result.status(), expected, new URL(result.url()).pathname);
    return (await result.json()).data;
}

async function waitForCommand(get, commandId) {
    for (let attempt = 0; attempt < 40; attempt++) {
        const command = await get('/commands/' + commandId);
        if (command.status === 'succeeded') return command.result;
        assert.ok(['accepted', 'running'].includes(command.status), 'Local worker command failed');
        await delay(250);
    }
    throw new Error('Local worker did not finish the command');
}

async function verifyDevice(db, shopId, get, post) {
    const device = await post('/devices', { data: {
        deviceName: 'Thiết bị mẫu BE-22',
        endpoint: 'https://push-fixture.invalid/accepted/' + randomUUID(),
        p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url'),
        auth: Buffer.alloc(16, 2).toString('base64url'),
    } }, 201);
    const path = '/devices/' + device.id;
    try {
        const key = randomUUID();
        const input = { data: { expectedVersion: device.version } };
        const command = await post(path + '/test', input, 202, key);
        assert.equal((await post(path + '/test', input, 202, key)).id, command.id);
        const result = await waitForCommand(get, command.id);
        assert.equal(result.type, 'job');
        const notices = await db.appNotification.findMany({ where: { shopId, sourceType: 'job', sourceId: result.id } });
        assert.equal(notices.length, 1);
        assert.equal(notices[0].deliveryStatus, 'accepted_by_provider');
        assert.equal(notices[0].openedAt, null);
        assert.equal(notices[0].acknowledgedAt, null);
    } finally {
        const current = await get(path);
        const revoked = await post(path + '/revoke', { data: { expectedVersion: current.version } }, 200);
        assert.equal(revoked.status, 'revoked');
    }
}

async function verifyShop(page, db, shop, other, csrf, shared) {
    const api = shopApi(shop.id);
    const get = path => data(page.request.get(api + path));
    const post = (path, input, expected, key = randomUUID()) => data(page.request.post(api + path, {
        ...input, headers: { origin: appOrigin, 'x-csrf-token': csrf, 'idempotency-key': key },
    }), expected);
    await page.goto(appOrigin + '/workspaces');
    await page.getByText(shop.name, { exact: true }).waitFor();
    await page.locator('a[href="' + shopWeb(shop.id) + '/overview"]').click();
    await page.waitForURL(appOrigin + shopWeb(shop.id) + '/overview');
    await page.getByRole('link', { name: shop.name, exact: true }).waitFor();

    const returnPath = shopWeb(shop.id) + '/integrations/channels';
    const channel = await post('/integrations/channels/connect', { data: {
        returnPath, channelKind: 'facebook_messenger',
    } }, 200);
    assert.equal(new URL(channel.authorizationUrl).origin, appOrigin);
    const authorized = await page.request.get(channel.authorizationUrl, { maxRedirects: 0 });
    assert.equal(authorized.status(), 302);
    assert.equal(authorized.headers().location, returnPath);
    const connected = await db.channelConnection.findUniqueOrThrow({ where: {
        shopId_provider_pageId: { shopId: shop.id, provider: 'messenger', pageId: 'fixture-' + shop.id },
    } });
    assert.equal(connected.status, 'connected');
    const message = { ...shared, pageId: connected.pageId, generation: connected.generation, type: 'message',
        displayName: 'Khách mẫu ' + shop.currency, text: 'Tin thử BE-22 ' + shop.currency + ' ' + shared.eventId };
    const signature = signMessengerFixtureEvent(readAuthConfig(process.env).signingKey, message);
    const receive = key => page.request.post(root + '/integrations/messenger-fixture/events', {
        data: message, headers: { 'x-botsales-fixture-signature': key },
    });
    assert.equal((await receive('0'.repeat(64))).status(), 404);
    const original = await data(receive(signature));
    assert.equal(original.duplicate, false);
    assert.equal((await data(receive(signature))).duplicate, true);
    const stored = await db.channelMessage.findUniqueOrThrow({ where: { shopId_id: { shopId: shop.id, id: original.messageId } } });
    const resource = '/conversations/' + stored.conversationId;
    const before = await get(resource + '/messages');
    assert.deepEqual(before.map(item => item.id), [stored.id]);
    assert.equal((await page.request.get(shopApi(other.id) + resource)).status(), 404);

    const conversation = await get(resource);
    await post(resource + '/takeover', { data: { expectedVersion: conversation.version, reason: 'Nhận hội thoại mẫu BE-22' } }, 202);
    const wav = await post('/uploads', { multipart: { purpose: 'conversation_media', resourceId: conversation.id,
        file: { name: 'local-pilot.wav', mimeType: 'audio/wav', buffer: sampleAudio },
    } }, 201);
    assert.equal(wav.status, 'ready');
    assert.equal((await page.request.get(shopApi(other.id) + '/uploads/' + wav.id)).status(), 404);
    const queued = await post(resource + '/messages', { data: {
        clientMessageId: randomUUID(), expectedConversationVersion: (await get(resource)).version, fileIds: [wav.id],
    } }, 202);
    const sent = await waitForCommand(get, queued.id);
    assert.equal(sent.type, 'message');

    await page.goto(appOrigin + shopWeb(shop.id) + '/inbox/' + conversation.id);
    await page.getByText(message.text, { exact: true }).waitFor();
    const audio = page.locator('audio[aria-label="Phát local-pilot.wav"]');
    await audio.waitFor();
    await page.waitForFunction(() => globalThis.document.querySelector('audio[aria-label="Phát local-pilot.wav"]')?.readyState >= 1);
    await page.getByRole('button', { name: 'Duyệt bản chép lời', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Duyệt bản chép lời', exact: true });
    const input = { text: 'Bản chép lời nội bộ ' + shop.currency, transcriptSource: { messageId: sent.id, fileId: wav.id } };
    await dialog.getByRole('textbox', { name: 'Bản chép lời đã đối chiếu' }).fill(input.text);
    const [response] = await Promise.all([
        page.waitForResponse(result => result.url() === api + resource + '/notes' && result.request().method() === 'POST'),
        dialog.getByRole('button', { name: 'Lưu bản chép lời nội bộ', exact: true }).click(),
    ]);
    const note = await data(response, 201);
    assert.equal(note.direction, 'internal');
    assert.deepEqual(note.sourceEvidence, [
        { type: 'voice_transcript_file', id: wav.id }, { type: 'voice_transcript_message', id: sent.id },
    ]);
    const noteKey = response.request().headers()['idempotency-key'];
    assert.ok(noteKey);
    assert.equal((await post(resource + '/notes', { data: input }, 201, noteKey)).id, note.id);
    assert.equal(await db.messageDispatch.count({ where: { shopId: shop.id, messageId: note.id } }), 0);
    await page.getByText(input.text, { exact: true }).waitFor();
    await verifyDevice(db, shop.id, get, post);
    return { name: shop.name, currency: shop.currency, signedEventReplay: true, workerDispatch: 'succeeded',
        fixtureNotification: 'accepted_by_provider', deviceOpened: false, deviceRevoked: true,
        voiceTranscript: 'internal', crossShopConversation: 404, crossShopFile: 404 };
}

export async function verifyLocalPilot(page, session) {
    const db = fixtureWriter();
    try {
        const expectedIds = fixtureShops.map(shop => shop.id).sort();
        assert.deepEqual(session.memberships.map(item => item.shopId).sort(), expectedIds);
        const listed = await data(page.request.get(root + '/shops'));
        assert.deepEqual(listed.map(item => item.id).sort(), expectedIds);
        const shared = { eventId: randomUUID(), conversationId: randomUUID(), messageId: randomUUID(),
            senderId: randomUUID(), occurredAt: new Date().toISOString() };
        const results = [];
        for (const [index, shop] of fixtureShops.entries()) {
            const other = fixtureShops[1 - index];
            const actor = await fixtureSession(db, index === 0 ? 'p0-editor' : 'p0-editor-b');
            try {
                const headers = { cookie: actor.cookie };
                assert.equal((await fetch(shopApi(shop.id), { headers })).status, 200);
                assert.equal((await fetch(shopApi(other.id), { headers })).status, 404);
            } finally {
                await db.session.delete({ where: { id: actor.id } });
            }
            results.push(await verifyShop(page, db, shop, other, session.csrfToken, shared));
        }
        return results;
    } finally {
        await db.$disconnect();
    }
}
