import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { ScopeContext } from '../src/shared/model/scope';
import type { Scope } from '../src/shared/model/scope';
import { theme } from '../src/shared/ui/theme';
import { TeamPage } from '../src/modules/workspace';

const state = vi.hoisted(() => ({ metadataError: false, metadataEnabled: false }));
vi.mock('@/shared/api/hooks', () => ({
 useApi: (op: string, _options?: unknown, enabled?: boolean) => {
  const base = { isPending: false, isError: false, error: null, refetch: vi.fn(), isFetching: false };
  if (op === 'listMembers') return { ...base, data: { data: [{ id: 'member-2', userId: 'user-2', roles: ['sales'], status: 'active', permissions: [], permissionVersion: 1 }], page: null } };
  if (op === 'getInboxMetadata') { state.metadataEnabled = enabled !== false; return { ...base, isError: state.metadataError, data: { data: { assignees: [{ userId: 'user-2', displayName: 'Mai Nguyễn' }] } } }; }
  return base;
 },
 useCommand: () => ({ pending: false, error: null, execute: vi.fn() }),
 usePagedApi: () => ({ isPending: false, isError: false, error: null, refetch: vi.fn() }),
}));
afterEach(() => { cleanup(); state.metadataError = false; });
function show(canRead: boolean) {
 const scope = { online: true, shop: { id: 'shop-1', name: 'Shop' }, session: { user: { id: 'user-1', displayName: 'Chủ shop' } }, membership: { permissions: ['members.manage', ...(canRead ? ['conversations.read'] : [])] } } as unknown as Scope;
 return render(<ThemeProvider theme={theme}><MemoryRouter><ScopeContext.Provider value={scope}><TeamPage /></ScopeContext.Provider></MemoryRouter></ThemeProvider>);
}
describe('staff names', () => {
 it('uses an authorized directory name', () => { show(true); expect(state.metadataEnabled).toBe(true); expect(screen.getByText('Mai Nguyễn')).toBeInTheDocument(); });
 it('does not expose cached directory names without permission', () => { show(false); expect(state.metadataEnabled).toBe(false); expect(screen.queryByText('Mai Nguyễn')).not.toBeInTheDocument(); expect(screen.getByText('Mã nhân sự: user-2')).toBeInTheDocument(); });
 it('falls back to ID when the lookup fails', () => { state.metadataError = true; show(true); expect(screen.queryByText('Mai Nguyễn')).not.toBeInTheDocument(); expect(screen.getByText('Mã nhân sự: user-2')).toBeInTheDocument(); });
});
