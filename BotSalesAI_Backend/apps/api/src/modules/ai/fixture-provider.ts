import { createHmac } from 'node:crypto';
import type { AuthConfig } from '../workspace/index.js';
import { usesLocalOidcFixture } from '../workspace/index.js';
import { decryptAiCredential, sealAiCredential } from './credentials.js';

export const aiFixtureEnabled = (config?: AuthConfig): config is AuthConfig =>
    process.env.AI_FIXTURE_ADAPTER === '1' && Boolean(config && usesLocalOidcFixture(config));

function fixtureCapabilities(toolCalling: 'supported' | 'unsupported') {
    return {
        text: 'supported', streaming: 'unsupported', vision: 'unsupported', structuredOutput: 'supported',
        toolCalling, embeddings: 'unsupported', usageReporting: 'supported', lastVerifiedAt: null,
    };
}
export const fixtureProvider = {
    providerId: 'mock', label: 'Cổng AI thử nghiệm', adapterId: 'mock', adapterVersion: 'fixture-1', endpointEditable: false,
    models: [
        { modelId: 'synthetic-model', label: 'Kịch bản kiểm chứng cục bộ', capabilities: fixtureCapabilities('supported'),
            contextLimit: 12000, inputPricePerMillion: null, outputPricePerMillion: null, pricingAsOf: null },
        { modelId: 'synthetic-text-only', label: 'Kịch bản văn bản cục bộ', capabilities: fixtureCapabilities('unsupported'),
            contextLimit: 12000, inputPricePerMillion: null, outputPricePerMillion: null, pricingAsOf: null },
    ],
};

const encryptionKey = (config: AuthConfig) => createHmac('sha256', config.signingKey).update('botsales-ai-fixture-credential/v1').digest();
export function sealCredential(config: AuthConfig, shopId: string, id: string, secret: string) {
    return sealAiCredential(encryptionKey(config), [shopId, id], secret);
}

export function fixtureCredentialValid(config: AuthConfig, shopId: string, id: string, encrypted: string) {
    const clear = decryptAiCredential(encryptionKey(config), [shopId, id], encrypted);
    return clear !== undefined && /^fixture-[a-zA-Z0-9_-]{6,100}$/.test(clear);
}

export function credentialFingerprint(config: AuthConfig | undefined, shopId: string, value: string) {
    return config ? createHmac('sha256', config.signingKey).update('botsales-ai-credential-intent/v1\n').update(shopId).update('\n').update(value).digest('hex') : null;
}
