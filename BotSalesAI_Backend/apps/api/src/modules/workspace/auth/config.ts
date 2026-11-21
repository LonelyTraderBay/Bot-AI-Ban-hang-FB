import { API_PREFIX } from '../../../http/operations.js';

export interface AuthConfig {
    appOrigin: string;
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    signingKey: Buffer;
}

function httpsUrl(value: string, variable: string): URL {
    const url = URL.parse(value);
    if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
        throw new Error(variable + ' must be an HTTPS URL without credentials, query or fragment');
    }
    return url;
}

export function readAuthConfig(env: NodeJS.ProcessEnv): AuthConfig | undefined {
    const { APP_ORIGIN, OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI, AUTH_SIGNING_KEY } = env;
    const settings = { APP_ORIGIN, OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI, AUTH_SIGNING_KEY };
    if (!Object.values(settings).some(value => value?.trim())) return undefined;
    if (!APP_ORIGIN || !OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !OIDC_REDIRECT_URI || !AUTH_SIGNING_KEY ||
        Object.values(settings).some(value => !value?.trim())) {
        throw new Error('Missing OIDC configuration: ' + Object.keys(settings).filter(key => !env[key]?.trim()).join(', '));
    }
    const origin = httpsUrl(APP_ORIGIN, 'APP_ORIGIN');
    if (origin.pathname !== '/' || origin.origin !== APP_ORIGIN) throw new Error('APP_ORIGIN must be an exact HTTPS origin');
    const issuer = httpsUrl(OIDC_ISSUER, 'OIDC_ISSUER');
    if (issuer.hostname === origin.hostname) throw new Error('OIDC_ISSUER must use a different hostname from APP_ORIGIN');
    const redirect = httpsUrl(OIDC_REDIRECT_URI, 'OIDC_REDIRECT_URI');
    if (redirect.href !== origin.origin + API_PREFIX + '/auth/callback') {
        throw new Error('OIDC_REDIRECT_URI must use the configured application callback');
    }
    if (!/^[a-f0-9]{64}$/i.test(AUTH_SIGNING_KEY)) throw new Error('AUTH_SIGNING_KEY must be 32 bytes encoded as hex');
    return {
        appOrigin: origin.origin,
        issuer: OIDC_ISSUER,
        clientId: OIDC_CLIENT_ID,
        clientSecret: OIDC_CLIENT_SECRET,
        redirectUri: redirect.href,
        signingKey: Buffer.from(AUTH_SIGNING_KEY, 'hex'),
    };
}
