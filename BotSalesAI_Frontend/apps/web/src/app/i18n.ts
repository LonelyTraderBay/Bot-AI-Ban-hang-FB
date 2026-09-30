import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
void i18n.use(initReactI18next).init({
    lng: 'vi', fallbackLng: 'vi', interpolation: { escapeValue: false },
    resources: { vi: { translation: {
                appName: 'BotSales AI', search: 'Tìm kiếm', save: 'Lưu thay đổi', cancel: 'Hủy', retry: 'Thử lại', demo: 'Môi trường mô phỏng', logout: 'Đăng xuất'
            } } },
});
export default i18n;
