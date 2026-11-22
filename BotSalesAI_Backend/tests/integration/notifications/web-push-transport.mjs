import assert from 'node:assert/strict';

globalThis.fetch = async (url, init) => {
    assert.match(url, /^https:\/\/fcm\.googleapis\.com\/fcm\/send\/test-[a-f0-9-]+$/);
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    const headers = new globalThis.Headers(init.headers);
    assert.equal(headers.get('content-encoding'), 'aes128gcm');
    assert.match(headers.get('authorization'), /^vapid t=/);
    assert.equal(headers.get('ttl'), '60');
    assert.ok(init.body.byteLength > 86);
    console.log('Web Push fixture accepted one encrypted POST.');
    return new globalThis.Response(null, { status: 201 });
};
