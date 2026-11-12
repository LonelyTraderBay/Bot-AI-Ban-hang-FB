import { FieldGroup, FormFields, PageSections, SurfaceContent } from '../../shared/ui/composition';
import { useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useCan, useScope } from '@/shared/model/scope';
import { isValidTimeZone } from '@/shared/model/format';
import { useDraftForm } from '@/shared/model/dirty-drafts';
import { useVersionedDraft } from '@/shared/model/versioned-draft';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { layoutSx } from '@/shared/ui/layout';
import { PageHeader, Panel, MutationButton, ErrorNotice, RouteLink } from '@/shared/ui/components';

export function ShopSettingsPage() {
    const scope = useScope();
    const { shop } = scope;
    const cache = useQueryClient();
    const canManageShop = useCan('shop.manage');
    const update = useCommand('updateShop', ['getShop']);
    const [name, setName] = useState(shop.name), [timezone, setTimezone] = useState(shop.timezone), [locale, setLocale] = useState(shop.locale), [error, setError] = useState<Error | null>(null), [saved, setSaved] = useState(false), [timezoneTouched, setTimezoneTouched] = useState(false), [settingsSubmitted, setSettingsSubmitted] = useState(false);
    const latestShop = useApi('getShop');
    const currentShop = latestShop.data && latestShop.data.data.version >= shop.version ? latestShop.data.data : shop;
    const editor = useVersionedDraft({
        identity: `${shop.id}:settings`,
        source: { version: currentShop.version, values: { name: currentShop.name, timezone: currentShop.timezone, locale: currentShop.locale } },
        draft: { name, timezone, locale },
        apply: values => { setName(values.name); setTimezone(values.timezone); setLocale(values.locale); },
        refresh: () => latestShop.refetch({ throwOnError: true }),
    });
    const formRef = useDraftForm(editor.dirty);
    const timezoneError = !isValidTimeZone(timezone) ? 'Nhập múi giờ hợp lệ, ví dụ Asia/Vientiane.' : '';
    const save = async () => {
        setSettingsSubmitted(true);
        if (!name.trim() || timezoneError) return;
        setError(null); setSaved(false);
        const prepared = editor.prepare();
        if (!prepared) return;
        const submitted = { name, timezone, locale };
        try {
            const result = await update.execute({ path: { shopId: shop.id }, version: prepared.version, body: prepared.patch });
            cache.setQueryData(['shop', scope.session.user.id, shop.id, scope.membership.permissionVersion], result);
            editor.committed({ version: result.data.version, values: { name: result.data.name, timezone: result.data.timezone, locale: result.data.locale } }, submitted);
            setSaved(true);
        }
        catch (error) { editor.failed(error); setError(error instanceof Error ? error : new Error('Không lưu được cấu hình')); }
    };
    return <>
        <PageHeader title="Thiết lập cửa hàng" subtitle="Cấu hình riêng của shop không thay đổi quy tắc AI lập trình hoặc màu đã duyệt." />
        <PageSections >
            <Panel title="Thông tin cơ sở" bodyMode="inset">
                <FormFields component="form" ref={formRef} noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
                    <ErrorNotice error={error || update.error} />
                    <DraftConflict editor={editor} labels={{ name: 'Tên cửa hàng', timezone: 'Múi giờ', locale: 'Ngôn ngữ' }} busy={update.pending}/>
                    {saved && <Alert severity="success" role="status">Đã lưu cấu hình cửa hàng.</Alert>}
                    <FieldGroup direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'start' }}>
                        <TextField label="Tên cửa hàng" value={name} disabled={!canManageShop} onChange={event => { setName(event.target.value); setSaved(false); }} sx={{ flex: 1, minWidth: 0 }} />
                        <TextField label="Tiền tệ cơ sở" value={shop.currency} disabled helperText="Không đổi tiền tệ bằng sửa giao diện. Cần kế hoạch chuyển đổi dữ liệu." sx={{ flex: 1, minWidth: 0 }} />
                    </FieldGroup>
                    <FieldGroup direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'start' }}>
                        <TextField label="Múi giờ" value={timezone} disabled={!canManageShop} onBlur={() => setTimezoneTouched(true)} onChange={event => { setTimezone(event.target.value); setSaved(false); }} error={(timezoneTouched || settingsSubmitted) && !!timezoneError} helperText={(timezoneTouched || settingsSubmitted) && timezoneError ? timezoneError : 'Áp dụng cho ngày giờ theo cửa hàng.'} sx={{ flex: 1, minWidth: 0 }} />
                        <TextField label="Ngôn ngữ giao diện" value="Tiếng Việt" disabled helperText={`Giao diện hiện chỉ hỗ trợ tiếng Việt. Ngôn ngữ lưu cho cửa hàng: ${locale}.`} sx={{ flex: 1, minWidth: 0 }} />
                    </FieldGroup>
                    <TextField label="Giao diện" value="Graphite Gold · Dark-only" disabled />
                    <MutationButton permission="shop.manage" type="submit" variant="contained" busy={update.pending} disabled={!canManageShop || !editor.dirty || update.pending}>Lưu cấu hình</MutationButton>
                </FormFields>
            </Panel>
            <Panel title="Checklist thiết lập vận hành" subtitle="Các mục không có trường API được giữ ở trạng thái chưa xác minh; không suy diễn đã sẵn sàng." bodyMode="inset">
                <Stack sx={layoutSx.surface.compactContentGap}>
                    <Alert severity="info">{__MOCK__ ? 'Bản xem trước mô phỏng. Chỉ tên, tiền tệ, múi giờ và ngôn ngữ được lưu qua API hiện tại.' : 'API hiện chỉ cho phép sửa thông tin cơ sở được hỗ trợ.'} Quốc gia kinh doanh không được suy ra từ múi giờ.</Alert>
                    <SetupChecklistItem title="Quốc gia và giờ kinh doanh" status="Chưa có trường cấu hình trong contract" />
                    <SetupChecklistItem title="Địa chỉ, vùng giao và phí vận chuyển" status={__MOCK__ ? 'Có preview mô phỏng, chưa lưu cấu hình' : 'Chưa có operation cấu hình vùng giao'} to={`/s/${shop.id}/shipments`} action="Xem preview phí giao" />
                    <SetupChecklistItem title="Người duyệt và thành viên" status="Quyền lấy từ membership; chưa có API gán chính sách duyệt" to={`/s/${shop.id}/settings/team`} action="Quản lý thành viên" />
                    <SetupChecklistItem title="Kết nối kênh bán hàng" status={__MOCK__ ? 'Kết nối mô phỏng; không có quyền provider thật' : 'Kiểm tra trạng thái kết nối'} to={`/s/${shop.id}/integrations/channels`} action="Mở kết nối" />
                    <SetupChecklistItem title="Kết nối AI" status={__MOCK__ ? 'Danh sách nhà cung cấp mô phỏng' : 'Kiểm tra danh sách nhà cung cấp'} to={`/s/${shop.id}/integrations/ai`} action="Mở nhà cung cấp AI" />
                    <SetupChecklistItem title="Nội dung sản phẩm và phiên bản kiến thức" status="Nguồn nội dung, lịch sử phiên bản và duyệt nằm trong khu vực kiến thức." to={`/s/${shop.id}/knowledge`} action="Quản lý nội dung" />
                    <SetupChecklistItem title="Vòng góp ý có duyệt" status="Góp ý tạo bản nháp; không tự huấn luyện hoặc xuất bản." to={`/s/${shop.id}/knowledge/review`} action="Duyệt góp ý" />
                    <SetupChecklistItem title="Consent và ngừng liên hệ marketing" status="Có bản ghi consent, lịch sử và luồng xác nhận challenge; gửi qua nhà cung cấp chưa kết nối." to={`/s/${shop.id}/settings/privacy`} action="Quản lý consent" />
                </Stack>
            </Panel>
        </PageSections>
    </>;
}
function SetupChecklistItem({ title, status, to, action }: { title: string; status: string; to?: string; action?: string }) {
    return <SurfaceContent bodyMode="compactControlOutlined" direction="row" alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" flexWrap="wrap">
        <Box><Typography fontWeight={visualSx.typography.fontWeight.strong}>{title}</Typography><Typography variant="body2" color="text.secondary">{status}</Typography></Box>
        {to && action && <RouteLink to={to}>{action}</RouteLink>}
    </SurfaceContent>;
}
