import { setFault, setRole, resetService } from './service';
import { loadLargeCustomerDataset } from './database';
import {loadEmptyManagementDataset} from './finance-dataset';
export async function setMockControl(key: string, value: string) {
    if (!__MOCK__)
        throw new Error('Mock control bị tắt.');
    if (key === 'role')
        setRole(value);
    else if (key === 'dataset') {
        if (value === 'seed')
            resetService();
        else if (value === 'large-customers')
            loadLargeCustomerDataset();
        else if (value === 'finance-empty') {
            resetService();loadEmptyManagementDataset();
        }
        else
            throw new Error('Không hỗ trợ bộ dữ liệu mô phỏng.');
    }
    else if (key === 'reset')
        resetService();
    else if (key === 'fault') {
        const mode = ({ normal: 'none', slow: 'slow', error: 'error', error_persistent: 'error_persistent', error_persistent_all: 'error_persistent_all', forbidden: 'forbidden', conflict: 'stale', empty: 'empty', empty_persistent: 'empty_persistent', unknown: 'unknown', budget_exceeded: 'budget_exceeded', tool_denied: 'tool_denied' } as const)[value as 'normal'];
        if (!mode)
            throw new Error('Không hỗ trợ trạng thái.');
        setFault(mode);
    }
}
