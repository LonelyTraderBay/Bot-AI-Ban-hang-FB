import type { Money } from '@botsales/contracts';
export function formatMoney(value: Money | null | undefined): string {
    if (!value)
        return 'Chưa có dữ liệu';
    const negative = value.amount.startsWith('-');
    const [integer, frac = ''] = value.amount.replace(/^-/, '').split('.');
    const grouped = (integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimal = frac.replace(/0+$/, '');
    const symbol: Record<string, string> = { VND: '₫', LAK: '₭', THB: '฿', USD: 'USD' };
    return `${negative ? '−' : ''}${grouped}${decimal ? ',' + decimal : ''} ${symbol[value.currency] || value.currency}`;
}
export function dateTime(value: string | null | undefined, timezone = 'Asia/Vientiane'): string {
    if (!value)
        return 'Chưa ghi nhận';
    const d = new Date(value);
    if (Number.isNaN(d.getTime()))
        return 'Thời gian không hợp lệ';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: timezone }).format(d);
}
export function safeInternalPath(input: string | null, fallback = '/workspaces'): string {
    if (!input || !input.startsWith('/') || input.startsWith('//') || /[\\\r\n]/.test(input) || input.includes('\0'))
        return fallback;
    const u = new URL(input, 'https://botsales.invalid');
    return u.origin === 'https://botsales.invalid' ? u.pathname + u.search + u.hash : fallback;
}
export function csvCell(value: unknown): string {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@\t\r]/.test(text))
        text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}
export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
