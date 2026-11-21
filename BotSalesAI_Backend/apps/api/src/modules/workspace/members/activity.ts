import type { Prisma } from '../../../generated/prisma/client.js';
import { recordAudit } from '../../../platform/audit/index.js';

export const membershipCommandKinds = ['inviteMember', 'updateMemberRoles', 'revokeMembership'] as const;
export type MemberOperation = typeof membershipCommandKinds[number];

export function membershipAudit(tx: Prisma.TransactionClient, entry: {
    shopId: string;
    actorId: string;
    requestId: string;
    action: string;
    memberId: string;
    metadata: Prisma.InputJsonObject;
}) {
    const { memberId, ...fields } = entry;
    return recordAudit(tx, { ...fields, resourceType: 'membership', resourceId: memberId });
}
