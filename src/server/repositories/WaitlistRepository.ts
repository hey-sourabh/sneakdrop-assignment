import RedisClient from '../infrastructure/RedisClient';
import { REDIS_KEYS } from '../constants/app.constants';

class WaitlistRepository {
  private static instance: WaitlistRepository;
  private readonly client = RedisClient.getInstance();

  private constructor() {}

  static getInstance(): WaitlistRepository {
    if (!WaitlistRepository.instance) {
      WaitlistRepository.instance = new WaitlistRepository();
    }
    return WaitlistRepository.instance;
  }

  async getPosition(userId: string): Promise<number> {
    const rank = await this.client.lPos(REDIS_KEYS.WAITLIST, userId);
    return rank === null ? 0 : rank + 1;
  }

  async getLength(): Promise<number> {
    return this.client.lLen(REDIS_KEYS.WAITLIST);
  }

  async push(userId: string): Promise<void> {
    await this.client.rPush(REDIS_KEYS.WAITLIST, userId);
  }

  async remove(userId: string): Promise<void> {
    await this.client.lRem(REDIS_KEYS.WAITLIST, 0, userId);
  }

  async clear(): Promise<void> {
    await this.client.del(REDIS_KEYS.WAITLIST);
  }
}

export default WaitlistRepository;
