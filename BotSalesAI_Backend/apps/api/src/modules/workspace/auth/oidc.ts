import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createPublicKey, type JsonWebKey } from 'node:crypto';
import * as oidc from 'openid-client';
import type { AuthConfig } from './config.js';
import { validEmail } from './contract.js';

const timeoutSeconds = 5;

function secureEndpoint(value: unknown): value is string {
    const url = typeof value === 'string' && URL.parse(value);
    return Boolean(url && url.protocol === 'https:' && !url.username && !url.password && !url.hash);
}

function publicSigningKey(value: unknown): boolean {
    if (!value || typeof value !== 'object' || !('kty' in value) || !['RSA', 'EC', 'OKP'].includes(String(value.kty))) return false;
    const key = value as JsonWebKey;
    if (key.d || (key.use !== undefined && key.use !== 'sig') ||
        (key.key_ops !== undefined && (!Array.isArray(key.key_ops) || !key.key_ops.includes('verify')))) return false;
    try {
        return createPublicKey({ key, format: 'jwk' }).type === 'public';
    } catch {
        return false;
    }
}

export class OidcClient {
    private configuration?: Promise<oidc.Configuration>;

    constructor(private readonly settings: AuthConfig) {}

    private getConfiguration(): Promise<oidc.Configuration> {
        return this.configuration ??= this.discover().catch(() => {
            this.configuration = undefined;
            throw new ServiceUnavailableException();
        });
    }

    private async discover(): Promise<oidc.Configuration> {
        const { issuer, clientId, clientSecret } = this.settings;
        const config = await oidc.discovery(new URL(issuer), clientId, clientSecret, oidc.ClientSecretBasic(clientSecret), { timeout: timeoutSeconds });
        const metadata = config.serverMetadata();
        const methods = metadata.token_endpoint_auth_methods_supported ?? ['client_secret_basic'];
        if (metadata.issuer !== issuer || !metadata.supportsPKCE() ||
            !Array.isArray(metadata.response_types_supported) || !metadata.response_types_supported.includes('code') ||
            !Array.isArray(methods) || !methods.includes('client_secret_basic') ||
            !secureEndpoint(metadata.authorization_endpoint) || !secureEndpoint(metadata.token_endpoint) || !secureEndpoint(metadata.jwks_uri)) {
            throw new Error('OIDC metadata does not support the configured authentication flow');
        }
        oidc.enableNonRepudiationChecks(config);
        return config;
    }

    async checkProvider() {
        const config = await this.getConfiguration().catch(() => undefined);
        if (!config) return { status: 'BLOCKED', failedCheck: 'OIDC_DISCOVERY_OR_METADATA' } as const;
        const { jwks_uri: jwks } = config.serverMetadata();
        try {
            const response = await fetch(jwks!, { redirect: 'error', signal: AbortSignal.timeout(timeoutSeconds * 1000) });
            if (response.status !== 200) {
                await response.body?.cancel();
                return { status: 'BLOCKED', failedCheck: 'OIDC_JWKS' } as const;
            }
            const { keys } = await response.json();
            const signingKeys = Array.isArray(keys) ? keys.filter(publicSigningKey).length : 0;
            if (signingKeys > 0) return { status: 'OIDC_METADATA_VERIFIED', signingKeys, pkce: 'S256', tokenAuth: 'client_secret_basic' } as const;
        } catch {
            // Report the failed check without logging provider details.
        }
        return { status: 'BLOCKED', failedCheck: 'OIDC_JWKS' } as const;
    }

    async authorize(state: string, nonce: string, verifier: string, reauthenticate = false): Promise<URL> {
        const config = await this.getConfiguration();
        return oidc.buildAuthorizationUrl(config, {
            redirect_uri: this.settings.redirectUri,
            scope: 'openid profile email',
            code_challenge_method: 'S256',
            code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
            state,
            nonce,
            ...(reauthenticate ? { prompt: 'login', max_age: '0' } : {}),
        });
    }

    async redeem(query: string, state: string, nonce: string, verifier: string, authenticatedAfter?: Date) {
        const config = await this.getConfiguration();
        const callback = new URL(this.settings.redirectUri);
        callback.search = query;
        try {
            const response = await oidc.authorizationCodeGrant(config, callback, {
                expectedState: state,
                expectedNonce: nonce,
                pkceCodeVerifier: verifier,
                idTokenExpected: true,
            });
            const claims = response.claims();
            if (!claims?.sub || claims.iss !== this.settings.issuer) throw new Error('OIDC identity claims are incomplete');
            if (authenticatedAfter) {
                const { auth_time: authTime } = claims;
                if (typeof authTime !== 'number' || !Number.isSafeInteger(authTime) ||
                    authTime < Math.floor(authenticatedAfter.getTime() / 1000) || authTime > Math.ceil(Date.now() / 1000)) {
                    throw new Error('OIDC authentication time is outside the confirmation window');
                }
            }
            const profile = claims.email_verified === true && validEmail(claims.email) ? claims
                : await oidc.fetchUserInfo(config, response.access_token, claims.sub);
            if (profile.email_verified !== true || !validEmail(profile.email)) {
                throw new Error('OIDC identity claims are incomplete');
            }
            const displayName = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim().slice(0, 160) : profile.email;
            return { oidcIssuer: claims.iss, oidcSubject: claims.sub, email: profile.email, displayName };
        } catch {
            throw new BadRequestException();
        }
    }
}
