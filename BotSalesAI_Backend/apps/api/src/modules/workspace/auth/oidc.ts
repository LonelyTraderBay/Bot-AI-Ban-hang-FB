import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import * as oidc from 'openid-client';
import type { AuthConfig } from './config.js';
import { validEmail } from './contract.js';

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
        const config = await oidc.discovery(new URL(issuer), clientId, clientSecret, oidc.ClientSecretBasic(clientSecret), { timeout: 5 });
        const metadata = config.serverMetadata();
        if (metadata.issuer !== issuer || !metadata.supportsPKCE() || !metadata.authorization_endpoint?.startsWith('https://')) {
            throw new Error('OIDC metadata does not match the configured issuer and S256 policy');
        }
        config.timeout = 5;
        oidc.enableNonRepudiationChecks(config);
        return config;
    }

    async authorize(state: string, nonce: string, verifier: string): Promise<URL> {
        const config = await this.getConfiguration();
        return oidc.buildAuthorizationUrl(config, {
            redirect_uri: this.settings.redirectUri,
            scope: 'openid profile email',
            code_challenge_method: 'S256',
            code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
            state,
            nonce,
        });
    }

    async redeem(query: string, state: string, nonce: string, verifier: string) {
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
