import { FieldGroup, FormFields, PageSections, SurfaceContent } from '../../shared/ui/composition';
import { useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { ApiError } from '@/shared/api/errors';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useCan, useCanWrite, useScope } from '@/shared/model/scope';
import { isValidTimeZone } from '@/shared/model/format';
import { useDraftForm } from '@/shared/model/dirty-drafts';
import { useVersionedDraft } from '@/shared/model/versioned-draft';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { layoutSx } from '@/shared/ui/layout';
import { PageHeader, Panel, MutationButton, ConfirmDialog, ErrorNotice, RouteLink } from '@/shared/ui/components';

export function ShopSettingsPage() {
    const scope = useScope();
    const canWriteKnowledge = useCanWrite('knowledge.write');
    const { shop } = scope;
    const cache = useQueryClient();
    const hasShopPermission = useCan('shop.manage');
    const canManageShop = hasShopPermission && shop.status !== 'closed';
    const owner = hasShopPermission && scope.membership.roles.includes('owner');
    const [transition, setTransition] = useState<{ op: 'closeShop' | 'reopenShop'; version: number } | null>(null);
    const update = useCommand('updateShop', ['getShop']);
    const [name, setName] = useState(shop.name), [timezone, setTimezone] = useState(shop.timezone), [locale, setLocale] = useState(shop.locale), [error, setError] = useState<Error | null>(null), [saved, setSaved] = useState(false), [timezoneTouched, setTimezoneTouched] = useState(false), [settingsSubmitted, setSettingsSubmitted] = useState(false);
    const [businessCountry, setBusinessCountry] = useState(shop.businessCountry ?? null);
    const latestShop = useApi('getShop');
    const currentShop = latestShop.data && latestShop.data.data.version >= shop.version ? latestShop.data.data : shop;
    const operation = transition?.op ?? (currentShop.status === 'closed' ? 'reopenShop' : 'closeShop');
    const statusCommand = useCommand(operation, []);
    const actionLabel = operation === 'closeShop' ? 'Đóng cửa hàng' : 'Mở lại cửa hàng';
    const changeStatus = async () => {
        if (!transition || !owner) return;
        const shopKey = ['shop', scope.session.user.id, shop.id, scope.membership.permissionVersion];
        const detailKey = ['scope', scope.session.user.id, shop.id, scope.membership.permissionVersion, 'getShop'];
        const listKey = ['shops', scope.session.user.id];
        try {
            const result = await statusCommand.execute({ version: transition.version });
            await Promise.all([shopKey, detailKey, listKey].map(queryKey => cache.cancelQueries({ queryKey })));
            cache.setQueryData(shopKey, result);
            await Promise.all([shopKey, detailKey, listKey].map(queryKey => cache.invalidateQueries({ queryKey })));
            setTransition(null);
        } catch (error) {
            if (error instanceof ApiError && error.status === 412) {
                const [, latest] = await Promise.all([cache.invalidateQueries({ queryKey: shopKey }), latestShop.refetch()]);
                if (latest.isSuccess) setTransition({ ...transition, version: latest.data.data.version });
            }
            throw error;
        }
    };
    const editor = useVersionedDraft({
        identity: `${shop.id}:settings`,
        source: { version: currentShop.version, values: { name: currentShop.name, timezone: currentShop.timezone, locale: currentShop.locale, businessCountry: currentShop.businessCountry ?? null } },
        draft: { name, timezone, locale, businessCountry },
        apply: values => { setName(values.name); setTimezone(values.timezone); setLocale(values.locale); setBusinessCountry(values.businessCountry); },
        refresh: () => latestShop.refetch({ throwOnError: true }),
    });
    const formRef = useDraftForm(editor.dirty);
    const timezoneError = !isValidTimeZone(timezone) ? 'Nhập múi giờ hợp lệ, ví dụ Asia/Vientiane.' : '';
    const countryError = businessCountry !== null && !/^[A-Z]{2}$/.test(businessCountry);
    const save = async () => {
        setSettingsSubmitted(true);
        if (!name.trim() || timezoneError || countryError) return;
        setError(null); setSaved(false);
        const prepared = editor.prepare();
        if (!prepared) return;
        const submitted = { name, timezone, locale, businessCountry };
        try {
            const result = await update.execute({ path: { shopId: shop.id }, version: prepared.version, body: prepared.patch });
            cache.setQueryData(['shop', scope.session.user.id, shop.id, scope.membership.permissionVersion], result);
            editor.committed({ version: result.data.version, values: { name: result.data.name, timezone: result.data.timezone, locale: result.data.locale, businessCountry: result.data.businessCountry ?? null } }, submitted);
            setSaved(true);
        }
        catch (error) { editor.failed(error); setError(error instanceof Error ? error : new Error('Không lưu được cấu hình')); }
    };
    return <>
        <PageHeader title="Thiết lập cửa hàng" subtitle="Thông tin cơ sở và nguồn tư vấn đã được duyệt."
            actions={canWriteKnowledge ? <RouteLink to={`/s/${scope.shop.id}/knowledge?template=product_content`}>Soạn hồ sơ nội dung sản phẩm</RouteLink> : undefined} />
        <PageSections >
            <Panel title="Thông tin cơ sở" bodyMode="inset">
                <FormFields component="form" ref={formRef} noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
                    <ErrorNotice error={error || update.error} />
                    <DraftConflict editor={editor} labels={{ name: 'Tên cửa hàng', timezone: 'Múi giờ', locale: 'Ngôn ngữ', businessCountry: 'Quốc gia kinh doanh' }} busy={update.pending}/>
                    {saved && <Alert severity="success" role="status">Đã lưu cấu hình cửa hàng.</Alert>}
                    <FieldGroup direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'start' }}>
                        <TextField label="Tên cửa hàng" value={name} disabled={!canManageShop} onChange={event => { setName(event.target.value); setSaved(false); }} sx={{ flex: 1, minWidth: 0 }} />
                        <TextField label="Tiền tệ cơ sở" value={shop.currency} disabled helperText="Không đổi tiền tệ bằng sửa giao diện. Cần kế hoạch chuyển đổi dữ liệu." sx={{ flex: 1, minWidth: 0 }} />
                    </FieldGroup>
                    <FieldGroup direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'start' }}>
                        <TextField label="Múi giờ" value={timezone} disabled={!canManageShop} onBlur={() => setTimezoneTouched(true)} onChange={event => { setTimezone(event.target.value); setSaved(false); }} error={(timezoneTouched || settingsSubmitted) && !!timezoneError} helperText={(timezoneTouched || settingsSubmitted) && timezoneError ? timezoneError : 'Áp dụng cho ngày giờ theo cửa hàng.'} sx={{ flex: 1, minWidth: 0 }} />
                        <TextField label="Ngôn ngữ giao diện" value="Tiếng Việt" disabled helperText={`Giao diện hiện chỉ hỗ trợ tiếng Việt. Ngôn ngữ lưu cho cửa hàng: ${locale}.`} sx={{ flex: 1, minWidth: 0 }} />
                    </FieldGroup>
                    <TextField label="Quốc gia kinh doanh" name="businessCountry" value={businessCountry ?? ''} disabled={!canManageShop}
                        onChange={event => { setBusinessCountry(event.target.value.trim().toUpperCase() || null); setSaved(false); }}
                        error={countryError} helperText={countryError ? 'Nhập mã hai chữ cái, ví dụ LA hoặc VN.' : 'Khai báo bằng mã ISO 3166-1, ví dụ LA hoặc VN.'} />
                    <TextField label="Giao diện" value="Graphite Gold · Dark-only" disabled />
                    <MutationButton permission="shop.manage" type="submit" variant="contained" busy={update.pending} disabled={!canManageShop || !editor.dirty || countryError || update.pending}>Lưu cấu hình</MutationButton>
                </FormFields>
            </Panel>
            <Panel title="Checklist thiết lập vận hành" bodyMode="inset">
                <Stack sx={layoutSx.surface.compactContentGap}>
                    <SetupChecklistItem title="Chạy bot trên Messenger" status={currentShop.businessCountry
                        ? 'Cần phê duyệt phạm vi và quyền nhà cung cấp.'
                        : 'Cần khai báo quốc gia kinh doanh để chạy bot trên Messenger.'} />
                    <SetupChecklistItem title="Giờ kinh doanh" status="Chưa có cấu hình trong hệ thống." />
                    <SetupChecklistItem title="Địa chỉ, vùng giao và phí vận chuyển" status="Khai báo phí dự kiến theo tỉnh/thành và quốc gia." to={hasShopPermission ? `/s/${shop.id}/settings/shipping` : undefined} action="Cấu hình giao hàng" />
                    <SetupChecklistItem title="Người duyệt và thành viên" status="Quyền lấy từ membership; chưa có API gán chính sách duyệt" to={`/s/${shop.id}/settings/team`} action="Quản lý thành viên" />
                    <SetupChecklistItem title="Kết nối kênh bán hàng" status={__MOCK__ ? 'Kết nối mô phỏng; không có quyền provider thật' : 'Kiểm tra trạng thái kết nối'} to={`/s/${shop.id}/integrations/channels`} action="Mở kết nối" />
                    <SetupChecklistItem title="Kết nối AI" status={__MOCK__ ? 'Danh sách nhà cung cấp mô phỏng' : 'Kiểm tra danh sách nhà cung cấp'} to={`/s/${shop.id}/integrations/ai`} action="Mở nhà cung cấp AI" />
                    <SetupChecklistItem title="Nội dung sản phẩm và phiên bản kiến thức" status="Nguồn nội dung, lịch sử phiên bản và duyệt nằm trong khu vực kiến thức." to={`/s/${shop.id}/knowledge`} action="Quản lý nội dung" />
                    <SetupChecklistItem title="Vòng góp ý có duyệt" status="Góp ý tạo bản nháp; không tự huấn luyện hoặc xuất bản." to={`/s/${shop.id}/knowledge/review`} action="Duyệt góp ý" />
                    <SetupChecklistItem title="Consent và ngừng liên hệ marketing" status="Có bản ghi consent, lịch sử và luồng xác nhận challenge; gửi qua nhà cung cấp chưa kết nối." to={`/s/${shop.id}/settings/privacy`} action="Quản lý consent" />
                </Stack>
            </Panel>
            {owner && <Panel title="Trạng thái cửa hàng" bodyMode="inset">
                <SurfaceContent alignItems="flex-start">
                    <Typography>{currentShop.status === 'closed' ? 'Đã đóng' : 'Đang hoạt động'}</Typography>
                    <MutationButton permission="shop.manage" action={operation} variant="outlined" color={operation === 'closeShop' ? 'error' : 'primary'}
                        disabled={statusCommand.unresolved} onClick={() => setTransition({ op: currentShop.status === 'closed' ? 'reopenShop' : 'closeShop', version: currentShop.version })}>
                        {actionLabel}
                    </MutationButton>
                </SurfaceContent>
            </Panel>}
        </PageSections>
        <ConfirmDialog open={owner && !!transition} title={actionLabel} confirmLabel={actionLabel}
            description={operation === 'closeShop'
                ? `Đóng ${shop.name}? Thành viên vẫn xem được lịch sử. Các thao tác tạo, sửa và gửi sẽ dừng cho đến khi cửa hàng được mở lại.`
                : `Mở lại ${shop.name}? Thành viên có thể tiếp tục làm việc theo quyền hiện có. Các cấu hình tạm dừng vẫn được giữ.`}
            busy={statusCommand.pending} onClose={() => setTransition(null)} onConfirm={changeStatus}/>
    </>;
}
function SetupChecklistItem({ title, status, to, action }: { title: string; status: string; to?: string; action?: string }) {
    return <SurfaceContent bodyMode="compactControlOutlined" direction="row" alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" flexWrap="wrap">
        <Box><Typography fontWeight={visualSx.typography.fontWeight.strong}>{title}</Typography><Typography variant="body2" color="text.secondary">{status}</Typography></Box>
        {to && action && <RouteLink to={to}>{action}</RouteLink>}
    </SurfaceContent>;
}
