import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Button, TextField, ThemeProvider, Typography } from '@mui/material';
import { ActionGroup, FieldGroup, FormFields, SurfaceContent } from '../../apps/web/src/shared/ui/composition';
import { Amount, CapabilityUnavailable, CopyableCode, DetailLine, EditDialog, Empty, ErrorNotice, LookupLoadMore, PageHeader, Pager, Panel, PartialDataNotice, QueryState, Stat, Status } from '../../apps/web/src/shared/ui/components';
import { theme } from '../../apps/web/src/shared/ui/theme';
import { ApiError } from '../../apps/web/src/shared/api/errors';

const long = 'Nội dung hướng dẫn có thể xuống nhiều dòng trên màn hình hẹp. '.repeat(4);
const money = { amount: '9'.repeat(60), currency: 'VND' };
export function mountStress(container: HTMLElement, caseId: string) {
    const cases: Record<string, React.ReactNode> = {
        'field-group-mixed': <FieldGroup direction="row"><TextField label="Trường nhập" helperText={long}/><Button>Thử lại</Button></FieldGroup>,
        'form-fields-mixed': <FormFields direction="row"><TextField label="Trường nhập" helperText={long}/><Button>Thử lại</Button></FormFields>,
        'action-group-mixed': <ActionGroup><Typography>{long}</Typography><Button>Tiếp tục</Button></ActionGroup>,
        'page-header-actions': <PageHeader title="Màn hình" actions={<><Button>Thao tác A có nội dung dài</Button><Button>Thao tác B có nội dung dài</Button><Button>Thao tác C có nội dung dài</Button></>}/>,
        'stat-money': <Stat title="Giá trị hợp lệ theo Decimal" value={<Amount value={money}/>}/>,
        'detail-money': <Panel title="Chi tiết" bodyMode="inset"><DetailLine label="Số tiền"><Amount value={money}/></DetailLine></Panel>,
        'empty-long-code': <Empty text={'Mã tham chiếu: ' + 'A'.repeat(120)}/>,
        'copyable-long-code': <CopyableCode value={'A'.repeat(120)}/>,
        'status-with-content': <SurfaceContent direction="row"><Typography>{long}</Typography><Status value="draft"/></SurfaceContent>,
        'pager-long-total': <Pager page={{ limit: 20, total: 999999999999999, hasMore: true, nextCursor: 'next' }}/>,
        'error-long-code': <ErrorNotice error={new ApiError(422, 'INVALID', 'Không hợp lệ: ' + 'A'.repeat(120))}/>,
        'query-error-long-code': <QueryState query={{ isPending: false, isError: true, error: new Error('Không đọc được mã: ' + 'A'.repeat(120)), refetch: () => {} }}><span>Dữ liệu</span></QueryState>,
        'notices-default': <FormFields><PartialDataNotice/><CapabilityUnavailable/></FormFields>,
        'lookup-more': <LookupLoadMore label="các lựa chọn danh mục" loadedCount={200} hasMore onLoadMore={() => {}}/>,
        'dialog-long-title': <EditDialog open title={'Mã đối chiếu ' + 'A'.repeat(120)} description={long} onClose={() => {}} actions={<Button>Xác nhận thay đổi đang xem</Button>}><TextField label="Ghi chú" fullWidth multiline minRows={2} helperText={long}/></EditDialog>,
    };
    if (!cases[caseId]) throw new Error(`Unknown audit fixture: ${caseId}`);
    createRoot(container).render(<ThemeProvider theme={theme}><MemoryRouter>{cases[caseId]}</MemoryRouter></ThemeProvider>);
}
