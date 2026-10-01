import { useState, useEffect, useCallback, useRef } from 'react';
import { getStatus, placeHold, joinWaitlist, leaveWaitlist, initiatePayment, resetSystem } from './api';
import './App.css';

// Format seconds to mm:ss
function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Generate a persistent user ID for demo
function getUserId() {
  let id = localStorage.getItem('sneakdrop_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('sneakdrop_user_id', id);
  }
  return id;
}

export default function App() {
  const userId = getUserId();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error'|'info', text }
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const pollingRef = useRef(null);
  const countdownRef = useRef(null);
  const [holdCountdown, setHoldCountdown] = useState(null);

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

  // Poll status every 3 seconds
  useEffect(() => {
    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollingRef.current);
  }, [fetchStatus]);

  // Live countdown timer
  useEffect(() => {
    clearInterval(countdownRef.current);
    if (holdCountdown !== null && holdCountdown > 0) {
      countdownRef.current = setInterval(() => {
        setHoldCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            fetchStatus(); // Refresh when hold expires
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [holdCountdown !== null ? Math.floor(holdCountdown / 10) : null]); // eslint-disable-line

  const showMessage = (type, text, duration = 5000) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), duration);
  };

  const handleBuy = async () => {
    setLoading(true);
    try {
      const result = await placeHold(userId);
      if (result.success) {
        showMessage('success', `✅ Hold placed! You have 5 minutes to pay. ${result.remainingStock} pairs left.`);
        fetchStatus();
      } else if (result.outOfStock) {
        showMessage('info', '⚠️ Out of stock! Would you like to join the waitlist?', 8000);
      } else {
        showMessage('error', result.reason || 'Could not place hold.');
      }
    } catch (err) {
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
        showMessage('success', `📋 You're #${result.position} in the waitlist!`);
        fetchStatus();
      } else {
        showMessage('error', result.reason || 'Could not join waitlist.');
      }
    } catch (err) {
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
      fetchStatus();
    } catch (err) {
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
        setPaymentId(result.paymentId);
        showMessage('info', '💳 Payment initiated... waiting for confirmation (may take a few seconds)', 8000);
        // Poll until hold disappears (payment processed)
        let attempts = 0;
        const pollPayment = setInterval(async () => {
          attempts++;
          const s = await getStatus(userId);
          setStatus(s);
          if (!s.hold || attempts > 20) {
            clearInterval(pollPayment);
            setPaymentPending(false);
            if (!s.hold && s.purchases > (status?.purchases || 0)) {
              showMessage('success', '🎉 Payment confirmed! Sneakers are yours!', 8000);
            }
          }
        }, 1000);
      } else {
        showMessage('error', result.error || 'Payment initiation failed.');
        setPaymentPending(false);
      }
    } catch (err) {
      showMessage('error', 'Network error. Please try again.');
      setPaymentPending(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset system? Stock will go back to 20 and waitlist will be cleared.')) return;
    await resetSystem();
    showMessage('success', 'System reset!');
    fetchStatus();
  };

  const stockPercent = status ? Math.max(0, (status.stock / 20) * 100) : 100;
  const hasHold = !!status?.hold;
  const inWaitlist = status?.waitlistPosition > 0;
  const purchasesDone = status?.purchases || 0;
  const maxed = purchasesDone >= 2;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-icon">👟</span>
            <span className="brand-name">SneakDrop</span>
          </div>
          <div className="user-badge">
            <span className="user-dot"></span>
            <span className="user-id">{userId}</span>
          </div>
        </div>
      </header>

      <main className="main">
        {/* Hero / Product Card */}
        <section className="product-section">
          <div className="product-card">
            <div className="product-tag">LIMITED DROP</div>
            <div className="product-emoji">👟</div>
            <h1 className="product-name">Air Phantom X</h1>
            <p className="product-sub">Only 20 pairs. Ever.</p>
            <div className="product-price">$299</div>
          </div>

          {/* Stock Bar */}
          <div className="stock-section">
            <div className="stock-label">
              <span>Pairs Remaining</span>
              <span className="stock-count">{status?.stock ?? '—'} / 20</span>
            </div>
            <div className="stock-bar">
              <div
                className={`stock-fill ${stockPercent < 30 ? 'low' : stockPercent < 60 ? 'mid' : 'high'}`}
                style={{ width: `${stockPercent}%` }}
              />
            </div>
            {status?.stock === 0 && (
              <div className="sold-out-badge">🔴 SOLD OUT</div>
            )}
          </div>
        </section>

        {/* Status Panel */}
        <section className="status-section">
          <h2 className="section-title">Your Status</h2>

          <div className="status-grid">
            {/* Hold Status */}
            <div className={`status-card ${hasHold ? 'active' : ''}`}>
              <div className="status-card-icon">{hasHold ? '🔒' : '🔓'}</div>
              <div className="status-card-label">Hold</div>
              <div className="status-card-value">
                {hasHold ? (
                  <>
                    <span className="countdown">{formatTime(holdCountdown)}</span>
                    <span className="countdown-label">remaining</span>
                  </>
                ) : (
                  <span className="no-hold">None</span>
                )}
              </div>
            </div>

            {/* Waitlist Position */}
            <div className={`status-card ${inWaitlist ? 'active' : ''}`}>
              <div className="status-card-icon">{inWaitlist ? '📋' : '—'}</div>
              <div className="status-card-label">Queue Position</div>
              <div className="status-card-value">
                {inWaitlist ? (
                  <>
                    <span className="queue-pos">#{status.waitlistPosition}</span>
                    <span className="queue-total">of {status.waitlistLength}</span>
                  </>
                ) : (
                  <span className="no-hold">Not in queue</span>
                )}
              </div>
            </div>

            {/* Purchases */}
            <div className="status-card">
              <div className="status-card-icon">🛍️</div>
              <div className="status-card-label">Purchased</div>
              <div className="status-card-value">
                <span className={`purchase-count ${maxed ? 'maxed' : ''}`}>
                  {purchasesDone} / 2
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="actions-section">
          {/* Toast message */}
          {message && (
            <div className={`toast toast-${message.type}`}>
              {message.text}
            </div>
          )}

          {maxed ? (
            <div className="maxed-banner">
              🎉 You've purchased the maximum of 2 pairs. Enjoy your sneakers!
            </div>
          ) : (
            <>
              {/* Primary action */}
              {!hasHold && !inWaitlist && status?.stock > 0 && (
                <button
                  id="btn-buy"
                  className="btn btn-primary"
                  onClick={handleBuy}
                  disabled={loading}
                >
                  {loading ? 'Reserving...' : '⚡ Reserve My Pair'}
                </button>
              )}

              {/* Hold active — pay */}
              {hasHold && (
                <div className="hold-actions">
                  <div className="hold-warning">
                    ⏰ Your pair is reserved for <strong>{formatTime(holdCountdown)}</strong> — complete payment now!
                  </div>
                  <button
                    id="btn-pay"
                    className="btn btn-pay"
                    onClick={handlePay}
                    disabled={paymentPending}
                  >
                    {paymentPending ? '💳 Processing...' : '💳 Pay Now ($299)'}
                  </button>
                </div>
              )}

              {/* Out of stock — waitlist actions */}
              {status?.stock === 0 && !hasHold && (
                inWaitlist ? (
                  <div className="waitlist-active">
                    <div className="waitlist-info">
                      📋 You're <strong>#{status.waitlistPosition}</strong> in line. We'll notify you when a pair becomes available.
                    </div>
                    <button
                      id="btn-leave-waitlist"
                      className="btn btn-secondary"
                      onClick={handleLeaveWaitlist}
                      disabled={loading}
                    >
                      Leave Waitlist
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-join-waitlist"
                    className="btn btn-waitlist"
                    onClick={handleJoinWaitlist}
                    disabled={loading}
                  >
                    {loading ? 'Joining...' : '📋 Join Waitlist'}
                  </button>
                )
              )}
            </>
          )}
        </section>

        {/* Rules */}
        <section className="rules-section">
          <h2 className="section-title">How It Works</h2>
          <div className="rules-list">
            <div className="rule-item">
              <span className="rule-num">1</span>
              <span>Click Reserve to hold your pair for <strong>5 minutes</strong></span>
            </div>
            <div className="rule-item">
              <span className="rule-num">2</span>
              <span>Complete payment within 5 minutes or your hold expires</span>
            </div>
            <div className="rule-item">
              <span className="rule-num">3</span>
              <span>Maximum <strong>2 pairs per customer</strong>, 1 hold at a time</span>
            </div>
            <div className="rule-item">
              <span className="rule-num">4</span>
              <span>When sold out, join the waitlist — expired holds go to the next in line</span>
            </div>
          </div>
        </section>

        {/* Demo Reset */}
        <section className="demo-section">
          <button id="btn-reset" className="btn btn-ghost" onClick={handleReset}>
            🔄 Reset Demo (stock=20)
          </button>
        </section>
      </main>
    </div>
  );
}
