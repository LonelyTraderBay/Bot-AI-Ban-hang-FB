import assert from 'node:assert/strict';
import { createDecipheriv, createECDH, createPublicKey, hkdfSync, randomBytes, randomUUID, verify } from 'node:crypto';

export function pushConfigEnv() {
    const vapid = createECDH('prime256v1');
    vapid.generateKeys();
    const secret = vapid.getPrivateKey();
    return {
        WEB_PUSH_SUBJECT: 'mailto:push@example.test',
        WEB_PUSH_PUBLIC_KEY: vapid.getPublicKey('base64url'),
        WEB_PUSH_PRIVATE_KEY: Buffer.concat([Buffer.alloc(32 - secret.length), secret]).toString('base64url'),
        WEB_PUSH_ENCRYPTION_KEY: randomBytes(32).toString('base64url'),
    };
}

export function pushReceiver() {
    const client = createECDH('prime256v1');
    client.generateKeys();
    const publicKey = client.getPublicKey();
    const auth = randomBytes(16);
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-' + randomUUID();
    const subscription = { endpoint, p256dh: publicKey.toString('base64url'), auth: auth.toString('base64url') };
    function read(init, config) {
        const headers = new globalThis.Headers(init.headers);
        assert.equal(init.method, 'POST');
        assert.equal(init.redirect, 'error');
        assert.equal(headers.get('content-encoding'), 'aes128gcm');
        assert.ok(Number(headers.get('ttl')) > 0 && Number(headers.get('ttl')) <= 300);
        const match = /^vapid t=([^,]+), k=(.+)$/.exec(headers.get('authorization'));
        assert.ok(match);
        assert.equal(match[2], config.vapid.publicKey);
        const [header, claims, signature] = match[1].split('.');
        const ids = JSON.parse(Buffer.from(claims, 'base64url').toString());
        assert.equal(ids.aud, 'https://fcm.googleapis.com');
        assert.equal(ids.sub, config.vapid.subject);
        const vapid = Buffer.from(config.vapid.publicKey, 'base64url');
        const key = createPublicKey({ format: 'jwk', key: { kty: 'EC', crv: 'P-256',
            x: vapid.subarray(1, 33).toString('base64url'), y: vapid.subarray(33).toString('base64url') } });
        assert.equal(verify('sha256', Buffer.from(header + '.' + claims), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')), true);

        const bytes = Buffer.from(init.body);
        const salt = bytes.subarray(0, 16);
        const serverKey = bytes.subarray(21, 21 + bytes[20]);
        const ciphertext = bytes.subarray(21 + bytes[20]);
        const info = Buffer.concat([Buffer.from('WebPush: info\0'), publicKey, serverKey]);
        const ikm = hkdfSync('sha256', client.computeSecret(serverKey), auth, info, 32);
        const cek = hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
        const nonce = hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12);
        const decipher = createDecipheriv('aes-128-gcm', cek, nonce);
        decipher.setAuthTag(ciphertext.subarray(-16));
        const clear = Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]);
        assert.equal(clear.at(-1), 2);
        return JSON.parse(clear.subarray(0, -1).toString());
    }
    return { subscription, read };
}
