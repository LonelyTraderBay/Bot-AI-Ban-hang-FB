import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { Command, Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { validIdempotencyKey } from '../../../http/contract-source.js';
import { recordCommand, type CommandRef, type ResourceRef } from '../../../platform/commands/index.js';
import { serializable } from '../../../platform/database/transactions.js';
import type { AuthConfig } from '../auth/config.js';
import { headerValue, requireMutationCsrf, requireSessionToken } from '../auth/session-tokens.js';
import { requireShopAccess, sessionPrincipal } from './access.js';

export type ShopScope = Awaited<ReturnType<typeof requireShopAccess>>;

export function writeAsSession<T>(db: PrismaClient | undefined, config: AuthConfig | undefined, headers: IncomingHttpHeaders,
    apply: (tx: Prisma.TransactionClient, userId: string, config: AuthConfig, token: string) => Promise<T>) {
    const token = requireSessionToken(headers);
    if (!db || !config) throw new ServiceUnavailableException();
    requireMutationCsrf(config, headers, token);
    return serializable(db, async tx => apply(tx, await sessionPrincipal(tx, token), config, token), true);
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
    return writeAsSession(db, config, input.headers, async (tx, userId, config) => {
        const idempotencyKey = requireIdempotencyKey(input.headers);
        const scope = await requireShopAccess(tx, userId, input.shopId, input.permission);
        const key = { shopId: scope.shopId, actorId: scope.userId, operationId: input.operationId, idempotencyKey };
        const { result, command } = await recordCommand(tx, key, input.payload, reference => apply(tx, scope, config, reference), input.deferred);
        return readResult(tx, scope, result, command);
    });
}
