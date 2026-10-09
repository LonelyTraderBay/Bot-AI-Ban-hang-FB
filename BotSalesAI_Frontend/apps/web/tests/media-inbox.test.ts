import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { db } from '../src/mocks/database';
import { CSRF, handle, resetService, setFault, setRole } from '../src/mocks/service';

let requestNumber = 0;
let objectUrlNumber = 0;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const requestHeaders = () => ({ 'x-csrf-token': CSRF, 'idempotency-key': `media-test-${++requestNumber}` });
function mediaFile(name: string, type: string, content: string | Uint8Array) {
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const file = new File([bytes], name, { type });
    // jsdom's File lacks Blob.arrayBuffer/slice; browsers provide both APIs.
    Object.defineProperty(file, 'arrayBuffer', { configurable: true, value: async () => bytes.slice().buffer });
    Object.defineProperty(file, 'slice', { configurable: true, value: (start = 0, end = bytes.length) => ({ arrayBuffer: async () => bytes.slice(start, end).buffer }) });
    return file;
}
const png = (name = 'customer.png') => mediaFile(name, 'image/png', Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]));
const uploadMedia = (file: File, conversationId = 'cv2', shopId = 'shop-demo') => {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'conversation_media');
    form.append('resourceId', conversationId);
    return handle({ op: 'uploadFile', path: { shopId }, form, headers: requestHeaders() });
};
const sendMedia = (conversationId: string, fileIds: string[], expectedVersion = 1, text = '') => handle({
    op: 'sendMessage', path: { shopId: 'shop-demo', conversationId },
    body: { clientMessageId: `client-${++requestNumber}`, ...(text ? { text } : {}), fileIds, expectedConversationVersion: expectedVersion },
    headers: requestHeaders(),
});
const responseData = (response: { data: unknown }) => response.data as Record<string, unknown>;

beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
    objectUrlNumber = 0;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: vi.fn(() => `blob:media-test-${++objectUrlNumber}`) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() });
    requestNumber = 0;
    resetService();
});

afterEach(() => {
    resetService();
    if (originalCreateObjectURL) Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: originalCreateObjectURL });
    else Reflect.deleteProperty(URL, 'createObjectURL');
    if (originalRevokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: originalRevokeObjectURL });
    else Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.unstubAllGlobals();
});

describe('Inbox media contract and MSW validation', () => {
    it('keeps text-only contract and sends image metadata using same-shop file IDs', async () => {
        const textOnly = await handle({
            op: 'sendMessage', path: { shopId: 'shop-demo', conversationId: 'cv2' },
            body: { clientMessageId: 'client-text-only', text: 'Tin văn bản cũ vẫn hợp lệ.', expectedConversationVersion: 1 }, headers: requestHeaders(),
        });
        expect(textOnly.status).toBe(202);
        resetService();

        const uploaded = await uploadMedia(png());
        const fileId = String(responseData(uploaded).id);
        const sent = await sendMedia('cv2', [fileId], 1);
        expect(sent.status).toBe(202);
        const message = db.messages.find(item => item.clientMessageId === `client-${requestNumber - 1}`);
        expect(message?.text).toBe('');
        expect(message?.attachments).toEqual([{ fileId, name: 'customer.png', mimeType: 'image/png', sizeBytes: 12 }]);
        expect(JSON.stringify(message?.attachments)).not.toContain('readUrl');
    });

    it('denies absent channel policy, cross-shop scope, MIME spoofing, and missing reply permission', async () => {
        await expect(uploadMedia(png('missing-policy.png'), 'b-cv2', 'shop-second')).rejects.toMatchObject({ status: 422, code: 'MEDIA_CAPABILITY_UNAVAILABLE' });
        await expect(uploadMedia(png(), 'cv2', 'shop-second')).rejects.toMatchObject({ status: 404 });
        await expect(uploadMedia(mediaFile('spoof.pdf', 'application/pdf', 'not a pdf'))).rejects.toMatchObject({ status: 415, code: 'MEDIA_CONTENT_TYPE_MISMATCH' });
        setRole('warehouse');
        await expect(uploadMedia(png())).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('rejects unsupported and oversized media and rechecks the upload purpose at send time', async () => {
        await expect(uploadMedia(mediaFile('script.html', 'text/html', '<p>not supported</p>'))).rejects.toMatchObject({ status: 415, code: 'MEDIA_TYPE_UNSUPPORTED' });
        const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
        oversized.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        await expect(uploadMedia(mediaFile('too-large.png', 'image/png', oversized))).rejects.toMatchObject({ status: 413, code: 'MEDIA_SIZE_EXCEEDED' });

        const uploaded = await uploadMedia(png('wrong-purpose.png'));
        const fileId = String(responseData(uploaded).id);
        const file = db.files.find(item => item.id === fileId);
        if (!file) throw new Error('Uploaded FileObject is missing.');
        file.purpose = 'product_image';
        await expect(sendMedia('cv2', [fileId])).rejects.toMatchObject({ status: 422, code: 'FILE_PURPOSE_MISMATCH' });
    });

    it('rechecks attachment count, resource scope, purpose, and scan-ready status at send time', async () => {
        const wrongScope = await uploadMedia(png('wrong-scope.png'), 'cv1');
        const wrongScopeId = String(responseData(wrongScope).id);
        await expect(sendMedia('cv2', [wrongScopeId])).rejects.toMatchObject({ status: 403, code: 'FILE_SCOPE_MISMATCH' });

        const notReady = await uploadMedia(png('pending-scan.png'));
        const notReadyId = String(responseData(notReady).id);
        const stored = db.files.find(file => file.id === notReadyId);
        if (!stored) throw new Error('Uploaded FileObject is missing.');
        stored.status = 'quarantined';
        await expect(sendMedia('cv2', [notReadyId])).rejects.toMatchObject({ status: 422, code: 'FILE_NOT_READY' });

        resetService();
        const uploaded = await Promise.all([uploadMedia(png('a.png')), uploadMedia(png('b.png')), uploadMedia(png('c.png')), uploadMedia(png('d.png'))]);
        const ids = uploaded.map(item => String(responseData(item).id));
        await expect(sendMedia('cv2', ids)).rejects.toMatchObject({ status: 422, code: 'MEDIA_COUNT_EXCEEDED' });
    });

    it('requires read permission for scoped getFile and revokes ephemeral URLs on mock reset', async () => {
        const uploaded = await uploadMedia(png('readback.png'));
        const fileId = String(responseData(uploaded).id);
        setRole('warehouse');
        await expect(handle({ op: 'getFile', path: { shopId: 'shop-demo', fileId }, headers: {} })).rejects.toMatchObject({ status: 403, code: 'FILE_READ_FORBIDDEN' });

        setRole('owner');
        const response = await handle({ op: 'getFile', path: { shopId: 'shop-demo', fileId }, headers: {} });
        expect(responseData(response).readUrl).toBe('blob:media-test-1');
        resetService();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:media-test-1');
    });

    it('retains the stored command and attachment metadata for an unknown send result', async () => {
        const uploaded = await uploadMedia(png('unknown.png'));
        const fileId = String(responseData(uploaded).id);
        setFault('unknown');
        const response = await sendMedia('cv2', [fileId], 1, 'Tin cần đối chiếu');
        expect(responseData(response).status).toBe('unknown');
        const storedMessages = db.messages.filter(item => item.clientMessageId === `client-${requestNumber - 1}`);
        expect(storedMessages).toHaveLength(1);
        expect(storedMessages[0].attachments).toEqual([{ fileId, name: 'unknown.png', mimeType: 'image/png', sizeBytes: 12 }]);
        expect(responseData(response).result).toEqual({ type: 'message', id: storedMessages[0].id });
    });
});
