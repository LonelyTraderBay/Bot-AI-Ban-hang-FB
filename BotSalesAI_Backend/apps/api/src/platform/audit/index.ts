import type { Prisma } from '../../generated/prisma/client.js';

type AuditRecord = Pick<Prisma.AuditEntryUncheckedCreateInput,
    'shopId' | 'actorId' | 'requestId' | 'action' | 'resourceType' | 'resourceId' | 'metadata'>;

export function recordAudit(tx: Prisma.TransactionClient, entry: AuditRecord) {
    return tx.auditEntry.create({ data: entry });
}
