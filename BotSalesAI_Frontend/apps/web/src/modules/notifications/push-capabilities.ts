export type PushCapability = {
    secureContext: boolean;
    serviceWorker: boolean;
    pushManager: boolean;
    notification: boolean;
};

const unsupportedPush = 'Trình duyệt này chưa hỗ trợ Push hoặc không ở HTTPS.';

function supportsPush(capability: PushCapability) {
    return capability.secureContext && capability.serviceWorker && capability.pushManager && capability.notification;
}

export function describePushAvailability(capability: PushCapability, configured: boolean, permission: NotificationPermission) {
    if (!supportsPush(capability)) return { available: false, message: unsupportedPush };
    if (!configured) return { available: false, message: 'Bản ứng dụng này chưa cấu hình đăng ký thông báo.' };
    if (permission === 'denied') return { available: false, message: 'Trình duyệt đã chặn thông báo. Mở quyền của trang để cấp lại.' };
    return {
        available: true,
        message: permission === 'granted' ? 'Trình duyệt đã cấp quyền thông báo.' : 'Trình duyệt có thể xin quyền nhận thông báo.',
    };
}

export function assertPushCapability(capability: PushCapability) {
    if (!supportsPush(capability)) throw new Error(unsupportedPush);
}

export function assertPushPermissionGranted(permission: NotificationPermission) {
    if (permission !== 'granted')
        throw new Error('Chưa được cấp quyền thông báo. Không đánh dấu thiết bị đang hoạt động.');
}
