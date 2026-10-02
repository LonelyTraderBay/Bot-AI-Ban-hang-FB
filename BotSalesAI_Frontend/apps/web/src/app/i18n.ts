import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const viMessages = {
    app: {
        name: 'BotSales AI',
        loading: 'Đang tải dữ liệu',
        loadingScreen: 'Đang tải màn hình',
        retry: 'Thử lại',
        cancel: 'Hủy',
        save: 'Lưu thay đổi',
        close: 'Đóng',
        search: 'Tìm kiếm',
        demo: 'Môi trường mô phỏng',
        logout: 'Đăng xuất',
    },
    state: {
        updating: 'Đang cập nhật dữ liệu…',
        stale: 'Không tải được bản mới. Dữ liệu đang hiển thị có thể đã cũ.',
        offline: 'Đang ngoại tuyến. Dữ liệu đang xem có thể cũ; mọi thao tác ghi bị tạm khóa.',
        empty: 'Chưa có dữ liệu phù hợp.',
        partial: 'Một phần dữ liệu chưa tải được. Các phần còn lại vẫn hiển thị.',
        capabilityUnavailable: 'Tính năng này chưa được API hoặc môi trường hiện tại hỗ trợ.',
        forbiddenTitle: 'Không đủ quyền truy cập',
        notFoundTitle: 'Không tìm thấy dữ liệu',
        conflictTitle: 'Dữ liệu đã thay đổi',
        validationTitle: 'Kiểm tra thông tin nhập',
        versionRequiredTitle: 'Thiếu phiên bản dữ liệu',
        requestErrorTitle: 'Không thể hoàn thành yêu cầu',
        unknownTitle: 'Kết quả chưa xác minh',
        conflictHelp: 'Tải lại dữ liệu mới nhất, xem thay đổi hiện tại rồi quyết định thao tác tiếp theo. Không gửi lại mù.',
        versionRequiredHelp: 'Tải hồ sơ mới nhất để lấy phiên bản hiện tại trước khi lưu.',
        validationHelp: 'Thông tin đã nhập được giữ lại. Kiểm tra các trường được nêu bên dưới.',
        field: 'Trường',
        command: 'Mã lệnh cần kiểm tra',
    },
    draft: {
        closeTitle: 'Rời biểu mẫu chưa lưu?',
        closeDescription: 'Các thay đổi trong biểu mẫu này chưa được lưu. Bạn có thể tiếp tục sửa hoặc bỏ thay đổi.',
        continueEditing: 'Tiếp tục sửa',
        discard: 'Bỏ thay đổi',
    },
} as const;

export const requiredVietnameseKeys = [
    'app.name', 'app.loading', 'app.loadingScreen', 'app.retry', 'app.cancel', 'app.save', 'app.close', 'app.search', 'app.demo', 'app.logout',
    'state.updating', 'state.stale', 'state.offline', 'state.empty', 'state.partial', 'state.capabilityUnavailable',
    'state.forbiddenTitle', 'state.notFoundTitle', 'state.conflictTitle', 'state.validationTitle', 'state.versionRequiredTitle',
    'state.requestErrorTitle', 'state.unknownTitle', 'state.conflictHelp', 'state.versionRequiredHelp', 'state.validationHelp', 'state.field', 'state.command',
    'draft.closeTitle', 'draft.closeDescription', 'draft.continueEditing', 'draft.discard',
] as const;

void i18n.use(initReactI18next).init({
    lng: 'vi',
    fallbackLng: 'vi',
    supportedLngs: ['vi'],
    load: 'languageOnly',
    initImmediate: false,
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    resources: { vi: { translation: viMessages } },
});

export default i18n;
