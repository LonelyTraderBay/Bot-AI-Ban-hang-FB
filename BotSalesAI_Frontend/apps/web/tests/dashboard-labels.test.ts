import { describe, expect, it } from 'vitest';
import { dashboardAgentRoleLabel, dashboardGreetingName } from '../src/modules/dashboard';

describe('dashboard labels from API-provided identity values', () => {
    it('keeps long display names readable as content instead of truncating them', () => {
        const name = 'Nguyễn Thị Minh Châu Phạm Bounmy';
        expect(dashboardGreetingName(`${name} · minhchau@example.test`)).toBe(name);
    });

    it('uses a neutral greeting when the API display name is empty or whitespace-only', () => {
        expect(dashboardGreetingName('')).toBe('bạn');
        expect(dashboardGreetingName('  · hidden-part')).toBe('bạn');
        expect(dashboardGreetingName(undefined)).toBe('bạn');
    });

    it('labels known agent-role kinds and does not invent a name for an unknown or empty kind', () => {
        expect(dashboardAgentRoleLabel('accountant')).toBe('Kế toán');
        expect(dashboardAgentRoleLabel('future_role_code')).toBe('Vai trò chưa có nhãn');
        expect(dashboardAgentRoleLabel('')).toBe('Vai trò chưa có nhãn');
        expect(dashboardAgentRoleLabel(undefined)).toBe('Vai trò chưa có nhãn');
    });
});
