import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { AgentRole, AgentRoleKind, AiConnection, Membership, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { listQuery, paging, validUuid } from '../../http/query.js';
import { requireVersion } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { commandDto } from '../../platform/commands/index.js';
import { enqueueResourceUpdate } from '../../platform/outbox/index.js';
import { aiConnectionReady, activePublishedBot, type ApprovedEvaluationConfig } from '../ai/index.js';
import { permissionsFor, readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';

export type RoleWrite = { expectedVersion: number; humanOwnerId: string; modelConnectionId: string; policyVersion: string };
export type ControlWrite = { expectedVersion: number; scope: 'shop' | 'role' | 'conversation'; resourceId: string | null; action: 'pause' | 'resume'; reason: string };
export const controlCommand = { operationId: 'controlAutomation', resourceType: 'automation_control' };
export const roleCommand = { operationId: 'updateAgentRole', resourceType: 'agent_role' };
const roleDetails = { owner: true, connection: true } satisfies Prisma.AgentRoleInclude;
type Role = AgentRole & { owner: Membership | null; connection: AiConnection | null };
const rolePolicy: Record<AgentRoleKind, { owner: string; tools: readonly string[] }> = {
    sales_admin: { owner: 'conversations.reply', tools: ['catalog.read', 'inventory.read', 'knowledge.read', 'orders.draft', 'conversation.reply'] },
    accountant: { owner: 'finance.read', tools: ['finance.read', 'reports.read'] },
    warehouse_buyer: { owner: 'procurement.send', tools: ['inventory.read', 'purchase.draft', 'purchase.send'] },
    supervisor: { owner: 'operations.manage', tools: ['operations.read', 'work_item.manage'] },
};

export async function readAutomationFence(tx: Prisma.TransactionClient, shopId: string) {
    return tx.shopAutomation.findUniqueOrThrow({ where: { shopId } });
}

export async function lockAutomationFence(tx: Prisma.TransactionClient, shopId: string) {
    await tx.$queryRaw`SELECT shop_id FROM shop_automation WHERE shop_id=${shopId}::uuid FOR SHARE`;
    return readAutomationFence(tx, shopId);
}

export async function salesAutomationState(tx: Prisma.TransactionClient, shopId: string) {
    const fence = await readAutomationFence(tx, shopId);
    const role = await tx.agentRole.findUniqueOrThrow({ where: { shopId_kind: { shopId, kind: 'sales_admin' } }, select: { paused: true } });
    return { paused: fence.paused || role.paused, automationVersion: fence.version, automationPaused: fence.paused };
}

export async function roleInShop(tx: Prisma.TransactionClient, shopId: string, id: string) {
    if (!validUuid(id)) throw new NotFoundException();
    const role = await tx.agentRole.findUnique({ where: { shopId_id: { shopId, id } }, include: roleDetails });
    if (!role) throw new NotFoundException();
    return role;
}

function activeRoleOwner(role: Role, policyVersion: string) {
    return !role.paused && role.policyVersion === policyVersion && role.owner?.status === 'active' &&
        permissionsFor(role.owner.roles).includes(rolePolicy[role.kind].owner);
}

export function roleIsReady(role: Role, policyVersion: string, auth?: AuthConfig) {
    return activeRoleOwner(role, policyVersion) && aiConnectionReady(role.connection, auth);
}

export function agentRoleView(role: Role, currentPolicy: string, auth?: AuthConfig) {
    const { id, shopId, version, createdAt, updatedAt, kind, generation, humanOwnerId, modelConnectionId, policyVersion } = role;
    const status = role.paused ? 'paused' : !humanOwnerId || !modelConnectionId ? 'not_configured'
        : roleIsReady(role, currentPolicy, auth) ? 'ready' : 'degraded';
    return { id, shopId, version, createdAt, updatedAt, kind, status, generation, humanOwnerId, modelConnectionId, policyVersion,
        allowedToolIds: rolePolicy[kind].tools };
}

export async function currentAgentRoles(tx: Prisma.TransactionClient, shopId: string, auth?: AuthConfig) {
    const { policyVersion } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true } });
    const roles = await tx.agentRole.findMany({ where: { shopId }, include: roleDetails, orderBy: { kind: 'asc' } });
    return roles.map(role => agentRoleView(role, policyVersion, auth));
}

export async function salesAutomationAllowed(tx: Prisma.TransactionClient, shopId: string, actorId: string, connectionId: string | null,
    policyVersion: string, auth?: AuthConfig, runtimeReady = false) {
    const fence = await readAutomationFence(tx, shopId);
    if (fence.paused) return false;
    const role = await tx.agentRole.findUniqueOrThrow({ where: { shopId_kind: { shopId, kind: 'sales_admin' } }, include: roleDetails });
    if (role.paused) return false;
    return role.humanOwnerId === null || (role.humanOwnerId === actorId && role.modelConnectionId === connectionId &&
        activeRoleOwner(role, policyVersion) && (runtimeReady || aiConnectionReady(role.connection, auth)));
}

const roleView = async (tx: Prisma.TransactionClient, shopId: string, id: string, auth?: AuthConfig) => {
    const { policyVersion } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true } });
    return agentRoleView(await roleInShop(tx, shopId, id), policyVersion, auth);
};

async function advanceBotGeneration(tx: Prisma.TransactionClient, shopId: string) {
    const [updated] = await tx.botConfig.updateManyAndReturn({ where: { shopId }, data: { generation: { increment: 1 }, version: { increment: 1 } } });
    if (updated) await enqueueResourceUpdate(tx, 'bot.config.updated', { shopId, id: shopId, version: updated.version });
}

export class AutomationService {
    constructor(private readonly db?: PrismaClient, private readonly auth?: AuthConfig, private readonly provider?: ApprovedEvaluationConfig) {}

    roles(headers: IncomingHttpHeaders, shopId: string, raw: Record<string, unknown>) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            const scope = await requireShopAccess(tx, userId, shopId, 'bot.read');
            const page = paging(listQuery(raw, 'page'), ['agent_roles', shopId, userId, String(scope.permissionVersion)]);
            const { policyVersion } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true } });
            const result = page.result(await tx.agentRole.findMany({ where: { shopId, ...page.after },
                orderBy: page.orderBy, take: page.limit + 1, include: roleDetails }));
            return { ...result, data: result.data.map(role => agentRoleView(role, policyVersion, this.auth)) };
        });
    }

    role(headers: IncomingHttpHeaders, shopId: string, id: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'bot.read');
            return roleView(tx, shopId, id, this.auth);
        });
    }

    updateRole(headers: IncomingHttpHeaders, shopId: string, id: string, input: RoleWrite, requestId: string) {
        const { operationId, resourceType } = roleCommand;
        return writeShopCommand(this.db, this.auth, { headers, shopId, operationId, permission: 'bot.configure', payload: { id, ...input } },
            async (tx, scope, auth) => {
                const current = await roleInShop(tx, shopId, id);
                requireVersion(current.version, input.expectedVersion);
                const { policyVersion } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true } });
                if (input.policyVersion !== policyVersion || !validUuid(input.humanOwnerId) || !validUuid(input.modelConnectionId)) throw new UnprocessableEntityException();
                await requireShopAccess(tx, input.humanOwnerId, shopId, rolePolicy[current.kind].owner);
                const connection = await tx.aiConnection.findUnique({ where: { shopId_id: { shopId, id: input.modelConnectionId } } });
                if (!aiConnectionReady(connection, auth)) throw new ConflictException('Kết nối AI cần xác minh trong shop.');
                const updated = await tx.agentRole.update({ where: { shopId_id: { shopId, id } }, data: {
                    humanOwnerId: input.humanOwnerId, modelConnectionId: input.modelConnectionId, policyVersion,
                    generation: { increment: 1 }, version: { increment: 1 },
                } });
                if (updated.kind === 'sales_admin') await advanceBotGeneration(tx, shopId);
                await enqueueResourceUpdate(tx, 'agent_role.updated', updated);
                await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: operationId, resourceType, resourceId: id,
                    metadata: { role: updated.kind, humanOwnerId: input.humanOwnerId, modelConnectionId: input.modelConnectionId, generation: updated.generation } });
                return { type: resourceType, id };
            }, (tx, _scope, result) => roleView(tx, shopId, result.id, this.auth));
    }

    control(headers: IncomingHttpHeaders, shopId: string, input: ControlWrite, requestId: string) {
        const { operationId, resourceType } = controlCommand;
        const reason = input.reason.trim();
        if (reason.length < 5 || reason.includes(String.fromCharCode(0)) ||
            (input.scope === 'shop' ? input.resourceId !== null : !input.resourceId || !validUuid(input.resourceId))) throw new UnprocessableEntityException();
        return writeShopCommand(this.db, this.auth, { headers, shopId, operationId, permission: 'bot.pause', payload: { ...input, reason } },
            async (tx, scope, config) => {
                const id = input.resourceId ?? shopId;
                const paused = input.action === 'pause';
                const bump = { generation: { increment: 1 }, version: { increment: 1 } };
                if (input.scope === 'shop') {
                    const fence = await readAutomationFence(tx, shopId);
                    requireVersion(fence.version, input.expectedVersion);
                    if (fence.paused === paused) throw new ConflictException();
                    await tx.shopAutomation.update({ where: { shopId }, data: { ...bump, paused } });
                    await advanceBotGeneration(tx, shopId);
                } else if (input.scope === 'role') {
                    const current = await roleInShop(tx, shopId, id);
                    requireVersion(current.version, input.expectedVersion);
                    const { policyVersion } = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { policyVersion: true } });
                    if (current.paused === paused || (!paused && !roleIsReady({ ...current, paused }, policyVersion, config))) throw new ConflictException();
                    const updated = await tx.agentRole.update({ where: { shopId_id: { shopId, id } }, data: { ...bump, paused } });
                    if (updated.kind === 'sales_admin') await advanceBotGeneration(tx, shopId);
                    await enqueueResourceUpdate(tx, 'agent_role.updated', updated);
                } else {
                    const where = { shopId_id: { shopId, id } };
                    const conversation = await tx.channelConversation.findUnique({ where });
                    if (!conversation) throw new NotFoundException();
                    requireVersion(conversation.version, input.expectedVersion);
                    if (conversation.status !== 'open' || (paused && conversation.mode === 'paused') ||
                        (!paused && (conversation.mode !== 'paused' || !await activePublishedBot(tx, shopId, config, this.provider)))) throw new ConflictException();
                    const updated = await tx.channelConversation.update({ where, data: { ...bump, mode: paused ? 'paused' : 'bot', assignedUserId: null } });
                    await enqueueResourceUpdate(tx, 'conversation.updated', updated);
                }
                await recordAudit(tx, { shopId, actorId: scope.userId, requestId, action: operationId, resourceType, resourceId: id,
                    metadata: { reason, scope: input.scope, paused, expectedVersion: input.expectedVersion } });
                return { id, type: resourceType };
            }, async (_tx, _scope, _result, command) => commandDto(command, resourceType));
    }
}
