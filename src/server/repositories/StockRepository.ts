import RedisClient from '../infrastructure/RedisClient';
import { REDIS_KEYS } from '../constants/app.constants';

class StockRepository {
  private static instance: StockRepository;
  private readonly client = RedisClient.getInstance();

  private constructor() {}

  static getInstance(): StockRepository {
    if (!StockRepository.instance) {
      StockRepository.instance = new StockRepository();
    }
    return StockRepository.instance;
  }

  async get(): Promise<number> {
    const val = await this.client.get(REDIS_KEYS.STOCK);
    return parseInt(val ?? '0', 10);
  }

  async set(amount: number): Promise<void> {
    await this.client.set(REDIS_KEYS.STOCK, String(amount));
  }

  async exists(): Promise<boolean> {
    return (await this.client.exists(REDIS_KEYS.STOCK)) > 0;
  }
}

export default StockRepository;
