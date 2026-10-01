const TOTAL_STOCK = 20;

interface StockBarProps {
  stock: number | undefined;
}

export default function StockBar({ stock }: StockBarProps) {
  const stockPercent = Math.max(0, ((stock ?? TOTAL_STOCK) / TOTAL_STOCK) * 100);
  const fillClass =
    stockPercent < 30 ? 'low' : stockPercent < 60 ? 'mid' : 'high';

  return (
    <div className="stock-section">
      <div className="stock-label">
        <span>Pairs Remaining</span>
        <span className="stock-count">{stock ?? '—'} / {TOTAL_STOCK}</span>
      </div>
      <div className="stock-bar">
        <div
          className={`stock-fill ${fillClass}`}
          style={{ width: `${stockPercent}%` }}
        />
      </div>
      {stock === 0 && <div className="sold-out-badge">SOLD OUT</div>}
    </div>
  );
}
