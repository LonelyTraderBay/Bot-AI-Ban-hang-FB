import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';

export const ExactDecimal = Prisma.Decimal.clone({ precision: 110, rounding: Prisma.Decimal.ROUND_HALF_EVEN });
export const moneyScale = 18;
const maxUnits = 2147483647;

function count(value: number) {
    return Number.isInteger(value) && value >= 0 && value <= maxUnits;
}

export function proportionalAmount(value: Prisma.Decimal, units: number, totalUnits: number, scale = moneyScale) {
    if (!count(units) || !count(totalUnits) || totalUnits < 1 || units > totalUnits || !Number.isInteger(scale) || scale < 0 || scale > moneyScale) {
        throw new UnprocessableEntityException();
    }
    const amount = new ExactDecimal(value);
    if (units === totalUnits) return amount;
    return amount.mul(units).div(totalUnits).toDecimalPlaces(scale);
}

export function allocateAmount(value: Prisma.Decimal, weights: readonly number[], scale = moneyScale) {
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    if (!weights.length || weights.some(weight => !count(weight)) || !count(totalWeight) || !totalWeight ||
        !Number.isInteger(scale) || scale < 0 || scale > moneyScale || value.decimalPlaces() > scale) {
        throw new UnprocessableEntityException();
    }
    let allocatedUnits = 0;
    let allocated = new ExactDecimal(0);
    return weights.map(weight => {
        allocatedUnits += weight;
        const target = proportionalAmount(value, allocatedUnits, totalWeight, scale);
        const part = target.minus(allocated);
        allocated = target;
        return part;
    });
}
