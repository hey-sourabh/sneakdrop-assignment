import { createClient } from 'redis';

type RedisClientInstance = ReturnType<typeof createClient>;

class RedisClient {
  private static instance: RedisClientInstance | null = null;

  private constructor() {}

  static getInstance(): RedisClientInstance {
    
    if (!RedisClient.instance) {

      RedisClient.instance = createClient({
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      });

      RedisClient.instance.on('error', (err: Error) =>
        console.error('Redis error:', err.message)
      );

      RedisClient.instance.on('connect', () =>
        console.log('Redis connected')
      );

    }

    return RedisClient.instance;
  }

  static async connect(): Promise<void> {
    const client = RedisClient.getInstance();
    if (!client.isOpen) {
      await client.connect();
    }
  }
}

export default RedisClient;
