import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Command, Prisma } from '../../generated/prisma/client.js';
import { DomainConflict } from '../../http/contracts.js';
import { validUuid } from '../../http/query.js';
import { enqueueCommandUpdate } from '../outbox/index.js';

type CommandIntent = Pick<Prisma.CommandUncheckedCreateInput, 'shopId' | 'actorId' | 'operationId' | 'idempotencyKey'>;
export type ResourceRef = { type: string; id: string; scope?: string };
export type CommandRef = Pick<Command, 'shopId' | 'id'>;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export class IdempotencyMismatch extends DomainConflict {
    constructor() {
        super('IDEMPOTENCY_MISMATCH', 'Khóa thao tác đã gắn với dữ liệu khác. Kiểm tra kết quả lệnh đã gửi trước khi tạo thao tác mới.');
    }
}

export function commandResult(value: Prisma.JsonValue | null): ResourceRef | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const { type, id } = value;
    return typeof type === 'string' && typeof id === 'string' ? { type, id } : null;
}

export async function recordCommand(
    tx: Prisma.TransactionClient, key: CommandIntent, payload: Prisma.InputJsonValue,
    apply: (record: CommandRef) => Promise<ResourceRef>, deferred = false,
) {
    const requestHash = hash(JSON.stringify(payload, (_key, value: unknown) =>
        value && typeof value === 'object' && !Array.isArray(value)
            ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
            : value));
    const recorded = await tx.command.findUnique({ where: { shopId_actorId_operationId_idempotencyKey: key } });
    if (recorded) {
        if (recorded.requestHash !== requestHash) throw new IdempotencyMismatch();
        const result = commandResult(recorded.result);
        if ((!deferred && recorded.status !== 'succeeded') || !result) {
            throw new ConflictException();
        }
        return { result, command: recorded };
    }
    const record = await tx.command.create({
        data: { ...key, requestHash, intentHash: hash(key.idempotencyKey), status: 'accepted' },
        select: { id: true, shopId: true },
    });
    const result = await apply(record);
    const command = await tx.command.update({
        where: { shopId_id: { shopId: record.shopId, id: record.id } },
        data: { status: deferred ? 'accepted' : 'succeeded', result },
    });
    await enqueueCommandUpdate(tx, command);
    return { result, command };
}

export function commandDto(command: Command, resourceType: string) {
    const result = commandResult(command.result);
    return {
        id: command.id, shopId: command.shopId, kind: command.operationId, status: command.status,
        createdAt: command.createdAt.toISOString(), updatedAt: command.updatedAt.toISOString(),
        result: command.status === 'succeeded' && result && result.type === resourceType && validUuid(result.id) ? result : null,
        problem: null,
    };
}
