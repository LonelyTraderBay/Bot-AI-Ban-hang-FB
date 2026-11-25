import { TextField } from '@mui/material';
import type { Knowledge } from '@botsales/contracts';
import { FieldGroup } from '../../shared/ui/composition';
import { DetailLine } from '../../shared/ui/components';

type PolicyFields = Required<Pick<Knowledge, 'policyKey' | 'validFrom' | 'validUntil'>>;

export function knowledgePolicy(source?: Partial<PolicyFields>): PolicyFields {
    return { policyKey: source?.policyKey ?? null, validFrom: source?.validFrom ?? null, validUntil: source?.validUntil ?? null };
}

const policyKeyPattern = /^(promotion|faq|shipping|returns):[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function policyFieldsValid({ policyKey, validFrom, validUntil }: PolicyFields) {
    return (!policyKey || (policyKeyPattern.test(policyKey) && Boolean(validFrom && validUntil))) &&
        (!validFrom || !validUntil || validFrom <= validUntil);
}

export function KnowledgePolicyFields({ value, onChange, timezone }: {
    value: PolicyFields; onChange: (value: PolicyFields) => void; timezone: string;
}) {
    const includesDates = Boolean(value.validFrom && value.validUntil);
    const invalidOrder = Boolean(value.validFrom && value.validUntil && value.validFrom > value.validUntil);
    return <>
        <TextField label="Mã chủ đề chính sách" name="policyKey" value={value.policyKey ?? ''}
            error={Boolean(value.policyKey) && !policyKeyPattern.test(value.policyKey ?? '')}
            helperText="Dùng cùng mã cho các phiên bản của một điều khoản. Ví dụ returns:standard, shipping:local, faq:warranty hoặc promotion:summer."
            onChange={event => onChange({ ...value, policyKey: event.target.value.trim().slice(0, 100) || null })} />
        <FieldGroup direction={{ xs: 'column', sm: 'row' }}>
            <TextField fullWidth type="date" label="Hiệu lực từ ngày" name="validFrom" value={value.validFrom ?? ''}
                slotProps={{ inputLabel: { shrink: true } }} required={Boolean(value.policyKey)}
                helperText={value.policyKey && !includesDates ? 'Chính sách cần cả hai mốc ngày.' : `Theo múi giờ ${timezone}.`}
                onChange={event => onChange({ ...value, validFrom: event.target.value || null })} />
            <TextField fullWidth type="date" label="Hiệu lực đến hết ngày" name="validUntil" value={value.validUntil ?? ''}
                slotProps={{ inputLabel: { shrink: true } }} required={Boolean(value.policyKey)}
                error={invalidOrder} helperText={invalidOrder ? 'Ngày kết thúc phải từ ngày bắt đầu trở đi.' : undefined}
                onChange={event => onChange({ ...value, validUntil: event.target.value || null })} />
        </FieldGroup>
    </>;
}

export function KnowledgePolicyFacts({ source, timezone }: { source: Partial<PolicyFields>; timezone: string }) {
    const { policyKey, validFrom, validUntil } = source;
    const interval = validFrom && validUntil ? validFrom + ' – ' + validUntil : validFrom ? 'Từ ' + validFrom : 'Đến hết ' + validUntil;
    return <>
        {policyKey && <DetailLine label="Mã chủ đề chính sách">{policyKey}</DetailLine>}
        {(validFrom || validUntil) && <DetailLine label="Ngày hiệu lực">{interval} ({timezone})</DetailLine>}
    </>;
}
