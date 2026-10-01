import { randomUUID } from 'crypto';
import type { Hold, PaymentRecord } from '../types';

class HoldFactory {
  static create(userId: string, fromWaitlist = false): Hold {
    return {
      holdId: randomUUID(),
      userId,
      placedAt: Date.now(),
      ...(fromWaitlist && { fromWaitlist: true }),
    };
  }

  static createWaitlistData(): Pick<Hold, 'holdId' | 'placedAt' | 'fromWaitlist'> {
    return { holdId: randomUUID(), placedAt: Date.now(), fromWaitlist: true };
  }
}

class PaymentFactory {
  static createProcessing(userId: string, holdId: string): PaymentRecord {
    return { status: 'processing', userId, holdId, startedAt: Date.now() };
  }

  static createSucceeded(userId: string, holdId: string): PaymentRecord {
    return { status: 'succeeded', userId, holdId, processedAt: Date.now() };
  }

  static createFailed(reason: string): PaymentRecord {
    return { status: 'failed', reason, processedAt: Date.now() };
  }
}

export { HoldFactory, PaymentFactory };
