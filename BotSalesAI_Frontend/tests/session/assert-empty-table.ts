import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';

// DataTable keeps its header/scroll region and places Empty after that region.
// The announcement must remain outside the horizontally scrolling table.
export async function assertEmptyTable(main: Locator, context: string) {
    const region = main.locator('[role="region"]:has(> table > tbody:empty)').first();
    await expect(region, `${context}: empty table scroll region`).toBeVisible({ timeout: 10_000 });
    await expect(region).toHaveAttribute('aria-label', /\S/);
    const table = region.getByRole('table');
    await expect(table).toBeVisible();
    await expect(table).toHaveAttribute('aria-label', /\S/);
    await expect(table.locator('tbody tr')).toHaveCount(0);
    const empty = region.locator('xpath=following-sibling::*[1]');
    await expect(empty, `${context}: visible empty announcement after the table region`).toBeVisible();
    await expect(empty).toHaveAttribute('role', 'status');
    await expect(empty).toHaveAttribute('aria-live', 'polite');
    await expect(empty.locator('p').first(), `${context}: explanatory empty-state text`).toHaveText(/\S/);
    expect(await empty.evaluate(node => Boolean(node.closest('table'))), `${context}: announcement outside table`).toBe(false);
}
