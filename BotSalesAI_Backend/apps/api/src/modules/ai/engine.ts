import type { BotRevision, Prisma } from '../../generated/prisma/client.js';
import type { ResourceRef } from '../../platform/commands/index.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { sellableVariantBySku } from '../catalog/index.js';
import { accountingDate, financeMoney, localAccountingDate } from '../finance/index.js';
import { sellableAvailability } from '../inventory/index.js';
import { applicableAiBudget } from '../operations/index.js';
import type { BotShop, modelContext } from './bot-data.js';

type Knowledge = Awaited<ReturnType<typeof modelContext>>['knowledge'];
type DraftProposal = { variantId: string; units: number };
type ToolResult = { text: string; code: string; sources: ResourceRef[]; draft?: DraftProposal };
type EngineInput = { text: string; customerContextId: string | null };
const fixtureCost = new ExactDecimal(1);
const inputSize = 10000;
const safeReply = (code: string, text: string): ToolResult => ({ code, text, sources: [] });

export async function reserveAiUsage(tx: Prisma.TransactionClient, shop: BotShop, budget: Prisma.Decimal | null, now: Date, reserve = fixtureCost) {
    budget = await applicableAiBudget(tx, shop.id, shop.currency, budget);
    if (!reserve.gt(0) || !budget?.gte(reserve)) return false;
    const date = accountingDate(localAccountingDate(now, shop.timezone));
    const rows = await tx.$executeRaw`
        INSERT INTO bot_daily_usage (shop_id, accounting_date, currency, spent, runs)
        VALUES (${shop.id}::uuid, ${date}::date, ${shop.currency}, ${reserve}, 1)
        ON CONFLICT (shop_id, accounting_date) DO UPDATE
        SET spent = bot_daily_usage.spent + EXCLUDED.spent, runs = bot_daily_usage.runs + 1
        WHERE bot_daily_usage.currency = EXCLUDED.currency AND bot_daily_usage.spent + EXCLUDED.spent <= ${budget}
          AND bot_daily_usage.runs < 2147483647
    `;
    return rows === 1;
}

async function lookupSku(tx: Prisma.TransactionClient, shop: BotShop, maxToolSteps: number, permissions: readonly string[],
    action: string, sku: string, units: number): Promise<ToolResult> {
    const steps = action === 'SKU' ? 1 : 2;
    const required = action === 'SKU' ? ['catalog.read'] : ['catalog.read', 'inventory.read'];
    if (action === 'NHÁP') required.push('orders.write');
    if (!required.every(permission => permissions.includes(permission))) return safeReply('permission_required', 'Cần nhân viên có quyền xử lý yêu cầu.');
    if (maxToolSteps < steps) return safeReply('tool_limit', 'Đã đạt giới hạn thao tác của bot. Nhân viên sẽ xử lý tiếp.');
    const variant = await sellableVariantBySku(tx, shop.id, sku);
    if (!variant) return safeReply('sku_unavailable', 'Chưa có SKU bán được trong cửa hàng.');
    const source = { type: 'variant', id: variant.id };
    const price = financeMoney(variant.priceAmount, variant.priceCurrency);
    const quote = `${variant.sku} · ${price.amount} ${price.currency}`;
    if (action === 'SKU') return { code: 'catalog', text: quote, sources: [source] };
    const available = shop.defaultWarehouseId ? (await sellableAvailability(tx, shop.id, shop.defaultWarehouseId, [variant.id])).get(variant.id) ?? 0 : 0;
    if (action === 'TỒN') return { code: 'inventory', text: `${quote} · Có thể bán ${available}`, sources: [source] };
    if (available < units) return safeReply('stock_insufficient', 'Tồn hiện tại chưa đủ để lập nháp.');
    return { code: 'draft_proposal', text: `Nháp ${units} × ${quote}. Nhân viên sẽ xác nhận giá và điều kiện chốt.`,
        draft: { variantId: variant.id, units }, sources: [source] };
}

export function proposeSalesDraft(tx: Prisma.TransactionClient, shop: BotShop, maxToolSteps: number, permissions: readonly string[],
    input: { sku: string; units: number }) {
    return lookupSku(tx, shop, maxToolSteps, permissions, 'NHÁP', input.sku, input.units);
}

export async function runFixtureTools(tx: Prisma.TransactionClient, shop: BotShop, revision: Pick<BotRevision, 'maxToolSteps'>,
    knowledge: Knowledge, permissions: readonly string[], input: EngineInput): Promise<ToolResult> {
    const text = input.text.trim();
    if (input.customerContextId) return safeReply('customer_context_disabled', 'Cần nhân viên xử lý yêu cầu dùng hồ sơ khách hàng.');
    if (text.length > inputSize || text.includes(String.fromCharCode(0))) return safeReply('invalid_input', 'Yêu cầu vượt chính sách xử lý.');
    if (/^XÁC NHẬN(?: |$)/iu.test(text)) return safeReply('human_confirmation', 'Nhân viên cần xác nhận đơn theo quy trình bán hàng.');

    const sku = /^(SKU|TỒN|NHÁP) ([\p{L}\p{N}._-]{1,80})(?: ([1-9][0-9]{0,2}))?$/iu.exec(text);
    if (sku) return lookupSku(tx, shop, revision.maxToolSteps, permissions, sku[1].toUpperCase(), sku[2], Number(sku[3] ?? 1));

    const query = /^FAQ (.{2,120})$/iu.exec(text)?.[1]?.trim().toLowerCase();
    if (query) {
        if (!permissions.includes('knowledge.read')) return safeReply('permission_required', 'Cần nhân viên có quyền xử lý yêu cầu.');
        if (revision.maxToolSteps < 1) return safeReply('tool_limit', 'Đã đạt giới hạn thao tác của bot.');
        const source = knowledge.find(row => row.title.toLowerCase().includes(query) || row.indexedText?.toLowerCase().includes(query));
        if (source) return { code: 'knowledge', text: 'Đã tìm thấy nguồn đã được duyệt. Nhân viên có thể đối chiếu nội dung nguồn.',
            sources: [{ type: 'knowledge_revision', id: source.id }] };
    }
    return safeReply('human_handoff', 'Yêu cầu cần nhân viên xem xét.');
}

export function budgetHandoff() {
    return safeReply('budget_limit', 'Đã đạt hạn mức AI trong ngày. Yêu cầu cần nhân viên xử lý.');
}

export function playgroundResult(shop: BotShop, revision: BotRevision, contentHash: string, result: ToolResult, charged: boolean) {
    return {
        text: result.text, configRevision: revision.revision, sources: result.sources.map(({ type, id }) => ({ type, id })),
        warnings: ['Kịch bản thử nghiệm cục bộ.', ...(['catalog', 'inventory', 'knowledge'].includes(result.code) ? [] : [result.code])],
        latencyMs: 0, estimatedCost: financeMoney(charged ? fixtureCost : new ExactDecimal(0), shop.currency),
        inputTokens: null, outputTokens: null, externalMessageSent: false as const, configHash: contentHash,
    };
}
