import RedisClient from '../infrastructure/RedisClient';
import { REDIS_KEYS, PAYMENT_TTL_SECONDS } from '../constants/app.constants';
import type { PaymentRecord } from '../types';

class PaymentRepository {
  private static instance: PaymentRepository;
  private readonly client = RedisClient.getInstance();

  private constructor() {}

  static getInstance(): PaymentRepository {
    if (!PaymentRepository.instance) {
      PaymentRepository.instance = new PaymentRepository();
    }
    return PaymentRepository.instance;
  }

  async claim(paymentId: string, data: PaymentRecord): Promise<boolean> {
    const key = REDIS_KEYS.payment(paymentId);
    const claimed = await this.client.setNX(key, JSON.stringify(data));
    const success = claimed === 1;
    if (success) await this.client.expire(key, PAYMENT_TTL_SECONDS);
    return success;
  }

  async get(paymentId: string): Promise<PaymentRecord | null> {
    const data = await this.client.get(REDIS_KEYS.payment(paymentId));
    return data ? (JSON.parse(data) as PaymentRecord) : null;
  }

  async update(paymentId: string, data: PaymentRecord): Promise<void> {
    await this.client.setEx(
      REDIS_KEYS.payment(paymentId),
      PAYMENT_TTL_SECONDS,
      JSON.stringify(data)
    );
  }
}

export default PaymentRepository;
