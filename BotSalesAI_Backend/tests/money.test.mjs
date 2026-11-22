import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExactDecimal, allocateAmount, proportionalAmount } from '../apps/api/dist/platform/money/index.js';

test('money allocation conserves the rounded source in stable input order', () => {
    const hundred = new ExactDecimal('100');
    const parts = allocateAmount(hundred, [1, 1, 1], 0).map(value => value.toFixed());
    assert.deepEqual(parts, ['33', '34', '33']);
    assert.deepEqual(allocateAmount(hundred, [0, 1, 2, 0], 0).map(value => value.toFixed()), ['0', '33', '67', '0']);
    assert.deepEqual(allocateAmount(new ExactDecimal('-1.00'), [1, 1, 1], 2).map(value => value.toFixed(2)), ['-0.33', '-0.34', '-0.33']);
});

test('money allocation preserves 18 fractional places and represents ties without floating-point loss', () => {
    const amount = new ExactDecimal('9007199254740993.000000000000000001');
    const pieces = allocateAmount(amount, [3, 1, 2]);
    const total = pieces.reduce((sum, value) => sum.plus(value), new ExactDecimal(0));
    assert.equal(total.toFixed(), amount.toFixed());
    assert.equal(proportionalAmount(new ExactDecimal('1'), 1, 2, 0).toFixed(), '0');
    assert.equal(proportionalAmount(new ExactDecimal('3'), 1, 2, 0).toFixed(), '2');
    assert.throws(() => allocateAmount(new ExactDecimal('1.01'), [1, 1], 0), error => error.getStatus() === 422);
});
