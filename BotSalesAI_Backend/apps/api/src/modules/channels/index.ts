import { Body, ConflictException, Controller, Get, HttpCode, Module, NotFoundException, Param, Post, Query, Req, Res,
    UnprocessableEntityException, type DynamicModule } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { ChannelStatus, type ChannelAuthorization, type ChannelConnection, type Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { API_PREFIX, ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto } from '../../platform/commands/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { scheduleJob, type JobHandler } from '../../platform/jobs/index.js';
import { jobDetails, jobDto } from '../../platform/jobs/view.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { readAsSession, requireShopAccess, requireSessionToken, sessionPrincipal, usesLocalOidcFixture,
    writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { metaInboundPage, metaInboundPolicy, metaReplyPage, type MetaInboundConfig } from './meta-config.js';

export { metaInboundPage, metaNumericId, metaReplyPage, readMetaInboundConfig, type MetaInboundConfig } from './meta-config.js';

const provider = 'messenger';
const kind = 'facebook_messenger';
const manage = 'integrations.manage';
const read = 'integrations.read';
const checkOperation = 'checkChannelHealth';
const fixturePolicy = 'messenger-fixture-v1';
export { fixturePolicy as messengerFixturePolicy };
const authorizationPath = '/integrations/messenger-fixture/authorize';
const connectInput = new SchemaPipe(validator.compile(schemaFromContract('ConnectRequest')));
const disconnectInput = new SchemaPipe(validator.compile(schemaFromContract('VersionedReason')));
type Connect = { channelKind: typeof kind; returnPath: string };
type VersionReason = { expectedVersion: number; reason: string };
const key = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });

export const channelCommands = [
    { operationId: 'beginChannelConnect', resourceType: 'channel_authorization' },
    { operationId: 'reconnectChannel', resourceType: 'channel_authorization' },
    { operationId: 'disconnectChannel', resourceType: 'channel' },
    { operationId: checkOperation, resourceType: 'job' },
];

export const messengerFixtureEnabled = (config?: AuthConfig): config is AuthConfig =>
    process.env.MESSENGER_FIXTURE_ADAPTER === '1' && Boolean(config && usesLocalOidcFixture(config));

const fixtureMedia = { allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'audio/wav'], maxAttachmentCount: 5, maxFileSizeBytes: 5 * 1024 * 1024 };
export function channelMediaPolicy(channel: { status: ChannelStatus; policyVersion: string | null }) {
    return channel.status === 'connected' && channel.policyVersion === fixturePolicy ? fixtureMedia : null;
}

export function channelName(channel: Pick<ChannelConnection, 'name' | 'pageId'>) {
    return channel.name ?? 'Messenger ' + channel.pageId;
}

export async function channelInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const channel = await tx.channelConnection.findUnique({ where: key(shopId, id) });
    if (!channel || channel.provider !== provider) throw new NotFoundException();
    return channel;
}

export async function resolveMetaInboundChannel(tx: Prisma.TransactionClient, pageId: string, shopId: string) {
    const bindings = await tx.channelConnection.findMany({ where: { provider, pageId }, take: 2 });
    if (bindings.some(binding => binding.shopId !== shopId)) return undefined;
    const [channel] = bindings;
    if (channel) return channel.status === 'connected' && channel.policyVersion === metaInboundPolicy ? channel : undefined;
    if (!await tx.shop.findUnique({ where: { id: shopId }, select: { id: true } })) return undefined;
    return tx.channelConnection.create({ data: {
        shopId, provider, pageId, status: 'connected', policyVersion: metaInboundPolicy, policyVerifiedAt: new Date(),
    } });
}

function channelView(channel: ChannelConnection, meta?: MetaInboundConfig) {
    const { id, shopId, version, createdAt, updatedAt, pageId, status, lastWebhookAt, policyVersion, policyVerifiedAt } = channel;
    const mediaPolicy = channelMediaPolicy(channel);
    const metaInbound = metaInboundPage(meta, channel);
    const metaReply = metaReplyPage(meta, channel);
    return { id, shopId, version, createdAt, updatedAt, kind, externalPageId: pageId, name: channelName(channel), status,
        lastWebhookAt, policyVersion, policyVerifiedAt, capabilities: mediaPolicy ? ['send_text', 'send_media', 'receive_messages']
            : metaReply ? ['send_text', 'receive_messages'] : metaInbound ? ['receive_messages'] : [],
        warnings: mediaPolicy ? ['Cổng Messenger thử nghiệm dùng dữ liệu tổng hợp.']
            : metaReply ? ['Nhận và trả lời văn bản trong phạm vi tài khoản thử đã được duyệt.']
                : metaInbound ? ['Tiếp nhận văn bản từ tài khoản thử đã được duyệt.'] : ['Kết nối chưa sẵn sàng để gửi.'], mediaPolicy };
}

function signedState(config: AuthConfig, intent: ChannelAuthorization) {
    return createHmac('sha256', config.signingKey).update(JSON.stringify([
        'messenger_fixture_connect', intent.shopId, intent.id, intent.actorId, intent.channelId,
        intent.generation, intent.returnPath, intent.expiresAt.toISOString(),
    ])).digest();
}

async function changeChannelState(tx: Prisma.TransactionClient, channel: ChannelConnection, connected: boolean) {
    const updated = await tx.channelConnection.update({ where: key(channel.shopId, channel.id), data: {
        status: connected ? 'connected' : 'disabled', generation: { increment: 1 }, version: { increment: 1 },
        policyVersion: connected ? fixturePolicy : null, policyVerifiedAt: connected ? new Date() : null,
        ...(connected ? { lastWebhookAt: null } : {}),
    } });
    await enqueueResourceUpdate(tx, 'health.updated', updated);
    return updated;
}

class Channels {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig, private readonly meta?: MetaInboundConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, read);
            const filters = listQuery(raw);
            if (filters.status && !Object.hasOwn(ChannelStatus, filters.status)) throw new UnprocessableEntityException();
            const page = paging(filters, ['channels', shopId, userId, String(scope.permissionVersion)]);
            const includes = { contains: page.keyword, mode: 'insensitive' as const };
            const result = page.result(await tx.channelConnection.findMany({
                where: { shopId, provider, status: filters.status as ChannelStatus | undefined,
                    AND: [page.keyword ? { OR: [{ name: includes }, { pageId: includes }] } : {}, page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(channel => channelView(channel, this.meta)) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, read);
            return channelView(await channelInShop(tx, shopId, id), this.meta);
        });
    }

    start(headers: IncomingHttpHeaders, shopId: string, input: Connect, requestId: string, id?: string) {
        const operationId = id ? 'reconnectChannel' : 'beginChannelConnect';
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission: manage, payload: { id: id ?? null, input } },
            async (tx, scope, config) => {
                if (!messengerFixtureEnabled(config)) throw new UnprocessableEntityException('Chưa cấu hình cổng kết nối Messenger thử nghiệm.');
                if (input.returnPath !== '/s/' + shopId + '/integrations/channels') throw new UnprocessableEntityException();
                const channel = id ? await channelInShop(tx, shopId, id) : null;
                if (channel && !channel.pageId.startsWith('fixture-')) throw new UnprocessableEntityException();
                const intent = await tx.channelAuthorization.create({ data: {
                    shopId, actorId: scope.userId, channelId: channel?.id, generation: channel?.generation,
                    returnPath: input.returnPath, expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                } });
                await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId, resourceType: 'channel_authorization', resourceId: intent.id });
                return { type: 'channel_authorization', id: intent.id };
            }, async (tx, _scope, result) => {
                const intent = await tx.channelAuthorization.findUniqueOrThrow({ where: key(shopId, result.id) });
                if (!messengerFixtureEnabled(this.config)) throw new ConflictException();
                const query = new URLSearchParams({ shopId, intentId: intent.id, state: signedState(this.config, intent).toString('hex') });
                return { authorizationUrl: this.config.appOrigin + API_PREFIX + authorizationPath + '?' + query, expiresAt: intent.expiresAt };
            });
    }

    authorize(headers: IncomingHttpHeaders, raw: Record<string, unknown>, requestId: string) {
        const { shopId, intentId, state } = raw;
        const config = this.config;
        if (!this.db || !messengerFixtureEnabled(config) || typeof shopId !== 'string' || !validUuid(shopId) ||
            typeof intentId !== 'string' || !validUuid(intentId) || typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state) ||
            Object.keys(raw).length !== 3) throw new NotFoundException();
        const token = requireSessionToken(headers);
        return serializable(this.db, async tx => {
            const scope = await requireShopAccess(tx, await sessionPrincipal(tx, token), shopId, manage);
            const intent = await tx.channelAuthorization.findUnique({ where: key(shopId, intentId) });
            if (!intent || intent.actorId !== scope.userId || !timingSafeEqual(signedState(config, intent), Buffer.from(state, 'hex'))) throw new NotFoundException();
            if (intent.usedAt || intent.expiresAt <= new Date()) throw new ConflictException();
            const used = await tx.channelAuthorization.updateMany({
                where: { shopId, id: intentId, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() },
            });
            if (!used.count) throw new ConflictException();
            const pageId = 'fixture-' + shopId;
            let channel = intent.channelId ? await channelInShop(tx, shopId, intent.channelId) :
                await tx.channelConnection.findUnique({ where: { shopId_provider_pageId: { shopId, provider, pageId } } });
            if (channel && intent.channelId && channel.generation !== intent.generation) throw new ConflictException();
            if (channel) channel = await changeChannelState(tx, channel, true);
            else {
                channel = await tx.channelConnection.create({ data: {
                    shopId, provider, pageId, name: 'Page thử nghiệm Messenger', status: 'connected', policyVersion: fixturePolicy, policyVerifiedAt: new Date(),
                } });
                await enqueueResourceUpdate(tx, 'health.updated', channel);
            }
            await recordAudit(tx, { shopId, actorId: scope.userId, action: 'authorizeFixtureChannel', requestId, resourceType: 'channel',
                resourceId: channel.id, metadata: { version: channel.version, authorizationId: intent.id } });
            return intent.returnPath;
        }, true);
    }

    disconnect(headers: IncomingHttpHeaders, shopId: string, id: string, input: VersionReason, requestId: string) {
        const operationId = 'disconnectChannel';
        const reason = input.reason.trim();
        if (reason.length < 5 || reason.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId, permission: manage, payload: { id, input } },
            async (tx, scope) => {
                const channel = await channelInShop(tx, shopId, id);
                requireVersion(channel.version, input.expectedVersion);
                if (channel.status === 'disabled') throw new ConflictException();
                const disabled = await changeChannelState(tx, channel, false);
                await recordAudit(tx, { shopId, actorId: scope.userId, action: operationId, requestId, resourceType: 'channel',
                    resourceId: id, metadata: { reason, version: disabled.version } });
                return { type: 'channel', id };
            }, async (_tx, _scope, _result, command) => commandDto(command, 'channel'));
    }

    check(headers: IncomingHttpHeaders, shopId: string, id: string, requestId: string) {
        return writeShopCommand(this.db, this.config, { headers, shopId, operationId: checkOperation, permission: manage, payload: { id }, deferred: true },
            async (tx, scope, _config, command) => {
                const channel = await channelInShop(tx, shopId, id);
                const verifyMetaInbound = Boolean(metaInboundPage(this.meta, channel));
                if (channel.status === 'connected' && channel.policyVersion === metaInboundPolicy && !verifyMetaInbound) throw new UnprocessableEntityException();
                const job = await scheduleJob(tx, { shopId, actorId: scope.userId, sourceOperation: checkOperation, kind: 'connection_test',
                    input: { channelId: channel.id, generation: channel.generation, ...(verifyMetaInbound ? { verifyMetaInbound } : {}) }, commandId: command.id });
                await recordAudit(tx, { shopId, actorId: scope.userId, action: checkOperation, requestId, resourceType: 'job', resourceId: job.id,
                    metadata: { channelId: channel.id } });
                return { type: 'job', id: job.id };
            }, async (tx, _scope, result) => jobDto(await tx.job.findUniqueOrThrow({ where: key(shopId, result.id), include: jobDetails })));
    }
}

export function channelTestHandler(config?: AuthConfig): JobHandler {
    return async job => async tx => {
        const { channelId, generation, verifyMetaInbound } = job.input as { channelId: string; generation: number; verifyMetaInbound?: boolean };
        const channel = await channelInShop(tx, job.shopId, channelId);
        const compatible = (messengerFixtureEnabled(config) && channel.policyVersion === fixturePolicy) || (verifyMetaInbound && channel.policyVersion === metaInboundPolicy);
        const good = compatible && channel.status === 'connected' &&
            channel.generation === generation && channel.lastWebhookAt !== null;
        return { status: good ? 'succeeded' : 'failed', completed: good ? 1 : 0, total: 1, errorCount: good ? 0 : 1,
            rowErrors: good ? [] : [{ row: 1, field: 'channel', code: 'CHANNEL_UNVERIFIED', message: 'Chưa nhận được sự kiện xác minh của kết nối hiện hành.' }],
            ...(good ? { result: { type: 'channel', id: channelId } } : {}) };
    };
}

@Controller('shops/:shopId/integrations/channels')
class ChannelsController {
    constructor(private readonly channels: Channels) {}

    @Get()
    @ContractOperation('listChannels')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.channels.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get(':channelId')
    @ContractOperation('getChannel')
    async get(@Param('shopId', idPipe) shopId: string, @Param('channelId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.channels.get(request.headers, shopId, id));
    }

    @Post('connect')
    @HttpCode(200)
    @ContractOperation('beginChannelConnect')
    async connect(@Param('shopId', idPipe) shopId: string, @Body(connectInput) input: Connect,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.channels.start(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':channelId/reconnect')
    @HttpCode(200)
    @ContractOperation('reconnectChannel')
    async reconnect(@Param('shopId', idPipe) shopId: string, @Param('channelId', idPipe) id: string, @Body(connectInput) input: Connect,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.channels.start(request.headers, shopId, input, String(response.getHeader('X-Request-Id')), id));
    }

    @Post(':channelId/disconnect')
    @HttpCode(202)
    @ContractOperation('disconnectChannel')
    async disconnect(@Param('shopId', idPipe) shopId: string, @Param('channelId', idPipe) id: string, @Body(disconnectInput) input: VersionReason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.channels.disconnect(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post(':channelId/check')
    @HttpCode(202)
    @ContractOperation(checkOperation)
    async check(@Param('shopId', idPipe) shopId: string, @Param('channelId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.channels.check(request.headers, shopId, id, String(response.getHeader('X-Request-Id'))));
    }
}

@Controller('integrations/messenger-fixture')
class FixtureAuthorizationController {
    constructor(private readonly channels: Channels) {}

    @Get('authorize')
    async authorize(@Query() query: Record<string, unknown>, @Req() request: IncomingMessage, @Res() response: ServerResponse) {
        noStore(response);
        const location = await this.channels.authorize(request.headers, query, String(response.getHeader('X-Request-Id')));
        response.writeHead(302, { Location: location }).end();
    }
}

@Module({})
class ChannelsModule {}

export function channelsModule(db?: PrismaClient, config?: AuthConfig, meta?: MetaInboundConfig): DynamicModule {
    return {
        module: ChannelsModule, controllers: [ChannelsController, ...(messengerFixtureEnabled(config) ? [FixtureAuthorizationController] : [])],
        providers: [{ provide: Channels, useFactory: () => new Channels(db, config, meta) }],
    };
}
