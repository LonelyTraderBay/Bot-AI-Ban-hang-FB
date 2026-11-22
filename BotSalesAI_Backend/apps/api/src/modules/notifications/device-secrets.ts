import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type DeviceBinding = { shopId: string; userId: string; fingerprint: string };
const aad = (kind: string, { shopId, userId, fingerprint }: DeviceBinding) => Buffer.from(JSON.stringify([kind, shopId, userId, fingerprint]));

export function sealDeviceSecret(key: Buffer, kind: string, binding: DeviceBinding, payload: unknown) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAAD(aad(kind, binding));
    const bytes = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), bytes.toString('base64url')].join('.');
}

export function openDeviceSecret(key: Buffer, kind: string, binding: DeviceBinding, sealed: string): unknown {
    try {
        const [version, nonce, tag, bytes, extra] = sealed.split('.');
        if (version !== 'v1' || !nonce || !tag || !bytes || extra !== undefined) return undefined;
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'base64url'));
        decipher.setAAD(aad(kind, binding));
        decipher.setAuthTag(Buffer.from(tag, 'base64url'));
        const clear = Buffer.concat([decipher.update(Buffer.from(bytes, 'base64url')), decipher.final()]);
        return JSON.parse(clear.toString('utf8'));
    } catch { return undefined; }
}

export function validBase64Key(value: unknown, length: number): value is string {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
    const decoded = Buffer.from(value, 'base64url');
    return decoded.length === length && decoded.toString('base64url') === value;
}
