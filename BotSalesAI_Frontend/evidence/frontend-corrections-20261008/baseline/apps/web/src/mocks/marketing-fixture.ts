import type { MarketingSummary } from '@botsales/contracts';

/** Fixed synthetic API fixture for frontend review; it is not live attribution or ad-account data. */
export const marketingFixture = {
  knownAttributedOrders: 3,
  unknownAttributionOrders: 5,
  topQuestions: [
    'Shop ơi áo thun còn size L không?',
    'Phí giao hàng về Vientiane là bao nhiêu?',
    'Mình muốn đổi size của đơn hàng.',
    'Sản phẩm có màu than không?',
  ],
  lostSaleReasons: [
    { reason: 'Không còn đúng kích cỡ', count: 4 },
    { reason: 'Chưa rõ phí giao hàng', count: 3 },
    { reason: 'Chưa đủ thông tin sản phẩm', count: 2 },
  ],
  estimatedSpend: { amount: '750000', currency: 'VND' },
  actualSpend: null,
} satisfies Omit<MarketingSummary, 'asOf'>;
