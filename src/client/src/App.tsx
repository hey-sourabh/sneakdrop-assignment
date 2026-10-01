import { useState } from 'react';
import { placeHold, joinWaitlist, leaveWaitlist, initiatePayment, resetSystem, getStatus } from './api';
import { useStatus, getUserId } from './hooks/useStatus';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import StockBar from './components/StockBar';
import StatusGrid from './components/StatusGrid';
import ActionPanel from './components/ActionPanel';
import RulesSection from './components/RulesSection';
import Toast from './components/Toast';
import './App.css';

export default function App() {
  const userId = getUserId();
  const { status, setStatus, holdCountdown, message, fetchStatus, showMessage } =
    useStatus(userId);

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
        showMessage('info', '💳 Payment initiated... waiting for confirmation', 8000);
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
                showMessage('success', '🎉 Payment confirmed! Sneakers are yours!', 8000);
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

  const purchasesDone = status?.purchases ?? 0;
  const maxed = purchasesDone >= 2;

  return (
    <div className="app">
      <Header userId={userId} />

      <main className="main">
        <section className="product-section">
          <ProductCard />
          <StockBar stock={status?.stock} />
        </section>

        <StatusGrid
          status={status}
          holdCountdown={holdCountdown}
          purchasesDone={purchasesDone}
          maxed={maxed}
        />

        <Toast message={message} />

        <ActionPanel
          status={status}
          holdCountdown={holdCountdown}
          loading={loading}
          paymentPending={paymentPending}
          onBuy={() => void handleBuy()}
          onPay={() => void handlePay()}
          onJoinWaitlist={() => void handleJoinWaitlist()}
          onLeaveWaitlist={() => void handleLeaveWaitlist()}
          onReset={() => void handleReset()}
        />

        <RulesSection />
      </main>
    </div>
  );
}
