import { describe, expect, it } from 'vitest';
import { activeNavigationId } from '../src/app/navigation';

describe('active navigation', () => {
    it('selects the most specific matching section for detail routes', () => {
        expect(activeNavigationId('/s/shop-demo/inbox/cv1', 'shop-demo')).toBe('R05');
        expect(activeNavigationId('/s/shop-demo/products/p1', 'shop-demo')).toBe('R09');
        expect(activeNavigationId('/s/shop-demo/inventory/movements', 'shop-demo')).toBe('R16');
        expect(activeNavigationId('/s/shop-demo/finance/entries', 'shop-demo')).toBe('R21');
        expect(activeNavigationId('/s/shop-demo/bot/playground', 'shop-demo')).toBe('R27');
        expect(activeNavigationId('/s/shop-demo/knowledge/review', 'shop-demo')).toBe('R25');
    });
    it('does not match partial segments or another shop', () => {
        expect(activeNavigationId('/s/shop-demo/products-extra', 'shop-demo')).toBeUndefined();
        expect(activeNavigationId('/s/other/products', 'shop-demo')).toBeUndefined();
    });
});
