import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function sealAiCredential(key: Buffer, binding: readonly string[], secret: string) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAAD(Buffer.from(JSON.stringify(binding)));
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptAiCredential(key: Buffer, binding: readonly string[], encrypted: string) {
    try {
        const [version, nonce, tag, data, extra] = encrypted.split('.');
        if (version !== 'v1' || !nonce || !tag || !data || extra !== undefined) return undefined;
        const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'base64url'), { authTagLength: 16 });
        cipher.setAAD(Buffer.from(JSON.stringify(binding)));
        cipher.setAuthTag(Buffer.from(tag, 'base64url'));
        return Buffer.concat([cipher.update(Buffer.from(data, 'base64url')), cipher.final()]).toString('utf8');
    } catch {
        return undefined;
    }
}
