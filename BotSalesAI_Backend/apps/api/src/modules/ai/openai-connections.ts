import type { AiConnection } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { decryptAiCredential, sealAiCredential } from './credentials.js';
import { isOpenAiProject, isOpenAiRegion, isOpenAiSnapshot, jsonObject, type OpenAiScope } from './openai-transport.js';

type Grant = OpenAiScope & { expiresAt: number };
export type OpenAiConnectionConfig = { grants: ReadonlyMap<string, Grant>; key: Buffer };
type Target = Pick<AiConnection, 'providerId' | 'adapterId' | 'endpointUrl' | 'modelId'>;

const invalidConfig = () => new Error('Invalid BOTSALES_AI_OPENAI_SCOPES or BOTSALES_AI_OPENAI_CREDENTIAL_KEY');

export function readOpenAiConnectionConfig(env: NodeJS.ProcessEnv): OpenAiConnectionConfig | undefined {
    const { BOTSALES_AI_OPENAI_SCOPES: raw, BOTSALES_AI_OPENAI_CREDENTIAL_KEY: encoded } = env;
    if (!raw && !encoded) return undefined;
    if (!raw || !encoded || !/^[A-Za-z0-9_-]{43}$/.test(encoded)) throw invalidConfig();
    const key = Buffer.from(encoded, 'base64url');
    if (key.length !== 32 || key.toString('base64url') !== encoded) throw invalidConfig();
    let rows: unknown;
    try { rows = JSON.parse(raw); } catch { throw invalidConfig(); }
    if (!Array.isArray(rows) || !rows.length) throw invalidConfig();
    const grants = new Map<string, Grant>();
    for (const value of rows) {
        const row = jsonObject(value);
        if (!row || Object.keys(row).length !== 5) throw invalidConfig();
        const { shopId, projectId, region, model, expiresAt } = row;
        if (typeof shopId !== 'string' || !validUuid(shopId) || !isOpenAiProject(projectId) || !isOpenAiRegion(region) ||
            !isOpenAiSnapshot(model) || typeof expiresAt !== 'string') throw invalidConfig();
        const expiry = Date.parse(expiresAt);
        const shop = shopId.toLowerCase();
        if (!Number.isFinite(expiry) || new Date(expiry).toISOString() !== expiresAt || grants.has(shop)) throw invalidConfig();
        grants.set(shop, { projectId, region, model, expiresAt: expiry });
    }
    return { grants, key };
}

export function openAiGrant(config: OpenAiConnectionConfig | undefined, shopId: string) {
    const grant = config?.grants.get(shopId.toLowerCase());
    return grant && grant.expiresAt > Date.now() ? grant : undefined;
}

export function isOpenAiConnection(connection: Pick<Target, 'providerId' | 'adapterId'>) {
    return connection.providerId === 'openai' && connection.adapterId === 'openai';
}

export function openAiTarget(config: OpenAiConnectionConfig | undefined, shopId: string, connection: Target) {
    const grant = openAiGrant(config, shopId);
    return grant && isOpenAiConnection(connection) && connection.endpointUrl === null && connection.modelId === grant.model ? grant : undefined;
}

const binding = (shopId: string, id: string, grant: Grant) => ['openai', shopId, id, grant.projectId, grant.region, grant.model];

export const validOpenAiCredential = (secret: string) => /^[!-~]{16,4096}$/.test(secret);

export function sealOpenAiCredential(config: OpenAiConnectionConfig, grant: Grant, shopId: string, id: string, secret: string) {
    return sealAiCredential(config.key, binding(shopId, id, grant), secret);
}

export function readOpenAiCredential(config: OpenAiConnectionConfig, grant: Grant, connection: AiConnection) {
    if (!connection.credentialCiphertext) return undefined;
    const secret = decryptAiCredential(config.key, binding(connection.shopId, connection.id, grant), connection.credentialCiphertext);
    return secret && validOpenAiCredential(secret) ? secret : undefined;
}

export const openAiCapabilities = {
    text: 'unknown', streaming: 'unknown', vision: 'unknown', structuredOutput: 'unknown', toolCalling: 'unknown',
    embeddings: 'unknown', usageReporting: 'unknown', lastVerifiedAt: null,
};

export function openAiDescriptor(grant: Grant) {
    return {
        providerId: 'openai', adapterId: 'openai', label: 'OpenAI', adapterVersion: '1', endpointEditable: false,
        models: [{ modelId: grant.model, label: grant.model, capabilities: openAiCapabilities,
            contextLimit: null, inputPricePerMillion: null, outputPricePerMillion: null, pricingAsOf: null }],
    };
}
