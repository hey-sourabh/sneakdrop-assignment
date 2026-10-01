// Shared types between client components and API layer

export interface HoldInfo {
  expiresInSeconds: number;
}

export interface UserStatus {
  stock: number;
  hold: HoldInfo | null;
  purchases: number;
  waitlistPosition: number;
  waitlistLength: number;
  maxPurchases: number;
}

export interface PlaceHoldResponse {
  success: boolean;
  outOfStock?: boolean;
  remainingStock?: number;
  reason?: string;
}

export interface JoinWaitlistResponse {
  success: boolean;
  position?: number;
  reason?: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export interface ResetResponse {
  success: boolean;
}

export type MessageType = 'success' | 'error' | 'info';

export interface ToastMessage {
  type: MessageType;
  text: string;
}
