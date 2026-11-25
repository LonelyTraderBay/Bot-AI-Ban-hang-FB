import { useState } from 'react';
import { Button, Checkbox, FormControlLabel, TextField } from '@mui/material';
import type { DebtItem } from '@botsales/contracts';
import { useCommand } from '@/shared/api/hooks';
import { codePointLength, isValidDateOnly } from '@/shared/model/format';
import { useScope } from '@/shared/model/scope';
import { EditDialog, ErrorNotice } from '@/shared/ui/components';
import { FormFields } from '@/shared/ui/composition';

export const agingLabels: Record<NonNullable<DebtItem['agingBucket']>, string> = {
    no_due_date: 'Chưa đặt hạn', current: 'Trong hạn', overdue_1_30: 'Quá hạn 1–30 ngày',
    overdue_31_60: 'Quá hạn 31–60 ngày', overdue_61_90: 'Quá hạn 61–90 ngày',
    overdue_over_90: 'Quá hạn trên 90 ngày', settled: 'Đã tất toán',
};

export function DebtTermsDialog({ debt, close }: { debt: DebtItem; close: () => void }) {
    const { online } = useScope();
    const write = useCommand('updateDebtTerms', ['getDebtItem', 'listDebtItems', 'getReconciliationCase', 'listReconciliationCases', 'listPaymentReviews']);
    const [dueDate, setDueDate] = useState(debt.dueDate ?? '');
    const [disputeHold, setDisputeHold] = useState(debt.disputeHold ?? false);
    const [reason, setReason] = useState('');
    const dateInvalid = dueDate !== '' && !isValidDateOnly(dueDate);
    const ready = online && !write.pending && !write.unresolved && !dateInvalid && codePointLength(reason.trim()) >= 5 &&
        codePointLength(reason.trim()) <= 1000;

    async function save() {
        if (!ready) return;
        await write.execute({ path: { resourceId: debt.id }, body: {
            expectedVersion: debt.version, dueDate: dueDate || null, disputeHold, reason: reason.trim(),
        } });
        close();
    }

    return <EditDialog open title="Hạn trả và tranh chấp công nợ" busy={write.pending} onClose={close}
        actions={<Button type="submit" form="debt-terms" variant="contained" disabled={!ready}>Lưu quyết định</Button>}>
        <ErrorNotice error={write.error} />
        <FormFields component="form" id="debt-terms" onSubmit={event => { event.preventDefault(); void save().catch(() => undefined); }}>
            <TextField type="date" label="Ngày đến hạn" value={dueDate} error={dateInvalid} InputLabelProps={{ shrink: true }}
                onChange={event => setDueDate(event.target.value)} />
            <FormControlLabel label="Tạm giữ phân bổ do tranh chấp" control={<Checkbox checked={disputeHold}
                onChange={(_, checked) => setDisputeHold(checked)} />} />
            <TextField label="Lý do quyết định" value={reason} multiline onChange={event => setReason(event.target.value)} />
        </FormFields>
    </EditDialog>;
}
