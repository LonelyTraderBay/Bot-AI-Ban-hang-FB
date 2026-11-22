import { ConflictException, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { PrivacyRequestState, type PrivacyPolicy, type Prisma, type PrismaClient, type PrivacyRequestKind } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireIfMatch, requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto } from '../../platform/commands/index.js';
import { scheduleJob } from '../../platform/jobs/index.js';
import { customerInShop } from '../customers/index.js';
import { canInShop, consumeStepUp, readAsSession, requireShopAccess, usesLocalOidcFixture, writeShopCommand, type AuthConfig } from '../workspace/index.js';
import { consentCommand } from './consent.js';

const policyCommand = { operationId: 'updatePrivacyPolicy', resourceType: 'privacy_policy' };
const requestCommand = { operationId: 'createPrivacyRequest', resourceType: 'privacy_request' };
const approveCommand = { operationId: 'approvePrivacyRequest', resourceType: 'job' };
export const privacyCommands = [policyCommand, requestCommand, approveCommand, consentCommand];
export type PolicyPatch = { chatRetentionDays?: number; jurisdictionNote?: string };
export type PrivacyRequestInput = { kind: PrivacyRequestKind; customerId: string; reason: string };
export type ReauthApproval = { expectedVersion: number; reason: string; reauthToken: string };
export const privacyKey = (shopId: string, id: string) => ({ shopId_id: { shopId, id } });
export const failedPrivacyJobs = ['failed', 'cancelled'] as const;

export function privacyFixtureEnabled(config?: AuthConfig) {
    return Boolean(config && usesLocalOidcFixture(config) && process.env.PRIVACY_FIXTURE_ACTIONS === '1');
}

function validatedNote(text: string) {
    const note = text.trim();
    if (Array.from(note).length < 5 || note.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
    return note;
}

async function policyView(tx: Prisma.TransactionClient, shopId: string, policy: PrivacyPolicy | null, config?: AuthConfig) {
    const active = Boolean(privacyFixtureEnabled(config) && policy?.approvedBy && await canInShop(tx, policy.approvedBy, shopId, 'privacy.manage'));
    const processingEnabled = active;
    return { shopId, version: policy?.version ?? 1, chatRetentionDays: policy?.chatRetentionDays ?? null, jurisdictionNote: policy?.jurisdictionNote ?? '',
        approvedBy: active ? policy?.approvedBy ?? null : null, status: active ? 'active' : policy ? 'draft' : 'unconfigured', processingEnabled };
}

export class PrivacyService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    readPolicy(headers: IncomingHttpHeaders, shopId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'privacy.manage');
            return policyView(tx, shopId, await tx.privacyPolicy.findUnique({ where: { shopId } }), this.config);
        });
    }

    updatePolicy(headers: IncomingHttpHeaders, shopId: string, patch: PolicyPatch, requestId: string) {
        const { operationId, resourceType } = policyCommand;
        const version = requireIfMatch(headers);
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'privacy.manage', operationId, payload: { ...patch, version } },
            async (tx, scope, config) => {
                const where = { shopId };
                const prior = await tx.privacyPolicy.findUnique({ where });
                requireVersion(prior?.version ?? 1, version);
                const chatRetentionDays = patch.chatRetentionDays ?? prior?.chatRetentionDays;
                const jurisdictionNote = patch.jurisdictionNote === undefined ? prior?.jurisdictionNote : validatedNote(patch.jurisdictionNote);
                if (!chatRetentionDays || !jurisdictionNote) throw new UnprocessableEntityException('Cần số ngày lưu và căn cứ áp dụng.');
                const approvedBy = privacyFixtureEnabled(config) ? scope.userId : null;
                if (prior?.chatRetentionDays === chatRetentionDays && prior.jurisdictionNote === jurisdictionNote && prior.approvedBy === approvedBy) {
                    return { id: shopId, type: resourceType };
                }
                const data = { chatRetentionDays, jurisdictionNote, approvedBy };
                const policy = await tx.privacyPolicy.upsert({ where, create: { ...where, ...data, version: 2 }, update: { ...data, version: { increment: 1 } } });
                await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: operationId, resourceType, resourceId: shopId,
                    metadata: { version: policy.version, chatRetentionDays, fixtureActivated: Boolean(approvedBy) } });
                return { id: shopId, type: resourceType };
            }, async tx => policyView(tx, shopId, await tx.privacyPolicy.findUniqueOrThrow({ where: { shopId } }), this.config));
    }

    list(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'privacy.manage');
            const query = listQuery(raw);
            if (query.status && !Object.hasOwn(PrivacyRequestState, query.status)) throw new UnprocessableEntityException();
            const page = paging(query, ['privacy_requests', shopId, userId, String(scope.permissionVersion)]);
            const jobFailed = { job: { status: { in: [...failedPrivacyJobs] } } };
            const filters = query.status === 'failed' ? { OR: [{ status: 'failed' as const }, { status: 'running' as const, ...jobFailed }] }
                : query.status === 'running' ? { status: 'running' as const, NOT: jobFailed } : { status: query.status as PrivacyRequestState | undefined };
            const needle = query.q?.trim();
            const result = page.result(await tx.privacyRequest.findMany({
                where: { shopId, AND: [filters, page.after ?? {}, ...(needle ? [validUuid(needle) ? { OR: [{ id: needle }, { customerId: needle }] }
                    : { reason: { contains: page.keyword, mode: 'insensitive' as const } }] : [])] },
                orderBy: page.orderBy, take: page.limit + 1, include: { job: { select: { status: true } } },
            }));
            return { ...result, data: result.data.map(({ job, ...row }) => ({ ...row,
                status: row.status === 'running' && (job?.status === 'cancelled' || job?.status === 'failed') ? 'failed' : row.status })) };
        });
    }

    create(headers: IncomingHttpHeaders, shopId: string, body: PrivacyRequestInput, requestId: string) {
        const { operationId, resourceType } = requestCommand;
        const reason = validatedNote(body.reason);
        const { customerId, kind } = body;
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'privacy.manage', operationId, payload: { ...body, reason } },
            async (tx, scope) => {
                const customer = await customerInShop(tx, shopId, customerId);
                if (customer.privacyErasedAt) throw new ConflictException('Hồ sơ đã xử lý quyền xóa.');
                if (await tx.privacyRequest.findFirst({ where: { shopId, customerId, kind, OR: [
                    { status: 'pending_approval' }, { status: 'running', NOT: { job: { status: { in: [...failedPrivacyJobs] } } } },
                ] }, select: { id: true } })) throw new ConflictException('Đã có yêu cầu cùng loại đang xử lý.');
                const row = await tx.privacyRequest.create({ data: { shopId, customerId, kind, reason, createdBy: scope.userId } });
                await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: operationId, resourceType, resourceId: row.id, metadata: { kind } });
                return { id: row.id, type: resourceType };
            }, (tx, _scope, result) => tx.privacyRequest.findUniqueOrThrow({ where: privacyKey(shopId, result.id) }));
    }

    approve(headers: IncomingHttpHeaders, shopId: string, privacyRequestId: string, body: ReauthApproval, requestId: string) {
        const { operationId, resourceType } = approveCommand;
        const { reauthToken, expectedVersion } = body;
        const reason = validatedNote(body.reason);
        return writeShopCommand(this.db, this.config, { headers, shopId, permission: 'privacy.manage', operationId, deferred: true,
            payload: { privacyRequestId, expectedVersion, reason } },
            async (tx, scope, config, command) => {
                const where = privacyKey(shopId, privacyRequestId);
                const row = await tx.privacyRequest.findUnique({ where });
                if (!row) throw new NotFoundException();
                requireVersion(row.version, expectedVersion);
                if (row.status !== 'pending_approval') throw new ConflictException();
                if (!privacyFixtureEnabled(config)) throw new ServiceUnavailableException('Xử lý dữ liệu chưa được bật cho môi trường này.');
                const policy = await tx.privacyPolicy.findUnique({ where: { shopId } });
                if (!policy?.approvedBy || !policy.chatRetentionDays) throw new ConflictException('Cần chính sách lưu giữ đang hiệu lực.');
                await requireShopAccess(tx, policy.approvedBy, shopId, 'privacy.manage');
                await consumeStepUp(tx, headers, scope.userId, reauthToken, { shopId, resourceId: privacyRequestId }, config);
                const job = await scheduleJob(tx, { shopId, actorId: scope.userId, sourceOperation: operationId, kind: 'privacy',
                    commandId: command.id, input: { privacyRequestId, policyVersion: policy.version } });
                await tx.privacyRequest.update({ where, data: { status: 'running', approvedBy: scope.userId, policyVersion: policy.version,
                    jobId: job.id, version: { increment: 1 } } });
                await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: operationId, resourceType: 'privacy_request',
                    resourceId: row.id, metadata: { jobId: job.id, policyVersion: policy.version, kind: row.kind } });
                return { id: job.id, type: resourceType };
            }, async (_tx, _scope, _result, command) => commandDto(command, resourceType));
    }
}
