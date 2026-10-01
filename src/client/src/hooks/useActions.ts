import { useState } from 'react';
import { placeHold, joinWaitlist, leaveWaitlist, initiatePayment, resetSystem, getStatus } from '../api';
import type { UserStatus } from '../types';

interface UseActionsOptions {
  userId: string;
  status: UserStatus | null;
  setStatus: (s: UserStatus) => void;
  fetchStatus: () => Promise<void>;
  showMessage: (type: 'success' | 'error' | 'info', text: string, duration?: number) => void;
}

export function useActions({
  userId,
  status,
  setStatus,
  fetchStatus,
  showMessage,
}: UseActionsOptions) {
  const [loading, setLoading] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const result = await placeHold(userId);
      if (result.success) {
        showMessage('success', `Hold placed! You have 5 minutes to pay. ${result.remainingStock} pairs left.`);
        void fetchStatus();
      } else if (result.outOfStock) {
        showMessage('info', 'Out of stock! Would you like to join the waitlist?', 8000);
      } else {
        showMessage('error', result.reason ?? 'Could not place hold.');
      }
    } catch {
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setLoading(true);
    try {
      const result = await joinWaitlist(userId);
      if (result.success) {
        showMessage('success', `You're #${result.position} in the waitlist!`);
        void fetchStatus();
      } else {
        showMessage('error', result.reason ?? 'Could not join waitlist.');
      }
    } catch {
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    setLoading(true);
    try {
      await leaveWaitlist(userId);
      showMessage('info', 'You left the waitlist.');
      void fetchStatus();
    } catch {
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setPaymentPending(true);
    try {
      const result = await initiatePayment(userId);
      if (result.success) {
        showMessage('info', 'Payment initiated... waiting for confirmation', 8000);
        let attempts = 0;
        const pollPayment = setInterval(() => {
          void (async () => {
            attempts++;
            const s = await getStatus(userId);
            setStatus(s);
            if (!s.hold || attempts > 20) {
              clearInterval(pollPayment);
              setPaymentPending(false);
              if (!s.hold && s.purchases > (status?.purchases ?? 0)) {
                showMessage('success', 'Payment confirmed! Sneakers are yours!', 8000);
              }
            }
          })();
        }, 1000);
      } else {
        showMessage('error', result.error ?? 'Payment initiation failed.');
        setPaymentPending(false);
      }
    } catch {
      showMessage('error', 'Network error. Please try again.');
      setPaymentPending(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset system? Stock will go back to 20 and waitlist will be cleared.')) return;
    await resetSystem();
    showMessage('success', 'System reset!');
    void fetchStatus();
  };

  return {
    loading,
    paymentPending,
    handleBuy,
    handleJoinWaitlist,
    handleLeaveWaitlist,
    handlePay,
    handleReset,
  };
}
