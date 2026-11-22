import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';

export const ExactDecimal = Prisma.Decimal.clone({ precision: 110, rounding: Prisma.Decimal.ROUND_HALF_EVEN });
export const moneyScale = 18;
const maxUnits = 2147483647;

function count(value: number) {
    return Number.isInteger(value) && value >= 0 && value <= maxUnits;
}

function valueAtShare(value: Prisma.Decimal, weight: number | Prisma.Decimal, total: number | Prisma.Decimal, scale: number) {
    const amount = new ExactDecimal(value);
    return new ExactDecimal(weight).eq(total) ? amount : amount.mul(weight).div(total).toDecimalPlaces(scale);
}

export function proportionalAmount(value: Prisma.Decimal, units: number, totalUnits: number, scale = moneyScale) {
    if (!count(units) || !count(totalUnits) || totalUnits < 1 || units > totalUnits || !Number.isInteger(scale) || scale < 0 || scale > moneyScale) {
        throw new UnprocessableEntityException();
    }
    return valueAtShare(value, units, totalUnits, scale);
}

export function allocateAmount(value: Prisma.Decimal, weights: readonly number[], scale = moneyScale) {
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    if (!weights.length || weights.some(weight => !count(weight)) || !count(totalWeight) || !totalWeight ||
        !Number.isInteger(scale) || scale < 0 || scale > moneyScale || value.decimalPlaces() > scale) {
        throw new UnprocessableEntityException();
    }
    return distributeAmount(value, weights, totalWeight, scale);
}

export function allocateAmountByValue(value: Prisma.Decimal, weights: readonly Prisma.Decimal[]) {
    const total = weights.reduce((sum, weight) => sum.plus(weight), new ExactDecimal(0));
    if (!total.gt(0) || weights.some(weight => !weight.isFinite() || weight.lt(0)) || value.decimalPlaces() > moneyScale) {
        throw new UnprocessableEntityException();
    }
    return distributeAmount(value, weights, total, moneyScale);
}

function distributeAmount(value: Prisma.Decimal, weights: readonly (Prisma.Decimal | number)[], total: Prisma.Decimal | number, scale: number) {
    let cumulative = new ExactDecimal(0);
    let allocated = new ExactDecimal(0);
    return weights.map(weight => {
        cumulative = cumulative.plus(weight);
        const target = valueAtShare(value, cumulative, total, scale);
        const part = target.minus(allocated);
        allocated = target;
        return part;
    });
}
