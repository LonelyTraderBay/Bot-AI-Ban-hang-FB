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

export function writeShopCommand<T>(
    db: PrismaClient | undefined,
    config: AuthConfig | undefined,
    input: { headers: IncomingHttpHeaders; shopId: string; permission: string; operationId: string; payload: Prisma.InputJsonValue; deferred?: boolean },
    apply: (tx: Prisma.TransactionClient, scope: ShopScope, config: AuthConfig, command: CommandRef) => Promise<ResourceRef>,
    readResult: (tx: Prisma.TransactionClient, scope: ShopScope, result: ResourceRef, command: Command) => Promise<T>,
) {
    const token = requireSessionToken(input.headers);
    if (!db || !config) throw new ServiceUnavailableException();
    requireMutationCsrf(config, input.headers, token);
    const idempotencyKey = headerValue(input.headers, 'idempotency-key');
    if (!validIdempotencyKey(idempotencyKey)) throw new BadRequestException();
    return serializable(db, async tx => {
        const scope = await requireShopAccess(tx, await sessionPrincipal(tx, token), input.shopId, input.permission);
        const key = { shopId: scope.shopId, actorId: scope.userId, operationId: input.operationId, idempotencyKey };
        const { result, command } = await recordCommand(tx, key, input.payload, reference => apply(tx, scope, config, reference), input.deferred);
        return readResult(tx, scope, result, command);
    }, true);
}
