import type {
  UserStatus,
  PlaceHoldResponse,
  JoinWaitlistResponse,
  InitiatePaymentResponse,
  ResetResponse,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export async function getStatus(userId: string): Promise<UserStatus> {
  const res = await fetch(`${API_BASE}/status/${userId}`);
  return res.json() as Promise<UserStatus>;
}

export async function placeHold(userId: string): Promise<PlaceHoldResponse> {
  const res = await fetch(`${API_BASE}/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json() as Promise<PlaceHoldResponse>;
}

export async function joinWaitlist(userId: string): Promise<JoinWaitlistResponse> {
  const res = await fetch(`${API_BASE}/waitlist/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json() as Promise<JoinWaitlistResponse>;
}

export async function leaveWaitlist(userId: string): Promise<void> {
  await fetch(`${API_BASE}/waitlist/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function initiatePayment(userId: string): Promise<InitiatePaymentResponse> {
  const res = await fetch(`${API_BASE}/payment/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json() as Promise<InitiatePaymentResponse>;
}

export async function resetSystem(): Promise<ResetResponse> {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  return res.json() as Promise<ResetResponse>;
}
