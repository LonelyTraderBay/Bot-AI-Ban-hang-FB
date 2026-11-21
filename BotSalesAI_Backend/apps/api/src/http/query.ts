import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { openapi, validator } from './contract-source.js';
import { schemaFromContract, SchemaPipe } from './contracts.js';

type Position = { id: string; createdAt: Date };
type ListQuery = {
    limit?: number; cursor?: string; q?: string; status?: string; sort?: string; kind?: string;
    categoryId?: string; warehouseId?: string; variantId?: string; customerId?: string; effective?: 'yes';
    channelId?: string; assignedUserId?: string; mode?: 'human' | 'bot' | 'paused';
    from?: string; to?: string; timezone?: string; accountId?: string;
};
const listParameters = ['Limit', 'Cursor', 'Query', 'StatusFilter', 'Sort'].map(name => openapi.components.parameters[name]);
const commandKind = openapi.paths['/shops/{shopId}/commands'].get.parameters.find((param: { name?: string }) => param.name === 'kind');
const listPipe = (parameters: typeof listParameters) => new SchemaPipe(validator.compile({
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(parameters.map(({ name, schema }) => {
        const prefix = '#/components/schemas/';
        return [name, schema.$ref?.startsWith(prefix) ? schemaFromContract(schema.$ref.slice(prefix.length)) : schema];
    })),
}));
const queryPipe = listPipe(listParameters);
const commandQueryPipe = listPipe([...listParameters, commandKind]);
const productQueryPipe = listPipe([...listParameters, { name: 'categoryId', schema: schemaFromContract('Id') }]);
const inventoryQueryPipe = listPipe([...listParameters, openapi.components.parameters.WarehouseFilter, openapi.components.parameters.VariantFilter]);
const ordersQueryPipe = listPipe([...listParameters, openapi.components.parameters.CustomerFilter]);
const conversationQueryPipe = listPipe([
    ...listParameters, ...['CustomerFilter', 'ChannelFilter', 'AssigneeFilter', 'ConversationMode'].map(name => openapi.components.parameters[name]),
]);
const promotionFilter = openapi.paths['/shops/{shopId}/promotions'].get.parameters.find((param: { name?: string }) => param.name === 'effective');
const promotionsQueryPipe = listPipe([...listParameters, promotionFilter]);
const pageQueryPipe = listPipe(listParameters.slice(0, 2));
const ledgerQueryPipe = listPipe([
    ...listParameters.slice(0, 2), ...['From', 'To', 'Timezone'].map(name => openapi.components.parameters[name]),
    { name: 'accountId', schema: schemaFromContract('Id') },
]);
const listPipes = {
    general: queryPipe, listCommands: commandQueryPipe, listJobs: commandQueryPipe, listProducts: productQueryPipe,
    inventory: inventoryQueryPipe, orders: ordersQueryPipe, promotions: promotionsQueryPipe, conversations: conversationQueryPipe,
    page: pageQueryPipe, ledger: ledgerQueryPipe,
};
export const idPipe = new SchemaPipe(validator.compile(schemaFromContract('Id')));
export const validUuid = (id: string) => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);

export function listQuery(raw: Record<string, unknown>, operation: keyof typeof listPipes = 'general'): ListQuery {
    const { limit } = raw;
    return listPipes[operation].transform({
        ...raw,
        ...(typeof limit === 'string' && /^\d+$/.test(limit) ? { limit: Number(limit) } : {}),
    }) as ListQuery;
}

function cursorPosition(cursor: string, fingerprint: string): Position {
    try {
        if (!/^[A-Za-z0-9_-]{1,360}$/.test(cursor)) throw new Error();
        const [scope, id, time] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        if (scope !== fingerprint || typeof id !== 'string' || !validUuid(id) || typeof time !== 'string') throw new Error();
        const createdAt = new Date(time);
        if (createdAt.toISOString() !== time) throw new Error();
        return { id, createdAt };
    } catch {
        throw new BadRequestException();
    }
}

export function paging(query: ListQuery, scope: readonly string[]) {
    const sort = query.sort ?? 'createdAt:desc,id:desc';
    const ascending = sort === 'createdAt:asc' || sort === 'createdAt:asc,id:asc';
    if (!ascending && sort !== 'createdAt:desc' && sort !== 'createdAt:desc,id:desc' && sort !== '-createdAt') {
        throw new UnprocessableEntityException();
    }
    const direction = ascending ? 'asc' as const : 'desc' as const;
    const comparison = ascending ? 'gt' as const : 'lt' as const;
    const limit = query.limit ?? listParameters[0].schema.default as number;
    const filter = query.q?.trim() ?? '';
    const keyword = filter.replace(/[\\%_]/g, '\\$&');
    const fingerprint = createHash('sha256').update(JSON.stringify([...scope, filter, query.status ?? null, direction])).digest('hex');
    const position = query.cursor === undefined ? undefined : cursorPosition(query.cursor, fingerprint);
    const after = position && {
        OR: [
            { createdAt: { [comparison]: position.createdAt } },
            { createdAt: position.createdAt, id: { [comparison]: position.id } },
        ],
    };
    return {
        keyword, limit, after, position, orderBy: [{ createdAt: direction }, { id: direction }],
        result<T extends Position>(rows: T[]) {
            const hasMore = rows.length > limit;
            const data = rows.slice(0, limit);
            const last = data.at(-1);
            const nextCursor = hasMore && last
                ? Buffer.from(JSON.stringify([fingerprint, last.id, last.createdAt.toISOString()])).toString('base64url') : null;
            return { data, page: { hasMore, limit, nextCursor } };
        },
    };
}
