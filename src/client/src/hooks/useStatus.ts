import { useState, useEffect, useCallback, useRef } from 'react';
import { getStatus } from '../api';
import type { UserStatus, ToastMessage, MessageType } from '../types';

// Generate or retrieve a persistent demo user ID
export function getUserId(): string {
  let id = localStorage.getItem('sneakdrop_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('sneakdrop_user_id', id);
  }
  return id;
}

export function useStatus(userId: string) {
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [holdCountdown, setHoldCountdown] = useState<number | null>(null);
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getStatus(userId);
      setStatus(data);
      if (data.hold) {
        setHoldCountdown(data.hold.expiresInSeconds);
      } else {
        setHoldCountdown(null);
      }
    } catch (err) {
      console.error('Status fetch failed:', err);
    }
  }, [userId]);

  // Poll every 3 seconds
  useEffect(() => {
    void fetchStatus();
    pollingRef.current = setInterval(() => void fetchStatus(), 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchStatus]);

  // Live countdown
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (holdCountdown !== null && holdCountdown > 0) {
      countdownRef.current = setInterval(() => {
        setHoldCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            void fetchStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdCountdown !== null ? Math.floor(holdCountdown / 10) : null]);

  const showMessage = useCallback(
    (type: MessageType, text: string, duration = 5000) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), duration);
    },
    []
  );

  return { status, setStatus, holdCountdown, message, fetchStatus, showMessage };
}
