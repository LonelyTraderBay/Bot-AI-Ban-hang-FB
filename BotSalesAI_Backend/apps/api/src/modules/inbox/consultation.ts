import type { BotInboundTask, ChannelMessage, Prisma } from '../../generated/prisma/client.js';
import type { liveBotSnapshot } from '../ai/index.js';
import { assignedSalesScripts } from '../knowledge/index.js';

type Bot = NonNullable<Awaited<ReturnType<typeof liveBotSnapshot>>>;
const unavailable = (code: string) => ({ code, text: '', sources: [], draft: undefined });

export async function consultationReply(tx: Prisma.TransactionClient,
    message: Pick<ChannelMessage, 'shopId' | 'conversationId' | 'text'>,
    generations: Pick<BotInboundTask, 'botGeneration' | 'conversationGeneration' | 'channelGeneration'>,
    bot: Bot, permissions: readonly string[]) {
    const text = message.text.trim();
    const step = text.toLocaleUpperCase('vi');
    const givesNeeds = /^NHU CẦU [^\0\r\n]{1,400}$/iu.test(text);
    if (!givesNeeds && !['TƯ VẤN', 'GIAO HÀNG', 'ĐỔI TRẢ'].includes(step)) return null;
    if (!permissions.includes('knowledge.read')) return unavailable('permission_required');
    if (bot.revision.maxToolSteps < 1) return unavailable('tool_limit');
    const scripts = await assignedSalesScripts(tx, message.shopId, bot.context.knowledge.map(row => row.id));
    const [source] = scripts;
    const script = source?.script;
    if (scripts.length !== 1 || !script || !script.persona || !script.needs ||
        !script.requiredFacts || !script.boundaries || !script.shippingPolicy || !script.returnPolicy) {
        return unavailable('consultation_policy_missing');
    }
    const sources = [{ type: 'knowledge_revision', id: source.id }];
    const needsPrompt = script.persona + '\n' + script.needs;
    if (givesNeeds) {
        const prior = await tx.channelMessage.findFirst({
            where: { shopId: message.shopId, conversationId: message.conversationId, direction: 'outbound', senderKind: 'bot',
                dispatch: { botGeneration: generations.botGeneration, conversationGeneration: generations.conversationGeneration,
                    channelGeneration: generations.channelGeneration },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { text: true, status: true, sourceEvidence: true },
        });
        if (prior?.text !== needsPrompt || !['sent', 'delivered', 'read'].includes(prior.status) ||
            !Array.isArray(prior.sourceEvidence) || !prior.sourceEvidence.some(item =>
                item && typeof item === 'object' && !Array.isArray(item) && item.type === 'knowledge_revision' && item.id === source.id)) {
            return { code: 'consultation_needs', text: needsPrompt, sources, draft: undefined };
        }
        return { code: 'consultation_facts', text: script.requiredFacts, sources, draft: undefined };
    }
    if (step === 'TƯ VẤN') return { code: 'consultation_needs', text: needsPrompt, sources, draft: undefined };
    return { code: 'consultation_policy', text: step === 'GIAO HÀNG' ? script.shippingPolicy : script.returnPolicy, sources, draft: undefined };
}
