import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { EditDialog } from '@/shared/ui/components';
import { downloadText } from '@/shared/model/format';
import { useScope } from '@/shared/model/scope';
export function FeedbackDialog({ open, onClose }: {
    open: boolean;
    onClose: () => void;
}) {
    const [text, setText] = useState('');
    const [priority, setPriority] = useState('normal');
    const location = useLocation();
    const { shop, membership } = useScope();
    return <EditDialog open={open} title="Góp ý màn hình" onClose={onClose} actions={<Button variant="contained" disabled={!text.trim()} onClick={() => { downloadText('botsales-feedback.json', JSON.stringify({
        kind: 'frontend-review', path: location.pathname, shopId: shop.id, roles: membership.roles, priority, comment: text, createdAt: new Date().toISOString()
    }, null, 2), 'application/json'); setText(''); onClose(); }}>Xuất góp ý JSON</Button>}><Stack gap={2}><Typography variant="body2" color="text.secondary">Góp ý được xuất vào file trên máy, không gửi tới máy chủ. Không điền thông tin khách hoặc khóa bí mật.</Typography><TextField label="Màn hình" value={location.pathname} fullWidth slotProps={{ input: { readOnly: true } }}/><TextField select label="Ưu tiên" value={priority} onChange={e => setPriority(e.target.value)}><MenuItem value="normal">Thông thường</MenuItem><MenuItem value="high">Quan trọng</MenuItem></TextField><TextField label="Nội dung cần bổ sung hoặc sửa" value={text} onChange={e => setText(e.target.value)} multiline minRows={5} fullWidth/></Stack></EditDialog>;
}
