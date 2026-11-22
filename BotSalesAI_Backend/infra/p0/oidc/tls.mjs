import { readFileSync } from 'node:fs';

export const appOrigin = 'https://localhost:5173';
export const issuer = 'https://127.0.0.1:9443';
export const redirectUri = appOrigin + '/api/v2/auth/callback';

export function localTls() {
    if (!process.env.P0_TLS_KEY_FILE || !process.env.P0_TLS_CERT_FILE) {
        throw new Error('Set P0_TLS_KEY_FILE and P0_TLS_CERT_FILE for the local HTTPS fixture');
    }
    return { key: readFileSync(process.env.P0_TLS_KEY_FILE), cert: readFileSync(process.env.P0_TLS_CERT_FILE) };
}
