import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:https';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Provider } from 'oidc-provider';
import { fixturePilotSubject } from '../../../apps/api/prisma/p0-fixture.mjs';
import { issuer, localTls, redirectUri } from './tls.mjs';

const fixtureAccount = 'p0-editor';
const interactionPrefix = '/p0/interaction/';

export async function startFixtureProvider({
    checkTokenResponse, chooseAccount = () => fixtureAccount, accounts = {},
} = {}) {
    const { OIDC_CLIENT_ID, OIDC_CLIENT_SECRET } = process.env;
    if (!OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || process.env.OIDC_ISSUER !== issuer
        || process.env.OIDC_REDIRECT_URI !== redirectUri) {
        throw new Error('The P0 IdP requires local issuer, callback and client settings');
    }
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = { ...privateKey.export({ format: 'jwk' }), kid: 'botsales-p0', alg: 'RS256', use: 'sig' };
    const profiles = new Map([[fixtureAccount, { email: fixtureAccount + '@botsales.test', verified: true }], ...Object.entries(accounts)]);
    const provider = new Provider(issuer, {
        clients: [{
            client_id: OIDC_CLIENT_ID,
            client_secret: OIDC_CLIENT_SECRET,
            redirect_uris: [redirectUri],
            response_types: ['code'],
            grant_types: ['authorization_code'],
            token_endpoint_auth_method: 'client_secret_basic',
        }],
        claims: { openid: ['sub'], profile: ['name'], email: ['email', 'email_verified'] },
        cookies: { keys: [randomBytes(32).toString('hex')] },
        pkce: { required: () => true },
        jwks: { keys: [jwk] },
        interactions: { url: (_ctx, interaction) => interactionPrefix + interaction.uid },
        features: { devInteractions: { enabled: false } },
        findAccount: async (_ctx, subject) => {
            const profile = profiles.get(subject);
            return profile && {
                accountId: subject,
                claims: async () => ({ sub: subject, name: subject, email: profile.email, email_verified: profile.verified }),
            };
        },
        renderError: ctx => { ctx.body = 'OIDC fixture rejected the request'; },
    });
    if (checkTokenResponse) {
        provider.use(async (ctx, next) => {
            await next();
            if (ctx.oidc?.route === 'token' && ctx.body?.id_token) {
                ctx.body.id_token = checkTokenResponse(ctx.body.id_token, privateKey);
            }
        });
    }

    async function acceptInteraction(request, response) {
        const { prompt, params, session } = await provider.interactionDetails(request, response);
        if (prompt.name === 'login') {
            const accountId = chooseAccount();
            if (!profiles.has(accountId)) throw new Error('Invalid fixture account');
            await provider.interactionFinished(request, response, { login: { accountId } }, { mergeWithLastSubmission: false });
            return;
        }
        if (prompt.name !== 'consent' || !profiles.has(session?.accountId)) throw new Error('Invalid fixture interaction');
        const grant = new provider.Grant({ accountId: session.accountId, clientId: params.client_id });
        grant.addOIDCScope(params.scope);
        const grantId = await grant.save();
        await provider.interactionFinished(request, response, { consent: { grantId } });
    }

    const oidcHandler = provider.callback();
    const server = createServer(localTls(), (request, response) => {
        if (request.method !== 'GET' || !request.url?.startsWith(interactionPrefix)) {
            oidcHandler(request, response);
            return;
        }
        acceptInteraction(request, response).catch(() => {
            response.statusCode = 400;
            response.end('OIDC fixture rejected the interaction');
        });
    });
    const listening = once(server, 'listening');
    server.listen(9443, '127.0.0.1');
    await listening;
    return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const pilot = process.env.P0_LOCAL_PILOT === '1';
    await startFixtureProvider(pilot ? {
        chooseAccount: () => fixturePilotSubject,
        accounts: { [fixturePilotSubject]: { email: fixturePilotSubject + '@botsales.test', verified: true } },
    } : undefined);
    console.log('Synthetic OIDC provider listening on ' + issuer);
}
