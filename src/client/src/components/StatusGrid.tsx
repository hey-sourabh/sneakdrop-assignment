import type { UserStatus } from '../types';

function formatTime(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface StatusGridProps {
  status: UserStatus | null;
  holdCountdown: number | null;
  purchasesDone: number;
  maxed: boolean;
}

export default function StatusGrid({
  status,
  holdCountdown,
  purchasesDone,
  maxed,
}: StatusGridProps) {
  const hasHold = !!status?.hold;
  const inWaitlist = (status?.waitlistPosition ?? 0) > 0;

  return (
    <section className="status-section">
      <h2 className="section-title">Your Status</h2>
      <div className="status-grid">

        <div className={`status-card ${hasHold ? 'active' : ''}`}>
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

        <div className={`status-card ${inWaitlist ? 'active' : ''}`}>
          <div className="status-card-label">Queue Position</div>
          <div className="status-card-value">
            {inWaitlist && status ? (
              <>
                <span className="queue-pos">#{status.waitlistPosition}</span>
                <span className="queue-total">of {status.waitlistLength}</span>
              </>
            ) : (
              <span className="no-hold">Not in queue</span>
            )}
          </div>
        </div>

        <div className="status-card">
          <div className="status-card-label">Purchased</div>
          <div className="status-card-value">
            <span className={`purchase-count ${maxed ? 'maxed' : ''}`}>
              {purchasesDone} / 2
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
