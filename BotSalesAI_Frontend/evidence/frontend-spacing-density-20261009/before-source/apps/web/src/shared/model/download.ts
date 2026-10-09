/** Accept only browser-safe report targets; same-origin HTTP is for local preview, and demo exports may use Blob URLs. */
export function authorizedDownloadHref(value: string, origin: string, isMock: boolean) {
    try {
        const url = new URL(value, origin);
        if (url.username || url.password)
            return null;
        if (url.origin === origin && (url.protocol === 'http:' || url.protocol === 'https:'))
            return url.href;
        if (url.protocol === 'https:')
            return url.href;
        if (isMock && url.protocol === 'blob:')
            return url.href;
    }
    catch { /* A malformed or non-URL value is not a download target. */ }
    return null;
}
