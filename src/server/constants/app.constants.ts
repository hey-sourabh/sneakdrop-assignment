export const REDIS_KEYS = {
  STOCK: 'sneaker:stock',
  WAITLIST: 'waitlist',
  hold: (userId: string) => `hold:${userId}`,
  purchases: (userId: string) => `purchases:${userId}`,
  payment: (paymentId: string) => `payment:${paymentId}`,
} as const;

export const HOLD_TTL_SECONDS = 5 * 60;
export const MAX_PURCHASE_PER_USER = 2;
export const TOTAL_STOCK = 20;
export const PAYMENT_TTL_SECONDS = 24 * 3600;
export const EXPIRY_CHANNEL = '__keyevent@0__:expired';
