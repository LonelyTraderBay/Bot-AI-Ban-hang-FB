import { lockShopClosure } from '../../platform/database/shop-lifecycle.js';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { FileObject, FileStorageState, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { recordAudit } from '../../platform/audit/index.js';
import { serializable } from '../../platform/database/transactions.js';
import { checkFileBytes, configuredFileStore, type FileObjectStore } from './object-storage.js';

export const fileContents = {
    blob: { select: { bytes: true } }, storage: { select: { targetId: true, state: true } },
} satisfies Prisma.FileObjectInclude;
type FileWithContents = Prisma.FileObjectGetPayload<{ include: typeof fileContents }>;
const leaseMs = 60_000;
const keyFor = (shopId: string, fileId: string) => ({ shopId_fileId: { shopId, fileId } });
const expired = (file: Pick<FileObject, 'status' | 'expiresAt'>, now = new Date()) =>
    file.status === 'rejected' || Boolean(file.expiresAt && file.expiresAt <= now);
const retiredFiles = (now: Date) => ({ OR: [{ status: 'rejected' }, { expiresAt: { lte: now } }] }) satisfies Prisma.FileObjectWhereInput;
const unpurgedStates: FileStorageState[] = ['pending', 'stored'];
const retainedBytes = { OR: [{ blob: { isNot: null } }, { storage: { state: { in: unpurgedStates } } }] } satisfies Prisma.FileObjectWhereInput;

function stagedFiles(now: Date, available: Prisma.FileStorageWhereInput = {}): Prisma.FileObjectWhereInput {
    return { status: 'ready', blob: { isNot: null }, AND: [
        { OR: [{ purpose: 'privacy_export' }, { uploader: { shop: { closedAt: null } } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ storage: null }, { storage: { ...available, state: 'pending' } }] },
    ] };
}

export async function fileStorageBacklog(tx: Prisma.TransactionClient, now: Date) {
    const waiting = await tx.fileObject.aggregate({ where: stagedFiles(now), _count: { _all: true }, _min: { createdAt: true } });
    const withDeadline = await tx.fileObject.aggregate({ where: { AND: [retainedBytes, { expiresAt: { lte: now } }] },
        _count: { _all: true }, _min: { expiresAt: true } });
    const missingDeadline = await tx.fileObject.aggregate({
        where: { status: 'rejected', AND: [retainedBytes, { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] },
        _count: { _all: true }, _min: { createdAt: true },
    });
    const age = (time: Date | null) => time ? Math.max(0, now.getTime() - time.getTime()) : 0;
    return {
        waitingToTransfer: waiting._count._all, oldestTransferAgeMs: age(waiting._min.createdAt),
        retiredAwaitingPurge: withDeadline._count._all + missingDeadline._count._all,
        rejectedWithoutElapsedExpiry: missingDeadline._count._all,
        oldestRetiredAgeMs: Math.max(age(withDeadline._min.expiresAt), age(missingDeadline._min.createdAt)),
    };
}

export async function readReadyFileBytes(file: FileWithContents) {
    if (file.status !== 'ready' || expired(file)) throw new NotFoundException();
    try {
        if (file.storage?.state === 'stored') {
            const store = configuredFileStore();
            if (store?.id !== file.storage.targetId) throw new Error('File storage target not available');
            return await store.read(file);
        }
        if (!file.blob) throw new Error('File staging bytes not available');
        checkFileBytes(file, file.blob.bytes);
        return Buffer.from(file.blob.bytes);
    } catch {
        throw new ServiceUnavailableException();
    }
}

function availableForTransfer(targetId: string, now: Date) {
    return {
        targetId, AND: [
            { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
            { OR: [{ dueAt: null }, { dueAt: { lte: now } }] },
        ],
    } satisfies Prisma.FileStorageWhereInput;
}

async function claim(db: PrismaClient, targetId: string, shopId: string, fileId: string, purgeOnly: boolean) {
    return serializable(db, async tx => {
        const closedAt = await lockShopClosure(tx, shopId);
        const now = new Date();
        const file = await tx.fileObject.findUnique({
            where: { shopId_id: { shopId, id: fileId } }, include: { ...fileContents, storage: true },
        });
        if (!file) return undefined;
        const { storage, blob } = file;
        if (storage && (storage.targetId !== targetId || storage.state === 'purged' ||
            (storage.leaseUntil && storage.leaseUntil > now) || (storage.dueAt && storage.dueAt > now))) return undefined;
        const remove = expired(file, now);
        if (!remove && (purgeOnly || (closedAt && file.purpose !== 'privacy_export'))) return undefined;
        if (remove ? !storage && !blob : file.status !== 'ready' || !blob || storage?.state === 'stored') return undefined;
        const leaseUntil = new Date(now.getTime() + leaseMs);
        const key = keyFor(shopId, fileId);
        await tx.fileStorage.upsert({ where: key, update: { leaseUntil },
            create: { shopId, fileId, targetId, leaseUntil } });
        return { file, leaseUntil, remove, attempts: storage?.attempts ?? 0 };
    }, true);
}

type ClaimedTransfer = NonNullable<Awaited<ReturnType<typeof claim>>>;

async function renewWriteLease(db: PrismaClient, work: ClaimedTransfer, targetId: string) {
    const { shopId, id: fileId, purpose } = work.file;
    return db.$transaction(async tx => {
        const closedAt = await lockShopClosure(tx, shopId);
        const held = { shopId, fileId, targetId, leaseUntil: work.leaseUntil, state: 'pending' } as const;
        const now = new Date();
        if (!closedAt || purpose === 'privacy_export') {
            const leaseUntil = new Date(now.getTime() + leaseMs);
            const result = await tx.fileStorage.updateMany({
                where: { ...held, leaseUntil: { equals: work.leaseUntil, gt: now }, file: {
                    status: 'ready', blob: { isNot: null }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                } },
                data: { leaseUntil },
            });
            if (result.count) return leaseUntil;
        }
        await tx.fileStorage.updateMany({ where: held, data: { leaseUntil: null } });
    });
}

async function settle(db: PrismaClient, transfer: ClaimedTransfer, targetId: string) {
    const { file, leaseUntil, remove } = transfer;
    const key = keyFor(file.shopId, file.id);
    return serializable(db, async tx => {
        const current = await tx.fileObject.findUniqueOrThrow({ where: { shopId_id: { shopId: file.shopId, id: file.id } },
            select: { status: true, expiresAt: true } });
        const stillCurrent = remove ? expired(current) : current.status === 'ready' && !expired(current);
        const result = await tx.fileStorage.updateMany({
            where: { shopId: file.shopId, fileId: file.id, targetId, leaseUntil: { equals: leaseUntil, gt: new Date() } },
            data: { state: stillCurrent ? (remove ? 'purged' : 'stored') : 'pending', leaseUntil: null, attempts: 0, dueAt: null },
        });
        if (!result.count || !stillCurrent) return false;
        await tx.fileBlob.deleteMany({ where: key.shopId_fileId });
        await recordAudit(tx, { shopId: file.shopId, actorId: null, requestId: randomUUID(),
            action: remove ? 'purgeFileBytes' : 'storeFileObject', resourceType: 'file', resourceId: file.id,
            metadata: { targetId, purpose: file.purpose, sizeBytes: file.sizeBytes } });
        return true;
    }, false);
}

export async function transferFileObjects(db: PrismaClient, store: FileObjectStore, purgeScope?: { shopId: string }) {
    const now = new Date();
    const purgeOnly = purgeScope !== undefined || store.transferNewFiles === false;
    const due = availableForTransfer(store.id, now);
    const purge = { AND: [retiredFiles(now), { OR: [
        { storage: null, blob: { isNot: null } }, { storage: { ...due, state: { in: unpurgedStates } } },
    ] }] } satisfies Prisma.FileObjectWhereInput;
    const files = await db.fileObject.findMany({
        where: purgeOnly ? { ...purgeScope, ...purge } : { OR: [stagedFiles(now, due), purge] },
        select: { shopId: true, id: true }, orderBy: [{ createdAt: 'asc' }, { shopId: 'asc' }, { id: 'asc' }], take: 8,
    });
    let bucketChecked = false;
    let failed = false;
    let completed = 0;
    for (const candidate of files) {
        const work = await claim(db, store.id, candidate.shopId, candidate.id, purgeOnly);
        if (!work) continue;
        try {
            if (!bucketChecked) {
                await store.checkBucket();
                bucketChecked = true;
            }
            if (work.remove) await store.remove(work.file);
            else {
                const leaseUntil = await renewWriteLease(db, work, store.id);
                if (!leaseUntil) continue;
                work.leaseUntil = leaseUntil;
                await store.write(work.file, work.file.blob!.bytes);
            }
            if (await settle(db, work, store.id)) completed++;
        } catch {
            const attempts = Math.min(work.attempts + 1, 10);
            await db.fileStorage.updateMany({
                where: { shopId: candidate.shopId, fileId: candidate.id, targetId: store.id, leaseUntil: work.leaseUntil },
                data: { attempts, leaseUntil: null, dueAt: new Date(Date.now() + Math.min(300_000, 15_000 * (2 ** (attempts - 1)))) },
            });
            failed = true;
        }
    }
    if (failed) throw new Error('One or more file transfers will be retried');
    return completed;
}

export async function purgeRecoveredFiles(db: PrismaClient, store: FileObjectStore, shopId: string) {
    let purged = 0;
    let completed: number;
    do {
        completed = await transferFileObjects(db, store, { shopId });
        purged += completed;
    } while (completed > 0);
    const pending = await db.fileObject.count({ where: { shopId, AND: [retiredFiles(new Date()), retainedBytes] } });
    return { purged, pending };
}
