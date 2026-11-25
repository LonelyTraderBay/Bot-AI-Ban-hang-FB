import { readFileSync } from 'node:fs';
import type { JobKind, Prisma } from '../../generated/prisma/client.js';
import { contractDirectory } from '../../http/contract-source.js';

const operationKinds: Readonly<Record<string, JobKind>> = {
    createProductImport: 'import', commitProductImport: 'import',
    importBankStatement: 'import', importCODStatement: 'import',
    createExport: 'export', submitKnowledgeReview: 'knowledge_index',
    createEvaluation: 'evaluation', publishBotConfig: 'evaluation', approvePrivacyRequest: 'privacy',
    testAIConnection: 'connection_test', checkChannelHealth: 'connection_test', testDevice: 'connection_test',
};
const { operations } = JSON.parse(readFileSync(new URL('operation-index.json', contractDirectory), 'utf8')) as {
    operations: { operationId: string; permission?: string }[];
};
const sources = operations.flatMap(({ operationId, permission }) => {
    if (!permission || !Object.hasOwn(operationKinds, operationId)) return [];
    return [{ sourceOperation: operationId, kind: operationKinds[operationId], permission }];
});

export const reportSourcePermissions = {
    inventory: 'inventory.read', orders: 'orders.read', cashflow: 'finance.read', profit_loss: 'finance.read',
} as const;

export function requiresJobSourceScope(operationId: string) {
    return operationId === 'createExport';
}

export function visibleJobSources(permissions: readonly string[]): Prisma.JobWhereInput[] {
    return sources.filter(source => permissions.includes(source.permission)).flatMap(({ kind, sourceOperation }): Prisma.JobWhereInput[] => {
        if (!requiresJobSourceScope(sourceOperation)) return [{ kind, sourceOperation }];
        return Object.entries(reportSourcePermissions).flatMap(([reportType, permission]) => permissions.includes(permission)
            ? [{ kind, sourceOperation, input: { path: ['reportType'], equals: reportType } }] : []);
    });
}

export function jobSourcePermission(kind: JobKind, operation: string) {
    return sources.find(source => source.kind === kind && source.sourceOperation === operation)?.permission;
}
