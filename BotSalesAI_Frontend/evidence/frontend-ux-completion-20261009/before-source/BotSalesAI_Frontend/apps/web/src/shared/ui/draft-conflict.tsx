import { useState } from 'react';
import { Alert, Button, MenuItem, TextField, Typography } from '@mui/material';
import type { DraftChoice, useVersionedDraft } from '../model/versioned-draft';
import { draftFields, draftFingerprint } from '../model/versioned-draft';
import { EditDialog, ErrorNotice } from './components';
import { FormFields, SectionGrid, SurfaceContent } from './composition';

function display(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Có' : 'Không';
    return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}
export function DraftConflict<T extends object>({ editor, labels, busy = false }: {
    editor: ReturnType<typeof useVersionedDraft<T>>;
    labels: Record<keyof T, string>;
    busy?: boolean;
}) {
    return <>
        {editor.conflict && <Alert severity="warning" action={<Button disabled={busy} color="inherit" onClick={() => void editor.compare()}>Đối chiếu</Button>}>Dữ liệu đã thay đổi trên server. Bản nháp của bạn được giữ; đối chiếu trước khi lưu.</Alert>}
        {editor.comparing && editor.baseline && editor.source && <Comparison key={`${editor.source.version}:${draftFingerprint(editor.source.values)}`} editor={editor} labels={labels} busy={busy}/>}
    </>;
}
function Comparison<T extends object>({ editor, labels, busy }: { editor: ReturnType<typeof useVersionedDraft<T>>; labels: Record<keyof T, string>; busy: boolean }) {
    const [choices, setChoices] = useState<Partial<Record<keyof T, DraftChoice>>>({});
    const base = editor.baseline!, latest = editor.source!;
    const fields = draftFields(base.values, editor.draft, latest.values, latest.hidden);
    const complete = !editor.refreshing && fields.every(field => choices[field.key] || field.choice);
    return <EditDialog density="comfortable" open title="Đối chiếu thay đổi" description={`Bản gốc v${base.version} · server v${latest.version}. Danh sách được chọn nguyên bản. Áp dụng chỉ cập nhật bản nháp; bạn vẫn cần kiểm tra và lưu.`} onClose={editor.closeComparison} dirtyGuard={false} busy={busy} actions={<Button variant="contained" disabled={busy || !complete || !!editor.refreshError} onClick={() => editor.reconcile(latest.version, draftFingerprint(latest.values), choices)}>Áp dụng vào bản nháp</Button>}>
        <FormFields>
            <ErrorNotice error={editor.refreshError}/>
            {fields.map(field => <SurfaceContent key={String(field.key)} bodyMode="compactOutlined">
                <Typography component="h3" variant="subtitle2">{labels[field.key]}</Typography>
                <SectionGrid columns={{ xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }} rhythm="content" shrinkChildren>
                    {([['Bản gốc', field.base], ['Bản nháp', field.mine], ['Server mới nhất', field.theirs]] as const).map(([label, value]) => <SurfaceContent key={label}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{display(value)}</Typography></SurfaceContent>)}
                </SectionGrid>
                <TextField select label={`Chọn dữ liệu: ${labels[field.key]}`} value={choices[field.key] || field.choice || ''} onChange={event => setChoices(current => ({ ...current, [field.key]: event.target.value as DraftChoice }))} error={!choices[field.key] && !field.choice} helperText={!choices[field.key] && !field.choice ? 'Cả hai bên đã sửa trường này. Hãy chọn bản cần giữ.' : 'Bạn có thể đổi lựa chọn trước khi áp dụng.'}>
                    <MenuItem value="mine">Giữ bản nháp</MenuItem><MenuItem value="theirs">Dùng bản server</MenuItem>
                </TextField>
            </SurfaceContent>)}
        </FormFields>
    </EditDialog>;
}
