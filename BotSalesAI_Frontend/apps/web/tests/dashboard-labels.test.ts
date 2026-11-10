import { describe, expect, it } from 'vitest';
import { dashboardAgentRoleLabel } from '../src/modules/dashboard';

describe('dashboard labels from API-provided identity values', () => {
    it('labels known agent-role kinds and does not invent a name for an unknown or empty kind', () => {
        expect(dashboardAgentRoleLabel('accountant')).toBe('Kế toán');
        expect(dashboardAgentRoleLabel('future_role_code')).toBe('Vai trò chưa có nhãn');
        expect(dashboardAgentRoleLabel('')).toBe('Vai trò chưa có nhãn');
        expect(dashboardAgentRoleLabel(undefined)).toBe('Vai trò chưa có nhãn');
    });
});
