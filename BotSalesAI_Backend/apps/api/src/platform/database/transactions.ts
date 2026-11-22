import { ServiceUnavailableException } from '@nestjs/common';
import { setTimeout as delay } from 'node:timers/promises';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

function adapterWriteConflict(error: unknown): boolean {
    const cause = (error as { cause?: { kind?: string; originalCode?: string } } | undefined)?.cause;
    return cause?.kind === 'TransactionWriteConflict' && (cause.originalCode === '40001' || cause.originalCode === '40P01');
}

function retryable(error: unknown, retryUnique: boolean): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return error.code === 'P2034' || (retryUnique && error.code === 'P2002') ||
            (error.code === 'P2010' && adapterWriteConflict(error.meta?.driverAdapterError));
    }
    // A commit can fail before Prisma wraps the adapter error.
    return error instanceof Error && error.name === 'DriverAdapterError' && adapterWriteConflict(error);
}

export async function serializable<T>(db: PrismaClient, action: (tx: Prisma.TransactionClient) => Promise<T>, retryUnique: boolean, timeout?: number): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await db.$transaction(action, { isolationLevel: 'Serializable', timeout });
        } catch (error) {
            if (!retryable(error, retryUnique)) throw error;
            if (attempt >= 3) throw new ServiceUnavailableException();
            // Let competing transactions settle before taking a fresh snapshot.
            const backoff = 20 * 2 ** attempt;
            await delay(backoff + Math.floor(Math.random() * backoff));
        }
    }
}
