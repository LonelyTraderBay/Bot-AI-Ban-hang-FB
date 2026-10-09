export type PushCapability = {
    secureContext: boolean;
    serviceWorker: boolean;
    pushManager: boolean;
    notification: boolean;
};

export function assertPushCapability(capability: PushCapability) {
    if (!capability.secureContext || !capability.serviceWorker || !capability.pushManager || !capability.notification)
        throw new Error('Trình duyệt này chưa hỗ trợ Push hoặc không ở HTTPS. Trên iPhone cần kiểm tra ứng dụng đã thêm vào màn hình chính.');
}

export function assertPushPermissionGranted(permission: NotificationPermission) {
    if (permission !== 'granted')
        throw new Error('Chưa được cấp quyền thông báo. Không đánh dấu thiết bị đang hoạt động.');
}
