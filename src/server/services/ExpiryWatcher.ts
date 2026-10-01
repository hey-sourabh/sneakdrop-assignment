import { createClient } from 'redis';
import RedisClient from '../infrastructure/RedisClient';
import HoldService from './HoldService';
import { EXPIRY_CHANNEL } from '../constants/app.constants';

class ExpiryWatcher {
  private static instance: ExpiryWatcher;
  private readonly holdService = HoldService.getInstance();

  private constructor() {}

  static getInstance(): ExpiryWatcher {
    if (!ExpiryWatcher.instance) {
      ExpiryWatcher.instance = new ExpiryWatcher();
    }
    return ExpiryWatcher.instance;
  }

  async start(): Promise<void> {
    try {
      await RedisClient.getInstance().sendCommand(['CONFIG', 'SET', 'notify-keyspace-events', 'Ex']);

      const subscriber = createClient({
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      });
      subscriber.on('error', (err: Error) => console.error('Subscriber error:', err.message));
      await subscriber.connect();

      await subscriber.subscribe(EXPIRY_CHANNEL, async (key: string) => {
        if (key.startsWith('hold:')) {
          console.log(`Hold expired for user: ${key.replace('hold:', '')}. Advancing waitlist...`);
          await this.holdService.advanceWaitlist();
        }
      });

      console.log('Hold expiry watcher started (keyspace notifications)');
    } catch (err) {
      console.warn('Keyspace notifications unavailable, using polling fallback:', (err as Error).message);
      this.startPollingFallback();
    }
  }

  private startPollingFallback(): void {
    const knownHolds = new Set<string>();
    const client = RedisClient.getInstance();

    setInterval(async () => {
      try {
        const currentHolds = new Set<string>();
        for await (const key of client.scanIterator({ MATCH: 'hold:*', COUNT: 100 })) {
          const keys = Array.isArray(key) ? key : [key];
          keys.forEach((k) => currentHolds.add(k));
        }

        for (const oldKey of knownHolds) {
          if (!currentHolds.has(oldKey)) {
            console.log(`[Polling] Hold expired: ${oldKey.replace('hold:', '')}. Advancing waitlist...`);
            await this.holdService.advanceWaitlist();
          }
        }

        knownHolds.clear();
        currentHolds.forEach((k) => knownHolds.add(k));
      } catch (err) {
        console.error('Polling error:', (err as Error).message);
      }
    }, 30_000);

    console.log('Hold expiry watcher started (30s polling fallback)');
  }
}

export default ExpiryWatcher;
