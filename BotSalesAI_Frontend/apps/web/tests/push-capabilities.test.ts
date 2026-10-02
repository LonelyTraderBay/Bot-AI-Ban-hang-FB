import { describe, expect, it } from 'vitest';
import { assertPushCapability, assertPushPermissionGranted } from '../src/modules/notifications/push-capabilities';

describe('Push registration guards', () => {
    it('rejects insecure or unsupported browser contexts before creating a subscription', () => {
        expect(() => assertPushCapability({ secureContext: false, serviceWorker: true, pushManager: true, notification: true })).toThrow(/HTTPS/);
        expect(() => assertPushCapability({ secureContext: true, serviceWorker: false, pushManager: true, notification: true })).toThrow(/chưa hỗ trợ Push/);
        expect(() => assertPushCapability({ secureContext: true, serviceWorker: true, pushManager: false, notification: true })).toThrow(/chưa hỗ trợ Push/);
        expect(() => assertPushCapability({ secureContext: true, serviceWorker: true, pushManager: true, notification: false })).toThrow(/chưa hỗ trợ Push/);
    });

    it('requires explicit operating-system notification consent', () => {
        expect(() => assertPushPermissionGranted('granted')).not.toThrow();
        expect(() => assertPushPermissionGranted('denied')).toThrow(/Không đánh dấu thiết bị đang hoạt động/);
        expect(() => assertPushPermissionGranted('default')).toThrow(/Không đánh dấu thiết bị đang hoạt động/);
    });
});
