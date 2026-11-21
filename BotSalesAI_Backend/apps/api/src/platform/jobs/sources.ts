import { readFileSync } from 'node:fs';
import type { JobKind } from '../../generated/prisma/client.js';
import { contractDirectory } from '../../http/contract-source.js';

const operationKinds: Readonly<Record<string, JobKind>> = {
    createProductImport: 'import', commitProductImport: 'import',
    importBankStatement: 'import', importCODStatement: 'import',
    createExport: 'export', submitKnowledgeReview: 'knowledge_index',
    createEvaluation: 'evaluation', approvePrivacyRequest: 'privacy',
    testAIConnection: 'connection_test', checkChannelHealth: 'connection_test',
};
const { operations } = JSON.parse(readFileSync(new URL('operation-index.json', contractDirectory), 'utf8')) as {
    operations: { operationId: string; permission?: string }[];
};
const sources = operations.flatMap(({ operationId, permission }) => {
    if (!permission || !Object.hasOwn(operationKinds, operationId)) return [];
    return [{ sourceOperation: operationId, kind: operationKinds[operationId], permission }];
});

export function visibleJobSources(permissions: readonly string[]) {
    return sources.filter(source => permissions.includes(source.permission))
        .map(({ kind, sourceOperation }) => ({ kind, sourceOperation }));
}

export function jobSourcePermission(kind: JobKind, operation: string) {
    return sources.find(source => source.kind === kind && source.sourceOperation === operation)?.permission;
}
