import { TextField } from '@mui/material';
import { codePointLength, limitCodePoints } from '@/shared/model/format';

export const invalidDraftQuantity = (value: string) => value.length > 0 && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1_000_000);

export function DraftQuantity({ value, onChange, disabled, name, compact = false }: {
    value: string; onChange: (value: string) => void; disabled?: boolean; name?: string; compact?: boolean;
}) {
    const invalid = invalidDraftQuantity(value);
    return <TextField label="Số lượng" name={name} value={value} onChange={event => onChange(event.target.value)} disabled={disabled} size={compact ? 'small' : undefined}
        error={invalid} helperText={invalid ? 'Nhập số nguyên từ 1 đến 1.000.000.' : compact ? undefined : 'Số lượng nguyên theo hợp đồng.'}
        inputProps={{ inputMode: 'numeric', 'aria-invalid': invalid }} sx={{ minWidth: compact ? 66 : 100, maxWidth: { sm: 180 } }} />;
}

export function DraftNotes({ value, onChange, disabled, name, compact = false }: {
    value: string; onChange: (value: string) => void; disabled?: boolean; name?: string; compact?: boolean;
}) {
    return <TextField label={compact ? 'Ghi chú giao hàng' : 'Ghi chú chuẩn bị'} name={name} value={value}
        fullWidth={compact} size={compact ? 'small' : undefined}
        onChange={event => onChange(limitCodePoints(event.target.value, 2000))} disabled={disabled}
        error={codePointLength(value) > 2000} helperText={compact ? undefined : `${codePointLength(value)}/2.000 ký tự`} multiline minRows={2} />;
}
