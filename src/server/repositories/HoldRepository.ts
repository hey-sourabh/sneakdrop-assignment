import RedisClient from '../infrastructure/RedisClient';
import { REDIS_KEYS } from '../constants/app.constants';
import type { Hold } from '../types';

class HoldRepository {
  private static instance: HoldRepository;
  private readonly client = RedisClient.getInstance();

  private constructor() {}

  static getInstance(): HoldRepository {
    if (!HoldRepository.instance) {
      HoldRepository.instance = new HoldRepository();
    }
    return HoldRepository.instance;
  }

  async get(userId: string): Promise<Hold | null> {
    const key = REDIS_KEYS.hold(userId);
    const data = await this.client.get(key);
    if (!data) return null;
    const ttl = await this.client.ttl(key);
    return { ...(JSON.parse(data) as Hold), expiresInSeconds: ttl };
  }

  async getPurchases(userId: string): Promise<number> {
    const val = await this.client.get(REDIS_KEYS.purchases(userId));
    return parseInt(val ?? '0', 10);
  }
}

export default HoldRepository;
