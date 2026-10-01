import RedisClient from '../infrastructure/RedisClient';
import HoldRepository from '../repositories/HoldRepository';
import StockRepository from '../repositories/StockRepository';
import WaitlistRepository from '../repositories/WaitlistRepository';
import PaymentRepository from '../repositories/PaymentRepository';
import { HoldFactory, PaymentFactory } from '../factories';
import {
  REDIS_KEYS,
  HOLD_TTL_SECONDS,
  PAYMENT_TTL_SECONDS,
  MAX_PURCHASE_PER_USER,
  TOTAL_STOCK,
} from '../constants/app.constants';
import type { UserStatus, HoldResult, WaitlistResult, PaymentResult } from '../types';

class HoldService {
  private static instance: HoldService;

  private readonly client = RedisClient.getInstance();
  private readonly holdRepo = HoldRepository.getInstance();
  private readonly stockRepo = StockRepository.getInstance();
  private readonly waitlistRepo = WaitlistRepository.getInstance();
  private readonly paymentRepo = PaymentRepository.getInstance();

  private constructor() {}

  static getInstance(): HoldService {
    if (!HoldService.instance) {
      HoldService.instance = new HoldService();
    }
    return HoldService.instance;
  }

  async initStock(amount = TOTAL_STOCK): Promise<void> {
    await this.stockRepo.set(amount);
    console.log(`Stock initialized to ${amount}`);
  }

  async placeHold(userId: string): Promise<HoldResult> {
    const existingHold = await this.holdRepo.get(userId);
    if (existingHold) {
      return { success: false, reason: 'You already have an active hold.' };
    }

    const purchases = await this.holdRepo.getPurchases(userId);
    if (purchases >= MAX_PURCHASE_PER_USER) {
      return {
        success: false,
        reason: `You have reached the maximum of ${MAX_PURCHASE_PER_USER} pairs.`,
      };
    }

    const waitlistPos = await this.waitlistRepo.getPosition(userId);
    if (waitlistPos > 0) {
      return { success: false, reason: `You are already #${waitlistPos} in the waitlist.` };
    }

    const hold = HoldFactory.create(userId);

    const luaScript = `
      local stock = tonumber(redis.call('GET', KEYS[1]))
      if stock == nil or stock <= 0 then return -1 end
      redis.call('DECR', KEYS[1])
      redis.call('SETEX', KEYS[2], ARGV[1], ARGV[2])
      return stock - 1
    `;

    const remainingStock = (await this.client.eval(luaScript, {
      keys: [REDIS_KEYS.STOCK, REDIS_KEYS.hold(userId)],
      arguments: [String(HOLD_TTL_SECONDS), JSON.stringify(hold)],
    })) as number;

    if (remainingStock < 0) {
      return { success: false, outOfStock: true, reason: 'Out of stock. You can join the waitlist.' };
    }

    return { success: true, holdId: hold.holdId, expiresInSeconds: HOLD_TTL_SECONDS, remainingStock };
  }

  async joinWaitlist(userId: string): Promise<WaitlistResult> {
    const existingHold = await this.holdRepo.get(userId);
    if (existingHold) {
      return { success: false, reason: 'You have an active hold already.' };
    }

    const purchases = await this.holdRepo.getPurchases(userId);
    if (purchases >= MAX_PURCHASE_PER_USER) {
      return { success: false, reason: 'You have reached the maximum purchase limit.' };
    }

    const existingPos = await this.waitlistRepo.getPosition(userId);
    if (existingPos > 0) {
      return { success: false, reason: `Already in waitlist at position #${existingPos}.` };
    }

    await this.waitlistRepo.push(userId);
    const position = await this.waitlistRepo.getPosition(userId);
    return { success: true, position };
  }

  async leaveWaitlist(userId: string): Promise<void> {
    await this.waitlistRepo.remove(userId);
  }

  async advanceWaitlist(): Promise<string | null> {
    const holdData = HoldFactory.createWaitlistData();

    const luaScript = `
      local nextUser = redis.call('LPOP', KEYS[1])
      if nextUser == false then
        redis.call('INCR', KEYS[2])
        return nil
      end
      local holdKey = 'hold:' .. nextUser
      redis.call('SETEX', holdKey, ARGV[1], ARGV[2])
      return nextUser
    `;

    const nextUserId = (await this.client.eval(luaScript, {
      keys: [REDIS_KEYS.WAITLIST, REDIS_KEYS.STOCK],
      arguments: [String(HOLD_TTL_SECONDS), JSON.stringify(holdData)],
    })) as string | null;

    if (!nextUserId) {
      console.log('Waitlist empty — stock returned to pool.');
      return null;
    }

    console.log(`Waitlist: Hold granted to user ${nextUserId}`);
    return nextUserId;
  }

  async processPayment(paymentId: string, userId: string, holdId: string): Promise<PaymentResult> {
    const claimed = await this.paymentRepo.claim(
      paymentId,
      PaymentFactory.createProcessing(userId, holdId)
    );

    if (!claimed) {
      const existing = await this.paymentRepo.get(paymentId);
      console.log(`Payment ${paymentId} already processed: ${existing?.status}`);
      return { success: true, alreadyProcessed: true, status: existing?.status };
    }

    const hold = await this.holdRepo.get(userId);
    if (!hold || hold.holdId !== holdId) {
      await this.paymentRepo.update(paymentId, PaymentFactory.createFailed('Hold not found or expired'));
      return { success: false, reason: 'Hold not found or expired.' };
    }

    await this.client
      .multi()
      .incr(REDIS_KEYS.purchases(userId))
      .del(REDIS_KEYS.hold(userId))
      .setEx(REDIS_KEYS.payment(paymentId), PAYMENT_TTL_SECONDS, JSON.stringify(PaymentFactory.createSucceeded(userId, holdId)))
      .exec();

    console.log(`Payment ${paymentId} succeeded for user ${userId}`);
    return { success: true, status: 'succeeded' };
  }

  async getUserStatus(userId: string): Promise<UserStatus> {
    const [stock, hold, purchases, waitlistPosition, waitlistLength] = await Promise.all([
      this.stockRepo.get(),
      this.holdRepo.get(userId),
      this.holdRepo.getPurchases(userId),
      this.waitlistRepo.getPosition(userId),
      this.waitlistRepo.getLength(),
    ]);

    return { stock, hold, purchases, waitlistPosition, waitlistLength, maxPurchases: MAX_PURCHASE_PER_USER };
  }

  async resetAll(): Promise<void> {
    const patterns = ['hold:*', 'purchases:*', 'payment:*'];
    for (const pattern of patterns) {
      const keysToDelete: string[] = [];
      for await (const key of this.client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        if (Array.isArray(key)) keysToDelete.push(...key);
        else keysToDelete.push(key);
      }
      if (keysToDelete.length > 0) await this.client.del(keysToDelete);
    }
    await this.stockRepo.set(TOTAL_STOCK);
    await this.waitlistRepo.clear();
    console.log(`System reset: stock=${TOTAL_STOCK}, all holds/purchases/payments cleared`);
  }
}

export default HoldService;
