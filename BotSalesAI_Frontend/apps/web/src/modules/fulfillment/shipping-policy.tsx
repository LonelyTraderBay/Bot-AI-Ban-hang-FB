import { useEffect, useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import type { ShippingPolicy, ShippingRateRule } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useCanWrite, useScope } from '@/shared/model/scope';
import { codePointLength } from '@/shared/model/format';
import { ActionGroup, FieldGroup, FormFields, PageSections } from '@/shared/ui/composition';
import { Amount, ConfirmDialog, DataTable, EditDialog, ErrorNotice, MutationButton, PageHeader, Panel, QueryState, RouteLink } from '@/shared/ui/components';

const blankRule: ShippingRateRule = { countryCode: '', province: '', serviceName: '', amount: '' };
const feePattern = /^(0|[1-9][0-9]{0,11})(\.[0-9]{1,4})?$/;
type RuleEdit = { policy: ShippingPolicy; index: number; mode: 'edit' | 'remove' };

export function ShippingPolicyPage() {
    const { shop } = useScope();
    const canEdit = useCanWrite('shop.manage');
    const current = useApi('getShippingPolicy');
    const save = useCommand('updateShippingPolicy', ['getShippingPolicy']);
    const [editing, setEditing] = useState<RuleEdit | null>(null);
    const [saved, setSaved] = useState(false);
    useEffect(() => {
        if (!canEdit) setEditing(current => current?.mode === 'remove' ? null : current);
    }, [canEdit]);
    const policy = current.data?.data;
    const open = (index: number, mode: RuleEdit['mode']) => {
        if (!policy || !canEdit) return;
        save.clearError();
        setSaved(false);
        setEditing({ policy, index, mode });
    };
    const persist = async (rule?: ShippingRateRule) => {
        if (!editing || !canEdit) return;
        const { index, policy: baseline } = editing;
        const rules = baseline.rules.slice();
        if (index < 0 && rule) rules.push(rule);
        else rules.splice(index, 1, ...(rule ? [rule] : []));
        await save.execute({ version: baseline.version, body: { rules } });
        setEditing(null);
        setSaved(true);
    };
    return <>
        <PageHeader title="Cấu hình giao hàng" subtitle="Khai báo vùng phục vụ và phí giao dự kiến theo tỉnh/thành."
            actions={<RouteLink to={`/s/${shop.id}/shipments`}>Vận đơn & giao hàng</RouteLink>} />
        <PageSections>
            {__MOCK__ && <Alert severity="info">Biểu phí lưu trong phiên demo. Phí được báo riêng với tiền hàng. Kết nối hãng vận chuyển cần môi trường thật.</Alert>}
            {saved && <Alert severity="success" role="status">Đã lưu biểu phí giao hàng.</Alert>}
            <Panel title="Biểu phí thủ công" subtitle={policy ? `Phiên bản ${policy.version} · ${shop.currency}` : shop.currency}
                action={<MutationButton permission="shop.manage" variant="contained" disabled={!policy || policy.rules.length >= 100}
                    onClick={() => open(-1, 'edit')}>Thêm vùng giao</MutationButton>}>
                <QueryState query={current} pendingProfile="section">
                    {policy && <DataTable label="Biểu phí giao hàng" reflowOnMobile rows={policy.rules}
                        rowKey={rule => rule.countryCode + ':' + rule.province}
                        empty="Chưa có vùng giao. Báo giá đơn cần kiểm tra phí giao thủ công."
                        columns={[
                            { key: 'zone', label: 'Vùng phục vụ', render: rule => `${rule.province} · ${rule.countryCode}` },
                            { key: 'service', label: 'Dịch vụ', render: rule => rule.serviceName },
                            { key: 'fee', label: 'Phí dự kiến', align: 'right', render: rule => <Amount value={{ currency: shop.currency, amount: rule.amount }} /> },
                            { key: 'actions', label: 'Thao tác', render: rule => <ActionGroup direction="row">
                                <Button size="small" disabled={!canEdit} onClick={() => open(policy.rules.indexOf(rule), 'edit')}>Sửa vùng</Button>
                                <Button size="small" disabled={!canEdit} onClick={() => open(policy.rules.indexOf(rule), 'remove')}>Gỡ vùng</Button>
                            </ActionGroup> },
                        ]} />}
                </QueryState>
            </Panel>
        </PageSections>
        {editing?.mode === 'edit' && <ShippingRuleEditor initial={editing.policy.rules[editing.index] ?? blankRule}
            currency={shop.currency} busy={save.pending} error={save.error} close={() => setEditing(null)} submit={persist} />}
        {canEdit && editing?.mode === 'remove' && <ConfirmDialog open title="Gỡ vùng giao"
            description="Gỡ vùng này khỏi biểu phí. Báo giá đang chờ xác nhận có thể cần làm lại."
            onClose={() => setEditing(null)} onConfirm={() => persist()} busy={save.pending} error={save.error} confirmLabel="Gỡ vùng" />}
    </>;
}

function ShippingRuleEditor({ initial, currency, busy, error, close, submit }: {
    initial: ShippingRateRule;
    currency: string;
    busy: boolean;
    error: Error | null;
    close: () => void;
    submit: (rule: ShippingRateRule) => Promise<void>;
}) {
    const [rule, setRule] = useState(initial);
    const [submitted, setSubmitted] = useState(false);
    const { online } = useScope();
    const canEdit = useCanWrite('shop.manage');
    const change = (key: keyof ShippingRateRule, value: string) => setRule(current => ({ ...current, [key]: value }));
    const normalized = { countryCode: rule.countryCode.trim().toUpperCase(), province: rule.province.trim(), serviceName: rule.serviceName.trim(), amount: rule.amount.trim() };
    const invalidCountry = !/^[A-Z]{2}$/.test(normalized.countryCode);
    const invalidProvince = !normalized.province || codePointLength(normalized.province) > 120;
    const invalidService = !normalized.serviceName || codePointLength(normalized.serviceName) > 120;
    const invalidFee = !feePattern.test(normalized.amount);
    const title = initial.countryCode ? 'Sửa vùng giao' : 'Thêm vùng giao';
    return <EditDialog open title={title} busy={busy} onClose={close}
        actions={({ requestClose }) => <ActionGroup direction="row">
            <Button onClick={requestClose} disabled={busy}>Đóng</Button>
            <Button variant="contained" type="submit" form="shipping-rule-form" disabled={busy || !online || !canEdit}>Lưu vùng giao</Button>
        </ActionGroup>}>
        <FormFields component="form" id="shipping-rule-form" noValidate onSubmit={event => {
            event.preventDefault();
            setSubmitted(true);
            if (busy || !online || !canEdit || invalidCountry || invalidProvince || invalidService || invalidFee) return;
            void submit(normalized).catch(() => undefined);
        }}>
            <ErrorNotice error={error} />
            <FieldGroup direction={{ xs: 'column', sm: 'row' }} alignItems="start">
                <TextField required disabled={!canEdit} label="Mã quốc gia" value={rule.countryCode} onChange={event => change('countryCode', event.target.value)}
                    fullWidth error={submitted && invalidCountry} helperText={submitted && invalidCountry ? 'Nhập mã gồm hai chữ cái.' : 'Ví dụ VN hoặc LA.'} />
                <TextField required disabled={!canEdit} label="Tỉnh/Thành" value={rule.province} onChange={event => change('province', event.target.value)}
                    fullWidth error={submitted && invalidProvince} helperText={submitted && invalidProvince ? 'Nhập tên tỉnh/thành, tối đa 120 ký tự.' : 'Dùng cùng tên với địa chỉ khách.'} />
            </FieldGroup>
            <TextField required disabled={!canEdit} label="Tên dịch vụ" value={rule.serviceName} onChange={event => change('serviceName', event.target.value)}
                error={submitted && invalidService} helperText={submitted && invalidService ? 'Nhập tên dịch vụ, tối đa 120 ký tự.' : undefined} />
            <TextField required disabled={!canEdit} label={`Phí dự kiến (${currency})`} value={rule.amount} onChange={event => change('amount', event.target.value)}
                inputProps={{ inputMode: 'decimal' }} error={submitted && invalidFee}
                helperText={submitted && invalidFee ? 'Nhập số từ 0, tối đa 12 chữ số nguyên và 4 chữ số thập phân.' : 'Ví dụ 25000. Dùng dấu chấm nếu có phần thập phân.'} />
        </FormFields>
    </EditDialog>;
}
