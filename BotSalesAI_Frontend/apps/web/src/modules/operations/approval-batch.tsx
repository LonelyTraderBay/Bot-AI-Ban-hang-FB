import { useRef, useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import type { Approval } from '@botsales/contracts';
import { ApiError } from '@/shared/api/errors';
import { codePointLength } from '@/shared/model/format';
import { label } from '@/shared/model/labels';
import { Amount, DataTable, EditDialog, MutationButton } from '@/shared/ui/components';
import { FormFields } from '@/shared/ui/composition';

type Outcome = { id: string; status: 'approved' | 'excluded' | 'unknown' | 'unsent'; message: string };

const outcomes = {
    approved: 'Đã duyệt',
    excluded: 'Đã loại',
    unknown: 'Chưa rõ kết quả',
    unsent: 'Chưa gửi',
};

function excludedReason(error: ApiError) {
    switch (error.status) {
        case 404: return 'Hồ sơ không còn khả dụng trong phạm vi hiện tại.';
        case 412: return 'Phiên bản phê duyệt đã đổi. Hãy mở và kiểm lại.';
        case 409: return 'Nội dung, chính sách, hạn hiệu lực hoặc trạng thái hồ sơ đã đổi.';
        case 422: return 'Hồ sơ không còn đáp ứng điều kiện phê duyệt.';
        default: return null;
    }
}

export function ApprovalBatchDialog({ items, execute, onClose, onComplete }: {
    items: readonly Approval[];
    execute: (entry: Approval, reason: string) => Promise<unknown>;
    onClose: () => void;
    onComplete: () => void;
}) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<Outcome[] | null>(null);
    const running = useRef(false);
    const validReason = codePointLength(reason.trim()) >= 5;

    const submit = async () => {
        if (running.current || result || !validReason) return;
        running.current = true;
        setBusy(true);
        const results: Outcome[] = [];
        for (const entry of items) {
            try {
                await execute(entry, reason.trim());
                results.push({ id: entry.id, status: 'approved', message: 'Backend đã xác nhận quyết định.' });
            } catch (error) {
                const excluded = error instanceof ApiError && error.code !== 'IN_FLIGHT' && excludedReason(error);
                if (excluded) {
                    results.push({ id: entry.id, status: 'excluded', message: excluded });
                    continue;
                }
                const didNotSend = error instanceof ApiError && ['IN_FLIGHT', 'OFFLINE'].includes(error.code);
                const denied = error instanceof ApiError && [401, 403].includes(error.status);
                results.push({ id: entry.id, status: denied ? 'excluded' : didNotSend ? 'unsent' : 'unknown',
                    message: denied ? 'Phiên hoặc quyền quyết định không còn hiệu lực.' : didNotSend
                        ? error.message : 'Kiểm tra trạng thái lệnh trước khi thực hiện lại.' });
                break;
            }
        }
        results.push(...items.slice(results.length).map((entry): Outcome =>
            ({ id: entry.id, status: 'unsent', message: 'Đã dừng lô để kiểm tra hồ sơ trước.' })));
        setResult(results);
        setBusy(false);
        running.current = false;
        onComplete();
    };

    return <EditDialog open title="Duyệt các hồ sơ đã chọn" onClose={onClose} busy={busy}
        actions={result ? <Button onClick={onClose}>Đóng</Button> :
            <MutationButton permission="approvals.decide" variant="contained" busy={busy} disabled={!validReason} onClick={() => void submit()}>
                Xác nhận duyệt {items.length} hồ sơ
            </MutationButton>}>
        <FormFields>
            <Alert severity="info">Mỗi hồ sơ được kiểm và ghi riêng. Xem kết quả từng hồ sơ sau khi gửi.</Alert>
            <DataTable label="Hồ sơ trong lô" reflowOnMobile rows={items} rowKey={entry => entry.id} columns={[
                { key: 'intent', label: 'Nội dung đã chọn', render: entry => `${label(entry.action)} · ${entry.resource.id} · phiên bản ${entry.resourceVersion}` },
                { key: 'amount', label: 'Số tiền', render: entry => <Amount value={entry.amount} /> },
                { key: 'outcome', label: 'Kết quả', render: entry => {
                    const outcome = result?.find(row => row.id === entry.id);
                    return outcome ? `${outcomes[outcome.status]} · ${outcome.message}` : 'Chờ xác nhận';
                } },
            ]} />
            {!result && <TextField label="Lý do duyệt" required multiline value={reason} onChange={event => setReason(event.target.value)} />}
        </FormFields>
    </EditDialog>;
}
