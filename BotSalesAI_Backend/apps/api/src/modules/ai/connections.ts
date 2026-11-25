import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { ChannelStatus, type AiConnection, type Command, type Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import type { ResourceRef } from '../../platform/commands/index.js';
import { scheduleJob, type JobHandler } from '../../platform/jobs/index.js';
import { jobDetails, jobDto } from '../../platform/jobs/view.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig, type ShopScope } from '../workspace/index.js';
import { aiFixtureEnabled, credentialFingerprint, fixtureCredentialValid, fixtureProvider, sealCredential } from './fixture-provider.js';
import { isOpenAiConnection, openAiCapabilities, openAiDescriptor, openAiGrant, openAiTarget, readOpenAiCredential, sealOpenAiCredential,
    validOpenAiCredential, type OpenAiConnectionConfig } from './openai-connections.js';
import { OpenAiError, requestOpenAi } from './openai-transport.js';

export type ConnectionWrite = { name: string; providerId: string; adapterId: string; modelId: string; endpointUrl: string | null; credential: string };
export type ConnectionPatch = Partial<Pick<ConnectionWrite, 'name' | 'modelId' | 'credential'>>;
const testOperation = 'testAIConnection';
type Action = 'createAIConnection' | 'updateAIConnection' | 'deleteAIConnection' | typeof testOperation;
export const aiConnectionCommands = (['createAIConnection', 'updateAIConnection', 'deleteAIConnection', testOperation] as const)
    .map(operationId => ({ operationId, resourceType: operationId === testOperation ? 'job' : 'ai_connection' }));
export const aiKey = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
type ConnectionTarget = Pick<AiConnection, 'providerId' | 'adapterId' | 'modelId' | 'endpointUrl'>;

function fixtureModel(target: ConnectionTarget) {
    if (target.providerId !== fixtureProvider.providerId || target.adapterId !== fixtureProvider.adapterId || target.endpointUrl !== null)
        return undefined;
    return fixtureProvider.models.find(model => model.modelId === target.modelId);
}

function fixtureTarget(target: ConnectionTarget, auth?: AuthConfig) {
    return aiFixtureEnabled(auth) && Boolean(fixtureModel(target));
}

function sanitizedText(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return trimmed;
}

export async function aiConnectionInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const connection = await tx.aiConnection.findUnique({ where: aiKey(shopId, id) });
    if (!connection || connection.deletedAt) throw new NotFoundException();
    return connection;
}

export function aiConnectionReady(connection: AiConnection | null, config: AuthConfig | undefined) {
    return Boolean(connection && connection.status === 'connected' && !connection.deletedAt && connection.lastCheckedAt &&
        connection.credentialCiphertext && aiFixtureEnabled(config) && fixtureTarget(connection, config) &&
        fixtureCredentialValid(config, connection.shopId, connection.id, connection.credentialCiphertext));
}

export function connectionCapabilities(connection: AiConnection) {
    const model = fixtureModel(connection);
    return model ? { ...model.capabilities, lastVerifiedAt: connection.status === 'connected' ? connection.lastCheckedAt : null } : openAiCapabilities;
}

function connectionView(connection: AiConnection) {
    const { id, shopId, version, createdAt, updatedAt, name, providerId, adapterId, modelId, endpointUrl, status, lastCheckedAt, keyLast4 } = connection;
    return { id, shopId, version, createdAt, updatedAt, name, providerId, adapterId, modelId, endpointUrl, status, lastCheckedAt, keyLast4,
        hasCredential: Boolean(connection.credentialCiphertext), capabilities: connectionCapabilities(connection) };
}

export class AiConnections {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig, private readonly openAi?: OpenAiConnectionConfig) {}

    catalog(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (_tx, scope) => {
            const query = listQuery(raw);
            const page = paging(query, ['ai_catalog', shopId, scope.userId, String(scope.permissionVersion)]);
            const grant = openAiGrant(this.openAi, shopId);
            const createdAt = new Date(0);
            const ascending = page.orderBy[0].createdAt === 'asc';
            const keyword = query.q?.trim().toLowerCase() ?? '';
            const options = [
                ...(aiFixtureEnabled(this.config) ? [{ id: '09c1a526-2644-4bf6-ac2c-f83aa17bcada', createdAt, descriptor: fixtureProvider }] : []),
                ...(grant ? [{ id: '94019d89-e789-40f3-9e57-0d5a7018eddf', createdAt, descriptor: openAiDescriptor(grant) }] : []),
            ].filter(row => !query.status && [row.descriptor.providerId, row.descriptor.label].some(value => value.toLowerCase().includes(keyword)) &&
                (!page.position || (ascending ? row.id > page.position.id : row.id < page.position.id)));
            const result = page.result(ascending ? options : options.reverse());
            return { ...result, data: result.data.map(row => row.descriptor) };
        });
    }

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return this.read(headers, shopId, async (tx, scope) => {
            const query = listQuery(raw);
            if (query.status && !Object.hasOwn(ChannelStatus, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['ai_connections', shopId, scope.userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.aiConnection.findMany({
                where: { shopId, deletedAt: null, status: query.status as ChannelStatus | undefined,
                    AND: [page.keyword ? { name: { contains: page.keyword, mode: 'insensitive' } } : {}, page.after ?? {}] },
                orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(connectionView) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return this.read(headers, shopId, async tx => connectionView(await aiConnectionInShop(tx, shopId, id)));
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: ConnectionWrite, requestId: string) {
        const { credential: secret, ...fields } = input;
        const fingerprint = credentialFingerprint(this.config, shopId, secret);
        return this.change({ headers, shopId, operationId: 'createAIConnection', payload: { ...fields, fingerprint }, requestId }, async (tx, scope, config) => {
            const id = randomUUID();
            const credential = sanitizedText(secret);
            const credentialCiphertext = this.seal(input, config, shopId, id, credential);
            const connection = await tx.aiConnection.create({ data: {
                ...fields, shopId, id, name: sanitizedText(input.name), credentialCiphertext,
                keyLast4: Array.from(credential).slice(-4).join(''),
            } });
            await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: 'createAIConnection', resourceType: 'ai_connection',
                resourceId: id, metadata: { version: connection.version, providerId: input.providerId } });
            return { id };
        }, async (tx, ref) => connectionView(await aiConnectionInShop(tx, shopId, ref.id)));
    }

    update(headers: IncomingHttpHeaders, shopId: string, id: string, patch: ConnectionPatch, requestId: string) {
        const version = requireIfMatch(headers);
        const { credential: secret, ...fields } = patch;
        const fingerprint = secret === undefined ? null : credentialFingerprint(this.config, shopId, secret);
        return this.change({ headers, shopId, operationId: 'updateAIConnection', payload: { id, fields, fingerprint, version }, requestId },
            async (tx, scope, config) => {
                const connection = await aiConnectionInShop(tx, shopId, id);
                requireVersion(connection.version, version);
                const target = { ...connection, modelId: fields.modelId ?? connection.modelId };
                if (!openAiTarget(this.openAi, shopId, target) && !fixtureTarget(target, config)) throw new UnprocessableEntityException();
                if (isOpenAiConnection(connection) && target.modelId !== connection.modelId && secret === undefined) throw new UnprocessableEntityException();
                const credential = secret === undefined ? undefined : sanitizedText(secret);
                const changed = credential !== undefined || (fields.modelId !== undefined && fields.modelId !== connection.modelId);
                const current = await tx.aiConnection.update({ where: aiKey(shopId, id), data: {
                    name: fields.name === undefined ? undefined : sanitizedText(fields.name), modelId: fields.modelId,
                    ...(credential !== undefined ? { credentialCiphertext: this.seal(target, config, shopId, id, credential), keyLast4: Array.from(credential).slice(-4).join('') } : {}),
                    ...(changed ? { status: 'unconfigured', lastCheckedAt: null, checkJobId: null } : {}), version: { increment: 1 },
                } });
                await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: 'updateAIConnection', resourceType: 'ai_connection',
                    resourceId: id, metadata: { version: current.version, credentialChanged: credential !== undefined } });
                return { id };
            }, async (tx, ref) => connectionView(await aiConnectionInShop(tx, shopId, ref.id)));
    }

    delete(headers: IncomingHttpHeaders, shopId: string, id: string, requestId: string) {
        const version = requireIfMatch(headers);
        return this.change({ headers, shopId, operationId: 'deleteAIConnection', payload: { id, version }, requestId }, async (tx, scope) => {
            const connection = await aiConnectionInShop(tx, shopId, id);
            requireVersion(connection.version, version);
            const bot = await tx.botConfig.findUnique({ where: { shopId }, select: { status: true, liveRevision: true } });
            if (bot?.status === 'active' && bot.liveRevision && await tx.botRevision.findUnique({ where: { shopId_revision: { shopId, revision: bot.liveRevision } },
                select: { connectionId: true } }).then(revision => revision?.connectionId === id)) throw new ConflictException('Kết nối đang được cấu hình đang chạy sử dụng.');
            await tx.aiConnection.update({ where: aiKey(shopId, id), data: {
                status: 'disabled', deletedAt: new Date(), credentialCiphertext: null, keyLast4: null, version: { increment: 1 },
            } });
            await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: 'deleteAIConnection', resourceType: 'ai_connection', resourceId: id });
            return { id };
        }, async () => undefined);
    }

    check(headers: IncomingHttpHeaders, shopId: string, id: string, requestId: string) {
        return this.change({ headers, shopId, operationId: testOperation, payload: { id }, requestId, deferred: true }, async (tx, scope, config, command) => {
            const connection = await aiConnectionInShop(tx, shopId, id);
            const probe = openAiTarget(this.openAi, shopId, connection);
            if (!probe && !fixtureTarget(connection, config)) throw new UnprocessableEntityException();
            if (probe && (!this.openAi || !readOpenAiCredential(this.openAi, probe, connection))) throw new UnprocessableEntityException();
            if (connection.status === 'validating' && connection.checkJobId && await tx.job.findFirst({ where: {
                shopId, id: connection.checkJobId, status: { in: ['queued', 'running'] },
            }, select: { id: true } })) throw new ConflictException();
            const job = await scheduleJob(tx, { shopId, actorId: scope.userId, sourceOperation: testOperation, kind: 'connection_test', commandId: command.id,
                input: { connectionId: id, version: connection.version + 1, ...(probe ? { provider: 'openai' } : {}) } });
            const updated = await tx.aiConnection.update({ where: aiKey(shopId, id), data: {
                status: 'validating', checkJobId: job.id, version: { increment: 1 },
            } });
            await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: testOperation, resourceType: 'job', resourceId: job.id,
                metadata: { connectionId: id, version: updated.version } });
            return { id: job.id };
        }, async (tx, ref) => jobDto(await tx.job.findUniqueOrThrow({ where: aiKey(shopId, ref.id), include: jobDetails })));
    }

    private seal(target: ConnectionTarget, config: AuthConfig, shopId: string, id: string, credential: string) {
        const grant = openAiTarget(this.openAi, shopId, target);
        if (grant && this.openAi && validOpenAiCredential(credential)) return sealOpenAiCredential(this.openAi, grant, shopId, id, credential);
        if (fixtureTarget(target, config)) return sealCredential(config, shopId, id, credential);
        throw new UnprocessableEntityException();
    }

    private read<T>(headers: IncomingHttpHeaders, shopId: string, collect: (tx: Prisma.TransactionClient, scope: ShopScope) => Promise<T>) {
        return readAsSession(this.db, headers, async (tx, userId) => collect(tx, await requireShopAccess(tx, userId, shopId, 'integrations.read')));
    }

    private change<T>(input: { headers: IncomingHttpHeaders; shopId: string; operationId: Action; payload: Prisma.InputJsonValue; requestId: string; deferred?: boolean },
        apply: (tx: Prisma.TransactionClient, scope: ShopScope, config: AuthConfig, command: Pick<Command, 'shopId' | 'id'>) => Promise<{ id: string }>,
        outcome: (tx: Prisma.TransactionClient, ref: ResourceRef) => Promise<T>) {
        const resourceType = input.operationId === testOperation ? 'job' : 'ai_connection';
        return writeShopCommand(this.db, this.config, { ...input, permission: 'integrations.manage' }, async (tx, scope, config, command) => {
            const record = await apply(tx, scope, config, command);
            return { type: resourceType, id: record.id };
        }, (tx, _scope, ref) => {
            if (ref.type !== resourceType) throw new ConflictException();
            return outcome(tx, ref);
        });
    }
}

export type AiProbeServices = { db: PrismaClient; openAi?: OpenAiConnectionConfig; request?: typeof fetch };
type CheckKey = { connectionId: string; version: number; provider?: 'openai' };

async function checkConnection(db: Prisma.TransactionClient, shopId: string, jobId: string, key: CheckKey) {
    const connection = await db.aiConnection.findUnique({ where: aiKey(shopId, key.connectionId) });
    return connection && !connection.deletedAt && connection.status === 'validating' && connection.version === key.version &&
        connection.checkJobId === jobId ? connection : null;
}

function checkResult(id: string, code: string | null) {
    const status = !code ? 'succeeded' : code === 'PROVIDER_RESULT_UNKNOWN' ? 'awaiting_confirmation' : 'failed';
    return { status, completed: code ? 0 : 1, total: 1, errorCount: code ? 1 : 0,
        rowErrors: code ? [{ row: 1, field: 'connection', code, message: 'Chưa xác minh được quyền truy cập model.' }] : [],
        ...(!code ? { result: { type: 'ai_connection', id } } : {}) } as const;
}

async function verifyOpenAiModel(services: AiProbeServices | undefined, shopId: string, jobId: string, key: CheckKey,
    beginExternalEffect: () => Promise<void>) {
    if (!services?.openAi) return 'AI_OPENAI_SCOPE_UNAVAILABLE';
    const { db, openAi, request } = services;
    const prepared = async () => {
        const connection = await checkConnection(db, shopId, jobId, key);
        if (!connection) return null;
        const grant = openAiTarget(openAi, shopId, connection);
        const secret = grant && readOpenAiCredential(openAi, grant, connection);
        return grant && secret ? { grant, secret } : null;
    };
    if (!await prepared()) return 'AI_OPENAI_SCOPE_UNAVAILABLE';
    await beginExternalEffect();
    const current = await prepared();
    if (!current) return 'AI_OPENAI_SCOPE_UNAVAILABLE';
    try {
        const model = await requestOpenAi(current.grant, current.secret, jobId, { kind: 'model' }, request);
        return model?.object === 'model' && model.id === current.grant.model ? null : 'PROVIDER_RESPONSE_INVALID';
    } catch (error) {
        return error instanceof OpenAiError ? error.code : 'PROVIDER_RESULT_UNKNOWN';
    }
}

export function aiConnectionTestHandler(config?: AuthConfig, services?: AiProbeServices): JobHandler {
    return async (job, controls) => {
        const key = job.input as CheckKey;
        const openAi = key.provider === 'openai';
        const observed = openAi ? await verifyOpenAiModel(services, job.shopId, job.id, key, controls.beginExternalEffect) : null;
        return async tx => {
            const connection = await checkConnection(tx, job.shopId, job.id, key);
            const grant = connection && openAiTarget(services?.openAi, job.shopId, connection);
            const fixtureApproved = connection?.credentialCiphertext && aiFixtureEnabled(config) && fixtureTarget(connection, config) &&
                fixtureCredentialValid(config, job.shopId, key.connectionId, connection.credentialCiphertext);
            const code = !connection ? 'AI_CHECK_STALE' : openAi ? observed ?? (grant ? null : 'AI_OPENAI_SCOPE_UNAVAILABLE')
                : fixtureApproved ? null : 'AI_FIXTURE_CHECK_FAILED';
            if (connection) await tx.aiConnection.update({ where: aiKey(job.shopId, key.connectionId), data: {
                status: code ? 'degraded' : 'connected', lastCheckedAt: new Date(), version: { increment: 1 },
            } });
            return checkResult(key.connectionId, code);
        };
    };
}
