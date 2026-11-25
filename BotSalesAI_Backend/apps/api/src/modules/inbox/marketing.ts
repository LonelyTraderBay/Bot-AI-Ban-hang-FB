import { Prisma } from '../../generated/prisma/client.js';

const blockerLabels = {
    stock_insufficient: 'Tồn hiện tại chưa đủ',
    sku_unavailable: 'SKU không bán được',
    budget_limit: 'Đã đạt giới hạn AI',
};

export async function marketingConversationSignals(tx: Prisma.TransactionClient, shopId: string,
    { fromDate, toDate, timezone }: { fromDate: string; toDate: string; timezone: string }, asOf: Date, readKnowledge: boolean) {
    const inbound = Prisma.sql`
        SELECT m.id, m.conversation_id, t.outcome
        FROM bot_inbound_tasks t
        JOIN channel_messages m ON m.shop_id=t.shop_id AND m.id=t.message_id
        JOIN channel_conversations c ON c.shop_id=m.shop_id AND c.id=m.conversation_id
        JOIN customers customer ON customer.shop_id=c.shop_id AND customer.id=c.customer_id
        WHERE t.shop_id=${shopId}::uuid AND t.finished_at <= ${asOf}
          AND m.direction='inbound' AND m.redacted_at IS NULL AND customer.privacy_erased_at IS NULL
          AND m.created_at >= (${fromDate}::date::timestamp AT TIME ZONE ${timezone})
          AND m.created_at < ((${toDate}::date + 1)::timestamp AT TIME ZONE ${timezone})
    `;
    const blockers = await tx.$queryRaw<{ outcome: keyof typeof blockerLabels; count: number; conversationId: string }[]>(Prisma.sql`
        WITH inbound AS (${inbound})
        SELECT outcome, count(*)::int AS count, min(conversation_id::text) AS "conversationId"
        FROM inbound WHERE outcome IN (${Prisma.join(Object.keys(blockerLabels))})
        GROUP BY outcome ORDER BY count DESC, outcome
    `);
    const questionTopics = readKnowledge ? await tx.$queryRaw<{
        knowledgeId: string; title: string; count: number; conversationId: string;
    }[]>(Prisma.sql`
        WITH inbound AS (${inbound}), matched AS (
            SELECT DISTINCT i.conversation_id, revisions.document_id, revisions.title, revisions.revision
            FROM inbound i
            JOIN channel_messages reply ON reply.shop_id=${shopId}::uuid AND reply.conversation_id=i.conversation_id
              AND reply.client_message_id='bot-' || i.id::text AND reply.direction='outbound' AND reply.sender_kind='bot'
              AND reply.redacted_at IS NULL
            CROSS JOIN LATERAL jsonb_array_elements(
                CASE WHEN jsonb_typeof(reply.source_evidence)='array' THEN reply.source_evidence ELSE '[]'::jsonb END
            ) AS source
            JOIN knowledge_revisions revisions ON revisions.shop_id=reply.shop_id AND revisions.id::text=source->>'id'
            WHERE i.outcome IN ('knowledge','consultation_policy') AND source->>'type'='knowledge_revision'
              AND revisions.approved_by IS NOT NULL AND revisions.published_at <= reply.created_at
        )
        SELECT document_id AS "knowledgeId", (array_agg(title ORDER BY revision DESC))[1] AS title,
               count(DISTINCT conversation_id)::int AS count, min(conversation_id::text) AS "conversationId"
        FROM matched GROUP BY document_id ORDER BY count DESC, document_id LIMIT 10
    `) : undefined;
    return {
        blockers: blockers.map(({ outcome, ...row }) => ({ ...row, reason: blockerLabels[outcome] })),
        questionTopics,
    };
}
