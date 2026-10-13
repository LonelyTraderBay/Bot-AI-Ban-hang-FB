import { beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { db } from '../src/mocks/database';
import { handle, resetService, setRole } from '../src/mocks/service';

const get = (op: string, commandId?: string, shopId = 'shop-demo') => handle({ op, path: { shopId, ...(commandId ? { commandId } : {}) }, query: new URLSearchParams() });
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); resetService(); });

it('command history and details require the originating action permission in addition to jobs.read', async () => {
    const command = db.commands.find(row => row.kind === 'createInventoryAdjustment' && row.shopId === 'shop-demo');
    if (!command) throw new Error('Missing seeded inventory command');
    setRole('bot_admin');
    await expect(get('getCommand', String(command.id))).rejects.toMatchObject({ status: 403 });
    const list = await get('listCommands');
    expect(list.data).toEqual([]);
    setRole('owner');
    expect((await get('listCommands')).data).toEqual(expect.arrayContaining([expect.objectContaining({ id: command.id, status: 'unknown' })]));
    expect((await get('getCommand', String(command.id))).data).toEqual(command);
});
it('command reads fail closed for unknown kinds and keep foreign-shop IDs outside the current shop', async () => {
    const command = db.commands.find(row => row.shopId === 'shop-demo');
    if (!command) throw new Error('Missing command fixture');
    db.commands.push({ ...command, id: 'unknown-command-kind', kind: 'unmappedExternalAction' });
    db.commands.push({ ...command, id: 'foreign-command', shopId: 'shop-demo-2' });
    const visible = (await get('listCommands')).data as Array<{ id: string }>;
    expect(visible.map(row => row.id)).not.toContain('unknown-command-kind');
    expect(visible.map(row => row.id)).not.toContain('foreign-command');
    await expect(get('getCommand', 'unknown-command-kind')).rejects.toMatchObject({ status: 403 });
    await expect(get('getCommand', 'foreign-command')).rejects.toMatchObject({ status: 404 });
});
it('jobs.read is still required for the history itself', async () => {
    setRole('viewer');
    await expect(get('listCommands')).rejects.toMatchObject({ status: 403 });
});
