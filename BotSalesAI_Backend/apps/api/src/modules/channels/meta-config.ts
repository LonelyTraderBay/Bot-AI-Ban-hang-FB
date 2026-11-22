import { validUuid } from '../../http/query.js';

export const metaInboundPolicy = 'meta-messenger-inbound-v1';
export const metaNumericId = /^[1-9][0-9]{0,31}$/;
export type MetaPageScope = { shopId: string; senderIds: ReadonlySet<string>; accessToken?: string };
export type MetaInboundConfig = { appSecret: string; verifyToken: string; graphVersion?: string; pages: ReadonlyMap<string, MetaPageScope> };
type PageBinding = { pageId: string; shopId: string; status: string; policyVersion: string | null };

export function metaInboundPage(config: MetaInboundConfig | undefined, channel: PageBinding) {
    if (channel.status !== 'connected' || channel.policyVersion !== metaInboundPolicy) return undefined;
    const page = config?.pages.get(channel.pageId);
    return page?.shopId === channel.shopId ? page : undefined;
}

export function metaReplyPage(config: MetaInboundConfig | undefined, channel: PageBinding) {
    const page = metaInboundPage(config, channel);
    if (!config?.graphVersion || !page?.accessToken) return undefined;
    return { version: config.graphVersion, accessToken: page.accessToken, senderIds: page.senderIds };
}

export function readMetaInboundConfig(env: NodeJS.ProcessEnv): MetaInboundConfig | undefined {
    const { META_MESSENGER_APP_SECRET: appSecret, META_MESSENGER_VERIFY_TOKEN: verifyToken, META_MESSENGER_PAGES: rawPages,
        META_MESSENGER_GRAPH_VERSION: graphVersion, META_MESSENGER_PAGE_TOKENS: rawTokens } = env;
    if (!appSecret && !verifyToken && !rawPages && !graphVersion && !rawTokens) return undefined;
    if (!appSecret || appSecret.trim().length < 16 || !verifyToken || verifyToken.trim().length < 16 || !rawPages) {
        throw new Error('Set META_MESSENGER_APP_SECRET, META_MESSENGER_VERIFY_TOKEN and META_MESSENGER_PAGES together');
    }
    const invalid = () => new Error('META_MESSENGER_PAGES must bind unique Pages to a shop and approved test sender IDs');
    let rows: unknown;
    try { rows = JSON.parse(rawPages); } catch { throw invalid(); }
    if (!Array.isArray(rows) || !rows.length) throw invalid();
    const pages = new Map<string, MetaPageScope>();
    for (const row of rows) {
        if (!row || typeof row !== 'object' || Object.keys(row).length !== 3) throw invalid();
        const { pageId, shopId, senderIds } = row;
        if (typeof pageId !== 'string' || !metaNumericId.test(pageId) || pages.has(pageId) || typeof shopId !== 'string' || !validUuid(shopId) ||
            !Array.isArray(senderIds) || !senderIds.length || senderIds.some(id => typeof id !== 'string' || !metaNumericId.test(id) || id === pageId) ||
            new Set(senderIds).size !== senderIds.length) throw invalid();
        pages.set(pageId, { shopId: shopId.toLowerCase(), senderIds: new Set<string>(senderIds) });
    }
    if (graphVersion || rawTokens) {
        const invalidTokens = () => new Error('Set META_MESSENGER_GRAPH_VERSION and META_MESSENGER_PAGE_TOKENS for approved Pages');
        if (!graphVersion || !/^v[1-9][0-9]?\.[0-9]$/.test(graphVersion) || !rawTokens) throw invalidTokens();
        let tokens: unknown;
        try { tokens = JSON.parse(rawTokens); } catch { throw invalidTokens(); }
        if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) throw invalidTokens();
        const entries = Object.entries(tokens);
        if (!entries.length || new Set(entries.map(([, token]) => token)).size !== entries.length) throw invalidTokens();
        for (const [pageId, accessToken] of entries) {
            const page = pages.get(pageId);
            if (!page || typeof accessToken !== 'string' || !/^[!-~]{16,4096}$/.test(accessToken)) throw invalidTokens();
            pages.set(pageId, { ...page, accessToken });
        }
    }
    return { appSecret, verifyToken, graphVersion: graphVersion || undefined, pages };
}
