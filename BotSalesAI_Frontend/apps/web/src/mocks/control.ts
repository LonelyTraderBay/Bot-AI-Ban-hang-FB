import { setFault, setRole, resetService } from './service';
export async function setMockControl(key: string, value: string) {
    if (!__MOCK__)
        throw new Error('Mock control bị tắt.');
    if (key === 'role')
        setRole(value);
    else if (key === 'reset')
        resetService();
    else if (key === 'fault') {
        const mode = ({ normal: 'none', slow: 'slow', error: 'error', forbidden: 'forbidden', conflict: 'stale', empty: 'empty', unknown: 'unknown' } as const)[value as 'normal'];
        if (!mode)
            throw new Error('Không hỗ trợ trạng thái.');
        setFault(mode);
    }
}
