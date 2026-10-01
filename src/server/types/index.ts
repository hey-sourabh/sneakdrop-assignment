export interface Hold {
  holdId: string;
  userId: string;
  placedAt: number;
  fromWaitlist?: boolean;
  expiresInSeconds?: number;
}

export interface UserStatus {
  stock: number;
  hold: Hold | null;
  purchases: number;
  waitlistPosition: number;
  waitlistLength: number;
  maxPurchases: number;
}

export interface HoldResult {
  success: boolean;
  holdId?: string;
  expiresInSeconds?: number;
  remainingStock?: number;
  reason?: string;
  outOfStock?: boolean;
}

export interface WaitlistResult {
  success: boolean;
  position?: number;
  reason?: string;
}

export interface PaymentRecord {
  status: 'processing' | 'succeeded' | 'failed';
  userId?: string;
  holdId?: string;
  startedAt?: number;
  processedAt?: number;
  reason?: string;
}

export interface PaymentResult {
  success: boolean;
  status?: string;
  alreadyProcessed?: boolean;
  reason?: string;
}
