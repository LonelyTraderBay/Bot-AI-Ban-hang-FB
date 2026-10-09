export type MarketingFixtureDay = {
    date: string;
    knownAttributedOrders: number;
    unknownAttributionOrders: number;
    estimatedSpend: string | null;
    actualSpend: string | null;
    questions: string[];
    lostSaleReasons: Array<{ reason: string; count: number }>;
};

/** Synthetic daily inputs for the mock read model; no live ads or attribution data. */
export const marketingFixture: readonly MarketingFixtureDay[] = [
    {
        date: '2026-09-04', knownAttributedOrders: 1, unknownAttributionOrders: 1, estimatedSpend: '150000', actualSpend: null,
        questions: ['Shop ơi áo thun còn size L không?'],
        lostSaleReasons: [{ reason: 'Không còn đúng kích cỡ', count: 1 }, { reason: 'Chưa rõ phí giao hàng', count: 1 }],
    },
    {
        date: '2026-09-11', knownAttributedOrders: 0, unknownAttributionOrders: 2, estimatedSpend: '200000', actualSpend: null,
        questions: ['Phí giao hàng về Vientiane là bao nhiêu?', 'Mình muốn đổi size của đơn hàng.'],
        lostSaleReasons: [{ reason: 'Không còn đúng kích cỡ', count: 2 }],
    },
    {
        date: '2026-09-18', knownAttributedOrders: 1, unknownAttributionOrders: 1, estimatedSpend: '250000', actualSpend: null,
        questions: ['Sản phẩm có màu than không?'],
        lostSaleReasons: [{ reason: 'Chưa rõ phí giao hàng', count: 2 }, { reason: 'Chưa đủ thông tin sản phẩm', count: 1 }],
    },
    {
        date: '2026-09-24', knownAttributedOrders: 1, unknownAttributionOrders: 0, estimatedSpend: '150000', actualSpend: null,
        questions: ['Shop ơi áo thun còn size L không?'],
        lostSaleReasons: [{ reason: 'Không còn đúng kích cỡ', count: 1 }, { reason: 'Chưa đủ thông tin sản phẩm', count: 1 }],
    },
    {
        date: '2026-09-28', knownAttributedOrders: 0, unknownAttributionOrders: 1, estimatedSpend: null, actualSpend: null,
        questions: ['Mình muốn đổi size của đơn hàng.'],
        lostSaleReasons: [{ reason: 'Chưa đủ thông tin sản phẩm', count: 1 }],
    },
];
