import { BadRequestException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { Command, Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { validIdempotencyKey } from '../../../http/contract-source.js';
import { recordCommand, type CommandRef, type ResourceRef } from '../../../platform/commands/index.js';
import { lockShopClosure, requireOpenShop } from '../../../platform/database/shop-lifecycle.js';
import { serializable } from '../../../platform/database/transactions.js';
import type { AuthConfig } from '../auth/config.js';
import { headerValue, requireMutationCsrf, requireSessionToken } from '../auth/session-tokens.js';
import { requireShopAccess, sessionPrincipal } from './access.js';

export type ShopScope = Awaited<ReturnType<typeof requireShopAccess>>;

export function writeAsSession<T>(db: PrismaClient | undefined, config: AuthConfig | undefined, headers: IncomingHttpHeaders,
    apply: (tx: Prisma.TransactionClient, userId: string, config: AuthConfig, token: string) => Promise<T>,
    isolation: 'Serializable' | 'ReadCommitted' = 'Serializable') {
    const token = requireSessionToken(headers);
    if (!db || !config) throw new ServiceUnavailableException();
    requireMutationCsrf(config, headers, token);
    const run = async (tx: Prisma.TransactionClient) => apply(tx, await sessionPrincipal(tx, token), config, token);
    return isolation === 'ReadCommitted' ? db.$transaction(run, { isolationLevel: isolation }) : serializable(db, run, true);
}

export function requireIdempotencyKey(headers: IncomingHttpHeaders) {
    const key = headerValue(headers, 'idempotency-key');
    if (!validIdempotencyKey(key)) throw new BadRequestException();
    return key;
}

export function writeShopCommand<T>(
    db: PrismaClient | undefined,
    config: AuthConfig | undefined,
    input: { headers: IncomingHttpHeaders; shopId: string; permission: string; operationId: string; payload: Prisma.InputJsonValue; deferred?: boolean },
    apply: (tx: Prisma.TransactionClient, scope: ShopScope, config: AuthConfig, command: CommandRef) => Promise<ResourceRef>,
    readResult: (tx: Prisma.TransactionClient, scope: ShopScope, result: ResourceRef, command: Command) => Promise<T>,
) {
    const lifecycle = input.operationId === 'closeShop' || input.operationId === 'reopenShop';
    return writeAsSession(db, config, input.headers, async (tx, userId, config) => {
        const idempotencyKey = requireIdempotencyKey(input.headers);
        const authorize = async () => {
            const scope = await requireShopAccess(tx, userId, input.shopId, input.permission);
            if (lifecycle && !scope.roles.includes('owner')) throw new ForbiddenException();
            return scope;
        };
        let scope = await authorize();
        if (lifecycle) {
            // Recheck current ownership and blockers after any preceding writer releases the shop.
            await lockShopClosure(tx, scope.shopId);
            scope = await authorize();
        }
        const key = { shopId: scope.shopId, actorId: scope.userId, operationId: input.operationId, idempotencyKey };
        const { result, command } = await recordCommand(tx, key, input.payload, async reference => {
            if (!lifecycle) {
                if (['revokeMembership', 'createPrivacyRequest', 'approvePrivacyRequest'].includes(input.operationId)) {
                    await lockShopClosure(tx, scope.shopId);
                } else {
                    await requireOpenShop(tx, scope.shopId);
                }
            }
            return apply(tx, scope, config, reference);
        }, input.deferred);
        return readResult(tx, scope, result, command);
    }, lifecycle ? 'ReadCommitted' : 'Serializable');
}
