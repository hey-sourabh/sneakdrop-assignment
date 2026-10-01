import type { UserStatus } from '../types';

function formatTime(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ActionPanelProps {
  status: UserStatus | null;
  holdCountdown: number | null;
  loading: boolean;
  paymentPending: boolean;
  onBuy: () => void;
  onPay: () => void;
  onJoinWaitlist: () => void;
  onLeaveWaitlist: () => void;
  onReset: () => void;
}

export default function ActionPanel({
  status,
  holdCountdown,
  loading,
  paymentPending,
  onBuy,
  onPay,
  onJoinWaitlist,
  onLeaveWaitlist,
  onReset,
}: ActionPanelProps) {
  const hasHold = !!status?.hold;
  const inWaitlist = (status?.waitlistPosition ?? 0) > 0;
  const purchasesDone = status?.purchases ?? 0;
  const maxed = purchasesDone >= 2;

  return (
    <section className="actions-section">
      {maxed ? (
        <div className="maxed-banner">
          🎉 You've purchased the maximum of 2 pairs. Enjoy your sneakers!
        </div>
      ) : (
        <>
          {/* Primary — reserve */}
          {!hasHold && !inWaitlist && (status?.stock ?? 0) > 0 && (
            <button
              id="btn-buy"
              className="btn btn-primary"
              onClick={onBuy}
              disabled={loading}
            >
              {loading ? 'Reserving...' : '⚡ Reserve My Pair'}
            </button>
          )}

          {/* Hold active — pay now */}
          {hasHold && (
            <div className="hold-actions">
              <div className="hold-warning">
                ⏰ Your pair is reserved for{' '}
                <strong>{formatTime(holdCountdown)}</strong> — complete payment now!
              </div>
              <button
                id="btn-pay"
                className="btn btn-pay"
                onClick={onPay}
                disabled={paymentPending}
              >
                {paymentPending ? '💳 Processing...' : '💳 Pay Now ($299)'}
              </button>
            </div>
          )}

          {/* Out of stock — waitlist */}
          {status?.stock === 0 && !hasHold && (
            inWaitlist ? (
              <div className="waitlist-active">
                <div className="waitlist-info">
                  📋 You're <strong>#{status.waitlistPosition}</strong> in line.
                  We'll notify you when a pair becomes available.
                </div>
                <button
                  id="btn-leave-waitlist"
                  className="btn btn-secondary"
                  onClick={onLeaveWaitlist}
                  disabled={loading}
                >
                  Leave Waitlist
                </button>
              </div>
            ) : (
              <button
                id="btn-join-waitlist"
                className="btn btn-waitlist"
                onClick={onJoinWaitlist}
                disabled={loading}
              >
                {loading ? 'Joining...' : '📋 Join Waitlist'}
              </button>
            )
          )}
        </>
      )}

      {/* Demo reset */}
      <section className="demo-section">
        <button id="btn-reset" className="btn btn-ghost" onClick={onReset}>
          🔄 Reset Demo (stock=20)
        </button>
      </section>
    </section>
  );
}
