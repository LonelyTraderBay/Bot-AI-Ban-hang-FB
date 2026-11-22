import { Body, ConflictException, Controller, Get, HttpCode, HttpException, NotFoundException, Param, Post, Query, Req, Res,
    ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Job, NotificationDevice, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe, listQuery, paging, validUuid } from '../../http/query.js';
import { envelope, noStore, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto } from '../../platform/commands/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { scheduleJob, type JobHandler } from '../../platform/jobs/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { deliverNotification, fingerprint, notificationFixture } from './deliveries.js';
import { openPushSubscription, sealPushSubscription, validPushKey, validWebPushSubscription, type WebPushConfig } from './web-push.js';
import { notificationTarget, type NotificationProviders } from './notification-target.js';
import { telegramApproved, telegramPairingCode, type TelegramConfig } from './telegram.js';

type Registration = { deviceName: string; endpoint: string; p256dh: string; auth: string };
type Version = { expectedVersion: number };
const inbound = (name: string) => new SchemaPipe(validator.compile(schemaFromContract(name)));
const key = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
const botUsername = 'BotSalesFixtureBot';
const testOperation = 'testDevice';
export const deviceCommands = [
    { operationId: 'createDevice', resourceType: 'device' },
    { operationId: 'revokeDevice', resourceType: 'device' },
    { operationId: testOperation, resourceType: 'job' },
    { operationId: 'beginTelegramPairing', resourceType: 'telegram_pairing' },
];

function deviceView(device: NotificationDevice) {
    const { shopId, id, version, createdAt, updatedAt, userId, deviceName, channel, status, lastVerifiedAt } = device;
    return { shopId, id, version, createdAt, updatedAt, userId, deviceName, channel, status, lastVerifiedAt };
}

async function getDevice(tx: Prisma.TransactionClient, shopId: string, id: string) {
    const device = await tx.notificationDevice.findUnique({ where: key(shopId, id) });
    if (!device) throw new NotFoundException();
    return device;
}

export function acceptFixturePairing(db: PrismaClient, config: AuthConfig, shopId: string, code: string, fixtureChatId: string, now = new Date()) {
    if (!notificationFixture(config)) throw new ServiceUnavailableException();
    const id = code.slice(0, 36);
    if (code.length !== 59 || !/^[A-Za-z0-9_-]+$/.test(code) || ![id, shopId, fixtureChatId].every(validUuid)) {
        throw new UnprocessableEntityException();
    }
    return serializable(db, async tx => {
        const pairing = await tx.telegramPairing.findUnique({ where: key(shopId, id) });
        if (!pairing || pairing.telegramBotId || pairing.usedAt || pairing.expiresAt <= now ||
            !timingSafeEqual(Buffer.from(code), Buffer.from(telegramPairingCode(config, pairing)))) throw new ConflictException();
        await requireShopAccess(tx, pairing.userId, shopId, 'notifications.manage');
        const hash = fingerprint('telegram-fixture:' + fixtureChatId);
        if (await tx.notificationDevice.findUnique({ where: { shopId_fingerprint: { shopId, fingerprint: hash } } })) {
            throw new ConflictException();
        }
        const device = await tx.notificationDevice.create({
            data: { shopId, userId: pairing.userId, deviceName: 'Telegram thử nghiệm', channel: 'telegram',
                fingerprint: hash, fixtureOutcome: 'accepted_by_provider', status: 'active', lastVerifiedAt: now },
        });
        await tx.telegramPairing.update({ where: key(shopId, id), data: { usedAt: now } });
        await recordAudit(tx, { shopId, actorId: pairing.userId, action: 'confirmFixtureTelegramPairing', requestId: pairing.id,
            resourceType: 'device', resourceId: device.id, metadata: { version: device.version } });
        return deviceView(device);
    }, true);
}

const testFailed = { status: 'failed', completed: 0, total: 1, errorCount: 1 } as const;
const testTitle = 'Thông báo kiểm tra';
const testBody = 'Mở BotSales AI để kiểm tra thiết bị.';
const eligibleTestDevice = (device: NotificationDevice | null, actorId: string, version: number): device is NotificationDevice =>
    Boolean(device && device.userId === actorId && device.version === version && ['pending', 'active'].includes(device.status));
type LiveDeviceTest = NotificationProviders & { db: PrismaClient; request?: typeof fetch };

async function settleDeviceTest(tx: Prisma.TransactionClient, job: Job, device: NotificationDevice,
    result: NotificationDevice['fixtureOutcome'], live = false, expired = false) {
    await deliverNotification(tx, {
        shopId: job.shopId, recipientUserId: device.userId, sourceType: 'job', sourceId: job.id,
        channel: device.channel, deliveryStatus: result, title: testTitle, safeBody: live ? testBody : 'Kết quả từ bộ thử cục bộ.',
    });
    if (result === 'unknown') return { status: 'awaiting_confirmation', completed: 0, total: 1, errorCount: 0 } as const;
    const accepted = result === 'accepted_by_provider';
    let version = device.version;
    if (accepted || expired || !live) {
        const updated = await tx.notificationDevice.update({
            where: key(job.shopId, device.id),
            data: { status: accepted ? 'active' : expired ? 'expired' : 'denied', lastVerifiedAt: accepted ? new Date() : null,
                ...(expired ? { pushSubscriptionCiphertext: null, telegramChatCiphertext: null } : {}), version: { increment: 1 } },
        });
        version = updated.version;
    }
    await recordAudit(tx, { shopId: job.shopId, actorId: job.actorId, action: 'testDeviceResult', requestId: job.id,
        resourceType: 'device', resourceId: device.id, metadata: { version, status: result } });
    return accepted ? { status: 'succeeded', completed: 1, total: 1, errorCount: 0 } as const : testFailed;
}

export function deviceTestHandler(config?: AuthConfig, live?: LiveDeviceTest): JobHandler {
    return async (job, controls) => {
        const input = job.input as { deviceId?: string; version?: number } | null;
        if (!input?.deviceId || !validUuid(input.deviceId) || !input.version) return testFailed;
        const deviceId = input.deviceId;
        const version = input.version;
        const where = key(job.shopId, deviceId);
        const device = await live?.db.notificationDevice.findUnique({ where });
        if (live && device && (device.pushSubscriptionCiphertext || device.telegramChatCiphertext)) {
            if (!eligibleTestDevice(device, job.actorId, version)) return testFailed;
            await controls.beginExternalEffect();
            const current = await live.db.notificationDevice.findUnique({ where });
            const target = eligibleTestDevice(current, job.actorId, version) && notificationTarget(current, live);
            if (!target) return testFailed;
            const observed = await target({ eventId: job.id, title: testTitle, safeBody: testBody,
                path: '/s/' + job.shopId + '/notifications' }, 60, live.request);
            return async tx => {
                const device = await tx.notificationDevice.findUnique({ where });
                if (!eligibleTestDevice(device, job.actorId, version)) {
                    return { status: 'awaiting_confirmation', completed: 0, total: 1, errorCount: 0 };
                }
                return settleDeviceTest(tx, job, device, observed.status, true, observed.expired);
            };
        }
        return async tx => {
            if (!notificationFixture(config)) return testFailed;
            const device = await tx.notificationDevice.findUnique({ where });
            if (!eligibleTestDevice(device, job.actorId, version) || device.pushSubscriptionCiphertext || device.telegramChatCiphertext) return testFailed;
            return settleDeviceTest(tx, job, device, device.fixtureOutcome);
        };
    };
}

export class DeviceService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig, private readonly webPush?: WebPushConfig,
        private readonly telegram?: TelegramConfig) {}

    list(headers: IncomingHttpHeaders, shopId: string, query: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'notifications.manage');
            const page = paging(listQuery(query, 'page'), ['devices', shopId, userId, String(scope.permissionVersion)]);
            const result = page.result(await tx.notificationDevice.findMany({
                where: { shopId, ...page.after }, orderBy: page.orderBy, take: page.limit + 1,
            }));
            return { ...result, data: result.data.map(deviceView) };
        });
    }

    get(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'notifications.manage');
            return deviceView(await getDevice(tx, shopId, id));
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, input: Registration, requestId: string) {
        return writeShopCommand(this.db, this.config, {
            headers, shopId, operationId: 'createDevice', permission: 'notifications.manage', payload: input,
        }, async (tx, scope, config) => {
            const deviceName = input.deviceName.trim();
            const endpoint = URL.parse(input.endpoint);
            const parts = endpoint?.pathname.split('/') ?? [];
            if (!notificationFixture(config) && (!this.webPush || endpoint?.origin === 'https://push-fixture.invalid')) {
                throw new ServiceUnavailableException();
            }
            if (!deviceName || deviceName.includes(String.fromCharCode(0)) || !endpoint) throw new UnprocessableEntityException();
            const fixture = notificationFixture(config) && endpoint.origin === 'https://push-fixture.invalid' &&
                !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash && parts.length === 3 &&
                ['accepted', 'failed', 'unknown'].includes(parts[1]) && validUuid(parts[2]) &&
                validPushKey(input.p256dh, 65) && Buffer.from(input.p256dh, 'base64url')[0] === 4 && validPushKey(input.auth, 16);
            const live = this.webPush && validWebPushSubscription(input);
            if (!fixture && !live) throw new UnprocessableEntityException();
            const hash = fingerprint(endpoint.href);
            const existing = await tx.notificationDevice.findUnique({ where: { shopId_fingerprint: { shopId, fingerprint: hash } } });
            const binding = { shopId, userId: scope.userId, fingerprint: hash };
            const sealed = this.webPush && live ? sealPushSubscription(this.webPush, binding, live) : null;
            if (existing) {
                if (existing.userId !== scope.userId || !['pending', 'active'].includes(existing.status)) throw new ConflictException();
                if (this.webPush && live) {
                    const prior = existing.pushSubscriptionCiphertext && openPushSubscription(this.webPush, existing, existing.pushSubscriptionCiphertext);
                    if (!prior || prior.p256dh !== live.p256dh || prior.auth !== live.auth) {
                        await tx.notificationDevice.update({ where: key(shopId, existing.id), data: {
                            pushSubscriptionCiphertext: sealed, status: 'pending', lastVerifiedAt: null, lastTestAt: null, version: { increment: 1 },
                        } });
                        await recordAudit(tx, { shopId, actorId: scope.userId, action: 'refreshPushSubscription', requestId,
                            resourceType: 'device', resourceId: existing.id });
                    }
                }
                return { type: 'device', id: existing.id };
            }
            const device = await tx.notificationDevice.create({ data: {
                ...binding, deviceName, channel: 'web_push', pushSubscriptionCiphertext: sealed,
                fixtureOutcome: fixture && parts[1] === 'accepted' ? 'accepted_by_provider' : fixture && parts[1] === 'failed' ? 'failed' : 'unknown',
            } });
            await recordAudit(tx, { shopId, actorId: scope.userId, action: 'createDevice', requestId,
                resourceType: 'device', resourceId: device.id, metadata: { version: device.version } });
            return { type: 'device', id: device.id };
        }, async (tx, _scope, result) => deviceView(await getDevice(tx, shopId, result.id)));
    }

    revoke(headers: IncomingHttpHeaders, shopId: string, id: string, input: Version, requestId: string) {
        return writeShopCommand(this.db, this.config, {
            headers, shopId, operationId: 'revokeDevice', permission: 'notifications.manage', payload: { id, input },
        }, async (tx, scope) => {
            const device = await getDevice(tx, shopId, id);
            requireVersion(device.version, input.expectedVersion);
            if (device.status === 'revoked') throw new ConflictException();
            const updated = await tx.notificationDevice.update({ where: key(shopId, id),
                data: { status: 'revoked', pushSubscriptionCiphertext: null, telegramChatCiphertext: null, version: { increment: 1 } } });
            await recordAudit(tx, { shopId, actorId: scope.userId, action: 'revokeDevice', requestId,
                resourceType: 'device', resourceId: id, metadata: { version: updated.version } });
            return { type: 'device', id };
        }, async (tx, _scope, result) => deviceView(await getDevice(tx, shopId, result.id)));
    }

    test(headers: IncomingHttpHeaders, shopId: string, id: string, input: Version, requestId: string) {
        return writeShopCommand(this.db, this.config, {
            headers, shopId, operationId: testOperation, permission: 'notifications.manage', payload: { id, input }, deferred: true,
        }, async (tx, scope, config, command) => {
            const device = await getDevice(tx, shopId, id);
            if (device.userId !== scope.userId) throw new NotFoundException();
            requireVersion(device.version, input.expectedVersion);
            if (!['pending', 'active'].includes(device.status)) throw new ConflictException();
            const enabled = device.pushSubscriptionCiphertext ? this.webPush : device.telegramChatCiphertext
                ? this.telegram && telegramApproved(this.telegram, shopId, scope.userId) : notificationFixture(config);
            if (!enabled) throw new ServiceUnavailableException();
            const now = new Date();
            if (device.lastTestAt && now.getTime() - device.lastTestAt.getTime() < 30000) throw new HttpException('Test interval', 429);
            const updated = await tx.notificationDevice.update({
                where: key(shopId, id), data: { lastTestAt: now, version: { increment: 1 } },
            });
            const job = await scheduleJob(tx, {
                shopId, actorId: scope.userId, sourceOperation: testOperation, kind: 'connection_test', commandId: command.id,
                input: { deviceId: id, version: updated.version }, dueAt: now,
            });
            await recordAudit(tx, { shopId, actorId: scope.userId, action: testOperation, requestId,
                resourceType: 'device', resourceId: id, metadata: { version: updated.version, jobId: job.id } });
            return { type: 'job', id: job.id };
        }, async (_tx, _scope, _result, command) => commandDto(command, 'job'));
    }

    pair(headers: IncomingHttpHeaders, shopId: string, requestId: string) {
        return writeShopCommand(this.db, this.config, {
            headers, shopId, operationId: 'beginTelegramPairing', permission: 'notifications.manage', payload: {},
        }, async (tx, scope, config, command) => {
            if (this.telegram) {
                if (!telegramApproved(this.telegram, shopId, scope.userId)) throw new UnprocessableEntityException('Tài khoản Telegram chưa được cấp.');
            } else if (!notificationFixture(config)) throw new ServiceUnavailableException();
            const now = new Date();
            if (await tx.telegramPairing.findFirst({
                where: { shopId, userId: scope.userId, telegramBotId: this.telegram?.botId ?? null,
                    createdAt: { gt: new Date(now.getTime() - 10000) } }, select: { id: true },
            })) throw new HttpException('Pairing interval', 429);
            await tx.telegramPairing.create({
                data: { id: command.id, shopId, userId: scope.userId, expiresAt: new Date(now.getTime() + 300000),
                    telegramBotId: this.telegram?.botId },
            });
            await recordAudit(tx, { shopId, actorId: scope.userId, action: 'beginTelegramPairing', requestId,
                resourceType: 'telegram_pairing', resourceId: command.id });
            return { type: 'telegram_pairing', id: command.id };
        }, async (tx, scope, result) => {
            if (!this.config) throw new ServiceUnavailableException();
            const pairing = await tx.telegramPairing.findUnique({ where: key(shopId, result.id) });
            if (!pairing || pairing.userId !== scope.userId) throw new NotFoundException();
            const bot = pairing.telegramBotId && pairing.telegramBotId === this.telegram?.botId &&
                telegramApproved(this.telegram, shopId, scope.userId) ? this.telegram.botUsername
                : !pairing.telegramBotId && notificationFixture(this.config) ? botUsername : null;
            if (!bot) throw new ServiceUnavailableException();
            return { pairingCode: telegramPairingCode(this.config, pairing), expiresAt: pairing.expiresAt, botUsername: bot };
        });
    }
}

@Controller('shops/:shopId')
export class DeviceController {
    constructor(private readonly devices: DeviceService) {}

    @Get('devices')
    @ContractOperation('listDevices')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.devices.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('devices/:resourceId')
    @ContractOperation('getDevice')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.devices.get(request.headers, shopId, id));
    }

    @Post('devices')
    @ContractOperation('createDevice')
    async create(@Param('shopId', idPipe) shopId: string, @Body(inbound('DeviceRegister')) input: Registration,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.devices.create(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post('devices/:resourceId/revoke')
    @HttpCode(200)
    @ContractOperation('revokeDevice')
    async revoke(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(inbound('VersionRequest')) input: Version,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.devices.revoke(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post('devices/:resourceId/test')
    @HttpCode(202)
    @ContractOperation('testDevice')
    async test(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(inbound('VersionRequest')) input: Version,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.devices.test(request.headers, shopId, id, input, String(response.getHeader('X-Request-Id'))));
    }

    @Post('telegram-pairing')
    @HttpCode(200)
    @ContractOperation('beginTelegramPairing')
    async pair(@Param('shopId', idPipe) shopId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.devices.pair(request.headers, shopId, String(response.getHeader('X-Request-Id'))));
    }
}
